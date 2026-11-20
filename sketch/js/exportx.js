/* ==========================================================================
   exportx.js — 저장 · PNG 합성(지도 타일 + 약도 + 머리글) · A4 보고서 인쇄
   ========================================================================== */
window.AS = window.AS || {};
(function (AS) {
  'use strict';
  var C = AS.core, $ = C.$, $$ = C.$$, S = AS.S;

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

  /* ────────── 저장 모달 ────────── */
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
      '<p class="tip">PNG는 지도 배경 + 배치 요소 + 머리글이 합성된 이미지입니다. 휴대폰에서 저장이 막히면 미리보기 이미지를 길게 눌러 “사진 저장”을 쓰세요.</p>';
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
        AS.toast('이미지 합성 실패 · ' + (e && e.message ? e.message : '알 수 없는 오류'), 2600);
      });
    });
    $('#btnRep').addEventListener('click', function () {
      read();
      compose(2, { headless: true }).then(function (url) { printReport(url); }).catch(function () { AS.toast('보고서 이미지 생성 실패'); });
    });
    $('#btnNew').addEventListener('click', confirmNew);
  }

  function esc(s) { return AS.objs.esc(s || ''); }

  /* ────────── PNG ────────── */
  function svgToImage(markup, w, h) {
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
    // 액센트 바
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
    var n = 0;
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      if (!img.complete || !img.naturalWidth) continue;
      var r = img.getBoundingClientRect();
      if (r.width < 2 || r.bottom < stageR.top || r.top > stageR.bottom) continue;
      try {
        ctx.drawImage(img, (r.left - stageR.left) * sc, (r.top - stageR.top) * sc, r.width * sc, r.height * sc);
        n++;
      } catch (e) { /* 타일 하나 실패는 무시 */ }
    }
    return n;
  }

  /* 화면의 CSS 필터(다크·도면)를 캔버스에도 동일하게 적용 */
  function drawTiles(ctx, W, H, sc) {
    var f = AS.mapx.currentFilter ? AS.mapx.currentFilter() : '';
    if (!f) return drawTilesRaw(ctx, W, H, sc);
    if (typeof ctx.filter === 'string') {
      ctx.save();
      ctx.filter = f;
      var n = drawTilesRaw(ctx, W, H, sc);
      ctx.restore();
      return n;
    }
    var t = document.createElement('canvas');
    t.width = W; t.height = H;
    var tc = t.getContext('2d');
    drawTilesRaw(tc, W, H, sc);
    try {
      var data = tc.getImageData(0, 0, W, H), d = data.data;
      var inv = f.indexOf('invert') >= 0, gray = f.indexOf('grayscale') >= 0;
      for (var i = 0; i < d.length; i += 4) {
        var r = d[i], g = d[i + 1], b = d[i + 2];
        if (gray) { var l = 0.299 * r + 0.587 * g + 0.114 * b; r = g = b = l; }
        if (inv) { r = 255 - r; g = 255 - g; b = 255 - b; }
        d[i] = r * .9; d[i + 1] = g * .9; d[i + 2] = b * .9;
      }
      tc.putImageData(data, 0, 0);
      ctx.drawImage(t, 0, 0);
    } catch (e) { /* 픽셀 접근 실패 시 원본 유지 */ }
    return 1;
  }

  function compose(sc, opt) {
    sc = sc || 2;
    opt = opt || {};
    return new Promise(function (resolve, reject) {
      var stageR = $('#stage').getBoundingClientRect();
      var w = Math.round(stageR.width), h = Math.round(stageR.height);
      var W = w * sc, H = h * sc;
      var headCss = opt.headless ? 0 : 64, headH = Math.round(headCss * sc);
      var cv = document.createElement('canvas');
      cv.width = W; cv.height = H + headH;
      var ctx = cv.getContext('2d');

      if (headH) drawHeader(ctx, W, headH, sc);

      ctx.save();
      ctx.translate(0, headH);
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.clip();            // 타일이 머리글 영역을 덮지 않도록 지도 영역만 그린다
      ctx.fillStyle = S.theme === 'B' ? '#05090D' : S.theme === 'C' ? '#0C1A2B' : '#EEF2F8';
      ctx.fillRect(0, 0, W, H);

      var capImg = $('#capImg');
      if (S.bg === 'capture' && S.cap.src && capImg && capImg.complete && capImg.naturalWidth) {
        drawCover(ctx, capImg, 0, 0, W, H);
      } else {
        drawTiles(ctx, W, H, sc);
      }
      ctx.restore();

      var markup = AS.objs.svgMarkup();
      svgToImage(markup, w, h).then(function (img) {
        ctx.drawImage(img, 0, headH, W, H);
        // 테두리
        ctx.strokeStyle = themeColors().line;
        ctx.lineWidth = Math.max(1, sc);
        ctx.strokeRect(.5, .5, cv.width - 1, cv.height - 1);
        // 워터마크
        ctx.font = font(Math.round(9.5 * sc), 700);
        ctx.fillStyle = themeColors().sub;
        ctx.textAlign = 'right';
        var wtxt = '사고약도 v3';
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

  /* ────────── PNG 미리보기 ────────── */
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

  /* ────────── A4 보고서 ────────── */
  function printReport(url) {
    var el = $('#printArea');
    var objs = S.objs;
    var cars = objs.filter(function (o) { return o.type === 'car'; });
    var rows = [];
    var roleName = C.ROLE_NAME;
    var carList = cars.map(function (o, i) {
      var nm = (C.CARS.filter(function (c) { return c.k === o.kind; })[0] || {}).n || o.kind;
      return nm + '(' + roleName[o.role || 'self'] + ')';
    }).join(', ');
    var count = {
      '차량': cars.length,
      '사람·이동수단': objs.filter(function (o) { return o.type === 'person'; }).length,
      '충돌·파손': objs.filter(function (o) { return o.type === 'sym' && ['impact', 'damage', 'existing', 'nodamage'].indexOf(o.kind) >= 0; }).length,
      '경로·도로표시': objs.filter(function (o) { return o.type === 'sym' && ['impact', 'damage', 'existing', 'nodamage'].indexOf(o.kind) < 0; }).length,
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
      '<tr><th>작성</th><td>사고약도 v3 · ' + new Date().toLocaleDateString('ko-KR') + '</td></tr>' +
      '</table>' +
      '<div class="pr-foot"><span>사고약도 — 현장 약도 작성 도구</span><span>cyrillush.github.io/miniapp/sketch</span></div>';

    var done = false;
    var fire = function () { if (done) return; done = true; window.print(); };
    var img = el.querySelector('img');
    if (img && !img.complete) { img.onload = function () { setTimeout(fire, 80); }; img.onerror = fire; }
    else setTimeout(fire, 120);
    window.onafterprint = function () { /* 인쇄 후에도 DOM 유지(재인쇄 가능) */ };
  }

  /* ────────── 새 약도 ────────── */
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
      C.reset();
      AS.ui.closeModal();
      AS.toast('새 약도를 시작합니다');
    });
  }

  AS.exportx = { openSave: openSave, compose: compose, _drawHeader: drawHeader, _themeColors: themeColors, showPreview: showPreview, printReport: printReport, confirmNew: confirmNew, stamp: stamp };
})(window.AS);
