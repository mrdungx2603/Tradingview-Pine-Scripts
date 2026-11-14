# Order Flow & Market Profile Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tạo 1 indicator Pine Script v6 độc lập (`indicators/order_flow_profile_panel.pine`) hiển thị pane riêng 7 dòng (Delta, CVD, TPO Count, Day Type, Open Type, RF, RSI), mỗi cột = 1 nến, trôi đồng bộ theo chart chính.

**Architecture:** 1 file duy nhất, build tăng dần theo 5 task: (1) khung sườn + input, (2) engine Market Profile (TPO/POC/VA/Day Type/Open Type/RF) port từ `market_profile.pine`, (3) engine Delta/CVD 3 tầng, (4) renderer box-grid với rolling window, (5) màu sắc/ngưỡng + hoàn thiện. Không dùng `table.*`, không sửa file cũ, không tạo library (Phase 2 sau).

**Tech Stack:** Pine Script v6, chạy trên TradingView Pine Editor. Không có framework test tự động — "test" = biên dịch không lỗi trong Pine Editor + áp dụng lên chart `HNX:VN30F1!` (M1) để kiểm tra trực quan/đối chiếu số liệu, đúng quy trình "Kiểm Tra Script" đã quy định trong `.claude/CLAUDE.md`.

**Spec:** `docs/superpowers/specs/2026-11-14-order-flow-profile-panel-design.md`

## Global Constraints

- `//@version=6`, file mới: `indicators/order_flow_profile_panel.pine` (Phase 1 standalone — không sửa `indicators/market_profile.pine`, không import/export, không tạo library).
- `indicator(..., overlay=false, max_boxes_count=500, max_labels_count=500)` — pane riêng, không dùng `table.*`.
- Mọi biến có kiểu phải khai báo + khởi tạo ở đầu scope `for`/hàm, trước mọi `if` con (quy tắc scope `.claude/CLAUDE.md`); dùng ternary thay `if/else` khi gán giá trị trong scope lồng.
- Mọi vòng `for` có biên có thể đảo ngược (vd. quét từ `poc_row` ra 2 biên lưới) phải bọc `if start <= end` (pitfall "for start > end chạy 1 lần").
- `request.footprint()` và `request.security_lower_tf()` gọi **không điều kiện mỗi bar**; chỉ phần dùng kết quả được gate theo `barstate.isconfirmed`. Toàn script chỉ 1 lệnh `request.footprint()` duy nhất.
- Thứ tự 7 dòng trên-xuống cố định: Delta, CVD, TPO Count, Day Type, Open Type, RF, RSI.
- Input mặc định đúng theo spec §9: `ticks_per_row=10`, `va_pct=70`, `imb_pct=300`, `lower_tf_fallback="1S"`, `n_bars_display=60` (min 20, max 90), `grid_rows=60`, `rsi_len=14`, `rsi_src=close`.
- Toàn bộ text/comment giao diện bằng tiếng Việt; thuật ngữ kỹ thuật (EMA, RSI, POC, TPO, CVD...) giữ tiếng Anh.
- Delta/CVD theo thứ tự ưu tiên 3 tầng (spec §6): `request.footprint()` → `request.security_lower_tf(lower_tf_fallback)` → xấp xỉ OHLCV kiểu Chaikin. CVD reset về 0 khi `timeframe.change("D")`.
- Day Type/Open Type: 1 box duy nhất mỗi dòng mỗi phiên, `left = session.start_bar`, `right = bar_index`, cập nhật tại chỗ (không tạo mới mỗi bar). 5 dòng còn lại dùng rolling window `n_bars_display` cột, xoá box cũ nhất khi vượt ngưỡng.

## Review Focus

- `request.footprint()` trả `na` toàn bộ cho `VN30F1!` (sàn có thể không hỗ trợ tick-level) — Tầng 2/3 phải thực sự nhận delta khi Tầng 1 `na`, không được đứng im ở "N/A" (owned: Task 3).
- Những bar đầu tiên của lịch sử / phiên đầu tiên (`prof.start_bar` còn `na`, `ib_rng = 0`) không được gây lỗi chia-0 hoặc lan `na` ra toàn bộ `day_type`/`open_type` (owned: Task 2).
- Nến có `high == low` (đứng giá, zero-range) khiến Tầng 3 (`volume*(close-low)/(high-low)`) chia 0 — phải có nhánh fallback `delta = 0` (owned: Task 3).
- Vòng lặp quét từ `poc_row` ra biên lưới (tính `buy_tail_rows`/`sell_tail_rows`, VA walk) khi `poc_row == 0` hoặc `poc_row == grid_rows - 1` không được chạy lệch 1 do pitfall "for start>end chạy 1 lần" (owned: Task 2).
- Tổng số box không vượt 500 khi `n_bars_display = 90` (5 dòng × 90 = 450) cộng 2 box Day/Open Type cố định mỗi phiên (không tích lũy qua nhiều phiên, phải tái sử dụng/update tại chỗ, không tạo mới) (owned: Task 4).

---

### Task 1: Khung Sườn — Header, Inputs, Pane, RSI

**Files:**
- Create: `indicators/order_flow_profile_panel.pine`

**Interfaces:**
- Produces: inputs `ticks_per_row` (int), `va_pct` (float, %), `imb_pct` (float, %), `lower_tf_fallback` (string), `n_bars_display` (int), `grid_rows` (int), `ib_bars_cnt` (int, default 2, group Market Profile — cần cho Task 2), `rsi_len` (int), `rsi_src` (float series); biến `float rsi_val = ta.rsi(rsi_src, rsi_len)`; hằng số vị trí dòng `var int Y_DELTA=7`, `Y_CVD=6`, `Y_TPO=5`, `Y_DAYTYPE=4`, `Y_OPENTYPE=3`, `Y_RF=2`, `Y_RSI=1` (mỗi dòng cao 1 đơn vị, dùng `y` và `y-1` làm top/bottom).

- [ ] **Step 1: Viết header file + khai báo indicator**

File bắt đầu `//@version=6`, comment mô tả tiếng Việt, rồi:
```pinescript
indicator(title="Order Flow & Market Profile Panel", shorttitle="OF Panel v6", overlay=false, max_boxes_count=500, max_labels_count=500)
```
Thêm comment version header: `// Phiên bản: 1.0`.

- [ ] **Step 2: Khai báo input groups đúng tên nhóm tiếng Việt**

4 group: `"Footprint"`, `"Hiển Thị"`, `"Market Profile"`, `"RSI"`. Input chính xác theo bảng Global Constraints (tên biến, default, min/max như liệt kê). `lower_tf_fallback` dùng `input.string(defval="1S", title=..., group="Footprint")`.

- [ ] **Step 3: Tính RSI và khai báo hằng số vị trí dòng**

`rsi_val = ta.rsi(rsi_src, rsi_len)`. Khai báo 7 hằng `Y_*` như phần Interfaces.

- [ ] **Step 4: Biên dịch kiểm tra**

Copy toàn bộ file vào Pine Editor trên chart `HNX:VN30F1!` (bất kỳ timeframe). Kỳ vọng: "Script biên dịch thành công, không lỗi", pane trống hiện ra (chưa có gì vẽ — đúng vì chưa có Task 2-4).

- [ ] **Step 5: Commit**

```bash
git add indicators/order_flow_profile_panel.pine
git commit -m "feat: khung sườn Order Flow & Market Profile Panel (inputs, pane, RSI)"
```

---

### Task 2: Engine Market Profile — TPO/POC/VA/Day Type/Open Type/RF

**Files:**
- Modify: `indicators/order_flow_profile_panel.pine`

**Interfaces:**
- Consumes: `grid_rows`, `ib_bars_cnt`, `va_pct` từ Task 1.
- Produces: UDT `OFProfile` với field (tối thiểu): `int start_bar`, `float open_price`, `float close_price`, `float sess_high`, `float sess_low`, `float prev_vah`, `float prev_val`, `float ib_high`, `float ib_low`, `bool ib_locked`, `int bars_in_sess`, `bool ext_up_first`, `bool ext_dn_first`, `float poc`, `float vah`, `float val`, `int rf_score`, `int tpo_above_poc`, `int tpo_below_poc`, `bool has_sp_mid`, `string day_type`, `string open_type`. Global `var OFProfile prof = OFProfile.new()`. Hàm `f_get_daytype_color(string dt) => color` (copy nguyên từ `market_profile.pine` dòng 163-173). Các field này được Task 4 đọc trực tiếp để render.

- [ ] **Step 1: Port UDT `OFProfile` và 2 array quản lý high/low phiên**

Khai báo UDT theo đúng field ở Interfaces (bỏ các field chỉ phục vụ vẽ: `NakedPOC`, line/box refs, tails *price*, poor high/low, ledge, spike, 80% rule — không cần cho 4 metric mục tiêu). Thêm `var array<float> arr_highs = array.new<float>()`, `var array<float> arr_lows = array.new<float>()`.

- [ ] **Step 2: Port logic reset phiên mới (`is_new_session`) và cộng dồn bar-in-session**

Port từ `market_profile.pine` dòng 203-294, bỏ phần vẽ Naked POC/line prev VA (không cần), giữ nguyên: lưu `prev_vah/prev_val` trước khi reset, khởi tạo `OFProfile.new(...)` với field tương ứng, cộng dồn `sess_high/sess_low/bars_in_sess`, IB high/low + `ib_locked`, `ext_up_first/ext_dn_first`, và cộng dồn `rf_score` (dòng 284-294) — **nhớ bọc đúng theo quy tắc scope**: khai báo `int bar_rf = 0` ở đầu scope trước khi `if high > high[1]`.

- [ ] **Step 3: Port TPO grid, POC, VA, TPO Count above/below**

Port từ dòng 348-415: build `tpo_counts` theo `grid_rows`, tìm `poc_row`→`prof.poc`, VA walk →`prof.vah/val` (**chú ý pitfall for start>end**: khi `up_idx == grid_rows-1` hoặc `dn_idx == 0` phải dừng vòng `while` đúng điều kiện đã có, không cần sửa logic gốc — chỉ port nguyên), rồi tính `prof.tpo_above_poc`/`prof.tpo_below_poc` (dòng 405-415).

- [ ] **Step 4: Port `buy_tail_rows`/`sell_tail_rows`/`has_sp_mid` (cho Day Type)**

Port từ dòng 418-434 (đếm tail rows — bọc `if poc_row > 0` / `if poc_row < grid_rows - 1` đúng như gốc để tránh lỗi biên) và dòng 443-468 (single-prints mid detection) để có `prof.has_sp_mid`. Không cần tính `buying_tail_h`/`selling_tail_l` (giá), chỉ cần 2 biến đếm nội bộ + `has_sp_mid`.

- [ ] **Step 5: Port phân loại Day Type & Open Type**

Port verbatim từ dòng 522-557 (bao gồm `ib_rng`, `ext_up`, `ext_dn`, `total_ratio`, `is_ext_up`, `is_ext_dn`, bảng điều kiện Day Type, và `open_pos_in_ib`/`open_out_of_va` cho Open Type) → gán `prof.day_type`, `prof.open_type`.

- [ ] **Step 6: Debug tạm để đối chiếu — label tại `barstate.islast`**

Thêm tạm (sẽ bị xoá ở Task 4):
```pinescript
if barstate.islast
    label.new(bar_index, high, "RF=" + str.tostring(prof.rf_score) + " TPO=" + str.tostring(prof.tpo_above_poc) + "/" + str.tostring(prof.tpo_below_poc) + " | " + prof.day_type + " | " + prof.open_type, style=label.style_label_down)
```

- [ ] **Step 7: Đối chiếu với `market_profile.pine`**

Áp dụng CẢ 2 indicator (`market_profile.pine` và file mới) lên cùng chart `HNX:VN30F1!` khung M1. Kỳ vọng: label debug của file mới cho `RF`, `TPO above/below`, `Day Type`, `Open Type` **khớp chính xác** với dashboard của `market_profile.pine` tại cùng 1 bar (so ở `barstate.islast`, rồi lùi lại vài phiên trước để so thêm 1-2 điểm nữa). Đồng thời cuộn chart về **những bar đầu tiên của toàn bộ lịch sử dữ liệu** (phiên đầu tiên) và xác nhận label debug không hiện `na`/lỗi — tức việc `prof.start_bar`/`ib_rng` tại thời điểm chưa có phiên trước không làm hỏng phân loại Day Type/Open Type ở ngày đầu.

- [ ] **Step 8: Commit**

```bash
git add indicators/order_flow_profile_panel.pine
git commit -m "feat: port engine Market Profile (TPO/POC/VA/Day Type/Open Type/RF) vào panel mới"
```

---

### Task 3: Engine Delta/CVD — 3 Tầng Fallback

**Files:**
- Modify: `indicators/order_flow_profile_panel.pine`

**Interfaces:**
- Consumes: `ticks_per_row`, `va_pct`, `imb_pct`, `lower_tf_fallback` từ Task 1.
- Produces: `float delta` (series, giá trị mỗi bar), `string delta_source` ("Footprint" | "LowerTF" | "OHLCV-Approx"), `var float cvd = 0.0` (cộng dồn, reset khi `is_new_session`). Task 4 và Task 5 đọc `delta`, `cvd`, `delta_source`.

- [ ] **Step 1: Gọi `request.footprint()` không điều kiện + Tầng 1**

```pinescript
footprint fp = request.footprint(ticks_per_row, va_pct, imb_pct)
```
đặt ở top-level (không trong `if`). Khai báo `float delta = na`, `string delta_source = na` ở scope chính, rồi gán Tầng 1 khi `not na(fp)`: `delta := fp.delta()`, `delta_source := "Footprint"`.

- [ ] **Step 2: Tầng 2 — `request.security_lower_tf()` khi Tầng 1 `na`**

```pinescript
array<float> ltf_close = request.security_lower_tf(syminfo.tickerid, lower_tf_fallback, close)
array<float> ltf_open  = request.security_lower_tf(syminfo.tickerid, lower_tf_fallback, open)
array<float> ltf_vol   = request.security_lower_tf(syminfo.tickerid, lower_tf_fallback, volume)
```
cũng đặt không điều kiện ở top-level. Nếu `na(fp)` và `array.size(ltf_close) > 0`: lặp qua từng phần tử, `close>open → +volume`, `close<open → -volume`, bằng nhau → bỏ qua (không cộng), tổng lại thành `delta`; `delta_source := "LowerTF"`.

- [ ] **Step 3: Tầng 3 — xấp xỉ OHLCV khi cả 2 tầng trên không có dữ liệu**

Nếu `na(fp)` và (`array.size(ltf_close) == 0` hoặc giá trị rỗng): dùng công thức Chaikin — khai báo `float rng = high - low` trước, rồi `delta := rng > 0 ? volume * ((close - low) - (high - close)) / rng : 0.0`; `delta_source := "OHLCV-Approx"`.

- [ ] **Step 4: CVD cộng dồn + reset theo phiên**

`var float cvd = 0.0`; nếu `is_new_session` (biến đã có từ Task 2): `cvd := delta`; else `cvd := cvd + delta`. Đặt trong khối gate `barstate.isconfirmed` (chỉ phần SỬ DỤNG `delta`, không phải lệnh `request.*`).

- [ ] **Step 5: Kiểm tra trên `HNX:VN30F1!`**

Thêm tạm 1 dòng vào label debug Task 2 (nối thêm `" | Δ=" + str.tostring(delta) + " CVD=" + str.tostring(cvd) + " [" + delta_source + "]"`). Áp dụng lên chart `VN30F1!` M1: xác nhận `delta_source` hiện ra (Footprint/LowerTF/OHLCV-Approx — tầng nào cũng được, miễn không phải `na` liên tục), `cvd` đổi giá trị mỗi bar và **bằng đúng `delta` của bar đầu phiên** tại thời điểm phiên mới bắt đầu (kiểm tra bằng cách lùi về đầu 1 phiên M1 bất kỳ).

- [ ] **Step 6: Commit**

```bash
git add indicators/order_flow_profile_panel.pine
git commit -m "feat: engine Delta/CVD 3 tầng fallback (footprint/lower-tf/OHLCV-approx)"
```

---

### Task 4: Renderer Box-Grid — Rolling Window & Band Phiên

**Files:**
- Modify: `indicators/order_flow_profile_panel.pine`

**Interfaces:**
- Consumes: `delta`, `cvd`, `rsi_val` (Task 1/3), `prof.tpo_above_poc/below_poc`, `prof.rf_score`, `prof.day_type`, `prof.open_type`, `prof.start_bar`, `is_new_session` (Task 2), hằng `Y_*` (Task 1), `n_bars_display` (Task 1).
- Produces: hàm `f_push_cell(array<box> col_boxes, float y_top, float y_bottom, string txt, color bg, int max_cols) => void` (tạo box mới tại `bar_index`, push vào array, xoá/`box.delete` box cũ nhất nếu `array.size > max_cols`); 5 `var array<box>` cho 5 dòng động; 2 `var box` cho Day Type/Open Type (persist theo phiên).

- [ ] **Step 1: Xoá label debug tạm của Task 2/3**

Xoá khối `if barstate.islast ... label.new(...)` đã thêm tạm ở Task 2 Step 6 / Task 3 Step 5 — từ đây renderer chính thức thay thế.

- [ ] **Step 2: Viết hàm `f_push_cell` quản lý rolling window**

```pinescript
f_push_cell(array<box> col_boxes, float y_top, float y_bottom, string txt, color bg, int max_cols) =>
    box b = box.new(bar_index - 0.5, y_top, bar_index + 0.5, y_bottom, border_color=bg, bgcolor=bg, text=txt, text_color=color.white, text_size=size.tiny)
    array.push(col_boxes, b)
    if array.size(col_boxes) > max_cols
        box.delete(array.shift(col_boxes))
```
(theo đúng pattern xoá-phần-tử-cũ-nhất đã dùng cho `active_npocs` trong `market_profile.pine` dòng 218-221).

- [ ] **Step 3: Khai báo 5 array cột + gọi `f_push_cell` cho Delta/CVD/TPO/RF/RSI mỗi bar confirmed**

`var array<box> col_delta = array.new<box>()` (tương tự cho `col_cvd`, `col_tpo`, `col_rf`, `col_rsi`). Trong khối `if barstate.isconfirmed`: gọi `f_push_cell` 5 lần với `y_top/y_bottom` lấy từ hằng `Y_*` (Task 1) và `max_cols = n_bars_display`. Text/màu tạm dùng placeholder (màu/ngưỡng thật sẽ hoàn thiện ở Task 5) — ví dụ Delta dùng `color.gray`, text `str.tostring(delta, format.volume)`.

- [ ] **Step 4: Band Day Type/Open Type — tạo 1 lần mỗi phiên, update tại chỗ**

`var box b_daytype = na`, `var box b_opentype = na`. Khi `is_new_session`: `box.delete(b_daytype)`, `box.delete(b_opentype)` (xoá band phiên trước), rồi tạo mới `b_daytype := box.new(prof.start_bar, Y_DAYTYPE, bar_index, Y_DAYTYPE - 1, text=prof.day_type, ...)` tương tự cho `b_opentype`. Các bar sau trong cùng phiên: `box.set_right(b_daytype, bar_index)`, `box.set_text(b_daytype, prof.day_type)` (và tương tự `b_opentype`) — không tạo box mới.

- [ ] **Step 5: Kiểm tra trực quan trên `VN30F1!`**

Tạm đặt `n_bars_display = 20` để quan sát nhanh: áp lên chart `VN30F1!` M1, xác nhận 5 dòng Delta/CVD/TPO/RF/RSI hiện box theo từng nến, cột cũ nhất biến mất khi vượt 20 cột (kéo chart qua ~25 nến để thấy rõ), 2 băng Day Type/Open Type trải dài từ đầu phiên tới nến hiện tại không bị xoá/vẽ lại nhấp nháy. Sau khi xác nhận, trả `n_bars_display` lại default 60.

- [ ] **Step 6: Commit**

```bash
git add indicators/order_flow_profile_panel.pine
git commit -m "feat: renderer box-grid 7 dòng với rolling window + band Day/Open Type theo phiên"
```

---

### Task 5: Màu Sắc, Ngưỡng & Hoàn Thiện

**Files:**
- Modify: `indicators/order_flow_profile_panel.pine`

**Interfaces:**
- Consumes: mọi field/biến đã có từ Task 1-4.
- Produces: bản hoàn chỉnh v1.0 (không field/hàm mới cho task sau).

- [ ] **Step 1: Màu Delta/CVD/RF theo dấu**

Thay placeholder màu ở Task 4 Step 3: `color c_delta = delta > 0 ? color.rgb(27,77,62) : delta < 0 ? color.rgb(139,0,0) : color.gray` (dương=forest green, âm=burgundy, bằng 0=gray). Áp dụng tương tự cho `cvd` và `prof.rf_score`.

- [ ] **Step 2: Màu TPO Count theo lệch trên/dưới POC**

`color c_tpo = prof.tpo_below_poc > prof.tpo_above_poc ? color.rgb(27,77,62) : prof.tpo_above_poc > prof.tpo_below_poc ? color.rgb(139,0,0) : color.gray`. Text hiển thị dạng rút gọn: `str.tostring(prof.tpo_above_poc) + "/" + str.tostring(prof.tpo_below_poc)`.

- [ ] **Step 3: Màu RSI theo ngưỡng quá mua/quá bán**

`color c_rsi = rsi_val > 70 ? color.rgb(139,0,0) : rsi_val < 30 ? color.rgb(27,77,62) : color.rgb(26,54,93)`.

- [ ] **Step 4: Màu Day Type/Open Type**

Copy hàm `f_get_daytype_color()` đã port ở Task 2 cho band Day Type. Open Type dùng màu navy cố định `color.rgb(26,54,93)` (không phân loại theo hướng, theo spec §8).

- [ ] **Step 5: Hiển thị `delta_source` ngay trong ô Delta**

Nối hậu tố 1 ký tự vào text ô Delta: `"F"` nếu `delta_source == "Footprint"`, `"L"` nếu `"LowerTF"`, `"A"` nếu `"OHLCV-Approx"` — ví dụ text = `str.tostring(delta, format.volume) + " " + (delta_source == "Footprint" ? "F" : delta_source == "LowerTF" ? "L" : "A")`.

- [ ] **Step 6: Kiểm tra toàn diện theo quy trình "Kiểm Tra Script" của CLAUDE.md**

Trên chart `HNX:VN30F1!` M1: (a) biên dịch không lỗi; (b) áp dụng lên chart, cuộn qua ≥2 phiên để thấy band Day Type/Open Type đổi màu/chữ đúng lúc phiên mới bắt đầu; (c) đổi khung thời gian sang M5 rồi quay lại M1 để kiểm tra không có hiện tượng repaint bất thường ở Day Type/Open Type (giá trị tại các bar đã đóng không nhảy ngược); (d) xác nhận hậu tố `delta_source` nhất quán (không nhảy qua lại giữa các tầng mỗi bar trừ khi thực sự `na`).

- [ ] **Step 7: Commit**

```bash
git add indicators/order_flow_profile_panel.pine
git commit -m "feat: hoàn thiện màu sắc/ngưỡng Order Flow & Market Profile Panel v1.0"
```
