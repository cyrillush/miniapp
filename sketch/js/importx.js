/* ==========================================================================
   importx.js — 캡처 사진을 캔버스에 얹기 전에 크기·위치·회전·영역을 맞추는
                '사진 크기·영역 맞춰 붙여넣기' 편집 모달 (v4.2)
   ──────────────────────────────────────────────────────────────────────────
   유입 3경로(갤러리 파일 · 클립보드 붙여넣기 · 공유 share target)는 모두
   이 모달을 거친다. 모달의 미리보기 프레임은 #stage 캔버스와 같은 가로×세로
   비율이라, 프레임에서 맞춘 그대로가 캔버스(= PNG 저장)에 들어간다.

   100% = 지금 회전 상태에서 사진 전체가 프레임 안에 다 보이는 fit 배율.
   30%~99% 로 줄이면 사진 밖이 투명(앱에서는 #0E1319)으로 남고,
   100%~400% 로 키워 폰 상태바·지도 버튼 여백을 잘라낼 수 있다.

   '이대로 붙여넣기' → 프레임 비율 그대로 오프스크린 캔버스에 고해상도
   (긴 변 1600px 이하)로 다시 그려 putPhoto() 로 배경에 넣는다.
   여백은 투명 PNG, 용량이 크면 #0E1319 배경 JPEG(0.90) 로 떨어진다.
   ========================================================================== */
window.AS = window.AS || {};
(function (AS) {
  'use strict';
  var C = AS.core, $ = C.$, S = AS.S;

  var MAXPX = 1600;          /* 저장 이미지 긴 변 상한 */
  var MAXLEN = 620000;       /* dataURL 길이 상한 — localStorage(약 5MB)에 안전하게 */
  var BG = '#0E1319';        /* 사진 밖 여백 = 캔버스·PNG 배경색과 동일 */
  var MIN_PCT = 30, MAX_PCT = 400;
  var CLIP_FAIL = '클립보드에 사진이 없거나 브라우저가 막았어요 — 입력창 밖에서 붙여넣기(Ctrl+V)나 갤러리를 써 주세요';

  /* 편집 중인 사진의 상태 — 저장(S)과 분리된 작업 사본 */
  var OP = { img: null, iw: 0, ih: 0, rot: 0, pct: 100, tx: 0, ty: 0, open: false, busy: false, dpr: 1, ar: 0.6 };
  var cv = null, fw = 0, fh = 0;
  var pts = {}, gest = null;

  /* ────────── 프레임(= 캔버스 비율) 크기 계산 ────────── */
  function stageAspect() {
    var w = S.stage.w || 390, h = S.stage.h || 640;
    return w / h;
  }

  /* 붙여넣은 뒤의 캔버스 비율 — 사진 모드에서는 #photoBar 가 나타나 캔버스가
     조금 짧아지므로, 그 상태의 #stage 비율을 실제로 재서 맞춘다.
     (빈 화면 비율로 맞추면 붙여넣은 뒤 좌우에 여백이 생긴다) */
  function targetAspect() {
    var bar = $('#photoBar'), st = $('#stage');
    if (!bar || !st) return stageAspect();
    var was = bar.hidden, vis = bar.style.visibility;
    if (was) { bar.hidden = false; bar.style.visibility = 'hidden'; }
    var r = st.getBoundingClientRect();
    var a = (r.width && r.height) ? r.width / r.height : stageAspect();
    if (was) { bar.hidden = true; bar.style.visibility = vis || ''; }
    return a;
  }

  function layout() {
    var frame = $('#impFrame'), box = $('#impBox');
    cv = $('#impCanvas');
    if (!frame || !box || !cv) return;
    var r = frame.getBoundingClientRect();
    var aw = Math.max(120, Math.floor(r.width)), ah = Math.max(120, Math.floor(r.height));
    var ar = targetAspect();
    OP.ar = ar;
    var w = aw, h = w / ar;
    if (h > ah) { h = ah; w = h * ar; }
    fw = Math.max(80, Math.round(w * 10) / 10);
    fh = Math.max(80, Math.round(h * 10) / 10);
    box.style.width = fw + 'px';
    box.style.height = fh + 'px';
    OP.dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(fw * OP.dpr);
    cv.height = Math.round(fh * OP.dpr);
    cv.style.width = fw + 'px';
    cv.style.height = fh + 'px';
    clampT();
    draw();
  }

  /* ────────── 배율 ────────── */
  function baseFit() {
    var sw = (OP.rot % 180) === 0;
    var iw = sw ? OP.iw : OP.ih, ih = sw ? OP.ih : OP.iw;
    if (!iw || !ih) return 1;
    return Math.min(fw / iw, fh / ih);
  }
  function scale() { return baseFit() * OP.pct / 100; }

  function footprint() {
    var s = scale(), swap = (OP.rot % 180) !== 0;
    return { x: (swap ? OP.ih : OP.iw) * s / 2, y: (swap ? OP.iw : OP.ih) * s / 2 };
  }

  /* 사진을 완전히 잃지 않게 — 최소 36px 은 프레임 안에 남긴다.
     다만 사진이 프레임보다 양쪽으로 큰(꽉 찬) 상태에서는 빈 여백이 생기지 않도록
     가장자리까지만 움직이게 잠근다. */
  function clampT() {
    var fp = footprint();
    if (fp.x >= fw / 2 && fp.y >= fh / 2) {
      var lx = fp.x - fw / 2, ly = fp.y - fh / 2;
      OP.tx = C.clamp(OP.tx, -lx, lx);
      OP.ty = C.clamp(OP.ty, -ly, ly);
      return;
    }
    var mx = Math.max(0, fw / 2 - 36) + fp.x;
    var my = Math.max(0, fh / 2 - 36) + fp.y;
    OP.tx = C.clamp(OP.tx, -mx, mx);
    OP.ty = C.clamp(OP.ty, -my, my);
  }

  function isCovered() {
    var fp = footprint();
    return fp.x >= fw / 2 - 0.5 && fp.y >= fh / 2 - 0.5;
  }

  function coverPct() {
    var sw = (OP.rot % 180) === 0;
    var iw = sw ? OP.iw : OP.ih, ih = sw ? OP.ih : OP.iw;
    if (!iw || !ih) return 100;
    var fit = Math.min(fw / iw, fh / ih);
    var cov = Math.max(fw / iw, fh / ih);
    return fit ? (cov / fit) * 100 : 100;
  }

  /* ────────── 미리보기 그리기 ────────── */
  function draw() {
    if (!cv || !OP.img) return;
    var dpr = OP.dpr || 1;
    var ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, fw, fh);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, fw, fh);
    var s = scale();
    ctx.save();
    ctx.translate(fw / 2 + OP.tx, fh / 2 + OP.ty);
    ctx.rotate(OP.rot * Math.PI / 180);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(OP.img, -OP.iw * s / 2, -OP.ih * s / 2, OP.iw * s, OP.ih * s);
    ctx.restore();
    sync();
  }

  function sync() {
    var pct = Math.round(OP.pct);
    var sl = $('#impZoom'), lab = $('#impZoomVal'), pc = $('#impPct');
    if (sl) {
      if (String(sl.value) !== String(pct)) sl.value = String(pct);
      sl.style.setProperty('--fill', ((pct - MIN_PCT) / (MAX_PCT - MIN_PCT) * 100) + '%');
    }
    if (lab) lab.textContent = pct + '%';
    if (pc) pc.textContent = pct + '%';
    var mi = $('#impMinus'), pl = $('#impPlus');
    if (mi) mi.disabled = OP.pct <= MIN_PCT + 0.01;
    if (pl) pl.disabled = OP.pct >= MAX_PCT - 0.01;
    var note = $('#impFitNote');
    if (note) {
      note.textContent = isCovered()
        ? '여백 없이 프레임을 꽉 채웠어요'
        : '사진 밖은 약도 배경(#0E1319)으로 남아요';
    }
    var rotb = $('#impRotVal');
    if (rotb) rotb.textContent = OP.rot + '°';
  }

  function setPct(v, center) {
    OP.pct = C.clamp(Number(v) || 100, MIN_PCT, MAX_PCT);
    if (center) { OP.tx = 0; OP.ty = 0; }
    clampT();
    draw();
  }

  function rotate90() {
    var s0 = scale();
    OP.rot = (OP.rot + 90) % 360;
    var b = baseFit();
    OP.pct = C.clamp(b ? (s0 / b) * 100 : OP.pct, MIN_PCT, MAX_PCT);
    clampT();
    draw();
  }

  /* ────────── 모달 열기/닫기 ────────── */
  function show() {
    var el = $('#impPhoto');
    if (!el) return;
    el.hidden = false;
    OP.open = true;
    document.body.classList.add('impopen');
    requestAnimationFrame(function () {
      layout();
      requestAnimationFrame(layout);
    });
    setTimeout(function () { if (OP.open) layout(); }, 120);
  }

  function close() {
    var el = $('#impPhoto');
    if (el) el.hidden = true;
    OP.open = false;
    OP.img = null;
    pts = {}; gest = null;
    document.body.classList.remove('impopen');
  }

  function isOpen() { return !!OP.open; }

  function openImage(src, done) {
    var im = new Image();
    im.onload = function () {
      var iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
      if (!iw || !ih) { AS.ui.toast('사진 크기를 읽지 못했어요 — 다른 사진으로 시도해 주세요', 2600); return; }
      OP.img = im; OP.iw = iw; OP.ih = ih;
      OP.rot = 0; OP.pct = 100; OP.tx = 0; OP.ty = 0;
      if (done) done();
      show();
    };
    im.onerror = function () {
      if (done) done();
      AS.ui.toast('사진을 읽지 못했어요 — 다른 사진으로 시도해 주세요', 2600);
    };
    im.src = src;
  }

  function openFile(file) {
    if (!file) { AS.ui.toast('사진을 읽지 못했어요', 2200); return; }
    if (file.type && !/^image\//.test(file.type)) { AS.ui.toast('사진 파일이 아니에요', 2200); return; }
    var url = URL.createObjectURL(file);
    openImage(url, function () { URL.revokeObjectURL(url); });
  }

  function openBlob(blob) { openFile(blob); }

  /* ────────── 클립보드 ────────── */
  function fromClipboard() {
    if (OP.open) return;
    var clip = navigator.clipboard;
    if (!clip || !clip.read) { AS.ui.toast(CLIP_FAIL, 4200); return; }
    Promise.resolve(clip.read()).then(function (items) {
      var gets = [];
      (items || []).forEach(function (it) {
        var type = (it.types || []).filter(function (t) { return /^image\//.test(t); })[0];
        if (type) { try { gets.push(it.getType(type)); } catch (e) {} }
      });
      if (!gets.length) { AS.ui.toast(CLIP_FAIL, 4200); return null; }
      return Promise.all(gets).then(function (blobs) {
        var b = blobs.filter(function (x) { return x && x.size; })[0];
        if (b) openFile(b); else AS.ui.toast(CLIP_FAIL, 4200);
      });
    }).catch(function () { AS.ui.toast(CLIP_FAIL, 4200); });
  }

  /* 전역 paste — 입력창 밖이면 클립보드의 이미지를 가로채 편집 모달로 */
  function onPaste(e) {
    if (OP.open) return;
    var ae = document.activeElement;
    if (ae && (/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) || ae.isContentEditable)) return;
    var dt = e.clipboardData;
    if (!dt) return;
    var file = null, items = dt.items || [], i;
    for (i = 0; i < items.length; i++) {
      var it = items[i];
      if (/^image\//.test(it.type || '')) { try { file = it.getAsFile(); } catch (x) { file = null; } if (file) break; }
    }
    if (!file && dt.files && dt.files.length) {
      for (i = 0; i < dt.files.length; i++) {
        if (/^image\//.test(dt.files[i].type || '')) { file = dt.files[i]; break; }
      }
    }
    if (!file) return;
    e.preventDefault();
    openFile(file);
  }

  /* ────────── 붙여넣기 확정 — 프레임 그대로 고해상도 렌더 ────────── */
  function renderOut() {
    var ar = OP.ar || stageAspect();
    var sizes = [MAXPX, 1280, 1024, 800];
    var best = '';
    for (var i = 0; i < sizes.length; i++) {
      var ls = sizes[i], q, W, H;
      if (ar >= 1) { W = ls; q = W / fw; H = Math.max(1, Math.round(fh * q)); }
      else { H = ls; q = H / fh; W = Math.max(1, Math.round(fw * q)); }
      W = Math.max(1, W); H = Math.max(1, H);
      var s = scale() * q;
      var c = document.createElement('canvas');
      c.width = W; c.height = H;
      var ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.translate(W / 2 + OP.tx * q, H / 2 + OP.ty * q);
      ctx.rotate(OP.rot * Math.PI / 180);
      ctx.drawImage(OP.img, -OP.iw * s / 2, -OP.ih * s / 2, OP.iw * s, OP.ih * s);

      var png = c.toDataURL('image/png');
      best = png;
      if (png.length <= MAXLEN) return png;

      /* 용량 초과 — 투명 여백을 #0E1319 로 깔고 JPEG 0.90 */
      var c2 = document.createElement('canvas');
      c2.width = W; c2.height = H;
      var x2 = c2.getContext('2d');
      x2.fillStyle = BG;
      x2.fillRect(0, 0, W, H);
      x2.drawImage(c, 0, 0);
      var jpg = c2.toDataURL('image/jpeg', 0.90);
      if (jpg.length <= MAXLEN) return jpg;
      best = jpg;
    }
    return best;
  }

  function apply() {
    if (!OP.img || OP.busy) return;
    OP.busy = true;
    var btn = $('#impApply'), old = btn ? btn.textContent : '';
    if (btn) { btn.textContent = '만드는 중…'; btn.disabled = true; }
    var url = '';
    try { url = renderOut(); } catch (e) { url = ''; }
    OP.busy = false;
    if (btn) { btn.textContent = old; btn.disabled = false; }
    if (!url) { AS.ui.toast('사진을 붙여넣지 못했어요 — 다시 시도해 주세요', 2600); return; }
    close();
    AS.ui.putPhoto(url, '사진을 붙여넣었습니다 — 위 사진 크기(100~500%)로 더 키우거나 두 손가락으로 맞추세요', 3200);
  }

  /* ────────── 프레임 제스처: 끌기 · 핀치 · 휠 ────────── */
  function relPt(e) {
    var r = cv.getBoundingClientRect();
    return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 };
  }

  function onDown(e) {
    if (!OP.img) return;
    e.preventDefault();
    try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    pts[e.pointerId] = relPt(e);
    var ids = Object.keys(pts);
    if (ids.length === 1) {
      gest = { mode: 'drag', p0: pts[e.pointerId], tx0: OP.tx, ty0: OP.ty };
    } else if (ids.length === 2) {
      var a = pts[ids[0]], b = pts[ids[1]];
      var mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      var d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      var s = scale();
      gest = {
        mode: 'pinch', d0: d, pct0: OP.pct, s0: s, mid0: mid,
        ux: (mid.x - OP.tx) / s, uy: (mid.y - OP.ty) / s
      };
    } else {
      gest = null;
    }
  }

  function onMove(e) {
    if (!pts[e.pointerId] || !gest) return;
    e.preventDefault();
    pts[e.pointerId] = relPt(e);
    var ids = Object.keys(pts);
    if (gest['mode'] === 'drag' && ids.length === 1) {
      var p = pts[ids[0]];
      OP.tx = gest.tx0 + (p.x - gest.p0.x);
      OP.ty = gest.ty0 + (p.y - gest.p0.y);
      clampT();
      draw();
      return;
    }
    if (gest.mode === 'pinch' && ids.length >= 2) {
      var a = pts[ids[0]], b = pts[ids[1]];
      var mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      var d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      OP.pct = C.clamp(gest.pct0 * (d / gest.d0), MIN_PCT, MAX_PCT);
      var s = scale();
      OP.tx = mid.x - gest.ux * s;
      OP.ty = mid.y - gest.uy * s;
      clampT();
      draw();
    }
  }

  function onUp(e) {
    if (!pts[e.pointerId]) return;
    delete pts[e.pointerId];
    var ids = Object.keys(pts);
    if (!ids.length) { gest = null; return; }
    if (ids.length === 1) gest = { mode: 'drag', p0: pts[ids[0]], tx0: OP.tx, ty0: OP.ty };
  }

  function onWheel(e) {
    if (!OP.img) return;
    e.preventDefault();
    var p = relPt(e);
    var f = e.deltaY < 0 ? 1.08 : 0.926;
    var np = C.clamp(OP.pct * f, MIN_PCT, MAX_PCT);
    var ratio = np / OP.pct;
    OP.tx = p.x - (p.x - OP.tx) * ratio;
    OP.ty = p.y - (p.y - OP.ty) * ratio;
    OP.pct = np;
    clampT();
    draw();
  }

  /* ────────── 바인딩 ────────── */
  function bind() {
    window.addEventListener('paste', onPaste);

    var ep = $('#btnPastePhoto');
    if (ep) ep.addEventListener('click', function (e) { e.stopPropagation(); fromClipboard(); });
    var cp = $('#capPaste');
    if (cp) cp.addEventListener('click', function (e) { e.stopPropagation(); fromClipboard(); });

    var cl = $('#impClose'), cc = $('#impCancel'), scrim = $('#impScrim');
    if (cl) cl.addEventListener('click', close);
    if (cc) cc.addEventListener('click', close);
    if (scrim) scrim.addEventListener('click', close);

    var ap = $('#impApply');
    if (ap) ap.addEventListener('click', apply);

    var mi = $('#impMinus'), pl = $('#impPlus'), sl = $('#impZoom');
    if (mi) mi.addEventListener('click', function () { setPct(OP.pct - 5); });
    if (pl) pl.addEventListener('click', function () { setPct(OP.pct + 5); });
    if (sl) sl.addEventListener('input', function () { setPct(Number(sl.value)); });

    Array.prototype.forEach.call(document.querySelectorAll('#impPhoto .impquick button'), function (b) {
      b.addEventListener('click', function () {
        var q = b.getAttribute('data-q');
        if (q === 'all') { OP.pct = 100; OP.tx = 0; OP.ty = 0; clampT(); draw(); }
        else if (q === 'cover') setPct(Math.min(MAX_PCT, coverPct() + 0.2), true);
        else if (q === 'rot') rotate90();
      });
    });

    cv = $('#impCanvas');
    if (cv) {
      cv.addEventListener('pointerdown', onDown);
      cv.addEventListener('pointermove', onMove);
      cv.addEventListener('pointerup', onUp);
      cv.addEventListener('pointercancel', onUp);
      cv.addEventListener('wheel', onWheel, { passive: false });
    }

    window.addEventListener('resize', function () { if (OP.open) layout(); });
    window.addEventListener('orientationchange', function () { if (OP.open) setTimeout(layout, 320); });
    window.addEventListener('keydown', function (e) {
      if (!OP.open) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'Enter' && !e.repeat) { e.preventDefault(); apply(); }
    });
  }

  AS.importx = {
    bind: bind, openFile: openFile, openBlob: openBlob, fromClipboard: fromClipboard,
    isOpen: isOpen, close: close, apply: apply,
    _state: OP, _layout: layout, _setPct: setPct, _rotate: rotate90, _render: renderOut,
    MIN_PCT: MIN_PCT, MAX_PCT: MAX_PCT
  };
})(window.AS);
