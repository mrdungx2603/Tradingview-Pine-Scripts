# /pine-review — Review Code Pine Script

Skill này thực hiện review code Pine Script có hệ thống, phát hiện lỗi, vấn đề hiệu năng và đề xuất cải thiện.

## Quy Trình Review

### 1. Kiểm Tra Biên Dịch (Compilation)

Trước khi review logic, kiểm tra các lỗi cú pháp cơ bản:
- [ ] Đúng `@version` ở dòng đầu tiên
- [ ] Hàm/thư viện import có tồn tại trong phiên bản Pine đang dùng
- [ ] Không dùng hàm đã deprecated (ví dụ: `study()` trong v5+, `security()` trong v6+)
- [ ] Số lượng tham số truyền vào hàm đúng
- [ ] Kiểu dữ liệu trả về phù hợp (series int, float, bool...)

### 2. Repainting — Vấn Đề Quan Trọng Nhất

Repainting xảy ra khi indicator vẽ lại giá trị trong quá khứ, khiến backtest/signal không đáng tin cậy.

**Các pattern gây repaint cần kiểm tra:**

```pinescript
// ⚠️ NGUY HIỂM: request.security với lookahead
request.security(sym, tf, expression, lookahead=barmerge.lookahead_on)

// ⚠️ NGUY HIỂM: Dùng giá close trước khi bar đóng
if (not barstate.isconfirmed)  // hoặc thiếu barstate.isconfirmed
    signal := close > open

// ⚠️ NGUY HIỂM: Tham chiếu tương lai trong history-referencing
value = ta.valuewhen(condition, close, 0)  // 0 = bar hiện tại, có thể chưa đóng
```

**Quy tắc an toàn:**
- Luôn dùng `barstate.isconfirmed` cho tín hiệu backtest
- `request.security` luôn dùng `lookahead=barmerge.lookahead_off` (mặc định trong v6)
- `ta.valuewhen` dùng offset > 0 để tránh bar hiện tại chưa đóng

### 3. Hiệu Năng

Pine Script có giới hạn thời gian thực thi (thường ~20 giây). Tối ưu là cần thiết.

**Checklist hiệu năng:**
- [ ] Vòng lặp `for` có giới hạn hợp lý? Không lặp qua toàn bộ `bar_index`
- [ ] Biến `var` được dùng để lưu trạng thái thay vì tính toán lại mỗi bar?
- [ ] Tránh `request.security()` trong vòng lặp hoặc gọi quá nhiều lần
- [ ] Dùng `math.*` thay vì tự viết hàm toán (đã được tối ưu sẵn)
- [ ] `switch` thay cho chuỗi `if-else` dài khi so sánh cùng một biến
- [ ] Không tính toán lại cùng một giá trị nhiều lần — gán vào biến

**Pattern tối ưu vs chưa tối ưu:**

```pinescript
// ❌ Tệ: Tính SMA của close 3 lần
a = ta.sma(close, 20)
b = ta.sma(close, 20) > ta.sma(close, 50)

// ✅ Tốt: Gán vào biến, dùng lại
sma20 = ta.sma(close, 20)
sma50 = ta.sma(close, 50)
a = sma20
b = sma20 > sma50
```

### 4. Logic & Toán Học

- [ ] Phép chia có kiểm tra mẫu số != 0?
- [ ] `math.log()` / `math.sqrt()` có kiểm tra tham số dương?
- [ ] So sánh float có dùng epsilon thay vì `==`?
- [ ] Giá trị `na` có được xử lý trước khi dùng trong biểu thức?
- [ ] `ta.crossover()` / `ta.crossunder()` dùng đúng thứ tự tham số?

**Pattern xử lý NaN:**

```pinescript
// ✅ Cách an toàn
sma_val = ta.sma(src, len)
plot(na(sma_val) ? na : sma_val)  // Hoặc dùng nz()
safe_val = nz(sma_val, 0)         // Thay NaN bằng 0
```

### 5. Lỗi Phổ Biến

| Lỗi | Giải Thích | Cách Sửa |
|---|---|---|
| `:=` trên biến không `var` | Gán lại biến cần khai báo với `var` trước | `var x = 0` rồi `x := x + 1` |
| Nhầm `=` và `:=` | `=` khai báo mới, `:=` gán lại | Kiểm tra đúng toán tử |
| Không dùng `varip` khi cần | `var` chỉ chạy một lần đầu | Dùng `varip` cho biến cần giữ qua các tick |
| `if` lồng quá sâu | Gây khó đọc, dễ sai logic | Tách hàm hoặc dùng `switch` |
| Thiếu `max_lines_count` | Vượt quá 500 line mặc định | Thêm `max_lines_count=500` vào `indicator()` |

### 6. Best Practices

- [ ] Có `shorttitle` cho indicator/strategy?
- [ ] Input có `group` để tổ chức gọn gàng?
- [ ] Input có `tooltip` giải thích bằng tiếng Việt?
- [ ] Màu sắc dùng `color.new()` với alpha hợp lý cho nền?
- [ ] Có `alertcondition()` nếu script cần cảnh báo?
- [ ] Strategy có `commission_value`, `slippage` phù hợp chứng khoán Việt Nam?
- [ ] Có comment mô tả các đoạn logic phức tạp?

### 7. Giới Hạn TradingView

- Max **500 lines** — dùng `max_lines_count=500`
- Max **500 labels** — dùng `max_labels_count=500`
- Max **64 linefills** — dùng `max_linefills_count=64`
- Max **500 boxes** — dùng `max_boxes_count=500`
- Max **~1000 bars** cho `request.security()` lookahead

## Định Dạng Kết Quả Review

Kết quả review trả về theo cấu trúc:

```
## 📋 Kết Quả Review: [tên file]

### 🔴 Lỗi Nghiêm Trọng (phải sửa)
- [Mô tả lỗi] — [vị trí] — [cách sửa]

### 🟡 Cảnh Báo (nên sửa)
- [Mô tả] — [vị trí] — [đề xuất]

### 🟢 Gợi Ý Cải Thiện (có thể cân nhắc)
- [Mô tả] — [đề xuất]

### ✅ Những Điểm Tốt
- [Điểm đã làm đúng]
```
