// Nghiên cứu: US30 giảm 5 phiên liên tiếp thì VNINDEX phản ứng thế nào?
// Đọc CSV D1 trong ./data (không gọi mạng), ghi số liệu thô ra ./results.json.
// Chạy: node backtests/us30_streak/us30_streak_backtest.mjs
// Dữ liệu tải bằng backtests/common/tradingview/fetch_daily.mjs.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const STREAK = 5;

function loadCsv(file) {
  const rows = readFileSync(join(HERE, 'data', file), 'utf8').trim().split('\n').slice(1);
  return rows.map((line) => {
    const [t, o, h, l, c] = line.split(',');
    return { date: t.slice(0, 10), time: Date.parse(t) / 1000, open: +o, high: +h, low: +l, close: +c };
  });
}

const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
const median = (a) => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const pctTrue = (a, f) => (a.filter(f).length / a.length) * 100;
// p hai phía, xấp xỉ chuẩn (dùng erf). Với n lớn xấp xỉ này ổn.
function erf(x) {
  const s = Math.sign(x); x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}
const pTwo = (z) => 2 * (1 - 0.5 * (1 + erf(Math.abs(z) / Math.SQRT2)));
function welch(a, b) {
  const va = sd(a) ** 2 / a.length, vb = sd(b) ** 2 / b.length;
  const t = (mean(a) - mean(b)) / Math.sqrt(va + vb);
  return { t, p: pTwo(t), diff: mean(a) - mean(b) };
}
// Bootstrap KTC 95% của trung bình, hạt giống cố định để tái lập.
function bootCI(a, B = 5000) {
  let seed = 42;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const m = [];
  for (let b = 0; b < B; b++) {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[Math.floor(rnd() * a.length)];
    m.push(s / a.length);
  }
  m.sort((x, y) => x - y);
  return [m[Math.floor(B * 0.025)], m[Math.floor(B * 0.975)]];
}
const stat = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return { n: a.length, mean: mean(a), median: median(a), sd: sd(a), winPct: pctTrue(a, (x) => x > 0), worst: s[0], best: s.at(-1) };
};

// ---- Tải dữ liệu ----
const us = loadCsv('dji_d1.csv');
const vn = loadCsv('vnindex_d1.csv');
const usRet = us.map((c, i) => (i ? c.close / us[i - 1].close - 1 : null));
const vnRet = vn.map((c, j) => (j ? c.close / vn[j - 1].close - 1 : null));
const vnFirstAfter = (date) => vn.findIndex((c) => c.date > date);

// ---- Episode: đúng 5 phiên giảm liên tiếp của US30 ----
const episodes = [];
let run = 0;
for (let i = 1; i < us.length; i++) {
  run = usRet[i] < 0 ? run + 1 : 0;
  if (run !== STREAK) continue;
  const endDate = us[i].date;
  if (endDate < vn[0].date) continue;
  const j = vnFirstAfter(endDate);
  if (j < 1 || j + 9 >= vn.length) continue;
  const vnPath = Array.from({ length: 10 }, (_, k) => (vn[j + k].close / vn[j - 1].close - 1) * 100);
  episodes.push({
    usStart: us[i - 4].date, usEnd: endDate, vnFirst: vn[j].date, year: +endDate.slice(0, 4),
    usDrop: (us[i].close / us[i - 5].close - 1) * 100,
    usSixth: i + 1 < us.length ? usRet[i + 1] * 100 : null,
    vn1: vnRet[j] * 100, vn5: vnPath[4], vn10: vnPath[9], vnPath,
  });
}

// ---- Nền: mọi phiên VN ----
const base1 = vnRet.slice(1).map((x) => x * 100);
const base5 = []; for (let j = 1; j + 4 < vn.length; j++) base5.push((vn[j + 4].close / vn[j - 1].close - 1) * 100);
const base10 = []; for (let j = 1; j + 9 < vn.length; j++) base10.push((vn[j + 9].close / vn[j - 1].close - 1) * 100);

// ---- So sánh: sau mọi phiên US giảm / tăng (không chọn chuỗi) ----
const afterUsDown = [], afterUsUp = [];
for (let i = 1; i < us.length; i++) {
  const j = vnFirstAfter(us[i].date);
  if (j < 1) continue;
  if (usRet[i] < 0) afterUsDown.push(vnRet[j] * 100);
  else if (usRet[i] > 0) afterUsUp.push(vnRet[j] * 100);
}

const sixthRows = episodes.filter((e) => e.usSixth !== null);
const usGreenBase = pctTrue(usRet.slice(1), (x) => x > 0);
const pSixth = usGreenBase / 100;
const zSixth = (pctTrue(sixthRows, (e) => e.usSixth > 0) / 100 - pSixth) / Math.sqrt(pSixth * (1 - pSixth) / sixthRows.length);

const vn1 = episodes.map((e) => e.vn1), vn5 = episodes.map((e) => e.vn5), vn10 = episodes.map((e) => e.vn10);
const bucket = (label, f) => {
  const s = episodes.filter(f);
  return { label, n: s.length, vn1: stat(s.map((e) => e.vn1)), vn5: stat(s.map((e) => e.vn5)) };
};
const ERAS = [['2000–2007', 2000, 2007], ['2008–2012', 2008, 2012], ['2013–2019', 2013, 2019], ['2020–2026', 2020, 2026]];

const results = {
  generated_from: ['data/dji_d1.csv', 'data/vnindex_d1.csv'],
  us_range: [us[0].date, us.at(-1).date], us_bars: us.length,
  vn_range: [vn[0].date, vn.at(-1).date], vn_bars: vn.length,
  streak: STREAK, episodes: episodes.length,
  us_green_base_pct: usGreenBase,
  sixth: { n: sixthRows.length, green_pct: pctTrue(sixthRows, (e) => e.usSixth > 0), z: zSixth, p: pTwo(zSixth) },
  vn: {
    d1: stat(vn1), d5: stat(vn5), d10: stat(vn10),
    base_d1: stat(base1), base_d5: stat(base5), base_d10: stat(base10),
  },
  tests: {
    d1_vs_base: welch(vn1, base1), d5_vs_base: welch(vn5, base5), d10_vs_base: welch(vn10, base10),
    after_us_down_vs_base: welch(afterUsDown, base1),
    after_us_up_vs_after_us_down: welch(afterUsUp, afterUsDown),
    episode_vs_after_us_down: welch(vn1, afterUsDown),
  },
  ci95: { d1: bootCI(vn1), d5: bootCI(vn5), d10: bootCI(vn10) },
  after_us_down: stat(afterUsDown), after_us_up: stat(afterUsUp),
  by_drop: [
    { label: 'Giảm nhẹ (≥ -3%)', f: (e) => e.usDrop >= -3 },
    { label: 'Giảm vừa (-3% đến -5%)', f: (e) => e.usDrop < -3 && e.usDrop >= -5 },
    { label: 'Giảm mạnh (< -5%)', f: (e) => e.usDrop < -5 },
  ].map((b) => bucket(b.label, b.f)),
  by_era: ERAS.map(([label, a, b]) => {
    const s = episodes.filter((e) => e.year >= a && e.year <= b);
    return { label, n: s.length, vn1_mean: s.length ? mean(s.map((e) => e.vn1)) : null, vn5_mean: s.length ? mean(s.map((e) => e.vn5)) : null, vn1_green_pct: s.length ? pctTrue(s, (e) => e.vn1 > 0) : null };
  }),
  by_us_sixth: [
    { label: 'US phiên 6 xanh', f: (e) => e.usSixth > 0 },
    { label: 'US phiên 6 đỏ', f: (e) => e.usSixth <= 0 },
  ].map((b) => bucket(b.label, (e) => e.usSixth !== null && b.f(e))),
  path_mean: Array.from({ length: 10 }, (_, k) => ({ day: k + 1, mean: mean(episodes.map((e) => e.vnPath[k])), green_pct: pctTrue(episodes, (e) => e.vnPath[k] > 0) })),
  hist_d1: [[-8, -6], [-6, -4], [-4, -2], [-2, -1], [-1, 0], [0, 1], [1, 2], [2, 4], [4, 6], [6, 8]].map(([lo, hi]) => ({
    lo, hi,
    episode_n: vn1.filter((x) => x >= lo && x < hi).length,
    base_pct: (base1.filter((x) => x >= lo && x < hi).length / base1.length) * 100,
  })),
  episodes,
};

writeFileSync(join(HERE, 'results.json'), JSON.stringify(results, null, 2));
console.log(`episode=${episodes.length} sixth_green=${results.sixth.green_pct.toFixed(2)} vn_d1_mean=${results.vn.d1.mean.toFixed(3)} p=${results.tests.d1_vs_base.p.toFixed(4)}`);
