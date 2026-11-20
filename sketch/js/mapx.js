/* ==========================================================================
   mapx.js — Leaflet 지도 · 배경 타일 · 잠금 · 주소검색(Photon+Nominatim) · GPS
   ========================================================================== */
window.AS = window.AS || {};
(function (AS) {
  'use strict';
  var $ = AS.core.$, S = AS.S;

  var map = null, layers = {}, cur = null;

  /* 타일: API 키 없이 쓸 수 있는 소스만 사용 (CARTO·Stadia·VWorld 등은 키 필요)
     일반지도/도로도면/다크 = 같은 OSM 타일에 CSS 필터만 달리 적용 */
  var BASE = 'https://tile.openstreetmap.de/{z}/{x}/{y}.png';
  var BASE_ATTR = '© OpenStreetMap contributors · 타일 FOSSGIS';
  var TILES = {
    map: { url: BASE, opt: { maxNativeZoom: 19, maxZoom: 20, attribution: BASE_ATTR }, filter: 'saturate(.55) brightness(1.04) contrast(.95)' },
    road: { url: BASE, opt: { maxNativeZoom: 19, maxZoom: 20, attribution: BASE_ATTR }, filter: 'grayscale(1) brightness(1.12) contrast(.9)' },
    dark: { url: BASE, opt: { maxNativeZoom: 19, maxZoom: 20, attribution: BASE_ATTR }, filter: 'grayscale(.6) invert(1) brightness(.9) contrast(1.1)' },
    sat: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      opt: { maxNativeZoom: 19, maxZoom: 20, attribution: 'Imagery © Esri · Maxar · Earthstar Geographics' },
      filter: ''
    }
  };
  var FALLBACK = { url: 'https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', attr: '© OpenStreetMap contributors · 타일 OSM France(HOT)', maxNative: 18 };

  function init() {
    var v = S.view || { lat: 37.49794, lng: 127.02758, z: 19 };
    map = L.map('map', {
      center: [v.lat, v.lng], zoom: v.z, zoomControl: false, attributionControl: true,
      zoomSnap: .5, zoomDelta: .5, maxZoom: 20, minZoom: 3,
      worldCopyJump: true, preferCanvas: false, zoomAnimation: true
    });
    Object.keys(TILES).forEach(function (k) {
      layers[k] = L.tileLayer(TILES[k].url, Object.assign({ crossOrigin: true, keepBuffer: 2 }, TILES[k].opt));
      var errs = 0;
      layers[k].on('tileerror', function () {
        errs += 1;
        if (errs === 4 && k !== 'sat') { useFallback(); }
      });
    });
    cur = layers.map;
    cur.addTo(map);
    applyFilter(currentFilter());
    applyLock();

    map.on('move zoom viewreset resize', function () { AS.objs.layout(); });
    var savet = null;
    map.on('moveend zoomend', function () {
      var c = map.getCenter();
      S.view = { lat: c.lat, lng: c.lng, z: map.getZoom() };
      clearTimeout(savet); savet = setTimeout(function () { AS.core.save(); }, 500);
    });
    map.on('click', function () { AS.objs.deselect(); });
    setTimeout(function () { map.invalidateSize(); AS.objs.layout(); }, 120);
    return map;
  }

  var fellBack = false;
  function useFallback() {
    if (fellBack) return;
    fellBack = true;
    Object.keys(layers).forEach(function (k) {
      if (k === 'sat') return;
      if (map.hasLayer(layers[k])) map.removeLayer(layers[k]);
      layers[k] = L.tileLayer(FALLBACK.url, { crossOrigin: true, maxNativeZoom: FALLBACK.maxNative, maxZoom: 20, attribution: FALLBACK.attr, keepBuffer: 2 });
      if (k === S.bg) { layers[k].addTo(map); cur = layers[k]; }
    });
    AS.toast('지도 타일을 예비 소스로 전환했어요');
  }

  function applyFilter(f) {
    var pane = document.querySelector('.leaflet-tile-pane');
    if (pane) pane.style.filter = f || '';
  }

  function currentFilter() {
    if (S.bg === 'capture') return '';
    return (TILES[S.bg] && TILES[S.bg].filter) || '';
  }

  function setBg(name) {
    S.bg = name;
    var key = (name === 'capture') ? 'map' : name;
    if (!layers[key]) key = 'map';
    if (cur && cur !== layers[key]) { map.removeLayer(cur); layers[key].addTo(map); cur = layers[key]; }
    applyFilter(currentFilter());
    var cap = $('#capLayer');
    if (cap) cap.hidden = name !== 'capture' || !S.cap.src;
    if (name === 'capture' && !S.cap.src) { AS.toast('캡처 배경 사진을 먼저 선택하세요'); }
    AS.ui.bgchips();
    AS.core.save();
  }

  function applyLock() {
    if (!map) return;
    var locked = !!S.lock;
    var on = function (h) { return function () { return locked ? false : h; }; };
    map.dragging.enable();
    if (locked) map.dragging.disable();
    [map.touchZoom, map.doubleClickZoom, map.boxZoom].forEach(function (h) {
      if (!h) return;
      if (locked) h.disable(); else h.enable();
    });
    var el = document.body;
    el.setAttribute('data-lock', locked ? '1' : '0');
    var b = $('#btnLock');
    if (b) {
      b.setAttribute('aria-pressed', locked ? 'true' : 'false');
      var em = b.querySelector('em');
      if (em) em.textContent = locked ? '지도 고정' : '지도 이동';
    }
  }

  function setLock(v, silent) {
    var was = S.lock;
    S.lock = !!v;
    applyLock();
    if (S.lock && !was && !silent) AS.toast('지도 고정 — 요소를 움직일 수 있어요');
  }

  function fly(lat, lng, z) {
    if (!map) return;
    map.flyTo([lat, lng], z || Math.max(map.getZoom(), 18), { duration: .8 });
  }

  function center() {
    return map ? map.getCenter() : L.latLng(S.view.lat, S.view.lng);
  }

  function project(lat, lng) {
    return map.latLngToContainerPoint([lat, lng]);
  }
  function unproject(x, y) {
    return map.containerPointToLatLng([x, y]);
  }
  function meters(px) {
    try { return map.distance(unproject(10, 10), unproject(10 + px, 10)); } catch (e) { return 0; }
  }

  /* ────────── 검색 ────────── */
  function dist(a, b) {
    var R = 6371000, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180;
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  function photon(q) {
    var c = center();
    var url = 'https://photon.komoot.io/api/?q=' + encodeURIComponent(q) + '&limit=8&lat=' + c.lat.toFixed(5) + '&lon=' + c.lng.toFixed(5);
    return fetch(url, { headers: { 'Accept': 'application/json' } }).then(function (r) { return r.json(); }).then(function (j) {
      return (j.features || []).map(function (f) {
        var p = f.properties || {}, co = f.geometry.coordinates;
        var nm = p.name || p.street || (p.city || '') + ' ' + (p.district || '');
        var parts = [p.street && p.street !== nm ? p.street : '', p.district, p.city, p.state, p.country].filter(Boolean);
        return {
          name: nm || '이름 없는 장소',
          addr: parts.join(' · '),
          lat: co[1], lng: co[0],
          kind: p.osm_value || p.type || ''
        };
      });
    }).catch(function () { return []; });
  }

  function nominatim(q) {
    var url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&accept-language=ko&addressdetails=1&q=' + encodeURIComponent(q);
    return fetch(url, { headers: { 'Accept': 'application/json' } }).then(function (r) { return r.json(); }).then(function (j) {
      return (j || []).map(function (f) {
        var a = f.address || {};
        var nm = f.name || a.road || a.suburb || f.display_name.split(',')[0];
        var parts = [a.road && a.road !== nm ? a.road : '', a.suburb, a.city || a.town || a.county, a.state].filter(Boolean);
        return { name: nm, addr: parts.join(' · ') || f.display_name, lat: +f.lat, lng: +f.lon, kind: f.type || '' };
      });
    }).catch(function () { return []; });
  }

  function search(q) {
    if (!q || q.trim().length < 1) return Promise.resolve([]);
    return Promise.all([photon(q), nominatim(q)]).then(function (r) {
      var out = [];
      r[0].concat(r[1]).forEach(function (it) {
        if (!isFinite(it.lat) || !isFinite(it.lng)) return;
        for (var i = 0; i < out.length; i++) if (dist(out[i], it) < 45) return;
        out.push(it);
      });
      return out.slice(0, 9);
    });
  }

  function geolocate() {
    return new Promise(function (res, rej) {
      if (!navigator.geolocation) return rej(new Error('unsupported'));
      navigator.geolocation.getCurrentPosition(function (p) {
        res({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy });
      }, function (e) { rej(e); }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
    });
  }

  AS.mapx = {
    init: init, get map() { return map; }, layers: layers, setBg: setBg, setLock: setLock, applyLock: applyLock,
    fly: fly, center: center, project: project, unproject: unproject, meters: meters, dist: dist,
    search: search, geolocate: geolocate, curLayer: function () { return cur; },
    currentFilter: currentFilter
  };
})(window.AS);
