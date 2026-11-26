# Volume Profile + Delta

## Tổng Quan

> **Yêu cầu hạ tầng**: indicator này `import anthonydang/smc_core/3 as smc` và
> `import anthonydang/order_flow_core/1 as ofcore` — 2 library đã publish dưới account
> `anthonydang` (xem `.claude/CLAUDE.md` mục "Tài Khoản TradingView"). Nếu version publish trên
> TradingView thay đổi, cần sửa lại số version trong dòng `import` tương ứng.

Indicator overlay vẽ **1 cụm hiển thị** neo tại 1 bar mốc trên chart, trôi theo `bar_index`,
gồm 3 phần theo thứ tự trái→phải:

1. **Volume Profile** — histogram ngang, mỗi hàng giá (cao `price_step`) có 1 box kéo trái, độ
   dài tỷ lệ volume (buy+sell) của hàng đó so với hàng lớn nhất trong phạm vi tính. Highlight
   riêng màu (chỉ qua viền/nền box, không nhãn text) cho **POC** (volume lớn nhất) và **VAL/VAH**
   (Value Area Low/High — biên dưới/trên của vùng giá chứa `va_percent`% volume, tính bằng thuật
   toán Value Area chuẩn: mở rộng từ POC ra 2 phía theo giá).
2. **Candlestick tổng hợp ("siêu nến")** — 1 nến duy nhất đại diện OHLC của CẢ phạm vi tính
   (không phải nến thật của chart): open = giá mở đầu phạm vi, high/low = cao/thấp nhất trong
   toàn phạm vi, close = giá đóng cuối phạm vi (hoặc giá hiện tại nếu phạm vi chưa kết thúc). Màu
   kiểu hollow candle cổ điển: tăng = nền trắng/viền đen, giảm = nền đen/viền đen, bóng nến đen.
3. **Delta Bar Chart** — mỗi hàng giá có 1 box kéo phải, viền riêng (phân tách rõ các hàng liền
   kề), độ dài tỷ lệ `|buy - sell|` so với delta lớn nhất trong phạm vi, màu xanh dương nếu dương
   (dư mua), đỏ nếu âm (dư bán), kèm giá trị số (tuỳ chọn) đặt trong 1 box trong suốt riêng ngay
   sau điểm cuối (tip) của bar — canh giữa theo chiều dọc chính xác, không chồng lên bar.

Dùng chung 3 phạm vi tính (`mode_calc`) và cách bucket volume theo `price_step` từ
`request.footprint()` Tầng 1 với `order_flow_bar.pine`, nhưng là **file độc lập** (TradingView
không cho 1 indicator đọc runtime data của indicator khác) — khác về cách hiển thị: thay 2 cánh
buyer/seller + cột delta giữa bằng Volume Profile (trái) + siêu nến (giữa) + Delta Bar Chart
(phải).

## Tham Số Đầu Vào

| Nhóm | Tham số | Mặc định | Ý nghĩa |
|---|---|---|---|
| Phạm Vi Tính | Chế độ Phạm Vi (`mode_calc`) | Session | Phạm vi gộp dữ liệu: Session / Last HL / Last HL (Đến Hiện Tại) |
| Phạm Vi Tính | Bước Giá (`price_step`) | 1.0 | Độ cao mỗi hàng giá khi bucket volume. Cần giữ cố định xuyên suốt |
| Phạm Vi Tính | Max Lookback Bars (`max_lookback_bars`) | 500 | Số bar tối đa lưu trong buffer nội bộ cho Volume Profile/Delta (Last HL); KHÔNG ảnh hưởng siêu nến (đọc trực tiếp OHLC, không qua buffer) |
| Phạm Vi Tính | Value Area % (`va_percent`) | 70 | % volume cần chứa trong vùng VAL-VAH, tính từ POC mở rộng ra 2 phía |
| SMC (Last HL) | Pivot Length (`pivot_length`) | 10 | Số nến trái/phải để xác nhận pivot high/low (dùng cho Pivot Seed) |
| SMC (Last HL) | Seed Mode (`seed_mode`) | Pivot Seed | Cách khởi tạo trạng thái SMC đầu phiên: Pivot Seed / Session Seed |
| Hiển Thị | Offset Bar Gốc (`anchor_offset_bars`) | 30 | Số bar lệch so với `bar_index` để neo cụm hiển thị (lớn hơn `order_flow_bar` vì Volume Profile + siêu nến chiếm nhiều không gian trái hơn) |
| Hiển Thị | Max Độ Rộng Volume Profile (`profile_max_bars`) | 20 | Số bar tối đa của box Volume Profile khi hàng đạt volume lớn nhất |
| Hiển Thị | Nửa Độ Rộng Siêu Nến (`candle_half_width_bars`) | 2 | Nửa độ rộng (bar) thân nến tổng hợp, canh tâm `anchor_bar` |
| Hiển Thị | Max Độ Rộng Delta Bar (`delta_max_bars`) | 20 | Số bar tối đa của box delta khi hàng đạt \|delta\| lớn nhất |
| Hiển Thị | Khoảng Trống Profile-Nến (`gap_profile_bars`) | 2 | Khoảng trống (bar) giữa Volume Profile và thân nến |
| Hiển Thị | Khoảng Trống Nến-Delta (`gap_delta_bars`) | 2 | Khoảng trống (bar) giữa thân nến và Delta Bar Chart |
| Hiển Thị | Khoảng Cách Chữ Delta - Tip (`delta_text_offset_bars`) | 2 | Khoảng cách (bar) từ điểm cuối (tip) của bar delta đến box chữ giá trị delta, tránh chữ dính vào bar |
| Hiển Thị | Màu Volume Profile (`profile_color`) | xám (40% trong suốt) | Màu nền box Volume Profile (hàng không highlight) |
| Hiển Thị | Màu Viền Volume Profile (`profile_border_color`) | xám (50% trong suốt) | Màu viền box Volume Profile (hàng không highlight) |
| Hiển Thị | Màu POC (`poc_color`) | xanh dương | Màu viền+nền hàng POC (ưu tiên cao nhất) |
| Hiển Thị | Màu VAL/VAH (`va_edge_color`) | cam | Màu viền+nền hàng VAL và VAH |
| Hiển Thị | Màu Nến Tăng (`candle_up_color`) | trắng | Màu nền thân nến khi close ≥ open |
| Hiển Thị | Màu Nến Giảm (`candle_down_color`) | đen | Màu nền thân nến khi close < open |
| Hiển Thị | Màu Viền/Bóng Nến (`candle_border_color`) | đen | Màu viền thân nến + bóng nến (cả 2 chiều tăng/giảm) |
| Hiển Thị | Màu Delta Dương (`delta_pos_color`) | xanh dương | Màu box delta khi delta > 0 (dư mua) |
| Hiển Thị | Màu Delta Âm (`delta_neg_color`) | đỏ | Màu box delta khi delta < 0 (dư bán) |
| Hiển Thị | Màu Viền Delta Bar (`delta_border_color`) | đen (20% trong suốt) | Màu viền box Delta — tách riêng khỏi `delta_pos_color`/`delta_neg_color` để các hàng liền kề không dính vào nhau |
| Hiển Thị | Màu Chữ Delta (`delta_text_color`) | trắng | Màu chữ giá trị delta trên box |
| Hiển Thị | Cỡ Chữ Delta (`delta_text_size`) | Normal | Tiny/Small/Normal/Large — cùng trade-off cỡ chữ không co giãn theo `price_step`/zoom như `order_flow_bar` |
| Hiển Thị | Hiện Giá Trị Delta (`show_delta_text`) | true | Tắt để chỉ còn độ dài bar + màu, không hiện số |
| Initial Balance (IB) | Hiển Thị Dải IB (`show_ib`) | true | Ẩn/hiện dải IB — đường dọc bên trái siêu nến thể hiện range Initial Balance |
| Initial Balance (IB) | Độ Dài 1 TPO Period (`ib_period_min`) | 30 (phút) | Độ dài 1 TPO Period dùng để tính IB — chuẩn CBOT = 30 phút, giống `market_profile.pine` |
| Initial Balance (IB) | Số TPO Period Tính IB (`ib_periods_cnt`) | 2 | Số Period đầu phiên gộp thành IB (chuẩn 2×30p = 60 phút đầu phiên) |
| Initial Balance (IB) | Màu Dải IB (`ib_color`) | xanh dương | Màu đường dọc IB |
| Initial Balance (IB) | Độ Rộng Dải IB (`ib_width`) | 2 (px) | Độ rộng đường dọc IB tính bằng pixel (tham số `width` của `line.new`, không phải bar) |
| Initial Balance (IB) | Khoảng Cách Dải IB - Nến (`ib_gap_bars`) | 1 | Khoảng cách (bar) từ dải IB đến mép trái siêu nến, tránh đè lên nhau |

## Logic Chính

- **Footprint Tầng 1**: gọi `request.footprint(ticks_per_row=1, va_percent=70, imbalance_percent=300)` đúng 1 lần (giới hạn Pine). Cờ sticky `has_fp_ever` gate vẽ Volume Profile/Delta (giống `order_flow_bar`), tránh nhấp nháy. Siêu nến KHÔNG cần cờ này vì chỉ dùng OHLC.
- **Bucket + buffer theo bar**: giống hoàn toàn `order_flow_bar.pine` — `row_id = floor(giá / price_step)`, lưu circular buffer `of_buffer` (cap `max_lookback_bars`), session accumulator `sess_profile` reset mỗi ngày, state machine SMC (`smc_core`) reseed mỗi phiên cho Last HL.
- **Biên phạm vi dùng chung cho cả Volume Profile và siêu nến**: `range_left_bar`/`range_right_bar` = `sess_start_bar`/`bar_index` (Session) hoặc `lasthl_left_bar`/`lasthl_right_bar` (Last HL/Last HL Đến Hiện Tại) — đảm bảo siêu nến và Volume Profile/Delta luôn mô tả ĐÚNG CÙNG 1 phạm vi.
- **POC/VAL/VAH (`f_calc_poc_val_vah`)**: sort `row_ids` theo giá tăng dần (`array.sort_indices`) vì thứ tự gốc trong `RowProfile` không đảm bảo theo giá (push theo thứ tự gặp trong footprint). POC = hàng có `buy+sell` lớn nhất. Value Area: từ POC, mỗi bước mở rộng sang hàng liền kề (trên hoặc dưới) có volume lớn hơn, tới khi tổng tích lũy ≥ `va_percent`% tổng volume hoặc hết hàng 2 bên (vòng `while`, chặn tối đa `n` vòng).
- **OHLC siêu nến (`f_calc_range_ohlc`)**: đọc trực tiếp `open`/`high`/`low`/`close` theo offset từ `bar_index` hiện tại (không qua buffer volume) — open/high/low tại `left_bar`, close tại `right_bar`, quét high/low toàn bộ bar giữa 2 biên để lấy cao/thấp nhất. Không bị giới hạn `max_lookback_bars`. Vì offset là biến (series, không phải literal), script gọi `max_bars_back(open/high/low/close, 5000)` ngay sau `indicator()` để ép Pine cấp đủ buffer lịch sử — thiếu dòng này sẽ lỗi runtime `"requested historical offset ... beyond the historical buffer's limit"` khi chạy Bar Replay (Pine tự suy luận buffer dựa trên offset lớn nhất gặp được, suy luận có thể quá nhỏ).
- **Vẽ (`f_draw_panel`)**: xoá-vẽ-lại toàn bộ mỗi lần gọi (box + line), chỉ chạy ở `barstate.islast`. Thân nến + 2 bóng nến luôn vẽ nếu có OHLC hợp lệ (không cần footprint). Volume Profile + Delta chỉ vẽ nếu `has_fp_ever` và profile không rỗng — mỗi hàng gồm 3 box: 1 box Volume Profile (kéo trái từ `candle_left - gap_profile_bars`, viền `profile_border_color`), 1 box Delta màu (kéo phải từ `candle_right + gap_delta_bars`, viền riêng `delta_border_color` — tách khỏi màu nền để các hàng liền kề không dính vào nhau), và 1 box Delta TEXT trong suốt (`border_color`/`bgcolor` = `color(na)`) đặt tại `delta_tip_x + delta_text_offset_bars` (ngay sau tip của box Delta màu) chỉ dùng để hiện `text=` giá trị delta — dùng `box.new(text=...)` (không dùng `label.new`, vốn canh theo baseline nên lệch lên trên) để Pine tự canh giữa chữ CHÍNH XÁC theo `top`/`bottom` của box, cùng kỹ thuật đã dùng ổn trong `order_flow_bar.pine`.
- **Dải IB (Initial Balance)**: tính theo đúng chuẩn `market_profile_core.pine`/`market_profile.pine` — gộp `high`/`low` của `ib_periods_cnt` "TPO Period" đầu PHIÊN THẬT (period_id tính theo `time`, không phải theo `mode_calc`), mỗi Period dài `ib_period_min` phút (mặc định 2×30p = 60 phút). Cập nhật mỗi tick (không gate `barstate.isconfirmed`) để `ib_high`/`ib_low` "sống" trong Period đang mở, giống `prof.ib_high`/`ib_low` của `market_profile.pine`; khi đã đủ `ib_periods_cnt` Period, `ib_locked = true` và 2 giá trị đứng yên hết phiên. Vẽ bằng 1 `line.new` dọc duy nhất (x1=x2) từ `ib_low` đến `ib_high`, đặt tại `candle_left - ib_gap_bars`, độ rộng là tham số pixel `width` của `line.new` (không tốn thêm bar ngang) — luôn hiển thị bất kể `mode_calc` đang là Session hay Last HL, vì IB là khái niệm gắn với phiên giao dịch thật, không phải phạm vi tính Volume Profile/Delta.

## Output / Tín Hiệu

- 1 cụm hiển thị gồm Volume Profile (trái) | Siêu Nến (giữa) | Delta Bar Chart (phải), neo tại `bar_index + anchor_offset_bars`.
- Highlight màu (không nhãn text) cho POC và VAL/VAH trên Volume Profile.
- Siêu nến thể hiện trực quan hình dạng nến (hollow/filled) của cả phạm vi tính đang chọn.
- Mỗi hàng Delta Bar Chart thể hiện chiều + độ lớn tương đối của `buy - sell`, kèm giá trị số (tuỳ chọn).
- Dải IB (đường dọc, tuỳ chọn ẩn/hiện) bên trái siêu nến — so sánh trực quan vị trí giao dịch hiện tại so với Initial Balance của phiên.
- Không có alert condition.

## Giới Hạn & Lưu Ý

- **Chỉ Volume Profile/Delta cần footprint Tầng 1**: cần tài khoản TradingView Premium (hoặc cao hơn) và sàn/symbol hỗ trợ dữ liệu tick. Nếu chưa từng có dữ liệu footprint (`has_fp_ever = false`), Volume Profile/Delta bị ẩn hoàn toàn — siêu nến vẫn vẽ bình thường vì chỉ cần OHLC.
- **`price_step` phải cố định xuyên suốt** — giống `order_flow_bar`, đổi giữa chừng làm bucket cũ trong buffer không còn tương thích.
- **Buffer giới hạn `max_lookback_bars`** — chỉ ảnh hưởng Volume Profile/Delta (Last HL dựng lại từ buffer); siêu nến KHÔNG bị ảnh hưởng (đọc OHLC trực tiếp qua offset `[]`, chỉ bị giới hạn bởi lịch sử bar thật Pine còn giữ).
- **Pivot Seed (Last HL) có thể không seed được** trong phiên đó — giống `order_flow_bar`, dùng Session Seed để tránh.
- **Phụ thuộc library `smc_core` và `order_flow_core`** — xem cảnh báo version ở mục Tổng Quan.
- **Giới hạn 500 box**: mỗi hàng trong `active_profile` dùng 3 box (Volume Profile + Delta màu + Delta text trong suốt) cộng 1 box siêu nến. Vượt quá ~166 hàng sẽ chạm `max_boxes_count=500`, TradingView tự xoá box cũ nhất (có thể mất ngẫu nhiên vài hàng, kể cả POC) — chọn `price_step` sao cho số hàng trong phạm vi tính < 166.
- **Độ trễ reset đầu phiên**: giống `order_flow_bar`, `sess_profile`/`sess_start_bar` chỉ reset khi bar đầu phiên mới CONFIRM (`barstate.isconfirmed`) — trong lúc bar đó đang hình thành, Volume Profile/siêu nến Session vẫn còn lẫn dữ liệu phiên trước.
- **Chưa compile thật trên TradingView** tại thời điểm viết — cần copy-paste vào Pine Editor để xác nhận không lỗi biên dịch trước khi dùng (đặc biệt thuật toán Value Area dùng `array.sort_indices`/`array.sum`/vòng `while`, chưa có tiền lệ trong repo).

## Changelog

- **v1.6 (2026-11-25)**: Theo yêu cầu người dùng thêm so sánh trực quan giá hiện tại với Initial Balance.
  - Thêm nhóm input "Initial Balance (IB)": `show_ib` (ẩn/hiện), `ib_period_min` (30), `ib_periods_cnt` (2), `ib_color` (xanh dương), `ib_width` (2px), `ib_gap_bars` (1).
  - Thêm state tracking IB (`ib_high`/`ib_low`/`ib_locked`/`ib_periods_in_sess`) tính theo đúng chuẩn `market_profile_core.pine`/`market_profile.pine` — gộp high/low của `ib_periods_cnt` TPO Period đầu phiên thật, khóa lại sau khi đủ Period, cập nhật mỗi tick, độc lập với `mode_calc`.
  - `f_draw_panel` nhận thêm 2 tham số `ibh`/`ibl`, vẽ 1 `line.new` dọc (width tính bằng pixel) từ IB Low đến IB High, đặt bên trái siêu nến (`candle_left - ib_gap_bars`).
  - Backup v1.5 tại `indicators/hist/volume_profile_delta_v1.5.pine`.
- **v1.5 (2026-11-24)**: Đổi `import anthonydang/smc_core/2` → `anthonydang/smc_core/3`, thêm `import anthonydang/order_flow_core/1 as ofcore`. Thay `type BarRowVol`/`RowProfile` và hàm `f_bucket_bar_rows`/`f_push_bar_buffer`/`f_merge_into_profile`/`f_build_profile_from_buffer` viết tay riêng (lặp code y hệt với `indicators/order_flow_bar.pine`) bằng bản export từ [order_flow_core](order-flow-core.md) v1.0 — không đổi hành vi hiển thị. Backup v1.4 tại `indicators/hist/volume_profile_delta_v1.4.pine`.
- **v1.4 (2026-11-24)**: Theo phản hồi người dùng sau khi test v1.3 — viền box Delta dính vào nhau (cùng màu nền nên không thấy ranh giới giữa hàng), và chữ delta lệch lên trên so với tâm bar.
  - Thêm input `delta_border_color` (mặc định đen 20% trong suốt) — tách viền box Delta khỏi `delta_pos_color`/`delta_neg_color` (trước đó border_color = bgcolor nên vô hình).
  - Bỏ `label.new` (anchor theo baseline, canh giữa chiều dọc không chính xác — nguyên nhân chữ lệch lên) — đổi lại dùng `box.new(text=...)` (như `order_flow_bar.pine`), nhưng tách riêng 1 box trong suốt (không phải box Delta màu) đặt NGAY SAU tip của bar để chữ vẫn canh giữa chính xác theo `top`/`bottom` MÀ không nằm trong vùng màu của bar.
  - Số box/hàng tăng từ 2 lên 3 (thêm box text) — giảm giới hạn số hàng an toàn từ ~249 xuống ~166 (xem Giới Hạn & Lưu Ý).
  - Backup v1.3 tại `indicators/hist/volume_profile_delta_v1.3.pine`.
- **v1.3 (2026-11-24)**: Theo lỗi người dùng báo khi chạy Bar Replay — `Error on bar 1448: the requested historical offset (39) is beyond the historical buffer's limit (38)` tại `f_calc_range_ohlc`.
  - Nguyên nhân: `open[bar_index - left_bar]`/`high[...]`/`low[...]`/`close[...]` dùng offset BIẾN (series), không phải số cố định (literal) — Pine tự suy luận kích thước buffer lịch sử dựa trên offset lớn nhất gặp được lúc tính toán, suy luận này nhỏ hơn thực tế cần khi chạy Bar Replay (khởi động tính toán giữa lịch sử) nên lỗi.
  - Thêm 4 dòng `max_bars_back(open/high/low/close, 5000)` ngay sau `indicator()` — ép cứng buffer tối thiểu 5000 bar cho cả 4 series này, đủ cho offset biến thiên thực tế (1 session hoặc 1 leg SMC không vượt quá).
  - Backup v1.2 tại `indicators/hist/volume_profile_delta_v1.2.pine`.
- **v1.2 (2026-11-24)**: Theo phản hồi người dùng sau khi test v1.1 — chữ delta hiển thị SAI HƯỚNG (loang về bên trái, chồng lên siêu nến) thay vì bên phải tip như mong đợi.
  - Nguyên nhân: `label.style_label_right` trên TradingView thực tế loang chữ theo hướng NGƯỢC với suy luận từ comment changelog `order_flow_bar.pine` v1.5 (áp dụng cho vị trí anchor khác) — không đáng tin cậy để suy ra hướng loang chung.
  - Đổi sang `label.style_none` + `textalign=text.align_left` — đặt chữ CỐ ĐỊNH bắt đầu từ đúng điểm `x` cho trước, không phụ thuộc hướng loang của style_label_*.
  - Thêm input `delta_text_offset_bars` (mặc định 2) — khoảng cách thêm từ tip của bar delta đến điểm đặt chữ, đảm bảo chữ không chồng lên box dù dùng style_none.
  - Backup v1.1 tại `indicators/hist/volume_profile_delta_v1.1.pine`.
- **v1.1 (2026-11-24)**: Theo phản hồi người dùng sau khi test v1.0 — chữ giá trị delta bị chồng lấn lên vùng màu của bar khi bar ngắn.
  - Bỏ `text=`/`text_color=`/`text_size=`/`text_halign=` khỏi box Delta — chữ bị vẽ CHUNG với box nên luôn kẹt trong vùng màu, không có cách tách ra ngoài.
  - Thêm `array<label> of_labels` (xoá-vẽ-lại cùng lúc với box/line trong `f_clear_drawings`) — giá trị delta giờ vẽ bằng `label.new` riêng, đặt tại đúng điểm cuối (tip) của box Delta, `style=label.style_label_right` (chữ loang ra bên phải tip, không chồng lên box — cùng kỹ thuật `order_flow_bar.pine` v1.5 đã dùng cho nhãn POC/Peak), nền label trong suốt hoàn toàn.
  - Backup v1.0 tại `indicators/hist/volume_profile_delta_v1.0.pine`.
- **v1.0 (2026-11-24)**: Phát hành lần đầu. Volume Profile (POC/VAL/VAH highlight màu) + siêu nến tổng hợp OHLC theo phạm vi (hollow candle trắng/đen) + Delta Bar Chart (xanh dương/đỏ), dùng chung 3 phạm vi tính và hạ tầng bucket/buffer/SMC với `order_flow_bar.pine` nhưng là file độc lập.
