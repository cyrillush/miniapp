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

  var ROLE_NAME = { self: '자차', other: '대차', third: '제3차', none: '무' };
  var ROLE_SHORT = { self: '자', other: '대', third: '3', none: '' };

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
    snap: true,
    cap: { src: '', opacity: .92, scale: 1 },
    stage: { w: 390, h: 844 }
  };

  var KEY = 'accident-sketch-v3';
  var saveTimer = null;
  var undoStack = [];
  var redoGuard = false;

  function snapObjects() { return JSON.parse(JSON.stringify(S.objs)); }

  function pushUndo() {
    if (redoGuard) return;
    undoStack.push(snapObjects());
    if (undoStack.length > 40) undoStack.shift();
    syncUndo();
  }
  function undo() {
    if (!undoStack.length) { AS.toast('되돌릴 작업이 없어요'); return; }
    var prev = undoStack.pop();
    redoGuard = true;
    S.objs = prev;
    S.sel = null;
    redoGuard = false;
    AS.objs.render(); AS.ui.selbar(); AS.save(); syncUndo();
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
          info: S.info, objs: S.objs, newRole: S.newRole, snap: S.snap,
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
      S.newRole = d.newRole || 'self';
      S.snap = d.snap !== false;
      if (d.cap) S.cap = d.cap;
      return true;
    } catch (e) { return false; }
  }

  function reset() {
    S.objs = []; S.sel = null; clearUndo();
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
    itemDef: itemDef, makeObj: makeObj, applySize: applySize,
    pushUndo: pushUndo, undo: undo, clearUndo: clearUndo, syncUndo: syncUndo,
    save: save, load: load, reset: reset, nsMarkup: nsMarkup, snapObjects: snapObjects,
    KEY: KEY
  };
})(window.AS);
