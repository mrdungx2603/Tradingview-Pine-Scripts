# Order Flow & Market Profile Panel — Tài Liệu

> **Script**: [indicators/order_flow_profile_panel.pine](../indicators/order_flow_profile_panel.pine) (v1.13)
> **Loại**: Indicator (pane riêng, không overlay)
> **Pine Script**: v6
> **Ngày tạo**: 2026-11-14 / **Cập nhật**: 2026-11-14

## Tổng Quan

Pane riêng hiển thị order flow dạng grid, trôi đồng bộ theo chart chính (vẽ bằng `box.new()`, không dùng `table.*` vì table neo cố định góc màn hình). Thiết kế cho trader scalping cần theo dõi order flow trong phiên.

- Mỗi **dòng** là 1 chỉ số, thứ tự trên xuống: **Time** → **Delta** → **CVD** → **TPO Count** (trên/dưới POC) → **RF** (Rotation Factor) → **RSI**.
- Mỗi **cột** là 1 khung `col_tf`. Mặc định `col_tf` = khung chart, nên mỗi cột khớp đúng 1 nến.
- Mỗi dòng có toggle ẩn/hiện riêng. Ẩn thì bỏ qua cả phần tính toán tương ứng, và grid tự co lại (không chừa dòng trống).

**Phase 1/2**: file độc lập, không import, không sửa `indicators/market_profile.pine`. Engine TPO Count/RF port từ `market_profile.pine`.

## Tham Số Đầu Vào

| Tham Số | Loại | Mặc Định | Group | Mô Tả |
|---|---|---|---|---|
| Ticks mỗi dòng | `int` | `10` | Footprint & Delta | `ticks_per_row` của `request.footprint()`. Panel chỉ dùng `fp.delta()` nên không ảnh hưởng số liệu |
| Value Area (%) | `float` | `70.0` | Footprint & Delta | `va_percent` của `request.footprint()` |
| Ngưỡng Imbalance (%) | `float` | `300.0` | Footprint & Delta | `imbalance_percent` của `request.footprint()` |
| Khung Thời Gian Dự Phòng | `string` | `"1S"` | Footprint & Delta | Lower TF dùng ở Tầng 2 khi footprint không có dữ liệu |
| Hiện hậu tố nguồn Delta | `bool` | `true` | Footprint & Delta | Hậu tố `F`/`L`/`A` ở ô Delta |
| Khung Gộp Cột | `timeframe` | Chart | Market Profile & Khung Gộp Cột | `col_tf`. Chart = 1 cột/nến; chọn khung lớn hơn (bội số của khung chart) để gộp nhiều nến |
| Độ Phân Giải Lưới Giá TPO | `int` | `60` (20–120) | Market Profile & Khung Gộp Cột | `grid_rows`, số hàng chia phiên để đếm TPO |
| Time / Delta / CVD / TPO Count / RF / RSI | `bool` ×6 | `true` | Hiện/Ẩn Dòng | Toggle từng dòng |
| Số Cột Hiển Thị | `int` | `55` (10–55) | Hiển Thị (Giao Diện) | Số cột gần nhất được giữ lại (6 dòng × 55 = 330 box < 500) |
| Cỡ Chữ Hiển Thị | `string` | `"Small"` | Hiển Thị (Giao Diện) | `Tiny`/`Small`/`Normal`/`Large` |
| Chu Kỳ RSI | `int` | `14` | RSI | RSI tính theo khung `col_tf` qua `request.security()` |
| Nguồn RSI | `source` | `close` | RSI | |

## Logic Chính

1. **Reset phiên** (`timeframe.change("D")`): tạo `OFProfile` mới, xoá mảng high/low của phiên.
2. **TPO Count**: dựng histogram TPO của toàn phiên theo `grid_rows`, tìm POC, đếm TPO trên/dưới POC.
3. **RF**: mỗi nến cộng +1/-1 theo high/low so với nến trước, reset mỗi phiên.
4. **Delta — 3 tầng fallback** mỗi nến:
   - Tầng 1 (`F`): `request.footprint()` → `fp.delta()`.
   - Tầng 2 (`L`): `request.security_lower_tf()`, phân loại volume nến con theo close > open.
   - Tầng 3 (`A`): xấp xỉ Chaikin `volume*((close-low)-(high-close))/(high-low)`.
5. **CVD**: cộng dồn `delta` theo nến, reset khi sang phiên mới. `cvd` là biến `var`, Pine rollback trước mỗi tick realtime nên không bị cộng trùng.
6. **Ẩn dòng = bỏ qua tính toán**: `need_delta`, `need_tpo_grid`, `need_rf`, `show_rsi` là giá trị simple (chỉ phụ thuộc input), dùng để gate cả các lệnh `request.*()`.
7. **Gộp cột**: tại nến đầu khung `col_tf` (`timeframe.change(col_tf)`), tạo ô mới cho mọi dòng. Các nến sau trong cùng khung chỉ cập nhật ô đó: Delta = tổng delta trong khung; CVD/TPO Count/RF = giá trị tích lũy-theo-phiên tại nến mới nhất; RSI = RSI theo khung `col_tf`. Ô của khung đang chạy cập nhật theo từng tick.
8. **Căn tâm nến**: ô neo bằng `xloc.bar_time`. Mép trái = `time` nến đầu khung trừ nửa nến, mép phải = `time` nến mới nhất cộng nửa nến. Ô cũ nhất bị xoá khi vượt `n_bars_display`.
9. **Vị trí dòng**: Y tính động từ dưới lên, chỉ cấp cho dòng đang hiện. 2 plot ẩn neo scale pane theo `0..total_rows_visible`.
10. **Tên dòng**: `plot(..., display=display.price_scale)` hiện tag tên dòng trên trục giá bên phải.

## Output / Tín Hiệu Trên Chart

- Delta/CVD/RF: xanh (dương) / đỏ (âm) / xám (0).
- TPO Count: `trên/dưới`, màu theo bên nhiều TPO hơn (dưới nhiều hơn = xanh).
- RSI: đỏ khi > 70, xanh khi < 30, navy khi ở giữa.
- Time: giờ:phút của nến đầu khung, nền xám.

## Giới Hạn & Lưu Ý

- `request.footprint()` cần TradingView Premium/Ultimate và sàn hỗ trợ dữ liệu tick. Đã xác nhận `HNX:VN30F1!` chạy được Tầng 1.
- **`col_tf` không chia hết cho khung chart** (vd `col_tf=5` trên chart 3m): mỗi khung 5 phút chứa 1 hoặc 2 nến, nên cột rộng không đều và trông như "mất cột". Để Chart hoặc chọn bội số của khung chart.
- Box neo `xloc.bar_time`. Ở chế độ **Volume Candles** (độ rộng nến tỷ lệ volume), cột có thể lệch nhẹ so với nến.
- TPO Count quét lại toàn phiên mỗi nến (chưa tối ưu incremental). Đã giới hạn `calc_bars_count=3000`; ẩn dòng TPO Count để bỏ qua phần này.
- Script chỉ gọi `request.footprint()` 1 lần (giới hạn của Pine).
- Giới hạn vẽ: `max_boxes_count=500`.

## Changelog

- **v1.0**: Phát hành lần đầu, 7 dòng (Delta, CVD, TPO Count, Day Type, Open Type, RF, RSI), mỗi cột = 1 nến M1.
- **v1.1**: Cột gộp theo N phút; RSI tính thật theo khung qua `request.security()`.
- **v1.2**: Tăng cỡ chữ, thêm nhãn tên dòng.
- **v1.3**: Sửa khung cuối phiên sáng không hiện cột.
- **v1.4**: Input khung gộp cột dạng timeframe; thêm VAH/POC/VAL, toggle từng dòng, input cỡ chữ.
- **v1.5**: Grid tự co khi ẩn dòng; bỏ hẳn Day Type & Open Type.
- **v1.6**: Delta/CVD hiện đúng 2 số lẻ (`f_format_delta()`).
- **v1.7**: Thêm dòng Time.
- **v1.8**: CVD cột đầu phiên khớp Delta.
- **v1.9**: Chia lại input group; tên dòng neo trục giá; box neo `bar_index`.
- **v1.10–v1.11**: Thử cơ chế lấp gap cho khung không có nến (đã bỏ ở v1.13).
- **v1.12**: Bỏ hẳn VAH/POC/VAL, còn 6 dòng.
- **v1.13**: (1) Cột căn đúng tâm nến (box neo `xloc.bar_time`, mép tại điểm giữa 2 nến). (2) Ô tạo ngay ở nến đầu khung và cập nhật theo từng nến. (3) `col_tf` mặc định = khung chart; xác nhận "mất cột 14:03" là do `col_tf=5` trên chart 3m. (4) Bỏ gap fill và biến flush cũ; gọn comment, chuyển changelog sang tài liệu. Backup bản trước tại `indicators/hist/order_flow_profile_panel_v1.12.4.pine`.
