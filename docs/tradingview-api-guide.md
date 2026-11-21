# Hướng Dẫn Lấy Dữ Liệu Lịch Sử TradingView Cho Research

Tài liệu này mô tả cách lấy nến lịch sử từ TradingView bằng thư viện `@mathieuc/tradingview` (repo: https://github.com/Mathieu2301/TradingView-API), để dùng làm dữ liệu cho báo cáo trong `docs/reports/`.

> Thư viện không chính thức, đi qua websocket của TradingView. TradingView có thể đổi giao thức hoặc hạn chế truy cập tự động, nên hãy kiểm tra lại khi chạy. Điều khoản sử dụng của TradingView có thể không cho phép tải dữ liệu tự động.

## 1. Chuẩn Bị

### 1.1 Cài thư viện

Thư viện đã được cài sẵn trong `backtests/common/tradingview/`. Nếu cần cài lại:

```bash
cd backtests/common/tradingview
npm install
```

Phiên bản đang dùng: `@mathieuc/tradingview` 4.1.2. Thư mục `node_modules` và `package-lock.json` đã được `.gitignore` riêng.

### 1.2 Lấy cookie đăng nhập

Không có tài khoản thì TradingView chỉ cho lịch sử rất ngắn (ví dụ khoảng 7 000 nến 1 phút). Có tài khoản thì lấy được lịch sử dài hơn, phụ thuộc gói.

1. Đăng nhập tradingview.com.
2. Mở DevTools (`Cmd + Option + I` trên macOS, `F12` trên Windows).
3. Vào **Application** (Chrome/Edge) hoặc **Storage** (Firefox), chọn **Cookies** > `https://www.tradingview.com`.
4. Sao chép giá trị của `sessionid` và `sessionid_sign`.

### 1.3 Lưu cookie vào `.env`

Đặt file `.env` ở thư mục gốc repo (đã có trong `.gitignore`, dòng 23):

```
SESSION=<giá trị sessionid>
SIGNATURE=<giá trị sessionid_sign>
```

Quy tắc bắt buộc:

- **Không dán cookie vào chat, issue, commit hay log.** Nếu lỡ lộ, đăng xuất tất cả thiết bị trên TradingView rồi lấy cookie mới.
- Cookie hết hạn khi đăng xuất hoặc TradingView làm mới phiên. Khi đó cập nhật lại `.env`.
- Kiểm tra trước khi commit: `git check-ignore -v .env` phải trả về dòng `.gitignore:23`.

## 2. Tìm Mã Đúng

Mã TradingView có dạng `SÀN:MÃ`. Mã hiển thị trên chart có thể khác mã trong API, nên luôn kiểm tra bằng thử tải.

```js
import { searchMarkets } from '@mathieuc/tradingview';
const found = await searchMarkets('DJI', { credentials });
```

Bảng mã đã kiểm tra trong repo:

| Mục đích | Mã dùng được | Lịch sử D1 lấy được |
|---|---|---|
| US30 chỉ số gốc (Dow Jones) | `DJ:DJI` | từ 02/01/1990 |
| VNINDEX | `HOSE:VNINDEX` | từ 28/07/2000 |
| US30 CFD (Capital.com) | `CAPITALCOM:US30` | từ 19/04/2015 |
| VN30 Futures (hiển thị "VN301!" trên chart) | `HNX:VN301!` | nến 1 phút: từ 22/10/2026 |

Các mã sau **không** được API nhận (trả về `SYMBOL_ERROR`): `HOSE:VN30F1!`, `HOSE:VN30F1M`, `VN30F1M`, `HNX:VN30`.

Nếu gặp `SYMBOL_ERROR`: mở chart trong TradingView, đọc ticker ở ô tên mã (ví dụ `HNX:VN301!`), rồi thử đúng chuỗi đó.

## 3. Lấy Nến Lịch Sử

### 3.1 Bằng script có sẵn (khuyến nghị)

Script `backtests/common/tradingview/fetch_daily.mjs` tải nến D1 hoặc khung khác và ghi CSV:

```bash
cd backtests/common/tradingview
node --env-file=../../../.env fetch_daily.mjs \
  --symbol DJ:DJI --timeframe D --from 1990-01-01 \
  --out ../../us30_streak/data/dji_d1.csv
```

Tham số:

| Tham số | Bắt buộc | Mặc định | Ý nghĩa |
|---|---|---|---|
| `--symbol` | có | | Mã dạng `SÀN:MÃ`. |
| `--out` | có | | Đường dẫn file CSV đầu ra. Thư mục được tạo nếu chưa có. |
| `--timeframe` | không | `D` | `1`, `5`, `15`, `60`, `240`, `D`, `W`, `M`. |
| `--from` | không | `1990-01-01` | Ngày bắt đầu, định dạng `YYYY-MM-DD`. |

Định dạng CSV: `time_utc,open,high,low,close,volume`, thời gian là mở nến theo UTC.

Lưu ý thời gian: nến D1 của `DJ:DJI` mở lúc 14:30 UTC (giờ mở cửa NYSE), còn VNINDEX mở lúc 02:00 UTC. Khi ghép hai chuỗi theo ngày, dùng cột ngày (`time_utc[0:10]`), không dùng timestamp.

### 3.2 Bằng code trực tiếp

```js
import { getCandles } from '@mathieuc/tradingview';

const credentials = { session: process.env.SESSION, signature: process.env.SIGNATURE };
const candles = await getCandles({
  symbol: 'HOSE:VNINDEX',
  timeframe: 'D',
  from: new Date('1990-01-01'),
  to: new Date(),
  maxCount: 20000,
  credentials,
  timeoutMs: 240000,
});
// candles: [{ time, open, high, low, close, volume }], time là Unix giây, cũ nhất trước
```

## 4. Giới Hạn Đã Quan Sát

- **Độ sâu lịch sử phụ thuộc mã**, không chỉ tham số. Yêu cầu từ 1990 cho `HOSE:VNINDEX` chỉ nhận từ 2000, và `CAPITALCOM:US30` chỉ từ 2015. Luôn ghi lại ngày nến đầu tiên thật sự nhận được vào báo cáo.
- **Khung 1 phút**: tài khoản đã kiểm tra chỉ nhận khoảng một tháng cho `HNX:VN301!`, dù yêu cầu từ 01/01/2024. Số nến (5 242) thấp hơn trần 20 000 của tham số, nên giới hạn đến từ phía máy chủ.
- **Trường `data_completed`** trong phản hồi cho biết lý do dừng (`end` hoặc `limit`). Hiện script chưa ghi trường này ra, nên khi cần xác nhận nguyên nhân, cần sửa để ghi lại.
- **Trần mặc định** `maxCount` là 20 000 nến cho một lần `from`.
- **Thời gian chờ**: lịch sử dài cần `timeoutMs` lớn (240 000 ms trong script).

## 5. Quy Trình Cho Một Báo Cáo Mới

1. Kiểm tra mã bằng cách tải 3 nến gần nhất (`count: 3`).
2. Tải toàn bộ lịch sử cần thiết bằng `fetch_daily.mjs`, lưu CSV vào `backtests/<ten_research>/data/`.
3. Viết script phân tích đọc CSV (không gọi mạng lại), ghi `results.json` vào cùng thư mục.
4. Viết báo cáo theo `docs/reports/_template.md`, ghi rõ ngày nến đầu tiên và cuối cùng của từng chuỗi.
5. Cập nhật `docs/reports/README.md` và bảng trong `docs/README.md`.

## 6. Ví Dụ Đã Chạy

Báo cáo [us30-streak-vnindex.md](reports/us30-streak-vnindex.md) dùng `DJ:DJI` và `HOSE:VNINDEX`, D1, tải ngày 21/11/2026. Script phân tích: [backtests/us30_streak/us30_streak_backtest.mjs](../backtests/us30_streak/us30_streak_backtest.mjs).

## Changelog

- `2026-11-21`: Tạo hướng dẫn lần đầu.
