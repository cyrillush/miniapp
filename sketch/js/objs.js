/* ==========================================================================
   objs.js — 객체 렌더 · 지도 투영 · 선택 · 드래그/회전/크기/핀치 · 펜
   ========================================================================== */
window.AS = window.AS || {};
(function (AS) {
  'use strict';
  var C = AS.core, $ = C.$, S = AS.S;
  var layer = null, selEl = null, boxEl = null, rotH = null, sizeH = null, angleEl = null, chipRot = null;
  var nodeOf = {};

  function init() {
    layer = $('#layer');
    selEl = $('#sel'); boxEl = selEl.querySelector('.selbox');
    rotH = selEl.querySelector('.hnd.rot'); sizeH = selEl.querySelector('.hnd.size');
    angleEl = selEl.querySelector('.angle'); chipRot = $('#chipRot');
    bindStage();
    bindHandles();
  }

  /* ─────────────────────────── 아트 마크업 ─────────────────────────── */
  function artInner(o) {
    var t = S.theme;
    if (o.type === 'car') return ART3.car(t, o.kind, o.role || 'self');
    if (o.type === 'person') return ART3.person(t, o.kind);
    if (o.type === 'sym') return ART3.sym(t, o.kind).s;
    return '';
  }

  function objMarkup(o) {
    var vb = o.vb || { x: 0, y: 0, w: 100, h: 100 };
    var w = o.w, h = o.w * (vb.h / vb.w);
    if (o.type === 'pen') {
      var d = penPath(o);
      return '<g class="ob" data-id="' + o.id + '">' + penStroke(o, d) + '</g>';
    }
    if (o.type === 'vec') return vecMarkup(o);
    if (o.type === 'memo') return memoMarkup(o);
    var k = w / vb.w;
    var flip = o.flip ? ' translate(' + (2 * (vb.x + vb.w / 2)) + ',0) scale(-1,1)' : '';
    return '<g class="ob" data-id="' + o.id + '" transform="translate(' + fmt(o._cx) + ',' + fmt(o._cy) + ') rotate(' + fmt(o.rot) + ') scale(' + o.sc + ')">' +
      '<g transform="translate(' + fmt(-w / 2) + ',' + fmt(-h / 2) + ') scale(' + k + ') translate(' + (-vb.x) + ',' + (-vb.y) + ')">' +
      (flip ? '<g transform="' + flip + '">' : '') +
      C.nsMarkup(artInner(o), o.id) +
      (flip ? '</g>' : '') +
      '</g></g>';
  }

  function fmt(n) { return Math.round(n * 100) / 100; }

  function penPath(o) {
    if (!o._pts || !o._pts.length) return '';
    var p = o._pts;
    var d = 'M' + fmt(p[0][0]) + ' ' + fmt(p[0][1]);
    for (var i = 1; i < p.length; i++) d += ' L' + fmt(p[i][0]) + ' ' + fmt(p[i][1]);
    return d;
  }

  function penStroke(o, d) {
    var col = o.color || '#E9413B';
    if (!d) return '';
    return '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + (o.lw || 3.4) +
      '" stroke-linecap="round" stroke-linejoin="round" opacity=".95"/>';
  }

  function vecMarkup(o) {
    var len = o.h;
    var col = o.color || themeAccent();
    var cx = o._cx, cy = o._cy;
    var head = Math.max(11, o.w * .55);
    return '<g class="ob" data-id="' + o.id + '" transform="translate(' + fmt(cx) + ',' + fmt(cy) + ') rotate(' + fmt(o.rot) + ')">' +
      '<path d="M0 ' + fmt(len / 2) + ' L0 ' + fmt(-len / 2 + head * .9) + '" fill="none" stroke="' + col +
      '" stroke-width="' + fmt(Math.max(3, 3.4 * (o.sc || 1))) + '" stroke-linecap="round" opacity=".95"/>' +
      '<path d="M0 ' + fmt(-len / 2) + ' L' + fmt(-head / 2) + ' ' + fmt(-len / 2 + head) + ' L' + fmt(head / 2) + ' ' + fmt(-len / 2 + head) + ' Z" fill="' + col + '" opacity=".95"/>' +
      '</g>';
  }

  function themeAccent() {
    return getComputedStyle(document.body).getPropertyValue('--acc').trim() || '#FF6B2C';
  }

  function memoMarkup(o) {
    var w = o.w, h = o.h;
    var t = S.theme;
    var fill = t === 'B' ? '#0C1A22' : t === 'C' ? '#16253A' : t === 'D' ? '#FFF6E4' : 'rgba(255,255,255,.94)';
    var stroke = t === 'B' ? 'rgba(47,230,255,.75)' : t === 'C' ? '#A7C2D8' : t === 'D' ? '#2B2724' : 'rgba(15,27,46,.16)';
    var ink = t === 'B' ? '#DFFEFF' : t === 'C' ? '#E7F2FB' : '#0F1B2E';
    var sw = t === 'D' ? 2.4 : 1.2;
    return '<g class="ob" data-id="' + o.id + '" transform="translate(' + fmt(o._cx) + ',' + fmt(o._cy) + ') rotate(' + fmt(o.rot) + ') scale(' + o.sc + ')">' +
      '<rect x="' + fmt(-w / 2) + '" y="' + fmt(-h / 2) + '" width="' + w + '" height="' + h + '" rx="' + (t === 'C' ? 3 : 9) + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '"/>' +
      '<text x="0" y="1" text-anchor="middle" dominant-baseline="middle" font-size="12.5" font-weight="700" fill="' + ink +
      '" font-family="Pretendard,Apple SD Gothic Neo,Noto Sans KR,sans-serif">' + esc(o.text || '') + '</text>' +
      '</g>';
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

  function badgeMarkup(o) {
    if (o.type !== 'car' || !o.role || o.role === 'none') return '';
    var t = S.theme, acc = ART3.acc(t, o.role), L = C.ROLE_SHORT[o.role];
    var x = fmt(o._cx), y = fmt(o._cy);
    var r = C.clamp(o.w * o.sc * .155, 6.5, 11);
    var fs = fmt(r * 1.06);
    var txt = 'font-size="' + fs + '" font-weight="800" text-anchor="middle" dominant-baseline="central" font-family="Pretendard,Apple SD Gothic Neo,Noto Sans KR,sans-serif"';
    if (t === 'B') return '<g><circle cx="' + x + '" cy="' + y + '" r="' + fmt(r) + '" fill="#05090D" stroke="' + acc + '" stroke-width="1.5"/><text x="' + x + '" y="' + y + '" ' + txt + ' fill="' + acc + '">' + L + '</text></g>';
    if (t === 'D') return '<g><circle cx="' + x + '" cy="' + y + '" r="' + fmt(r) + '" fill="' + acc + '" stroke="#FFFFFF" stroke-width="' + fmt(r * .3) + '"/><text x="' + x + '" y="' + y + '" ' + txt + ' fill="#FFFFFF">' + L + '</text></g>';
    if (t === 'C') return '<g><circle cx="' + x + '" cy="' + y + '" r="' + fmt(r * .95) + '" fill="#0F2033" stroke="' + acc + '" stroke-width="1.2"/><text x="' + x + '" y="' + y + '" ' + txt + ' fill="' + acc + '">' + L + '</text></g>';
    return '<g><circle cx="' + x + '" cy="' + y + '" r="' + fmt(r) + '" fill="#FFFFFF" stroke="' + acc + '" stroke-width="' + fmt(Math.max(1.4, r * .21)) + '"/><text x="' + x + '" y="' + y + '" ' + txt + ' fill="' + acc + '">' + L + '</text></g>';
  }

  /* ─────────────────────────── 렌더 ─────────────────────────── */
  function render() {
    if (!layer) return;
    projectAll();
    var out = [];
    for (var i = 0; i < S.objs.length; i++) {
      var o = S.objs[i];
      if (!isFine(o)) continue;
      out.push(objMarkup(o));
    }
    var badges = S.objs.map(badgeMarkup).join('');
    layer.innerHTML = out.join('') + (badges ? '<g class="badges">' + badges + '</g>' : '');
    nodeOf = {};
    Array.prototype.forEach.call(layer.querySelectorAll('.ob'), function (g) { nodeOf[g.getAttribute('data-id')] = g; });
    chrome();
  }

  function isFine(o) { return o && isFinite(o._cx) && isFinite(o._cy); }

  function projectAll() {
    var m = AS.mapx.map;
    if (!m) return;
    for (var i = 0; i < S.objs.length; i++) {
      var o = S.objs[i];
      var p = m.latLngToContainerPoint([o.lat, o.lng]);
      o._cx = p.x; o._cy = p.y;
      if (o.type === 'pen' && o.pts) {
        o._pts = o.pts.map(function (q) {
          var r = m.latLngToContainerPoint([q[0], q[1]]);
          return [r.x, r.y];
        });
      }
    }
  }

  /* 지도 이동/줌 시 위치만 갱신 (구조 재생성 없이) */
  function layout() {
    if (!layer) return;
    projectAll();
    for (var i = 0; i < S.objs.length; i++) {
      var o = S.objs[i], g = nodeOf[o.id];
      if (!g || !isFine(o)) continue;
      if (o.type === 'pen') {
        var path = g.firstChild;
        if (path) path.setAttribute('d', penPath(o));
      } else {
        g.setAttribute('transform', 'translate(' + fmt(o._cx) + ',' + fmt(o._cy) + ')' +
          (o.rot ? ' rotate(' + fmt(o.rot) + ')' : '') + (o.sc !== 1 ? ' scale(' + o.sc + ')' : ''));
      }
    }
    var bg = layer.querySelector('.badges');
    if (bg) bg.innerHTML = S.objs.map(badgeMarkup).join('');
    chrome();
  }

  /* ─────────────────────────── 선택 크롬 ─────────────────────────── */
  function selObj() {
    for (var i = 0; i < S.objs.length; i++) if (S.objs[i].id === S.sel) return S.objs[i];
    return null;
  }

  function chrome() {
    var o = selObj();
    if (!o || !isFine(o)) { selEl.classList.remove('on'); hideHandles(); return; }
    selEl.classList.add('on');
    var W = o.type === 'pen' ? 0 : o.w * o.sc;
    var H = o.type === 'pen' ? 0 : (o.type === 'memo' ? o.h : (o.w * (o.vb.h / o.vb.w))) * o.sc;
    if (o.type === 'pen') {
      var xs = o._pts.map(function (p) { return p[0]; }), ys = o._pts.map(function (p) { return p[1]; });
      var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
      var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
      W = Math.max(14, x1 - x0); H = Math.max(14, y1 - y0);
      boxEl.style.width = W + 'px'; boxEl.style.height = H + 'px';
      boxEl.style.transform = 'translate(' + fmt((x0 + x1) / 2 - W / 2) + 'px,' + fmt((y0 + y1) / 2 - H / 2) + 'px)';
      boxEl.style.borderRadius = '10px';
      rotH.hidden = true; sizeH.hidden = true; angleEl.hidden = true;
      return;
    }
    boxEl.style.width = W + 'px'; boxEl.style.height = H + 'px';
    boxEl.style.borderRadius = (S.theme === 'C' ? 2 : 4) + 'px';
    boxEl.style.transform = 'translate(' + fmt(o._cx - W / 2) + 'px,' + fmt(o._cy - H / 2) + 'px) rotate(' + fmt(o.rot) + 'deg)';
    var rp = rotPt(o._cx, o._cy, 0, -(H / 2 + 30), o.rot);
    var sp = rotPt(o._cx, o._cy, W / 2 + 7, H / 2 + 7, o.rot);
    rotH.hidden = false; sizeH.hidden = false;
    rotH.style.left = rp[0] + 'px'; rotH.style.top = rp[1] + 'px';
    sizeH.style.left = sp[0] + 'px'; sizeH.style.top = sp[1] + 'px';
    if (!angleEl.hidden) {
      var ap = rotPt(o._cx, o._cy, 0, -(H / 2 + 62), o.rot);
      angleEl.style.left = ap[0] + 'px'; angleEl.style.top = ap[1] + 'px';
    }
  }

  function hideHandles() { rotH.hidden = true; sizeH.hidden = true; angleEl.hidden = true; if (chipRot) chipRot.hidden = true; }

  function rotPt(cx, cy, dx, dy, deg) {
    var r = (deg || 0) * Math.PI / 180;
    return [cx + dx * Math.cos(r) - dy * Math.sin(r), cy + dx * Math.sin(r) + dy * Math.cos(r)];
  }

  function select(id, opts) {
    if (S.sel === id) return;
    S.sel = id;
    chrome();
    AS.ui.selbar();
    if (id && !(opts && opts.silent)) AS.mapx.setLock(true, true);
  }
  function deselect() {
    if (!S.sel) return;
    S.sel = null;
    chrome(); AS.ui.selbar();
  }

  /* ─────────────────────────── 히트 테스트 ─────────────────────────── */
  function hit(x, y) {
    for (var i = S.objs.length - 1; i >= 0; i--) {
      var o = S.objs[i];
      if (!isFine(o)) continue;
      if (o.type === 'pen') {
        var p = o._pts || [];
        for (var j = 1; j < p.length; j++) if (segDist(x, y, p[j - 1][0], p[j - 1][1], p[j][0], p[j][1]) < 13) return o;
        continue;
      }
      var W = o.w * o.sc, H = (o.type === 'memo' ? o.h : o.w * (o.vb.h / o.vb.w)) * o.sc;
      var dx = x - o._cx, dy = y - o._cy;
      var r = -(o.rot || 0) * Math.PI / 180;
      var lx = dx * Math.cos(r) - dy * Math.sin(r);
      var ly = dx * Math.sin(r) + dy * Math.cos(r);
      var pad = o.type === 'car' ? 2 : 4;
      if (Math.abs(lx) <= W / 2 + pad && Math.abs(ly) <= H / 2 + pad) return o;
    }
    return null;
  }

  function segDist(px, py, x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy;
    var t = L ? ((px - x1) * dx + (py - y1) * dy) / L : 0;
    t = C.clamp(t, 0, 1);
    var qx = x1 + t * dx, qy = y1 + t * dy;
    return Math.hypot(px - qx, py - qy);
  }

  /* ─────────────────────────── 제스처 ─────────────────────────── */
  var ptrs = {}, drag = null, base = null, penDraft = null, vecDraft = null;

  function ptOf(e) {
    var r = $('#stage').getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function pcount() { return Object.keys(ptrs).length; }
  function twoPtrs() {
    var k = Object.keys(ptrs);
    return [ptrs[k[0]], ptrs[k[1]]];
  }

  function bindStage() {
    var stage = $('#stage');
    stage.addEventListener('pointerdown', onDown, true);
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  function onDown(e) {
    if (e.button && e.button !== 0) return;
    var tg = e.target;
    if (tg && tg.closest && tg.closest('.hnd')) return;
    var p = ptOf(e);
    ptrs[e.pointerId] = p;

    if (pcount() === 2 && drag) {
      var t = twoPtrs();
      drag.mode = 'pinch';
      drag.d0 = Math.hypot(t[0].x - t[1].x, t[0].y - t[1].y) || 1;
      drag.a0 = Math.atan2(t[1].y - t[0].y, t[1].x - t[0].x) * 180 / Math.PI;
      drag.sc0 = drag.o.sc; drag.rot0 = drag.o.rot;
      return;
    }
    if (pcount() > 1) return;

    if (S.tool === 'pen') {
      e.stopPropagation(); e.preventDefault();
      startPen(p);
      return;
    }
    if (S.tool === 'vec') {
      e.stopPropagation(); e.preventDefault();
      startVec(p);
      return;
    }

    var o = hit(p.x, p.y);
    if (o) {
      e.stopPropagation(); e.preventDefault();
      if (S.tool === 'memo') { S.tool = 'idle'; AS.ui.syncTool(); AS.ui.memo(p); return; }
      select(o.id, { silent: true });
      if (!S.lock) AS.mapx.setLock(true, true); else AS.ui.selbar();
      // 지도 잠금을 유지한 채(이미 잠김) 드래그 시작
      drag = { mode: 'move', o: o, p0: p, sx: o._cx, sy: o._cy, lat0: o.lat, lng0: o.lng, moved: false };
      try { $('#stage').setPointerCapture(e.pointerId); } catch (er) { }
      return;
    }
    // 빈 곳
    if (S.tool === 'memo') { S.tool = 'idle'; AS.ui.syncTool(); AS.ui.memo(p); e.stopPropagation(); e.preventDefault(); return; }
    if (S.sel) deselect();
  }

  function onMove(e) {
    if (!ptrs[e.pointerId]) return;
    ptrs[e.pointerId] = ptOf(e);
    if (penDraft) { extendPen(ptrs[e.pointerId]); return; }
    if (vecDraft) { extendVec(ptrs[e.pointerId]); return; }
    if (!drag) return;
    e.preventDefault();
    var o = drag.o;

    if (drag.mode === 'pinch') {
      var t = twoPtrs();
      var d = Math.hypot(t[0].x - t[1].x, t[0].y - t[1].y) || 1;
      var a = Math.atan2(t[1].y - t[0].y, t[1].x - t[0].x) * 180 / Math.PI;
      o.sc = C.clamp(drag.sc0 * (d / drag.d0), .4, 3);
      var rot = drag.rot0 + (a - drag.a0);
      o.rot = S.snap ? snapAngle(rot) : ((rot % 360) + 360) % 360;
      showAngle(o.rot);
      render(); AS.ui.selbar(); drag.moved = true;
      return;
    }
    if (drag.mode === 'move') {
      var cur = ptrs[e.pointerId];
      var dx = cur.x - drag.p0.x, dy = cur.y - drag.p0.y;
      if (!drag.moved && Math.hypot(dx, dy) < 3) return;
      drag.moved = true;
      var ll = AS.mapx.unproject(drag.sx + dx, drag.sy + dy);
      o.lat = ll.lat; o.lng = ll.lng;
      var p = AS.mapx.project(o.lat, o.lng);
      o._cx = p.x; o._cy = p.y;
      var g = nodeOf[o.id];
      if (g) g.setAttribute('transform', 'translate(' + fmt(o._cx) + ',' + fmt(o._cy) + ')' + (o.rot ? ' rotate(' + fmt(o.rot) + ')' : '') + (o.sc !== 1 ? ' scale(' + o.sc + ')' : ''));
      layoutBadge(o);
      chrome();
    }
  }

  function layoutBadge(o) {
    var bg = layer && layer.querySelector('.badges');
    if (!bg) return;
    bg.innerHTML = S.objs.map(badgeMarkup).join('');
  }

  function onUp(e) {
    if (!ptrs[e.pointerId]) { return; }
    delete ptrs[e.pointerId];
    if (penDraft) { finishPen(); return; }
    if (vecDraft) { finishVec(); return; }
    if (!drag) return;
    if (drag.mode === 'pinch' && pcount() === 1) { drag.mode = 'move'; var k = Object.keys(ptrs)[0]; drag.p0 = ptrs[k]; drag.moved = true; }
    if (pcount() > 0) return;
    if (drag.moved) {
      C.pushUndo();
      if (drag.o && drag.o.lat !== undefined) { /* 위치 커밋 */ }
      C.save();
      AS.ui.selbar();
    }
    drag = null;
    showAngle(null);
  }

  function snapAngle(v) {
    var n = Math.round(v / 15) * 15;
    return Math.abs(((v - n + 180) % 360) - 180) <= 4 ? ((n % 360) + 360) % 360 : ((v % 360) + 360) % 360;
  }

  function showAngle(v) {
    if (v === null || v === undefined) {
      if (angleEl) angleEl.hidden = true;
      if (chipRot) chipRot.hidden = true;
      return;
    }
    var txt = Math.round(v) + '°';
    if (angleEl) { angleEl.hidden = false; angleEl.textContent = txt; }
    if (chipRot) { chipRot.hidden = true; }
  }

  /* ─────────────────────────── 핸들 ─────────────────────────── */
  function bindHandles() {
    rotH.addEventListener('pointerdown', function (e) {
      var o = selObj(); if (!o) return;
      e.stopPropagation(); e.preventDefault();
      var p = ptOf(e);
      var a0 = Math.atan2(p.y - o._cy, p.x - o._cx) * 180 / Math.PI;
      var start = o.rot;
      angleEl.hidden = false;
      var move = function (ev) {
        var q = ptOf(ev);
        var a = Math.atan2(q.y - o._cy, q.x - o._cx) * 180 / Math.PI;
        var r = start + (a - a0);
        o.rot = S.snap ? snapAngle(((r % 360) + 360) % 360) : ((r % 360) + 360) % 360;
        angleEl.textContent = Math.round(o.rot) + '°';
        render(); AS.ui.selbar();
      };
      var up = function () {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        angleEl.hidden = true;
        C.pushUndo(); C.save();
      };
      window.addEventListener('pointermove', move, { passive: false });
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    });

    sizeH.addEventListener('pointerdown', function (e) {
      var o = selObj(); if (!o) return;
      e.stopPropagation(); e.preventDefault();
      var p = ptOf(e);
      var d0 = Math.max(12, Math.hypot(p.x - o._cx, p.y - o._cy));
      var s0 = o.sc;
      var move = function (ev) {
        var q = ptOf(ev);
        var d = Math.hypot(q.x - o._cx, q.y - o._cy);
        o.sc = C.clamp(s0 * (d / d0), .4, 3);
        render(); AS.ui.selbar();
      };
      var up = function () {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        C.pushUndo(); C.save();
      };
      window.addEventListener('pointermove', move, { passive: false });
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    });
  }

  /* ─────────────────────────── 펜 ─────────────────────────── */
  function startPen(p) {
    var ll = AS.mapx.unproject(p.x, p.y);
    penDraft = {
      id: C.uid(), type: 'pen', lat: ll.lat, lng: ll.lng, rot: 0, sc: 1,
      w: 1, h: 1, color: S.pen.color, lw: 3.4,
      pts: [[ll.lat, ll.lng]]
    };
    penDraft._cx = p.x; penDraft._cy = p.y; penDraft._pts = [[p.x, p.y]];
    S.objs.push(penDraft);
    render();
  }
  function extendPen(p) {
    var last = penDraft._pts[penDraft._pts.length - 1];
    if (Math.hypot(p.x - last[0], p.y - last[1]) < 2.4) return;
    var ll = AS.mapx.unproject(p.x, p.y);
    penDraft.pts.push([ll.lat, ll.lng]);
    penDraft._pts.push([p.x, p.y]);
    var g = nodeOf[penDraft.id];
    if (g && g.firstChild) g.firstChild.setAttribute('d', penPath(penDraft));
  }
  function finishPen() {
    if (!penDraft) return;
    if (penDraft.pts.length < 2) {
      S.objs = S.objs.filter(function (o) { return o !== penDraft; });
      AS.toast('점을 찍었어요 — 길게 그어 보세요');
    } else {
      C.pushUndo();
    }
    penDraft = null;
    render(); AS.ui.selbar(); C.save();
  }

  /* ─────────────────────────── 직선 화살표 ─────────────────────────── */
  function startVec(p) {
    var ll = AS.mapx.unproject(p.x, p.y);
    vecDraft = {
      id: C.uid(), type: 'vec', lat: ll.lat, lng: ll.lng, rot: 0, sc: 1,
      w: 44, h: 90, color: themeAccent(), _cx: p.x, _cy: p.y, _x0: p.x, _y0: p.y
    };
    S.objs.push(vecDraft);
    render();
  }
  function extendVec(p) {
    var d = Math.hypot(p.x - vecDraft._x0, p.y - vecDraft._y0);
    if (d < 4) return;
    var ang = Math.atan2(p.y - vecDraft._y0, p.x - vecDraft._x0) * 180 / Math.PI + 90;
    var mid = { x: (p.x + vecDraft._x0) / 2, y: (p.y + vecDraft._y0) / 2 };
    var ll = AS.mapx.unproject(mid.x, mid.y);
    vecDraft.lat = ll.lat; vecDraft.lng = ll.lng;
    vecDraft._cx = mid.x; vecDraft._cy = mid.y;
    vecDraft.rot = S.snap ? snapAngle(((ang % 360) + 360) % 360) : ((ang % 360) + 360) % 360;
    vecDraft.h = Math.max(24, d);
    render();
  }
  function finishVec() {
    if (!vecDraft) return;
    if (vecDraft.h < 26) {
      vecDraft.h = 90;
      var ll2 = AS.mapx.unproject(vecDraft._x0, vecDraft._y0);
      vecDraft.lat = ll2.lat; vecDraft.lng = ll2.lng;
      vecDraft._cx = vecDraft._x0; vecDraft._cy = vecDraft._y0;
    }
    C.pushUndo();
    var id = vecDraft.id;
    vecDraft = null;
    select(id); render(); AS.ui.selbar(); C.save();
  }

  /* ─────────────────────────── 추가/조작 API ─────────────────────────── */
  function add(spec, at) {
    var p = at || (function () {
      var m = AS.mapx.map;
      var r = $('#stage').getBoundingClientRect();
      var c = m.latLngToContainerPoint(m.getCenter());
      var n = S.objs.length;
      return { x: c.x + ((n % 3) - 1) * 26, y: c.y + (Math.floor(n / 3) % 3 - 1) * 22 };
    })();
    var ll = at ? at.ll : AS.mapx.unproject(p.x, p.y);
    var o = C.makeObj(spec, ll.lat, ll.lng);
    if (spec.type === 'memo') o.text = spec.text || '';
    S.objs.push(o);
    C.pushUndo();
    S.sel = o.id;
    render(); AS.ui.selbar(); C.save();
    AS.mapx.setLock(true, true);
    return o;
  }

  function addMemo(text, x, y) {
    var ll = AS.mapx.unproject(x, y);
    var o = {
      id: C.uid(), type: 'memo', kind: 'memo', lat: ll.lat, lng: ll.lng, rot: 0, sc: 1,
      text: text, w: Math.max(64, text.length * 13 + 20), h: 28, vb: { x: 0, y: 0, w: 10, h: 10 }
    };
    S.objs.push(o); C.pushUndo(); S.sel = o.id;
    render(); AS.ui.selbar(); C.save();
    AS.mapx.setLock(true, true);
  }

  function update(fn) {
    var o = selObj(); if (!o) return;
    fn(o);
    render(); AS.ui.selbar(); AS.mapx.setLock(true);
  }

  function del() {
    var o = selObj(); if (!o) return;
    C.pushUndo();
    S.objs = S.objs.filter(function (v) { return v.id !== o.id; });
    S.sel = null;
    render(); AS.ui.selbar(); C.save();
    AS.toast('삭제했어요');
  }

  function dup() {
    var o = selObj(); if (!o) return;
    var copy = JSON.parse(JSON.stringify(o));
    copy.id = C.uid();
    var p = AS.mapx.project(o.lat, o.lng);
    var ll = AS.mapx.unproject(p.x + 22, p.y + 18);
    copy.lat = ll.lat; copy.lng = ll.lng;
    S.objs.push(copy); C.pushUndo();
    S.sel = copy.id;
    render(); AS.ui.selbar(); C.save();
  }

  function scaleBy(k) {
    var o = selObj(); if (!o) return;
    o.sc = C.clamp(Math.round((o.sc * k) * 100) / 100, .4, 3);
    C.pushUndo(); render(); AS.ui.selbar(); C.save();
  }

  function svgMarkup() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + S.stage.w + '" height="' + S.stage.h + '">' + layer.innerHTML + '</svg>';
  }

  AS.objs = {
    init: init, render: render, layout: layout, chrome: chrome, hit: hit, select: select, deselect: deselect,
    add: add, addMemo: addMemo, update: update, del: del, dup: dup, scaleBy: scaleBy,
    selObj: selObj, svgMarkup: svgMarkup, projectAll: projectAll, esc: esc
  };
})(window.AS);
