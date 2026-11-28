// Nghiên cứu: sau CHoCH trên VN30F1 khung 1 phút, state machine BOS xác định thành công / thất bại.
// Chạy: node backtests/smc_choch/smc_choch_backtest.mjs  (đọc data/vn301_m1.csv, ghi results.json)
//
// Phát hiện CHoCH bám smc_market_structure.pine:
//   - Seed Session: cấu trúc reset mỗi phiên, chỉ dùng nến trong giờ khớp lệnh liên tục.
//   - Pivot K nến mỗi bên, chỉ xác nhận sau K nến (không nhìn trước).
//   - Xu hướng tăng: đỉnh và đáy gần nhất đều cao hơn cặp trước (HH + HL). Giảm: đối xứng.
//   - CHoCH giảm: đang tăng, đóng cửa dưới HL gần nhất. Mức vô hiệu = HH gần nhất.
//   - CHoCH tăng: đối xứng với LH.
//
// State machine sau mỗi CHoCH (bắt đầu tại bar t):
//   WAIT : chưa có pivot ngược chiều nào hình thành sau t.
//   REF  : pivot đầu tiên sau t đã xác nhận. Với CHoCH giảm, ref = đáy pivot thấp nhất sau t.
//          Với CHoCH tăng, ref = đỉnh pivot cao nhất sau t. Pivot mới cực hơn thì thay ref.
//   Chuyển trạng thái (xét từng nến đóng j):
//     - Đóng cửa phía ngược vô hiệu (CHoCH giảm: đóng > HH; tăng: đóng < LL)      → FAIL
//     - Đang REF và đóng cửa phá ref theo chiều CHoCH                             → SUCCESS (BOS)
//     - Hết H nến                                                                  → TIMEOUT
//   Pivot hình thành tại p chỉ xác nhận lúc j = p + K, nên xét tại j dùng pivot p = j - K.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const K = 5;               // pivot mỗi bên, giống pivotLength mặc định của indicator
const H = 60;              // số nến tối đa chờ BOS hoặc vô hiệu
const NULL_LOOKBACK = 20;  // đối chứng: mức vô hiệu là cực trị ngược chiều 20 nến gần nhất

function loadCsv(file) {
  return readFileSync(join(HERE, 'data', file), 'utf8').trim().split('\n').slice(1).map((line) => {
    const [t, o, h, l, c, v] = line.split(',');
    return { t, date: t.slice(0, 10), hm: t.slice(11, 16), o: +o, h: +h, l: +l, c: +c, v: +v };
  });
}

// Giờ khớp lệnh liên tục (UTC): 9:00–11:30 VN = 02:00–04:30 UTC; 13:00–14:45 VN = 06:00–07:45 UTC.
const inRegular = (hm) => (hm >= '02:00' && hm < '04:30') || (hm >= '06:00' && hm <= '07:45');
const localHm = (hm) => {
  const [h, m] = hm.split(':').map(Number);
  return String((h + 7) % 24).padStart(2, '0') + ':' + String(m).padStart(2, '0');
};
const timeBucket = (hm) => {
  const l = localHm(hm);
  if (l < '10:00') return '09:00–10:00';
  if (l < '11:30') return '10:00–11:30';
  if (l < '14:00') return '13:00–14:00';
  return '14:00–14:45';
};

function wilson(k, n) {
  const z = 1.96, p = k / n, d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d;
  const w = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [c - w, c + w];
}
const rate = (k, n) => {
  if (!n) return null;
  const [lo, hi] = wilson(k, n);
  return { k, n, pct: (k / n) * 100, lo: lo * 100, hi: hi * 100 };
};

function isPivotHigh(S, p) {
  for (let k = p - K; k <= p + K; k++) if (k !== p && S[k].h >= S[p].h) return false;
  return true;
}
function isPivotLow(S, p) {
  for (let k = p - K; k <= p + K; k++) if (k !== p && S[k].l <= S[p].l) return false;
  return true;
}

// State machine BOS. dir = 'short' (CHoCH giảm) hoặc 'long' (CHoCH tăng).
function bosTrack(S, t, dir, inval) {
  let ref = null;
  const last = Math.min(S.length - 1, t + H);
  for (let j = t + 1; j <= last; j++) {
    const p = j - K;
    if (p > t && p - K >= 0) {
      if (dir === 'short' && isPivotLow(S, p)) ref = ref === null ? S[p].l : Math.min(ref, S[p].l);
      if (dir === 'long' && isPivotHigh(S, p)) ref = ref === null ? S[p].h : Math.max(ref, S[p].h);
    }
    const c = S[j].c;
    if (dir === 'short') {
      if (c > inval) return { res: 'fail', bar: j };
      if (ref !== null && c < ref) return { res: 'success', bar: j };
    } else {
      if (c < inval) return { res: 'fail', bar: j };
      if (ref !== null && c > ref) return { res: 'success', bar: j };
    }
  }
  return { res: 'timeout', bar: null, censored: t + H > S.length - 1 };
}

function analyzeSession(S, date, events) {
  const swings = [];
  let nextId = 0;
  const consumed = new Set();
  let vwapNum = 0, vwapDen = 0;
  const addSwing = (type, price, bar) => {
    const last = swings.at(-1);
    if (last && last.type === type) {
      const better = type === 'H' ? price > last.price : price < last.price;
      if (better) { last.price = price; last.bar = bar; last.id = nextId++; }
      return;
    }
    swings.push({ id: nextId++, type, price, bar });
  };

  for (let t = 0; t < S.length; t++) {
    const b = S[t];
    vwapNum += ((b.h + b.l + b.c) / 3) * b.v;
    vwapDen += b.v;
    const vwap = vwapDen ? vwapNum / vwapDen : b.c;

    const p = t - K;
    if (p >= K) {
      if (isPivotHigh(S, p)) addSwing('H', S[p].h, p);
      if (isPivotLow(S, p)) addSwing('L', S[p].l, p);
    }

    const highs = swings.filter((s) => s.type === 'H');
    const lows = swings.filter((s) => s.type === 'L');
    if (highs.length < 2 || lows.length < 2) continue;
    const sh = highs.at(-1), ph = highs.at(-2), sl = lows.at(-1), pl = lows.at(-2);
    const trend = sh.price > ph.price && sl.price > pl.price ? 1
      : sh.price < ph.price && sl.price < pl.price ? -1 : 0;
    if (trend === 0) continue;

    let dir = null, inval = null, brokenId = null;
    if (trend === 1 && b.c < sl.price && !consumed.has(sl.id)) {
      dir = 'short'; inval = sh.price; brokenId = sl.id;
    } else if (trend === -1 && b.c > sh.price && !consumed.has(sh.id)) {
      dir = 'long'; inval = sl.price; brokenId = sh.id;
    }
    if (!dir) continue;
    consumed.add(brokenId);

    const state = bosTrack(S, t, dir, inval);

    const prevVols = S.slice(Math.max(0, t - 20), t).map((x) => x.v);
    const volAvg = prevVols.length ? prevVols.reduce((s, x) => s + x, 0) / prevVols.length : null;
    const trs = [];
    for (let k = Math.max(1, t - 13); k <= t; k++) {
      trs.push(Math.max(S[k].h - S[k].l, Math.abs(S[k].h - S[k - 1].c), Math.abs(S[k].l - S[k - 1].c)));
    }
    const atr = trs.length >= 5 ? trs.reduce((s, x) => s + x, 0) / trs.length : null;
    const leg = Math.abs(sh.price - sl.price);

    events.push({
      date, t, time: b.t, hm: b.hm, local: localHm(b.hm),
      dir: dir === 'short' ? 'bear' : 'bull',
      close: b.c, inval,
      leg_atr: atr ? leg / atr : null,
      vol_ratio: volAvg ? b.v / volAvg : null,
      body_ratio: b.h > b.l ? Math.abs(b.c - b.o) / (b.h - b.l) : null,
      side: b.c >= vwap ? 'trên VWAP' : 'dưới VWAP',
      bucket: timeBucket(b.hm),
      bos: state.res,
      bos_bars: state.bar === null ? null : state.bar - t,
      censored: !!state.censored,
    });
  }
}

// Đối chứng: cùng state machine, điểm xuất phát bất kỳ, cả hai chiều,
// mức vô hiệu là cực trị ngược chiều của NULL_LOOKBACK nến gần nhất. Không dùng CHoCH.
function nullTally(bySession) {
  const c = { success: 0, fail: 0, timeout: 0 };
  for (const S of bySession.values()) {
    for (let t = NULL_LOOKBACK; t + H < S.length; t++) {
      const win = S.slice(t - NULL_LOOKBACK, t + 1);
      const hiMax = Math.max(...win.map((x) => x.h));
      const loMin = Math.min(...win.map((x) => x.l));
      c[bosTrack(S, t, 'short', hiMax).res]++;
      c[bosTrack(S, t, 'long', loMin).res]++;
    }
  }
  return { ...c, success_rate: rate(c.success, c.success + c.fail) };
}

function tallyBos(list) {
  const c = { success: 0, fail: 0, timeout: 0 };
  for (const e of list) c[e.bos]++;
  const res = c.success + c.fail;
  const sb = list.filter((e) => e.bos === 'success').map((e) => e.bos_bars).sort((a, b) => a - b);
  return {
    n: list.length, ...c,
    censored: list.filter((e) => e.censored).length,
    resolved: res,
    success_rate: rate(c.success, res),
    median_bars_to_bos: sb.length ? sb[Math.floor(sb.length / 2)] : null,
  };
}

// ---- Chạy ----
const bars = loadCsv('vn301_m1.csv').filter((b) => inRegular(b.hm));
const bySession = new Map();
for (const b of bars) {
  if (!bySession.has(b.date)) bySession.set(b.date, []);
  bySession.get(b.date).push(b);
}
const events = [];
for (const [date, S] of bySession) {
  if (S.length >= 2 * K + 5) analyzeSession(S, date, events);
}

const buckets = {
  dir: (e) => e.dir,
  side: (e) => e.side,
  bucket: (e) => e.bucket,
  leg_atr: (e) => (e.leg_atr == null ? null : e.leg_atr < 1 ? '< 1 ATR' : e.leg_atr < 2 ? '1–2 ATR' : '≥ 2 ATR'),
  vol_ratio: (e) => (e.vol_ratio == null ? null : e.vol_ratio < 1 ? '< 1× TB' : e.vol_ratio < 1.5 ? '1–1,5× TB' : '≥ 1,5× TB'),
  body_ratio: (e) => (e.body_ratio == null ? null : e.body_ratio < 0.5 ? 'thân < 50%' : 'thân ≥ 50%'),
};
const by_factor = {};
for (const [name, fn] of Object.entries(buckets)) {
  const groups = {};
  for (const e of events) {
    const k = fn(e);
    if (k == null) continue;
    (groups[k] ||= []).push(e);
  }
  by_factor[name] = Object.entries(groups).map(([label, list]) => ({ label, ...tallyBos(list) }));
}

const dates = [...bySession.keys()].sort();
const mid = dates[Math.floor(dates.length / 2)];

const results = {
  generated_from: 'data/vn301_m1.csv',
  bars: bars.length,
  sessions: bySession.size,
  date_range: [dates[0], dates.at(-1)],
  params: { K, H, seed: 'session', regular_hours_utc: ['02:00–04:30', '06:00–07:45'], null_lookback: NULL_LOOKBACK },
  events: events.length,
  overall: tallyBos(events),
  null_baseline: nullTally(bySession),
  by_dir: by_factor.dir,
  by_factor,
  split: {
    cutoff: mid,
    first_half: tallyBos(events.filter((e) => e.date < mid)),
    second_half: tallyBos(events.filter((e) => e.date >= mid)),
  },
  events_detail: events,
};

writeFileSync(join(HERE, 'results.json'), JSON.stringify(results, null, 2));
const o = results.overall;
const nb = results.null_baseline;
console.log(`sessions=${results.sessions} bars=${results.bars} CHoCH=${o.n} success=${o.success} fail=${o.fail} timeout=${o.timeout} censored=${o.censored}`);
console.log(`BOS trước vô hiệu: ${o.success_rate?.pct.toFixed(1)}% (n=${o.resolved}) [${o.success_rate?.lo.toFixed(1)}; ${o.success_rate?.hi.toFixed(1)}]`);
console.log(`đối chứng ngẫu nhiên: ${nb.success_rate?.pct.toFixed(1)}% (n=${nb.success_rate?.n}) [${nb.success_rate?.lo.toFixed(1)}; ${nb.success_rate?.hi.toFixed(1)}]`);
for (const d of by_factor.dir) console.log(`hướng ${d.label}: n=${d.n} BOS=${d.success_rate?.pct.toFixed(1)}% (${d.success}/${d.resolved})`);
console.log(`nửa đầu ${results.split.first_half.success_rate?.pct.toFixed(1)}% (${results.split.first_half.resolved}), nửa sau ${results.split.second_half.success_rate?.pct.toFixed(1)}% (${results.split.second_half.resolved}), cắt ${mid}`);
