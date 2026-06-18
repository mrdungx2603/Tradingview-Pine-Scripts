# /pine-create — Tạo Pine Script Mới

Skill này hướng dẫn tạo indicator hoặc strategy Pine Script có cấu trúc, đầy đủ, sẵn sàng copy-paste vào TradingView.

## Quy Trình

### Bước 1: Xác Định Yêu Cầu

Hỏi người dùng các câu hỏi sau để làm rõ:

1. **Loại script**: Indicator (chỉ hiển thị) hay Strategy (có backtest/giao dịch)?
2. **Mục đích**: Script này dùng để làm gì? (Ví dụ: phát hiện xu hướng, tín hiệu mua/bán, hỗ trợ/kháng cự...)
3. **Loại hiển thị**: Overlay (đè lên giá) hay Separate Pane (pane riêng dưới chart)?
4. **Tham số cần thiết**: Những input nào người dùng muốn tùy chỉnh? (chu kỳ, ngưỡng, nguồn dữ liệu...)

Đối với **Strategy**, hỏi thêm:
- Vốn ban đầu? (mặc định 100 triệu VND)
- Phí giao dịch? (mặc định 0.15%)
- Tỷ lệ trượt giá? (mặc định 2 tick)
- Điều kiện vào lệnh Long/Short?
- Điều kiện thoát lệnh? (Take profit, Stop loss, Trailing stop...)
- Số lệnh tối đa cùng lúc? (pyramiding)

### Bước 2: Thiết Kế Cấu Trúc

Dựa trên yêu cầu, thiết kế cấu trúc script với các phần:

```
//@version=6
// ─── Mô tả ───
// Tên script — Mô tả ngắn gọn bằng tiếng Việt

// ─── Khai báo ───
indicator(...) hoặc strategy(...)

// ─── Thư viện / Hàm Helper ───
// Các hàm tiện ích nếu cần

// ─── Inputs ───
// Nhóm input theo chức năng

// ─── Tính Toán ───
// Logic chính của indicator/strategy

// ─── Plots / Drawings ───
// Hiển thị lên chart

// ─── Alerts ───
// Điều kiện cảnh báo (nếu cần)

// ─── Strategy Orders ───
// Logic vào/thoát lệnh (nếu là strategy)
```

### Bước 3: Viết Code

Tuân thủ quy ước trong [CLAUDE.md](../CLAUDE.md):

- `snake_case` cho biến
- Input nhóm theo chức năng với `group=`
- Comment tiếng Việt, thuật ngữ kỹ thuật có thể giữ tiếng Anh
- Đầy đủ tooltip cho input
- Xử lý NaN an toàn

### Bước 4: Kiểm Tra Nhanh

Trước khi trả kết quả, kiểm tra:
- [ ] Đúng `@version` (mặc định 6)
- [ ] Không có biến không dùng đến
- [ ] Xử lý `na()` ở những chỗ cần
- [ ] Input có `minval`/`maxval` hợp lý
- [ ] Strategy có đầy đủ `commission`, `slippage`
- [ ] Màu sắc có độ tương phản tốt trên nền sáng/tối

## Ví Dụ Đầu Ra

```pinescript
//@version=6
// ─── MA Cross — Tín Hiệu Giao Cắt Đường Trung Bình ───
indicator(title="MA Cross", shorttitle="MACROSS", overlay=true)

// ─── Inputs ───
fast_len = input.int(title="Chu Kỳ MA Nhanh", defval=9, minval=1, group="Đường MA")
slow_len = input.int(title="Chu Kỳ MA Chậm", defval=21, minval=1, group="Đường MA")
src      = input.source(title="Nguồn Dữ Liệu", defval=close, group="Dữ Liệu")
ma_type  = input.string(title="Loại MA", defval="EMA", options=["SMA", "EMA"], group="Đường MA")

// ─── Hàm Helper ───
ma(src, len, type) =>
    switch type
        "SMA" => ta.sma(src, len)
        "EMA" => ta.ema(src, len)

// ─── Tính Toán ───
ma_fast = ma(src, fast_len, ma_type)
ma_slow = ma(src, slow_len, ma_type)
cross_up = ta.crossover(ma_fast, ma_slow)
cross_down = ta.crossunder(ma_fast, ma_slow)

// ─── Plots ───
plot(ma_fast, color=color.blue, linewidth=2, title="MA Nhanh")
plot(ma_slow, color=color.red, linewidth=2, title="MA Chậm")
plotshape(cross_up, style=shape.triangleup, location=location.belowbar, color=color.green, size=size.small, title="Cắt Lên")
plotshape(cross_down, style=shape.triangledown, location=location.abovebar, color=color.red, size=size.small, title="Cắt Xuống")

// ─── Alerts ───
alertcondition(cross_up, title="Tín Hiệu Mua", message="MA Nhanh cắt lên MA Chậm")
alertcondition(cross_down, title="Tín Hiệu Bán", message="MA Nhanh cắt xuống MA Chậm")
```
