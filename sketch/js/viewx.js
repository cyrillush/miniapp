/* ==========================================================================
   viewx.js — 약도 캔버스 · 두 가지 배경(도로 도면 / 갤러리 사진) · 사진 변환
   ──────────────────────────────────────────────────────────────────────────
   v4.3 — 사진 레이어를 요소 레이어와 분리했다.
     · #photoWrap : 사진만 담는 그룹. 확대·회전·이동 변환은 여기에만 걸린다.
     · #artLayer  : 차량·사람·기호·펜. 화면(캔버스) 좌표 그대로, 사진 배율·각도에
                    전혀 영향받지 않는다. 사진을 옮기거나 돌려도 요소는 제자리에 남는다.
     · 그래서 화면↔월드 좌표 변환이 항등이다 — 터치한 곳 = 그려지는 곳(요청 10).
       사진 배율·회전이 섞여 좌표가 어긋날 여지가 없다.

   사진 배율(k)은 '여백 0 기준'이다: 100%(k=1) = 그 각도에서 사진이 화면을 꽉 채우는
   최소 배율. 회전하면 그 각도의 cover 로 자동 확대되어 검은 여백이 생기지 않고,
   이동도 사진 가장자리가 화면 안으로 들어오지 못하게 잠근다.
   ========================================================================== */
window.AS = window.AS || {};
(function (AS) {
  'use strict';

  var C = AS.core, S = AS.S;
  var stageEl = null, photoWrapEl = null, photoEl = null, roadEl = null, boardEl = null;
  var lastW = 0, lastH = 0;
  var gesture = null;
  var pendingMeasure = false;

  /* 사진 배율 하한·상한 — 1 = 여백 없이 꽉 참(cover), 그 아래로는 내려가지 않는다 */
  var K_MIN = 1, K_MAX = 5;

  function f(n) { return Math.round(n * 100) / 100; }

  function init() {
    stageEl = C.$('#stage');
    boardEl = C.$('#board');
    photoWrapEl = C.$('#photoWrap');
    photoEl = C.$('#photoImg');
    roadEl = C.$('#roadLayer');
    lastW = 0; lastH = 0;
    measure();
    applyTransform();
    renderRoad();
    renderPhoto();
    syncMode();
  }

  /* ────────── 화면 크기 ────────── */
  /* 요소 좌표를 흔드는 중(그리기·드래그)에는 재측정을 미룬다 — 획을 긋는 도중
     주소창이 접히며 캔버스가 몇 px 커지면 좌표계 기준점이 바뀌어 선이 튀었다 */
  function isBusy() { return !!(AS.objs && AS.objs.isGesturing && AS.objs.isGesturing()); }

  function measure() {
    if (!stageEl) return;
    if (isBusy()) { pendingMeasure = true; return; }
    var r = stageEl.getBoundingClientRect();
    var w = Math.max(120, Math.round(r.width)), h = Math.max(160, Math.round(r.height));
    /* 방향 전환처럼 크게 바뀔 때만 요소 좌표를 비율로 옮긴다 —
       주소창 접힘 같은 몇 px 변화에 좌표가 조금씩 밀리지 않게 */
    if (lastW && lastH) {
      var rw = w / lastW, rh = h / lastH;
      if (Math.abs(rw - 1) > 0.06 || Math.abs(rh - 1) > 0.06) rescale(lastW, lastH, w, h);
    }
    S.stage.w = w; S.stage.h = h;
    lastW = w; lastH = h;
    if (boardEl) { boardEl.setAttribute('width', w); boardEl.setAttribute('height', h); }
    if (photoEl) { photoEl.setAttribute('width', w); photoEl.setAttribute('height', h); }
    clampPhoto();
    applyTransform();
  }

  /* 그리기가 끝나면 미뤄 둔 재측정을 한 번에 처리 */
  function flushMeasure() {
    if (!pendingMeasure || isBusy()) return;
    pendingMeasure = false;
    measure();
    AS.objs.chrome();
  }

  /* 지금 화면 크기가 저장된 S.stage 와 다르면 즉시 다시 잰다 —
     첫 터치가 옛 크기로 계산되는 stale rect 문제를 막는다 */
  function syncStageBox() {
    if (!stageEl || isBusy()) return;
    var r = stageEl.getBoundingClientRect();
    var w = Math.round(r.width), h = Math.round(r.height);
    if (Math.abs(w - (S.stage.w || 0)) > 0.5 || Math.abs(h - (S.stage.h || 0)) > 0.5) measure();
  }

  function rescale(ow, oh, nw, nh) {
    var rx = nw / ow, ry = nh / oh, rs = (rx + ry) / 2;
    S.objs.forEach(function (o) {
      o.x *= rx; o.y *= ry;
      if (o.w) o.w *= rs;
      if (o.type === 'memo') o.h *= rs;
      if (o.type === 'pen' && o.pts) o.pts = o.pts.map(function (q) { return [q[0] * rx, q[1] * ry]; });
    });
    var ph = S.photo || {};
    ph.tx = (ph.tx || 0) * rx; ph.ty = (ph.ty || 0) * ry;
  }

  /* ────────── 좌표 변환 — 요소는 화면 좌표 그대로 ────────── */
  function project(wx, wy) { return { x: wx, y: wy }; }
  function unproject(sx, sy) { return { x: sx, y: sy }; }
  function scale() { return 1; }
  function rot() { return 0; }

  /* ────────── 사진 변환 (사진 레이어 전용) ────────── */
  function relK() {
    var p = S.photo || {};
    var k = (isFinite(p.k) && p.k > 0) ? p.k : 1;
    return k < K_MIN ? K_MIN : (k > K_MAX ? K_MAX : k);
  }
  function rotDeg() { return (S.photo && isFinite(S.photo.rot)) ? S.photo.rot : 0; }

  /* 그 각도에서 사진이 화면을 덮는 최소 배율(cover) — 100%의 기준 */
  function coverK(rot) {
    var r = (rot || 0) * Math.PI / 180;
    var c = Math.abs(Math.cos(r)), s = Math.abs(Math.sin(r));
    var w = S.stage.w || 390, h = S.stage.h || 640;
    return Math.max(c + (h / w) * s, (w / h) * s + c) || 1;
  }
  function absK() { return coverK(rotDeg()) * relK(); }

  function xf() {
    var p = S.photo || {};
    return { k: absK(), rot: rotDeg(), tx: p.tx || 0, ty: p.ty || 0 };
  }

  function photoTransformString() {
    var t = xf(), cx = S.stage.w / 2, cy = S.stage.h / 2;
    var s = 'translate(' + f(cx + t.tx) + ',' + f(cy + t.ty) + ')';
    if (Math.abs(t.rot) > 0.001) s += ' rotate(' + f(t.rot) + ')';
    if (Math.abs(t.k - 1) > 0.0001) s += ' scale(' + (Math.round(t.k * 10000) / 10000) + ')';
    return s + ' translate(' + f(-cx) + ',' + f(-cy) + ')';
  }

  function applyTransform() {
    if (photoWrapEl) photoWrapEl.setAttribute('transform', S.mode === 'photo' ? photoTransformString() : '');
    if (AS.ui && AS.ui.syncPhotoZoom) AS.ui.syncPhotoZoom();
  }

  /* 슬라이더·＋·− 버튼용 — 화면 중앙을 기준으로 배율만 바꾼다 */
  function setPhotoScale(k) {
    if (S.mode !== 'photo' || !hasPhoto()) return;
    var p = S.photo;
    var k0 = absK();
    var k1 = coverK(rotDeg()) * C.clamp(Number(k) || relK(), K_MIN, K_MAX);
    if (Math.abs(k1 - k0) < 0.0001) { applyTransform(); return; }
    var ratio = k1 / k0;
    p.k = C.clamp(Number(k) || relK(), K_MIN, K_MAX);
    p.tx = (p.tx || 0) * ratio;
    p.ty = (p.ty || 0) * ratio;
    clampPhoto();
    applyTransform();
    AS.objs.chrome();
  }

  function photoScale() { return relK(); }

  /* ────────── 배경: 도로 ────────── */
  function renderRoad() {
    if (!roadEl) return;
    var isRoad = S.mode === 'road';
    if (stageEl) {
      stageEl.classList.toggle('blankroad', isRoad && (!S.roadId || S.roadId === 'blank'));
      stageEl.classList.toggle('photobg', !isRoad);
    }
    if (!isRoad || !S.roadId || S.roadId === 'blank') {
      roadEl.hidden = true;
      roadEl.innerHTML = '';
      return;
    }
    var w = Math.max(320, Math.round(S.stage.w || 390));
    var h = Math.max(320, Math.round(S.stage.h || 600));
    roadEl.hidden = false;
    roadEl.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h +
      '" preserveAspectRatio="none" width="100%" height="100%">' +
      AS.roads.build(S.roadId, w, h) + '</svg>';
  }

  function setRoad(id) {
    S.roadId = id || 'lane4';
    S.mode = 'road';
    S.sel = null;
    syncMode();
    renderRoad();
    renderPhoto();          /* 도로 모드에서는 사진 레이어를 반드시 숨긴다 (요청 8) */
    applyTransform();
    AS.objs.render();
    AS.ui.selbar();
    AS.core.save();
  }

  /* ────────── 배경: 사진 ────────── */
  function renderPhoto() {
    if (!photoEl) return;
    var src = (S.photo && S.photo.src) || '';
    var on = S.mode === 'photo' && !!src;
    if (src) photoEl.setAttribute('href', src);
    else photoEl.removeAttribute('href');
    photoEl.setAttribute('visibility', on ? 'visible' : 'hidden');
    if (photoWrapEl) photoWrapEl.setAttribute('visibility', on ? 'visible' : 'hidden');
    photoEl.setAttribute('width', S.stage.w);
    photoEl.setAttribute('height', S.stage.h);
  }

  function hasPhoto() { return !!(S.photo && S.photo.src); }

  function setPhoto(dataUrl) {
    S.photo = S.photo || {};
    S.photo.src = dataUrl || '';
    S.photo.k = 1; S.photo.rot = 0; S.photo.tx = 0; S.photo.ty = 0;
    S.photo.locked = true;          /* v5.0 — 기본은 고정(잠금). 조정할 때만 [사진 조정]을 켠다 */
    S.mode = 'photo';
    S.sel = null;
    syncMode();
    renderPhoto();
    applyTransform();
    if (AS.objs && AS.objs.render) AS.objs.render();
    if (AS.ui && AS.ui.selbar) AS.ui.selbar();
    AS.core.save();
  }

  function fitPhoto() {
    S.photo.k = 1; S.photo.rot = 0; S.photo.tx = 0; S.photo.ty = 0;
    applyTransform();
    AS.objs.chrome();
    AS.core.save();
  }

  function setLock(v, silent) {
    var was = !!(S.photo && S.photo.locked);
    S.photo.locked = !!v;
    if (!S.photo.locked) { S.sel = null; AS.objs.chrome(); AS.ui.selbar(); }
    syncMode();
    AS.core.save();
    if (!silent && S.photo.locked !== was) {
      AS.toast(S.photo.locked ? '사진 고정 — 이제 그 위에 바로 그릴 수 있어요' : '사진 조정 — 두 손가락으로 확대·회전, 한 손가락으로 이동');
    }
  }

  function isLocked() { return S.mode === 'photo' ? !!(S.photo && S.photo.locked) : true; }

  /* ────────── 화면 모드(도로/사진) ────────── */
  function setMode(mode) {
    var m = mode === 'photo' ? 'photo' : 'road';
    if (S.mode === m) return;
    S.mode = m;
    S.sel = null;
    S.tool = 'idle';
    syncMode();
    renderRoad();
    renderPhoto();
    applyTransform();
    AS.objs.render();
    AS.ui.selbar();
    if (AS.ui.syncTool) AS.ui.syncTool();
    AS.core.save();
    if (m === 'photo' && !hasPhoto()) {
      AS.toast('사진을 넣으면 그 위에 바로 그릴 수 있어요');
    }
  }

  function syncMode() {
    document.body.setAttribute('data-mode', S.mode);
    var seg = document.getElementById('modeSeg');
    if (seg) {
      Array.prototype.forEach.call(seg.querySelectorAll('button[data-mode]'), function (b) {
        var on = b.dataset.mode === S.mode;
        b.classList.toggle('on', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    }
    var bar = document.getElementById('photoBar');
    /* 사진 조정 — 사진이 올라와 있을 때만 1버튼. 기본은 '고정' 상태라 조정 바는 숨어 있다 */
    var locked = !!(S.photo && S.photo.locked);
    var adj = document.getElementById('btnPhotoAdj');
    if (adj) {
      adj.hidden = !(S.mode === 'photo' && hasPhoto());
      adj.setAttribute('aria-pressed', locked ? 'false' : 'true');
      adj.classList.toggle('on', !locked);
      var at = document.getElementById('photoAdjTxt');
      if (at) at.textContent = locked ? '사진 조정' : '조정 중';
    }
    if (bar) bar.hidden = !(S.mode === 'photo' && hasPhoto() && !locked);
    var empty = document.getElementById('emptyPhoto');
    if (empty) empty.hidden = !(S.mode === 'photo' && !hasPhoto());
    /* 모드가 바뀌면 배경 레이어 표시도 한 곳에서 함께 맞춘다 — 사진 모드가 아닌데
       사진 레이어가 남아 도로 뒤로 비치는 일이 없다 (요청 8) */
    renderPhoto();
  }

  /* ────────── 사진 변환 제스처 (조정 모드) ────────── */
  function gestureStart(mid, d, a) {
    var t = xf();
    var cx = S.stage.w / 2, cy = S.stage.h / 2;
    var u = (mid.x - cx - t.tx) / t.k, v = (mid.y - cy - t.ty) / t.k;
    var r = t.rot * Math.PI / 180, cs = Math.cos(r), sn = Math.sin(r);
    gesture = {
      k0: relK(), rot0: t.rot, d0: (isFinite(d) && d > 0) ? d : 1, a0: isFinite(a) ? a : 0,
      anchor: { x: cx + u * cs + v * sn, y: cy - u * sn + v * cs }
    };
  }

  function gestureMove(mid, d, a) {
    if (!gesture || S.mode !== 'photo') return;
    if (!isFinite(mid.x) || !isFinite(mid.y)) return;
    if (!isFinite(d) || d <= 0) d = gesture.d0;
    if (!isFinite(a)) a = gesture.a0;
    var k = C.clamp(gesture.k0 * (d / gesture.d0), K_MIN, K_MAX);
    var rr = gesture.rot0 + (a - gesture.a0);
    var cx = S.stage.w / 2, cy = S.stage.h / 2;
    var kAbs = coverK(rr) * k;
    var rad = rr * Math.PI / 180, cs = Math.cos(rad), sn = Math.sin(rad);
    var ax = gesture.anchor.x - cx, ay = gesture.anchor.y - cy;
    S.photo.k = k;
    S.photo.rot = rr;
    S.photo.tx = mid.x - cx - kAbs * (ax * cs - ay * sn);
    S.photo.ty = mid.y - cy - kAbs * (ax * sn + ay * cs);
    clampPhoto();
    applyTransform();
  }

  /* 사진 가장자리가 화면 안으로 들어오지 못하게 — 빈 곳(검은 여백) 0 보장 */
  function clampPhoto() {
    if (!S.photo) return;
    var w = S.stage.w || 390, h = S.stage.h || 640;
    var kAbs = absK();
    var r = rotDeg() * Math.PI / 180;
    var c = Math.abs(Math.cos(r)), s = Math.abs(Math.sin(r));
    var hx = (w * c + h * s) * kAbs / 2, hy = (w * s + h * c) * kAbs / 2;
    var lx = Math.max(0, hx - w / 2), ly = Math.max(0, hy - h / 2);
    S.photo.tx = C.clamp(isFinite(S.photo.tx) ? S.photo.tx : 0, -lx, lx);
    S.photo.ty = C.clamp(isFinite(S.photo.ty) ? S.photo.ty : 0, -ly, ly);
  }

  function gestureEnd() { gesture = null; }

  /* 지금 사진을 얼마나 더 옮길 수 있는지(px) — 100%에서는 여백 없이 꽉 차 있어 0 */
  function photoSlack() {
    var w = S.stage.w || 390, h = S.stage.h || 640;
    var kAbs = absK();
    var r = rotDeg() * Math.PI / 180;
    var c = Math.abs(Math.cos(r)), s = Math.abs(Math.sin(r));
    var hx = (w * c + h * s) * kAbs / 2, hy = (w * s + h * c) * kAbs / 2;
    return { x: Math.max(0, hx - w / 2), y: Math.max(0, hy - h / 2) };
  }

  AS.view = {
    init: init, measure: measure, rescale: rescale, syncStageBox: syncStageBox, flushMeasure: flushMeasure,
    project: project, unproject: unproject, scale: scale, rot: rot,
    worldTransform: photoTransformString, photoTransform: photoTransformString, applyTransform: applyTransform,
    setMode: setMode, syncMode: syncMode,
    setRoad: setRoad, renderRoad: renderRoad,
    setPhoto: setPhoto, renderPhoto: renderPhoto, hasPhoto: hasPhoto, fitPhoto: fitPhoto,
    setPhotoScale: setPhotoScale, photoScale: photoScale, K_MIN: K_MIN, K_MAX: K_MAX,
    coverK: coverK, absK: absK, relK: relK, rotDeg: rotDeg, photoSlack: photoSlack,
    setLock: setLock, isLocked: isLocked,
    gestureStart: gestureStart, gestureMove: gestureMove, gestureEnd: gestureEnd
  };
})(window.AS);
