# Order Flow Core Library — Tài Liệu

> **Script**: [libraries/order_flow_core.pine](../libraries/order_flow_core.pine) (v1.0)
> **Loại**: Library (`library(overlay=false)`)
> **Pine Script**: v6
> **Ngày tạo**: 2026-11-24
> **Publish trên TradingView**: account `anthonydang`, title `order_flow_core`, version hiện tại **1** (`anthonydang/order_flow_core/1 as ofcore`).
> **Dùng trong**: [indicators/order_flow_bar.pine](../indicators/order_flow_bar.pine) (từ v1.18), [indicators/volume_profile_delta.pine](../indicators/volume_profile_delta.pine) (từ v1.5).

## Tổng Quan

Library tách phần **dựng "row profile"** (buy/sell volume theo hàng giá `price_step`, bucket từ `request.footprint()` Tầng 1) ra khỏi `order_flow_bar.pine` và `volume_profile_delta.pine` — 2 indicator này trước đó có 4 hàm + 2 UDT lặp code gần như y hệt (chỉ khác vài dòng comment). Toàn bộ hàm đều **pure** — không dùng `var` cấp top-level, không `request.*`, không vẽ.

## UDT Xuất (`export type`)

### `RowProfile`

| Field | Kiểu | Ý Nghĩa |
|---|---|---|
| `row_ids` | `array<int>` | Danh sách row_id tuyệt đối (`floor(giá / price_step)`) đã xuất hiện trong profile |
| `buys` | `array<float>` | Tổng buy volume tương ứng từng `row_ids[i]` |
| `sells` | `array<float>` | Tổng sell volume tương ứng từng `row_ids[i]` |

Dùng cho cả 2 phạm vi tính: "Session" (cộng dồn trong ngày) và "Last HL" (dựng lại từ `BarRowVol` buffer cho 1 khoảng bar).

### `BarRowVol`

| Field | Kiểu | Ý Nghĩa |
|---|---|---|
| `bar_idx` | `int` | Bar index của bucket này |
| `row_ids`/`buys`/`sells` | — | Bucket volume của riêng bar này (chưa cộng dồn) |

1 phần tử của circular buffer — lưu bucket theo từng bar đã đóng, dùng để dựng lại `RowProfile` cho bất kỳ khoảng `[left_bar, right_bar]` (phục vụ mode "Last HL", vì khoảng này thay đổi theo swing SMC, không cố định như "Session").

## Hàm Xuất (`export`)

| Hàm | Mô Tả |
|---|---|
| `f_bucket_bar_rows(footprint fp_, float step)` | Bucket toàn bộ `volume_row` của `fp_` (kết quả `request.footprint()`) theo `price_step` → trả `[row_ids, buys, sells]` của riêng bar hiện tại. `fp_` có thể `na` (sàn/tài khoản không hỗ trợ tick data) — trả về 3 array rỗng, không lỗi. |
| `f_push_bar_buffer(buf, bar_idx, row_ids, buys, sells, cap)` | Đẩy 1 bucket vào circular buffer `array<BarRowVol>`, giữ tối đa `cap` phần tử gần nhất (FIFO). Caller tự đảm bảo chỉ gọi khi nến đã đóng (`barstate.isconfirmed`) — gọi khi nến chưa đóng sẽ lặp dữ liệu. |
| `f_merge_into_profile(profile, row_ids, buys, sells)` | Gộp 1 bucket vào `RowProfile` — **mutate trực tiếp** `profile` (UDT truyền theo tham chiếu trong Pine), không cần gán lại kết quả ở caller. |
| `f_build_profile_from_buffer(buf, left_bar, right_bar)` | Dựng lại `RowProfile` mới bằng cách gộp mọi phần tử `buf` có `bar_idx` nằm trong `[left_bar, right_bar]`. Biên `na` → trả profile rỗng ngay. Biên nằm ngoài phần `buf` còn lưu (đã bị `f_push_bar_buffer` shift do vượt `cap`) tự "clip" — không cần xử lý riêng. |

## Cách Dùng Điển Hình (theo pattern ở `order_flow_bar.pine`/`volume_profile_delta.pine`)

```pinescript
import anthonydang/order_flow_core/1 as ofcore

footprint fp = request.footprint(ticks_per_row=1, va_percent=70, imbalance_percent=300)

var array<ofcore.BarRowVol> of_buffer    = array.new<ofcore.BarRowVol>()
var ofcore.RowProfile       sess_profile = ofcore.RowProfile.new(array.new<int>(), array.new<float>(), array.new<float>())

[bar_row_ids, bar_buys, bar_sells] = ofcore.f_bucket_bar_rows(fp, price_step)

if barstate.isconfirmed
    ofcore.f_push_bar_buffer(of_buffer, bar_index, bar_row_ids, bar_buys, bar_sells, max_lookback_bars)
    if is_new_session
        array.clear(sess_profile.row_ids)
        array.clear(sess_profile.buys)
        array.clear(sess_profile.sells)
    ofcore.f_merge_into_profile(sess_profile, bar_row_ids, bar_buys, bar_sells)

// Mode "Last HL": dựng lại profile riêng cho 1 khoảng bar theo swing SMC (xem smc_core)
ofcore.RowProfile last_hl_profile = ofcore.f_build_profile_from_buffer(of_buffer, lasthl_left_bar, lasthl_right_bar)
```

## Giới Hạn & Lưu Ý

- `f_bucket_bar_rows` nhận trực tiếp built-in type `footprint`/`volume_row` làm tham số/kiểu nội bộ — đã xác nhận Pine Script v6 cho phép dùng các type này trong hàm `export` của library (validate qua TradingView API thành công).
- `f_build_profile_from_buffer` duyệt tuyến tính toàn bộ `buf` mỗi lần gọi — chỉ nên gọi ở `barstate.islast` (như cả 2 indicator đang dùng), không gọi mỗi bar.
- Mọi hàm pure nên được giữ nguyên tính pure khi mở rộng — không thêm `var` top-level/vẽ trực tiếp vào library.

## Changelog

- **v1.0** (2026-11-24): Phát hành lần đầu — tách từ `indicators/order_flow_bar.pine` v1.17 và `indicators/volume_profile_delta.pine` v1.4 (2 file có 4 hàm + 2 UDT lặp code gần như y hệt). Theo yêu cầu người dùng rà soát core/library và tách hàm tái sử dụng cao từ indicator vào thư viện.
