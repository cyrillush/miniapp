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
  function carSpriteSVG(kind, role) {
    var sp = window.CAR_SPRITES && window.CAR_SPRITES[kind];
    if (!sp) return null;
    var rm = C.roleMeta(role);
    var col = rm.color;
    var pad = 6, maxW = 120 - pad * 2, maxH = 200 - pad * 2;
    var aspect = sp.w / sp.h;
    var iw = maxH * aspect, ih = maxH;
    if (iw > maxW) { iw = maxW; ih = maxW / aspect; }
    var x = (120 - iw) / 2, y = (200 - ih) / 2;
    var ring = rm.key === 'none' ? '' :
      '<rect x="' + fmt(x - 4) + '" y="' + fmt(y - 4) + '" width="' + fmt(iw + 8) + '" height="' + fmt(ih + 8) +
      '" rx="' + fmt(Math.min(24, iw * .38)) + '" fill="' + col + '" fill-opacity=".10" stroke="' + col +
      '" stroke-width="2.6" stroke-opacity=".85"/>' +
      '<path d="M60 ' + fmt(Math.max(2, y - 9)) + ' L53 ' + fmt(Math.max(8, y - 1)) + ' L67 ' + fmt(Math.max(8, y - 1)) + ' Z" fill="' + col + '"/>';
    return ring + '<image href="' + sp.src + '" x="' + fmt(x) + '" y="' + fmt(y) + '" width="' + fmt(iw) + '" height="' + fmt(ih) + '" preserveAspectRatio="xMidYMid meet"/>';
  }

  function artInner(o) {
    var t = S.theme;
    if (o.type === 'car') {
      if (S.carMode !== 'vector') {
        var sp = carSpriteSVG(o.kind, o.role || 'self');
        if (sp) return sp;
      }
      var rm = C.roleMeta(o.role || 'self');
      var rKey = rm.key === 'self' ? 'self' : rm.key === 'c1' ? 'other' : rm.key === 'none' ? 'none' : 'third';
      return ART3.car(t, o.kind, rKey);
    }
    if (o.type === 'person') return ART3.person(t, o.kind);
    if (o.type === 'sym') return ART3.sym(t, o.kind).s;
    return '';
  }

  function dispRot(o) {
    if (!o || o.type === 'memo') return (o && o.rot) || 0;
    return (((o.rot || 0) + (S.view.bearing || 0)) % 360 + 360) % 360;
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
    var dr = dispRot(o);
    var flip = o.flip ? ' translate(' + (2 * (vb.x + vb.w / 2)) + ',0) scale(-1,1)' : '';
    return '<g class="ob" data-id="' + o.id + '" transform="translate(' + fmt(o._cx) + ',' + fmt(o._cy) + ') rotate(' + fmt(dr) + ') scale(' + o.sc + ')">' +
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
    var lw = o.lw || 3.4;
    var out = '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + lw +
      '" stroke-linecap="round" stroke-linejoin="round" opacity=".95"/>';
    if (o.arrowEnd && o._pts && o._pts.length >= 2) {
      var pts = o._pts, n = pts.length;
      var p1 = pts[n - 2], p2 = pts[n - 1];
      for (var k = n - 2; k >= 0; k--) {
        if (Math.hypot(p2[0] - pts[k][0], p2[1] - pts[k][1]) > 4) { p1 = pts[k]; break; }
      }
      var ang = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
      var hs = Math.max(12, lw * 3.6);
      var a1 = ang - Math.PI * 0.82, a2 = ang + Math.PI * 0.82;
      var x1 = p2[0] + Math.cos(a1) * hs, y1 = p2[1] + Math.sin(a1) * hs;
      var x2 = p2[0] + Math.cos(a2) * hs, y2 = p2[1] + Math.sin(a2) * hs;
      out += '<path d="M' + fmt(p2[0]) + ' ' + fmt(p2[1]) + ' L' + fmt(x1) + ' ' + fmt(y1) +
        ' L' + fmt(x2) + ' ' + fmt(y2) + ' Z" fill="' + col + '" opacity=".95"/>';
    }
    return out;
  }

  function vecMarkup(o) {
    var len = o.h;
    var col = o.color || themeAccent();
    var cx = o._cx, cy = o._cy;
    var head = Math.max(11, o.w * .55);
    return '<g class="ob" data-id="' + o.id + '" transform="translate(' + fmt(cx) + ',' + fmt(cy) + ') rotate(' + fmt(dispRot(o)) + ')">' +
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

  /* ────────── 요소 이름표 (오토바이·자전거·보행자) — 배경판 없는 흰 글씨 + 어두운 외곽선 ────────── */
  function nameOf(o) {
    if (!o) return '';
    if (o.type === 'person') { var pd = C.itemDef(o.kind, 'person'); return pd ? pd.n : ''; }
    if (o.type === 'car' && (o.kind === 'moto' || o.kind === 'bike')) {
      var cd = C.itemDef(o.kind, 'car');
      return cd ? cd.n : '';
    }
    return '';
  }

  function nameMarkup(o) {
    var nm = nameOf(o);
    if (!nm || !isFine(o)) return '';
    var vb = o.vb || { x: 0, y: 0, w: 100, h: 100 };
    var W = o.w * o.sc, H = o.w * (vb.h / vb.w) * o.sc;
    var a = dispRot(o) * Math.PI / 180;
    var hw = Math.abs(W / 2 * Math.cos(a)) + Math.abs(H / 2 * Math.sin(a));
    /* v3.8 — 글씨 한 단계 작게 + 확대해도 이름표가 요소보다 과하게 커지지 않게 상한을 낮춘다 */
    var fs = C.clamp(Math.max(W, H) * 0.215, 9, 13);
    var tw = nm.length * fs + 6;
    var stageW = (S.stage && S.stage.w) || 390;
    var right = o._cx + hw + 4;
    var flip = right + tw > stageW - 4;
    var x = flip ? (o._cx - hw - 5) : right;
    return '<text x="' + fmt(x) + '" y="' + fmt(o._cy) + '" font-size="' + fs.toFixed(1) + '" font-weight="900" fill="#FFFFFF"' +
      ' text-anchor="' + (flip ? 'end' : 'start') + '" dominant-baseline="middle"' +
      ' font-family="Pretendard,Apple SD Gothic Neo,Noto Sans KR,sans-serif"' +
      ' paint-order="stroke" stroke="#0B1524" stroke-width="' + (fs * 0.34).toFixed(1) + '" stroke-linejoin="round">' +
      esc(nm) + '</text>';
  }

  function marks() {
    return S.objs.map(badgeMarkup).join('') + S.objs.map(nameMarkup).join('');
  }

  function badgeMarkup(o) {
    if (o.type !== 'car' || !o.role || o.role === 'none') return '';
    var t = S.theme, rm = C.roleMeta(o.role), acc = rm.color, L = rm.short;
    if (!L) return '';
    var x = fmt(o._cx), y = fmt(o._cy);
    var sc = o.sc || 1;
    var h = C.clamp(o.w * sc * .32, 16, 24);
    var w = Math.max(h * 1.15, L.length * h * .62 + h * .55);
    var fs = fmt(h * .56);
    var txt = 'font-size="' + fs + '" font-weight="800" text-anchor="middle" dominant-baseline="central" font-family="Pretendard,Apple SD Gothic Neo,Noto Sans KR,sans-serif"';
    var rx = fmt(h / 2), x0 = fmt(o._cx - w / 2), y0 = fmt(o._cy - h / 2);
    if (t === 'B') return '<g><rect x="' + x0 + '" y="' + y0 + '" width="' + fmt(w) + '" height="' + fmt(h) + '" rx="' + rx + '" fill="#05090D" stroke="' + acc + '" stroke-width="1.8"/><text x="' + x + '" y="' + y + '" ' + txt + ' fill="' + acc + '">' + L + '</text></g>';
    return '<g><rect x="' + x0 + '" y="' + y0 + '" width="' + fmt(w) + '" height="' + fmt(h) + '" rx="' + rx + '" fill="' + acc + '" stroke="#FFFFFF" stroke-width="1.7"/><text x="' + x + '" y="' + y + '" ' + txt + ' fill="#FFFFFF">' + L + '</text></g>';
  }

  /* ─────────────────────────── 렌더 ─────────────────────────── */
  function isRoadObj(o) { return o && o.type === 'sym' && o.kind && o.kind.indexOf('road_') === 0; }
  function render() {
    if (!layer) return;
    projectAll();
    var roads = [], top = [];
    for (var i = 0; i < S.objs.length; i++) {
      var o = S.objs[i];
      if (!isFine(o)) continue;
      if (isRoadObj(o)) roads.push(objMarkup(o));
      else top.push(objMarkup(o));
    }
    var out = roads.concat(top);
    var bm = marks();
    layer.innerHTML = out.join('') + (bm ? '<g class="badges">' + bm + '</g>' : '');
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
      var p = AS.mapx.project(o.lat, o.lng);
      o._cx = p.x; o._cy = p.y;
      if (o.type === 'pen' && o.pts) {
        o._pts = o.pts.map(function (q) {
          var r = AS.mapx.project(q[0], q[1]);
          return [r.x, r.y];
        });
      }
    }
  }

  /* 지도 이동/줌/회전 시 위치만 갱신 (구조 재생성 없이) */
  function layout() {
    if (!layer) return;
    projectAll();
    for (var i = 0; i < S.objs.length; i++) {
      var o = S.objs[i], g = nodeOf[o.id];
      if (!g || !isFine(o)) continue;
      if (o.type === 'pen') {
        g.innerHTML = penStroke(o, penPath(o));
      } else {
        var dr = dispRot(o);
        g.setAttribute('transform', 'translate(' + fmt(o._cx) + ',' + fmt(o._cy) + ')' +
          (dr ? ' rotate(' + fmt(dr) + ')' : '') + (o.sc !== 1 ? ' scale(' + o.sc + ')' : ''));
      }
    }
    var bg = layer.querySelector('.badges');
    if (bg) bg.innerHTML = marks();
    chrome();
    if (AS.mapx && AS.mapx.layoutGps) AS.mapx.layoutGps();
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
    var dr = dispRot(o);
    boxEl.style.width = W + 'px'; boxEl.style.height = H + 'px';
    boxEl.style.borderRadius = (S.theme === 'C' ? 2 : 4) + 'px';
    boxEl.style.transform = 'translate(' + fmt(o._cx - W / 2) + 'px,' + fmt(o._cy - H / 2) + 'px) rotate(' + fmt(dr) + 'deg)';
    var gr = handPx() / 2 + 4;
    var rp = rotPt(o._cx, o._cy, 0, -(H / 2 + gr + 4), dr);
    var sp = rotPt(o._cx, o._cy, W / 2 + gr * 0.72, H / 2 + gr * 0.72, dr);
    rotH.hidden = false; sizeH.hidden = false;
    rotH.style.left = rp[0] + 'px'; rotH.style.top = rp[1] + 'px';
    sizeH.style.left = sp[0] + 'px'; sizeH.style.top = sp[1] + 'px';
    if (!angleEl.hidden) {
      var ap = rotPt(o._cx, o._cy, 0, -(H / 2 + gr + 34), dr);
      angleEl.style.left = ap[0] + 'px'; angleEl.style.top = ap[1] + 'px';
    }
  }

  /* 버튼 크기(작게·보통·크게) 핸들 지름을 CSS 변수에서 읽는다 */
  function handPx() {
    var v = 0;
    try { v = parseFloat(getComputedStyle(document.body).getPropertyValue('--hnd')); } catch (e) {}
    return v > 8 ? v : 34;
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
      var r = -dispRot(o) * Math.PI / 180;
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
  var ptrs = {}, rawPtrs = {}, drag = null, base = null, penDraft = null, vecDraft = null;

  function rawPtOf(e) {
    var r = $('#stage').getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function ptOf(e) {
    var raw = rawPtOf(e);
    return AS.mapx.screenToPlane ? AS.mapx.screenToPlane(raw.x, raw.y) : raw;
  }
  function pcount() { return Object.keys(ptrs).length; }
  function twoPtrs() {
    var k = Object.keys(ptrs);
    return [ptrs[k[0]], ptrs[k[1]]];
  }
  function twoRawPtrs() {
    var k = Object.keys(rawPtrs);
    return [rawPtrs[k[0]], rawPtrs[k[1]]];
  }

  function bindStage() {
    var stage = $('#stage');
    stage.addEventListener('pointerdown', onDown, true);
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  function beginMapPinch() {
    var rt = twoRawPtrs();
    drag = {
      mode: 'mappinch', moved: false,
      d0: Math.hypot(rt[0].x - rt[1].x, rt[0].y - rt[1].y) || 1,
      a0: Math.atan2(rt[1].y - rt[0].y, rt[1].x - rt[0].x) * 180 / Math.PI,
      mid: { x: (rt[0].x + rt[1].x) / 2, y: (rt[0].y + rt[1].y) / 2 }
    };
    drag.rawMid0 = { x: drag.mid.x, y: drag.mid.y };
    AS.mapx.startPinch(drag.mid.x, drag.mid.y);
  }

  /* 획이 짧으면(< 26px 또는 < 320ms) 지우고, 제법 길었으면 마무리한 뒤 핀치로 */
  function releaseDraftForPinch() {
    var d = penDraft || vecDraft;
    if (!d) return;
    var dur = performance.now() - (d._t0 || 0), span = 0;
    if (d.type === 'pen' && d._pts && d._pts.length) {
      var p0 = d._pts[0];
      for (var i = 1; i < d._pts.length; i++) {
        var dd = Math.hypot(d._pts[i][0] - p0[0], d._pts[i][1] - p0[1]);
        if (dd > span) span = dd;
      }
    } else if (d.type === 'vec') {
      span = d.h > 24 ? d.h : 0;
    }
    if (dur < 320 || span < 26) {
      stopHoldLoop();
      S.objs = S.objs.filter(function (o) { return o !== d; });
      penDraft = null; vecDraft = null;
      render(); AS.ui.selbar();
    } else if (penDraft) {
      finishPen();
    } else if (vecDraft) {
      finishVec();
    }
  }

  function onDown(e) {
    if (e.button && e.button !== 0) return;
    var tg = e.target;
    if (tg && tg.closest && (tg.closest('.hnd') || tg.closest('#toolChip'))) return;
    var rp = rawPtOf(e);
    var p = AS.mapx.screenToPlane ? AS.mapx.screenToPlane(rp.x, rp.y) : rp;
    rawPtrs[e.pointerId] = rp;
    ptrs[e.pointerId] = p;

    /* 그리는 중(펜·화살표) 두 손가락 → 짧은 획은 취소하고 바로 지도 핀치로 전환 */
    if (pcount() === 2 && (penDraft || vecDraft)) {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      releaseDraftForPinch();
      beginMapPinch();
      return;
    }

    if (pcount() === 2 && drag) {
      var t = twoPtrs(), rt = twoRawPtrs();
      if (drag.mode === 'map' || drag.mode === 'mappinch') {
        drag.mode = 'mappinch';
        drag.d0 = Math.hypot(rt[0].x - rt[1].x, rt[0].y - rt[1].y) || 1;
        drag.a0 = Math.atan2(rt[1].y - rt[0].y, rt[1].x - rt[0].x) * 180 / Math.PI;
        drag.mid = { x: (rt[0].x + rt[1].x) / 2, y: (rt[0].y + rt[1].y) / 2 };
        drag.rawMid0 = { x: drag.mid.x, y: drag.mid.y };
        AS.mapx.startPinch(drag.mid.x, drag.mid.y);
        return;
      }
      if (drag.o && drag.o.type !== 'pen') {
        drag.mode = 'pinch';
        drag.d0 = Math.hypot(t[0].x - t[1].x, t[0].y - t[1].y) || 1;
        drag.a0 = Math.atan2(t[1].y - t[0].y, t[1].x - t[0].x) * 180 / Math.PI;
        drag.sc0 = drag.o.sc; drag.rot0 = drag.o.rot;
      }
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
      drag = {
        mode: 'move', o: o, p0: p, sx: o._cx, sy: o._cy, lat0: o.lat, lng0: o.lng,
        pts0: o.type === 'pen' && o._pts ? o._pts.map(function (q) { return [q[0], q[1]]; }) : null,
        moved: false
      };
      try { $('#stage').setPointerCapture(e.pointerId); } catch (er) { }
      return;
    }
    // 빈 곳
    if (S.tool === 'memo') { S.tool = 'idle'; AS.ui.syncTool(); AS.ui.memo(p); e.stopPropagation(); e.preventDefault(); return; }
    if (S.sel) deselect();
    if (!S.lock && S.tool === 'idle') {
      drag = { mode: 'map', last: p, moved: false };
      try { $('#stage').setPointerCapture(e.pointerId); } catch (er) { }
    }
  }

  function onMove(e) {
    if (!ptrs[e.pointerId]) return;
    var rp = rawPtOf(e);
    rawPtrs[e.pointerId] = rp;
    ptrs[e.pointerId] = AS.mapx.screenToPlane ? AS.mapx.screenToPlane(rp.x, rp.y) : rp;
    if (penDraft) { extendPen(ptrs[e.pointerId]); return; }
    if (vecDraft) { extendVec(ptrs[e.pointerId]); return; }
    if (!drag) return;
    e.preventDefault();

    if (drag.mode === 'map') {
      var curp = ptrs[e.pointerId];
      var mdx = curp.x - drag.last.x, mdy = curp.y - drag.last.y;
      if (!drag.moved && Math.hypot(mdx, mdy) < 2) return;
      drag.moved = true;
      drag.last = curp;
      AS.mapx.panScreen(mdx, mdy);
      return;
    }
    if (drag.mode === 'mappinch') {
      var rt = twoRawPtrs();
      var md = Math.hypot(rt[0].x - rt[1].x, rt[0].y - rt[1].y) || 1;
      var ma = Math.atan2(rt[1].y - rt[0].y, rt[1].x - rt[0].x) * 180 / Math.PI;
      var mid = { x: (rt[0].x + rt[1].x) / 2, y: (rt[0].y + rt[1].y) / 2 };
      AS.mapx.movePinch(mid.x, mid.y, md / drag.d0, ma - drag.a0);
      drag.moved = true;
      return;
    }

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
      if (o.type === 'pen' && drag.pts0) {
        o._pts = drag.pts0.map(function (q) { return [q[0] + dx, q[1] + dy]; });
        o.pts = o._pts.map(function (q) { var llp = AS.mapx.unproject(q[0], q[1]); return [llp.lat, llp.lng]; });
        o.lat = o.pts[0][0]; o.lng = o.pts[0][1];
        o._cx = o._pts[0][0]; o._cy = o._pts[0][1];
        var pg = nodeOf[o.id];
        if (pg) pg.innerHTML = penStroke(o, penPath(o));
        chrome();
        return;
      }
      var ll = AS.mapx.unproject(drag.sx + dx, drag.sy + dy);
      o.lat = ll.lat; o.lng = ll.lng;
      var p = AS.mapx.project(o.lat, o.lng);
      o._cx = p.x; o._cy = p.y;
      var g = nodeOf[o.id];
      var drMove = dispRot(o);
      if (g) g.setAttribute('transform', 'translate(' + fmt(o._cx) + ',' + fmt(o._cy) + ')' + (drMove ? ' rotate(' + fmt(drMove) + ')' : '') + (o.sc !== 1 ? ' scale(' + o.sc + ')' : ''));
      layoutBadge(o);
      chrome();
    }
  }

  function layoutBadge(o) {
    var bg = layer && layer.querySelector('.badges');
    if (!bg) return;
    bg.innerHTML = marks();
  }

  function onUp(e) {
    if (!ptrs[e.pointerId]) { return; }
    delete ptrs[e.pointerId];
    delete rawPtrs[e.pointerId];
    if (penDraft) { finishPen(); return; }
    if (vecDraft) { finishVec(); return; }
    if (!drag) return;
    if ((drag.mode === 'mappinch' || drag.mode === 'pinch') && pcount() === 1) {
      var k = Object.keys(ptrs)[0];
      if (drag.mode === 'mappinch') {
        AS.mapx.endPinch();
        drag = { mode: 'map', last: ptrs[k], moved: true };
        return;
      }
      drag.mode = 'move'; drag.p0 = ptrs[k]; drag.moved = true; return;
    }
    if (pcount() > 0) return;
    if (drag.mode === 'map' || drag.mode === 'mappinch') {
      if (drag.mode === 'mappinch') AS.mapx.endPinch();
      drag = null;
      return;
    }
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

  /* ─────────────────────────── 펜 + 1초 꾹 누르기 도형·화살표 보정 ─────────────────────────── */
  var holdTick = null, holdAnchor = null, holdAt = 0;
  var HOLD_RING_SHOW = 240, HOLD_SNAP_MS = 1000;

  function hideHoldRing() {
    var r = $('#holdRing');
    if (r) r.hidden = true;
  }

  function resetHold(p) {
    holdAnchor = { x: p.x, y: p.y };
    holdAt = performance.now();
    hideHoldRing();
  }

  function startHoldLoop() {
    if (holdTick) clearInterval(holdTick);
    holdTick = setInterval(function () {
      if (!penDraft || penDraft.snapped || !holdAnchor) { hideHoldRing(); return; }
      if ((penDraft._pts || []).length < 5) return;
      var el = performance.now() - holdAt;
      if (el < HOLD_RING_SHOW) return;
      var ring = $('#holdRing');
      if (ring) {
        ring.hidden = false;
        ring.style.left = holdAnchor.x + 'px';
        ring.style.top = holdAnchor.y + 'px';
        var fg = ring.querySelector('.fg');
        var frac = C.clamp((el - HOLD_RING_SHOW) / (HOLD_SNAP_MS - HOLD_RING_SHOW), 0, 1);
        if (fg) fg.style.strokeDashoffset = (138.23 * (1 - frac)).toFixed(2);
      }
      if (el >= HOLD_SNAP_MS) {
        snapPenDraft();
      }
    }, 32);
  }

  function stopHoldLoop() {
    if (holdTick) { clearInterval(holdTick); holdTick = null; }
    holdAnchor = null;
    hideHoldRing();
  }

  function rdp(pts, eps) {
    if (pts.length < 3) return pts.slice();
    var dmax = 0, idx = 0, end = pts.length - 1;
    for (var i = 1; i < end; i++) {
      var d = segDist(pts[i][0], pts[i][1], pts[0][0], pts[0][1], pts[end][0], pts[end][1]);
      if (d > dmax) { dmax = d; idx = i; }
    }
    if (dmax > eps) {
      var L = rdp(pts.slice(0, idx + 1), eps);
      var R = rdp(pts.slice(idx), eps);
      return L.slice(0, -1).concat(R);
    }
    return [pts[0], pts[end]];
  }

  function chaikin(pts, iters, closed) {
    var cur = pts.slice();
    for (var it = 0; it < iters; it++) {
      var out = [];
      if (!closed) out.push(cur[0]);
      var lim = closed ? cur.length : cur.length - 1;
      for (var i = 0; i < lim; i++) {
        var a = cur[i], b = cur[(i + 1) % cur.length];
        out.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]]);
        out.push([0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
      }
      if (!closed) out.push(cur[cur.length - 1]);
      cur = out;
    }
    return cur;
  }

  function detectArrowHead(raw, diag) {
    if (!raw || raw.length < 6) return null;
    var p0 = raw[0], pEnd = raw[raw.length - 1];
    if (Math.hypot(pEnd[0] - p0[0], pEnd[1] - p0[1]) < Math.max(24, diag * 0.25)) return null;
    // 총 누적 길이
    var cum = [0];
    for (var i = 1; i < raw.length; i++) {
      cum.push(cum[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]));
    }
    var totalLen = cum[cum.length - 1];
    if (totalLen < 42) return null;

    // 1) 끝부분(후반 55%)에서 급격한 역전(>= 105도 꺾임) 꼭짓점 찾기 = 화살촉 시작점
    var bestIdx = -1, bestScore = -1;
    var startScan = Math.max(2, Math.floor(raw.length * 0.35));
    for (var ti = startScan; ti < raw.length - 1; ti++) {
      var shaftLen = cum[ti];
      var tailLen = totalLen - cum[ti];
      if (shaftLen < 28 || tailLen < 10 || tailLen > Math.max(76, shaftLen * 0.65)) continue;
      // ti 직전 방향(최소 10px 떨어진 점) vs ti 직후 방향(최소 6px 또는 끝점)
      var bi = ti - 1;
      while (bi > 0 && Math.hypot(raw[ti][0] - raw[bi][0], raw[ti][1] - raw[bi][1]) < 12) bi--;
      var fi = ti + 1;
      while (fi < raw.length - 1 && Math.hypot(raw[fi][0] - raw[ti][0], raw[fi][1] - raw[ti][1]) < 8) fi++;
      var vx1 = raw[ti][0] - raw[bi][0], vy1 = raw[ti][1] - raw[bi][1];
      var vx2 = raw[fi][0] - raw[ti][0], vy2 = raw[fi][1] - raw[ti][1];
      var l1 = Math.hypot(vx1, vy1) || 1, l2 = Math.hypot(vx2, vy2) || 1;
      var dot = (vx1 * vx2 + vy1 * vy2) / (l1 * l2); // -1 = 완전 역전, 0 = 90도
      if (dot <= -0.26) { // >= ~105도 이상 뒤로 꺾임 (화살촉 날개)
        // 끝이 꼭짓점 근처(촉 크기 안쪽)에 머무는지 확인
        var maxTailSpread = 0;
        for (var k = ti + 1; k < raw.length; k++) {
          var dk = Math.hypot(raw[k][0] - raw[ti][0], raw[k][1] - raw[ti][1]);
          if (dk > maxTailSpread) maxTailSpread = dk;
        }
        if (maxTailSpread <= Math.max(46, shaftLen * 0.45)) {
          var score = -dot * (shaftLen / (tailLen + 10));
          if (score > bestScore) { bestScore = score; bestIdx = ti; }
        }
      }
    }
    if (bestIdx > 1) return raw.slice(0, bestIdx + 1);
    return null;
  }

  function recognizeShape(raw) {
    if (!raw || raw.length < 3) return { pts: raw, label: '직선' };
    var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9, len = 0;
    for (var i = 0; i < raw.length; i++) {
      var x = raw[i][0], y = raw[i][1];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (i > 0) len += Math.hypot(x - raw[i - 1][0], y - raw[i - 1][1]);
    }
    var bw = maxX - minX, bh = maxY - minY, diag = Math.hypot(bw, bh) || 1;
    var p0 = raw[0], p1 = raw[raw.length - 1];
    var closeD = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);

    // 0. 한 붓 화살표 (선 + 끝 화살촉)
    var arrowShaft = detectArrowHead(raw, diag);
    if (arrowShaft && arrowShaft.length >= 2) {
      var ap0 = arrowShaft[0], ap1 = arrowShaft[arrowShaft.length - 1];
      var aDirect = Math.hypot(ap1[0] - ap0[0], ap1[1] - ap0[1]) || 1;
      var aDev = 0;
      for (var ai = 1; ai < arrowShaft.length - 1; ai++) {
        var adv = segDist(arrowShaft[ai][0], arrowShaft[ai][1], ap0[0], ap0[1], ap1[0], ap1[1]);
        if (adv > aDev) aDev = adv;
      }
      if (aDev <= Math.max(12, aDirect * 0.085)) {
        return { pts: [ap0, ap1], arrowEnd: true, label: '직선 화살표' };
      }
      var aLen = 0;
      for (var aj = 1; aj < arrowShaft.length; aj++) aLen += Math.hypot(arrowShaft[aj][0] - arrowShaft[aj - 1][0], arrowShaft[aj][1] - arrowShaft[aj - 1][1]);
      return { pts: chaikin(rdp(arrowShaft, Math.max(5, aLen * 0.02)), 3, false), arrowEnd: true, label: '곡선 화살표' };
    }

    // 1. 닫힌 도형 판별 (원 · 삼각형 · 사각형)
    if (len > 50 && closeD < Math.max(28, diag * 0.28)) {
      var cx = 0, cy = 0;
      for (var j = 0; j < raw.length; j++) { cx += raw[j][0]; cy += raw[j][1]; }
      cx /= raw.length; cy /= raw.length;
      var rs = raw.map(function (q) { return Math.hypot(q[0] - cx, q[1] - cy); });
      var mr = rs.reduce(function (a, b) { return a + b; }, 0) / rs.length || 1;
      var varSum = rs.reduce(function (a, r) { return a + (r - mr) * (r - mr); }, 0) / rs.length;
      var cv = Math.sqrt(varSum) / mr;

      var simpC = rdp(raw.slice(0, -1), Math.max(10, diag * 0.08));
      if (cv < 0.20) {
        var rx = bw / 2, ry = bh / 2;
        if (Math.abs(rx - ry) / Math.max(rx, ry, 1) < 0.22) { rx = ry = mr; }
        var circ = [];
        for (var k = 0; k <= 48; k++) {
          var a = (k / 48) * Math.PI * 2;
          circ.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
        }
        return { pts: circ, label: '원' };
      }
      if (simpC.length === 3) {
        return { pts: [simpC[0], simpC[1], simpC[2], simpC[0]], label: '삼각형' };
      }
      if (simpC.length === 4) {
        return { pts: [simpC[0], simpC[1], simpC[2], simpC[3], simpC[0]], label: '사각형' };
      }
      // 축 정렬 사각형 검사
      var boxPts = [[minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY], [minX, minY]];
      var boxErr = raw.reduce(function (mx, q) {
        var d1 = Math.min(Math.abs(q[0] - minX), Math.abs(q[0] - maxX));
        var d2 = Math.min(Math.abs(q[1] - minY), Math.abs(q[1] - maxY));
        return Math.max(mx, Math.min(d1, d2));
      }, 0);
      if (boxErr < diag * 0.14) return { pts: boxPts, label: '사각형' };
      var smClosed = chaikin(simpC.length >= 4 ? simpC : raw, 3, true);
      smClosed.push(smClosed[0]);
      return { pts: smClosed, label: '닫힌 선' };
    }

    // 2. 열린 직선 판별
    var direct = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1;
    var maxDev = 0;
    for (var m = 1; m < raw.length - 1; m++) {
      var dv = segDist(raw[m][0], raw[m][1], p0[0], p0[1], p1[0], p1[1]);
      if (dv > maxDev) maxDev = dv;
    }
    if (maxDev <= Math.max(14, direct * 0.085)) {
      return { pts: [p0, p1], label: '직선' };
    }

    // 3. 꺾은선 (2구간 직선) vs 매끄러운 곡선
    var simpO = rdp(raw, Math.max(9, len * 0.038));
    if (simpO.length === 3) {
      var a1 = Math.atan2(simpO[1][1] - simpO[0][1], simpO[1][0] - simpO[0][0]);
      var a2 = Math.atan2(simpO[2][1] - simpO[1][1], simpO[2][0] - simpO[1][0]);
      var turn = Math.abs(((a2 - a1 + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * 180 / Math.PI;
      var legErr = raw.reduce(function (mx, q) {
        return Math.max(mx, Math.min(
          segDist(q[0], q[1], simpO[0][0], simpO[0][1], simpO[1][0], simpO[1][1]),
          segDist(q[0], q[1], simpO[1][0], simpO[1][1], simpO[2][0], simpO[2][1])
        ));
      }, 0);
      if (turn > 42 && legErr < 13) return { pts: simpO, label: '꺾은선' };
    }

    // 4. 매끄러운 곡선
    var curve = chaikin(rdp(raw, Math.max(5, len * 0.018)), 3, false);
    return { pts: curve, label: '곡선' };
  }

  function snapPenDraft() {
    if (!penDraft || penDraft.snapped) return;
    var res = recognizeShape(penDraft._pts);
    penDraft._pts = res.pts;
    penDraft.pts = res.pts.map(function (q) {
      var ll = AS.mapx.unproject(q[0], q[1]);
      return [ll.lat, ll.lng];
    });
    penDraft.lat = penDraft.pts[0][0];
    penDraft.lng = penDraft.pts[0][1];
    penDraft.snapped = res.label;
    if (res.arrowEnd) penDraft.arrowEnd = true;
    hideHoldRing();
    var g = nodeOf[penDraft.id];
    if (g) g.innerHTML = penStroke(penDraft, penPath(penDraft));
    AS.toast('✨ ' + res.label + '으로 다듬었어요');
  }

  function startPen(p) {
    var ll = AS.mapx.unproject(p.x, p.y);
    penDraft = {
      id: C.uid(), type: 'pen', lat: ll.lat, lng: ll.lng, rot: 0, sc: 1,
      w: 1, h: 1, color: S.pen.color, lw: 3.6,
      pts: [[ll.lat, ll.lng]]
    };
    penDraft._cx = p.x; penDraft._cy = p.y; penDraft._pts = [[p.x, p.y]];
    penDraft._t0 = performance.now();
    S.objs.push(penDraft);
    startHoldLoop();
    resetHold(p);
    render();
  }
  function extendPen(p) {
    if (!penDraft || penDraft.snapped) return;
    if (!holdAnchor || Math.hypot(p.x - holdAnchor.x, p.y - holdAnchor.y) > 7) {
      resetHold(p);
    }
    var last = penDraft._pts[penDraft._pts.length - 1];
    if (Math.hypot(p.x - last[0], p.y - last[1]) < 2.4) return;
    var ll = AS.mapx.unproject(p.x, p.y);
    penDraft.pts.push([ll.lat, ll.lng]);
    penDraft._pts.push([p.x, p.y]);
    var g = nodeOf[penDraft.id];
    if (g && g.firstChild) g.firstChild.setAttribute('d', penPath(penDraft));
  }
  function finishPen() {
    stopHoldLoop();
    if (!penDraft) return;
    if (penDraft.pts.length < 2) {
      S.objs = S.objs.filter(function (o) { return o !== penDraft; });
      AS.toast('점을 찍었어요 — 그은 뒤 1초 누르면 화살표·도형이 고정돼요');
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
      w: 44, h: 90, color: themeAccent(), _cx: p.x, _cy: p.y, _x0: p.x, _y0: p.y, _t0: performance.now()
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
      var n = S.objs.length;
      return { x: S.stage.w / 2 + ((n % 3) - 1) * 26, y: S.stage.h / 2 + (Math.floor(n / 3) % 3 - 1) * 22 };
    })();
    var ll = at ? at.ll : AS.mapx.unproject(p.x, p.y);
    var o = C.makeObj(spec, ll.lat, ll.lng);
    if (spec.type !== 'memo' && S.view.bearing) {
      o.rot = (((o.rot || 0) - S.view.bearing) % 360 + 360) % 360;
    }
    if (spec.type === 'memo') o.text = spec.text || '';
    S.objs.push(o);
    if (spec.type === 'car' && S.newRole !== 'none') {
      S.newRole = C.nextCarRole();
    }
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
    if (copy.type === 'car' && copy.role !== 'none') {
      copy.role = C.nextCarRole();
      S.newRole = copy.role;
    }
    var p = AS.mapx.project(o.lat, o.lng);
    var ll;
    if (copy.type === 'car') {
      var rad = dispRot(o) * Math.PI / 180;
      var step = (o.h || 90) * (o.sc || 1) * 1.04;
      ll = AS.mapx.unproject(p.x - Math.sin(rad) * step, p.y + Math.cos(rad) * step);
    } else {
      ll = AS.mapx.unproject(p.x + 24, p.y + 38);
    }
    copy.lat = ll.lat; copy.lng = ll.lng;
    S.objs.push(copy); C.pushUndo();
    S.sel = copy.id;
    render(); AS.ui.selbar(); C.save();
    if (copy.type === 'car' && copy.role !== 'none') {
      AS.toast(C.roleMeta(copy.role).label + ' 추가');
    }
  }

  function scaleBy(k) {
    var o = selObj(); if (!o) return;
    o.sc = C.clamp(Math.round((o.sc * k) * 100) / 100, .4, 3);
    C.pushUndo(); render(); AS.ui.selbar(); C.save();
  }

  function svgMarkup() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + S.stage.w + '" height="' + S.stage.h + '">' + layer.innerHTML + '</svg>';
  }

  function togglePenArrow() {
    var o = selObj(); if (!o || o.type !== 'pen') return;
    o.arrowEnd = !o.arrowEnd;
    C.pushUndo(); render(); AS.ui.selbar(); C.save();
  }

  AS.objs = {
    init: init, render: render, layout: layout, chrome: chrome, hit: hit, select: select, deselect: deselect,
    add: add, addMemo: addMemo, update: update, del: del, dup: dup, scaleBy: scaleBy, togglePenArrow: togglePenArrow,
    selObj: selObj, svgMarkup: svgMarkup, projectAll: projectAll, esc: esc
  };
})(window.AS);
