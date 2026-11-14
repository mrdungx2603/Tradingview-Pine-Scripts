# Order Flow & Market Profile Panel — Tài Liệu

> **Script**: [indicators/order_flow_profile_panel.pine](../indicators/order_flow_profile_panel.pine) (v1.2)
> **Loại**: Indicator (pane riêng, không overlay)
> **Pine Script**: v6
> **Ngày tạo**: 2026-11-14 / **Cập nhật**: 2026-11-14

## Tổng Quan

Pane riêng (giống pane Delta footprint gốc của TradingView) hiển thị 7 dòng dữ liệu dạng grid, trôi đồng bộ theo trục thời gian với chart chính (dùng `box.new(xloc=xloc.bar_time)`, không dùng `table.*` vì `table.*` neo cố định góc màn hình, không đồng bộ thời gian). Thiết kế cho trader scalping nến M1 cần theo dõi order flow trong phiên và cấu trúc phiên theo phương pháp Market Profile ("Mind over Markets").

Chart chính chạy **M1** (để vào lệnh chính xác). 5 dòng động (Delta/CVD/TPO Count/RF/RSI) **gộp mỗi cột thành 1 khung `col_minutes` phút** (mặc định 5, input riêng) độc lập với khung chart — để xem được nhiều lịch sử hơn trong giới hạn 500 box của Pine mà vẫn giữ chart chính ở M1. Day Type & Open Type mỗi dòng là 1 box duy nhất merge full phiên (D1), **không bị gộp cột** — luôn trải đúng từ đầu phiên.

7 dòng (trên xuống): **Delta**, **CVD**, **TPO Count** (trên/dưới POC), **Day Type**, **Open Type**, **RF** (Rotation Factor), **RSI**.

**Phase 1/2**: file độc lập, tự chứa toàn bộ logic (không import, không sửa `indicators/market_profile.pine`). Phase 2 (sau, nếu Phase 1 chạy ổn trên mã thật) sẽ tách engine Market Profile dùng chung thành library riêng.

Engine Day Type/Open Type/RF/TPO Count được **port từ `market_profile.pine` v1.2** (giữ nguyên thuật toán, bỏ phần chỉ phục vụ vẽ như Naked POC/Tails-giá/Poor High-Low/80% Rule/Ledge/Spike vì không cần cho 4 metric mục tiêu).

## Tham Số Đầu Vào

| Tham Số | Loại | Mặc Định | Group | Mô Tả |
|---|---|---|---|---|
| Ticks mỗi dòng | `int` | `10` | Footprint | `ticks_per_row` cho `request.footprint()` |
| Value Area (%) | `float` | `70.0` | Footprint | `va_percent` cho `request.footprint()` **và** VA walk nội bộ (chia 100 tại điểm dùng) |
| Ngưỡng Imbalance (%) | `float` | `300.0` | Footprint | `imbalance_percent` cho `request.footprint()` |
| Khung Thời Gian Dự Phòng | `string` | `"1S"` | Footprint | Lower TF dùng ở Tầng 2 khi `request.footprint()` không có dữ liệu |
| Độ Dài Mỗi Cột (phút) | `int` | `5` (1–60) | Hiển Thị | `col_minutes` — gộp 5 dòng động từ nến M1 thành 1 cột mỗi N phút |
| Số Cột Hiển Thị | `int` | `95` (10–95) | Hiển Thị | Rolling window cho 5 dòng động (giới hạn bởi `max_boxes_count=500`: 5 dòng × 95 + 2 box Day/Open Type ≈ 477 < 500) |
| Độ Phân Giải Lưới Giá TPO | `int` | `60` (20–120) | Market Profile | Số hàng chia phiên để đếm TPO |
| Số Nến Tính Initial Balance | `int` | `60` (1–120) | Market Profile | Mặc định 60 nến M1 = 1 giờ (chuẩn IB cổ điển), không còn copy nguyên giá trị "2 nến" của bản 30 phút trong `market_profile.pine` |
| Chu Kỳ RSI | `int` | `14` | RSI | Dùng cho RSI thật theo khung `col_minutes` phút (`request.security()`), không phải RSI(M1) |
| Nguồn RSI | `source` | `close` | RSI | |

## Logic Chính

1. **Reset phiên** (`timeframe.change("D")`): lưu `prev_vah/prev_val`, khởi tạo `OFProfile` mới, clear mảng `arr_highs`/`arr_lows`.
2. **Market Profile engine** (mỗi bar, toàn phiên tới hiện tại — "developing"): dựng histogram TPO theo `grid_rows` → POC → VAH/VAL (VA walk) → TPO Count trên/dưới POC → single-prints giữa phiên (`has_sp_mid`) → phân loại Day Type / Open Type (dựa trên `total_ratio`, `rf_score`, vị trí mở cửa trong IB, hướng mở rộng đầu tiên).
3. **RF (Rotation Factor)**: cộng dồn mỗi bar +1/-1 theo so sánh high/low với bar trước, reset mỗi phiên.
4. **Delta/CVD — 3 tầng fallback** mỗi bar:
   - Tầng 1: `request.footprint()` → `fp.delta()` (cần Premium/Ultimate + sàn hỗ trợ tick-level).
   - Tầng 2: `request.security_lower_tf(lower_tf_fallback)` → phân loại buy/sell volume theo close>open của nến con.
   - Tầng 3: xấp xỉ thuần OHLCV kiểu Chaikin `volume*((close-low)-(high-close))/(high-low)` khi 2 tầng trên không có dữ liệu.
   - `cvd` cộng dồn `delta` theo nến đã đóng (`barstate.isconfirmed`), reset khi phiên mới.
5. **Gộp cột `col_minutes` phút**: `is_new_col = timeframe.change(str.tostring(col_minutes))` phát hiện biên khung mới dù chart chạy M1. Khi biên mới bắt đầu, "flush" khung vừa đóng thành 1 cột: **Delta** = tổng `delta` các nến M1 trong khung (`bucket_delta_sum`), **CVD/TPO Count/RF** = lấy mẫu giá trị tích lũy-theo-phiên *tại thời điểm đó* (không cộng dồn thêm — các chỉ số này đã là "developing" theo toàn phiên), **RSI** = `rsi_5m` (RSI thật tính qua `request.security(syminfo.tickerid, col_minutes, ta.rsi(...))`, không phải lấy mẫu RSI(M1)).
6. **Renderer**: `f_push_cell()` tạo 1 box/cột (toạ độ `xloc.bar_time`, biên đúng `[đầu khung, cuối khung)`) cho 5 dòng động, tự xoá box cũ nhất khi vượt `n_bars_display` (giống pattern FIFO đã dùng cho Naked POC trong `market_profile.pine`). Day Type/Open Type dùng 1 box/phiên (không theo `col_minutes`), cập nhật `right`/`text`/màu tại chỗ mỗi nến M1.

## Output / Tín Hiệu Trên Chart

- Pane riêng, 7 dòng box màu theo cột nến:
  - Delta/CVD/RF: xanh forest (dương) / đỏ burgundy (âm) / xám (trung tính). Ô Delta có hậu tố `F`/`L`/`A` cho biết đang chạy tầng fallback nào (Footprint/LowerTF/OHLCV-Approx).
  - TPO Count: hiển thị `trên/dưới`, màu theo bên nào nhiều TPO hơn.
  - RSI: đỏ nhạt khi >70, xanh khi <30, navy khi giữa.
  - Day Type: màu theo `f_get_daytype_color()` (Trend=xanh đậm, Double-Distribution=tím, Neutral=cam, Nontrend=xám than, còn lại=navy). Open Type: navy cố định.

## Giới Hạn & Lưu Ý

- `request.footprint()` yêu cầu TradingView Premium/Ultimate và sàn hỗ trợ dữ liệu tick-level — **chưa xác nhận `HNX:VN30F1!` có hỗ trợ hay không**, cần test trực tiếp trong Pine Editor; nếu không, panel tự chuyển Tầng 2/3.
- 5 dòng động (Delta/CVD/TPO/RF/RSI) chỉ giữ tối đa `n_bars_display` (10–95) cột gần nhất do giới hạn `max_boxes_count=500` của Pine. Ở `col_minutes=5` (mặc định), 95 cột ≈ 475 phút ≈ ~8 giờ ≈ khoảng 1-2 phiên `VN30F1!` gần nhất — "max về trước" thực tế theo đúng giới hạn cứng của Pine, không phải vô hạn. Khi zoom xem xa hơn ngưỡng này, các cột cũ hơn sẽ trống, trong khi 2 băng Day Type/Open Type vẫn trải đúng full phiên (chỉ 1 box/phiên, không bị giới hạn này).
- Động cơ TPO quét lại toàn bộ bar trong phiên mỗi bar mới (giống `market_profile.pine`, chưa tối ưu incremental) — nặng hơn bản 30 phút gốc ~2 bậc độ lớn do chạy trên M1; đã giới hạn `calc_bars_count=3000` trong `indicator()` để không tính toán trên toàn bộ lịch sử nạp vào chart (vẫn đủ phủ nhiều phiên liên tiếp cho band Day/Open Type).
- Chỉ 1 lệnh `request.footprint()` duy nhất trong toàn script (giới hạn của Pine). Nếu `lower_tf_fallback` không hợp lệ cho symbol/chart (vd cao hơn khung chart), `request.security_lower_tf()` dùng `ignore_invalid_timeframe=true` để tụt xuống Tầng 3 thay vì làm lỗi cả script.
- Giới hạn vẽ: `max_boxes_count=500`, `max_labels_count=500`.
- 5 dòng box dùng `xloc.bar_time` (biên thật `[bucket_end_time - col_minutes*60000, bucket_end_time]`) vì `box.new()` yêu cầu toạ độ `series int` khi dùng `xloc.bar_index`.
- `request.security(syminfo.tickerid, col_tf_str, ...)` — nếu `col_minutes` nhỏ hơn khung chart (lý thuyết, vì chart cố định M1 nên không xảy ra trong thiết kế hiện tại) sẽ cần cân nhắc lại; với `col_minutes >= 1` trên chart M1 luôn hợp lệ.
- Cột 5 dòng động chỉ hiện khung `col_minutes` phút *đã đóng hoàn toàn* (flush khi qua biên mới) — khung đang hình thành (gần nhất với hiện tại) chưa có cột, đúng 1 nhịp trễ tối đa `col_minutes` phút, tương tự cách 1 nến H1 chỉ "chốt" khi qua giờ mới.

## Changelog

- **v1.0** (2026-11-14): Phát hành lần đầu (Phase 1 — file độc lập). Đã qua 1 vòng review toàn branch trước khi test thật trên TradingView, fix 3 lỗi Critical (box.new nhận float cho left/right, band Day/Open Type lỗi runtime ở bar đầu lịch sử, `ib_bars_cnt` sai đơn vị cho M1) + 4 cải tiến Important (fallback lower-tf không raise lỗi, chặn NaN propagation vào CVD, giới hạn `calc_bars_count`, neo scale pane bằng 2 plot trong suốt).
- **v1.1** (2026-11-14): Sau khi xem thử trên chart thật, đổi 5 dòng động từ "1 cột = 1 nến M1" sang "1 cột = `col_minutes` phút" (mặc định 5, input riêng) để xem được nhiều lịch sử hơn trong giới hạn 500 box — Delta cộng tổng theo khung, CVD/TPO/RF lấy mẫu tại cuối khung, RSI đổi sang tính thật theo khung `col_minutes` qua `request.security()` thay vì lấy mẫu RSI(M1). Nâng `n_bars_display` lên tối đa 95. Backup v1.0 tại `indicators/hist/order_flow_profile_panel_v1.0.pine`.
- **v1.2** (2026-11-14): Chữ trong box quá nhỏ không đọc được — tăng cỡ chữ 5 dòng động (`tiny`→`small`) và Day/Open Type (`small`→`normal`). Thêm nhãn tên dòng (Delta/CVD/TPO Count/Day Type/Open Type/RF/RSI) bằng `label.new()` bám theo cột mới nhất (`bar_index + 2`, cập nhật mỗi bar) — không dùng `table.*` vì bảng neo góc màn hình sẽ không khớp đúng vị trí y 0..7 của các box dữ liệu. Backup v1.1 tại `indicators/hist/order_flow_profile_panel_v1.1.pine`.
