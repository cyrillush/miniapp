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

  /* ────────── 카탈로그 ────────── */
  var CARS = [
    { k: 'sedan', n: '승용차', w: 56 },
    { k: 'suv', n: 'SUV', w: 60 },
    { k: 'truck', n: '화물트럭', w: 64 },
    { k: 'bus', n: '버스', w: 64 },
    { k: 'taxi', n: '택시', w: 56 },
    { k: 'moto', n: '오토바이', w: 30 },
    { k: 'bike', n: '자전거', w: 28 }
  ];
  var PEOPLE = [
    { k: 'adult', n: '보행자', w: 42 },
    { k: 'child', n: '어린이', w: 40 },
    { k: 'kickboard', n: '전동킥보드', w: 40 }
  ];
  var SYM = [
    { k: 'crosswalk', n: '횡단보도', g: 'road', w: 78 },
    { k: 'signal', n: '차량신호등', g: 'road', w: 46 },
    { k: 'pedsignal', n: '보행신호등', g: 'road', w: 44 },
    { k: 'chip_stop', n: '정지선', g: 'road', w: 72 },
    { k: 'chip_lane', n: '차선변경', g: 'road', w: 74 },
    { k: 'chip_oneway', n: '일방통행', g: 'road', w: 74 },
    { k: 'chip_unprot', n: '비보호', g: 'road', w: 70 },
    { k: 'lane_dash', n: '점선', g: 'road', w: 24 },
    { k: 'lane_center', n: '중앙선', g: 'road', w: 24 },
    { k: 'lane_solid', n: '실선', g: 'road', w: 24 },
    { k: 'arrow', n: '직진', g: 'acc', w: 46 },
    { k: 'turn', n: '좌회전', g: 'acc', w: 48, flip: false },
    { k: 'turn', n: '우회전', g: 'acc', w: 48, flip: true },
    { k: 'uturn', n: '유턴', g: 'acc', w: 54 },
    { k: 'impact', n: '충돌지점', g: 'acc', w: 50 },
    { k: 'damage', n: '파손부위', g: 'acc', w: 50 },
    { k: 'existing', n: '기존손상', g: 'acc', w: 44 },
    { k: 'nodamage', n: '손상없음', g: 'acc', w: 44 }
  ];

  var ROLE_NAME = { self: '자차', other: '대차', third: '제3차', c3: '제3차', c4: '제4차', c5: '제5차', c6: '제6차', c7: '제7차', c8: '제8차', none: '무' };
  var ROLE_SHORT = { self: '자차', other: '대차', third: '3차', c3: '3차', c4: '4차', c5: '5차', c6: '6차', c7: '7차', c8: '8차', none: '' };
  var ROLE_COLORS = {
    self: '#FF6B2C', other: '#2F6BFF', third: '#10B981', c3: '#10B981',
    c4: '#8B5CF6', c5: '#EC4899', c6: '#0EA5E9', c7: '#F59E0B', c8: '#6366F1', none: '#64748B'
  };
  var EXTRA_PAL = ['#10B981', '#8B5CF6', '#EC4899', '#0EA5E9', '#F59E0B', '#6366F1', '#14B8A6', '#E11D48'];

  function normRole(r) {
    if (!r) return 'self';
    if (r === 'third') return 'c3';
    return r;
  }

  function roleNum(r) {
    r = normRole(r);
    if (r === 'self') return 1;
    if (r === 'other') return 2;
    var m = String(r).match(/^c(\d+)$/);
    return m ? parseInt(m[1], 10) : 0;
  }

  function roleMeta(r) {
    r = normRole(r);
    if (r === 'none') return { key: 'none', label: '표시없음', short: '', color: '#64748B', num: 0 };
    if (r === 'self') return { key: 'self', label: '자차', short: '자차', color: ROLE_COLORS.self, num: 1 };
    if (r === 'other') return { key: 'other', label: '대차', short: '대차', color: ROLE_COLORS.other, num: 2 };
    var n = roleNum(r) || 3;
    var col = ROLE_COLORS['c' + n] || EXTRA_PAL[(n - 3) % EXTRA_PAL.length];
    return { key: 'c' + n, label: '제' + n + '차', short: n + '차', color: col, num: n };
  }

  function highestCarNum() {
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
    var list = ['self', 'other'];
    var mx = highestCarNum();
    for (var i = 3; i <= mx; i++) list.push('c' + i);
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
    if (!used.other) return 'other';
    for (var n = 3; n <= 30; n++) {
      if (!used['c' + n]) return 'c' + n;
    }
    return 'c3';
  }

  function vbox(s) {
    var p = String(s.v || '0 0 100 100').split(/[\s,]+/).map(Number);
    return { x: p[0] || 0, y: p[1] || 0, w: p[2] || 100, h: p[3] || 100 };
  }

  /* ────────── 상태 ────────── */
  var S = AS.S = {
    theme: 'A',
    bg: 'map',
    lock: false,
    objs: [],
    sel: null,
    view: { lat: 37.49794, lng: 127.02758, z: 19 },
    info: { when: '', place: '', note: '' },
    pen: { color: '#E9413B', mode: 'idle' },
    tool: 'idle',          // idle | pen | vec | memo
    newRole: 'self',
    carMode: 'real',       // real(실사 미니어처) | vector(플랫 벡터)
    snap: true,
    cap: { src: '', opacity: .92, scale: 1 },
    stage: { w: 390, h: 844 }
  };

  var KEY = 'accident-sketch-v3';
  var saveTimer = null;
  var undoStack = [];
  var redoGuard = false;
  var committed = null;

  function snapObjects() { return JSON.parse(JSON.stringify(S.objs)); }

  /* 각 동작이 끝난 뒤 호출: '직전 상태'를 스택에 넣고 현재를 새 기준선으로 삼는다 */
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
        localStorage.setItem(KEY, JSON.stringify({
          v: 3, theme: S.theme, bg: S.bg === 'capture' ? 'map' : S.bg, view: S.view,
          info: S.info, objs: S.objs, newRole: S.newRole, carMode: S.carMode, snap: S.snap,
          cap: S.cap.src && S.cap.src.length < 700000 ? S.cap : { src: '', opacity: S.cap.opacity, scale: S.cap.scale }
        }));
      } catch (e) { /* 용량 초과 등은 조용히 무시 */ }
    }, 350);
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return false;
      var d = JSON.parse(raw);
      if (!d || !d.objs) return false;
      S.objs = d.objs;
      S.theme = ['A', 'B', 'C', 'D'].indexOf(d.theme) >= 0 ? d.theme : 'A';
      S.bg = d.bg || 'map';
      S.view = d.view || S.view;
      S.info = d.info || S.info;
      S.newRole = normRole(d.newRole || 'self');
      S.carMode = d.carMode === 'vector' ? 'vector' : 'real';
      S.snap = d.snap !== false;
      if (d.cap) S.cap = d.cap;
      return true;
    } catch (e) { return false; }
  }

  function reset() {
    S.objs = []; S.sel = null; clearUndo(); committed = snapObjects();
    S.info = { when: '', place: '', note: '' };
    AS.objs.render(); AS.ui.selbar(); save();
  }

  /* ────────── id 중복 방지(SVG defs) ────────── */
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

  /* ────────── 아이템 → 객체 ────────── */
  function itemDef(kind, type) {
    var list = type === 'car' ? CARS : type === 'person' ? PEOPLE : SYM;
    for (var i = 0; i < list.length; i++) if (list[i].k === kind) return list[i];
    return null;
  }

  function makeObj(spec, lat, lng) {
    var o = { id: uid(), type: spec.type, kind: spec.kind, lat: lat, lng: lng, rot: 0, sc: 1 };
    if (spec.type === 'car') {
      o.role = spec.role || S.newRole;
      o.vb = { x: 0, y: 0, w: 120, h: 200 };
      o.w = spec.w;
    } else if (spec.type === 'person') {
      o.vb = { x: 0, y: 0, w: 100, h: 100 };
      o.w = spec.w;
    } else {
      var sym = window.ART3.sym(S.theme, spec.kind);
      o.vb = vbox(sym);
      o.w = spec.w;
      if (spec.flip) o.flip = true;
    }
    applySize(o);
    return o;
  }

  function applySize(o) {
    var vb = o.vb || { w: 100, h: 100 };
    o.h = o.w * (vb.h / vb.w);
  }

  AS.core = {
    $: $, $$: $$, clamp: clamp, uid: uid, vbox: vbox,
    CARS: CARS, PEOPLE: PEOPLE, SYM: SYM, ROLE_NAME: ROLE_NAME, ROLE_SHORT: ROLE_SHORT,
    normRole: normRole, roleNum: roleNum, roleMeta: roleMeta, roleList: roleList, nextCarRole: nextCarRole,
    itemDef: itemDef, makeObj: makeObj, applySize: applySize,
    pushUndo: pushUndo, undo: undo, clearUndo: clearUndo, syncUndo: syncUndo, baseline: baseline,
    save: save, load: load, reset: reset, nsMarkup: nsMarkup, snapObjects: snapObjects,
    KEY: KEY
  };
})(window.AS);
