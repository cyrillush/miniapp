/* ==========================================================================
   roads.js — 전체화면 도로 배경 템플릿 (60종) + 과실도표 불러오기 (7종)  v3.7
   한국 실제 도로 생김새(경계석·보도블록·정지선·차로별 노면 화살표·적색 미끄럼방지)를
   과하지 않게 반영하고, 지저분했던 템플릿(유턴·안전지대·차로감소·스크램블·오거리·
   생활도로·고속도로·지하차도·터널·사선주차)을 전면 재작성했다.
   모두 (W, H) 전체 캔버스 크기에 꽉 차게 생성한다.
   ========================================================================== */
window.AS = window.AS || {};
(function (AS) {
  'use strict';
  var f = function (n) { return Math.round(n * 10) / 10; };
  var uid = 0;

  var C = {
    ground: '#E6EBE1', grass: '#D8E5C9', walk: '#E9EDF1', walkS: '#DBE1E8',
    asp: '#4B5563', aspD: '#3F4753', white: '#FFFFFF', yel: '#FBBF24',
    blue: '#3B82F6', curb: '#C6D0DA', block: '#E8ECF1', blockS: '#D6DEE7',
    build: '#F6F9FC', buildS: '#DBE3EC', tree: '#C2DBB1', treeS: '#ABCA99',
    water: '#CFE2F1', wall: '#A9B5C3', wallD: '#8C99A9', concrete: '#C3CCD6'
  };

  /* ───────────────────────── 기본 도형 ───────────────────────── */
  var rect = function (x, y, w, h, fill, extra) {
    return '<rect x="' + f(x) + '" y="' + f(y) + '" width="' + f(w) + '" height="' + f(h) + '" fill="' + fill + '"' + (extra ? ' ' + extra : '') + '/>';
  };
  var line = function (x1, y1, x2, y2, col, w, extra) {
    return '<line x1="' + f(x1) + '" y1="' + f(y1) + '" x2="' + f(x2) + '" y2="' + f(y2) + '" stroke="' + col + '" stroke-width="' + f(w) + '"' + (extra ? ' ' + extra : '') + '/>';
  };
  var poly = function (d, fill, extra) { return '<path d="' + d + '" fill="' + fill + '"' + (extra ? ' ' + extra : '') + '/>'; };
  var circ = function (cx, cy, r, fill, extra) {
    return '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(r) + '" fill="' + fill + '"' + (extra ? ' ' + extra : '') + '/>';
  };
  var text = function (x, y, s, size, col, ex) {
    return '<text x="' + f(x) + '" y="' + f(y) + '" text-anchor="middle" font-family="Pretendard, Apple SD Gothic Neo, Noto Sans KR, sans-serif"' +
      ' font-size="' + f(size) + '" font-weight="800" fill="' + col + '"' + (ex ? ' ' + ex : '') + '>' + s + '</text>';
  };

  /* 노면 도색 화살표 (직진 · 좌회전 · 유턴) — 흰색 단색 */
  var AR_UP = 'M37 160 L37 64 L10 64 L50 8 L90 64 L63 64 L63 160 Z';
  var AR_LEFT = 'M104 160 L104 40 Q104 31 95 31 L46 31 L46 8 L6 44 L46 80 L46 57 L67 57 Q76 57 76 66 L76 160 Z';
  var AR_UTURN = 'M68 210 L68 40 A28 28 0 0 0 12 40 L12 170 L0 170 L22 214 L44 170 L32 170 L32 50 A8 8 0 0 1 48 50 L48 210 Z';

  function glyph(kind, x, y, hpx, deg, col, op) {
    var d = kind === 'left' ? AR_LEFT : kind === 'uturn' ? AR_UTURN : AR_UP;
    var base = kind === 'uturn' ? 220 : 168;
    var cx0 = kind === 'uturn' ? 40 : kind === 'left' ? 55 : 50;
    var cy0 = kind === 'uturn' ? 110 : 84;
    var k = hpx / base;
    return '<path d="' + d + '" fill="' + (col || C.white) + '" opacity="' + (op == null ? .95 : op) + '"' +
      ' transform="translate(' + f(x) + ',' + f(y) + ') rotate(' + (deg || 0) + ') scale(' + k.toFixed(3) +
      ') translate(' + f(-cx0) + ',' + f(-cy0) + ')"/>';
  }
  var upArrow = function (x, y, h, deg, col, op) { return glyph('up', x, y, h, deg, col, op); };
  var leftArrow = function (x, y, h, deg, col, op) { return glyph('left', x, y, h, deg, col, op); };
  var uturnArrow = function (x, y, h, deg, col, op) { return glyph('uturn', x, y, h, deg, col, op); };

  /* 보도(인도) — 블록 포장 + 경계석 */
  function sidewalk(x, y, w, h, tone) {
    if (w < 4 || h < 4) return '';
    var s = rect(x, y, w, h, tone || C.walk);
    var st = 14;
    if (w >= h) {
      for (var xx = x + st; xx < x + w - 2; xx += st) s += line(xx, y + 2, xx, y + h - 2, C.walkS, 1.1);
    } else {
      for (var yy = y + st; yy < y + h - 2; yy += st) s += line(x + 2, yy, x + w - 2, yy, C.walkS, 1.1);
    }
    return s;
  }
  function curbV(x, y0, y1) { return line(x, y0, x, y1, C.curb, 3.2); }
  function curbH(x0, x1, y) { return line(x0, y, x1, y, C.curb, 3.2); }

  /* 횡단보도 띠 — 가로 띠(세로 줄무늬) / 세로 띠(가로 줄무늬) */
  function cwBand(x0, x1, y, bandH) {
    var s = '', span = x1 - x0, step = Math.max(9, span / 10), bw = Math.max(5, step * 0.55);
    for (var x = x0 + 4; x + bw < x1 - 2; x += step) s += rect(x, y, bw, bandH, C.white, 'opacity=".94"');
    return s;
  }
  function cwBandV(x, y0, y1, bandW) {
    var s = '', span = y1 - y0, step = Math.max(9, span / 10), bh = Math.max(5, step * 0.55);
    for (var y = y0 + 4; y + bh < y1 - 2; y += step) s += rect(x, y, bandW, bh, C.white, 'opacity=".94"');
    return s;
  }
  function stopBar(x, y, w, vertical) {
    return vertical ? rect(x, y, 5.4, w, C.white, 'opacity=".94"') : rect(x, y, w, 5.4, C.white, 'opacity=".94"');
  }

  /* 건물 블록 */
  function urbanBlock(x, y, w, h, seed) {
    if (w < 18 || h < 18) return '';
    var s = rect(x, y, w, h, C.block, 'stroke="' + C.blockS + '" stroke-width="1"');
    var cols = Math.max(1, Math.round(w / 118)), rows = Math.max(1, Math.round(h / 118));
    var cw = w / cols, ch = h / rows;
    for (var i = 0; i < cols; i++) {
      for (var j = 0; j < rows; j++) {
        var k = seed * 31 + i * 7 + j * 13;
        var n = 1 + (k % 2);
        for (var m = 0; m < n; m++) {
          var bw = cw * (0.34 + ((k * 7 + m * 17) % 32) / 100);
          var bh = ch * (0.30 + ((k * 11 + m * 23) % 34) / 100);
          var bx = x + i * cw + cw * (0.08 + ((k * 5 + m * 29) % 40) / 100);
          var by = y + j * ch + ch * (0.10 + ((k * 3 + m * 19) % 40) / 100);
          bx = Math.min(bx, x + (i + 1) * cw - bw - 5);
          by = Math.min(by, y + (j + 1) * ch - bh - 5);
          s += rect(bx + 1.5, by + 1.5, bw, bh, 'rgba(15,27,46,.07)');
          s += rect(bx, by, bw, bh, C.build, 'stroke="' + C.buildS + '" stroke-width="1" rx="2"');
        }
      }
    }
    return s;
  }

  function groundStrip(W, H, x0, x1, side) {
    var s = '';
    var bandW = Math.max(14, W * 0.048);
    if (side === 'left' && x0 > 20) {
      s += sidewalk(x0 - bandW, 0, bandW, H);
      s += curbV(x0, 0, H);
      var y = 0, i = 0;
      while (y < H) {
        var h = H * (0.16 + ((i * 37) % 18) / 100);
        s += urbanBlock(4, y + 6, x0 - bandW - 10, h - 12, i + 1);
        y += h; i++;
      }
    }
    if (side === 'right' && W - x1 > 20) {
      s += sidewalk(x1, 0, bandW, H);
      s += curbV(x1, 0, H);
      var y2 = 0, i2 = 0;
      while (y2 < H) {
        var h2 = H * (0.16 + ((i2 * 41) % 18) / 100);
        s += urbanBlock(x1 + bandW + 6, y2 + 6, W - x1 - bandW - 10, h2 - 12, i2 + 3);
        y2 += h2; i2++;
      }
    }
    return s;
  }

  /* ───────────────────────── 직선 도로 ───────────────────────── */
  function laneRoad(W, H, o) {
    o = o || {};
    var n = o.lanes || 4;
    var hw = (o.hw != null ? o.hw : 0.25) * W;
    var cx = (o.cx != null ? o.cx : 0.5) * W;
    var x0 = cx - hw, x1 = cx + hw;
    var twoWay = o.twoWay !== false;
    var laneW = (x1 - x0) / n;
    var s = rect(0, 0, W, H, C.ground);
    s += groundStrip(W, H, x0, x1, 'left');
    s += groundStrip(W, H, x0, x1, 'right');
    s += rect(x0, 0, x1 - x0, H, C.asp);
    /* 차도 경계 white edge line + 경계석 */
    s += line(x0 + 3, 0, x0 + 3, H, C.white, 2.6);
    s += line(x1 - 3, 0, x1 - 3, H, C.white, 2.6);
    var half = twoWay ? n / 2 : 0;
    for (var i = 1; i < n; i++) {
      var x = x0 + laneW * i;
      if (twoWay && Math.abs(i - half) < 0.01) continue;
      s += line(x, 0, x, H, C.white, 2.2, 'stroke-dasharray="16 15"');
    }
    if (twoWay) {
      s += line(cx - 2.6, 0, cx - 2.6, H, C.yel, 2.4);
      s += line(cx + 2.6, 0, cx + 2.6, H, C.yel, 2.4);
    }
    if (o.curbLine === 'blue') s += line(x0 + 8, 0, x0 + 8, H, C.blue, 4) + line(x1 - 8, 0, x1 - 8, H, C.blue, 4);
    else if (o.curbLine === 'yellow') s += line(x0 + 8, 0, x0 + 8, H, C.yel, 4) + line(x1 - 8, 0, x1 - 8, H, C.yel, 4);
    else if (o.curbLine === 'blueL') s += line(x0 + 8, 0, x0 + 8, H, C.blue, 4);
    /* 차로별 진직 화살표 — 실사 도로처럼 한 번씩만 */
    if (o.arrows !== false) {
      var ah = Math.min(laneW * 1.5, H * 0.10);
      for (var j = 0; j < n; j++) {
        var lx = x0 + laneW * (j + 0.5);
        if (twoWay && j >= half) s += upArrow(lx, H * 0.78, ah, 0);
        else if (twoWay) s += upArrow(lx, H * 0.22, ah, 180);
        else s += upArrow(lx, H * 0.80 - (j % 2) * H * 0.06, ah, 0);
      }
    }
    return { svg: s, x0: x0, x1: x1, cx: cx, laneW: laneW, n: n };
  }

  function laneRoadH(W, H, o) {
    return '<g transform="translate(' + f(W) + ',0) rotate(90)">' + laneRoad(H, W, o).svg + '</g>';
  }

  /* ───────────────────────── 교차로 ───────────────────────── */
  function crossRoad(W, H, o) {
    o = o || {};
    var hw = (o.hw != null ? o.hw : 0.22) * Math.min(W, H);
    var cx = W * 0.5, cy = H * 0.5;
    var x0 = cx - hw, x1 = cx + hw, y0 = cy - hw, y1 = cy + hw;
    var n = o.lanes || 4;
    var twoWay = o.twoWay !== false;
    var laneW = (hw * 2) / n;
    var cwD = Math.max(13, hw * 0.20);       /* 횡단보도 폭 */
    var gap = 14;                             /* 보도 폭 */
    var s = rect(0, 0, W, H, C.ground);

    /* 도로 본체 */
    s += rect(x0, 0, x1 - x0, y0, C.asp);
    s += rect(x0, y1, x1 - x0, H - y1, C.asp);
    s += rect(0, y0, x0, hw * 2, C.asp);
    s += rect(x1, y0, W - x1, hw * 2, C.asp);
    s += rect(x0, y0, hw * 2, hw * 2, C.asp);

    /* 보도 · 경계석 */
    s += sidewalk(x0 - gap, 0, gap, y0 - gap); s += curbV(x0, 0, y0 - gap);
    s += sidewalk(x1, 0, gap, y0 - gap); s += curbV(x1, 0, y0 - gap);
    s += sidewalk(x0 - gap, y1 + gap, gap, H - y1 - gap); s += curbV(x0, y1 + gap, H);
    s += sidewalk(x1, y1 + gap, gap, H - y1 - gap); s += curbV(x1, y1 + gap, H);
    s += sidewalk(0, y0 - gap, x0 - gap, gap); s += curbH(0, x0 - gap, y0);
    s += sidewalk(x1 + gap, y0 - gap, W - x1 - gap, gap); s += curbH(x1 + gap, W, y0);
    s += sidewalk(0, y1, x0 - gap, gap); s += curbH(0, x0 - gap, y1);
    s += sidewalk(x1 + gap, y1, W - x1 - gap, gap); s += curbH(x1 + gap, W, y1);

    /* 모퉁이 보도 */
    s += rect(x0 - gap, y0 - gap, gap, gap, C.walk);
    s += rect(x1, y0 - gap, gap, gap, C.walk);
    s += rect(x0 - gap, y1, gap, gap, C.walk);
    s += rect(x1, y1, gap, gap, C.walk);

    /* 블록 */
    s += urbanBlock(6, 6, x0 - gap - 12, y0 - gap - 12, 1);
    s += urbanBlock(x1 + gap + 6, 6, W - x1 - gap - 12, y0 - gap - 12, 2);
    s += urbanBlock(6, y1 + gap + 6, x0 - gap - 12, H - y1 - gap - 12, 3);
    s += urbanBlock(x1 + gap + 6, y1 + gap + 6, W - x1 - gap - 12, H - y1 - gap - 12, 4);

    /* 차로선 — 교차로 앞에서 끊는다 */
    var half = twoWay ? n / 2 : 0;
    var endN = y0 - cwD - 4, endS = y1 + cwD + 4, endW = x0 - cwD - 4, endE = x1 + cwD + 4;
    for (var i = 1; i < n; i++) {
      var xx = x0 + laneW * i, yy = y0 + laneW * i;
      if (twoWay && Math.abs(i - half) < 0.01) continue;
      s += line(xx, 0, xx, endN, C.white, 2.2, 'stroke-dasharray="15 14"');
      s += line(xx, endS, xx, H, C.white, 2.2, 'stroke-dasharray="15 14"');
      s += line(0, yy, endW, yy, C.white, 2.2, 'stroke-dasharray="15 14"');
      s += line(endE, yy, W, yy, C.white, 2.2, 'stroke-dasharray="15 14"');
    }
    if (twoWay) {
      s += line(cx - 2.4, 0, cx - 2.4, endN, C.yel, 2.4) + line(cx + 2.4, 0, cx + 2.4, endN, C.yel, 2.4);
      s += line(cx - 2.4, endS, cx - 2.4, H, C.yel, 2.4) + line(cx + 2.4, endS, cx + 2.4, H, C.yel, 2.4);
      s += line(0, cy - 2.4, endW, cy - 2.4, C.yel, 2.4) + line(0, cy + 2.4, endW, cy + 2.4, C.yel, 2.4);
      s += line(endE, cy - 2.4, W, cy - 2.4, C.yel, 2.4) + line(endE, cy + 2.4, W, cy + 2.4, C.yel, 2.4);
    }

    /* 횡단보도 4곳 */
    s += cwBand(x0, x1, y0 - cwD - 2, cwD);
    s += cwBand(x0, x1, y1 + 2, cwD);
    s += cwBandV(x0 - cwD - 2, y0, y1, cwD);
    s += cwBandV(x1 + 2, y0, y1, cwD);

    /* 정지선 — 횡단보도 바로 앞(진입 방향 차로만) */
    var sw = 6;
    s += stopBar(x0 + 1, y0 - cwD - 2 - sw - 6, hw - 4);                    /* 남→북 진행(좌하) */
    s += stopBar(cx + 2, y1 + cwD + 2 + 8, hw - 4);                          /* 북→남 */
    s += stopBar(x0 - cwD - 2 - sw - 6, cy + 2, hw - 4, true);               /* 서→동 */
    s += stopBar(x1 + cwD + 2 + 8, y0 + 1, hw - 4, true);                    /* 동→서 */

    /* 진입로 차로 안내 화살표 — 중앙선 쪽 차로가 좌회전 */
    var ah = Math.min(laneW * 1.5, 46);
    if (n >= 4) {
      s += leftArrow(cx - laneW * 0.5, y0 - cwD - 46, ah, 180);
      s += upArrow(x0 + laneW * 0.5, y0 - cwD - 46, ah, 180);
      s += leftArrow(cx + laneW * 0.5, y1 + cwD + 54, ah, 0);
      s += upArrow(x1 - laneW * 0.5, y1 + cwD + 54, ah, 0);
      s += leftArrow(x0 - cwD - 46, cy + laneW * 0.5, ah, 90);
      s += upArrow(x0 - cwD - 46, y1 - laneW * 0.5, ah, 90);
      s += leftArrow(x1 + cwD + 54, cy - laneW * 0.5, ah, 270);
      s += upArrow(x1 + cwD + 54, y0 + laneW * 0.5, ah, 270);
    }
    return { svg: s, geo: { cx: cx, cy: cy, hw: hw, x0: x0, x1: x1, y0: y0, y1: y1, laneW: laneW } };
  }

  function teeRoad(W, H, dir) {
    var hw = Math.min(W, H) * 0.19;
    var s = rect(0, 0, W, H, C.ground);
    var gap = 13;
    if (dir === 'up' || dir === 'down') {
      var hy = dir === 'up' ? H * 0.32 : H * 0.68;
      var y0 = hy - hw, y1 = hy + hw, cx = W * 0.5, x0 = cx - hw, x1 = cx + hw;
      var stemTop = dir === 'up' ? y1 : 0, stemBot = dir === 'up' ? H : y0;
      s += rect(0, y0, W, hw * 2, C.asp);
      s += rect(x0, stemTop, hw * 2, stemBot - stemTop, C.asp);
      /* 보도 */
      s += sidewalk(0, y0 - gap, x0 - gap, gap); s += curbH(0, x0 - gap, y0);
      s += sidewalk(x1 + gap, y0 - gap, W - x1 - gap, gap); s += curbH(x1 + gap, W, y0);
      s += sidewalk(0, y1, x0 - gap, gap); s += curbH(0, x0 - gap, y1);
      s += sidewalk(x1 + gap, y1, W - x1 - gap, gap); s += curbH(x1 + gap, W, y1);
      s += sidewalk(x0 - gap, stemTop, gap, stemBot - stemTop); s += curbV(x0, stemTop, stemBot);
      s += sidewalk(x1, stemTop, gap, stemBot - stemTop); s += curbV(x1, stemTop, stemBot);
      s += rect(x0 - gap, y0 - gap, gap, gap, C.walk);
      s += rect(x1, y0 - gap, gap, gap, C.walk);
      if (dir === 'up') {
        s += urbanBlock(6, 6, W - 12, y0 - gap - 12, 5);
        s += urbanBlock(6, y1 + gap + 6, x0 - gap - 12, H - y1 - gap - 12, 6);
        s += urbanBlock(x1 + gap + 6, y1 + gap + 6, W - x1 - gap - 12, H - y1 - gap - 12, 7);
      } else {
        s += urbanBlock(6, 6, x0 - gap - 12, y0 - gap - 12, 6);
        s += urbanBlock(x1 + gap + 6, 6, W - x1 - gap - 12, y0 - gap - 12, 7);
        s += urbanBlock(6, y1 + gap + 6, W - 12, H - y1 - gap - 12, 5);
      }
      /* 차로선 */
      s += line(x0 + 3, stemTop, x0 + 3, stemBot, C.white, 2.6) + line(x1 - 3, stemTop, x1 - 3, stemBot, C.white, 2.6);
      /* 가로 도로 가장자리 — 줄기 입구에서는 끊는다 */
      if (dir === 'up') {
        s += line(0, y0 + 3, W, y0 + 3, C.white, 2.6);
        s += line(0, y1 - 3, x0, y1 - 3, C.white, 2.6) + line(x1, y1 - 3, W, y1 - 3, C.white, 2.6);
      } else {
        s += line(0, y1 - 3, W, y1 - 3, C.white, 2.6);
        s += line(0, y0 + 3, x0, y0 + 3, C.white, 2.6) + line(x1, y0 + 3, W, y0 + 3, C.white, 2.6);
      }
      var lw = hw / 2;
      s += line(x0 + lw, stemTop, x0 + lw, stemBot, C.white, 2.2, 'stroke-dasharray="15 14"');
      s += line(x1 - lw, stemTop, x1 - lw, stemBot, C.white, 2.2, 'stroke-dasharray="15 14"');
      s += line(0, hy - 2.4, W, hy - 2.4, C.yel, 2.4) + line(0, hy + 2.4, W, hy + 2.4, C.yel, 2.4);
      s += line(cx - 2.4, stemTop, cx - 2.4, stemBot, C.yel, 2.4) + line(cx + 2.4, stemTop, cx + 2.4, stemBot, C.yel, 2.4);
      var cwD = Math.max(12, hw * 0.18);
      if (dir === 'up') {
        s += cwBand(x0, x1, y1 + gap + 2, cwD);
        s += stopBar(x0 + 1, y1 + gap + cwD + 8, hw - 4);
        s += upArrow(x0 + lw * 0.5, y1 + gap + cwD + 62, Math.min(lw * 1.5, 46), 0);
      } else {
        s += cwBand(x0, x1, y0 - gap - cwD - 2, cwD);
        s += stopBar(cx + 2, y0 - gap - cwD - 8 - 5, hw - 4);
        s += upArrow(x1 - lw * 0.5, y0 - gap - cwD - 62, Math.min(lw * 1.5, 46), 180);
      }
    } else {
      var vx = dir === 'right' ? W * 0.34 : W * 0.66;
      var x0r = vx - hw, x1r = vx + hw, hyr = H * 0.5, y0r = hyr - hw, y1r = hyr + hw;
      var armL = dir === 'right' ? 0 : x0r, armR = dir === 'right' ? W : x0r;
      s += rect(x0r, 0, hw * 2, H, C.asp);
      if (dir === 'right') s += rect(x1r, y0r, W - x1r, hw * 2, C.asp);
      else s += rect(0, y0r, x0r, hw * 2, C.asp);
      s += sidewalk(x0r - gap, 0, gap, y0r - gap); s += curbV(x0r, 0, y0r - gap);
      s += sidewalk(x1r, 0, gap, y0r - gap); s += curbV(x1r, 0, y0r - gap);
      s += sidewalk(x0r - gap, y1r + gap, gap, H - y1r - gap); s += curbV(x0r, y1r + gap, H);
      s += sidewalk(x1r, y1r + gap, gap, H - y1r - gap); s += curbV(x1r, y1r + gap, H);
      if (dir === 'right') {
        s += sidewalk(x1r + gap, y0r - gap, W - x1r - gap, gap); s += curbH(x1r + gap, W, y0r);
        s += sidewalk(x1r + gap, y1r, W - x1r - gap, gap); s += curbH(x1r + gap, W, y1r);
        s += urbanBlock(0, 0, x0r - gap - 12, H, 8);
        s += urbanBlock(x1r + gap + 6, y1r + gap + 6, W - x1r - gap - 12, H - y1r - gap - 12, 9);
      } else {
        s += sidewalk(0, y0r - gap, x0r - gap, gap); s += curbH(0, x0r - gap, y0r);
        s += sidewalk(0, y1r, x0r - gap, gap); s += curbH(0, x0r - gap, y1r);
        s += urbanBlock(x1r + gap + 6, 0, W - x1r - gap - 12, H, 8);
        s += urbanBlock(0, y1r + gap + 6, x0r - gap - 12, H - y1r - gap - 12, 9);
      }
      s += line(x0r + 3, 0, x0r + 3, H, C.white, 2.6);
      /* 세로 도로 가장자리 — 가로 가지 입구에서는 끊는다 */
      s += line(x1r - 3, 0, x1r - 3, y0r, C.white, 2.6) + line(x1r - 3, y1r, x1r - 3, H, C.white, 2.6);
      s += line(vx - 2.4, 0, vx - 2.4, H, C.yel, 2.4) + line(vx + 2.4, 0, vx + 2.4, H, C.yel, 2.4);
      var gx0 = dir === 'right' ? x1r : 0, gx1 = dir === 'right' ? W : x0r;
      s += line(gx0 + 6, y0r + 3, gx1, y0r + 3, C.white, 2.6) + line(gx0 + 6, y1r - 3, gx1, y1r - 3, C.white, 2.6);
      s += line(gx0, hyr - 2.4, gx1, hyr - 2.4, C.yel, 2.2) + line(gx0, hyr + 2.4, gx1, hyr + 2.4, C.yel, 2.2);
      s += line(vx, y0r + 3, vx, y1r - 3, C.white, 2.2, 'stroke-dasharray="14 13"');
      var cwD2 = Math.max(12, hw * 0.18);
      if (dir === 'right') {
        s += cwBandV(x1r + gap + 2, y0r, y1r, cwD2);
        s += stopBar(x1r + gap + cwD2 + 8, y0r + 1, hw - 4, true);
      } else {
        s += cwBandV(x0r - gap - cwD2 - 2, y0r, y1r, cwD2);
        s += stopBar(x0r - gap - cwD2 - 13, y0r + 1, hw - 4, true);
      }
    }
    return s;
  }

  function roundabout(W, H, big) {
    var cx = W / 2, cy = H / 2;
    var R = Math.min(W, H) * (big ? 0.25 : 0.19);
    var road = Math.min(W, H) * (big ? 0.13 : 0.115);
    var arm = Math.min(W, H) * 0.16;
    var s = rect(0, 0, W, H, C.ground);
    s += urbanBlock(6, 6, cx - arm - 46, cy - arm - 46, 11);
    s += urbanBlock(cx + arm + 40, 6, W - cx - arm - 46, cy - arm - 46, 12);
    s += urbanBlock(6, cy + arm + 40, cx - arm - 46, H - cy - arm - 46, 13);
    s += urbanBlock(cx + arm + 40, cy + arm + 40, W - cx - arm - 46, H - cy - arm - 46, 14);
    /* 진입로 4방향 */
    s += rect(cx - arm, 0, arm * 2, H, C.asp) + rect(0, cy - arm, W, arm * 2, C.asp);
    /* 진입로 보도 */
    s += sidewalk(cx - arm - 11, 0, 11, cy - arm - 40); s += sidewalk(cx + arm, 0, 11, cy - arm - 40);
    s += sidewalk(cx - arm - 11, cy + arm + 40, 11, H - cy - arm - 40); s += sidewalk(cx + arm, cy + arm + 40, 11, H - cy - arm - 40);
    s += sidewalk(0, cy - arm - 11, cx - arm - 40, 11); s += sidewalk(cx + arm + 40, cy - arm - 11, W - cx - arm - 40, 11);
    s += sidewalk(0, cy + arm, cx - arm - 40, 11); s += sidewalk(cx + arm + 40, cy + arm, W - cx - arm - 40, 11);
    /* 진입로 차로 */
    s += line(cx - 2.4, 0, cx - 2.4, cy - arm - 34, C.yel, 2.4) + line(cx + 2.4, 0, cx + 2.4, cy - arm - 34, C.yel, 2.4);
    s += line(cx - 2.4, cy + arm + 34, cx - 2.4, H, C.yel, 2.4) + line(cx + 2.4, cy + arm + 34, cx + 2.4, H, C.yel, 2.4);
    s += line(0, cy - 2.4, cx - arm - 34, cy - 2.4, C.yel, 2.4) + line(0, cy + 2.4, cx - arm - 34, cy + 2.4, C.yel, 2.4);
    s += line(cx + arm + 34, cy - 2.4, W, cy - 2.4, C.yel, 2.4) + line(cx + arm + 34, cy + 2.4, W, cy + 2.4, C.yel, 2.4);
    s += line(cx - arm + 2, 0, cx - arm + 2, cy - arm - 34, C.white, 2.4) + line(cx + arm - 2, 0, cx + arm - 2, cy - arm - 34, C.white, 2.4);
    s += line(cx - arm + 2, cy + arm + 34, cx - arm + 2, H, C.white, 2.4) + line(cx + arm - 2, cy + arm + 34, cx + arm - 2, H, C.white, 2.4);
    /* 회전 링 */
    s += circ(cx, cy, R, C.asp);
    s += circ(cx, cy, R - road, C.tree, 'stroke="' + C.treeS + '" stroke-width="1.4"');
    s += circ(cx, cy, R + 1.6, 'none', 'stroke="' + C.white + '" stroke-width="2.4"');
    s += circ(cx, cy, R - road / 2, 'none', 'stroke="' + C.white + '" stroke-width="2.2" stroke-dasharray="15 14"');
    s += circ(cx, cy, R - road + 1.4, 'none', 'stroke="' + C.white + '" stroke-width="2.6"');
    /* 진입로 횡단보도 · 정지선 */
    var cwH = arm * 0.34, dz = R + road * 0.4;
    s += cwBand(cx - arm + 3, cx + arm - 3, cy - dz - cwH, cwH);
    s += cwBand(cx - arm + 3, cx + arm - 3, cy + dz, cwH);
    s += cwBandV(cx - dz - cwH, cy - arm + 3, cy + arm - 3, cwH);
    s += cwBandV(cx + dz, cy - arm + 3, cy + arm - 3, cwH);
    s += stopBar(cx - arm + 1, cy - dz - cwH - 9, arm - 4);
    s += stopBar(cx + 2, cy + dz + cwH + 6, arm - 4);
    s += stopBar(cx - dz - cwH - 9, cy + 2, arm - 4, true);
    s += stopBar(cx + dz + cwH + 6, cy - arm + 1, arm - 4, true);
    return s;
  }

  /* ───────────────────────── 곡선 · 합류 ───────────────────────── */
  function curveRoad(W, H, dir) {
    var wdt = Math.min(W, H) * 0.42;
    var s = rect(0, 0, W, H, C.ground);
    s += urbanBlock(6, 6, W * 0.30, H * 0.20, 21) + urbanBlock(W * 0.60, H * 0.70, W * 0.34, H * 0.24, 22);
    s += urbanBlock(6, H * 0.72, W * 0.24, H * 0.22, 23);
    var d = dir === 'left'
      ? 'M ' + f(W * 0.62) + ' ' + f(H * 1.02) + ' L ' + f(W * 0.62) + ' ' + f(H * 0.55) + ' Q ' + f(W * 0.62) + ' ' + f(H * 0.25) + ' ' + f(W * 0.28) + ' ' + f(H * 0.25) + ' L ' + f(-W * 0.05) + ' ' + f(H * 0.25)
      : 'M ' + f(W * 0.38) + ' ' + f(H * 1.02) + ' L ' + f(W * 0.38) + ' ' + f(H * 0.55) + ' Q ' + f(W * 0.38) + ' ' + f(H * 0.25) + ' ' + f(W * 0.72) + ' ' + f(H * 0.25) + ' L ' + f(W * 1.05) + ' ' + f(H * 0.25);
    s += '<path d="' + d + '" fill="none" stroke="' + C.walk + '" stroke-width="' + f(wdt + 26) + '"/>';
    s += '<path d="' + d + '" fill="none" stroke="' + C.curb + '" stroke-width="' + f(wdt + 12) + '"/>';
    s += '<path d="' + d + '" fill="none" stroke="' + C.white + '" stroke-width="' + f(wdt) + '"/>';
    s += '<path d="' + d + '" fill="none" stroke="' + C.asp + '" stroke-width="' + f(wdt - 9) + '"/>';
    s += '<path d="' + d + '" fill="none" stroke="' + C.yel + '" stroke-width="2.6"/>';
    return s;
  }

  function mergeRoad(W, H, mode, side) {
    var left = side === 'left';
    var s = rect(0, 0, W, H, C.ground);
    var mainW = W * 0.42, cx = W * 0.5;
    s += rect(cx - mainW / 2, 0, mainW, H, C.asp);
    var jx = left ? cx - mainW / 2 + 6 : cx + mainW / 2 - 6;
    var d = left
      ? 'M ' + f(W * 0.02) + ' ' + f(H * 0.92) + ' Q ' + f(W * 0.2) + ' ' + f(H * 0.7) + ' ' + f(jx) + ' ' + f(H * 0.44)
      : 'M ' + f(W * 0.98) + ' ' + f(H * 0.92) + ' Q ' + f(W * 0.8) + ' ' + f(H * 0.7) + ' ' + f(jx) + ' ' + f(H * 0.44);
    s += '<path d="' + d + '" fill="none" stroke="' + C.walk + '" stroke-width="' + f(W * 0.2 + 24) + '" stroke-linecap="butt"/>';
    s += '<path d="' + d + '" fill="none" stroke="' + C.asp + '" stroke-width="' + f(W * 0.2) + '" stroke-linecap="butt"/>';
    s += '<path d="' + d + '" fill="none" stroke="' + C.white + '" stroke-width="2.6" stroke-dasharray="14 13" opacity=".8"/>';
    if (left) s += urbanBlock(cx + mainW / 2 + 38, 6, W - cx - mainW / 2 - 44, H * 0.38, 31);
    else s += urbanBlock(6, 6, cx - mainW / 2 - 44, H * 0.38, 31);
    s += line(cx - mainW / 2 + 3, 0, cx - mainW / 2 + 3, H, C.white, 2.4) + line(cx + mainW / 2 - 3, 0, cx + mainW / 2 - 3, H, C.white, 2.4);
    s += line(cx, 0, cx, H, C.white, 2.2, 'stroke-dasharray="16 15"');
    if (mode === 'split') {
      s += '<path d="M ' + f(cx) + ' ' + f(H) + ' L ' + f(cx) + ' ' + f(H * 0.55) + ' Q ' + f(cx) + ' ' + f(H * 0.36) + ' ' + f(cx - W * 0.12) + ' ' + f(H * 0.3) + '" fill="none" stroke="' + C.tree + '" stroke-width="' + f(W * 0.05) + '" stroke-linecap="round"/>';
      s += '<path d="M ' + f(cx) + ' ' + f(H) + ' L ' + f(cx) + ' ' + f(H * 0.55) + ' Q ' + f(cx) + ' ' + f(H * 0.36) + ' ' + f(cx + W * 0.12) + ' ' + f(H * 0.3) + '" fill="none" stroke="' + C.tree + '" stroke-width="' + f(W * 0.05) + '" stroke-linecap="round"/>';
    }
    return s;
  }

  function yRoad(W, H) {
    var rw = Math.min(W * 0.30, H * 0.21), cx = W * 0.5, jy = H * 0.46;
    var s = rect(0, 0, W, H, C.ground);
    var arms = 'M' + f(cx - rw * 1.52) + ' -10L' + f(cx) + ' ' + f(jy) + 'L' + f(cx + rw * 1.52) + ' -10';
    var stem = 'M' + f(cx) + ' ' + f(jy) + 'L' + f(cx) + ' ' + f(H + 10);
    s += '<path d="' + arms + '" fill="none" stroke="' + C.walk + '" stroke-width="' + f(rw + 28) + '" stroke-linejoin="round"/>';
    s += '<path d="' + stem + '" fill="none" stroke="' + C.walk + '" stroke-width="' + f(rw + 28) + '"/>';
    s += '<path d="' + arms + '" fill="none" stroke="' + C.asp + '" stroke-width="' + f(rw) + '" stroke-linejoin="round" stroke-linecap="round"/>';
    s += '<path d="' + stem + '" fill="none" stroke="' + C.asp + '" stroke-width="' + f(rw) + '"/>';
    /* 분기부 빈틈 메우기 */
    s += '<circle cx="' + f(cx) + '" cy="' + f(jy) + '" r="' + f(rw * 0.52) + '" fill="' + C.asp + '"/>';
    s += '<path d="' + arms + '" fill="none" stroke="' + C.yel + '" stroke-width="2.4" stroke-dasharray="15 14"/>';
    s += '<path d="' + stem + '" fill="none" stroke="' + C.yel + '" stroke-width="2.4" stroke-dasharray="15 14"/>';
    s += urbanBlock(5, 5, cx - rw * 1.52 - rw * 0.9, H * 0.26, 91);
    s += urbanBlock(cx + rw * 1.52 + rw * 0.4, 5, W - (cx + rw * 1.52 + rw * 0.4) - 6, H * 0.26, 92);
    s += urbanBlock(5, jy + rw * 1.1, cx - rw * 1.35, H - jy - rw * 1.1, 93);
    s += urbanBlock(cx + rw * 1.1, jy + rw * 1.1, W - cx - rw * 1.1 - 6, H - jy - rw * 1.1, 94);
    return s;
  }

  function sCurve(W, H) {
    var rw = Math.min(W * 0.40, H * 0.24);
    var s = rect(0, 0, W, H, C.ground);
    s += urbanBlock(6, 6, W * 0.30, H * 0.20, 81);
    s += urbanBlock(W * 0.52, H * 0.52, W * 0.42, H * 0.34, 82);
    s += urbanBlock(6, H * 0.72, W * 0.26, H * 0.22, 83);
    var d = 'M' + f(W * 0.30) + ' -20' +
      'C' + f(W * 0.30) + ' ' + f(H * 0.20) + ' ' + f(W * 0.72) + ' ' + f(H * 0.20) + ' ' + f(W * 0.72) + ' ' + f(H * 0.45) +
      'C' + f(W * 0.72) + ' ' + f(H * 0.70) + ' ' + f(W * 0.30) + ' ' + f(H * 0.72) + ' ' + f(W * 0.30) + ' ' + f(H + 20);
    s += '<path d="' + d + '" fill="none" stroke="' + C.walk + '" stroke-width="' + f(rw + 26) + '" stroke-linecap="round"/>';
    s += '<path d="' + d + '" fill="none" stroke="' + C.white + '" stroke-width="' + f(rw) + '" stroke-linecap="round"/>';
    s += '<path d="' + d + '" fill="none" stroke="' + C.asp + '" stroke-width="' + f(rw - 9) + '" stroke-linecap="round"/>';
    s += '<path d="' + d + '" fill="none" stroke="' + C.yel + '" stroke-width="3" stroke-dasharray="16 14"/>';
    return s;
  }

  /* ───────────────────────── 주차 ───────────────────────── */
  function parkingLot(W, H, style) {
    var s = '';
    if (style === 2) {
      s = rect(0, 0, W, H, '#3E4753');
      var bayW = W / 5.2, bayH = H * 0.26, yTop = H * 0.12;
      for (var row = 0; row < 3; row++) {
        var y = yTop + row * (bayH + H * 0.06);
        for (var i = 0; i <= 5; i++) s += line(i * bayW + 4, y, i * bayW + 4, y + bayH, '#DDE4EE', 2.6);
        s += line(0, y, W, y, '#DDE4EE', 2.6) + line(0, y + bayH, W, y + bayH, '#DDE4EE', 2.6);
        s += '<text x="' + f(W * 0.04) + '" y="' + f(y + bayH * 0.62) + '" font-family="sans-serif" font-size="' + f(Math.min(bayH * 0.5, 26)) + '" font-weight="800" fill="#9FB0C4">B' + (row + 1) + '</text>';
      }
      s += rect(0, H * 0.05, W, 2, '#5B6675');
      return s;
    }
    var n = 5, bw = W / n, top = H * 0.07, bd = H * 0.24;
    var aisle0 = top + bd, aisle1 = H - top - bd;
    s = rect(0, 0, W, H, C.asp);
    s += rect(0, 0, W, top, C.block) + rect(0, H - top, W, top, C.block);
    s += line(0, top, W, top, C.white, 2.6) + line(0, H - top, W, H - top, C.white, 2.6);
    for (var k = 0; k <= n; k++) {
      var bx = k * bw;
      s += line(bx, top, bx, aisle0, C.white, 2.6);
      s += line(bx, aisle1, bx, H - top, C.white, 2.6);
    }
    s += line(W * 0.5, aisle0 + 6, W * 0.5, aisle1 - 6, C.white, 2.2, 'stroke-dasharray="14 14" opacity=".5"');
    var aw = Math.min(W * 0.08, 26), ah = Math.min((aisle1 - aisle0) * 0.44, 52);
    s += glyph('up', W * 0.74, aisle0 + (aisle1 - aisle0) * 0.34, ah, 0, C.white, .7);
    s += glyph('up', W * 0.26, aisle0 + (aisle1 - aisle0) * 0.66, ah, 180, C.white, .7);
    var ps = Math.min(top * 0.62, 20);
    s += '<text x="' + f(W * 0.05) + '" y="' + f(top * 0.5 + ps * 0.36) + '" font-family="Pretendard, sans-serif" font-size="' + f(ps) +
      '" font-weight="800" fill="#94A3B8">P</text>';
    s += '<text x="' + f(W * 0.05 + ps * 0.95) + '" y="' + f(top * 0.5 + ps * 0.36) + '" font-family="Pretendard, sans-serif" font-size="' + f(ps * 0.78) +
      '" font-weight="700" fill="#94A3B8">주차장</text>';
    return s;
  }

  function lotAngle(W, H) {
    var s = rect(0, 0, W, H, C.asp);
    var top = H * 0.07, bd = H * 0.24, a0 = top + bd, a1 = H - top - bd;
    s += rect(0, 0, W, top, C.block) + rect(0, H - top, W, top, C.block);
    s += line(0, top, W, top, C.white, 2.6) + line(0, H - top, W, H - top, C.white, 2.6);
    s += line(0, a0, W, a0, C.white, 2.6) + line(0, a1, W, a1, C.white, 2.6);
    var n = 5, bw = W / n, skew = bd * 0.52;
    for (var i = 0; i <= n; i++) {
      s += line(i * bw, a0, i * bw + skew, top, C.white, 2.4);
      s += line(i * bw + skew * 0.62, a1, i * bw + skew * 0.62 + skew, H - top, C.white, 2.4);
    }
    /* 통로 진행 화살표 (위/아래) */
    var ah = Math.min((a1 - a0) * 0.5, 56);
    s += glyph('up', W * 0.66, (a0 + a1) / 2, ah * 0.9, 0, C.white, .75);
    s += glyph('up', W * 0.32, (a0 + a1) / 2, ah * 0.9, 180, C.white, .75);
    s += '<text x="' + f(W * 0.05) + '" y="' + f(top * 0.62) + '" font-family="sans-serif" font-size="' + f(Math.min(top * 0.6, 18)) +
      '" font-weight="800" fill="#94A3B8">사선 주차</text>';
    return s;
  }

  function shoulderParking(W, H) {
    var base = laneRoad(W, H, { lanes: 4, hw: 0.25, arrows: false });
    var cx = W * 0.5, hw = W * 0.25;
    var s = base.svg;
    s += rect(cx + hw - W * 0.085, 0, W * 0.085, H, '#6B7280');
    s += line(cx + hw - W * 0.085, 0, cx + hw - W * 0.085, H, C.white, 2.6);
    for (var y = 12; y < H; y += 64) s += line(cx + hw - W * 0.085, y, cx + hw - 4, y, C.white, 2.2, 'opacity=".8"');
    return s;
  }

  /* ───────────────────────── 특수 구간 ───────────────────────── */
  function safetyZone(W, H) {
    var base = laneRoad(W, H, { lanes: 4, hw: 0.26, arrows: false });
    var cx = W * 0.5, top = H * 0.13, bot = H * 0.56, w = W * 0.042;
    var d = 'M' + f(cx - w) + ' ' + f(bot) + ' L' + f(cx - w) + ' ' + f(top + 46) + ' Q' + f(cx - w) + ' ' + f(top) + ' ' + f(cx) + ' ' + f(top) +
      ' Q' + f(cx + w) + ' ' + f(top) + ' ' + f(cx + w) + ' ' + f(top + 46) + ' L' + f(cx + w) + ' ' + f(bot) + ' Z';
    var cid = 'sz' + (++uid);
    var hatch = '';
    for (var y = top + 10; y < bot - 4; y += 15) hatch += line(cx - w - 6, y, cx + w + 6, y + 17, C.white, 2);
    var s = base.svg;
    /* 기존 중앙 황색선 위에 안전지대를 덮어 그린다 */
    s += poly(d, C.asp);
    s += '<g clip-path="url(#' + cid + ')">' + hatch + '</g>';
    s += '<defs><clipPath id="' + cid + '"><path d="' + d + '"/></clipPath></defs>';
    s += poly(d, 'none', 'stroke="' + C.yel + '" stroke-width="4.6"');
    /* 안전지대 양 끝 화살표 표시 */
    s += poly('M' + f(cx) + ' ' + f(top + 12) + ' L' + f(cx - 9) + ' ' + f(top + 30) + ' L' + f(cx + 9) + ' ' + f(top + 30) + ' Z', C.yel);
    return s;
  }

  function laneReduce(W, H) {
    var n = 4, hw = W * 0.25, cx = W * 0.5, x0 = cx - hw, x1 = cx + hw, laneW = (x1 - x0) / n;
    var s = rect(0, 0, W, H, C.ground) + groundStrip(W, H, x0, x1, 'left') + groundStrip(W, H, x0, x1, 'right');
    s += rect(x0, 0, x1 - x0, H, C.asp);
    s += line(x0 + 3, 0, x0 + 3, H, C.white, 2.6) + line(x1 - 3, 0, x1 - 3, H, C.white, 2.6);
    var half = n / 2;
    for (var i = 1; i < n; i++) {
      var x = x0 + laneW * i;
      if (Math.abs(i - half) < 0.01) continue;
      if (i === n - 1) {
        /* 우측 끝 차로 → 위에서 사라진다: 매끄러운 테이퍼 + 사선 표시 */
        s += '<path d="M' + f(x) + ' ' + f(H) + ' L' + f(x) + ' ' + f(H * 0.52) + ' Q' + f(x) + ' ' + f(H * 0.30) + ' ' + f(x1 - 4) + ' ' + f(H * 0.16) + '"' +
          ' fill="none" stroke="' + C.white + '" stroke-width="2.6"/>';
        var gid = 'gr' + (++uid);
        var gd = 'M' + f(x) + ' ' + f(H * 0.52) + ' Q' + f(x) + ' ' + f(H * 0.30) + ' ' + f(x1 - 4) + ' ' + f(H * 0.16) +
          ' L' + f(x1) + ' ' + f(H * 0.16) + ' L' + f(x1) + ' ' + f(H * 0.52) + ' Z';
        var hatch = '';
        for (var hy = H * 0.16; hy < H * 0.54; hy += 17) hatch += line(x, hy + 26, x1 + 4, hy - 8, C.white, 2, 'opacity=".55"');
        s += '<defs><clipPath id="' + gid + '"><path d="' + gd + '"/></clipPath></defs>';
        s += '<g clip-path="url(#' + gid + ')">' + hatch + '</g>';
      } else {
        s += line(x, 0, x, H, C.white, 2.2, 'stroke-dasharray="15 14"');
      }
    }
    s += line(cx - 2.4, 0, cx - 2.4, H, C.yel, 2.4) + line(cx + 2.4, 0, cx + 2.4, H, C.yel, 2.4);
    /* 감소 예고 화살표 — 사라지는 차로 안쪽 */
    s += glyph('up', x1 - laneW * 0.5, H * 0.34, Math.min(laneW * 1.5, 52), 0, C.white, .95);
    s += text(x1 - laneW * 0.5, H * 0.46, '합류', Math.min(laneW * 0.5, 17), C.white);
    return s;
  }

  function livingRoad(W, H) {
    var hw = W * 0.21, cx = W * 0.5, x0 = cx - hw, x1 = cx + hw;
    var s = rect(0, 0, W, H, C.ground) + groundStrip(W, H, x0, x1, 'left') + groundStrip(W, H, x0, x1, 'right');
    s += rect(x0, 0, x1 - x0, H, '#6E7681');
    /* 생활도로 — 차분한 블록 포장 (중앙선 없음) */
    var bw = 26, bh = 22;
    for (var y = 0; y < H; y += bh) {
      for (var x = x0 + ((y / bh) % 2 ? bw / 2 : 0); x < x1; x += bw) {
        var k = ((x * 7 + y * 13) % 3);
        s += rect(Math.max(x0, x), y + 1, Math.min(bw - 2, x1 - x), bh - 2, 'rgba(255,255,255,.045)', 'rx="1.5"');
      }
    }
    s += line(x0 + 4, 0, x0 + 4, H, C.white, 2.4) + line(x1 - 4, 0, x1 - 4, H, C.white, 2.4);
    s += line(x0 + 14, 0, x0 + 14, H, 'rgba(255,255,255,.30)', 1.4) + line(x1 - 14, 0, x1 - 14, H, 'rgba(255,255,255,.30)', 1.4);
    /* 보행자우선도로 표시 */
    s += text(cx, H * 0.20, '생활도로', Math.min((x1 - x0 - 20) / 4, 26), C.white, 'opacity=".92"');
    s += text(cx, H * 0.20 + Math.min((x1 - x0 - 20) / 4, 26) * 1.3, '보행자우선', Math.min((x1 - x0 - 20) / 5, 18), C.white, 'opacity=".72"');
    s += glyph('up', cx - hw * 0.45, H * 0.36, Math.min(hw * 0.7, 56), 0, C.white, .75);
    s += glyph('up', cx + hw * 0.45, H * 0.64, Math.min(hw * 0.7, 56), 180, C.white, .75);
    return s;
  }

  function oneway(W, H) {
    var hw = 0.24 * W, cx = W * 0.5, x0 = cx - hw, x1 = cx + hw, roadW = x1 - x0;
    var s = rect(0, 0, W, H, C.ground) + groundStrip(W, H, x0, x1, 'left') + groundStrip(W, H, x0, x1, 'right');
    s += rect(x0, 0, roadW, H, C.asp);
    s += line(x0 + 3.6, 0, x0 + 3.6, H, C.white, 3.2);
    s += line(x1 - 3.6, 0, x1 - 3.6, H, C.white, 3.2);
    /* 한쪽 방향 안내 — 차로 점선 + 화살표 + 노면 표기 */
    s += line(cx, 0, cx, H, C.white, 2.2, 'stroke-dasharray="16 15"');
    var aw = Math.min(roadW * 0.40, W * 0.22), ah = aw * 1.55;
    s += upArrow(cx - roadW * 0.24, H * 0.26, ah);
    s += upArrow(cx + roadW * 0.24, H * 0.62, ah);
    var fs = Math.min(roadW * 0.90 / 4.35, H * 0.075, 46);
    if (fs >= 8) {
      s += '<text x="' + f(cx) + '" y="' + f(H * 0.44 + fs * 0.36) + '" text-anchor="middle"' +
        ' font-family="Pretendard, Apple SD Gothic Neo, Noto Sans KR, sans-serif"' +
        ' font-size="' + f(fs) + '" font-weight="800" fill="#FFFFFF"' +
        ' letter-spacing="' + f(fs * 0.06) + '">일방통행</text>';
    }
    return s;
  }

  /* ───────────────────────── 버스전용 ───────────────────────── */
  function busCenter(W, H) {
    var hw = 0.30 * W, cx = W * 0.5, x0 = cx - hw, x1 = cx + hw, lw = (x1 - x0) / 6;
    var s = rect(0, 0, W, H, C.ground) + groundStrip(W, H, x0, x1, 'left') + groundStrip(W, H, x0, x1, 'right');
    s += rect(x0, 0, x1 - x0, H, C.asp);
    s += line(x0 + 3, 0, x0 + 3, H, C.white, 2.8) + line(x1 - 3, 0, x1 - 3, H, C.white, 2.8);
    s += line(x0 + lw, 0, x0 + lw, H, C.white, 2.2, 'stroke-dasharray="16 15"');
    s += line(x1 - lw, 0, x1 - lw, H, C.white, 2.2, 'stroke-dasharray="16 15"');
    /* 중앙 버스전용차로 — 파란 실선 + 노면 '버스' */
    s += line(x0 + lw * 2, 0, x0 + lw * 2, H, C.blue, 3.4);
    s += line(x1 - lw * 2, 0, x1 - lw * 2, H, C.blue, 3.4);
    var mw = Math.max(8, W * 0.024);
    s += rect(cx - mw / 2, 0, mw, H, C.walk);
    s += rect(cx - mw * 2.1, H * 0.28, mw * 4.2, H * 0.16, C.walk, 'stroke="' + C.blockS + '" stroke-width="1.2" rx="3"');
    s += line(cx - mw * 2.1, H * 0.28, cx - mw * 2.1, H * 0.44, C.curb, 2) + line(cx + mw * 2.1, H * 0.28, cx + mw * 2.1, H * 0.44, C.curb, 2);
    var fs = Math.min(lw * 0.66, 30);
    [x0 + lw * 1.5, x1 - lw * 1.5].forEach(function (bx) {
      for (var i = 0; i < 2; i++) s += text(bx, H * (0.58 + i * 0.09), ['버', '스'][i], fs, C.blue);
    });
    return s;
  }

  function busSide(W, H) {
    var hw = 0.26 * W, cx = W * 0.5, x0 = cx - hw, x1 = cx + hw, lw = (x1 - x0) / 4;
    var s = rect(0, 0, W, H, C.ground) + groundStrip(W, H, x0, x1, 'left') + groundStrip(W, H, x0, x1, 'right');
    s += rect(x0, 0, x1 - x0, H, C.asp);
    s += line(x0 + 3, 0, x0 + 3, H, C.white, 2.8) + line(x1 - 3, 0, x1 - 3, H, C.white, 2.8);
    s += line(cx - 2.5, 0, cx - 2.5, H, C.yel, 2.2) + line(cx + 2.5, 0, cx + 2.5, H, C.yel, 2.2);
    s += line(x0 + lw, 0, x0 + lw, H, C.white, 2.2, 'stroke-dasharray="16 15"');
    s += line(x0 + lw * 3, 0, x0 + lw * 3, H, C.white, 2.2, 'stroke-dasharray="16 15"');
    s += line(x1 - lw, 0, x1 - lw, H, C.blue, 3.4);
    s += line(x1 - 9, 0, x1 - 9, H, C.blue, 2.2);
    var fs = Math.min(lw * 0.62, 30);
    s += text(x1 - lw * 0.5, H * 0.34, '버', fs, C.blue);
    s += text(x1 - lw * 0.5, H * 0.34 + fs * 1.16, '스', fs, C.blue);
    return s;
  }

  /* ───────────────────────── 유턴구역 ───────────────────────── */
  function uturnRoad(W, H) {
    var hw = 0.25 * W, cx = W * 0.5, x0 = cx - hw, x1 = cx + hw, lw = (x1 - x0) / 4;
    var s = rect(0, 0, W, H, C.ground) + groundStrip(W, H, x0, x1, 'left') + groundStrip(W, H, x0, x1, 'right');
    s += rect(x0, 0, x1 - x0, H, C.asp);
    s += line(x0 + 3, 0, x0 + 3, H, C.white, 2.8) + line(x1 - 3, 0, x1 - 3, H, C.white, 2.8);
    s += line(x0 + lw, 0, x0 + lw, H, C.white, 2.2, 'stroke-dasharray="16 15"');
    s += line(x1 - lw, 0, x1 - lw, H, C.white, 2.2, 'stroke-dasharray="16 15"');
    /* 중앙 황색 복선 */
    s += line(cx - 2.6, 0, cx - 2.6, H, C.yel, 2.4) + line(cx + 2.6, 0, cx + 2.6, H, C.yel, 2.4);
    /* 유턴구역선 — 중앙선 쪽에 나란한 백색 점선 */
    var zx = cx + 13;
    s += line(zx, H * 0.07, zx, H * 0.76, C.white, 2.6, 'stroke-dasharray="20 13"');
    /* 1차로 노면 유턴 화살표 */
    var gw = Math.min(lw - 12, W * 0.09), gh = gw * 2.75;
    var ax = zx + (lw - 13) * 0.5;
    var ay = H * 0.30;
    s += uturnArrow(ax, ay, gh, 0, C.white, .96);
    s += text(ax, ay + gh * 0.5 + 26, '유턴', Math.min(lw * 0.44, 24), C.white);
    /* 빠져나갈 쪽 차로 화살표 */
    s += upArrow(x1 - lw * 0.5, H * 0.80, Math.min(lw * 1.4, H * 0.10), 180, C.white, .9);
    return s;
  }

  /* ───────────────────────── 자전거 · 스쿨존 · 방지턱 ───────────────────────── */
  function bikeGlyph(cx, cy, r, col) {
    return '<g fill="none" stroke="' + col + '" stroke-width="' + f(r * 0.24) + '" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="' + f(cx - r) + '" cy="' + f(cy) + '" r="' + f(r * 0.58) + '"/>' +
      '<circle cx="' + f(cx + r) + '" cy="' + f(cy) + '" r="' + f(r * 0.58) + '"/>' +
      '<path d="M' + f(cx - r) + ' ' + f(cy) + 'L' + f(cx - r * 0.25) + ' ' + f(cy - r * 0.78) + 'L' + f(cx + r * 0.42) + ' ' + f(cy) + '"/>' +
      '<path d="M' + f(cx - r * 0.25) + ' ' + f(cy - r * 0.78) + 'L' + f(cx - r * 0.02) + ' ' + f(cy - r * 1.12) + '"/>' +
      '</g>';
  }
  function bikeLane(W, H) {
    var hw = 0.23 * W, cx = W * 0.5, x0 = cx - hw, x1 = cx + hw, lw = (x1 - x0) / 2;
    var s = rect(0, 0, W, H, C.ground) + groundStrip(W, H, x0, x1, 'left') + groundStrip(W, H, x0, x1, 'right');
    s += rect(x0, 0, x1 - x0, H, C.asp);
    var bw = Math.min(W * 0.085, lw * 0.55);
    s += rect(x1 - bw, 0, bw, H, '#9A5B43');
    s += line(x0 + 3, 0, x0 + 3, H, C.white, 2.8) + line(x1 - 3, 0, x1 - 3, H, C.white, 2.8);
    s += line(x1 - bw, 0, x1 - bw, H, C.white, 2.6);
    s += line(cx - 2.5, 0, cx - 2.5, H, C.yel, 2.2) + line(cx + 2.5, 0, cx + 2.5, H, C.yel, 2.2);
    var gr = Math.min(bw * 0.30, 20);
    for (var yy = H * 0.17; yy < H; yy += H * 0.33) s += bikeGlyph(x1 - bw * 0.5, yy, gr, '#FFFFFF');
    return s;
  }

  function schoolZone(W, H) {
    var hw = 0.21 * W, cx = W * 0.5, x0 = cx - hw, x1 = cx + hw, roadW = x1 - x0;
    var s = rect(0, 0, W, H, C.ground) + groundStrip(W, H, x0, x1, 'left') + groundStrip(W, H, x0, x1, 'right');
    /* 적색 미끄럼방지 포장 */
    s += rect(x0, 0, roadW, H, '#8E4A44');
    s += rect(x0 + 6, 0, roadW - 12, H, 'rgba(255,255,255,.05)');
    s += line(x0 + 4, 0, x0 + 4, H, C.white, 3) + line(x1 - 4, 0, x1 - 4, H, C.white, 3);
    s += line(cx - 2.6, 0, cx - 2.6, H, C.yel, 2.4) + line(cx + 2.6, 0, cx + 2.6, H, C.yel, 2.4);
    var cwD = Math.max(14, H * 0.055);
    s += cwBand(x0, x1, H * 0.62, cwD);
    s += stopBar(cx + 2, H * 0.62 + cwD + 8, hw - 4);
    var fs = Math.min(roadW * 0.44, H * 0.16, 76);
    s += '<text x="' + f(cx) + '" y="' + f(H * 0.26 + fs * 0.36) + '" text-anchor="middle"' +
      ' font-family="Pretendard, Apple SD Gothic Neo, Noto Sans KR, sans-serif" font-size="' + f(fs) +
      '" font-weight="800" fill="#FFFFFF">30</text>';
    s += '<text x="' + f(cx) + '" y="' + f(H * 0.26 + fs * 1.26) + '" text-anchor="middle"' +
      ' font-family="Pretendard, Apple SD Gothic Neo, Noto Sans KR, sans-serif" font-size="' + f(Math.min((roadW - 16) / 7, 22)) +
      '" font-weight="800" fill="#FFFFFF" opacity=".95">어린이보호구역</text>';
    s += upArrow(cx - hw * 0.45, H * 0.46, Math.min(hw * 0.8, 60), 0, C.white, .9);
    return s;
  }

  function speedBump(W, H) {
    var base = laneRoad(W, H, { lanes: 2, hw: 0.22, arrows: false });
    var s = base.svg, x0 = base.x0, x1 = base.x1, rw = x1 - x0;
    [0.32, 0.66].forEach(function (fy) {
      var y = H * fy, h = Math.max(9, H * 0.03), n = 10;
      for (var i = 0; i < n; i++) {
        s += rect(x0 + rw * i / n, y, rw / n + 0.4, h, i % 2 ? C.white : C.yel, 'opacity=".95"');
      }
    });
    return s;
  }

  /* ───────────────────────── 골목 · 단지 ───────────────────────── */
  function alley(W, H) {
    var hw = W * 0.15, cx = W * 0.5, x0 = cx - hw, x1 = cx + hw;
    var s = rect(0, 0, W, H, C.ground);
    s += sidewalk(x0 - 12, 0, 12, H) + sidewalk(x1, 0, 12, H);
    s += curbV(x0, 0, H) + curbV(x1, 0, H);
    s += rect(x0, 0, x1 - x0, H, '#5A6370');
    s += line(x0 + 4, 0, x0 + 4, H, '#6E7887', 2.2) + line(x1 - 4, 0, x1 - 4, H, '#6E7887', 2.2);
    s += urbanBlock(3, 4, x0 - 16, H * 0.44, 51);
    s += urbanBlock(3, H * 0.48, x0 - 16, H * 0.46, 52);
    s += urbanBlock(x1 + 14, 4, W - x1 - 18, H * 0.52, 53);
    s += urbanBlock(x1 + 14, H * 0.56, W - x1 - 18, H * 0.38, 54);
    return s;
  }

  function alleyCross(W, H) {
    var vx = W * 0.47, hy = H * 0.45, rw = Math.min(W, H) * 0.135;
    var s = rect(0, 0, W, H, C.ground);
    s += rect(vx - rw - 9, 0, 9, H, C.walk) + rect(vx + rw, 0, 9, H, C.walk);
    s += rect(0, hy - rw - 9, W, 9, C.walk) + rect(0, hy + rw, W, 9, C.walk);
    s += rect(vx - rw, 0, rw * 2, H, '#5A6370') + rect(0, hy - rw, W, rw * 2, '#5A6370');
    s += urbanBlock(4, 4, vx - rw - 16, hy - rw - 16, 61);
    s += urbanBlock(vx + rw + 10, 4, W - vx - rw - 14, hy - rw - 16, 62);
    s += urbanBlock(4, hy + rw + 10, vx - rw - 16, H - hy - rw - 14, 63);
    s += urbanBlock(vx + rw + 10, hy + rw + 10, W - vx - rw - 14, H - hy - rw - 14, 64);
    return s;
  }

  function aptSlab(x, y, w, h) {
    if (w < 14 || h < 14) return '';
    var s = rect(x, y, w, h, '#DEE4ED', 'stroke="#C2CBD9" stroke-width="1.2" rx="2.5"');
    var step = Math.max(5, h * 0.17);
    for (var yy = y + step; yy < y + h - 3; yy += step) s += line(x + 4, yy, x + w - 4, yy, '#C6CFDC', Math.max(2, h * 0.045));
    return s;
  }
  function aptRoad(W, H) {
    var hw = W * 0.155, cx = W * 0.5, x0 = cx - hw, x1 = cx + hw;
    var s = rect(0, 0, W, H, C.ground);
    s += rect(x0, 0, x1 - x0, H, '#59616D');
    s += line(x0 + 2.6, 0, x0 + 2.6, H, C.white, 2.2) + line(x1 - 2.6, 0, x1 - 2.6, H, C.white, 2.2);
    s += line(cx, 0, cx, H, C.white, 1.8, 'stroke-dasharray="12 12" opacity=".6"');
    var bay = x0 * 0.30;
    [0.10, 0.36, 0.62, 0.88].forEach(function (fy) {
      s += line(x0 - bay, H * fy, x0, H * fy, C.white, 2.2);
      s += line(x1, H * fy, x1 + bay, H * fy, C.white, 2.2);
    });
    s += aptSlab(3, H * 0.04, x0 - bay - 8, H * 0.30);
    s += aptSlab(3, H * 0.56, x0 - bay - 8, H * 0.38);
    s += aptSlab(x1 + bay + 8, H * 0.04, W - x1 - bay - 11, H * 0.34);
    s += aptSlab(x1 + bay + 8, H * 0.56, W - x1 - bay - 11, H * 0.38);
    return s;
  }

  /* ───────────────────────── 교차로 특수형 ───────────────────────── */
  function xjPocket(W, H) {
    var base = crossRoad(W, H, { lanes: 4, hw: 0.22 });
    var s = base.svg;
    var hw = 0.22 * Math.min(W, H), cx = W * 0.5, cy = H * 0.5;
    var y1 = cy + hw, lw = hw / 2;
    var py = Math.min(H - 8, y1 + hw * 1.35);
    s += line(cx + lw, y1 + 12, cx + lw, py, C.white, 2.6);
    s += line(cx - lw, y1 + 12, cx - lw, py, C.white, 2.6);
    var ax = cx + lw * 0.5, ay = py - 6;
    s += leftArrow(ax, ay - lw * 0.55, Math.min(lw * 1.5, 46), 180, C.white, .95);
    s += line(cx - lw * 0.5, py, cx - lw * 0.5, y1 + 12, C.white, 2.2, 'stroke-dasharray="12 10" opacity=".55"');
    return s;
  }

  function xjScramble(W, H) {
    var base = crossRoad(W, H, { lanes: 4, hw: 0.22 });
    var s = base.svg;
    var hw = 0.22 * Math.min(W, H), cx = W * 0.5, cy = H * 0.5;
    var cid = 'sc' + (++uid);
    var bw = hw * 0.30;
    var d = 'M' + f(cx - hw + 6) + ' ' + f(cy - hw + 6) + ' L' + f(cx + hw - 6) + ' ' + f(cy + hw - 6) +
      ' M' + f(cx + hw - 6) + ' ' + f(cy - hw + 6) + ' L' + f(cx - hw + 6) + ' ' + f(cy + hw - 6);
    var diag = '';
    [[cx - hw + 8, cy - hw + 8, cx + hw - 8, cy + hw - 8], [cx + hw - 8, cy - hw + 8, cx - hw + 8, cy + hw - 8]].forEach(function (q) {
      var dx = q[2] - q[0], dy = q[3] - q[1], L = Math.sqrt(dx * dx + dy * dy);
      var ang = Math.atan2(dy, dx) * 180 / Math.PI;
      var n = Math.max(3, Math.round(L / (bw * 1.05)));
      for (var i = 0; i < n; i++) {
        var t = (i + 0.5) / n;
        diag += '<rect x="' + f(-bw * 0.26) + '" y="' + f(-bw / 2) + '" width="' + f(bw * 0.52) + '" height="' + f(bw) +
          '" fill="' + C.white + '" opacity=".95" transform="translate(' + f(q[0] + dx * t) + ',' + f(q[1] + dy * t) + ') rotate(' + f(ang) + ')"/>';
      }
    });
    s += '<defs><clipPath id="' + cid + '"><rect x="' + f(cx - hw + 7) + '" y="' + f(cy - hw + 7) +
      '" width="' + f(hw * 2 - 14) + '" height="' + f(hw * 2 - 14) + '"/></clipPath></defs>';
    s += '<g clip-path="url(#' + cid + ')">' + diag + '</g>';
    return s;
  }

  function fiveWay(W, H) {
    var cx = W * 0.5, cy = H * 0.47, rw = Math.min(W, H) * 0.17, L = Math.max(W, H) * 1.4;
    var s = rect(0, 0, W, H, C.ground);
    var angs = [90, 18, 162, 234, 306];
    var paths = angs.map(function (a) {
      var r = a * Math.PI / 180;
      return 'M' + f(cx) + ' ' + f(cy) + 'L' + f(cx + Math.cos(r) * L) + ' ' + f(cy - Math.sin(r) * L);
    });
    paths.forEach(function (d) {
      s += '<path d="' + d + '" fill="none" stroke="' + C.walk + '" stroke-width="' + f(rw * 2 + 26) + '" stroke-linecap="butt"/>';
    });
    paths.forEach(function (d) {
      s += '<path d="' + d + '" fill="none" stroke="' + C.asp + '" stroke-width="' + f(rw * 2) + '" stroke-linecap="butt"/>';
    });
    /* 교차부 원형 */
    s += circ(cx, cy, rw * 1.06, C.asp);
    /* 진입로마다 중앙선·차로선·횡단보도·정지선 */
    angs.forEach(function (a) {
      var rot = 90 - a;
      var g = '';
      var dCw = rw * 1.62, cwH = rw * 0.30;
      /* 횡단보도 */
      var step = Math.max(9, (rw * 2) / 9), bw = step * 0.52;
      for (var x = -rw + bw * 0.7; x + bw < rw - 2; x += step) g += rect(x, -dCw - cwH / 2, bw, cwH, C.white, 'opacity=".94"');
      /* 정지선 — 진입 차로(현지 좌측 반)만 */
      g += line(-rw + 6, -dCw - cwH / 2 - 10, -4, -dCw - cwH / 2 - 10, C.white, 5.4);
      /* 중앙 황색 복선 · 차로 점선 · 가장자리 백색선 */
      g += line(-2.4, -rw * 1.02, -2.4, -L, C.yel, 2.4) + line(2.4, -rw * 1.02, 2.4, -L, C.yel, 2.4);
      g += line(-rw * 0.5, -rw * 1.02, -rw * 0.5, -L, C.white, 2.2, 'stroke-dasharray="15 14"');
      g += line(rw * 0.5, -rw * 1.02, rw * 0.5, -L, C.white, 2.2, 'stroke-dasharray="15 14"');
      g += line(-rw + 4, -rw * 1.02, -rw + 4, -L, C.white, 2.6) + line(rw - 4, -rw * 1.02, rw - 4, -L, C.white, 2.6);
      /* 진행 화살표 */
      g += glyph('up', -rw * 0.5, -dCw - cwH / 2 - 48, Math.min(rw * 1.2, 58), 180, C.white, .9);
      g += glyph('up', rw * 0.5, -dCw - cwH / 2 - 48, Math.min(rw * 1.2, 58), 0, C.white, .9);
      s += '<g transform="translate(' + f(cx) + ',' + f(cy) + ') rotate(' + f(rot) + ')">' + g + '</g>';
    });
    /* 중앙 안내 링 */
    s += '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(rw * 0.62) + '" fill="none" stroke="' + C.white + '" stroke-width="2" stroke-dasharray="14 12" opacity=".5"/>';
    return s;
  }

  function highway(W, H, variant) {
    var cx = W * 0.5;
    /* 1 = 4차로(왕복) · 2 = 6차로 + 중앙분리대 */
    var lanes = variant === 2 ? 6 : 4;
    var hw = variant === 2 ? W * 0.34 : W * 0.26;
    var x0 = cx - hw, x1 = cx + hw, laneW = (x1 - x0) / lanes;
    var s = rect(0, 0, W, H, variant === 2 ? '#DCE6D1' : '#E4EADF');
    /* 방음벽·가드레일 */
    s += rect(x0 - 26, 0, 26, H, '#DDE3EA');
    s += rect(x1, 0, 26, H, '#DDE3EA');
    s += line(x0 - 26, 0, x0 - 26, H, '#AEB9C6', 2.4) + line(x1 + 26, 0, x1 + 26, H, '#AEB9C6', 2.4);
    for (var g = 18; g < H; g += 54) {
      s += rect(x0 - 22, g, 6, 22, '#9FAAB8', 'rx="2"') + rect(x1 + 16, g, 6, 22, '#9FAAB8', 'rx="2"');
    }
    s += rect(x0, 0, x1 - x0, H, C.asp);
    /* 갓길 */
    s += rect(x0, 0, 12, H, '#5A626E') + rect(x1 - 12, 0, 12, H, '#5A626E');
    s += line(x0 + 13, 0, x0 + 13, H, C.white, 2.6) + line(x1 - 13, 0, x1 - 13, H, C.white, 2.6);
    var half = lanes / 2;
    for (var i = 1; i < lanes; i++) {
      var x = x0 + laneW * i;
      if (Math.abs(i - half) < 0.01 && variant !== 2) continue;
      s += line(x, 0, x, H, C.white, 2.2, 'stroke-dasharray="18 16"');
    }
    if (variant === 2) {
      /* 중앙분리대 — 잔디 + 가드레일 */
      var mw = Math.max(16, W * 0.05);
      s += rect(cx - mw / 2, 0, mw, H, C.grass);
      s += line(cx - mw / 2, 0, cx - mw / 2, H, '#9DA9B7', 3) + line(cx + mw / 2, 0, cx + mw / 2, H, '#9DA9B7', 3);
      for (var p2 = 10; p2 < H; p2 += 40) {
        s += rect(cx - mw / 2 - 3, p2, 3, 14, '#8A96A5') + rect(cx + mw / 2, p2, 3, 14, '#8A96A5');
      }
    } else {
      s += line(cx - 2.6, 0, cx - 2.6, H, C.yel, 2.4) + line(cx + 2.6, 0, cx + 2.6, H, C.yel, 2.4);
    }
    return s;
  }

  /* ───────────────────────── 입체 · 고속 시설 ───────────────────────── */
  function underpass(W, H) {
    var g = laneRoad(W, H, { lanes: 4, hw: 0.25, arrows: false });
    var s = g.svg, x0 = g.x0, x1 = g.x1, rw = x1 - x0;
    var deckY = H * 0.58, deckH = Math.max(26, H * 0.075);
    var wallW = Math.max(12, W * 0.034);
    var sunkenTop = deckY - deckH * 1.4;
    /* 지하 구간: 단단한 색으로 덮는다(겹친 반투명 제거) */
    s += rect(x0 - wallW, sunkenTop, wallW, deckY - sunkenTop + deckH, C.wall);
    s += rect(x1, sunkenTop, wallW, deckY - sunkenTop + deckH, C.wall);
    s += rect(x0 - wallW, sunkenTop, wallW, 3.4, C.wallD) + rect(x1, sunkenTop, wallW, 3.4, C.wallD);
    s += rect(x0, sunkenTop, rw, H - sunkenTop, '#3B424E');
    /* 지하 구간 차로선 다시 */
    s += line(x0 + 3, sunkenTop, x0 + 3, H, C.white, 2.6, 'opacity=".85"');
    s += line(x1 - 3, sunkenTop, x1 - 3, H, C.white, 2.6, 'opacity=".85"');
    s += line(g.cx - 2.4, sunkenTop, g.cx - 2.4, H, C.yel, 2.4, 'opacity=".85"');
    s += line(g.cx + 2.4, sunkenTop, g.cx + 2.4, H, C.yel, 2.4, 'opacity=".85"');
    [0.25, 0.75].forEach(function (q) {
      s += line(x0 + rw * q, sunkenTop, x0 + rw * q, H, C.white, 2.2, 'stroke-dasharray="15 14" opacity=".7"');
    });
    /* 위로 지나는 덱 */
    s += rect(-2, deckY, W + 4, deckH, '#8E9BAB');
    s += rect(-2, deckY + deckH * 0.24, W + 4, deckH * 0.52, '#6E7A8A');
    s += line(0, deckY + deckH * 0.24, W, deckY + deckH * 0.24, C.white, 2.2);
    s += line(0, deckY + deckH * 0.76, W, deckY + deckH * 0.76, C.white, 2.2);
    s += line(0, deckY + deckH * 0.5, W, deckY + deckH * 0.5, C.white, 2, 'stroke-dasharray="14 13" opacity=".75"');
    /* 덱 아래 그늘 */
    s += rect(x0, deckY + deckH, rw, 8, '#2E3540');
    s += rect(x0 - wallW, deckY + deckH, wallW, 8, C.wallD) + rect(x1, deckY + deckH, wallW, 8, C.wallD);
    return s;
  }

  function overpass(W, H) {
    var s = rect(0, 0, W, H, C.ground);
    var cy = H * 0.74, gh = Math.min(H * 0.17, W * 0.21);
    s += rect(0, cy - gh / 2, W, gh, '#6B7280');
    s += line(0, cy - gh / 2 + 2.2, W, cy - gh / 2 + 2.2, C.white, 2.2) + line(0, cy + gh / 2 - 2.2, W, cy + gh / 2 - 2.2, C.white, 2.2);
    s += line(0, cy - 2.2, W, cy - 2.2, C.yel, 2) + line(0, cy + 2.2, W, cy + 2.2, C.yel, 2);
    s += urbanBlock(6, 6, W * 0.10, cy - gh / 2 - 14, 71);
    s += urbanBlock(W * 0.66, 6, W * 0.32, cy - gh / 2 - 14, 72);
    s += urbanBlock(6, cy + gh / 2 + 12, W * 0.40, H - cy - gh / 2 - 18, 73);
    s += urbanBlock(W * 0.62, cy + gh / 2 + 12, W * 0.36, H - cy - gh / 2 - 18, 74);
    var hw = W * 0.255, cx = W * 0.5;
    s += rect(cx - hw + 10, 0, hw * 2, H, 'rgba(15,23,42,.14)');
    s += rect(cx - hw - 6, 0, hw * 2 + 12, H, '#C7D0DB');
    s += rect(cx - hw, 0, hw * 2, H, C.asp);
    s += line(cx - hw + 2.6, 0, cx - hw + 2.6, H, C.white, 2.6) + line(cx + hw - 2.6, 0, cx + hw - 2.6, H, C.white, 2.6);
    s += line(cx - 2.5, 0, cx - 2.5, H, C.yel, 2.2) + line(cx + 2.5, 0, cx + 2.5, H, C.yel, 2.2);
    return s;
  }

  function bridge(W, H) {
    var s = rect(0, 0, W, H, C.water);
    for (var yy = H * 0.18; yy < H * 0.86; yy += H * 0.09) {
      s += line(W * 0.03, yy, W * 0.26, yy, '#BBD6EC', 2.2) + line(W * 0.74, yy, W * 0.97, yy, '#BBD6EC', 2.2);
    }
    s += rect(0, 0, W, H * 0.14, C.ground) + rect(0, H * 0.86, W, H * 0.14, C.ground);
    var hw = W * 0.24, cx = W * 0.5;
    s += rect(cx - hw - 8, 0, hw * 2 + 16, H, '#C8D2DE');
    s += rect(cx - hw - 8, 0, 4, H, '#AFBCCB') + rect(cx + hw + 4, 0, 4, H, '#AFBCCB');
    s += rect(cx - hw, 0, hw * 2, H, C.asp);
    s += line(cx - hw + 3, 0, cx - hw + 3, H, C.white, 2.6) + line(cx + hw - 3, 0, cx + hw - 3, H, C.white, 2.6);
    s += line(cx - 2.5, 0, cx - 2.5, H, C.yel, 2.2) + line(cx + 2.5, 0, cx + 2.5, H, C.yel, 2.2);
    [0.30, 0.50, 0.70].forEach(function (fy) {
      s += rect(cx - hw - 13, H * fy, 13, H * 0.055, '#9FB0C2') + rect(cx + hw, H * fy, 13, H * 0.055, '#9FB0C2');
    });
    return s;
  }

  function tunnelRoad(W, H, lanes) {
    var hw = (lanes === 2 ? 0.24 : 0.30) * W;
    var cx = W * 0.5, x0 = cx - hw, x1 = cx + hw;
    var s = rect(0, 0, W, H, C.concrete);
    /* 터널 벽 — 단단한 면 + 상단 코핑 */
    s += rect(x0 - 18, 0, 18, H, C.wall);
    s += rect(x1, 0, 18, H, C.wall);
    s += line(x0 - 18, 0, x0 - 18, H, C.wallD, 2.4) + line(x1 + 18, 0, x1 + 18, H, C.wallD, 2.4);
    s += rect(x0, 0, x1 - x0, H, '#2A323E');
    s += line(x0 + 4, 0, x0 + 4, H, C.white, 2.6) + line(x1 - 4, 0, x1 - 4, H, C.white, 2.6);
    if (lanes === 4) {
      var lw = (x1 - x0) / 4;
      s += line(x0 + lw, 0, x0 + lw, H, C.white, 2.2, 'stroke-dasharray="16 14"');
      s += line(x0 + lw * 3, 0, x0 + lw * 3, H, C.white, 2.2, 'stroke-dasharray="16 14"');
      s += line(cx - 2.4, 0, cx - 2.4, H, C.yel, 2.4) + line(cx + 2.4, 0, cx + 2.4, H, C.yel, 2.4);
    } else {
      s += line(cx, 0, cx, H, C.white, 2.2, 'stroke-dasharray="16 14"');
    }
    /* 벽면 유도등 */
    for (var y = 30; y < H; y += 66) {
      s += rect(x0 - 12, y, 6, 16, '#F59E0B', 'rx="2"') + rect(x1 + 6, y, 6, 16, '#F59E0B', 'rx="2"');
    }
    /* 입구 포털 */
    s += rect(0, 0, W, 16, C.wallD);
    s += '<path d="M' + f(x0 - 20) + ' 26 Q' + f(cx) + ' 2 ' + f(x1 + 20) + ' 26" fill="none" stroke="' + C.wallD + '" stroke-width="5" stroke-linecap="round"/>';
    s += rect(0, H - 16, W, 16, C.wallD);
    s += '<path d="M' + f(x0 - 20) + ' ' + f(H - 26) + ' Q' + f(cx) + ' ' + f(H - 2) + ' ' + f(x1 + 20) + ' ' + f(H - 26) + '" fill="none" stroke="' + C.wallD + '" stroke-width="5" stroke-linecap="round"/>';
    return s;
  }

  function icRamp(W, H) {
    var hw = W * 0.235, cx = W * 0.40, rw = W * 0.115;
    var s = rect(0, 0, W, H, C.ground);
    var d = 'M' + f(cx + hw - 24) + ' ' + f(H * 0.15) +
      'C' + f(cx + hw + W * 0.16) + ' ' + f(H * 0.26) + ' ' + f(W * 0.86) + ' ' + f(H * 0.38) + ' ' + f(W * 0.93) + ' ' + f(H * 0.74);
    s += '<path d="' + d + '" fill="none" stroke="' + C.walk + '" stroke-width="' + f(rw + 18) + '" stroke-linecap="butt"/>';
    s += '<path d="' + d + '" fill="none" stroke="' + C.white + '" stroke-width="' + f(rw) + '" stroke-linecap="butt"/>';
    s += '<path d="' + d + '" fill="none" stroke="' + C.asp + '" stroke-width="' + f(rw - 8) + '" stroke-linecap="butt"/>';
    s += '<path d="' + d + '" fill="none" stroke="' + C.white + '" stroke-width="2.2" stroke-dasharray="14 13"/>';
    s += rect(cx - hw - 18, 0, 18, H, C.walk) + rect(cx + hw, 0, 18, H, C.walk);
    s += rect(cx - hw, 0, hw * 2, H, C.asp);
    s += line(cx - hw + 3.4, 0, cx - hw + 3.4, H, C.white, 2.6) + line(cx + hw - 3.4, 0, cx + hw - 3.4, H, C.white, 2.6);
    [-1, 1].forEach(function (sd) {
      s += line(cx + sd * hw / 2, 0, cx + sd * hw / 2, H, C.white, 2.2, 'stroke-dasharray="18 16"');
      s += line(cx + sd * (hw - 6), 0, cx + sd * (hw - 6), H, C.white, 2.4);
    });
    return s;
  }

  function tollgate(W, H) {
    var cx = W * 0.5, s = rect(0, 0, W, H, C.ground);
    var nw = W * 0.21, pw = W * 0.40, y0 = H * 0.30, y1 = H * 0.64, sp = H * 0.07;
    s += rect(cx - nw, 0, nw * 2, y0 + 2, C.asp);
    s += '<path d="M' + f(cx - nw) + ' 0L' + f(cx + nw) + ' 0L' + f(cx + pw) + ' ' + f(y0 + sp) + 'L' + f(cx - pw) + ' ' + f(y0 + sp) + 'Z" fill="' + C.asp + '"/>';
    s += rect(cx - pw, y0 + sp, pw * 2, y1 - y0 - sp, C.asp);
    s += '<path d="M' + f(cx - pw) + ' ' + f(y1) + 'L' + f(cx + pw) + ' ' + f(y1) + 'L' + f(cx + nw) + ' ' + f(y1 + sp) + 'L' + f(cx - nw) + ' ' + f(y1 + sp) + 'Z" fill="' + C.asp + '"/>';
    s += rect(cx - nw, y1 + sp, nw * 2, H - y1 - sp, C.asp);
    [0, 1].forEach(function (k) {
      var yy0 = k ? y1 + sp : 0, yy1 = k ? H : y0;
      s += line(cx - nw + 3, yy0, cx - nw + 3, yy1, C.white, 2.6) + line(cx + nw - 3, yy0, cx + nw - 3, yy1, C.white, 2.6);
      s += line(cx, yy0, cx, yy1, C.white, 2.2, 'stroke-dasharray="16 14"');
    });
    var lanes = 5, isl = (pw * 2) / lanes * 0.30;
    for (var i = 1; i < lanes; i++) {
      var xa = cx - pw + (pw * 2) * i / lanes;
      s += line(xa, y0 + sp + 5, xa, y1 - 5, C.white, 2.2, 'stroke-dasharray="12 11" opacity=".9"');
    }
    for (var j = 0; j < lanes - 1; j++) {
      var xb = cx - pw + (pw * 2) * (j + 1) / lanes;
      s += rect(xb - isl / 2, y0 + sp + (y1 - y0 - sp) * 0.14, isl, (y1 - y0 - sp) * 0.66, '#E6EBF2', 'stroke="#AEB9C7" stroke-width="1.2" rx="2"');
      s += rect(xb - isl / 2, y0 + sp + (y1 - y0 - sp) * 0.22, isl, (y1 - y0 - sp) * 0.14, '#F59E0B', 'rx="1.5"');
    }
    return s;
  }

  function railCross(W, H) {
    var g = laneRoad(W, H, { lanes: 2, hw: 0.22, arrows: false });
    var s = g.svg, x0 = g.x0, x1 = g.x1;
    var y0 = H * 0.40, bh = H * 0.14;
    s += rect(0, y0, W, bh, '#4B4553');
    var step = Math.max(11, W * 0.032);
    for (var x = 5; x < W; x += step) s += rect(x, y0 + 4, Math.max(4, W * 0.010), bh - 8, '#6B6472');
    s += line(0, y0 + bh * 0.32, W, y0 + bh * 0.32, '#D9E0EA', 4.5);
    s += line(0, y0 + bh * 0.68, W, y0 + bh * 0.68, '#D9E0EA', 4.5);
    s += rect(x0, y0 - 6, x1 - x0, 3, '#E2564E') + rect(x0, y0 + bh + 3, x1 - x0, 3, '#E2564E');
    s += rect(x0, y0 - 16, x1 - x0, 6, C.white);
    return s;
  }

  /* ───────────────────────── 목록 ───────────────────────── */
  var LIST = [
    { id: 'blank', label: '격자(빈 화면)', g: 1, tags: '격자 그리드 도면 빈빠지 빈화면 초기화' },

    /* ── 일반 ── */
    { id: 'lane2', label: '일반(2차로)', g: 1, tags: '2차로 세로 2차선 양방향 편도' },
    { id: 'lane3', label: '일반(3차로)', g: 1, tags: '3차로 세로 3차선 일방통행' },
    { id: 'lane4', label: '일반(4차로)', g: 1, tags: '4차로 세로 4차선 왕복' },
    { id: 'lane6', label: '일반(6차로)', g: 1, tags: '6차로 6차선 대로 대형로' },
    { id: 'lane8', label: '일반(8차로)', g: 1, tags: '8차로 8차선 대로' },
    { id: 'lane2H', label: '가로(2차로)', g: 1, tags: '가로 2차로 수평 좌우 왕복 이면도로' },
    { id: 'lane4H', label: '가로(4차로)', g: 1, tags: '가로 4차로 수평 좌우 왕복 대로' },
    { id: 'busCenter', label: '중앙버스전용(6차로)', g: 1, tags: '버스전용 버스 중앙버스 중앙차로 버스정류장 6차로 노선버스' },
    { id: 'busSide', label: '가로변버스전용(4차로)', g: 1, tags: '버스전용 가로변 버스차로 버스 4차로' },
    { id: 'uturnRoad', label: '유턴구역(4차로)', g: 1, tags: '유턴 유턴구역 유턴차로 회차 4차로' },
    { id: 'bikeLane', label: '자전거겸용도로', g: 1, tags: '자전거 자전거도로 바이크 차도 공유 자전거차로' },
    { id: 'schoolZone', label: '어린이보호구역(스쿨존)', g: 1, tags: '스쿨존 어린이보호구역 어린이 학교 등하교 30 과속' },
    { id: 'speedBump', label: '방지턱·과속방지', g: 1, tags: '방지턱 과속방지턱 과속 방지팍 속도 줄임턱 과속방지' },
    { id: 'oneway', label: '일방통행', g: 1, tags: '일방통행 한쪽통행 편도 화살표' },
    { id: 'living', label: '생활도로', g: 1, tags: '생활도로 주택가 이면도로 소통 보행자우선' },
    { id: 'safety', label: '안전지대', g: 1, tags: '안전지대 안전섬 보행섬' },
    { id: 'reduce', label: '우측차로감소', g: 1, tags: '차로감소 차선감소 합류 우측감소' },
    { id: 'cross4', label: '횡단보도(4차로)', g: 1, tags: '횡단보도 건널목 4차로 보행자' },

    /* ── 골목·주정차·주차장 ── */
    { id: 'alley', label: '골목길·이면도로(직선)', g: 2, tags: '골목 골목길 이면도로 좁은길 주택가 진입로' },
    { id: 'alleyCross', label: '골목길 교차로', g: 2, tags: '골목 교차로 이면도로 사거리 좁은 교차' },
    { id: 'aptRoad', label: '아파트 단지내 도로', g: 2, tags: '아파트 단지 단지내 주택가 주차장 입구 공동주택' },
    { id: 'parkOk1', label: '주정차가능1', g: 2, tags: '주정차 주차 가능 정차 파란선 한쪽' },
    { id: 'parkOk2', label: '주정차가능2', g: 2, tags: '주정차 주차 가능 정차 파란선 양쪽' },
    { id: 'parkNo1', label: '주정차금지', g: 2, tags: '주정차 금지 황색선 노란선 정차금지' },
    { id: 'lot1', label: '주차장', g: 2, tags: '주차장 야외 주차면 출차 통로' },
    { id: 'lot2', label: '주차장(실내)', g: 2, tags: '주차장 실내 지하주차장 지하 주차벽' },
    { id: 'lotAngle', label: '사선(빗각) 주차장', g: 2, tags: '사선주차 빗각주차 대각선 주차장 주차면' },
    { id: 'shoulder', label: '갓길주차', g: 2, tags: '갓길 갓길주차 정차 주정차' },

    /* ── 교차로·회전·다지 ── */
    { id: 'xj4', label: '+교차로(4차로)', g: 3, tags: '사거리 교차로 십자 4차로 신호 신호등' },
    { id: 'xj6', label: '+교차로(6차로)', g: 3, tags: '사거리 교차로 십자 6차로 대횡단로' },
    { id: 'xj2', label: '+교차로(2차로)', g: 3, tags: '사거리 교차로 십자 2차로 좁은' },
    { id: 'xjPocket', label: '좌회전 포켓차로 교차로', g: 3, tags: '좌회전 포켓 포켓차로 교차로 사거리 비보호' },
    { id: 'xjScramble', label: '대각선 횡단보도(스크램블)', g: 3, tags: '대각선 횡단보도 스크램블 사거리 엇갈림' },
    { id: 'teeUp', label: 'ㅗ자형 교차로', g: 3, tags: '삼거리 ㅗ자 T자 교차로 세로' },
    { id: 'teeDown', label: 'T자형 교차로', g: 3, tags: '삼거리 T자 교차로' },
    { id: 'teeRight', label: 'ㅏ자형 교차로', g: 3, tags: '삼거리 ㅏ자 교차로 가로' },
    { id: 'teeLeft', label: 'ㅓ자형 교차로', g: 3, tags: '삼거리 ㅓ자 교차로 가로' },
    { id: 'yRoad', label: 'Y자형 삼거리', g: 3, tags: '삼거리 Y자 갈림 분기 교차로' },
    { id: 'fiveWay', label: '오거리 교차로', g: 3, tags: '오거리 다지 교차로 다섯갈래 오거리형' },
    { id: 'roundS', label: '회전교차로(소)', g: 3, tags: '회전교차로 로터리 라운드 소' },
    { id: 'roundL', label: '회전교차로(대)', g: 3, tags: '회전교차로 로터리 라운드 대' },

    /* ── 곡선·입체·고속·특수 ── */
    { id: 'curveL', label: '곡선로(좌)', g: 4, tags: '곡선 커브 코너 좌회전 굽은길' },
    { id: 'curveR', label: '곡선로(우)', g: 4, tags: '곡선 커브 코너 우회전 굽은길' },
    { id: 'sCurve', label: 'S자 급커브', g: 4, tags: 's자 에스자 급커브 굽은길 산길 구비' },
    { id: 'merge', label: '합류로', g: 4, tags: '합류 오른쪽합류 진입 램프' },
    { id: 'split', label: '분할로', g: 4, tags: '분할 분기 길어짐' },
    { id: 'merge4', label: '우합류(4차로)', g: 4, tags: '합류 우합류 4차로 진입가속' },
    { id: 'mergeL', label: '좌합류(4차로)', g: 4, tags: '합류 좌합류 4차로 진입좌측' },
    { id: 'hw1', label: '고속도로 4차로', g: 4, tags: '고속도로 전용도로 자동차전용 지방도 4차로' },
    { id: 'hw2', label: '고속도로 6차로(중앙분리대)', g: 4, tags: '고속도로 전용도로 자동차전용 중앙분리대 6차로' },
    { id: 'underpass', label: '지하차도', g: 4, tags: '지하차도 지하 지하차로 터널 지하도' },
    { id: 'overpass', label: '고가도로', g: 4, tags: '고가 고가도로 입체 교량 위 램프' },
    { id: 'bridge', label: '교량(다리)', g: 4, tags: '교량 다리 브리지 강 물 하천' },
    { id: 'tunnel2', label: '터널(2차로)', g: 4, tags: '터널 2차로 지하 갱' },
    { id: 'tunnel4', label: '터널(4차로)', g: 4, tags: '터널 4차로 지하 갱' },
    { id: 'icRamp', label: 'IC·JC 진출입 램프', g: 4, tags: 'ic jc 램프 진출 진입 진출입 분기 고속도로 인터체인지' },
    { id: 'tollgate', label: '고속도로 톨게이트', g: 4, tags: '톨게이트 톨비 톨비소 요금소 영업소 고속도로' },
    { id: 'railCross', label: '철길 건널목', g: 4, tags: '철길 철도 선로 건널목 기차 차단기' }
  ];

  var GROUP_LABEL = { 1: '일반·전용·보호 도로', 2: '골목·주정차·주차장', 3: '교차로·회전·다지', 4: '곡선·입체·고속·특수' };

  function build(id, W, H) {
    W = W || 400; H = H || 600;
    switch (id) {
      case 'blank': return rect(0, 0, W, H, '#F4F7FB');
      case 'lane2': return laneRoad(W, H, { lanes: 2, hw: 0.19 }).svg;
      case 'lane2H': return laneRoadH(W, H, { lanes: 2, hw: 0.19 });
      case 'lane4H': return laneRoadH(W, H, { lanes: 4, hw: 0.25 });
      case 'busCenter': return busCenter(W, H);
      case 'busSide': return busSide(W, H);
      case 'uturnRoad': return uturnRoad(W, H);
      case 'bikeLane': return bikeLane(W, H);
      case 'schoolZone': return schoolZone(W, H);
      case 'speedBump': return speedBump(W, H);
      case 'alley': return alley(W, H);
      case 'alleyCross': return alleyCross(W, H);
      case 'aptRoad': return aptRoad(W, H);
      case 'xjPocket': return xjPocket(W, H);
      case 'xjScramble': return xjScramble(W, H);
      case 'yRoad': return yRoad(W, H);
      case 'fiveWay': return fiveWay(W, H);
      case 'underpass': return underpass(W, H);
      case 'overpass': return overpass(W, H);
      case 'bridge': return bridge(W, H);
      case 'mergeL': return mergeRoad(W, H, 'merge', 'left');
      case 'icRamp': return icRamp(W, H);
      case 'sCurve': return sCurve(W, H);
      case 'tollgate': return tollgate(W, H);
      case 'railCross': return railCross(W, H);
      case 'lotAngle': return lotAngle(W, H);
      case 'lane3': return laneRoad(W, H, { lanes: 3, hw: 0.23, twoWay: false }).svg;
      case 'lane4': return laneRoad(W, H, { lanes: 4, hw: 0.25 }).svg;
      case 'lane6': return laneRoad(W, H, { lanes: 6, hw: 0.29 }).svg;
      case 'lane8': return laneRoad(W, H, { lanes: 8, hw: 0.34 }).svg;
      case 'cross4': {
        var b = laneRoad(W, H, { lanes: 4, hw: 0.25 });
        var cwD = Math.max(13, (b.x1 - b.x0) * 0.10);
        return b.svg + cwBand(b.x0, b.x1, H * 0.52, cwD) + stopBar(b.cx + 2, H * 0.52 + cwD + 8, (b.x1 - b.x0) / 2 - 4);
      }
      case 'tunnel2': return tunnelRoad(W, H, 2);
      case 'tunnel4': return tunnelRoad(W, H, 4);
      case 'merge4': return mergeRoad(W, H, 'merge');
      case 'safety': return safetyZone(W, H);
      case 'reduce': return laneReduce(W, H);
      case 'oneway': return oneway(W, H);
      case 'living': return livingRoad(W, H);
      case 'parkOk1': return laneRoad(W, H, { lanes: 4, hw: 0.25, curbLine: 'blueL' }).svg;
      case 'parkOk2': return laneRoad(W, H, { lanes: 4, hw: 0.25, curbLine: 'blue' }).svg;
      case 'parkNo1': return laneRoad(W, H, { lanes: 4, hw: 0.25, curbLine: 'yellow' }).svg;
      case 'lot1': return parkingLot(W, H, 1);
      case 'lot2': return parkingLot(W, H, 2);
      case 'shoulder': return shoulderParking(W, H);
      case 'xj4': return crossRoad(W, H, { lanes: 4, hw: 0.22 }).svg;
      case 'xj6': return crossRoad(W, H, { lanes: 6, hw: 0.26 }).svg;
      case 'xj2': return crossRoad(W, H, { lanes: 2, hw: 0.16 }).svg;
      case 'teeUp': return teeRoad(W, H, 'up');
      case 'teeDown': return teeRoad(W, H, 'down');
      case 'teeRight': return teeRoad(W, H, 'right');
      case 'teeLeft': return teeRoad(W, H, 'left');
      case 'roundS': return roundabout(W, H, false);
      case 'roundL': return roundabout(W, H, true);
      case 'curveL': return curveRoad(W, H, 'left');
      case 'curveR': return curveRoad(W, H, 'right');
      case 'merge': return mergeRoad(W, H, 'merge');
      case 'split': return mergeRoad(W, H, 'split');
      case 'hw1': return highway(W, H, 1);
      case 'hw2': return highway(W, H, 2);
      default: return laneRoad(W, H, { lanes: 4, hw: 0.25 }).svg;
    }
  }

  function thumb(id) {
    return '<svg viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">' + build(id, 180, 180) + '</svg>';
  }

  /* ══════════ 프리셋 배치 좌표 (도로 함수와 100% 동일한 식) ══════════ */
  var CARB = { sedan: [27, 45], suv: [29, 48.4], truck: [32, 53.4], minibus: [31, 51.7], bus: [33, 55] };

  function corner(cx, cy, rot, lx, ly) {
    var a = rot * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a);
    return { x: cx + lx * c - ly * sn, y: cy + lx * sn + ly * c };
  }

  function gLane4(W, H) {
    var hw = 0.25 * W, cx = 0.5 * W, x0 = cx - hw, x1 = cx + hw, lw = (x1 - x0) / 4;
    var at = function (i) { return x0 + lw * (i + 0.5); };
    return { x0: x0, x1: x1, cx: cx, lw: lw, edge: x0 + lw * 3, up: [at(2), at(3)], down: [at(0), at(1)] };
  }
  function gCross(W, H) {
    var hw = 0.22 * Math.min(W, H), cx = W / 2, cy = H / 2, lw = hw / 2;
    var vx = function (i) { return cx - hw + lw * (i + 0.5); };
    var vy = function (i) { return cy - hw + lw * (i + 0.5); };
    return {
      cx: cx, cy: cy, hw: hw, lw: lw,
      up: [vx(2), vx(3)], down: [vx(0), vx(1)], east: [vy(2), vy(3)], west: [vy(0), vy(1)]
    };
  }
  function gTee(W, H) {
    var hw = Math.min(W, H) * 0.19, cx = W / 2, hy = H * 0.68;
    return {
      cx: cx, hy: hy, hw: hw, y0: hy - hw, y1: hy + hw, x0: cx - hw, x1: cx + hw,
      stemUp: cx + hw / 2, stemDown: cx - hw / 2, barWest: hy - hw / 2, barEast: hy + hw / 2
    };
  }
  function gMerge(W, H) {
    var mainW = 0.42 * W, cx = 0.5 * W;
    var P0 = { x: 0.98 * W, y: 0.92 * H }, Cc = { x: 0.8 * W, y: 0.7 * H }, P1 = { x: cx + mainW / 2 - 6, y: 0.44 * H };
    var at = function (t) {
      var u = 1 - t;
      return { x: u * u * P0.x + 2 * u * t * Cc.x + t * t * P1.x, y: u * u * P0.y + 2 * u * t * Cc.y + t * t * P1.y };
    };
    var info = function (t) {
      var a = at(Math.max(0, t - 0.03)), b = at(Math.min(1, t + 0.03));
      var rot = Math.atan2(b.x - a.x, -(b.y - a.y)) * 180 / Math.PI;
      var p = at(t);
      return { x: p.x, y: p.y, rot: ((rot % 360) + 360) % 360 };
    };
    return { cx: cx, mainW: mainW, up: cx + mainW / 4, down: cx - mainW / 4, ramp: at, rampInfo: info };
  }
  function gLot(W, H) {
    var n = 5, bw = W / n, top = H * 0.07, bd = H * 0.24;
    return { n: n, bw: bw, top: top, aisle0: top + bd, aisle1: H - top - bd, bayX: function (i) { return (i + 0.5) * bw; } };
  }

  var PRESETS = [
    {
      id: 'p252', no: '252', label: '차로변경(진로변경)', bg: 'lane4', tags: '차로변경 진로변경 차선변경 급차로변경 접촉 후면',
      summary: '자차 편도 2차로 주행 중, 대차1이 좌측 차로에서 진로를 변경하며 자차 좌측 후면을 충격',
      layout: function (W, H) {
        var g = gLane4(W, H), sx = g.up[1], sy = H * 0.30;
        var c1y = sy + 88;
        return {
          cars: [
            { kind: 'sedan', role: 'self', x: sx, y: sy, rot: 0 },
            { kind: 'suv', role: 'c1', x: g.up[0], y: c1y, rot: 10 }
          ],
          arrows: [
            { color: '#E9413B', pts: [[sx, sy + 45 + 100], [sx, sy + 45 + 16]] },
            { color: '#F2A93B', pts: [[g.up[0], Math.min(H - 8, c1y + 48.4 + 96)], [g.up[0], c1y + 48.4 + 40], [g.up[0] + 13, c1y + 48.4 + 14]] }
          ],
          impact: { x: sx - 20, y: sy + 46 }
        };
      }
    },
    {
      id: 'p253', no: '253', label: '추돌 (양차량 주행중)', bg: 'lane4', tags: '추돌 후미추돌 정체 감속',
      summary: '자차 주행 중 전방 정체로 감속, 뒤따르던 대차1이 자차 후면을 추돌',
      layout: function (W, H) {
        var g = gLane4(W, H), sx = g.up[1], sy = H * 0.34;
        var c1y = sy + 45 + 53.4 + 1;
        return {
          cars: [
            { kind: 'sedan', role: 'self', x: sx, y: sy, rot: 0 },
            { kind: 'truck', role: 'c1', x: sx, y: c1y, rot: 0 }
          ],
          arrows: [
            { color: '#E9413B', pts: [[sx, sy - 50], [sx, sy - 96]] },
            { color: '#F2A93B', pts: [[sx, Math.min(H - 10, c1y + 53.4 + 96)], [sx, c1y + 53.4 + 30]] }
          ],
          impact: { x: sx, y: sy + 47 }
        };
      }
    },
    {
      id: 'p255', no: '255', label: '추돌 (주·정차중)', bg: 'lane4', tags: '추돌 주정차 정차 후미추돌',
      summary: '자차 정차 중, 후방에서 진행하던 대차1이 정지 상태의 자차를 추돌',
      layout: function (W, H) {
        var g = gLane4(W, H), sx = g.up[1] + W * 0.018, sy = H * 0.28;
        var c1y = sy + 45 + 48.4 + 2;
        return {
          cars: [
            { kind: 'sedan', role: 'self', x: sx, y: sy, rot: 0 },
            { kind: 'suv', role: 'c1', x: sx, y: c1y, rot: 0 }
          ],
          arrows: [
            { color: '#F2A93B', pts: [[sx, Math.min(H - 10, c1y + 48.4 + 96)], [sx, c1y + 48.4 + 30]] }
          ],
          impact: { x: sx, y: sy + 47 }
        };
      }
    },
    {
      id: 'p205', no: '205', label: '신호없는 교차로', bg: 'xj4', tags: '사거리 교차로 신호없는 비보호 측면충돌',
      summary: '신호기 없는 교차로에서 자차가 직진 중, 우측(동쪽)에서 진입한 대차1과 충돌',
      layout: function (W, H) {
        var g = gCross(W, H);
        var sx = g.up[0], c1y = g.west[1];
        var sy = c1y + 45;
        var c1x = sx + 27 + 2 + 48.4;
        return {
          cars: [
            { kind: 'sedan', role: 'self', x: sx, y: sy, rot: 0 },
            { kind: 'suv', role: 'c1', x: c1x, y: c1y, rot: 270 }
          ],
          arrows: [
            { color: '#E9413B', pts: [[sx, Math.min(H - 12, sy + 61 + 70)], [sx, sy + 61]] },
            { color: '#F2A93B', pts: [[Math.min(W - 8, c1x + 48.4 + 30), c1y], [c1x + 48.4 + 14, c1y]] }
          ],
          impact: { x: sx + 28, y: c1y + 2 }
        };
      }
    },
    {
      id: 'p242', no: '242', label: '차도 아닌 곳에서 진입', bg: 'merge', tags: '진입 주유소 주차장 출구 합류 본선',
      summary: '자차가 차도 외 장소(주유소·주차장 출구)에서 본선으로 진입하던 중, 본선을 주행하던 대차1과 충돌',
      layout: function (W, H) {
        var g = gMerge(W, H);
        var ri = g.rampInfo(0.55);
        var fl = corner(ri.x, ri.y, ri.rot, -27, -45);
        var c1x = fl.x - 29, c1y = fl.y + 48.4 - 12;
        var a = g.ramp(0.10), b = g.ramp(0.24), c = g.ramp(0.38);
        return {
          cars: [
            { kind: 'sedan', role: 'self', x: ri.x, y: ri.y, rot: ri.rot },
            { kind: 'suv', role: 'c1', x: c1x, y: c1y, rot: 0 }
          ],
          arrows: [
            { color: '#E9413B', pts: [[a.x, a.y], [b.x, b.y], [c.x, c.y]] },
            { color: '#F2A93B', pts: [[c1x, Math.min(H * 0.94, c1y + 48.4 + 96)], [c1x, c1y + 48.4 + 16]] }
          ],
          impact: { x: fl.x, y: fl.y }
        };
      }
    },
    {
      id: 'p244', no: '244', label: '주차장 사고', bg: 'lot1', tags: '주차장 출차 통로 주차면',
      summary: '주차면에서 통로로 출차하던 자차와, 통로를 진행하던 대차1이 충돌',
      layout: function (W, H) {
        var g = gLot(W, H), bx = g.bayX(1), sy = g.aisle0 - 13;
        var c1x = bx + 27 + 29, c1y = sy + 45 + 48.4;
        return {
          cars: [
            { kind: 'sedan', role: 'self', x: bx, y: sy, rot: 180 },
            { kind: 'suv', role: 'c1', x: c1x, y: c1y, rot: 0 }
          ],
          arrows: [
            { color: '#E9413B', pts: [[bx, g.top + 18], [bx, sy - 59]] },
            { color: '#F2A93B', pts: [[c1x, Math.min(H * 0.95, c1y + 48.4 + 76)], [c1x, c1y + 48.4 + 14]] }
          ],
          impact: { x: bx + 27, y: sy + 45 }
        };
      }
    },
    {
      id: 'p240', no: '240', label: '삼거리 직진 대 회전', bg: 'teeDown', tags: '삼거리 회전 우회전 T자',
      summary: 'T자형 삼거리에서 가로도로를 직진하던 자차 앞으로, 위쪽 도로에서 우회전해 나오던 대차1이 진입해 충돌',
      layout: function (W, H) {
        var g = gTee(W, H);
        var sx = g.cx + g.hw * 0.9, sy = g.barWest;
        var c1x = sx - 45 - 48.4 - 4;
        return {
          cars: [
            { kind: 'sedan', role: 'self', x: sx, y: sy, rot: 270 },
            { kind: 'suv', role: 'c1', x: c1x, y: sy, rot: 270 }
          ],
          arrows: [
            { color: '#E9413B', pts: [[Math.min(W - 12, sx + 45 + 66), sy], [sx + 45 + 16, sy]] },
            { color: '#F2A93B', pts: [[g.stemDown, Math.max(12, g.y0 - 130)], [g.stemDown, g.y0 - 44], [c1x + 18, sy - 40]] }
          ],
          impact: { x: sx - 46, y: sy - 26 }
        };
      }
    }
  ];

  function presetGeo(pr, W, H) {
    if (!pr || typeof pr.layout !== 'function') return null;
    try { return pr.layout(W || 390, H || 640); } catch (e) { return null; }
  }

  AS.roads = { LIST: LIST, GROUP_LABEL: GROUP_LABEL, PRESETS: PRESETS, build: build, thumb: thumb, presetGeo: presetGeo };
})(window.AS);
