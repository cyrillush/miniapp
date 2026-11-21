/* ==========================================================================
   ui.js — 상단바 · 배경칩 · 독 · 피커시트 · 선택바 · 검색 · 비밀 테마 연구실
   ========================================================================== */
window.AS = window.AS || {};
(function (AS) {
  'use strict';
  var C = AS.core, $ = C.$, $$ = C.$$, S = AS.S;
  var sheetCat = null, toastTimer = null, qTimer = null, pvN = 0;

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
      rKey = rKey === 'self' ? 'self' : rKey === 'c1' ? 'other' : rKey === 'none' ? 'none' : 'third';
      inner = ART3.car(t, kind, rKey);
      vb = { x: 0, y: 0, w: 120, h: 200 };
    } else if (type === 'person') {
      inner = ART3.person(t, kind);
      if (opt.name !== false) {
        var pd = C.itemDef(kind, 'person');
        if (pd) {
          var tw = pd.n.length * 16 + 10;
          vb = { x: 0, y: 0, w: 100 + tw, h: 100 };
          inner += '<text x="104" y="50" font-size="16" font-weight="900" fill="#FFFFFF" text-anchor="start"' +
            ' dominant-baseline="middle" font-family="Pretendard,Apple SD Gothic Neo,Noto Sans KR,sans-serif"' +
            ' paint-order="stroke" stroke="#0B1524" stroke-width="5.4" stroke-linejoin="round">' + pd.n + '</text>';
        }
      }
    } else if (type === 'sym') {
      var s = ART3.sym(t, kind); inner = s.s; vb = C.vbox(s);
    } else if (type === 'memo') {
      return '<svg viewBox="0 0 60 30" width="82" height="41"><rect x="1.5" y="1.5" width="57" height="27" rx="8" fill="var(--acc-soft)" stroke="var(--acc)" stroke-width="1.3" stroke-opacity=".55"/><text x="30" y="16" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="700" fill="var(--ink)">메모</text></svg>';
    }
    var h = opt.h || 54;
    var w = h * (vb.w / vb.h);
    var MAXW = opt.maxW || 76;
    if (w > MAXW) { w = MAXW; h = w * (vb.h / vb.w); }
    if (opt.flip) {
      var cx2 = 2 * (vb.x + vb.w / 2);
      inner = '<g transform="translate(' + cx2 + ',0) scale(-1,1)">' + inner + '</g>';
    }
    pvN += 1;
    return '<svg viewBox="' + [vb.x, vb.y, vb.w, vb.h].join(' ') + '" width="' + Math.round(w) + '" height="' + Math.round(h) + '">' +
      C.nsMarkup(inner, 'pv' + pvN) + '</svg>';
  }

  /* ────────── 과실도표 프리셋 적용 ────────── */
  function applyPreset(pr) {
    C.pushUndo();
    S.objs = [];
    S.sel = null;
    AS.mapx.setBearing(0, false);
    AS.mapx.setTilt(0);
    AS.mapx.setRoad(pr.bg);
    var w = S.stage.w || 390, h = S.stage.h || 600;
    var geo = AS.roads.presetGeo ? AS.roads.presetGeo(pr, w, h) : null;
    /* 고정 비율(px) → 도로 함수와 동일한 차로 좌표로 배치 */
    var data = geo ? geo : {
      cars: (pr.cars || []).map(function (c) { return { kind: c.kind, role: c.role, x: c.x * w, y: c.y * h, rot: c.rot || 0 }; }),
      arrows: (pr.arrows || []).map(function (a) { return { color: a.color, pts: (a.pts || []).map(function (q) { return [q[0] * w, q[1] * h]; }) }; }),
      impact: pr.impact ? { x: pr.impact.x * w, y: pr.impact.y * h } : null
    };
    (data.cars || []).forEach(function (c) {
      var ll = AS.mapx.unproject(c.x, c.y);
      var o = C.makeObj({ type: 'car', kind: c.kind, role: c.role }, ll.lat, ll.lng);
      o.rot = c.rot || 0;
      S.objs.push(o);
    });
    (data.arrows || []).forEach(function (a) {
      if (!a.pts || a.pts.length < 2) return;
      var pts = a.pts.map(function (q) {
        var ll = AS.mapx.unproject(q[0], q[1]);
        return [ll.lat, ll.lng];
      });
      S.objs.push({
        id: C.uid(), type: 'pen', lat: pts[0][0], lng: pts[0][1], rot: 0, sc: 1,
        w: 1, h: 1, color: a.color || '#E9413B', lw: 3.8, arrowEnd: true, pts: pts
      });
    });
    if (data.impact) {
      var ill = AS.mapx.unproject(data.impact.x, data.impact.y);
      var imp = C.makeObj({ type: 'sym', kind: 'impact', w: 50 }, ill.lat, ill.lng);
      S.objs.push(imp);
    }
    if (pr.summary) S.info.note = pr.summary;
    S.newRole = C.nextCarRole();
    AS.mapx.setLock(true, true);
    AS.objs.render(); selbar(); C.save();
    closeSheet();
    toast('[' + pr.no + '] ' + pr.label + ' 적용');
  }

  /* ────────── 시트 ────────── */
  var TITLES = {
    road: ['', ''],
    car: ['차량 (연속추돌 지원)', '자차 · 대차1 · 대차2 · 대차3 순으로 자동 배정돼요'],
    person: ['사람 · 이동수단', '전원 흰색 · 배경판 없이 깔끔하게 배치돼요'],
    dmg: ['파손부위 · 충격', '배경판 없이 테두리·글자만 깔끔하게 올라갑니다'],
    etc: ['기타 요소 (신호·표지·선)', '배경 없이 신호등 · 횡단보도 · 차선 · 표지판 추가'],
    draw: ['그리기 · 메모', '펜으로 긋고 1초 누르면 화살표·도형이 반듯해져요']
  };

  function openSheet(cat) {
    sheetCat = cat;
    var t = TITLES[cat] || ['항목', ''];
    var head = $('#sheet .sheetwrap > header');
    var title = $('#sheetTitle'), sub = $('#sheetSub');
    title.textContent = t[0];
    sub.textContent = t[1];
    /* 도로는 제목 없이 깔끔하게 — 닫기 버튼만 남긴다 */
    if (head) head.classList.toggle('bare', cat === 'road');
    var body = $('#sheetBody');
    body.innerHTML = '';
    var roleWrap = $('#sheetRole');

    if (cat === 'car') {
      if (S.newRole !== 'none') S.newRole = C.nextCarRole();
      roleWrap.hidden = false;
      renderRoles(roleWrap, true);
    } else {
      roleWrap.hidden = true;
    }

    if (cat === 'road') {
      var rs = roadSearchUI(body);
      rs.group('자주 쓰는 사고 상황');
      AS.roads.PRESETS.forEach(function (pr) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'card preset';
        b.innerHTML = '<div class="pthumb">' + AS.roads.thumb(pr.bg) + '</div>' +
          '<div class="ptxt"><b>[' + pr.no + '] ' + pr.label + '</b><span>' + pr.summary + '</span></div>';
        b.addEventListener('click', function () { applyPreset(pr); });
        rs.add(b, '[' + pr.no + '] ' + pr.label + ' ' + pr.summary + ' ' + (pr.tags || '') + ' 과실도표 프리셋 빠른불러오기 ' + pr.bg);
      });
      [1, 2, 3, 4].forEach(function (g) {
        rs.group(AS.roads.GROUP_LABEL[g]);
        AS.roads.LIST.filter(function (r) { return r.g === g; }).forEach(function (r) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'card roadthumb' + (S.bg === 'road' && S.roadId === r.id ? ' on' : '');
          b.innerHTML = '<div class="rbox">' + AS.roads.thumb(r.id) + '</div><b>' + r.label + '</b>';
          b.addEventListener('click', function () {
            AS.mapx.setRoad(r.id);
            closeSheet();
            toast(r.label + ' 전체화면 적용');
          });
          rs.add(b, r.label + ' ' + r.id + ' ' + (r.tags || '') + ' 도로배경 배경');
        });
      });
    }

    if (cat === 'car') {
      C.CARS.forEach(function (it) {
        var card = document.createElement('button');
        card.type = 'button'; card.className = 'card';
        card.innerHTML = '<span class="art">' + previewSVG('car', it.k, { h: 66 }) + '</span><b>' + it.n + '</b>';
        card.addEventListener('click', function () { place({ type: 'car', kind: it.k, w: it.w }); });
        body.appendChild(card);
      });
      addGroup(body, '놓을 때마다 자차 → 대차1 → 대차2 → 대차3… 순으로 자동 지정되며, 선택 후 복제로도 이어 붙어요');
    }

    if (cat === 'person') {
      C.PEOPLE.forEach(function (it) {
        var card = document.createElement('button');
        card.type = 'button'; card.className = 'card';
        card.innerHTML = '<span class="art">' + previewSVG('person', it.k, { h: 52 }) + '</span><b>' + it.n + '</b>';
        card.addEventListener('click', function () { place({ type: 'person', kind: it.k, w: it.w }); });
        body.appendChild(card);
      });
    }

    if (cat === 'dmg') {
      addGroup(body, '파손 상태 · 충격지점 (투명 배경)');
      symCards(body, ['damage', 'damage_dash', 'nodamage', 'nodamage_dash', 'existing', 'existing_dash', 'damage_legend', 'impact']);
    }

    if (cat === 'etc') {
      addGroup(body, '경로 화살표 (흰색 노면 도색)');
      symCards(body, ['arrow', 'turn@0', 'turn@1', 'uturn']);
      addGroup(body, '신호등 (좌회전·우회전·직진 구분)');
      symCards(body, ['s4_go', 's4_left', 's4_go_left', 's4_red_left', 'sr_go', 'sr_stop', 's3_red', 's3_amber', 's3_green', 'ped_g', 'ped_r']);
      addGroup(body, '건물 · 횡단보도 · 차선 (배경 없음)');
      symCards(body, ['building', 'building_s', 'crosswalk', 'crosswalk_s', 'lane_dash', 'lane_solid', 'lane_center', 'lane_bus']);
      addGroup(body, '지시 · 규제 표지 (14종)');
      symCards(body, [
        'sign_straight', 'sign_left', 'sign_right', 'sign_uturn', 'sign_left_uturn',
        'sign_straight_right', 'sign_straight_left', 'sign_x',
        'chip_stop', 'chip_lane', 'chip_oneway', 'chip_unprot', 'chip_big', 'chip_small'
      ]);
      addGroup(body, '텍스트');
      var mc = document.createElement('button');
      mc.type = 'button'; mc.className = 'card tool';
      mc.innerHTML = '<span class="art">' + previewSVG('memo') + '</span><b>텍스트 메모</b>';
      mc.addEventListener('click', function () {
        closeSheet(); S.tool = 'memo'; syncTool(); toast('약도에서 메모할 곳을 톡 누르세요');
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
    return g;
  }

  /* 도로 시트 맨 위 검색 — 도로 템플릿·과실도표 전용(지도 검색 아님) */
  function roadSearchUI(body) {
    var wrap = document.createElement('div');
    wrap.className = 'rsearch';
    wrap.innerHTML =
      '<label class="rin">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="11" cy="11" r="6.6"/><path d="m19.6 19.6-3.4-3.4"/></svg>' +
      '<input id="rq" type="search" inputmode="search" autocomplete="off" placeholder="도로 종류 검색 (예: 사거리, 회전교차로, 골목길, 고가, 일방통행)" />' +
      '</label>' +
      '<p class="rhint">도로 배경·과실도표 카드를 이름으로 바로 걸러 줍니다.</p>';
    body.appendChild(wrap);

    var entries = [], groups = [], curGroup = null;
    var input = wrap.querySelector('#rq'), hint = wrap.querySelector('.rhint');
    var sync = function () {
      groups.forEach(function (g) {
        var any = false;
        for (var i = 0; i < entries.length; i++) if (entries[i].g === g && !entries[i].el.hidden) { any = true; break; }
        g.hidden = !any;
      });
    };
    var count = function (q) {
      var n = 0;
      for (var i = 0; i < entries.length; i++) if (!entries[i].el.hidden) n += 1;
      return n;
    };
    var filter = function () {
      var q = input.value.trim().toLowerCase();
      entries.forEach(function (e) {
        e.el.hidden = !!q && e.text.indexOf(q) < 0;
      });
      sync();
      if (!q) { hint.innerHTML = '도로 배경·과실도표 카드를 이름으로 바로 걸러 줍니다.'; return; }
      var n = count(q);
      hint.innerHTML = n
        ? '<b>' + n + '개</b> 도로 카드 · “' + AS.objs.esc(input.value.trim()) + '”'
        : '“' + AS.objs.esc(input.value.trim()) + '” 에 맞는 도로 카드가 없어요 — 사거리·골목·고가·톨게이트·유턴·버스전용 처럼 넣어 보세요';
    };
    input.addEventListener('input', filter);
    /* Enter 는 지도로 넘어가지 않고 현재 검색 결과 개수만 보여 준다 */
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); filter(); }
    });
    return {
      group: function (text) { curGroup = addGroup(body, text); groups.push(curGroup); return curGroup; },
      add: function (el, text) { entries.push({ el: el, text: String(text || '').toLowerCase(), g: curGroup }); body.appendChild(el); }
    };
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
      card.innerHTML = '<span class="art">' + previewSVG('sym', kind, { h: kind.indexOf('lane_') === 0 ? 52 : 42, flip: flip }) + '</span><b>' + (def ? def.n : kind) + '</b>';
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
    addGroup(body, '펜 색');
    var row = document.createElement('div');
    row.style.cssText = 'grid-column:1/-1;display:flex;gap:10px;padding:4px 2px 8px';
    colors.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'card';
      b.style.cssText = 'flex:1;min-height:54px;padding:8px 4px;border-color:' + (S.pen.color === c[0] ? 'var(--acc)' : 'transparent');
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
    var tools = [['pen', '자유 펜'], ['vec', '직선 화살표'], ['memo', '텍스트 메모']];
    tools.forEach(function (t) {
      var card = document.createElement('button');
      card.type = 'button'; card.className = 'card tool';
      var icon = t[0] === 'pen'
        ? '<svg viewBox="0 0 24 24" width="28" height="28" style="fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round"><path d="M4 17c3-1 4-6 7-6s3 4 6 3"/><circle cx="5" cy="17.5" r="1.4"/></svg>'
        : t[0] === 'vec'
          ? '<svg viewBox="0 0 24 24" width="28" height="28" style="fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round"><path d="M5 19 17.5 6.5"/><path d="M12.4 5.4h6.4v6.4"/></svg>'
          : previewSVG('memo');
      card.innerHTML = '<span class="art">' + icon + '</span><b>' + t[1] + '</b>';
      if (S.tool === t[0]) card.classList.add('on');
      card.addEventListener('click', function () {
        S.tool = S.tool === t[0] ? 'idle' : t[0];
        syncTool();
        closeSheet();
        if (S.tool === 'memo') toast('약도에서 메모할 곳을 톡 누르세요');
        else if (S.tool === 'pen') toast('그은 뒤 1초 누르면 화살표·도형이 반듯해져요');
        else if (S.tool === 'vec') toast('끌어서 화살표를 그리세요');
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
    clr.addEventListener('click', function () { closeSheet(); AS.exportx.confirmNew(); });
    body.appendChild(clr);
  }

  function buildDrawBodyRefresh() {
    var body = $('#sheetBody'); body.innerHTML = ''; buildDraw(body);
  }

  function place(spec) {
    S.tool = 'idle'; syncTool(); closeSheet();
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

  /* ────────── 역할 세그먼트 (자차 · 대차1 · 대차2 · 대차3 · +대차4) ────────── */
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
        b.textContent = '+대차' + nxt;
        b.addEventListener('click', function () {
          S.newRole = nextKey;
          var o = AS.objs.selObj();
          if (o && o.type === 'car') { o.role = nextKey; AS.objs.render(); C.pushUndo(); }
          C.save();
          renderRoles(wrap, big);
          if (sheetCat === 'car') refreshCarSheetThumbs(nextKey);
          selbar();
          toast('대차' + nxt + ' 선택');
        });
        wrap.appendChild(b);
        return;
      }
      var rm = C.roleMeta(r);
      var lbl = big ? rm.label : (r === 'none' ? '없음' : rm.short);
      if (r === 'none') b.textContent = lbl;
      else b.innerHTML = '<i class="rdot" style="background:' + rm.color + '"></i><span>' + lbl + '</span>';
      if (activeRole === r) b.className = 'on';
      b.addEventListener('click', function () {
        S.newRole = r; C.save();
        var o = AS.objs.selObj();
        if (o && o.type === 'car') { o.role = r; AS.objs.render(); C.pushUndo(); }
        renderRoles(wrap, big);
        if (sheetCat === 'car') refreshCarSheetThumbs(r);
        selbar();
      });
      wrap.appendChild(b);
    });
    var onBtn = wrap.querySelector('button.on');
    if (onBtn && onBtn.scrollIntoView) { try { onBtn.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (e) {} }
  }

  function refreshCarSheetThumbs(role) {
    var body = $('#sheetBody');
    $$('.card', body).forEach(function (card, i) {
      if (C.CARS[i]) {
        var art = card.querySelector('.art');
        if (art) art.innerHTML = previewSVG('car', C.CARS[i].k, { h: 66, role: role });
      }
    });
  }

  /* ────────── 선택 미니바 (하단바 내부) ────────── */
  function selbar() {
    var bar = $('#selBar'), o = AS.objs.selObj();
    if (!o) { bar.hidden = true; return; }
    bar.hidden = false;
    var isCar = o.type === 'car', isPen = o.type === 'pen';
    var pa = $('#btnPenArrow');
    if (pa) { pa.hidden = !isPen; pa.classList.toggle('on', !!(isPen && o.arrowEnd)); }
    var zin = bar.querySelector('[data-act="zin"]'), zout = bar.querySelector('[data-act="zout"]');
    if (zin) zin.hidden = isPen;
    if (zout) zout.hidden = isPen;
    $('#roleSeg').style.display = isCar ? '' : 'none';
    $('#roleSep').style.display = isCar ? '' : 'none';
    if (isCar) renderRoles($('#roleSeg'), false);
    var info = [];
    if (!isPen) { info.push(Math.round(o.rot) + '°'); info.push(o.sc.toFixed(2) + '×'); }
    else info.push(o.snapped || '펜');
    $('#selInfo').textContent = info.join(' · ');
  }

  function syncTool() {
    var c = $('#toolChip');
    var bp = $('#btnPen');
    var drawing = S.tool === 'pen' || S.tool === 'vec';
    if (bp) bp.setAttribute('aria-pressed', drawing ? 'true' : 'false');
    document.body.setAttribute('data-drawing', drawing ? '1' : '0');
    if (!c) return;
    if (!S.tool || S.tool === 'idle') { c.hidden = true; c.innerHTML = ''; return; }
    var t = S.tool === 'pen'
      ? { ic: '✏️', title: '그리기 중 — 선 긋기', sub: '한 손가락 긋기 · 두 손가락 확대·이동' }
      : S.tool === 'vec'
        ? { ic: '↗️', title: '화살표 긋는 중', sub: '한 손가락 화살표 · 두 손가락 확대·이동' }
        : { ic: '💬', title: '메모 위치 선택', sub: '약도에서 메모할 곳을 톡 누르세요' };
    c.innerHTML = '<span class="tp-ic">' + t.ic + '</span>' +
      '<span class="tp-tx"><b>' + t.title + '</b><i>' + t.sub + '</i></span>' +
      '<span class="tp-x">' + (S.tool === 'memo' ? '취소' : '✕ 끄기') + '</span>';
    c.hidden = false;
  }

  function bgchips() {
    $$('#bgChips button[data-bg]').forEach(function (b) { b.classList.toggle('on', b.dataset.bg === S.bg); });
    if (AS.mapx.syncLabelChip) AS.mapx.syncLabelChip();
  }

  /* ────────── 검색 ────────── */
  function openSearch() { $('#search').classList.add('open'); setTimeout(function () { $('#q').focus(); }, 220); }
  function openSearchWith(q) {
    openSearch();
    var inp = $('#q');
    inp.value = q || '';
    $('#qList').innerHTML = '<p class="qempty">찾는 중…</p>';
    setTimeout(doSearch, 160);
  }
  function closeSearch() { $('#search').classList.remove('open'); $('#q').blur(); }
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
        if (S.bg === 'road') AS.mapx.setBg('dark');
        AS.mapx.fly(it.lat, it.lng, 19);
        AS.mapx.setLock(false);
        toast(it.name + ' (으)로 이동');
        C.save();
      });
      box.appendChild(b);
    });
  }
  function doSearch() {
    var q = $('#q').value.trim(); if (!q) return;
    $('#qList').innerHTML = '<p class="qempty">찾는 중…</p>';
    AS.mapx.search(q).then(function (list) { renderResults(list); });
  }

  /* ────────── 비밀 테마 연구실 ────────── */
  var THEMES = [
    { k: 'A', n: '모던 모빌리티', d: '화이트 · 비비드 오렌지', sw: ['#FF6B2C', '#2F6BFF', '#64748B', '#FFFFFF'] },
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
      '<p class="mhint">앱 UI와 지도 위 차량 색감 테마를 바꿉니다.</p>' +
      '<div class="labgrid">' + THEMES.map(function (t) {
        return '<button class="labcard' + (S.theme === t.k ? ' on' : '') + '" data-theme="' + t.k + '" type="button">' +
          '<span class="sw">' + t.sw.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join('') + '</span>' +
          '<b>' + t.n + '</b><span>' + t.d + '</span>' +
          '<span class="mini">' + labMini(t.k) + '</span></button>';
      }).join('') + '</div>' +
      '<div class="roles big" id="labCarMode" style="margin:8px 0 4px">' +
      '<button type="button" data-cm="real" class="' + (S.carMode !== 'vector' ? 'on' : '') + '">✨ 실사 미니어처</button>' +
      '<button type="button" data-cm="vector" class="' + (S.carMode === 'vector' ? 'on' : '') + '">📐 플랫 벡터</button></div>' +
      '<p class="tip">제목 “사고약도”를 5번 두드리거나 0.6초 길게 누르면 언제든 열려요.</p>' +
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
    var prev = S.theme; S.theme = k;
    if (k === 'B' && (S.bg === 'map' || S.bg === 'sat')) { S._prevBg = S.bg; AS.mapx.setBg('dark'); }
    else if (prev === 'B' && k !== 'B' && S.bg === 'dark' && S.autoDark) AS.mapx.setBg(S._prevBg || 'road');
    S.autoDark = (k === 'B');
    document.body.setAttribute('data-theme', k);
    var meta = document.getElementById('metaTheme');
    var map = { A: '#EEF2F8', B: '#05090D', C: '#0C1A2B', D: '#FBF3E4' };
    if (meta) meta.setAttribute('content', map[k] || '#EEF2F8');
    AS.objs.render(); AS.objs.chrome(); selbar(); C.save();
  }

  var memoPoint = null;
  function openMemo(p) {
    memoPoint = p || { x: S.stage.w / 2, y: S.stage.h / 2 };
    $('#memoWrap').hidden = false;
    var inp = $('#memoInput'); inp.value = '';
    setTimeout(function () { inp.focus(); }, 40);
  }
  function closeMemo() { $('#memoWrap').hidden = true; }
  function commitMemo() {
    var inp = $('#memoInput'), t = inp.value.trim();
    closeMemo(); if (!t) return;
    AS.objs.addMemo(t, memoPoint.x, memoPoint.y);
    toast('메모 추가');
  }

  function bind() {
    $$('#dock .dk[data-cat]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (sheetCat === b.dataset.cat && $('#sheet').classList.contains('open')) closeSheet();
        else openSheet(b.dataset.cat);
      });
    });
    $('#sheetClose').addEventListener('click', closeSheet);
    $('#toolChip').addEventListener('click', function () { S.tool = 'idle'; syncTool(); toast('그리기를 끝냈어요'); });
    var bp = $('#btnPen');
    if (bp) bp.addEventListener('click', function () {
      if (S.tool === 'pen' || S.tool === 'vec') { S.tool = 'idle'; syncTool(); toast('그리기를 끝냈어요'); }
      else {
        S.tool = 'pen'; syncTool();
        toast('그리기 켜짐 — 한 손가락으로 긋고, 두 손가락으로 지도를 확대·이동');
      }
    });
    var cl = $('#chipLabel');
    if (cl) cl.addEventListener('click', function () {
      AS.mapx.setLabels(S.labels === false);
    });
    $('#sheet').addEventListener('click', function (e) { if (e.target === $('#sheet')) closeSheet(); });
    $('#btnUndo').addEventListener('click', function () { C.undo(); });
    $('#btnSave').addEventListener('click', function () { AS.exportx.openSave(); });
    var rb = $('#btnClear');
    if (rb) rb.addEventListener('click', openReset);
    var szb = $('#btnSize');
    if (szb) szb.addEventListener('click', cycleBtnSize);
    var cs = $('#capSwap');
    if (cs) cs.addEventListener('click', function () { $('#fileInput').click(); });

    $$('#bgChips button[data-bg]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.dataset.bg === 'capture') {
          if (S.bg === 'capture' && S.cap.src) { $('#fileInput').click(); return; }
          openPhotoHelp(); return;
        }
        if (b.dataset.bg === 'road' && S.bg !== 'road') { AS.mapx.setRoad(S.roadId || 'lane4'); openSheet('road'); return; }
        if (b.dataset.bg === 'road' && S.bg === 'road') { openSheet('road'); return; }
        AS.mapx.setBg(b.dataset.bg);
      });
    });
    $('#fileInput').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0]; if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        S.cap.src = fr.result; S.cap.base = null; $('#capImg').src = fr.result;
        AS.mapx.setBg('capture'); toast('배경 사진으로 사용합니다 — 두 손가락으로 확대·이동'); C.save();
        e.target.value = '';
      };
      fr.readAsDataURL(f);
    });

    $('#btnLock').addEventListener('click', function () { AS.mapx.setLock(!S.lock); });
    $('#btnGeo').addEventListener('click', function () {
      toast('현위치 확인 중…');
      AS.mapx.geolocate().then(function (p) {
        AS.mapx.setGps(p);
        if (S.bg === 'road' || S.bg === 'capture') AS.mapx.setBg('dark');
        AS.mapx.fly(p.lat, p.lng, 19); AS.mapx.setLock(false);
        AS.mapx.layoutGps();
        toast('현위치로 이동했습니다');
      }).catch(function (e) { toast(e && e.code === 1 ? '위치 권한이 꺼져 있어요' : '현위치를 잡지 못했어요'); });
    });

    $('#searchPill').addEventListener('click', openSearch);
    $('#searchClose').addEventListener('click', closeSearch);
    $('#search').addEventListener('click', function (e) { if (e.target === $('#search')) closeSearch(); });
    $('#qGo').addEventListener('click', doSearch);
    $('#q').addEventListener('input', function () {
      clearTimeout(qTimer); var v = $('#q').value.trim(); if (v.length < 2) return;
      qTimer = setTimeout(doSearch, 420);
    });
    $('#q').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } });

    // 나침반 1손가락 좌우 회전
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
        cmpDrag.moved = true; AS.mapx.setBearing(cmpDrag.b0 + dx * 0.8, true);
      });
      var cmpEnd = function () {
        if (!cmpDrag) return;
        if (!cmpDrag.moved) { AS.mapx.setBearing(0, false); toast('지도를 정북(0°)으로 맞췄어요'); }
        cmpDrag = null;
      };
      cmp.addEventListener('pointerup', cmpEnd);
      cmp.addEventListener('pointercancel', cmpEnd);
    }

    // 3D 각도(틸트) 1손가락 위아래 스와이프 / 탭하면 0° ↔ 35°
    var tlt = $('#tiltBtn');
    if (tlt) {
      var tltDrag = null;
      tlt.addEventListener('pointerdown', function (e) {
        e.stopPropagation();
        tltDrag = { y0: e.clientY, t0: S.view.tilt || 0, moved: false };
        try { tlt.setPointerCapture(e.pointerId); } catch (er) {}
      });
      tlt.addEventListener('pointermove', function (e) {
        if (!tltDrag) return;
        var dy = e.clientY - tltDrag.y0;
        if (!tltDrag.moved && Math.abs(dy) < 4) return;
        tltDrag.moved = true; AS.mapx.setTilt(tltDrag.t0 - dy * 0.5);
      });
      var tltEnd = function () {
        if (!tltDrag) return;
        if (!tltDrag.moved) {
          var next = (S.view.tilt || 0) > 10 ? 0 : 35;
          AS.mapx.setTilt(next);
          toast(next ? '3D 입체 각도 ' + next + '°' : '평면 탑뷰(0°)');
        }
        tltDrag = null;
      };
      tlt.addEventListener('pointerup', tltEnd);
      tlt.addEventListener('pointercancel', tltEnd);
    }

    $('#selBar').addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var a = b.dataset.act;
      if (a === 'zin') AS.objs.scaleBy(1 / 1.18);
      else if (a === 'zout') AS.objs.scaleBy(1.18);
      else if (a === 'arrow') AS.objs.togglePenArrow();
      else if (a === 'del') AS.objs.del();
      else if (a === 'dup') AS.objs.dup();
    });

    var brand = $('#brandTap'), taps = 0, tapTimer = null, holdTimer = null, held = false;
    brand.addEventListener('pointerdown', function () {
      held = false; clearTimeout(holdTimer);
      holdTimer = setTimeout(function () { held = true; openLab(true); }, 600);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
      brand.addEventListener(ev, function () { clearTimeout(holdTimer); });
    });
    brand.addEventListener('click', function (e) {
      e.preventDefault();
      if (held) { held = false; taps = 0; return; }
      taps += 1; clearTimeout(tapTimer); tapTimer = setTimeout(function () { taps = 0; }, 2000);
      if (taps >= 5) { taps = 0; clearTimeout(tapTimer); openLab(true); }
    });
    brand.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    $('#memoOk').addEventListener('click', commitMemo);
    $('#memoInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); commitMemo(); } });
    $('#memoWrap').addEventListener('click', function (e) { if (e.target === $('#memoWrap')) closeMemo(); });
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

    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () {
        measure();
        if (AS.mapx.map) AS.mapx.map.invalidateSize();
        AS.mapx.renderRoadLayer();
        AS.objs.layout();
      });
      ro.observe($('#stage'));
    }
    window.addEventListener('resize', function () {
      measure(); if (AS.mapx.map) AS.mapx.map.invalidateSize();
      AS.mapx.renderRoadLayer(); AS.objs.layout();
    });
    window.addEventListener('orientationchange', function () { setTimeout(function () { measure(); AS.mapx.renderRoadLayer(); AS.objs.layout(); }, 300); });
  }

  function closeModal() { $('#modal').hidden = true; var b = $('#modalBody'); b.innerHTML = ''; delete b.dataset.lab; }

  /* ────────── 요소 조작 버튼 크기 (작게 · 보통 · 크게) ────────── */
  var BTNSZ = ['sm', 'md', 'lg'];
  var BTN_LABEL = { sm: '버튼 작게', md: '버튼 보통', lg: '버튼 크게' };
  function applyBtnSize(v, silent) {
    S.btnSize = BTNSZ.indexOf(v) >= 0 ? v : 'md';
    document.body.setAttribute('data-btnsz', S.btnSize);
    var b = $('#btnSize');
    if (b) {
      b.textContent = BTN_LABEL[S.btnSize];
      b.setAttribute('aria-label', '요소 조작 버튼 크기 — ' + BTN_LABEL[S.btnSize] + ' (누를 때마다 작게·보통·크게 순환)');
    }
    AS.objs.chrome();
    C.save();
    if (!silent) toast(S.btnSize === 'sm' ? '조작 버튼 작게 — 손이 작은 화면용'
      : S.btnSize === 'lg' ? '조작 버튼 크게 — 한 손·장갑 조작용'
      : '조작 버튼 보통 크기');
  }
  function cycleBtnSize() {
    applyBtnSize(BTNSZ[(BTNSZ.indexOf(S.btnSize) + 1) % BTNSZ.length]);
  }

  /* ────────── 화면 요소 전체 지우기 ────────── */
  function openReset() {
    var body = $('#modalBody');
    delete body.dataset.lab;
    body.innerHTML =
      '<button class="mclose" data-close="1" aria-label="닫기">✕</button>' +
      '<h3>화면 요소 전체 지우기</h3>' +
      '<p class="mhint">지도에 놓은 차량·사람·표시를 모두 지웁니다. 배경(지도·캡처·도로)은 그대로 남고, 실행취소(↶)로 되돌릴 수 있어요.</p>' +
      '<div class="mrow"><button class="btn ghost" data-close="1">취소</button>' +
      '<button class="btn primary" id="btnDoClear">초기화</button></div>';
    $('#modal').hidden = false;
    $('#btnDoClear').addEventListener('click', function () {
      C.clearElements();
      closeModal();
      toast('화면 요소를 모두 지웠어요 — ↶로 되돌릴 수 있어요', 2400);
    });
  }

  /* 배경 사진 안내 — 카카오맵 스카이뷰 캡처를 공유로 넘기는 방법 + 갤러리 선택 */
  function openPhotoHelp() {
    var body = $('#modalBody');
    delete body.dataset.lab;
    body.innerHTML =
      '<button class="mclose" data-close="1" aria-label="닫기">✕</button>' +
      '<h3>배경 사진</h3>' +
      '<p class="mhint">카카오맵에서 <b>스카이뷰</b>를 켜고 캡처한 뒤 <b>공유 → 사고약도</b>를 고르면 그 사진이 바로 배경이 됩니다.<br>' +
      '갤러리에 있는 캡처 사진을 직접 골라도 됩니다.</p>' +
      '<div class="mrow"><button class="btn ghost" data-close="1">닫기</button>' +
      '<button class="btn primary" id="btnPickPhoto">갤러리에서 고르기</button></div>';
    $('#modal').hidden = false;
    $('#btnPickPhoto').addEventListener('click', function () { closeModal(); $('#fileInput').click(); });
  }

  /* 캡처 배경일 때만 '사진 교체' 버튼 노출 */
  function syncCapture() {
    var b = $('#capSwap');
    if (!b) return;
    b.hidden = S.bg !== 'capture';
  }

  function measure() { var r = $('#stage').getBoundingClientRect(); S.stage.w = r.width; S.stage.h = r.height; }

  AS.toast = toast;
  AS.ui = {
    toast: toast, bind: bind, syncTool: syncTool, openSheet: openSheet, closeSheet: closeSheet, selbar: selbar, bgchips: bgchips,
    openSearch: openSearch, openSearchWith: openSearchWith, closeSearch: closeSearch, openLab: openLab, setTheme: setTheme,
    memo: openMemo, closeModal: closeModal, measure: measure, previewSVG: previewSVG,
    renderRoles: renderRoles, syncDock: syncDock, THEMES: THEMES,
    openReset: openReset, applyBtnSize: applyBtnSize, cycleBtnSize: cycleBtnSize, syncCapture: syncCapture
  };
})(window.AS);
