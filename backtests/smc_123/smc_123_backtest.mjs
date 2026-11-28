// Nghiên cứu: mô hình đảo chiều 1-2-3 trên VN30F1 (HNX:VN301!), so sánh cách kích hoạt điểm 1
// (phá Trendline vs CHoCH) và tác dụng của các bộ lọc SMC tại điểm 2.
// Chạy: node backtests/smc_123/smc_123_backtest.mjs   (đọc data/*.csv, ghi results.json)
//
// Định nghĩa (setup SHORT, LONG đối xứng):
//   Phiên: Session Seed giống smc_market_structure.pine — cấu trúc reset mỗi ngày, chỉ nến khớp lệnh liên tục.
//   Pivot K nến mỗi bên, pivot tại p chỉ được biết ở nến p+K (không nhìn trước).
//   Trigger điểm 1:
//     - CHoCH : đang tăng (2 swing high + 2 swing low gần nhất đều cao dần), đóng cửa < HL gần nhất.
//     - TL    : trendline tăng nối 2 pivot low tăng dần, không nến nào giữa 2 điểm có low dưới đường;
//               nến đóng cửa dưới đường (sau khi pivot thứ 2 đã xác nhận) = phá trendline.
//   Điểm 1 = high cao nhất từ đáy neo (HL bị phá / pivot neo thứ 2 của TL) đến nến phá.
//   Mức xác nhận C = low thấp nhất từ điểm 1 đến trước nhịp hồi.
//   Điểm 2 = high cao nhất của nhịp hồi sau C. Hai cách nhận điểm 2:
//     - pivot : điểm 2 phải là pivot high đã xác nhận (đúng spec, trễ K nến).
//     - fast  : điểm 2 = high cao nhất sau C, hồi ≥ 23,6% chân (P1−C) và cách C ≥ 2 nến; được "xác nhận"
//               chính bởi nến phá C (không repaint, implement được trong Pine).
//   Điểm 3 = nến đóng cửa < C khi đã có điểm 2 → tín hiệu SELL, vào lệnh tại giá đóng nến đó.
//   Hủy: strict — high > P1 trước điểm 3.  2B — chỉ hủy khi đóng cửa > P1 (râu quét P1 được chấp nhận).
//   Hết hạn: quá W nến từ trigger mà chưa có điểm 3, hoặc hết phiên.
// Kết quả lệnh: SL = P2 + buf×ATR. TP 1R / 2R / measured move (C − (P1 − C)). Cùng nến chạm SL và TP
//   thì tính SL trước (bảo thủ). Không chạm gì thì đóng ở nến cuối phiên. Phí giả định COST điểm/lệnh.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const W = 60;          // số nến tối đa chờ điểm 3 kể từ trigger
const COST = 0.5;      // điểm/lệnh khứ hồi (phí + trượt giá) — giả định
const MIN_RET = 0.236; // hồi tối thiểu của điểm 2 ở chế độ fast
const CONFL = 10;      // ±nến để coi 2 trigger cùng chiều là hợp lưu
const BUFS = [0, 0.25, 0.5];
const MAIN_BUF = 0.25;

// ---------- dữ liệu ----------
function loadCsv(files) {
  const map = new Map();
  for (const f of files) {
    for (const line of readFileSync(join(HERE, f), 'utf8').trim().split('\n').slice(1)) {
      const [t, o, h, l, c, v] = line.split(',');
      map.set(t, { t, date: t.slice(0, 10), hm: t.slice(11, 16), o: +o, h: +h, l: +l, c: +c, v: +v });
    }
  }
  return [...map.values()].sort((a, b) => (a.t < b.t ? -1 : 1)).filter((b) => b.o > 0 && b.h > 0 && b.l > 0 && b.c > 0);
}
const inRegular = (hm) => (hm >= '02:00' && hm < '04:30') || (hm >= '06:00' && hm <= '07:45');
const localHm = (hm) => {
  const [h, m] = hm.split(':').map(Number);
  return String((h + 7) % 24).padStart(2, '0') + ':' + String(m).padStart(2, '0');
};
const timeBucket = (hm) => {
  const l = localHm(hm);
  return l < '10:00' ? '09:00–10:00' : l < '11:30' ? '10:00–11:30' : l < '14:00' ? '13:00–14:00' : '14:00–14:45';
};

// ---------- thống kê ----------
function wilson(k, n) {
  const z = 1.96, p = k / n, d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d;
  const w = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [c - w, c + w];
}
const rate = (k, n) => (n ? { k, n, pct: (k / n) * 100, lo: wilson(k, n)[0] * 100, hi: wilson(k, n)[1] * 100 } : null);
function meanCi(xs) {
  const n = xs.length;
  if (!n) return null;
  const m = xs.reduce((s, x) => s + x, 0) / n;
  const sd = n > 1 ? Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (n - 1)) : 0;
  const e = n > 1 ? (1.96 * sd) / Math.sqrt(n) : 0;
  return { n, mean: m, lo: m - e, hi: m + e };
}

// ---------- mô phỏng lệnh ----------
// dir=+1 long, -1 short. Trả R ròng (đã trừ COST) và kết quả.
function simTrade(S, s, dir, entry, sl, tp) {
  const risk = Math.abs(entry - sl);
  for (let j = s + 1; j < S.length; j++) {
    const b = S[j];
    const hitSl = dir < 0 ? b.h >= sl : b.l <= sl;
    const hitTp = dir < 0 ? b.l <= tp : b.h >= tp;
    if (hitSl) return { res: 'sl', r: (-risk - COST) / risk, bars: j - s };
    if (hitTp) return { res: 'tp', r: (Math.abs(tp - entry) - COST) / risk, bars: j - s };
  }
  const exit = S.at(-1).c;
  return { res: 'eod', r: ((exit - entry) * dir - COST) / risk, bars: S.length - 1 - s };
}
function tradeSet(S, s, dir, entry, p1, c, p2, atr) {
  const out = {};
  for (const buf of BUFS) {
    const sl = p2 - dir * buf * atr;
    const risk = Math.abs(entry - sl);
    out[`buf${buf}`] = {
      risk,
      tp1R: simTrade(S, s, dir, entry, sl, entry + dir * risk),
      tp2R: simTrade(S, s, dir, entry, sl, entry + 2 * dir * risk),
      tpMM: simTrade(S, s, dir, entry, sl, c + dir * Math.abs(p1 - c)),
    };
  }
  return out;
}

// ---------- phân tích 1 phiên ----------
function analyzeSession(S, date, K, signals, funnel) {
  const n = S.length;
  const isPH = new Array(n).fill(false), isPL = new Array(n).fill(false);
  for (let p = K; p < n - K; p++) {
    let h = true, l = true;
    for (let k = p - K; k <= p + K; k++) {
      if (k === p) continue;
      if (S[k].h >= S[p].h) h = false;
      if (S[k].l <= S[p].l) l = false;
    }
    isPH[p] = h; isPL[p] = l;
  }
  const atr = new Array(n).fill(null), vwap = new Array(n);
  let vn = 0, vd = 0;
  for (let t = 0; t < n; t++) {
    const b = S[t];
    vn += ((b.h + b.l + b.c) / 3) * b.v; vd += b.v;
    vwap[t] = vd ? vn / vd : b.c;
    const trs = [];
    for (let k = Math.max(1, t - 13); k <= t; k++) {
      trs.push(Math.max(S[k].h - S[k].l, Math.abs(S[k].h - S[k - 1].c), Math.abs(S[k].l - S[k - 1].c)));
    }
    atr[t] = trs.length >= 5 ? trs.reduce((s, x) => s + x, 0) / trs.length : null;
  }
  const maxH = (a, b) => { let m = -Infinity; for (let i = a; i <= b; i++) m = Math.max(m, S[i].h); return m; };
  const minL = (a, b) => { let m = Infinity; for (let i = a; i <= b; i++) m = Math.min(m, S[i].l); return m; };

  // Swing cho CHoCH (gộp swing cùng loại liên tiếp, giữ cực trị) — giống smc_choch_backtest.mjs
  const swings = [];
  let nextId = 0;
  const consumed = new Set();
  const addSwing = (type, price, bar) => {
    const last = swings.at(-1);
    if (last && last.type === type) {
      if (type === 'H' ? price > last.price : price < last.price) Object.assign(last, { price, bar, id: nextId++ });
      return;
    }
    swings.push({ id: nextId++, type, price, bar });
  };
  const pLows = [], pHighs = [];
  let upLine = null, dnLine = null; // {b1,p1,b2,p2,slope}
  const lineAt = (ln, x) => ln.p2 + ln.slope * (x - ln.b2);
  const triggers = []; // {trig, dir, t, anchor}

  // Tìm trendline hợp lệ mới nhất cho pivot vừa xác nhận
  function buildLine(list, last, t, up) {
    for (let i = list.length - 2; i >= 0; i--) {
      const a = list[i];
      if (up ? a.price >= last.price : a.price <= last.price) continue;
      const slope = (last.price - a.price) / (last.bar - a.bar);
      let ok = true;
      for (let k = a.bar + 1; k < last.bar && ok; k++) {
        const v = a.price + slope * (k - a.bar);
        if (up ? S[k].l < v - 1e-9 : S[k].h > v + 1e-9) ok = false;
      }
      for (let k = last.bar + 1; k <= t && ok; k++) {
        const v = a.price + slope * (k - a.bar);
        if (up ? S[k].c < v : S[k].c > v) ok = false; // đã bị phá trước khi biết đường
      }
      if (ok) return { b1: a.bar, p1: a.price, b2: last.bar, p2: last.price, slope };
    }
    return null;
  }

  for (let t = 0; t < n; t++) {
    const b = S[t];
    const p = t - K;
    if (p >= K) {
      if (isPH[p]) { addSwing('H', S[p].h, p); pHighs.push({ bar: p, price: S[p].h }); const ln = buildLine(pHighs, pHighs.at(-1), t, false); if (ln) dnLine = ln; }
      if (isPL[p]) { addSwing('L', S[p].l, p); pLows.push({ bar: p, price: S[p].l }); const ln = buildLine(pLows, pLows.at(-1), t, true); if (ln) upLine = ln; }
    }
    // Trendline break
    if (upLine && b.c < lineAt(upLine, t)) {
      triggers.push({ trig: 'TL', dir: -1, t, anchor: upLine.b2, slope_atr: atr[t] ? upLine.slope / atr[t] : null });
      upLine = null;
    }
    if (dnLine && b.c > lineAt(dnLine, t)) {
      triggers.push({ trig: 'TL', dir: 1, t, anchor: dnLine.b2, slope_atr: atr[t] ? -dnLine.slope / atr[t] : null });
      dnLine = null;
    }
    // CHoCH
    const highs = swings.filter((s) => s.type === 'H'), lows = swings.filter((s) => s.type === 'L');
    if (highs.length >= 2 && lows.length >= 2) {
      const sh = highs.at(-1), ph = highs.at(-2), sl = lows.at(-1), pl = lows.at(-2);
      const trend = sh.price > ph.price && sl.price > pl.price ? 1 : sh.price < ph.price && sl.price < pl.price ? -1 : 0;
      if (trend === 1 && b.c < sl.price && !consumed.has(sl.id)) { consumed.add(sl.id); triggers.push({ trig: 'CHoCH', dir: -1, t, anchor: sl.bar }); }
      if (trend === -1 && b.c > sh.price && !consumed.has(sh.id)) { consumed.add(sh.id); triggers.push({ trig: 'CHoCH', dir: 1, t, anchor: sh.bar }); }
    }
  }

  // Chạy state machine 1-2-3 cho từng cấu hình. Mỗi (trig, dir) chỉ 1 setup hoạt động cùng lúc.
  for (const trig of ['CHoCH', 'TL']) {
    for (const p1rule of ['strict', '2B']) {
      for (const p2mode of ['pivot', 'fast']) {
        const cfg = `${trig}|${p1rule}|${p2mode}`;
        const f = (funnel[cfg] ||= { triggers: 0, skipped_busy: 0, cancel_p1: 0, expired: 0, signals: 0 });
        const busyUntil = { '-1': -1, '1': -1 };
        for (const tr of triggers.filter((x) => x.trig === trig)) {
          f.triggers++;
          if (tr.t <= busyUntil[tr.dir]) { f.skipped_busy++; continue; }
          const d = tr.dir; // -1 short
          const ext = (i) => (d < 0 ? S[i].h : S[i].l);   // cực trị phía điểm 1/2
          const opp = (i) => (d < 0 ? S[i].l : S[i].h);   // cực trị phía C
          const beyond = (x, lvl) => (d < 0 ? x > lvl : x < lvl);
          let p1 = d < 0 ? maxH(tr.anchor, tr.t) : minL(tr.anchor, tr.t);
          let p1bar = tr.anchor;
          for (let i = tr.anchor; i <= tr.t; i++) if (ext(i) === p1) { p1bar = i; }
          let c = opp(p1bar), cBar = p1bar;
          for (let i = p1bar; i <= tr.t; i++) if (beyond(c, opp(i))) { c = opp(i); cBar = i; }
          let p2 = null, p2bar = null, p2conf = false;
          let end = null, outcome = 'expired';
          const last = Math.min(n - 1, tr.t + W);
          for (let j = tr.t + 1; j <= last; j++) {
            const bj = S[j];
            // hủy do vượt điểm 1
            if (p1rule === 'strict' ? beyond(ext(j), p1) : beyond(bj.c, p1)) { outcome = 'cancel_p1'; end = j; break; }
            // điểm 3: đóng cửa vượt C khi đã có điểm 2 hợp lệ
            const closesThrough = d < 0 ? bj.c < c : bj.c > c;
            if (p2 !== null && closesThrough) {
              const leg = Math.abs(p1 - c);
              const ret = leg > 0 ? Math.abs(p2 - c) / leg : 0;
              const okFast = p2mode === 'fast' && ret >= MIN_RET && p2bar - cBar >= 2;
              const okPivot = p2mode === 'pivot' && p2conf;
              if (okFast || okPivot) { outcome = 'signal'; end = j; break; }
            }
            // cập nhật C khi giá đi tiếp theo chiều phá (chưa có điểm 2 hợp lệ)
            if (beyond(c, opp(j))) { c = opp(j); cBar = j; p2 = null; p2bar = null; p2conf = false; continue; }
            // cập nhật điểm 2 = cực trị nhịp hồi sau C
            if (p2 === null || beyond(ext(j), p2)) { p2 = ext(j); p2bar = j; p2conf = false; }
            // pivot xác nhận cho điểm 2 (chế độ pivot)
            const pp = j - K;
            if (pp === p2bar && pp - K >= 0 && (d < 0 ? isPH[pp] : isPL[pp])) p2conf = true;
          }
          if (outcome === 'expired') end = last;
          busyUntil[d] = end;
          f[outcome]++;
          if (outcome !== 'signal') continue;
          const s = end, entry = S[s].c, a = atr[s] ?? atr[tr.t];
          if (!a) continue;
          // Bộ lọc
          const leg = Math.abs(p1 - c);
          let fvgTouch = false;
          for (let i = Math.max(p1bar + 2, 2); i <= cBar; i++) {
            const isFvg = d < 0 ? S[i].h < S[i - 2].l : S[i].l > S[i - 2].h;
            const zoneEdge = d < 0 ? S[i].h : S[i].l; // mép gần của FVG
            if (isFvg && (d < 0 ? p2 >= zoneEdge : p2 <= zoneEdge)) { fvgTouch = true; break; }
          }
          const other = trig === 'CHoCH' ? 'TL' : 'CHoCH';
          const confl = triggers.some((x) => x.trig === other && x.dir === d && Math.abs(x.t - tr.t) <= CONFL);
          signals.push({
            cfg, trig, p1rule, p2mode, date, K,
            dir: d < 0 ? 'short' : 'long',
            t: tr.t, s, time: S[s].t, local: localHm(S[s].hm),
            p1, c, p2, entry,
            retrace: leg > 0 ? Math.abs(p2 - c) / leg : null,
            leg_atr: leg / a,
            bars_wait: s - tr.t,
            sweep: beyond(p2, p1),
            fvg_touch: fvgTouch,
            vwap_side: (d < 0 ? entry < vwap[s] : entry > vwap[s]) ? 'thuận VWAP' : 'ngược VWAP',
            bucket: timeBucket(S[s].hm),
            confluence: confl,
            slope_atr: tr.slope_atr ?? null,
            trades: tradeSet(S, s, d, entry, p1, c, p2, a),
          });
        }
      }
    }
  }
}

// Đối chứng: vào lệnh tại mọi nến (cả 2 chiều), SL = cực trị 10 nến gần nhất + buf×ATR.
function nullBaseline(sessions) {
  const acc = { tp1R: [], tp2R: [], gross1R: [], risk: [] };
  for (const S of sessions) {
    for (let s = 14; s < S.length - 5; s += 3) {
      const trs = [];
      for (let k = s - 13; k <= s; k++) trs.push(Math.max(S[k].h - S[k].l, Math.abs(S[k].h - S[k - 1].c), Math.abs(S[k].l - S[k - 1].c)));
      const a = trs.reduce((x, y) => x + y, 0) / trs.length;
      let hi = -Infinity, lo = Infinity;
      for (let k = s - 9; k <= s; k++) { hi = Math.max(hi, S[k].h); lo = Math.min(lo, S[k].l); }
      const e = S[s].c;
      for (const [d, sl] of [[-1, hi + MAIN_BUF * a], [1, lo - MAIN_BUF * a]]) {
        const risk = Math.abs(e - sl);
        if (risk <= 0) continue;
        const r1 = simTrade(S, s, d, e, sl, e + d * risk).r;
        acc.tp1R.push(r1);
        acc.gross1R.push(r1 + COST / risk);
        acc.risk.push(risk);
        acc.tp2R.push(simTrade(S, s, d, e, sl, e + 2 * d * risk).r);
      }
    }
  }
  return { tp1R: meanCi(acc.tp1R), tp2R: meanCi(acc.tp2R), gross1R: meanCi(acc.gross1R), risk_pts: meanCi(acc.risk) };
}

function summarize(list, buf = MAIN_BUF) {
  const key = `buf${buf}`;
  const o = { n: list.length, risk_pts: meanCi(list.map((x) => x.trades[key].risk)) };
  for (const tp of ['tp1R', 'tp2R', 'tpMM']) {
    const rs = list.map((x) => ({ ...x.trades[key][tp], risk: x.trades[key].risk }));
    o[tp] = {
      win: rate(rs.filter((r) => r.res === 'tp' || (r.res === 'eod' && r.r > 0)).length, rs.length),
      exp_r: meanCi(rs.map((r) => r.r)),
      exp_r_gross: meanCi(rs.map((r) => r.r + COST / r.risk)),
    };
  }
  return o;
}

const FACTORS = {
  dir: (e) => e.dir,
  retrace: (e) => (e.retrace == null ? null : e.retrace < 0.382 ? '< 38,2%' : e.retrace < 0.618 ? '38,2–61,8%' : '≥ 61,8%'),
  fvg_touch: (e) => (e.fvg_touch ? 'P2 chạm FVG' : 'không chạm FVG'),
  sweep: (e) => (e.sweep ? 'P2 quét P1 (2B)' : 'P2 < P1'),
  vwap_side: (e) => e.vwap_side,
  bucket: (e) => e.bucket,
  confluence: (e) => (e.confluence ? 'có hợp lưu TL+CHoCH' : 'không hợp lưu'),
  leg_atr: (e) => (e.leg_atr < 2 ? 'chân < 2 ATR' : e.leg_atr < 4 ? 'chân 2–4 ATR' : 'chân ≥ 4 ATR'),
  slope_atr: (e) => (e.slope_atr == null ? null : e.slope_atr < 0.05 ? 'TL dốc < 0,05 ATR/nến' : e.slope_atr < 0.15 ? 'TL dốc 0,05–0,15' : 'TL dốc ≥ 0,15'),
};

// ---------- chạy ----------
// 2026-11-28: đổi nguồn dữ liệu sang MySQL (ohlc_candles, VN30F1M) — full 6 tháng thật
// (28874 nến 1m, 26/05–26/11/2026) thay cho CSV export TradingView bị giới hạn 5000 nến (~1 tháng).
// MySQL chỉ có sẵn 1m/1d -> khung 3m được resample từ 1m (gộp mỗi 3 nến theo mốc đồng hồ UTC,
// xem backtests/smc_123/data/vn30f1m_m3.csv). Chưa resample 5m ở lần chạy này.
const DATASETS = [
  { name: '1m', files: ['data/vn30f1m_m1.csv'] },
  { name: '3m', files: ['data/vn30f1m_m3.csv'] },
];
const KS = [3, 5];
const results = { params: { W, COST, MIN_RET, CONFL, BUFS, MAIN_BUF, KS }, datasets: {} };

for (const ds of DATASETS) {
  const bars = loadCsv(ds.files).filter((b) => inRegular(b.hm));
  const bySession = new Map();
  for (const b of bars) (bySession.get(b.date) ?? bySession.set(b.date, []).get(b.date)).push(b);
  const sessions = [...bySession.entries()].filter(([, S]) => S.length >= 30);
  const dates = sessions.map(([d]) => d);
  const mid = dates[Math.floor(dates.length / 2)];
  const dsOut = { bars: bars.length, sessions: sessions.length, date_range: [dates[0], dates.at(-1)], split_cutoff: mid, null_baseline: nullBaseline(sessions.map(([, S]) => S)), byK: {} };
  for (const K of KS) {
    const signals = [], funnel = {};
    for (const [date, S] of sessions) analyzeSession(S, date, K, signals, funnel);
    const configs = {};
    for (const cfg of Object.keys(funnel)) {
      const list = signals.filter((x) => x.cfg === cfg);
      const factors = {};
      for (const [name, fn] of Object.entries(FACTORS)) {
        const g = {};
        for (const e of list) { const k = fn(e); if (k != null) (g[k] ||= []).push(e); }
        factors[name] = Object.entries(g).map(([label, l]) => ({ label, ...summarize(l) }));
      }
      configs[cfg] = {
        funnel: funnel[cfg],
        all: summarize(list),
        by_buf: Object.fromEntries(BUFS.map((b) => [b, summarize(list, b)])),
        split: { first: summarize(list.filter((x) => x.date < mid)), second: summarize(list.filter((x) => x.date >= mid)) },
        median_bars_wait: list.length ? list.map((x) => x.bars_wait).sort((a, b) => a - b)[Math.floor(list.length / 2)] : null,
        factors,
      };
    }
    dsOut.byK[K] = { configs, signals_detail: signals.map(({ trades, ...rest }) => ({ ...rest, r_main: { tp1R: trades[`buf${MAIN_BUF}`].tp1R.r, tp2R: trades[`buf${MAIN_BUF}`].tp2R.r, tpMM: trades[`buf${MAIN_BUF}`].tpMM.r } })) };
  }
  results.datasets[ds.name] = dsOut;
}

writeFileSync(join(HERE, 'results.json'), JSON.stringify(results, null, 2));

// ---------- in tóm tắt ----------
const f1 = (x) => (x == null ? '  —  ' : x.toFixed(2).padStart(5));
for (const [name, ds] of Object.entries(results.datasets)) {
  console.log(`\n=== ${name}: ${ds.sessions} phiên ${ds.date_range.join(' → ')} | null 1R ${f1(ds.null_baseline.tp1R.mean)} 2R ${f1(ds.null_baseline.tp2R.mean)}`);
  for (const [K, r] of Object.entries(ds.byK)) {
    for (const [cfg, c] of Object.entries(r.configs)) {
      const a = c.all, fu = c.funnel;
      console.log(`K=${K} ${cfg.padEnd(20)} trig=${String(fu.triggers).padStart(3)} huỷP1=${String(fu.cancel_p1).padStart(3)} hếthạn=${String(fu.expired).padStart(3)} sig=${String(a.n).padStart(3)} | 1R win ${a.tp1R.win ? a.tp1R.win.pct.toFixed(0).padStart(3) : ' — '}% E=${f1(a.tp1R.exp_r?.mean)} | 2R E=${f1(a.tp2R.exp_r?.mean)} | MM E=${f1(a.tpMM.exp_r?.mean)} | nửa1 ${f1(c.split.first.tp1R.exp_r?.mean)} nửa2 ${f1(c.split.second.tp1R.exp_r?.mean)}`);
    }
  }
}
