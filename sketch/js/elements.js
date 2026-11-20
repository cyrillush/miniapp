/* ==========================================================================
   elements.js — 참고 어플(삼성화재 사고약도) 100% 전체 요소 라이브러리
   - 보행자 8종 전원 흰색(#FFFFFF) + 얇은 외곽선(배경판 없음)
   - 파손부위 8종(실선/점선/범례/충격지점) 전부 투명 배경
   - 신호등 10종(01~08 + 보행등 2종) + 건물(대/소)
   - 횡단보도(대/소) · 차선(점선/실선/중앙선/버스차선) 배경 없이 알맹이만
   - 지시·규제 표지 14종 + 경로 화살표 4종
   ========================================================================== */
(function () {
  'use strict';
  if (!window.ART3) return;
  var baseCar = window.ART3.car;
  var baseSym = window.ART3.sym;

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
    return '<text x="' + f(x) + '" y="' + f(y) + '" font-size="' + size + '" font-weight="' + (weight || 800) + '" fill="' + fill + '" text-anchor="middle" font-family="Pretendard,Apple SD Gothic Neo,Noto Sans KR,sans-serif"' + (ex ? ' ' + ex : '') + '>' + s + '</text>';
  };

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
    // 그림자
    inner += '<ellipse cx="0" cy="40" rx="18" ry="4.5" fill="rgba(15,23,42,.26)"/>';
    // 다리
    inner += r(-10, 12, 8.5, 27, 4, W, st);
    inner += r(1.5, 12, 8.5, 27, 4, W, st);
    // 치마 (여성)
    if (o.female) {
      inner += p('M-13 -4 H13 L18 18 Q0 23 -18 18 Z', W, st);
    }
    // 몸통
    inner += p('M-13 -20 Q0 -26 13 -20 L11 10 Q0 14 -11 10 Z', W, st);
    // 팔
    inner += r(-20, -18, 6.5, 24, 3.2, W, st);
    if (!o.cane) inner += r(13.5, -18, 6.5, 24, 3.2, W, st);
    else {
      inner += r(13.5, -18, 6.5, 17, 3.2, W, st);
      inner += ln(19, -2, 24, 38, '#D97706', 3.4);
      inner += ln(24, 38, 28, 38, '#D97706', 3.2);
    }
    // 가방
    if (o.bag) {
      inner += r(-11, -17, 22, 18, 4, '#E2E8F0', st);
    }
    // 머리
    if (o.pigtails) {
      inner += c(-14, -33, 4.5, W, st) + c(14, -33, 4.5, W, st);
    }
    inner += c(0, -33, 9.5, W, st);
    if (o.female && !o.pigtails) {
      inner += p('M-10 -34 A10 10 0 0 1 10 -34 L10 -26 Q0 -23 -10 -26 Z', '#E2E8F0', 'stroke="#1E293B" stroke-width="1.6"');
    }
    return '<g transform="translate(50,' + f(cy) + ') scale(' + sc + ')">' + inner + '</g>';
  }

  /* ────────── 2. 파손부위 8종 (전부 투명 배경 — 검은 사각 박스 제거) ────────── */
  function damageRing(color, t1, t2, dashed, small) {
    var rad = small ? 28 : 38;
    var dash = dashed ? ' stroke-dasharray="6.5 4.8"' : '';
    var fs = small ? 11.5 : 14.5;
    var s = '';
    s += c(50, 50, rad, 'none', 'stroke="#FFFFFF" stroke-width="' + (small ? 7 : 8) + '"' + dash + ' stroke-opacity="0.92"');
    s += c(50, 50, rad, 'none', 'stroke="' + color + '" stroke-width="' + (small ? 4.4 : 5.4) + '"' + dash);
    s += tx(50, 50 - fs * 0.16, t1, fs, '#FFFFFF', 900, 'paint-order="stroke" stroke="#0F172A" stroke-width="4.2" stroke-linejoin="round"');
    s += tx(50, 50 + fs * 0.92, t2, fs, '#FFFFFF', 900, 'paint-order="stroke" stroke="#0F172A" stroke-width="4.2" stroke-linejoin="round"');
    return { v: '4 4 92 92', s: s };
  }

  function damageLegend() {
    var items = [
      { x: 26, col: '#EF4444', l1: '손상', l2: '부위' },
      { x: 74, col: '#22C55E', l1: '기존', l2: '손상' },
      { x: 122, col: '#3B82F6', l1: '손상', l2: '없음' }
    ];
    var s = '';
    items.forEach(function (it) {
      s += c(it.x, 26, 20, 'none', 'stroke="#FFFFFF" stroke-width="5.6"');
      s += c(it.x, 26, 20, 'none', 'stroke="' + it.col + '" stroke-width="3.6"');
      s += tx(it.x, 24, it.l1, 9.5, '#FFFFFF', 900, 'paint-order="stroke" stroke="#0F172A" stroke-width="3.2" stroke-linejoin="round"');
      s += tx(it.x, 35, it.l2, 9.5, '#FFFFFF', 900, 'paint-order="stroke" stroke="#0F172A" stroke-width="3.2" stroke-linejoin="round"');
    });
    return { v: '0 0 148 52', s: s };
  }

  /* ────────── 3. 신호등 10종 (01~08 + 보행등 2종) ────────── */
  var LAMP = { off: '#334155', red: '#EF4444', yellow: '#FBBF24', green: '#22C55E' };
  function signalLamp(cx, cy, rad, col, leftArrow) {
    var s = c(cx, cy, rad, col === 'off' ? LAMP.off : col);
    if (col !== 'off') s += c(cx, cy, rad * 0.5, 'rgba(255,255,255,.35)');
    if (leftArrow) {
      s += p('M' + f(cx + rad * 0.42) + ' ' + f(cy) + ' L' + f(cx - rad * 0.25) + ' ' + f(cy - rad * 0.42) + ' L' + f(cx - rad * 0.25) + ' ' + f(cy + rad * 0.42) + ' Z', '#052E16');
    }
    return s;
  }

  function trafficSignal(code) {
    var cfg = {
      signal_01: { n: 4, st: ['off', 'off', 'off', 'green'] },
      signal_02: { n: 4, st: ['off', 'green', 'off', 'green'], arr: 1 },
      signal_03: { n: 4, st: ['red', 'off', 'green', 'off'], arr: 2 },
      signal_04: { n: 4, st: ['red', 'off', 'off', 'green'] },
      signal_05: { n: 3, st: ['off', 'off', 'green'] },
      signal_06: { n: 3, st: ['red', 'off', 'off'] },
      signal_07: { n: 3, st: ['off', 'off', 'off'] },
      signal_08: { n: 3, st: ['off', 'yellow', 'off'] }
    }[code] || { n: 3, st: ['off', 'off', 'green'] };
    var rad = 11, gap = 5, pad = 7;
    var W = cfg.n * (rad * 2) + (cfg.n - 1) * gap + pad * 2;
    var H = rad * 2 + pad * 2;
    var s = r(0, 0, W, H, 7, '#1E293B', 'stroke="#FFFFFF" stroke-width="1.8" stroke-opacity=".85"');
    cfg.st.forEach(function (col, i) {
      var cx = pad + rad + i * (rad * 2 + gap);
      s += signalLamp(cx, H / 2, rad, col, cfg.arr === i);
    });
    return { v: '-2 -2 ' + (W + 4) + ' ' + (H + 4), s: s };
  }

  function pedSignal(green) {
    var s = r(4, 4, 44, 86, 8, '#1E293B', 'stroke="#FFFFFF" stroke-width="1.8"');
    s += c(26, 26, 13, green ? LAMP.off : LAMP.red);
    s += c(26, 68, 13, green ? LAMP.green : LAMP.off);
    s += p('M26 17 a3 3 0 1 1 0 6 a3 3 0 0 1 0 -6 z M21 24 h10 l-1 8 h-8 z', green ? '#1E293B' : '#450A0A');
    s += p('M26 59 a3 3 0 1 1 0 6 a3 3 0 0 1 0 -6 z M23 66 h6 l3 9 h-3.5 l-2.5 -5 l-2.5 5 h-3.5 z', green ? '#052E16' : '#1E293B');
    return { v: '0 0 52 94', s: s };
  }

  /* ────────── 4. 건물 · 배경없는 횡단보도 · 배경없는 차선 · 표지 ────────── */
  function building(small) {
    var W = small ? 72 : 112, H = small ? 72 : 112;
    var s = r(2, 2, W - 4, H - 4, 6, '#FFFFFF', 'stroke="#475569" stroke-width="2.6"');
    s += r(6, 6, W - 12, H - 12, 3, 'none', 'stroke="#CBD5E1" stroke-width="1.2"');
    if (small) s += tx(W / 2, H / 2 + 4, '건물', 15, '#1E293B', 800);
    else { s += tx(W / 2, H / 2 - 4, '약도용', 17, '#1E293B', 800); s += tx(W / 2, H / 2 + 18, '건물', 17, '#1E293B', 800); }
    return { v: '0 0 ' + W + ' ' + H, s: s };
  }

  function zebraCrosswalk(small) {
    // 배경 아스팔트 판 없이 순수 흰 줄무늬만!
    var n = small ? 6 : 8, W = small ? 78 : 116, H = small ? 52 : 68;
    var step = W / n, bw = step * 0.56;
    var s = '';
    for (var i = 0; i < n; i++) {
      s += r(i * step + (step - bw) / 2, 4, bw, H - 8, 1.5, '#FFFFFF', 'stroke="#334155" stroke-width="1.2" stroke-opacity=".55"');
    }
    return { v: '0 0 ' + W + ' ' + H, s: s };
  }

  function pureLine(kind) {
    // 배경판 전혀 없이 순수 차선만!
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

  function textChip(label, accent) {
    var w = Math.max(76, label.length * 18 + 26);
    var s = r(2, 4, w - 4, 34, 17, '#FFFFFF', 'stroke="' + (accent || '#1E293B') + '" stroke-width="2.6"');
    s += tx(w / 2, 26, label, 15, '#0F172A', 800);
    return { v: '0 0 ' + w + ' 42', s: s };
  }

  /* ────────── 5. ART3 확장 연결 ────────── */
  window.ART3.car = function (style, kind, role) {
    var mapped = kind === 'minibus' ? 'bus' : (kind === 'special' || kind === 'dump') ? 'truck' : kind;
    return baseCar(style, mapped, role);
  };

  window.ART3.person = function (style, kind) {
    return whitePerson(kind);
  };

  window.ART3.sym = function (style, name) {
    // 파손 8종 (배경판 없음)
    if (name === 'damage') return damageRing('#EF4444', '손상', '부위', false, false);
    if (name === 'damage_dash') return damageRing('#EF4444', '손상', '부위', true, false);
    if (name === 'nodamage') return damageRing('#3B82F6', '손상', '없음', false, false);
    if (name === 'nodamage_dash') return damageRing('#3B82F6', '손상', '없음', true, false);
    if (name === 'existing') return damageRing('#22C55E', '기존', '손상', false, false);
    if (name === 'existing_dash') return damageRing('#22C55E', '기존', '손상', true, false);
    if (name === 'damage_legend') return damageLegend();

    // 신호등 10종
    if (name.indexOf('signal_') === 0) return trafficSignal(name);
    if (name === 'signal') return trafficSignal('signal_01');
    if (name === 'pedsignal' || name === 'ped_g') return pedSignal(true);
    if (name === 'ped_r') return pedSignal(false);

    // 건물 & 배경없는 횡단보도/차선
    if (name === 'building') return building(false);
    if (name === 'building_s') return building(true);
    if (name === 'crosswalk') return zebraCrosswalk(false);
    if (name === 'crosswalk_s') return zebraCrosswalk(true);
    var pl = pureLine(name);
    if (pl) return pl;

    // 표지판 & 금지 X
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
