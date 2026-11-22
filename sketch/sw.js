/* ==========================================================================
   sw.js — 사고약도 서비스워커 (v5.0)
   카카오맵 스카이뷰 캡처를 '공유 → 사고약도'로 넘겼을 때, PWA share_target 이
   이 주소(scope/share-target)로 multipart POST 를 보낸다. 받은 이미지를
   IndexedDB 에 넣고 앱(index.html?shared=1)으로 되돌린다. 앱이 켜지면서
   IndexedDB 의 pending 이미지를 읽어 배경으로 깐다.

   v5.0 — 캐시 이름에 판번호를 넣고, 활성화될 때 이전 판 캐시를 지운다.
   (예전 판의 index.html·app.css 가 남아 화면이 섞이지 않게)
   ========================================================================== */
'use strict';

var CACHE_NAME = 'accident-sketch-v5.0';
var DB = 'accident-sketch-share';
var STORE = 'files';
var KEY = 'pending';

function openDb() {
  return new Promise(function (resolve, reject) {
    if (!self.indexedDB) return reject(new Error('no-idb'));
    var req = indexedDB.open(DB, 1);
    req.onupgradeneeded = function () {
      var db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = function () { resolve(req.result); };
    req.onerror = function () { reject(req.error); };
  });
}

function putPending(file) {
  return openDb().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ blob: file, type: file.type || 'image/png', name: file.name || 'share.png', at: Date.now() }, KEY);
      tx.oncomplete = function () { resolve(true); };
      tx.onerror = function () { reject(tx.error); };
    });
  });
}

function pickImage(form) {
  var file = form.get('image');
  if (file && file.size) return file;
  var vals = [];
  try { vals = Array.prototype.slice.call(form.values()); } catch (e) { vals = []; }
  for (var i = 0; i < vals.length; i++) {
    var v = vals[i];
    if (v && typeof v === 'object' && v.size && /^image\//.test(v.type || '')) return v;
  }
  return null;
}

function handleShare(req) {
  return req.formData().then(function (form) {
    var file = pickImage(form);
    if (!file) return false;
    return putPending(file);
  }).then(function (ok) {
    return Response.redirect(new URL('index.html?shared=' + (ok ? '1' : '0'), self.registration.scope).href, 303);
  }).catch(function () {
    return Response.redirect(new URL('index.html?shared=0', self.registration.scope).href, 303);
  });
}

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return (k !== CACHE_NAME && /^accident-sketch/.test(k)) ? caches.delete(k) : null;
      }));
    }).then(function () { return self.clients.claim(); }).catch(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var url = new URL(event.request.url);
  if (event.request.method === 'POST' && /\/share-target\/?$/.test(url.pathname)) {
    event.respondWith(handleShare(event.request));
  }
});
