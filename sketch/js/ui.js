/* ==========================================================================
   ui.js — 상단바 · 독 · 시트(탭) · 선택바 · 그리기 바 · 검색 · 비밀 테마 연구실
   ==========================================================================
   v5.0 — 화면을 최대한 비우고 손이 가는 순서대로 다시 짰다.
     · 상단 1줄: 사고약도 · [도로|사진] · (사진 조정)
     · 하단 독 6개: 도로·상황 · 차량 · 요소 · 그리기 · 되돌리기 · 저장
     · [그리기] 는 시트 없이 바로 켜지고, 캔버스 아래 1줄 바에서 도구·색·완료
     · 요소 시트는 [차량|사람|파손·충격|신호·도로] 탭 한 곳에서
     · 선택 패널 : 역할 칩 전용 줄 + 크기 조절 줄 (잘림 없음, 중복 표기 없음)
   ========================================================================== */
window.AS = window.AS || {};
(function (AS) {
  'use strict';
  var C = AS.core, $ = C.$, $$ = C.$$, S = AS.S;
  var sheetCat = null, toastTimer = null, pvN = 0, lastElemCat = 'person';

  function toast(msg, ms) {
    var el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, ms || 1200);
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
    AS.view.setRoad(pr.bg);
    var w = S.stage.w || 390, h = S.stage.h || 600;
    var geo = AS.roads.presetGeo ? AS.roads.presetGeo(pr, w, h) : null;
    var data = geo ? geo : {
      cars: (pr.cars || []).map(function (c) { return { kind: c.kind, role: c.role, x: c.x * w, y: c.y * h, rot: c.rot || 0 }; }),
      arrows: (pr.arrows || []).map(function (a) { return { color: a.color, pts: (a.pts || []).map(function (q) { return [q[0] * w, q[1] * h]; }) }; }),
      impact: pr.impact ? { x: pr.impact.x * w, y: pr.impact.y * h } : null
    };
    (data.cars || []).forEach(function (c) {
      var o = C.makeObj({ type: 'car', kind: c.kind, role: c.role }, c.x, c.y);
      o.rot = c.rot || 0;
      S.objs.push(o);
    });
    (data.arrows || []).forEach(function (a) {
      if (!a.pts || a.pts.length < 2) return;
      var pts = a.pts.slice();
      S.objs.push({
        id: C.uid(), type: 'pen', x: pts[0][0], y: pts[0][1], rot: 0, sc: 1,
        w: 1, h: 1, color: a.color || '#E9413B', lw: 3.8, arrowEnd: true, pts: pts
      });
    });
    if (data.impact) {
      var imp = C.makeObj({ type: 'sym', kind: 'impact', w: 50 }, data.impact.x, data.impact.y);
      S.objs.push(imp);
    }
    if (pr.summary) S.info.note = pr.summary;
    S.newRole = C.nextCarRole();
    AS.objs.render(); selbar(); C.save();
    closeSheet();
    toast('[' + pr.no + '] ' + pr.label + ' 적용', 1600);
  }

  /* ────────── 시트 — 탭 한 곳에서 모든 요소 ────────── */
  var TABS = [
    ['road', '도로·상황'],
    ['car', '차량'],
    ['person', '사람'],
    ['dmg', '파손'],
    ['etc', '신호·표지']
  ];
  var TITLES = {
    road: ['도로 · 사고 상황', '도로 배경 12종과 자주 쓰는 사고 상황을 한 번에 고릅니다'],
    car: ['차량', '놓을 때마다 자차 → 대차1 → 대차2 … 순으로 자동 지정'],
    person: ['사람 · 이동수단', '전원 흰색 · 배경판 없이 깔끔하게 배치'],
    dmg: ['파손 · 충격', '배경판 없이 테두리·글자만 깔끔하게'],
    etc: ['신호 · 표지', '신호등 · 횡단보도 · 차선 · 표지판 · 텍스트']
  };

  function openSheet(cat) {
    sheetCat = cat;
    if (cat === 'person' || cat === 'dmg' || cat === 'etc') lastElemCat = cat;
    var t = TITLES[cat] || ['항목', ''];
    var head = $('#sheet .sheetwrap > header');
    var title = $('#sheetTitle'), sub = $('#sheetSub');
    title.textContent = t[0];
    sub.textContent = t[1];
    if (head) head.classList.toggle('bare', false);
    renderTabs(cat);

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

    if (cat === 'road') fillRoad(body);
    else if (cat === 'car') fillCar(body);
    else if (cat === 'person') fillPerson(body);
    else if (cat === 'dmg') fillDmg(body);
    else if (cat === 'etc') fillEtc(body);

    body.scrollTop = 0;
    $('#sheet').classList.add('open');
    $('#sheet').setAttribute('aria-hidden', 'false');
    syncDock(cat);
  }

  function renderTabs(cat) {
    var tabs = $('#sheetTabs');
    if (!tabs) return;
    tabs.hidden = false;
    tabs.innerHTML = '';
    TABS.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.textContent = t[1];
      if (t[0] === cat) { b.classList.add('on'); b.setAttribute('aria-selected', 'true'); }
      else b.setAttribute('aria-selected', 'false');
      b.addEventListener('click', function () { if (sheetCat !== t[0]) openSheet(t[0]); });
      tabs.appendChild(b);
    });
  }

  function fillRoad(body) {
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
        b.className = 'card roadthumb' + (S.mode === 'road' && S.roadId === r.id ? ' on' : '');
        b.innerHTML = '<div class="rbox">' + AS.roads.thumb(r.id) + '</div><b>' + r.label + '</b>';
        b.addEventListener('click', function () {
          AS.view.setRoad(r.id);
          closeSheet();
          toast(r.label + ' 도로 적용');
        });
        rs.add(b, r.label + ' ' + r.id + ' ' + (r.tags || '') + ' 도로배경 배경');
      });
    });
  }

  function fillCar(body) {
    C.CARS.forEach(function (it) {
      var card = document.createElement('button');
      card.type = 'button'; card.className = 'card';
      card.innerHTML = '<span class="art">' + previewSVG('car', it.k, { h: 66 }) + '</span><b>' + it.n + '</b>';
      card.addEventListener('click', function () { place({ type: 'car', kind: it.k, w: it.w }); });
      body.appendChild(card);
    });
    addGroup(body, '놓을 때마다 자차 → 대차1 → 대차2 → 대차3… 순으로 자동 지정되며, 선택 후 복제로도 이어 붙어요');
  }

  function fillPerson(body) {
    C.PEOPLE.forEach(function (it) {
      var card = document.createElement('button');
      card.type = 'button'; card.className = 'card';
      card.innerHTML = '<span class="art">' + previewSVG('person', it.k, { h: 52 }) + '</span><b>' + it.n + '</b>';
      card.addEventListener('click', function () { place({ type: 'person', kind: it.k, w: it.w }); });
      body.appendChild(card);
    });
  }

  function fillDmg(body) {
    addGroup(body, '파손 상태 · 충격지점 (투명 배경)');
    symCards(body, ['damage', 'damage_dash', 'nodamage', 'nodamage_dash', 'existing', 'existing_dash', 'damage_legend', 'impact']);
  }

  function fillEtc(body) {
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
      closeSheet();
      setTool('memo');
    });
    body.appendChild(mc);
  }

  function addGroup(body, text) {
    var g = document.createElement('div');
    g.className = 'grp'; g.textContent = text;
    body.appendChild(g);
    return g;
  }

  /* 도로 시트 맨 위 검색 — 도로 템플릿·과실도표 카드 필터 */
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
    var count = function () {
      var n = 0;
      for (var i = 0; i < entries.length; i++) if (!entries[i].el.hidden) n += 1;
      return n;
    };
    var filter = function () {
      var q = input.value.trim().toLowerCase();
      entries.forEach(function (e) { e.el.hidden = !!q && e.text.indexOf(q) < 0; });
      sync();
      if (!q) { hint.innerHTML = '도로 배경·과실도표 카드를 이름으로 바로 걸러 줍니다.'; return; }
      var n = count();
      hint.innerHTML = n
        ? '<b>' + n + '개</b> 도로 카드 · “' + AS.objs.esc(input.value.trim()) + '”'
        : '“' + AS.objs.esc(input.value.trim()) + '” 에 맞는 도로 카드가 없어요 — 사거리·골목·고가·톨게이트·유턴·버스전용 처럼 넣어 보세요';
    };
    input.addEventListener('input', filter);
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

  var DOCK_OF = { car: 'car', person: 'person', dmg: 'person', etc: 'person', road: 'road' };
  function syncDock(cat) {
    var active = cat ? DOCK_OF[cat] : null;
    $$('#dock .dk[data-cat]').forEach(function (b) { b.classList.toggle('on', b.dataset.cat === active); });
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
    if (onBtn) {
      try { wrap.scrollLeft = Math.max(0, onBtn.offsetLeft - (wrap.clientWidth - onBtn.offsetWidth) / 2); } catch (e) {}
    }
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

  /* ────────── 선택 패널 (v5.0) ──────────
     두 줄로 나눴다. 첫 줄은 차량 역할 칩 전용(폭을 똑같이 나눠 써서 390px 에서도
     잘리지 않는다), 둘째 줄은 [크기|글씨] + −슬라이더+ + 값 + 복제 + 삭제.
     '버튼 크기' 토글과 중복 각도·배율 표기는 디자인 연구실로 옮기고 지웠다. */
  var sbModeSel = 'size';
  var sbDirty = false;

  function labMultOf(o) {
    var v = o && o.lfs;
    return (isFinite(v) && v > 0) ? v : 1;
  }

  function sbSpec(o) {
    if (sbModeSel === 'label') return { min: 0.4, max: 2.8 };
    return C.scRange(o);
  }
  function sbVal(o) {
    if (!o) return 1;
    return sbModeSel === 'label' ? labMultOf(o) : o.sc;
  }
  function sbText(o) {
    if (sbModeSel === 'label') return Math.round(labMultOf(o) * 100) + '%';
    return (o ? o.sc : 1).toFixed(2) + '×';
  }
  function sbDisabled(o) {
    if (!o) return true;
    if (sbModeSel === 'label') return !AS.objs.hasLabel(o);
    return o.type === 'pen';
  }
  function sbPosToVal(pos, r) { return r.min * Math.pow(r.max / r.min, C.clamp(pos, 0, 1000) / 1000); }
  function sbValToPos(v, r) {
    var t = Math.log(C.clamp(v, r.min, r.max) / r.min) / Math.log(r.max / r.min);
    return Math.round(C.clamp(t, 0, 1) * 1000);
  }

  function syncSb() {
    var o = AS.objs.selObj();
    var sl = $('#sbRange'), val = $('#sbVal'), zin = $('[data-act="zin"]'), zout = $('[data-act="zout"]');
    if (!o) return;
    var r = sbSpec(o), v = sbVal(o), pos = sbValToPos(v, r), off = sbDisabled(o);
    if (sl) {
      if (String(sl.value) !== String(pos)) sl.value = String(pos);
      sl.disabled = off;
      sl.style.setProperty('--fill', (pos / 10) + '%');
      sl.setAttribute('aria-valuetext', (sbModeSel === 'label' ? '글씨 ' : '크기 ') + sbText(o));
    }
    if (val) val.textContent = sbText(o);
    if (zin) zin.disabled = off || v <= r.min * 1.001;
    if (zout) zout.disabled = off || v >= r.max * 0.999;
    var mb = $('#sbMode');
    if (mb) {
      Array.prototype.forEach.call(mb.querySelectorAll('button[data-smode]'), function (b) {
        var on = b.getAttribute('data-smode') === sbModeSel;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      var lb = $('#sbModeLab');
      if (lb) lb.disabled = !AS.objs.hasLabel(o);
    }
  }

  function applySbVal(v, commit) {
    var o = AS.objs.selObj();
    if (!o || sbDisabled(o)) return;
    if (sbModeSel === 'label') o.lfs = Math.round(C.clamp(v, 0.4, 2.8) * 100) / 100;
    else o.sc = Math.round(C.clampSc(o, v) * 100) / 100;
    AS.objs.render();
    syncSb();
    if (commit) { C.pushUndo(); C.save(); selbar(); }
  }

  function sbStep(dir) {
    var o = AS.objs.selObj();
    if (!o) return;
    applySbVal(sbVal(o) * Math.pow(1.16, dir), true);
  }

  function selbar() {
    var bar = $('#selBar'), o = AS.objs.selObj();
    if (!o) { bar.hidden = true; return; }
    bar.hidden = false;
    var isCar = o.type === 'car', isPen = o.type === 'pen';
    var hasLab = AS.objs.hasLabel(o);
    if (!hasLab && sbModeSel === 'label') sbModeSel = 'size';
    var pa = $('#btnPenArrow');
    if (pa) { pa.hidden = !isPen; pa.classList.toggle('on', !!(isPen && o.arrowEnd)); }
    /* 펜은 크기·글씨 슬라이더가 의미 없어 줄을 비운다 — 그 자리에 [화살표]·복제·삭제만 크게 */
    bar.classList.toggle('penmode', isPen);
    /* 역할 줄은 차량일 때만 — 다른 요소에서는 줄 자체를 접어 슬라이더를 크게 쓴다 */
    var rolesRow = $('#sbRolesRow');
    if (rolesRow) rolesRow.hidden = !isCar;
    var roleSeg = $('#roleSeg');
    if (roleSeg) {
      if (isCar) renderRoles(roleSeg, false);
      else roleSeg.innerHTML = '';
    }
    syncSb();
  }

  /* ────────── 그리기 바 (v5.0) ────────── */
  var PEN_COLORS = [['#E9413B', '빨강'], ['#2F6BFF', '파랑'], ['#0F172A', '검정'], ['#2E8A63', '초록'], ['#F2A93B', '주황']];

  function renderDrawColors() {
    var wrap = $('#drawColors');
    if (!wrap) return;
    wrap.innerHTML = '';
    PEN_COLORS.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.style.background = c[0];
      b.setAttribute('aria-label', c[1] + ' 펜');
      if (S.pen.color === c[0]) b.classList.add('on');
      b.addEventListener('click', function () {
        S.pen.color = c[0];
        var o = AS.objs.selObj();
        if (o && o.type === 'pen') { o.color = c[0]; AS.objs.render(); C.pushUndo(); C.save(); }
        renderDrawColors();
        toast(c[1] + ' 펜');
      });
      wrap.appendChild(b);
    });
  }

  function syncTool() {
    var bar = $('#drawBar'), dk = $('#btnDraw');
    var drawing = S.tool === 'pen' || S.tool === 'vec' || S.tool === 'memo';
    document.body.setAttribute('data-drawing', drawing ? '1' : '0');
    if (dk) dk.classList.toggle('on', drawing);
    if (!bar) return;
    bar.hidden = !drawing;
    if (!drawing) return;
    $$('#drawTools button').forEach(function (b) {
      b.classList.toggle('on', b.dataset.tool === S.tool);
    });
    renderDrawColors();
  }

  function setTool(t) {
    var on = S.tool !== t;
    S.tool = on ? t : 'idle';
    /* 그리기를 켜면 선택을 풀어 — 선택 패널과 그리기 바가 같은 자리에서 겹치지 않는다 */
    if (on && AS.objs.selObj && AS.objs.selObj()) AS.objs.deselect();
    syncTool();
    if (S.tool === 'pen') toast('그어서 선을 긋고, 1초 누르면 반듯해져요', 1800);
    else if (S.tool === 'vec') toast('끌어서 화살표를 그으세요', 1800);
    else if (S.tool === 'memo') toast('약도에서 메모할 곳을 톡 누르세요', 1800);
  }

  function bgchips() {
    AS.view.syncMode();
  }

  /* ────────── 사진 크기 조절 ──────────
     100% = 불러온 사진 그대로(전체가 다 보이는 상태). 그 아래로는 절대 줄지 않는다. */
  function zoomPct(k) { return Math.round((isFinite(k) ? k : 1) * 100); }

  function syncPhotoZoom() {
    var sl = $('#photoZoom'), lab = $('#photoZoomVal');
    var out = $('#btnZoomOut'), inn = $('#btnZoomIn');
    if (!sl) return;
    var k = AS.view.photoScale ? AS.view.photoScale() : 1;
    var pct = zoomPct(k);
    if (String(sl.value) !== String(pct)) sl.value = String(pct);
    sl.style.setProperty('--fill', ((pct - 100) / 400 * 100) + '%');
    if (lab) lab.textContent = pct + '%';
    if (out) { out.disabled = k <= (AS.view.K_MIN || 1) + 0.001; }
    if (inn) { inn.disabled = k >= (AS.view.K_MAX || 5) - 0.001; }
    if (sl) {
      sl.setAttribute('aria-valuetext', pct === 100
        ? '100% — 사진이 화면을 꽉 채운 크기 (더 줄일 수 없음)'
        : pct + '% — 꽉 찬 크기에서 ' + pct + '% 만큼 확대');
    }
  }

  function applyZoom(k, save) {
    AS.view.setPhotoScale(k);
    syncPhotoZoom();
    if (save) C.save();
  }

  function zoomStep(dir) {
    var k = AS.view.photoScale ? AS.view.photoScale() : 1;
    applyZoom(k + dir * 0.2, true);
  }

  /* ────────── 갤러리 사진 ────────── */
  function pickPhoto() {
    var inp = $('#fileInput');
    if (inp) inp.click();
  }

  function applyPhotoFile(file) {
    if (!file) return;
    if (AS.importx && AS.importx.openFile) { AS.importx.openFile(file); return; }
    if (AS.share && AS.share.fitForSave) {
      AS.share.fitForSave(file).then(function (d) { if (d) putPhoto(d); else toast('사진을 읽지 못했어요'); });
      return;
    }
    var fr = new FileReader();
    fr.onload = function () { putPhoto(fr.result); };
    fr.onerror = function () { toast('사진을 읽지 못했어요'); };
    fr.readAsDataURL(file);
  }

  function putPhoto(dataUrl, msg) {
    closeModal();
    AS.view.setPhoto(dataUrl);
    toast(msg || '사진을 넣었습니다 — 사진 조정에서 맞추고 바로 그리세요', 2200);
    C.save();
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
      '<p class="mhint">앱 UI와 약도 위 차량 색감 테마를 바꿉니다.</p>' +
      '<div class="labgrid">' + THEMES.map(function (t) {
        return '<button class="labcard' + (S.theme === t.k ? ' on' : '') + '" data-theme="' + t.k + '" type="button">' +
          '<span class="sw">' + t.sw.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join('') + '</span>' +
          '<b>' + t.n + '</b><span>' + t.d + '</span>' +
          '<span class="mini">' + labMini(t.k) + '</span></button>';
      }).join('') + '</div>' +
      '<div class="roles big" id="labCarMode" style="margin:8px 0 4px">' +
      '<button type="button" data-cm="real" class="' + (S.carMode !== 'vector' ? 'on' : '') + '">✨ 실사 미니어처</button>' +
      '<button type="button" data-cm="vector" class="' + (S.carMode === 'vector' ? 'on' : '') + '">📐 플랫 벡터</button></div>' +
      '<p class="mhint" style="margin:10px 0 3px">요소 조작 버튼 크기 (핸들·선택 패널)</p>' +
      '<div class="roles big" id="labBtnSize" style="margin:0 0 4px">' +
      '<button type="button" data-bs="sm" class="' + (S.btnSize === 'sm' ? 'on' : '') + '">작게</button>' +
      '<button type="button" data-bs="md" class="' + (S.btnSize === 'md' || !S.btnSize ? 'on' : '') + '">보통</button>' +
      '<button type="button" data-bs="lg" class="' + (S.btnSize === 'lg' ? 'on' : '') + '">크게</button></div>' +
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
    $$('#labBtnSize button', body).forEach(function (b) {
      b.addEventListener('click', function () {
        applyBtnSize(b.dataset.bs);
        $$('#labBtnSize button', body).forEach(function (x) { x.classList.toggle('on', x === b); });
      });
    });
    if (first) toast('디자인 연구실이 열렸어요', 1800);
  }

  function labMini(t) {
    var inner = ART3.car(t, 'sedan', 'self');
    var np = 'lm' + (++pvN);
    return '<svg viewBox="0 0 120 200" width="26" height="44">' + C.nsMarkup(inner, np) + '</svg>' +
      '<svg viewBox="0 0 92 92" width="26" height="26">' + C.nsMarkup(ART3.sym(t, 'impact').s, np + 'i') + '</svg>';
  }

  function setTheme(k) {
    S.theme = k;
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
    /* 독 — [도로·상황] · [차량] · [요소] 는 같은 시트의 탭으로 이어진다 */
    $$('#dock .dk[data-cat]').forEach(function (b) {
      b.addEventListener('click', function () {
        var cat = b.dataset.cat;
        if (cat === 'person') cat = lastElemCat;
        if (sheetCat === cat && $('#sheet').classList.contains('open')) closeSheet();
        else openSheet(cat);
      });
    });
    $('#sheetClose').addEventListener('click', closeSheet);

    /* 그리기 — 시트를 열었다 닫는 대신 곧바로 켜진다 */
    var bd = $('#btnDraw');
    if (bd) bd.addEventListener('click', function () {
      setTool('pen');
      if (S.tool !== 'pen') toast('그리기를 끝냈어요');
    });
    var dd = $('#drawDone');
    if (dd) dd.addEventListener('click', function () {
      S.tool = 'idle'; syncTool(); toast('그리기를 끝냈어요');
    });
    $$('#drawTools button').forEach(function (b) {
      b.addEventListener('click', function () { setTool(b.dataset.tool); });
    });

    /* 배경은 딱 두 가지 — 도로 / 사진 */
    $$('#modeSeg button[data-mode]').forEach(function (b) {
      b.addEventListener('click', function () {
        var m = b.dataset.mode;
        if (m === S.mode) {
          if (m === 'road') openSheet('road');
          else pickPhoto();
          return;
        }
        if (m === 'road') { AS.view.setMode('road'); toast('아래 [도로·상황]에서 도로를 고르세요', 1600); }
        else {
          AS.view.setMode('photo');
          if (!AS.view.hasPhoto()) toast('갤러리에서 사진을 골라 주세요', 1600);
        }
      });
    });

    /* 사진 조정 — 켜면 사진을 움직일 수 있고, 캔버스 위 1줄 바가 뜬다 */
    var adj = $('#btnPhotoAdj');
    if (adj) adj.addEventListener('click', function () {
      AS.view.setLock(!(S.photo && S.photo.locked));
    });
    var doneB = $('#capDone');
    if (doneB) doneB.addEventListener('click', function () { AS.view.setLock(true); });

    var cs = $('#capSwap');
    if (cs) cs.addEventListener('click', pickPhoto);
    var ce = $('#capEdit');
    if (ce) ce.addEventListener('click', function () {
      if (AS.importx && AS.importx.editCurrent) AS.importx.editCurrent();
    });
    var cta = $('#btnPickPhoto');
    if (cta) cta.addEventListener('click', function (e) { e.stopPropagation(); pickPhoto(); });
    var ft = $('#btnPhotoFit');
    if (ft) ft.addEventListener('click', function () {
      AS.view.fitPhoto();
      syncPhotoZoom();
      toast('사진을 원본(100%)으로 되돌렸어요');
    });

    var zout = $('#btnZoomOut'), zin = $('#btnZoomIn'), zr = $('#photoZoom');
    if (zout) zout.addEventListener('click', function () { zoomStep(-1); });
    if (zin) zin.addEventListener('click', function () { zoomStep(1); });
    if (zr) {
      zr.addEventListener('input', function () { applyZoom(Number(zr.value) / 100, false); });
      zr.addEventListener('change', function () { applyZoom(Number(zr.value) / 100, true); });
    }
    $('#fileInput').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (f) applyPhotoFile(f);
      e.target.value = '';
    });

    $('#sheet').addEventListener('click', function (e) { if (e.target === $('#sheet')) closeSheet(); });
    $('#btnUndo').addEventListener('click', function () { C.undo(); });
    $('#btnSave').addEventListener('click', function () { AS.exportx.openSave(); });

    $('#selBar').addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var a = b.dataset.act;
      if (a === 'zin') sbStep(-1);
      else if (a === 'zout') sbStep(1);
      else if (a === 'arrow') AS.objs.togglePenArrow();
      else if (a === 'del') AS.objs.del();
      else if (a === 'dup') AS.objs.dup();
    });

    /* 슬라이더 — 크기/글씨 공용. 끄는 동안은 화면만 갱신, 손을 때면 한 단계만 undo */
    var sbr = $('#sbRange');
    if (sbr) {
      sbr.addEventListener('input', function () {
        var o = AS.objs.selObj(); if (!o) return;
        applySbVal(sbPosToVal(Number(sbr.value), sbSpec(o)), false);
        sbDirty = true;
      });
      sbr.addEventListener('change', function () {
        if (!sbDirty) return;
        sbDirty = false;
        C.pushUndo(); C.save(); selbar();
      });
    }
    var sbm = $('#sbMode');
    if (sbm) {
      Array.prototype.forEach.call(sbm.querySelectorAll('button[data-smode]'), function (b) {
        b.addEventListener('click', function () {
          if (b.disabled) return;
          var want = b.getAttribute('data-smode') === 'label' ? 'label' : 'size';
          /* 이미 켜진 '글씨'를 한 번 더 누르면 글씨 크기를 기본(100%)으로 되돌린다 */
          if (want === 'label' && sbModeSel === 'label') {
            var o = AS.objs.selObj();
            if (o) { delete o.lfs; AS.objs.render(); C.pushUndo(); C.save(); selbar(); }
            toast('글씨 크기를 기본으로 되돌렸어요');
            return;
          }
          sbModeSel = want;
          selbar();
          toast(sbModeSel === 'label' ? '글씨 크기 — 요소에 비례해 같이 커지고 작아져요' : '요소 크기 조절');
        });
      });
    }

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
      if (e.target.closest('#btnClear')) { openReset(); return; }
      if (e.target.closest('[data-close]') || e.target.classList.contains('mscrim')) closeModal();
    });

    window.addEventListener('keydown', function (e) {
      if (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
      var impEl = $('#impPhoto');
      if (impEl && !impEl.hidden) return;
      if (e.key === 'Escape') { closeSheet(); closeModal(); closeMemo(); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && S.sel) { e.preventDefault(); AS.objs.del(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); C.undo(); }
    });

    var onResize = function () {
      measure();
      AS.view.renderRoad();
      AS.objs.layout();
      AS.objs.chrome();
    };
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(onResize);
      ro.observe($('#stage'));
    }
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', function () { setTimeout(onResize, 300); });
  }

  function closeModal() { $('#modal').hidden = true; var b = $('#modalBody'); b.innerHTML = ''; delete b.dataset.lab; }

  /* ────────── 요소 조작 버튼 크기 (디자인 연구실에서) ────────── */
  var BTNSZ = ['sm', 'md', 'lg'];
  function applyBtnSize(v, silent) {
    S.btnSize = BTNSZ.indexOf(v) >= 0 ? v : 'md';
    document.body.setAttribute('data-btnsz', S.btnSize);
    $$('#labBtnSize button').forEach(function (b) { b.classList.toggle('on', b.dataset.bs === S.btnSize); });
    AS.objs.chrome();
    C.save();
    if (!silent) toast(S.btnSize === 'sm' ? '조작 버튼 작게' : S.btnSize === 'lg' ? '조작 버튼 크게 — 장갑·한 손 조작' : '조작 버튼 보통 크기');
  }

  /* ────────── 화면 요소 전체 지우기 ────────── */
  function openReset() {
    var body = $('#modalBody');
    delete body.dataset.lab;
    body.innerHTML =
      '<button class="mclose" data-close="1" aria-label="닫기">✕</button>' +
      '<h3>화면 요소 전체 지우기</h3>' +
      '<p class="mhint">약도에 놓은 차량·사람·표시를 모두 지웁니다. 배경(도로·사진)은 그대로 남고, 되돌리기(↶)로 되돌릴 수 있어요.</p>' +
      '<div class="mrow"><button class="btn ghost" data-close="1">취소</button>' +
      '<button class="btn primary" id="btnDoClear">초기화</button></div>';
    $('#modal').hidden = false;
    $('#btnDoClear').addEventListener('click', function () {
      C.clearElements();
      closeModal();
      toast('화면 요소를 모두 지웠어요 — ↶로 되돌릴 수 있어요', 1600);
    });
  }

  /* 사진이 없을 때 안내용 (다른 화면에서 부를 수 있게 남겨 둔다) */
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

  function measure() { AS.view.measure(); }

  AS.toast = toast;
  AS.ui = {
    toast: toast, bind: bind, syncTool: syncTool, setTool: setTool, openSheet: openSheet, closeSheet: closeSheet,
    selbar: selbar, bgchips: bgchips, openLab: openLab, setTheme: setTheme,
    memo: openMemo, closeModal: closeModal, measure: measure, previewSVG: previewSVG,
    renderRoles: renderRoles, syncDock: syncDock, THEMES: THEMES,
    openReset: openReset, applyBtnSize: applyBtnSize, syncPhotoZoom: syncPhotoZoom,
    pickPhoto: pickPhoto, applyPhotoFile: applyPhotoFile, putPhoto: putPhoto, openPhotoHelp: openPhotoHelp
  };
})(window.AS);
