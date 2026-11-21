/* ==========================================================================
   roads.js — 전체화면 도로 배경 템플릿 (35종) + 과실도표 불러오기 (7종)
   모두 (W, H) 전체 캔버스 크기에 꽉 차게 생성한다.
   ========================================================================== */
window.AS = window.AS || {};
(function (AS) {
  'use strict';
  var f = function (n) { return Math.round(n * 10) / 10; };

  var C = {
    ground: '#E4EAE0', walk: '#EFF2F5', asp: '#4B5563', asp2: '#374151',
    white: '#FFFFFF', yel: '#FBBF24', blue: '#38BDF8', block: '#E8ECF1',
    blockS: '#D6DEE7', tree: '#C4DCB8', treeS: '#AECFA0', build: '#F5F8FB', buildS: '#DCE4ED'
  };

  var rect = function (x, y, w, h, fill, extra) {
    return '<rect x="' + f(x) + '" y="' + f(y) + '" width="' + f(w) + '" height="' + f(h) + '" fill="' + fill + '"' + (extra ? ' ' + extra : '') + '/>';
  };
  var line = function (x1, y1, x2, y2, col, w, extra) {
    return '<line x1="' + f(x1) + '" y1="' + f(y1) + '" x2="' + f(x2) + '" y2="' + f(y2) + '" stroke="' + col + '" stroke-width="' + f(w) + '"' + (extra ? ' ' + extra : '') + '/>';
  };

  function urbanBlock(x, y, w, h, seed) {
    if (w < 18 || h < 18) return '';
    var s = rect(x, y, w, h, C.block, 'stroke="' + C.blockS + '" stroke-width="1"');
    var cols = Math.max(1, Math.round(w / 110)), rows = Math.max(1, Math.round(h / 110));
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
          s += rect(Math.min(bx, x + (i + 1) * cw - bw - 5), Math.min(by, y + (j + 1) * ch - bh - 5),
            bw, bh, C.build, 'stroke="' + C.buildS + '" stroke-width="1" rx="2"');
        }
      }
    }
    return s;
  }

  function groundStrip(W, H, x0, x1, side) {
    var s = '';
    var bandW = Math.max(14, W * 0.048);
    if (side === 'left' && x0 > 20) {
      s += rect(x0 - bandW, 0, bandW, H, C.walk);
      var y = 0, i = 0;
      while (y < H) {
        var h = H * (0.16 + ((i * 37) % 18) / 100);
        s += urbanBlock(4, y + 6, x0 - bandW - 10, h - 12, i + 1);
        y += h; i++;
      }
    }
    if (side === 'right' && W - x1 > 20) {
      s += rect(x1, 0, bandW, H, C.walk);
      var y2 = 0, i2 = 0;
      while (y2 < H) {
        var h2 = H * (0.16 + ((i2 * 41) % 18) / 100);
        s += urbanBlock(x1 + bandW + 6, y2 + 6, W - x1 - bandW - 10, h2 - 12, i2 + 3);
        y2 += h2; i2++;
      }
    }
    return s;
  }

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
    s += line(x0 + 2.4, 0, x0 + 2.4, H, C.white, 2.4);
    s += line(x1 - 2.4, 0, x1 - 2.4, H, C.white, 2.4);
    for (var i = 1; i < n; i++) {
      var x = x0 + laneW * i;
      if (twoWay && Math.abs(i - n / 2) < 0.01) continue;
      s += line(x, 0, x, H, C.white, 2.2, 'stroke-dasharray="16 15"');
    }
    if (twoWay) {
      s += line(cx - 2.6, 0, cx - 2.6, H, C.yel, 2.4);
      s += line(cx + 2.6, 0, cx + 2.6, H, C.yel, 2.4);
    }
    if (o.curbLine === 'blue') s += line(x0 + 6, 0, x0 + 6, H, C.blue, 4) + line(x1 - 6, 0, x1 - 6, H, C.blue, 4);
    else if (o.curbLine === 'yellow') s += line(x0 + 6, 0, x0 + 6, H, C.yel, 4) + line(x1 - 6, 0, x1 - 6, H, C.yel, 4);
    else if (o.curbLine === 'blueL') s += line(x0 + 6, 0, x0 + 6, H, C.blue, 4);
    return { svg: s, x0: x0, x1: x1, cx: cx, laneW: laneW, n: n };
  }

  function tunnelRoad(W, H, lanes) {
    var hw = (lanes === 2 ? 0.24 : 0.30) * W;
    var cx = W * 0.5, x0 = cx - hw, x1 = cx + hw;
    var s = rect(0, 0, W, H, '#CBD5E1');
    s += rect(x0 - 16, 0, 16, H, '#94A3B8') + rect(x1, 0, 16, H, '#94A3B8');
    s += rect(x0, 0, x1 - x0, H, '#27303F');
    s += line(x0 + 3, 0, x0 + 3, H, C.white, 2.4);
    s += line(x1 - 3, 0, x1 - 3, H, C.white, 2.4);
    if (lanes === 4) {
      var lw = (x1 - x0) / 4;
      s += line(x0 + lw, 0, x0 + lw, H, C.white, 2.2, 'stroke-dasharray="16 14"');
      s += line(x0 + lw * 3, 0, x0 + lw * 3, H, C.white, 2.2, 'stroke-dasharray="16 14"');
      s += line(cx - 2.4, 0, cx - 2.4, H, C.yel, 2.4) + line(cx + 2.4, 0, cx + 2.4, H, C.yel, 2.4);
    } else {
      s += line(cx, 0, cx, H, C.white, 2.2, 'stroke-dasharray="16 14"');
    }
    // 터널 벽 LED 유도등
    for (var y = 26; y < H; y += 64) {
      s += rect(x0 - 11, y, 7, 14, '#F59E0B', 'rx="2"') + rect(x1 + 4, y, 7, 14, '#F59E0B', 'rx="2"');
    }
    // 입출구 아치 표시
    s += '<path d="M' + f(x0 - 12) + ' 24 Q' + f(cx) + ' 4 ' + f(x1 + 12) + ' 24" fill="none" stroke="#475569" stroke-width="6" stroke-linecap="round"/>';
    s += '<path d="M' + f(x0 - 12) + ' ' + f(H - 24) + ' Q' + f(cx) + ' ' + f(H - 4) + ' ' + f(x1 + 12) + ' ' + f(H - 24) + '" fill="none" stroke="#475569" stroke-width="6" stroke-linecap="round"/>';
    return s;
  }

  function crosswalkBand(y, x0, x1) {
    var s = '', h = Math.max(14, (x1 - x0) * 0.115);
    for (var x = x0 + 5; x < x1 - 6; x += Math.max(9, (x1 - x0) / 12)) {
      s += rect(x, y, Math.max(5, (x1 - x0) / 26), h, C.white, 'opacity=".95"');
    }
    return s;
  }

  function crossRoad(W, H, o) {
    o = o || {};
    var hw = (o.hw != null ? o.hw : 0.22) * Math.min(W, H);
    var cx = W * 0.5, cy = H * 0.5;
    var x0 = cx - hw, x1 = cx + hw, y0 = cy - hw, y1 = cy + hw;
    var n = o.lanes || 4;
    var twoWay = o.twoWay !== false;
    var s = rect(0, 0, W, H, C.ground);
    s += rect(x0, 0, x1 - x0, H, C.asp);
    s += rect(0, y0, W, y1 - y0, C.asp);
    s += rect(x0 - 12, 0, 12, y0 - 10, C.walk) + rect(x0 - 12, y1 + 10, 12, H - y1 - 10, C.walk);
    s += rect(x1, 0, 12, y0 - 10, C.walk) + rect(x1, y1 + 10, 12, H - y1 - 10, C.walk);
    s += rect(0, y0 - 10, x0 - 12, 10, C.walk) + rect(x1 + 12, y0 - 10, W - x1 - 12, 10, C.walk);
    s += rect(0, y1, x0 - 12, 10, C.walk) + rect(x1 + 12, y1, W - x1 - 12, 10, C.walk);
    var gap = 46;
    s += urbanBlock(6, 6, x0 - gap, y0 - gap, 1);
    s += urbanBlock(x1 + gap, 6, W - x1 - gap - 6, y0 - gap, 2);
    s += urbanBlock(6, y1 + gap, x0 - gap, H - y1 - gap - 6, 3);
    s += urbanBlock(x1 + gap, y1 + gap, W - x1 - gap - 6, H - y1 - gap - 6, 4);
    var laneW = hw * 2 / n;
    for (var i = 1; i < n; i++) {
      var xx = x0 + laneW * i, yy = y0 + laneW * i;
      if (twoWay && Math.abs(i - n / 2) < 0.01) continue;
      s += line(xx, 0, xx, y0 - 24, C.white, 2.2, 'stroke-dasharray="15 14"');
      s += line(xx, y1 + 24, xx, H, C.white, 2.2, 'stroke-dasharray="15 14"');
      s += line(0, yy, x0 - 24, yy, C.white, 2.2, 'stroke-dasharray="15 14"');
      s += line(x1 + 24, yy, W, yy, C.white, 2.2, 'stroke-dasharray="15 14"');
    }
    if (twoWay) {
      s += line(cx - 2.4, 0, cx - 2.4, y0 - 24, C.yel, 2.4) + line(cx + 2.4, 0, cx + 2.4, y0 - 24, C.yel, 2.4);
      s += line(cx - 2.4, y1 + 24, cx - 2.4, H, C.yel, 2.4) + line(cx + 2.4, y1 + 24, cx + 2.4, H, C.yel, 2.4);
      s += line(0, cy - 2.4, x0 - 24, cy - 2.4, C.yel, 2.4) + line(0, cy + 2.4, x0 - 24, cy + 2.4, C.yel, 2.4);
      s += line(x1 + 24, cy - 2.4, W, cy - 2.4, C.yel, 2.4) + line(x1 + 24, cy + 2.4, W, cy + 2.4, C.yel, 2.4);
    }
    var cw = Math.max(12, (x1 - x0) * 0.1);
    s += crosswalkBand(y0 - cw - 6, x0, x1);
    s += crosswalkBand(y1 + 6, x0, x1);
    for (var y = y0 + 5; y < y1 - 5; y += Math.max(9, (y1 - y0) / 12)) {
      s += rect(x0 - cw - 6, y, cw, Math.max(5, (y1 - y0) / 26), C.white, 'opacity=".95"');
      s += rect(x1 + 6, y, cw, Math.max(5, (y1 - y0) / 26), C.white, 'opacity=".95"');
    }
    return { svg: s };
  }

  function teeRoad(W, H, dir) {
    var hw = Math.min(W, H) * 0.19;
    var cx = W * 0.5;
    var s = rect(0, 0, W, H, C.ground);
    var blocks = [];
    if (dir === 'up' || dir === 'down') {
      var hy = dir === 'up' ? H * 0.32 : H * 0.68;
      var y0 = hy - hw, y1 = hy + hw, x0 = cx - hw, x1 = cx + hw;
      s += rect(0, y0, W, y1 - y0, C.asp);
      s += rect(x0, dir === 'up' ? y1 : 0, x1 - x0, dir === 'up' ? H - y1 : y0, C.asp);
      blocks = dir === 'up'
        ? [[6, 6, W - 12, y0 - 18], [6, y1 + 12, x0 - 18, H - y1 - 18], [x1 + 12, y1 + 12, W - x1 - 18, H - y1 - 18]]
        : [[6, 6, x0 - 18, y0 - 18], [x1 + 12, 6, W - x1 - 18, y0 - 18], [6, y1 + 12, W - 12, H - y1 - 18]];
      s += line(cx - 2.4, dir === 'up' ? y1 : 0, cx - 2.4, dir === 'up' ? H : y0, C.yel, 2.4);
      s += line(cx + 2.4, dir === 'up' ? y1 : 0, cx + 2.4, dir === 'up' ? H : y0, C.yel, 2.4);
      s += line(0, y0 + 2.4, W, y0 + 2.4, C.white, 2.4);
      s += line(0, y1 - 2.4, W, y1 - 2.4, C.white, 2.4);
      s += line(0, hy - 2.4, W, hy - 2.4, C.yel, 2.2) + line(0, hy + 2.4, W, hy + 2.4, C.yel, 2.2);
      s += line(x0 + 2.4, dir === 'up' ? y1 : 0, x0 + 2.4, dir === 'up' ? H : y0, C.white, 2.4);
      s += line(x1 - 2.4, dir === 'up' ? y1 : 0, x1 - 2.4, dir === 'up' ? H : y0, C.white, 2.4);
      s += crosswalkBand(dir === 'up' ? y1 + 8 : y0 - 26, x0, x1);
    } else {
      var vx = dir === 'right' ? W * 0.34 : W * 0.66;
      var x0r = vx - hw, x1r = vx + hw, hyr = H * 0.5, y0r = hyr - hw, y1r = hyr + hw;
      s += rect(x0r, 0, x1r - x0r, H, C.asp);
      s += rect(dir === 'right' ? x1r : 0, y0r, dir === 'right' ? W - x1r : x0r, y1r - y0r, C.asp);
      blocks = dir === 'right'
        ? [[0, 0, x0r - 18, H], [x1r + 12, 6, W - x1r - 18, y0r - 18], [x1r + 12, y1r + 12, W - x1r - 18, H - y1r - 18]]
        : [[0, 6, x0r - 18, y0r - 18], [0, y1r + 12, x0r - 18, H - y1r - 18], [x1r + 12, 0, W - x1r - 18, H]];
      s += line(vx - 2.4, 0, vx - 2.4, H, C.yel, 2.4) + line(vx + 2.4, 0, vx + 2.4, H, C.yel, 2.4);
      s += line(x0r + 2.4, 0, x0r + 2.4, H, C.white, 2.4) + line(x1r - 2.4, 0, x1r - 2.4, H, C.white, 2.4);
      var gx0 = dir === 'right' ? x1r : 0, gx1 = dir === 'right' ? W : x0r;
      s += line(gx0, y0r + 2.4, gx1, y0r + 2.4, C.white, 2.4) + line(gx0, y1r - 2.4, gx1, y1r - 2.4, C.white, 2.4);
      s += line(gx0, hyr, gx1, hyr, C.white, 2.2, 'stroke-dasharray="14 13"');
    }
    blocks.forEach(function (b, i) { if (b[2] > 20 && b[3] > 20) s += urbanBlock(b[0], b[1], b[2], b[3], i + 5); });
    return s;
  }

  function roundabout(W, H, big) {
    var cx = W / 2, cy = H / 2;
    var R = Math.min(W, H) * (big ? 0.25 : 0.19);
    var road = Math.min(W, H) * (big ? 0.13 : 0.115);
    var arm = Math.min(W, H) * 0.16;
    var s = rect(0, 0, W, H, C.ground);
    s += rect(cx - arm, 0, arm * 2, H, C.asp) + rect(0, cy - arm, W, arm * 2, C.asp);
    s += urbanBlock(6, 6, cx - arm - 44, cy - arm - 44, 11);
    s += urbanBlock(cx + arm + 38, 6, W - cx - arm - 44, cy - arm - 44, 12);
    s += urbanBlock(6, cy + arm + 38, cx - arm - 44, H - cy - arm - 44, 13);
    s += urbanBlock(cx + arm + 38, cy + arm + 38, W - cx - arm - 44, H - cy - arm - 44, 14);
    s += '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(R) + '" fill="' + C.asp + '"/>';
    s += '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(R - road) + '" fill="' + C.tree + '"/>';
    s += '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(R - road / 2) + '" fill="none" stroke="' + C.white + '" stroke-width="2.4" stroke-dasharray="16 15"/>';
    s += '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(R - 2) + '" fill="none" stroke="' + C.white + '" stroke-width="2.4"/>';
    s += '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(R - road + 2) + '" fill="none" stroke="' + C.white + '" stroke-width="3"/>';
    return s;
  }

  function curveRoad(W, H, dir) {
    var wdt = Math.min(W, H) * 0.42;
    var s = rect(0, 0, W, H, C.ground);
    s += urbanBlock(6, 6, W * 0.3, H * 0.24, 21) + urbanBlock(W * 0.62, H * 0.68, W * 0.32, H * 0.26, 22);
    var d = dir === 'left'
      ? 'M ' + f(W * 0.62) + ' ' + f(H * 1.02) + ' L ' + f(W * 0.62) + ' ' + f(H * 0.55) + ' Q ' + f(W * 0.62) + ' ' + f(H * 0.25) + ' ' + f(W * 0.28) + ' ' + f(H * 0.25) + ' L ' + f(-W * 0.05) + ' ' + f(H * 0.25)
      : 'M ' + f(W * 0.38) + ' ' + f(H * 1.02) + ' L ' + f(W * 0.38) + ' ' + f(H * 0.55) + ' Q ' + f(W * 0.38) + ' ' + f(H * 0.25) + ' ' + f(W * 0.72) + ' ' + f(H * 0.25) + ' L ' + f(W * 1.05) + ' ' + f(H * 0.25);
    s += '<path d="' + d + '" fill="none" stroke="' + C.walk + '" stroke-width="' + f(wdt + 24) + '"/>';
    s += '<path d="' + d + '" fill="none" stroke="' + C.asp + '" stroke-width="' + f(wdt) + '"/>';
    s += '<path d="' + d + '" fill="none" stroke="' + C.yel + '" stroke-width="3.6"/>';
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
    s += '<path d="' + d + '" fill="none" stroke="' + C.asp + '" stroke-width="' + f(W * 0.2) + '" stroke-linecap="round"/>';
    s += '<path d="' + d + '" fill="none" stroke="' + C.white + '" stroke-width="3" stroke-dasharray="14 13"/>';
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

  function parkingLot(W, H, style) {
    var s = '';
    if (style === 2) {
      /* 실내 주차장 */
      s = rect(0, 0, W, H, '#334155');
      var bayW = W / 5.2, bayH = H * 0.28, yTop = H * 0.12;
      for (var row = 0; row < 3; row++) {
        var y = yTop + row * (bayH + H * 0.06);
        for (var i = 0; i <= 5; i++) s += line(i * bayW, y, i * bayW, y + bayH, '#DDE4EE', 2.8);
        s += line(0, y, W, y, '#DDE4EE', 2.8) + line(0, y + bayH, W, y + bayH, '#DDE4EE', 2.8);
      }
      return s;
    }
    /* 야외 주차장: 상·하 주차면(닫힌 칸) + 중앙 통로 */
    var n = 5, bw = W / n, top = H * 0.06, bd = H * 0.26;
    var aisle0 = top + bd, aisle1 = H - top - bd;
    s = rect(0, 0, W, H, C.asp);
    s += rect(0, 0, W, top, C.block) + rect(0, H - top, W, top, C.block);
    s += line(0, top, W, top, C.white, 2.6) + line(0, H - top, W, H - top, C.white, 2.6);
    for (var k = 0; k <= n; k++) {
      var bx = k * bw;
      s += line(bx, top, bx, aisle0, C.white, 2.6);
      s += line(bx, aisle1, bx, H - top, C.white, 2.6);
    }
    // 통로 중앙 점선 + 진행 화살표(위/아래)
    s += line(W * 0.5, aisle0 + 6, W * 0.5, aisle1 - 6, C.white, 2.2, 'stroke-dasharray="14 14" opacity=".55"');
    var aw = Math.min(W * 0.07, 26), ah = Math.min((aisle1 - aisle0) * 0.34, 46);
    s += arrowMark(W * 0.74, aisle0 + (aisle1 - aisle0) * 0.33, aw, ah, 1, C.white, 0.6);
    s += arrowMark(W * 0.26, aisle0 + (aisle1 - aisle0) * 0.67, aw, ah, -1, C.white, 0.6);
    // 상단 'P' 표기
    var ps = Math.min(top * 0.62, 20);
    s += '<text x="' + f(W * 0.06) + '" y="' + f(top * 0.5 + ps * 0.36) + '" font-family="Pretendard, sans-serif" font-size="' + f(ps) +
      '" font-weight="800" fill="#94A3B8">P</text>';
    s += '<text x="' + f(W * 0.06 + ps * 0.95) + '" y="' + f(top * 0.5 + ps * 0.36) + '" font-family="Pretendard, sans-serif" font-size="' + f(ps * 0.78) +
      '" font-weight="700" fill="#94A3B8">주차장</text>';
    return s;
  }

  /* 진행 방향 화살표 (dir 1 = 위, -1 = 아래) */
  function arrowMark(cx, cy, aw, ah, dir, col, op) {
    var hw = aw / 2, hh = ah / 2, neck = ah * 0.46, sw = aw * 0.17;
    var d = 'M' + f(cx) + ' ' + f(cy - dir * hh) +
      ' L' + f(cx + hw) + ' ' + f(cy - dir * (hh - neck)) +
      ' L' + f(cx + sw) + ' ' + f(cy - dir * (hh - neck)) +
      ' L' + f(cx + sw) + ' ' + f(cy + dir * hh) +
      ' L' + f(cx - sw) + ' ' + f(cy + dir * hh) +
      ' L' + f(cx - sw) + ' ' + f(cy - dir * (hh - neck)) +
      ' L' + f(cx - hw) + ' ' + f(cy - dir * (hh - neck)) + ' Z';
    return '<path d="' + d + '" fill="' + col + '"' + (op != null ? ' opacity="' + op + '"' : '') + '/>';
  }

  function highway(W, H, variant) {
    var hw = W * 0.28, cx = W * 0.5;
    var s = rect(0, 0, W, H, variant % 2 ? '#D9E3CF' : '#E4EAE0');
    s += rect(cx - hw, 0, hw * 2, H, C.asp);
    s += rect(cx - 7, 0, 14, H, C.tree);
    [-1, 1].forEach(function (side) {
      for (var i = 1; i <= 2; i++) s += line(cx + side * (hw / 3 * i), 0, cx + side * (hw / 3 * i), H, C.white, 2.2, 'stroke-dasharray="18 16"');
      s += line(cx + side * (hw - 3), 0, cx + side * (hw - 3), H, C.white, 2.6);
    });
    return s;
  }

  function livingRoad(W, H) {
    var hw = W * 0.20, cx = W * 0.5;
    var s = rect(0, 0, W, H, C.ground) + groundStrip(W, H, cx - hw, cx + hw, 'left') + groundStrip(W, H, cx - hw, cx + hw, 'right');
    s += rect(cx - hw, 0, hw * 2, H, '#64748B');
    s += line(cx - hw + 2, 0, cx - hw + 2, H, C.white, 2.4) + line(cx + hw - 2, 0, cx + hw - 2, H, C.white, 2.4);
    for (var y = H * 0.22; y < H; y += H * 0.3) s += rect(cx - hw + 5, y, hw * 2 - 10, 9, C.white, 'opacity=".45"');
    return s;
  }

  function laneReduce(W, H) {
    var n = 4, hw = W * 0.24, cx = W * 0.5, x0 = cx - hw, x1 = cx + hw, laneW = (x1 - x0) / n;
    var s = rect(0, 0, W, H, C.ground) + groundStrip(W, H, x0, x1, 'left') + groundStrip(W, H, x0, x1, 'right');
    s += '<path d="M' + f(x0) + ' ' + f(H) + ' L' + f(x0) + ' 0 L' + f(x1 - laneW) + ' 0 L' + f(x1) + ' ' + f(H * 0.55) + ' L' + f(x1) + ' ' + f(H) + ' Z" fill="' + C.asp + '"/>';
    for (var i = 1; i < n; i++) {
      var x = x0 + laneW * i;
      if (i === 2) continue;
      s += line(x, 0, x, i === n - 1 ? H * 0.52 : H, C.white, 2.2, 'stroke-dasharray="15 14"');
    }
    s += line(cx - 2.4, 0, cx - 2.4, H, C.yel, 2.4) + line(cx + 2.4, 0, cx + 2.4, H, C.yel, 2.4);
    return s;
  }

  function shoulderParking(W, H) {
    var base = laneRoad(W, H, { lanes: 4, hw: 0.25 });
    var cx = W * 0.5, hw = W * 0.25;
    return base.svg + rect(cx + hw - W * 0.085, 0, W * 0.085, H, '#6B7280');
  }

  function safetyZone(W, H) {
    var base = laneRoad(W, H, { lanes: 4, hw: 0.26 });
    var cx = W * 0.5, top = H * 0.14, bot = H * 0.54, w = W * 0.045;
    var s = base.svg + '<path d="M' + f(cx - w) + ' ' + f(bot) + ' L' + f(cx - w) + ' ' + f(top + 40) + ' Q' + f(cx - w) + ' ' + f(top) + ' ' + f(cx) + ' ' + f(top) + ' Q' + f(cx + w) + ' ' + f(top) + ' ' + f(cx + w) + ' ' + f(top + 40) + ' L' + f(cx + w) + ' ' + f(bot) + ' Z" fill="none" stroke="' + C.white + '" stroke-width="5"/>';
    for (var y = top + 16; y < bot - 10; y += 18) s += line(cx - w + 4, y, cx + w - 4, y + 12, C.white, 2.2);
    return s;
  }

  /* ────────── 노면 표기·기하 헬퍼 ────────── */
  /* 세로쓰기 한글 (버스전용차로 등) */
  function vText(chars, cx, y0, gap, fs, col) {
    var s = '';
    for (var i = 0; i < chars.length; i++) {
      s += '<text x="' + f(cx) + '" y="' + f(y0 + gap * i + fs * 0.34) + '" text-anchor="middle"' +
        ' font-family="Pretendard, Apple SD Gothic Neo, Noto Sans KR, sans-serif" font-size="' + f(fs) +
        '" font-weight="800" fill="' + col + '">' + chars[i] + '</text>';
    }
    return s;
  }
  /* 방향 삼각형 (기본은 위쪽, ang 로 회전) */
  function tri(x, y, size, ang, col) {
    return '<path d="M0 ' + f(-size) + 'L' + f(size * 0.74) + ' ' + f(size * 0.72) + 'L' + f(-size * 0.74) + ' ' + f(size * 0.72) + 'Z"' +
      ' fill="' + col + '" transform="translate(' + f(x) + ',' + f(y) + ') rotate(' + f(ang) + ')"/>';
  }
  /* 임의 방향 횡단보도 띠 */
  function crosswalkLine(x0, y0, x1, y1, bandW) {
    var dx = x1 - x0, dy = y1 - y0, L = Math.sqrt(dx * dx + dy * dy);
    var ang = Math.atan2(dy, dx) * 180 / Math.PI;
    var n = Math.max(2, Math.round(L / (bandW * 0.95)));
    var s = '';
    for (var i = 0; i < n; i++) {
      var t = (i + 0.5) / n;
      s += '<rect x="' + f(-bandW * 0.28) + '" y="' + f(-bandW / 2) + '" width="' + f(bandW * 0.56) + '" height="' + f(bandW) +
        '" fill="' + C.white + '" opacity=".95" transform="translate(' + f(x0 + dx * t) + ',' + f(y0 + dy * t) + ') rotate(' + f(ang) + ')"/>';
    }
    return s;
  }

  /* ────────── 일방통행: 실제 노면지시처럼 화살표 1개 + '일방통행' 1개 ────────── */
  function oneway(W, H) {
    var hw = 0.24 * W, cx = W * 0.5, x0 = cx - hw, x1 = cx + hw, roadW = x1 - x0;
    var s = rect(0, 0, W, H, C.ground);
    s += groundStrip(W, H, x0, x1, 'left') + groundStrip(W, H, x0, x1, 'right');
    s += rect(x0, 0, roadW, H, C.asp);
    /* 양쪽 흰 실선 테두리만 — 점선으로 글자를 자르지 않는다 */
    s += line(x0 + 2.8, 0, x0 + 2.8, H, C.white, 3.2);
    s += line(x1 - 2.8, 0, x1 - 2.8, H, C.white, 3.2);
    /* 진행 방향 흰 화살표 1개 (상단) */
    var aw = Math.min(roadW * 0.46, W * 0.24), ah = aw * 1.32;
    s += arrowMark(cx, H * 0.235, aw, ah, 1, C.white, 0.96);
    /* 노면 '일방통행' 1개 (중앙~하단) */
    var fs = Math.min(roadW * 0.90 / 4.35, H * 0.075, 46);
    if (fs >= 8) {
      s += '<text x="' + f(cx) + '" y="' + f(H * 0.635 + fs * 0.36) + '" text-anchor="middle"' +
        ' font-family="Pretendard, Apple SD Gothic Neo, Noto Sans KR, sans-serif"' +
        ' font-size="' + f(fs) + '" font-weight="800" fill="#FFFFFF"' +
        ' letter-spacing="' + f(fs * 0.06) + '">일방통행</text>';
    }
    return s;
  }

  /* ────────── 가로(수평) 도로 — 세로 도로를 90° 회전 ────────── */
  function laneRoadH(W, H, o) {
    return '<g transform="translate(' + f(W) + ',0) rotate(90)">' + laneRoad(H, W, o).svg + '</g>';
  }

  /* ────────── 중앙버스전용(6차로) ────────── */
  function busCenter(W, H) {
    var hw = 0.30 * W, cx = W * 0.5, x0 = cx - hw, x1 = cx + hw, lw = (x1 - x0) / 6;
    var s = rect(0, 0, W, H, C.ground) + groundStrip(W, H, x0, x1, 'left') + groundStrip(W, H, x0, x1, 'right');
    s += rect(x0, 0, x1 - x0, H, C.asp);
    s += line(x0 + 2.6, 0, x0 + 2.6, H, C.white, 2.8) + line(x1 - 2.6, 0, x1 - 2.6, H, C.white, 2.8);
    s += line(x0 + lw, 0, x0 + lw, H, C.white, 2.2, 'stroke-dasharray="16 15"');
    s += line(x1 - lw, 0, x1 - lw, H, C.white, 2.2, 'stroke-dasharray="16 15"');
    /* 버스전용차로 경계 — 파란 실선 */
    s += line(x0 + lw * 2, 0, x0 + lw * 2, H, C.blue, 3.2);
    s += line(x1 - lw * 2, 0, x1 - lw * 2, H, C.blue, 3.2);
    /* 중앙분리대 · 정류장 섬 */
    var mw = Math.max(7, W * 0.022);
    s += rect(cx - mw / 2, 0, mw, H, C.walk);
    s += rect(cx - mw * 1.9, H * 0.30, mw * 3.8, H * 0.15, C.walk, 'stroke="' + C.blockS + '" stroke-width="1.2" rx="3"');
    return s;
  }

  /* ────────── 가로변버스전용(4차로) ────────── */
  function busSide(W, H) {
    var hw = 0.26 * W, cx = W * 0.5, x0 = cx - hw, x1 = cx + hw, lw = (x1 - x0) / 4;
    var s = rect(0, 0, W, H, C.ground) + groundStrip(W, H, x0, x1, 'left') + groundStrip(W, H, x0, x1, 'right');
    s += rect(x0, 0, x1 - x0, H, C.asp);
    s += line(x0 + 2.6, 0, x0 + 2.6, H, C.white, 2.8) + line(x1 - 2.6, 0, x1 - 2.6, H, C.white, 2.8);
    s += line(cx - 2.5, 0, cx - 2.5, H, C.yel, 2.2) + line(cx + 2.5, 0, cx + 2.5, H, C.yel, 2.2);
    s += line(x0 + lw, 0, x0 + lw, H, C.white, 2.2, 'stroke-dasharray="16 15"');
    s += line(x0 + lw * 3, 0, x0 + lw * 3, H, C.white, 2.2, 'stroke-dasharray="16 15"');
    /* 가로변(최우측) 버스전용차로 — 파란 실선 + '버스' 노면 표기 */
    s += line(x1 - lw, 0, x1 - lw, H, C.blue, 3.4);
    s += line(x1 - 8, 0, x1 - 8, H, C.blue, 2.2);
    var fs = Math.min(lw * 0.62, 30);
    s += vText(['버', '스'], x1 - lw * 0.5, H * 0.30, fs * 1.22, fs, C.blue);
    return s;
  }

  /* ────────── 유턴구역(4차로) ────────── */
  function uturnRoad(W, H) {
    var hw = 0.25 * W, cx = W * 0.5, x0 = cx - hw, x1 = cx + hw, lw = (x1 - x0) / 4;
    var s = rect(0, 0, W, H, C.ground) + groundStrip(W, H, x0, x1, 'left') + groundStrip(W, H, x0, x1, 'right');
    s += rect(x0, 0, x1 - x0, H, C.asp);
    s += line(x0 + 2.6, 0, x0 + 2.6, H, C.white, 2.8) + line(x1 - 2.6, 0, x1 - 2.6, H, C.white, 2.8);
    s += line(x0 + lw, 0, x0 + lw, H, C.white, 2.2, 'stroke-dasharray="16 15"');
    s += line(x1 - lw, 0, x1 - lw, H, C.white, 2.2, 'stroke-dasharray="16 15"');
    /* 중앙선은 유턴 구간에서 열려 있다 */
    var gy0 = H * 0.44, gy1 = H * 0.72;
    s += line(cx - 2.5, 0, cx - 2.5, gy0, C.yel, 2.2) + line(cx + 2.5, 0, cx + 2.5, gy0, C.yel, 2.2);
    s += line(cx - 2.5, gy1, cx - 2.5, H, C.yel, 2.2) + line(cx + 2.5, gy1, cx + 2.5, H, C.yel, 2.2);
    /* 유턴 화살표 — 북측(올라가는 쪽) 안쪽 차로 */
    var ux = cx + lw * 0.5, r = Math.min(lw * 0.44, W * 0.058), cyu = H * 0.55, sw = Math.max(3, lw * 0.15);
    s += '<path d="M' + f(ux + r) + ' ' + f(cyu + r * 1.5) + 'L' + f(ux + r) + ' ' + f(cyu) +
      'A' + f(r) + ' ' + f(r) + ' 0 0 0 ' + f(ux - r) + ' ' + f(cyu) + 'L' + f(ux - r) + ' ' + f(cyu + r * 1.5) +
      '" fill="none" stroke="' + C.white + '" stroke-width="' + f(sw) + '" stroke-linecap="round"/>';
    s += tri(ux - r, cyu + r * 1.5 + r * 0.42, r * 0.9, 180, C.white);
    return s;
  }

  /* ────────── 자전거겸용도로 ────────── */
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
    s += line(x0 + 2.6, 0, x0 + 2.6, H, C.white, 2.8) + line(x1 - 2.6, 0, x1 - 2.6, H, C.white, 2.8);
    s += line(x1 - bw, 0, x1 - bw, H, C.white, 2.6);
    s += line(cx - 2.5, 0, cx - 2.5, H, C.yel, 2.2) + line(cx + 2.5, 0, cx + 2.5, H, C.yel, 2.2);
    var gr = Math.min(bw * 0.30, 20);
    for (var yy = H * 0.17; yy < H; yy += H * 0.33) s += bikeGlyph(x1 - bw * 0.5, yy, gr, '#FFFFFF');
    return s;
  }

  /* ────────── 어린이보호구역(스쿨존) ────────── */
  function schoolZone(W, H) {
    var hw = 0.21 * W, cx = W * 0.5, x0 = cx - hw, x1 = cx + hw, roadW = x1 - x0;
    var s = rect(0, 0, W, H, C.ground) + groundStrip(W, H, x0, x1, 'left') + groundStrip(W, H, x0, x1, 'right');
    s += rect(x0, 0, roadW, H, '#8A4A44');
    s += line(x0 + 3, 0, x0 + 3, H, C.white, 3) + line(x1 - 3, 0, x1 - 3, H, C.white, 3);
    s += line(cx - 2.5, 0, cx - 2.5, H, C.yel, 2.2) + line(cx + 2.5, 0, cx + 2.5, H, C.yel, 2.2);
    s += crosswalkBand(H * 0.62, x0, x1);
    var fs = Math.min(roadW * 0.44, H * 0.13, 76);
    s += '<text x="' + f(cx) + '" y="' + f(H * 0.30 + fs * 0.36) + '" text-anchor="middle"' +
      ' font-family="Pretendard, Apple SD Gothic Neo, Noto Sans KR, sans-serif" font-size="' + f(fs) +
      '" font-weight="800" fill="#FFFFFF">30</text>';
    return s;
  }

  /* ────────── 방지턱·과속방지턱 ────────── */
  function speedBump(W, H) {
    var base = laneRoad(W, H, { lanes: 2, hw: 0.22 });
    var s = base.svg, x0 = base.x0, x1 = base.x1, rw = x1 - x0;
    [0.32, 0.66].forEach(function (fy) {
      var y = H * fy, h = Math.max(9, H * 0.03), n = 10;
      for (var i = 0; i < n; i++) {
        s += rect(x0 + rw * i / n, y, rw / n + 0.4, h, i % 2 ? C.white : C.yel, 'opacity=".95"');
      }
    });
    return s;
  }

  /* ────────── 골목길·이면도로(직선) ────────── */
  function alley(W, H) {
    var hw = W * 0.15, cx = W * 0.5, x0 = cx - hw, x1 = cx + hw;
    var s = rect(0, 0, W, H, C.ground);
    s += rect(x0 - 11, 0, 11, H, C.walk) + rect(x1, 0, 11, H, C.walk);
    s += rect(x0, 0, x1 - x0, H, '#5A6370');
    /* 골목: 중앙선·차선 없음, 배수로만 */
    s += line(x0 + 3.5, 0, x0 + 3.5, H, '#6E7887', 2.2) + line(x1 - 3.5, 0, x1 - 3.5, H, '#6E7887', 2.2);
    s += urbanBlock(3, 4, x0 - 15, H * 0.44, 51);
    s += urbanBlock(3, H * 0.48, x0 - 15, H * 0.46, 52);
    s += urbanBlock(x1 + 13, 4, W - x1 - 16, H * 0.52, 53);
    s += urbanBlock(x1 + 13, H * 0.56, W - x1 - 16, H * 0.38, 54);
    return s;
  }

  /* ────────── 골목길 교차로 ────────── */
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

  /* ────────── 아파트 단지내 도로 ────────── */
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
    s += line(x0 + 2.4, 0, x0 + 2.4, H, C.white, 2.2) + line(x1 - 2.4, 0, x1 - 2.4, H, C.white, 2.2);
    s += line(cx, 0, cx, H, C.white, 1.8, 'stroke-dasharray="12 12" opacity=".65"');
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

  /* ────────── 좌회전 포켓차로 교차로 ────────── */
  function xjPocket(W, H) {
    var base = crossRoad(W, H, { lanes: 4, hw: 0.22 });
    var s = base.svg;
    var hw = 0.22 * Math.min(W, H), cx = W * 0.5, cy = H * 0.5;
    var y1 = cy + hw, lw = hw / 2;
    var py = Math.min(H - 6, y1 + hw * 1.05);
    /* 포켓 차로(중앙선 옆) 흰 실선 */
    s += line(cx + lw, y1 + 4, cx + lw, py, C.white, 2.6);
    /* 좌회전 화살표 */
    var ax = cx + lw * 0.5, ay = py - 4, sw = Math.max(3, lw * 0.16);
    s += '<path d="M' + f(ax) + ' ' + f(ay) + 'L' + f(ax) + ' ' + f(ay - lw * 0.72) +
      'Q' + f(ax) + ' ' + f(ay - lw * 1.12) + ' ' + f(ax - lw * 0.46) + ' ' + f(ay - lw * 1.12) +
      '" fill="none" stroke="' + C.white + '" stroke-width="' + f(sw) + '" stroke-linecap="round"/>';
    s += tri(ax - lw * 0.50 - lw * 0.22, ay - lw * 1.12, lw * 0.30, 270, C.white);
    return s;
  }

  /* ────────── 대각선 횡단보도(스크램블) ────────── */
  function xjScramble(W, H) {
    var base = crossRoad(W, H, { lanes: 4, hw: 0.22 });
    var s = base.svg;
    var hw = 0.22 * Math.min(W, H), cx = W * 0.5, cy = H * 0.5, bw = hw * 0.34;
    s += crosswalkLine(cx - hw * 0.86, cy - hw * 0.86, cx + hw * 0.86, cy + hw * 0.86, bw);
    s += crosswalkLine(cx + hw * 0.86, cy - hw * 0.86, cx - hw * 0.86, cy + hw * 0.86, bw);
    return s;
  }

  /* ────────── Y자형 삼거리 ────────── */
  function yRoad(W, H) {
    var rw = Math.min(W * 0.30, H * 0.21), cx = W * 0.5, jy = H * 0.46;
    var s = rect(0, 0, W, H, C.ground);
    var arms = 'M' + f(cx - rw * 1.52) + ' -10L' + f(cx) + ' ' + f(jy) + 'L' + f(cx + rw * 1.52) + ' -10';
    var stem = 'M' + f(cx) + ' ' + f(jy) + 'L' + f(cx) + ' ' + f(H + 10);
    s += '<path d="' + arms + '" fill="none" stroke="' + C.walk + '" stroke-width="' + f(rw + 26) + '" stroke-linejoin="round" stroke-linecap="round"/>';
    s += '<path d="' + stem + '" fill="none" stroke="' + C.walk + '" stroke-width="' + f(rw + 26) + '" stroke-linecap="round"/>';
    s += '<path d="' + arms + '" fill="none" stroke="' + C.asp + '" stroke-width="' + f(rw) + '" stroke-linejoin="round" stroke-linecap="round"/>';
    s += '<path d="' + stem + '" fill="none" stroke="' + C.asp + '" stroke-width="' + f(rw) + '" stroke-linecap="round"/>';
    s += '<path d="' + arms + '" fill="none" stroke="' + C.yel + '" stroke-width="2.4" stroke-dasharray="15 14"/>';
    s += '<path d="' + stem + '" fill="none" stroke="' + C.yel + '" stroke-width="2.4" stroke-dasharray="15 14"/>';
    s += urbanBlock(5, 5, cx - rw * 1.52 - rw * 0.9, H * 0.10, 91);
    s += urbanBlock(cx + rw * 1.52 + rw * 0.4, 5, W - (cx + rw * 1.52 + rw * 0.4) - 6, H * 0.10, 92);
    s += urbanBlock(5, jy + rw * 1.1, cx - rw * 1.35, H - jy - rw * 1.1, 93);
    s += urbanBlock(cx + rw * 1.1, jy + rw * 1.1, W - cx - rw * 1.1 - 6, H - jy - rw * 1.1, 94);
    return s;
  }

  /* ────────── 오거리 교차로 ────────── */
  function fiveWay(W, H) {
    var cx = W * 0.5, cy = H * 0.47, rw = Math.min(W, H) * 0.19, L = Math.max(W, H) * 1.2;
    var s = rect(0, 0, W, H, C.ground);
    var angs = [90, 18, 162, 234, 306];
    var paths = angs.map(function (a) {
      var r = a * Math.PI / 180;
      return 'M' + f(cx) + ' ' + f(cy) + 'L' + f(cx + Math.cos(r) * L) + ' ' + f(cy - Math.sin(r) * L);
    });
    paths.forEach(function (d) {
      s += '<path d="' + d + '" fill="none" stroke="' + C.walk + '" stroke-width="' + f(rw + 24) + '" stroke-linecap="round"/>';
    });
    paths.forEach(function (d) {
      s += '<path d="' + d + '" fill="none" stroke="' + C.asp + '" stroke-width="' + f(rw) + '" stroke-linecap="round"/>';
    });
    paths.forEach(function (d) {
      s += '<path d="' + d + '" fill="none" stroke="' + C.white + '" stroke-width="2.2" stroke-dasharray="15 14"/>';
    });
    s += '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(rw * 1.02) + '" fill="' + C.asp + '"/>';
    return s;
  }

  /* ────────── 지하차도 ────────── */
  function underpass(W, H) {
    var g = laneRoad(W, H, { lanes: 4, hw: 0.25 });
    var s = g.svg, x0 = g.x0, x1 = g.x1, rw = x1 - x0;
    var deckY = H * 0.56, deckH = Math.max(24, H * 0.085), wallW = Math.max(10, W * 0.032);
    /* 옹벽 + 지하 구간 어둡게 */
    s += rect(x0 - wallW, deckY - deckH * 2.0, wallW, deckH * 2.0, '#94A3B8');
    s += rect(x1, deckY - deckH * 2.0, wallW, deckH * 2.0, '#94A3B8');
    s += rect(x0, deckY - deckH * 2.0, rw, H - (deckY - deckH * 2.0), 'rgba(15,23,42,.45)');
    /* 위로 지나는 도로(덱) */
    s += rect(-2, deckY, W + 4, deckH, '#8E9BAB');
    s += rect(-2, deckY + deckH * 0.26, W + 4, deckH * 0.48, '#6B7787');
    s += line(0, deckY + deckH * 0.26, W, deckY + deckH * 0.26, C.white, 2.2);
    s += line(0, deckY + deckH * 0.74, W, deckY + deckH * 0.74, C.white, 2.2);
    s += line(0, deckY + deckH * 0.5, W, deckY + deckH * 0.5, C.white, 2, 'stroke-dasharray="14 13" opacity=".8"');
    return s;
  }

  /* ────────── 고가도로 ────────── */
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
    /* 고가도로 — 그림자 + 덱 + 난간 */
    var hw = W * 0.255, cx = W * 0.5;
    s += rect(cx - hw + 10, 0, hw * 2, H, 'rgba(15,23,42,.16)');
    s += rect(cx - hw - 5, 0, hw * 2 + 10, H, '#C7D0DB');
    s += rect(cx - hw, 0, hw * 2, H, C.asp);
    s += line(cx - hw + 2.6, 0, cx - hw + 2.6, H, C.white, 2.6) + line(cx + hw - 2.6, 0, cx + hw - 2.6, H, C.white, 2.6);
    s += line(cx - 2.5, 0, cx - 2.5, H, C.yel, 2.2) + line(cx + 2.5, 0, cx + 2.5, H, C.yel, 2.2);
    return s;
  }

  /* ────────── 교량(다리) ────────── */
  function bridge(W, H) {
    var s = rect(0, 0, W, H, '#BFD8EE');
    s += rect(0, 0, W, H * 0.16, C.ground) + rect(0, H * 0.84, W, H * 0.16, C.ground);
    for (var yy = H * 0.22; yy < H * 0.82; yy += H * 0.11) {
      s += line(W * 0.03, yy, W * 0.28, yy, '#A8C7E4', 2) + line(W * 0.74, yy, W * 0.97, yy, '#A8C7E4', 2);
    }
    var hw = W * 0.24, cx = W * 0.5;
    s += rect(cx - hw - 7, 0, hw * 2 + 14, H, '#C8D2DE');
    s += rect(cx - hw, 0, hw * 2, H, C.asp);
    s += line(cx - hw + 3, 0, cx - hw + 3, H, C.white, 2.6) + line(cx + hw - 3, 0, cx + hw - 3, H, C.white, 2.6);
    s += line(cx - 2.5, 0, cx - 2.5, H, C.yel, 2.2) + line(cx + 2.5, 0, cx + 2.5, H, C.yel, 2.2);
    [0.30, 0.50, 0.70].forEach(function (fy) {
      s += rect(cx - hw - 11, H * fy, 11, H * 0.06, '#9FB0C2') + rect(cx + hw, H * fy, 11, H * 0.06, '#9FB0C2');
    });
    return s;
  }

  /* ────────── IC·JC 진출입 램프 ────────── */
  function icRamp(W, H) {
    var hw = W * 0.235, cx = W * 0.40, rw = W * 0.115;
    var s = rect(0, 0, W, H, C.ground);
    /* 진출 램프를 먼저 그리고 본선을 그 위에 그려 진출부가 도로 경계에서 갈라지게 한다 */
    var d = 'M' + f(cx + hw - 24) + ' ' + f(H * 0.15) +
      'C' + f(cx + hw + W * 0.16) + ' ' + f(H * 0.26) + ' ' + f(W * 0.86) + ' ' + f(H * 0.38) + ' ' + f(W * 0.93) + ' ' + f(H * 0.74);
    s += '<path d="' + d + '" fill="none" stroke="' + C.walk + '" stroke-width="' + f(rw + 16) + '" stroke-linecap="round"/>';
    s += '<path d="' + d + '" fill="none" stroke="' + C.asp + '" stroke-width="' + f(rw) + '" stroke-linecap="round"/>';
    s += '<path d="' + d + '" fill="none" stroke="' + C.white + '" stroke-width="2.2" stroke-dasharray="14 13"/>';
    /* 본선 */
    s += rect(cx - hw - 16, 0, 16, H, C.walk) + rect(cx + hw, 0, 16, H, C.walk);
    s += rect(cx - hw, 0, hw * 2, H, C.asp);
    s += line(cx - hw + 3, 0, cx - hw + 3, H, C.white, 2.6) + line(cx + hw - 3, 0, cx + hw - 3, H, C.white, 2.6);
    [-1, 1].forEach(function (sd) {
      s += line(cx + sd * hw / 2, 0, cx + sd * hw / 2, H, C.white, 2.2, 'stroke-dasharray="18 16"');
      s += line(cx + sd * (hw - 4), 0, cx + sd * (hw - 4), H, C.white, 2.4);
    });
    return s;
  }

  /* ────────── S자 급커브 ────────── */
  function sCurve(W, H) {
    var rw = Math.min(W * 0.40, H * 0.24);
    var s = rect(0, 0, W, H, C.ground);
    s += urbanBlock(6, 6, W * 0.30, H * 0.26, 81);
    s += urbanBlock(W * 0.52, H * 0.52, W * 0.42, H * 0.34, 82);
    var d = 'M' + f(W * 0.30) + ' -20' +
      'C' + f(W * 0.30) + ' ' + f(H * 0.20) + ' ' + f(W * 0.72) + ' ' + f(H * 0.20) + ' ' + f(W * 0.72) + ' ' + f(H * 0.45) +
      'C' + f(W * 0.72) + ' ' + f(H * 0.70) + ' ' + f(W * 0.30) + ' ' + f(H * 0.72) + ' ' + f(W * 0.30) + ' ' + f(H + 20);
    s += '<path d="' + d + '" fill="none" stroke="' + C.walk + '" stroke-width="' + f(rw + 22) + '" stroke-linecap="round"/>';
    s += '<path d="' + d + '" fill="none" stroke="' + C.asp + '" stroke-width="' + f(rw) + '" stroke-linecap="round"/>';
    s += '<path d="' + d + '" fill="none" stroke="' + C.yel + '" stroke-width="3" stroke-dasharray="16 14"/>';
    return s;
  }

  /* ────────── 고속도로 톨게이트 ────────── */
  function tollgate(W, H) {
    var cx = W * 0.5, s = rect(0, 0, W, H, C.ground);
    var nw = W * 0.21, pw = W * 0.40, y0 = H * 0.30, y1 = H * 0.64, sp = H * 0.07;
    /* 본선 → 광장 → 본선 */
    s += rect(cx - nw, 0, nw * 2, y0 + 2, C.asp);
    s += '<path d="M' + f(cx - nw) + ' 0L' + f(cx + nw) + ' 0L' + f(cx + pw) + ' ' + f(y0 + sp) + 'L' + f(cx - pw) + ' ' + f(y0 + sp) + 'Z" fill="' + C.asp + '"/>';
    s += rect(cx - pw, y0 + sp, pw * 2, y1 - y0 - sp, C.asp);
    s += '<path d="M' + f(cx - pw) + ' ' + f(y1) + 'L' + f(cx + pw) + ' ' + f(y1) + 'L' + f(cx + nw) + ' ' + f(y1 + sp) + 'L' + f(cx - nw) + ' ' + f(y1 + sp) + 'Z" fill="' + C.asp + '"/>';
    s += rect(cx - nw, y1 + sp, nw * 2, H - y1 - sp, C.asp);
    /* 본선 차로선 */
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
    /* 톨게이트 부스 섬 */
    for (var j = 0; j < lanes - 1; j++) {
      var xb = cx - pw + (pw * 2) * (j + 1) / lanes;
      s += rect(xb - isl / 2, y0 + sp + (y1 - y0 - sp) * 0.14, isl, (y1 - y0 - sp) * 0.66, '#E6EBF2', 'stroke="#AEB9C7" stroke-width="1.2" rx="2"');
      s += rect(xb - isl / 2, y0 + sp + (y1 - y0 - sp) * 0.22, isl, (y1 - y0 - sp) * 0.14, '#F59E0B', 'rx="1.5"');
    }
    return s;
  }

  /* ────────── 철길 건널목 ────────── */
  function railCross(W, H) {
    var g = laneRoad(W, H, { lanes: 2, hw: 0.22 });
    var s = g.svg, x0 = g.x0, x1 = g.x1;
    var y0 = H * 0.40, bh = H * 0.14;
    s += rect(0, y0, W, bh, '#4B4553');
    var step = Math.max(11, W * 0.032);
    for (var x = 5; x < W; x += step) s += rect(x, y0 + 4, Math.max(4, W * 0.010), bh - 8, '#6B6472');
    s += line(0, y0 + bh * 0.32, W, y0 + bh * 0.32, '#D9E0EA', 4.5);
    s += line(0, y0 + bh * 0.68, W, y0 + bh * 0.68, '#D9E0EA', 4.5);
    s += rect(x0, y0 - 5, x1 - x0, 3, '#E2564E') + rect(x0, y0 + bh + 2, x1 - x0, 3, '#E2564E');
    s += rect(x0, y0 - 15, x1 - x0, 6, C.white);
    return s;
  }

  /* ────────── 사선(빗각) 주차장 ────────── */
  function lotAngle(W, H) {
    var s = rect(0, 0, W, H, C.asp);
    var top = H * 0.06, bd = H * 0.26, a0 = top + bd, a1 = H - top - bd;
    s += rect(0, 0, W, top, C.block) + rect(0, H - top, W, top, C.block);
    s += line(0, top, W, top, C.white, 2.6) + line(0, H - top, W, H - top, C.white, 2.6);
    s += line(0, a0, W, a0, C.white, 2.6) + line(0, a1, W, a1, C.white, 2.6);
    var n = 6, bw = W / n, skew = bd * 0.55;
    for (var i = 0; i <= n; i++) {
      s += line(i * bw, a0, i * bw + skew, top, C.white, 2.4);
      s += line(i * bw, a1, i * bw + skew, H - top, C.white, 2.4);
    }
    s += line(W * 0.5, a0 + 8, W * 0.5, a1 - 8, C.white, 2.2, 'stroke-dasharray="14 14" opacity=".6"');
    return s;
  }

  var LIST = [
    { id: 'blank', label: '초기화면(격자)', g: 1, tags: '격자 그리드 도면 빈빠지 빈화면 초기화' },

    /* ── 일반 ── */
    { id: 'lane2', label: '일반(2차로)', g: 1, tags: '2차로 세로 2차선 양방향 편도' },
    { id: 'lane3', label: '일반(3차로)', g: 1, tags: '3차로 세로 3차선 일방통행' },
    { id: 'lane4', label: '일반(4차로)', g: 1, tags: '4차로 세로 4차선 왕복' },
    { id: 'lane6', label: '일반(6차로)', g: 1, tags: '6차로 6차선 대로 대형로' },
    { id: 'lane8', label: '일반(8차로)', g: 1, tags: '8차로 8차선 대로' },
    { id: 'lane10', label: '일반(10차로)', g: 1, tags: '10차로 10차선 대형 대로' },
    { id: 'lane2H', label: '가로(2차로)', g: 1, tags: '가로 2차로 수평 좌우 왕복 이면도로' },
    { id: 'lane4H', label: '가로(4차로)', g: 1, tags: '가로 4차로 수평 좌우 왕복 대로' },
    { id: 'busCenter', label: '중앙버스전용(6차로)', g: 1, tags: '버스전용 버스 중앙버스 중앙차로 버스정류장 6차로 노선버스' },
    { id: 'busSide', label: '가로변버스전용(4차로)', g: 1, tags: '버스전용 가로변 버스차로 버스 4차로' },
    { id: 'uturnRoad', label: '유턴구역(4차로)', g: 1, tags: '유턴 유턴구역 유턴차로 회차 4차로' },
    { id: 'bikeLane', label: '자전거겸용도로', g: 1, tags: '자전거 자전거도로 바이크 차도 공유 자전거차로' },
    { id: 'schoolZone', label: '어린이보호구역(스쿨존)', g: 1, tags: '스쿨존 어린이보호구역 어린이 학교 등하교 30 과속' },
    { id: 'speedBump', label: '방지턱·과속방지', g: 1, tags: '방지턱 과속방지턱 과속 방지팍 속도 줄임턱 과속방지' },
    { id: 'oneway', label: '일방통행', g: 1, tags: '일방통행 한쪽통행 편도 화살표' },
    { id: 'living', label: '생활도로', g: 1, tags: '생활도로 주택가 이면도로 소통' },
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
    { id: 'hw1', label: '고속/전용도로1', g: 4, tags: '고속도로 전용도로 자동차전용 지방도' },
    { id: 'hw2', label: '고속/전용도로2', g: 4, tags: '고속도로 전용도로 자동차전용 중앙분리대' },
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
      case 'lane10': return laneRoad(W, H, { lanes: 10, hw: 0.38 }).svg;
      case 'cross4': {
        var b = laneRoad(W, H, { lanes: 4, hw: 0.25 });
        return b.svg + crosswalkBand(H * 0.44, b.x0, b.x1) + rect(b.x0 + 2, H * 0.44 - 6, (b.x1 - b.x0) / 2 - 4, 5, C.white);
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
  function carHalf(kind) { return CARB[kind] || CARB.sedan; }

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
    var n = 5, bw = W / n, top = H * 0.06, bd = H * 0.26;
    return {
      n: n, bw: bw, top: top, aisle0: top + bd, aisle1: H - top - bd,
      bayX: function (i) { return (i + 0.5) * bw; }
    };
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
