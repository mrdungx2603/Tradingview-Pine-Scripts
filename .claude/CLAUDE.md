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

### ⚠️ QUY TẮC SCOPE (đọc trước khi viết code)

**Mọi biến có kiểu (`string`, `int`, `float`, `bool`, `color`, UDT, ...) phải được khai báo và khởi tạo ở scope cha, trước mọi `if`/`for` con.**

```pinescript
// ✅ ĐÚNG: Khai báo + khởi tạo ở scope for, trước if
for i = 0 to 2
    int     tr   = states.get(i).trend
    string  txt  = tr == 1 ? "BULL" : tr == -1 ? "BEAR" : "WAIT"
    float   val  = na(sh) ? 0.0 : sh
    if is_active
        // Chỉ dùng `:=` để gán lại, không khai báo biến mới ở đây
        val := val + 1

// ❌ SAI: Khai báo biến mới trong if lồng trong for
for i = 0 to 2
    if cond
        string txt = "hello"  // LỖI: "end of line without line continuation"

// ❌ SAI: Khai báo không khởi tạo rồi gán :=
for i = 0 to 2
    string txt
    txt := "hello"  // LỖI
```

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
| **Khai báo biến trong `if`** | Không được khai báo biến mới (có kiểu) bên trong `if`, nhất là `if` lồng trong `for` | **Luôn khai báo tất cả biến ở đầu scope `for` hoặc scope hàm, trước mọi `if`.** Dùng ternary `? :` thay vì `if/else` để gán giá trị. |
| **Khai báo không khởi tạo** | `string x` rồi `x := "val"` trong `for`/`if` gây lỗi "end of line without line continuation" | Luôn khởi tạo ngay khi khai báo: `string x = "default"` hoặc dùng ternary 1 dòng: `string x = cond ? "A" : "B"` |
| **`bool` vs `int`** | Không thể gán `1`/`0` cho `bool`, Pine v6 strict typing | Dùng `true`/`false`. Với UDT: `s.ready := true` không phải `s.ready := 1` |
| **`for start > end` chạy 1 lần** | `for r = 4 to 3` vẫn chạy 1 lần với r=4 (khác các ngôn ngữ khác) | Luôn bọc trong `if start <= end` guard |
| **UDT trong `for`+`if`** | Không thể khai báo biến UDT bên trong `if` lồng trong `for` | Khai báo biến UDT ở scope `for`, dùng ternary cho giá trị: `float sh = cond ? val : na` |
| **Inline comment trong array literal** | `// comment` bên trong `[]` của `request.security()` có thể gây lỗi parser | Tránh comment `//` trong array/tuple literal. Đưa comment ra ngoài hoặc dùng `/* */`. |

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

## Quản Lý Phiên Bản (Version)

- **Tăng version** trong header file (`// Phiên bản: X.Y`) mỗi khi có thay đổi code.
- **Backup ver cũ**: Trước khi tăng version, lưu bản hiện tại vào `indicators/hist/<tên_file>_vX.Y.pine`.
- Dùng `git show <commit>:indicators/<file>.pine > indicators/hist/<file>_vX.Y.pine` để trích xuất.

Ví dụ khi nâng từ v1.9 lên v2.0:
```bash
# Backup v1.9 trước khi sửa
cp indicators/smc_market_structure.pine indicators/hist/smc_market_structure_v1.9.pine
# ... sửa code, tăng version lên v2.0 ...
```

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
