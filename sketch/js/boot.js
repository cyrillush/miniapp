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
    AS.ui.applyBtnSize(S.btnSize || 'md', true);

    if (S.cap && S.cap.src) {
      var ci = document.getElementById('capImg');
      if (ci) ci.src = S.cap.src;
    }
    AS.mapx.setBg(S.bg || 'road');
    AS.ui.bgchips();
    AS.ui.syncTool();
    AS.ui.syncCapture();
    AS.mapx.applyBearing();
    AS.mapx.applyTilt();
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
        AS.ui.toast('도로를 고르거나 배경 사진을 넣고 차량을 놓아 보세요', 2600);
      } else if (S.objs.length) {
        AS.ui.toast('작업하던 약도를 불러왔어요', 1800);
      }
    }, 260);

    /* 공유(share target)로 들어온 배경 사진 + 서비스워커 등록 */
    if (AS.share) { AS.share.register(); setTimeout(AS.share.check, 60); }

    /* 내 위치 — 이미 위치 권한을 허용(granted)한 경우에만 팝업 없이 조용히 찍어 둔다.
       거부·미요청 상태에서는 브라우저 권한 팝업을 띄우지 않는다(상단 현위치 버튼으로만 요청). */
    autoGps();
  }

  function autoGps() {
    if (!navigator.geolocation || !navigator.permissions || !navigator.permissions.query) return;
    navigator.permissions.query({ name: 'geolocation' }).then(function (st) {
      if (!st || st.state !== 'granted') return;
      AS.mapx.geolocate().then(function (p) {
        AS.mapx.setGps(p);
        AS.mapx.layoutGps();
      }).catch(function () {});
    }).catch(function () {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})(window.AS);
