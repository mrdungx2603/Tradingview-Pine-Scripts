// Tải nến lịch sử từ TradingView và lưu ra CSV.
// Cách dùng (chạy trong thư mục này sau khi `npm install`):
//   node --env-file=../../../.env fetch_daily.mjs --symbol DJ:DJI --timeframe D --from 1990-01-01 --out ../../us30_streak/data/dji_d1.csv
// Biến môi trường SESSION và SIGNATURE là cookie sessionid / sessionid_sign của TradingView.
// Không in cookie ra màn hình.
import { getCandles } from '@mathieuc/tradingview';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const symbol = arg('symbol');
const timeframe = arg('timeframe', 'D');
const from = arg('from', '1990-01-01');
const out = arg('out');
if (!symbol || !out) {
  console.error('Thiếu --symbol hoặc --out');
  process.exit(1);
}
if (!process.env.SESSION || !process.env.SIGNATURE) {
  console.error('Thiếu SESSION hoặc SIGNATURE trong biến môi trường');
  process.exit(1);
}

const credentials = { session: process.env.SESSION, signature: process.env.SIGNATURE };
const candles = await getCandles({
  symbol,
  timeframe,
  from: new Date(from),
  to: new Date(),
  maxCount: 20000,
  credentials,
  timeoutMs: 240000,
});

const lines = ['time_utc,open,high,low,close,volume'];
for (const c of candles) {
  lines.push([new Date(c.time * 1000).toISOString(), c.open, c.high, c.low, c.close, c.volume ?? ''].join(','));
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, lines.join('\n') + '\n');
console.log(`${symbol} ${timeframe}: ${candles.length} nến, ${lines.at(1)?.slice(0, 25)} → ${lines.at(-1)?.slice(0, 25)} → ${out}`);
