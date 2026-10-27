/* ============================================================
   日迹 DayLog — 手机本地版
   数据只保存在这台手机的 IndexedDB 里，不经过服务器。
   ============================================================ */
'use strict';

/* ---------------- 基础工具 ---------------- */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const pad = (n) => String(n).padStart(2, '0');
const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const WEEK_CN = ['一', '二', '三', '四', '五', '六', '日'];
const MOODS = [
  { v: 1, e: '😖', label: '很糟' },
  { v: 2, e: '😕', label: '低落' },
  { v: 3, e: '😐', label: '一般' },
  { v: 4, e: '🙂', label: '不错' },
  { v: 5, e: '😄', label: '很好' },
];
const NAV = [
  ['today', '今日', 'pen'],
  ['money', '账本', 'wallet'],
  ['review', '回顾', 'compass'],
];
const TITLES = {
  today: '今日',
  money: '账本',
  review: '回顾',
  settings: '设置',
};
const EXPENSE_CATS = ['餐饮', '交通', '居住', '购物', '娱乐', '学习', '医疗', '人情', '旅行', '其他'];
const INCOME_CATS = ['工资', '奖金', '兼职', '理财', '红包', '退款', '其他'];
const PLAN_CATEGORIES = [
  { id: 'housing', name: '房租及水电', budget: 2500, cats: ['居住'] },
  { id: 'food', name: '吃饭', budget: 1200, cats: ['餐饮'] },
  { id: 'transport', name: '交通', budget: 300, cats: ['交通'] },
  { id: 'other', name: '日用品、社交及其他', budget: 500, cats: ['购物', '娱乐', '学习', '医疗', '人情', '旅行', '其他'] },
];
const APP_VERSION = '1.2.0';

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function dateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function todayStr() { return dateStr(new Date()); }
function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function addDays(s, n) {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return dateStr(d);
}
function addMonths(s, n) {
  const [y, m] = s.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
function mondayOf(s, offset = 0) {
  const d = parseDate(s);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow + offset * 7);
  return dateStr(d);
}
function daysInMonth(prefix) {
  const [y, m] = prefix.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}
function timeHM(d) { return d ? `${d.getHours()}:${pad(d.getMinutes())}` : ''; }
function clampNum(n, a, b) { return Math.max(a, Math.min(b, n)); }
function avg(list) {
  const a = list.filter((v) => typeof v === 'number' && isFinite(v));
  return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
}
function fmt1(n) { return n == null ? '—' : String(Math.round(n * 10) / 10); }
function money(n) {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  return `${v < 0 ? '−' : ''}¥${Math.abs(v).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`;
}
function moneyShort(n) {
  if (n >= 10000) return '¥' + (n / 10000).toFixed(1).replace(/\.0$/, '') + 'w';
  if (n >= 1000) return '¥' + (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return '¥' + Math.round(n);
}
function niceMax(v, floor = 10) {
  const steps = [10, 20, 30, 50, 80, 100, 150, 200, 300, 500, 800, 1000, 1500, 2000, 3000, 5000, 8000, 10000, 20000, 50000, 100000];
  const t = Math.max(floor, v);
  for (const s of steps) if (t <= s) return s;
  return Math.ceil(t / 100000) * 100000;
}

/* ---------------- 图标 ---------------- */

const ICONS = {
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 11h18"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-6M22 20H2"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.6 8.4-2.1 5.1-5.1 2.1 2.1-5.1 5.1-2.1Z"/>',
  sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  wallet: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 14h2"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  download: '<path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M5 21h14"/>',
  upload: '<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 21h14"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/>',
  trash: '<path d="M4 7h16"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6 7l1 13h10l1-13"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
};

function icon(name, cls = '') {
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

/* ---------------- 应用状态 ---------------- */

const app = {
  db: null,
  date: todayStr(),
  view: 'today',
  month: null,
  weekOffset: 0,
  search: '',
  finFilter: 'all',
  finType: 'expense',
  reviewKey: null,
  compact: true,
  installPrompt: null,
  saveTimer: null,
  saving: false,
  saveAgain: false,
  dirty: false,
  status: 'idle',
  lastSavedAt: null,
};

/* ---------------- 数据模型 ---------------- */

function blankEntry(date) {
  return {
    date,
    mood: 0,
    energy: 0,
    sleep: null,
    bed: '',
    weight: null,
    exerciseType: '',
    exerciseMin: null,
    body: '',
    headline: '',
    mit: [
      { text: '', done: false },
      { text: '', done: false },
      { text: '', done: false },
    ],
    work: '',
    study: '',
    learn: '',
    growth: '',
    milestone: '',
    highlight: '',
    insight: '',
    grateful: '',
    improve: '',
    habits: [],
    tags: [],
    finance: { items: [] },
    updatedAt: 0,
  };
}

function normalizeDb(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = {
    version: 1,
    entries: {},
    habits: Array.isArray(src.habits) ? src.habits.map(String).filter(Boolean) : ['运动', '阅读', '早睡', '冥想'],
    reviews: src.reviews && typeof src.reviews === 'object' ? src.reviews : {},
    settings: Object.assign({ theme: 'auto', welcomed: false, budget: 0 }, src.settings || {}),
  };
  const s = (v) => (typeof v === 'string' ? v : '');
  const entries = src.entries && typeof src.entries === 'object' ? src.entries : {};
  for (const [date, e] of Object.entries(entries)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !e || typeof e !== 'object') continue;
    const b = blankEntry(date);
    b.mood = clampNum(Number(e.mood) || 0, 0, 5);
    b.energy = clampNum(Number(e.energy) || 0, 0, 5);
    b.sleep = e.sleep === null || e.sleep === '' || e.sleep === undefined ? null : clampNum(Number(e.sleep) || 0, 0, 24);
    b.bed = s(e.bed).slice(0, 5);
    b.weight = e.weight === null || e.weight === '' || e.weight === undefined ? null : clampNum(Number(e.weight) || 0, 0, 500);
    b.exerciseType = s(e.exerciseType);
    b.exerciseMin = e.exerciseMin === null || e.exerciseMin === '' || e.exerciseMin === undefined ? null : clampNum(Number(e.exerciseMin) || 0, 0, 1440);
    b.body = s(e.body);
    b.headline = s(e.headline);
    const mit = Array.isArray(e.mit) ? e.mit : [];
    b.mit = [0, 1, 2].map((i) => ({
      text: s((mit[i] || {}).text),
      done: !!(mit[i] || {}).done,
    }));
    b.work = s(e.work);
    b.study = s(e.study);
    b.learn = s(e.learn);
    b.growth = s(e.growth);
    b.milestone = s(e.milestone);
    b.highlight = s(e.highlight);
    b.insight = s(e.insight);
    b.grateful = s(e.grateful);
    b.improve = s(e.improve);
    b.habits = Array.isArray(e.habits) ? e.habits.map(String) : [];
    b.tags = Array.isArray(e.tags)
      ? [...new Set(e.tags.map(String).map((t) => t.replace(/^#+/, '').trim()).filter(Boolean))]
      : [];
    const fin = e.finance && Array.isArray(e.finance.items) ? e.finance.items : [];
    b.finance = {
      items: fin
        .filter((t) => t && typeof t === 'object')
        .map((t) => ({
          id: s(t.id) || Math.random().toString(36).slice(2, 9),
          type: t.type === 'income' ? 'income' : 'expense',
          amount: Math.round((Number(t.amount) || 0) * 100) / 100,
          category: s(t.category) || '其他',
          note: s(t.note),
        }))
        .filter((t) => t.amount > 0),
    };
    b.updatedAt = Number(e.updatedAt) || 0;
    out.entries[date] = b;
  }
  return out;
}

function hasContent(e) {
  if (!e) return false;
  const txt = [e.body, e.headline, e.work, e.study, e.learn, e.growth, e.milestone, e.highlight, e.insight, e.grateful, e.improve];
  return !!(
    e.mood || e.energy ||
    (typeof e.sleep === 'number' && e.sleep > 0) ||
    (typeof e.weight === 'number' && e.weight > 0) ||
    e.exerciseType || (typeof e.exerciseMin === 'number' && e.exerciseMin > 0) ||
    txt.some((v) => v && v.trim()) ||
    (e.mit || []).some((m) => m.text && m.text.trim()) ||
    (e.habits || []).length ||
    (e.tags || []).length ||
    (e.finance && e.finance.items && e.finance.items.length)
  );
}

function getEntry(date) { return app.db.entries[date] || blankEntry(date); }

function ensureEntry(date) {
  let e = app.db.entries[date];
  if (!e) {
    e = blankEntry(date);
    app.db.entries[date] = e;
  }
  return e;
}

function touch(e) { e.updatedAt = Date.now(); }

function prune() {
  for (const [date, e] of Object.entries(app.db.entries)) {
    if (!hasContent(e)) delete app.db.entries[date];
  }
}

function recordedEntries() {
  return Object.values(app.db.entries).filter((e) => hasContent(e));
}

function calcStreak() {
  let d = todayStr();
  if (!hasContent(app.db.entries[d])) d = addDays(d, -1);
  let n = 0;
  while (hasContent(app.db.entries[d])) {
    n += 1;
    d = addDays(d, -1);
    if (n > 3650) break;
  }
  return n;
}

function firstText(e) {
  return [e.headline, e.insight, e.work, e.study, e.growth, e.body, e.highlight].find((v) => v && v.trim()) || '';
}

function textStats() {
  const fields = ['headline', 'body', 'work', 'study', 'learn', 'growth', 'milestone', 'highlight', 'insight', 'grateful', 'improve'];
  let chars = 0;
  for (const e of recordedEntries()) {
    for (const f of fields) chars += (e[f] || '').replace(/\s/g, '').length;
  }
  return chars;
}

/* ---------------- 保存 ---------------- */

function setStatus(kind) {
  app.status = kind;
  const map = {
    idle: '准备就绪',
    editing: '正在输入…',
    saving: '保存中…',
    saved: app.lastSavedAt ? `已保存 ${timeHM(app.lastSavedAt)}` : '已保存',
    error: '保存失败 · 点击重试',
  };
  $$('[data-role="save"]').forEach((el) => {
    el.dataset.state = kind;
    const txt = el.querySelector('.txt');
    if (txt) txt.textContent = map[kind] || '';
  });
}

function scheduleSave() {
  app.dirty = true;
  setStatus('editing');
  clearTimeout(app.saveTimer);
  app.saveTimer = setTimeout(() => flush(), 700);
}

async function flush() {
  clearTimeout(app.saveTimer);
  if (!app.db) return;
  if (app.saving) { app.saveAgain = true; return; }
  prune();
  const snapshot = JSON.stringify(app.db);
  app.saving = true;
  setStatus('saving');
  try {
    const ok = await saveState(app.db);
    if (!ok) throw new Error('本地存储不可用');
    app.lastSavedAt = new Date();
    app.dirty = false;
    setStatus('saved');
    if (JSON.stringify(app.db) !== snapshot) scheduleSave();
  } catch (err) {
    console.error('保存失败', err);
    setStatus('error');
  } finally {
    app.saving = false;
    if (app.saveAgain) {
      app.saveAgain = false;
      flush();
    }
  }
}

/* ---------------- 通用片段 ---------------- */

function saveChipHtml() {
  return `<span class="save-chip small" data-role="save" data-state="${app.status}" data-act="save-retry" title="点击可重试保存"><span class="dot"></span><span class="txt">准备就绪</span></span>`;
}

function gearLink() {
  return `<a class="icon-btn" href="#/settings" aria-label="设置" title="设置">${icon('sliders')}</a>`;
}

function simpleHead(eyebrow, title, sub, actions) {
  return `<header class="page-head">
    <div class="head-title">
      <p class="eyebrow">${eyebrow}</p>
      <h1>${title}</h1>
      <p class="head-sub">${sub}</p>
    </div>
    <div class="head-actions">${saveChipHtml()}${actions}</div>
  </header>`;
}

function statBlock(num, unit, label, cls = '') {
  return `<div class="stat"><div class="num ${cls}">${num}${unit ? `<small>${unit}</small>` : ''}</div><div class="lbl">${label}</div></div>`;
}

/* ---------------- 图表 ---------------- */

function chartLine(days, series) {
  const W = 760, H = 208, L = 30, R = 14, T = 16, B = 26;
  const pw = W - L - R, ph = H - T - B;
  const x = (i) => (days.length <= 1 ? L + pw / 2 : L + (i * pw) / (days.length - 1));
  const y = (v) => T + ph - ((v - 1) / 4) * ph;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="心情与精力趋势">`;
  for (let v = 1; v <= 5; v += 1) {
    s += `<line class="grid-line" x1="${L}" y1="${y(v)}" x2="${W - R}" y2="${y(v)}"/>`;
    s += `<text class="axis" x="${L - 7}" y="${y(v) + 3.5}" text-anchor="end">${v}</text>`;
  }
  const step = Math.max(1, Math.round(days.length / 8));
  const last = days.length - 1;
  days.forEach((d, i) => {
    const onStep = i % step === 0;
    const isLast = i === last;
    if (!onStep && !isLast) return;
    if (isLast && !onStep && last % step < step * 0.6) return;
    const dt = parseDate(d);
    s += `<text class="axis" x="${x(i)}" y="${H - 8}" text-anchor="middle">${dt.getMonth() + 1}/${dt.getDate()}</text>`;
  });
  for (const se of series) {
    let path = '';
    let pen = false;
    se.values.forEach((v, i) => {
      if (v == null) { pen = false; return; }
      path += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)} `;
      pen = true;
    });
    s += `<path d="${path}" fill="none" stroke="${se.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
    se.values.forEach((v, i) => {
      if (v == null) return;
      const dt = parseDate(days[i]);
      s += `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="2.6" fill="${se.color}"><title>${dt.getMonth() + 1}/${dt.getDate()} ${se.name} ${v}/5</title></circle>`;
    });
  }
  return s + '</svg>';
}

function chartBars(days, values, opts = {}) {
  const W = 760, H = 188, L = 40, R = 12, T = 14, B = 26;
  const pw = W - L - R, ph = H - T - B;
  const max = opts.max || 10;
  const color = opts.color || '#5E8C70';
  const ref = opts.ref;
  const axisFmt = opts.axisFmt || ((v) => String(v));
  const title = opts.title || ((i, v) => `${days[i]} ${v}`);
  const x = (i) => L + (i + 0.5) * (pw / days.length);
  const bw = Math.max(2, (pw / days.length) * 0.58);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || '')}">`;
  [0, max / 2, max].forEach((v) => {
    const y = T + ph - (v / max) * ph;
    s += `<line class="grid-line" x1="${L}" y1="${y}" x2="${W - R}" y2="${y}"/>`;
    s += `<text class="axis" x="${L - 7}" y="${y + 3.5}" text-anchor="end">${axisFmt(v)}</text>`;
  });
  const step = Math.max(1, Math.round(days.length / 10));
  const last = days.length - 1;
  days.forEach((d, i) => {
    const onStep = i % step === 0;
    const isLast = i === last;
    if (!onStep && !isLast) return;
    if (isLast && !onStep && last % step < step * 0.6) return;
    const dt = parseDate(d);
    s += `<text class="axis" x="${x(i)}" y="${H - 8}" text-anchor="middle">${dt.getMonth() + 1}/${dt.getDate()}</text>`;
  });
  values.forEach((v, i) => {
    if (v == null || v <= 0) return;
    const h = Math.max(1.5, (Math.min(v, max) / max) * ph);
    s += `<rect x="${(x(i) - bw / 2).toFixed(1)}" y="${(T + ph - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="2.5" fill="${color}" opacity="0.85"><title>${esc(title(i, v))}</title></rect>`;
  });
  if (ref != null && ref <= max) {
    const y = T + ph - (ref / max) * ph;
    s += `<line x1="${L}" y1="${y}" x2="${W - R}" y2="${y}" stroke="${color}" stroke-width="1" stroke-dasharray="4 4" opacity="0.45"/>`;
    s += `<text class="axis" x="${W - R - 2}" y="${y - 5}" text-anchor="end">参考 ${axisFmt(ref)}</text>`;
  }
  return s + '</svg>';
}

/* ---------------- 视图：今日 ---------------- */

function todayView() {
  const date = app.date;
  const e = getEntry(date);
  const d = parseDate(date);
  const isToday = date === todayStr();
  const streak = calcStreak();
  const monthCount = Object.keys(app.db.entries).filter((k) => k.startsWith(date.slice(0, 7)) && hasContent(app.db.entries[k])).length;

  return `${simpleHead(
    `${d.getFullYear()} 年 · ${WEEKDAYS[d.getDay()]}${isToday ? ' · 今天' : ''}`,
    `${d.getMonth() + 1} 月 ${d.getDate()} 日`,
    streak ? `连续记录 <b>${streak}</b> 天 · 本月 <b>${monthCount}</b> 天` : '写下今天的第一笔，就开始了',
    `<button class="icon-btn" data-act="prev-day" aria-label="前一天" title="前一天">${icon('left')}</button>
     <button class="btn ghost" data-act="today" ${isToday ? 'disabled' : ''}>今天</button>
     <button class="icon-btn" data-act="next-day" aria-label="后一天" title="后一天" ${isToday ? 'disabled' : ''}>${icon('right')}</button>
     ${gearLink()}`
  )}
  ${welcomeHtml()}
  ${backupBannerHtml()}
  <div class="grid">
    ${todayCoreCard(e)}
    ${mitCard(e)}
    ${financeCard(e)}
    ${noteCard(e)}
    ${moreCard(e)}
  </div>`;
}

function todayCoreCard(e) {
  return `<section class="card span2">
    <div class="card-head"><span class="dot"></span><h2>今天</h2><span class="card-hint">点一下心情，写一句</span></div>
    <div class="state-top">
      <div class="field">
        <span class="label">心情</span>
        <div class="moods">${MOODS.map((m) => `<button type="button" class="mood ${e.mood === m.v ? 'on' : ''}" data-act="mood" data-v="${m.v}" aria-pressed="${e.mood === m.v}" aria-label="心情：${m.label}" title="${m.label}">${m.e}</button>`).join('')}</div>
      </div>
      <div class="field">
        <span class="label">精力</span>
        <div class="energies">${[1, 2, 3, 4, 5].map((v) => `<button type="button" class="energy ${e.energy >= v ? 'on' : ''}" data-act="energy" data-v="${v}" aria-label="精力 ${v} / 5" title="精力 ${v} / 5"><i></i></button>`).join('')}</div>
      </div>
    </div>
    <div class="field wide">
      <span class="label">一句话</span>
      <input class="headline-input" type="text" data-bind="headline" value="${esc(e.headline)}" maxlength="120" placeholder="如果只能用一句话记住今天，会是什么？" aria-label="今日一句话">
    </div>
  </section>`;
}

function noteCard(e) {
  return `<section class="card span2">
    <div class="card-head"><span class="dot rose"></span><h2>随手记</h2><span class="card-hint">想法、工作、学习，都可以</span></div>
    <textarea class="journal" data-bind="insight" placeholder="今天做了什么、想明白了什么…">${esc(e.insight)}</textarea>
  </section>`;
}

function moreCard(e) {
  const has = !!(e.sleep || e.exerciseMin || e.weight || e.body || e.work || e.study || e.learn || e.growth || e.milestone || e.highlight || e.grateful || e.improve || (e.tags || []).length);
  return `<section class="card span2">
    <details class="more-details">
      <summary>
        <span class="more-title">更多记录</span>
        <span class="more-hint">${has ? '已填写' : '睡眠 / 运动 / 工作 / 学习 / 成长'}</span>
      </summary>
      <div class="more-body">
        <h3>身体</h3>
        <div class="state-top">
          <div class="field">
            <span class="label">睡眠</span>
            <div class="mini-group">
              <label class="mini"><input type="number" inputmode="decimal" data-bind="sleep" data-kind="num" step="0.5" min="0" max="24" value="${e.sleep ?? ''}" placeholder="7.5" aria-label="睡眠小时数"><span>小时</span></label>
              <label class="mini"><input type="time" data-bind="bed" value="${esc(e.bed)}" aria-label="入睡时间"><span>入睡</span></label>
            </div>
          </div>
          <div class="field">
            <span class="label">运动</span>
            <div class="mini-group">
              <label class="mini"><input type="text" data-bind="exerciseType" value="${esc(e.exerciseType)}" placeholder="跑步 / 力量 / 散步" maxlength="20" aria-label="运动类型"></label>
              <label class="mini"><input type="number" inputmode="numeric" data-bind="exerciseMin" data-kind="num" min="0" max="1440" step="5" value="${e.exerciseMin ?? ''}" placeholder="30" aria-label="运动分钟数"><span>分钟</span></label>
            </div>
          </div>
          <div class="field">
            <span class="label">体重</span>
            <label class="mini"><input type="number" inputmode="decimal" data-bind="weight" data-kind="num" step="0.1" min="0" max="500" value="${e.weight ?? ''}" placeholder="65.0" aria-label="体重"><span>kg</span></label>
          </div>
        </div>
        <div class="field wide">
          <span class="label">身体感受</span>
          <textarea rows="1" data-bind="body" placeholder="睡眠质量、疼痛、饮食、久坐、肩颈…">${esc(e.body)}</textarea>
        </div>
        <h3>分项</h3>
        <div class="field">
          <span class="label">工作</span>
          <textarea data-bind="work" placeholder="今天做了什么、推进到哪…">${esc(e.work)}</textarea>
        </div>
        <div class="field wide">
          <span class="label">学习</span>
          <textarea data-bind="study" placeholder="读了什么、练了什么…">${esc(e.study)}</textarea>
        </div>
        <div class="field wide">
          <span class="label">今天的收获</span>
          <input type="text" data-bind="learn" value="${esc(e.learn)}" maxlength="200" placeholder="一条以后用得上的新知或方法">
        </div>
        <div class="field wide">
          <span class="label">成长</span>
          <textarea data-bind="growth" placeholder="今天比昨天进步的一点…">${esc(e.growth)}</textarea>
        </div>
        <div class="field wide">
          <span class="label">里程碑</span>
          <input type="text" data-bind="milestone" value="${esc(e.milestone)}" maxlength="200" placeholder="值得标记的一步（不常有）">
        </div>
        <h3>其他</h3>
        <div class="field">
          <span class="label">今日高光</span>
          <input type="text" data-bind="highlight" value="${esc(e.highlight)}" maxlength="120" placeholder="最满意的一刻">
        </div>
        <div class="field wide">
          <span class="label">想感谢的</span>
          <input type="text" data-bind="grateful" value="${esc(e.grateful)}" maxlength="120" placeholder="一个人或一件小事">
        </div>
        <div class="field wide">
          <span class="label">明天改进一点</span>
          <input type="text" data-bind="improve" value="${esc(e.improve)}" maxlength="120" placeholder="只改一件就好">
        </div>
        <h3>标签</h3>
        <div class="tagbox" data-role="tags">${tagChips(e)}<input id="tag-input" list="tag-suggest" placeholder="输入后回车" maxlength="20" aria-label="添加标签"></div>
        <datalist id="tag-suggest">${allTags().map((t) => `<option value="${esc(t)}"></option>`).join('')}</datalist>
      </div>
    </details>
  </section>`;
}

function backupBannerHtml() {
  const count = recordedEntries().length;
  if (count < 3) return '';
  const last = app.db.settings.lastBackupAt;
  const days = last ? Math.floor((Date.now() - new Date(last).getTime()) / 86400000) : null;
  if (last && days < 7) return '';
  return `<div class="welcome backup-warn">
    <div>
      <strong>${last ? `距上次备份已经 ${days} 天` : '还没有备份过'}</strong>
      <p>记录只在这台手机上。导出一次 JSON 放到网盘或微信，换手机时才有得恢复。</p>
    </div>
    <button class="btn primary" data-act="export-json">立即备份</button>
  </div>`;
}

function welcomeHtml() {
  if (app.db.settings.welcomed) return '';
  return `<div class="welcome">
    <div>
      <strong>欢迎来到日迹</strong>
      <p>每天 3 分钟：点心情 → 写三件事 → 留一句话 → 记一笔。其他都在「更多记录」里。</p>
    </div>
    <button class="btn" data-act="dismiss-welcome">知道了</button>
  </div>`;
}

function stateCard(e) {
  return `<section class="card span2">
    <div class="card-head"><span class="dot"></span><h2>状态</h2><span class="card-hint">身体与精力，随手记一笔</span></div>
    <div class="state-top">
      <div class="field">
        <span class="label">心情</span>
        <div class="moods">${MOODS.map((m) => `<button type="button" class="mood ${e.mood === m.v ? 'on' : ''}" data-act="mood" data-v="${m.v}" aria-pressed="${e.mood === m.v}" aria-label="心情：${m.label}" title="${m.label}">${m.e}</button>`).join('')}</div>
      </div>
      <div class="field">
        <span class="label">精力</span>
        <div class="energies">${[1, 2, 3, 4, 5].map((v) => `<button type="button" class="energy ${e.energy >= v ? 'on' : ''}" data-act="energy" data-v="${v}" aria-label="精力 ${v} / 5" title="精力 ${v} / 5"><i></i></button>`).join('')}</div>
      </div>
    </div>
    <div class="field wide">
      <span class="label">今日一句话</span>
      <input class="headline-input" type="text" data-bind="headline" value="${esc(e.headline)}" maxlength="120" placeholder="如果只能用一句话记住今天，会是什么？" aria-label="今日一句话">
    </div>
    <details class="state-more" ${window.matchMedia('(min-width: 761px)').matches ? 'open' : ''}>
      <summary>睡眠 · 运动 · 体重 · 身体感受</summary>
      <div class="state-top">
        <div class="field">
          <span class="label">睡眠</span>
          <div class="mini-group">
            <label class="mini"><input type="number" inputmode="decimal" data-bind="sleep" data-kind="num" step="0.5" min="0" max="24" value="${e.sleep ?? ''}" placeholder="7.5" aria-label="睡眠小时数"><span>小时</span></label>
            <label class="mini"><input type="time" data-bind="bed" value="${esc(e.bed)}" aria-label="入睡时间"><span>入睡</span></label>
          </div>
        </div>
        <div class="field">
          <span class="label">运动</span>
          <div class="mini-group">
            <label class="mini"><input type="text" data-bind="exerciseType" value="${esc(e.exerciseType)}" placeholder="跑步 / 力量 / 散步" maxlength="20" aria-label="运动类型"></label>
            <label class="mini"><input type="number" inputmode="numeric" data-bind="exerciseMin" data-kind="num" min="0" max="1440" step="5" value="${e.exerciseMin ?? ''}" placeholder="30" aria-label="运动分钟数"><span>分钟</span></label>
          </div>
        </div>
        <div class="field">
          <span class="label">体重</span>
          <label class="mini"><input type="number" inputmode="decimal" data-bind="weight" data-kind="num" step="0.1" min="0" max="500" value="${e.weight ?? ''}" placeholder="65.0" aria-label="体重"><span>kg</span></label>
        </div>
      </div>
      <div class="field wide">
        <span class="label">身体感受</span>
        <textarea rows="1" data-bind="body" placeholder="睡眠质量、疼痛、饮食、久坐、肩颈…">${esc(e.body)}</textarea>
      </div>
    </details>
  </section>`;
}

function mitCard(e) {
  const done = e.mit.filter((m) => m.done && m.text.trim()).length;
  const placeholders = ['最重要的一件事', '第二件事', '如果有余力，还想做…'];
  return `<section class="card span2">
    <div class="card-head"><span class="dot amber"></span><h2>今日三件事</h2><span class="pill" data-role="mit-count">${done} / 3</span><span class="card-hint">先做重要的，不必排满</span></div>
    <ol class="mits">
      ${e.mit.map((m, i) => `<li class="mit ${m.done ? 'is-done' : ''}">
        <span class="mit-no">0${i + 1}</span>
        <label class="check"><input type="checkbox" data-bind="mit" data-index="${i}" data-prop="done" ${m.done ? 'checked' : ''} aria-label="标记第 ${i + 1} 件事完成"><i>${icon('check')}</i></label>
        <input type="text" class="${m.done ? 'done' : ''}" data-bind="mit" data-index="${i}" data-prop="text" value="${esc(m.text)}" maxlength="120" placeholder="${placeholders[i]}" aria-label="第 ${i + 1} 件事">
      </li>`).join('')}
    </ol>
  </section>`;
}

function workCard(e) {
  return `<section class="card">
    <div class="card-head"><span class="dot"></span><h2>工作</h2></div>
    <textarea class="tall" data-bind="work" placeholder="今天做了什么、推进到哪、卡在哪里…">${esc(e.work)}</textarea>
  </section>`;
}

function studyCard(e) {
  return `<section class="card">
    <div class="card-head"><span class="dot blue"></span><h2>学习</h2></div>
    <textarea data-bind="study" placeholder="读了什么、练了什么、听了什么…">${esc(e.study)}</textarea>
    <div class="field mt">
      <span class="label">今天的收获</span>
      <input type="text" data-bind="learn" value="${esc(e.learn)}" maxlength="200" placeholder="一条以后用得上的新知或方法">
    </div>
  </section>`;
}

function reflectCard(e) {
  return `<section class="card span2">
    <div class="card-head"><span class="dot rose"></span><h2>感悟</h2><span class="card-hint">写给以后的自己</span></div>
    <textarea class="journal" data-bind="insight" placeholder="今天想明白了什么？哪件事值得再想一遍？">${esc(e.insight)}</textarea>
    <div class="reflect-extras">
      <label class="field"><span class="label">今日高光</span><input type="text" data-bind="highlight" value="${esc(e.highlight)}" maxlength="120" placeholder="最满意的一刻"></label>
      <label class="field"><span class="label">想感谢的</span><input type="text" data-bind="grateful" value="${esc(e.grateful)}" maxlength="120" placeholder="一个人或一件小事"></label>
      <label class="field"><span class="label">明天改进一点</span><input type="text" data-bind="improve" value="${esc(e.improve)}" maxlength="120" placeholder="只改一件就好"></label>
    </div>
  </section>`;
}

function growthCard(e) {
  return `<section class="card">
    <div class="card-head"><span class="dot"></span><h2>成长</h2></div>
    <span class="label">今天比昨天进步的一点</span>
    <textarea data-bind="growth" placeholder="哪怕很小：一个更顺手的做法、一次没退缩的表达…">${esc(e.growth)}</textarea>
    <div class="field mt">
      <span class="label">里程碑（不常有，有就记）</span>
      <input type="text" data-bind="milestone" value="${esc(e.milestone)}" maxlength="200" placeholder="值得标记的一步">
    </div>
  </section>`;
}

function metaCard(e) {
  return `<section class="card">
    <div class="card-head"><span class="dot"></span><h2>习惯与标签</h2></div>
    <span class="label">今日做到</span>
    <div class="chips" data-role="habits">${habitChips(e)}</div>
    <div class="field mt">
      <span class="label">标签</span>
      <div class="tagbox" data-role="tags">${tagChips(e)}<input id="tag-input" list="tag-suggest" placeholder="输入后回车" maxlength="20" aria-label="添加标签"></div>
      <datalist id="tag-suggest">${allTags().map((t) => `<option value="${esc(t)}"></option>`).join('')}</datalist>
    </div>
  </section>`;
}

function habitChips(e) {
  const names = [...new Set([...(app.db.habits || []), ...(e.habits || [])])];
  if (!names.length) return '<span class="muted-note">在设置里添加想坚持的习惯</span>';
  return names.map((n) => `<button type="button" class="chip ${e.habits.includes(n) ? 'is-on' : ''}" data-act="habit" data-name="${esc(n)}"><span class="chip-dot"></span>${esc(n)}</button>`).join('');
}

function tagChips(e) {
  return (e.tags || []).map((t) => `<span class="tag">#${esc(t)}<button type="button" data-act="tag-remove" data-name="${esc(t)}" aria-label="删除标签 ${esc(t)}">${icon('x')}</button></span>`).join('');
}

function allTags() {
  const set = new Set();
  recordedEntries().forEach((e) => (e.tags || []).forEach((t) => set.add(t)));
  return [...set].slice(0, 60);
}

/* ---------------- 今日：收支卡 ---------------- */

function financeCard(e) {
  return `<section class="card span2" data-role="finance">${financeInner(e)}</section>`;
}

function financeInner(e) {
  const items = (e.finance && e.finance.items) || [];
  const recent = items.slice(-3);
  const expense = items.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const income = items.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const cats = app.finType === 'income' ? INCOME_CATS : EXPENSE_CATS;
  return `<div class="card-head">
      <span class="dot money"></span><h2>收支</h2>
      <span class="money-sum">支出 <b>${money(expense)}</b> · 收入 <b>${money(income)}</b></span>
      <span class="card-hint">${items.length ? `${items.length} 笔` : '记下每一笔，月底才有数'}</span>
    </div>
    ${items.length ? `<div class="fin-list">${recent.map((t) => finRow(t, e.date)).join('')}</div>` : ''}
    ${items.length > 3 ? `<a class="fin-more" href="#/money">还有 ${items.length - 3} 笔，去账本看</a>` : ''}
    <form class="fin-add" autocomplete="off">
      <div class="seg tiny" role="group" aria-label="收支类型">
        <button type="button" data-act="fin-type" data-v="expense" class="${app.finType === 'expense' ? 'is-on' : ''}">支出</button>
        <button type="button" data-act="fin-type" data-v="income" class="${app.finType === 'income' ? 'is-on' : ''}">收入</button>
      </div>
      <input id="fin-amount" type="number" inputmode="decimal" min="0" max="9999999" step="0.01" placeholder="金额" aria-label="金额">
      <select id="fin-cat" aria-label="分类">${cats.map((c) => `<option>${c}</option>`).join('')}</select>
      <input id="fin-note" type="text" maxlength="40" placeholder="备注（可选）" aria-label="备注">
      <button class="btn primary" type="submit">记一笔</button>
    </form>`;
}

function finRow(t, date) {
  return `<div class="fin-row">
    <span class="fin-tag ${t.type === 'income' ? 'in' : ''}">${esc(t.category)}</span>
    <span class="fin-note">${esc(t.note || '')}</span>
    <span class="fin-amt ${t.type === 'income' ? 'in' : 'out'}">${t.type === 'income' ? '+' : '−'}${money(t.amount)}</span>
    <button type="button" class="fin-del" data-act="fin-del" data-date="${date}" data-id="${esc(t.id)}" aria-label="删除这笔记录">${icon('x')}</button>
  </div>`;
}

function refreshFinance() {
  const card = $('[data-role="finance"]');
  if (!card) return;
  card.innerHTML = financeInner(getEntry(app.date));
}

function addTransaction() {
  const amountEl = $('#fin-amount');
  if (!amountEl) return;
  const amount = Math.round((parseFloat(amountEl.value) || 0) * 100) / 100;
  if (!isFinite(amount) || amount <= 0) {
    amountEl.focus();
    toast('请输入大于 0 的金额');
    return;
  }
  const e = ensureEntry(app.date);
  if (!e.finance) e.finance = { items: [] };
  e.finance.items.push({
    id: Math.random().toString(36).slice(2, 9),
    type: app.finType,
    amount,
    category: ($('#fin-cat') || {}).value || '其他',
    note: ($('#fin-note') || {}).value.trim(),
  });
  touch(e);
  scheduleSave();
  if (app.view === 'money') {
    render();
    const next = $('#fin-amount');
    if (next) next.focus();
  } else {
    refreshFinance();
    const next = $('#fin-amount');
    if (next) next.focus();
  }
  toast(app.finType === 'income' ? '已记一笔收入' : '已记一笔支出');
}

function deleteTransaction(date, id) {
  const e = app.db.entries[date];
  if (!e || !e.finance) return;
  e.finance.items = e.finance.items.filter((t) => t.id !== id);
  touch(e);
  scheduleSave();
  if (app.view === 'money') render();
  else refreshFinance();
  toast('已删除');
}

/* ---------------- 视图：日历 ---------------- */

function legacyCalendarView() {
  const monthStr = app.month || app.date.slice(0, 7);
  const [y, m] = monthStr.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const lead = (first.getDay() + 6) % 7;
  const total = new Date(y, m, 0).getDate();
  const cells = [];
  for (let i = 0; i < lead; i += 1) cells.push(null);
  for (let d = 1; d <= total; d += 1) {
    cells.push({ d, ds: `${y}-${pad(m)}-${pad(d)}` });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const monthEntries = recordedEntries().filter((e) => e.date.startsWith(monthStr));
  const avgMood = avg(monthEntries.map((e) => e.mood).filter(Boolean));
  const exercise = monthEntries.reduce((s, e) => s + (e.exerciseMin || 0), 0);

  const cellHtml = cells.map((c) => {
    if (!c) return '<div class="cal-cell is-empty" aria-hidden="true"></div>';
    const e = app.db.entries[c.ds];
    const has = e && hasContent(e);
    const mood = has ? e.mood : 0;
    const hl = has ? (e.headline || firstText(e)) : '';
    const cls = [has ? 'has' : '', c.ds === app.date ? 'is-selected' : '', c.ds === todayStr() ? 'is-today' : ''].filter(Boolean).join(' ');
    return `<button type="button" class="cal-cell ${cls}" data-act="open-day" data-date="${c.ds}" data-mood="${mood}" aria-label="${c.ds}${has ? ' 有记录' : ''}">
      <span class="cal-num">${c.d}</span>
      <span class="cal-hl">${esc(hl)}</span>
      <span class="cal-mood"></span>
    </button>`;
  }).join('');

  return `${simpleHead(
    '日历',
    `${y} 年 ${m} 月`,
    `记录 <b>${monthEntries.length}</b> 天 · 平均心情 <b>${fmt1(avgMood)}</b> · 运动 <b>${exercise}</b> 分钟`,
    `<button class="icon-btn" data-act="prev-month" aria-label="上个月">${icon('left')}</button>
     <button class="btn ghost" data-act="this-month">本月</button>
     <button class="icon-btn" data-act="next-month" aria-label="下个月">${icon('right')}</button>`
  )}
  <div class="grid">
    <section class="card span2">
      <div class="cal-dows">${WEEK_CN.map((d) => `<div class="cal-dow">${d}</div>`).join('')}</div>
      <div class="cal">${cellHtml}</div>
    </section>
    <section class="card span2">
      <div class="card-head"><span class="dot"></span><h2>全部记录</h2><span class="card-hint">共 ${recordedEntries().length} 天</span></div>
      <div class="searchbox">${icon('search')}<input id="search" type="search" placeholder="搜索记录、标签、收支备注…" value="${esc(app.search)}" aria-label="搜索记录"></div>
      <div class="entry-list" data-role="entry-list">${entryListHtml()}</div>
    </section>
  </div>`;
}

function entryListHtml() {
  const q = app.search.trim().toLowerCase();
  let items = recordedEntries().sort((a, b) => b.date.localeCompare(a.date));
  if (q) {
    items = items.filter((e) => {
      const fin = (e.finance.items || []).map((t) => `${t.category} ${t.note} ${t.amount}`).join(' ');
      const hay = [e.date, e.headline, e.body, e.work, e.study, e.learn, e.growth, e.milestone, e.highlight, e.insight, e.grateful, e.improve, (e.tags || []).join(' '), fin].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }
  items = items.slice(0, 60);
  if (!items.length) return `<p class="empty-note">${q ? '没有找到相关记录' : '还没有记录，从今天开始吧'}</p>`;
  return items.map((e) => {
    const d = parseDate(e.date);
    const text = e.headline || firstText(e);
    return `<button type="button" class="entry-item" data-act="open-day" data-date="${e.date}">
      <span class="entry-date"><b>${d.getMonth() + 1}/${d.getDate()}</b><em>${WEEKDAYS[d.getDay()]}</em></span>
      <span class="entry-main">
        <span class="entry-hl">${esc(text || '（仅状态记录）')}</span>
        <span class="entry-tags">${(e.tags || []).map((t) => `#${esc(t)}`).join(' ')}</span>
      </span>
    </button>`;
  }).join('');
}

function renderEntryList() {
  const box = $('[data-role="entry-list"]');
  if (box) box.innerHTML = entryListHtml();
}

/* ---------------- 视图：账本 ---------------- */

function collectFinance(prefix) {
  const items = [];
  for (const [date, e] of Object.entries(app.db.entries)) {
    if (!date.startsWith(prefix) || !e.finance || !e.finance.items || !e.finance.items.length) continue;
    for (const t of e.finance.items) items.push({ ...t, date });
  }
  items.sort((a, b) => b.date.localeCompare(a.date));
  const expense = items.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const income = items.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  return { items, expense, income };
}

function legacyFinanceView() {
  const prefix = app.month || todayStr().slice(0, 7);
  const [y, m] = prefix.split('-').map(Number);
  const total = daysInMonth(prefix);
  const nowPrefix = todayStr().slice(0, 7);
  const elapsed = prefix === nowPrefix ? parseDate(todayStr()).getDate() : (prefix < nowPrefix ? total : 0);
  const { items, expense, income } = collectFinance(prefix);
  const balance = income - expense;
  const budget = Number(app.db.settings.budget) || 0;
  const pct = budget > 0 ? (expense / budget) * 100 : 0;

  const dayValues = [];
  const dayKeys = [];
  for (let d = 1; d <= total; d += 1) {
    const ds = `${prefix}-${pad(d)}`;
    dayKeys.push(ds);
    dayValues.push(items.filter((t) => t.date === ds && t.type === 'expense').reduce((s, t) => s + t.amount, 0));
  }
  const maxDay = Math.max(0, ...dayValues);
  const expenseCats = {};
  const incomeCats = {};
  items.forEach((t) => {
    if (t.type === 'expense') expenseCats[t.category] = (expenseCats[t.category] || 0) + t.amount;
    else incomeCats[t.category] = (incomeCats[t.category] || 0) + t.amount;
  });
  const expList = Object.entries(expenseCats).sort((a, b) => b[1] - a[1]);
  const incList = Object.entries(incomeCats).sort((a, b) => b[1] - a[1]);

  const filtered = app.finFilter === 'all' ? items : items.filter((t) => t.type === app.finFilter);
  const groups = {};
  filtered.forEach((t) => { (groups[t.date] = groups[t.date] || []).push(t); });
  const groupList = Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));

  return `${simpleHead(
    '账本',
    `${y} 年 ${m} 月`,
    `收入 <b>${money(income)}</b> · 支出 <b>${money(expense)}</b> · 结余 <b>${money(balance)}</b>`,
    `<button class="icon-btn" data-act="prev-month" aria-label="上个月">${icon('left')}</button>
     <button class="btn ghost" data-act="this-month">本月</button>
     <button class="icon-btn" data-act="next-month" aria-label="下个月">${icon('right')}</button>`
  )}
  <div class="stats">
    ${statBlock(money(income), '', '本月收入', 'accent')}
    ${statBlock(money(expense), '', '本月支出', 'rose')}
    ${statBlock(money(Math.abs(balance)), '', balance < 0 ? '超支' : '结余', balance < 0 ? 'rose' : '')}
    ${statBlock(money(elapsed ? expense / elapsed : 0), '', '日均支出')}
  </div>
  ${budget > 0 ? `<section class="card" style="margin-top:14px">
    <div class="budget-head"><span>本月预算 ${money(budget)}</span><span>${expense > budget ? `已超支 ${money(expense - budget)}` : `还剩 ${money(budget - expense)}`}</span></div>
    <div class="budget-bar"><i class="${pct > 100 ? 'over' : pct > 80 ? 'warn' : ''}" style="width:${Math.min(100, pct).toFixed(1)}%"></i></div>
  </section>` : ''}
  <div class="grid" style="margin-top:14px">
    <section class="card span2">
      <div class="card-head"><span class="dot money"></span><h2>每日支出</h2><span class="card-hint">${items.length ? `共 ${items.length} 笔` : '本月还没有记账'}</span></div>
      <div class="chart">${items.length ? chartBars(dayKeys, dayValues, {
        max: niceMax(maxDay, 100),
        color: '#B4685A',
        axisFmt: moneyShort,
        title: (i, v) => `${dayKeys[i]} 支出 ${money(v)}`,
        label: '每日支出',
      }) : '<p class="empty-note">记下第一笔收支，这里会出现每天的支出柱状图</p>'}</div>
    </section>
    <section class="card">
      <div class="card-head"><span class="dot rose"></span><h2>支出构成</h2></div>
      ${expList.length ? `<div class="cat-list">${expList.map(([name, amt]) => `<div class="cat-row"><span class="cat-name">${esc(name)}</span><span class="cat-track"><i style="width:${((amt / expense) * 100).toFixed(1)}%"></i></span><span class="cat-amt">${money(amt)}</span><span class="cat-pct">${Math.round((amt / expense) * 100)}%</span></div>`).join('')}</div>` : '<p class="empty-note">本月还没有支出记录</p>'}
    </section>
    <section class="card">
      <div class="card-head"><span class="dot"></span><h2>收入来源</h2></div>
      ${incList.length ? `<div class="cat-list">${incList.map(([name, amt]) => `<div class="cat-row"><span class="cat-name">${esc(name)}</span><span class="cat-track income"><i style="width:${((amt / income) * 100).toFixed(1)}%"></i></span><span class="cat-amt">${money(amt)}</span><span class="cat-pct">${Math.round((amt / income) * 100)}%</span></div>`).join('')}</div>` : '<p class="empty-note">本月还没有收入记录</p>'}
    </section>
    <section class="card span2">
      <div class="card-head"><span class="dot"></span><h2>明细</h2>
        <div class="seg tiny" style="margin-left:auto">
          ${[['all', '全部'], ['expense', '支出'], ['income', '收入']].map(([v, l]) => `<button type="button" data-act="fin-filter" data-v="${v}" class="${app.finFilter === v ? 'is-on' : ''}">${l}</button>`).join('')}
        </div>
      </div>
      ${groupList.length ? groupList.map(([date, list]) => {
        const d = parseDate(date);
        const exp = list.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const inc = list.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        return `<div class="fin-day">
          <div class="fin-day-head">
            <button type="button" data-act="open-day" data-date="${date}">${d.getMonth() + 1} 月 ${d.getDate()} 日 · ${WEEKDAYS[d.getDay()]}</button>
            <span class="totals">${exp ? `支出 ${money(exp)}` : ''}${exp && inc ? ' · ' : ''}${inc ? `收入 ${money(inc)}` : ''}</span>
          </div>
          ${list.map((t) => finRow(t, date)).join('')}
        </div>`;
      }).join('') : '<p class="empty-note">没有符合条件的记录</p>'}
    </section>
  </div>`;
}

/* ---------------- 存款计划 ---------------- */

function getPlan() {
  const src = app.db.settings.plan && typeof app.db.settings.plan === 'object' ? app.db.settings.plan : {};
  const categories = PLAN_CATEGORIES.map((def) => {
    const found = Array.isArray(src.categories) ? src.categories.find((c) => c && c.id === def.id) : null;
    const budget = found ? Number(found.budget) : def.budget;
    return { ...def, budget: isFinite(budget) && budget >= 0 ? budget : def.budget };
  });
  const income = Number(src.income);
  const savings = Number(src.savings);
  return {
    income: isFinite(income) && income >= 0 ? income : 6500,
    savings: isFinite(savings) && savings >= 0 ? savings : 2000,
    startMonth: /^\d{4}-\d{2}$/.test(src.startMonth || '') ? src.startMonth : todayStr().slice(0, 7),
    categories,
  };
}

function planSummary(prefix) {
  const plan = getPlan();
  const { items, expense, income } = collectFinance(prefix);
  const spent = {};
  plan.categories.forEach((c) => { spent[c.id] = 0; });
  items.forEach((t) => {
    if (t.type !== 'expense') return;
    const cat = plan.categories.find((c) => c.cats.includes(t.category)) || plan.categories[plan.categories.length - 1];
    spent[cat.id] = (spent[cat.id] || 0) + t.amount;
  });
  const budgetTotal = plan.categories.reduce((s, c) => s + c.budget, 0);
  const effectiveIncome = income > 0 ? income : plan.income;
  const saved = effectiveIncome - expense;
  return {
    plan,
    items,
    expense,
    income,
    effectiveIncome,
    spent,
    budgetTotal,
    saved,
    target: plan.savings,
    hasData: items.length > 0,
  };
}

function planCard(s) {
  const plan = s.plan;
  const used = s.hasData ? s.expense : 0;
  const remaining = s.budgetTotal - used;
  const over = used > s.budgetTotal;
  const pct = s.budgetTotal > 0 ? Math.min(100, (used / s.budgetTotal) * 100) : 0;
  const total = s.budgetTotal + s.target;
  const status = over
    ? `超出预算 ${money(-remaining)}，预计只能存 ${money(Math.max(0, s.target + remaining))}`
    : `预算内 · 按计划存 ${money(s.target)}`;
  return `<section class="card span2 plan-card">
    <div class="card-head">
      <span class="dot amber"></span><h2>存款计划</h2>
      <a class="card-link" href="#/settings">调整</a>
    </div>
    <div class="plan-hero">
      <div class="plan-hero-main">
        <span class="plan-label">${over ? '本月超支' : '本月还能花'}</span>
        <strong class="plan-amount ${over ? 'over' : ''}">${money(over ? -remaining : remaining)}</strong>
        <span class="plan-target">预算 ${money(s.budgetTotal)}</span>
      </div>
      <div class="plan-progress ${over ? 'over' : ''}"><i style="width:${pct.toFixed(1)}%"></i></div>
      <p class="plan-note">${s.hasData
        ? `已花 ${money(used)} / 预算 ${money(s.budgetTotal)}${s.income > 0 ? ` · 收入 ${money(s.income)}` : ''}`
        : '记下这个月的第一笔支出，开始跟踪预算。'}</p>
      <p class="plan-status ${over ? 'over' : ''}">${status}</p>
    </div>
    <div class="plan-cats">
      ${plan.categories.map((c) => {
        const sp = s.spent[c.id] || 0;
        const p = c.budget > 0 ? Math.min(100, (sp / c.budget) * 100) : 0;
        const catOver = sp > c.budget;
        return `<div class="plan-cat">
          <div class="plan-cat-top"><span>${esc(c.name)}</span><span class="${catOver ? 'over' : ''}">${money(sp)} / ${money(c.budget)}</span></div>
          <div class="plan-cat-bar ${catOver ? 'over' : ''}"><i style="width:${p.toFixed(1)}%"></i></div>
        </div>`;
      }).join('')}
    </div>
    <div class="plan-projection">
      <div><span>6 个月</span><strong>${money(plan.savings * 6)}</strong></div>
      <div><span>12 个月</span><strong>${money(plan.savings * 12)}</strong></div>
    </div>
    <p class="plan-hint">${Math.abs(total - plan.income) < 0.5
      ? `月收入 ${money(plan.income)} = 支出预算 ${money(s.budgetTotal)} + 储蓄 ${money(plan.savings)}`
      : `月收入 ${money(plan.income)} · 预算+储蓄 ${money(total)}（${total > plan.income ? '多' : '少'} ${money(Math.abs(total - plan.income))}）`}</p>
  </section>`;
}

function moneyAddForm() {
  const cats = app.finType === 'income' ? INCOME_CATS : EXPENSE_CATS;
  return `<form class="fin-add money-add" autocomplete="off">
    <div class="seg tiny" role="group" aria-label="收支类型">
      <button type="button" data-act="fin-type" data-v="expense" class="${app.finType === 'expense' ? 'is-on' : ''}">支出</button>
      <button type="button" data-act="fin-type" data-v="income" class="${app.finType === 'income' ? 'is-on' : ''}">收入</button>
    </div>
    <input id="fin-amount" type="number" inputmode="decimal" min="0" max="9999999" step="0.01" placeholder="金额" aria-label="金额">
    <select id="fin-cat" aria-label="分类">${cats.map((c) => `<option>${c}</option>`).join('')}</select>
    <input id="fin-note" type="text" maxlength="40" placeholder="备注（可选）" aria-label="备注">
    <button class="btn primary" type="submit">记一笔</button>
  </form>`;
}

function moneyGroups(items) {
  const filtered = app.finFilter === 'all' ? items : items.filter((t) => t.type === app.finFilter);
  const groups = {};
  filtered.forEach((t) => { (groups[t.date] = groups[t.date] || []).push(t); });
  const groupList = Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  if (!groupList.length) return '<p class="empty-note">还没有记录，先记一笔</p>';
  return groupList.map(([date, list]) => {
    const d = parseDate(date);
    const exp = list.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const inc = list.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    return `<div class="fin-day">
      <div class="fin-day-head">
        <button type="button" data-act="open-day" data-date="${date}">${d.getMonth() + 1} 月 ${d.getDate()} 日 · ${WEEKDAYS[d.getDay()]}</button>
        <span class="totals">${exp ? `支出 ${money(exp)}` : ''}${exp && inc ? ' · ' : ''}${inc ? `收入 ${money(inc)}` : ''}</span>
      </div>
      ${list.map((t) => finRow(t, date)).join('')}
    </div>`;
  }).join('');
}

function moneyView() {
  const prefix = app.month || todayStr().slice(0, 7);
  const [y, m] = prefix.split('-').map(Number);
  const s = planSummary(prefix);
  const balance = s.income - s.expense;

  return `${simpleHead(
    '账本',
    `${y} 年 ${m} 月`,
    `收入 <b>${money(s.income)}</b> · 支出 <b>${money(s.expense)}</b> · 结余 <b>${money(balance)}</b>`,
    `<button class="icon-btn" data-act="prev-month" aria-label="上个月">${icon('left')}</button>
     <button class="btn ghost" data-act="this-month">本月</button>
     <button class="icon-btn" data-act="next-month" aria-label="下个月">${icon('right')}</button>
     ${gearLink()}`
  )}
  <div class="grid">
    ${planCard(s)}
    <section class="card span2">
      <div class="card-head"><span class="dot"></span><h2>明细</h2>
        <div class="seg tiny" style="margin-left:auto">
          ${[['all', '全部'], ['expense', '支出'], ['income', '收入']].map(([v, l]) => `<button type="button" data-act="fin-filter" data-v="${v}" class="${app.finFilter === v ? 'is-on' : ''}">${l}</button>`).join('')}
        </div>
      </div>
      ${moneyAddForm()}
      ${moneyGroups(s.items)}
    </section>
  </div>`;
}

/* ---------------- 视图：趋势 ---------------- */

function legacyTrendView() {
  const days = [];
  for (let i = 29; i >= 0; i -= 1) days.push(addDays(todayStr(), -i));
  const present = recordedEntries();
  const streak = calcStreak();
  const monthPrefix = todayStr().slice(0, 7);
  const monthExercise = present.filter((e) => e.date.startsWith(monthPrefix)).reduce((s, e) => s + (e.exerciseMin || 0), 0);
  const sleeps = days.map((d) => {
    const e = app.db.entries[d];
    return e && typeof e.sleep === 'number' && e.sleep > 0 ? e.sleep : null;
  });
  const moods = days.map((d) => {
    const e = app.db.entries[d];
    return e && e.mood ? e.mood : null;
  });
  const energies = days.map((d) => {
    const e = app.db.entries[d];
    return e && e.energy ? e.energy : null;
  });
  const exercises = days.map((d) => {
    const e = app.db.entries[d];
    return e && e.exerciseMin ? e.exerciseMin : null;
  });
  const sleepVals = sleeps.filter((v) => v != null);
  const exVals = exercises.filter((v) => v != null);

  const tagCount = {};
  present.forEach((e) => (e.tags || []).forEach((t) => { tagCount[t] = (tagCount[t] || 0) + 1; }));
  const topTags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 12);

  return `${simpleHead(
    '趋势',
    '最近 30 天',
    present.length ? `累计记录 <b>${present.length}</b> 天 · 写下约 <b>${textStats()}</b> 字` : '记录几天之后，这里会长出你的曲线',
    ''
  )}
  <div class="stats">
    ${statBlock(streak, '天', '连续记录', streak ? 'accent' : '')}
    ${statBlock(present.length, '天', '累计记录')}
    ${statBlock(fmt1(avg(sleepVals)), '小时', '近 30 天平均睡眠')}
    ${statBlock(monthExercise, '分钟', '本月运动')}
  </div>
  <div class="grid" style="margin-top:14px">
    <section class="card span2">
      <div class="card-head"><span class="dot"></span><h2>心情与精力</h2>
        <div class="legend"><span><i style="background:#5E8C70"></i>心情</span><span><i style="background:#C08A4E"></i>精力</span></div>
      </div>
      <div class="chart">${present.length ? chartLine(days, [{ name: '心情', color: '#5E8C70', values: moods }, { name: '精力', color: '#C08A4E', values: energies }]) : '<p class="empty-note">开始记录心情和精力后，这里会出现趋势线</p>'}</div>
    </section>
    <section class="card span2">
      <div class="card-head"><span class="dot blue"></span><h2>睡眠</h2><span class="card-hint">虚线为 8 小时</span></div>
      <div class="chart">${sleepVals.length ? chartBars(days, sleeps, {
        max: 10, ref: 8, color: '#6C86A7',
        axisFmt: (v) => (v ? `${v}h` : '0'),
        title: (i, v) => `${days[i]} 睡眠 ${v} 小时`,
        label: '睡眠时长',
      }) : '<p class="empty-note">还没有睡眠记录</p>'}</div>
    </section>
    <section class="card span2">
      <div class="card-head"><span class="dot amber"></span><h2>运动</h2><span class="card-hint">最近 30 天，单位分钟</span></div>
      <div class="chart">${exVals.length ? chartBars(days, exercises, {
        max: niceMax(Math.max(...exVals), 30), color: '#5E8C70',
        axisFmt: (v) => String(v),
        title: (i, v) => `${days[i]} 运动 ${v} 分钟`,
        label: '运动时长',
      }) : '<p class="empty-note">还没有运动记录</p>'}</div>
    </section>
    <section class="card span2">
      <div class="card-head"><span class="dot"></span><h2>高频标签</h2><span class="card-hint">看看时间都花在哪些主题上</span></div>
      ${topTags.length ? `<div class="cat-list">${topTags.map(([name, n]) => `<div class="cat-row"><span class="cat-name">#${esc(name)}</span><span class="cat-track income"><i style="width:${((n / topTags[0][1]) * 100).toFixed(1)}%"></i></span><span class="cat-amt">${n} 天</span><span class="cat-pct"></span></div>`).join('')}</div>` : '<p class="empty-note">还没有标签记录</p>'}
    </section>
  </div>`;
}

/* ---------------- 视图：周回顾 ---------------- */

function legacyReviewView() {
  const monday = mondayOf(todayStr(), app.weekOffset);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  app.reviewKey = monday;
  const entries = days.map((d) => app.db.entries[d]).filter((e) => e && hasContent(e));
  const moods = entries.map((e) => e.mood).filter(Boolean);
  const energies = entries.map((e) => e.energy).filter(Boolean);
  const sleeps = entries.map((e) => e.sleep).filter((v) => typeof v === 'number');
  const exercise = entries.reduce((s, e) => s + (e.exerciseMin || 0), 0);
  const mitsDone = entries.reduce((s, e) => s + e.mit.filter((m) => m.done && m.text.trim()).length, 0);
  const mitsAll = entries.reduce((s, e) => s + e.mit.filter((m) => m.text.trim()).length, 0);
  const fin = entries.reduce((acc, e) => {
    (e.finance.items || []).forEach((t) => { if (t.type === 'income') acc.income += t.amount; else acc.expense += t.amount; });
    return acc;
  }, { expense: 0, income: 0 });
  const review = (app.db.reviews[monday] && app.db.reviews[monday].text) || '';
  const tagCount = {};
  entries.forEach((e) => (e.tags || []).forEach((t) => { tagCount[t] = (tagCount[t] || 0) + 1; }));
  const topTags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const fmtD = (s) => { const d = parseDate(s); return `${d.getMonth() + 1}月${d.getDate()}日`; };

  return `${simpleHead(
    '周回顾',
    `${fmtD(monday)} — ${fmtD(days[6])}`,
    `记录 <b>${entries.length}</b> / 7 天 · 第 <b>${weekNumber(monday)}</b> 周`,
    `<button class="icon-btn" data-act="prev-week" aria-label="上一周">${icon('left')}</button>
     <button class="btn ghost" data-act="this-week" ${app.weekOffset === 0 ? 'disabled' : ''}>本周</button>
     <button class="icon-btn" data-act="next-week" aria-label="下一周" ${app.weekOffset >= 0 ? 'disabled' : ''}>${icon('right')}</button>`
  )}
  <div class="stats four">
    ${statBlock(`${mitsDone}/${mitsAll || 0}`, '件', '要事完成')}
    ${statBlock(fmt1(avg(moods)), '/ 5', '平均心情')}
    ${statBlock(fmt1(avg(energies)), '/ 5', '平均精力')}
    ${statBlock(fmt1(avg(sleeps)), '小时', '平均睡眠')}
    ${statBlock(exercise, '分钟', '运动')}
    ${statBlock(money(fin.expense), '', '支出', 'rose')}
    ${statBlock(money(fin.income), '', '收入', 'accent')}
    ${statBlock(money(fin.income - fin.expense), '', '结余')}
  </div>
  <div class="grid" style="margin-top:14px">
    <section class="card span2">
      <div class="card-head"><span class="dot"></span><h2>这周每天的一句话</h2></div>
      <div class="week-list">
        ${days.map((d, i) => {
          const e = app.db.entries[d];
          const txt = e && hasContent(e) ? (e.headline || firstText(e) || '（仅状态记录）') : '';
          const bits = e && hasContent(e)
            ? [
              e.mood ? `${e.mood}/5` : '',
              e.finance && e.finance.items.length ? money(e.finance.items.reduce((s, t) => s + (t.type === 'expense' ? t.amount : 0), 0)) : '',
            ].filter(Boolean)
            : [];
          return `<div class="week-row">
            <span class="wd">周${WEEK_CN[i]}</span>
            <span class="txt ${txt ? '' : 'dim'}">${esc(txt || '—')}</span>
            ${bits.length ? `<span class="pill">${bits.join(' · ')}</span>` : ''}
          </div>`;
        }).join('')}
      </div>
    </section>
    <section class="card span2">
      <div class="card-head"><span class="dot rose"></span><h2>写几句回顾</h2><span class="card-hint">${app.weekOffset === 0 ? '周日晚上花 10 分钟' : ''}</span></div>
      ${topTags.length ? `<div class="chips" style="margin-bottom:12px">${topTags.map(([t, n]) => `<span class="tag">#${esc(t)} · ${n}</span>`).join('')}</div>` : ''}
      <textarea class="journal" data-bind="review" placeholder="这一周什么做得好？什么卡住了？如果只改一件事，下周改什么？">${esc(review)}</textarea>
    </section>
  </div>`;
}

function weekNumber(s) {
  const d = parseDate(s);
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - start) / 86400000 + start.getDay() + 1) / 7);
}

/* ---------------- 视图：回顾 ---------------- */

function calendarCard(prefix) {
  const [y, m] = prefix.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const lead = (first.getDay() + 6) % 7;
  const total = new Date(y, m, 0).getDate();
  const cells = [];
  for (let i = 0; i < lead; i += 1) cells.push(null);
  for (let d = 1; d <= total; d += 1) cells.push({ d, ds: `${y}-${pad(m)}-${pad(d)}` });
  while (cells.length % 7 !== 0) cells.push(null);

  const monthEntries = recordedEntries().filter((e) => e.date.startsWith(prefix));
  const cellHtml = cells.map((c) => {
    if (!c) return '<div class="cal-cell is-empty" aria-hidden="true"></div>';
    const e = app.db.entries[c.ds];
    const has = e && hasContent(e);
    const mood = has ? e.mood : 0;
    const hl = has ? (e.headline || firstText(e)) : '';
    const cls = [has ? 'has' : '', c.ds === app.date ? 'is-selected' : '', c.ds === todayStr() ? 'is-today' : ''].filter(Boolean).join(' ');
    return `<button type="button" class="cal-cell ${cls}" data-act="open-day" data-date="${c.ds}" data-mood="${mood}" aria-label="${c.ds}${has ? ' 有记录' : ''}">
      <span class="cal-num">${c.d}</span>
      <span class="cal-hl">${esc(hl)}</span>
      <span class="cal-mood"></span>
    </button>`;
  }).join('');

  return `<section class="card span2">
    <div class="card-head">
      <h2>${y} 年 ${m} 月</h2>
      <span class="card-hint">记录 ${monthEntries.length} 天</span>
      <div class="month-nav">
        <button class="icon-btn" data-act="prev-month" aria-label="上个月">${icon('left')}</button>
        <button class="btn ghost" data-act="this-month">本月</button>
        <button class="icon-btn" data-act="next-month" aria-label="下个月">${icon('right')}</button>
      </div>
    </div>
    <div class="cal-dows">${WEEK_CN.map((d) => `<div class="cal-dow">${d}</div>`).join('')}</div>
    <div class="cal">${cellHtml}</div>
  </section>`;
}

function weekCard() {
  const monday = mondayOf(todayStr(), app.weekOffset);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  app.reviewKey = monday;
  const entries = days.map((d) => app.db.entries[d]).filter((e) => e && hasContent(e));
  const moods = entries.map((e) => e.mood).filter(Boolean);
  const sleeps = entries.map((e) => e.sleep).filter((v) => typeof v === 'number');
  const exercise = entries.reduce((s, e) => s + (e.exerciseMin || 0), 0);
  const fin = entries.reduce((acc, e) => {
    (e.finance.items || []).forEach((t) => { if (t.type === 'income') acc.income += t.amount; else acc.expense += t.amount; });
    return acc;
  }, { expense: 0, income: 0 });
  const review = (app.db.reviews[monday] && app.db.reviews[monday].text) || '';
  const fmtD = (s) => { const d = parseDate(s); return `${d.getMonth() + 1}月${d.getDate()}日`; };

  return `<section class="card span2">
    <div class="card-head">
      <h2>${fmtD(monday)} — ${fmtD(days[6])}</h2>
      <div class="month-nav">
        <button class="icon-btn" data-act="prev-week" aria-label="上一周">${icon('left')}</button>
        <button class="btn ghost" data-act="this-week" ${app.weekOffset === 0 ? 'disabled' : ''}>本周</button>
        <button class="icon-btn" data-act="next-week" aria-label="下一周" ${app.weekOffset >= 0 ? 'disabled' : ''}>${icon('right')}</button>
      </div>
    </div>
    <div class="stats four" style="margin-top:0">
      ${statBlock(`${entries.length}/7`, '天', '记录')}
      ${statBlock(fmt1(avg(moods)), '/5', '平均心情')}
      ${statBlock(fmt1(avg(sleeps)), '小时', '平均睡眠')}
      ${statBlock(exercise, '分钟', '运动')}
    </div>
    <p class="week-money">本周支出 ${money(fin.expense)} · 结余 ${money(fin.income - fin.expense)}</p>
    <textarea class="journal" data-bind="review" placeholder="这一周什么做得好？什么卡住了？如果只改一件事，下周改什么？">${esc(review)}</textarea>
  </section>`;
}

function trendSection() {
  const days = [];
  for (let i = 29; i >= 0; i -= 1) days.push(addDays(todayStr(), -i));
  const present = recordedEntries();
  const moods = days.map((d) => { const e = app.db.entries[d]; return e && e.mood ? e.mood : null; });
  const energies = days.map((d) => { const e = app.db.entries[d]; return e && e.energy ? e.energy : null; });
  const sleeps = days.map((d) => { const e = app.db.entries[d]; return e && typeof e.sleep === 'number' && e.sleep > 0 ? e.sleep : null; });
  const exercises = days.map((d) => { const e = app.db.entries[d]; return e && e.exerciseMin ? e.exerciseMin : null; });
  const sleepVals = sleeps.filter((v) => v != null);
  const exVals = exercises.filter((v) => v != null);

  return `<section class="card span2">
    <details class="trend-details">
      <summary>
        <span class="more-title">查看趋势</span>
        <span class="more-hint">最近 30 天 · 心情 / 睡眠 / 运动</span>
      </summary>
      <div class="trend-body">
        <div class="chart-block">
          <div class="chart-head"><span>心情与精力</span><div class="legend"><span><i style="background:#5E8C70"></i>心情</span><span><i style="background:#C08A4E"></i>精力</span></div></div>
          <div class="chart">${present.length ? chartLine(days, [{ name: '心情', color: '#5E8C70', values: moods }, { name: '精力', color: '#C08A4E', values: energies }]) : '<p class="empty-note">还没有记录</p>'}</div>
        </div>
        <div class="chart-block">
          <div class="chart-head"><span>睡眠</span><span class="chart-note">虚线为 8 小时</span></div>
          <div class="chart">${sleepVals.length ? chartBars(days, sleeps, { max: 10, ref: 8, color: '#6C86A7', axisFmt: (v) => (v ? `${v}h` : '0'), title: (i, v) => `${days[i]} 睡眠 ${v} 小时`, label: '睡眠' }) : '<p class="empty-note">还没有睡眠记录</p>'}</div>
        </div>
        <div class="chart-block">
          <div class="chart-head"><span>运动</span><span class="chart-note">分钟</span></div>
          <div class="chart">${exVals.length ? chartBars(days, exercises, { max: niceMax(Math.max(...exVals), 30), color: '#5E8C70', axisFmt: (v) => String(v), title: (i, v) => `${days[i]} 运动 ${v} 分钟`, label: '运动' }) : '<p class="empty-note">还没有运动记录</p>'}</div>
        </div>
      </div>
    </details>
  </section>`;
}

function reviewView() {
  const prefix = app.month || todayStr().slice(0, 7);
  const [y, m] = prefix.split('-').map(Number);
  const monthCount = recordedEntries().filter((e) => e.date.startsWith(prefix)).length;
  return `${simpleHead(
    '回顾',
    `${y} 年 ${m} 月`,
    `记录 <b>${monthCount}</b> 天 · 连续 <b>${calcStreak()}</b> 天`,
    gearLink()
  )}
  <div class="grid">
    ${calendarCard(prefix)}
    ${weekCard()}
    ${trendSection()}
  </div>`;
}

/* ---------------- 视图：设置 ---------------- */

function legacySettingsView() {
  const theme = app.db.settings.theme || 'auto';
  const budget = Number(app.db.settings.budget) || 0;
  const habits = app.db.habits || [];
  return `${simpleHead('偏好与数据', '设置', `日迹 v${APP_VERSION} · 数据只保存在这台手机`, '')}
  <div class="grid">
    <section class="card span2">
      <div class="card-head"><span class="dot"></span><h2>习惯</h2><span class="card-hint">每天可以勾选的项目，删掉后历史记录仍保留</span></div>
      <div class="chips">${habits.length ? habits.map((h) => `<span class="chip is-on">${esc(h)}<button type="button" class="chip-x" data-act="habit-del" data-name="${esc(h)}" aria-label="删除习惯 ${esc(h)}">${icon('x')}</button></span>`).join('') : '<span class="muted-note">还没有习惯</span>'}</div>
      <div class="add-row">
        <input id="habit-input" type="text" maxlength="30" placeholder="例如：运动 30 分钟、阅读 20 页、23 点前睡">
        <button class="btn" data-act="habit-add">${icon('plus')}添加</button>
      </div>
    </section>
    <section class="card span2">
      <div class="card-head"><span class="dot"></span><h2>外观与预算</h2></div>
      <div class="setting-row">
        <div class="txt"><h3>主题</h3><p>跟随系统会自动切换浅色 / 深色</p></div>
        <div class="seg">
          ${[['auto', '跟随系统'], ['light', '浅色'], ['dark', '深色']].map(([v, l]) => `<button type="button" data-act="theme" data-v="${v}" class="${theme === v ? 'is-on' : ''}">${l}</button>`).join('')}
        </div>
      </div>
      <div class="setting-row">
        <div class="txt"><h3>月度预算</h3><p>用于账本里的进度提醒，填 0 表示不设置</p></div>
        <label class="mini"><span>¥</span><input id="budget-input" type="number" inputmode="numeric" min="0" step="100" value="${budget || ''}" placeholder="0" aria-label="月度预算"></label>
      </div>
    </section>
    ${!isStandalone() && window.matchMedia('(max-width: 900px)').matches ? `<section class="card span2">
      <div class="card-head"><span class="dot"></span><h2>安装到手机</h2></div>
      <p class="muted-note">用 Chrome 打开后点下面的按钮；没有反应就点浏览器右上角菜单 →「安装应用」或「添加到主屏幕」。</p>
      <div class="btn-row"><button class="btn primary" data-act="install">${icon('plus')}安装到主屏幕</button></div>
    </section>` : ''}
    <section class="card span2">
      <div class="card-head"><span class="dot"></span><h2>数据与备份</h2></div>
      <p class="muted-note">记录保存在这台手机的浏览器里（IndexedDB），不会上传到任何服务器。</p>
      <p class="path" data-role="storage-info">正在读取存储信息…</p>
      <p class="path">上次备份：${esc(lastBackupLabel())}</p>
      <div class="btn-row">
        <button class="btn primary" data-act="export-json">${icon('download')}导出备份</button>
        <button class="btn" data-act="export-encrypted">加密备份</button>
        <button class="btn" data-act="import-json">${icon('upload')}导入备份</button>
        <button class="btn" data-act="export-md">${icon('download')}导出 Markdown</button>
        <button class="btn" data-act="persist">申请持久存储</button>
      </div>
      <div class="btn-row" style="margin-top:16px">
        <button class="btn danger" data-act="clear-all">${icon('trash')}清空全部记录</button>
      </div>
      <p class="muted-note" style="margin-top:12px">清理浏览器的「网站数据」会删除记录；换手机前先导出备份。</p>
    </section>
    <section class="card span2">
      <div class="card-head"><span class="dot"></span><h2>关于</h2></div>
      <p class="muted-note about-text">
        日迹是一个「手机本地优先」的记录工具：数据存在这台设备的 IndexedDB 里，不上传、不联网、不需要账号。每天自动保存在本机，导出备份可以把 JSON 存到网盘或发给另一台设备。<br>
        清理浏览器数据会丢失记录，请定期备份；加密备份的密码丢了无法恢复。
      </p>
    </section>
  </div>`;
}

function settingsView() {
  const theme = app.db.settings.theme || 'auto';
  const plan = getPlan();
  return `${simpleHead('设置', '设置', `日迹 v${APP_VERSION} · 数据只保存在这台手机`, `<a class="btn ghost" href="#/today">返回</a>`)}
  <div class="grid">
    <section class="card span2">
      <div class="card-head"><span class="dot amber"></span><h2>存款计划</h2><span class="card-hint">按你的预算改，改完自动保存</span></div>
      <div class="plan-form">
        <label class="field"><span class="label">月收入</span><input type="number" inputmode="numeric" min="0" step="100" data-plan="income" value="${plan.income}" aria-label="月收入"></label>
        <label class="field"><span class="label">每月储蓄</span><input type="number" inputmode="numeric" min="0" step="100" data-plan="savings" value="${plan.savings}" aria-label="每月储蓄"></label>
      </div>
      <div class="plan-form">
        ${plan.categories.map((c) => `<label class="field"><span class="label">${esc(c.name)}</span><input type="number" inputmode="numeric" min="0" step="50" data-plan="cat:${c.id}" value="${c.budget}" aria-label="${esc(c.name)}预算"></label>`).join('')}
      </div>
      <div class="plan-form">
        <label class="field"><span class="label">开始月份</span><input type="month" data-plan="startMonth" value="${esc(plan.startMonth)}" aria-label="开始月份"></label>
      </div>
      <p class="plan-total" data-role="plan-total"></p>
    </section>
    <section class="card span2">
      <div class="card-head"><span class="dot"></span><h2>数据与备份</h2></div>
      <p class="muted-note">记录保存在这台手机的浏览器里（IndexedDB），不会上传到任何服务器。</p>
      <p class="path" data-role="storage-info">正在读取存储信息…</p>
      <p class="path">上次备份：${esc(lastBackupLabel())}</p>
      <div class="btn-row">
        <button class="btn primary" data-act="export-json">${icon('download')}导出备份</button>
        <button class="btn" data-act="export-encrypted">加密备份</button>
        <button class="btn" data-act="import-json">${icon('upload')}导入备份</button>
        <button class="btn" data-act="export-md">${icon('download')}导出 Markdown</button>
        <button class="btn" data-act="persist">申请持久存储</button>
      </div>
      <div class="btn-row" style="margin-top:16px">
        <button class="btn danger" data-act="clear-all">${icon('trash')}清空全部记录</button>
      </div>
      <p class="muted-note" style="margin-top:12px">清理浏览器的「网站数据」会删除记录；换手机前先导出备份。</p>
    </section>
    <section class="card span2">
      <div class="card-head"><span class="dot"></span><h2>外观</h2></div>
      <div class="seg">
        ${[['auto', '跟随系统'], ['light', '浅色'], ['dark', '深色']].map(([v, l]) => `<button type="button" data-act="theme" data-v="${v}" class="${theme === v ? 'is-on' : ''}">${l}</button>`).join('')}
      </div>
    </section>
    ${!isStandalone() && window.matchMedia('(max-width: 900px)').matches ? `<section class="card span2">
      <div class="card-head"><span class="dot"></span><h2>安装到手机</h2></div>
      <p class="muted-note">用 Chrome 打开后点下面的按钮；没有反应就点浏览器菜单 →「安装应用」。</p>
      <div class="btn-row"><button class="btn primary" data-act="install">${icon('plus')}安装到主屏幕</button></div>
    </section>` : ''}
    <section class="card span2">
      <div class="card-head"><span class="dot"></span><h2>关于</h2></div>
      <p class="muted-note about-text">
        日迹是一个「手机本地优先」的记录工具：数据存在这台设备的 IndexedDB 里，不上传、不联网、不需要账号。<br>
        清理浏览器数据会丢失记录，请定期备份；加密备份的密码丢了无法恢复。
      </p>
    </section>
  </div>`;
}

function updatePlanTotal() {
  const el = $('[data-role="plan-total"]');
  if (!el) return;
  const plan = getPlan();
  const budgets = plan.categories.reduce((s, c) => s + c.budget, 0);
  const total = budgets + plan.savings;
  const diff = total - plan.income;
  el.textContent = `支出预算 ${money(budgets)} + 储蓄 ${money(plan.savings)} = ${money(total)}${Math.abs(diff) < 0.5 ? ' · 与月收入一致' : `，比月收入${diff > 0 ? '多' : '少'} ${money(Math.abs(diff))}`}`;
}

/* ---------------- 渲染 ---------------- */

const VIEWS = {
  today: todayView,
  money: moneyView,
  review: reviewView,
  settings: settingsView,
};

function renderNav() {
  $('#nav').innerHTML = NAV.map(([id, label, ic]) => `<a class="nav-item ${app.view === id ? 'is-active' : ''}" href="#/${id}" ${app.view === id ? 'aria-current="page"' : ''}>${icon(ic)}<span>${label}</span></a>`).join('');
}

function render() {
  const main = $('#main');
  if (!main || !app.db) return;
  renderNav();
  main.innerHTML = VIEWS[app.view]();
  document.title = `${TITLES[app.view]} · 日迹`;
  main.classList.remove('fade-in');
  void main.offsetWidth;
  main.classList.add('fade-in');
  $$('textarea', main).forEach(autoGrow);
  setStatus(app.status);
  if (app.view === 'settings') {
    refreshStorage();
    updatePlanTotal();
  }
}

function autoGrow(el) {
  el.style.height = 'auto';
  el.style.height = `${Math.max(el.scrollHeight, 38)}px`;
}

/* ---------------- 主题 ---------------- */

function applyTheme() {
  const t = (app.db && app.db.settings.theme) || 'auto';
  const dark = t === 'dark' || (t === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

/* ---------------- 交互 ---------------- */

let searchTimer = null;

function onInput(ev) {
  const t = ev.target;
  if (!t || !t.dataset) return;

  if (t.dataset.plan) {
    const plan = getPlan();
    const key = t.dataset.plan;
    if (key === 'startMonth') {
      if (/^\d{4}-\d{2}$/.test(t.value)) plan.startMonth = t.value;
    } else {
      const v = parseFloat(t.value);
      const n = isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : 0;
      if (key === 'income') plan.income = n;
      else if (key === 'savings') plan.savings = n;
      else if (key.startsWith('cat:')) {
        const cat = plan.categories.find((c) => c.id === key.slice(4));
        if (cat) cat.budget = n;
      }
    }
    app.db.settings.plan = plan;
    scheduleSave();
    updatePlanTotal();
    return;
  }

  if (t.id === 'search') {
    app.search = t.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(renderEntryList, 120);
    return;
  }
  if (t.id === 'budget-input') {
    const v = parseFloat(t.value);
    app.db.settings.budget = isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : 0;
    scheduleSave();
    return;
  }
  if (t.id === 'tag-input' || t.id === 'habit-input') return;

  const bind = t.dataset.bind;
  if (!bind) return;

  let entry = null;
  if (bind === 'mit') {
    entry = ensureEntry(app.date);
    const i = Number(t.dataset.index);
    if (t.dataset.prop === 'done') {
      entry.mit[i].done = t.checked;
      const row = t.closest('.mit');
      if (row) {
        row.classList.toggle('is-done', t.checked);
        const text = row.querySelector('input[type="text"]');
        if (text) text.classList.toggle('done', t.checked);
      }
      updateMitCount();
    } else {
      entry.mit[i].text = t.value;
    }
  } else if (bind === 'review') {
    if (!app.reviewKey) return;
    app.db.reviews[app.reviewKey] = { text: t.value, updatedAt: Date.now() };
  } else {
    entry = ensureEntry(app.date);
    let v = t.value;
    if (t.dataset.kind === 'num') {
      const n = parseFloat(v);
      v = isFinite(n) ? n : null;
      if (v != null && bind === 'sleep') v = clampNum(v, 0, 24);
      if (v != null && bind === 'weight') v = clampNum(v, 0, 500);
      if (v != null && bind === 'exerciseMin') v = clampNum(v, 0, 1440);
    }
    entry[bind] = v;
  }

  if (entry) touch(entry);
  scheduleSave();
  if (t.tagName === 'TEXTAREA') autoGrow(t);
}

function updateMitCount() {
  const e = getEntry(app.date);
  const done = e.mit.filter((m) => m.done && m.text.trim()).length;
  const el = $('[data-role="mit-count"]');
  if (el) el.textContent = `${done} / 3`;
}

function syncMood() {
  const e = getEntry(app.date);
  $$('.mood').forEach((b) => {
    const on = Number(b.dataset.v) === e.mood;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  });
}

function syncEnergy() {
  const e = getEntry(app.date);
  $$('.energy').forEach((b) => {
    b.classList.toggle('on', Number(b.dataset.v) <= e.energy);
  });
}

function refreshHabits() {
  const box = $('[data-role="habits"]');
  if (box) box.innerHTML = habitChips(getEntry(app.date));
}

function refreshTags(focus) {
  const box = $('[data-role="tags"]');
  if (!box) return;
  const e = getEntry(app.date);
  box.innerHTML = `${tagChips(e)}<input id="tag-input" list="tag-suggest" placeholder="输入后回车" maxlength="20" aria-label="添加标签">`;
  if (focus) {
    const inp = $('#tag-input');
    if (inp) inp.focus();
  }
}

function addTag(raw) {
  const name = String(raw || '').replace(/^#+/, '').replace(/[,,，\s]+/g, '').slice(0, 12);
  if (!name) return;
  const e = ensureEntry(app.date);
  if (!e.tags.includes(name)) {
    e.tags.push(name);
    touch(e);
    scheduleSave();
    refreshTags(true);
    toast(`已添加标签 #${name}`);
  }
}

function go(date) {
  const target = `#/day/${date}`;
  if (location.hash === target) render();
  else location.hash = target;
}

function goToday() {
  if (location.hash === '#/today') render();
  else location.hash = '#/today';
}

async function onClick(ev) {
  const el = ev.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;

  switch (act) {
    case 'prev-day':
      go(addDays(app.date, -1));
      break;
    case 'next-day':
      if (app.date < todayStr()) go(addDays(app.date, 1));
      break;
    case 'today':
      goToday();
      break;
    case 'open-day':
      go(el.dataset.date);
      break;
    case 'mood': {
      const e = ensureEntry(app.date);
      const v = Number(el.dataset.v);
      e.mood = e.mood === v ? 0 : v;
      touch(e);
      syncMood();
      scheduleSave();
      break;
    }
    case 'energy': {
      const e = ensureEntry(app.date);
      const v = Number(el.dataset.v);
      e.energy = e.energy === v ? 0 : v;
      touch(e);
      syncEnergy();
      scheduleSave();
      break;
    }
    case 'habit': {
      const e = ensureEntry(app.date);
      const name = el.dataset.name;
      e.habits = e.habits.includes(name) ? e.habits.filter((h) => h !== name) : [...e.habits, name];
      touch(e);
      refreshHabits();
      scheduleSave();
      break;
    }
    case 'tag-remove': {
      const e = ensureEntry(app.date);
      e.tags = e.tags.filter((t) => t !== el.dataset.name);
      touch(e);
      refreshTags(true);
      scheduleSave();
      break;
    }
    case 'fin-type':
      app.finType = el.dataset.v;
      refreshFinance();
      break;
    case 'fin-del':
      deleteTransaction(el.dataset.date, el.dataset.id);
      break;
    case 'fin-filter':
      app.finFilter = el.dataset.v;
      render();
      break;
    case 'prev-month':
      app.month = addMonths(app.month || app.date.slice(0, 7), -1);
      render();
      break;
    case 'next-month':
      app.month = addMonths(app.month || app.date.slice(0, 7), 1);
      render();
      break;
    case 'this-month':
      app.month = todayStr().slice(0, 7);
      render();
      break;
    case 'prev-week':
      app.weekOffset -= 1;
      render();
      break;
    case 'next-week':
      if (app.weekOffset < 0) app.weekOffset += 1;
      render();
      break;
    case 'this-week':
      app.weekOffset = 0;
      render();
      break;
    case 'theme':
      app.db.settings.theme = el.dataset.v;
      applyTheme();
      scheduleSave();
      render();
      break;
    case 'habit-add': {
      const inp = $('#habit-input');
      const name = inp ? inp.value.trim() : '';
      if (!name) { if (inp) inp.focus(); break; }
      if (!app.db.habits.includes(name)) app.db.habits.push(name);
      scheduleSave();
      render();
      break;
    }
    case 'habit-del':
      app.db.habits = app.db.habits.filter((h) => h !== el.dataset.name);
      scheduleSave();
      render();
      break;
    case 'dismiss-welcome':
      app.db.settings.welcomed = true;
      scheduleSave();
      el.closest('.welcome').remove();
      break;
    case 'save-retry':
      if (app.status === 'error') flush();
      break;
    case 'export-json':
      exportJson();
      break;
    case 'export-encrypted':
      exportEncrypted();
      break;
    case 'import-json':
      $('#import-file').click();
      break;
    case 'export-md':
      exportMarkdown();
      break;
    case 'install':
      await installApp();
      break;
    case 'persist':
      await enablePersist();
      break;
    case 'toggle-detail':
      toggleDetail();
      break;
    case 'clear-all':
      clearAll();
      break;
    default:
      break;
  }
}

function onKeydown(ev) {
  const t = ev.target;
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') {
    ev.preventDefault();
    flush();
    return;
  }
  if (t && t.id === 'tag-input' && (ev.key === 'Enter' || ev.key === ',' || ev.key === '，')) {
    ev.preventDefault();
    addTag(t.value);
    t.value = '';
    return;
  }
  if (t && t.id === 'fin-note' && ev.key === 'Enter') {
    ev.preventDefault();
    addTransaction();
    return;
  }
  if (t && t.id === 'habit-input' && ev.key === 'Enter') {
    ev.preventDefault();
    const name = t.value.trim();
    if (!name) return;
    if (!app.db.habits.includes(name)) app.db.habits.push(name);
    scheduleSave();
    render();
  }
}

/* ---------------- 数据操作 ---------------- */

async function exportJson() {
  const json = JSON.stringify(app.db, null, 2);
  const file = new File([json], `日迹备份-${todayStr()}.json`, { type: 'application/json' });
  const done = await shareOrDownload(file);
  if (done) {
    markBackup();
    toast('备份已导出，建议放到网盘或微信收藏');
  }
}

async function shareOrDownload(file) {
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name });
      return true;
    } catch (err) {
      if (err && err.name === 'AbortError') return false;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
  return true;
}

function markBackup() {
  app.db.settings.lastBackupAt = new Date().toISOString();
  scheduleSave();
  if (app.view === 'today' || app.view === 'settings') render();
}

function lastBackupLabel() {
  const v = app.db.settings.lastBackupAt;
  if (!v) return '还没有备份';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '还没有备份';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${timeHM(d)}`;
}

async function exportEncrypted() {
  const pwd = prompt('设置备份密码（至少 6 位，忘记无法恢复）');
  if (!pwd) return;
  if (pwd.length < 6) { toast('密码至少 6 位'); return; }
  const pwd2 = prompt('再输入一次密码');
  if (pwd !== pwd2) { toast('两次密码不一致'); return; }
  try {
    await flush();
    const payload = await encryptState(app.db, pwd);
    const file = new File([payload], `日迹加密备份-${todayStr()}.daylog`, { type: 'application/json' });
    const done = await shareOrDownload(file);
    if (done) {
      markBackup();
      toast('加密备份已导出，密码请自己记牢');
    }
  } catch (err) {
    console.error(err);
    alert(`加密失败：${err.message}`);
  }
}

async function encryptState(obj, password) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  );
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj)));
  return JSON.stringify({
    kind: 'daylog-encrypted',
    version: 1,
    salt: toB64(salt),
    iv: toB64(iv),
    data: toB64(new Uint8Array(cipher)),
  });
}

async function decryptState(payload, password) {
  const salt = fromB64(payload.salt);
  const iv = fromB64(payload.iv);
  const data = fromB64(payload.data);
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return JSON.parse(new TextDecoder().decode(plain));
}

function toB64(bytes) {
  let str = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    str += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(str);
}

function fromB64(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

async function exportMarkdown() {
  await flush();
  const dates = Object.keys(app.db.entries).sort();
  if (!dates.length) { toast('还没有记录'); return; }
  const head = `# 日迹 · 全部记录\n\n导出时间：${new Date().toLocaleString('zh-CN')}\n`;
  const body = dates.map((d) => entryToMarkdown(app.db.entries[d])).join('\n\n');
  const file = new File([`${head}\n---\n\n${body}`], `日迹-全部记录-${todayStr()}.md`, { type: 'text/markdown' });
  await shareOrDownload(file);
  toast('Markdown 已导出');
}

function entryToMarkdown(e) {
  const d = new Date(`${e.date}T00:00:00`);
  const out = [`# ${e.date} ${WEEKDAYS[d.getDay()]}`];
  if (e.headline) out.push('', `> ${e.headline}`);

  const state = [];
  if (e.mood) state.push(`心情 ${e.mood}/5`);
  if (e.energy) state.push(`精力 ${e.energy}/5`);
  if (e.sleep != null && e.sleep > 0) state.push(`睡眠 ${e.sleep} 小时${e.bed ? `（${e.bed} 入睡）` : ''}`);
  if (e.weight != null && e.weight > 0) state.push(`体重 ${e.weight} kg`);
  const ex = [e.exerciseType, e.exerciseMin ? `${e.exerciseMin} 分钟` : ''].filter(Boolean).join(' ');
  if (ex) state.push(`运动 ${ex}`);
  if (state.length) out.push('', '## 状态', '', state.map((s) => `- ${s}`).join('\n'));
  if (e.body) out.push('', `身体感受：${e.body}`);

  const mits = (e.mit || []).filter((m) => m.text && m.text.trim());
  if (mits.length) out.push('', '## 今日三件事', '', mits.map((m) => `- [${m.done ? 'x' : ' '}] ${m.text}`).join('\n'));

  if (e.work) out.push('', '## 工作', '', e.work);
  if (e.study || e.learn) {
    out.push('', '## 学习', '');
    if (e.study) out.push(e.study);
    if (e.learn) out.push('', `**收获**：${e.learn}`);
  }
  if (e.growth || e.milestone) {
    out.push('', '## 成长', '');
    if (e.growth) out.push(e.growth);
    if (e.milestone) out.push('', `**里程碑**：${e.milestone}`);
  }

  const fin = (e.finance && e.finance.items) || [];
  if (fin.length) {
    out.push('', '## 收支', '');
    for (const t of fin) {
      out.push(`- ${t.type === 'income' ? '收入' : '支出'} ${money(t.amount)} · ${t.category}${t.note ? ` · ${t.note}` : ''}`);
    }
    const exp = fin.filter((t) => t.type !== 'income').reduce((s, t) => s + t.amount, 0);
    const inc = fin.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    out.push('', `合计：支出 ${money(exp)} / 收入 ${money(inc)}`);
  }

  if (e.insight || e.highlight || e.grateful || e.improve) {
    out.push('', '## 感悟');
    if (e.insight) out.push('', e.insight);
    const bits = [
      ['今日高光', e.highlight],
      ['感恩', e.grateful],
      ['明日改进', e.improve],
    ].filter(([, v]) => v);
    if (bits.length) out.push('', bits.map(([k, v]) => `- **${k}**：${v}`).join('\n'));
  }

  if ((e.habits || []).length) out.push('', `习惯：${e.habits.map((h) => `☑ ${h}`).join(' · ')}`);
  if ((e.tags || []).length) out.push('', `标签：${e.tags.map((t) => `#${t}`).join(' ')}`);

  return `${out.join('\n').replace(/\n{3,}/g, '\n\n')}\n`;
}

async function importFile(file) {
  try {
    const text = await file.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('不是有效的 JSON 文件');
    }
    if (data && data.kind === 'daylog-encrypted') {
      const pwd = prompt('这个备份已加密，请输入备份密码');
      if (!pwd) return;
      data = await decryptState(data, pwd);
    }
    if (!data || typeof data !== 'object' || !data.entries) throw new Error('不是日迹的备份文件');
    if (!confirm('导入会覆盖当前全部记录，确定继续？')) return;
    app.db = normalizeDb(data);
    app.db.settings.welcomed = true;
    await flush();
    applyTheme();
    render();
    toast('导入完成');
  } catch (err) {
    alert(`导入失败：${err.message}`);
  }
}

async function refreshStorage() {
  const el = $('[data-role="storage-info"]');
  if (!el) return;
  const info = await storageInfo();
  const parts = [`已用 ${fmtBytes(info.usage)}`];
  if (info.quota) parts.push(`可用 ${fmtBytes(info.quota)}`);
  parts.push(`持久存储${info.persisted ? '已开启' : '未开启'}`);
  el.textContent = parts.join(' · ');
  const btn = $('[data-act="persist"]');
  if (btn) btn.style.display = info.persisted ? 'none' : '';
}

async function enablePersist() {
  const ok = await requestPersist();
  toast(ok ? '已开启持久存储，仍建议定期备份' : '浏览器暂未授予，请定期导出备份');
  refreshStorage();
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

async function installApp() {
  if (app.installPrompt) {
    const promptEvent = app.installPrompt;
    app.installPrompt = null;
    promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === 'accepted') toast('已开始安装');
    render();
  } else {
    toast('请用 Chrome 菜单「安装应用 / 添加到主屏幕」');
  }
}

function toggleDetail() {
  app.compact = !app.compact;
  app.db.settings.compact = app.compact;
  scheduleSave();
  render();
}

function clearAll() {
  if (!confirm('会删除全部每日记录，确定吗？')) return;
  if (!confirm('再确认一次：这个操作无法撤销，建议先导出备份。')) return;
  const keepHabits = app.db.habits;
  const keepSettings = app.db.settings;
  app.db = normalizeDb({ habits: keepHabits, settings: keepSettings });
  app.db.settings.welcomed = true;
  flush();
  goToday();
  render();
  toast('已清空');
}

let toastTimer = null;
function toast(msg) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

/* ---------------- 路由 ---------------- */

function applyHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const parts = raw.split('/').filter(Boolean);
  let view = parts[0] || 'today';
  if (view === 'day') {
    app.date = /^\d{4}-\d{2}-\d{2}$/.test(parts[1] || '') ? parts[1] : todayStr();
    view = 'today';
  } else if (view === 'today') {
    app.date = todayStr();
  }
  const aliases = { calendar: 'review', trend: 'review', finance: 'money' };
  if (aliases[view]) view = aliases[view];
  if (!VIEWS[view]) {
    view = 'today';
    app.date = todayStr();
  }
  app.view = view;
  if ((view === 'money' || view === 'review') && !app.month) {
    app.month = todayStr().slice(0, 7);
  }
  if (view === 'review') app.weekOffset = 0;
  render();
  window.scrollTo(0, 0);
}

/* ---------------- 启动 ---------------- */

function showBootError(title, detail, hint) {
  const main = $('#main');
  if (!main) return;
  main.innerHTML = `<div class="boot-error">
    <h1>${esc(title)}</h1>
    <p>${detail}</p>
    ${hint ? `<pre>${esc(hint)}</pre>` : ''}
  </div>`;
}

async function boot() {
  if (location.protocol === 'file:') {
    showBootError('请用手机浏览器打开', '这是一个需要安装到手机的应用。请通过部署地址或本地服务打开，然后「安装到主屏幕」。', '');
    return;
  }

  try {
    const saved = await loadState();
    app.db = normalizeDb(saved || {});
  } catch (err) {
    console.error('读取本地数据失败', err);
    app.db = normalizeDb({});
    toast('读取本地数据失败，已从空白开始');
  }

  applyTheme();
  document.addEventListener('click', onClick);
  document.addEventListener('input', onInput);
  document.addEventListener('keydown', onKeydown);
  document.addEventListener('submit', (ev) => {
    if (ev.target && ev.target.classList && ev.target.classList.contains('fin-add')) {
      ev.preventDefault();
      addTransaction();
    }
  });
  window.addEventListener('hashchange', applyHash);

  // 页面被切到后台时尽量落盘（移动端 pagehide 不一定可靠）
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && app.db && app.dirty) {
      prune();
      saveState(app.db);
    }
  });

  window.addEventListener('beforeinstallprompt', (ev) => {
    ev.preventDefault();
    app.installPrompt = ev;
  });

  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  if (mq.addEventListener) {
    mq.addEventListener('change', () => {
      if ((app.db.settings.theme || 'auto') === 'auto') applyTheme();
    });
  }

  const fileInput = $('#import-file');
  if (fileInput) {
    fileInput.addEventListener('change', (ev) => {
      const file = ev.target.files && ev.target.files[0];
      ev.target.value = '';
      if (file) importFile(file);
    });
  }

  if ('serviceWorker' in navigator) {
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      const go = () => window.location.reload();
      if (app.dirty) flush().finally(go);
      else go();
    });
    navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('Service Worker 注册失败', err));
  }

  if (!location.hash) history.replaceState(null, '', '#/today');
  applyHash();
  setStatus('idle');
  requestPersist();
}

boot();
