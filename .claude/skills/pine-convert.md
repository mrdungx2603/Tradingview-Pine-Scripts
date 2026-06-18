# /pine-convert — Chuyển Đổi Phiên Bản Pine Script

Skill này chuyển đổi Pine Script giữa các phiên bản (v1 → v2 → v3 → v4 → v5 → v6), áp dụng các thay đổi cú pháp và hàm API tương ứng.

## Quy Trình

### Bước 1: Xác Định Phiên Bản

- Đọc `@version` trong file nguồn
- Hỏi người dùng phiên bản đích mong muốn
- Xác định lộ trình migration (có thể cần chuyển từng bước nếu cách xa)

### Bước 2: Áp Dụng Quy Tắc Chuyển Đổi

## v1 → v2

| Thay Đổi | Mô Tả |
|---|---|
| `study()` | Tham số tự tiêu biến mất, dùng `//` comment |
| `security()` | Thêm tham số `lookahead` |
| Màu sắc | `red` → `color.red`, `blue` → `color.blue`... |

## v2 → v3

| Thay Đổi | Mô Tả |
|---|---|
| `self` → `series` | Kiểu dữ liệu mới |
| `na` → `na()` | Hàm thay vì biến |
| `nz(x, y)` | Tham số thứ 2 không thể là series |

## v3 → v4

| Thay Đổi | Mô Tả |
|---|---|
| `study()` → `study()` + `//@version=4` | Khai báo version bắt buộc |
| `:=` gán lại | `var` để khai báo biến mutable |
| `input()` → `input.*()` | Phân loại: `input.int()`, `input.float()`, `input.bool()`, `input.string()`, `input.source()`, `input.symbol()` |
| `iff()` → `? :` | Toán tử 3 ngôi thay thế |
| `rising()`, `falling()` | Chuyển vào namespace `ta.` |
| `rsi()` → `ta.rsi()` | Namespace `ta.` cho technical analysis |
| `ema()` → `ta.ema()` | Namespace `ta.` |
| `highest()` → `ta.highest()` | Namespace `ta.` |
| `lowest()` → `ta.lowest()` | Namespace `ta.` |
| `stoch()` → `ta.stoch()` | Namespace `ta.` |
| `macd()` → `ta.macd()` | Namespace `ta.` |
| `plotshape()` | Tham số `location` thay đổi |

**Chuyển đổi `input()`:**

```pinescript
// v3
len = input(14, "Length", type=input.integer)
src = input(close, "Source", type=input.source)

// v4
len = input.int(14, "Length")
src = input.source(close, "Source")
```

**Chuyển đổi `iff()`:**

```pinescript
// v3
color = iff(close > open, green, red)

// v4
color = close > open ? color.green : color.red
```

## v4 → v5

| Thay Đổi | Mô Tả |
|---|---|
| `study()` → `indicator()` | Đổi tên hàm khai báo (study vẫn dùng được nhưng khuyến khích indicator) |
| `security()` → `request.security()` | Đổi tên hàm |
| `request.security()` tham số mới | `lookahead=barmerge.lookahead_off` (mặc định off) |
| `strategy.risk` → `strategy.risk_*` | Phân tách các hàm risk |
| `ticker` → `syminfo.ticker` | Namespace `syminfo.` |
| `tickerid()` → `syminfo.tickerid()` | Namespace `syminfo.` |
| `time` → `time()` | `time` là biến built-in → giữ nguyên, không đổi |
| Mảng `array.*` | Namespace `array.` thay vì prefix |
| Matrix `matrix.*` | Namespace `matrix.` (mới) |
| Map `map.*` | Namespace `map.` (mới) |
| `label.new()` | Tham số `xloc=` mới |
| `line.new()` | Tham số `xloc=` mới |
| `box.new()` | Kiểu mới (box thay cho rectangle) |

**Chuyển đổi `study` → `indicator`:**

```pinescript
// v4
study(title="My Indicator", shorttitle="MY", overlay=true)

// v5
indicator(title="My Indicator", shorttitle="MY", overlay=true)
```

**Chuyển đổi `security` → `request.security`:**

```pinescript
// v4
security(syminfo.tickerid, "D", close)

// v5 (mặc định lookahead=barmerge.lookahead_off)
request.security(syminfo.tickerid, "D", close)
```

**Namespace thư viện mới trong v5:**

```pinescript
// v4
sma_val = sma(close, 20)
rsi_val = rsi(close, 14)

// v5
sma_val = ta.sma(close, 20)
rsi_val = ta.rsi(close, 14)
```

## v5 → v6

| Thay Đổi | Mô Tả |
|---|---|
| `//@version=6` | Khai báo phiên bản mới |
| `ta.*` namespace vẫn giữ | Có thể import riêng từng hàm |
| `import` statement | `import username/library/version` để tái sử dụng code |
| Kiểu dữ liệu chặt chẽ hơn | `qualified type` system |
| `export` | Có thể export hàm/thư viện của riêng mình |
| `indicator()` tham số mới | `dynamic_requests`, `max_polylines_count` |
| `strategy()` tham số mới | Tùy chọn backtest chi tiết hơn |
| `force_overlay` | Tham số mới trong `indicator()` để ép kiểu hiển thị |

**Cú pháp import/export mới trong v6:**

```pinescript
// v6 — import thư viện
import username/library/1

// v6 — export thư viện riêng (file library)
export myFunction(int len) =>
    ta.sma(close, len)

// v6 — indicator với tham số mới
indicator(title="...", overlay=true, dynamic_requests=true, max_polylines_count=100)
```

### Bước 3: Đánh Dấu Thay Đổi Cần Review Thủ Công

Những thay đổi không thể tự động chuyển đổi an toàn:
- Logic phụ thuộc `lookahead` trong `security()` → cần kiểm tra lại
- `varip` behavior có thể thay đổi giữa các phiên bản
- Các hàm custom workaround cho bug cũ → có thể không còn cần thiết

### Bước 4: Tạo File Đầu Ra

- Tạo file mới với tên `ten_v[N].pine` (VD: `ma_cross_v6.pine`)
- Giữ file gốc không đổi
- Thêm comment `// Đã chuyển đổi từ v5 → v6 ngày DD/MM/YYYY`
- Liệt kê danh sách thay đổi đã áp dụng ở đầu file

## Định Dạng Kết Quả

```
## 🔄 Chuyển Đổi: [tên file] v[X] → v[Y]

### Thay Đổi Đã Áp Dụng
- [x] study() → indicator()
- [x] input(type=integer) → input.int()
- [x] iff() → toán tử ? :
- [x] Thêm namespace ta. cho các hàm kỹ thuật

### Cần Review Thủ Công
- [!] Dòng 42: security() → request.security(), kiểm tra lookahead
- [!] Dòng 78: varip behavior, xác nhận logic intra-bar vẫn đúng

### File Đầu Ra
`ten_v6.pine` — đã sẵn sàng copy vào TradingView
```
