# Big Aggressor Flow — Tài Liệu

> **Script**: [indicators/big_aggressor_flow.pine](../indicators/big_aggressor_flow.pine) (v1.1)
> **Loại**: Indicator (`overlay=true`)
> **Pine Script**: v6
> **Nguồn dữ liệu**: `request.footprint()` Tầng 1 (`ticks_per_row=1`)

## Tổng Quan

Hiển thị delta (mua chủ động trừ bán chủ động) theo từng hàng giá trong nến, dưới dạng hình tròn kiểu Bookmap ở mức footprint:
- Mỗi hàng giá có `delta = buy_volume - sell_volume`.
- Hàng có |delta| đủ lớn được vẽ một hình tròn tại đúng mức giá của hàng.
- Xanh: delta dương (mua chủ động chiếm ưu thế). Đỏ: delta âm (bán chủ động chiếm ưu thế).
- Cỡ hình tròn tăng theo |delta|, gồm 4 bậc.
- Chữ `Δ <giá trị>` nằm cạnh hình: delta dương ở trên hình, delta âm ở dưới hình.

Giới hạn: TradingView không cung cấp từng lệnh khớp hay sổ lệnh. Delta là tổng hợp trong một nến tại một hàng giá. Indicator không hiển thị được lệnh chờ như heatmap sổ lệnh của Bookmap.

## Tham Số Đầu Vào

| Tham số | Mặc định | Ý nghĩa |
|---|---|---|
| Bước Giá (Price Step) | 1.0 | Độ rộng 1 hàng giá, nên khớp tick size |
| Số Nến Nền So Sánh | 50 | Số nến để tính khối lượng trung bình 1 hàng giá |
| Hệ Số Delta Lớn | 3.0 | Vẽ khi \|delta\| ≥ hệ số × khối lượng trung bình 1 hàng |
| Delta Tối Thiểu | 0 | Ngưỡng tuyệt đối. \|delta\| phải vượt cả ngưỡng này |
| Vẽ Hình Tròn Delta | true | Bật/tắt hình tròn |
| Số Nến Gần Nhất Vẽ | 200 | Chỉ vẽ cho các nến trong phạm vi này |
| Độ Mờ Hình Tròn (Opacity %) | 30 | 0 = trong suốt, 100 = đặc |
| Màu Delta Dương | xanh | Màu hình tròn khi delta > 0 |
| Màu Delta Âm | đỏ | Màu hình tròn khi delta < 0 |
| Hiện Giá Trị Delta | true | Bật/tắt chữ `Δ <giá trị>` |
| Màu Chữ Delta | trắng | Màu chữ giá trị delta |
| Khoảng Cách Chữ (x ATR) | 0.5 | Khoảng cách từ tâm hình đến chữ, theo ATR(14) |

## Logic Chính

1. Lượt 1: cộng `buy + sell` của mọi hàng giá để lấy khối lượng trung bình 1 hàng của nến. Trung bình này được làm mượt bằng `ta.sma(..., baseline_len)`.
2. Ngưỡng: `large_thr = max(Delta Tối Thiểu, Hệ Số Delta Lớn × baseline)`.
3. Lượt 2: với mỗi hàng giá có `|delta| >= large_thr`:
   - Cỡ hình tròn theo tỷ lệ `|delta| / large_thr`: nhỏ (<2x), vừa (<4x), lớn (<7x), rất lớn (≥7x).
   - Hình tròn là `label.style_circle`, đặt tại `yloc.price`, ở giữa hàng giá.
   - Chữ `Δ <giá trị>` là label thứ hai, không viền. Vị trí: `giá hàng + ATR × Khoảng Cách Chữ` nếu delta dương, `giá hàng - ATR × Khoảng Cách Chữ` nếu delta âm.
   - Tooltip của hình tròn hiển thị giá trị delta và mức giá.
4. Chỉ vẽ và cảnh báo khi nến đã đóng (`barstate.isconfirmed`).

## Output / Tín Hiệu

- Hình tròn xanh hoặc đỏ tại mức giá của hàng, kèm chữ `Δ <giá trị>`.
- 2 `alertcondition`:
  - "Delta Mua Chủ Động Lớn": kích hoạt khi nến đóng có ít nhất 1 hàng delta dương vượt ngưỡng.
  - "Delta Bán Chủ Động Lớn": kích hoạt khi nến đóng có ít nhất 1 hàng delta âm vượt ngưỡng.

## Giới Hạn & Lưu Ý

- Label chỉ có 5 cỡ cố định (tiny, small, normal, large, huge). Indicator dùng 4 cỡ, không có kích thước liên tục. Pine không đọc được pixel của chart, nên hình tròn không thể vừa tròn tuyệt đối vừa có kích thước liên tục khi zoom.
- Mỗi hàng giá vượt ngưỡng tạo 2 label (hình tròn và chữ). Giới hạn 500 label của TradingView áp dụng cho tổng số này. Khi vượt, TradingView xoá label cũ nhất trước.
- Hình tròn và chữ đặt tại cột nến của bar, không kéo sang bar khác.
- Label của Pine luôn vẽ đè lên nến. Không có tham số z-order, nên không đưa được hình xuống sau nến trong overlay.
- Cần tài khoản/symbol hỗ trợ tick data. Nếu không, footprint là `na` và indicator không vẽ gì.
- Ngưỡng `Hệ Số Delta Lớn` phụ thuộc thanh khoản. Mã thanh khoản thấp nên giảm hệ số, và ngược lại.
- Chưa được compile hay xem trực quan trên TradingView trong bản này.
