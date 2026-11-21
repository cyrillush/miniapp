/* ==========================================================================
   mapx.js — Leaflet 지도 · 3D 틸트(기울기) · 전체화면 도로 배경 · 검색 · GPS
   ========================================================================== */
window.AS = window.AS || {};
(function (AS) {
  'use strict';
  var $ = AS.core.$, S = AS.S;

  var map = null, layers = {}, cur = null;
  var PERSPECTIVE = 900, TILT_ORIGIN_Y = 0.58;

  var BASE = 'https://tile.openstreetmap.de/{z}/{x}/{y}.png';
  var BASE_ATTR = '© OpenStreetMap contributors · 타일 FOSSGIS';
  /* Google 타일: scale=2 → 512px 원본(레티나 선명) · ACAO:* 라서 PNG 합성도 안전 */
  var G = 'https://mt{s}.google.com/vt/lyrs=';
  /* maxNativeZoom 20 — scale=2(512px) 하이브리드 타일이 전 지역에서 100% 존재하는 상한.
     z21/22 를 네이티브로 받으면 404·빈 타일이 섞여 스카이가 하얗게 뜬다(확대는 20타일 업스케일). */
  var GOPT = { subdomains: '0123', tileSize: 256, maxNativeZoom: 20, maxZoom: 22, attribution: '© Google' };
  var TOPTS = { crossOrigin: true, keepBuffer: 2, updateWhenZooming: false, updateWhenIdle: false };
  function gurl(l) { return G + l + '&scale=2&hl=ko&x={x}&y={y}&z={z}'; }
  /* 스카이: y = 위성 + 도로명·건물명 라벨(하이브리드) / 라벨 끄면 s = 순수 위성 */
  /* filter 는 비워 둔다 — 안드로이드 WebView/Chrome GPU 는 3D transform + filter 조합에서
     타일 텍스처를 하얗게 날려 버린다(스카이 안 뜨는 원인). 다크만 필터 유지. */
  var TILES = {
    sat: { url: function () { return gurl(S.labels === false ? 's' : 'y'); }, opt: GOPT, filter: '' },
    /* 지도: m = 512px 한글 도로명·건물명·건물 윤곽 */
    map: { url: function () { return gurl('m'); }, opt: GOPT, filter: '' },
    /* 다크: 같은 지도 타일에 고대비 다크 필터 */
    dark: { url: function () { return gurl('m'); }, opt: GOPT, filter: 'invert(1) hue-rotate(180deg) saturate(.7) brightness(1.06) contrast(1.02)' }
  };
  var FALLBACK = { url: 'https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', attr: '© OpenStreetMap contributors · 타일 OSM France(HOT)', maxNative: 18 };
  var SAT_FALLBACK = { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: 'Imagery © Esri' };

  function init() {
    var v = S.view || { lat: 37.49794, lng: 127.02758, z: 19, bearing: 0, tilt: 0 };
    if (typeof v.bearing !== 'number') v.bearing = 0;
    if (typeof v.tilt !== 'number') v.tilt = 0;
    map = L.map('map', {
      center: [v.lat, v.lng], zoom: v.z, zoomControl: false, attributionControl: false,
      dragging: false, touchZoom: false,
      zoomSnap: .1, zoomDelta: .5, maxZoom: 22, minZoom: 3,
      worldCopyJump: true, preferCanvas: false, zoomAnimation: false, fadeAnimation: false
    });
    Object.keys(TILES).forEach(function (k) { layers[k] = makeLayer(k); });
    syncLabelChip();
    cur = layers[S.bg] || layers.sat;
    if (S.bg !== 'road') cur.addTo(map);
    applyFilter(currentFilter());
    renderRoadLayer();
    applyBearing();
    applyTilt();
    applyLock();

    map.on('move zoom viewreset resize', function () { AS.objs.layout(); layoutCap(); layoutGps(); });
    var savet = null;
    map.on('moveend zoomend', function () {
      var c = map.getCenter();
      S.view = {
        lat: c.lat, lng: c.lng, z: map.getZoom(),
        bearing: S.view.bearing || 0, tilt: S.view.tilt || 0
      };
      clearTimeout(savet); savet = setTimeout(function () { AS.core.save(); }, 500);
    });
    setTimeout(function () { map.invalidateSize(); renderRoadLayer(); AS.objs.layout(); layoutCap(); layoutGps(); }, 120);
    return map;
  }

  /* 스카이 폴백 단계: 0 = 설정(하이브리드/위성) → 1 = 순수 위성(lyrs=s) → 2 = Esri */
  var satStage = 0;

  function satLayerFor(stage) {
    if (stage >= 2) {
      return L.tileLayer(SAT_FALLBACK.url, Object.assign({ maxNativeZoom: 19, maxZoom: 22, attribution: SAT_FALLBACK.attr }, TOPTS));
    }
    var lyrs = (stage >= 1 || S.labels === false) ? 's' : 'y';
    return L.tileLayer(gurl(lyrs), Object.assign({}, TOPTS, GOPT));
  }

  function makeLayer(k) {
    var lay = (k === 'sat')
      ? satLayerFor(satStage)
      : L.tileLayer(typeof TILES[k].url === 'function' ? TILES[k].url() : TILES[k].url, Object.assign({}, TOPTS, TILES[k].opt));
    lay._errs = 0;
    /* 타일이 하나라도 들어오면 연속 실패 카운트를 리셋 — 산발적 1~2건으로 폴백하지 않게 */
    lay.on('tileload', function () { lay._errs = 0; });
    lay.on('tileerror', function () {
      lay._errs += 1;
      if (lay._errs < 12) return;
      lay._errs = 0;
      if (k === 'sat') advanceSat();
      else useFallback();
    });
    return lay;
  }

  /* 스카이: 1차는 순수 위성(lyrs=s&scale=2), 그마저 안 되면 Esri */
  function advanceSat() {
    if (satStage >= 2 || !map) return;
    satStage += (satStage === 0 && S.labels === false) ? 2 : 1;
    var was = cur === layers.sat || map.hasLayer(layers.sat);
    if (map.hasLayer(layers.sat)) map.removeLayer(layers.sat);
    layers.sat = makeLayer('sat');
    if (was) { layers.sat.addTo(map); if (cur) cur = layers.sat; }
    applyFilter(currentFilter());
  }

  /* 스카이 건물·도로명 라벨 토글 */
  function setLabels(on) {
    S.labels = !!on;
    var live = !!(map && map.hasLayer(layers.sat));
    if (live) map.removeLayer(layers.sat);
    satStage = 0;
    layers.sat = makeLayer('sat');
    if (live) { layers.sat.addTo(map); if (cur) cur = layers.sat; }
    applyFilter(currentFilter());
    syncLabelChip();
    AS.core.save();
    AS.toast(S.labels ? '스카이 라벨 ON — 도로명·건물명 표시' : '스카이 라벨 OFF — 위성 사진만');
  }

  function syncLabelChip() {
    var b = $('#chipLabel');
    if (!b) return;
    var on = S.labels !== false;
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.classList.toggle('off', !on);
  }

  var fellBack = false;
  function useFallback() {
    if (fellBack || !map) return;
    fellBack = true;
    Object.keys(layers).forEach(function (k) {
      if (k === 'sat') return;
      if (map.hasLayer(layers[k])) map.removeLayer(layers[k]);
      layers[k] = L.tileLayer(FALLBACK.url, Object.assign({ maxNativeZoom: FALLBACK.maxNative, maxZoom: 22, attribution: FALLBACK.attr }, TOPTS));
      if (k === S.bg) { layers[k].addTo(map); cur = layers[k]; }
    });
    applyFilter(currentFilter());
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

  /* ────────── 전체화면 도로 배경 렌더 ────────── */
  function renderRoadLayer() {
    var mr = $('#mapRot');
    var rl = $('#roadLayer');
    var isRoad = S.bg === 'road';
    if (mr) mr.classList.toggle('blank', isRoad);
    if (!rl) return;
    if (!isRoad || !S.roadId || S.roadId === 'blank') {
      rl.hidden = true;
      rl.innerHTML = '';
      return;
    }
    var w = Math.max(320, Math.round(S.stage.w || 390));
    var h = Math.max(320, Math.round(S.stage.h || 600));
    rl.hidden = false;
    rl.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h +
      '" preserveAspectRatio="none" width="100%" height="100%">' +
      AS.roads.build(S.roadId, w, h) + '</svg>';
  }

  function setRoad(id) {
    S.roadId = id || 'lane4';
    setBg('road');
  }

  function setBg(name) {
    var fromRoad = S.bg === 'road';
    S.bg = name;
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
      /* 도로(전체화면)에서 지도로 돌아올 때 — 레이어를 다시 붙인 직후엔 타일이 비어 보이므로
         즉시 크기 재계산 + 다시 그리기로 기다림 없이 채운다 */
      if (fromRoad && map && cur) {
        map.invalidateSize(false);
        if (cur.redraw) cur.redraw();
        AS.objs.layout();
      }
    }
    layoutGps();
    renderRoadLayer();
    layoutCap();
    var cap = $('#capLayer');
    if (cap) cap.hidden = name !== 'capture' || !S.cap.src;
    if (name === 'capture' && !S.cap.src) { AS.toast('갤러리에서 지도 캡처 사진을 먼저 골라 주세요'); }
    AS.ui.bgchips();
    if (AS.ui && AS.ui.syncCapture) AS.ui.syncCapture();
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
    document.body.setAttribute('data-lock', locked ? '1' : '0');
    var b = $('#btnLock');
    if (b) {
      b.setAttribute('aria-pressed', locked ? 'true' : 'false');
      var em = b.querySelector('em');
      if (em) em.textContent = locked ? '지도 고정' : '지도 이동';
    }
  }

  /* ────────── 회전(bearing) & 3D 각도(tilt) ────────── */
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

  function applyTiltUI(t) {
    var tb = $('#tiltBtn'), tt = $('#tiltTxt');
    var v = Math.round(t || 0);
    if (tb) tb.classList.toggle('rot', v > 0);
    if (tt) tt.textContent = v > 0 ? ('3D ' + v + '°') : '3D 0°';
  }

  function applyBearing() {
    var b = ((S.view.bearing || 0) % 360 + 360) % 360;
    S.view.bearing = b;
    var mr = $('#mapRot');
    if (mr) mr.style.transform = 'translate(-50%,-50%) rotate(' + b + 'deg)';
    applyCompassUI(b);
  }

  function applyTilt() {
    var t = AS.core.clamp(S.view.tilt || 0, 0, 55);
    S.view.tilt = t;
    var st3 = $('#stage3d');
    if (st3) {
      if (t < 0.2) {
        st3.style.transform = '';
      } else {
        st3.style.transform = 'perspective(' + PERSPECTIVE + 'px) rotateX(' + t.toFixed(2) + 'deg)';
      }
    }
    applyTiltUI(t);
  }

  var bearSaveT = null;
  function setBearing(deg, snapZero) {
    var b = ((deg % 360) + 360) % 360;
    if (snapZero && (b < 3 || b > 357)) b = 0;
    S.view.bearing = b;
    applyBearing();
    AS.objs.layout();
    layoutCap();
    clearTimeout(bearSaveT);
    bearSaveT = setTimeout(function () { AS.core.save(); }, 350);
  }

  function setTilt(deg) {
    var t = AS.core.clamp(deg, 0, 55);
    if (t < 2) t = 0;
    S.view.tilt = t;
    applyTilt();
    clearTimeout(bearSaveT);
    bearSaveT = setTimeout(function () { AS.core.save(); }, 350);
  }

  /* 3D 틸트 화면 좌표 <-> 평면 좌표 변환 (exact inverse of perspective(900) rotateX(t)) */
  function screenToPlane(sx, sy) {
    var t = S.view.tilt || 0;
    if (t < 0.2) return { x: sx, y: sy };
    var ox = (S.stage.w || 390) * 0.5, oy = (S.stage.h || 600) * TILT_ORIGIN_Y;
    var r = t * Math.PI / 180;
    var ux = sx - ox, uy = sy - oy;
    var denom = PERSPECTIVE * Math.cos(r) + uy * Math.sin(r);
    if (denom < 60) denom = 60;
    var dy = (uy * PERSPECTIVE) / denom;
    var sc = PERSPECTIVE / Math.max(80, PERSPECTIVE - dy * Math.sin(r));
    return { x: ox + ux / sc, y: oy + dy };
  }

  function planeToScreen(px, py) {
    var t = S.view.tilt || 0;
    if (t < 0.2) return { x: px, y: py };
    var ox = (S.stage.w || 390) * 0.5, oy = (S.stage.h || 600) * TILT_ORIGIN_Y;
    var r = t * Math.PI / 180;
    var dx = px - ox, dy = py - oy;
    var sc = PERSPECTIVE / Math.max(80, PERSPECTIVE - dy * Math.sin(r));
    return { x: ox + dx * sc, y: oy + (dy * Math.cos(r)) * sc };
  }

  function startPinch(px, py) {
    if (!map) return;
    pinch = {
      active: true, px: px, py: py, mx: px, my: py, axis: null,
      s: 1, db: 0, b0: S.view.bearing || 0, z0: map.getZoom(), t0: S.view.tilt || 0
    };
  }

  /* 두 손가락 제스처 (v3.8)
     - 세로 움직임 = 3D 각도만 바뀌고 지도는 제자리에 그대로 둔다 (팬 없음)
     - 가로 움직임 = 회전만
     - 처음 8px 안에서 우세한 축을 잠그고, 그 프레임에서는 나머지 축을 무시한다
     - 두 손가락 벌리기는 어느 축에서든 확대·축소 (처음 손가락 중간점을 중심으로) */
  function movePinch(mx, my, scale, dBearing) {
    if (!pinch || !map) return;
    var dxm = mx - pinch.px, dym = my - pinch.py;
    if (!pinch.axis && Math.max(Math.abs(dxm), Math.abs(dym)) > 8) {
      pinch.axis = Math.abs(dym) >= Math.abs(dxm) ? 'tilt' : 'rot';
    }
    if (pinch.axis === 'tilt') {
      S.view.tilt = AS.core.clamp(pinch.t0 - dym * 0.25, 0, 55);
      applyTilt();
      dBearing = 0;                     /* 세로 드래그 중에는 회전을 잠근다 */
    } else if (pinch.axis === 'rot') {
      dBearing += dxm * 0.30;           /* 좌우로 밀면 그만큼 회전 */
    }
    var minS = Math.pow(2, 3 - pinch.z0), maxS = Math.pow(2, 22 - pinch.z0);
    var s = AS.core.clamp(scale, minS, maxS);
    pinch.s = s; pinch.db = dBearing;
    var b = ((pinch.b0 + dBearing) % 360 + 360) % 360;
    S.view.bearing = b;
    var ox = S.stage.w / 2, oy = S.stage.h / 2;
    var rx0 = pinch.px - ox, ry0 = pinch.py - oy;
    /* 손가락이 움직인 만큼 지도를 끌지 않는다 — 처음 중간점을 중심으로 확대·회전·각도만 */
    var rad = dBearing * Math.PI / 180;
    var c = Math.cos(rad), sn = Math.sin(rad);
    var tx = rx0 - s * (rx0 * c - ry0 * sn);
    var ty = ry0 - s * (rx0 * sn + ry0 * c);
    var mr = $('#mapRot');
    if (mr) {
      mr.style.transform = 'translate(-50%,-50%) translate(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) +
        'px) rotate(' + (pinch.b0 + dBearing).toFixed(2) + 'deg) scale(' + s.toFixed(4) + ')';
    }
    applyCompassUI(b);
    AS.objs.layout();
    layoutCap();
  }

  function endPinch() {
    if (!pinch || !map) return;
    var target = unproject(S.stage.w / 2, S.stage.h / 2);
    var newZ = AS.core.clamp(pinch.z0 + Math.log2(pinch.s), 3, 22);
    var newB = ((pinch.b0 + pinch.db) % 360 + 360) % 360;
    if (Math.abs(pinch.db) > 0 && (newB < 2.5 || newB > 357.5)) newB = 0;
    pinch = null;
    S.view.bearing = newB;
    if (S.view.tilt < 2) S.view.tilt = 0;
    applyBearing();
    applyTilt();
    map.setView(target, newZ, { animate: false });
    AS.objs.layout();
    layoutCap();
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
    var targetZ = z || Math.max(map.getZoom(), 18);
    var c = map.getCenter();
    var far = dist({ lat: c.lat, lng: c.lng }, { lat: lat, lng: lng }) > 5000;
    /* 먼 거리로 flyTo 하면 중간 줌 타일을 수십 개씩 받았다 버려 모바일에서 하얗게 비는 일이 생긴다 —
       멀거나 줌 차이가 크면 전환 애니메이션으로 한 번에 옮긴다 */
    if (far || Math.abs(map.getZoom() - targetZ) > 4) {
      map.setView([lat, lng], targetZ, { animate: true });
    } else {
      map.flyTo([lat, lng], targetZ, { duration: .8 });
    }
    layoutGps();
  }

  /* ────────── 내 위치(GPS) 마커 — 화면 위에만 표시, PNG 저장에는 포함하지 않는다 ────────── */
  function setGps(p) {
    if (!p || !isFinite(p.lat) || !isFinite(p.lng)) return null;
    S.gps = { lat: p.lat, lng: p.lng, acc: isFinite(p.acc) ? p.acc : 25 };
    layoutGps();
    return S.gps;
  }

  function metersPerPixel() {
    if (!map) return 1;
    var m = meters(100);
    return m > 0 ? m / 100 : 1;
  }

  /* ────────── 캡처 배경 — 지도 확대/이동/회전에 맞춰 사진도 같이 움직인다 ────────── */
  function capBaseOf() {
    if (!S.cap.base && map) {
      var c = map.getCenter();
      S.cap.base = { lat: c.lat, lng: c.lng, z: map.getZoom() };
    }
    return S.cap.base;
  }
  function layoutCap() {
    var cp = $('#capLayer');
    if (!cp) return;
    if (S.bg !== 'capture' || !S.cap.src || !map) { cp.style.transform = ''; return; }
    var b = capBaseOf();
    var sc = Math.pow(2, map.getZoom() - b.z);
    var pt = map.latLngToContainerPoint([b.lat, b.lng]);
    var ms = map.getSize();
    /* 지도 컨테이너(155vmax) 중심 → 스테이지 중심 좌표계로 */
    var dx = pt.x - ms.x / 2, dy = pt.y - ms.y / 2;
    cp.style.transformOrigin = '50% 50%';
    cp.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) rotate(' +
      (S.view.bearing || 0).toFixed(2) + 'deg) scale(' + sc.toFixed(4) + ')';
  }

  function layoutGps() {
    var el = document.getElementById('gpsLayer');
    if (!el) return;
    var show = !!(S.gps && isFinite(S.gps.lat) && (S.bg === 'sat' || S.bg === 'map' || S.bg === 'dark') && map);
    if (!show) { el.hidden = true; return; }
    var p = project(S.gps.lat, S.gps.lng);
    if (!p || !isFinite(p.x) || !isFinite(p.y)) { el.hidden = true; return; }
    el.hidden = false;
    var accPx = AS.core.clamp((S.gps.acc || 25) / metersPerPixel(), 6, 620);
    var acc = el.querySelector('.acc'), pulse = el.querySelector('.pulse'), dot = el.querySelector('.dot'), lb = el.querySelector('.lb');
    if (acc) {
      acc.style.width = (accPx * 2).toFixed(1) + 'px';
      acc.style.height = (accPx * 2).toFixed(1) + 'px';
      acc.style.left = p.x.toFixed(1) + 'px';
      acc.style.top = p.y.toFixed(1) + 'px';
    }
    if (pulse) { pulse.style.left = p.x.toFixed(1) + 'px'; pulse.style.top = p.y.toFixed(1) + 'px'; }
    if (dot) { dot.style.left = p.x.toFixed(1) + 'px'; dot.style.top = p.y.toFixed(1) + 'px'; }
    if (lb) { lb.style.left = p.x.toFixed(1) + 'px'; lb.style.top = (p.y + 20).toFixed(1) + 'px'; }
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
        return { name: nm || '이름 없는 장소', addr: parts.join(' · '), lat: co[1], lng: co[0], kind: p.osm_value || p.type || '' };
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

  /* ArcGIS World Geocoder — 대한민국 도로명(~로·~길·~대로)·읍면동·교차로·건물명 */
  function arcgis(q) {
    var url = 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates';
    url += '?f=json&outSR=4326&outFields=*&countryCode=KOR&langCode=ko&maxLocations=8&SingleLine=' + encodeURIComponent(q);
    var qn = q.toLowerCase().replace(/\s+/g, '');
    var last = q.trim().split(/\s+/).pop() || '';
    var roadish = /(로|길|대로|가)$/.test(last);
    return fetch(url, { headers: { 'Accept': 'application/json' } }).then(function (r) { return r.json(); }).then(function (j) {
      var list = ((j && j.candidates) || []).map(function (c) {
        var a = c.attributes || {}, loc = c.location || {};
        var nm = a.StName || a.ShortLabel || a.Match_addr || c.address || '';
        var parts = [a.Region, a.City || a.District, a.Nbrhd].filter(function (v) { return !!v; });
        var addr = parts.join(' ');
        if (!addr) addr = a.LongLabel || c.address || '';
        return {
          name: nm || addr || '이름 없는 곳', addr: addr === nm ? '' : addr,
          lat: +loc.y, lng: +loc.x, kind: (a.Addr_type || ''), score: c.score || 0
        };
      }).filter(function (it) {
        var isStreet = /Street|Address|Int/.test(it.kind || '');
        if (roadish) return isStreet;   /* “~로·~길·~대로” 검색이면 도로만 */
        var nl = it.name.toLowerCase().replace(/\s+/g, '');
        if (!nl) return true;
        return qn.indexOf(nl) >= 0 || nl.indexOf(qn) >= 0 || isStreet;
      });
      if (!list.length) return [];
      return list.sort(function (x, y) { return (y.score || 0) - (x.score || 0); });
    }).catch(function () { return []; });
  }

  function search(q) {
    if (!q || q.trim().length < 1) return Promise.resolve([]);
    return Promise.all([arcgis(q), photon(q), nominatim(q)]).then(function (r) {
      var out = [], nameCount = {};
      var push = function (it, src) {
        if (!isFinite(it.lat) || !isFinite(it.lng)) return;
        for (var i = 0; i < out.length; i++) if (dist(out[i], it) < 45) return;
        var key = String(it.name || '').replace(/\s+/g, '').toLowerCase();
        if (key && (nameCount[key] || 0) >= 3) return;
        if (key) nameCount[key] = (nameCount[key] || 0) + 1;
        it.src = src;
        out.push(it);
      };
      r[0].forEach(function (it) { push(it, 'arcgis'); });
      r[1].forEach(function (it) { push(it, 'photon'); });
      r[2].forEach(function (it) { push(it, 'osm'); });
      return out.slice(0, 12);
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
    init: init, get map() { return map; }, layers: layers,
    setBg: setBg, setRoad: setRoad, renderRoadLayer: renderRoadLayer,
    setLabels: setLabels, syncLabelChip: syncLabelChip,
    setLock: setLock, applyLock: applyLock,
    setBearing: setBearing, applyBearing: applyBearing, layoutCap: layoutCap,
    setTilt: setTilt, applyTilt: applyTilt,
    screenToPlane: screenToPlane, planeToScreen: planeToScreen,
    panScreen: panScreen,
    startPinch: startPinch, movePinch: movePinch, endPinch: endPinch,
    fly: fly, center: center, project: project, unproject: unproject, meters: meters, dist: dist,
    setGps: setGps, layoutGps: layoutGps,
    search: search, geolocate: geolocate, curLayer: function () { return cur; },
    currentFilter: currentFilter, PERSPECTIVE: PERSPECTIVE, TILT_ORIGIN_Y: TILT_ORIGIN_Y
  };
})(window.AS);
