/* ==========================================================================
   ui.js — 상단바 · 배경칩 · 독 · 피커시트 · 선택바 · 검색 · 비밀 테마 연구실
   ========================================================================== */
window.AS = window.AS || {};
(function (AS) {
  'use strict';
  var C = AS.core, $ = C.$, $$ = C.$$, S = AS.S;
  var sheetCat = null, toastTimer = null, qTimer = null, pvN = 0;

  /* ────────── 토스트 ────────── */
  function toast(msg, ms) {
    var el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, ms || 1900);
  }

  /* ────────── 미리보기 ────────── */
  function previewSVG(type, kind, opt) {
    opt = opt || {};
    var t = S.theme, inner = '', vb = { x: 0, y: 0, w: 100, h: 100 };
    if (type === 'car') {
      if (S.carMode !== 'vector' && window.CAR_SPRITES && window.CAR_SPRITES[kind]) {
        var sp = window.CAR_SPRITES[kind];
        var rm = C.roleMeta(opt.role || S.newRole);
        var ring = rm.key === 'none' ? '' : ' style="filter:drop-shadow(0 0 3px ' + rm.color + '88)"';
        return '<img class="sp-thumb" src="' + sp.src + '" alt=""' + ring + ' />';
      }
      var rKey = C.roleMeta(opt.role || S.newRole).key;
      if (rKey !== 'self' && rKey !== 'other' && rKey !== 'none') rKey = 'third';
      inner = ART3.car(t, kind, rKey);
      vb = { x: 0, y: 0, w: 120, h: 200 };
    }
    else if (type === 'person') { inner = ART3.person(t, kind); }
    else if (type === 'sym') { var s = ART3.sym(t, kind); inner = s.s; vb = C.vbox(s); }
    else if (type === 'memo') {
      return '<svg viewBox="0 0 60 30" width="82" height="41" style="color:var(--ink2)"><rect x="1.5" y="1.5" width="57" height="27" rx="8" fill="var(--acc-soft)" stroke="var(--acc)" stroke-width="1.3" stroke-opacity=".55"/><text x="30" y="16" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="700" fill="var(--ink)">메모</text></svg>';
    }
    var h = opt.h || 58;
    var w = h * (vb.w / vb.h);
    var MAXW = opt.maxW || 78;
    if (w > MAXW) { w = MAXW; h = w * (vb.h / vb.w); }
    if (opt.flip) {
      var cx2 = 2 * (vb.x + vb.w / 2);
      inner = '<g transform="translate(' + cx2 + ',0) scale(-1,1)">' + inner + '</g>';
    }
    pvN += 1;
    return '<svg viewBox="' + [vb.x, vb.y, vb.w, vb.h].join(' ') + '" width="' + Math.round(w) + '" height="' + Math.round(h) + '">' +
      C.nsMarkup(inner, 'pv' + pvN) + '</svg>';
  }

  /* ────────── 시트 ────────── */
  var TITLES = {
    road: ['도로', '횡단보도 · 신호 · 차로 표시를 지도에 놓으세요'],
    car: ['차량 (연속추돌 지원)', '차번을 고르고 차종을 누르면 자동으로 다음 번호로 넘어가요'],
    person: ['사람 · 이동수단', '보행자와 개인형 이동장치'],
    acc: ['사고 · 경로', '진행방향 · 충돌 · 파손 · 메모'],
    draw: ['그리기', '펜 색을 고르고 지도에 직접 그으세요']
  };

  function openSheet(cat) {
    sheetCat = cat;
    var t = TITLES[cat] || ['항목', ''];
    $('#sheetTitle').textContent = t[0];
    $('#sheetSub').textContent = t[1];
    var body = $('#sheetBody');
    body.innerHTML = '';
    var roleWrap = $('#sheetRole');

    if (cat === 'car') {
      if (S.newRole !== 'none') S.newRole = C.nextCarRole();
      roleWrap.hidden = false;
      renderRoles(roleWrap, true);
    } else roleWrap.hidden = true;

    var items = cat === 'car' ? C.CARS : cat === 'person' ? C.PEOPLE : null;
    if (items) {
      items.forEach(function (it) {
        var card = document.createElement('button');
        card.type = 'button'; card.className = 'card';
        card.innerHTML = '<span class="art">' + previewSVG(cat === 'car' ? 'car' : 'person', it.k, { h: cat === 'car' ? 68 : 52 }) + '</span><b>' + it.n + '</b>';
        card.addEventListener('click', function () {
          place({ type: cat === 'car' ? 'car' : 'person', kind: it.k, w: it.w });
        });
        body.appendChild(card);
      });
      if (cat === 'car') {
        var note = document.createElement('div');
        note.className = 'grp';
        note.textContent = '놓을 때마다 자차 → 대차 → 제3차 → 제4차… 순으로 자동 배정되며, 선택 후 복제(+)로도 바로 추가돼요';
        body.appendChild(note);
      }
    }

    if (cat === 'road') {
      addGroup(body, '횡단 · 신호');
      symCards(body, ['crosswalk', 'signal', 'pedsignal']);
      addGroup(body, '차로 표시');
      symCards(body, ['chip_stop', 'chip_lane', 'chip_oneway', 'chip_unprot', 'lane_dash', 'lane_center', 'lane_solid']);
    }

    if (cat === 'acc') {
      addGroup(body, '진행 방향');
      symCards(body, ['arrow', 'turn@0', 'turn@1', 'uturn']);
      addGroup(body, '충돌 · 파손');
      symCards(body, ['impact', 'damage', 'existing', 'nodamage']);
      addGroup(body, '메모');
      var mc = document.createElement('button');
      mc.type = 'button'; mc.className = 'card tool';
      mc.innerHTML = '<span class="art">' + previewSVG('memo') + '</span><b>텍스트 메모</b>';
      mc.addEventListener('click', function () {
        closeSheet();
        S.tool = 'memo';
        syncTool();
        toast('지도에서 메모할 곳을 톡 누르세요');
      });
      body.appendChild(mc);
    }

    if (cat === 'draw') buildDraw(body);
    $('#sheet').classList.add('open');
    $('#sheet').setAttribute('aria-hidden', 'false');
    syncDock(cat);
  }

  function addGroup(body, text) {
    var g = document.createElement('div');
    g.className = 'grp'; g.textContent = text;
    body.appendChild(g);
  }

  function symCards(body, list) {
    list.forEach(function (key) {
      var flip = key.indexOf('@1') > 0;
      var kind = key.split('@')[0];
      var def = null;
      C.SYM.forEach(function (s) { if (s.k === kind && (!!s.flip === flip) && !def) def = s; });
      if (!def) C.SYM.forEach(function (s) { if (s.k === kind && !def) def = s; });
      var card = document.createElement('button');
      card.type = 'button'; card.className = 'card';
      card.innerHTML = '<span class="art">' + previewSVG('sym', kind, { h: kind.indexOf('lane_') === 0 ? 52 : 40, flip: flip }) + '</span><b>' + (def ? def.n : kind) + '</b>';
      card.addEventListener('click', function () {
        place({ type: 'sym', kind: kind, w: def ? def.w : 50, flip: !!(def && def.flip) });
      });
      body.appendChild(card);
    });
  }

  function buildDraw(body) {
    var colors = [
      ['#E9413B', '빨강'], ['#2F6BFF', '파랑'], ['#0F172A', '검정'],
      ['#2E8A63', '초록'], ['#F2A93B', '주황']
    ];
    var head = document.createElement('div');
    head.className = 'grp'; head.textContent = '펜 색';
    body.appendChild(head);
    var row = document.createElement('div');
    row.style.cssText = 'grid-column:1/-1;display:flex;gap:10px;padding:4px 2px 8px';
    colors.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'card';
      b.style.cssText = 'flex:1;min-height:56px;padding:8px 4px;border-color:' + (S.pen.color === c[0] ? 'var(--acc)' : 'transparent');
      b.innerHTML = '<span class="dot" style="background:' + c[0] + '"></span><b style="font-size:10px">' + c[1] + '</b>';
      b.addEventListener('click', function () {
        S.pen.color = c[0];
        if (S.tool === 'pen') toast(c[1] + ' 펜으로 그리는 중');
        buildDrawBodyRefresh();
      });
      row.appendChild(b);
    });
    body.appendChild(row);

    addGroup(body, '도구');
    var tools = [
      ['pen', '자유 펜', '지도 위를 손가락으로 그어요'],
      ['vec', '직선 화살표', '끌어서 방향·길이 지정'],
      ['memo', '텍스트 메모', '메모할 곳을 톡 누르세요']
    ];
    tools.forEach(function (t) {
      var card = document.createElement('button');
      card.type = 'button'; card.className = 'card tool';
      var icon = t[0] === 'pen'
        ? '<svg viewBox="0 0 24 24" width="30" height="30" style="fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round"><path d="M4 17c3-1 4-6 7-6s3 4 6 3"/><circle cx="5" cy="17.5" r="1.4"/></svg>'
        : t[0] === 'vec'
          ? '<svg viewBox="0 0 24 24" width="30" height="30" style="fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round"><path d="M5 19 17.5 6.5"/><path d="M12.4 5.4h6.4v6.4"/></svg>'
          : previewSVG('memo');
      card.innerHTML = '<span class="art">' + icon + '</span><b>' + t[1] + '</b>';
      if (S.tool === t[0]) card.classList.add('on');
      card.addEventListener('click', function () {
        S.tool = S.tool === t[0] ? 'idle' : t[0];
        syncTool();
        if (S.tool === 'memo') { closeSheet(); toast('메모할 곳을 톡 누르세요'); return; }
        closeSheet();
        toast(S.tool === 'pen' ? '손가락으로 그어 약도를 그리세요' : '지도에서 끌어 화살표를 그리세요');
      });
      body.appendChild(card);
    });

    addGroup(body, '정리');
    var u = document.createElement('button');
    u.type = 'button'; u.className = 'card wide';
    u.innerHTML = '<b>↶ 실행취소</b>';
    u.addEventListener('click', function () { C.undo(); });
    body.appendChild(u);
    var clr = document.createElement('button');
    clr.type = 'button'; clr.className = 'card wide';
    clr.innerHTML = '<b style="color:var(--red)">✕ 전체 초기화</b>';
    clr.addEventListener('click', function () {
      closeSheet();
      AS.exportx.confirmNew();
    });
    body.appendChild(clr);
  }

  function buildDrawBodyRefresh() {
    var body = $('#sheetBody');
    body.innerHTML = '';
    buildDraw(body);
  }

  function place(spec) {
    S.tool = 'idle';
    syncTool();
    closeSheet();
    AS.objs.add(spec);
    toast(labelOf(spec) + ' 배치');
  }

  function labelOf(spec) {
    var list = spec.type === 'car' ? C.CARS : spec.type === 'person' ? C.PEOPLE : C.SYM;
    for (var i = 0; i < list.length; i++) if (list[i].k === spec.kind) return list[i].n;
    return '요소';
  }

  function closeSheet() {
    $('#sheet').classList.remove('open');
    $('#sheet').setAttribute('aria-hidden', 'true');
    syncDock(null);
  }

  function syncDock(cat) {
    $$('#dock .dk[data-cat]').forEach(function (b) { b.classList.toggle('on', b.dataset.cat === cat); });
  }

  /* ────────── 역할 세그먼트 (연속추돌 다중 차량 지원) ────────── */
  function renderRoles(wrap, big) {
    wrap.innerHTML = '';
    var selO = AS.objs.selObj();
    var activeRole = (!big && selO && selO.type === 'car') ? C.normRole(selO.role || 'self') : C.normRole(S.newRole || 'self');
    var list = C.roleList(true);
    list.forEach(function (r) {
      var b = document.createElement('button');
      b.type = 'button';
      if (r.indexOf('__next:') === 0) {
        var nxt = parseInt(r.split(':')[1], 10);
        var nextKey = 'c' + nxt;
        b.className = 'addrole';
        b.textContent = '+' + nxt + '차';
        b.addEventListener('click', function () {
          S.newRole = nextKey;
          var o = AS.objs.selObj();
          if (o && o.type === 'car') { o.role = nextKey; AS.objs.render(); C.pushUndo(); }
          C.save();
          renderRoles(wrap, big);
          if (sheetCat === 'car') refreshCarSheetThumbs(nextKey);
          selbar();
          toast('제' + nxt + '차 선택');
        });
        wrap.appendChild(b);
        return;
      }
      var rm = C.roleMeta(r);
      var lbl = big ? (r === 'none' ? '표시없음' : rm.label) : (r === 'none' ? '없음' : rm.short);
      if (r === 'none') {
        b.textContent = lbl;
      } else {
        b.innerHTML = '<i class="rdot" style="background:' + rm.color + '"></i><span>' + lbl + '</span>';
      }
      if (activeRole === r) b.className = 'on';
      b.addEventListener('click', function () {
        S.newRole = r;
        C.save();
        var o = AS.objs.selObj();
        if (o && o.type === 'car') { o.role = r; AS.objs.render(); C.pushUndo(); }
        renderRoles(wrap, big);
        if (sheetCat === 'car') refreshCarSheetThumbs(r);
        selbar();
      });
      wrap.appendChild(b);
    });
    var onBtn = wrap.querySelector('button.on');
    if (onBtn && onBtn.scrollIntoView) {
      try { onBtn.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (e) {}
    }
  }

  function refreshCarSheetThumbs(role) {
    var body = $('#sheetBody');
    $$('.card', body).forEach(function (card, i) {
      if (C.CARS[i]) {
        var art = card.querySelector('.art');
        if (art) art.innerHTML = previewSVG('car', C.CARS[i].k, { h: 68, role: role });
      }
    });
  }

  /* ────────── 선택 미니바 ────────── */
  function selbar() {
    var bar = $('#selBar'), o = AS.objs.selObj();
    if (!o) { bar.hidden = true; return; }
    bar.hidden = false;
    var isCar = o.type === 'car', isPen = o.type === 'pen';
    var pa = $('#btnPenArrow');
    if (pa) {
      pa.hidden = !isPen;
      pa.classList.toggle('on', !!(isPen && o.arrowEnd));
    }
    var zin = bar.querySelector('[data-act="zin"]'), zout = bar.querySelector('[data-act="zout"]');
    if (zin) zin.hidden = isPen;
    if (zout) zout.hidden = isPen;
    $('#roleSeg').style.display = isCar ? '' : 'none';
    $('#roleSep').style.display = isCar ? '' : 'none';
    if (isCar) renderRoles($('#roleSeg'), false);
    var info = [];
    if (!isPen) {
      info.push(Math.round(o.rot) + '°');
      info.push(o.sc.toFixed(2) + '×');
    } else info.push(o.snapped || '펜');
    $('#selInfo').textContent = info.join(' · ');
  }

  /* ────────── 도구 상태 칩 ────────── */
  function syncTool() {
    var c = $('#toolChip');
    if (!c) return;
    if (!S.tool || S.tool === 'idle') { c.hidden = true; return; }
    c.hidden = false;
    c.textContent = S.tool === 'pen' ? '✏️ 그리는 중 · 2초 꾹 누르면 모양 보정 · 끝내기'
      : S.tool === 'vec' ? '↗ 화살표로 긋는 중 · 끝내기'
        : '💬 메모할 곳을 누르세요 · 취소';
  }

  /* ────────── 배경 칩 ────────── */
  function bgchips() {
    $$('#bgChips button[data-bg]').forEach(function (b) { b.classList.toggle('on', b.dataset.bg === S.bg); });
  }

  /* ────────── 검색 ────────── */
  function openSearch() {
    $('#search').classList.add('open');
    setTimeout(function () { $('#q').focus(); }, 220);
  }
  function closeSearch() {
    $('#search').classList.remove('open');
    $('#q').blur();
  }
  function renderResults(list) {
    var box = $('#qList');
    if (!list.length) { box.innerHTML = '<p class="qempty">결과가 없어요. 도로명이나 건물명으로 다시 입력해 보세요.</p>'; return; }
    box.innerHTML = '';
    list.forEach(function (it) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'qitem';
      b.innerHTML = '<i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M12 21s6.2-6.3 6.2-11A6.2 6.2 0 0 0 5.8 10c0 4.7 6.2 11 6.2 11Z"/><circle cx="12" cy="10" r="2.3"/></svg></i>' +
        '<span style="flex:1"><b>' + AS.objs.esc(it.name) + '</b><span>' + AS.objs.esc(it.addr || '') + '</span></span>';
      b.addEventListener('click', function () {
        closeSearch();
        S.info.place = it.name;
        $('#placeTxt').textContent = it.name;
        $('#searchPill').classList.add('has');
        AS.mapx.fly(it.lat, it.lng, 19);
        AS.mapx.setLock(false);
        toast(it.name + ' (으)로 이동');
        C.save();
      });
      box.appendChild(b);
    });
  }
  function doSearch() {
    var q = $('#q').value.trim();
    if (!q) return;
    $('#qList').innerHTML = '<p class="qempty">찾는 중…</p>';
    AS.mapx.search(q).then(function (list) { renderResults(list); });
  }

  /* ────────── 비밀 테마 연구실 ────────── */
  var THEMES = [
    { k: 'A', n: '모던 모빌리티', d: '화이트 글래스 · 비비드 오렌지', sw: ['#FF6B2C', '#2F6BFF', '#64748B', '#FFFFFF'] },
    { k: 'B', n: '다크 콕핏', d: '카본 다크 · 네온 시안', sw: ['#2FE6FF', '#FFB627', '#FF5C8A', '#0A141A'] },
    { k: 'C', n: '정밀 도면', d: '딥네이비 · 에메랄드 계측', sw: ['#3FD3A8', '#4FA3FF', '#A7C2D8', '#0F2033'] },
    { k: 'D', n: '볼드 스티커', d: '크림 · 다이컷 스티커', sw: ['#FF5A36', '#1E6BFF', '#FFDD3D', '#FFF6E4'] }
  ];

  function openLab(first) {
    if (!$('#modal').hidden && $('#modalBody').dataset.lab === '1') return;
    var body = $('#modalBody');
    body.dataset.lab = '1';
    body.innerHTML = '<button class="mclose" data-close="1" aria-label="닫기">✕</button>' +
      '<h3>🎨 디자인 연구실</h3>' +
      '<p class="mhint">앱 UI와 지도 위 모든 차량·기호가 함께 바뀝니다. 취향을 골라 두면 다음에도 유지돼요.</p>' +
      '<div class="labgrid">' + THEMES.map(function (t) {
        return '<button class="labcard' + (S.theme === t.k ? ' on' : '') + '" data-theme="' + t.k + '" type="button">' +
          '<span class="sw">' + t.sw.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join('') + '</span>' +
          '<b>' + t.n + '</b><span>' + t.d + '</span>' +
          '<span class="mini">' + labMini(t.k) + '</span></button>';
      }).join('') + '</div>' +
      '<div class="roles big" id="labCarMode" style="margin:8px 0 4px">' +
      '<button type="button" data-cm="real" class="' + (S.carMode !== 'vector' ? 'on' : '') + '">✨ 실사 미니어처</button>' +
      '<button type="button" data-cm="vector" class="' + (S.carMode === 'vector' ? 'on' : '') + '">📐 플랫 벡터</button></div>' +
      '<p class="tip">이 화면은 제목 “사고약도”를 5번 두드리거나 0.6초 길게 누르면 언제든 열 수 있어요.</p>' +
      '<div class="mrow"><button class="btn primary" data-close="1">닫기</button></div>';
    $('#modal').hidden = false;
    $$('.labcard', body).forEach(function (b) {
      b.addEventListener('click', function () { setTheme(b.dataset.theme); $$('.labcard', body).forEach(function (x) { x.classList.toggle('on', x === b); }); });
    });
    $$('#labCarMode button', body).forEach(function (b) {
      b.addEventListener('click', function () {
        S.carMode = b.dataset.cm;
        $$('#labCarMode button', body).forEach(function (x) { x.classList.toggle('on', x === b); });
        AS.objs.render(); C.save();
        toast(S.carMode === 'real' ? '실사 미니어처 차량 적용' : '플랫 벡터 차량 적용');
      });
    });
    if (first) toast('디자인 연구실이 열렸어요', 2200);
  }

  function labMini(t) {
    var inner = ART3.car(t, 'sedan', 'self');
    var np = 'lm' + (++pvN);
    return '<svg viewBox="0 0 120 200" width="26" height="44">' + C.nsMarkup(inner, np) + '</svg>' +
      '<svg viewBox="0 0 92 92" width="26" height="26">' + C.nsMarkup(ART3.sym(t, 'impact').s, np + 'i') + '</svg>';
  }

  function setTheme(k) {
    var prev = S.theme;
    S.theme = k;
    // 다크 콕핏(B)은 다크 지도와 어울린다 — 사용자가 직접 고른 배경이 아니면 자동 전환
    if (k === 'B' && (S.bg === 'map' || S.bg === 'sat')) { S._prevBg = S.bg; AS.mapx.setBg('dark'); }
    else if (prev === 'B' && k !== 'B' && S.bg === 'dark' && S.autoDark) AS.mapx.setBg(S._prevBg || 'sat');
    S.autoDark = (k === 'B');
    document.body.setAttribute('data-theme', k);
    var meta = document.getElementById('metaTheme');
    var map = { A: '#EEF2F8', B: '#05090D', C: '#0C1A2B', D: '#FBF3E4' };
    if (meta) meta.setAttribute('content', map[k] || '#EEF2F8');
    AS.objs.render();
    AS.objs.chrome();
    selbar();
    C.save();
  }

  /* ────────── 메모 ────────── */
  var memoPoint = null;
  function openMemo(p) {
    memoPoint = p || { x: S.stage.w / 2, y: S.stage.h / 2 };
    var w = $('#memoWrap');
    w.hidden = false;
    var inp = $('#memoInput');
    inp.value = '';
    setTimeout(function () { inp.focus(); }, 40);
  }
  function closeMemo() { $('#memoWrap').hidden = true; }
  function commitMemo() {
    var inp = $('#memoInput');
    var t = inp.value.trim();
    closeMemo();
    if (!t) return;
    AS.objs.addMemo(t, memoPoint.x, memoPoint.y);
    toast('메모 추가');
  }

  /* ────────── 바인딩 ────────── */
  function bind() {
    $$('#dock .dk[data-cat]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (sheetCat === b.dataset.cat && $('#sheet').classList.contains('open')) closeSheet();
        else openSheet(b.dataset.cat);
      });
    });
    $('#sheetClose').addEventListener('click', closeSheet);
    $('#toolChip').addEventListener('click', function () {
      S.tool = 'idle'; syncTool(); toast('그리기를 끝냈어요');
    });
    $('#sheet').addEventListener('click', function (e) { if (e.target === $('#sheet')) closeSheet(); });

    $('#btnUndo').addEventListener('click', function () { C.undo(); });
    $('#btnSave').addEventListener('click', function () { AS.exportx.openSave(); });

    $$('#bgChips button[data-bg]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.dataset.bg === 'capture') {
          if (!S.cap.src || S.bg === 'capture') { $('#fileInput').click(); return; }
        }
        AS.mapx.setBg(b.dataset.bg);
      });
    });
    $('#fileInput').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        S.cap.src = fr.result;
        $('#capImg').src = fr.result;
        AS.mapx.setBg('capture');
        toast('캡처 배경으로 사용합니다');
        C.save();
      };
      fr.readAsDataURL(f);
    });

    $('#btnLock').addEventListener('click', function () { AS.mapx.setLock(!S.lock); });
    $('#btnGeo').addEventListener('click', function () {
      toast('현위치 확인 중…');
      AS.mapx.geolocate().then(function (p) {
        AS.mapx.fly(p.lat, p.lng, 19);
        AS.mapx.setLock(false);
        toast('현위치로 이동했습니다');
      }).catch(function (e) {
        toast(e && e.code === 1 ? '위치 권한이 꺼져 있어요' : '현위치를 잡지 못했어요');
      });
    });

    $('#searchPill').addEventListener('click', openSearch);
    $('#searchClose').addEventListener('click', closeSearch);
    $('#search').addEventListener('click', function (e) { if (e.target === $('#search')) closeSearch(); });
    $('#qGo').addEventListener('click', doSearch);
    $('#q').addEventListener('input', function () {
      clearTimeout(qTimer);
      var v = $('#q').value.trim();
      if (v.length < 2) return;
      qTimer = setTimeout(doSearch, 420);
    });
    $('#q').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } });

    // 나침반 1손가락 회전 스와이프 / 탭하면 정북(0°)
    var cmp = $('#compassBtn');
    if (cmp) {
      var cmpDrag = null;
      cmp.addEventListener('pointerdown', function (e) {
        e.stopPropagation();
        cmpDrag = { x0: e.clientX, b0: S.view.bearing || 0, moved: false };
        try { cmp.setPointerCapture(e.pointerId); } catch (er) {}
      });
      cmp.addEventListener('pointermove', function (e) {
        if (!cmpDrag) return;
        var dx = e.clientX - cmpDrag.x0;
        if (!cmpDrag.moved && Math.abs(dx) < 4) return;
        cmpDrag.moved = true;
        AS.mapx.setBearing(cmpDrag.b0 + dx * 0.8, true);
      });
      var cmpEnd = function () {
        if (!cmpDrag) return;
        if (!cmpDrag.moved) {
          AS.mapx.setBearing(0, false);
          toast('지도를 정북(0°)으로 맞췄어요');
        }
        cmpDrag = null;
      };
      cmp.addEventListener('pointerup', cmpEnd);
      cmp.addEventListener('pointercancel', cmpEnd);
    }

    // 선택 미니바
    $('#selBar').addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (!b) return;
      var a = b.dataset.act;
      if (a === 'zin') AS.objs.scaleBy(1 / 1.18);
      else if (a === 'zout') AS.objs.scaleBy(1.18);
      else if (a === 'arrow') AS.objs.togglePenArrow();
      else if (a === 'del') AS.objs.del();
      else if (a === 'dup') AS.objs.dup();
    });

    // 비밀 테마: 5연타 또는 0.6초 롱프레스
    var brand = $('#brandTap'), taps = 0, tapTimer = null, holdTimer = null, held = false;
    brand.addEventListener('pointerdown', function () {
      held = false;
      clearTimeout(holdTimer);
      holdTimer = setTimeout(function () { held = true; openLab(true); }, 600);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
      brand.addEventListener(ev, function () { clearTimeout(holdTimer); });
    });
    brand.addEventListener('click', function (e) {
      e.preventDefault();
      if (held) { held = false; taps = 0; return; }
      taps += 1;
      clearTimeout(tapTimer);
      tapTimer = setTimeout(function () { taps = 0; }, 2000);
      if (taps >= 5) { taps = 0; clearTimeout(tapTimer); openLab(true); }
    });
    brand.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    // 메모
    $('#memoOk').addEventListener('click', commitMemo);
    $('#memoInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); commitMemo(); } });
    $('#memoWrap').addEventListener('click', function (e) { if (e.target === $('#memoWrap')) closeMemo(); });

    // 모달 공통 닫기
    $('#modal').addEventListener('click', function (e) {
      if (e.target.closest('[data-close]') || e.target.classList.contains('mscrim')) closeModal();
    });

    window.addEventListener('keydown', function (e) {
      if (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
      if (e.key === 'Escape') { closeSheet(); closeSearch(); closeModal(); closeMemo(); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && S.sel) { e.preventDefault(); AS.objs.del(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); C.undo(); }
      if (e.key === 'l' || e.key === 'L') AS.mapx.setLock(!S.lock);
    });

    window.addEventListener('afterprint', function () {
      setTimeout(function () { measure(); if (AS.mapx.map) AS.mapx.map.invalidateSize(); AS.objs.layout(); }, 120);
    });
    window.addEventListener('resize', function () {
      measure();
      if (AS.mapx.map) AS.mapx.map.invalidateSize();
      AS.objs.layout();
    });
    window.addEventListener('orientationchange', function () { setTimeout(function () { measure(); AS.objs.layout(); }, 300); });
  }

  function closeModal() {
    $('#modal').hidden = true;
    var b = $('#modalBody');
    b.innerHTML = '';
    delete b.dataset.lab;
  }

  function measure() {
    var r = $('#stage').getBoundingClientRect();
    S.stage.w = r.width; S.stage.h = r.height;
  }

  AS.toast = toast;

  AS.ui = {
    toast: toast, bind: bind, syncTool: syncTool, openSheet: openSheet, closeSheet: closeSheet, selbar: selbar, bgchips: bgchips,
    openSearch: openSearch, closeSearch: closeSearch, openLab: openLab, setTheme: setTheme,
    memo: openMemo, closeModal: closeModal, measure: measure, previewSVG: previewSVG,
    renderRoles: renderRoles, syncDock: syncDock, THEMES: THEMES
  };
})(window.AS);
