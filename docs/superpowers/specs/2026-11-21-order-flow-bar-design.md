# Thiết Kế: Thanh Order Flow Tổng (Order Flow Bar)

> Ngày viết: 2026-11-21
> Trạng thái: Chờ duyệt (brainstorming xong, chưa viết plan/code)

## 1. Mục Đích & Lý Do

Người dùng (trader scalping M1) cần 1 widget overlay trên chart chính, hiển thị **volume profile chia buyer/seller** (không phải TPO) theo 3 phạm vi tính khác nhau (Visible Chart / Session / Last HL), để đọc nhanh vùng giá người mua/người bán gom mạnh nhất mà không cần mở pane riêng như `order_flow_profile_panel.pine` (panel đó là grid dạng cột theo thời gian, không phải 1 thanh profile tổng).

Đây là indicator **mới, tách biệt** khỏi `order_flow_profile_panel.pine` — không sửa file đó.

## 2. Goals

- 1 indicator overlay mới, vẽ **1 thanh profile duy nhất tại 1 thời điểm** (không vẽ cả 3 mode cùng lúc).
- Chọn phạm vi tính qua dropdown setting, 3 lựa chọn:
  1. **Visible Chart** — **N nến gần nhất** (N là input riêng, không dùng viewport pixel thật `chart.left_visible_bar_index`/`right_visible_bar_index` — xem lý do ở mục "Kiến Trúc Buffer Lịch Sử" bên dưới).
  2. **Session** — toàn bộ nến trong phiên hiện tại (reset theo ngày, theo đúng pattern `timeframe.change("D")` các indicator khác trong repo đang dùng).
  3. **Last HL** — đoạn giữa 2 pivot đã xác nhận gần nhất theo state machine SMC (`libraries/smc_core.pine`), loại trừ đoạn candidate đang dò tìm pivot mới chưa xác nhận. State machine SMC **tự reset mỗi phiên mới** (giống mốc reset của mode Session) — tránh 1 "sóng" kéo dài qua đêm/qua nhiều phiên.
- Chia lưới giá theo **bước giá cố định** (`price_step`, cùng kiểu input với `market_profile.pine`/`order_flow_profile_panel.pine`).
- Mỗi hàng giá có 2 giá trị: **volume mua** (vẽ sang phải, "buyer") và **volume bán** (vẽ sang trái, "seller"), tỷ lệ độ dài theo volume so với hàng lớn nhất.
- Màu buyer/seller là input riêng (tối thiểu 2 input màu).
- Highlight 3 mức:
  - **POC** = hàng có tổng volume (mua+bán) cao nhất.
  - **Peak Buy** = hàng có volume mua cao nhất.
  - **Peak Sell** = hàng có volume bán cao nhất.
  - 3 mức này có thể trùng hàng với nhau; vẫn vẽ cả 3 (không gộp nhãn).
- Buy/sell volume chỉ lấy từ **Tầng 1 `request.footprint()` / `fp.rows()`** — không fallback sang lower-timeframe hay xấp xỉ Chaikin.
- **Symbol không có dữ liệu footprint → toàn bộ indicator không vẽ gì** (không hiện thanh rỗng, không báo lỗi gây rối).
- Thanh **neo nổi, trôi theo chart**: vị trí vẽ (x) luôn cách 1 khoảng offset cố định tính từ nến hiện tại — **tách biệt** với phạm vi *tính* dữ liệu (Session/Last HL có thể nằm xa về bên trái, nhưng thanh vẫn vẽ gần nến hiện tại). Lý do: TF M1 nến sinh liên tục, neo cố định theo vị trí lịch sử sẽ trôi ra khỏi màn hình, trader phải tự cuộn lại — xem mục "Quyết Định Kỹ Thuật §1".

## 3. Non-Goals / Anti-Goals

- Không vẽ nhiều thanh cùng lúc (không có mode "hiện cả 3").
- Không fallback Tầng 2/3 cho buy/sell volume (khác hẳn `order_flow_profile_panel.pine`) — đây là lựa chọn **có chủ đích** của người dùng, không phải thiếu sót.
- Không tái tạo lại UI grid dạng cột theo thời gian của `order_flow_profile_panel.pine`.
- Không cần tách engine volume-profile buy/sell ra library riêng ở lần này (xem §6 "Để Lại Cho Người Viết Code") — chưa có script thứ 2 cần dùng lại, tránh trừu tượng hoá sớm (YAGNI).
- Thất bại nếu: thanh che khuất candlestick khó đọc, hoặc tính sai dẫn tới POC/peak lệch hàng khi đổi `price_step` giữa chừng (phải cố định xuyên suốt, giống `market_profile_core`).

## 4. Constraints (Ràng Buộc Kỹ Thuật Đã Biết)

- `request.footprint()` chỉ chạy được trên tài khoản Premium/Ultimate + sàn hỗ trợ tick-level (đã xác nhận `HNX:VN30F1!` chạy Tầng 1 "F" — xem `docs/order-flow-profile-panel.md`).
- `request.footprint()` chỉ gọi được **1 lần duy nhất** trong toàn script (giới hạn Pine) — không thể gọi lại cho nhiều phạm vi khác nhau; phải tính 1 lần/bar rồi tự tích luỹ vào 3 bộ dữ liệu khác nhau tuỳ mode đang chọn (hoặc chỉ tích luỹ cho mode đang active để nhẹ).
- `fp.rows()` trả về các hàng giá theo granularity nội bộ của footprint (`ticks_per_row` riêng của `request.footprint()`), **khác** `price_step` của indicator này → cần tự gộp (bucket) các hàng footprint vào đúng hàng `price_step` của mình (tương tự cách `market_profile_core.f_add_bar_tpo` gộp TPO vào lưới, nhưng ở đây gộp volume buy/sell thay vì đếm TPO).
- Giới hạn vẽ: `max_boxes_count`/`max_lines_count`/`max_labels_count` = 500 — nhưng vì chỉ vẽ 1 thanh tại 1 thời điểm (xoá vẽ lại mỗi bar), số lượng object không phải vấn đề lớn như panel cột-theo-thời-gian.
- `price_step` phải **cố định xuyên suốt** vì dùng kiểu tích luỹ incremental — đổi giữa chừng làm lệch hàng các bar đã cộng trước đó (bài học đã rút ra từ `order_flow_profile_panel.pine` v2.0, xem `docs/order-flow-profile-panel.md` mục "Thiết Kế: Dùng Chung Core Với Market Profile").
- `libraries/smc_core.pine` (`import mrdungx2603/smc_core/1 as smc`) đã có sẵn `SwingState`, `f_init_state`, `f_seed_pivot`/`f_seed_session`, `f_process_bar`. Indicator mới cần tự chạy 1 bản state machine riêng (như `smc_market_structure.pine` đang làm: `var smc.SwingState st = smc.f_init_state()`, seed 1 lần, `st := smc.f_process_bar(st)` mỗi bar) để biết `hl_bar`/`hh_bar` (uptrend) hoặc `lh_bar`/`ll_bar` (downtrend) cho mode Last HL — nhưng ở đây phải **re-seed mỗi phiên mới** (khác bản gốc chạy xuyên suốt lịch sử), xem §5.6.
- **(Phát hiện khi review thiết kế)** Kiểu tích luỹ "chỉ cộng dồn một chiều" (giống `mpcore.f_add_bar_tpo`) CHỈ đúng cho mode Session (biên trái cố định đầu phiên, chỉ mở rộng). Mode **Last HL** có biên trái (`hl_bar`/`lh_bar`) **nhảy tới vị trí mới** mỗi khi 1 pivot mới được xác nhận — dữ liệu buy/sell của các bar trong đoạn mới đó đã "trôi qua" trước khi biết chắc đoạn này sẽ là "Last HL". Mode **Visible Chart** (nay = N nến gần nhất) cũng cần tổng hợp lại một khoảng N nến mỗi bar. Cả 2 mode này **không thể chỉ cộng dồn tiến** — phải lưu lại lịch sử buy/sell theo từng bar/hàng giá để tính lại (rebuild) khi biên thay đổi. Xem "Kiến Trúc Buffer Lịch Sử" trong §6.

## 5. Quyết Định Kỹ Thuật Đã Chốt (trong lúc brainstorm + sau review)

1. **Neo vị trí nổi, tách khỏi phạm vi tính** — thanh luôn vẽ ở 1 offset cố định (số bar) tính từ bar hiện tại, tự trôi theo mỗi bar mới, bất kể mode đang chọn tính dữ liệu từ đâu trong lịch sử. (Đề xuất của Claude, người dùng đã đồng ý.)
2. **`price_step` cố định** — không dùng số-hàng-cố-định, đúng pattern đã có trong repo.
3. **Chỉ Tầng 1 footprint, không fallback** — người dùng chủ động chọn, hiểu rõ hệ quả (một số symbol sẽ không hiện gì).
4. **Last HL = đoạn giữa 2 pivot xác nhận gần nhất của SMC state machine**, loại trừ candidate đang hình thành — người dùng xác nhận đúng ý.
5. **3 mức highlight riêng: POC (tổng), Peak Buy (riêng volume mua), Peak Sell (riêng volume bán)** — ý tưởng do Claude đề xuất khi được yêu cầu brainstorm, người dùng đồng ý dùng.
6. **(Sau review) "Visible Chart" = Last N bars, không phải viewport pixel thật** — tránh Pine bị buộc tính lại toàn script mỗi lần zoom/cuộn chart (`chart.left_visible_bar_index`/`right_visible_bar_index` kích hoạt recalculation), và tránh quét hàng nghìn bar khi zoom ra xa. N là input riêng.
7. **(Sau review) Buffer lịch sử giới hạn qua input, không cố định cứng** — thêm input "Số nến lưu tối đa" (mặc định 500) quyết định dung lượng buffer dùng để rebuild Last HL/Visible Chart (xem §6).
8. **(Sau review) State machine SMC reset mỗi phiên mới** (giống mốc reset Session) — đảm bảo "Last HL" luôn nằm trong phiên hiện tại, nhất quán với Session, và bound độ dài đoạn cần lưu trong buffer.

## 6. Để Lại Cho Người Viết Code (Minor Calls — Claude tự quyết, ghi chú lại để người dùng soát khi review)

- **Tên file & tiêu đề**: `indicators/order_flow_bar.pine`, `indicator(title="Order Flow Tổng", shorttitle="OF_BAR", overlay=true)`. Doc con: `docs/order-flow-bar.md` + thêm dòng vào `docs/README.md` (bắt buộc theo CLAUDE.md).
- **Input groups** (theo đúng convention CLAUDE.md, tiếng Việt):
  - "Phạm Vi Tính" — dropdown mode (Visible Chart / Session / Last HL), `price_step`, "Số Nến Visible Chart" (N, chỉ dùng khi mode = Visible Chart), "Số Nến Lưu Tối Đa" (capacity buffer lịch sử, mặc định 500 — xem "Kiến Trúc Buffer Lịch Sử" dưới).
  - "SMC (Last HL)" — seed mode/pivot length cho state machine, chỉ cần khi mode = Last HL (gate tính toán khi không chọn mode này để nhẹ).
  - "Hiển Thị" — offset bar neo vị trí, độ rộng tối đa (bar) của cánh buyer/seller khi volume = max, màu buyer, màu seller, màu/kiểu highlight POC/Peak Buy/Peak Sell, toggle hiện nhãn số (volume mua/bán/delta tại từng mức).
- **Cơ chế gộp hàng footprint → `price_step`**: với mỗi bar, lấy `fp.rows()`, với mỗi row footprint tính hàng `price_step` tương ứng (`math.floor((row_price - base) / price_step)`), gộp buy/sell volume của row đó vào đúng hàng **tương đối trong 1 bar** (1 bar có thể chạm nhiều hàng `price_step` nếu range bar rộng hơn 1 step).

### Kiến Trúc Buffer Lịch Sử (quyết định sau review thiết kế)

Vì Session dùng kiểu cộng-dồn-một-chiều (đủ, có mốc reset rõ ràng), còn **Visible Chart (N nến)** và **Last HL (biên trái nhảy theo pivot)** cần "quên" dữ liệu cũ ngoài phạm vi mới và "nhớ lại" dữ liệu bar đã qua — cả 2 cần 1 cơ chế chung:

- Mỗi bar đã đóng (`barstate.isconfirmed`), lưu **phân bổ buy/sell theo hàng `price_step`** của riêng bar đó vào 1 circular buffer (UDT, ví dụ `BarRowVol { array<int> row_offset, array<float> buy, array<float> sell }`), dung lượng giới hạn bởi input "Số Nến Lưu Tối Đa" (mặc định 500 — đủ cho ~1 phiên HOSE M1 (~280 nến) + biên an toàn cho Last HL/Visible Chart).
- Khi cần dựng profile cho **Last HL**: xác định `[hl_bar, hh_bar]` (hoặc `[lh_bar, ll_bar]`) từ `SwingState`, duyệt buffer trong khoảng đó (clip nếu vượt capacity — ghi rõ trong docs là giới hạn đã biết) và cộng dồn vào mảng hàng `price_step` tổng.
- Khi cần dựng profile cho **Visible Chart**: duyệt N bar gần nhất trong buffer (N ≤ capacity, nếu N input lớn hơn capacity thì clip theo capacity, cảnh báo trong docs).
- Buffer chỉ cần rebuild lại khi: đổi mode, pivot SMC mới xác nhận (Last HL), hoặc mỗi bar mới (Visible Chart luôn trượt cửa sổ) — **không cần rebuild mode đang không active** (chỉ tính cho mode đang chọn, giống nguyên tắc "ẩn thì bỏ qua tính toán" đã dùng trong `order_flow_profile_panel.pine`).
- Giới hạn đã biết (ghi vào docs khi hoàn thành): nếu leg "Last HL" hoặc N của "Visible Chart" vượt quá "Số Nến Lưu Tối Đa", phần vượt sẽ bị bỏ qua (clip) — anh cần tăng input này nếu dùng timeframe/symbol có sóng dài hơn mặc định.
- **Phát hiện "không có dữ liệu footprint"**: kiểm tra giá trị trả về của `request.footprint()`/`fp.rows()` là `na`/rỗng liên tục (ví dụ tại bar mới nhất đã xác nhận) → set 1 cờ `has_footprint_data`, gate toàn bộ vẽ (không chỉ ẩn, để không tốn tính toán khi chắc chắn symbol không hỗ trợ).
- **Session reset**: dùng `timeframe.change("D")` như các indicator khác trong repo (không thêm logic giờ giao dịch VN riêng trừ khi người dùng yêu cầu sau).
- **Vẽ**: dùng `line.new`/`box.new` với `xloc.bar_index`, xoá object cũ và vẽ lại mỗi bar (vì chỉ có 1 cụm, chi phí thấp) — nhất quán lý do kỹ thuật với cách `order_flow_profile_panel.pine` chọn `bar_index` thay vì `bar_time` (tránh lệch khi chart ở chế độ Volume Candles).
- **Nhãn số**: hiện giá + volume mua/bán tại POC/Peak Buy/Peak Sell qua `label.new`, định dạng gọn (`format.volume` hoặc hàm tự viết như `f_format_delta` đã có trong panel cũ, tái dùng ý tưởng — không import vì khác file).
- **Version & backup**: vì là file mới hoàn toàn, không cần backup `indicators/hist/` cho bản đầu (chỉ backup khi *sửa* file đã tồn tại) — bắt đầu từ "Phiên bản: 1.0".
- **Không tách engine ra library mới** ở lần này (xem Non-Goals).

## 7. Việc Tiếp Theo

Sau khi người dùng duyệt bản thiết kế này → chuyển sang `superpowers:writing-plans` để viết plan chi tiết (các bước implement, thứ tự: state machine Last HL → engine tích luỹ volume theo footprint → vẽ thanh → highlight POC/Peak → input/UI → docs) rồi thực thi theo `superpowers:executing-plans` hoặc `superpowers:subagent-driven-development`.
