# Order Flow Bar

## Tổng Quan

> ⚠️ **Yêu cầu hạ tầng bắt buộc**: indicator này `import anthonydang/smc_core/1 as smc`. Nếu
> library `smc_core` chưa được **Publish thật** (Publish Library, không chỉ lưu "My Scripts")
> trên TradingView dưới tài khoản `anthonydang`, **TOÀN BỘ script sẽ không compile được**
> (lỗi ngay tại dòng `import`) — không chỉ riêng mode "Last HL". Xem chi tiết ở mục Giới Hạn
> & Lưu Ý bên dưới.

Indicator overlay vẽ **1 thanh order flow** dạng cánh (wing) neo tại 1 bar mốc trên chart.
Mỗi hàng giá (cao `price_step`) có 1 box buyer kéo sang phải (volume mua) và 1 box seller kéo
sang trái (volume bán), độ dài box tỷ lệ với volume của hàng đó so với hàng lớn nhất trong
phạm vi tính hiện tại. Dữ liệu buy/sell volume theo hàng giá lấy từ `request.footprint()`
**Tầng 1** (footprint mặc định của Pine, không dùng lower-timeframe hay ước lượng OHLCV),
bucket lại theo `price_step`, rồi gộp theo 1 trong 2 phạm vi tính (`mode_calc`): Session,
hoặc Last HL (leg Higher Low/Lower High gần nhất theo cấu trúc SMC). Trên profile đang
active, indicator highlight riêng màu 3 mức (chỉ qua box, không nhãn text): POC, Peak Buy,
Peak Sell. Giữa 2 cánh buyer/seller có 1 "cột giữa" hiện giá + delta (buy - sell) tại mỗi
hàng, và 1 nhãn riêng ghi giá khớp hiện tại.

Khác với `order_flow_profile_panel.pine` (panel dạng grid nhiều cột) và `order_flow_overlay.pine`
(tín hiệu phân kỳ/Delta Peak/RF vẽ dọc theo toàn bộ chart), `order_flow_bar.pine` chỉ vẽ
**1 thanh duy nhất** tại 1 vị trí, tập trung vào cơ cấu buy/sell theo hàng giá của 1 phạm vi
tính được chọn.

## Tham Số Đầu Vào

| Nhóm | Tham số | Mặc định | Ý nghĩa |
|---|---|---|---|
| Phạm Vi Tính | Chế độ Phạm Vi (`mode_calc`) | Session | Phạm vi gộp dữ liệu: Session / Last HL (bỏ "Visible Chart" từ v1.8 theo yêu cầu người dùng) |
| Phạm Vi Tính | Bước Giá (`price_step`) | 1.0 | Độ cao mỗi hàng giá khi bucket volume. Cần giữ cố định xuyên suốt (xem Giới Hạn) |
| Phạm Vi Tính | Max Lookback Bars (`max_lookback_bars`) | 500 | Số bar tối đa lưu trong buffer nội bộ; Last HL chỉ dựng lại được trong giới hạn này (Session không dùng buffer) |
| SMC (Last HL) | Pivot Length (`pivot_length`) | 10 | Số nến trái/phải để xác nhận pivot high/low (dùng cho Pivot Seed) |
| SMC (Last HL) | Seed Mode (`seed_mode`) | Pivot Seed | Cách khởi tạo (seed) trạng thái SMC đầu phiên: Pivot Seed / Session Seed |
| Hiển Thị | Offset Bar Gốc (`anchor_offset_bars`) | 20 | Số bar lệch thêm so với `bar_index` để neo thanh order flow (mặc định 20, không phải 0, để cánh seller kéo trái không che candlestick gần nhất) |
| Hiển Thị | Max Độ Rộng Cánh (Bars) (`wing_max_bars`) | 20 | Số bar tối đa mỗi cánh (buyer/seller) khi hàng đó đạt volume lớn nhất |
| Hiển Thị | Độ Rộng Cột Giữa (Bars) (`delta_col_width`) | 3 | Khoảng trống (số bar) chừa ở giữa 2 cánh buyer/seller, canh tâm vị trí neo — nơi vẽ nhãn giá+delta mỗi hàng, không bị box che |
| Hiển Thị | Màu Buyer (`buyer_color`) | xanh (50% trong suốt) | Màu box buyer (không highlight) |
| Hiển Thị | Màu Seller (`seller_color`) | đỏ (50% trong suốt) | Màu box seller (không highlight) |
| Hiển Thị | Màu Viền Hàng (`wing_border_color`) | xám (50% trong suốt) | Màu viền cho MỌI hàng (buyer+seller) — hàng POC/Peak Buy/Peak Sell đè lên bằng viền màu riêng của mức đó |
| Hiển Thị | Màu POC (`poc_color`) | xanh dương | Màu highlight CẢ viền+nền hàng POC (ưu tiên cao nhất, không đổi) |
| Hiển Thị | Màu Viền Peak Buy (`peak_buy_color`) | vàng (đặc) | Chỉ đổi màu VIỀN hàng Peak Buy — nền vẫn giữ tông `buyer_color` gốc (xem `peak_fill_transparency`) |
| Hiển Thị | Màu Viền Peak Sell (`peak_sell_color`) | vàng (đặc) | Chỉ đổi màu VIỀN hàng Peak Sell — nền vẫn giữ tông `seller_color` gốc (xem `peak_fill_transparency`) |
| Hiển Thị | Độ Đậm Highlight Peak (`peak_fill_transparency`) | 10 | Transparency (%) của màu nền hàng Peak Buy/Peak Sell — giữ nguyên tông `buyer_color`/`seller_color`, chỉ giảm trong suốt để "đậm" hơn các hàng thường. 0 = đặc hoàn toàn |
| Hiển Thị | Hiển Thị Nhãn Giá Trị (`show_value_labels`) | true | Bật/tắt nhãn "cột giữa" (giá + delta mỗi hàng, xem 2 dòng dưới) |
| Hiển Thị | Màu Nền Cột Giữa (`price_column_color`) | xám (85% đặc) | Màu nền của nhãn cột giữa (giá+delta) — nền đặc (không trong suốt) để không bị lẫn vào màu box phía sau |
| Hiển Thị | Màu Delta Dương (`delta_pos_color`) | lime | Màu chữ phần delta khi delta > 0 (hàng đó dư mua) |
| Hiển Thị | Màu Delta Âm (`delta_neg_color`) | đỏ | Màu chữ phần delta khi delta < 0 (hàng đó dư bán) |
| Hiển Thị | Hiển Thị Giá Khớp Hiện Tại (`show_current_price_label`) | true | Bật/tắt 1 nhãn riêng ghi giá khớp hiện tại (`close`) — độc lập với cột giữa (giá trị liên tục, không bó theo lưới `price_step`) |
| Hiển Thị | Màu Giá Khớp Hiện Tại (`current_price_color`) | vàng | Màu nhãn giá khớp hiện tại — nổi bật nhất trong toàn bộ thanh để dễ phân biệt với các mức giá khác |

## Logic Chính

- **Footprint Tầng 1**: gọi `request.footprint(ticks_per_row=1, va_percent=70, imbalance_percent=300)` đúng 1 lần (giới hạn Pine), không expose tham số ra input. Cờ `has_footprint_data` phát hiện tài khoản/sàn không có dữ liệu tick (`fp`/`fp.rows()` na), nhưng cờ dùng để **gate vẽ** là `has_fp_ever` (sticky — bật `true` 1 lần khi từng có footprint và giữ nguyên), để tránh thanh nhấp nháy/biến mất ở các bar không có giao dịch khớp dù dữ liệu tích lũy vẫn còn. Không raise lỗi khi không có dữ liệu.
- **Bucket theo hàng giá**: mỗi `volume_row` của footprint (1 tick/row) được gộp vào `row_id = floor(giá / price_step)` (số nguyên tuyệt đối) — hàng `row_id` bao đúng khoảng giá `[row_id * price_step, (row_id + 1) * price_step)`, cộng dồn `buy_volume()`/`sell_volume()` theo hàng.
- **Buffer theo bar**: kết quả bucket của mỗi bar đã đóng (`barstate.isconfirmed`) được đẩy vào circular buffer `of_buffer`, giữ tối đa `max_lookback_bars` phần tử gần nhất (phần tử cũ nhất bị shift ra khi vượt cap).
- **2 phạm vi tính (`mode_calc`)** (bỏ "Visible Chart" từ v1.8), mỗi phạm vi dựng lại 1 `RowProfile`:
  - **Session**: cộng dồn 1 chiều từ đầu phiên hiện tại, reset về rỗng mỗi khi sang ngày mới (`timeframe.change("D")`) — không dùng buffer, tính độc lập.
  - **Last HL**: dùng state machine SMC (library `smc_core`) để xác định leg Higher Low (uptrend) hoặc Lower High (downtrend) gần nhất **đã hoàn thành**; biên trái/phải lấy từ `hl_bar`→`hh_bar` (uptrend) hoặc `lh_bar`→`ll_bar` (downtrend) — dựng lại bằng cách duyệt `of_buffer`. State machine được reset và seed lại (`seed_mode`) mỗi khi sang phiên mới, retry seed mỗi bar cho tới khi thành công.
- **Chọn active profile**: theo `mode_calc`, chọn 1 trong 2 `RowProfile` trên làm `active_profile`.
- **POC / Peak Buy / Peak Sell**: trên `active_profile`, tính `row_id` ứng với `argmax(buy+sell)` (POC), `argmax(buy)` (Peak Buy), `argmax(sell)` (Peak Sell). Trả `na` nếu profile rỗng.
- **Vẽ thanh**: với mỗi hàng trong `active_profile`, vẽ 1 box buyer (kéo phải, bắt đầu từ `anchor_bar + delta_col_width`, cao đúng `[row_id * price_step, (row_id + 1) * price_step)`) và 1 box seller (kéo trái, kết thúc tại `anchor_bar - delta_col_width`) — độ rộng tỷ lệ volume hàng đó / volume hàng lớn nhất, tối đa `wing_max_bars`. Dời ra 2 bên `delta_col_width` bar để chừa khoảng trống ở giữa cho "cột giữa" (xem dưới), không bị box che. Hàng POC được tô CẢ viền + nền bằng `poc_color`. Hàng Peak Buy/Peak Sell CHỈ đổi viền (`peak_buy_color`/`peak_sell_color`, mặc định vàng) — nền giữ tông `buyer_color`/`seller_color` gốc nhưng giảm trong suốt (`peak_fill_transparency`) để "đậm" hơn, không đổi hẳn sang màu khác. Ưu tiên khi 1 hàng trùng nhiều mức: POC > Peak Buy > Peak Sell. Chỉ rebuild profile/POC/vẽ lại ở bar cuối cùng (`barstate.islast`, mỗi tick của bar đó) — các bar lịch sử không cần vẽ vì box/label luôn bị xoá-vẽ-lại toàn bộ, chỉ trạng thái cuối cùng có ý nghĩa.
- **Không có nhãn text riêng cho POC/Peak Buy/Peak Sell** (theo yêu cầu người dùng, bỏ ở v1.7) — 3 mức này CHỈ thể hiện qua màu viền/nền của box (xem mục "Vẽ thanh" phía trên), không vẽ `label.new` kèm giá/volume.
- **Cột giữa (giá + delta)**: cùng điều kiện `show_value_labels`/`has_fp_ever`, vẽ tại `anchor_bar` (đúng tâm khoảng trống `delta_col_width` giữa 2 cánh) — với MỖI hàng thực sự có dữ liệu trong `active_profile` (không phải mọi mức giá lý thuyết), 1 nhãn nền đặc (`price_column_color`) ghi "giá (trung điểm hàng, `mintick`)  Δdelta" — `delta = buy - sell` tại đúng hàng đó (`format.volume`, có dấu `+`/`-`), màu chữ theo dấu delta (`delta_pos_color` khi dương/dư mua, `delta_neg_color` khi âm/dư bán, xám khi bằng 0).
- **Giá khớp hiện tại**: nếu `show_current_price_label = true`, vẽ thêm 1 nhãn riêng tại `y=close` (giá đóng cửa của bar đang chạy — giá khớp hiện tại), màu `current_price_color` (mặc định vàng, nổi bật nhất). Khác cột giữa ở trên — giá trị này liên tục, không bó theo lưới `price_step`. Kèm 1 đường kẻ ngang nét đứt (cùng màu, cùng điều kiện hiện/ẩn) nối trực tiếp từ nến hiện tại (`bar_index`) sang vị trí neo của thanh (`anchor_bar`), cùng `y=close` — giúp xác nhận bằng mắt nhãn này đúng độ cao thật với nến, dù thanh nổi cách xa nến do `anchor_offset_bars`.
- **Viền mọi hàng**: mỗi box buyer/seller luôn có viền màu `wing_border_color` để phân biệt ranh giới giữa các hàng liền kề; hàng POC/Peak Buy/Peak Sell đè viền bằng màu riêng của mức đó (ưu tiên POC > Peak Buy > Peak Sell) — xem chi tiết màu nền ở mục "Vẽ thanh" phía trên.

## Output / Tín Hiệu

- 1 thanh order flow gồm nhiều box buyer (phải)/seller (trái) theo hàng giá, neo tại `bar_index + anchor_offset_bars`.
- 3 mức highlight trên thanh (chỉ qua màu box, KHÔNG có nhãn text riêng): POC (viền+nền riêng, ưu tiên cao nhất), Peak Buy/Peak Sell (chỉ viền riêng, nền giữ tông buyer/seller nhưng đậm hơn).
- 1 "cột giữa" (khoảng trống giữa 2 cánh): nhãn giá + delta (buy - sell) tại mỗi hàng, cùng 1 nhãn giá khớp hiện tại riêng (tuỳ chọn ẩn/hiện qua `show_value_labels`/`show_current_price_label`).
- Không có alert condition.

## Giới Hạn & Lưu Ý

- **Chỉ dùng footprint Tầng 1**: cần tài khoản TradingView có Premium (hoặc cao hơn) và sàn/symbol hỗ trợ dữ liệu tick. Nếu từ trước tới nay CHƯA từng có dữ liệu footprint (`has_fp_ever = false`) → toàn bộ thanh order flow (box + nhãn) bị **ẩn hoàn toàn**, không ước lượng thay thế bằng OHLCV hay lower-timeframe. `has_footprint_data` (không sticky, theo từng bar) chỉ dùng để cập nhật `has_fp_ever`, không dùng trực tiếp để gate vẽ — tránh thanh nhấp nháy ở bar không có giao dịch khớp dù đã từng có dữ liệu.
- **`price_step` phải cố định xuyên suốt**: `row_id` được tính trực tiếp từ `price_step` hiện tại và lưu nguyên vào buffer; đổi `price_step` giữa chừng sẽ làm các bucket cũ trong buffer (tính theo step cũ) không còn tương thích với bucket mới, gây lệch khi dựng lại profile. Đổi `price_step` nên đi kèm xoá/làm mới chart (hoặc chờ buffer tự xoay hết dữ liệu cũ).
- **Buffer giới hạn `max_lookback_bars`**: `of_buffer` chỉ giữ tối đa `max_lookback_bars` bar gần nhất; nếu leg Last HL dài vượt quá số bar còn lưu trong buffer, phần dữ liệu cũ hơn bị **clip tự nhiên** (không còn trong buffer, không raise lỗi) — profile dựng được sẽ thiếu phần đó. Session không dùng buffer này (tính độc lập, không bị clip).
- **Pivot Seed (Last HL) có thể không seed được**: `seed_mode = "Pivot Seed"` cần `ta.pivothigh`/`ta.pivotlow` cùng xác nhận đúng lúc trong vài bar đầu phiên; nếu không rơi đúng lúc, trạng thái SMC có thể không seed xong trong suốt phiên đó → `last_hl_profile` rỗng (không vẽ) cho tới phiên sau. `seed_mode = "Session Seed"` không gặp giới hạn này.
- **Blocker hạ tầng — library `smc_core` cần publish thật trên TradingView**: file dùng `import anthonydang/smc_core/1 as smc` (đổi từ `mrdungx2603/smc_core/1` ở bản v1.2 trở về trước — theo yêu cầu người dùng). Task 6 đã xác nhận qua `mcp-tv-validate-pine-script` với import cũ (`mrdungx2603`) lỗi dạng `"The user '<tên tài khoản>' does not have a published library titled 'smc_core'"` tại chính dòng `import` khi library chưa publish — cùng loại lỗi này sẽ xảy ra với `anthonydang` nếu `libraries/smc_core.pine` cũng chưa được publish dưới tài khoản đó. **Người dùng cần tự publish `libraries/smc_core.pine` qua Pine Editor → Publish Library (tối thiểu mức Invite-only/Private) dưới tài khoản `anthonydang`** trước khi mode "Last HL" chạy được thật trên TradingView. Mode "Session" không phụ thuộc `smc_core`, không bị ảnh hưởng bởi blocker này.
- **Giới hạn 500 box/500 label** (cấu hình `max_boxes_count`/`max_labels_count` trong `indicator()`): mỗi hàng giá trong `active_profile` dùng **2 box** (buyer + seller). Nếu số hàng trong phạm vi tính vượt quá **250 hàng** (ví dụ `price_step` quá nhỏ so với range giá của phạm vi đang tính), tổng số box sẽ vượt `max_boxes_count=500` — TradingView tự xoá box cũ nhất để giữ dưới giới hạn, có thể làm **mất ngẫu nhiên 1 vài hàng (kể cả hàng POC)** mà không báo lỗi. Nên chọn `price_step` sao cho `(range giá của phạm vi tính) / price_step < 250`.
- Chỉ so sánh pivot/leg SMC gần nhất; không hiển thị lịch sử nhiều leg.

## Changelog

- **v1.9 (2026-11-22)**: Theo yêu cầu người dùng — thêm "cột giữa" hiện delta tại mỗi hàng.
  - Thêm input `delta_col_width` (mặc định 3 bar) — chừa khoảng trống giữa 2 cánh buyer/seller (canh tâm `anchor_bar`), dời `buy_box`/`sell_box` ra 2 bên thêm `delta_col_width` để không che nhãn ở giữa.
  - Thay "cột giá tham khảo" cũ (chỉ hiện giá, cách đều mỗi N hàng, kể cả hàng không có dữ liệu) bằng "cột giữa" mới: hiện "giá  Δdelta" (`delta = buy - sell`) tại MỖI hàng thực sự có dữ liệu — bỏ input `price_ruler_step_rows` (không còn cần, vì không còn stepping theo khoảng).
  - Thêm input `delta_pos_color` (mặc định lime)/`delta_neg_color` (mặc định đỏ) — màu chữ phần delta theo dấu.
  - Backup v1.8 tại `indicators/hist/order_flow_bar_v1.8.pine`.
- **v1.8 (2026-11-22)**: Theo yêu cầu người dùng — bỏ hẳn mode "Visible Chart".
  - Xoá option "Visible Chart" khỏi `mode_calc` (chỉ còn `["Session", "Last HL"]`, mặc định đổi sang "Session").
  - Xoá input `vis_bars_n`, biến `vis_profile`, và toàn bộ nhánh tính liên quan (`f_build_profile_from_buffer(of_buffer, bar_index - vis_bars_n + 1, bar_index)`) — không còn code chết.
  - `active_profile` đơn giản lại: `mode_calc == "Session" ? sess_profile : last_hl_profile`.
  - Backup v1.7 tại `indicators/hist/order_flow_bar_v1.7.pine`.
- **v1.7 (2026-11-22)**: Theo yêu cầu người dùng — bỏ hẳn nhãn text cho POC/Peak Buy/Peak Sell.
  - Xoá 3 nhãn `label.new` (POC/Peak Buy/Peak Sell) khỏi `f_draw_level_labels` — 3 mức này giờ chỉ thể hiện qua highlight màu viền/nền của box trong `f_draw_wings` (giữ nguyên từ v1.6), không còn text nào kèm theo.
  - Cột giá tham khảo + nhãn giá khớp hiện tại (đường kẻ nối) giữ nguyên, không đổi.
  - Backup v1.6 tại `indicators/hist/order_flow_bar_v1.6.pine`.
- **v1.6 (2026-11-22)**: Theo yêu cầu người dùng — đổi cách highlight Peak Buy/Peak Sell.
  - Thay cách cũ (đổi hẳn cả viền+nền sang `peak_buy_color`/`peak_sell_color`) bằng: CHỈ đổi viền sang màu đó (mặc định đổi từ lime/cam 50% trong suốt thành **vàng đặc**), nền giữ nguyên tông `buyer_color`/`seller_color` gốc nhưng giảm trong suốt qua input mới `peak_fill_transparency` (mặc định 10%) để "đậm" hơn — không đổi hẳn sang màu khác. Dùng `color.rgb(color.r/g/b(...), peak_fill_transparency)` để giữ đúng tông màu gốc.
  - Hàng POC không đổi (vẫn đổi cả viền+nền sang `poc_color`, không bị ảnh hưởng bởi thay đổi này).
  - Bỏ prefix "Peak Buy "/"Peak Sell " trong text nhãn — chỉ còn giá + volume (nhãn POC vẫn giữ prefix "POC").
  - Backup v1.5 tại `indicators/hist/order_flow_bar_v1.5.pine`.
- **v1.5 (2026-11-22)**: Theo phản hồi người dùng sau khi test v1.4 — nhãn POC/Peak Buy/Peak Sell đặt ngay tại `anchor_bar` (giữa 2 cánh) bị box buyer/seller che mất, không đọc được.
  - Chuyển 3 nhãn này ra `anchor_bar + wing_max_bars + 2` (vượt quá điểm xa nhất cánh buyer có thể vẽ tới), đổi kiểu `label.style_label_left` → `label.style_label_right` để chữ loang ra bên phải, không chồng lên box.
  - Cột giá tham khảo và nhãn giá khớp hiện tại (thêm ở v1.2-v1.4) giữ nguyên vị trí tại `anchor_bar` — chưa thay đổi ở bản này (người dùng chỉ phản hồi về nhãn POC/Peak).
  - Backup v1.4 tại `indicators/hist/order_flow_bar_v1.4.pine`.
- **v1.4 (2026-11-22)**: Theo phản hồi người dùng sau khi test v1.3 — nhãn giá khớp hiện tại nổi cách xa nến (do `anchor_offset_bars`) khiến khó xác nhận bằng mắt có đúng độ cao thật với nến không.
  - Thêm 1 đường kẻ ngang nét đứt (`line.new`, cùng màu `current_price_color`) nối trực tiếp từ nến hiện tại (`bar_index`, `y=close`) sang vị trí neo của thanh (`anchor_bar`, cùng `y=close`) — xoá/vẽ lại mỗi lần cập nhật (`barstate.islast`), cùng điều kiện hiện/ẩn với nhãn "Giá: X" (`show_current_price_label`).
  - Lưu ý kỹ thuật: indicator này `overlay=true` nên luôn dùng CHUNG 1 trục giá với candlestick (Pine không hỗ trợ trục riêng cho overlay study) — mọi box/label/line đều vẽ bằng giá trị giá thật (`price_step`/`row_id`/`close`), không có "trục riêng" theo nghĩa kỹ thuật; đường kẻ mới chỉ giúp xác nhận trực quan rõ hơn.
  - Backup v1.3 tại `indicators/hist/order_flow_bar_v1.3.pine`.
- **v1.3 (2026-11-22)**: Theo yêu cầu người dùng sau khi xem lại v1.2.
  - Đổi `import mrdungx2603/smc_core/1` → `import anthonydang/smc_core/1` — library `smc_core` publish dưới tài khoản `anthonydang` (khác tài khoản dùng khi phát hiện blocker ở Task 6).
  - Đổi cột giá tham khảo từ nhãn trong suốt (`label.style_none`, khó nhìn trên nền box màu) sang nhãn nền đặc (`label.style_label_center` + input `price_column_color` mới) — tạo thành 1 "cột" rõ ràng, dễ đọc ở giữa thanh.
  - Thêm nhãn riêng ghi **giá khớp hiện tại** (`close`, input `show_current_price_label`/`current_price_color` mới, mặc định màu vàng nổi bật) — trả lời trực tiếp câu hỏi "giá khớp đang là bao nhiêu", độc lập với cột giá tham khảo (giá trị liên tục, không bó theo lưới `price_step`).
  - Backup v1.2 tại `indicators/hist/order_flow_bar_v1.2.pine`.
- **v1.2 (2026-11-22)**: Theo yêu cầu người dùng sau khi xem lại — 2 cải tiến hiển thị.
  - Thêm input `wing_border_color` (mặc định xám 50% trong suốt) — mọi hàng buyer/seller giờ có viền rõ ràng để phân biệt ranh giới giữa các hàng (trước đó viền `na`/vô hình với hàng không highlight).
  - Thêm "cột giá" tham khảo: input `price_ruler_step_rows` (mặc định 5) — vẽ nhãn giá trơn cách đều mỗi N hàng (tính theo giá trị `row_id` thật, không theo thứ tự mảng) tại vị trí neo thanh, giúp đọc giá nhanh không cần nhìn sang trục giá gốc của chart.
  - **Lưu ý**: bản v1.2 **chưa được compile thật trên TradingView** tại thời điểm viết (tương tự tình trạng v1.0/v1.1 — xem mục Giới Hạn & Lưu Ý) — người dùng tự kiểm tra qua Pine Editor trước khi dùng.
  - Backup v1.1 tại `indicators/hist/order_flow_bar_v1.1.pine`.
- **v1.1 (2026-11-21)**: Fix wave từ final whole-branch review trước khi merge.
  - Sửa off-by-one: box hàng giá bao đúng `[row_id * price_step, (row_id + 1) * price_step)` (trước đó lệch xuống 1 hàng); nhãn giá trị dùng trung điểm hàng `(row_id + 0.5) * price_step`.
  - Thêm cờ sticky `has_fp_ever` để gate vẽ thay cho `has_footprint_data` (tránh thanh nhấp nháy/biến mất ở bar không có giao dịch khớp).
  - Rebuild profile + tính POC/Peak + vẽ box/label chỉ chạy ở `barstate.islast` (trước đó chạy mọi bar lịch sử, rủi ro timeout).
  - Đổi mặc định `anchor_offset_bars` từ 0 thành 20 (tránh cánh seller che candlestick gần nhất).
  - Bổ sung cảnh báo định lượng giới hạn 500 box (2 box/hàng, giới hạn ~250 hàng) và ghi chú blocker `smc_core` ngay ở đầu mục Tổng Quan.
- **v1.0 (2026-11-21)**: Phát hành lần đầu. Thanh order flow buyer/seller theo hàng giá (footprint Tầng 1), 3 phạm vi tính (Visible Chart/Session/Last HL), circular buffer theo bar, session accumulator, SMC state machine reseed mỗi phiên cho Last HL, highlight + nhãn POC/Peak Buy/Peak Sell.
