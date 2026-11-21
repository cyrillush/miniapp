/* ==========================================================================
   exportx.js — 저장 · PNG 합성(전체화면 도로 + 3D 틸트 워프 + 머리글) · A4 보고서
   ========================================================================== */
window.AS = window.AS || {};
(function (AS) {
  'use strict';
  var C = AS.core, $ = C.$, S = AS.S;

  function nowLocal() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function stamp() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return '' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '_' + p(d.getHours()) + p(d.getMinutes());
  }
  function fmtWhen(v) {
    if (!v) return '';
    var m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!m) return v;
    var days = ['일', '월', '화', '수', '목', '금', '토'];
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return m[1] + '.' + m[2] + '.' + m[3] + ' (' + days[d.getDay()] + ') ' + m[4] + ':' + m[5];
  }

  function openSave() {
    var body = $('#modalBody');
    delete body.dataset.lab;
    body.innerHTML =
      '<button class="mclose" data-close="1" aria-label="닫기">✕</button>' +
      '<h3>약도 저장</h3>' +
      '<p class="mhint">머리글(일시·장소·경위)이 함께 들어간 한 장으로 저장합니다.</p>' +
      '<div class="fld"><span>일시</span><input id="fWhen" type="datetime-local" value="' + (S.info.when || nowLocal()) + '" /></div>' +
      '<div class="fld"><span>장소</span><input id="fPlace" type="text" maxlength="60" placeholder="예) 서초대로 ○○사거리" value="' + esc(S.info.place || '') + '" /></div>' +
      '<div class="fld"><span>사고 경위 (한 줄)</span><input id="fNote" type="text" maxlength="70" placeholder="예) 2차로 주행 중 우측에서 진입한 차량과 충돌" value="' + esc(S.info.note || '') + '" /></div>' +
      '<div class="mrow"><button class="btn primary" id="btnPng">PNG 저장</button>' +
      '<button class="btn" id="btnRep">A4 보고서</button></div>' +
      '<div class="mrow"><button class="btn ghost sm" id="btnNew">새 약도</button>' +
      '<button class="btn ghost sm" data-close="1">닫기</button></div>' +
      '<p class="tip">PNG는 배경 + 배치 요소 + 머리글이 합성된 이미지입니다.</p>';
    $('#modal').hidden = false;

    var read = function () {
      S.info.when = $('#fWhen').value || nowLocal();
      S.info.place = $('#fPlace').value.trim();
      S.info.note = $('#fNote').value.trim();
      C.save();
    };
    ['fWhen', 'fPlace', 'fNote'].forEach(function (id) { $('#' + id).addEventListener('input', read); });

    $('#btnPng').addEventListener('click', function () {
      read();
      var b = $('#btnPng');
      b.textContent = '만드는 중…'; b.disabled = true;
      compose(2).then(function (url) {
        b.textContent = 'PNG 저장'; b.disabled = false;
        showPreview(url);
      }).catch(function (e) {
        b.textContent = 'PNG 저장'; b.disabled = false;
        AS.toast('이미지 합성 실패 · ' + (e && e.message ? e.message : '오류'), 2600);
      });
    });
    $('#btnRep').addEventListener('click', function () {
      read();
      compose(2, { headless: true }).then(function (url) { printReport(url); }).catch(function () { AS.toast('보고서 이미지 생성 실패'); });
    });
    $('#btnNew').addEventListener('click', confirmNew);
  }

  function esc(s) { return AS.objs.esc(s || ''); }

  function svgToImage(markup) {
    return new Promise(function (res, rej) {
      var blob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); res(img); };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('svg render')); };
      img.src = url;
    });
  }

  function themeColors() {
    switch (S.theme) {
      case 'B': return { head: '#0A141A', ink: '#E8FBFF', sub: '#8FB4C2', line: 'rgba(47,230,255,.35)', acc: '#2FE6FF' };
      case 'C': return { head: '#0F2033', ink: '#E7F2FB', sub: '#A7C2D8', line: 'rgba(167,194,216,.4)', acc: '#3FD3A8' };
      case 'D': return { head: '#FFF6E4', ink: '#2B2724', sub: '#6B6157', line: '#2B2724', acc: '#FF5A36' };
      default: return { head: '#FFFFFF', ink: '#0F1B2E', sub: '#5A6C86', line: 'rgba(15,27,46,.14)', acc: '#FF6B2C' };
    }
  }

  function font(size, weight) {
    return (weight || 600) + ' ' + size + 'px Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif';
  }

  function truncate(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    var s = text;
    while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
    return s + '…';
  }

  function drawHeader(ctx, W, hh, sc) {
    var T = themeColors();
    ctx.save();
    ctx.fillStyle = T.head;
    ctx.fillRect(0, 0, W, hh);
    ctx.fillStyle = T.acc;
    var barW = Math.round(6 * sc), pad = Math.round(18 * sc);
    ctx.beginPath();
    var r = Math.round(3 * sc);
    if (ctx.roundRect) ctx.roundRect(pad, Math.round(16 * sc), barW, hh - Math.round(32 * sc), r);
    else ctx.rect(pad, Math.round(16 * sc), barW, hh - Math.round(32 * sc));
    ctx.fill();

    ctx.fillStyle = T.ink;
    ctx.font = font(Math.round(21 * sc), 800);
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('사고약도', pad + barW + Math.round(10 * sc), Math.round(30 * sc));

    var when = fmtWhen(S.info.when) || '';
    ctx.font = font(Math.round(12 * sc), 600);
    ctx.fillStyle = T.sub;
    ctx.textAlign = 'right';
    var w2 = W - pad;
    if (when) ctx.fillText(when, w2, Math.round(22 * sc));
    if (S.info.place) {
      ctx.fillStyle = T.ink;
      ctx.font = font(Math.round(13 * sc), 700);
      ctx.fillText(truncate(ctx, S.info.place, W * .62), w2, Math.round(40 * sc));
    }
    ctx.textAlign = 'left';
    if (S.info.note) {
      ctx.fillStyle = T.sub;
      ctx.font = font(Math.round(12 * sc), 500);
      ctx.fillText(truncate(ctx, S.info.note, W - pad * 2), pad + barW + Math.round(10 * sc), Math.round(50 * sc));
    }
    ctx.strokeStyle = T.line;
    ctx.lineWidth = Math.max(1, sc);
    ctx.beginPath(); ctx.moveTo(0, hh - .5); ctx.lineTo(W, hh - .5); ctx.stroke();
    ctx.restore();
  }

  function drawCover(ctx, img, x, y, w, h) {
    var ir = img.naturalWidth / img.naturalHeight, br = w / h, sw, sh, sx, sy;
    if (ir > br) { sh = img.naturalHeight; sw = sh * br; sx = (img.naturalWidth - sw) / 2; sy = 0; }
    else { sw = img.naturalWidth; sh = sw / br; sx = 0; sy = (img.naturalHeight - sh) / 2; }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  function drawTilesRaw(ctx, W, H, sc) {
    var layer = AS.mapx.curLayer();
    if (!layer || !layer.getContainer) return 0;
    var stageR = $('#stage').getBoundingClientRect();
    var imgs = layer.getContainer().querySelectorAll('img.leaflet-tile');
    var rad = (S.view.bearing || 0) * Math.PI / 180;
    var denom = Math.abs(Math.cos(rad)) + Math.abs(Math.sin(rad)) || 1;
    var n = 0;
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      if (!img.complete || !img.naturalWidth) continue;
      var r = img.getBoundingClientRect();
      if (r.width < 2 || r.right < stageR.left - 80 || r.left > stageR.right + 80 || r.bottom < stageR.top - 80 || r.top > stageR.bottom + 80) continue;
      var tcx = (r.left + r.right) / 2 - stageR.left;
      var tcy = (r.top + r.bottom) / 2 - stageR.top;
      var tileL = r.width / denom;
      try {
        ctx.save();
        ctx.translate(tcx * sc, tcy * sc);
        if (rad) ctx.rotate(rad);
        ctx.drawImage(img, -tileL * sc / 2, -tileL * sc / 2, tileL * sc + 0.8, tileL * sc + 0.8);
        ctx.restore();
        n++;
      } catch (e) {}
    }
    return n;
  }

  function drawTiles(ctx, W, H, sc) {
    var f = AS.mapx.currentFilter ? AS.mapx.currentFilter() : '';
    if (!f) return drawTilesRaw(ctx, W, H, sc);
    if (typeof ctx.filter === 'string') {
      ctx.save(); ctx.filter = f;
      var n = drawTilesRaw(ctx, W, H, sc);
      ctx.restore();
      return n;
    }
    return drawTilesRaw(ctx, W, H, sc);
  }

  /* 3D 틸트 원근 워프 (flat -> dst) */
  function warpTilt(srcCanvas, dstCtx, W, H, sc, tiltDeg) {
    var P = AS.mapx.PERSPECTIVE * sc;
    var ox = W * 0.5, oy = H * AS.mapx.TILT_ORIGIN_Y;
    var r = tiltDeg * Math.PI / 180;
    var cosR = Math.cos(r), sinR = Math.sin(r);
    dstCtx.fillStyle = S.theme === 'B' ? '#05090D' : '#1E293B';
    dstCtx.fillRect(0, 0, W, H);
    for (var sy = 0; sy < H; sy += 2) {
      var uy = sy - oy;
      var denom = P * cosR + uy * sinR;
      if (denom < 60 * sc) continue;
      var dy = (uy * P) / denom;
      var py = oy + dy;
      if (py < 0 || py >= H - 2) continue;
      var k = P / Math.max(80 * sc, P - dy * sinR);
      var dstW = W * k;
      var dstX = ox - ox * k;
      dstCtx.drawImage(srcCanvas, 0, py, W, 2, dstX, sy, dstW, 2.5);
    }
  }

  function roadSvgPromise(w, h) {
    if (S.bg !== 'road' || !S.roadId || S.roadId === 'blank') return Promise.resolve(null);
    var markup = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
      AS.roads.build(S.roadId, w, h) + '</svg>';
    return svgToImage(markup);
  }

  function compose(sc, opt) {
    sc = sc || 2;
    opt = opt || {};
    return new Promise(function (resolve, reject) {
      var st3 = $('#stage3d');
      var savedTransform = st3 ? st3.style.transform : '';
      if (st3) st3.style.transform = '';

      var stageR = $('#stage').getBoundingClientRect();
      var w = Math.round(stageR.width), h = Math.round(stageR.height);
      var W = w * sc, H = h * sc;
      var headCss = opt.headless ? 0 : 64, headH = Math.round(headCss * sc);

      var flat = document.createElement('canvas');
      flat.width = W; flat.height = H;
      var fctx = flat.getContext('2d');
      fctx.fillStyle = S.theme === 'B' ? '#05090D' : S.theme === 'C' ? '#0C1A2B' : '#F4F7FB';
      fctx.fillRect(0, 0, W, H);

      var capImg = $('#capImg');
      if (S.bg === 'capture' && S.cap.src && capImg && capImg.complete && capImg.naturalWidth) {
        /* 화면과 같은 배율·이동·회전으로 사진을 그린다 */
        var cb = S.cap.base, cm = AS.mapx.map;
        if (cb && cm) {
          var k2 = Math.pow(2, cm.getZoom() - cb.z);
          var pt2 = cm.latLngToContainerPoint([cb.lat, cb.lng]);
          var ms2 = cm.getSize();
          fctx.save();
          fctx.translate(W / 2 + (pt2.x - ms2.x / 2) * sc, H / 2 + (pt2.y - ms2.y / 2) * sc);
          var rad2 = (S.view.bearing || 0) * Math.PI / 180;
          if (rad2) fctx.rotate(rad2);
          fctx.scale(k2, k2);
          drawCover(fctx, capImg, -W / 2, -H / 2, W, H);
          fctx.restore();
        } else {
          drawCover(fctx, capImg, 0, 0, W, H);
        }
      } else if (S.bg === 'road' && S.roadId === 'blank') {
        var step = 28 * sc;
        fctx.strokeStyle = 'rgba(30,64,120,0.08)';
        fctx.lineWidth = Math.max(1, sc * 0.6);
        fctx.beginPath();
        for (var gx = 0; gx <= W; gx += step) { fctx.moveTo(gx, 0); fctx.lineTo(gx, H); }
        for (var gy = 0; gy <= H; gy += step) { fctx.moveTo(0, gy); fctx.lineTo(W, gy); }
        fctx.stroke();
      } else if (S.bg !== 'road') {
        drawTiles(fctx, W, H, sc);
      }

      if (st3) st3.style.transform = savedTransform;

      Promise.all([roadSvgPromise(w, h), svgToImage(AS.objs.svgMarkup())]).then(function (imgs) {
        if (imgs[0]) fctx.drawImage(imgs[0], 0, 0, W, H);
        fctx.drawImage(imgs[1], 0, 0, W, H);

        var cv = document.createElement('canvas');
        cv.width = W; cv.height = H + headH;
        var ctx = cv.getContext('2d');
        if (headH) drawHeader(ctx, W, headH, sc);

        ctx.save();
        ctx.translate(0, headH);
        ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
        if ((S.view.tilt || 0) > 0.2) warpTilt(flat, ctx, W, H, sc, S.view.tilt);
        else ctx.drawImage(flat, 0, 0);
        ctx.restore();

        ctx.strokeStyle = themeColors().line;
        ctx.lineWidth = Math.max(1, sc);
        ctx.strokeRect(.5, .5, cv.width - 1, cv.height - 1);

        ctx.font = font(Math.round(9.5 * sc), 700);
        ctx.fillStyle = themeColors().sub;
        ctx.textAlign = 'right';
        var wtxt = '사고약도';
        var tw = ctx.measureText(wtxt).width;
        var pad = Math.round(7 * sc);
        ctx.globalAlpha = .82;
        ctx.fillStyle = themeColors().head === '#FFFFFF' ? 'rgba(255,255,255,.86)' : 'rgba(6,12,20,.62)';
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(W - tw - pad * 3, H + headH - Math.round(24 * sc), tw + pad * 2, Math.round(17 * sc), Math.round(8 * sc));
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = themeColors().sub;
        ctx.fillText(wtxt, W - pad * 2, H + headH - Math.round(11 * sc));
        try {
          resolve(cv.toDataURL('image/png'));
        } catch (e) { reject(new Error('캔버스 보안 오류(타일 CORS)')); }
      }).catch(reject);
    });
  }

  function showPreview(url) {
    var body = $('#modalBody');
    delete body.dataset.lab;
    var name = '사고약도_' + stamp() + '.png';
    body.innerHTML =
      '<button class="mclose" data-close="1" aria-label="닫기">✕</button>' +
      '<h3>저장 이미지</h3>' +
      '<p class="mhint">아래 이미지를 길게 눌러 “사진에 저장” 하거나, 버튼으로 내려받으세요.</p>' +
      '<div class="preview"><img id="pvImg" alt="사고약도 미리보기" src="' + url + '" /></div>' +
      '<div class="mrow"><button class="btn primary" id="btnDownload">이미지 내려받기</button>' +
      '<button class="btn" data-close="1">닫기</button></div>' +
      '<p class="tip" id="pvSize"></p>';
    $('#modal').hidden = false;
    var img = $('#pvImg');
    var kb = Math.round(url.length * .75 / 1024);
    $('#pvSize').textContent = name + ' · 약 ' + kb + 'KB · ' + img.naturalWidth + '×' + img.naturalHeight;
    $('#btnDownload').addEventListener('click', function () {
      var a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      AS.toast('PNG 저장을 시작했습니다');
    });
  }

  function printReport(url) {
    var el = $('#printArea');
    var objs = S.objs;
    var cars = objs.filter(function (o) { return o.type === 'car'; });
    var carList = cars.map(function (o) {
      var nm = (C.CARS.filter(function (c) { return c.k === o.kind; })[0] || {}).n || o.kind;
      var rl = C.roleMeta(o.role || 'self').label;
      return nm + '(' + rl + ')';
    }).join(', ');
    var count = {
      '차량': cars.length,
      '사람·이동수단': objs.filter(function (o) { return o.type === 'person'; }).length,
      '충돌·파손': objs.filter(function (o) { return o.type === 'sym' && ['impact', 'damage', 'damage_dash', 'existing', 'existing_dash', 'nodamage', 'nodamage_dash'].indexOf(o.kind) >= 0; }).length,
      '경로·도로표시': objs.filter(function (o) { return o.type === 'sym' && ['impact', 'damage', 'damage_dash', 'existing', 'existing_dash', 'nodamage', 'nodamage_dash'].indexOf(o.kind) < 0; }).length,
      '메모·펜': objs.filter(function (o) { return o.type === 'memo' || o.type === 'pen' || o.type === 'vec'; }).length
    };
    var sum = Object.keys(count).filter(function (k) { return count[k]; }).map(function (k) { return k + ' ' + count[k]; }).join(' · ');

    el.innerHTML =
      '<div class="pr-head"><h1>사고약도</h1>' +
      '<div class="pr-meta">' + (fmtWhen(S.info.when) || '') + '<br>' + (S.info.place || '') + '</div></div>' +
      '<img src="' + url + '" alt="사고약도" />' +
      '<table class="pr-table">' +
      '<tr><th>사고 경위</th><td>' + (S.info.note || '—') + '</td></tr>' +
      '<tr><th>차량</th><td>' + (carList || '—') + '</td></tr>' +
      '<tr><th>배치 요소</th><td>' + (sum || '—') + '</td></tr>' +
      '<tr><th>작성</th><td>사고약도 · ' + new Date().toLocaleDateString('ko-KR') + '</td></tr>' +
      '</table>' +
      '<div class="pr-foot"><span>사고약도 — 현장 약도 작성 도구</span><span>cyrillush.github.io/miniapp/sketch</span></div>';

    var done = false;
    var fire = function () { if (done) return; done = true; window.print(); };
    var img = el.querySelector('img');
    if (img && !img.complete) { img.onload = function () { setTimeout(fire, 80); }; img.onerror = fire; }
    else setTimeout(fire, 120);
  }

  function confirmNew() {
    var body = $('#modalBody');
    delete body.dataset.lab;
    body.innerHTML =
      '<button class="mclose" data-close="1" aria-label="닫기">✕</button>' +
      '<h3>새 약도로 시작</h3>' +
      '<p class="mhint">지도에 놓은 모든 요소가 지워집니다. 저장하지 않은 작업은 되돌릴 수 없어요.</p>' +
      '<div class="mrow"><button class="btn ghost" data-close="1">취소</button>' +
      '<button class="btn primary" id="btnDoNew">초기화</button></div>';
    $('#modal').hidden = false;
    $('#btnDoNew').addEventListener('click', function () {
      C.reset(); AS.ui.closeModal(); AS.toast('새 약도를 시작합니다');
    });
  }

  AS.exportx = { openSave: openSave, compose: compose, _drawHeader: drawHeader, _themeColors: themeColors, showPreview: showPreview, printReport: printReport, confirmNew: confirmNew, stamp: stamp };
})(window.AS);
