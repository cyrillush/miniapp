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

  function mergeRoad(W, H, mode) {
    var s = rect(0, 0, W, H, C.ground);
    var mainW = W * 0.42, cx = W * 0.5;
    s += rect(cx - mainW / 2, 0, mainW, H, C.asp);
    var d = 'M ' + f(W * 0.98) + ' ' + f(H * 0.92) + ' Q ' + f(W * 0.8) + ' ' + f(H * 0.7) + ' ' + f(cx + mainW / 2 - 6) + ' ' + f(H * 0.44);
    s += '<path d="' + d + '" fill="none" stroke="' + C.asp + '" stroke-width="' + f(W * 0.2) + '" stroke-linecap="round"/>';
    s += '<path d="' + d + '" fill="none" stroke="' + C.white + '" stroke-width="3" stroke-dasharray="14 13"/>';
    s += urbanBlock(6, 6, cx - mainW / 2 - 44, H * 0.38, 31);
    s += line(cx - mainW / 2 + 3, 0, cx - mainW / 2 + 3, H, C.white, 2.4) + line(cx + mainW / 2 - 3, 0, cx + mainW / 2 - 3, H, C.white, 2.4);
    s += line(cx, 0, cx, H, C.white, 2.2, 'stroke-dasharray="16 15"');
    if (mode === 'split') {
      s += '<path d="M ' + f(cx) + ' ' + f(H) + ' L ' + f(cx) + ' ' + f(H * 0.55) + ' Q ' + f(cx) + ' ' + f(H * 0.36) + ' ' + f(cx - W * 0.12) + ' ' + f(H * 0.3) + '" fill="none" stroke="' + C.tree + '" stroke-width="' + f(W * 0.05) + '" stroke-linecap="round"/>';
      s += '<path d="M ' + f(cx) + ' ' + f(H) + ' L ' + f(cx) + ' ' + f(H * 0.55) + ' Q ' + f(cx) + ' ' + f(H * 0.36) + ' ' + f(cx + W * 0.12) + ' ' + f(H * 0.3) + '" fill="none" stroke="' + C.tree + '" stroke-width="' + f(W * 0.05) + '" stroke-linecap="round"/>';
    }
    return s;
  }

  function parkingLot(W, H, style) {
    var s = rect(0, 0, W, H, style === 2 ? '#334155' : C.asp);
    var bayW = W / 5.2, bayH = H * 0.28, yTop = H * 0.12;
    if (style === 2) {
      for (var row = 0; row < 3; row++) {
        var y = yTop + row * (bayH + H * 0.06);
        for (var i = 0; i <= 5; i++) s += line(i * bayW, y, i * bayW, y + bayH, '#DDE4EE', 2.8);
        s += line(0, y, W, y, '#DDE4EE', 2.8) + line(0, y + bayH, W, y + bayH, '#DDE4EE', 2.8);
      }
    } else {
      s = rect(0, 0, W, H, C.ground) + rect(W * 0.06, H * 0.03, W * 0.88, H * 0.94, C.asp);
      for (var r2 = 0; r2 < 2; r2++) {
        var y2 = yTop + r2 * (bayH * 1.6);
        for (var j = 0; j <= 5; j++) s += line(W * 0.06 + j * bayW * 0.88, y2, W * 0.06 + j * bayW * 0.88, y2 + bayH, C.white, 2.8);
        s += line(W * 0.06, y2, W * 0.94, y2, C.white, 2.8);
      }
    }
    return s;
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

  function oneway(W, H) {
    var base = laneRoad(W, H, { lanes: 3, hw: 0.22, twoWay: false });
    var cx = W * 0.5, s = base.svg;
    for (var y = H * 0.18; y < H; y += H * 0.28) s += '<path d="M' + f(cx) + ' ' + f(y) + ' l 14 22 l -28 0 z" fill="' + C.white + '" opacity=".85"/>';
    return s;
  }

  var LIST = [
    { id: 'blank', label: '초기화면(격자)', g: 1 },
    { id: 'lane2', label: '일반(2차로)', g: 1 },
    { id: 'lane3', label: '일반(3차로)', g: 1 },
    { id: 'lane4', label: '일반(4차로)', g: 1 },
    { id: 'lane6', label: '일반(6차로)', g: 1 },
    { id: 'lane8', label: '일반(8차로)', g: 1 },
    { id: 'lane10', label: '일반(10차로)', g: 1 },
    { id: 'cross4', label: '횡단보도(4차로)', g: 1 },
    { id: 'tunnel2', label: '터널(2차로)', g: 1 },
    { id: 'tunnel4', label: '터널(4차로)', g: 1 },
    { id: 'merge4', label: '우합류(4차로)', g: 1 },
    { id: 'safety', label: '안전지대', g: 1 },
    { id: 'reduce', label: '우측차로감소', g: 1 },
    { id: 'oneway', label: '일방통행', g: 1 },
    { id: 'living', label: '생활도로', g: 1 },
    { id: 'parkOk1', label: '주정차가능1', g: 2 },
    { id: 'parkOk2', label: '주정차가능2', g: 2 },
    { id: 'parkNo1', label: '주정차금지', g: 2 },
    { id: 'lot1', label: '주차장1', g: 2 },
    { id: 'lot2', label: '주차장2(실내)', g: 2 },
    { id: 'shoulder', label: '갓길주차', g: 2 },
    { id: 'xj4', label: '+교차로(4차로)', g: 3 },
    { id: 'xj6', label: '+교차로(6차로)', g: 3 },
    { id: 'xj2', label: '+교차로(2차로)', g: 3 },
    { id: 'teeUp', label: 'ㅗ자형 교차로', g: 3 },
    { id: 'teeDown', label: 'T자형 교차로', g: 3 },
    { id: 'teeRight', label: 'ㅏ자형 교차로', g: 3 },
    { id: 'teeLeft', label: 'ㅓ자형 교차로', g: 3 },
    { id: 'roundS', label: '회전교차로(소)', g: 3 },
    { id: 'roundL', label: '회전교차로(대)', g: 3 },
    { id: 'curveL', label: '곡선로(좌)', g: 4 },
    { id: 'curveR', label: '곡선로(우)', g: 4 },
    { id: 'merge', label: '합류로', g: 4 },
    { id: 'split', label: '분할로', g: 4 },
    { id: 'hw1', label: '고속/전용도로1', g: 4 },
    { id: 'hw2', label: '고속/전용도로2', g: 4 }
  ];

  var GROUP_LABEL = { 1: '일반·터널 도로', 2: '주정차·주차장', 3: '교차로', 4: '곡선·합류·고속' };

  function build(id, W, H) {
    W = W || 400; H = H || 600;
    switch (id) {
      case 'blank': return rect(0, 0, W, H, '#F4F7FB');
      case 'lane2': return laneRoad(W, H, { lanes: 2, hw: 0.19 }).svg;
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

  var PRESETS = [
    {
      id: 'p252', no: '252', label: '차로변경(진로변경)', bg: 'lane4',
      summary: '자차 편도 2차로 주행 중, 대차1이 좌측 차로에서 진로를 변경하며 자차 좌측 후면을 충격',
      cars: [{ kind: 'sedan', role: 'self', x: 0.67, y: 0.42, rot: 0 }, { kind: 'suv', role: 'c1', x: 0.56, y: 0.66, rot: 0 }],
      arrows: [{ color: '#E9413B', pts: [[0.67, 0.58], [0.67, 0.24]] }, { color: '#F2A93B', pts: [[0.56, 0.84], [0.56, 0.58], [0.63, 0.49]] }],
      impact: { x: 0.625, y: 0.485 }
    },
    {
      id: 'p253', no: '253', label: '추돌 (양차량 주행중)', bg: 'lane4',
      summary: '자차 주행 중 전방 정체로 감속, 뒤따르던 대차1이 자차 후면을 추돌',
      cars: [{ kind: 'sedan', role: 'self', x: 0.67, y: 0.36, rot: 0 }, { kind: 'truck', role: 'c1', x: 0.67, y: 0.64, rot: 0 }],
      arrows: [{ color: '#E9413B', pts: [[0.67, 0.50], [0.67, 0.40]] }, { color: '#F2A93B', pts: [[0.67, 0.86], [0.67, 0.72]] }],
      impact: { x: 0.67, y: 0.48 }
    },
    {
      id: 'p255', no: '255', label: '추돌 (주·정차중)', bg: 'lane4',
      summary: '자차 정차 중, 후방에서 진행하던 대차1이 정지 상태의 자차를 추돌',
      cars: [{ kind: 'sedan', role: 'self', x: 0.67, y: 0.34, rot: 0 }, { kind: 'suv', role: 'c1', x: 0.67, y: 0.66, rot: 0 }],
      arrows: [{ color: '#F2A93B', pts: [[0.67, 0.86], [0.67, 0.72]] }],
      impact: { x: 0.67, y: 0.46 }
    },
    {
      id: 'p205', no: '205', label: '신호없는 교차로', bg: 'xj4',
      summary: '신호기 없는 교차로에서 자차 직진 중, 우측에서 진입한 대차1과 충돌',
      cars: [{ kind: 'sedan', role: 'self', x: 0.57, y: 0.72, rot: 0 }, { kind: 'suv', role: 'c1', x: 0.80, y: 0.43, rot: 270 }],
      arrows: [{ color: '#E9413B', pts: [[0.57, 0.90], [0.57, 0.60]] }, { color: '#F2A93B', pts: [[0.94, 0.43], [0.76, 0.43]] }],
      impact: { x: 0.58, y: 0.46 }
    },
    {
      id: 'p242', no: '242', label: '차도 아닌 곳에서 진입', bg: 'merge',
      summary: '자차 차도 외 장소에서 본선 차도로 진입 중, 본선 주행하던 대차1과 충돌',
      cars: [{ kind: 'sedan', role: 'self', x: 0.80, y: 0.76, rot: 300 }, { kind: 'suv', role: 'c1', x: 0.66, y: 0.40, rot: 0 }],
      arrows: [{ color: '#E9413B', pts: [[0.92, 0.88], [0.80, 0.74], [0.70, 0.62]] }, { color: '#F2A93B', pts: [[0.66, 0.70], [0.66, 0.52]] }],
      impact: { x: 0.70, y: 0.60 }
    },
    {
      id: 'p244', no: '244', label: '주차장 사고', bg: 'lot1',
      summary: '주차면에서 출차하던 자차와 주차장 통로를 진행하던 대차1이 충돌',
      cars: [{ kind: 'sedan', role: 'self', x: 0.34, y: 0.30, rot: 200 }, { kind: 'suv', role: 'c1', x: 0.64, y: 0.52, rot: 270 }],
      arrows: [{ color: '#E9413B', pts: [[0.34, 0.20], [0.36, 0.38], [0.46, 0.48]] }, { color: '#F2A93B', pts: [[0.86, 0.52], [0.70, 0.52]] }],
      impact: { x: 0.45, y: 0.44 }
    },
    {
      id: 'p240', no: '240', label: '삼거리 직진 대 회전', bg: 'teeDown',
      summary: 'T자형 삼거리에서 자차 직진 중, 우측 도로에서 회전 진입하던 대차1과 충돌',
      cars: [{ kind: 'sedan', role: 'self', x: 0.59, y: 0.84, rot: 0 }, { kind: 'suv', role: 'c1', x: 0.80, y: 0.64, rot: 270 }],
      arrows: [{ color: '#E9413B', pts: [[0.59, 0.94], [0.59, 0.74]] }, { color: '#F2A93B', pts: [[0.94, 0.64], [0.76, 0.64], [0.64, 0.60]] }],
      impact: { x: 0.60, y: 0.66 }
    }
  ];

  AS.roads = { LIST: LIST, GROUP_LABEL: GROUP_LABEL, PRESETS: PRESETS, build: build, thumb: thumb };
})(window.AS);
