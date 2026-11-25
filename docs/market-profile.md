# Market Profile (Mind over Markets) — Tài Liệu

> **Script**: [indicators/market_profile.pine](../indicators/market_profile.pine) (v3.5)
> **Loại**: Indicator (overlay)
> **Pine Script**: v6 — import [libraries/market_profile_core.pine](../libraries/market_profile_core.pine) (`anthonydang/market_profile_core/3`)
> **Ngày tạo**: 2026-11-14 / **Cập nhật**: 2026-11-25

## Tổng Quan

Indicator Market Profile / TPO (Time Price Opportunity) theo phương pháp kinh điển "Mind over Markets" (Dalton). Mỗi phiên (ngày) được chia thành lưới giá (bước `price_step` cố định) để đếm số **TPO Period** (khung giờ cố định, mặc định 30 phút — xem mục "Thiết Kế: TPO Period Thực" bên dưới) chạm vào mỗi mức giá, từ đó suy ra:

- **Initial Balance (IB)**: vùng giá hình thành trong `ib_periods_cnt` khung TPO Period đầu phiên.
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
| Hiển thị Developing VAH/POC/VAL & Khung VA | `bool` | `true` | Đường bậc thang (stepline) + 2 vùng tô màu trên/dưới POC theo đúng hình bậc thang — xem mục "Thiết Kế: Developing VA" bên dưới |
| Hiển thị & kéo dài Naked POC | `bool` | `true` | Đường POC phiên trước chưa bị lấp |
| Hiển thị VAH/VAL/POC Phiên Trước | `bool` | `true` | Đường kẻ + label `(Open)`/`(Filled)` trên chart |
| Hiển thị nhãn pVAH/pVAL/pPOC bên Thanh Giá | `bool` | `true` | Nhãn trên price scale (`plot(display=display.price_scale)`), đổi màu xám khi đã lấp |
| Vẽ đường nối nhãn pVAH/pVAL/pPOC tới nến cuối | `bool` | `true` | Đoạn ngắn neo đúng tại nến cuối cùng (cập nhật mỗi bar), `extend=extend.right` vươn tới nhãn price scale; đổi màu xám khi mức giá đã bị lấp |
| Kiểu đường nối pVAH/pVAL/pPOC | `string` | `Đứt nét` | Đứt nét / Liền nét / Chấm chấm |
| Hiển thị Single Prints, Tails, Ledge & Spike | `bool` | `true` | Các mô hình cấu trúc đặc biệt |
| Hiển thị nhãn Poor High/Low | `bool` | `true` | Đỉnh/đáy không có tail từ chối rõ ràng |
| Hiển thị Bảng Thống Kê | `bool` | `true` | Dashboard 13 dòng (gọn, label viết tắt) |
| Vị trí Dashboard | `string` | `Trên Phải` | 4 góc: Trên Trái / Trên Phải / Dưới Trái / Dưới Phải |
| Hiện Chẩn Đoán Dedup trên Dashboard | `bool` | `false` | Nâng cao — hiện số Period/hàng lưới thô ở dòng RF & TPO Count để tự kiểm tra dedup (xem "Thiết Kế: Lưới Kép") |
| Hiển thị Dải màu Day Type/Open Type | `bool` | `true` | Băng màu dưới đáy chart |

### 2. Thông Số Thuật Toán

| Tham Số | Loại | Mặc Định | Mô Tả |
|---|---|---|---|
| Tỷ lệ Value Area (%) | `float` | `70.0` | 50–90% |
| Bước giá lưới POC/VAH/VAL (Price Step) | `float` | `0.1` | Lưới MỊN, chỉ dùng tính đường giá POC/VAH/VAL; lấy `max(mintick, price_step)` |
| Bước giá lưới Hình Dạng Profile (Shape Step) | `float` | `1.0` | Lưới THÔ riêng, dùng tính TPO Count/Tail/Poor High-Low/Single Prints/Ledge — xem mục "Thiết Kế: Lưới Kép" bên dưới |
| Độ dài 1 TPO Period (phút) | `int` | `30` | Chuẩn CBOT = 30 phút. **Đơn vị 1 TPO thực sự** — không phải 1 nến chart (xem mục thiết kế bên dưới) |
| Số khung TPO Period tính Initial Balance | `int` | `2` | Chuẩn 2×30p = 60 phút (1–12 khung) |
| Độ dài tối thiểu Tail/Single Print | `int` | `2` | Số ô lưới Hình Dạng (`shape_step`) liên tiếp (2–10) |
| Số Naked POC tối đa lưu trữ | `int` | `15` | FIFO khi vượt (1–50) |

### 3. Cài Đặt Cảnh Báo

5 toggle bật/tắt riêng cho: IB Breakout, Buying/Selling Tail, Double-Distribution Day, Naked POC & Prev VAH/VAL, 80% Value Area Rule.

## Logic Chính

1. **Reset phiên** (`timeframe.change("D")`): đóng phiên cũ (lưu VAH/VAL/POC cũ thành Naked POC + đường "Phiên Trước"), khởi tạo `SessionProfile` mới (gồm `start_time = time`), xoá mảng `tpo_counts`/`tpo_last_period`.
2. **Xác định TPO Period của nến hiện tại**: `period_id = floor((time - start_time) / period_ms)` — dựa trên giờ thực, không dựa trên số nến chart (xem mục "Thiết Kế: TPO Period Thực" bên dưới).
3. **Tích lũy IB**: mở rộng `ib_high`/`ib_low` theo từng nến trong khi `periods_in_sess <= ib_periods_cnt` (còn trong `ib_periods_cnt` khung TPO Period đầu phiên).
4. **Động cơ TPO kép (incremental, period-dedup, từ v2.0)** — hàm `f_add_bar_tpo(..., row_step, track_total)` dùng chung cho 2 lưới độc lập, mỗi bar gọi 2 lần:
   - **Lưới mịn** (`tpo_counts`/`tpo_last_period`, bước `step = max(mintick, price_step)`) → chỉ dùng tính **POC/VAH/VAL** (mục 6.1/6.2 trong code).
   - **Lưới thô** (`tpo_counts_c`/`tpo_last_period_c`, bước `step_c = max(mintick, shape_step)`) → dùng tính **TPO Count/Tail/Poor High-Low/Single Prints/Ledge** (xem "Thiết Kế: Lưới Kép" bên dưới).
   
   Cả 2 lưới đều **chỉ cộng 1 lần cho mỗi `period_id`** (dò qua mảng `last_period` song song, tránh 1 khung 30 phút bị đếm nhiều lần nếu có nhiều nến chart rơi vào cùng khung đó) và mở rộng động (`array.unshift`/`array.push`) khi giá vượt biên hiện tại — không quét lại lịch sử phiên như bản v1.2 (O(N²), gây chậm nặng trên 1m/3m/5m). `prof.total_tpo` (dùng tính VA%) chỉ cộng từ lưới mịn (cờ `track_total`), tránh đếm trùng.
5. **Rotation Factor**: chỉ cộng dồn 1 lần khi 1 TPO Period ĐÃ ĐÓNG (so sánh high/low gộp của Period vừa đóng với Period trước đó), không cộng mỗi nến chart (hàm `f_process_bar_period`).
6. **Tails/Single Prints/Ledge/Spike**: trên **lưới thô** (`tpo_counts_c`), tìm `poc_row_c` nội bộ (cùng công thức tie-break, chỉ dùng làm điểm neo quét — không phải đường POC hiển thị) rồi quét từ đó ra 2 biên tìm dải TPO=1 liên tiếp (tail), dải TPO=1 ở giữa (single print), 2 hàng liền kề TPO≥3 kẹp giữa hàng TPO≤1 (ledge). Riêng Tail/Single Print/Poor High-Low/Ledge chạy trên **lưới đã xác nhận** (`confirmed_counts_c`, từ v3.3) — xem mục "Thiết Kế: Lưới Xác Nhận" bên dưới — không phải `tpo_counts_c` trực tiếp. Late Spike vẫn dùng lưới mịn (high/low gộp của 2 TPO Period cuối vượt VAH/VAL ≥2 `step`).
7. **Day Type / Open Type**: phân loại dựa trên tỷ lệ `s_range/ib_rng`, vị trí mở cửa trong IB, hướng mở rộng đầu tiên, `rf_score` (Rotation Factor).
8. **80% VA Rule**: đếm số **nến chart** liên tiếp giá nằm trong VA phiên trước sau khi mở cửa ngoài VA đó — ⚠️ đây là phần DUY NHẤT còn đếm theo nến chart, chưa chuyển sang TPO Period (xem "Giới Hạn & Lưu Ý").
9. **Developing VAH/POC/VAL** (từ v2.2): `plot(style=plot.style_stepline)` cho VAH/POC/VAL + `fill()` giữa 2 đường để tô 2 vùng — xem mục "Thiết Kế: Developing VA" bên dưới.
10. **Vẽ đối tượng còn lại** (IB, Tails, SP, Ledge, band...): tạo 1 lần/phiên, các bar sau chỉ cập nhật tại chỗ (`set_xy`, `box.set_top/bottom/right`) — không xoá/tạo lại mỗi bar (tối ưu hiệu năng).

## Thiết Kế: TPO Period Thực (Không Phải Nến Chart)

**Vấn đề gặp phải (trước khi sửa, v2.0 giai đoạn đầu)**: POC/pPOC hiển thị khác nhau giữa các timeframe (ví dụ 1m ra 1835, 3m ra 1846.9, trong khi giá trị đúng là 1843.9). Nguyên nhân gốc: theo lý thuyết Market Profile kinh điển (Steidlmayer/CBOT), **1 TPO = 1 khung giờ cố định** (mặc định 30 phút — ví dụ 9:00–9:30, 9:30–10:00...), bất kể đang xem chart ở timeframe nào. Bản đầu của v2.0 (và cả bản v1.0–v1.2) lại coi **1 nến chart = 1 TPO**, nên:

- Trên chart 1m, một khung 30 phút gồm 30 nến → mỗi mức giá trong khung đó có thể được cộng TPO tới 30 lần (nếu giá quay lại).
- Trên chart 3m, cùng khung đó chỉ gồm 10 nến → cộng tối đa 10 lần.
- Tỉ trọng TPO giữa các mức giá bị méo khác nhau theo từng timeframe → POC (mức giá có TPO nhiều nhất) bị chọn sai, khác nhau giữa 1m/3m/5m.

**Cách sửa**: tách hẳn khái niệm "TPO Period" (khung giờ cố định, input `tpo_period_min`) ra khỏi "nến chart":

- `period_id = floor((time - start_time) / period_ms)` — tính theo **giờ thực** (mili-giây), không theo số nến. Nhờ vậy, dù xem ở 1m/3m/5m/15m/30m (mọi timeframe chia hết 30 phút), nến nào cũng được gán đúng vào 1 khung 30 phút duy nhất, và khung đó luôn trùng giờ thực giữa các timeframe — kể cả qua giờ nghỉ trưa HOSE (11:30–13:00), vì `period_id` nhảy đúng theo khoảng cách giờ thực, không bị ảnh hưởng bởi việc không có nến nào trong giờ nghỉ.
- Mảng `tpo_last_period` (song song với `tpo_counts`) lưu `period_id` cuối cùng đã cộng TPO cho từng hàng giá. Khi 1 nến mới chạm vào 1 hàng, chỉ cộng +1 nếu hàng đó **chưa được cộng cho `period_id` hiện tại** — tức 1 khung 30 phút dù có bao nhiêu nến chart đi qua cũng chỉ góp tối đa 1 TPO cho mỗi mức giá nó chạm tới (đúng định nghĩa TPO letter).
- IB (`periods_in_sess <= ib_periods_cnt`), Rotation Factor (so sánh high/low gộp của Period vừa đóng so với Period trước), và Late Spike (high/low gộp của 2 Period cuối) đều chuyển từ đếm theo "số nến chart" sang đếm theo "số TPO Period" — nhờ vậy Day Type/Open Type (phụ thuộc IB & RF) cũng nhất quán theo timeframe.
- **TPO Count (trên/dưới POC), Tail (Buying/Selling), Poor High/Low, Single Prints, Ledge**: vì đọc trực tiếp từ mảng TPO (đã dedup theo `period_id` ngay từ lúc nạp), các mục này tự động nhất quán theo TPO Period 30 phút, độc lập hoàn toàn với timeframe đang xem. Nhưng chúng dùng **lưới riêng** (xem mục "Thiết Kế: Lưới Kép" ngay dưới đây) vì lý do khác — độ phân giải giá, không phải timeframe.

**Vẫn còn hạn chế đã biết** (xem thêm "Giới Hạn & Lưu Ý"): quy tắc 80% Value Area Rule (`bars_inside_prev_va`) vẫn đếm theo số nến chart liên tiếp, chưa chuyển sang TPO Period — nếu cần nhất quán tuyệt đối cho phần này, nên áp dụng lại đúng kỹ thuật `f_process_bar_period` (phát hiện Period đóng) cho biến đếm này khi có nhu cầu.

## Thiết Kế: Lưới Kép (POC/VAH/VAL vs Hình Dạng Profile)

**Vấn đề gặp phải**: sau khi sửa TPO Period (trên), test trên **VN30F1M (VN301!)** ở 3m cho thấy dashboard hiện TPO Count = 294/376 — nhìn có vẻ vô lý nếu nghĩ "1 TPO = 1 khung 30 phút" (phiên chỉ có ~9 Period). Thêm chẩn đoán vào dashboard (`POC:X/YP, Z hàng`) để kiểm tra thì xác nhận: `X` (số TPO tại đúng hàng POC) luôn `<= Y` (số Period đã trôi qua) — **cơ chế dedup theo Period hoàn toàn đúng, không có bug**. Nguyên nhân thật: VN30F1M có `mintick = 0.1` nhưng biên độ dao động trong phiên thường 15–25 điểm → với `price_step = 0.1`, lưới có tới `Z ≈ 200` hàng. TPO Count cộng dồn qua *nhiều hàng* (không phải qua *nhiều Period*) nên hoàn toàn có thể ra số lớn một cách hợp lệ — nhưng khiến Tail/Single Prints/Poor High-Low bị "vỡ vụn" (quá nhạy, dài bất thường) vì mỗi hàng quá hẹp so với biên độ thực của mã.

**Cách sửa**: tách thành 2 lưới độc lập, mỗi lưới có mảng `tpo_counts`/`tpo_last_period`/`base_row` riêng:

| Lưới | Input | Mặc định | Dùng cho |
|---|---|---|---|
| Mịn | `price_step` | `0.1` | POC, VAH, VAL (đường giá hiển thị — cần chính xác) |
| Thô | `shape_step` | `1.0` | TPO Count, Tail, Poor High/Low, Single Prints, Ledge (các mẫu hình "hình dạng" — cần đủ thô để không vỡ vụn) |

Vì Tail/Poor High-Low/Single Prints đều phụ thuộc chặt vào CÙNG `poc_row`/`buy_tail_rows`/`sell_tail_rows` (Poor Low kiểm tra trực tiếp "không có Tail", Single Prints dùng biên quét tính từ `buy_tail_rows`/`sell_tail_rows`), **cả nhóm phải dùng chung 1 lưới** — nếu chỉ đổi lưới cho Tail mà để Poor/SP ở lưới khác, 2 bên sẽ lệch pha (ví dụ chart hiện cả "Buying Tail" từ lưới thô và "Poor Low" từ lưới mịn tự kiểm tra riêng — mâu thuẫn logic ngay trên chart). Vì vậy lưới thô tính luôn 1 **POC nội bộ riêng** (`poc_row_c`) chỉ để làm điểm neo quét Tail/SP/Ledge — khác với `prof.poc` (đường POC hiển thị, vẫn ở lưới mịn).

`prof.total_tpo` (dùng tính Value Area %) chỉ cộng từ lưới mịn — hàm `f_add_bar_tpo` có tham số `track_total` để tránh bị cộng trùng khi gọi 2 lần/bar (1 lần/lưới).

**Cách tinh chỉnh `shape_step`**: nên đặt xấp xỉ 1/15 đến 1/30 biên độ dao động trung bình trong phiên của mã (để ra khoảng 15–30 hàng/phiên, giống mật độ TPO chart cổ điển). Bật toggle **"Hiện Chẩn Đoán Dedup trên Dashboard"** (`show_diag`, mặc định tắt để dashboard gọn) để dòng RF hiện thêm `(YP)` và dòng TPO Count hiện thêm `(POC:X/YP, Zh)`: `X` (TPO tại hàng POC-thô) phải luôn `<= Y` (số Period đã trôi qua) — nếu không, báo lại ngay vì đó là bug dedup thật. `Z` (số hàng lưới thô) nên nằm trong khoảng vài chục; quá lớn (hàng trăm) → tăng `shape_step`; quá nhỏ (dưới ~10) → giảm `shape_step`.

## Thiết Kế: Lưới Xác Nhận (Confirmed Grid) Cho Tail/Single Print/Poor High-Low/Ledge

**Vấn đề gặp phải**: lưới thô `tpo_counts_c` cộng dồn TPO ngay khi nến chạm tới, kể cả TPO Period **hiện tại còn đang mở** (chưa đủ `tpo_period_min` phút). Vì vậy 1 hàng giá ở biên có thể "vừa mới" được tính là TPO=1 (tail/single print) chỉ vì Period hiện tại chưa đóng — Tail/Single Print/Poor High-Low/Ledge hiện ra rồi có thể đổi ngay (mở rộng thêm, hoặc biến mất) khi Period đó còn tiếp diễn, gây cảm giác "giật hình"/không chính thức trên chart.

**Cách sửa (v3.3)**: thêm hàm cục bộ `f_build_confirmed_grid(counts_c, last_period_c, cur_period_id)` trong `market_profile.pine` (không sửa library — các file khác dùng chung `mpcore` không bị ảnh hưởng): nhân bản `tpo_counts_c`, sau đó với MỌI hàng mà lần chạm gần nhất (`tpo_last_period_c[hàng]`) chính là `prof.last_period_id` (Period hiện tại, còn đang mở) thì trừ đi 1 lượt chạm đó trước khi đưa vào các hàm phát hiện mẫu hình:

```pinescript
array<int> confirmed_counts_c = f_build_confirmed_grid(tpo_counts_c, tpo_last_period_c, prof.last_period_id)
mpcore.f_detect_buying_tail(confirmed_counts_c, ...)   // thay cho tpo_counts_c
mpcore.f_detect_selling_tail(confirmed_counts_c, ...)
mpcore.f_detect_poor_hl(confirmed_counts_c, ...)
mpcore.f_detect_single_prints(confirmed_counts_c, ...)
mpcore.f_detect_ledge(confirmed_counts_c, ...)
```

**Lỗi phát hiện sau đó (sửa ở v3.4)**: cách trừ 1 "vô điều kiện" ở trên (trừ cho MỌI hàng mà Period hiện tại chạm tới, bất kể count thực là bao nhiêu) có 1 lỗi — nếu 1 hàng ĐÃ được Period trước (đã đóng) xác nhận là single print (count=1), rồi Period kế tiếp (đang mở) "fill" vào đúng hàng đó (count thực tăng lên 2), lưới xác nhận vẫn trừ 1 ra còn 1 → vẫn đọc là single print, khiến Tail/SP của Period trước hiển thị SAI là còn nguyên dù thực tế đã bị fill (phá vỡ).

**Fix v3.4**: `f_build_confirmed_grid` CHỈ ẩn (set về 0) hàng có **count thực = 1 VÀ** lần chạm duy nhất là Period hiện tại — tức hàng hoàn toàn MỚI, chưa Period nào khác từng chạm tới (đúng ý "chờ xác nhận hình thành" của yêu cầu gốc). Mọi hàng có count thực `>= 2` (dù Period hiện tại vừa chạm tới) đều giữ ĐÚNG số thực, hiện ngay lập tức — vì đó là 1 lượt "fill" đã xảy ra (sự kiện không thể đảo ngược), không có gì để chờ xác nhận thêm, và phải phá Tail/SP ngay khi phát hiện fill. Nói cách khác: *hình thành mới* (count=1, toàn bộ do Period đang mở) thì chờ; *fill/phá vỡ* (count≥2) thì hiện ngay, không chờ.

Nhờ vậy: phần Tail/SP/Poor/Ledge đã được các Period **ĐÃ ĐÓNG** xác nhận hiển thị ngay (không trễ, không giật hình vì các hàng đó không bị trừ); phần **mới hình thành/mở rộng thêm** bởi Period đang chạy bị ẩn tới khi Period đó đóng; còn khi Period đang chạy **fill vào** 1 hàng đã từng là single print của Period trước, Tail/SP bị phá vỡ **ngay lập tức**, không chờ Period đóng.

`poc_row_c` (điểm neo quét nội bộ), TPO Count above/below POC (dòng dashboard), và Late Spike **vẫn dùng lưới live** (`tpo_counts_c`) — không thuộc phạm vi trì hoãn này.

**Đính chính (v3.5)**: `f_build_confirmed_grid` đã được **chuyển sang `market_profile_core.pine` v1.2** (`mpcore.f_build_confirmed_grid`) — khác với mô tả "không sửa library" ở mục "Cách sửa (v3.3)" phía trên, vốn đúng tại thời điểm v3.3/v3.4. Lý do chuyển: theo yêu cầu người dùng rà soát lại core/library toàn dự án, tránh lặp logic xử lý lưới TPO rải rác ngoài indicator — hàm này là pure, chỉ phụ thuộc dữ liệu do `mpcore.f_add_bar_tpo`/`SessionProfile` quản lý, không có lý do kỹ thuật để giữ cục bộ. Logic/công thức bên trong hàm **không đổi** so với bản fix v3.4 — xem [docs/market-profile-core.md](market-profile-core.md#changelog).

## Thiết Kế: Developing VA (thay cho Box Tĩnh)

**Vấn đề gặp phải (trước v2.2)**: VAH/POC/VAL được vẽ bằng `box.new`/`line.new`, cập nhật mỗi bar qua `box.set_top/bottom`/`line.set_xy2` — nghĩa là khi giá trị mới nhất đổi, TOÀN BỘ đường/khung (từ đầu phiên tới bar hiện tại) bị "viết lại" theo giá trị mới. Với phiên ĐÃ ĐÓNG thì không sao (kết quả cuối = chính xác), nhưng với phiên ĐANG CHẠY, nhìn vào chart sẽ tưởng VAH/POC/VAL đã như vậy từ đầu phiên — mất hoàn toàn thông tin về việc Value Area đã **phát triển/dịch chuyển** ra sao theo thời gian. Đây không phải "Developing Value Area" đúng nghĩa.

**Cách sửa**: chuyển sang `plot(style=plot.style_stepline)` cho 3 đường VAH/POC/VAL + `fill()` giữa 2 cặp đường để tô 2 vùng:

```pinescript
float dev_vah = is_new_session or not show_va ? na : prof.vah
float dev_poc = is_new_session or not show_va ? na : prof.poc
float dev_val = is_new_session or not show_va ? na : prof.val
p_dev_vah = plot(dev_vah, style=plot.style_stepline, ...)
p_dev_poc = plot(dev_poc, style=plot.style_stepline, ...)
p_dev_val = plot(dev_val, style=plot.style_stepline, ...)
fill(p_dev_vah, p_dev_poc, color=c_va_above)
fill(p_dev_poc, p_dev_val, color=c_va_below)
```

`plot()` không bao giờ "viết lại" giá trị của các bar đã qua — mỗi bar giữ đúng giá trị VAH/POC/VAL tại THỜI ĐIỂM đó, nên đường vẽ ra là đường bậc thang thể hiện đúng quá trình phát triển. Áp dụng cho **mọi phiên, kể cả đã đóng** — nhờ vậy nhìn lịch sử cũng thấy được: ngày Trend Day sẽ có POC trôi dần theo 1 hướng suốt phiên, ngày Nontrend Day sẽ có POC ổn định rất sớm và đi ngang. `is_new_session` ép giá trị về `na` để ngắt đường nối giữa 2 phiên (tránh vẽ xuyên qua giờ nghỉ trưa/qua đêm).

Box/line tĩnh cũ (`draw.b_va_up/dn`, `draw.l_poc/vah/val`) đã bị xoá hoàn toàn — toggle "Hiển thị Developing VAH/POC/VAL & Khung VA" (`show_va`) giờ điều khiển đường bậc thang + vùng tô màu mới này.

**Từ v2.3**: 3 `plot()` này dùng `display = display.pane + display.status_line + display.data_window` (bỏ `display.price_scale`) — vẫn vẽ trên pane như cũ nhưng **không hiện nhãn giá trị bên phải** (price scale) cho "VAH/POC/VAL (Developing)", tránh rối với các nhãn pVAH/pVAL/pPOC phiên trước đã có sẵn ở đó.

## Thiết Kế: Market Profile Core Library (dùng chung với Order Flow Panel)

**Vấn đề gặp phải**: `order_flow_profile_panel.pine` dùng lại gần như nguyên khối động cơ TPO/POC/Value Area/Day Type của `market_profile.pine` nhưng tự viết lại độc lập — và bản sao đó vẫn ở dạng **O(số nến trong phiên × grid_rows) mỗi bar** (thuật toán cũ mà chính `market_profile.pine` đã bỏ từ v2.0 vì quá chậm trên timeframe nhỏ). Hai file ngày càng lệch nhau, sửa bug ở 1 file không tự động áp dụng cho file kia.

**Cách sửa (v3.0)**: tách toàn bộ phần tính toán THUẦN (không đụng tới `line`/`box`/`label`/`table`) ra `libraries/market_profile_core.pine`, publish lên TradingView (`import anthonydang/market_profile_core/1 as mpcore`) để cả 2 indicator cùng dùng:

- **UDT `mpcore.SessionProfile`**: toàn bộ field số/bool/string của "động cơ" (IB, POC/VAH/VAL, RF, TPO Count, Day Type/Open Type, Tails/Poor/SP/Ledge/Spike, 80% VA Rule...). **Không chứa** object vẽ (`line`/`box`/`label`) — mỗi indicator tự giữ UDT vẽ riêng (`SessionDrawings` ở `market_profile.pine`). Cũng **không chứa** 6 cờ chống lặp cảnh báo (`alerted_*`) — đó là state riêng của từng indicator (chỉ `market_profile.pine` cần, panel kia không có cảnh báo), nay là `var bool` riêng ngoài UDT.
- **Hàm pure** export từ library: `f_add_bar_tpo` (động cơ TPO incremental), `f_process_bar_period` (RF theo TPO Period), `f_calc_poc`/`f_calc_value_area`/`f_calc_tpo_above_below` (POC/VA/TPO Count), `f_detect_buying_tail`/`f_detect_selling_tail`/`f_count_tail_rows`/`f_detect_poor_hl`/`f_detect_single_prints`/`f_detect_ledge`/`f_detect_late_spike` (các mẫu hình), `f_classify_day_type`/`f_classify_open_type`/`f_get_daytype_color` (phân loại ngày), `f_check_80_rule` (80% VA Rule).
- `market_profile.pine` v3.0 chỉ còn giữ: 2 UDT thuần vẽ (`NakedPOC`, `SessionDrawings`), input/màu/alert/dashboard, và phần RENDER (box/line/label/table) — mọi phép tính đều gọi qua `mpcore.*`. Hành vi/số liệu hiển thị **không đổi** so với v2.3 (refactor thuần, không đổi logic).
- `order_flow_profile_panel.pine` v2.0 cũng chuyển engine TPO/POC/VA sang `mpcore` — xem `docs/order-flow-profile-panel.md` mục thiết kế tương ứng (có **đổi hành vi nhỏ**: input `grid_rows` → `price_step`, vì engine incremental yêu cầu bước giá cố định).

**Ràng buộc vận hành (quan trọng, đã xác nhận qua thực nghiệm)**: `import user/lib/N` trỏ tới 1 "version publish" CỐ ĐỊNH, không tự trỏ theo bản mới nhất. Lần đầu publish library (qua Pine Editor, hoặc API `create_pine_script`) tạo ra `/1` dùng được ngay (sau 1 nhịp trễ lập chỉ mục ngắn). Nhưng các lần SỬA sau đó chỉ lưu thành 1 bản mới trong lịch sử "My Scripts" — **KHÔNG** tự sinh ra version import mới; phải chủ động mở Pine Editor, bấm **Publish script → Update existing publication** để tạo `/2`, `/3`... rồi mới cập nhật câu `import` ở các script muốn dùng bản mới. Bản cũ (`/1`) vẫn chạy ổn định cho script nào còn giữ nguyên câu import đó (Pine giữ lại mọi version đã publish).

## Output / Tín Hiệu Trên Chart

- Đường IB High/Low + mở rộng 1.5x/2.0x.
- Developing VAH/POC/VAL (đường bậc thang `plot.style_stepline`) + 2 vùng tô màu trên/dưới POC theo `fill()` — xem "Thiết Kế: Developing VA".
- Đường + label pVAH/pVAL/pPOC phiên trước (text `(Open)`/`(Filled)`), đường Naked POC.
- Nhãn `pVAH`/`pVAL`/`pPOC` bên price scale (đổi màu xám khi đã lấp).
- Box Buying/Selling Tail, Single Prints, đường Ledge, label Late Spike, label Poor High/Poor Low.
- Băng màu Day Type/Open Type dưới đáy chart.
- Dashboard 13 dòng, vị trí tuỳ chọn (4 góc), label/text gọn (ví dụ "IB", "RF", "pVAH/pVAL ✓/○"): Day Type, Open Type, IB, RF, TPO Count, VAH/POC/VAL, pVAH/pVAL, Naked POC, Poor High/Low, 80% VA Rule, Tails, Mô hình khác.
- 8 `alertcondition`: IB Breakout Up/Down, Buying/Selling Tail, Double-Distribution Day, Naked POC hit, Prev VAH/VAL hit, 80% Rule activated.

## Giới Hạn & Lưu Ý

- Từ v2.0, động cơ TPO là **incremental** (cộng dồn mỗi bar, không quét lại lịch sử phiên) — hết vấn đề chậm O(N²) trên timeframe nhỏ của bản v1.2.
- Lưới TPO neo theo bước giá cố định thay vì chia đều `sess_range` thành N hàng → POC/VAH/VAL/Tail/Ledge có thể lệch nhẹ (tối đa ±1 bước giá tương ứng) so với cách tính cũ; đổi lại tốc độ tốt hơn nhiều.
- **Lưới kép** (xem mục "Thiết Kế: Lưới Kép" phía trên): `price_step` (POC/VAH/VAL) và `shape_step` (TPO Count/Tail/Poor/SP/Ledge) là 2 tham số ĐỘC LẬP — cần tinh chỉnh riêng theo biên độ giá thực tế của từng mã (mintick nhỏ không đồng nghĩa `shape_step` phải nhỏ theo).
- **TPO Period thực (30 phút, không phải nến chart)** — xem mục "Thiết Kế: TPO Period Thực" phía trên — áp dụng cho: động cơ TPO/POC/VAH/VAL/Tails, IB, Rotation Factor, Late Spike, Day Type/Open Type. Chỉ đúng tuyệt đối khi timeframe chart **chia hết** cho `tpo_period_min` (ví dụ 30 phút chia hết cho 1/2/3/5/6/10/15/30 phút); timeframe không chia hết (ví dụ 4m, 7m) có thể lệch nhẹ ở ranh giới Period.
- **⚠️ Hạn chế đã biết (TODO nếu phát triển thêm)**: quy tắc 80% Value Area Rule (biến `bars_inside_prev_va`, mục 6.5 trong code) vẫn đếm theo **số nến chart liên tiếp**, chưa chuyển sang đếm theo TPO Period như các phần khác — nên "2 nến" nghĩa là 2 phút trên 1m nhưng là 6 phút trên 3m, vẫn lệch theo timeframe. Muốn nhất quán tuyệt đối, cần áp dụng kỹ thuật tương tự `f_process_bar_period` (đếm theo Period đã đóng) cho biến này.
- Dashboard (từ v2.1) dùng label/text viết tắt để gọn (ví dụ "IB" thay "Trạng thái IB", "✓/○" thay "(Đã lấp)/(Còn nguyên)") — bật toggle `show_diag` khi cần xem số liệu chẩn đoán dedup chi tiết.
- Day Type/Open Type được đánh giá lại liên tục trong phiên (không "đóng băng" cho đến cuối phiên) — là hành vi mong muốn (profile sống theo thời gian thực), không phải repaint vì không dùng dữ liệu tương lai.
- Giới hạn vẽ: `max_lines_count=500`, `max_boxes_count=500`, `max_labels_count=500`.
- **Phụ thuộc library ngoài** (từ v3.0): cần `import anthonydang/market_profile_core/1` — nếu library bị unpublish/xoá trên TradingView, script này sẽ không compile được. Xem mục "Thiết Kế: Market Profile Core Library" phía trên.
- **Lưới Xác Nhận (từ v3.3, sửa lỗi ở v3.4)**: Tail/Single Print/Poor High-Low/Ledge chỉ ẩn phần **mới hình thành** (count thực = 1, do Period hiện tại đang mở tạo ra lần đầu) tới khi Period đó đóng — trễ tối đa gần `tpo_period_min` phút (mặc định 30 phút), đây là hành vi CHỦ ĐÍCH, không phải bug. Ngược lại, khi Period hiện tại **fill vào** 1 hàng đã được Period trước xác nhận là single print (count thực tăng lên ≥ 2), Tail/SP/Poor/Ledge liên quan bị phá vỡ và cập nhật lại **ngay lập tức**, không chờ Period đóng — xem mục "Thiết Kế: Lưới Xác Nhận" phía trên.

## Changelog

- **v1.0** (2026-11-14): Phát hành lần đầu.
- **v1.1** (2026-11-14): Sửa lỗi array out-of-bounds (sell tail khi POC ở hàng trên cùng lưới) và sai logic buy tail khi POC ở hàng dưới cùng; bỏ matrix `tpo_mat` không dùng tới; chuyển vẽ đối tượng từ xoá+tạo lại mỗi bar sang cập nhật tại chỗ.
- **v1.2** (2026-11-14): Thêm nhãn pVAH/pVAL/pPOC bên price scale (toggle riêng `show_pva_scale`, đổi màu xám khi đã lấp); nhãn trên chart đổi text `(Open)`/`(Filled)`; khung Value Area tách 2 vùng trên/dưới POC, bỏ border, mờ hơn; đường POC/VAH/VAL giảm độ dày/đổi nét đứt + trong suốt để chart đỡ rối.
- **v2.0** (2026-11-14):
  - Viết lại động cơ TPO để sửa lỗi hiệu năng nghiêm trọng trên timeframe nhỏ (1m/3m/5m — load rất chậm do quét lại toàn bộ lịch sử phiên mỗi bar, O(N²)). Thay input `grid_rows` (chia `sess_range` thành N hàng, đổi theo mỗi bar) bằng input `price_step` (bước giá cố định, mặc định 0.1) + mảng `tpo_counts` động mở rộng khi giá vượt biên. Mỗi bar chỉ cộng dồn (hàm `f_add_bar_tpo`) thay vì quét lại lịch sử — giảm độ phức tạp từ O(N²) xuống gần O(1)/bar.
  - Sửa lỗi hàm tự định nghĩa không được phép gán lại biến toàn cục kiểu giá trị (`base_row`) — chuyển sang truyền `tpo_counts`/`prof` làm tham số (kiểu tham chiếu, mutate được) và trả `base_row` mới qua return value.
  - Sửa lỗi tie-break POC chọn sai hàng khi hoà số TPO cao nhất (do mảng `tpo_counts` phình không đối xứng khiến "giữa mảng theo index" lệch khỏi "giữa giá thực phiên") — tính lại `mid_row` từ giá giữa phiên thực.
  - **Sửa lỗi gốc rễ khiến POC/pPOC không nhất quán giữa các timeframe**: chuyển đơn vị TPO từ "1 nến chart" sang "1 TPO Period thực" (khung giờ cố định, input mới `tpo_period_min`, mặc định 30 phút, chuẩn CBOT) — xem mục "Thiết Kế: TPO Period Thực" phía trên. Thêm mảng `tpo_last_period` chống đếm trùng 1 Period nhiều lần. Đổi `ib_bars_cnt`→`ib_periods_cnt`, `bars_in_sess`→`periods_in_sess`; IB, Rotation Factor (hàm mới `f_process_bar_period`, chỉ cộng dồn khi 1 Period đóng), Late Spike (dùng high/low gộp 2 Period cuối thay vì `high[1]`/`low[1]`), Day Type/Open Type đều chuyển sang đếm theo TPO Period — nhất quán tuyệt đối giữa mọi timeframe chia hết cho `tpo_period_min`. Quy tắc 80% VA Rule CHƯA chuyển đổi (còn đếm theo nến chart) — xem "Giới Hạn & Lưu Ý".
  - Kết quả POC/VAH/VAL/Tail/Ledge có thể lệch nhẹ (≤ ±1 `price_step`) so với v1.2 do đổi cách chia lưới giá — người dùng xác nhận chấp nhận được (chỉ cần chính xác tới 0.1).
  - **Thêm Lưới Kép** (xem mục "Thiết Kế: Lưới Kép" phía trên): phát hiện qua test trên VN30F1M (3m) — TPO Count hiện 294/376 trông vô lý, nhưng chẩn đoán xác nhận dedup theo Period ĐÚNG (X≤Y), nguyên nhân là `price_step=0.1` quá mịn so với biên độ phiên (~200 hàng). Thêm input `shape_step` (mặc định 1.0) + mảng `tpo_counts_c`/`tpo_last_period_c`/`base_row_c` riêng cho TPO Count/Tail/Poor High-Low/Single Prints/Ledge (nhóm này phải dùng CHUNG 1 lưới vì chia sẻ `poc_row`/`buy_tail_rows`/`sell_tail_rows`, tách lưới riêng cho từng cái sẽ gây mâu thuẫn logic). POC/VAH/VAL vẫn dùng `price_step` mịn như cũ. Hàm `f_add_bar_tpo` thêm tham số `row_step`/`track_total` để dùng chung cho 2 lưới mà không đếm trùng `total_tpo`.
- **v2.1** (2026-11-14): Dọn code — rút gọn changelog/comment dài dòng trong header file (lịch sử chi tiết chuyển hẳn vào tài liệu này); xoá field chẩn đoán lưới mịn không dùng tới (`poc_tpo_cnt`). Dashboard gọn lại: label/value viết tắt (vd "IB" thay "Trạng thái IB", "✓/○" thay "(Đã lấp)/(Còn nguyên)", rút gọn chuỗi trạng thái 80% VA Rule); số liệu chẩn đoán dedup (`POC:X/YP, Zh`) chuyển vào toggle riêng `show_diag` (mặc định tắt) thay vì luôn hiện. Thêm input `dash_pos_opt` chọn vị trí Dashboard (4 góc: Trên Trái/Phải, Dưới Trái/Phải) thay vì cố định `position.top_right`.
- **v2.2** (2026-11-14): Chuyển VAH/POC/VAL từ box/line tĩnh (bị "viết lại" cả đoạn lịch sử mỗi khi giá trị mới nhất đổi) thành **Developing VA** đúng nghĩa — `plot(style=plot.style_stepline)` cho 3 đường + `fill()` tô 2 vùng, giữ đúng giá trị lịch sử từng bar, áp dụng cho mọi phiên kể cả đã đóng (xem mục "Thiết Kế: Developing VA"). Xoá hẳn `draw.b_va_up/dn`, `draw.l_poc/vah/val` (dead code) khỏi `SessionDrawings`.
- **v2.3** (2026-11-15):
  - Ẩn nhãn giá trị bên phải (price scale) của 3 đường Developing VAH/POC/VAL — thêm `display = display.pane + display.status_line + display.data_window` (bỏ `display.price_scale`), chỉ còn vẽ trên pane, không còn nhãn số bên phải chart. Đổi `shorttitle` của indicator từ `"MP Classic v6"` → `"MP"`.
  - Thêm option vẽ đường (`show_pva_line`, kiểu chọn qua `pva_line_opt`: Đứt nét/Liền nét/Chấm chấm) nối nhãn `pVAH`/`pVAL`/`pPOC` (price scale) tới **nến cuối cùng hiện tại** — đoạn ngắn `[bar_index-1, bar_index]` được cập nhật lại (`line.set_xy1/xy2`) MỖI BAR để luôn bám đúng nến mới nhất (không neo cố định ở nến cuối phiên trước, tránh vẽ xuyên qua các nến của phiên đang chạy), kết hợp `extend=extend.right` để đoạn ngắn này vươn tới mép phải nơi nhãn price scale nằm. Việc cập nhật này KHÔNG dừng lại khi mức giá đã bị lấp (khác đường "Phiên Trước" của `show_prev_va`), chỉ đổi màu xám để vẫn luôn nối đúng tới nhãn. Đổi màu xám khi mức giá tương ứng đã bị lấp, đồng bộ với màu nhãn price scale.
  - Tiện sửa luôn: logic phát hiện "đã lấp" pVAH/pVAL/pPOC (và alert tương ứng) trước đây vô tình bị buộc vào toggle `show_prev_va` (tắt toggle đó thì dashboard/alert cũng không cập nhật dù không liên quan) — tách phát hiện ra độc lập, chỉ còn phần VẼ (line/label) mới phụ thuộc đúng toggle của nó.
- **v3.0** (2026-11-15): Tách toàn bộ động cơ tính toán thuần (TPO incremental, POC/Value Area, TPO Count, Rotation Factor theo TPO Period, Day Type/Open Type, Tails/Single Prints/Ledge/Late Spike, 80% VA Rule) ra library `libraries/market_profile_core.pine`, publish lên TradingView và import (`anthonydang/market_profile_core/1 as mpcore`) để dùng chung với `order_flow_profile_panel.pine` (v2.0) — xem mục "Thiết Kế: Market Profile Core Library" phía trên. UDT `SessionProfile` nay lấy từ library; bỏ field chẩn đoán `poc_tpo_cnt_c` (chuyển thành biến local `diag_poc_tpo_cnt_c`) và 6 cờ `alerted_*` (chuyển thành `var bool` riêng ngoài UDT) khỏi UDT vì không thuộc "động cơ" chung. Đây là refactor thuần — hành vi/số liệu hiển thị không đổi so với v2.3.
- **v3.1** (2026-11-15): Gọn tiếp phần orchestration còn lại — chuyển 3 công thức tiện ích (kiểm tra mức giá bị lấp cho Naked POC/Prev VAH/VAL/POC qua `mpcore.f_check_level_tested`, 4 đường mở rộng IB qua `mpcore.f_calc_ib_extensions`, vị trí dải màu Day Type qua `mpcore.f_calc_band_position`) và 7 hàm định dạng chuỗi dashboard (IB state, số có dấu, TPO imbalance, trạng thái mức giá, tóm tắt Tails/Poor High-Low/mô hình đặc biệt) sang `market_profile_core` v1.1 (`import anthonydang/market_profile_core/2`). File indicator giờ chỉ còn orchestration (gọi `mpcore.*`) + vẽ đối tượng + layout dashboard — không còn công thức/format string rải rác trong code. Hành vi/số liệu hiển thị không đổi so với v3.0.
- **v3.2** (2026-11-21): Thu hẹp Dashboard — dòng "Open Type" (và "Day Type") trả về chuỗi đầy đủ dài (vd `Open-Auction Out of Range (OAOR)`, `Double-Distribution Trend Day`) khiến cột giá trị của cả bảng bị kéo rộng theo. Thêm 2 hàm hiển thị cục bộ `f_short_day_type`/`f_short_open_type` trong `market_profile.pine` (chỉ format chuỗi cho dashboard, không đụng tới `market_profile_core`) để rút gọn 2 dòng này; chuỗi đầy đủ vẫn xem được qua tooltip khi hover ô. Số liệu/logic tính toán không đổi.
- **v3.3** (2026-11-24): Trì hoãn hiển thị Tail/Single Print/Poor High-Low/Ledge khi phần hình thành đó do TPO Period HIỆN TẠI (chưa đóng) tạo ra — tránh hiển thị mẫu hình "tạm thời" có thể đổi ngay khi Period đó còn tiếp diễn. Thêm hàm cục bộ `f_build_confirmed_grid` trong `market_profile.pine` tạo lưới `confirmed_counts_c` (nhân bản `tpo_counts_c`, trừ 1 lượt chạm tại các hàng mà Period hiện tại là lần chạm gần nhất) dùng làm input cho `mpcore.f_count_tail_rows`/`f_detect_buying_tail`/`f_detect_selling_tail`/`f_detect_poor_hl`/`f_detect_single_prints`/`f_detect_ledge` thay cho `tpo_counts_c` trực tiếp — xem mục "Thiết Kế: Lưới Xác Nhận" phía trên. Không sửa `market_profile_core.pine` (không ảnh hưởng `order_flow_profile_panel.pine`). `poc_row_c`, TPO Count above/below POC, và Late Spike vẫn dùng lưới live, không đổi.
- **v3.4** (2026-11-24): Sửa lỗi lưới xác nhận v3.3 phát hiện qua thực tế dùng: cách trừ 1 "vô điều kiện" cho mọi hàng Period hiện tại chạm tới khiến 1 Tail/SP đã bị Period sau **fill vào** (phá vỡ thật) vẫn hiển thị sai là còn nguyên (vì count thực=2 bị trừ xuống còn 1, vẫn đọc là single print). `f_build_confirmed_grid` nay chỉ ẩn hàng có count thực = 1 **và** là Period hiện tại chạm lần đầu (hình thành mới, đúng ý chờ xác nhận); hàng có count thực ≥ 2 luôn hiện đúng số thực ngay lập tức (fill/phá vỡ không chờ xác nhận, vì không thể đảo ngược) — xem mục "Thiết Kế: Lưới Xác Nhận" phía trên.
- **v3.5** (2026-11-25): Chuyển hàm cục bộ `f_build_confirmed_grid` sang `market_profile_core.pine` v1.2 (`import .../market_profile_core/3`), theo yêu cầu người dùng rà soát lại core/library toàn dự án — tránh lặp logic xử lý lưới TPO rải rác ngoài indicator. Hành vi/số liệu hiển thị không đổi so với v3.4, chỉ gọi `mpcore.f_build_confirmed_grid` thay bản viết tay riêng. Backup v3.4 tại `indicators/hist/market_profile_v3.4.pine`.
