// Dựng báo cáo HTML từ results.json của us30_vn30f_backtest.mjs.
// Chạy: node backtests/us30_vn30f/build_report.mjs  → ghi report.html cùng thư mục.
// Không gọi mạng; toàn bộ biểu đồ là SVG nội tuyến.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const R = JSON.parse(readFileSync(join(HERE, 'results.json'), 'utf8'));
const P = R.pairs_detail;
const NBIN = R.bins.length;
const BONF = 0.05 / NBIN;

// ---------- thống kê ----------
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
function erf(x) {
  const s = Math.sign(x); x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}
const pTwo = (z) => 2 * (1 - 0.5 * (1 + erf(Math.abs(z) / Math.SQRT2)));
function grp(a) {
  const n = a.length, m = mean(a), s = sd(a), se = s / Math.sqrt(n), t = m / se;
  return { n, m, s, se, t, p: pTwo(t), lo: m - 1.96 * se, hi: m + 1.96 * se };
}
const pearsonOf = (x, y) => {
  const mx = mean(x), my = mean(y);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
  return sxy / Math.sqrt(sxx * syy);
};
const corrP = (r, n) => pTwo(r * Math.sqrt((n - 2) / (1 - r * r)));

// Nhãn cho hệ số tương quan: không áp Bonferroni vì phép hiệu chỉnh chỉ áp cho 7 nhóm biên độ.
const corrBadge = (p) => (p < 0.05
  ? '<span class="badge warn">Có ý nghĩa thống kê</span>'
  : '<span class="badge none">Không có ý nghĩa</span>');

// ---------- định dạng ----------
const num = (x, d = 2) => (x < 0 ? '−' : x > 0 ? '+' : '') + Math.abs(x).toFixed(d).replace('.', ',');
const plain = (x, d = 2) => x.toFixed(d).replace('.', ',');
const pct = (x, d = 1) => x.toFixed(d).replace('.', ',') + '%';
const pval = (p) => (p < 0.0001 ? '< 0,0001' : p.toFixed(4).replace('.', ','));
const sigBadge = (p, ciExcludesZero) => {
  if (p < BONF && ciExcludesZero) return '<span class="badge sig">Có ý nghĩa sau Bonferroni</span>';
  if (p < 0.05 && ciExcludesZero) return '<span class="badge warn">Có ý nghĩa, chưa hiệu chỉnh</span>';
  return '<span class="badge none">Không có ý nghĩa</span>';
};

// ---------- số liệu chính ----------
const usRet = P.map((p) => p.usRet), vnOC = P.map((p) => p.vnOC), gap = P.map((p) => p.vnGap);
const rOC = R.correlations.us_ret_vs_vn_oc;
const rGap = R.correlations.us_ret_vs_vn_gap;
const rLag = R.correlations.control_lag2_vs_vn_oc;
const followAll = R.overall;
const bigUp = P.filter((p) => p.usRet >= 2).map((p) => p.vnOC);
const gUp = grp(bigUp);
const allOC = grp(vnOC);

// ---------- biểu đồ SVG ----------
function scatterSvg() {
  const w = 640, h = 360, pad = { l: 52, r: 16, t: 14, b: 42 };
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const xmin = -6, xmax = 8, ymin = -8, ymax = 8;
  const X = (v) => pad.l + ((v - xmin) / (xmax - xmin)) * iw;
  const Y = (v) => pad.t + ((ymax - v) / (ymax - ymin)) * ih;
  let g = '';
  for (let t = -8; t <= 8; t += 4) {
    g += `<line class="grid" x1="${pad.l}" x2="${w - pad.r}" y1="${Y(t)}" y2="${Y(t)}"/>`;
    g += `<text class="axis" x="${pad.l - 8}" y="${Y(t) + 4}" text-anchor="end">${t}%</text>`;
  }
  for (let t = -6; t <= 8; t += 2) {
    g += `<text class="axis" x="${X(t)}" y="${h - 22}" text-anchor="middle">${t}%</text>`;
  }
  g += `<line class="zero" x1="${X(0)}" x2="${X(0)}" y1="${pad.t}" y2="${h - pad.b}"/>`;
  g += `<line class="zero" x1="${pad.l}" x2="${w - pad.r}" y1="${Y(0)}" y2="${Y(0)}"/>`;
  for (const p of P) {
    const cx = Math.min(Math.max(p.usRet, xmin), xmax);
    const cy = Math.min(Math.max(p.vnOC, ymin), ymax);
    g += `<circle class="pt" cx="${X(cx)}" cy="${Y(cy)}" r="2.2"/>`;
  }
  // đường hồi quy: y = a + b x, b = r * sd_y / sd_x
  const mx = mean(usRet), my = mean(vnOC);
  const b = rOC.pearson * sd(vnOC) / sd(usRet);
  const a = my - b * mx;
  g += `<line class="reg" x1="${X(xmin)}" y1="${Y(a + b * xmin)}" x2="${X(xmax)}" y2="${Y(a + b * xmax)}"/>`;
  g += `<text class="axis" x="${pad.l + 6}" y="${pad.t + 14}">r = ${num(rOC.pearson, 3)} · đường đỏ là hồi quy tuyến tính</text>`;
  g += `<text class="axis" x="${(pad.l + w - pad.r) / 2}" y="${h - 4}" text-anchor="middle">US30 phiên trước (close-to-close)</text>`;
  g += `<text class="axis" transform="translate(14,${(pad.t + h - pad.b) / 2}) rotate(-90)" text-anchor="middle">VN30F trong phiên (open → close)</text>`;
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Biểu đồ phân tán US30 hôm qua và VN30F OC">${g}</svg>`;
}

function corrBarsSvg() {
  const items = [
    { label: 'US hôm qua\nvs VN OC', v: rOC.pearson, p: rOC.p_pearson },
    { label: 'US hôm qua\nvs VN gap', v: rGap.pearson, p: rGap.p_pearson },
    { label: 'Đối chứng\nUS 2 phiên trước', v: rLag.pearson, p: rLag.p_pearson },
  ];
  const w = 640, h = 300, pad = { l: 52, r: 16, t: 18, b: 56 };
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const Y = (v) => pad.t + ((1 - v) / 2) * ih; // thang -1..+1
  let g = '';
  for (const t of [-1, -0.5, 0, 0.5, 1]) {
    g += `<line class="grid" x1="${pad.l}" x2="${w - pad.r}" y1="${Y(t)}" y2="${Y(t)}"/>`;
    g += `<text class="axis" x="${pad.l - 8}" y="${Y(t) + 4}" text-anchor="end">${plain(t, 1)}</text>`;
  }
  g += `<line class="zero" x1="${pad.l}" x2="${w - pad.r}" y1="${Y(0)}" y2="${Y(0)}"/>`;
  items.forEach((it, i) => {
    const cx = pad.l + (iw / items.length) * (i + 0.5);
    const bw = 90;
    const top = Math.min(Y(it.v), Y(0)), hh = Math.abs(Y(it.v) - Y(0));
    g += `<rect class="bar ${it.v < 0 ? 'neg' : 'pos'}" x="${cx - bw / 2}" y="${top}" width="${bw}" height="${Math.max(hh, 1.5)}" rx="3"/>`;
    g += `<text class="val" x="${cx}" y="${it.v < 0 ? Y(it.v) + 16 : Y(it.v) - 6}" text-anchor="middle">r = ${num(it.v, 3)}</text>`;
    it.label.split('\n').forEach((line, k) => {
      g += `<text class="axis" x="${cx}" y="${h - 30 + k * 14}" text-anchor="middle">${line}</text>`;
    });
  });
  g += `<text class="axis" x="${pad.l}" y="${pad.t - 4}">Hệ số tương quan Pearson, thang −1 đến +1</text>`;
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="So sánh hệ số tương quan">${g}</svg>`;
}

function ciBarsSvg(items, { min, max, unit = '%' }) {
  const w = 640, h = 320, pad = { l: 56, r: 16, t: 16, b: 64 };
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const Y = (v) => pad.t + ((max - v) / (max - min)) * ih;
  const step = (max - min) / 6;
  let g = '';
  for (let t = min; t <= max + 1e-9; t += step) {
    const tv = Math.round(t * 10) / 10;
    g += `<line class="grid" x1="${pad.l}" x2="${w - pad.r}" y1="${Y(tv)}" y2="${Y(tv)}"/>`;
    g += `<text class="axis" x="${pad.l - 8}" y="${Y(tv) + 4}" text-anchor="end">${plain(tv, 1)}${unit}</text>`;
  }
  g += `<line class="zero" x1="${pad.l}" x2="${w - pad.r}" y1="${Y(0)}" y2="${Y(0)}"/>`;
  const slot = iw / items.length;
  items.forEach((it, i) => {
    const cx = pad.l + slot * (i + 0.5);
    g += `<line class="ci ${it.sig ? 'sig' : ''}" x1="${cx}" x2="${cx}" y1="${Y(it.hi)}" y2="${Y(it.lo)}"/>`;
    g += `<line class="ci ${it.sig ? 'sig' : ''}" x1="${cx - 8}" x2="${cx + 8}" y1="${Y(it.hi)}" y2="${Y(it.hi)}"/>`;
    g += `<line class="ci ${it.sig ? 'sig' : ''}" x1="${cx - 8}" x2="${cx + 8}" y1="${Y(it.lo)}" y2="${Y(it.lo)}"/>`;
    g += `<circle class="mean ${it.sig ? 'sig' : ''}" cx="${cx}" cy="${Y(it.m)}" r="5"/>`;
    g += `<text class="val" x="${cx}" y="${Y(it.m) + (it.m < 0 ? 18 : -10)}" text-anchor="middle">${num(it.m)}${unit}</text>`;
    g += `<text class="axis" x="${cx}" y="${h - 40}" text-anchor="middle">${it.label}</text>`;
    g += `<text class="axis sub" x="${cx}" y="${h - 24}" text-anchor="middle">n=${it.n}</text>`;
  });
  g += `<text class="axis" x="${pad.l}" y="${pad.t - 4}">Điểm = trung bình VN OC · Thanh = KTC 95%</text>`;
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Trung bình VN OC và khoảng tin cậy 95% theo biên độ US">${g}</svg>`;
}

function yearBarsSvg(items) {
  const w = 640, h = 300, pad = { l: 52, r: 16, t: 18, b: 40 };
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const min = -0.6, max = 0.6;
  const Y = (v) => pad.t + ((max - v) / (max - min)) * ih;
  let g = '';
  for (const t of [-0.6, -0.3, 0, 0.3, 0.6]) {
    g += `<line class="grid" x1="${pad.l}" x2="${w - pad.r}" y1="${Y(t)}" y2="${Y(t)}"/>`;
    g += `<text class="axis" x="${pad.l - 8}" y="${Y(t) + 4}" text-anchor="end">${plain(t, 1)}</text>`;
  }
  g += `<line class="zero" x1="${pad.l}" x2="${w - pad.r}" y1="${Y(0)}" y2="${Y(0)}"/>`;
  const slot = iw / items.length;
  items.forEach((it, i) => {
    const cx = pad.l + slot * (i + 0.5);
    const bw = slot * 0.6;
    const v = Math.max(min, Math.min(max, it.r));
    const top = Math.min(Y(v), Y(0)), hh = Math.abs(Y(v) - Y(0));
    g += `<rect class="bar ${it.r < 0 ? 'neg' : 'pos'} ${it.sig ? '' : 'faint'}" x="${cx - bw / 2}" y="${top}" width="${bw}" height="${Math.max(hh, 1)}" rx="2"/>`;
    g += `<text class="axis" x="${cx}" y="${h - 22}" text-anchor="middle">${it.label}</text>`;
  });
  g += `<text class="axis" x="${pad.l}" y="${pad.t - 4}">Tương quan US hôm qua vs VN OC theo năm. Cột nhạt: p ≥ 0,05</text>`;
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Tương quan theo năm">${g}</svg>`;
}

// ---------- dữ liệu bảng ----------
const binRows = R.bins.map((b) => {
  const sub = P.filter((p) => p.usRet > (b.label.startsWith('≤') ? -Infinity : binLo(b.label)) && p.usRet <= binHi(b.label));
  const g = grp(sub.map((p) => p.vnOC));
  const ciZero = !(g.lo <= 0 && g.hi >= 0);
  return { label: b.label, n: g.n, m: g.m, lo: g.lo, hi: g.hi, p: g.p, ciZero, follow: b.follow_mean, hit: b.follow_hit_pct, fade: b.fade_hit_pct };
});
function binLo(label) {
  const map = { '-2% đến -1%': -2, '-1% đến -0,5%': -1, '-0,5% đến +0,5%': -0.5, '+0,5% đến +1%': 0.5, '+1% đến +2%': 1, '≥ +2%': 2 };
  return map[label];
}
function binHi(label) {
  const map = { '≤ -2%': -2, '-2% đến -1%': -1, '-1% đến -0,5%': -0.5, '-0,5% đến +0,5%': 0.5, '+0,5% đến +1%': 1, '+1% đến +2%': 2, '≥ +2%': Infinity };
  return map[label];
}
const shortLabel = {
  '≤ -2%': '≤ −2', '-2% đến -1%': '−2…−1', '-1% đến -0,5%': '−1…−0,5', '-0,5% đến +0,5%': '±0,5',
  '+0,5% đến +1%': '0,5…1', '+1% đến +2%': '1…2', '≥ +2%': '≥ 2',
};
const ciItems = binRows.map((b) => ({ label: shortLabel[b.label], m: b.m, lo: b.lo, hi: b.hi, n: b.n, sig: b.ciZero }));

const yearRows = R.by_year.map((y) => {
  const s = P.filter((p) => p.vnDate.startsWith(y.year));
  const rr = y.corr_oc;
  const pp = rr == null ? null : corrP(rr, y.n);
  return { year: y.year, n: y.n, r: rr, p: pp, follow: y.follow_mean, hit: y.follow_hit_pct };
});
const yearBars = yearRows.map((y) => ({ label: y.year, r: y.r ?? 0, sig: y.p != null && y.p < 0.05 }));

const upByYear = [...new Set(P.filter((p) => p.usRet >= 2).map((p) => p.vnDate.slice(0, 4)))].sort().map((y) => {
  const s = P.filter((p) => p.usRet >= 2 && p.vnDate.startsWith(y)).map((p) => p.vnOC);
  return { year: y, n: s.length, m: mean(s) };
});
const up2020 = bigUp.length - (upByYear.find((u) => u.year === '2020')?.n ?? 0);
const exp2020 = P.filter((p) => p.usRet >= 2 && !p.vnDate.startsWith('2020')).map((p) => p.vnOC);
const exp2022 = P.filter((p) => p.usRet >= 2 && !p.vnDate.startsWith('2020') && !p.vnDate.startsWith('2022')).map((p) => p.vnOC);

const sensC = R.sensitivity.corr_us_ret_vs_vn_oc;

// ---------- HTML ----------
const html = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>US30 và VN30F: Tương Quan Phiên Liền Kề</title>
<style>
:root {
  --bg: #f4f3ee; --fg: #1c1e1a; --muted: #6a6d64; --line: #d8d6cc; --panel: #ffffff;
  --neg: #b3452d; --pos: #3a7a4d; --accent: #8c6418; --neutral: #a6a89c; --grid: #e4e2d9;
  --sig-bg: #e6f1e9; --sig-fg: #22613a; --warn-bg: #f7efd9; --warn-fg: #6e5010; --none-bg: #ecebe6; --none-fg: #5a5d55;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #15170f; --fg: #ebeae2; --muted: #9b9e92; --line: #343629; --panel: #1d2019;
    --neg: #e27a60; --pos: #86c196; --accent: #d9a84e; --neutral: #5d6157; --grid: #2a2c22;
    --sig-bg: #203628; --sig-fg: #9fd6ac; --warn-bg: #3a3118; --warn-fg: #e7c97e; --none-bg: #2a2c25; --none-fg: #b5b8ac;
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --bg: #15170f; --fg: #ebeae2; --muted: #9b9e92; --line: #343629; --panel: #1d2019;
  --neg: #e27a60; --pos: #86c196; --accent: #d9a84e; --neutral: #5d6157; --grid: #2a2c22;
  --sig-bg: #203628; --sig-fg: #9fd6ac; --warn-bg: #3a3118; --warn-fg: #e7c97e; --none-bg: #2a2c25; --none-fg: #b5b8ac;
  color-scheme: dark;
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--bg); color: var(--fg);
  font-family: Inter, system-ui, -apple-system, "Segoe UI", sans-serif; font-size: 15px; line-height: 1.6;
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px));
  padding-block: 28px 56px;
}
main { max-width: 900px; margin: 0 auto; min-width: 0; }
h1 { font-size: 28px; line-height: 1.2; margin: 0 0 6px; text-wrap: balance; letter-spacing: -0.01em; }
h2 { font-size: 20px; margin: 44px 0 10px; padding-top: 18px; border-top: 1px solid var(--line); text-wrap: balance; }
h3 { font-size: 15px; margin: 22px 0 6px; }
p { margin: 0 0 12px; max-width: 70ch; }
.meta { color: var(--muted); font-size: 13px; margin-bottom: 20px; }
.verdict { background: var(--panel); border: 1px solid var(--line); border-left: 4px solid var(--accent); border-radius: 8px; padding: 16px 18px; margin: 18px 0; }
.verdict p:last-child { margin-bottom: 0; }
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; margin: 16px 0; }
.kpi { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 12px 14px; min-width: 0; }
.kpi .k { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
.kpi .v { font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; margin-top: 2px; }
.kpi .s { font-size: 12px; color: var(--muted); }
.neg { color: var(--neg); } .pos { color: var(--pos); }
.figure { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 14px 12px 10px; margin: 14px 0; min-width: 0; }
.figure figcaption { font-size: 13px; color: var(--muted); margin: 0 4px 8px; }
.figure svg { width: 100%; height: auto; display: block; }
svg text { font-family: "JetBrains Mono", ui-monospace, monospace; }
svg .axis { fill: var(--muted); font-size: 11px; }
svg .sub { font-size: 10px; }
svg .val { fill: var(--fg); font-size: 12px; font-weight: 600; }
svg .grid { stroke: var(--grid); stroke-width: 1; }
svg .zero { stroke: var(--muted); stroke-width: 1; }
svg .pt { fill: var(--neutral); opacity: 0.45; }
svg .reg { stroke: var(--neg); stroke-width: 2; }
svg .bar.neg { fill: var(--neg); } svg .bar.pos { fill: var(--pos); }
svg .bar.faint { opacity: 0.35; }
svg .ci { stroke: var(--neutral); stroke-width: 2; fill: none; }
svg .ci.sig { stroke: var(--accent); }
svg .mean { fill: var(--neutral); }
svg .mean.sig { fill: var(--accent); }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { text-align: left; padding: 7px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
th { color: var(--muted); font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.03em; }
td.num { text-align: right; font-variant-numeric: tabular-nums; font-family: "JetBrains Mono", ui-monospace, monospace; white-space: nowrap; }
.tablewrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); min-width: 0; }
.badge { display: inline-block; font-size: 12px; padding: 2px 8px; border-radius: 999px; white-space: nowrap; }
.badge.sig { background: var(--sig-bg); color: var(--sig-fg); }
.badge.warn { background: var(--warn-bg); color: var(--warn-fg); }
.badge.none { background: var(--none-bg); color: var(--none-fg); }
.gloss dt { font-weight: 700; margin-top: 12px; }
.gloss dd { margin: 3px 0 0 0; color: var(--fg); max-width: 72ch; }
.gloss dd .ex { color: var(--muted); font-size: 13px; display: block; margin-top: 3px; }
ul { padding-left: 20px; margin: 0 0 12px; max-width: 70ch; }
li { margin-bottom: 6px; }
code { font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 13px; background: var(--grid); padding: 1px 5px; border-radius: 4px; }
.note { font-size: 13px; color: var(--muted); }
.legend { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0 4px; font-size: 13px; color: var(--muted); }
.twocol { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; min-width: 0; }
.twocol > * { min-width: 0; }
@media (max-width: 600px) { .twocol { grid-template-columns: 1fr; } h1 { font-size: 24px; } }
</style>
</head>
<body>
<main>
<h1>US30 và VN30F: Tương quan phiên liền kề</h1>
<div class="meta">Dữ liệu D1 từ TradingView (DJ:DJI, HNX:VN301!), ${R.pairs} cặp phiên từ ${R.vn_range[0]} đến ${R.vn_range[1]}. Tạo bằng <code>build_report.mjs</code> từ <code>results.json</code>.</div>

<section class="verdict">
<p><strong>Kết luận.</strong> Phiên US30 hôm qua gần như không cho biết chiều đi của VN30F hôm nay. Tương quan với lợi nhuận trong phiên VN là r = ${num(rOC.pearson, 3)}, tức gần như bằng 0. Thuận theo US30 nói chung không có lợi thế.</p>
<p>Nhóm duy nhất có bằng chứng thống kê rõ là US30 tăng từ 2% trở lên. Khi đó VN30F trung bình giảm ${num(Math.abs(gUp.m), 2)}% trong phiên, với ${pct(R.bins.at(-1).fade_hit_pct)} phiên đi ngược chiều US. Bằng chứng này tập trung ở năm 2020 và 2022.</p>
<p>Gap mở cửa là nơi tác động của US30 thể hiện rõ nhất (r = ${num(rGap.pearson, 2)}). Lệnh chỉ vào được sau khi gap đã hình thành.</p>
</section>

<div class="kpis">
<div class="kpi"><div class="k">Tương quan r</div><div class="v">${num(rOC.pearson, 3)}</div><div class="s">US hôm qua vs VN OC</div></div>
<div class="kpi"><div class="k">p-value</div><div class="v">${pval(rOC.p_pearson)}</div><div class="s">có ý nghĩa thống kê, nhưng r rất nhỏ</div></div>
<div class="kpi"><div class="k">Thuận theo TB</div><div class="v">${num(followAll.follow_mean, 3)}%</div><div class="s">KTC 95% [${num(followAll.follow_ci95[0], 3)}; ${num(followAll.follow_ci95[1], 3)}] chứa 0</div></div>
<div class="kpi"><div class="k">US ≥ +2%: VN OC</div><div class="v neg">${num(gUp.m)}%</div><div class="s">${gUp.n} phiên, ${pct(100 - R.bins.at(-1).follow_hit_pct)} đi ngược US</div></div>
</div>

<h2>1. Tương quan: mức độ liên hệ</h2>
<p>Hệ số tương quan r đo mức độ hai dãy số đi cùng chiều, từ −1 đến +1. Giá trị 0 nghĩa là không có liên hệ tuyến tính. Biểu đồ dưới đặt ba cặp biến trên cùng một thang để so sánh.</p>
<figure class="figure">
<figcaption>Hệ số tương quan Pearson của ba cặp biến</figcaption>
${corrBarsSvg()}
</figure>
<div class="tablewrap" style="margin:12px 0">
<table>
<thead><tr><th>Cặp biến</th><th class="num">r</th><th class="num">ρ (Spearman)</th><th class="num">p</th><th>Đọc kết quả</th></tr></thead>
<tbody>
<tr><td>US hôm qua vs VN OC</td><td class="num">${num(rOC.pearson, 3)}</td><td class="num">${num(rOC.spearman, 3)}</td><td class="num">${pval(rOC.p_pearson)}</td><td>${corrBadge(rOC.p_pearson)} r quá nhỏ để có ích khi giao dịch.</td></tr>
<tr><td>US hôm qua vs VN gap</td><td class="num">${num(rGap.pearson, 3)}</td><td class="num">—</td><td class="num">${pval(rGap.p_pearson)}</td><td>${corrBadge(rGap.p_pearson)} Mạnh. Tác động của US nằm chủ yếu trong gap mở cửa.</td></tr>
<tr><td>Đối chứng: US 2 phiên trước vs VN OC</td><td class="num">${num(rLag.pearson, 3)}</td><td class="num">—</td><td class="num">${pval(rLag.p_pearson)}</td><td>${corrBadge(rLag.p_pearson)} Nhỏ, tương đương cặp chính. Không phải tín hiệu riêng của US hôm qua.</td></tr>
</tbody>
</table>
</div>
<p class="note">Độ nhạy: loại các phiên VN có |OC| ≥ 6% (${R.sensitivity.excluded_big_moves} phiên), r = ${num(sensC.pearson, 3)}. Kết luận không đổi.</p>

<h2>2. Phân tán từng phiên</h2>
<p>Mỗi chấm là một cặp phiên. Trục ngang là lợi nhuận US hôm qua, trục dọc là lợi nhuận VN30F trong phiên. Nếu US và VN đi cùng chiều thật, các chấm sẽ tụ quanh một đường dốc lên. Ở đây các chấm rải gần như đều quanh trục ngang.</p>
<figure class="figure">
<figcaption>US30 hôm qua và VN30F trong phiên, ${R.pairs} cặp. Trục bị cắt ở ±8% để dễ nhìn.</figcaption>
${scatterSvg()}
</figure>

<h2>3. Theo biên độ US hôm qua</h2>
<p>Nhóm phiên theo lợi nhuận US hôm qua. Điểm là trung bình VN OC, thanh là khoảng tin cậy 95%. Nếu thanh chứa 0, không thể nói chắc chắn nhóm đó lệch khỏi 0.</p>
<div class="legend">
<span><span class="badge sig">Có ý nghĩa sau Bonferroni</span> p &lt; ${plain(BONF, 4)}</span>
<span><span class="badge warn">Có ý nghĩa, chưa hiệu chỉnh</span> p &lt; 0,05</span>
<span><span class="badge none">Không có ý nghĩa</span> p ≥ 0,05</span>
</div>
<figure class="figure">
<figcaption>Trung bình VN OC và KTC 95% theo biên độ US hôm qua. Màu nhấn: KTC không chứa 0.</figcaption>
${ciBarsSvg(ciItems, { min: -1.2, max: 1.0 })}
</figure>
<div class="tablewrap" style="margin:12px 0">
<table>
<thead><tr><th>US hôm qua</th><th class="num">n</th><th class="num">VN OC TB</th><th class="num">KTC 95%</th><th class="num">Thuận theo thắng</th><th class="num">Đánh ngược thắng</th><th>Kết luận</th></tr></thead>
<tbody>
${binRows.map((b) => `<tr><td>${b.label}</td><td class="num">${b.n}</td><td class="num ${b.m < 0 ? 'neg' : 'pos'}">${num(b.m)}%</td><td class="num">[${num(b.lo)}; ${num(b.hi)}]</td><td class="num">${plain(b.hit, 1)}%</td><td class="num">${plain(b.fade, 1)}%</td><td>${sigBadge(b.p, b.ciZero)}</td></tr>`).join('\n')}
</tbody>
</table>
</div>
<p><strong>Cách đọc nhóm ≥ +2%.</strong> VN OC trung bình ${num(gUp.m)}%, KTC 95% [${num(gUp.lo)}; ${num(gUp.hi)}], p = ${pval(gUp.p)}. Đây là kết quả duy nhất vượt ngưỡng Bonferroni. Bỏ năm 2020, trung bình còn ${num(mean(exp2020))}% trên ${exp2020.length} phiên. Bỏ thêm 2022, còn ${num(mean(exp2022))}% trên ${exp2022.length} phiên.</p>
<p class="note">Các nhóm còn lại có khoảng tin cậy chứa 0. Chúng không cho thấy hướng nhất quán.</p>

<h2>4. Ổn định theo năm</h2>
<p>Nếu quan hệ thật, dấu của tương quan thường giữ nguyên qua các năm. Dưới đây dấu đổi nhiều lần, và đa số năm có |r| dưới 0,2.</p>
<figure class="figure">
<figcaption>Tương quan US hôm qua vs VN OC từng năm</figcaption>
${yearBarsSvg(yearBars)}
</figure>
<div class="tablewrap" style="margin:12px 0">
<table>
<thead><tr><th>Năm</th><th class="num">n</th><th class="num">r</th><th class="num">p</th><th class="num">Thuận theo TB</th><th class="num">Thuận theo thắng</th></tr></thead>
<tbody>
${yearRows.map((y) => `<tr><td>${y.year}</td><td class="num">${y.n}</td><td class="num">${y.r == null ? '—' : num(y.r, 3)}</td><td class="num">${y.p == null ? '—' : pval(y.p)}</td><td class="num">${num(y.follow, 3)}%</td><td class="num">${plain(y.hit, 1)}%</td></tr>`).join('\n')}
</tbody>
</table>
</div>
<p class="note">Năm có r được đánh dấu có ý nghĩa khi p &lt; 0,05. Với 10 năm, khoảng 0,5 năm có ý nghĩa do ngẫu nhiên, nên một vài năm lệch không đủ để kết luận.</p>

<h2>5. Chú thích thuật ngữ thống kê</h2>
<p>Mục này giải thích từng đại lượng và cách đọc nó trong báo cáo.</p>
<dl class="gloss">
<dt>Tương quan Pearson (r)</dt>
<dd>Đo mức độ hai dãy số tăng giảm cùng chiều theo quan hệ tuyến tính. Thang từ −1 đến +1. Giá trị gần 0 nghĩa là gần như không có quan hệ tuyến tính.
<span class="ex">Trong báo cáo: r = ${num(rOC.pearson, 3)} giữa US hôm qua và VN OC. Bình phương r cho biết tỉ lệ phương sai được giải thích, khoảng 0,5%.</span></dd>

<dt>Tương quan Spearman (ρ)</dt>
<dd>Giống Pearson nhưng tính trên thứ hạng, nên ít bị ảnh hưởng bởi vài phiên biên độ cực lớn.
<span class="ex">Trong báo cáo: ρ = ${num(rOC.spearman, 3)}, cùng hướng và cùng gần 0 với r.</span></dd>

<dt>p-value</dt>
<dd>Xác suất quan sát được một kết quả cực đoan như vậy nếu thật sự không có quan hệ. p &lt; 0,05 thường được gọi là "có ý nghĩa thống kê".
<span class="ex">p có ý nghĩa không cho biết mức độ quan trọng. Với n = ${R.pairs}, r = ${num(rOC.pearson, 3)} vẫn cho p = ${pval(rOC.p_pearson)}, nhưng quan hệ đó quá yếu để dùng.</span></dd>

<dt>Khoảng tin cậy 95% (KTC)</dt>
<dd>Khoảng mà giá trị thật có khả năng nằm trong đó, với mức tin cậy 95%. Nếu KTC chứa 0, không thể kết luận giá trị thật khác 0.
<span class="ex">Trong báo cáo: thuận theo toàn mẫu có KTC [${num(followAll.follow_ci95[0], 3)}; ${num(followAll.follow_ci95[1], 3)}] chứa 0, nên lợi thế chung chưa được chứng minh.</span></dd>

<dt>Kiểm định t và z</dt>
<dd>Tỉ số giữa độ lệch của trung bình so với 0 và sai số chuẩn. Giá trị |t| lớn hơn khoảng 2 thường tương ứng p &lt; 0,05.
<span class="ex">Nhóm US ≥ +2%: t = ${num(gUp.t)}, tức trung bình lệch khỏi 0 gần 4 lần sai số chuẩn.</span></dd>

<dt>Hiệu chỉnh Bonferroni</dt>
<dd>Khi kiểm định nhiều nhóm cùng lúc, xác suất có ít nhất một nhóm đạt p &lt; 0,05 do ngẫu nhiên sẽ tăng lên. Bonferroni chia ngưỡng 0,05 cho số kiểm định.
<span class="ex">Có ${NBIN} nhóm biên độ, ngưỡng thành 0,05 / ${NBIN} = ${plain(BONF, 4)}. Chỉ nhóm ≥ +2% vượt ngưỡng này.</span></dd>

<dt>Tỉ lệ thắng</dt>
<dd>Phần trăm phiên có lợi nhuận dương sau khi áp dụng một quy tắc.
<span class="ex">Thuận theo toàn mẫu thắng ${plain(followAll.follow_hit_pct, 1)}%. Điểm ngang bằng là 50%, nên mức này rất gần ngẫu nhiên.</span></dd>

<dt>Thuận theo và đánh ngược</dt>
<dd>Thuận theo: long VN30F khi US tăng, short khi US giảm. Đánh ngược: làm ngược lại. Hai chiến lược có lợi nhuận đối xứng: nếu thuận theo trung bình −0,68% thì đánh ngược trung bình +0,68%, trước khi trừ chi phí.
<span class="ex">Chiến lược chưa tính phí, trượt giá và thuế.</span></dd>

<dt>VN OC và VN gap</dt>
<dd>VN OC là lợi nhuận từ giá mở cửa đến giá đóng cửa trong cùng phiên. Gap là chênh lệch giữa giá mở cửa và giá đóng cửa phiên trước.
<span class="ex">Lệnh đặt lúc mở cửa hưởng được OC nhưng không hưởng phần gap.</span></dd>

<dt>Cặp biến đối chứng</dt>
<dd>Một cặp biến không nên có quan hệ với kết quả nếu giả thuyết đúng. Dùng để kiểm tra xem tương quan có chỉ là hiệu ứng chung của thị trường.
<span class="ex">Đối chứng US 2 phiên trước có r = ${num(rLag.pearson, 3)}, gần như cùng mức với cặp chính, nên tương quan cặp chính không phải tín hiệu riêng.</span></dd>

<dt>Số quan sát (n)</dt>
<dd>Số phiên hoặc số cặp được dùng để tính. Với n nhỏ, khoảng tin cậy rộng và kết quả dễ đổi khi thêm vài phiên.
<span class="ex">Nhóm ≥ +2% chỉ có ${gUp.n} phiên, và tập trung ở 2020 và 2022.</span></dd>
</dl>

<h2>6. Giới hạn</h2>
<ul>
<li><strong>Mẫu không độc lập.</strong> Các phiên biên độ lớn xảy ra theo đợt, nên số sự kiện độc lập nhỏ hơn số phiên.</li>
<li><strong>In-sample.</strong> Ngưỡng 2% được chọn sau khi xem phân phối. Chưa có kiểm tra ngoài mẫu.</li>
<li><strong>Chưa tính chi phí.</strong> Phí, trượt giá và thuế có thể xóa hết lợi nhuận trung bình 0,68%.</li>
<li><strong>Roll hợp đồng chưa loại.</strong> VN301! là dữ liệu liên tục, có thể có gap giả khi chuyển hợp đồng.</li>
<li><strong>Chỉ số, không phải tài sản giao dịch.</strong> DJI và VN30 Index là chỉ số. US30 CFD và VN30F có giá và lịch khác.</li>
</ul>

<p class="note">Dữ liệu thô: <code>results.json</code>. Script phân tích: <code>us30_vn30f_backtest.mjs</code>. Script dựng báo cáo: <code>build_report.mjs</code>.</p>
</main>
</body>
</html>
`;

writeFileSync(join(HERE, 'report.html'), html);
console.log(`report.html written, ${html.length} bytes`);
console.log(`gUp: n=${gUp.n} m=${gUp.m.toFixed(3)} t=${gUp.t.toFixed(2)} p=${gUp.p.toExponential(2)} ci=[${gUp.lo.toFixed(3)}, ${gUp.hi.toFixed(3)}]`);
console.log(`allOC: m=${allOC.m.toFixed(3)} p=${allOC.p.toFixed(3)}`);
console.log('bins:', binRows.map((b) => `${b.label}:n=${b.n},m=${b.m.toFixed(3)},p=${b.p.toExponential(1)},ciExcludes0=${b.ciZero}`).join(' | '));
console.log('years:', yearRows.map((y) => `${y.year}:r=${y.r == null ? '-' : y.r.toFixed(3)},p=${y.p == null ? '-' : y.p.toFixed(3)}`).join(' | '));
