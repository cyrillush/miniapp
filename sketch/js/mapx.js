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
    sat: {
      url: 'https://mt{s}.google.com/vt/lyrs=s&scale=2&hl=ko&x={x}&y={y}&z={z}',
      opt: { subdomains: '0123', tileSize: 256, maxNativeZoom: 21, maxZoom: 22, attribution: '© Google' },
      filter: 'contrast(1.06) saturate(1.06)'
    },
    map: { url: BASE, opt: { maxNativeZoom: 19, maxZoom: 20, attribution: BASE_ATTR }, filter: 'saturate(.65) brightness(1.03) contrast(.96)' },
    dark: { url: BASE, opt: { maxNativeZoom: 19, maxZoom: 20, attribution: BASE_ATTR }, filter: 'grayscale(.6) invert(1) brightness(.9) contrast(1.1)' }
  };
  var FALLBACK = { url: 'https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', attr: '© OpenStreetMap contributors · 타일 OSM France(HOT)', maxNative: 18 };
  var SAT_FALLBACK = { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: 'Imagery © Esri' };

  function init() {
    var v = S.view || { lat: 37.49794, lng: 127.02758, z: 19, bearing: 0 };
    if (typeof v.bearing !== 'number') v.bearing = 0;
    map = L.map('map', {
      center: [v.lat, v.lng], zoom: v.z, zoomControl: false, attributionControl: false,
      dragging: false, touchZoom: false,
      zoomSnap: .1, zoomDelta: .5, maxZoom: 22, minZoom: 3,
      worldCopyJump: true, preferCanvas: false, zoomAnimation: false, fadeAnimation: false
    });
    Object.keys(TILES).forEach(function (k) {
      layers[k] = L.tileLayer(TILES[k].url, Object.assign({
        crossOrigin: true, keepBuffer: 6, updateWhenZooming: false, updateWhenIdle: false
      }, TILES[k].opt));
      var errs = 0;
      layers[k].on('tileerror', function () {
        errs += 1;
        if (errs === 4) {
          if (k === 'sat') useSatFallback();
          else useFallback();
        }
      });
    });
    cur = layers[S.bg] || layers.sat;
    if (S.bg !== 'road') cur.addTo(map);
    applyFilter(currentFilter());
    var mr = $('#mapRot');
    if (mr) mr.classList.toggle('blank', S.bg === 'road');
    applyBearing();
    applyLock();

    map.on('move zoom viewreset resize', function () { AS.objs.layout(); });
    var savet = null;
    map.on('moveend zoomend', function () {
      var c = map.getCenter();
      S.view = { lat: c.lat, lng: c.lng, z: map.getZoom(), bearing: S.view.bearing || 0 };
      clearTimeout(savet); savet = setTimeout(function () { AS.core.save(); }, 500);
    });
    setTimeout(function () { map.invalidateSize(); AS.objs.layout(); }, 120);
    return map;
  }

  var satFellBack = false;
  function useSatFallback() {
    if (satFellBack) return;
    satFellBack = true;
    var was = cur === layers.sat;
    if (map.hasLayer(layers.sat)) map.removeLayer(layers.sat);
    layers.sat = L.tileLayer(SAT_FALLBACK.url, { crossOrigin: true, maxNativeZoom: 19, maxZoom: 21, attribution: SAT_FALLBACK.attr, keepBuffer: 2 });
    if (was) { layers.sat.addTo(map); cur = layers.sat; }
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
    var mr = $('#mapRot');
    if (mr) mr.classList.toggle('blank', name === 'road');
    if (name === 'road') {
      if (cur && map.hasLayer(cur)) { map.removeLayer(cur); cur = null; }
      applyFilter('');
    } else {
      var key = (name === 'capture') ? 'map' : name;
      if (!layers[key]) key = 'sat';
      if (cur !== layers[key]) {
        if (cur && map.hasLayer(cur)) map.removeLayer(cur);
        layers[key].addTo(map);
        cur = layers[key];
      }
      applyFilter(currentFilter());
    }
    var cap = $('#capLayer');
    if (cap) cap.hidden = name !== 'capture' || !S.cap.src;
    if (name === 'capture' && !S.cap.src) { AS.toast('캡처 배경 사진을 먼저 선택하세요'); }
    if (name === 'road') AS.toast('터널·도면 모드 — 도로 버튼으로 차선을 얹어 보세요');
    AS.ui.bgchips();
    AS.core.save();
  }

  function applyLock() {
    if (!map) return;
    var locked = !!S.lock;
    [map.doubleClickZoom, map.boxZoom].forEach(function (h) {
      if (!h) return;
      if (locked) h.disable(); else h.enable();
    });
    if (map.scrollWheelZoom) { if (locked) map.scrollWheelZoom.disable(); else map.scrollWheelZoom.enable(); }
    var el = document.body;
    el.setAttribute('data-lock', locked ? '1' : '0');
    var b = $('#btnLock');
    if (b) {
      b.setAttribute('aria-pressed', locked ? 'true' : 'false');
      var em = b.querySelector('em');
      if (em) em.textContent = locked ? '지도 고정' : '지도 이동';
    }
  }

  var pinch = null;

  function applyCompassUI(b) {
    var cb = $('#compassBtn'), ct = $('#compassTxt');
    if (cb) {
      cb.classList.toggle('rot', Math.round(b) !== 0 && Math.round(b) !== 360);
      var needle = cb.querySelector('.needle');
      if (needle) needle.style.transform = 'rotate(' + b + 'deg)';
    }
    if (ct) ct.textContent = (Math.round(b) % 360) + '°';
  }

  function applyBearing() {
    var b = ((S.view.bearing || 0) % 360 + 360) % 360;
    S.view.bearing = b;
    var mr = $('#mapRot');
    if (mr) mr.style.transform = 'translate(-50%,-50%) rotate(' + b + 'deg)';
    applyCompassUI(b);
  }

  var bearSaveT = null;
  function setBearing(deg, snapZero) {
    var b = ((deg % 360) + 360) % 360;
    if (snapZero && (b < 3 || b > 357)) b = 0;
    S.view.bearing = b;
    applyBearing();
    AS.objs.layout();
    clearTimeout(bearSaveT);
    bearSaveT = setTimeout(function () { AS.core.save(); }, 350);
  }

  function startPinch(px, py) {
    if (!map) return;
    pinch = {
      active: true, px: px, py: py, mx: px, my: py,
      s: 1, db: 0, b0: S.view.bearing || 0, z0: map.getZoom()
    };
  }

  function movePinch(mx, my, scale, dBearing) {
    if (!pinch || !map) return;
    var minS = Math.pow(2, 3 - pinch.z0), maxS = Math.pow(2, 22 - pinch.z0);
    var s = AS.core.clamp(scale, minS, maxS);
    pinch.mx = mx; pinch.my = my; pinch.s = s; pinch.db = dBearing;
    var b = ((pinch.b0 + dBearing) % 360 + 360) % 360;
    S.view.bearing = b;
    var ox = S.stage.w / 2, oy = S.stage.h / 2;
    var rx0 = pinch.px - ox, ry0 = pinch.py - oy;
    var dx = mx - pinch.px, dy = my - pinch.py;
    var rad = dBearing * Math.PI / 180;
    var c = Math.cos(rad), sn = Math.sin(rad);
    var tx = (rx0 + dx) - s * (rx0 * c - ry0 * sn);
    var ty = (ry0 + dy) - s * (rx0 * sn + ry0 * c);
    var mr = $('#mapRot');
    if (mr) {
      mr.style.transform = 'translate(-50%,-50%) translate(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) +
        'px) rotate(' + (pinch.b0 + dBearing).toFixed(2) + 'deg) scale(' + s.toFixed(4) + ')';
    }
    applyCompassUI(b);
    AS.objs.layout();
  }

  function endPinch() {
    if (!pinch || !map) return;
    var target = unproject(S.stage.w / 2, S.stage.h / 2);
    var newZ = AS.core.clamp(pinch.z0 + Math.log2(pinch.s), 3, 22);
    var newB = ((pinch.b0 + pinch.db) % 360 + 360) % 360;
    if (Math.abs(pinch.db) > 0 && (newB < 2.5 || newB > 357.5)) newB = 0;
    pinch = null;
    S.view.bearing = newB;
    applyBearing();
    map.setView(target, newZ, { animate: false });
    AS.objs.layout();
    AS.core.save();
  }

  function panScreen(dx, dy) {
    if (!map) return;
    var th = -(S.view.bearing || 0) * Math.PI / 180;
    var c = Math.cos(th), s = Math.sin(th);
    var pdx = dx * c - dy * s;
    var pdy = dx * s + dy * c;
    map.panBy([-pdx, -pdy], { animate: false, noMoveStart: true });
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
    var mp = map.latLngToContainerPoint([lat, lng]);
    var ms = map.getSize();
    var dx = mp.x - ms.x / 2, dy = mp.y - ms.y / 2;
    var bBase = pinch ? pinch.b0 : (S.view.bearing || 0);
    var th = bBase * Math.PI / 180;
    var c = Math.cos(th), s = Math.sin(th);
    var sx = S.stage.w / 2 + dx * c - dy * s;
    var sy = S.stage.h / 2 + dx * s + dy * c;
    if (pinch && pinch.active) {
      var ux = sx - pinch.px, uy = sy - pinch.py;
      var r2 = pinch.db * Math.PI / 180;
      var c2 = Math.cos(r2), s2 = Math.sin(r2);
      return L.point(
        pinch.mx + pinch.s * (ux * c2 - uy * s2),
        pinch.my + pinch.s * (ux * s2 + uy * c2)
      );
    }
    return L.point(sx, sy);
  }
  function unproject(x, y) {
    if (pinch && pinch.active) {
      var ux = (x - pinch.mx) / pinch.s, uy = (y - pinch.my) / pinch.s;
      var r2 = -pinch.db * Math.PI / 180;
      var c2 = Math.cos(r2), s2 = Math.sin(r2);
      x = pinch.px + ux * c2 - uy * s2;
      y = pinch.py + ux * s2 + uy * c2;
    }
    var ms = map.getSize();
    var rx = x - S.stage.w / 2, ry = y - S.stage.h / 2;
    var bBase = pinch ? pinch.b0 : (S.view.bearing || 0);
    var th = -bBase * Math.PI / 180;
    var c = Math.cos(th), s = Math.sin(th);
    var mx = ms.x / 2 + rx * c - ry * s;
    var my = ms.y / 2 + rx * s + ry * c;
    return map.containerPointToLatLng([mx, my]);
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
    setBearing: setBearing, applyBearing: applyBearing, panScreen: panScreen,
    startPinch: startPinch, movePinch: movePinch, endPinch: endPinch,
    fly: fly, center: center, project: project, unproject: unproject, meters: meters, dist: dist,
    search: search, geolocate: geolocate, curLayer: function () { return cur; },
    currentFilter: currentFilter
  };
})(window.AS);
