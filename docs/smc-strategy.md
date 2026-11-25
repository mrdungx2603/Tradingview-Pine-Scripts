# SMC Strategy — Tài Liệu

> **Script**: [strategies/smc_strategy.pine](../strategies/smc_strategy.pine) (v2.2)
> **Loại**: Strategy (overlay, backtest)
> **Pine Script**: v6
> **Ngày tạo**: 2026-06-21 / **Cập nhật**: 2026-11-24
> **Library dùng**: [smc_core](smc-core.md) v1.3 (`import anthonydang/smc_core/3 as smc`)
> **Liên quan**: [docs/smc-market-structure.md](smc-market-structure.md) (khái niệm SMC, BoS/CHoCH/FVG/OG/VI/OB)

## Tổng Quan

Strategy backtest tín hiệu giao dịch dựa trên SMC Market Structure: vào lệnh theo Order Block (retest hoặc mới hình thành) hoặc theo BoS/CHoCH kết hợp OB gần đó, lọc theo vùng Premium/Discount, quản lý rủi ro theo % vốn và Risk:Reward ratio, có trailing stop theo Swing Point.

Cấu hình backtest: `initial_capital=100,000,000` VND, `commission_value=0.15%`, `slippage=2` tick, `pyramiding=1`.

## Tham Số Đầu Vào

| Nhóm | Tham Số | Loại | Mặc Định | Mô Tả |
|---|---|---|---|---|
| Backtest | Lọc Theo Ngày / Ngày Bắt Đầu / Kết Thúc | `bool`/`time` | tắt | Giới hạn khoảng thời gian backtest |
| Tham Số Chính | Seed Mode | `string` | `Pivot Seed` | `Pivot Seed` hoặc `Session Seed` — xem [smc-core](smc-core.md) |
| Tham Số Chính | Pivot Length | `int` | `5` | Cho Pivot Seed (2–50) |
| Tín Hiệu Vào Lệnh | OB Retest | `bool` | `true` | Entry khi giá retest OB active cùng hướng trend |
| Tín Hiệu Vào Lệnh | OB Mới Hình Thành | `bool` | `true` | Entry ngay khi OB mới tạo cùng hướng trend |
| Tín Hiệu Vào Lệnh | BoS/CHoCH + OB | `bool` | `false` | Entry khi có BoS/CHoCH và OB cùng hướng trong 20 bar gần nhất |
| Bộ Lọc | Lọc Premium/Discount Zone | `bool` | `true` | Bật lọc vùng giá |
| Bộ Lọc | Long Chỉ Ở Discount / Short Chỉ Ở Premium | `bool` | `true` | Chỉ Long khi giá <50% swing (Discount), chỉ Short khi >50% (Premium) |
| OB | Hiển Thị OB / Số OB Active Tối Đa / Màu / Độ Trong Suốt | — | `30` | Giống cơ chế FIFO trong indicator base |
| Imbalance | Phát Hiện FVG/OG/VI, Lọc Độ Rộng Tối Thiểu | — | `true`/tắt | Tạo OB từ 3 loại imbalance |
| Quản Lý Vốn | % Vốn Rủi Ro Mỗi Lệnh | `float` | `2.0` | Dùng tính khối lượng lệnh |
| Quản Lý Vốn | Risk:Reward Ratio | `float` | `2.0` | TP = Entry + Risk × RR |
| Quản Lý Vốn | Chế Độ SL | `string` | `Swing Point` | `Swing Point` (HL/LH gần nhất) hoặc `ATR` |
| Quản Lý Vốn | SL: ATR Multiplier / Length | `float`/`int` | `1.5`/`14` | Dùng khi Chế Độ SL = ATR, hoặc làm fallback khi Swing Point không hợp lệ |
| Trailing Stop | Dùng Trailing Stop / Trail Về HL/LL Mới | `bool` | `true` | Dời SL theo swing mới khi đã lời ≥30% khoảng risk ban đầu |
| Thoát Lệnh | Thoát Khi CHoCH Ngược / OB Bị Mitigation | `bool` | `true`/`false` | Exit sớm ngoài SL/TP |

## Logic Chính

### 1. Seeding & State Machine

Dùng chung engine với indicator base qua `smc_core` (`f_seed_pivot`/`f_seed_session`/`f_process_bar`) — xem [smc-core.md](smc-core.md). Sự kiện `st.event` (BoS Bull/Bear, CHoCH) được đọc mỗi bar để làm tín hiệu entry/exit.

### 2. Order Block (OB) — Tạo & Mitigation

Giống cơ chế trong indicator base: OB tạo từ nến origin của FVG/OG/VI (xem bảng "OB Creation" trong [smc-market-structure.md](smc-market-structure.md#order-blocks-ob)), FIFO khi vượt `max_ob_active`, mitigation khi giá quay lại chạm vùng OB. Từ v2.2, dùng UDT `smc.OrderBlock` export từ [smc_core](smc-core.md) thay cho `type OrderBlock` viết tay riêng.

### 3. Premium / Discount Zone

```
swing_high/low = (trend==1) ? hh_price/hl_price : lh_price/ll_price
pos_pct_raw    = (close - swing_low) / (swing_high - swing_low) * 100
pos_pct        = (trend==1) ? 100 - pos_pct_raw : pos_pct_raw
is_discount    = pos_pct > 50   // gần Swing Low
is_premium     = pos_pct < 50   // gần Swing High
```

### 4. Entry Logic (3 tín hiệu, ưu tiên theo thứ tự, chỉ khi `not in_trade` và `trend != 0`)

| Thứ tự | Tín Hiệu | Điều Kiện | Zone Filter |
|---|---|---|---|
| 1 | **OB Retest** | Giá chạm lại OB active cùng hướng trend (`detect_ob_retest`) | Long chỉ ở Discount, Short chỉ ở Premium |
| 2 | **OB Mới Hình Thành** | OB vừa được tạo trong bar này, cùng hướng trend | Như trên |
| 3 | **BoS/CHoCH + OB** | BoS/CHoCH vừa xảy ra + có OB cùng hướng chưa mitigated trong ≤20 bar | Không áp dụng zone filter |

SL = Swing Point (HL cho Long/LH cho Short) hoặc `close ∓ ATR(14)×1.5`; fallback `close ∓ ATR(14)×2` nếu SL không hợp lệ. TP = Entry ± Risk × RR. Khối lượng = `(equity × risk_percent / 100) / risk_per_unit`.

### 5. Exit Logic (ngoài SL/TP cố định)

- **CHoCH ngược hướng**: đóng lệnh ngay khi CHoCH hình thành ngược với hướng đang giữ.
- **OB Mitigated** (tuỳ chọn, mặc định tắt): đóng lệnh nếu chính OB dùng để vào lệnh bị mitigation.

### 6. Trailing Stop

Khi lợi nhuận hiện tại ≥ 30% khoảng risk ban đầu, dời SL theo HL mới (Long) hoặc LH mới (Short) — chỉ dời theo hướng có lợi (`new_trail` phải tốt hơn `sl_price_val` hiện tại).

## Output / Tín Hiệu Trên Chart

- Box Order Block (dashed khi active, solid khi mitigated) — giống indicator base.
- Label trạng thái lệnh đang mở (`LONG`/`SHORT` kèm SL/TP) ở bar cuối.
- Toàn bộ thống kê backtest xem qua tab **Strategy Tester** (Overview/Performance Summary/List of Trades) trên TradingView, không có dashboard riêng trong script.

## Giới Hạn & Lưu Ý

- `commission_value=0.15%` và `slippage=2` tick mô phỏng chi phí giao dịch chứng khoán Việt Nam — cần chỉnh lại nếu backtest trên thị trường/tài sản khác.
- Zone filter (Premium/Discount) chỉ áp dụng cho tín hiệu OB Retest/OB Mới, không áp dụng cho tín hiệu BoS/CHoCH + OB.
- SL theo `Swing Point` có thể rất xa entry nếu swing point cũ — luôn có fallback ATR×2 nhưng nên kiểm tra khối lượng lệnh (`qty`) hợp lý trước khi dùng vốn thật.
- Dùng chung state machine với [smc_market_structure.pine](smc-market-structure.md) qua [smc_core](smc-core.md) — mọi thay đổi logic BoS/CHoCH trong library sẽ ảnh hưởng đồng thời cả 3 script.

## Changelog

- **v2.2** (2026-11-24): Đổi `import anthonydang/smc_core/2` → `anthonydang/smc_core/3`. Thay `type OrderBlock` và hàm `imbalance_detection` viết tay riêng (lặp code y hệt với `indicators/smc_market_structure.pine` trước khi file đó migrate sang `smc_core`) bằng `smc.OrderBlock` và `smc.f_imbalance_detection` export từ `smc_core` v1.3 — không đổi hành vi entry/exit. Bỏ biến `old_st` không dùng tới (dead code từ v2.0). Backup v2.1 tại `strategies/hist/smc_strategy_v2.1.pine`.
- **v1.0** (2026-06-21): Phát hành lần đầu, state machine viết trực tiếp trong strategy.
- **v2.0** (2026-07-10): Import library `smc_core`, thay state machine nội bộ bằng UDT `SwingState` dùng chung — giảm ~198 dòng (897→699), không đổi hành vi entry/exit.
- **v2.1** (2026-11-22): Đổi `import mrdungx2603/smc_core/1` → `anthonydang/smc_core/2` — gộp về 1 account TradingView duy nhất (theo yêu cầu người dùng, xem `.claude/CLAUDE.md` mục "Tài Khoản TradingView"). Đồng thời nhận fix bug `trigger_bar` ở `smc_core` v1.1 (xem [docs/smc-core.md](smc-core.md#changelog)) — kết quả HH/HL/LL/LH tính chính xác hơn, không phải regression. Backup v2.0 tại `strategies/hist/smc_strategy_v2.0.pine`.
