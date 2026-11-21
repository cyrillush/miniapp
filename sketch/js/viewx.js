/* ==========================================================================
   viewx.js — 약도 캔버스 · 두 가지 배경(도로 도면 / 갤러리 사진) · 좌표 변환
   ──────────────────────────────────────────────────────────────────────────
   온라인 지도(타일·검색·GPS·3D·나침반)는 이 버전에서 완전히 사라졌다.
   남은 배경은 딱 두 가지다.
     ① 도로  : 고른 도로 템플릿 59종을 화면에 꽉 차게 깔아 둔 단색 도면
     ② 사진  : 갤러리에서 불러온 사진 한 장만 깔린 단색 배경

   좌표계
     - 요소(x, y)와 펜 점은 '월드' 좌표(캔버스 기준 px)에 저장한다.
     - 사진 모드의 사진은 월드에 꽉 차게 깔리고, 사진 조정(확대·회전·이동)은
       #world 그룹 하나의 변환으로 표현된다. 그래서 사진을 움직여도 그 위에
       놓은 요소가 사진에 붙은 채로 함께 움직인다.
     - 사진이 '고정'되면 변환이 멈추고 요소 배치·펜 그리기만 동작한다.
   ========================================================================== */
window.AS = window.AS || {};
(function (AS) {
  'use strict';

  var C = AS.core, S = AS.S;
  var stageEl = null, worldEl = null, photoEl = null, roadEl = null, boardEl = null;
  var lastW = 0, lastH = 0;
  var gesture = null;

  function f(n) { return Math.round(n * 100) / 100; }

  function init() {
    stageEl = C.$('#stage');
    boardEl = C.$('#board');
    worldEl = C.$('#world');
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
  function measure() {
    if (!stageEl) return;
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

  /* ────────── 좌표 변환 ────────── */
  function xf() {
    if (S.mode !== 'photo') return { k: 1, rot: 0, tx: 0, ty: 0 };
    var p = S.photo || {};
    return { k: p.k || 1, rot: p.rot || 0, tx: p.tx || 0, ty: p.ty || 0 };
  }

  function project(wx, wy) {
    var t = xf(), cx = S.stage.w / 2, cy = S.stage.h / 2;
    var dx = wx - cx, dy = wy - cy, r = t.rot * Math.PI / 180;
    var cs = Math.cos(r), sn = Math.sin(r);
    return {
      x: cx + t.tx + t.k * (dx * cs - dy * sn),
      y: cy + t.ty + t.k * (dx * sn + dy * cs)
    };
  }

  function unproject(sx, sy) {
    var t = xf(), cx = S.stage.w / 2, cy = S.stage.h / 2;
    var u = (sx - cx - t.tx) / t.k, v = (sy - cy - t.ty) / t.k;
    var r = t.rot * Math.PI / 180, cs = Math.cos(r), sn = Math.sin(r);
    return { x: cx + u * cs + v * sn, y: cy - u * sn + v * cs };
  }

  function scale() { return xf().k; }
  function rot() { return xf().rot; }

  function worldTransformString() {
    var t = xf(), cx = S.stage.w / 2, cy = S.stage.h / 2;
    var s = 'translate(' + f(cx + t.tx) + ',' + f(cy + t.ty) + ')';
    if (Math.abs(t.rot) > 0.001) s += ' rotate(' + f(t.rot) + ')';
    if (Math.abs(t.k - 1) > 0.0001) s += ' scale(' + (Math.round(t.k * 10000) / 10000) + ')';
    return s + ' translate(' + f(-cx) + ',' + f(-cy) + ')';
  }

  function applyTransform() {
    if (worldEl) worldEl.setAttribute('transform', worldTransformString());
  }

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
    photoEl.setAttribute('width', S.stage.w);
    photoEl.setAttribute('height', S.stage.h);
  }

  function hasPhoto() { return !!(S.photo && S.photo.src); }

  function setPhoto(dataUrl) {
    S.photo = S.photo || {};
    S.photo.src = dataUrl || '';
    S.photo.k = 1; S.photo.rot = 0; S.photo.tx = 0; S.photo.ty = 0;
    S.photo.locked = false;          /* 사진을 넣으면 바로 '사진 조정' 상태 */
    S.mode = 'photo';
    S.sel = null;
    syncMode();
    renderPhoto();
    applyTransform();
    AS.objs.render();
    AS.ui.selbar();
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
      AS.toast(S.photo.locked ? '사진 고정 — 이제 그 위에 바로 그릴 수 있어요' : '사진 조정 — 두 손가락으로 확대·회전');
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
    if (bar) bar.hidden = !(S.mode === 'photo' && hasPhoto());
    var empty = document.getElementById('emptyPhoto');
    if (empty) empty.hidden = !(S.mode === 'photo' && !hasPhoto());
    var lockBtn = document.getElementById('btnPhotoLock');
    if (lockBtn) {
      var locked = !!(S.photo && S.photo.locked);
      lockBtn.setAttribute('aria-pressed', locked ? 'true' : 'false');
      var t = document.getElementById('photoLockTxt');
      if (t) t.textContent = locked ? '사진 고정' : '사진 조정';
    }
    if (AS.ui && AS.ui.syncCapture) AS.ui.syncCapture();
  }

  /* ────────── 사진 변환 제스처 (조정 모드) ────────── */
  function gestureStart(mid, d, a) {
    var t = xf();
    gesture = {
      k0: t.k, rot0: t.rot, d0: (isFinite(d) && d > 0) ? d : 1, a0: isFinite(a) ? a : 0,
      anchor: unproject(mid.x, mid.y)
    };
  }

  function gestureMove(mid, d, a) {
    if (!gesture || S.mode !== 'photo') return;
    if (!isFinite(mid.x) || !isFinite(mid.y)) return;
    if (!isFinite(d) || d <= 0) d = gesture.d0;
    if (!isFinite(a)) a = gesture.a0;
    var k = C.clamp(gesture.k0 * (d / gesture.d0), 1, 8);
    var rr = gesture.rot0 + (a - gesture.a0);
    var cx = S.stage.w / 2, cy = S.stage.h / 2;
    var rad = rr * Math.PI / 180, cs = Math.cos(rad), sn = Math.sin(rad);
    var ax = gesture.anchor.x - cx, ay = gesture.anchor.y - cy;
    S.photo.k = k;
    S.photo.rot = rr;
    S.photo.tx = mid.x - cx - k * (ax * cs - ay * sn);
    S.photo.ty = mid.y - cy - k * (ax * sn + ay * cs);
    clampPhoto();
    applyTransform();
  }

  /* 사진이 화면 밖으로 완전히 사라지지 않게 — 화면 중앙이 사진 영역 안에 남도록 */
  function clampPhoto() {
    var w = S.stage.w, h = S.stage.h, cx = w / 2, cy = h / 2;
    var pts = [project(0, 0), project(w, 0), project(w, h), project(0, h)];
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    pts.forEach(function (p) {
      if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
    });
    if (maxX < cx) S.photo.tx += cx - maxX;
    else if (minX > cx) S.photo.tx -= minX - cx;
    if (maxY < cy) S.photo.ty += cy - maxY;
    else if (minY > cy) S.photo.ty -= minY - cy;
  }

  function gestureEnd() { gesture = null; }

  AS.view = {
    init: init, measure: measure, rescale: rescale,
    project: project, unproject: unproject, scale: scale, rot: rot,
    worldTransform: worldTransformString, applyTransform: applyTransform,
    setMode: setMode, syncMode: syncMode,
    setRoad: setRoad, renderRoad: renderRoad,
    setPhoto: setPhoto, renderPhoto: renderPhoto, hasPhoto: hasPhoto, fitPhoto: fitPhoto,
    setLock: setLock, isLocked: isLocked,
    gestureStart: gestureStart, gestureMove: gestureMove, gestureEnd: gestureEnd
  };
})(window.AS);
