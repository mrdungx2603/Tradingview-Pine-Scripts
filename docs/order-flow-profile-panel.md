# Order Flow & Market Profile Panel — Tài Liệu

> **Script**: [indicators/order_flow_profile_panel.pine](../indicators/order_flow_profile_panel.pine) (v1.0)
> **Loại**: Indicator (pane riêng, không overlay)
> **Pine Script**: v6
> **Ngày tạo**: 2026-11-14 / **Cập nhật**: 2026-11-14

## Tổng Quan

Pane riêng (giống pane Delta footprint gốc của TradingView) hiển thị 7 dòng dữ liệu dạng grid, mỗi cột ứng với đúng 1 nến trên chart chính và trôi đồng bộ theo trục thời gian (dùng `box.new()` theo `bar_index`, không dùng `table.*` vì `table.*` neo cố định góc màn hình, không đồng bộ thời gian). Thiết kế cho trader scalping nến M1 cần theo dõi order flow trong phiên và cấu trúc phiên theo phương pháp Market Profile ("Mind over Markets").

7 dòng (trên xuống): **Delta** (footprint), **CVD**, **TPO Count** (trên/dưới POC), **Day Type**, **Open Type**, **RF** (Rotation Factor), **RSI**. Day Type & Open Type mỗi dòng là 1 box duy nhất merge full phiên (D1), các dòng còn lại dùng rolling window (xoá cột cũ nhất khi vượt giới hạn hiển thị).

**Phase 1/2**: file độc lập, tự chứa toàn bộ logic (không import, không sửa `indicators/market_profile.pine`). Phase 2 (sau, nếu Phase 1 chạy ổn trên mã thật) sẽ tách engine Market Profile dùng chung thành library riêng.

Engine Day Type/Open Type/RF/TPO Count được **port từ `market_profile.pine` v1.2** (giữ nguyên thuật toán, bỏ phần chỉ phục vụ vẽ như Naked POC/Tails-giá/Poor High-Low/80% Rule/Ledge/Spike vì không cần cho 4 metric mục tiêu).

## Tham Số Đầu Vào

| Tham Số | Loại | Mặc Định | Group | Mô Tả |
|---|---|---|---|---|
| Ticks mỗi dòng | `int` | `10` | Footprint | `ticks_per_row` cho `request.footprint()` |
| Value Area (%) | `float` | `70.0` | Footprint | `va_percent` cho `request.footprint()` **và** VA walk nội bộ (chia 100 tại điểm dùng) |
| Ngưỡng Imbalance (%) | `float` | `300.0` | Footprint | `imbalance_percent` cho `request.footprint()` |
| Khung Thời Gian Dự Phòng | `string` | `"1S"` | Footprint | Lower TF dùng ở Tầng 2 khi `request.footprint()` không có dữ liệu |
| Số Cột Hiển Thị | `int` | `60` (20–90) | Hiển Thị | Rolling window cho 5 dòng động (giới hạn bởi `max_boxes_count=500`) |
| Độ Phân Giải Lưới Giá TPO | `int` | `60` (20–120) | Market Profile | Số hàng chia phiên để đếm TPO |
| Số Nến Tính Initial Balance | `int` | `60` (1–120) | Market Profile | Mặc định 60 nến M1 = 1 giờ (chuẩn IB cổ điển), không còn copy nguyên giá trị "2 nến" của bản 30 phút trong `market_profile.pine` |
| Chu Kỳ RSI | `int` | `14` | RSI | |
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
5. **Renderer**: `f_push_cell()` tạo 1 box/cột cho 5 dòng động, tự xoá box cũ nhất khi vượt `n_bars_display` (giống pattern FIFO đã dùng cho Naked POC trong `market_profile.pine`). Day Type/Open Type dùng 1 box/phiên, cập nhật `right`/`text`/màu tại chỗ.

## Output / Tín Hiệu Trên Chart

- Pane riêng, 7 dòng box màu theo cột nến:
  - Delta/CVD/RF: xanh forest (dương) / đỏ burgundy (âm) / xám (trung tính). Ô Delta có hậu tố `F`/`L`/`A` cho biết đang chạy tầng fallback nào (Footprint/LowerTF/OHLCV-Approx).
  - TPO Count: hiển thị `trên/dưới`, màu theo bên nào nhiều TPO hơn.
  - RSI: đỏ nhạt khi >70, xanh khi <30, navy khi giữa.
  - Day Type: màu theo `f_get_daytype_color()` (Trend=xanh đậm, Double-Distribution=tím, Neutral=cam, Nontrend=xám than, còn lại=navy). Open Type: navy cố định.

## Giới Hạn & Lưu Ý

- `request.footprint()` yêu cầu TradingView Premium/Ultimate và sàn hỗ trợ dữ liệu tick-level — **chưa xác nhận `HNX:VN30F1!` có hỗ trợ hay không**, cần test trực tiếp trong Pine Editor; nếu không, panel tự chuyển Tầng 2/3.
- 5 dòng động (Delta/CVD/TPO/RF/RSI) chỉ giữ tối đa `n_bars_display` (20–90) cột gần nhất do giới hạn `max_boxes_count=500` của Pine — khi zoom xem cả phiên dài (vd ~315 nến M1/phiên `VN30F1!`), các cột cũ hơn ngưỡng này sẽ trống, trong khi 2 băng Day Type/Open Type vẫn trải đúng full phiên (chỉ 1 box/phiên, không bị giới hạn này). Đây là tradeoff đã chốt, phù hợp mục tiêu theo dõi order flow *gần nhất* khi scalping.
- Động cơ TPO quét lại toàn bộ bar trong phiên mỗi bar mới (giống `market_profile.pine`, chưa tối ưu incremental) — nặng hơn bản 30 phút gốc ~2 bậc độ lớn do chạy trên M1; đã giới hạn `calc_bars_count=3000` trong `indicator()` để không tính toán trên toàn bộ lịch sử nạp vào chart (vẫn đủ phủ nhiều phiên liên tiếp cho band Day/Open Type).
- Chỉ 1 lệnh `request.footprint()` duy nhất trong toàn script (giới hạn của Pine). Nếu `lower_tf_fallback` không hợp lệ cho symbol/chart (vd cao hơn khung chart), `request.security_lower_tf()` dùng `ignore_invalid_timeframe=true` để tụt xuống Tầng 3 thay vì làm lỗi cả script.
- Giới hạn vẽ: `max_boxes_count=500`, `max_labels_count=500`.
- 5 dòng box dùng `xloc.bar_time` (canh theo `time` ± nửa độ dài 1 bar) vì `box.new()` yêu cầu toạ độ `series int` khi dùng `xloc.bar_index`, trong khi cột cần canh giữa đúng dưới nến (lệch 0.5 bar) — không dùng được tọa độ `bar_index` (float) trực tiếp.

## Changelog

- **v1.0** (2026-11-14): Phát hành lần đầu (Phase 1 — file độc lập). Đã qua 1 vòng review toàn branch trước khi test thật trên TradingView, fix 3 lỗi Critical (box.new nhận float cho left/right, band Day/Open Type lỗi runtime ở bar đầu lịch sử, `ib_bars_cnt` sai đơn vị cho M1) + 4 cải tiến Important (fallback lower-tf không raise lỗi, chặn NaN propagation vào CVD, giới hạn `calc_bars_count`, neo scale pane bằng 2 plot trong suốt).
