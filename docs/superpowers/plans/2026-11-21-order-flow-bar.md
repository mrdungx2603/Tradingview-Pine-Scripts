# Order Flow Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm 1 indicator overlay mới `indicators/order_flow_bar.pine` — 1 thanh volume-profile chia buyer(phải)/seller(trái), chọn 1 trong 3 phạm vi tính (Visible Chart/Session/Last HL) qua setting, chỉ dùng `request.footprint()` Tầng 1, highlight POC/Peak Buy/Peak Sell.

**Architecture:** Toàn bộ logic nằm trong 1 file indicator (không tách library mới, theo quyết định YAGNI trong spec). Pipeline: 1 lệnh `request.footprint()` duy nhất mỗi bar → bucket volume buy/sell của bar đó vào các hàng `price_step` → Session dùng accumulator cộng-dồn-một-chiều (reset mỗi ngày); Last HL/Visible Chart dùng 1 circular buffer lưu bucket của từng bar đã đóng rồi "rebuild" (quét lại) đúng khoảng bar cần khi biên thay đổi. SMC state machine (`smc_core` import có sẵn) chạy song song, tự reseed mỗi phiên, cung cấp biên cho Last HL. Dropdown mode chọn accumulator nào cấp dữ liệu cho bước tính POC/Peak Buy/Peak Sell và vẽ.

**Tech Stack:** Pine Script v6, `import mrdungx2603/smc_core/1 as smc` (đã publish, không cần sửa). Không dùng thêm library mới.

**Spec:** `docs/superpowers/specs/2026-11-21-order-flow-bar-design.md`

## Chiến Lược Kiểm Thử (áp dụng cho mọi task)

Dự án Pine Script **không có môi trường build/test local** (theo CLAUDE.md) — chỉ có 2 cách kiểm chứng:

1. **Compile check (tự động, mọi task)**: dùng tool `mcp__claude_ai_TradingViewMCP__mcp-tv-validate-pine-script` với toàn bộ nội dung file sau mỗi task. Bắt buộc `valid: true`, không có `errors[]`.
2. **Chạy thử có dữ liệu (tự động khi không cần footprint)**: dùng `mcp__claude_ai_TradingViewMCP__mcp-tv-run-pine-indicator` (symbol bất kỳ có OHLCV thường, ví dụ `NASDAQ:AAPL` hoặc mã đang có trong repo) + `plot(..., title="DEBUG_x")` tạm để lộ giá trị trung gian ra `last_values`/`plots`. Dùng được cho: cơ chế buffer (cap/clip), state machine SMC (reseed theo phiên), logic rebuild theo khoảng bar — **không phụ thuộc footprint thật**, chỉ cần 1 giá trị số bất kỳ chảy qua pipeline để kiểm tra đúng cơ chế.
3. **Chạy thử cần footprint thật (có thể KHÔNG tự động được)**: tài khoản TradingView gắn với MCP có thể **không có Premium/Ultimate** → `request.footprint()` trả `na` trong mọi lần gọi qua MCP, dù code đúng. Với các task cần giá trị buy/sell THẬT đúng (Task 2, 3, 5 phần giá trị, 7 phần giá trị), thực hiện:
   - Thử `run_pine_indicator` trước (nếu tài khoản MCP có Premium thì dùng được luôn, tốt nhất).
   - Nếu `has_footprint_data` luôn `false`/`na` trên mọi symbol thử qua MCP → coi là **không kết luận được** qua MCP, chuyển sang **xác nhận thủ công**: báo người dùng tự copy code vào Pine Editor, áp vào `HNX:VN30F1!` (đã xác nhận chạy Tầng 1 "F" trong `docs/order-flow-profile-panel.md`), đối chiếu debug plot/label với Data Window. Đây là bước **bắt buộc có người dùng xác nhận** trước khi đánh dấu các task đó hoàn tất — không tự suy ra kết quả.
4. Gỡ mọi `plot(..., title="DEBUG_*")` tạm trước khi đóng Task cuối cùng của toàn plan (không để lại code debug trong bản release).

## Global Constraints

- `price_step` cố định xuyên suốt 1 lần chạy script (không rebucket lại lịch sử khi đổi) — input, không có cơ chế tự đổi.
- Chỉ dùng Tầng 1 `request.footprint()`/`fp.rows()` cho buy/sell volume — không có Tầng 2/3 fallback.
- Symbol không có dữ liệu footprint (giá trị `na` liên tục) → toàn bộ indicator không vẽ gì (không plot/box/line/label nào), không raise lỗi.
- `request.footprint()` chỉ được gọi **đúng 1 lần** trong toàn script (giới hạn Pine).
- "Visible Chart" = N nến gần nhất (input riêng `vis_bars_n`), KHÔNG dùng `chart.left_visible_bar_index`/`right_visible_bar_index`.
- Buffer lịch sử có dung lượng giới hạn qua input `max_lookback_bars` (mặc định 500) — khi khoảng cần (Last HL leg hoặc `vis_bars_n`) vượt dung lượng, clip theo dung lượng, không lỗi.
- State machine SMC (cho Last HL) **tự reseed mỗi phiên mới** (khác hành vi gốc chạy xuyên suốt lịch sử của `smc_market_structure.pine`).
- Chỉ vẽ **1 thanh tại 1 thời điểm**, vị trí vẽ neo nổi (offset cố định số bar từ bar hiện tại), tách biệt khỏi phạm vi tính dữ liệu.
- Highlight 3 mức riêng biệt: POC (tổng buy+sell), Peak Buy (max buy), Peak Sell (max sell) — có thể trùng hàng, vẫn vẽ đủ 3.
- Mode không active thì không chạy phần tính nặng tương ứng (gate theo input "simple", đúng pattern đã dùng trong `order_flow_profile_panel.pine`).
- Code/comment mô tả bằng tiếng Việt, biến `snake_case`, input groups tiếng Việt, theo đúng CLAUDE.md (đặc biệt quy tắc scope: khai báo biến có kiểu ở đầu scope `for`/hàm, trước mọi `if`).
- File mới hoàn toàn → không cần backup `indicators/hist/`, version bắt đầu "Phiên bản: 1.0".
- Bắt buộc cập nhật `docs/order-flow-bar.md` (tạo mới) + thêm dòng vào `docs/README.md` trong cùng lần làm việc này (CLAUDE.md).

## Review Focus

- Bar đầu phiên/mới mở khi footprint hoặc SMC seed chưa sẵn sàng (`na`) — không được crash hoặc vẽ giá trị rác; phải coi như "chưa có dữ liệu" và không vẽ.
- `hl_bar`/`hh_bar` (hoặc `lh_bar`/`ll_bar`) còn `na` khi SMC chưa seed xong sau khi reseed đầu phiên — mode Last HL phải không vẽ gì (không lỗi index âm/`na` khi dùng làm biên quét).
- Khoảng cần dựng profile (leg Last HL dài, hoặc `vis_bars_n` lớn) vượt `max_lookback_bars` — phải clip đúng theo dung lượng buffer, không lỗi, không lệch hàng.
- Nến chưa đóng (`barstate.isconfirmed == false`) không được cộng vào buffer/accumulator Session — tránh repaint khi giá trị buy/sell của nến đang hình thành còn thay đổi. **Cách kiểm tra**: `run_pine_indicator` chỉ trả giá trị bar đã đóng nên không mô phỏng được intrabar tick qua MCP — việc này xác nhận bằng **review code** (reviewer của Task 4/5 phải thấy rõ `barstate.isconfirmed` bọc quanh lệnh `array.push`/gộp profile) thay vì chạy thử.
- Đổi input (`price_step`, mode, `vis_bars_n`, `max_lookback_bars`) khiến Pine tính lại toàn bộ lịch sử từ đầu — không có state nào "dính" sai giữa lần chạy cũ/mới (không dùng `var` lưu giá trị input cũ rồi so sánh nhầm).

---

## File Structure

Chỉ 1 file được tạo, phát triển dần qua các task (các section được đánh dấu bằng comment tiêu đề, theo đúng cấu trúc file trong CLAUDE.md: version → mô tả → import → indicator() → inputs → tính toán → plots → alerts):

- **Create:** `indicators/order_flow_bar.pine`
- **Create:** `docs/order-flow-bar.md` (Task cuối)
- **Modify:** `docs/README.md` (Task cuối)

---

### Task 1: Skeleton + toàn bộ Input

**Files:**
- Create: `indicators/order_flow_bar.pine`

**Interfaces:**
- Produces (biến input dùng cho mọi task sau — tên/kiểu CỐ ĐỊNH, các task sau chỉ đọc, không đổi tên):
  - `mode_calc` `string` — dropdown `options=["Visible Chart", "Session", "Last HL"]`, group "Phạm Vi Tính"
  - `price_step` `float` — input.float, group "Phạm Vi Tính"
  - `vis_bars_n` `int` — group "Phạm Vi Tính", dùng khi `mode_calc == "Visible Chart"`
  - `max_lookback_bars` `int` — defval 500, group "Phạm Vi Tính"
  - `pivot_length` `int`, `seed_mode` `string` (options `["Pivot Seed", "Session Seed"]`) — group "SMC (Last HL)"
  - `anchor_offset_bars` `int` — group "Hiển Thị"
  - `wing_max_bars` `int` — độ rộng tối đa (số bar) của cánh buyer/seller khi volume = max, group "Hiển Thị"
  - `buyer_color` `color`, `seller_color` `color` — group "Hiển Thị"
  - `poc_color`, `peak_buy_color`, `peak_sell_color` `color` — group "Hiển Thị"
  - `show_value_labels` `bool` — group "Hiển Thị"

- [ ] **Step 1: Viết file với header, `indicator(title="Order Flow Tổng", shorttitle="OF_BAR", overlay=true, max_lines_count=500, max_labels_count=500, max_boxes_count=500)`, toàn bộ input trên theo đúng nhóm, và 1 dòng `plot(na)` tạm để script hợp lệ.**

- [ ] **Step 2: Validate bằng `mcp-tv-validate-pine-script`.**

Expected: `valid: true`, không có `errors[]`.

- [ ] **Step 3: Commit.**

```bash
git add indicators/order_flow_bar.pine
git commit -m "feat: skeleton + inputs cho Order Flow Bar"
```

---

### Task 2: Footprint Tầng 1 + cờ `has_footprint_data`

**Files:**
- Modify: `indicators/order_flow_bar.pine`

**Interfaces:**
- Consumes: không (không phụ thuộc input Task 1 ngoài việc file đã có khung).
- Produces:
  - `fp` — kết quả `request.footprint(...)` (gọi đúng 1 lần, không đặt trong `if` phụ thuộc series).
  - `has_footprint_data` `bool` — `true` khi `fp`/`fp.rows()` không `na`/rỗng tại bar hiện tại đã xác nhận.

- [ ] **Step 1: Thêm `fp = request.footprint(ticks_per_row=1, va_percent=70, imbalance_percent=300)` (giá trị cố định, không expose input — tier 1 chỉ cần `fp.rows()`), và tính `has_footprint_data` kiểm tra `na`.**

Ghi chú cho người viết code: xác nhận chính xác tên hàm lấy danh sách row (`fp.rows()`) và field giá/buy/sell của mỗi row theo tài liệu Pine v6 built-in hiện hành trước khi dùng ở Task 3 — tên chính xác không được giả định sẵn trong plan này.

- [ ] **Step 2: Thêm tạm `plot(has_footprint_data ? 1 : 0, title="DEBUG_has_fp")`.**

- [ ] **Step 3: Validate bằng `mcp-tv-validate-pine-script`.**

Expected: `valid: true`.

- [ ] **Step 4: Chạy `run_pine_indicator` trên 1-2 symbol thường (ví dụ `NASDAQ:AAPL`, `BINANCE:BTCUSDT`) để xem `DEBUG_has_fp`.**

Expected: Nếu tài khoản MCP không có Premium, giá trị sẽ luôn `0` trên mọi symbol — ghi nhận là **không kết luận được qua MCP**, không coi là lỗi code. Nếu có bất kỳ symbol nào ra `1`, xác nhận cờ hoạt động đúng cơ chế.

- [ ] **Step 5: Yêu cầu người dùng xác nhận thủ công** — áp script vào `HNX:VN30F1!` trong Pine Editor của họ, xem `DEBUG_has_fp` ở Data Window phải ra `1`. Chỉ đánh dấu task hoàn tất sau khi có xác nhận này.

- [ ] **Step 6: Commit.**

```bash
git add indicators/order_flow_bar.pine
git commit -m "feat: them request.footprint tang 1 + co has_footprint_data"
```

---

### Task 3: Bucket volume buy/sell của 1 bar vào hàng `price_step`

**Files:**
- Modify: `indicators/order_flow_bar.pine`

**Interfaces:**
- Consumes: `fp` (Task 2), `price_step` (Task 1).
- Produces: hàm `f_bucket_bar_rows(fp, step) => [array<int> row_ids, array<float> buys, array<float> sells]` — `row_ids[i] = int(math.floor(row_price_i / step))` (số nguyên tuyệt đối, KHÔNG tương đối theo base động), cùng độ dài 3 mảng, 1 phần tử/hàng `price_step` mà bar đó có chạm tới (gộp nhiều row footprint rơi vào cùng 1 hàng `price_step`).

- [ ] **Step 1: Viết hàm `f_bucket_bar_rows` theo chữ ký trên — duyệt `fp.rows()`, với mỗi row tính `row_id`, nếu `row_id` đã có trong `row_ids` thì cộng dồn vào đúng vị trí, chưa có thì `array.push`.**

- [ ] **Step 2: Thêm debug: `[dbg_rows, dbg_buy, dbg_sell] = f_bucket_bar_rows(fp, price_step)`, `plot(array.sum(dbg_buy) - array.sum(dbg_sell), title="DEBUG_bucket_delta")`, `plot(fp.delta(), title="DEBUG_fp_delta")`.**

- [ ] **Step 3: Validate bằng `mcp-tv-validate-pine-script`.**

- [ ] **Step 4: Chạy `run_pine_indicator` (cùng ghi chú Task 2 về khả năng tài khoản MCP không có Premium) — kiểm tra `DEBUG_bucket_delta == DEBUG_fp_delta` (sai số làm tròn chấp nhận được, nếu có).** Nếu MCP không có dữ liệu footprint, chuyển sang xác nhận thủ công như Task 2 Step 5 (đối chiếu 2 giá trị debug bằng nhau trên `HNX:VN30F1!`).

- [ ] **Step 5: Commit.**

```bash
git add indicators/order_flow_bar.pine
git commit -m "feat: ham bucket buy/sell volume theo hang price_step"
```

---

### Task 4: Circular buffer lưu bucket theo bar

**Files:**
- Modify: `indicators/order_flow_bar.pine`

**Interfaces:**
- Consumes: `f_bucket_bar_rows` (Task 3), `max_lookback_bars` (Task 1).
- Produces:
  - `type BarRowVol` — fields `int bar_idx`, `array<int> row_ids`, `array<float> buys`, `array<float> sells`.
  - `var array<BarRowVol> of_buffer` — circular, giữ tối đa `max_lookback_bars` phần tử gần nhất (bar cũ nhất bị loại khi vượt).
  - Hàm `f_push_bar_buffer(buf, bar_idx, row_ids, buys, sells, cap) => void` (mutate `buf`: `array.push` phần tử mới, `array.shift` nếu `array.size(buf) > cap`).

- [ ] **Step 1: Định nghĩa `type BarRowVol` và `var array<BarRowVol> of_buffer = array.new<BarRowVol>()`.**

- [ ] **Step 2: Viết `f_push_bar_buffer`, gọi nó mỗi bar đã xác nhận (`barstate.isconfirmed`) với kết quả từ Task 3.**

- [ ] **Step 3: Thêm debug `plot(array.size(of_buffer), title="DEBUG_buffer_size")`.**

- [ ] **Step 4: Validate bằng `mcp-tv-validate-pine-script`.**

- [ ] **Step 5: Chạy `run_pine_indicator` trên symbol thường (không cần footprint — chỉ cần cơ chế push/cap chạy đúng dù giá trị buy/sell có thể toàn 0/na), `calc_bars_count` > `max_lookback_bars` mặc định (ví dụ 600), xem `DEBUG_buffer_size` ở các bar cuối.**

Expected: ổn định đúng bằng giá trị input `max_lookback_bars` (500) sau khi đã chạy đủ số bar, không vượt.

- [ ] **Step 6: Commit.**

```bash
git add indicators/order_flow_bar.pine
git commit -m "feat: circular buffer luu bucket volume theo bar"
```

---

### Task 5: Session accumulator (cộng dồn 1 chiều, reset mỗi ngày)

**Files:**
- Modify: `indicators/order_flow_bar.pine`

**Interfaces:**
- Consumes: `f_bucket_bar_rows` (Task 3) — KHÔNG cần buffer Task 4 (Session chỉ cộng tiến, không cần "nhớ lại").
- Produces:
  - `type RowProfile` — fields `array<int> row_ids`, `array<float> buys`, `array<float> sells` (cấu trúc dùng chung cho mọi mode từ đây — Task 7/8 đọc field này).
  - `var RowProfile sess_profile` — reset khi `timeframe.change("D")`.
  - Hàm `f_merge_into_profile(profile, row_ids, buys, sells) => void` (mutate `profile`: gộp hàng trùng, thêm hàng mới) — **tái dùng ở Task 7** cho rebuild từ buffer.

- [ ] **Step 1: Định nghĩa `type RowProfile`, `var RowProfile sess_profile = RowProfile.new(array.new<int>(), array.new<float>(), array.new<float>())`.**

- [ ] **Step 2: Viết `f_merge_into_profile` (logic gộp giống Task 3 nhưng input là 1 cặp row_ids/buys/sells bất kỳ, không riêng 1 bar).**

- [ ] **Step 3: Mỗi bar xác nhận: nếu `timeframe.change("D")` thì reset `sess_profile` về rỗng trước khi gộp; luôn gọi `f_merge_into_profile(sess_profile, ...)` với kết quả Task 3 của bar đó.**

- [ ] **Step 4: Thêm debug `plot(array.size(sess_profile.row_ids), title="DEBUG_sess_rows")` và `plot(array.sum(sess_profile.buys) + array.sum(sess_profile.sells), title="DEBUG_sess_total_vol")`.**

- [ ] **Step 5: Validate bằng `mcp-tv-validate-pine-script`.**

- [ ] **Step 6: Chạy `run_pine_indicator` trên symbol thường, khung `1D` nhiều ngày — kiểm tra `DEBUG_sess_total_vol` giảm về nhỏ (reset) ngay bar đầu mỗi ngày mới, không cộng dồn xuyên ngày.** (Giá trị tuyệt đối đúng/sai do thiếu footprint — chỉ cần xác nhận hành vi reset, không cần đúng số.)

- [ ] **Step 7: Commit.**

```bash
git add indicators/order_flow_bar.pine
git commit -m "feat: session accumulator cho Order Flow Bar"
```

---

### Task 6: SMC state machine với reseed mỗi phiên

**Files:**
- Modify: `indicators/order_flow_bar.pine`

**Interfaces:**
- Consumes: `pivot_length`, `seed_mode` (Task 1), `import mrdungx2603/smc_core/1 as smc`.
- Produces: `var smc.SwingState of_smc_state` — reseed mỗi phiên mới (khác bản gốc `smc_market_structure.pine` seed 1 lần xuyên suốt); sau khi xử lý bar, biên dùng cho Last HL:
  - Uptrend (`of_smc_state.trend == 1`): `[of_smc_state.hl_bar, of_smc_state.hh_bar]`
  - Downtrend (`of_smc_state.trend == -1`): `[of_smc_state.lh_bar, of_smc_state.ll_bar]`
  - Có thể `na` nếu chưa seed xong trong phiên — các task sau PHẢI kiểm tra `na` trước khi dùng.

- [ ] **Step 1: Thêm `import mrdungx2603/smc_core/1 as smc`, `var smc.SwingState of_smc_state = smc.f_init_state()`.**

- [ ] **Step 2: Mỗi phiên mới (`timeframe.change("D")`): `of_smc_state := smc.f_init_state()` rồi seed lại bằng `smc.f_seed_pivot`/`smc.f_seed_session` theo `seed_mode` (copy đúng pattern từ `indicators/smc_market_structure.pine` dòng seed, chỉ khác điểm kích hoạt là mỗi phiên thay vì 1 lần).**

- [ ] **Step 3: Mỗi bar (không phải bar reseed): `of_smc_state := smc.f_process_bar(of_smc_state)`.**

- [ ] **Step 4: Thêm debug `plot(of_smc_state.trend, title="DEBUG_smc_trend")`, `plot(na(of_smc_state.hl_bar) ? -1 : of_smc_state.hl_bar, title="DEBUG_hl_bar")`.**

- [ ] **Step 5: Validate bằng `mcp-tv-validate-pine-script`.**

- [ ] **Step 6: Chạy `run_pine_indicator` trên symbol thường nhiều ngày — xác nhận `DEBUG_hl_bar` (và tương tự `hh_bar`) không giữ giá trị từ phiên trước sang bar đầu phiên mới (phải về `-1`/`na` ngay sau mốc reseed, trước khi seed xong trở lại).**

- [ ] **Step 7: Commit.**

```bash
git add indicators/order_flow_bar.pine
git commit -m "feat: SMC state machine reseed moi phien cho mode Last HL"
```

---

### Task 7: Rebuild `RowProfile` từ buffer cho Last HL & Visible Chart

**Files:**
- Modify: `indicators/order_flow_bar.pine`

**Interfaces:**
- Consumes: `of_buffer` (Task 4), `f_merge_into_profile` + `RowProfile` (Task 5), biên SMC (Task 6), `vis_bars_n`/`max_lookback_bars` (Task 1).
- Produces: Hàm `f_build_profile_from_buffer(buf, left_bar, right_bar) => RowProfile` — quét `buf` (chỉ các phần tử có `bar_idx` trong `[left_bar, right_bar]`, tự nhiên bị clip nếu `left_bar` nằm ngoài phạm vi còn lưu trong `buf`), gộp bằng `f_merge_into_profile`. Trả `RowProfile` rỗng nếu `left_bar`/`right_bar` là `na` hoặc không có phần tử nào khớp.

- [ ] **Step 1: Viết `f_build_profile_from_buffer` theo chữ ký trên (duyệt tuyến tính `buf`, không cần tối ưu vì `buf` đã bị chặn bởi `max_lookback_bars`).**

- [ ] **Step 2: Tính biên leg từ Task 6 — `trend == 1`: `left_bar = of_smc_state.hl_bar`, `right_bar = of_smc_state.hh_bar`; `trend == -1`: `left_bar = of_smc_state.lh_bar`, `right_bar = of_smc_state.ll_bar`; `trend == 0` hoặc bất kỳ biên nào `na`: cả hai `na`. Tính `last_hl_profile = f_build_profile_from_buffer(of_buffer, left_bar, right_bar)` mỗi bar khi `mode_calc == "Last HL"` — hàm đã xử lý `na` → trả rỗng (Interfaces). KHÔNG dùng `bar_index` làm biên phải — leg đã hoàn thành kết thúc tại `hh_bar`/`ll_bar`, phần sau đó là candidate đang dò, phải loại trừ theo đúng spec.**

- [ ] **Step 3: Tính `vis_profile = f_build_profile_from_buffer(of_buffer, bar_index - vis_bars_n + 1, bar_index)` mỗi bar khi `mode_calc == "Visible Chart"`.**

- [ ] **Step 4: Thêm debug `plot(array.size(last_hl_profile.row_ids), title="DEBUG_lasthl_rows")`, tương tự cho `vis_profile`.**

- [ ] **Step 5: Validate bằng `mcp-tv-validate-pine-script`.**

- [ ] **Step 6: Chạy `run_pine_indicator` 3 lần: (a) `max_lookback_bars` nhỏ hơn `vis_bars_n` (ví dụ 10 vs 50) — xác nhận không lỗi, số hàng vẫn ra (bị clip, không rớt na/crash); (b) giá trị bình thường (500 vs 150) — xác nhận chạy không lỗi qua nhiều bar liên tiếp; (c) `mode_calc="Last HL"` chạy ngay từ đầu lịch sử nạp (vài bar đầu phiên đầu tiên, khi `of_smc_state` chưa seed xong) — xác nhận `last_hl_profile` rỗng (không crash, không `na` lan ra plot khác) đúng theo Review Focus "`hl_bar`/`hh_bar` còn `na`".**

- [ ] **Step 7: Commit.**

```bash
git add indicators/order_flow_bar.pine
git commit -m "feat: rebuild RowProfile tu buffer cho Last HL va Visible Chart"
```

---

### Task 8: Chọn profile theo mode + tính POC/Peak Buy/Peak Sell

**Files:**
- Modify: `indicators/order_flow_bar.pine`

**Interfaces:**
- Consumes: `RowProfile` từ Task 5 (`sess_profile`)/Task 7 (`last_hl_profile`, `vis_profile`), `mode_calc` (Task 1).
- Produces:
  - `active_profile` `RowProfile` — chọn theo `mode_calc` (gate: chỉ tính nhánh Task 5/6/7 tương ứng với mode đang chọn, bỏ qua 2 nhánh còn lại để nhẹ — dùng điều kiện "simple" theo đúng pattern `need_delta`/`need_tpo_grid` của `order_flow_profile_panel.pine`).
  - Hàm `f_calc_poc_peak(profile) => [int poc_row, int peak_buy_row, int peak_sell_row]` (pure, `na`-safe khi `profile` rỗng → trả `na` cho cả 3; `poc_row` = argmax(buy[i]+sell[i]), `peak_buy_row` = argmax(buy[i]), `peak_sell_row` = argmax(sell[i]), trả về **row_id** (giá trị tuyệt đối từ Task 3), không phải index mảng).

- [ ] **Step 1: Thêm logic gate chọn `active_profile` theo `mode_calc` (bỏ tính Task 6/7 khi `mode_calc != "Last HL"`, bỏ Task 7 nhánh Visible khi mode khác, v.v. — đặt các `if` gate ở đúng vị trí tính toán của Task 5/6/7 hiện có, không tính lại ở đây).**

- [ ] **Step 2: Viết `f_calc_poc_peak` theo chữ ký trên.**

- [ ] **Step 3: Thêm debug `plot(na(poc_row_id) ? -999999.0 : float(poc_row_id) * price_step, title="DEBUG_poc_price")` (nhân lại `price_step` để ra giá thật, dễ đối chiếu bằng mắt), tương tự cho peak buy/sell.**

- [ ] **Step 4: Validate bằng `mcp-tv-validate-pine-script`.**

- [ ] **Step 5: Chạy `run_pine_indicator`, thử cả 3 giá trị `mode_calc` qua `inputs` param — xác nhận không lỗi khi đổi mode, và `DEBUG_poc_price`/peak nằm trong khoảng giá hợp lý của symbol/khung đang chạy (sanity check biên độ, không cần đúng tuyệt đối do thiếu footprint thật).**

- [ ] **Step 6: Commit.**

```bash
git add indicators/order_flow_bar.pine
git commit -m "feat: chon profile theo mode + tinh POC/Peak Buy/Peak Sell"
```

---

### Task 9: Vẽ thanh buyer/seller (neo nổi, không highlight)

**Files:**
- Modify: `indicators/order_flow_bar.pine`

**Interfaces:**
- Consumes: `active_profile`, `anchor_offset_bars`, `wing_max_bars`, `buyer_color`, `seller_color` (Task 1/8).
- Produces: hàm vẽ `f_draw_wings(profile, anchor_bar, max_wing_bars, buy_color, sell_color) => void` — với mỗi hàng trong `profile`, vẽ 1 `box.new` sang phải (buyer, rộng tỷ lệ `buys[i]/max_total`) và 1 `box.new` sang trái (seller, tỷ lệ `sells[i]/max_total`), neo theo `xloc.bar_index` tại `anchor_bar = bar_index + anchor_offset_bars`. Xoá toàn bộ box cũ của thanh trước khi vẽ lại mỗi bar (dùng 1 `var array<box> of_boxes` thu thập để `box.delete` toàn bộ đầu mỗi lần vẽ).

- [ ] **Step 1: Thêm `var array<box> of_boxes = array.new<box>()`, hàm xoá `f_clear_boxes(boxes)` (`box.delete` từng phần tử rồi `array.clear`).**

- [ ] **Step 2: Viết `f_draw_wings` theo chữ ký trên; gọi `f_clear_boxes` trước, chỉ vẽ khi `has_footprint_data` (Task 2) và `array.size(active_profile.row_ids) > 0`.**

- [ ] **Step 3: Validate bằng `mcp-tv-validate-pine-script`.**

- [ ] **Step 4: Chạy `run_pine_indicator` — xác nhận không lỗi runtime qua nhiều bar liên tiếp (không check hình ảnh được qua MCP, chỉ check không crash + object count không vượt `max_boxes_count=500`).**

- [ ] **Step 5: Yêu cầu người dùng áp thử trên `HNX:VN30F1!` trong Pine Editor, xác nhận bằng mắt: thanh hiện bên phải/giữa chart, buyer bên phải/seller bên trái, không che candlestick quá mức.**

- [ ] **Step 6: Commit.**

```bash
git add indicators/order_flow_bar.pine
git commit -m "feat: ve thanh buyer/seller neo noi"
```

---

### Task 10: Highlight POC/Peak Buy/Peak Sell + nhãn số

**Files:**
- Modify: `indicators/order_flow_bar.pine`

**Interfaces:**
- Consumes: `poc_row_id`/`peak_buy_row_id`/`peak_sell_row_id` (Task 8), `poc_color`/`peak_buy_color`/`peak_sell_color`/`show_value_labels` (Task 1), `of_boxes` (Task 9, để biết style box nào cần đổi border/màu tại đúng hàng).
- Produces: cập nhật `f_draw_wings` (hoặc hàm mới `f_highlight_levels`) — tô viền/màu riêng cho box đúng `poc_row_id`/`peak_buy_row_id`/`peak_sell_row_id`; nếu `show_value_labels`, thêm `label.new` tại mỗi mức ghi `giá (format.mintick) + volume` (dùng `format.volume` built-in, không cần viết lại `f_format_delta` riêng).

- [ ] **Step 1: Trong `f_draw_wings`, khi `row_ids[i] == poc_row_id`/`peak_buy_row_id`/`peak_sell_row_id`, đặt `border_color`/`bgcolor` khác biệt theo đúng màu input tương ứng (nếu 1 hàng trùng nhiều mức, ưu tiên theo thứ tự POC > Peak Buy > Peak Sell cho viền, nhưng vẫn add đủ 3 label nếu `show_value_labels`).**

- [ ] **Step 2: Thêm nhãn số qua `label.new` khi `show_value_labels == true`, 1 label/mức (POC/Peak Buy/Peak Sell), text = giá + volume định dạng `format.volume`.**

- [ ] **Step 3: Validate bằng `mcp-tv-validate-pine-script`.**

- [ ] **Step 4: Chạy `run_pine_indicator` — xác nhận không lỗi, tổng số `label` không vượt `max_labels_count=500` (tối đa 3 label/bar, không tích lũy vì xoá-vẽ-lại mỗi bar).**

- [ ] **Step 5: Yêu cầu người dùng xác nhận bằng mắt trên `HNX:VN30F1!`: 3 mức highlight hiện đúng màu, nhãn số đọc được, không chồng lấp quá mức.**

- [ ] **Step 6: Commit.**

```bash
git add indicators/order_flow_bar.pine
git commit -m "feat: highlight POC/Peak Buy/Peak Sell + nhan so"
```

---

### Task 11: Dọn debug, hoàn thiện version header, tài liệu

**Files:**
- Modify: `indicators/order_flow_bar.pine`
- Create: `docs/order-flow-bar.md`
- Modify: `docs/README.md`

**Interfaces:** Không có interface mới — task đóng gói cuối cùng.

- [ ] **Step 1: Xoá toàn bộ `plot(..., title="DEBUG_*")` đã thêm ở Task 2/3/4/5/6/7/8.**

- [ ] **Step 2: Thêm header mô tả đầu file theo đúng cấu trúc CLAUDE.md (`//@version=6`, mô tả tiếng Việt, `// Phiên bản: 1.0`, ngày tạo).**

- [ ] **Step 3: Validate bằng `mcp-tv-validate-pine-script` lần cuối trên bản đã xoá debug.**

Expected: `valid: true`, không còn `DEBUG_*` nào trong output plots nếu chạy `run_pine_indicator` thử lại.

- [ ] **Step 4: Viết `docs/order-flow-bar.md` theo template chuẩn của repo (Tổng Quan, Tham Số Đầu Vào, Logic Chính, Output/Tín Hiệu, Giới Hạn & Lưu Ý — bao gồm rõ giới hạn clip buffer và yêu cầu Premium/footprint, Changelog v1.0).**

- [ ] **Step 5: Thêm 1 dòng cho `order_flow_bar.pine` vào bảng trong `docs/README.md`.**

- [ ] **Step 6: Yêu cầu người dùng chạy checklist "Kiểm Tra Script" cuối cùng theo CLAUDE.md (copy vào Pine Editor, áp lên chart `HNX:VN30F1!`, đổi timeframe kiểm tra không repaint, thử cả 3 `mode_calc`, thử đổi `price_step`/`vis_bars_n`/`max_lookback_bars` vài lần xem không lỗi/không lệch) và xác nhận bằng lời trước khi coi plan hoàn tất.**

- [ ] **Step 7: Commit.**

```bash
git add indicators/order_flow_bar.pine docs/order-flow-bar.md docs/README.md
git commit -m "docs: hoan thien Order Flow Bar v1.0 + don debug"
```
