/* ==========================================================================
   share.js — 공유(share target)로 들어온 배경 사진 받기 (v3.8)
   카카오맵 스카이뷰를 캡처 → 공유 → 사고약도 를 고르면, sw.js 가 이미지를
   IndexedDB 에 넣고 index.html?shared=1 로 보낸다. 여기서 그 이미지를 꺼내
   캡처 배경으로 깔고 안내 토스트를 띄운다. (갤러리 업로드 흐름은 그대로)
   ========================================================================== */
(function (AS) {
  'use strict';
  var DB = 'accident-sketch-share', STORE = 'files', KEY = 'pending';
  var MAXPX = 1600, MAXLEN = 620000;

  function openDb() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) return reject(new Error('no-idb'));
      var req = indexedDB.open(DB, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  /* pending 이미지를 꺼내고 저장소에서 지운다 (한 번만 반영) */
  function takePending() {
    return openDb().then(function (db) {
      return new Promise(function (resolve) {
        var tx = db.transaction(STORE, 'readwrite');
        var st = tx.objectStore(STORE);
        var g = st.get(KEY);
        g.onsuccess = function () {
          var v = g.result;
          if (!v || !v.blob) return resolve(null);
          try { st.delete(KEY); } catch (e) {}
          resolve(v);
        };
        g.onerror = function () { resolve(null); };
      });
    }).catch(function () { return null; });
  }

  function readAsDataUrl(blob) {
    return new Promise(function (resolve) {
      var fr = new FileReader();
      fr.onload = function () { resolve(fr.result); };
      fr.onerror = function () { resolve(null); };
      fr.readAsDataURL(blob);
    });
  }

  /* 저장(localStorage) 한도를 넘지 않게 긴 변 1600px 로 줄이고, 그래도 크면 JPEG */
  function fitForSave(blob) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function () {
        try {
          var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
          var k = Math.min(1, MAXPX / Math.max(w, h));
          var cv = document.createElement('canvas');
          cv.width = Math.max(1, Math.round(w * k));
          cv.height = Math.max(1, Math.round(h * k));
          var cx = cv.getContext('2d');
          cx.drawImage(img, 0, 0, cv.width, cv.height);
          var out = cv.toDataURL('image/png');
          if (out.length > MAXLEN) {
            cx.fillStyle = '#FFFFFF';
            cx.fillRect(0, 0, cv.width, cv.height);
            cx.drawImage(img, 0, 0, cv.width, cv.height);
            out = cv.toDataURL('image/jpeg', 0.88);
          }
          URL.revokeObjectURL(url);
          resolve(out);
        } catch (e) {
          URL.revokeObjectURL(url);
          readAsDataUrl(blob).then(resolve);
        }
      };
      img.onerror = function () { URL.revokeObjectURL(url); readAsDataUrl(blob).then(resolve); };
      img.src = url;
    });
  }

  function apply(dataUrl) {
    var S = AS.S;
    S.cap.src = dataUrl;
    S.cap.base = null;
    var ci = document.getElementById('capImg');
    if (ci) ci.src = dataUrl;
    AS.mapx.setBg('capture');
    AS.ui.syncCapture();
    AS.core.save();
    AS.ui.toast('공유한 사진을 배경으로 넣었습니다 — 사진 교체로 바꿀 수 있어요', 3200);
  }

  function check() {
    var q = (location.search || '');
    if (q.indexOf('shared=') < 0) return;
    try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {}
    if (q.indexOf('shared=0') >= 0) {
      AS.ui.toast('공유한 사진을 받지 못했어요 — 배경 사진에서 갤러리로 골라 주세요', 3000);
      return;
    }
    takePending().then(function (v) {
      if (!v || !v.blob) { AS.ui.toast('공유한 사진이 없습니다 — 배경 사진에서 골라 주세요', 2600); return; }
      return fitForSave(v.blob).then(function (d) {
        if (d) apply(d);
        else AS.ui.toast('공유한 사진을 읽지 못했어요', 2600);
      });
    }).catch(function () {});
  }

  function register() {
    if (!('serviceWorker' in navigator)) return;
    var okProto = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!okProto) return;
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }

  AS.share = { check: check, register: register, takePending: takePending, fitForSave: fitForSave };
})(window.AS);
