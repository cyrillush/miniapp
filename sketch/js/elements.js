/* ==========================================================================
   elements.js — 참고 어플(삼성화재 사고약도) 100% 전체 요소 라이브러리  (v3.7)
   - 보행자 8종 전원 흰색(#FFFFFF) + 얇은 외곽선(배경판 없음)
   - 파손부위: 배경판 없는 투명 링·점 + 외곽선 글씨 / 충격지점: 6각 스파크 + 점
   - 신호등: 뒷면 기둥 + 앞면 굵은 방향 화살표 (좌회전·우회전·직진을 실제 신호로 구분)
   - 노면 화살표 4종: 순수 흰색 + 얇은 어두운 외곽선의 실제 한국 노면 도색 형태
   - 횡단보도(대/소) · 차선 · 지시·규제 표지
   ========================================================================== */
(function () {
  'use strict';
  if (!window.ART3) return;
  var baseCar = window.ART3.car;
  var baseSym = window.ART3.sym;
  var FONT = 'Pretendard,Apple SD Gothic Neo,Noto Sans KR,sans-serif';

  var f = function (n) { return Math.round(n * 100) / 100; };
  var r = function (x, y, w, h, rx, fill, ex) {
    return '<rect x="' + f(x) + '" y="' + f(y) + '" width="' + f(w) + '" height="' + f(h) + '" rx="' + f(rx) + '" fill="' + fill + '"' + (ex ? ' ' + ex : '') + '/>';
  };
  var c = function (cx, cy, rad, fill, ex) {
    return '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(rad) + '" fill="' + fill + '"' + (ex ? ' ' + ex : '') + '/>';
  };
  var p = function (d, fill, ex) {
    return '<path d="' + d + '" fill="' + fill + '"' + (ex ? ' ' + ex : '') + '/>';
  };
  var ln = function (x1, y1, x2, y2, col, w, ex) {
    return '<line x1="' + f(x1) + '" y1="' + f(y1) + '" x2="' + f(x2) + '" y2="' + f(y2) + '" stroke="' + col + '" stroke-width="' + f(w) + '" stroke-linecap="round"' + (ex ? ' ' + ex : '') + '/>';
  };
  var tx = function (x, y, s, size, fill, weight, ex) {
    return '<text x="' + f(x) + '" y="' + f(y) + '" font-size="' + size + '" font-weight="' + (weight || 800) + '" fill="' + fill + '" text-anchor="middle" font-family="' + FONT + '"' + (ex ? ' ' + ex : '') + '>' + s + '</text>';
  };
  /* 배경판 없이 어두운 외곽선만 두른 흰 글씨 — 어떤 배경 위에서도 읽힌다 */
  var OL = '#0B1524';
  var label = function (x, y, s, size, weight, swf) {
    return tx(x, y, s, size, '#FFFFFF', weight || 900,
      'paint-order="stroke" stroke="' + OL + '" stroke-width="' + f(size * (swf || 0.24)) + '" stroke-linejoin="round"');
  };

  /* ────────── 공통 도형 ────────── */
  function starPath(cx, cy, R, ri, n) {
    var pts = [];
    for (var i = 0; i < n * 2; i++) {
      var a = (Math.PI / n) * i - Math.PI / 2;
      var rad = (i % 2) ? ri : R;
      pts.push(f(cx + Math.cos(a) * rad) + ' ' + f(cy + Math.sin(a) * rad));
    }
    return 'M' + pts.join(' L') + ' Z';
  }
  /* 램프 안 화살표 글리프 (dir: left / right / straight) */
  function gArrow(cx, cy, rad, dir, fill) {
    var pts;
    if (dir === 'left') pts = [[-0.66, 0], [-0.16, -0.54], [-0.16, -0.22], [0.64, -0.22], [0.64, 0.22], [-0.16, 0.22], [-0.16, 0.54]];
    else if (dir === 'right') pts = [[0.66, 0], [0.16, -0.54], [0.16, -0.22], [-0.64, -0.22], [-0.64, 0.22], [0.16, 0.22], [0.16, 0.54]];
    else pts = [[0, -0.66], [0.56, -0.12], [0.22, -0.12], [0.22, 0.62], [-0.22, 0.62], [-0.22, -0.12], [-0.56, -0.12]];
    var d = 'M' + pts.map(function (q) { return f(cx + q[0] * rad) + ' ' + f(cy + q[1] * rad); }).join(' L') + ' Z';
    return p(d, fill, 'stroke-linejoin="round"');
  }

  /* ────────── 1. 보행자 8종 전원 흰색(#FFFFFF) + 킥보드 (viewBox 0 0 100 100) ────────── */
  var PEOPLE_SPEC = {
    old_m:   { cane: true },
    adult_m: {},
    teen_m:  { bag: true },
    child_m: { child: true },
    old_f:   { cane: true, female: true },
    adult_f: { female: true },
    teen_f:  { bag: true, female: true },
    child_f: { child: true, female: true, pigtails: true },
    adult:   {}
  };

  function whitePerson(kind) {
    if (kind === 'kickboard') {
      return '' +
        r(45, 16, 10, 68, 4, '#FFFFFF', 'stroke="#1E293B" stroke-width="2.4"') +
        ln(34, 24, 66, 24, '#FFFFFF', 6, '') +
        ln(34, 24, 66, 24, '#1E293B', 2.4, '') +
        c(50, 42, 11, '#FFFFFF', 'stroke="#1E293B" stroke-width="2.4"') +
        p('M35 55 Q50 47 65 55 L63 66 Q50 70 37 66 Z', '#FFFFFF', 'stroke="#1E293B" stroke-width="2.2"');
    }
    var o = PEOPLE_SPEC[kind] || {};
    var sc = o.child ? 0.78 : 1;
    var cy = 50;
    var st = 'stroke="#1E293B" stroke-width="' + f(2.3 / sc) + '" stroke-linejoin="round"';
    var W = '#FFFFFF';
    var inner = '';
    inner += '<ellipse cx="0" cy="40" rx="18" ry="4.5" fill="rgba(15,23,42,.26)"/>';
    inner += r(-10, 12, 8.5, 27, 4, W, st);
    inner += r(1.5, 12, 8.5, 27, 4, W, st);
    if (o.female) inner += p('M-13 -4 H13 L18 18 Q0 23 -18 18 Z', W, st);
    inner += p('M-13 -20 Q0 -26 13 -20 L11 10 Q0 14 -11 10 Z', W, st);
    inner += r(-20, -18, 6.5, 24, 3.2, W, st);
    if (!o.cane) inner += r(13.5, -18, 6.5, 24, 3.2, W, st);
    else {
      inner += r(13.5, -18, 6.5, 17, 3.2, W, st);
      inner += ln(19, -2, 24, 38, '#D97706', 3.4);
      inner += ln(24, 38, 28, 38, '#D97706', 3.2);
    }
    if (o.bag) inner += r(-11, -17, 22, 18, 4, '#E2E8F0', st);
    if (o.pigtails) inner += c(-14, -33, 4.5, W, st) + c(14, -33, 4.5, W, st);
    inner += c(0, -33, 9.5, W, st);
    if (o.female && !o.pigtails) inner += p('M-10 -34 A10 10 0 0 1 10 -34 L10 -26 Q0 -23 -10 -26 Z', '#E2E8F0', 'stroke="#1E293B" stroke-width="1.6"');
    return '<g transform="translate(50,' + f(cy) + ') scale(' + sc + ')">' + inner + '</g>';
  }

  /* ────────── 2. 파손부위 — 배경판 없는 투명 링/점 + 외곽선 글씨 ────────── */
  function damageMark(color, text, style, small) {
    var vb = '0 0 112 108';
    var cx = 56, cy = 42, rad = small ? 20 : 26;
    var s = '';
    if (style === 'dot' || style === 'dotdash') {
      /* 손상부위 — 빨간 점 + 흰 링 (점선형은 링을 점선으로) */
      var dotR = style === 'dotdash' ? rad * 0.78 : rad;
      s += c(cx, cy, dotR * 1.34, 'none', 'stroke="#FFFFFF" stroke-width="' + f(dotR * 0.26) + '"' +
        (style === 'dotdash' ? ' stroke-dasharray="' + f(dotR * 0.5) + ' ' + f(dotR * 0.34) + '"' : ''));
      s += c(cx, cy, dotR, '#EF4444');
      s += c(cx - dotR * 0.28, cy - dotR * 0.30, dotR * 0.26, 'rgba(255,255,255,.55)');
    } else if (style === 'ringdash') {
      s += c(cx, cy, rad, 'none', 'stroke="rgba(255,255,255,.92)" stroke-width="' + f(rad * 0.40) + '" stroke-dasharray="' + f(rad * 0.5) + ' ' + f(rad * 0.34) + '"');
      s += c(cx, cy, rad, 'none', 'stroke="' + color + '" stroke-width="' + f(rad * 0.22) + '" stroke-dasharray="' + f(rad * 0.5) + ' ' + f(rad * 0.34) + '"');
    } else if (style === 'dash') {
      /* 기존손상 — 초록 점선 링 (흰 밑선으로 대비 확보) */
      s += c(cx, cy, rad, 'none', 'stroke="rgba(255,255,255,.92)" stroke-width="' + f(rad * 0.42) + '" stroke-dasharray="' + f(rad * 0.52) + ' ' + f(rad * 0.40) + '"');
      s += c(cx, cy, rad, 'none', 'stroke="' + color + '" stroke-width="' + f(rad * 0.24) + '" stroke-dasharray="' + f(rad * 0.52) + ' ' + f(rad * 0.40) + '"');
    } else {
      /* 손상없음 — 파란 링 */
      s += c(cx, cy, rad, 'none', 'stroke="rgba(255,255,255,.92)" stroke-width="' + f(rad * 0.40) + '"');
      s += c(cx, cy, rad, 'none', 'stroke="' + color + '" stroke-width="' + f(rad * 0.22) + '"');
    }
    s += label(cx, 100, text, small ? 17 : 21);
    return { v: vb, s: s };
  }

  function damageLegend() {
    var items = [
      { x: 34, col: '#EF4444', style: 'dot', t: '손상부위' },
      { x: 110, col: '#22C55E', style: 'dash', t: '기존손상' },
      { x: 186, col: '#3B82F6', style: 'ring', t: '손상없음' }
    ];
    var s = '';
    items.forEach(function (it) {
      if (it.style === 'dot') s += c(it.x, 30, 15, it.col, 'stroke="#FFFFFF" stroke-width="4.5"');
      else if (it.style === 'dash') {
        s += c(it.x, 30, 15, 'none', 'stroke="rgba(255,255,255,.92)" stroke-width="6" stroke-dasharray="8 6"');
        s += c(it.x, 30, 15, 'none', 'stroke="' + it.col + '" stroke-width="3.4" stroke-dasharray="8 6"');
      } else {
        s += c(it.x, 30, 15, 'none', 'stroke="rgba(255,255,255,.92)" stroke-width="5.6"');
        s += c(it.x, 30, 15, 'none', 'stroke="' + it.col + '" stroke-width="3"');
      }
      s += label(it.x, 64, it.t, 15);
    });
    return { v: '0 0 220 76', s: s };
  }

  /* ────────── 3. 충격지점 — 6각 스파크 + 심플 점 + '충격' ────────── */
  function impactMark() {
    var cx = 60, cy = 50, s = '';
    s += p(starPath(cx, cy, 47, 22, 6), '#F4511E',
      'stroke="#FFFFFF" stroke-width="5" stroke-linejoin="round" paint-order="stroke"');
    s += p(starPath(cx, cy, 24, 11, 6), 'rgba(255,255,255,.20)');
    s += c(cx, cy, 12, '#FDE68A', 'stroke="#B33A0E" stroke-width="2.6"');
    s += label(cx, 124, '충격', 24);
    return { v: '0 0 120 132', s: s };
  }

  /* ────────── 4. 신호등 — 뒷면 기둥 + 앞면 굵은 방향 화살표 ────────── */
  var LAMP_ON = { red: '#EF4444', yellow: '#FBBF24', green: '#22C55E' };
  var LAMP_OFF = '#2C3A4C';
  var SIG_BODY = '#16233A';

  function lampMark(cx, cy, rad, colKey, arrow) {
    var s;
    if (colKey === 'off') s = c(cx, cy, rad, LAMP_OFF);
    else {
      s = c(cx, cy, rad, LAMP_ON[colKey]);
      s += c(cx - rad * 0.26, cy - rad * 0.30, rad * 0.30, 'rgba(255,255,255,.34)');
    }
    if (arrow) s += gArrow(cx, cy, rad * 0.88, arrow, colKey === 'off' ? '#57677C' : '#FFFFFF');
    return s;
  }

  /* cfg: { n:4, lamps:[{c:'red',a:''},…], ped:'green'|'red'|null } */
  var SIGS = {
    s4_go:       { lamps: [{ c: 'off' }, { c: 'off' }, { c: 'off' }, { c: 'green' }] },
    s4_left:     { lamps: [{ c: 'off' }, { c: 'off' }, { c: 'green', a: 'left' }, { c: 'off' }] },
    s4_go_left:  { lamps: [{ c: 'off' }, { c: 'off' }, { c: 'green', a: 'left' }, { c: 'green' }] },
    s4_red_left: { lamps: [{ c: 'red' }, { c: 'off' }, { c: 'green', a: 'left' }, { c: 'off' }] },
    sr_go:       { lamps: [{ c: 'off' }, { c: 'off' }, { c: 'green', a: 'right' }] },
    sr_stop:     { lamps: [{ c: 'red', a: 'right' }, { c: 'off' }, { c: 'off' }] },
    s3_red:      { lamps: [{ c: 'red' }, { c: 'off' }, { c: 'off' }] },
    s3_amber:    { lamps: [{ c: 'off' }, { c: 'yellow' }, { c: 'off' }] },
    s3_green:    { lamps: [{ c: 'off' }, { c: 'off' }, { c: 'green' }] }
  };
  /* 옛 이름(signal_01~08) → 새 이름 (저장된 작업·프리셋 호환) */
  var LEGACY_SIG = {
    signal: 's4_go', signal_01: 's4_go', signal_02: 's4_go_left', signal_03: 's4_red_left',
    signal_04: 's4_go', signal_05: 's3_green', signal_06: 's3_red', signal_07: 's3_green', signal_08: 's3_amber'
  };

  function trafficSignal(code) {
    var cfg = SIGS[code] || SIGS.s4_go;
    var n = cfg.lamps.length;
    var R = 13, GAP = 5, PAD = 8, POLE = 20, ARRH = 34, MG = 5;
    var HW = n * R * 2 + (n - 1) * GAP + PAD * 2;
    var HH = R * 2 + PAD * 2;
    var W = HW + MG * 2;
    var H = POLE + HH + ARRH + MG * 2;
    var hx = MG, hy = POLE;
    var s = '';
    /* 뒷면 기둥 (신호판 뒤에서 위로 솟은 기둥) */
    s += r(W / 2 - 4.5, 0, 9, POLE + 10, 4.5, '#7C8CA1', 'stroke="rgba(11,21,36,.35)" stroke-width="1"');
    /* 신호판 (앞면) */
    s += r(hx, hy, HW, HH, 11, SIG_BODY, 'stroke="#FFFFFF" stroke-width="2.6" stroke-opacity=".92"');
    s += r(hx + 3, hy + 3, HW - 6, HH - 6, 8.5, 'none', 'stroke="rgba(255,255,255,.10)" stroke-width="1.2"');
    cfg.lamps.forEach(function (L, i) {
      var cx = hx + PAD + R + i * (R * 2 + GAP);
      s += lampMark(cx, hy + HH / 2, R, L.c, L.a);
    });
    /* 앞면 굵은 방향 화살표 — 이 신호가 어느 방향을 보는지 */
    var ax = W / 2, ay = hy + HH - 6;
    s += p('M' + f(ax - 5.5) + ' ' + f(ay) + ' L' + f(ax + 5.5) + ' ' + f(ay) + ' L' + f(ax + 5.5) + ' ' + f(ay + 17) +
      ' L' + f(ax + 15) + ' ' + f(ay + 17) + ' L' + f(ax) + ' ' + f(ay + 34) + ' L' + f(ax - 15) + ' ' + f(ay + 17) +
      ' L' + f(ax - 5.5) + ' ' + f(ay + 17) + ' Z', '#FBBF24',
      'stroke="rgba(11,21,36,.55)" stroke-width="1.6" stroke-linejoin="round"');
    return { v: '0 0 ' + W + ' ' + H, s: s };
  }

  function pedSignal(green) {
    var W = 62, H = 122;
    var s = r(31 - 4.5, 0, 9, 16, 4.5, '#7C8CA1', 'stroke="rgba(11,21,36,.35)" stroke-width="1"');
    s += r(7, 10, 48, 78, 11, SIG_BODY, 'stroke="#FFFFFF" stroke-width="2.6" stroke-opacity=".92"');
    s += lampMark(31, 33, 14, green ? 'off' : 'red');
    s += lampMark(31, 65, 14, green ? 'green' : 'off');
    s += p('M31 ' + 118 + ' L17 ' + 98 + ' L45 ' + 98 + ' Z', green ? '#22C55E' : '#EF4444',
      'stroke="rgba(11,21,36,.5)" stroke-width="1.6" stroke-linejoin="round"');
    return { v: '0 0 ' + W + ' ' + H, s: s };
  }

  /* ────────── 5. 노면 도색 화살표 — 순수 흰색 + 얇은 어두운 외곽선 ────────── */
  var ROAD_POLY = {
    straight: 'M37 160 L37 64 L10 64 L50 8 L90 64 L63 64 L63 160 Z',
    left: 'M104 160 L104 40 Q104 31 95 31 L46 31 L46 8 L6 44 L46 80 L46 57 L67 57 Q76 57 76 66 L76 160 Z',
    right: 'M22 160 L22 40 Q22 31 31 31 L80 31 L80 8 L120 44 L80 80 L80 57 L59 57 Q50 57 50 66 L50 160 Z',
    uturn: 'M68 210 L68 40 A28 28 0 0 0 12 40 L12 170 L0 170 L22 214 L44 170 L32 170 L32 50 A8 8 0 0 1 48 50 L48 210 Z'
  };

  function roadPaint(kind) {
    var key = ROAD_POLY[kind] ? kind : 'straight';
    var vb = key === 'uturn' ? '0 0 80 220' : (key === 'left' || key === 'right') ? '0 0 126 168' : '0 0 100 168';
    return {
      v: vb,
      s: p(ROAD_POLY[key], '#FFFFFF',
        'stroke="#22303F" stroke-width="2.6" stroke-opacity=".55" stroke-linejoin="round" paint-order="stroke"')
    };
  }

  function stopBar() {
    var s = '';
    s += r(6, 6, 128, 15, 3, '#FFFFFF', 'stroke="#22303F" stroke-width="2.2" stroke-opacity=".45"');
    s += label(70, 56, '정지선', 28, 800, 0.11);
    return { v: '0 0 140 70', s: s };
  }

  /* ────────── 6. 건물 · 배경없는 횡단보도 · 차선 · 표지 ────────── */
  function building(small) {
    var W = small ? 72 : 112, H = small ? 72 : 112;
    var s = r(2, 2, W - 4, H - 4, 6, '#FFFFFF', 'stroke="#475569" stroke-width="2.6"');
    s += r(6, 6, W - 12, H - 12, 3, 'none', 'stroke="#CBD5E1" stroke-width="1.2"');
    if (small) s += tx(W / 2, H / 2 + 4, '건물', 15, '#1E293B', 800);
    else { s += tx(W / 2, H / 2 - 4, '약도용', 17, '#1E293B', 800); s += tx(W / 2, H / 2 + 18, '건물', 17, '#1E293B', 800); }
    return { v: '0 0 ' + W + ' ' + H, s: s };
  }

  function zebraCrosswalk(small) {
    var n = small ? 6 : 8, W = small ? 78 : 116, H = small ? 52 : 68;
    var step = W / n, bw = step * 0.56;
    var s = '';
    for (var i = 0; i < n; i++) {
      s += r(i * step + (step - bw) / 2, 4, bw, H - 8, 1.5, '#FFFFFF', 'stroke="#334155" stroke-width="1.2" stroke-opacity=".55"');
    }
    return { v: '0 0 ' + W + ' ' + H, s: s };
  }

  function pureLine(kind) {
    if (kind === 'lane_dash') {
      return { v: '0 0 28 240', s: ln(14, 6, 14, 234, '#FFFFFF', 5.5, 'stroke-dasharray="22 16" filter="drop-shadow(0 0 1px rgba(15,23,42,.8))"') };
    }
    if (kind === 'lane_solid') {
      return { v: '0 0 28 240', s: ln(14, 6, 14, 234, '#FFFFFF', 5.5, 'stroke="#FFFFFF"') + ln(14, 6, 14, 234, '#334155', 7.2, 'stroke-opacity=".28"') + ln(14, 6, 14, 234, '#FFFFFF', 5.2, '') };
    }
    if (kind === 'lane_center') {
      return { v: '0 0 32 240', s: ln(11, 6, 11, 234, '#FBBF24', 4.4) + ln(21, 6, 21, 234, '#FBBF24', 4.4) };
    }
    if (kind === 'lane_bus') {
      return { v: '0 0 28 240', s: ln(14, 6, 14, 234, '#38BDF8', 6) };
    }
    return null;
  }

  function blueSign(kind) {
    var R = 42, s = c(50, 50, R, '#1D4ED8', 'stroke="#FFFFFF" stroke-width="3.2"');
    var st = 'fill="none" stroke="#FFFFFF" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"';
    var head = function (x, y, ang) {
      var sz = 13;
      return '<path d="M' + f(x) + ' ' + f(y) + ' L' + f(x - sz * Math.cos(ang - 0.65)) + ' ' + f(y - sz * Math.sin(ang - 0.65)) +
        ' M' + f(x) + ' ' + f(y) + ' L' + f(x - sz * Math.cos(ang + 0.65)) + ' ' + f(y - sz * Math.sin(ang + 0.65)) + '" ' + st + '/>';
    };
    if (kind === 'sign_straight') {
      s += '<path d="M50 72 V30" ' + st + '/>' + head(50, 28, -Math.PI / 2);
    } else if (kind === 'sign_left') {
      s += '<path d="M62 70 V48 Q62 36 50 36 H32" ' + st + '/>' + head(30, 36, Math.PI);
    } else if (kind === 'sign_right') {
      s += '<path d="M38 70 V48 Q38 36 50 36 H68" ' + st + '/>' + head(70, 36, 0);
    } else if (kind === 'sign_uturn') {
      s += '<path d="M62 72 V42 A12 12 0 0 0 38 42 V64" ' + st + '/>' + head(38, 66, Math.PI / 2);
    } else if (kind === 'sign_left_uturn') {
      s += '<path d="M64 70 V52 Q64 42 52 42 H32" ' + st + '/>' + head(30, 42, Math.PI);
      s += '<path d="M36 70 V34 A10 10 0 0 1 56 34" ' + st + '/>';
    } else if (kind === 'sign_straight_right') {
      s += '<path d="M42 72 V30" ' + st + '/>' + head(42, 28, -Math.PI / 2);
      s += '<path d="M42 54 Q52 50 66 50" ' + st + '/>' + head(68, 50, 0);
    } else if (kind === 'sign_straight_left') {
      s += '<path d="M58 72 V30" ' + st + '/>' + head(58, 28, -Math.PI / 2);
      s += '<path d="M58 54 Q48 50 34 50" ' + st + '/>' + head(32, 50, Math.PI);
    }
    return { v: '4 4 92 92', s: s };
  }

  function textChip(labelTxt, accent) {
    var w = Math.max(76, labelTxt.length * 18 + 26);
    var s = r(2, 4, w - 4, 34, 17, '#FFFFFF', 'stroke="' + (accent || '#1E293B') + '" stroke-width="2.6"');
    s += tx(w / 2, 26, labelTxt, 15, '#0F172A', 800);
    return { v: '0 0 ' + w + ' 42', s: s };
  }

  /* ────────── 7. ART3 확장 연결 ────────── */
  window.ART3.car = function (style, kind, role) {
    var mapped = kind === 'minibus' ? 'bus' : (kind === 'special' || kind === 'dump') ? 'truck' : kind;
    return baseCar(style, mapped, role);
  };

  window.ART3.person = function (style, kind) {
    return whitePerson(kind);
  };

  window.ART3.sym = function (style, name) {
    /* 파손 · 충격 */
    if (name === 'damage') return damageMark('#EF4444', '손상부위', 'dot');
    if (name === 'damage_dash') return damageMark('#EF4444', '손상부위', 'dotdash');
    if (name === 'nodamage') return damageMark('#3B82F6', '손상없음', 'ring');
    if (name === 'nodamage_dash') return damageMark('#3B82F6', '손상없음', 'ringdash');
    if (name === 'existing') return damageMark('#22C55E', '기존손상', 'dash');
    if (name === 'existing_dash') return damageMark('#22C55E', '기존손상', 'dash');
    if (name === 'damage_legend') return damageLegend();
    if (name === 'impact') return impactMark();

    /* 노면 화살표 4종 */
    if (name === 'arrow') return roadPaint('straight');
    if (name === 'turn') return roadPaint('left');
    if (name === 'uturn') return roadPaint('uturn');
    if (name === 'chip_stop') return stopBar();

    /* 신호등 */
    if (SIGS[name]) return trafficSignal(name);
    if (LEGACY_SIG[name]) return trafficSignal(LEGACY_SIG[name]);
    if (name === 'pedsignal' || name === 'ped_g') return pedSignal(true);
    if (name === 'ped_r') return pedSignal(false);

    /* 건물 & 배경없는 횡단보도/차선 */
    if (name === 'building') return building(false);
    if (name === 'building_s') return building(true);
    if (name === 'crosswalk') return zebraCrosswalk(false);
    if (name === 'crosswalk_s') return zebraCrosswalk(true);
    var pl = pureLine(name);
    if (pl) return pl;

    /* 표지판 & 금지 X */
    if (name === 'sign_x') {
      return {
        v: '6 6 88 88',
        s: c(50, 50, 38, 'rgba(255,255,255,.92)', 'stroke="#94A3B8" stroke-width="2.4"') +
           ln(32, 32, 68, 68, '#EF4444', 9) + ln(68, 32, 32, 68, '#EF4444', 9)
      };
    }
    if (name.indexOf('sign_') === 0) return blueSign(name);
    if (name === 'chip_big') return textChip('大차로', '#1D4ED8');
    if (name === 'chip_small') return textChip('小차로', '#475569');

    return baseSym(style, name);
  };
})();
