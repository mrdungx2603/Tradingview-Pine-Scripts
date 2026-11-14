# Order Flow & Market Profile Panel — Tài Liệu

> **Script**: [indicators/order_flow_profile_panel.pine](../indicators/order_flow_profile_panel.pine) (v1.5)
> **Loại**: Indicator (pane riêng, không overlay)
> **Pine Script**: v6
> **Ngày tạo**: 2026-11-14 / **Cập nhật**: 2026-11-14

## Tổng Quan

Pane riêng (giống pane Delta footprint gốc của TradingView) hiển thị dữ liệu dạng grid, trôi đồng bộ theo trục thời gian với chart chính (dùng `box.new(xloc=xloc.bar_time)`, không dùng `table.*` vì `table.*` neo cố định góc màn hình, không đồng bộ thời gian). Thiết kế cho trader scalping nến M1 cần theo dõi order flow trong phiên và cấu trúc giá theo phương pháp Market Profile ("Mind over Markets").

Chart chính chạy **M1** (để vào lệnh chính xác). Mỗi dòng **gộp cột thành 1 khung thời gian `col_tf`** (chọn qua dropdown timeframe chuẩn Pine, mặc định 5 phút) độc lập với khung chart.

Thứ tự dòng (trên xuống): **Delta** → **CVD** → **VAH** → **POC** → **VAL** → **TPO Count** (trên/dưới POC) → **RF** (Rotation Factor) → **RSI**. Mỗi dòng có toggle ẩn/hiện riêng (nhóm input "Hiện/Ẩn Dòng"):

- **Ẩn thì bỏ qua cả phần tính toán nặng tương ứng**, không chỉ ẩn vẽ (xem Logic Chính §5).
- **Ẩn thì grid tự co lại** — dòng ẩn không chiếm vị trí y, các dòng còn lại tự dồn lên khít nhau (không chừa khoảng trống).

**Phase 1/2**: file độc lập, tự chứa toàn bộ logic (không import, không sửa `indicators/market_profile.pine`). Phase 2 (sau, nếu Phase 1 chạy ổn trên mã thật) sẽ tách engine Market Profile dùng chung thành library riêng.

Engine POC/VAH/VAL/TPO Count/RF được **port từ `market_profile.pine` v1.2** (giữ nguyên thuật toán TPO grid/POC/Value Area). Từ v1.5, **không còn Day Type & Open Type** — đã bỏ hẳn (không chỉ ẩn) vì không dùng tới: phân loại, band vẽ, tracking Initial Balance, tails/single-prints chỉ phục vụ 2 chỉ số đó.

## Tham Số Đầu Vào

| Tham Số | Loại | Mặc Định | Group | Mô Tả |
|---|---|---|---|---|
| Ticks mỗi dòng | `int` | `10` | Footprint | `ticks_per_row` cho `request.footprint()` — xem giải thích riêng ở cuối mục này |
| Value Area (%) | `float` | `70.0` | Footprint | `va_percent` cho `request.footprint()` **và** VA walk nội bộ (chia 100 tại điểm dùng) |
| Ngưỡng Imbalance (%) | `float` | `300.0` | Footprint | `imbalance_percent` cho `request.footprint()` |
| Khung Thời Gian Dự Phòng | `string` | `"1S"` | Footprint | Lower TF dùng ở Tầng 2 khi `request.footprint()` không có dữ liệu |
| Khung Gộp Cột | `timeframe` | `"5"` | Hiển Thị | `col_tf` — dropdown timeframe chuẩn Pine (1, 5, 15, 30, 60, 120, 240, 1D, 1W...) |
| Số Cột Hiển Thị | `int` | `60` (10–62) | Hiển Thị | Rolling window cho tất cả dòng (giới hạn `max_boxes_count=500`: tối đa 8 dòng × 62 = 496 < 500) |
| Cỡ Chữ Hiển Thị | `string` | `"Small"` | Hiển Thị | `Tiny`/`Small`/`Normal`/`Large` — áp dụng cho mọi box/label trong panel |
| Hiện hậu tố nguồn Delta | `bool` | `true` | Hiển Thị | Hiện/ẩn hậu tố `F`/`L`/`A` ở ô Delta |
| Delta / CVD / VAH / POC / VAL / TPO Count / RF / RSI | `bool` ×8 | `true` | Hiện/Ẩn Dòng | Mỗi dòng 1 toggle riêng — ẩn thì bỏ qua cả tính toán liên quan và không chiếm chỗ trên grid |
| Độ Phân Giải Lưới Giá TPO | `int` | `60` (20–120) | Market Profile | Số hàng chia phiên để đếm TPO |
| Chu Kỳ RSI | `int` | `14` | RSI | Dùng cho RSI thật theo khung `col_tf` (`request.security()`), không phải RSI(M1) |
| Nguồn RSI | `source` | `close` | RSI | |

**`ticks_per_row` nghĩa là gì?** Đây là tham số đầu tiên của `request.footprint(ticks_per_row, va_percent, imbalance_percent)` — nó quy định độ phân giải giá *bên trong cấu trúc footprint*: footprint chia range giá mỗi nến thành các "dòng" (row) ngang (giống 1 volume profile mini cho từng nến), và `ticks_per_row` nói mỗi dòng đó rộng bao nhiêu tick giá tối thiểu (`syminfo.mintick`). Ví dụ `ticks_per_row=10` trên mã có tick size 0.1 nghĩa là mỗi dòng rộng 1.0 điểm giá. **Panel này chỉ dùng `fp.delta()`** (tổng buy-sell của cả nến, không phải theo từng dòng giá), nên tham số này **không ảnh hưởng gì tới số liệu Delta/CVD hiển thị** — chỉ cần có giá trị hợp lệ (≥1) để `request.footprint()` chạy được. Nó sẽ có ý nghĩa nếu sau này panel dùng thêm `fp.rows()`/imbalance theo từng mức giá (chưa làm ở Phase 1).

## Logic Chính

1. **Reset phiên** (`timeframe.change("D")`): khởi tạo `OFProfile` mới (`start_bar`, `sess_high`, `sess_low`, `rf_score`), clear mảng `arr_highs`/`arr_lows`.
2. **Market Profile engine** (mỗi bar, toàn phiên tới hiện tại — "developing"): dựng histogram TPO theo `grid_rows` → POC → VAH/VAL (VA walk) → TPO Count trên/dưới POC.
3. **RF (Rotation Factor)**: cộng dồn mỗi bar +1/-1 theo so sánh high/low với bar trước, reset mỗi phiên.
4. **Delta/CVD — 3 tầng fallback** mỗi bar:
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
7. **Gộp cột `col_tf`**: `is_new_col = timeframe.change(col_tf)` phát hiện biên khung mới dù chart chạy M1. Khi biên mới bắt đầu, "flush" khung vừa đóng thành 1 cột: **Delta** = tổng `delta` các nến M1 trong khung (`bucket_delta_sum`), **CVD/VAH/POC/VAL/TPO Count/RF** = lấy mẫu giá trị tích lũy-theo-phiên *tại thời điểm đó*, **RSI** = `rsi_5m`. Toạ độ box lấy từ `bucket_start_time`/`bucket_last_time` (time thật của nến M1 đầu/cuối khung), không suy từ `col_tf` để tránh sai lệch qua các mốc có gap dữ liệu (nghỉ trưa, qua đêm).
8. **Renderer**: `f_push_cell()` tạo 1 box/cột (toạ độ `xloc.bar_time`, biên đúng `[đầu khung, cuối khung)`), tự xoá box cũ nhất khi vượt `n_bars_display` (giống pattern FIFO đã dùng cho Naked POC trong `market_profile.pine`).
9. **Nhãn tên dòng**: `label.new()` đặt ngay bên phải cột mới nhất (`bar_index + 2`), cập nhật vị trí mỗi bar để không bị cuộn mất. Dòng bị ẩn thì không tạo nhãn.

## Output / Tín Hiệu Trên Chart

- Pane riêng, thứ tự Delta/CVD/VAH/POC/VAL/TPO Count/RF/RSI (dòng ẩn không chiếm chỗ):
  - Delta/CVD/RF: xanh forest (dương) / đỏ burgundy (âm) / xám (trung tính). Ô Delta có hậu tố `F`/`L`/`A` (tắt được qua input) cho biết đang chạy tầng fallback nào.
  - VAH/POC/VAL: giá trị session, màu navy trung tính (mức giá, không phải delta nên không phân loại theo dấu).
  - TPO Count: hiển thị `trên/dưới`, màu theo bên nào nhiều TPO hơn.
  - RSI: đỏ nhạt khi >70, xanh khi <30, navy khi giữa.
- Nhãn tên dòng bám theo cột mới nhất, cỡ chữ theo input "Cỡ Chữ Hiển Thị" (áp dụng chung cho toàn panel).

## Giới Hạn & Lưu Ý

- `request.footprint()` yêu cầu TradingView Premium/Ultimate và sàn hỗ trợ dữ liệu tick-level — **đã xác nhận `HNX:VN30F1!` có hỗ trợ** (chạy Tầng 1 "F" theo phản hồi thực tế khi test).
- Tối đa 8 dòng × `n_bars_display` (10–62) cột gần nhất do giới hạn `max_boxes_count=500` của Pine. Ở `col_tf="5"` (mặc định) và 60 cột ≈ 300 phút ≈ 5 giờ — "max về trước" thực tế theo đúng giới hạn cứng của Pine, không phải vô hạn.
- Động cơ TPO quét lại toàn bộ bar trong phiên mỗi bar mới (giống `market_profile.pine`, chưa tối ưu incremental) — nặng hơn bản 30 phút gốc ~2 bậc độ lớn do chạy trên M1; đã giới hạn `calc_bars_count=3000`, và có thể bỏ qua hoàn toàn nếu ẩn hết VAH/POC/VAL/TPO Count (xem Logic Chính §5).
- Chỉ 1 lệnh `request.footprint()` duy nhất trong toàn script (giới hạn của Pine), đặt trong `if need_delta` — Pine v6 cho phép `request.*()` trong `if` khi điều kiện chỉ phụ thuộc input (simple), không phải dữ liệu series.
- Giới hạn vẽ: `max_boxes_count=500`, `max_labels_count=500`.
- Cột chỉ hiện khung `col_tf` *đã đóng hoàn toàn* (flush khi qua biên mới) — khung đang hình thành chưa có cột, đúng 1 nhịp trễ tối đa `col_tf`.

## Changelog

- **v1.0** (2026-11-14): Phát hành lần đầu (Phase 1 — file độc lập). 7 dòng: Delta, CVD, TPO Count, Day Type, Open Type, RF, RSI (mỗi cột = 1 nến M1).
- **v1.1** (2026-11-14): Đổi "1 cột = 1 nến M1" sang "1 cột = N phút" (mặc định 5). RSI đổi sang tính thật theo khung qua `request.security()`.
- **v1.2** (2026-11-14): Tăng cỡ chữ, thêm nhãn tên dòng.
- **v1.3** (2026-11-14): Sửa lỗi khung cuối phiên sáng (vd `11:25-11:30` trên `VN30F1!`) không hiện cột — đổi sang lưu đúng `time` nến M1 đầu/cuối mỗi khung.
- **v1.4** (2026-11-14): Đổi input khung gộp cột sang dropdown timeframe chuẩn; thêm toggle ẩn/hiện hậu tố F/L/A; đổi thứ tự dòng (Delta/CVD/VAH/POC/VAL/TPO Count/RF/Open Type/Day Type/RSI); thêm input cỡ chữ; thêm 3 dòng VAH/POC/VAL; thêm toggle ẩn/hiện riêng từng dòng kèm bỏ qua tính toán nặng khi ẩn.
- **v1.5** (2026-11-14): (1) Sửa lỗi dòng bị ẩn vẫn chừa khoảng trống trên grid — Y tính động theo số dòng đang hiện. (2) Bỏ hẳn Day Type & Open Type (không chỉ ẩn — xoá toàn bộ phân loại, band vẽ, toggle, tracking Initial Balance, tails/single-prints liên quan) vì không còn dùng tới; panel còn 8 dòng: Delta, CVD, VAH, POC, VAL, TPO Count, RF, RSI. (3) Thêm tooltip giải thích `ticks_per_row` trong input. Backup v1.4 tại `indicators/hist/order_flow_profile_panel_v1.4.pine`.
