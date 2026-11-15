# Order Flow Overlay

## Tổng Quan

Indicator overlay lên biểu đồ nến, đánh dấu các tín hiệu order flow ngay trên giá:

- **Phân kỳ CVD**: giá tạo đỉnh/đáy mới nhưng CVD không xác nhận.
- **Delta Peak**: Delta của nến vượt ngưỡng độ lệch chuẩn.
- **RF mạnh**: nến có high và low cùng tăng (+2) hoặc cùng giảm (-2) so với nến trước.
- **Phân kỳ RSI**: giá tạo đỉnh/đáy mới nhưng RSI không xác nhận.
- **Bảng số liệu**: Delta, CVD, RF phiên, RSI của nến cuối cùng, góc trên bên phải.

Mỗi đối tượng có công tắc hiển thị riêng. Đây là file độc lập với `order_flow_profile_panel.pine` (panel riêng dạng grid).

## Tham Số Đầu Vào

| Nhóm | Tham số | Mặc định | Ý nghĩa |
|---|---|---|---|
| Hiện/Ẩn | Phân kỳ CVD | true | Bật vẽ phân kỳ CVD |
| Hiện/Ẩn | Delta Peak | true | Bật nhãn Delta Peak |
| Hiện/Ẩn | RF mạnh | true | Bật chấm RF ±2 |
| Hiện/Ẩn | Phân kỳ RSI | true | Bật vẽ phân kỳ RSI |
| Hiện/Ẩn | Bảng số liệu | true | Bật bảng góc phải |
| Footprint & Delta | Ticks mỗi dòng | 10 | Tham số bắt buộc của `request.footprint()`, không ảnh hưởng Delta |
| Footprint & Delta | Value Area (%) | 70 | Tham số bắt buộc của `request.footprint()` |
| Footprint & Delta | Ngưỡng Imbalance (%) | 300 | Tham số bắt buộc của `request.footprint()` |
| Footprint & Delta | Khung Lower TF | 1S | Khung dự phòng khi không có footprint |
| Pivot | Nến trái / phải | 5 / 5 | Xác định pivot. Nến phải là độ trễ xác nhận |
| Delta Peak | Chu kỳ độ lệch chuẩn | 50 | Số nến để tính độ lệch chuẩn của Delta |
| Delta Peak | Ngưỡng (x độ lệch chuẩn) | 2.0 | Delta ≥ ngưỡng × độ lệch chuẩn thì là peak |
| RSI | Chu kỳ, Nguồn | 14, close | Tham số RSI |
| Giao diện | Màu tăng / giảm | xanh / đỏ | Màu của nhãn và đường |

## Logic Chính

- **Delta và CVD**: lấy theo 3 tầng fallback: `fp.delta()` (Footprint), sau đó tổng volume theo nến lower TF (LowerTF), cuối cùng ước lượng từ OHLCV (Approx). CVD reset mỗi ngày.
- **RF**: mỗi nến cộng +1 cho mỗi high/low tăng so với nến trước, trừ 1 khi giảm. Tổng RF được cộng dồn trong phiên.
- **Delta Peak**: `delta ≥ mult × stdev(delta, len)` ⇒ nhãn tăng. `delta ≤ -mult × stdev` ⇒ nhãn giảm.
- **Phân kỳ**:
  - Giá đỉnh mới cao hơn đỉnh trước, nhưng CVD hoặc RSI tại đỉnh thấp hơn ⇒ phân kỳ giảm (nhãn `PK▼`).
  - Giá đáy mới thấp hơn đáy trước, nhưng CVD hoặc RSI tại đáy cao hơn ⇒ phân kỳ tăng (nhãn `PK▲`).
  - Giá trị CVD và RSI được lấy đúng tại nến pivot, không lấy tại nến xác nhận.

## Output / Tín Hiệu

- Nhãn Delta Peak trên/dưới nến.
- Đường nối 2 pivot liên tiếp kèm nhãn `PK▲` / `PK▼`.
- Chấm dưới nến (RF +2) hoặc trên nến (RF -2).
- Bảng số liệu hiển thị giá trị nến cuối.

## Giới Hạn & Lưu Ý

- Phân kỳ được xác nhận sau `Nến phải` nến, nên tín hiệu có độ trễ tương ứng. Đây là hành vi có chủ đích để tránh repaint.
- Chỉ so sánh 2 pivot liên tiếp, không tìm phân kỳ nhiều pivot.
- Phụ thuộc dữ liệu footprint của TradingView. Với symbol không có footprint, Delta chuyển sang LowerTF hoặc ước lượng OHLCV, độ chính xác giảm.
- Giới hạn 500 nhãn và 500 đường vẽ. Các đối tượng cũ bị TradingView tự xoá.
- Chưa kiểm tra biên dịch trên TradingView Pine Editor. Cần copy vào Pine Editor để xác nhận.

## Changelog

- **v1.0**: Tạo mới. Phân kỳ CVD/RSI theo pivot, Delta Peak, RF ±2, bảng số liệu, công tắc hiển thị riêng cho từng đối tượng.
