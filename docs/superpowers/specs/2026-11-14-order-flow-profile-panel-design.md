# Spec: Order Flow & Market Profile Panel (Pane Riêng — Phase 1 Standalone)

**Ngày:** 2026-11-14
**File:** `indicators/order_flow_profile_panel.pine` (file mới, độc lập)
**Phiên bản spec:** 1.0
**Symbol test:** `HNX:VN30F1!` (phái sinh VN30), timeframe gốc: M1

---

## 1. Mục Đích & Bối Cảnh (Why)

Người dùng là trader scalping nến M1. Cần 1 panel riêng (pane riêng biệt dưới chart, giống
pane Delta footprint gốc của TradingView) để:

1. Theo dõi **order flow đang tiến triển trong phiên** theo từng nến (Delta, CVD).
2. Theo dõi **cấu trúc phiên theo Market Profile** (TPO Count, Day Type, Open Type, Rotation
   Factor) để biết phiên đang là trend day, balance day, hay rotational — hỗ trợ quyết định
   scalping theo đúng ngữ cảnh phiên.
3. Có thêm RSI làm tham chiếu momentum chuẩn, không phụ thuộc session.

Đây không phải overlay trên chart nến — là 1 pane riêng, các ô dữ liệu vẽ bằng `box.new()`
(không dùng `table.*`) để mỗi cột **trôi theo đúng nến** tương ứng trên chart chính (table.*
neo cố định góc màn hình, không đồng bộ trục thời gian — đã loại ngay từ đầu).

## 2. Phase 1 vs Phase 2 (Quyết định của người dùng)

- **Phase 1 (spec này):** file hoàn toàn độc lập, tự chứa toàn bộ logic tính toán (không sửa,
  không import từ `indicators/market_profile.pine`). Mục tiêu: chạy thử, xác nhận đúng hành vi,
  đặc biệt xác nhận `request.footprint()` có dữ liệu thật cho `VN30F1!` hay không.
- **Phase 2 (ngoài phạm vi spec này):** nếu Phase 1 chạy ổn, tách engine tính toán Market
  Profile (TPO/Day Type/Open Type/RF) dùng chung giữa file cũ và file mới thành
  `libraries/market_profile_core.pine`, theo đúng tiền lệ đã làm với `smc_core` (commit
  `265ca38`). Không làm trong lần này.

## 3. Goals

- 1 pane riêng, 7 dòng dữ liệu, mỗi cột ứng với đúng 1 nến M1 trên chart chính, trôi đồng bộ
  theo thời gian (box vẽ theo `bar_index`, không dùng `table.*`).
- Dòng 1 **Delta**: delta mua/bán thực của nến đó.
- Dòng 2 **CVD**: cộng dồn delta theo nến, reset mỗi phiên mới (ngày).
- Dòng 3 **TPO Count**: số TPO trên POC / dưới POC, tính lại mỗi nến theo toàn bộ high/low
  phiên tới hiện tại (developing value) — tái dùng logic từ `market_profile.pine` dòng 405-415.
- Dòng 4 **Day Type**: 1 box duy nhất kéo dài từ đầu phiên tới nến hiện tại (merge full ngày),
  text + màu cập nhật theo phân loại developing — tái dùng logic dòng 522-543.
- Dòng 5 **Open Type**: tương tự Day Type, 1 box merge full ngày riêng — tái dùng logic dòng
  545-557.
- Dòng 6 **RF (Rotation Factor)**: cộng dồn +1/-1 theo nến — tái dùng logic dòng 284-294.
- Dòng 7 **RSI**: `ta.rsi()` chuẩn, độc lập session.
- Delta/CVD có **fallback 2 tầng** khi `request.footprint()` không có dữ liệu cho `VN30F1!`
  (xem mục 6).
- Quản lý rolling window số cột hiển thị để không vượt giới hạn `max_boxes_count` (500).

## 4. Non-Goals

- Không sửa/refactor `indicators/market_profile.pine` (giữ nguyên, không đụng).
- Không làm library trong lần này (Phase 2 sau).
- Không vẽ lại toàn bộ chi tiết Market Profile (IB lines, Naked POC, Tails, v.v.) — panel này
  chỉ lấy đúng 4 số liệu Market Profile được yêu cầu (TPO Count, Day Type, Open Type, RF), không
  phải bản sao đầy đủ của indicator cũ.
- Không cần hỗ trợ đa-symbol hoặc multi-timeframe trong 1 lần hiển thị — panel bám theo
  chart hiện tại.

## 5. Anti-Goals (Fail dù chạy không lỗi)

- Delta/CVD luôn hiện "N/A" vô thời hạn mà không có fallback rõ ràng — tức fallback không hoạt
  động thực sự.
- Panel làm chart lag nặng do vòng lặp TPO tính lại toàn bộ session mỗi bar trên khung M1 với
  phiên dài (nontrend/nhiều giờ) — cần kiểm soát `grid_rows` và/hoặc giới hạn mảng highs/lows.
- Vượt giới hạn `max_boxes_count`/`max_labels_count` gây lỗi runtime hoặc panel vẽ sai/thiếu cột.

## 6. Delta/CVD — Nguồn Dữ Liệu & Fallback (Quyết định B)

`request.footprint()` (và `request.security_lower_tf()` ở Tầng 2) phải được gọi **không điều
kiện ở mọi bar** (Pine yêu cầu các hàm `request.*` chạy đều, không đặt trong `if`) — chỉ phần
*sử dụng* kết quả (gán vào `delta`, hiển thị...) mới được gate theo `barstate.isconfirmed`.

Thứ tự ưu tiên khi gán `delta` mỗi bar đã confirm:

1. **Tầng 1 — `request.footprint()` (chính xác nhất):**
   `footprint fp = request.footprint(ticks_per_row, va_pct, imb_pct)`. Nếu `not na(fp)`:
   `delta = fp.delta()` (tức `fp.buy_volume() - fp.sell_volume()`).
2. **Tầng 2 — `request.security_lower_tf()` xấp xỉ:** nếu `fp` là `na`, lấy dữ liệu khung nhỏ
   hơn (input cấu hình, mặc định `"1S"`) qua `request.security_lower_tf(syminfo.tickerid, lower_tf, close)`
   (và `open`, `volume` tương ứng) trong mảng; với mỗi nến con: `close > open` → buy volume,
   `close < open` → sell volume, bằng nhau → chia đôi. Cộng lại thành `delta` cho bar M1.
3. **Tầng 3 — Xấp xỉ thuần công thức OHLCV (an toàn cuối, không cần request thêm):** nếu Tầng 2
   cũng không có dữ liệu (mảng rỗng/toàn na), dùng công thức kiểu Chaikin Money Flow:
   `buy_vol = volume * (close - low) / (high - low)`,
   `sell_vol = volume * (high - close) / (high - low)`, `delta = buy_vol - sell_vol`
   (nếu `high == low` thì `delta = 0`).

Một biến `string delta_source` lưu tầng đang dùng ("Footprint" / "LowerTF" / "OHLCV-Approx")
để hiển thị debug (ví dụ ở label góc pane) — giúp người dùng biết VN30F1! đang chạy tầng nào.

CVD = cộng dồn `delta` qua các nến, reset về 0 khi `timeframe.change("D")` (giống boundary
phiên của `market_profile.pine`).

## 7. Rendering — Box Grid Trong Pane Riêng

- Indicator không overlay (`overlay=false`), mỗi dòng có 1 dải y cố định (y = 1..7, cách đều),
  scale pane tự fit theo các box này (không cần ép `scale.none`).
- Mỗi cột = 1 box mỏng `box.new(bar_index - 0.5, y_top, bar_index + 0.5, y_bottom, text=...)`
  cho 5 dòng động (Delta, CVD, TPO Count, RF, RSI). Màu nền theo dấu/ngưỡng giá trị.
- Day Type & Open Type: mỗi dòng chỉ 1 box, `left = session.start_bar`, `right = bar_index`,
  cập nhật tại chỗ mỗi bar (giống `draw.b_status_band` hiện có), KHÔNG tạo box mới mỗi nến.
- **Quản lý rolling window:** input `n_bars_display` (mặc định 60, min 20, max 90 — giới hạn do
  5 dòng động × 90 = 450 box, cộng 2 box Day/Open Type, dưới ngưỡng 500). Dùng 1 array lưu các
  box theo cột (giống cách `active_npocs` quản lý trong `market_profile.pine`): khi số cột vượt
  `n_bars_display`, xoá (`box.delete`) cột cũ nhất trước khi tạo cột mới.

## 8. Màu Sắc & Ngưỡng (Quyết định của tôi — builder có thể chỉnh nhẹ)

Tái dùng tinh thần bảng màu đã có trong `market_profile.pine` để đồng bộ toàn dự án:
- Delta/CVD/RF: xanh forest (`#1B4D3E`) khi dương, đỏ burgundy (`#8B0000`) khi âm, xám khi 0.
- Day Type: dùng lại `f_get_daytype_color()` (copy logic, không import).
- Open Type: màu navy trung tính (`#1A365D`), không phân loại màu theo hướng.
- RSI: đỏ nhạt khi > 70 (quá mua), xanh nhạt khi < 30 (quá bán), xám/navy khi giữa.
- TPO Count: xanh forest nếu `below_poc > above_poc` (áp lực mua chiếm ưu thế theo thời gian),
  đỏ burgundy nếu ngược lại — giống logic `tpo_col` đã có ở dashboard cũ (dòng 807).

## 9. Inputs Cần Có

| Input | Default | Group |
|---|---|---|
| `ticks_per_row` (footprint) | 10 | Footprint |
| `va_pct` (footprint value area %) | 70 | Footprint |
| `imb_pct` (imbalance %) | 300 | Footprint |
| `lower_tf_fallback` (string) | `"1S"` | Footprint |
| `n_bars_display` | 60 (min 20, max 90) | Hiển Thị |
| `grid_rows` (TPO grid resolution) | 60 | Market Profile |
| `rsi_len` | 14 | RSI |
| `rsi_src` | `close` | RSI |

## 10. Những Gì Để Builder Tự Quyết (trong lúc viết plan/code)

- Thứ tự chính xác bố trí y-band của 7 dòng trong pane (nhưng phải giữ đúng thứ tự từ trên
  xuống: Delta, CVD, TPO Count, Day Type, Open Type, RF, RSI — đúng thứ tự người dùng yêu cầu).
- Cách format text hiển thị gọn trong ô box hẹp (ví dụ số thập phân, viết tắt "T/D" cho
  TPO above/below) để không bị tràn chữ khi `n_bars_display` lớn.
- Tên UDT/hàm nội bộ cụ thể (miễn tuân quy tắc scope ở `CLAUDE.md`: khai báo biến có kiểu ở đầu
  scope `for`/hàm trước mọi `if`).
- Có cần label debug `delta_source` hiển thị hay chỉ dùng comment — builder quyết, không bắt
  buộc phải có UI riêng cho nó, chỉ cần có cách người dùng biết tầng fallback nào đang chạy khi
  test trên `VN30F1!`.
