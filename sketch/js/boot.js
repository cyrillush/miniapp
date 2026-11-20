/* ==========================================================================
   boot.js — 초기화 순서
   ========================================================================== */
(function (AS) {
  'use strict';

  function start() {
    var S = AS.S, C = AS.core;

    AS.ui.measure();
    var restored = C.load();

    document.body.setAttribute('data-theme', S.theme);
    var meta = document.getElementById('metaTheme');
    var mc = { A: '#EEF2F8', B: '#05090D', C: '#0C1A2B', D: '#FBF3E4' };
    if (meta) meta.setAttribute('content', mc[S.theme] || '#EEF2F8');

    AS.mapx.init();
    AS.objs.init();
    AS.ui.bind();

    if (S.cap && S.cap.src) {
      var ci = document.getElementById('capImg');
      if (ci) ci.src = S.cap.src;
    }
    AS.mapx.setBg(S.bg || 'sat');
    AS.ui.bgchips();
    AS.ui.syncTool();
    AS.mapx.applyBearing();
    AS.mapx.applyLock();
    C.baseline();
    C.syncUndo();
    document.getElementById('btnUndo').disabled = true;

    if (S.info.place) {
      var t = document.getElementById('placeTxt');
      if (t) { t.textContent = S.info.place; document.getElementById('searchPill').classList.add('has'); }
    }

    setTimeout(function () {
      AS.ui.measure();
      AS.mapx.map && AS.mapx.map.invalidateSize();
      AS.objs.render();
      if (!restored) {
        AS.ui.toast('지도에서 위치를 잡고 차량을 놓아 보세요', 2600);
      } else if (S.objs.length) {
        AS.ui.toast('작업하던 약도를 불러왔어요', 1800);
      }
    }, 260);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})(window.AS);
