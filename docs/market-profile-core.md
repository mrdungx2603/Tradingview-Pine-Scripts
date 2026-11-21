# Market Profile Core Library — Tài Liệu

> **Script**: [libraries/market_profile_core.pine](../libraries/market_profile_core.pine) (v1.1)
> **Loại**: Library (`library(overlay=false)`)
> **Pine Script**: v6
> **Ngày tạo**: 2026-11-15 / **Cập nhật**: 2026-11-15
> **Dùng trong**: [indicators/market_profile.pine](../indicators/market_profile.pine) (v3.1, `import anthonydang/market_profile_core/2 as mpcore`), [indicators/order_flow_profile_panel.pine](../indicators/order_flow_profile_panel.pine) (v2.0, vẫn dùng `/1` — không cần hàm mới của v1.1)

## Tổng Quan

Library tách phần **động cơ tính toán thuần** của Market Profile/TPO (Time Price Opportunity) ra khỏi `market_profile.pine` thành UDT + pure function tái sử dụng được giữa nhiều indicator và strategy. Toàn bộ hàm **pure** — không dùng `var`/`varip` giữ trạng thái xuyên bar nội bộ, không `request.*`, không vẽ (`plot`/`line`/`box`/`label`/`table`); mọi state (mảng TPO, UDT `SessionProfile`) do caller tự giữ và truyền vào qua tham số, cùng quy ước với [libraries/smc_core.pine](../libraries/smc_core.pine).

Nguồn gốc: trước v1.0 của library này, `market_profile.pine` và `order_flow_profile_panel.pine` mỗi file tự viết lại ~400 dòng engine tương tự — `order_flow_profile_panel.pine` còn giữ bản thuật toán cũ (quét lại toàn phiên mỗi bar, O(số nến phiên × số hàng lưới)) mà `market_profile.pine` đã thay bằng engine incremental từ v2.0 của chính nó. Việc tách ra library giúp cả 2 dùng chung 1 bản đã tối ưu, sửa 1 nơi áp dụng cho cả 2.

## UDT Xuất (`export type`)

### `SessionProfile`

Chỉ chứa số/bool/string — không có `line`/`box`/`label` (phần vẽ do từng indicator tự quản lý riêng vì nhu cầu hiển thị khác nhau). Không chứa cờ chống lặp cảnh báo (`alerted_*`) — đó là state riêng của từng indicator, không thuộc "động cơ" chung.

| Nhóm Field | Field | Ý Nghĩa |
|---|---|---|
| Phiên | `start_bar`, `start_time`, `open_price`, `close_price`, `sess_high`, `sess_low` | Thông tin cơ bản của phiên đang chạy |
| Phiên trước | `prev_vah`/`prev_val`/`prev_poc`, `prev_end_bar`, `p_vah_tested`/`p_val_tested`/`p_poc_tested` | VAH/VAL/POC phiên trước + trạng thái đã kiểm định (lấp) |
| Initial Balance | `ib_high`/`ib_low`, `ib_locked`, `periods_in_sess`, `ext_up_first`/`ext_dn_first` | Vùng giá hình thành đầu phiên + hướng mở rộng đầu tiên |
| TPO Period | `last_period_id`, `cur_period_high`/`cur_period_low`, `prev_period_high`/`prev_period_low` | Theo dõi Period hiện tại/trước (dùng cho Rotation Factor & Late Spike) |
| POC/VA | `poc`, `vah`, `val`, `tick_step` | Point of Control & Value Area |
| RF/TPO Count | `rf_score`, `tpo_above_poc`, `tpo_below_poc`, `total_tpo` | Rotation Factor + phân bố TPO quanh POC |
| Phân loại & mẫu hình | `day_type`, `open_type`, `buying_tail_h`, `selling_tail_l`, `has_poor_high`/`has_poor_low`, `rule_80_status`, `has_sp_mid`, `sp_mid_top`/`sp_mid_bot`, `ledge_price`, `has_late_spike`, `spike_base` | Day Type/Open Type + các mẫu hình cấu trúc đặc biệt |

## Hàm Xuất (`export`)

| Hàm | Mô Tả |
|---|---|
| `f_add_bar_tpo(counts, last_period, p, cur_base_row, period_id, b_high, b_low, row_step, track_total)` | Động cơ TPO **incremental** — cộng TPO của 1 bar vào lưới, chỉ cộng 1 lần/`period_id`/hàng. Trả về `base_row` mới (không tự gán lại biến ngoài scope của caller được). Dùng chung cho lưới mịn/thô (`market_profile.pine`) hoặc 1 lưới duy nhất (`order_flow_profile_panel.pine`) |
| `f_process_bar_period(p, this_period_id, b_high, b_low)` | Cập nhật `periods_in_sess` + Rotation Factor khi 1 TPO Period đóng (không phải mỗi nến chart) |
| `f_calc_poc(counts, grid_low, step, sess_high, sess_low)` | Point of Control — tie-break theo hàng gần giá giữa phiên thực. Trả `[poc_price, poc_row]` |
| `f_calc_value_area(counts, poc_row, grid_low, step, total_tpo, va_pct)` | Value Area (VAH/VAL) mở rộng từ POC theo `va_pct` (tỷ lệ 0-1). Trả `[vah, val]` |
| `f_calc_tpo_above_below(counts, poc_row)` | TPO Count 2 phía POC. Trả `[above_cnt, below_cnt]` |
| `f_detect_buying_tail`/`f_detect_selling_tail(counts_c, poc_row_c, grid_low_c, step_c, min_tail_tpo)` | Phát hiện đuôi đơn (TPO=1) liên tục từ biên lưới tới POC — trả giá đỉnh đuôi hoặc `na` |
| `f_count_tail_rows(counts_c, poc_row_c, from_bottom)` | Số hàng đuôi (dùng làm biên quét cho `f_detect_single_prints`) |
| `f_detect_poor_hl(counts_c, buying_tail_h, selling_tail_l)` | Poor High/Low — biên có ≥2 TPO nhưng không có tail từ chối. Trả `[has_poor_low, has_poor_high]` |
| `f_detect_single_prints(counts_c, buy_tail_rows, sell_tail_rows, min_tail_tpo, grid_low_c, step_c)` | Dải TPO=1 liên tục giữa phiên. Trả `[has_sp_mid, sp_mid_bot, sp_mid_top]` |
| `f_detect_ledge(counts_c, grid_low_c, step_c)` | 2 hàng liên tiếp TPO≥3 bằng nhau, kẹp hàng TPO≤1 một bên |
| `f_detect_late_spike(p, ib_periods_cnt, step)` | 2 TPO Period cuối tạo high/low mới vượt xa VA. Trả `[has_late_spike, spike_base]` |
| `f_classify_day_type(p, ib_periods_cnt)` | Phân loại Day Type (Trend/Neutral/Nontrend/Normal...) từ IB range, RF, vị trí close |
| `f_classify_open_type(p)` | Phân loại Open Type (OD/OTD/ORR/OAOR/OAIR) từ vị trí mở cửa trong IB |
| `f_get_daytype_color(dt, c_trend, c_dd, c_neutral, c_nontrend, c_normal)` | Map Day Type → màu (nhận màu từ caller, không hardcode) |
| `f_check_80_rule(p, bar_high, bar_low, bars_inside_prev_va)` | 80% Value Area Rule — mở ngoài VA phiên trước rồi được chấp nhận lại ≥2 nến liên tiếp. Trả `[status, trig, new_bars_inside]` |
| `f_check_level_tested(bar_high, bar_low, level)` *(v1.1)* | 1 mức giá có bị "chạm" trong range high-low của 1 bar không — dùng cho Naked POC/Prev VAH/VAL/POC, hoặc tổng quát hơn: bất kỳ mức giá nào cần kiểm tra "đã chạm chưa" |
| `f_calc_ib_extensions(ib_high, ib_low)` *(v1.1)* | 4 đường mở rộng IB chuẩn (1.5x/2.0x, 2 hướng). Trả `[ext_u15, ext_u20, ext_d15, ext_d20]` |
| `f_calc_band_position(tick_step, sess_high, sess_low)` *(v1.1)* | Vị trí dải màu Day Type/Open Type, neo dưới đáy phiên. Trả `[band_top, band_bot]` |
| `f_format_signed_int(n)` *(v1.1)* | "+3"/"-2"/"0" — số có dấu (RF hoặc chỉ số có dấu khác) |
| `f_format_ib_state(p)` *(v1.1)* | Trạng thái IB dạng string: "Đang hình thành"/"Khóa (X)"/"Phá 2 đầu"/"Mở rộng Lên/Xuống" |
| `f_format_tpo_imbalance(p)` *(v1.1)* | "X↑/Y↓" — TPO Count 2 phía POC dạng string |
| `f_format_level_status(price, tested)` *(v1.1)* | "1843.9✓"/"1843.9○"/"—" — mức giá + trạng thái đã kiểm định, dùng cho bất kỳ mức giá nào có flag tested |
| `f_format_tails_summary(p)` *(v1.1)* | "Buy Sell SP" hoặc "Không có" |
| `f_format_poor_hl_summary(p)` *(v1.1)* | "High Low" hoặc "Không có" |
| `f_format_special_patterns_summary(p)` *(v1.1)* | "Ledge Spike" hoặc "Bình thường" |

Nhóm hàm `f_format_*` (v1.1) chỉ trả về string hiển thị **cơ bản** — toggle chẩn đoán/mở rộng (vd `show_diag` của `market_profile.pine`) là mối quan tâm riêng của từng indicator; caller tự nối thêm vào chuỗi trả về nếu cần, không đưa vào library để giữ library độc lập khỏi input UI của indicator.

## Logic Chính

- **Lưới TPO incremental** (`f_add_bar_tpo`): mảng `counts`/`last_period` mở rộng động (`array.unshift`/`array.push`) khi giá vượt biên hiện tại, KHÔNG quét lại lịch sử phiên mỗi bar. Bắt buộc `row_step` phải CỐ ĐỊNH xuyên suốt phiên (và thực tế xuyên suốt cả script, vì caller thường định nghĩa từ input) — nếu đổi `row_step` giữa đường, các bar đã cộng TPO sẽ nằm sai hàng (xem ghi chú ở `docs/order-flow-profile-panel.md` mục "Thiết Kế: Dùng Chung Core Với Market Profile").
- **1 TPO = 1 `period_id`**: caller tự quyết định `period_id` là gì — `market_profile.pine` dùng TPO Period thật (khung giờ cố định, vd 30 phút); `order_flow_profile_panel.pine` dùng `bar_index` (1 TPO = 1 nến M1 của chart).
- **2 UDT khác nhau có thể gọi cùng hàm**: vì mọi hàm nhận tham số thuần (`array`, `float`, `int`) hoặc UDT `SessionProfile`, 1 script có thể dùng 2 lưới độc lập (lưới mịn cho POC/VAH/VAL, lưới thô cho TPO Count/Tail/Poor/SP/Ledge — xem `market_profile.pine`) chỉ bằng cách gọi cùng hàm 2 lần với mảng/`step` khác nhau.

## Giới Hạn & Lưu Ý

- **Quy tắc version import đã xác nhận qua thực nghiệm**: `import user/lib/N` trỏ tới 1 "version publish" CỐ ĐỊNH, không tự trỏ theo bản mới nhất. Lần đầu tạo library (API `create`) tự動 có version `/1` dùng được ngay (sau 1 nhịp trễ lập chỉ mục ngắn). Các lần sửa sau (API `update`) chỉ lưu vào lịch sử "My Scripts", **KHÔNG** tự tạo version import mới — API hiện tại (không có endpoint "Publish") không thể tạo `/2`, `/3`... Muốn version mới khả dụng cho `import`, phải tự mở Pine Editor trên tradingview.com, mở script này, bấm **Publish script → Update existing publication** — bước đó mới sinh ra version import tiếp theo. Mỗi khi tăng "Phiên bản" (header) kèm hàm mới, cần làm bước này rồi mới cập nhật câu `import` ở các indicator dùng hàm mới.
- `f_add_bar_tpo`/`f_process_bar_period` **mutate trực tiếp** tham số `SessionProfile p` (field `total_tpo`, `rf_score`, `periods_in_sess`, `cur_period_high/low`, `prev_period_high/low`) — UDT truyền theo tham chiếu trong Pine Script, giống cách `smc_core.pine` mutate `SwingState`. Các hàm còn lại là pure thuần (trả giá trị, không mutate).
- Mọi hàm nên giữ nguyên tính pure khi mở rộng — không thêm `var`/vẽ trực tiếp vào library để các script dùng chung không bị ảnh hưởng tác dụng phụ ngoài ý muốn.

## Changelog

- **v1.0** (2026-11-15): Phát hành lần đầu, tách từ `market_profile.pine` v2.3 (động cơ TPO incremental v2.0). Dùng ngay cho `market_profile.pine` v3.0 và `order_flow_profile_panel.pine` v2.0.
- **v1.1** (2026-11-15): Thêm 3 hàm tiện ích (`f_check_level_tested`, `f_calc_ib_extensions`, `f_calc_band_position`) + 7 hàm định dạng dashboard (`f_format_signed_int`, `f_format_ib_state`, `f_format_tpo_imbalance`, `f_format_level_status`, `f_format_tails_summary`, `f_format_poor_hl_summary`, `f_format_special_patterns_summary`) — rút ra từ `market_profile.pine` v3.0 để indicator đó gọn hơn (v3.1). Backup v1.0 tại `libraries/hist/market_profile_core_v1.0.pine`.
