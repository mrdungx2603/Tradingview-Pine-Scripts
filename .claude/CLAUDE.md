# CLAUDE.md — Dự Án Pine Script TradingView

## Mục Đích

Dự án này dùng để phát triển các script Pine Script chạy trên TradingView: indicator, strategy, library. Phục vụ hiển thị biểu đồ kỹ thuật, backtest chiến lược giao dịch, và tạo thư viện tái sử dụng.

## Quy Tắc Giao Tiếp

- **Tất cả giao tiếp với người dùng bằng tiếng Việt.**
- Code, comment trong script dùng tiếng Việt cho phần mô tả; thuật ngữ kỹ thuật có thể giữ tiếng Anh (EMA, RSI, MACD, v.v.).

## Tech Stack

- **Pine Script v6** (`//@version=6`) — phiên bản mặc định, dùng cho tất cả script mới.
- **Pine Script v5** (`//@version=5`) — chỉ dùng khi cần tương thích với code cũ hoặc người dùng yêu cầu cụ thể.
- Script chạy trên **TradingView Pine Editor**, không có môi trường build local.

## Cấu Trúc Thư Mục

```
tv_pine/
├── .claude/                  # Cấu hình Claude Code
│   ├── CLAUDE.md             # File này
│   ├── settings.json         # Cài đặt dự án
│   └── skills/               # Skills tùy chỉnh
│       ├── pine-create.md    # /pine-create
│       ├── pine-review.md    # /pine-review
│       ├── pine-backtest.md  # /pine-backtest
│       └── pine-convert.md   # /pine-convert
├── indicators/               # Indicator
├── strategies/               # Strategy (có backtest)
├── libraries/                # Thư viện dùng chung
├── backtests/                # Backtest riêng
└── docs/                     # Tài liệu, ghi chú
```

## Quy Ước Code Pine Script

### Cấu Trúc File

1. Mở đầu bằng `//@version=6` (dùng v5 nếu có lý do cụ thể)
2. Chú thích mô tả script bằng tiếng Việt ở đầu file
3. Import thư viện (nếu có)
4. Khai báo `indicator()` hoặc `strategy()` với đầy đủ tham số
5. Inputs — nhóm theo chức năng (group)
6. Tính toán — biến, hàm, logic
7. Plots — hiển thị lên chart
8. Alerts — điều kiện cảnh báo (nếu có)
9. Backtest — logic vào/thoát lệnh (nếu là strategy)

### Đặt Tên Biến

- Dùng `snake_case` cho biến: `ema_fast`, `rsi_length`
- Input dùng chữ thường có gạch dưới: `src`, `len`, `mult`
- Hằng số dùng `UPPER_CASE`: `MAX_BARS`, `DEFAULT_PERIOD`

### Input Groups

```pinescript
// Nhóm dữ liệu đầu vào
src = input.source(title="Nguồn", defval=close, group="Dữ Liệu")

// Nhóm tham số đường MA
ma_len = input.int(title="Chu Kỳ MA", defval=20, minval=1, group="Đường MA")
ma_type = input.string(title="Loại MA", defval="EMA", options=["SMA", "EMA", "WMA", "HMA"], group="Đường MA")

// Nhóm hiển thị
show_signal = input.bool(title="Hiển Thị Tín Hiệu", defval=true, group="Hiển Thị")
```

### Indicator vs Strategy

```pinescript
// Indicator — chỉ hiển thị, không giao dịch
indicator(title="Tên Indicator", shorttitle="VIẾT_TẮT", overlay=true, timeframe="")

// Strategy — có backtest, có thể giao dịch ảo
strategy(title="Tên Strategy", shorttitle="VIẾT_TẮT",
  overlay=true,
  initial_capital=100000000,    // 100 triệu VND
  default_qty_type=strategy.percent_of_equity,
  default_qty_value=100,
  commission_type=strategy.commission.percent,
  commission_value=0.15,       // 0.15% phí giao dịch
  slippage=2,                  // 2 tick trượt giá
  pyramiding=1)
```

## Cạm Bẫy Thường Gặp

| Vấn Đề | Mô Tả | Cách Tránh |
|---|---|---|
| **Repainting** | Indicator vẽ lại tín hiệu quá khứ | Dùng `barstate.isconfirmed`, tránh `request.security` với lookahead |
| **Lookahead bias** | Dùng dữ liệu tương lai trong backtest | Không dùng `request.security(sym, tf, close, lookahead=barmerge.lookahead_on)` |
| **`:=` vs `=`** | Gán lại biến mutable vs khai báo mới | `var` để khởi tạo, `:=` để gán lại |
| **`var` vs `varip`** | `var` chỉ chạy 1 lần, `varip` giữ giá trị giữa các tick | Dùng `varip` khi cần lưu trạng thái intra-bar |
| **Giới hạn drawings** | Max 500 lines/labels/boxes | Giới hạn số lượng đối tượng vẽ, dùng `max_lines_count=500` |
| **Giới hạn labels** | Max 500 labels | Dùng `max_labels_count=500` |
| **NaN propagation** | Biểu thức có NaN sẽ lan ra | Kiểm tra `na()` trước khi dùng giá trị |

## Pine Script v6 — Tính Năng Mới

So với v5, v6 có các thay đổi và tính năng mới đáng chú ý:

| Tính Năng | Mô Tả |
|---|---|
| **`import` / `export`** | Tái sử dụng code qua thư viện: `import username/library/version` |
| **Qualified Types** | Hệ thống kiểu dữ liệu chặt chẽ hơn, giảm lỗi runtime |
| **`dynamic_requests`** | Tham số mới trong `indicator()`: cho phép request động số lượng symbol |
| **`max_polylines_count`** | Tham số mới trong `indicator()`: giới hạn số polylines |
| **`force_overlay`** | Ép kiểu hiển thị overlay ngay cả khi script thường ở pane riêng |
| **Polylines** | Đối tượng vẽ mới: đường gấp khúc nhiều điểm, hiệu quả hơn nhiều `line.new()` |

### Import / Export trong v6

```pinescript
//@version=6
indicator(title="Dùng Thư Viện", overlay=true)

// Import thư viện từ cộng đồng TradingView
import tradingview/ta/1

// Dùng hàm từ thư viện đã import
sma_val = ta.sma(close, 20)
```

```pinescript
//@version=6
// Library file — export hàm để thư viện khác dùng
library(title="TV Pine Utils", overlay=false)

export f_ema(src, len) =>
    ta.ema(src, len)
```

## Chứng Khoán Việt Nam

- Sàn HOSE: thêm `.VN` hoặc dùng mã `VCB`, `FPT`, `HPG`, v.v.
- Giờ giao dịch: 9:00-11:30, 13:00-14:45 (HOSE/HNX), 9:00-15:00 (UPCOM)
- Biên độ: HOSE 7%, HNX 10%, UPCOM 15% (có thể thay đổi)
- Nhớ điều chỉnh `session` nếu cần lọc phiên giao dịch Việt Nam

## Kiểm Tra Script

- Copy-paste vào TradingView Pine Editor
- Kiểm tra không có lỗi biên dịch
- Áp dụng lên chart để xác minh hiển thị
- Với strategy: chạy Strategy Tester, kiểm tra Overview/Performance Summary/List of Trades
- Kiểm tra repaint bằng cách refresh chart hoặc thay đổi timeframe

## Skills Có Sẵn

| Skill | Mô Tả |
|---|---|
| `/pine-create` | Tạo indicator/strategy Pine Script mới từ yêu cầu |
| `/pine-review` | Review code Pine Script: lỗi, hiệu năng, best practices |
| `/pine-backtest` | Hỗ trợ thiết kế & phân tích backtest |
| `/pine-convert` | Chuyển đổi Pine Script giữa các phiên bản (v1→v6) |
