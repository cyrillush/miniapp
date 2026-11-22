/* ==========================================================================
   objs.js — 객체 렌더 · 선택 · 드래그/회전/크기/핀치 · 펜
   좌표는 전부 '월드'(캔버스 기준 px) 좌표다. 화면 좌표가 필요하면
   AS.view.project() 로 옮긴다. 사진 배경의 확대·회전·이동은 #world 그룹
   변환이 맡으므로 요소 좌표는 사진에 붙은 채로 함께 움직인다.
   ========================================================================== */
window.AS = window.AS || {};
(function (AS) {
  'use strict';
  var C = AS.core, $ = C.$, S = AS.S;
  var layer = null, selEl = null, boxEl = null, rotH = null, sizeH = null, delH = null, angleEl = null, chipRot = null;
  var nodeOf = {};

  function init() {
    layer = $('#artLayer');
    selEl = $('#sel'); boxEl = selEl.querySelector('.selbox');
    rotH = selEl.querySelector('.hnd.rot'); sizeH = selEl.querySelector('.hnd.size');
    delH = $('#btnSelDel');
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
    if (!o) return 0;
    return (((o.rot || 0) % 360) + 360) % 360;
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
      C.nsMarkup(artInnerStyles(o, k * (o.sc || 1)), o.id) +
      (flip ? '</g>' : '') +
      '</g></g>';
  }

  /* ────────── 아주 작게 줄인 요소의 선 굵기 보정 (v4.3) ──────────
     배율을 0.12까지 내리면 1px 안팎의 테두리·노면 도색 선이 화면에서 0.1px 로
     사라진다. 화면 1vb 단위가 몇 px 인지 재서, 0.85px 보다 얇아지는 선만
     두껍게(최대 6배) 올린다 — 굵은 면은 건드리지 않아 형태가 뭉개지지 않는다.
     화면과 PNG 는 같은 마크업을 쓰므로(exportx 는 #artLayer.innerHTML 을 그대로
     래스터) 저장 결과도 화면과 똑같이 보정된 굵기로 나온다. */
  var MIN_STROKE_PX = 0.85;
  function minStroke(markup, pxPerUnit) {
    if (!markup || !isFinite(pxPerUnit) || pxPerUnit <= 0 || pxPerUnit >= 2.2) return markup;
    return markup.replace(/stroke-width="([0-9.]+)"/g, function (m, v) {
      var sw = parseFloat(v);
      if (!isFinite(sw) || sw <= 0) return m;
      var px = sw * pxPerUnit;
      if (px >= MIN_STROKE_PX) return m;
      var f = Math.min(6, MIN_STROKE_PX / px);
      return 'stroke-width="' + (Math.round(sw * f * 100) / 100) + '"';
    });
  }

  function artInnerStyles(o, unitScale) {
    var inner = artInner(o);
    var kz = AS.view && AS.view.scale ? AS.view.scale() : 1;
    return minStroke(inner, unitScale * (isFinite(kz) ? kz : 1));
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

  /* ────────── 요소 이름표 / 역할 배지 (v4.3) ──────────
     · 라벨은 요소 배율에 정확히 비례한다 — 차를 30%로 줄이면 글씨도 30% 수준
     · 기본값은 요소보다 한 단계 작게(LAB_DEF = 0.78), 사용자가 '글씨' 슬라이더(o.lfs)로 조절
     · 라벨은 아이콘을 절대 덮지 않는다 — 차량 배지는 차가 바라보는 방향의 '아이콘 아래',
       사람 이름은 '아이콘 옆'(기존과 같이 아이콘 바깥)에 놓는다. 자전거·오토바이처럼
       아이콘이 작은 요소에서 글씨가 아이콘을 덮어 지워 보이던 문제를 없앤다. */
  var LAB_DEF = 0.78;          /* 기본 라벨 배율 — 요소 크기 대비 */

  function labelMult(o) {
    var v = o && o.lfs;
    return (isFinite(v) && v > 0) ? v : 1;
  }

  function nameOf(o) {
    if (!o) return '';
    if (o.type === 'person') { var pd = C.itemDef(o.kind, 'person'); return pd ? pd.n : ''; }
    if (o.type === 'car' && (o.kind === 'moto' || o.kind === 'bike')) {
      var cd = C.itemDef(o.kind, 'car');
      return cd ? cd.n : '';
    }
    return '';
  }

  function hasLabel(o) {
    if (!o) return false;
    if (nameOf(o)) return true;
    return !!(o.type === 'car' && o.role && o.role !== 'none');
  }

  /* ────────── 실제 그림(잉크) 바운딩박스 (v4.3 · 요청 9) ──────────
     신호등처럼 viewBox 안에 여백이 있는 요소는 선택 테두리가 그림보다 크게
     잡혀 크기 조절 기준이 어긋나 보였다. 요소마다 "그림이 실제로 칠해진 영역"을
     재서(o.ink, vb 단위) 선택 박스·핸들·히트테스트·라벨 기준으로 쓴다.
     · sym · person · 벡터 차량 : SVG getBBox 로 정확히
     · 실사 스프라이트 차량 : 스프라이트를 감싸는 역할 링 사각형(가장 바깥 잉크) */
  var inkGeomCache = {};
  var probeSvgEl = null;

  function probeSvg() {
    if (!probeSvgEl) {
      probeSvgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      probeSvgEl.setAttribute('width', '0');
      probeSvgEl.setAttribute('height', '0');
      probeSvgEl.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:0;height:0;overflow:hidden;pointer-events:none';
      document.body.appendChild(probeSvgEl);
    }
    return probeSvgEl;
  }

  function artBBox(markup, ns) {
    if (!markup) return null;
    var svg = probeSvg();
    try {
      svg.innerHTML = '<g>' + C.nsMarkup(markup, 'probe' + (ns || '')) + '</g>';
      var g = svg.firstChild;
      var bb = g.getBBox();
      svg.innerHTML = '';
      if (!bb || !isFinite(bb.width) || !isFinite(bb.height) || bb.width <= 0 || bb.height <= 0) return null;
      return { x: bb.x, y: bb.y, w: bb.width, h: bb.height };
    } catch (e) {
      try { svg.innerHTML = ''; } catch (e2) {}
      return null;
    }
  }

  /* 실사 스프라이트 차량 — carSpriteSVG 와 같은 배치 계산으로 링 사각형을 구한다 */
  function spriteRingBox(o) {
    var sp = window.CAR_SPRITES && window.CAR_SPRITES[o.kind];
    if (!sp) return null;
    var pad = 6, maxW = 120 - pad * 2, maxH = 200 - pad * 2;
    var aspect = sp.w / sp.h;
    var iw = maxH * aspect, ih = maxH;
    if (iw > maxW) { iw = maxW; ih = maxW / aspect; }
    var x = (120 - iw) / 2, y = (200 - ih) / 2;
    var ringed = o.role && o.role !== 'none';
    var x0 = x - 5.4, y0 = y - 5.4, x1 = x + iw + 5.4, y1 = y + ih + 5.4;
    var top = y0;
    if (ringed) top = Math.min(top, y - 10);          /* 역할 화살표 꼭짓점 */
    if (!ringed) { x0 = x; y0 = y - 2; x1 = x + iw; y1 = y + ih; }   /* 링 없으면 그림 사각형 */
    return { x: x0, y: top, w: x1 - x0, h: y1 - top };
  }

  function inkGeom(o) {
    var vb = o.vb || { x: 0, y: 0, w: 100, h: 100 };
    if (o.type === 'pen' || o.type === 'vec' || o.type === 'memo') return vb;
    var key = S.theme + '|' + o.type + '|' + o.kind + '|' + (S.carMode || 'real') + '|' + (o.flip ? 1 : 0) + '|' + (o.role === 'none' ? 0 : 1);
    if (inkGeomCache[key]) return inkGeomCache[key];
    var ink = null;
    if (o.type === 'car' && S.carMode !== 'vector') ink = spriteRingBox(o);
    else if (o.type === 'car') ink = artBBox(ART3.car(S.theme, o.kind, C.roleMeta(o.role || 'self').key === 'self' ? 'self' : 'other'), 'c');
    else if (o.type === 'person') ink = artBBox(ART3.person(S.theme, o.kind), 'p');
    else if (o.type === 'sym') {
      var sy = ART3.sym(S.theme, o.kind);
      ink = artBBox(sy.s, 's');
      if (ink && o.flip) ink = { x: 2 * (vb.x + vb.w / 2) - (ink.x + ink.w), y: ink.y, w: ink.w, h: ink.h };
    }
    if (!ink) ink = vb;
    /* vb 밖으로 넘치는 잉크(그림자가 있는 기호)는 vb 안으로 자른다 */
    var x0 = Math.max(vb.x, ink.x), y0 = Math.max(vb.y, ink.y);
    var x1 = Math.min(vb.x + vb.w, ink.x + ink.w), y1 = Math.min(vb.y + vb.h, ink.y + ink.h);
    if (x1 - x0 > 0.2 && y1 - y0 > 0.2) ink = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    else ink = vb;
    inkGeomCache[key] = ink;
    return ink;
  }

  function inkBoxOf(o) {
    var vb = o.vb || { x: 0, y: 0, w: 100, h: 100 };
    var ink = inkGeom(o);
    var u = o.w / (vb.w || 100);            /* vb 1단위 = 몇 px */
    var sc = o.sc || 1;
    var W = Math.max(1, ink.w * u * sc), H = Math.max(1, ink.h * u * sc);
    var ox = (ink.x + ink.w / 2 - (vb.x + vb.w / 2)) * u * sc;
    var oy = (ink.y + ink.h / 2 - (vb.y + vb.h / 2)) * u * sc;
    return { W: W, H: H, ox: ox, oy: oy };
  }

  /* 아이콘의 화면/월드 기준 바운딩박스(회전 반영) — 라벨 배치용 */
  function iconBox(o) {
    var b = inkBoxOf(o);
    var a = dispRot(o) * Math.PI / 180;
    var ca = Math.cos(a), sa = Math.sin(a);
    return {
      W: b.W, H: b.H,
      cx: o._cx + b.ox * ca - b.oy * sa,
      cy: o._cy + b.ox * sa + b.oy * ca,
      hw: Math.abs(b.W / 2 * ca) + Math.abs(b.H / 2 * sa),
      hh: Math.abs(b.W / 2 * sa) + Math.abs(b.H / 2 * ca)
    };
  }

  function labelFont(o) {
    var W = Math.max(1, o.w * o.sc);
    return Math.max(1.2, W * 0.26 * LAB_DEF * labelMult(o));
  }

  function badgeSize(o) {
    var rm = C.roleMeta(o.role), L = rm.short || '';
    var h = Math.max(1.2, Math.max(1, o.w * o.sc) * 0.26 * LAB_DEF * labelMult(o));
    var w = Math.max(h * 1.2, L.length * h * 0.62 + h * 0.62);
    return { h: h, w: w, fs: h * 0.58, L: L, rm: rm };
  }

  function labelText(txt, x, y, fs, anchor, strokePx) {
    return '<text x="' + fmt(x) + '" y="' + fmt(y) + '" font-size="' + fs.toFixed(2) + '" font-weight="900" fill="#FFFFFF"' 
      + ' text-anchor="' + (anchor || 'start') + '" dominant-baseline="middle"'
      + ' font-family="Pretendard,Apple SD Gothic Neo,Noto Sans KR,sans-serif"'
      + ' paint-order="stroke" stroke="#0B1524" stroke-width="' + (strokePx || (fs * 0.32)).toFixed(2) + '" stroke-linejoin="round">' 
      + esc(txt) + '</text>';
  }

  function badgePill(rm, cx, cy, sz) {
    var t = S.theme, acc = rm.color, L = sz.L;
    var h = sz.h, w = sz.w, fs = sz.fs;
    var txt = 'font-size="' + fmt(fs) + '" font-weight="800" text-anchor="middle" dominant-baseline="central" font-family="Pretendard,Apple SD Gothic Neo,Noto Sans KR,sans-serif"';
    var rx = fmt(h / 2), x0 = fmt(cx - w / 2), y0 = fmt(cy - h / 2);
    if (t === 'B') return '<g><rect x="' + x0 + '" y="' + y0 + '" width="' + fmt(w) + '" height="' + fmt(h) + '" rx="' + rx + '" fill="#05090D" stroke="' + acc + '" stroke-width="1.4"/><text x="' + fmt(cx) + '" y="' + fmt(cy) + '" ' + txt + ' fill="' + acc + '">' + L + '</text></g>';
    return '<g><rect x="' + x0 + '" y="' + y0 + '" width="' + fmt(w) + '" height="' + fmt(h) + '" rx="' + rx + '" fill="' + acc + '" stroke="#FFFFFF" stroke-width="1.4"/><text x="' + fmt(cx) + '" y="' + fmt(cy) + '" ' + txt + ' fill="#FFFFFF">' + L + '</text></g>';
  }

  /* 차량(자차·대차 배지 + 오토바이·자전거 이름) — 아이콘 '아래 한 줄', 서로 겹치지 않게
     라벨은 가로쓰기 그대로 두고, 회전한 아이콘의 AABB(화면 기준 바운딩박스) 아래에
     띄워 놓는다. 회전 각도가 어떻든 라벨 사각형과 아이콘이 절대 겹치지 않는다. */
  function carLabelMarkup(o, nm) {
    var bd = (o.role && o.role !== 'none') ? badgeSize(o) : null;
    if (!bd && !nm) return '';
    var fs = labelFont(o);
    var tw = nm ? (nm.length * fs * 0.92 + fs * 0.3) : 0;
    var rowH = Math.max(bd ? bd.h : 0, nm ? fs * 1.4 : 0);
    var gapX = rowH * 0.32;
    var totalW = (bd ? bd.w : 0) + (bd && nm ? gapX : 0) + tw;
    var box = iconBox(o);
    /* 글씨 외곽선(후광)까지 라벨 영역으로 보고, 아이콘 아래로 충분히 띄운다 */
    var gapY = rowH * 0.3 + Math.max(1.2, box.W * 0.04) + fs * 0.5;
    var stageW = (S.stage && S.stage.w) || 390, stageH = (S.stage && S.stage.h) || 640;
    var cy = box.cy + box.hh + gapY + rowH / 2;
    if (cy + rowH / 2 > stageH - 2) cy = box.cy - box.hh - gapY - rowH / 2;
    var startX = box.cx - totalW / 2;
    if (totalW < stageW - 4) startX = C.clamp(startX, 2, stageW - totalW - 2);
    var out = '';
    var cur = startX;
    if (bd) {
      out += badgePill(bd.rm, cur + bd.w / 2, cy, bd);
      cur += bd.w + (nm ? gapX : 0);
    }
    if (nm) out += labelText(nm, cur, cy, fs, 'start', fs * 0.34);
    return out;
  }

  /* 사람 이름 — 아이콘 오른쪽(자리가 없으면 왼쪽) 바깥, 아이콘을 덮지 않는다 */
  function personNameMarkup(o, nm) {
    if (!nm) return '';
    var box = iconBox(o), fs = labelFont(o);
    var tw = nm.length * fs * 0.92 + fs * 0.3;
    var stageW = (S.stage && S.stage.w) || 390;
    var right = box.cx + box.hw + fs * 0.55;
    var flip = right + tw > stageW - 3;
    var x = flip ? (box.cx - box.hw - fs * 0.55) : right;
    return labelText(nm, x, box.cy, fs, flip ? 'end' : 'start', fs * 0.34);
  }

  function marks() {
    var out = '';
    for (var i = 0; i < S.objs.length; i++) {
      var o = S.objs[i];
      if (!isFine(o)) continue;
      if (o.type === 'car') out += carLabelMarkup(o, nameOf(o));
      else if (o.type === 'person') out += personNameMarkup(o, nameOf(o));
    }
    return out;
  }

  /* ─────────────────────────── 렌더 ─────────────────────────── */
  function isRoadObj(o) { return o && o.type === 'sym' && o.kind && o.kind.indexOf('road_') === 0; }

  function syncWorld() {
    for (var i = 0; i < S.objs.length; i++) {
      var o = S.objs[i];
      if (!isFinite(o.x)) o.x = S.stage.w / 2;
      if (!isFinite(o.y)) o.y = S.stage.h / 2;
      o._cx = o.x; o._cy = o.y;
      if (o.type === 'pen' && o.pts) o._pts = o.pts;
    }
  }

  function render() {
    if (!layer) return;
    syncWorld();
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

  /* 사진 확대·회전·이동은 #world 그룹 변환 하나로 끝난다 —
     요소는 월드 좌표에 그대로 두고 선택 크롬만 다시 그린다 */
  function layout() {
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
    var c = AS.view.project(o.x, o.y);
    selEl.classList.add('on');
    if (o.type === 'pen') {
      var pts = o._pts || [];
      if (!pts.length) { hideHandles(); return; }
      var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      pts.forEach(function (q) {
        var p = AS.view.project(q[0], q[1]);
        if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
      });
      var W0 = Math.max(14, maxX - minX), H0 = Math.max(14, maxY - minY);
      boxEl.style.width = W0 + 'px'; boxEl.style.height = H0 + 'px';
      boxEl.style.transform = 'translate(' + fmt((minX + maxX) / 2 - W0 / 2) + 'px,' + fmt((minY + maxY) / 2 - H0 / 2) + 'px)';
      boxEl.style.borderRadius = '10px';
      rotH.hidden = true; sizeH.hidden = true; angleEl.hidden = true;
      if (delH) {
        delH.hidden = false;
        delH.style.left = (maxX + handPx() * 0.5) + 'px';
        delH.style.top = (minY - handPx() * 0.1) + 'px';
      }
      return;
    }
    var ib = inkBoxOf(o);
    var W = ib.W;
    var H = ib.H;
    var rr = (o.rot || 0);    /* 잉크 사각형의 중심(회전 반영) */
    var cc = rotPt(c.x, c.y, ib.ox, ib.oy, rr);
    boxEl.style.width = W + 'px'; boxEl.style.height = H + 'px';
    boxEl.style.borderRadius = (S.theme === 'C' ? 2 : 4) + 'px';
    boxEl.style.transform = 'translate(' + fmt(cc[0] - W / 2) + 'px,' + fmt(cc[1] - H / 2) + 'px) rotate(' + fmt(rr) + 'deg)';
    var gr = handPx() / 2 + 4;
    var rp = rotPt(cc[0], cc[1], 0, -(H / 2 + gr + 4), rr);
    var sp = rotPt(cc[0], cc[1], W / 2 + gr * 0.72, H / 2 + gr * 0.72, rr);
    rotH.hidden = false; sizeH.hidden = false;
    rotH.style.left = rp[0] + 'px'; rotH.style.top = rp[1] + 'px';
    sizeH.style.left = sp[0] + 'px'; sizeH.style.top = sp[1] + 'px';
    /* 요청 6 — 선택한 요소 위 모서리에 바로 지우는 × (앱 화면 전용 크롬, PNG 미포함) */
    if (delH) {
      var dp = rotPt(cc[0], cc[1], W / 2 + gr * 0.72, -(H / 2 + gr * 0.72), rr);
      delH.hidden = false;
      delH.style.left = dp[0] + 'px'; delH.style.top = dp[1] + 'px';
    }
    if (!angleEl.hidden) {
      var ap = rotPt(cc[0], cc[1], 0, -(H / 2 + gr + 34), rr);
      angleEl.style.left = ap[0] + 'px'; angleEl.style.top = ap[1] + 'px';
    }
  }

  /* 버튼 크기(작게·보통·크게) 핸들 지름을 CSS 변수에서 읽는다 */
  function handPx() {
    var v = 0;
    try { v = parseFloat(getComputedStyle(document.body).getPropertyValue('--hnd')); } catch (e) {}
    return v > 8 ? v : 34;
  }

  function hideHandles() {
    rotH.hidden = true; sizeH.hidden = true; angleEl.hidden = true;
    if (delH) delH.hidden = true;
    if (chipRot) chipRot.hidden = true;
  }

  function rotPt(cx, cy, dx, dy, deg) {
    var r = (deg || 0) * Math.PI / 180;
    return [cx + dx * Math.cos(r) - dy * Math.sin(r), cy + dx * Math.sin(r) + dy * Math.cos(r)];
  }

  function select(id, opts) {
    if (S.sel === id) return;
    S.sel = id;
    chrome();
    AS.ui.selbar();
  }
  function deselect() {
    if (!S.sel) return;
    S.sel = null;
    chrome(); AS.ui.selbar();
  }

  /* ─────────────────────────── 히트 테스트 (월드 좌표) ─────────────────────────── */
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
      var ib = inkBoxOf(o);
      var dx = x - o._cx, dy = y - o._cy;
      var r = -dispRot(o) * Math.PI / 180;
      var lx = dx * Math.cos(r) - dy * Math.sin(r);
      var ly = dx * Math.sin(r) + dy * Math.cos(r);
      var pad = o.type === 'car' ? 2 : 4;
      if (Math.abs(lx - ib.ox) <= ib.W / 2 + pad && Math.abs(ly - ib.oy) <= ib.H / 2 + pad) return o;
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
  var ptrs = {}, rawPtrs = {}, drag = null, penDraft = null, vecDraft = null, lockHintShown = false, slackHintShown = false;

  /* 지금 그리기/드래그 제스처 중인가 — 재측정을 미루는 판단에 쓴다 */
  function isGesturing() { return !!(drag || penDraft || vecDraft); }

  function rawPtOf(e) {
    var r = $('#stage').getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function ptOf(e) {
    var raw = rawPtOf(e);
    return AS.view.unproject(raw.x, raw.y);
  }  function pcount() { return Object.keys(ptrs).length; }
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

  function photoAdjustable() { return S.mode === 'photo' && !(S.photo && S.photo.locked); }

  function beginPhotoGesture() {
    var rt = twoRawPtrs();
    var mid = { x: (rt[0].x + rt[1].x) / 2, y: (rt[0].y + rt[1].y) / 2 };
    var d = Math.hypot(rt[0].x - rt[1].x, rt[0].y - rt[1].y) || 1;
    var a = Math.atan2(rt[1].y - rt[0].y, rt[1].x - rt[0].x) * 180 / Math.PI;
    AS.view.gestureStart(mid, d, a);
    drag = { mode: 'photopinch', moved: false };
  }

  /* 사진 조정 중에 그리던 획이 있으면 정리한다 */
  function closeDraft() {
    if (penDraft) finishPen();
    else if (vecDraft) finishVec();
  }

  function onDown(e) {
    if (e.button && e.button !== 0) return;
    var tg = e.target;
    if (tg && tg.closest && (tg.closest('.hnd') || tg.closest('#toolChip') || tg.closest('#emptyPhoto') || tg.closest('#modeSeg') || tg.closest('#photoBar'))) return;
    /* 터치 순간의 캔버스 크기를 먼저 맞춘다 — 사진 바가 나타나는 등으로 레이아웃이
       막 바뀐 직후의 첫 터치가 옛 크기로 계산되면 손가락과 그림이 어긋난다 */
    if (pcount() === 0 && AS.view.syncStageBox) AS.view.syncStageBox();
    var rp = rawPtOf(e);
    var p = AS.view.unproject(rp.x, rp.y);
    rawPtrs[e.pointerId] = rp;
    ptrs[e.pointerId] = p;

    /* 두 손가락 — 요소를 잡고 있으면 요소 핀치, 빈 곳이면 사진 확대·회전·이동 */
    if (pcount() === 2) {
      if (penDraft || vecDraft) closeDraft();
      if (drag && drag.o && drag.o.type !== 'pen') {
        var t = twoPtrs();
        drag.mode = 'pinch';
        drag.d0 = Math.hypot(t[0].x - t[1].x, t[0].y - t[1].y) || 1;
        drag.a0 = Math.atan2(t[1].y - t[0].y, t[1].x - t[0].x) * 180 / Math.PI;
        drag.sc0 = drag.o.sc; drag.rot0 = drag.o.rot;
        return;
      }
      if (photoAdjustable()) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        beginPhotoGesture();
        return;
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
      drag = {
        mode: 'move', o: o, p0: p, sx: o._cx, sy: o._cy,
        pts0: o.type === 'pen' && o._pts ? o._pts.map(function (q) { return [q[0], q[1]]; }) : null,
        moved: false
      };
      try { $('#stage').setPointerCapture(e.pointerId); } catch (er) { }
      return;
    }
    // 빈 곳
    if (S.tool === 'memo') { S.tool = 'idle'; AS.ui.syncTool(); AS.ui.memo(p); e.stopPropagation(); e.preventDefault(); return; }
    if (S.sel) deselect();
    /* 사진 모드 — 빈 곳을 끌면 사진만 움직인다(위에 놓은 요소는 제자리에 그대로).
       v4.3 부터 요소는 사진 좌표계에 묶여 있지 않으므로, 사진을 옮기거나 돌려도
       요소의 화면 위치·크기는 변하지 않는다. */
    if (S.mode === 'photo' && AS.view.hasPhoto()) {
      if (AS.view.isLocked()) {
        if (!lockHintShown) {
          lockHintShown = true;
          AS.toast('사진이 고정되어 있어요 — 위 [사진 조정]을 누르면 옮길 수 있어요', 2600);
        }
        return;
      }
      var slack = AS.view.photoSlack ? AS.view.photoSlack() : { x: 0, y: 0 };
      if (slack.x < 1 && slack.y < 1 && !slackHintShown) {
        slackHintShown = true;
        AS.toast('사진이 화면을 꽉 채우고 있어 더 옮길 자리가 없어요 — 위 사진 크기(＋)로 키운 뒤 옮겨 보세요', 3000);
      }
      drag = { mode: 'photo', moved: false };
      AS.view.gestureStart(rp, 1, 0);
      try { $('#stage').setPointerCapture(e.pointerId); } catch (er) { }
    }
  }

  function onMove(e) {
    if (!ptrs[e.pointerId]) return;
    var rp = rawPtOf(e);
    rawPtrs[e.pointerId] = rp;
    ptrs[e.pointerId] = AS.view.unproject(rp.x, rp.y);
    if (penDraft) { extendPen(ptrs[e.pointerId]); return; }
    if (vecDraft) { extendVec(ptrs[e.pointerId]); return; }
    if (!drag) return;
    e.preventDefault();

    if (drag.mode === 'photo') {
      AS.view.gestureMove(rp, 1, 0);
      drag.moved = true;
      return;
    }
    if (drag.mode === 'photopinch') {
      var rt = twoRawPtrs();
      var md = Math.hypot(rt[0].x - rt[1].x, rt[0].y - rt[1].y) || 1;
      var ma = Math.atan2(rt[1].y - rt[0].y, rt[1].x - rt[0].x) * 180 / Math.PI;
      var mid = { x: (rt[0].x + rt[1].x) / 2, y: (rt[0].y + rt[1].y) / 2 };
      AS.view.gestureMove(mid, md, ma);
      drag.moved = true;
      return;
    }

    var o = drag.o;
    if (!o) return;
    if (drag.mode === 'pinch') {
      var t = twoPtrs();
      var d = Math.hypot(t[0].x - t[1].x, t[0].y - t[1].y) || 1;
      var a = Math.atan2(t[1].y - t[0].y, t[1].x - t[0].x) * 180 / Math.PI;
      o.sc = C.clampSc(o, drag.sc0 * (d / drag.d0));
      var rotv = drag.rot0 + (a - drag.a0);
      o.rot = S.snap ? snapAngle(rotv) : ((rotv % 360) + 360) % 360;
      showAngle(o.rot);
      render(); AS.ui.selbar(); drag.moved = true;
      return;
    }
    if (drag.mode === 'move') {
      var cur = ptrs[e.pointerId];
      var dx = cur.x - drag.p0.x, dy = cur.y - drag.p0.y;
      if (!drag.moved && Math.hypot(dx, dy) < 2) return;
      drag.moved = true;
      if (o.type === 'pen' && drag.pts0) {
        o._pts = drag.pts0.map(function (q) { return [q[0] + dx, q[1] + dy]; });
        o.pts = o._pts;
        o.x = o._pts[0][0]; o.y = o._pts[0][1];
        o._cx = o.x; o._cy = o.y;
        var pg = nodeOf[o.id];
        if (pg) pg.innerHTML = penStroke(o, penPath(o));
        chrome();
        return;
      }
      o.x = drag.sx + dx; o.y = drag.sy + dy;
      o._cx = o.x; o._cy = o.y;
      var g = nodeOf[o.id];
      var drMove = dispRot(o);
      if (g) g.setAttribute('transform', 'translate(' + fmt(o._cx) + ',' + fmt(o._cy) + ')' + (drMove ? ' rotate(' + fmt(drMove) + ')' : '') + (o.sc !== 1 ? ' scale(' + o.sc + ')' : ''));
      var bg = layer && layer.querySelector('.badges');
      if (bg) bg.innerHTML = marks();
      chrome();
    }
  }

  function onUp(e) {
    if (!ptrs[e.pointerId]) { return; }
    delete ptrs[e.pointerId];
    delete rawPtrs[e.pointerId];
    if (penDraft) { finishPen(); return; }
    if (vecDraft) { finishVec(); return; }
    if (!drag) return;
    if (drag.mode === 'photopinch' && pcount() === 1) {
      /* 한 손가락이 남으면 남은 손가락으로 사진을 끌 수 있게 이어 간다 */
      AS.view.gestureEnd();
      var k = Object.keys(rawPtrs)[0];
      drag = { mode: 'photo', moved: true };
      if (k) AS.view.gestureStart(rawPtrs[k], 1, 0);
      return;
    }
    if (pcount() > 0) return;
    if (drag.mode === 'photo' || drag.mode === 'photopinch') {
      AS.view.gestureEnd();
      /* 사진만 옮기거나 확대·회전한 경우에도 ↶로 되돌릴 수 있게 (사진 변환도 undo 단위에 포함) */
      if (drag.moved || drag.mode === 'photopinch') { C.pushUndo(); C.save(); AS.ui.selbar(); }
      drag = null;
      AS.view.flushMeasure();
      return;
    }
    if (drag.moved) {
      C.pushUndo();
      C.save();
      AS.ui.selbar();
    }
    drag = null;
    showAngle(null);
    AS.view.flushMeasure();
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
    /* 요청 6 — 선택한 요소 위 × 를 한 번 누르면 바로 삭제 (undo 로 즉시 되돌릴 수 있다) */
    if (delH) {
      delH.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
      delH.addEventListener('click', function (e) {
        e.stopPropagation(); e.preventDefault();
        AS.objs.del();
      });
    }
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
        o.sc = C.clampSc(o, s0 * (d / d0));
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
        var sp = AS.view.project(holdAnchor.x, holdAnchor.y);
        ring.style.left = sp.x + 'px';
        ring.style.top = sp.y + 'px';
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
    penDraft.pts = res.pts;
    penDraft.x = penDraft.pts[0][0];
    penDraft.y = penDraft.pts[0][1];
    penDraft.snapped = res.label;
    if (res.arrowEnd) penDraft.arrowEnd = true;
    hideHoldRing();
    var g = nodeOf[penDraft.id];
    if (g) g.innerHTML = penStroke(penDraft, penPath(penDraft));
    AS.toast('✨ ' + res.label + '으로 다듬었어요');
  }

  function startPen(p) {
    penDraft = {
      id: C.uid(), type: 'pen', x: p.x, y: p.y, rot: 0, sc: 1,
      w: 1, h: 1, color: S.pen.color, lw: 3.6,
      pts: [[p.x, p.y]]
    };
    penDraft._cx = p.x; penDraft._cy = p.y; penDraft._pts = penDraft.pts;
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
    penDraft.pts.push([p.x, p.y]);
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
    vecDraft = {
      id: C.uid(), type: 'vec', x: p.x, y: p.y, rot: 0, sc: 1,
      w: 44, h: 90, color: themeAccent(), _cx: p.x, _cy: p.y, _x0: p.x, _y0: p.y, _t0: performance.now()
    };
    S.objs.push(vecDraft);
    render();
  }
  function extendVec(p) {
    var d = Math.hypot(p.x - vecDraft._x0, p.y - vecDraft._y0);
    if (d < 4) return;
    var ang = Math.atan2(p.y - vecDraft._y0, p.x - vecDraft._x0) * 180 / Math.PI + 90;
    vecDraft.x = (p.x + vecDraft._x0) / 2; vecDraft.y = (p.y + vecDraft._y0) / 2;
    vecDraft._cx = vecDraft.x; vecDraft._cy = vecDraft.y;
    vecDraft.rot = S.snap ? snapAngle(((ang % 360) + 360) % 360) : ((ang % 360) + 360) % 360;
    vecDraft.h = Math.max(24, d);
    render();
  }
  function finishVec() {
    if (!vecDraft) return;
    if (vecDraft.h < 26) {
      vecDraft.h = 90;
      vecDraft.x = vecDraft._x0; vecDraft.y = vecDraft._y0;
      vecDraft._cx = vecDraft.x; vecDraft._cy = vecDraft.y;
    }
    C.pushUndo();
    var id = vecDraft.id;
    vecDraft = null;
    select(id); render(); AS.ui.selbar(); C.save();
  }

  /* ─────────────────────────── 추가/조작 API ─────────────────────────── */
  function centerWorld() {
    var n = S.objs.length;
    return {
      x: S.stage.w / 2 + ((n % 3) - 1) * 26,
      y: S.stage.h / 2 + (Math.floor(n / 3) % 3 - 1) * 22
    };
  }

  function add(spec, at) {
    var p = at && isFinite(at.x) ? at : centerWorld();
    var o = C.makeObj(spec, p.x, p.y);
    if (spec.type === 'memo') o.text = spec.text || '';
    S.objs.push(o);
    if (spec.type === 'car' && S.newRole !== 'none') {
      S.newRole = C.nextCarRole();
    }
    C.pushUndo();
    S.sel = o.id;
    render(); AS.ui.selbar(); C.save();
    return o;
  }

  function addMemo(text, x, y) {
    var o = {
      id: C.uid(), type: 'memo', kind: 'memo', x: x, y: y, rot: 0, sc: 1,
      text: text, w: Math.max(64, text.length * 13 + 20), h: 28, vb: { x: 0, y: 0, w: 10, h: 10 }
    };
    S.objs.push(o); C.pushUndo(); S.sel = o.id;
    render(); AS.ui.selbar(); C.save();
  }

  function update(fn) {
    var o = selObj(); if (!o) return;
    fn(o);
    render(); AS.ui.selbar();
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
    if (copy.type === 'car') {
      var rad = dispRot(o) * Math.PI / 180;
      var step = (o.h || 90) * (o.sc || 1) * 1.04;
      copy.x = o.x - Math.sin(rad) * step;
      copy.y = o.y + Math.cos(rad) * step;
    } else if (copy.type === 'pen' && copy.pts) {
      copy.pts = copy.pts.map(function (q) { return [q[0] + 18, q[1] + 26]; });
      copy.x = copy.pts[0][0]; copy.y = copy.pts[0][1];
    } else {
      copy.x = o.x + 24; copy.y = o.y + 38;
    }
    S.objs.push(copy); C.pushUndo();
    S.sel = copy.id;
    render(); AS.ui.selbar(); C.save();
    if (copy.type === 'car' && copy.role !== 'none') {
      AS.toast(C.roleMeta(copy.role).label + ' 추가');
    }
  }

  function scaleBy(k) {
    var o = selObj(); if (!o) return;
    o.sc = Math.round(C.clampSc(o, o.sc * k) * 100) / 100;
    C.pushUndo(); render(); AS.ui.selbar(); C.save();
  }

  function togglePenArrow() {
    var o = selObj(); if (!o || o.type !== 'pen') return;
    o.arrowEnd = !o.arrowEnd;
    C.pushUndo(); render(); AS.ui.selbar(); C.save();
  }

  AS.objs = {
    init: init, render: render, layout: layout, chrome: chrome, hit: hit, select: select, deselect: deselect,
    add: add, addMemo: addMemo, update: update, del: del, dup: dup, scaleBy: scaleBy, togglePenArrow: togglePenArrow,
    selObj: selObj, esc: esc, hasLabel: hasLabel, iconBox: iconBox, labelMult: labelMult, inkBoxOf: inkBoxOf,
    isGesturing: isGesturing, LAB_DEF: LAB_DEF
  };
})(window.AS);
