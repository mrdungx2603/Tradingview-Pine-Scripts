# Quy Trình Giao Dịch VN30F1M — SMC + Market Profile + Order Flow + LSC + GMKT

> Tài liệu quy trình giao dịch cá nhân — không phải tài liệu kỹ thuật của 1 script. Đối tượng
> giao dịch: **VN30F1M** (hợp đồng tương lai VN30), khung thực thi **1 phút**, **không giữ lệnh
> qua đêm** (phải flat trước khi hết phiên). Dùng 5 indicator trong dự án: [SMC Market
> Structure](smc-market-structure.md), [Market Profile](market-profile.md), [Order Flow
> Bar](order-flow-bar.md), [LSC Pattern](lsc-pattern.md), [Global Markets
> Table](global-markets-table.md).
>
> **Ngày tạo**: 2026-11-22

---

## Mục Lục

1. [Triết Lý & Vai Trò Từng Công Cụ](#triết-lý--vai-trò-từng-công-cụ)
2. [Giờ Giao Dịch & Khung Thời Gian Làm Việc](#giờ-giao-dịch--khung-thời-gian-làm-việc)
3. [Checklist Trước Giờ Giao Dịch](#checklist-trước-giờ-giao-dịch)
4. [Quy Trình Trong Giờ Giao Dịch](#quy-trình-trong-giờ-giao-dịch)
5. [Playbook — Các Mẫu Hình Setup](#playbook--các-mẫu-hình-setup)
6. [Quy Tắc Vào Lệnh](#quy-tắc-vào-lệnh)
7. [Quản Trị Rủi Ro](#quản-trị-rủi-ro)
8. [Checklist Sau Giờ Giao Dịch](#checklist-sau-giờ-giao-dịch)
9. [Order Flow Bar — Giai Đoạn Thử Nghiệm](#order-flow-bar--giai-đoạn-thử-nghiệm)
10. [Giới Hạn & Lưu Ý Quan Trọng](#giới-hạn--lưu-ý-quan-trọng)

---

## Triết Lý & Vai Trò Từng Công Cụ

Mỗi indicator chỉ trả lời **đúng 1 câu hỏi** — tránh dùng chồng chéo, tránh để 2 công cụ "cãi
nhau" trong đầu lúc đang căng thẳng nhìn giá chạy:

| Công cụ | Câu hỏi trả lời | Dùng khi nào |
|---|---|---|
| **SMC Market Structure** | "Đi lệnh hướng nào?" (trend, BoS/CHoCH, Order Block, Premium/Discount) | Xác định hướng + vùng dấu chân tổ chức |
| **Market Profile** | "Vào/thoát ở đâu?" (VAH/VAL/POC, Naked POC, IB, Day Type) | Xác định vùng giá trị thống kê, target, stop logic |
| **LSC Pattern** | "Vào đúng lúc nào?" (3 nến đảo chiều) | Đồng hồ bấm giờ entry tại vùng SMC/MP đã chọn — **không dùng đứng riêng** |
| **Order Flow Bar** | "Dòng tiền thật đang đẩy không?" (delta, Peak Buy/Sell) | Lớp **cộng điểm** (đang thử nghiệm — xem mục 9), không phải điều kiện bắt buộc |
| **Global Markets Table** | "Bối cảnh hôm nay thế nào?" | Bias nhẹ trước giờ mở phiên — **không phải tín hiệu vào lệnh** |

**Nguyên tắc confluence**: không trade chỉ dựa trên 1 tín hiệu đơn lẻ. SMC cho hướng, MP cho vị
trí — 2 cái trùng nhau là điều kiện tối thiểu để coi là 1 setup hợp lệ (xem [Playbook](#playbook--các-mẫu-hình-setup)).

---

## Giờ Giao Dịch & Khung Thời Gian Làm Việc

VN30F1M (theo giờ HOSE/giờ khớp lệnh phái sinh):

| Phiên | Giờ | Ghi chú cho quy trình này |
|---|---|---|
| Sáng liên tục | 9:00 – 11:30 | Thời gian tốt nhất cho setup breakout/IB (volume mở phiên cao) |
| Nghỉ trưa | 11:30 – 13:00 | Không giao dịch |
| Chiều liên tục | 13:00 – 14:30 | **Không mở lệnh mới sau ~14:00** (xem lý do trong mục Playbook #2 — tín hiệu trigger muộn có tỉ lệ thành công thấp hơn rõ rệt theo backtest) |
| ATC | 14:30 – 14:45 | Không giao dịch — khớp giá đơn, không phù hợp với scalping 1m. **Phải flat hoàn toàn trước 14:25-14:30** |

Vì không giữ lệnh qua đêm: mọi vị thế phải đóng trước ATC, không có ngoại lệ "chờ thêm 1 chút".

---

## Checklist Trước Giờ Giao Dịch

> Thực hiện khoảng 8:30 – 8:55, trước khi phiên sáng mở.

- [ ] **Bối cảnh toàn cầu (Global Markets Table)**: ghi nhận biến động đêm qua US30/USTECH,
  và trạng thái đang chạy của Nikkei/Hang Seng/Kospi (đang mở cùng giờ Á — cho biết tâm lý khu
  vực), Oil/Gold/BTC (risk-on hay risk-off). Nếu US30 đêm qua tăng **≥ +2%** → ghi nhận bias
  nghiêng short nhẹ cho VN30F hôm nay (bằng chứng yếu, xem mục Giới Hạn) — **không** phải lý do
  để chủ động short ngay khi mở phiên.
- [ ] **Mức Market Profile phiên trước**: ghi lại VAH/VAL/POC phiên trước, Naked POC còn chưa
  lấp (nếu có), Day Type phiên trước (Trend/Nontrend/Normal...).
- [ ] **Cấu trúc SMC khung cao hơn**: xem trend hiện tại trên 15m/1H (bản SMC Market Structure
  + MTF) để có bối cảnh lớn — chart thực thi 1m rất nhiễu nếu không có bias từ khung cao hơn.
- [ ] **Order Block SMC còn active**: ghi lại OB (demand/supply) từ phiên trước chưa bị
  mitigated — có thể còn ý nghĩa trong phiên mới.
- [ ] **Reset trạng thái rủi ro ngày**: đặt lại bộ đếm chuỗi thua về 0, xác nhận size chuẩn
  (100 hợp đồng = 1R, trần dừng lỗ 5-6 giá — xem [Quản Trị Rủi Ro](#quản-trị-rủi-ro)).
- [ ] **Tự kiểm tra tâm lý**: có đang bị áp lực gỡ lỗ hôm trước, thiếu ngủ, hay bị phân tâm việc
  khác không? Nếu có → cân nhắc giảm size mặc định cả ngày hoặc nghỉ.

---

## Quy Trình Trong Giờ Giao Dịch

Lặp lại mỗi khi có nến 1m mới đóng (`barstate.isconfirmed`):

1. **Xác định trend hiện tại** qua SMC — có BoS/CHoCH mới không, đang ở uptrend/downtrend/chưa
   rõ.
2. **Xác định vị trí giá so với Market Profile** — đang ở Premium/Discount của swing SMC nào,
   gần VAH/VAL/POC/Naked POC/IB nào, Day Type/Open Type hôm nay đang nghiêng kiểu gì.
3. **Soi khớp với 1 trong 3 setup** trong [Playbook](#playbook--các-mẫu-hình-setup) — nếu không
   khớp setup nào, **không trade**, tiếp tục quan sát.
4. **Chờ trigger timing cụ thể** — nến LSC xác nhận, hoặc nến retest đóng cửa giữ được vùng OB.
   Không vào lệnh khi nến chưa đóng (tránh repaint/vào sớm).
5. *(Bonus, không bắt buộc)* Nhìn nhanh Order Flow Bar tại vùng đó — ghi nhận cho journal, xem
   mục 9.
6. **Tính size theo tier setup** (A+/B/C — xem [Quản Trị Rủi Ro](#quản-trị-rủi-ro)).
7. **Vào lệnh**, đặt SL theo cấu trúc (dưới OB/HL gần nhất, hoặc dưới đáy nến giữa LSC), TP theo
   mức MP tiếp theo cùng hướng.
8. **Quản lý lệnh**: trailing theo HL/LH mới hình thành; nếu Order Flow Bar đảo chiều rõ rệt tại
   vùng đang giữ lệnh → siết stop/chốt sớm một phần (dùng như tín hiệu quản lý lệnh, không phải
   tín hiệu entry).
9. **Cutoff giờ**: không mở lệnh mới sau 14:00; đóng hết vị thế trước 14:25-14:30.

---

## Playbook — Các Mẫu Hình Setup

> Dựa trên các ý tưởng đã brainstorm trong [`market-profile-strategy-ideas.md`](market-profile-strategy-ideas.md),
> chỉ giữ phần dùng 5 công cụ hiện có (bỏ phần VPA/Wyckoff vì chưa có indicator tương ứng trong
> bộ công cụ này).

### Setup A — OB Retest + MP Confluence

**Ý tưởng gốc**: #21 + #30 trong `market-profile-strategy-ideas.md` (xếp hạng định tính **Cao**).

- **Điều kiện**: SMC đang trong uptrend (hoặc downtrend) có Order Block Demand (hoặc Supply)
  **trùng hoặc rất gần** VAH/VAL/POC/Naked POC của Market Profile.
- **Entry**: giá retest vùng OB, nến đóng cửa xác nhận giữ được vùng (không xuyên qua mitigation
  hoàn toàn).
- **Stop**: dưới đáy OB (long) / trên đỉnh OB (short), trần 6 giá — nếu cấu trúc rộng hơn, xem
  công thức giảm size ở mục Quản Trị Rủi Ro.
- **Target**: mức MP tiếp theo cùng hướng (VAH/VAL/POC hoặc Naked POC gần nhất).
- **Vì sao mạnh**: 2 nguồn độc lập (dấu chân tổ chức SMC + vùng giá trị thống kê MP) cùng chỉ
  vào 1 mức.

### Setup B — 80% VA Rule Fade

**Ý tưởng gốc**: #2 trong `market-profile-strategy-ideas.md` — **đã có backtest thật** trên
VN30F1M 1m, xem [reports/va-rule-vn30f1m.md](reports/va-rule-vn30f1m.md).

- **Điều kiện**: phiên mở ngoài Value Area phiên trước, giá quay lại trong VA cũ và giữ **≥ 5
  nến 1m liên tục** (khuyến nghị thật từ backtest — ngưỡng 2-5 nến cho kết quả giống nhau nhưng
  chờ 5 nến giảm nhiễu).
- **Lọc thêm (khuyến nghị từ backtest)**: nếu mục tiêu là "đóng cửa trong VA", bỏ qua setup nếu
  giá đã mở lệch quá **70% độ rộng VA cũ** ra ngoài (khả năng cao đã thành Trend Day thật). Nếu
  mục tiêu chỉ là "chạm lại POC", overshoot lớn vẫn chấp nhận được.
- **Entry**: sau khi xác nhận giữ ≥5 nến trong VA cũ, theo hướng về `prev_poc`.
- **Target thực tế** (theo số liệu backtest, KHÔNG phải tên "80%"):
  - Chạm lại POC phiên trước: **~64-72%** tỉ lệ — dùng làm target chính.
  - Đóng cửa trong VA: chỉ **~44-52%** — không dùng làm target, chỉ là bonus nếu xảy ra.
  - Chạm hẳn biên đối diện: chỉ **~50-55%** (= gần ngẫu nhiên) — **không** risk lệnh cho mục
    tiêu này.
- **Cutoff**: bỏ qua tín hiệu trigger sau ~14:00 (tỉ lệ thành công giảm rõ rệt khi trigger muộn,
  theo backtest).
- **Stop**: ngoài điểm mở gap (outside the open), hoặc theo cấu trúc SMC nếu có CHoCH ngược
  hướng fade xuất hiện cùng lúc → huỷ setup, không vào.

### Setup C — CHoCH/BoS + LSC Timing

**Ý tưởng gốc**: tinh thần giống #22/#23 (combo SMC + xác nhận timing), thay phần VPA bằng LSC
vì đó là công cụ bạn có.

- **Điều kiện**: SMC báo CHoCH (đảo chiều tiềm năng) hoặc BoS (tiếp diễn) tại 1 vùng có ý nghĩa
  MP (gần VAH/VAL/POC, IB, hoặc Naked POC).
- **Entry**: chỉ vào khi LSC Pattern xác nhận đúng hướng **ngay tại/ngay sau** vùng đó — vào
  ngay khi nến thứ 3 của LSC đóng cửa.
- **Lưu ý quan trọng**: LSC theo tài liệu riêng của nó **không có bộ lọc trend/volume** — tuyệt
  đối không trade LSC khi nó xuất hiện đơn độc không có SMC/MP hậu thuẫn (xem mục Giới Hạn).
- **Stop**: dưới đáy (long) / trên đỉnh (short) của nến giữa LSC (nến xoay trục).
- **Target**: mức MP/SMC tiếp theo cùng hướng.

### Không Trade Khi

- Không khớp bất kỳ setup A/B/C nào — kể cả khi "cảm thấy" giá sắp quay đầu.
- Đang trong 30 phút đầu/cuối phiên nếu Day Type MP chưa định hình rõ VÀ không có setup rõ ràng.
- Sau 14:00 cho setup B; sau ~14:15 nói chung cho mọi setup mới (không đủ thời gian quản lý lệnh
  trước khi phải flat).
- Đã chạm điều kiện dừng giao dịch ngày (xem Quản Trị Rủi Ro).

---

## Quy Tắc Vào Lệnh

Checklist xác nhận trước khi bấm lệnh — trả lời đủ cả 5 dòng mới được vào:

1. [ ] Setup khớp đúng 1 trong 3 mẫu hình Playbook (A/B/C) — gọi tên rõ setup nào.
2. [ ] Trend SMC khung hiện tại không mâu thuẫn trực tiếp với hướng lệnh (không long ngược hẳn
   1 downtrend mạnh chỉ vì 1 tín hiệu phụ).
3. [ ] Nến trigger đã **đóng cửa xác nhận** (không vào khi nến đang chạy).
4. [ ] Đã tính được stop theo cấu trúc và size tương ứng (không dùng "size mặc định" mà không
   tính stop trước).
5. [ ] Chưa chạm điều kiện dừng giao dịch ngày (số lệnh thua liên tiếp).

Nếu thiếu 1 trong 5 → không vào lệnh, kể cả khi 4/5 còn lại rất đẹp.

---

## Quản Trị Rủi Ro

### Đơn vị rủi ro (R)

- **R chuẩn** = 100 hợp đồng × 5,5 giá (điểm giữa của trần 5-6 giá) ≈ **550 đơn vị điểm×hợp
  đồng**. Đây là mức rủi ro bạn đã quen dùng — dùng làm hằng số chuẩn hoá, không đổi theo từng
  lệnh.
- **Công thức giữ R không đổi khi stop cấu trúc khác 5-6 giá**:

  ```
  số hợp đồng = round(550 / số giá dừng lỗ theo cấu trúc)
  ```

  Ví dụ: OB/HL gần nhất cách entry 8 giá → `550 / 8 ≈ 69 hợp đồng` (không phải vẫn vào 100 hợp
  đồng với SL 8 giá — lúc đó rủi ro thực tế đã lớn hơn 1R).
- **Trần an toàn 2 chiều**:
  - Nếu stop cấu trúc **> 10 giá** → setup coi như không hợp lệ (biến động quá lớn so với
    khung 1m), bỏ qua, không gồng ép giảm size cho vừa.
  - Nếu stop cấu trúc **< 3 giá** → không tăng size vượt quá 150 hợp đồng dù công thức ra số lớn
    hơn (tránh trượt giá/rủi ro thực thi ở size quá lớn cho 1 setup scalp sát).

### Size theo chất lượng setup (A+/B/C)

| Tier | Điều kiện | Size |
|---|---|---|
| **A+** | SMC + MP đồng thuận rõ (Setup A/B/C đủ điều kiện) **và** Order Flow Bar (nếu đọc được) cùng hướng | 100% theo công thức R |
| **B** | SMC + MP đồng thuận nhưng thiếu xác nhận phụ (Order Flow lệch hoặc không rõ, hoặc timing LSC không đẹp) | 50% theo công thức R |
| **C** | Chỉ có 1 lớp xác nhận (ví dụ chỉ LSC, không có SMC/MP hậu thuẫn) | Không vào lệnh thật — nếu muốn theo dõi, tối đa 20-30 hợp đồng chỉ để ghi nhận dữ liệu |

### Daily Stop — 2 Tầng

> Dựa trên lý do thống kê: ở winrate ước lượng ~45-55%, 1 chuỗi 3 lệnh thua liên tiếp vẫn là
> nhiễu bình thường của hệ thống (xảy ra khá thường xuyên trong 1 phiên 6-10 lệnh) — dừng hẳn
> ngay ở đây sẽ dừng quá thường xuyên. Chuỗi 4 lệnh thua liên tiếp ít xảy ra hơn do nhiễu thuần,
> là dấu hiệu đáng tin hơn rằng đang đọc sai thị trường hôm đó.

- **3 lệnh thua liên tiếp** (đúng kế hoạch, không phải lỗi thực thi) → **cảnh báo**: giảm size
  còn 50% cho các lệnh tiếp theo VÀ nghỉ tối thiểu 30-45 phút để reset trạng thái tâm lý trước
  khi tìm setup mới.
- **4 lệnh thua liên tiếp** → **dừng giao dịch cả ngày**, không có ngoại lệ "chỉ 1 lệnh nữa để
  gỡ".
- Bộ đếm reset về 0 ngay khi có 1 lệnh thắng, hoặc đầu phiên mới.
- Lỗi thực thi (vào nhầm size, quên đặt stop, bấm nhầm hướng) **không tính vào chuỗi thua** —
  nhưng phải ghi riêng vào journal và dừng ngay để xem lại quy trình, bất kể đang ở lệnh thứ
  mấy.

### Cutoff Theo Giờ (nhắc lại)

- Không mở lệnh mới sau 14:00 (Setup B) / ~14:15 (mọi setup).
- Flat hoàn toàn trước 14:25-14:30.

---

## Checklist Sau Giờ Giao Dịch

> Thực hiện ngay sau khi đóng phiên (sau 14:45), trước khi làm việc khác.

- [ ] Xác nhận không còn vị thế mở nào (kiểm tra lại, không chỉ nhớ).
- [ ] Ghi journal từng lệnh trong ngày: setup (A/B/C), size, SL/TP thực tế, R đạt được (dương/âm
  theo đơn vị R chuẩn), lý do vào/thoát.
- [ ] Ghi riêng cột **Order Flow Bar đọc được gì vs. kết quả thực tế** (xem mục 9 — chỉ ghi
  nhận, không dùng để trách/khen quyết định đã qua).
- [ ] Cập nhật mức Market Profile mới của hôm nay (VAH/VAL/POC mới, Naked POC mới sinh ra) để
  dùng cho checklist trước giờ của phiên sau.
- [ ] Review vi phạm quy tắc trong ngày (vào lệnh ngoài playbook, bỏ qua daily stop, sai size) —
  ghi thẳng, không biện minh.
- [ ] Mỗi tuần: tổng hợp win rate **riêng theo từng setup A/B/C** (không gộp chung) — để biết
  playbook nào thực sự đang work, playbook nào cần bỏ/sửa.

---

## Order Flow Bar — Giai Đoạn Thử Nghiệm

Bạn chưa dùng Order Flow Bar trước đây nên nó **chưa phải điều kiện bắt buộc** trong quy trình
này — chỉ là lớp cộng điểm tuỳ chọn (xem bảng tier ở Quản Trị Rủi Ro) và một mục ghi nhận riêng
trong journal.

**Cách kiểm chứng trong 2-4 tuần tới**:

1. Mỗi lệnh, ghi lại: Order Flow Bar tại vùng entry cho thấy Peak Buy/Sell và delta hướng nào
   (đồng thuận / lệch / không rõ dữ liệu).
2. Sau 2-4 tuần, so sánh: những lệnh có Order Flow đồng thuận có tỉ lệ thắng/R trung bình cao
   hơn những lệnh không có hay không?
3. Nếu có khác biệt rõ (không phải ngẫu nhiên nhỏ lẻ) → có thể nâng Order Flow Bar lên thành
   điều kiện chính thức (ví dụ bắt buộc cho tier A+), cập nhật lại tài liệu này.
4. Nếu không có khác biệt → giữ nguyên vai trò tham khảo, không ép dùng.

---

## Giới Hạn & Lưu Ý Quan Trọng

- **Backtest 80% VA Rule mẫu nhỏ**: chỉ 103 phiên hợp lệ (~5 tháng dữ liệu), 33-46 lần trigger
  tuỳ ngưỡng — khoảng tin cậy 95% rộng (ví dụ tỉ lệ 71,7% có CI ~57%-83%). Số liệu trong Playbook
  B là **định hướng**, không phải con số chắc chắn — xem đầy đủ tại
  [reports/va-rule-vn30f1m.md](reports/va-rule-vn30f1m.md).
- **Tương quan US30/VN30F rất yếu**: chỉ nhóm US30 đêm trước tăng ≥2% có bằng chứng thống kê
  (nhẹ), tập trung vào 2020 và 2022, **chưa kiểm tra ngoài mẫu**, **chưa trừ phí/trượt giá** —
  xem [reports/us30-vn30f-correlation.md](reports/us30-vn30f-correlation.md). Dùng GMKT làm bias
  tham khảo, không bao giờ làm lý do chính để vào lệnh.
- **Order Flow Bar đang thử nghiệm** (xem mục 9) — chưa có dữ liệu kiểm chứng hiệu quả thật, chỉ
  dùng cộng điểm/ghi nhận.
- **LSC không có filter trend/volume riêng** (theo tài liệu gốc) — luôn phải đi kèm SMC/MP,
  không trade đơn độc.
- **Market Profile Day Type/Open Type đánh giá liên tục trong phiên** (không "đóng băng" đến
  cuối phiên) — đọc sớm trong phiên có thể đổi sau, đừng chốt kết luận quá sớm dựa trên Day Type
  đầu phiên.
- **Quy tắc 80% VA Rule hiện đếm "giữ trong VA" theo số nến chart**, chưa chuyển hẳn sang TPO
  Period thực — hạn chế kỹ thuật đã biết của `market_profile_core`, không ảnh hưởng lớn ở
  khung 1m (1 nến = 1 phút) nhưng cần biết nếu đổi khung thực thi.
- **SMC CHoCH không đồng nghĩa đảo chiều ngay** — chỉ là cảnh báo sớm, luôn chờ xác nhận LSC
  trước khi vào (đúng theo Setup C).
- **R chuẩn (550 điểm×hợp đồng) dựa trên thói quen hiện tại của bạn (100 hợp đồng/5-6 giá)**,
  không phải tính theo % vốn tài khoản cụ thể — nếu muốn chuẩn hoá theo % tài khoản thật, cần bổ
  sung số vốn cụ thể và quy đổi lại.
