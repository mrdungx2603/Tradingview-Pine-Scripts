// Nghiên cứu: US30 phiên hôm qua có dự báo được VN30F phiên hôm nay không?
// Ghép mỗi phiên VN với phiên US gần nhất đã đóng cửa trước khi VN mở cửa.
// Đọc CSV D1 trong ./data (không gọi mạng), ghi số liệu thô ra ./results.json.
// Chạy: node backtests/us30_vn30f/us30_vn30f_backtest.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, 'data');
const MAX_GAP_DAYS = 4;

function loadCsv(file) {
  const rows = readFileSync(join(DATA, file), 'utf8').trim().split('\n').slice(1);
  return rows.map((line) => {
    const [t, o, h, l, c] = line.split(',');
    return { date: t.slice(0, 10), open: +o, high: +h, low: +l, close: +c };
  });
}
const usData = loadCsv('../../us30_streak/data/dji_d1.csv');
const vnData = loadCsv('vn301_d1.csv');

const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
const pctTrue = (a, f) => (a.filter(f).length / a.length) * 100;
function erf(x) {
  const s = Math.sign(x); x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}
const pTwo = (z) => 2 * (1 - 0.5 * (1 + erf(Math.abs(z) / Math.SQRT2)));
function ranks(a) {
  const idx = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]);
  const r = new Array(a.length);
  for (let i = 0; i < idx.length;) {
    let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
    i = j + 1;
  }
  return r;
}
function pearson(x, y) {
  const mx = mean(x), my = mean(y);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
  return sxy / Math.sqrt(sxx * syy);
}
function corrStats(x, y) {
  const r = pearson(x, y);
  const n = x.length;
  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  const rs = pearson(ranks(x), ranks(y));
  return { n, pearson: r, spearman: rs, p_pearson: pTwo(t) };
}
// Bootstrap KTC 95% của trung bình, hạt giống cố định.
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
const dayDiff = (a, b) => (Date.parse(b) - Date.parse(a)) / 86400000;

// ---- Ghép cặp: phiên VN j với phiên US gần nhất có ngày < ngày VN j ----
const pairs = [];
let skippedGap = 0;
let u = 0;
for (let j = 1; j < vnData.length; j++) {
  const vd = vnData[j].date;
  while (u + 1 < usData.length && usData[u + 1].date < vd) u++;
  if (usData[u].date >= vd) continue;
  if (u < 2) continue;
  if (dayDiff(usData[u].date, vd) > MAX_GAP_DAYS) { skippedGap++; continue; }
  const us = usData[u], usPrev = usData[u - 1], usPrev2 = usData[u - 2];
  const vnPrev = vnData[j - 1], vn = vnData[j];
  pairs.push({
    vnDate: vd,
    usDate: us.date,
    usRet: (us.close / usPrev.close - 1) * 100,         // US phiên hôm qua (close-to-close)
    usLag2Ret: (usPrev.close / usPrev2.close - 1) * 100, // đối chứng: US hai phiên trước
    usIntraRet: (us.close / us.open - 1) * 100,         // US trong phiên (open → close)
    vnGap: (vn.open / vnPrev.close - 1) * 100,          // gap mở cửa VN, phản ứng với US
    vnOC: (vn.close / vn.open - 1) * 100,               // VN trong phiên, lệnh vào tại open
    vnCC: (vn.close / vnPrev.close - 1) * 100,
  });
}

const x = pairs.map((p) => p.usRet);
const oc = pairs.map((p) => p.vnOC);
const gap = pairs.map((p) => p.vnGap);
const cc = pairs.map((p) => p.vnCC);

// ---- Tương quan ----
const correlations = {
  us_ret_vs_vn_oc: corrStats(x, oc),
  us_ret_vs_vn_gap: corrStats(x, gap),
  us_ret_vs_vn_cc: corrStats(x, cc),
  control_lag2_vs_vn_oc: corrStats(pairs.map((p) => p.usLag2Ret), oc),
  us_intra_vs_vn_oc: corrStats(pairs.map((p) => p.usIntraRet), oc),
};

// ---- Theo nhóm biên độ US hôm qua: follow (cùng chiều) và fade (ngược chiều) ----
const BINS = [
  { label: '≤ -2%', lo: -Infinity, hi: -2 },
  { label: '-2% đến -1%', lo: -2, hi: -1 },
  { label: '-1% đến -0,5%', lo: -1, hi: -0.5 },
  { label: '-0,5% đến +0,5%', lo: -0.5, hi: 0.5 },
  { label: '+0,5% đến +1%', lo: 0.5, hi: 1 },
  { label: '+1% đến +2%', lo: 1, hi: 2 },
  { label: '≥ +2%', lo: 2, hi: Infinity },
];
const bins = BINS.map((b) => {
  const s = pairs.filter((p) => p.usRet > b.lo && p.usRet <= b.hi);
  const follow = s.map((p) => (p.usRet >= 0 ? 1 : -1) * p.vnOC); // long khi US xanh, short khi US đỏ
  return {
    label: b.label,
    n: s.length,
    vn_oc_mean: s.length ? mean(s.map((p) => p.vnOC)) : null,
    vn_oc_up_pct: s.length ? pctTrue(s, (p) => p.vnOC > 0) : null,
    vn_gap_mean: s.length ? mean(s.map((p) => p.vnGap)) : null,
    follow_mean: s.length ? mean(follow) : null,
    follow_hit_pct: s.length ? pctTrue(follow, (v) => v > 0) : null,
    follow_ci95: s.length > 10 ? bootCI(follow) : null,
    fade_mean: s.length ? -mean(follow) : null,
    fade_hit_pct: s.length ? pctTrue(follow, (v) => v < 0) : null,
  };
});

// ---- Ổn định theo năm ----
const years = [...new Set(pairs.map((p) => p.vnDate.slice(0, 4)))].sort();
const byYear = years.map((y) => {
  const s = pairs.filter((p) => p.vnDate.startsWith(y));
  return {
    year: y,
    n: s.length,
    corr_oc: s.length > 5 ? pearson(s.map((p) => p.usRet), s.map((p) => p.vnOC)) : null,
    follow_mean: mean(s.map((p) => (p.usRet >= 0 ? 1 : -1) * p.vnOC)),
    follow_hit_pct: pctTrue(s, (p) => (p.usRet >= 0 ? 1 : -1) * p.vnOC > 0),
  };
});

// ---- Kiểm tra độ nhạy: bỏ ngày biên độ (|VN OC| ≥ 6%) ----
const trimmed = pairs.filter((p) => Math.abs(p.vnOC) < 6);
const sensitivity = {
  excluded_big_moves: pairs.length - trimmed.length,
  corr_us_ret_vs_vn_oc: corrStats(trimmed.map((p) => p.usRet), trimmed.map((p) => p.vnOC)),
  follow_mean: mean(trimmed.map((p) => (p.usRet >= 0 ? 1 : -1) * p.vnOC)),
  follow_hit_pct: pctTrue(trimmed, (p) => (p.usRet >= 0 ? 1 : -1) * p.vnOC > 0),
};

// ---- Tổng hợp ----
const followAll = pairs.map((p) => (p.usRet >= 0 ? 1 : -1) * p.vnOC);
const results = {
  generated_from: ['../us30_streak/data/dji_d1.csv', 'data/vn301_d1.csv'],
  us_range: [usData[0].date, usData.at(-1).date],
  vn_range: [vnData[0].date, vnData.at(-1).date],
  pairs: pairs.length,
  skipped_gap_gt_4d: skippedGap,
  overall: {
    follow_mean: mean(followAll),
    follow_sd: sd(followAll),
    follow_hit_pct: pctTrue(followAll, (v) => v > 0),
    follow_ci95: bootCI(followAll),
    vn_oc_sd: sd(oc),
    vn_oc_mean: mean(oc),
    vn_oc_up_pct: pctTrue(oc, (v) => v > 0),
  },
  correlations,
  bins,
  by_year: byYear,
  sensitivity,
  pairs_detail: pairs,
};

writeFileSync(join(HERE, 'results.json'), JSON.stringify(results, null, 2));
console.log(`pairs=${pairs.length} skipped_gap=${skippedGap}`);
console.log(`corr(US hôm qua, VN OC) r=${correlations.us_ret_vs_vn_oc.pearson.toFixed(3)} rho=${correlations.us_ret_vs_vn_oc.spearman.toFixed(3)} p=${correlations.us_ret_vs_vn_oc.p_pearson.toFixed(4)}`);
console.log(`corr(US hôm qua, VN gap) r=${correlations.us_ret_vs_vn_gap.pearson.toFixed(3)} p=${correlations.us_ret_vs_vn_gap.p_pearson.toFixed(4)}`);
console.log(`control lag2 r=${correlations.control_lag2_vs_vn_oc.pearson.toFixed(3)} p=${correlations.control_lag2_vs_vn_oc.p_pearson.toFixed(4)}`);
console.log(`follow mean=${results.overall.follow_mean.toFixed(3)}% hit=${results.overall.follow_hit_pct.toFixed(1)}% CI=[${results.overall.follow_ci95.map((v) => v.toFixed(3))}]`);
for (const b of bins) console.log(`${b.label}: n=${b.n} follow=${b.follow_mean?.toFixed(3)} hit=${b.follow_hit_pct?.toFixed(1)} vnOC=${b.vn_oc_mean?.toFixed(3)} upPct=${b.vn_oc_up_pct?.toFixed(1)}`);
console.log(`sensitivity excl big: n=${trimmed.length} r=${sensitivity.corr_us_ret_vs_vn_oc.pearson.toFixed(3)} follow=${sensitivity.follow_mean.toFixed(3)} hit=${sensitivity.follow_hit_pct.toFixed(1)}`);
