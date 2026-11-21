# Order Flow Bar

## Tổng Quan

> ⚠️ **Yêu cầu hạ tầng bắt buộc**: indicator này `import mrdungx2603/smc_core/1 as smc`. Nếu
> library `smc_core` chưa được **Publish thật** (Publish Library, không chỉ lưu "My Scripts")
> trên TradingView dưới tài khoản `mrdungx2603`, **TOÀN BỘ script sẽ không compile được**
> (lỗi ngay tại dòng `import`) — không chỉ riêng mode "Last HL". Xem chi tiết ở mục Giới Hạn
> & Lưu Ý bên dưới.

Indicator overlay vẽ **1 thanh order flow** dạng cánh (wing) neo tại 1 bar mốc trên chart.
Mỗi hàng giá (cao `price_step`) có 1 box buyer kéo sang phải (volume mua) và 1 box seller kéo
sang trái (volume bán), độ dài box tỷ lệ với volume của hàng đó so với hàng lớn nhất trong
phạm vi tính hiện tại. Dữ liệu buy/sell volume theo hàng giá lấy từ `request.footprint()`
**Tầng 1** (footprint mặc định của Pine, không dùng lower-timeframe hay ước lượng OHLCV),
bucket lại theo `price_step`, rồi gộp theo 1 trong 3 phạm vi tính (`mode_calc`): Visible
Chart, Session, hoặc Last HL (leg Higher Low/Lower High gần nhất theo cấu trúc SMC). Trên
profile đang active, indicator tính và highlight riêng màu 3 mức: POC, Peak Buy, Peak Sell —
kèm nhãn giá + volume tại mỗi mức.

Khác với `order_flow_profile_panel.pine` (panel dạng grid nhiều cột) và `order_flow_overlay.pine`
(tín hiệu phân kỳ/Delta Peak/RF vẽ dọc theo toàn bộ chart), `order_flow_bar.pine` chỉ vẽ
**1 thanh duy nhất** tại 1 vị trí, tập trung vào cơ cấu buy/sell theo hàng giá của 1 phạm vi
tính được chọn.

## Tham Số Đầu Vào

| Nhóm | Tham số | Mặc định | Ý nghĩa |
|---|---|---|---|
| Phạm Vi Tính | Chế độ Phạm Vi (`mode_calc`) | Visible Chart | Phạm vi gộp dữ liệu: Visible Chart / Session / Last HL |
| Phạm Vi Tính | Bước Giá (`price_step`) | 1.0 | Độ cao mỗi hàng giá khi bucket volume. Cần giữ cố định xuyên suốt (xem Giới Hạn) |
| Phạm Vi Tính | Số Bar Nhìn Thấy (`vis_bars_n`) | 100 | Số bar gần nhất tính tới bar hiện tại, dùng khi `mode_calc = Visible Chart` |
| Phạm Vi Tính | Max Lookback Bars (`max_lookback_bars`) | 500 | Số bar tối đa lưu trong buffer nội bộ; Session/Last HL/Visible Chart chỉ dựng lại được trong giới hạn này |
| SMC (Last HL) | Pivot Length (`pivot_length`) | 10 | Số nến trái/phải để xác nhận pivot high/low (dùng cho Pivot Seed) |
| SMC (Last HL) | Seed Mode (`seed_mode`) | Pivot Seed | Cách khởi tạo (seed) trạng thái SMC đầu phiên: Pivot Seed / Session Seed |
| Hiển Thị | Offset Bar Gốc (`anchor_offset_bars`) | 20 | Số bar lệch thêm so với `bar_index` để neo thanh order flow (mặc định 20, không phải 0, để cánh seller kéo trái không che candlestick gần nhất) |
| Hiển Thị | Max Độ Rộng Cánh (Bars) (`wing_max_bars`) | 20 | Số bar tối đa mỗi cánh (buyer/seller) khi hàng đó đạt volume lớn nhất |
| Hiển Thị | Màu Buyer (`buyer_color`) | xanh (50% trong suốt) | Màu box buyer (không highlight) |
| Hiển Thị | Màu Seller (`seller_color`) | đỏ (50% trong suốt) | Màu box seller (không highlight) |
| Hiển Thị | Màu POC (`poc_color`) | xanh dương | Màu highlight hàng POC (ưu tiên cao nhất) |
| Hiển Thị | Màu Peak Buy (`peak_buy_color`) | lime (50% trong suốt) | Màu highlight hàng Peak Buy |
| Hiển Thị | Màu Peak Sell (`peak_sell_color`) | cam (50% trong suốt) | Màu highlight hàng Peak Sell |
| Hiển Thị | Hiển Thị Nhãn Giá Trị (`show_value_labels`) | true | Bật/tắt 3 nhãn giá + volume tại POC/Peak Buy/Peak Sell |

## Logic Chính

- **Footprint Tầng 1**: gọi `request.footprint(ticks_per_row=1, va_percent=70, imbalance_percent=300)` đúng 1 lần (giới hạn Pine), không expose tham số ra input. Cờ `has_footprint_data` phát hiện tài khoản/sàn không có dữ liệu tick (`fp`/`fp.rows()` na), nhưng cờ dùng để **gate vẽ** là `has_fp_ever` (sticky — bật `true` 1 lần khi từng có footprint và giữ nguyên), để tránh thanh nhấp nháy/biến mất ở các bar không có giao dịch khớp dù dữ liệu tích lũy vẫn còn. Không raise lỗi khi không có dữ liệu.
- **Bucket theo hàng giá**: mỗi `volume_row` của footprint (1 tick/row) được gộp vào `row_id = floor(giá / price_step)` (số nguyên tuyệt đối) — hàng `row_id` bao đúng khoảng giá `[row_id * price_step, (row_id + 1) * price_step)`, cộng dồn `buy_volume()`/`sell_volume()` theo hàng.
- **Buffer theo bar**: kết quả bucket của mỗi bar đã đóng (`barstate.isconfirmed`) được đẩy vào circular buffer `of_buffer`, giữ tối đa `max_lookback_bars` phần tử gần nhất (phần tử cũ nhất bị shift ra khi vượt cap).
- **3 phạm vi tính (`mode_calc`)**, mỗi phạm vi dựng lại 1 `RowProfile` (gộp các bucket trong khoảng bar liên quan) bằng cách duyệt `of_buffer`:
  - **Visible Chart**: gộp N bar gần nhất (`vis_bars_n`) tính tới bar hiện tại.
  - **Session**: cộng dồn 1 chiều từ đầu phiên hiện tại, reset về rỗng mỗi khi sang ngày mới (`timeframe.change("D")`) — không dùng buffer, tính độc lập.
  - **Last HL**: dùng state machine SMC (library `smc_core`) để xác định leg Higher Low (uptrend) hoặc Lower High (downtrend) gần nhất **đã hoàn thành**; biên trái/phải lấy từ `hl_bar`→`hh_bar` (uptrend) hoặc `lh_bar`→`ll_bar` (downtrend). State machine được reset và seed lại (`seed_mode`) mỗi khi sang phiên mới, retry seed mỗi bar cho tới khi thành công.
- **Chọn active profile**: theo `mode_calc`, chọn 1 trong 3 `RowProfile` trên làm `active_profile`.
- **POC / Peak Buy / Peak Sell**: trên `active_profile`, tính `row_id` ứng với `argmax(buy+sell)` (POC), `argmax(buy)` (Peak Buy), `argmax(sell)` (Peak Sell). Trả `na` nếu profile rỗng.
- **Vẽ thanh**: với mỗi hàng trong `active_profile`, vẽ 1 box buyer (kéo phải từ bar neo, cao đúng `[row_id * price_step, (row_id + 1) * price_step)`) và 1 box seller (kéo trái), độ rộng tỷ lệ volume hàng đó / volume hàng lớn nhất, tối đa `wing_max_bars`. Hàng trùng POC/Peak Buy/Peak Sell được tô màu riêng theo thứ tự ưu tiên POC > Peak Buy > Peak Sell. Chỉ rebuild profile/POC/vẽ lại ở bar cuối cùng (`barstate.islast`, mỗi tick của bar đó) — các bar lịch sử không cần vẽ vì box/label luôn bị xoá-vẽ-lại toàn bộ, chỉ trạng thái cuối cùng có ý nghĩa.
- **Nhãn giá trị**: nếu `show_value_labels = true` và có dữ liệu footprint (`has_fp_ever`), vẽ tối đa 3 nhãn (POC/Peak Buy/Peak Sell) ghi giá (định dạng `mintick`, lấy **trung điểm hàng** `(row_id + 0.5) * price_step`) và volume (định dạng `volume`) tại mỗi mức, nếu mức đó còn tồn tại trong profile.

## Output / Tín Hiệu

- 1 thanh order flow gồm nhiều box buyer (phải)/seller (trái) theo hàng giá, neo tại `bar_index + anchor_offset_bars`.
- 3 mức highlight màu riêng trên thanh: POC (ưu tiên cao nhất), Peak Buy, Peak Sell.
- 3 nhãn text tại các mức trên: giá + volume (tuỳ chọn ẩn/hiện qua `show_value_labels`).
- Không có alert condition.

## Giới Hạn & Lưu Ý

- **Chỉ dùng footprint Tầng 1**: cần tài khoản TradingView có Premium (hoặc cao hơn) và sàn/symbol hỗ trợ dữ liệu tick. Nếu từ trước tới nay CHƯA từng có dữ liệu footprint (`has_fp_ever = false`) → toàn bộ thanh order flow (box + nhãn) bị **ẩn hoàn toàn**, không ước lượng thay thế bằng OHLCV hay lower-timeframe. `has_footprint_data` (không sticky, theo từng bar) chỉ dùng để cập nhật `has_fp_ever`, không dùng trực tiếp để gate vẽ — tránh thanh nhấp nháy ở bar không có giao dịch khớp dù đã từng có dữ liệu.
- **`price_step` phải cố định xuyên suốt**: `row_id` được tính trực tiếp từ `price_step` hiện tại và lưu nguyên vào buffer; đổi `price_step` giữa chừng sẽ làm các bucket cũ trong buffer (tính theo step cũ) không còn tương thích với bucket mới, gây lệch khi dựng lại profile. Đổi `price_step` nên đi kèm xoá/làm mới chart (hoặc chờ buffer tự xoay hết dữ liệu cũ).
- **Buffer giới hạn `max_lookback_bars`**: `of_buffer` chỉ giữ tối đa `max_lookback_bars` bar gần nhất; nếu phạm vi cần dựng (Visible Chart với `vis_bars_n` lớn, hoặc leg Last HL dài) vượt quá số bar còn lưu trong buffer, phần dữ liệu cũ hơn bị **clip tự nhiên** (không còn trong buffer, không raise lỗi) — profile dựng được sẽ thiếu phần đó.
- **Pivot Seed (Last HL) có thể không seed được**: `seed_mode = "Pivot Seed"` cần `ta.pivothigh`/`ta.pivotlow` cùng xác nhận đúng lúc trong vài bar đầu phiên; nếu không rơi đúng lúc, trạng thái SMC có thể không seed xong trong suốt phiên đó → `last_hl_profile` rỗng (không vẽ) cho tới phiên sau. `seed_mode = "Session Seed"` không gặp giới hạn này.
- **Blocker hạ tầng — library `smc_core` cần publish thật trên TradingView**: file dùng `import mrdungx2603/smc_core/1 as smc`. Tại thời điểm viết tài liệu này, `libraries/smc_core.pine` **chưa được publish thật** lên TradingView (chỉ tồn tại trong git repo) — đã xác nhận qua `mcp-tv-validate-pine-script` ở Task 6: lỗi `"The user 'mrdungx2603' does not have a published library titled 'smc_core'"` tại chính dòng `import`. Đây là blocker phát hiện từ Task 6, **người dùng cần tự publish `libraries/smc_core.pine` qua Pine Editor → Publish Library (tối thiểu mức Invite-only/Private)** trước khi mode "Last HL" (và cả `smc_strategy.pine`/`smc_market_structure_mtf.pine`) chạy được thật trên TradingView. Mode "Visible Chart" và "Session" không phụ thuộc `smc_core`, không bị ảnh hưởng bởi blocker này.
- **Giới hạn 500 box/500 label** (cấu hình `max_boxes_count`/`max_labels_count` trong `indicator()`): mỗi hàng giá trong `active_profile` dùng **2 box** (buyer + seller). Nếu số hàng trong phạm vi tính vượt quá **250 hàng** (ví dụ `price_step` quá nhỏ so với range giá của phạm vi đang tính), tổng số box sẽ vượt `max_boxes_count=500` — TradingView tự xoá box cũ nhất để giữ dưới giới hạn, có thể làm **mất ngẫu nhiên 1 vài hàng (kể cả hàng POC)** mà không báo lỗi. Nên chọn `price_step` sao cho `(range giá của phạm vi tính) / price_step < 250`.
- Chỉ so sánh pivot/leg SMC gần nhất; không hiển thị lịch sử nhiều leg.

## Changelog

- **v1.1 (2026-11-21)**: Fix wave từ final whole-branch review trước khi merge.
  - Sửa off-by-one: box hàng giá bao đúng `[row_id * price_step, (row_id + 1) * price_step)` (trước đó lệch xuống 1 hàng); nhãn giá trị dùng trung điểm hàng `(row_id + 0.5) * price_step`.
  - Thêm cờ sticky `has_fp_ever` để gate vẽ thay cho `has_footprint_data` (tránh thanh nhấp nháy/biến mất ở bar không có giao dịch khớp).
  - Rebuild profile + tính POC/Peak + vẽ box/label chỉ chạy ở `barstate.islast` (trước đó chạy mọi bar lịch sử, rủi ro timeout).
  - Đổi mặc định `anchor_offset_bars` từ 0 thành 20 (tránh cánh seller che candlestick gần nhất).
  - Bổ sung cảnh báo định lượng giới hạn 500 box (2 box/hàng, giới hạn ~250 hàng) và ghi chú blocker `smc_core` ngay ở đầu mục Tổng Quan.
- **v1.0 (2026-11-21)**: Phát hành lần đầu. Thanh order flow buyer/seller theo hàng giá (footprint Tầng 1), 3 phạm vi tính (Visible Chart/Session/Last HL), circular buffer theo bar, session accumulator, SMC state machine reseed mỗi phiên cho Last HL, highlight + nhãn POC/Peak Buy/Peak Sell.
