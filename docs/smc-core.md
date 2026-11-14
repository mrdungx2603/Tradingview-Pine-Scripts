# SMC Core Library — Tài Liệu

> **Script**: [libraries/smc_core.pine](../libraries/smc_core.pine) (v1.0)
> **Loại**: Library (`library(overlay=false)`)
> **Pine Script**: v6
> **Ngày tạo**: 2026-07-10 / **Cập nhật**: 2026-07-10
> **Dùng trong**: [strategies/smc_strategy.pine](../strategies/smc_strategy.pine), [indicators/smc_market_structure.pine](../indicators/smc_market_structure.pine), [indicators/smc_market_structure_mtf.pine](../indicators/smc_market_structure_mtf.pine) — cả 3 đều `import mrdungx2603/smc_core/1 as smc`

## Tổng Quan

Library tách phần **lõi state machine SMC Market Structure** (phát hiện HH/HL/LL/LH, BoS, CHoCH) ra khỏi `smc_market_structure.pine` thành các pure function tái sử dụng được giữa indicator, indicator MTF và strategy. Toàn bộ hàm **pure** — không dùng `var`, không `request.*`, không vẽ (`plot`/`line`/`box`/`label`); mọi state được truyền/trả qua UDT `SwingState`.

## UDT Xuất (`export type`)

### `SwingState`

| Field | Kiểu | Ý Nghĩa |
|---|---|---|
| `trend` | `int` | `1`=Uptrend, `-1`=Downtrend, `0`=Init (chưa xác định, chờ breakout) |
| `hh_bar`/`hh_price` | `int`/`float` | Higher High gần nhất |
| `hl_bar`/`hl_price` | `int`/`float` | Higher Low gần nhất |
| `ll_bar`/`ll_price` | `int`/`float` | Lower Low gần nhất |
| `lh_bar`/`lh_price` | `int`/`float` | Lower High gần nhất |
| `cand_bar`/`cand_high`/`cand_low` | `int`/`float`/`float` | Candidate pivot đang được "săn" |
| `cand_type` | `int` | `1`=săn HH, `-1`=săn LL, `0`=không hoạt động |
| `trigger_bar` | `int` | Bar bắt đầu range cần quét HL/LH |
| `seeded` | `bool` | Đã seed xong cấu trúc ban đầu chưa |
| `last_ph_bar`/`last_ph_val`, `last_pl_bar`/`last_pl_val` | — | Pivot gần nhất, dùng khi seed bằng Pivot Seed |
| `event` | `int` | `1`=BoS Bull, `-1`=BoS Bear, `2`=CHoCH Bear, `-2`=CHoCH Bull, `0`=không có — reset mỗi bar, caller đọc để vẽ/trigger entry |

## Hàm Xuất (`export`)

| Hàm | Mô Tả |
|---|---|
| `f_init_state()` | Khởi tạo `SwingState` rỗng (mọi field `na`, `trend=0`, `seeded=false`) |
| `f_get_line_style(string)` | Chuyển `"Solid"/"Dashed"/"Dotted"` → `line.style_*` |
| `f_get_dashboard_pos(string)` | Chuyển `"Top Right"` v.v. → `position.*` |
| `f_find_extreme(start_bar, end_bar, exclude_bar, find_high)` | Tìm bar có high/low cực trị trong range, loại trừ 1 bar — dùng để tìm New HL/LH khi xác nhận HH/LL mới |
| `f_seed_pivot(s, ph, pl, pivot_len)` | Seed cấu trúc ban đầu bằng `ta.pivothigh`/`ta.pivotlow` — so sánh bar pivot High/Low gần nhất để suy ra trend ban đầu |
| `f_seed_session(s)` | Seed bằng bar đầu phiên (dùng cho timeframe phút) — `trend=0`, chờ breakout xác nhận |
| `f_process_bar(s)` | **State machine chính** — chạy 1 bar, nhận state vào, trả state mới. Phát hiện BoS (giá phá cùng chiều trend), CHoCH (phá ngược chiều → đổi trend), cập nhật HH/HL hoặc LL/LH tương ứng. Ghi sự kiện vào `s.event`. |

## Logic Chính (`f_process_bar`)

Máy trạng thái 3 nhánh theo `trend`:

- **`trend == 0`** (chưa xác định): `close > hh_price` → BoS Bull, chuyển Uptrend. `close < ll_price` → BoS Bear, chuyển Downtrend.
- **`trend == 1`** (Uptrend): nếu `cand_type == 0`, theo dõi breakout HH (`close > hh_price`, BoS) hoặc breakout HL ngược (`close < hl_price`, CHoCH → chờ xác nhận Downtrend). Nếu đang săn candidate (`cand_type == 1`), mở rộng `cand_high` cho đến khi giá đóng cửa xuống dưới low của bar candidate → xác nhận New HH, quét range tìm New HL bằng `f_find_extreme`.
- **`trend == -1`** (Downtrend): đối xứng với nhánh Uptrend (LL/LH thay cho HH/HL).

## Dùng Trong

- `strategies/smc_strategy.pine` — dùng `SwingState` cho entry/exit signal (BoS/CHoCH) và tính Premium/Discount zone.
- `indicators/smc_market_structure.pine` — dùng trực tiếp trên timeframe của chart.
- `indicators/smc_market_structure_mtf.pine` — dùng qua wrapper `f_run_smc()` chạy bên trong `request.security()` cho từng khung thời gian phụ (xem [docs/smc-market-structure.md](smc-market-structure.md#cách-hoạt-động-v20--state-machine-thật-trên-từng-tf)).

## Giới Hạn & Lưu Ý

- `f_find_extreme` dùng vòng `for` tuyến tính theo khoảng `start_bar..end_bar` — range quá dài (seed bằng Pivot Seed trên timeframe lớn với lịch sử dài) có thể tốn tính toán hơn nếu gọi nhiều lần/bar.
- Mọi hàm pure nên được giữ nguyên tính pure khi mở rộng — không thêm `var`/vẽ trực tiếp vào library để các script dùng chung không bị ảnh hưởng tác dụng phụ ngoài ý muốn.

## Changelog

- **v1.0** (2026-07-10): Phát hành lần đầu, tách từ `smc_strategy.pine` v2.0.
