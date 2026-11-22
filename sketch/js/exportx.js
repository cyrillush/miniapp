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
      '<p class="mhint">약도만 담긴 한 장(PNG)으로 저장합니다 — 글자 없이 화면 전체 약도.</p>' +
      '<div class="fld"><span>일시</span><input id="fWhen" type="datetime-local" value="' + (S.info.when || nowLocal()) + '" /></div>' +
      '<div class="fld"><span>장소</span><input id="fPlace" type="text" maxlength="60" placeholder="예) 서초대로 ○○사거리" value="' + esc(S.info.place || '') + '" /></div>' +
      '<div class="fld"><span>사고 경위 (한 줄)</span><input id="fNote" type="text" maxlength="70" placeholder="예) 2차로 주행 중 우측에서 진입한 차량과 충돌" value="' + esc(S.info.note || '') + '" /></div>' +
      '<div class="mrow"><button class="btn primary" id="btnPng">PNG 저장</button>' +
      '<button class="btn" id="btnRep">A4 보고서</button></div>' +
      '<div class="mrow"><button class="btn ghost sm" id="btnClear">전체 지우기</button>' +
      '<button class="btn ghost sm" id="btnNew">새 약도</button>' +
      '<button class="btn ghost sm" data-close="1">닫기</button></div>' +
      '<p class="tip">PNG는 배경 + 배치 요소만 담깁니다(글자·워터마크 없음). 일시·장소·경위는 A4 보고서에 들어갑니다.</p>';
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

  /* PNG = 순수 약도 한 장.
     화면의 #world 그룹(사진 배경 또는 도로 도면 + 요소 + 펜)을 그대로 SVG 로 다시 그려
     래스터한다 — 사진 확대/이동/회전 변환도 화면과 정확히 같은 배율로 찍힌다.
     머리글·일시·장소·경위·워터마크·테두리는 넣지 않는다(A4 보고서 몫). */
  function backdrop() {
    if (S.mode === 'photo') return '#0E1319';
    if (!S.roadId || S.roadId === 'blank') return '#F4F7FB';
    return '#E8EDF3';
  }

  function sketchSvg(w, h) {
    var parts = [];
    parts.push('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="' + w + '" height="' + h +
      '" viewBox="0 0 ' + w + ' ' + h + '">');
    parts.push('<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="' + backdrop() + '"/>');
    /* 사진 레이어 — 사진 모드에서만, 사진 변환(확대·회전·이동)을 그대로 적용 */
    if (S.mode === 'photo' && S.photo && S.photo.src) {
      parts.push('<g transform="' + AS.view.photoTransform() + '">');
      parts.push('<image x="0" y="0" width="' + w + '" height="' + h +
        '" preserveAspectRatio="xMidYMid slice" href="' + S.photo.src + '"/>');
      parts.push('</g>');
    }
    if (S.mode === 'road' && S.roadId && S.roadId !== 'blank') {
      parts.push(AS.roads.build(S.roadId, w, h));
    }
    /* 요소 레이어 — 화면 좌표 그대로(사진 배율·각도와 무관). 선택 크롬(#sel)·× 버튼은
       #artLayer 밖의 화면 전용 요소라 저장 결과에 들어가지 않는다. */
    var art = document.getElementById('artLayer');
    if (art) parts.push(art.innerHTML);
    parts.push('</svg>');
    return parts.join('');
  }

  function compose(sc, opt) {
    sc = sc || 2;
    opt = opt || {};
    return new Promise(function (resolve, reject) {
      if (AS.view && AS.view.syncStageBox) AS.view.syncStageBox();
      var stageR = $('#stage').getBoundingClientRect();
      var w = Math.round(stageR.width), h = Math.round(stageR.height);
      var W = w * sc, H = h * sc;
      svgToImage(sketchSvg(w, h)).then(function (img) {
        var cv = document.createElement('canvas');
        cv.width = W; cv.height = H;
        var ctx = cv.getContext('2d');
        ctx.fillStyle = backdrop();
        ctx.fillRect(0, 0, W, H);
        ctx.drawImage(img, 0, 0, W, H);
        try { resolve(cv.toDataURL('image/png')); }
        catch (e) { reject(new Error('캔버스 보안 오류(사진 CORS)')); }
      }).catch(function (e) { reject(new Error('약도 렌더 실패')); });
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
      '<p class="mhint">약도에 놓은 모든 요소가 지워집니다. 저장하지 않은 작업은 되돌릴 수 없어요.</p>' +
      '<div class="mrow"><button class="btn ghost" data-close="1">취소</button>' +
      '<button class="btn primary" id="btnDoNew">초기화</button></div>';
    $('#modal').hidden = false;
    $('#btnDoNew').addEventListener('click', function () {
      C.reset(); AS.ui.closeModal(); AS.toast('새 약도를 시작합니다');
    });
  }

  AS.exportx = { openSave: openSave, compose: compose, _drawHeader: drawHeader, _themeColors: themeColors, showPreview: showPreview, printReport: printReport, confirmNew: confirmNew, stamp: stamp };
})(window.AS);
