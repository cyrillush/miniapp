/* ==========================================================================
   boot.js — 초기화 순서
   ========================================================================== */
(function (AS) {
  'use strict';

  function start() {
    var S = AS.S, C = AS.core;

    var restored = C.load();

    document.body.setAttribute('data-theme', S.theme);
    var meta = document.getElementById('metaTheme');
    var mc = { A: '#EEF2F8', B: '#05090D', C: '#0C1A2B', D: '#FBF3E4' };
    if (meta) meta.setAttribute('content', mc[S.theme] || '#EEF2F8');

    AS.view.init();          /* 화면 크기 · 배경(도로/사진) · 좌표 변환 */
    AS.objs.init();
    AS.ui.bind();
    if (AS.importx) AS.importx.bind();   /* 사진 붙여넣기 편집 모달 + 전역 paste */
    AS.ui.applyBtnSize(S.btnSize || 'md', true);

    AS.view.syncMode();
    AS.view.renderRoad();
    AS.view.renderPhoto();
    AS.view.applyTransform();
    AS.objs.render();
    AS.ui.syncTool();
    AS.ui.bgchips();

    C.baseline();
    C.syncUndo();
    var undoBtn = document.getElementById('btnUndo');
    if (undoBtn) undoBtn.disabled = true;

    setTimeout(function () {
      AS.view.measure();
      AS.view.renderRoad();
      AS.view.renderPhoto();
      AS.view.applyTransform();
      AS.objs.render();
      if (!restored) {
        AS.ui.toast('배경을 고르고 차량을 놓아 보세요', 1800);
      } else if (S.objs.length) {
        AS.ui.toast('작업하던 약도를 불러왔어요', 1800);
      }
    }, 240);

    /* 공유(share target)로 들어온 사진 + 서비스워커 등록 */
    if (AS.share) { AS.share.register(); setTimeout(AS.share.check, 80); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})(window.AS);
