# Ghi Chú Pine Script

Tài liệu tham khảo nhanh các hàm và cú pháp Pine Script v6 thường dùng.

> **Lưu ý**: Dự án mặc định dùng `//@version=6`. Các hàm dưới đây hoạt động trên v6.

## Built-in Variables

| Biến | Mô Tả |
|------|-------|
| `open`, `high`, `low`, `close` | Giá OHLC của bar hiện tại |
| `volume` | Khối lượng giao dịch |
| `time` | Thời gian UNIX của bar (ms) |
| `bar_index` | Chỉ số bar (0 = bar đầu tiên) |
| `barstate.isconfirmed` | Bar đã đóng |
| `barstate.isfirst` | Bar đầu tiên của chart |
| `barstate.islast` | Bar cuối cùng của chart |
| `syminfo.ticker` | Mã chứng khoán hiện tại |
| `syminfo.tickerid` | Mã đầy đủ (sàn:mã) |
| `syminfo.mintick` | Bước giá nhỏ nhất |
| `syminfo.pointvalue` | Giá trị 1 point |
| `strategy.position_size` | Kích thước vị thế hiện tại |
| `strategy.position_avg_price` | Giá vào lệnh trung bình |

## Technical Analysis (`ta.`)

| Hàm | Mô Tả |
|-----|-------|
| `ta.sma(src, len)` | Simple Moving Average |
| `ta.ema(src, len)` | Exponential Moving Average |
| `ta.rma(src, len)` | RSI-style Moving Average |
| `ta.wma(src, len)` | Weighted Moving Average |
| `ta.vwma(src, len)` | Volume-Weighted Moving Average |
| `ta.rsi(src, len)` | Relative Strength Index |
| `ta.macd(src, f, s, sig)` | MACD |
| `ta.bb(src, len, mult)` | Bollinger Bands |
| `ta.atr(len)` | Average True Range |
| `ta.supertrend(factor, len)` | SuperTrend |
| `ta.stoch(src, h, l, len)` | Stochastic |
| `ta.crossover(a, b)` | a cắt lên b |
| `ta.crossunder(a, b)` | a cắt xuống b |
| `ta.highest(src, len)` | Giá trị cao nhất trong `len` bar |
| `ta.lowest(src, len)` | Giá trị thấp nhất trong `len` bar |
| `ta.valuewhen(cond, src, n)` | Giá trị src khi điều kiện đúng lần thứ n |
| `ta.change(src, len)` | Thay đổi so với `len` bar trước |
| `ta.correlation(src1, src2, len)` | Hệ số tương quan |

## Math (`math.`)

| Hàm | Mô Tả |
|-----|-------|
| `math.avg(a, b, ...)` | Trung bình cộng |
| `math.sum(src, len)` | Tổng trong `len` bar |
| `math.abs(x)` | Giá trị tuyệt đối |
| `math.max(a, b, ...)` | Giá trị lớn nhất |
| `math.min(a, b, ...)` | Giá trị nhỏ nhất |
| `math.round(x, n)` | Làm tròn đến n chữ số |
| `math.sqrt(x)` | Căn bậc 2 |
| `math.log(x)` | Logarit tự nhiên |
| `math.log10(x)` | Logarit cơ số 10 |
| `math.pow(x, n)` | Lũy thừa |
| `math.sign(x)` | Dấu của x (-1, 0, +1) |

## Xử Lý NaN

| Hàm | Mô Tả |
|-----|-------|
| `na(x)` | Kiểm tra x có phải NaN không |
| `nz(x, v)` | Thay NaN bằng v (mặc định 0) |
| `not na(x)` | x không phải NaN |

## Màu Sắc

```pinescript
color.red, color.green, color.blue
color.yellow, color.orange, color.purple
color.white, color.black, color.gray
color.new(color, transp)       // Tạo màu với độ trong suốt (0-100)
color.rgb(r, g, b, transp)     // RGB + trong suốt
color.from_gradient(val, 0, 100, c1, c2)  // Gradient giữa 2 màu
```

## Cảnh Báo

```pinescript
alertcondition(condition, title="...", message="...")
alert(message="...", freq=alert.freq_once_per_bar_close)
```

## Strategy Orders

```pinescript
strategy.entry("id", strategy.long)               // Vào Long
strategy.entry("id", strategy.short)              // Vào Short
strategy.exit("id", "entry_id", limit=..., stop=...)// Thoát + TP/SL
strategy.close("entry_id")                        // Thoát theo tín hiệu
strategy.cancel("id")                             // Hủy lệnh chờ
strategy.order("id", strategy.long, qty=...)      // Lệnh tùy chỉnh
```

## Drawings

```pinescript
line.new(x1, y1, x2, y2, color=..., width=..., style=...)
label.new(x, y, text="...", color=..., style=...)
box.new(left, top, right, bottom, border_color=..., bgcolor=...)
plotshape(condition, style=shape.triangleup, location=location.belowbar, color=...)
plotchar(condition, char="★", location=location.abovebar, color=...)
hline(price, title="...", color=..., linestyle=...)
fill(p1, p2, color=...)  // Tô màu giữa 2 plot
```

### Polylines (mới trong v6)

```pinescript
// Tạo polyline — hiệu quả hơn nhiều line.new() riêng lẻ
polyline.new(points_array, color=..., width=..., style=...)

// Ví dụ: vẽ đường nối các đỉnh
var points = array.new<chart.point>()
if (ta.pivothigh(high, 5, 5))
    array.push(points, chart.point.from_time(time, high))
polyline.new(points, color=color.red, width=2)
```

## Import / Export (v6)

```pinescript
//@version=6

// Import thư viện từ TradingView
import username/library_name/version

// Export hàm (dùng trong file library)
export my_function(x) =>
    ta.sma(x, 20)
```

## Tham Số Mới Của indicator() trong v6

```pinescript
indicator(
    title="...",
    overlay=true,
    dynamic_requests=true,       // Cho phép request động
    max_polylines_count=50,      // Giới hạn polylines
    force_overlay=true            // Ép hiển thị overlay
)
```

## Mẹo Hiệu Năng

1. Dùng `var` cho biến giữ trạng thái, không tính lại mỗi bar
2. Tránh `request.security()` trong vòng lặp
3. Dùng `math.*` thay cho tự viết hàm toán
4. `switch` nhanh hơn chuỗi `if-elseif` dài
5. Không tính lại cùng một giá trị nhiều lần
