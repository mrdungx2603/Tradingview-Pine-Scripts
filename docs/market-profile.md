# Market Profile (Mind over Markets) — Tài Liệu

> **Script**: [indicators/market_profile.pine](../indicators/market_profile.pine) (v1.2)
> **Loại**: Indicator (overlay)
> **Pine Script**: v6
> **Ngày tạo**: 2026-11-14 / **Cập nhật**: 2026-11-14

## Tổng Quan

Indicator Market Profile / TPO (Time Price Opportunity) theo phương pháp kinh điển "Mind over Markets" (Dalton). Mỗi phiên (ngày) được chia thành lưới giá (`grid_rows` hàng) để đếm số TPO (số bar chạm vào mỗi mức giá), từ đó suy ra:

- **Initial Balance (IB)**: vùng giá hình thành trong `ib_bars_cnt` bar đầu phiên.
- **Value Area (VAH/VAL/POC)**: vùng giá chứa `va_pct`% tổng TPO quanh Point of Control.
- **Naked POC (nPOC)**: POC của phiên trước chưa bị giá quay lại lấp.
- **Tails / Single Prints / Ledge / Late Spike**: các mô hình cấu trúc đặc biệt trong profile.
- **Day Type & Open Type**: phân loại dạng ngày (Trend/Neutral/Nontrend/Normal...) và kiểu mở cửa (OD/OTD/ORR/OAOR/OAIR).
- **80% Value Area Rule**: phát hiện khi giá mở ngoài VA phiên trước rồi được chấp nhận trở lại.

## Tham Số Đầu Vào

### 1. Bảng Điều Khiển Hiển Thị (Feature Toggles)

| Tham Số | Loại | Mặc Định | Mô Tả |
|---|---|---|---|
| Hiển thị IB Lines & Extensions | `bool` | `true` | IB High/Low + mở rộng 1.5x, 2.0x |
| Hiển thị VAH/VAL/POC & Khung VA | `bool` | `true` | Box 2 vùng trên/dưới POC + 3 đường mốc |
| Hiển thị & kéo dài Naked POC | `bool` | `true` | Đường POC phiên trước chưa bị lấp |
| Hiển thị VAH/VAL/POC Phiên Trước | `bool` | `true` | Đường kẻ + label `(Open)`/`(Filled)` trên chart |
| Hiển thị nhãn pVAH/pVAL/pPOC bên Thanh Giá | `bool` | `true` | Nhãn trên price scale (`plot(display=display.price_scale)`), đổi màu xám khi đã lấp |
| Hiển thị Single Prints, Tails, Ledge & Spike | `bool` | `true` | Các mô hình cấu trúc đặc biệt |
| Hiển thị nhãn Poor High/Low | `bool` | `true` | Đỉnh/đáy không có tail từ chối rõ ràng |
| Hiển thị Bảng Thống Kê | `bool` | `true` | Dashboard 13 dòng, góc trên phải |
| Hiển thị Dải màu Day Type/Open Type | `bool` | `true` | Băng màu dưới đáy chart |

### 2. Thông Số Thuật Toán

| Tham Số | Loại | Mặc Định | Mô Tả |
|---|---|---|---|
| Tỷ lệ Value Area (%) | `float` | `70.0` | 50–90% |
| Độ phân giải lưới giá TPO | `int` | `60` | Số hàng chia phiên, 20–120 |
| Số nến tính Initial Balance | `int` | `2` | Chuẩn 30 phút = 2 nến (1–12) |
| Độ dài tối thiểu Tail/Single Print | `int` | `2` | Số ô giá liên tiếp (2–10) |
| Số Naked POC tối đa lưu trữ | `int` | `15` | FIFO khi vượt (1–50) |

### 3. Cài Đặt Cảnh Báo

5 toggle bật/tắt riêng cho: IB Breakout, Buying/Selling Tail, Double-Distribution Day, Naked POC & Prev VAH/VAL, 80% Value Area Rule.

## Logic Chính

1. **Reset phiên** (`timeframe.change("D")`): đóng phiên cũ (lưu VAH/VAL/POC cũ thành Naked POC + đường "Phiên Trước"), khởi tạo `SessionProfile` mới.
2. **Tích lũy IB**: `ib_bars_cnt` nến đầu phiên mở rộng `ib_high`/`ib_low`.
3. **Động cơ TPO** (mỗi bar, toàn bộ lịch sử phiên): dựng histogram `tpo_counts[grid_rows]` từ `arr_highs`/`arr_lows` → suy ra POC (hàng nhiều TPO nhất, ưu tiên gần giữa khi hoà), VAH/VAL (mở rộng 2 phía từ POC đến khi đạt `va_pct`% tổng TPO).
4. **Tails/Single Prints/Ledge/Spike**: quét từ POC ra 2 biên tìm dải TPO=1 liên tiếp (tail), dải TPO=1 ở giữa (single print), 2 hàng liền kề TPO≥3 kẹp giữa hàng TPO≤1 (ledge), 2 nến cuối vượt VAH/VAL ≥2 step (late spike).
5. **Day Type / Open Type**: phân loại dựa trên tỷ lệ `s_range/ib_rng`, vị trí mở cửa trong IB, hướng mở rộng đầu tiên, `rf_score` (Rotation Factor).
6. **80% VA Rule**: đếm số nến liên tiếp giá nằm trong VA phiên trước sau khi mở cửa ngoài VA đó.
7. **Vẽ đối tượng**: tạo 1 lần/phiên, các bar sau chỉ cập nhật tại chỗ (`set_xy`, `box.set_top/bottom/right`) — không xoá/tạo lại mỗi bar (tối ưu hiệu năng).

## Output / Tín Hiệu Trên Chart

- Box IB, box Value Area (2 vùng mờ trên/dưới POC, không border), đường POC (nét liền mờ) / VAH-VAL (nét đứt mờ hơn).
- Đường + label pVAH/pVAL/pPOC phiên trước (text `(Open)`/`(Filled)`), đường Naked POC.
- Nhãn `pVAH`/`pVAL`/`pPOC` bên price scale (đổi màu xám khi đã lấp).
- Box Buying/Selling Tail, Single Prints, đường Ledge, label Late Spike, label Poor High/Poor Low.
- Băng màu Day Type/Open Type dưới đáy chart.
- Dashboard 13 dòng (Day Type, Open Type, IB state, RF, TPO trên/dưới POC, VAH/POC/VAL, VA phiên trước, Naked POC, Poor High/Low, 80% Rule, Tails, Mô hình đặc biệt).
- 8 `alertcondition`: IB Breakout Up/Down, Buying/Selling Tail, Double-Distribution Day, Naked POC hit, Prev VAH/VAL hit, 80% Rule activated.

## Giới Hạn & Lưu Ý

- Động cơ TPO quét lại toàn bộ bar trong phiên mỗi bar mới (O(N²) theo số bar/phiên) — có thể nặng trên timeframe rất nhỏ (1m) với phiên dài; chưa tối ưu thành incremental.
- `grid_rows` cao hơn → chính xác hơn nhưng tốn tính toán hơn.
- Day Type/Open Type được đánh giá lại liên tục trong phiên (không "đóng băng" cho đến cuối phiên) — là hành vi mong muốn (profile sống theo thời gian thực), không phải repaint vì không dùng dữ liệu tương lai.
- Giới hạn vẽ: `max_lines_count=500`, `max_boxes_count=500`, `max_labels_count=500`.

## Changelog

- **v1.0** (2026-11-14): Phát hành lần đầu.
- **v1.1** (2026-11-14): Sửa lỗi array out-of-bounds (sell tail khi POC ở hàng trên cùng lưới) và sai logic buy tail khi POC ở hàng dưới cùng; bỏ matrix `tpo_mat` không dùng tới; chuyển vẽ đối tượng từ xoá+tạo lại mỗi bar sang cập nhật tại chỗ.
- **v1.2** (2026-11-14): Thêm nhãn pVAH/pVAL/pPOC bên price scale (toggle riêng `show_pva_scale`, đổi màu xám khi đã lấp); nhãn trên chart đổi text `(Open)`/`(Filled)`; khung Value Area tách 2 vùng trên/dưới POC, bỏ border, mờ hơn; đường POC/VAH/VAL giảm độ dày/đổi nét đứt + trong suốt để chart đỡ rối.
