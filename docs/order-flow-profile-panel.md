# Order Flow & Market Profile Panel — Tài Liệu

> **Script**: [indicators/order_flow_profile_panel.pine](../indicators/order_flow_profile_panel.pine) (v1.4)
> **Loại**: Indicator (pane riêng, không overlay)
> **Pine Script**: v6
> **Ngày tạo**: 2026-11-14 / **Cập nhật**: 2026-11-14

## Tổng Quan

Pane riêng (giống pane Delta footprint gốc của TradingView) hiển thị dữ liệu dạng grid, trôi đồng bộ theo trục thời gian với chart chính (dùng `box.new(xloc=xloc.bar_time)`, không dùng `table.*` vì `table.*` neo cố định góc màn hình, không đồng bộ thời gian). Thiết kế cho trader scalping nến M1 cần theo dõi order flow trong phiên và cấu trúc phiên theo phương pháp Market Profile ("Mind over Markets").

Chart chính chạy **M1** (để vào lệnh chính xác). 8 dòng gộp cột (Delta/CVD/VAH/POC/VAL/TPO Count/RF/RSI) **gộp mỗi cột thành 1 khung thời gian `col_tf`** (chọn qua dropdown timeframe chuẩn Pine, mặc định 5 phút) độc lập với khung chart. Day Type & Open Type mỗi dòng là 1 box duy nhất merge full phiên (D1), **không bị gộp cột** — luôn trải đúng từ đầu phiên.

Thứ tự 10 dòng (trên xuống): **Delta** → **CVD** → **VAH** → **POC** → **VAL** → **TPO Count** (trên/dưới POC) → **RF** (Rotation Factor) → **Open Type** → **Day Type** → **RSI**. Mỗi dòng có toggle ẩn/hiện riêng (nhóm input "Hiện/Ẩn Dòng") — **ẩn thì bỏ qua cả phần tính toán nặng tương ứng**, không chỉ ẩn vẽ (xem mục Logic Chính §6).

**Phase 1/2**: file độc lập, tự chứa toàn bộ logic (không import, không sửa `indicators/market_profile.pine`). Phase 2 (sau, nếu Phase 1 chạy ổn trên mã thật) sẽ tách engine Market Profile dùng chung thành library riêng.

Engine Day Type/Open Type/RF/TPO Count/VAH/POC/VAL được **port từ `market_profile.pine` v1.2** (giữ nguyên thuật toán, bỏ phần chỉ phục vụ vẽ như Naked POC/Tails-giá/Poor High-Low/80% Rule/Ledge/Spike vì không cần cho các metric mục tiêu).

## Tham Số Đầu Vào

| Tham Số | Loại | Mặc Định | Group | Mô Tả |
|---|---|---|---|---|
| Ticks mỗi dòng | `int` | `10` | Footprint | `ticks_per_row` cho `request.footprint()` |
| Value Area (%) | `float` | `70.0` | Footprint | `va_percent` cho `request.footprint()` **và** VA walk nội bộ (chia 100 tại điểm dùng) |
| Ngưỡng Imbalance (%) | `float` | `300.0` | Footprint | `imbalance_percent` cho `request.footprint()` |
| Khung Thời Gian Dự Phòng | `string` | `"1S"` | Footprint | Lower TF dùng ở Tầng 2 khi `request.footprint()` không có dữ liệu |
| Khung Gộp Cột | `timeframe` | `"5"` | Hiển Thị | `col_tf` — dropdown timeframe chuẩn Pine (1, 5, 15, 30, 60, 120, 240, 1D, 1W...) cho 8 dòng gộp cột |
| Số Cột Hiển Thị | `int` | `60` (10–60) | Hiển Thị | Rolling window cho 8 dòng gộp cột (giới hạn `max_boxes_count=500`: 8 dòng × 60 + 2 box Day/Open Type = 482 < 500) |
| Cỡ Chữ Hiển Thị | `string` | `"Small"` | Hiển Thị | `Tiny`/`Small`/`Normal`/`Large` — áp dụng cho mọi box/label trong panel |
| Hiện hậu tố nguồn Delta | `bool` | `true` | Hiển Thị | Hiện/ẩn hậu tố `F`/`L`/`A` ở ô Delta |
| Delta / CVD / VAH / POC / VAL / TPO Count / RF / Open Type / Day Type / RSI | `bool` ×10 | `true` | Hiện/Ẩn Dòng | Mỗi dòng 1 toggle riêng — ẩn thì bỏ qua cả tính toán liên quan, không chỉ ẩn vẽ |
| Độ Phân Giải Lưới Giá TPO | `int` | `60` (20–120) | Market Profile | Số hàng chia phiên để đếm TPO |
| Số Nến Tính Initial Balance | `int` | `60` (1–120) | Market Profile | Mặc định 60 nến M1 = 1 giờ (chuẩn IB cổ điển) |
| Chu Kỳ RSI | `int` | `14` | RSI | Dùng cho RSI thật theo khung `col_tf` (`request.security()`), không phải RSI(M1) |
| Nguồn RSI | `source` | `close` | RSI | |

## Logic Chính

1. **Reset phiên** (`timeframe.change("D")`): lưu `prev_vah/prev_val`, khởi tạo `OFProfile` mới, clear mảng `arr_highs`/`arr_lows`.
2. **Market Profile engine** (mỗi bar, toàn phiên tới hiện tại — "developing"): dựng histogram TPO theo `grid_rows` → POC → VAH/VAL (VA walk) → TPO Count trên/dưới POC → single-prints giữa phiên (`has_sp_mid`) → phân loại Day Type / Open Type (dựa trên `total_ratio`, `rf_score`, vị trí mở cửa trong IB, hướng mở rộng đầu tiên).
3. **RF (Rotation Factor)**: cộng dồn mỗi bar +1/-1 theo so sánh high/low với bar trước, reset mỗi phiên.
4. **Delta/CVD — 3 tầng fallback** mỗi bar:
   - Tầng 1: `request.footprint()` → `fp.delta()` (cần Premium/Ultimate + sàn hỗ trợ tick-level).
   - Tầng 2: `request.security_lower_tf(lower_tf_fallback)` → phân loại buy/sell volume theo close>open của nến con.
   - Tầng 3: xấp xỉ thuần OHLCV kiểu Chaikin `volume*((close-low)-(high-close))/(high-low)` khi 2 tầng trên không có dữ liệu.
   - `cvd` cộng dồn `nz(delta)` theo nến đã đóng (`barstate.isconfirmed`), reset khi phiên mới.
5. **Gộp cột `col_tf`**: `is_new_col = timeframe.change(col_tf)` phát hiện biên khung mới dù chart chạy M1. Khi biên mới bắt đầu, "flush" khung vừa đóng thành 1 cột: **Delta** = tổng `delta` các nến M1 trong khung (`bucket_delta_sum`), **CVD/VAH/POC/VAL/TPO Count/RF** = lấy mẫu giá trị tích lũy-theo-phiên *tại thời điểm đó* (không cộng dồn thêm — các chỉ số này đã là "developing" theo toàn phiên), **RSI** = `rsi_5m` (RSI thật tính qua `request.security(syminfo.tickerid, col_tf, ta.rsi(...))`, không phải lấy mẫu RSI(M1)). Toạ độ box lấy từ `bucket_start_time`/`bucket_last_time` (time thật của nến M1 đầu/cuối khung), không suy từ `col_tf` để tránh sai lệch qua các mốc có gap dữ liệu (nghỉ trưa, qua đêm).
6. **Ẩn dòng = bỏ qua tính toán** (không chỉ ẩn vẽ), qua các cờ "simple" (chỉ phụ thuộc input.bool, cố định suốt vòng chạy script — hợp lệ để gate `request.*()` vì Pine v6 cho phép gọi `request.*()` trong `if` khi điều kiện là simple, không phải series):
   - `need_delta = show_delta or show_cvd` → gate toàn bộ `request.footprint()`/`request.security_lower_tf()` (Section 6).
   - `need_tpo_grid = show_vah or show_poc or show_val or show_tpo or show_opentype or show_daytype` → gate động cơ TPO grid (Section 5, phần nặng nhất, O(số nến phiên × `grid_rows`) mỗi bar) **và** việc push vào `arr_highs`/`arr_lows`.
   - `need_ib = show_opentype or show_daytype` → gate tracking Initial Balance (`ib_high`/`ib_low`/`ib_locked`/`ext_up_first`/`ext_dn_first`).
   - `need_rf = show_rf or show_daytype` → gate tính Rotation Factor (Day Type cũng cần `rf_score` cho nhánh Trend/Nontrend).
   - `show_rsi=false` → bỏ qua `request.security()` tính RSI theo `col_tf`.
7. **Renderer**: `f_push_cell()` tạo 1 box/cột (toạ độ `xloc.bar_time`, biên đúng `[đầu khung, cuối khung)`) cho 8 dòng gộp cột, tự xoá box cũ nhất khi vượt `n_bars_display` (giống pattern FIFO đã dùng cho Naked POC trong `market_profile.pine`). Day Type/Open Type dùng 1 box/phiên (không theo `col_tf`), cập nhật `right`/`text`/màu tại chỗ mỗi nến M1.
8. **Nhãn tên dòng**: `label.new()` đặt ngay bên phải cột/band mới nhất (`bar_index + 2`), cập nhật vị trí mỗi bar để không bị cuộn mất khỏi màn hình. Dòng bị ẩn thì không tạo nhãn.

## Output / Tín Hiệu Trên Chart

- Pane riêng, 10 dòng theo thứ tự Delta/CVD/VAH/POC/VAL/TPO Count/RF/Open Type/Day Type/RSI:
  - Delta/CVD/RF: xanh forest (dương) / đỏ burgundy (âm) / xám (trung tính). Ô Delta có hậu tố `F`/`L`/`A` (tắt được qua input) cho biết đang chạy tầng fallback nào (Footprint/LowerTF/OHLCV-Approx).
  - VAH/POC/VAL: giá trị session, màu navy trung tính (không phân loại theo dấu vì là mức giá, không phải delta).
  - TPO Count: hiển thị `trên/dưới`, màu theo bên nào nhiều TPO hơn.
  - RSI: đỏ nhạt khi >70, xanh khi <30, navy khi giữa.
  - Day Type: màu theo `f_get_daytype_color()` (Trend=xanh đậm, Double-Distribution=tím, Neutral=cam, Nontrend=xám than, còn lại=navy). Open Type: navy cố định.
- Nhãn tên dòng bám theo cột mới nhất, cỡ chữ theo input "Cỡ Chữ Hiển Thị" (áp dụng chung cho toàn panel).

## Giới Hạn & Lưu Ý

- `request.footprint()` yêu cầu TradingView Premium/Ultimate và sàn hỗ trợ dữ liệu tick-level — **chưa xác nhận `HNX:VN30F1!` có hỗ trợ hay không** (đã xác nhận có, chạy Tầng 1 "F" theo phản hồi thực tế). Nếu không, panel tự chuyển Tầng 2/3.
- 8 dòng gộp cột chỉ giữ tối đa `n_bars_display` (10–60) cột gần nhất do giới hạn `max_boxes_count=500` của Pine. Ở `col_tf="5"` (mặc định), 60 cột ≈ 300 phút ≈ 5 giờ — "max về trước" thực tế theo đúng giới hạn cứng của Pine, không phải vô hạn. Khi zoom xem xa hơn ngưỡng này, các cột cũ hơn sẽ trống, trong khi 2 băng Day Type/Open Type vẫn trải đúng full phiên (chỉ 1 box/phiên, không bị giới hạn này).
- Động cơ TPO quét lại toàn bộ bar trong phiên mỗi bar mới (giống `market_profile.pine`, chưa tối ưu incremental) — nặng hơn bản 30 phút gốc ~2 bậc độ lớn do chạy trên M1; đã giới hạn `calc_bars_count=3000` trong `indicator()`, và từ v1.4 có thể bỏ qua hoàn toàn nếu ẩn hết VAH/POC/VAL/TPO Count/Open Type/Day Type (xem Logic Chính §6).
- Chỉ 1 lệnh `request.footprint()` duy nhất trong toàn script (giới hạn của Pine), đặt trong `if need_delta` — Pine v6 cho phép `request.*()` trong `if` khi điều kiện chỉ phụ thuộc input (simple), không phải dữ liệu series. Nếu `lower_tf_fallback` không hợp lệ cho symbol/chart, `request.security_lower_tf()` dùng `ignore_invalid_timeframe=true` để tụt xuống Tầng 3 thay vì làm lỗi cả script.
- Giới hạn vẽ: `max_boxes_count=500`, `max_labels_count=500`.
- 8 dòng box dùng `xloc.bar_time` (biên thật `[bucket_start_time, bucket_last_time + 1 bar chart]`) vì `box.new()` yêu cầu toạ độ `series int` khi dùng `xloc.bar_index`.
- Cột các dòng gộp chỉ hiện khung `col_tf` *đã đóng hoàn toàn* (flush khi qua biên mới) — khung đang hình thành (gần nhất với hiện tại) chưa có cột, đúng 1 nhịp trễ tối đa `col_tf`, tương tự cách 1 nến H1 chỉ "chốt" khi qua giờ mới.

## Changelog

- **v1.0** (2026-11-14): Phát hành lần đầu (Phase 1 — file độc lập). Đã qua 1 vòng review toàn branch trước khi test thật trên TradingView, fix 3 lỗi Critical (box.new nhận float cho left/right, band Day/Open Type lỗi runtime ở bar đầu lịch sử, `ib_bars_cnt` sai đơn vị cho M1) + 4 cải tiến Important (fallback lower-tf không raise lỗi, chặn NaN propagation vào CVD, giới hạn `calc_bars_count`, neo scale pane bằng 2 plot trong suốt).
- **v1.1** (2026-11-14): Sau khi xem thử trên chart thật, đổi 5 dòng động từ "1 cột = 1 nến M1" sang "1 cột = N phút" (mặc định 5, input riêng) để xem được nhiều lịch sử hơn trong giới hạn 500 box — Delta cộng tổng theo khung, CVD/TPO/RF lấy mẫu tại cuối khung, RSI đổi sang tính thật theo khung qua `request.security()` thay vì lấy mẫu RSI(M1). Backup v1.0 tại `indicators/hist/order_flow_profile_panel_v1.0.pine`.
- **v1.2** (2026-11-14): Chữ trong box quá nhỏ không đọc được — tăng cỡ chữ 5 dòng động (`tiny`→`small`) và Day/Open Type (`small`→`normal`). Thêm nhãn tên dòng bám theo cột mới nhất. Backup v1.1 tại `indicators/hist/order_flow_profile_panel_v1.1.pine`.
- **v1.3** (2026-11-14): Sửa lỗi khung cuối phiên sáng (vd `11:25-11:30` trên `VN30F1!`) không hiện cột gì — box cũ suy toạ độ trái từ "time hiện tại - N phút" tại lúc flush, nhưng nến flush khung cuối phiên sáng là nến đầu phiên chiều (sau gap nghỉ trưa) nên tính sai hoàn toàn. Đổi sang lưu đúng `time` của nến M1 đầu/cuối mỗi khung. Backup v1.2 tại `indicators/hist/order_flow_profile_panel_v1.2.pine`.
- **v1.4** (2026-11-14): (1) Đổi input khung gộp cột từ số phút (`input.int`) sang dropdown timeframe chuẩn (`input.timeframe`, hỗ trợ 1m/5m/15m/30m/1h/2h/4h/1D/1W...). (2) Thêm toggle ẩn/hiện hậu tố F/L/A ở Delta. (3) Đổi thứ tự dòng thành Delta/CVD/VAH/POC/VAL/TPO Count/RF/Open Type/Day Type/RSI. (4) Thêm input chọn cỡ chữ (Tiny/Small/Normal/Large) áp dụng toàn panel. (5) Thêm 3 dòng VAH/POC/VAL (lấy mẫu `prof.vah/poc/val` cuối mỗi khung gộp cột, giống cách CVD/TPO/RF đang làm). (6) Thêm toggle ẩn/hiện riêng từng dòng — ẩn thì bỏ qua cả phần tính toán nặng liên quan, không chỉ ẩn vẽ (xem Logic Chính §6). Backup v1.3 tại `indicators/hist/order_flow_profile_panel_v1.3.pine`.
