/* ==========================================================================
   core.js — 상태 · 카탈로그 · 저장 · 공통 유틸
   ========================================================================== */
window.AS = window.AS || {};
(function (AS) {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var uid = (function () { var n = 0; return function () { n += 1; return 'k' + n.toString(36) + Math.floor(Math.random() * 1e4).toString(36); }; })();

  /* ────────── 카탈로그 (삼성화재 사고약도 참고자료 전체 100% 포함) ────────── */
  var CARS = [
    { k: 'sedan', n: '승용차', w: 54 },
    { k: 'suv', n: 'SUV', w: 58 },
    { k: 'minibus', n: '소형버스', w: 62 },
    { k: 'bus', n: '중대형버스', w: 66 },
    { k: 'truck', n: '화물차', w: 64 },
    { k: 'special', n: '특수차', w: 62 },
    { k: 'taxi', n: '택시', w: 54 },
    { k: 'dump', n: '덤프트럭', w: 64 },
    { k: 'moto', n: '오토바이', w: 30 },
    { k: 'bike', n: '자전거', w: 28 }
  ];

  var PEOPLE = [
    { k: 'old_m', n: '노인', w: 40 },
    { k: 'adult_m', n: '성인', w: 40 },
    { k: 'teen_m', n: '청소년', w: 38 },
    { k: 'child_m', n: '어린이', w: 34 },
    { k: 'old_f', n: '할머니', w: 40 },
    { k: 'adult_f', n: '성인여성', w: 40 },
    { k: 'teen_f', n: '여학생', w: 38 },
    { k: 'child_f', n: '여자아이', w: 34 },
    { k: 'kickboard', n: '전동킥보드', w: 38 }
  ];

  var SYM = [
    // 파손부위 8종 (전부 투명 배경 · 링/점 + 외곽선 글씨)
    { k: 'damage', n: '손상부위', g: 'dmg', w: 64 },
    { k: 'damage_dash', n: '손상부위(점선)', g: 'dmg', w: 64 },
    { k: 'nodamage', n: '손상없음', g: 'dmg', w: 64 },
    { k: 'nodamage_dash', n: '손상없음(점선)', g: 'dmg', w: 64 },
    { k: 'existing', n: '기존손상', g: 'dmg', w: 64 },
    { k: 'existing_dash', n: '기존손상(점선)', g: 'dmg', w: 64 },
    { k: 'damage_legend', n: '파손부위 설명', g: 'dmg', w: 152 },
    { k: 'impact', n: '충격지점', g: 'dmg', w: 60 },

    // 경로 화살표 — 순수 흰색 노면 도색
    { k: 'arrow', n: '직진 화살표', g: 'acc', w: 44 },
    { k: 'turn', n: '좌회전 화살표', g: 'acc', w: 52, flip: false },
    { k: 'turn', n: '우회전 화살표', g: 'acc', w: 52, flip: true },
    { k: 'uturn', n: '유턴 화살표', g: 'acc', w: 40 },

    // 기타: 신호등 11종 — 실제 한국 교차로 신호 이름
    { k: 's4_go', n: '4구 직진(녹색)', g: 'sig', w: 88 },
    { k: 's4_left', n: '4구 좌회전(◀ 녹색)', g: 'sig', w: 88 },
    { k: 's4_go_left', n: '4구 직진+좌회전', g: 'sig', w: 88 },
    { k: 's4_red_left', n: '4구 적색+좌회전', g: 'sig', w: 88 },
    { k: 'sr_go', n: '우회전 신호(▶ 녹색)', g: 'sig', w: 76 },
    { k: 'sr_stop', n: '우회전 정지(▶ 적색)', g: 'sig', w: 76 },
    { k: 's3_red', n: '3구 적색', g: 'sig', w: 76 },
    { k: 's3_amber', n: '3구 황색', g: 'sig', w: 76 },
    { k: 's3_green', n: '3구 녹색', g: 'sig', w: 76 },
    { k: 'ped_g', n: '보행등(녹색)', g: 'sig', w: 34 },
    { k: 'ped_r', n: '보행등(적색)', g: 'sig', w: 34 },

    // 기타: 건물 · 횡단보도 · 차선 (전부 배경판 없음)
    { k: 'building', n: '건물', g: 'fac', w: 84 },
    { k: 'building_s', n: '건물(소)', g: 'fac', w: 56 },
    { k: 'crosswalk', n: '횡단보도', g: 'fac', w: 96 },
    { k: 'crosswalk_s', n: '횡단보도(소)', g: 'fac', w: 68 },
    { k: 'lane_dash', n: '점선', g: 'fac', w: 18 },
    { k: 'lane_solid', n: '실선', g: 'fac', w: 18 },
    { k: 'lane_center', n: '중앙선', g: 'fac', w: 20 },
    { k: 'lane_bus', n: '버스차선', g: 'fac', w: 18 },

    // 기타: 지시·규제 표지
    { k: 'sign_straight', n: '직진', g: 'sign', w: 42 },
    { k: 'sign_left', n: '좌회전', g: 'sign', w: 42 },
    { k: 'sign_right', n: '우회전', g: 'sign', w: 42 },
    { k: 'sign_uturn', n: '유턴', g: 'sign', w: 42 },
    { k: 'sign_left_uturn', n: '좌회전 및 유턴', g: 'sign', w: 42 },
    { k: 'sign_straight_right', n: '직진 및 우회전', g: 'sign', w: 42 },
    { k: 'sign_straight_left', n: '직진 및 좌회전', g: 'sign', w: 42 },
    { k: 'sign_x', n: '금지표시', g: 'sign', w: 40 },
    { k: 'chip_stop', n: '정지선', g: 'sign', w: 70 },
    { k: 'chip_lane', n: '차선변경', g: 'sign', w: 72 },
    { k: 'chip_oneway', n: '일방통행', g: 'sign', w: 72 },
    { k: 'chip_unprot', n: '비보호', g: 'sign', w: 68 },
    { k: 'chip_big', n: '大차로', g: 'sign', w: 64 },
    { k: 'chip_small', n: '小차로', g: 'sign', w: 64 }
  ];

  var ROLE_COLORS = {
    self: '#FF6B2C', c1: '#2F6BFF', c2: '#10B981', c3: '#8B5CF6',
    c4: '#EC4899', c5: '#0EA5E9', c6: '#F59E0B', c7: '#6366F1', c8: '#14B8A6', none: '#64748B'
  };
  var EXTRA_PAL = ['#2F6BFF', '#10B981', '#8B5CF6', '#EC4899', '#0EA5E9', '#F59E0B', '#6366F1', '#14B8A6', '#E11D48'];

  function normRole(r) {
    if (!r) return 'self';
    if (r === 'other') return 'c1';
    if (r === 'third') return 'c3';
    return r;
  }

  function roleNum(r) {
    r = normRole(r);
    if (r === 'self' || r === 'none') return 0;
    var m = String(r).match(/^c(\d+)$/);
    return m ? parseInt(m[1], 10) : 0;
  }

  function roleMeta(r) {
    r = normRole(r);
    if (r === 'none') return { key: 'none', label: '표시없음', short: '', color: '#64748B', num: 0 };
    if (r === 'self') return { key: 'self', label: '자차', short: '자차', color: ROLE_COLORS.self, num: 0 };
    var n = roleNum(r) || 1;
    var col = ROLE_COLORS['c' + n] || EXTRA_PAL[(n - 1) % EXTRA_PAL.length];
    return { key: 'c' + n, label: '대차' + n, short: '대차' + n, color: col, num: n };
  }

  function highestOtherNum() {
    var mx = 3;
    for (var i = 0; i < S.objs.length; i++) {
      var o = S.objs[i];
      if (o.type === 'car') {
        var n = roleNum(o.role);
        if (n > mx) mx = n;
      }
    }
    var nr = roleNum(S.newRole);
    if (nr > mx) mx = nr;
    return mx;
  }

  function roleList(includeNext) {
    var list = ['self'];
    var mx = highestOtherNum();
    for (var i = 1; i <= mx; i++) list.push('c' + i);
    if (includeNext) list.push('__next:' + (mx + 1));
    list.push('none');
    return list;
  }

  function nextCarRole() {
    var used = {};
    for (var i = 0; i < S.objs.length; i++) {
      var o = S.objs[i];
      if (o.type === 'car' && o.role && o.role !== 'none') used[normRole(o.role)] = 1;
    }
    if (!used.self) return 'self';
    for (var n = 1; n <= 30; n++) {
      if (!used['c' + n]) return 'c' + n;
    }
    return 'c1';
  }

  function vbox(s) {
    var p = String(s.v || '0 0 100 100').split(/[\s,]+/).map(Number);
    return { x: p[0] || 0, y: p[1] || 0, w: p[2] || 100, h: p[3] || 100 };
  }

  /* ────────── 상태 ────────── */
  var S = AS.S = {
    theme: 'A',
    mode: 'road',                 /* 'road' 도로 도면 | 'photo' 갤러리 사진 — 딱 두 가지 */
    roadId: 'lane4',
    btnSize: 'md',
    objs: [],
    sel: null,
    info: { when: '', place: '', note: '' },
    pen: { color: '#E9413B', mode: 'idle' },
    tool: 'idle',
    newRole: 'self',
    carMode: 'real',
    snap: true,
    /* 사진 배경 — 사진은 캔버스(월드) 좌표계에 꽉 차게 깔리고,
       그 위에 놓은 요소도 같은 월드 좌표계에 있어 사진과 함께 움직인다 */
    photo: { src: '', k: 1, rot: 0, tx: 0, ty: 0, locked: false },
    stage: { w: 390, h: 640 }
  };

  var KEY = 'accident-sketch-v4';
  var saveTimer = null;
  var undoStack = [];
  var redoGuard = false;
  var committed = null;

  function snapObjects() { return JSON.parse(JSON.stringify(S.objs)); }

  function pushUndo() {
    if (redoGuard) return;
    if (!committed) committed = snapObjects();
    undoStack.push(committed);
    if (undoStack.length > 40) undoStack.shift();
    committed = snapObjects();
    syncUndo();
  }
  function baseline() { committed = snapObjects(); }
  function undo() {
    if (!undoStack.length) { AS.toast('되돌릴 작업이 없어요'); return; }
    var prev = undoStack.pop();
    redoGuard = true;
    S.objs = prev;
    S.sel = null;
    committed = snapObjects();
    redoGuard = false;
    AS.objs.render(); AS.ui.selbar(); save(); syncUndo();
    AS.toast('실행취소');
  }
  function syncUndo() {
    var b = $('#btnUndo');
    if (b) b.disabled = !undoStack.length;
  }
  function clearUndo() { undoStack.length = 0; syncUndo(); }

  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        var ph = S.photo || {};
        localStorage.setItem(KEY, JSON.stringify({
          v: 9, theme: S.theme, mode: S.mode, roadId: S.roadId, info: S.info, objs: S.objs,
          newRole: S.newRole, carMode: S.carMode, snap: S.snap, btnSize: S.btnSize,
          photo: {
            src: ph.src && ph.src.length < 700000 ? ph.src : '',
            k: ph.k, rot: ph.rot, tx: ph.tx, ty: ph.ty, locked: !!ph.locked
          }
        }));
      } catch (e) {}
    }, 350);
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return false;
      var d = JSON.parse(raw);
      if (!d || !d.objs) return false;
      S.theme = ['A', 'B', 'C', 'D'].indexOf(d.theme) >= 0 ? d.theme : 'A';
      S.objs = d.objs.filter(function (o) {
        return o && isFinite(o.x) && isFinite(o.y);    /* v4 이전 지도 좌표 저장본은 버린다 */
      }).map(function (o) {
        if (o.type === 'car' && o.role) o.role = normRole(o.role);
        if (o.type === 'sym') refreshVb(o);
        return o;
      });
      S.mode = d.mode === 'photo' ? 'photo' : 'road';
      S.roadId = d.roadId || 'lane4';
      S.info = d.info || S.info;
      S.newRole = normRole(d.newRole || 'self');
      S.carMode = d.carMode === 'vector' ? 'vector' : 'real';
      S.snap = d.snap !== false;
      S.btnSize = ['sm', 'md', 'lg'].indexOf(d.btnSize) >= 0 ? d.btnSize : 'md';
      if (d.photo) {
        S.photo = {
          src: d.photo.src || '',
          k: isFinite(d.photo.k) ? d.photo.k : 1,
          rot: isFinite(d.photo.rot) ? d.photo.rot : 0,
          tx: isFinite(d.photo.tx) ? d.photo.tx : 0,
          ty: isFinite(d.photo.ty) ? d.photo.ty : 0,
          locked: !!d.photo.locked
        };
      }
      return true;
    } catch (e) { return false; }
  }

  function reset() {
    S.objs = []; S.sel = null; clearUndo(); committed = snapObjects();
    S.info = { when: '', place: '', note: '' };
    AS.objs.render(); AS.ui.selbar(); save();
  }

  /* 화면 위에 놓은 요소·그림만 비운다 (배경·지도·캡처·도로는 그대로 · 실행취소 가능) */
  function clearElements() {
    pushUndo();
    S.objs = [];
    S.sel = null;
    AS.objs.render();
    AS.ui.selbar();
    save();
  }

  function nsMarkup(markup, ns) {
    var ids = {}, re = /\sid="([^"]+)"/g, m;
    while ((m = re.exec(markup))) ids[m[1]] = 1;
    if (!Object.keys(ids).length) return markup;
    return markup.replace(/\sid="([^"]+)"/g, function (_, id) {
      return ' id="' + (ids[id] ? ns + '_' + id : id) + '"';
    }).replace(/url\(#([^)]+)\)/g, function (_, id) {
      return 'url(#' + (ids[id] ? ns + '_' + id : id) + ')';
    });
  }

  function itemDef(kind, type) {
    var list = type === 'car' ? CARS : type === 'person' ? PEOPLE : SYM;
    for (var i = 0; i < list.length; i++) if (list[i].k === kind) return list[i];
    return null;
  }

  function makeObj(spec, x, y) {
    var def = itemDef(spec.kind, spec.type) || {};
    var o = { id: uid(), type: spec.type, kind: spec.kind, x: x, y: y, rot: 0, sc: 1 };
    if (spec.type === 'car') {
      o.role = normRole(spec.role || S.newRole);
      o.vb = { x: 0, y: 0, w: 120, h: 200 };
      o.w = spec.w || def.w || 54;
    } else if (spec.type === 'person') {
      o.vb = { x: 0, y: 0, w: 100, h: 100 };
      o.w = spec.w || def.w || 38;
    } else {
      var sym = window.ART3.sym(S.theme, spec.kind);
      o.vb = vbox(sym);
      o.w = spec.w || def.w || 42;
      if (spec.flip) o.flip = true;
    }
    applySize(o);
    return o;
  }

  /* 저장된 기호 요소의 vb(비율)를 지금 그림과 맞춘다 — v3.7 신호등(아래 화살표 포함)·유턴 화살표
     등 모양이 바뀐 요소도 이전 저장본을 열었을 때 새 모양·새 크기로 보이게 하는 호환 처리 */
  function refreshVb(o) {
    if (!window.ART3 || !window.ART3.sym || !o.kind) return;
    try {
      var sym = window.ART3.sym(S.theme, o.kind);
      if (!sym || !sym.v) return;
      var nv = vbox(sym), ov = o.vb || nv;
      if (Math.abs(nv.w / ov.w - 1) > 0.002 || Math.abs(nv.h / ov.h - 1) > 0.002) {
        o.vb = nv;
        applySize(o);
      }
    } catch (e) {}
  }

  function applySize(o) {
    var vb = o.vb || { w: 100, h: 100 };
    o.h = o.w * (vb.h / vb.w);
  }

  AS.core = {
    $: $, $$: $$, clamp: clamp, uid: uid, vbox: vbox,
    CARS: CARS, PEOPLE: PEOPLE, SYM: SYM,
    normRole: normRole, roleNum: roleNum, roleMeta: roleMeta, roleList: roleList, nextCarRole: nextCarRole,
    itemDef: itemDef, makeObj: makeObj, applySize: applySize,
    pushUndo: pushUndo, undo: undo, clearUndo: clearUndo, syncUndo: syncUndo, baseline: baseline,
    save: save, load: load, reset: reset, clearElements: clearElements, nsMarkup: nsMarkup, snapObjects: snapObjects,
    KEY: KEY
  };
})(window.AS);
