# Order Flow & Market Profile Panel — Tài Liệu

> **Script**: [indicators/order_flow_profile_panel.pine](../indicators/order_flow_profile_panel.pine) (v1.10)
> **Loại**: Indicator (pane riêng, không overlay)
> **Pine Script**: v6
> **Ngày tạo**: 2026-11-14 / **Cập nhật**: 2026-11-14

## Tổng Quan

Pane riêng (giống pane Delta footprint gốc của TradingView) hiển thị dữ liệu dạng grid, trôi đồng bộ theo chart chính (dùng `box.new(xloc=xloc.bar_index)` — neo theo **thứ tự nến**, không phải thời gian thật, để luôn khớp đúng vị trí render ngay cả khi chart ở chế độ hiển thị không tuyến tính theo thời gian như "Volume Candles"; không dùng `table.*` vì `table.*` neo cố định góc màn hình, không đồng bộ với trục ngang của chart). Thiết kế cho trader scalping nến M1 cần theo dõi order flow trong phiên và cấu trúc giá theo phương pháp Market Profile ("Mind over Markets").

Chart chính chạy **M1** (để vào lệnh chính xác). Mỗi dòng **gộp cột thành 1 khung thời gian `col_tf`** (chọn qua dropdown timeframe chuẩn Pine, mặc định 5 phút) độc lập với khung chart.

Thứ tự dòng (trên xuống): **Delta** → **CVD** → **VAH** → **POC** → **VAL** → **TPO Count** (trên/dưới POC) → **RF** (Rotation Factor) → **RSI**. Mỗi dòng có toggle ẩn/hiện riêng (nhóm input "Hiện/Ẩn Dòng"):

- **Ẩn thì bỏ qua cả phần tính toán nặng tương ứng**, không chỉ ẩn vẽ (xem Logic Chính §5).
- **Ẩn thì grid tự co lại** — dòng ẩn không chiếm vị trí y, các dòng còn lại tự dồn lên khít nhau (không chừa khoảng trống).

**Phase 1/2**: file độc lập, tự chứa toàn bộ logic (không import, không sửa `indicators/market_profile.pine`). Phase 2 (sau, nếu Phase 1 chạy ổn trên mã thật) sẽ tách engine Market Profile dùng chung thành library riêng.

Engine POC/VAH/VAL/TPO Count/RF được **port từ `market_profile.pine` v1.2** (giữ nguyên thuật toán TPO grid/POC/Value Area). Từ v1.5, **không còn Day Type & Open Type** — đã bỏ hẳn (không chỉ ẩn) vì không dùng tới: phân loại, band vẽ, tracking Initial Balance, tails/single-prints chỉ phục vụ 2 chỉ số đó.

## Tham Số Đầu Vào

Chia theo 5 nhóm chức năng (khớp đúng tên group hiện trong Settings):

| Tham Số | Loại | Mặc Định | Group | Mô Tả |
|---|---|---|---|---|
| Ticks mỗi dòng | `int` | `10` | Footprint & Delta | `ticks_per_row` cho `request.footprint()` — xem giải thích riêng ở cuối mục này |
| Value Area (%) | `float` | `70.0` | Footprint & Delta | `va_percent` cho `request.footprint()` **và** VA walk nội bộ (chia 100 tại điểm dùng) |
| Ngưỡng Imbalance (%) | `float` | `300.0` | Footprint & Delta | `imbalance_percent` cho `request.footprint()` |
| Khung Thời Gian Dự Phòng | `string` | `"1S"` | Footprint & Delta | Lower TF dùng ở Tầng 2 khi `request.footprint()` không có dữ liệu |
| Hiện hậu tố nguồn Delta | `bool` | `true` | Footprint & Delta | Hiện/ẩn hậu tố `F`/`L`/`A` ở ô Delta |
| Khung Gộp Cột | `timeframe` | `"5"` | Market Profile & Khung Gộp Cột | `col_tf` — dropdown timeframe chuẩn Pine (1, 5, 15, 30, 60, 120, 240, 1D, 1W...), ảnh hưởng mọi dòng gộp cột (không riêng hiển thị nên gộp cùng nhóm Market Profile) |
| Độ Phân Giải Lưới Giá TPO | `int` | `60` (20–120) | Market Profile & Khung Gộp Cột | `grid_rows` — số hàng chia phiên để đếm TPO |
| Time / Delta / CVD / VAH / POC / VAL / TPO Count / RF / RSI | `bool` ×9 | `true` | Hiện/Ẩn Dòng | Mỗi dòng 1 toggle riêng — ẩn thì bỏ qua cả tính toán liên quan và không chiếm chỗ trên grid |
| Số Cột Hiển Thị | `int` | `55` (10–55) | Hiển Thị (Giao Diện) | Rolling window cho tất cả dòng (giới hạn `max_boxes_count=500`: tối đa 9 dòng × 55 = 495 < 500) |
| Cỡ Chữ Hiển Thị | `string` | `"Small"` | Hiển Thị (Giao Diện) | `Tiny`/`Small`/`Normal`/`Large` — áp dụng cho mọi box/plot tên dòng trong panel |
| Chu Kỳ RSI | `int` | `14` | RSI | Dùng cho RSI thật theo khung `col_tf` (`request.security()`), không phải RSI(M1) |
| Nguồn RSI | `source` | `close` | RSI | |

**`ticks_per_row` nghĩa là gì?** Đây là tham số đầu tiên của `request.footprint(ticks_per_row, va_percent, imbalance_percent)` — nó quy định độ phân giải giá *bên trong cấu trúc footprint*: footprint chia range giá mỗi nến thành các "dòng" (row) ngang (giống 1 volume profile mini cho từng nến), và `ticks_per_row` nói mỗi dòng đó rộng bao nhiêu tick giá tối thiểu (`syminfo.mintick`). Ví dụ `ticks_per_row=10` trên mã có tick size 0.1 nghĩa là mỗi dòng rộng 1.0 điểm giá. **Panel này chỉ dùng `fp.delta()`** (tổng buy-sell của cả nến, không phải theo từng dòng giá), nên tham số này **không ảnh hưởng gì tới số liệu Delta/CVD hiển thị** — chỉ cần có giá trị hợp lệ (≥1) để `request.footprint()` chạy được. Nó sẽ có ý nghĩa nếu sau này panel dùng thêm `fp.rows()`/imbalance theo từng mức giá (chưa làm ở Phase 1).

## Logic Chính

1. **Reset phiên** (`timeframe.change("D")`): khởi tạo `OFProfile` mới (`start_bar`, `sess_high`, `sess_low`, `rf_score`), clear mảng `arr_highs`/`arr_lows`.
2. **Market Profile engine** (mỗi bar, toàn phiên tới hiện tại — "developing"): dựng histogram TPO theo `grid_rows` → POC → VAH/VAL (VA walk) → TPO Count trên/dưới POC.
3. **RF (Rotation Factor)**: cộng dồn mỗi bar +1/-1 theo so sánh high/low với bar trước, reset mỗi phiên.
4. **Delta/CVD — 3 tầng fallback** mỗi bar (xem lưu ý thứ tự Section 6 trước Section 7 ở Giới Hạn & Lưu Ý — quan trọng để CVD cột đầu phiên khớp đúng Delta cột đó):
   - Tầng 1: `request.footprint()` → `fp.delta()` (cần Premium/Ultimate + sàn hỗ trợ tick-level).
   - Tầng 2: `request.security_lower_tf(lower_tf_fallback)` → phân loại buy/sell volume theo close>open của nến con.
   - Tầng 3: xấp xỉ thuần OHLCV kiểu Chaikin `volume*((close-low)-(high-close))/(high-low)` khi 2 tầng trên không có dữ liệu.
   - `cvd` cộng dồn `nz(delta)` theo nến đã đóng (`barstate.isconfirmed`), reset khi phiên mới.
5. **Ẩn dòng = bỏ qua tính toán** (không chỉ ẩn vẽ), qua các cờ "simple" (chỉ phụ thuộc input.bool, cố định suốt vòng chạy script — hợp lệ để gate `request.*()` vì Pine v6 cho phép gọi `request.*()` trong `if` khi điều kiện là simple, không phải series):
   - `need_delta = show_delta or show_cvd` → gate toàn bộ `request.footprint()`/`request.security_lower_tf()` (Section 6).
   - `need_tpo_grid = show_vah or show_poc or show_val or show_tpo` → gate động cơ TPO grid (Section 5, phần nặng nhất, O(số nến phiên × `grid_rows`) mỗi bar) **và** việc push vào `arr_highs`/`arr_lows`.
   - `need_rf = show_rf` → gate tính Rotation Factor.
   - `show_rsi=false` → bỏ qua `request.security()` tính RSI theo `col_tf`.
6. **Vị trí dòng tính động** (`y_cursor`, Section 2): đếm từ dưới (RSI) lên theo thứ tự cố định, chỉ cấp số thứ tự Y cho dòng đang hiện — dòng ẩn không được cấp Y, nên không chiếm chỗ; các dòng còn lại tự dồn khít. Scale pane neo theo `0..total_rows_visible` (số dòng đang hiện).
7. **Gộp cột `col_tf`**: `is_new_col = timeframe.change(col_tf)` phát hiện biên khung mới dù chart chạy M1. Khi biên mới bắt đầu, "flush" khung vừa đóng thành 1 cột: **Delta** = tổng `delta` các nến M1 trong khung (`bucket_delta_sum`), **CVD/VAH/POC/VAL/TPO Count/RF** = lấy mẫu giá trị tích lũy-theo-phiên *tại thời điểm đó*, **RSI** = `rsi_5m`.
8. **Renderer — neo theo `bar_index`, không theo thời gian thật**: `f_push_cell()` tạo 1 box/cột dùng `xloc.bar_index` (mặc định của `box.new()`) với toạ độ `bucket_start_bar`/`bucket_last_bar + 1` (số thứ tự nến đầu/cuối khung), tự xoá box cũ nhất khi vượt `n_bars_display` (giống pattern FIFO đã dùng cho Naked POC trong `market_profile.pine`). Lý do không dùng `xloc.bar_time` (thời gian thật, dùng ở v1.0-v1.8): nếu chart đang ở chế độ hiển thị không tuyến tính theo thời gian (vd **Volume Candles** — độ rộng mỗi nến tỷ lệ theo volume của nến đó), vị trí pixel của 1 mốc thời gian thật không còn khớp với vị trí nến tương ứng, khiến box bị lệch khỏi đúng cột nến. Neo theo `bar_index` luôn khớp đúng vì TradingView áp dụng cùng 1 phép biến dạng trục ngang cho MỌI đối tượng vẽ theo `bar_index`, kể cả nến.
9. **Lấp "gap" (khung `col_tf` hoàn toàn không có nến M1)**: ngay sau khi flush cột thật (bước 8), script tính `gap_periods = (time - (bucket_start_time + col_tf_ms)) / col_tf_ms` — số khung `col_tf` liên tiếp hoàn toàn không có nến nào giữa cột vừa chốt và cột mới. Với mỗi khung bị bỏ trống, `f_push_cell_time()` chèn 1 box placeholder (nền xám, Delta="0", các dòng tích lũy/giá session giữ nguyên giá trị cũ vì bản chất không đổi khi không có giao dịch) — neo bằng `xloc.bar_time` (vì không tồn tại `bar_index` nào đại diện cho khung không-có-nến này, khác với box dữ liệu thật ở bước 8). Chỉ áp dụng khi `col_tf` là số phút thuần (bỏ qua với `"1D"/"1W"`) và **chỉ trong cùng 1 phiên** (`not is_new_session`) — không lấp gap qua đêm/cuối tuần để tránh tạo hàng nghìn box vô ích.
10. **Dòng Time**: hiển thị giờ:phút bắt đầu mỗi cột qua `str.format_time(bucket_start_time, "HH:mm", syminfo.timezone)` — `bucket_start_time` (time thật) giờ **chỉ** dùng để tạo chữ hiển thị, không còn dùng để định vị box dữ liệu thật. Dòng Time ở vị trí trên cùng khi hiện (toggle `show_time` riêng, không gắn với tính toán nào khác nên luôn "rẻ").
11. **Tên dòng — neo vào trục giá bên phải**: mỗi dòng có 1 `plot(show_X ? Y_X : na, title="...", display=display.price_scale)` hiện đúng 1 tag nhỏ tại trục giá bên phải, ngang đúng vị trí dòng đó — không hiện trong legend/data window/pane (khác `label.new()` nổi giữa khu vực vẽ dùng ở v1.2-v1.8, dễ chồng lấp box và trôi lệch khi cuộn). Dòng bị ẩn thì tag biến mất (plot giá trị `na`).

## Output / Tín Hiệu Trên Chart

- Pane riêng, thứ tự Time/Delta/CVD/VAH/POC/VAL/TPO Count/RF/RSI (dòng ẩn không chiếm chỗ):
  - Delta/CVD/RF: xanh forest (dương) / đỏ burgundy (âm) / xám (trung tính). Ô Delta có hậu tố `F`/`L`/`A` (tắt được qua input) cho biết đang chạy tầng fallback nào.
  - VAH/POC/VAL: giá trị session, màu navy trung tính (mức giá, không phải delta nên không phân loại theo dấu).
  - TPO Count: hiển thị `trên/dưới`, màu theo bên nào nhiều TPO hơn.
  - RSI: đỏ nhạt khi >70, xanh khi <30, navy khi giữa.
- Tên dòng hiện dưới dạng tag nhỏ trên trục giá bên phải (không hiện trong khu vực vẽ, không chồng lấp box dữ liệu). Cỡ chữ của box theo input "Cỡ Chữ Hiển Thị".

## Giới Hạn & Lưu Ý

- `request.footprint()` yêu cầu TradingView Premium/Ultimate và sàn hỗ trợ dữ liệu tick-level — **đã xác nhận `HNX:VN30F1!` có hỗ trợ** (chạy Tầng 1 "F" theo phản hồi thực tế khi test).
- Tối đa 9 dòng × `n_bars_display` (10–55) cột gần nhất do giới hạn `max_boxes_count=500` của Pine. Ở `col_tf="5"` (mặc định) và 55 cột ≈ 275 phút ≈ 4.5 giờ — "max về trước" thực tế theo đúng giới hạn cứng của Pine, không phải vô hạn.
- Động cơ TPO quét lại toàn bộ bar trong phiên mỗi bar mới (giống `market_profile.pine`, chưa tối ưu incremental) — nặng hơn bản 30 phút gốc ~2 bậc độ lớn do chạy trên M1; đã giới hạn `calc_bars_count=3000`, và có thể bỏ qua hoàn toàn nếu ẩn hết VAH/POC/VAL/TPO Count (xem Logic Chính §5).
- Chỉ 1 lệnh `request.footprint()` duy nhất trong toàn script (giới hạn của Pine), đặt trong `if need_delta` — Pine v6 cho phép `request.*()` trong `if` khi điều kiện chỉ phụ thuộc input (simple), không phải dữ liệu series.
- Giới hạn vẽ: `max_boxes_count=500`, `max_labels_count=500`.
- Cột chỉ hiện khung `col_tf` *đã đóng hoàn toàn* (flush khi qua biên mới) — khung đang hình thành chưa có cột, đúng 1 nhịp trễ tối đa `col_tf`.
- **CVD dùng snapshot riêng (`bucket_cvd_end`), không đọc `cvd` trực tiếp lúc flush.** Section 6 (cộng dồn `cvd` mỗi bar) chạy trước Section 7 (flush cột) trong cùng 1 bar — nếu đọc `cvd` trực tiếp lúc flush, giá trị đã bị cộng thêm delta của bar đầu tiên của cột MỚI (lệch 1 bar so với Delta của cột vừa đóng). `bucket_cvd_end` được cập nhật mỗi bar TRƯỚC khi cột bị reset, cùng cơ chế với `bucket_delta_sum`, nên CVD cột đầu tiên của phiên luôn khớp đúng Delta cột đó.
- **Box neo theo `bar_index`, không theo thời gian thật.** Nếu chart đang ở chế độ **Volume Candles** (độ rộng nến tỷ lệ volume, không đều theo thời gian), các cột của panel vẫn khớp đúng từng nến vì được vẽ theo đúng số thứ tự nến (`bar_index`) — không bị lệch như khi neo theo `xloc.bar_time` (cách làm ở v1.0-v1.8, đúng khi trục ngang tuyến tính theo thời gian nhưng sai khi trục ngang bị biến dạng theo volume).
- **Lấp "gap" chỉ trong cùng 1 phiên, chỉ với `col_tf` là số phút thuần.** Nếu một khung `col_tf` hoàn toàn không có nến M1 (sàn không phát sinh nến do thanh khoản quá mỏng — không phải lỗi), panel chèn cột placeholder xám để dòng Time không nhảy cóc (xem Logic Chính §9). Cơ chế này **không** áp dụng qua đêm/cuối tuần (chặn bằng `not is_new_session`, tránh tạo hàng trăm/nghìn box vô ích cho khoảng nghỉ phiên) và **không** áp dụng khi `col_tf` là `"1D"`/`"1W"` (không phải số phút thuần, không cần cơ chế này).

## Changelog

- **v1.0** (2026-11-14): Phát hành lần đầu (Phase 1 — file độc lập). 7 dòng: Delta, CVD, TPO Count, Day Type, Open Type, RF, RSI (mỗi cột = 1 nến M1).
- **v1.1** (2026-11-14): Đổi "1 cột = 1 nến M1" sang "1 cột = N phút" (mặc định 5). RSI đổi sang tính thật theo khung qua `request.security()`.
- **v1.2** (2026-11-14): Tăng cỡ chữ, thêm nhãn tên dòng.
- **v1.3** (2026-11-14): Sửa lỗi khung cuối phiên sáng (vd `11:25-11:30` trên `VN30F1!`) không hiện cột — đổi sang lưu đúng `time` nến M1 đầu/cuối mỗi khung.
- **v1.4** (2026-11-14): Đổi input khung gộp cột sang dropdown timeframe chuẩn; thêm toggle ẩn/hiện hậu tố F/L/A; đổi thứ tự dòng (Delta/CVD/VAH/POC/VAL/TPO Count/RF/Open Type/Day Type/RSI); thêm input cỡ chữ; thêm 3 dòng VAH/POC/VAL; thêm toggle ẩn/hiện riêng từng dòng kèm bỏ qua tính toán nặng khi ẩn.
- **v1.5** (2026-11-14): (1) Sửa lỗi dòng bị ẩn vẫn chừa khoảng trống trên grid — Y tính động theo số dòng đang hiện. (2) Bỏ hẳn Day Type & Open Type (không chỉ ẩn — xoá toàn bộ phân loại, band vẽ, toggle, tracking Initial Balance, tails/single-prints liên quan) vì không còn dùng tới; panel còn 8 dòng: Delta, CVD, VAH, POC, VAL, TPO Count, RF, RSI. (3) Thêm tooltip giải thích `ticks_per_row` trong input. Backup v1.4 tại `indicators/hist/order_flow_profile_panel_v1.4.pine`.
- **v1.6** (2026-11-14): Delta/CVD trước đó dùng `format.volume` — mặc định hiện 3 số lẻ khi có hậu tố K/M/B (vd `"-1.234K"`) và không có cách chỉnh số lẻ. Viết hàm `f_format_delta()` riêng để luôn hiện đúng 2 số lẻ (`x.xxK`/`M`/`B`). Backup v1.5 tại `indicators/hist/order_flow_profile_panel_v1.5.pine`.
- **v1.7** (2026-11-14): Thêm dòng "Time" (giờ:phút mỗi cột, `str.format_time(... , "HH:mm", syminfo.timezone)`) ở vị trí trên cùng, toggle ẩn/hiện riêng như các dòng khác. Giảm `n_bars_display` mặc định/tối đa 60/62 → 55/55 vì giờ có 9 dòng gộp cột (9×55=495 < 500) thay vì 8. Backup v1.6 tại `indicators/hist/order_flow_profile_panel_v1.6.pine`.
- **v1.8** (2026-11-14): Sửa lỗi CVD cột đầu phiên không bằng Delta cột đó — Section 6 (cộng dồn `cvd`) chạy trước Section 7 (flush cột) trong cùng 1 bar, nên lúc flush, `cvd` đã bị cộng thêm delta của bar đầu tiên của cột MỚI (lệch 1 bar). Thêm `bucket_cvd_end` lưu snapshot `cvd` trước khi reset cho cột mới (cùng cơ chế `bucket_delta_sum`), dùng để hiện CVD thay vì đọc `cvd` trực tiếp. Backup v1.7 tại `indicators/hist/order_flow_profile_panel_v1.7.pine`.
- **v1.9** (2026-11-14): (1) Chia lại input group theo đúng chức năng: "Footprint & Delta", "Market Profile & Khung Gộp Cột" (gồm cả `col_tf`), "Hiện/Ẩn Dòng", "Hiển Thị (Giao Diện)" (chỉ còn số cột + cỡ chữ), "RSI". (2) Bỏ hệ thống nhãn `label.new()` nổi giữa pane (dễ chồng lấp, trôi lệch) — đổi sang `plot(Y_row, display=display.price_scale)` neo tên dòng đúng vào trục giá bên phải; 2 plot neo scale cũng đổi `display=display.pane` để không hiện tên trong legend. (3) **Xác nhận và sửa nguyên nhân cột lệch khi chart ở chế độ "Volume Candles"**: box trước đó neo theo `xloc.bar_time` (thời gian thật) — sai khi trục ngang không còn tuyến tính theo thời gian (độ rộng nến tỷ lệ volume). Đổi toàn bộ box sang `xloc.bar_index` (mặc định), luôn khớp đúng vị trí nến vì TradingView áp dụng cùng phép biến dạng trục ngang cho mọi đối tượng vẽ theo `bar_index`. Thêm `bucket_start_bar`/`bucket_last_bar` để định vị; `bucket_start_time` chỉ còn dùng hiện chữ dòng Time. Backup v1.8 tại `indicators/hist/order_flow_profile_panel_v1.8.pine`.
- **v1.10** (2026-11-14): **Xác nhận & sửa lỗi "mất cột" khi `col_tf` nhỏ (vd 3 phút)** — nguyên nhân: một số khung `col_tf` hoàn toàn không có nến M1 nào (sàn không phát sinh nến do thanh khoản quá mỏng trong vài phút liên tiếp, không phải lỗi script); vì cơ chế gộp cột chỉ đánh dấu khung mới khi có 1 nến M1 thật rơi vào đó, khung trống hoàn toàn không bao giờ được tạo cột, khiến dòng Time nhảy cóc (ví dụ `14:15→14:21`, mất khung `14:18`). Thêm cơ chế lấp "gap": phát hiện khoảng cách giữa cột vừa chốt và cột mới dài hơn 1 khung `col_tf`, chèn cột placeholder (nền xám, Delta="0", các dòng tích lũy/giá giữ nguyên giá trị cũ) cho mỗi khung bị bỏ trống — dùng `f_push_cell_time()` neo theo `xloc.bar_time` (không có `bar_index` nào tồn tại cho khung không có nến). Chỉ áp dụng khi `col_tf` là số phút thuần và chỉ trong cùng 1 phiên (`not is_new_session`, tránh lấp gap qua đêm/cuối tuần). Backup v1.9 tại `indicators/hist/order_flow_profile_panel_v1.9.pine`.
