# Anchor Reversal VN30F (1m) — Tài Liệu Thiết Kế & Quy Trình

> **Script**: [indicators/anchor_reversal_vn30f.pine](../indicators/anchor_reversal_vn30f.pine) (v1.1)
> **Loại**: Indicator (overlay), chỉ cảnh báo đảo chiều, không đặt lệnh
> **Pine Script**: v6
> **Sản phẩm**: VN30F1M, khung thực thi 1m, bước giá 0.1 điểm
> **Nguồn đặc tả**: `c_t_k_thu_t_indicator_o_chi_u_smc_vn30f_1m.md` (tài liệu gốc, đã đối chiếu với repo)
> **Trạng thái**: Chính thức v1.1. Code đã biên dịch thành công trên TradingView (0 lỗi). Chưa kiểm chứng hành vi trên chart thật.
> **Ngày tạo**: 2026-11-26

---

## Mục Lục

1. [Mục Tiêu & Phạm Vi](#1-mục-tiêu--phạm-vi)
2. [Phiên Giao Dịch, Killzone & Cutoff](#2-phiên-giao-dịch-killzone--cutoff)
3. [Chỉ Số Nền](#3-chỉ-số-nền)
4. [Nến Chủ Loại Thân (BODY Anchor)](#4-nến-chủ-loại-thân-body-anchor)
5. [Nến Chủ Loại Hấp Thụ (ABS Anchor)](#5-nến-chủ-loại-hấp-thụ-abs-anchor)
6. [Gộp Nến Chủ (Anchor Chain)](#6-gộp-nến-chủ-anchor-chain)
7. [Xác Nhận Đảo Chiều & Vô Hiệu Hoá](#7-xác-nhận-đảo-chiều--vô-hiệu-hoá)
8. [Hiển Thị Trên Chart](#8-hiển-thị-trên-chart)
9. [Alerts](#9-alerts)
10. [Tham Khảo Entry/SL/TP & Thống Kê](#10-tham-khảo-entrysltp--thống-kê)
11. [Tham Số Đầu Vào](#11-tham-số-đầu-vào)
12. [Thay Đổi So Với Đặc Tả Gốc](#12-thay-đổi-so-với-đặc-tả-gốc)
13. [Quy Trình Sử Dụng Khi Giao Dịch](#13-quy-trình-sử-dụng-khi-giao-dịch)
14. [Quy Trình Phát Triển & Kiểm Chứng](#14-quy-trình-phát-triển--kiểm-chứng)
15. [Câu Hỏi Còn Mở](#15-câu-hỏi-còn-mở)

---

## 1. Mục Tiêu & Phạm Vi

### Mục tiêu
Cảnh báo sớm khi xuất hiện dấu hiệu đảo chiều theo cấu trúc SMC, cụ thể là một nến nỗ lực lớn (volume đột biến) bị "loại trừ" (giá không đi được tương xứng), rồi được xác nhận bằng việc giá đóng cửa vượt qua vùng nến đó.

### Trong phạm vi v1.0
- Nhận diện nến chủ hai loại: **BODY** (thân lớn, theo đặc tả) và **ABS** (hấp thụ, nỗ lực bị loại trừ theo Wyckoff).
- Gộp chuỗi nến chủ cùng chiều theo quy tắc cụ thể ở mục 6.
- Xác nhận đảo chiều bằng close vượt vùng nến chủ, tuỳ chọn thêm MSS (CHoCH từ `smc_core`).
- Killzone, cutoff 14:20, ghi nhãn Tier.
- Hộp vùng, đường trigger, nhãn tín hiệu, bảng dashboard, 3 alert.
- Tham khảo Entry/SL/TP và thống kê kết quả tín hiệu (RR, điểm thắng/thua).

### Ngoài phạm vi v1.0
- Chế độ vào lệnh limit tại FVG hoặc 50% thân (đặc tả mục 6.1). Bỏ qua, làm sau.
- Strategy backtest. Indicator không dùng `strategy.*`.
- Đặt lệnh tự động.
- Nến chủ dựa trên PDH/PDL và Morning H/L như điều kiện bắt buộc. Chỉ dùng làm nhãn tăng điểm (xem mục 5.3).

---

## 2. Phiên Giao Dịch, Killzone & Cutoff

### 2.1 Múi giờ
Toàn bộ tính giờ dùng `Asia/Ho_Chi_Minh` (UTC+7).

### 2.2 Bar bị loại khỏi phép tính ATR và SMA Volume
- Bar `09:00` (ATO): không tính vào ATR, SMA Volume, percentile volume. Không được nhận là nến chủ.
- Bar `14:45` (ATC): không tính vào các chỉ số trên. Không bao giờ là nến chủ vì nằm sau cutoff.

Lý do: hai bar này là phiên khớp lệnh định kỳ, biên độ và khối lượng không phản ánh giao dịch liên tục, nên làm lệch ATR và SMA cả phiên.

### 2.3 Killzone và Tier
| Khung giờ | Tier | Ý nghĩa |
|---|---|---|
| 09:00–09:14 | Tier 2 (rủi ro cao) | Rổ VN30 cơ sở chưa khớp liên tục. Tín hiệu được gắn nhãn cảnh báo. |
| 09:15–10:30 | Tier 1 | Killzone sáng. Dòng tiền thật tham gia. |
| 10:31–11:30 | Tier 2 | Thanh khoản thấp hơn. |
| 13:00–13:29 | Tier 2 | Ngay sau nghỉ trưa, thanh khoản thấp. |
| 13:30–14:20 | Tier 1 | Killzone chiều. Thường có quét thanh khoản hai đầu trước khi định hình xu hướng cuối ngày. |

Ngoài các khung trên (11:30–13:00 nghỉ trưa, sau 14:20) không phát tín hiệu.

### 2.4 Cutoff
- **Không phát tín hiệu mới sau 14:20** (đã chốt).
- Tín hiệu đã phát trước 14:20 vẫn được theo dõi xác nhận nếu cửa sổ xác nhận (mục 7) còn hiệu lực. Cửa sổ không kéo dài quá 14:20 để tránh xác nhận sát ATC.
- Hộp vùng và trade setup (nếu bật mục 10) tự kết thúc tại 14:25.

### 2.5 Lọc theo Tier **[CHỜ CHỐT — câu 4]**
Đề xuất: tín hiệu Tier 2 vẫn hiển thị nhưng gắn nhãn `[T2]`. Tham số `Chỉ cảnh báo Killzone` (mặc định bật) sẽ chỉ bắn alert cho Tier 1.

---

## 3. Chỉ Số Nền

### 3.1 ATR(20) hợp lệ
- Tính bằng RMA của True Range trên các bar hợp lệ (loại mục 2.2).
- Bar không hợp lệ không cập nhật ATR, giữ giá trị của bar hợp lệ trước đó.
- Đây là ATR(20), khác ATR(14) trong `wyckoff_evr.pine`. Xem mục 12.

### 3.2 SMA Volume(20) hợp lệ
Trung bình 20 bar hợp lệ gần nhất.

### 3.3 Sàn volume động (thay cho 1,500 HĐ cố định)
Sàn volume không được hard-code. Nó là một hàm trong script, tính từ phân phối volume thực của chính mã đang xem:

```
vol_floor = phân vị q của volume các bar hợp lệ trong L phiên gần nhất
```

- Cửa sổ lưu tối đa `L × 255` bar hợp lệ. Bar 09:00 và 14:45 không đưa vào cửa sổ.
- Cần ít nhất một phiên đầy đủ (255 bar) mới tính được sàn. Trước đó sàn là `na` và không có nến chủ nào.
- Sàn được tính lại ở mỗi bar hợp lệ đã đóng.

| Tham số | Mặc định | Ghi chú |
|---|---|---|
| `i_volPctile` (q) | 90 | Input trong setting. Chọn lại sau khi đo dữ liệu thật. |
| `i_volSessions` (L) | 20 | Input trong setting. Số phiên dùng để tính phân vị. |

Giá trị mặc định chưa có số liệu kiểm chứng. Khi chạy trên chart, người dùng đo số tín hiệu và phân phối volume thật rồi chỉnh q, L (mục 14.1).

---

## 4. Nến Chủ Loại Thân (BODY Anchor)

Một bar là **BODY anchor** khi thoả đồng thời 4 điều kiện:

| # | Điều kiện | Công thức | Lý do |
|---|---|---|---|
| C1 | Thân động | `body > ATR(20) × 1.8` | Thân lớn so với biến động trung bình. |
| C2 | Thân sàn cứng | `body ≥ 1.5 điểm` | Loại nhiễu giờ trưa khi ATR chỉ còn 0.3–0.4 điểm. |
| C3 | Dứt khoát | `body / (high − low) ≥ 0.65` | Không phải doji hay pinbar. |
| C4 | Đột biến volume | `volume ≥ SMA(volume, 20) × 2.0` **và** `volume ≥ vol_floor` | Có nỗ lực lớn, theo cả tương đối lẫn tuyệt đối. |

- `body = |close − open|`.
- BODY anchor **giảm** khi `close < open`. BODY anchor **tăng** khi `close > open`.
- Điều kiện C2 vẫn là số điểm tuyệt đối. Đây là số gắn với bước giá VN30F, không phải volume, nên giữ nguyên (xem mục 12).

---

## 5. Nến Chủ Loại Hấp Thụ (ABS Anchor)

### 5.1 Ý nghĩa
Nỗ lực bị loại trừ: volume lớn nhưng nến không đi xa. Đây là dấu hiệu lực bán (hoặc mua) đang bị hấp thụ. Trong Wyckoff, đây là Stopping Volume (SV) hoặc No Demand / No Supply (ND/NS), đã định nghĩa trong `docs/wyckoff-evr.md`.

### 5.2 Điều kiện
ABS anchor **giảm** (tín hiệu đáy, chờ Long) khi bar thoả đồng thời:

| # | Điều kiện | Công thức |
|---|---|---|
| A1 | Nỗ lực | `volume ≥ SMA(volume, 20) × 2.0` **và** `volume ≥ vol_floor` (như C4) |
| A2 | Kết quả bị khoá | `(high − low) ≤ ATR(20) × 0.7` |
| A3 | Quét thanh khoản | `low < swing_low` gần nhất (từ `smc_core`, khung 1m) |
| A4 | Đóng cửa phục hồi | `(close − low) / (high − low) ≥ 0.5` |

- ABS anchor **tăng** (tín hiệu đỉnh, chờ Short) đối xứng: `high > swing_high`, `(high − close) / (high − low) ≥ 0.5`.
- A2 và C3 loại trừ lẫn nhau: thân ≥ 1.8 ATR thì range ≥ 1.8 ATR, không thể ≤ 0.7 ATR. Một bar không thể vừa là BODY vừa là ABS.
- Ngưỡng `0.7` lấy từ `wyckoff_evr.pine` (ngưỡng Spread Thấp), giữ cùng ngưỡng để không lệch khái niệm.

### 5.3 Điều kiện nhãn tăng điểm (không bắt buộc)
Khi anchor có quét PDH/PDL hoặc Morning High/Low trong cùng bar, nhãn thêm `[SWEEP]`. Cần tính PDH/PDL theo ngày và Morning H/L (đỉnh/đáy 09:00–11:30) bằng accumulator reset theo phiên, tương tự `order_flow_bar.pine`.

Đã chốt: A3 bắt buộc (input `i_absRequireSweep`, mặc định bật).

---

## 6. Gộp Nến Chủ (Anchor Chain)

Đây là phần quy tắc cụ thể nhất. Một **chuỗi (chain)** gồm các anchor cùng chiều, nối tiếp nhau theo thời gian. Mỗi chain có một vùng `zone_high`, `zone_low`.

### 6.1 Điều kiện để anchor mới được gộp vào chain đang mở

Anchor mới cùng chiều với chain phải thoả **tất cả** các điều kiện sau:

| # | Điều kiện | Giá trị mặc định | Ghi chú |
|---|---|---|---|
| G1 | Khoảng cách | Số bar xen giữa anchor cũ và anchor mới ≤ **2** | Quá 2 bar không có nến chủ thì chain đóng, bắt đầu chain mới. |
| G2 | Không đảo chiều giữa chừng | Không có bar nào xen giữa đóng cửa **trên** `zone_high` (chain giảm) | Nếu giá đã đóng trên vùng, đây là phản ứng, không phải tiếp diễn. |
| G3 | Không có FVG tăng xen giữa | Số bullish FVG hình thành trong khoảng giữa 2 anchor = **0** | FVG tăng xen giữa là dấu hiệu bên mua đang vào, chain chưa hoàn tất. |
| G4 | FVG giảm xen giữa | Số bearish FVG ≤ **2** | Cho phép nhịp đẩy liên tục. Quá 2 thì coi là chuỗi đã chạy xa, không gộp. |
| G5 | Râu dưới anchor mới | `(min(open, close) − low) / (high − low) ≤ 0.15` | Nến mới phải đóng sát đáy. Râu dưới dài là phục hồi, không gộp. |
| G6 | Mở rộng | Anchor mới phải có `low < zone_low` **hoặc** body của nó nằm trong `[zone_low, zone_high]` | Phá đáy thì mở rộng vùng. Nằm trong vùng thì củng cố. Không phá và không nằm trong vùng thì không gộp. |
| G7 | Giới hạn | Tối đa **4** anchor mỗi chain | Chặn chain vô hạn. |

Nếu bất kỳ điều kiện nào không đạt, chain hiện tại kết thúc. Nến mới (nếu là anchor) bắt đầu chain mới.

### 6.2 Định nghĩa FVG xen giữa
Dùng đúng định nghĩa trong `smc_core` và `docs/smc-market-structure.md`:
- FVG tăng tại bar `i`: `low[i] > high[i−2]` **và** `close[i−1] > high[i−2]`.
- FVG giảm tại bar `i`: `high[i] < low[i−2]` **và** `close[i−1] < low[i−2]`.

Chỉ đếm FVG có bar `i` nằm trong khoảng từ anchor cũ đến anchor mới.

### 6.3 Cập nhật vùng khi gộp
- `zone_low = min(low của mọi anchor trong chain)`.
- `zone_high = high của anchor có low thấp nhất` (mặc định, theo đặc tả).
- Tuỳ chọn `i_zoneMode = "Anchor cực trị"` hoặc `"Anchor đầu tiên"`. Chế độ "Anchor đầu tiên" giữ cạnh đối diện của anchor đầu chain, cho vùng chặt hơn khi chain dài.
- Mỗi lần gộp, bộ đếm nến chờ xác nhận được reset về 0 (mục 7.1).

### 6.4 Ví dụ minh hoạ (chain giảm)
```
Bar 10: BODY giảm, low 1300.0, high 1302.5  → chain mới, zone = [1300.0, 1302.5]
Bar 11: không phải anchor, close 1300.8     → G2 OK (không đóng trên 1302.5)
Bar 12: BODY giảm, low 1298.5, high 1300.6  → G1 OK (1 bar xen), G6 OK (low < 1300.0)
        → gộp. zone_low = 1298.5, zone_high = high bar 12 = 1300.6 (mode mặc định)
Bar 13: ABS giảm → không gộp vào chain BODY (xem 6.5), chain ABS mới bắt đầu.
```

### 6.5 Trộn BODY và ABS trong một chain
Đã chốt: chain chỉ gộp cùng loại anchor. Một BODY giảm và một ABS giảm liền nhau sẽ tạo hai chain độc lập, vì hai loại có ý nghĩa khác nhau. Nếu cho trộn, nhãn chain ghi cả hai loại.

### 6.6 Vòng đời chain
- **Mở**: anchor đầu tiên đạt điều kiện.
- **Mở rộng**: anchor mới thoả G1–G7.
- **Đóng**: chain bị vô hiệu theo mục 7.3, hoặc đã xác nhận đảo chiều theo mục 7.2.

---

## 7. Xác Nhận Đảo Chiều & Vô Hiệu Hoá

### 7.1 Không có cửa sổ theo số nến
Chain không hết hạn theo số bar. Thay vào đó, chain được xử lý bằng điều kiện giá ở mục 7.3. Đặc tả gốc ghi "tối đa 5 nến", đã bỏ theo yêu cầu. Input `i_confirmBars` đã xoá.

### 7.2 Xác nhận

**Đảo chiều tăng** (chain giảm, chờ Long):
- Trong cửa sổ, có bar đóng cửa: `close ≥ zone_high + 0.2`.
- Nếu bật MSS: đồng thời có CHoCH tăng (`SwingState.event == −2`, tức đóng vượt LH gần nhất) trong cùng cửa sổ.

**Đảo chiều giảm** (chain tăng, chờ Short), đối xứng:
- `close ≤ zone_low − 0.2`.
- Nếu bật MSS: `SwingState.event == 2` (CHoCH giảm).

Xác nhận chỉ tính trên bar đã đóng (`barstate.isconfirmed`), không repaint.

Trigger line = `zone_high + 0.2` (đảo chiều tăng) hoặc `zone_low − 0.2` (đảo chiều giảm).

### 7.3 Vô hiệu hoá
- Nến **đóng cửa** ngoài vùng về phía tiếp diễn thì chain bị vô hiệu ngay:
  - Chain giảm: đóng dưới `zone_low`.
  - Chain tăng: đóng trên `zone_high`.
- Đóng ngoài vùng về phía xác nhận (chain giảm đóng trên `zone_high` + buffer, chain tăng đóng dưới `zone_low` − buffer) là xác nhận đảo chiều, không vô hiệu.
- Bóng nến (high/low) vượt vùng không vô hiệu chain. Chỉ giá đóng cửa mới tính.
- Momentum (mục 11b) dùng cùng nguyên tắc: đóng cửa ngoài vùng về phía ngược thì tiêu diệt.
- Close phá sâu hơn vùng (`close < zone_low` với chain giảm, hoặc `close > zone_high` với chain tăng) và không thoả G6 → chain vô hiệu.
- Chain đã vô hiệu không cảnh báo lại.

### 7.4 Thông tin trạng thái
Bảng dashboard hiển thị: `IDLE`, `CHAIN n/4 (BODY|ABS)`, `WAITING CONFIRM (còn k bar)`, `CONFIRMED`, `INVALIDATED`.

---

## 8. Hiển Thị Trên Chart

1. **Đường H/L của chain** (`line`): hai đường ngang tại đỉnh (H) và đáy (L) của vùng chain. Đường bắt đầu từ bar anchor đầu tiên và kéo dài đến nến hiện tại. Kiểu đường chọn bằng `i_lineStyle`. Không vẽ hộp, để tránh trùng với các indicator khác.
2. **Kết thúc đường**: khi chain hoặc momentum kết thúc, chỉ giữ đường phía bị phá vỡ, bỏ đường còn lại.
   - **Valid** (xác nhận đảo chiều hoặc momentum bị triệt tiêu): nét đứt, có chữ x căn giữa đoạn, kéo đến nến kết thúc. Giữ High nếu đóng trên vùng, Low nếu đóng dưới vùng.
   - **Invalid** (chain bị vô hiệu vì nến đóng ngoài vùng phía tiếp diễn): nét liền, không có x, kéo đến nến kết thúc. Giữ High nếu đóng trên vùng, Low nếu đóng dưới vùng.
   - Chain bị thay bởi anchor khác: dừng cả hai đường tại nến đó, không đánh dấu.
   - Màu line theo hướng: LONG = `i_colLong` (mặc định xanh), SHORT = `i_colShort` (mặc định đỏ). Chain giảm (chờ Long) và momentum tăng dùng LONG.
3. **Signal Label** (`label`): `LONG [BODY]` hoặc `LONG [ABS] [SWEEP] [T1]`. Có chỉ số `×n` khi chain gộp n anchor.
4. **Trade Reference Box** (chỉ khi bật mục 10): vùng Entry, SL, TP1, TP2. Tự đóng khi giá chạm SL, TP2, hoặc đến 14:25.
5. **Dashboard** (góc phải trên): trạng thái, khung giờ/Tier, ATR(20), SMA Volume, vol_floor hiện tại, PDH/PDL, Morning H/L, bảng thống kê (mục 10.3).

Quota: giới hạn 500 box, 500 line, 500 label. Dùng FIFO khi vượt, giống `smc_market_structure.pine`.

---

Chế độ hiển thị của chain chọn bằng `i_vizMode`. Momentum có setting riêng `i_momVizMode` và `i_momLineStyle` (nhóm 7), dùng cùng quy tắc kết thúc:
- **Line** (mặc định): hai đường High và Low như mô tả ở trên.
- **Box**: một hộp từ High đến Low, kéo dài đến nến hiện tại. Khi kết thúc: valid thì viền nét đứt, invalid thì viền nét liền. Chế độ Box không có chữ x. Momentum cũng dùng chung quy tắc.

Tuỳ chọn `i_hideInvalid` (mặc định tắt): khi bật, chain hoặc momentum kết thúc mà không xác nhận sẽ bị xoá khỏi chart. Gồm chain bị vô hiệu do nến đóng ngoài vùng phía tiếp diễn, và chain bị thay bởi anchor khác. Chain valid (xác nhận đảo chiều) và momentum bị tiêu diệt vẫn hiển thị. Áp dụng cho cả BODY, ABS và momentum.

## 9. Alerts

| Alert | Điều kiện |
|---|---|
| `Anchor Detected` | Có anchor mới hoặc chain được gộp thêm anchor (cảnh báo sớm). |
| `Bullish Reversal Confirmed` | Xác nhận đảo chiều tăng. Nội dung kèm Entry tham khảo, SL, TP1, TP2. |
| `Bearish Reversal Confirmed` | Xác nhận đảo chiều giảm. Nội dung đối xứng. |

Cả 3 alert chỉ bắn trên bar đã đóng và không bắn sau 14:20. Nếu bật mục 2.5 thì chỉ bắn cho Tier 1.

---

## 10. Tham Khảo Entry/SL/TP & Thống Kê

Phần này chỉ để tham khảo, mặc định tắt. Bạn bật khi muốn xem thống kê.

### 10.1 Công thức tham khảo
- **Entry tham khảo**: giá đóng cửa của bar xác nhận (không dùng limit FVG, đã bỏ qua).
- **SL**: `zone_low − 0.5` (Long) hoặc `zone_high + 0.5` (Short). Buffer 0.5 điểm = 5 tick, theo đặc tả.
- **Risk** `R = |Entry − SL|`.
- **TP1 = Entry ± 1R**, **TP2 = Entry ± 2R**.
- Nếu `R > i_maxRiskPts` (đề xuất 10 điểm, theo quy trình VN30F của bạn), tín hiệu vẫn hiển thị nhưng gắn nhãn `[WIDE SL]` và không được tính vào thống kê. Đã chốt (câu 7).

### 10.2 Cách đo kết quả mỗi tín hiệu
Sau khi phát tín hiệu xác nhận, theo dõi giá từng bar đến khi gặp một trong các điều kiện:

| Kết quả | Điều kiện | Giá trị R |
|---|---|---|
| **TP2** | Chạm TP2 trước SL | +2R |
| **TP1** | Chạm TP1 trước SL, không chạm TP2 đến hết theo dõi | +1R |
| **SL** | Chạm SL trước TP1 | −1R |
| **TIMEOUT** | Hết phiên (14:25) mà chưa chạm gì | Giá đóng cửa 14:25 quy về R |

Nếu trong cùng một bar cả SL và TP đều nằm trong biên, mặc định coi SL chạm trước (bảo thủ). Ghi chú điều này trong bảng thống kê.

### 10.3 Bảng thống kê
Cho từng nhóm (BODY, ABS, Tier 1, Tier 2, LONG, SHORT, và theo số anchor trong chain):
- Số tín hiệu, tỉ lệ `TP1+` (đạt ít nhất TP1), tỉ lệ `TP2`, tỉ lệ `SL`.
- R trung bình, tổng R.
- Điểm thắng trung bình (khi thắng), điểm thua trung bình (khi thua).
- Kỳ vọng `E = p × avgWin − (1−p) × avgLoss` (tính theo R).

Thống kê chỉ tính tín hiệu đã xác nhận, không tính tín hiệu bị vô hiệu.

**Lưu ý**: số mẫu nhỏ thì tỉ lệ thắng có khoảng tin cậy rộng, như đã ghi trong `reports/va-rule-vn30f.md`. Không dùng bảng này để kết luận khi chưa đủ mẫu.

---

## 11. Tham Số Đầu Vào

Nhóm theo chức năng, đúng thứ tự hiển thị trong setting. Mỗi input có tooltip giải thích trực tiếp trên TradingView.

| Nhóm | Tên input | Mặc định | Ý nghĩa |
|---|---|---|---|
| 1. Nến chủ BODY | `i_atrLen` | 20 | Chu kỳ ATR (bar hợp lệ) |
| | `i_bodyAtrMult` | 1.8 | Thân > ATR × hệ số (C1) |
| | `i_bodyMinPts` | 1.5 | Thân tối thiểu, điểm cố định (C2) |
| | `i_bodyRatio` | 0.65 | Thân / toàn nến tối thiểu (C3) |
| 2. Volume | `i_volLen` | 20 | Chu kỳ SMA volume |
| | `i_volMult` | 2.0 | Volume ≥ SMA × hệ số (C4a) |
| | `i_volPctile` | 90 | Phân vị q của sàn volume (C4b) |
| | `i_volSessions` | 20 | Số phiên L để tính phân vị |
| 3. Nến hấp thụ ABS | `i_absSpreadAtr` | 0.7 | Range ≤ ATR × hệ số |
| | `i_absCloseRatio` | 0.5 | Vị trí close tối thiểu trong range |
| | `i_absRequireSweep` | true | Bắt buộc quét swing |
| 4. Gộp chain | `i_chainMaxGap` | 2 | Số bar xen tối đa giữa 2 anchor (G1) |
| | `i_chainMaxTrendFvg` | 2 | Số FVG cùng chiều xen tối đa (G4) |
| | `i_chainMaxWick` | 0.15 | Râu đối diện tối đa (G5) |
| | `i_chainMaxLen` | 4 | Số anchor tối đa mỗi chain (G7) |
| | `i_zoneMode` | Anchor cực trị | Cách xác định vùng chain (Anchor cực trị / Anchor đầu tiên) |
| 5. Xác nhận | `i_breakBuffer` | 0.2 | Buffer vượt vùng (điểm) |
| | `i_useMss` | false | Yêu cầu CHoCH cùng bar xác nhận |
| 6. Phiên & cảnh báo | `i_cutoff` | 14:20 | Không phát tín hiệu mới sau mốc này |
| | `i_killzoneOnly` | true | Alert chỉ cho Tier 1 |
| 7. Momentum 3 nến | `i_useMom` | false | Bật momentum 3 nến cùng chiều |
| | `i_momAtrMult` | 1.0 | Biên độ 3 nến ≥ ATR × hệ số |
| | `i_momVizMode` | Line | Kiểu vẽ momentum: Line hoặc Box, độc lập với chain |
| | `i_momLineStyle` | Dotted | Nét đường / viền momentum khi đang hiệu lực |
| 8. Hiển thị | `i_vizMode` | Line | Kiểu vẽ chain: Line (hai đường H/L) hoặc Box (một hộp) |
| | `i_lineStyle` | Dashed | Nét đường / viền chain: Solid, Dashed, Dotted |
| | `i_colLong` | xanh | Màu LONG |
| | `i_colShort` | đỏ | Màu SHORT |
| | `i_showLabels` | true | Hiện nhãn BODY/ABS và tín hiệu |
| | `i_keepHistory` | true | Giữ lịch sử chain trên chart (tắt = chỉ giữ chain đang chờ) |
| | `i_hideInvalid` | false | Ẩn chain invalid |
| | `i_showDash` | true | Hiện bảng thống kê |
| | `i_dashPos` | Top Right | Vị trí bảng thống kê |
| | `i_showDebug` | false | Bảng debug bar cuối |
| 9. Tham khảo trade | `i_showTrade` | false | Hiện Entry/SL/TP tham khảo và thống kê |
| | `i_slBuffer` | 0.5 | Buffer SL (điểm) |
| | `i_maxRiskPts` | 10.0 | Ngưỡng SL rộng, gắn [WIDE SL] |

## 11b. Tín Hiệu Momentum Bị Tiêu Diệt (tuỳ chọn)

Bật bằng `i_useMom` (mặc định tắt). Ngưỡng biên độ: `i_momAtrMult` (mặc định 1.0).

- **Momentum tăng**: 3 nến liên tiếp hợp lệ (không tính ATO/ATC/nghỉ trưa) đều có close > open. Vùng momentum gồm low thấp nhất và high cao nhất của 3 nến. Vùng phải có biên độ ≥ `i_momAtrMult` × ATR(20), nếu không thì không tạo momentum.
- **Momentum giảm**: đối xứng, 3 nến close < open.
- **Tiêu diệt momentum tăng**: một nến đóng cửa dưới đáy vùng. Đóng trong vùng không tiêu diệt. Đóng trên đỉnh vùng thì đỉnh vùng nâng lên high của nến đó (momentum tiếp diễn).
- **Tiêu diệt momentum giảm**: đối xứng, nến đóng cửa trên đỉnh vùng.
- Momentum mới đủ điều kiện sẽ thay momentum đang hiệu lực. Momentum cũ kết thúc khi đó không có nhãn tiêu diệt.
- Chỉ xét trên bar đã đóng (`barstate.isconfirmed`) để không repaint.
- Alert: `Momentum Tăng Bị Tiêu Diệt`, `Momentum Giảm Bị Tiêu Diệt`, áp dụng bộ lọc Tier 1 như các alert khác.

## 12. Thay Đổi So Với Đặc Tả Gốc

| # | Mục | Đặc tả gốc | Thiết kế này | Lý do |
|---|---|---|---|---|
| 1 | Sàn volume | 1,500 HĐ cố định | Hàm phân vị q% của L phiên gần nhất, q và L là input | Khối lượng VN30F đổi theo giai đoạn. Số cố định sẽ sai. |
| 2 | FVG tăng | `low > high[2]` | Thêm `close[1] > high[2]` | Đồng nhất với `smc_market_structure.pine` (đã dùng trong repo). |
| 3 | ATR | ATR(20) | ATR(20) | Giữ theo đặc tả, đã chốt. |
| 4 | Nến hấp thụ | Không có | Thêm ABS anchor | Theo yêu cầu: nỗ lực bị loại trừ theo Wyckoff. |
| 5 | Gộp nến | Mô tả chung | Quy tắc G1–G7 cụ thể | Theo yêu cầu: quy định rõ khi nào gộp, FVG và râu. |
| 6 | Xác nhận MSS | "Tuỳ chọn, vượt Swing gần nhất" | CHoCH từ `SwingState.event` | Dùng đúng khái niệm đã có trong repo. |
| 7 | Entry limit FVG | Có | Không có | Yêu cầu: bỏ qua, làm sau. |
| 8 | Cutoff | 14:20 | 14:20 | Đã chốt. |
| 9 | Tên tier | A+/B | Không dùng | Tránh trùng với A/B/C của quy trình giao dịch. Dùng nhãn BODY/ABS và Tier 1/2. |
| 10 | Thân sàn 1.5 điểm | Số tuyệt đối | Giữ nguyên | Gắn với bước giá, không phải volume. Có thể đổi sau nếu thấy cần. |

---

## 13. Quy Trình Sử Dụng Khi Giao Dịch

Dùng cho chính bạn, khi indicator đã chạy trên chart. Không thay thế quy trình trong `docs/quy-trinh-giao-dich-vn30f1m.md`, mà là một nguồn tín hiệu đảo chiều bổ sung.

### 13.1 Trước phiên (8:30–8:55)
1. Ghi lại `vol_floor` hiện tại và giá trị ATR(20) để biết ngưỡng đang dùng.
2. Xác định Killzone đầu phiên sẽ là Tier 1 hay Tier 2.

### 13.2 Trong phiên
1. Khi có alert `Anchor Detected`: chưa vào lệnh. Đánh dấu vùng trên chart, kiểm tra xem anchor đang ở đâu so với Market Profile (VAH/VAL, Naked POC) và SMC (OB, Premium/Discount).
2. Khi có alert `Confirmed`: kiểm tra 3 điều kiện. (a) Tín hiệu nằm trong Tier 1 hoặc bạn chủ động chấp nhận Tier 2. (b) Chưa qua 14:20. (c) Vùng chain không quá rộng so với ATR hiện tại.
3. Nếu cả ba đúng, mới cân nhắc vào lệnh theo quy trình chính, tính size theo R chuẩn và SL theo `zone_low − 0.5` hoặc `zone_high + 0.5`.
4. Nếu `i_showTrade` bật, dùng Entry/SL/TP tham khảo để so sánh, không dùng làm lệnh chốt.

### 13.3 Sau phiên
1. Ghi vào journal: số tín hiệu, loại (BODY/ABS), Tier, kết quả (TP2/TP1/SL/TIMEOUT).
2. Sau 2–4 tuần, xem bảng thống kê theo nhóm (mục 10.3). Chỉ giữ những nhóm có mẫu đủ lớn và kết quả nhất quán.

---

## 14. Quy Trình Phát Triển & Kiểm Chứng

Thực hiện theo thứ tự. Mỗi bước là điều kiện cho bước sau.

### 14.1 Đo phân phối volume thật (trước khi code)
- Lấy volume 1m VN30F1M của ít nhất 6 tháng (nếu có). Loại bar 09:00 và 14:45.
- Tính phân vị 80/90/95 theo cửa sổ 20 phiên.
- Chỉnh `i_volPctile` và `i_volSessions` trong setting dựa trên số tín hiệu thực thấy trên chart. Không đặt mục tiêu tỉ lệ cố định trước khi có số liệu.
- Ghi kết quả vào `docs/anchor-reversal-vn30f.md` mục này.

Nguồn dữ liệu: repo có mô tả truy vấn MySQL trong `backtests/README.md`, nên dùng cùng nguồn để số liệu khớp với nghiên cứu khác. Chưa kiểm tra nguồn này trong phiên hiện tại.

### 14.2 Kiểm tra khả năng của Pine trước khi viết logic
- Xác nhận `ta.percentile_nearest_rank` và RMA xử lý đúng khi có bar bị loại (giá trị `na`). Nếu không, tự viết vòng lặp trên mảng bar hợp lệ.
- Xác nhận giới hạn độ dài lịch sử cho cửa sổ L bar.
- Kiểm tra `barstate.isconfirmed` cho tất cả điều kiện xác nhận.

### 14.3 Viết code v1.0
- Import `anthonydang/smc_core/3 as smc` để dùng `SwingState`, `OrderBlock`, `f_imbalance_detection`.
- Snapshot các field `SwingState` ra biến nguyên thuỷ trước khi gọi `f_process_bar`, để tránh bug aliasing đã ghi trong `smc-core.md`.
- Chú thích tiếng Việt, theo `.claude/CLAUDE.md`.

### 14.4 Kiểm tra trên chart
Chọn 5 phiên đã biết và kiểm tra tay từng bước:
1. Bar 09:00 không bao giờ là anchor. ATR và SMA không đổi khi bật/tắt bar này (kiểm tra bằng so sánh).
2. Mỗi chain gộp đúng theo G1–G7. Ghi lại ít nhất 3 chain có gộp và 2 chain bị ngắt (một bằng FVG tăng, một bằng râu).
3. Hấp thụ chỉ xuất hiện khi có quét swing.
4. Không có tín hiệu mới sau 14:20.
5. Không repaint: tải lại chart, kết quả giữ nguyên. Dùng Replay để xác nhận.
6. Thống kê trong bảng khớp với tính tay trên 1 phiên.

### 14.5 Ghi nhận forward
Chạy 2–4 tuần, chỉ ghi nhận, không vào lệnh theo tín hiệu (trừ khi bạn chủ động). Dùng kết quả này để quyết định có đưa vào quy trình chính hay không.

### 14.6 Tài liệu & phiên bản
- Tài liệu này là tài liệu con của script (đã có trong `docs/README.md`). Khi sửa code, cập nhật cả tài liệu và dòng README.
- Khi sửa code sau này: backup bản cũ vào `indicators/hist/anchor_reversal_vn30f_vX.Y.pine` và tăng version trước khi commit, theo `.claude/CLAUDE.md`.
- Không commit hay push khi chưa có yêu cầu.

### 14.7 Tiêu chí hoàn thành v1.0
- Pass toàn bộ checklist 14.4.
- Có tài liệu và dòng README.
- Có số liệu phân vị đã chọn và lý do.
- Bạn đã xem bảng thống kê forward ít nhất một lần và xác nhận hiển thị đúng.

---

## 15. Câu Hỏi Còn Mở

| # | Câu hỏi | Đề xuất mặc định |
|---|---|---|
| 1 | Phân vị và cửa sổ cho sàn volume (q, L) | Đã chốt: là input trong setting. Mặc định q = 90, L = 20. Chỉnh sau khi đo trên chart. |
| 2 | ATR cho ABS và BODY | Đã chốt: ATR(20). |
| 3 | Chain giảm có đóng trên zone_high (G2) đã đủ chưa | Đã chốt: giữ G2 như mô tả. |
| 4 | Killzone: Tier 2 gắn nhãn hay bị lọc | Đã chốt: gắn nhãn, không bắn alert Tier 2. |
| 5 | ABS có bắt buộc quét swing không | Đã chốt: bắt buộc. |
| 6 | Chain có trộn BODY và ABS không | Đã chốt: không trộn. |
| 7 | SL rộng (R > 10 điểm): bỏ tín hiệu hay gắn nhãn | Gắn nhãn `[WIDE SL]`, không tính vào thống kê. |

Các câu còn lại đã được trả lời trong quá trình thiết kế.

---

## Changelog

- **Chưa lên version** (2026-11-26): momentum có setting hiển thị riêng (`i_momVizMode`, `i_momLineStyle`), tách khỏi chain. Mặc định momentum nét chấm để phân biệt với chain.
- **Chưa lên version** (2026-11-26): tối ưu hiệu năng, không đổi tín hiệu.
  - Sàn volume: giữ một mảng volume đã sắp xếp, chèn/xoá bằng tìm kiếm nhị phân và đọc phân vị theo chỉ số. Trước đó `array.percentile_nearest_rank` sắp xếp lại khoảng 5.100 phần tử ở mỗi bar hợp lệ.
  - SMA volume: dùng tổng trượt thay cho `array.slice` + `array.avg` ở mỗi bar.
  - Bảng thống kê: cộng dồn 7 nhóm khi trade đóng, thay cho quét lại tối đa 2.000 trade × 7 dòng ở mỗi tick realtime.
  - Đường/hộp chain và momentum: chỉ cập nhật khi vùng đổi hoặc ở bar cuối, thay cho mỗi bar.
  - Chuỗi Entry/SL/TP và toàn bộ chuỗi bảng debug chỉ dựng khi cần. Giờ cutoff chỉ đọc một lần.
  - Đã đối chiếu sàn volume và SMA mới với cách tính cũ bằng mô phỏng Python: 114.119 lần so sánh, 0 sai lệch.
- **v1.1** (2026-11-26): Bản chính thức, đánh dấu sau khi người dùng xác nhận.
  - Vô hiệu chain theo giá (nến đóng ngoài vùng phía tiếp diễn), bỏ giới hạn 5 nến. Xoá `i_confirmBars`.
  - Momentum 3 nến cùng chiều (tuỳ chọn `i_useMom`), tiêu diệt theo cùng nguyên tắc.
  - Hiển thị: đường High/Low hoặc hộp (`i_vizMode`), nét đứt khi valid, nét liền khi invalid, chữ x căn giữa đoạn khi valid (chế độ Line).
  - Màu theo hướng (`i_colLong`, `i_colShort`), ẩn nhãn (`i_showLabels`), ẩn chain invalid (`i_hideInvalid`), giữ hoặc xoá lịch sử (`i_keepHistory`).
  - Bảng debug bar cuối (`i_showDebug`) để kiểm tra từng điều kiện.
  - Sàn volume là phân vị q của L phiên, cả hai là input.
  - Nhóm input theo chức năng, có tooltip.
  - Sửa lỗi biên dịch `line.get_color` không tồn tại trong Pine v6.
  - Backup: `indicators/hist/anchor_reversal_vn30f_v1.0.pine` (v1.0), `indicators/hist/anchor_reversal_vn30f_v1.1.pine` (v1.1 trước khi thêm debug và rút gọn).
- **v1.0** (2026-11-26): Code đầu tiên `indicators/anchor_reversal_vn30f.pine`. Gồm nến chủ BODY/ABS, gộp chain G1–G7, xác nhận close vượt zone (MSS tuỳ chọn), killzone và cutoff 14:20, hộp/trigger/nhãn, alert, tham khảo Entry/SL/TP và thống kê (bật bằng input). Sàn volume là hàm phân vị trong script (q, L là input).
- **v0 — thiết kế** (2026-11-26): Tài liệu thiết kế đầu tiên. Các câu hỏi mở ở mục 15.
