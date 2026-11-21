# Báo Cáo Research — Tương Quan US30 Hôm Qua và VN30F Hôm Nay

> Trả lời câu hỏi: *"Khi nào nên trade VN30F thuận theo US30 của phiên trước, và khi nào nên đánh ngược?"*
> dựa trên dữ liệu D1 của `DJ:DJI` và `HNX:VN301!`. Kết quả chủ yếu là không có lợi thế ổn định,
> trừ một nhóm: US30 tăng từ 2% trở lên, khi đó phiên VN30F hôm sau có xu hướng giảm trong ngày.

## 1. Tổng Quan

- **Câu hỏi**: US30 phiên N có dự báo được VN30F phiên N+1 không? Nếu có, theo chiều nào và ở biên độ nào?
- **Cặp so sánh**: phiên VN ngày D được ghép với phiên US gần nhất có ngày trước D. Với lịch hai thị trường, phiên US ngày D kết thúc trước khi VN ngày D+1 mở cửa.
- **Nguồn dữ liệu**: TradingView qua `@mathieuc/tradingview`, khung D1.
  - `DJ:DJI`: `1990-01-02 → 2026-11-20`, 9 291 phiên.
  - `HNX:VN301!` (VN30 Index Futures, hợp đồng liên tục): `2017-08-10 → 2026-11-20`, 2 317 phiên.
- **Số cặp**: 2 316 cặp. Không có cặp nào bị loại vì khoảng cách ngày quá 4 ngày.
- **Script**: [backtests/us30_vn30f/us30_vn30f_backtest.mjs](../../backtests/us30_vn30f/us30_vn30f_backtest.mjs). Đọc CSV trong `backtests/us30_vn30f/data/`, không gọi mạng.
- **Kết quả thô**: [backtests/us30_vn30f/results.json](../../backtests/us30_vn30f/results.json), gồm từng cặp trong khóa `pairs_detail`.

## 2. Làm Sạch Dữ Liệu

- Không có giá 0 hoặc âm trong `vn301_d1.csv`.
- Có 58 phiên VN biến động trên 4%. Các phiên lớn tập trung ở 2020 và các đợt biên độ. Đây là biến động thật, nên giữ lại. Khi loại các phiên có |biến động| ≥ 6% thì kết quả gần như không đổi (xem mục 4).
- Chưa kiểm tra chuyển hợp đồng (roll). Dữ liệu VN301! là hợp đồng liên tục, nên ngày roll có thể tạo gap giả. Phần OC trong ngày ít bị ảnh hưởng hơn gap.

## 3. Định Nghĩa

- **US hôm qua** (`usRet`): close phiên US so với close phiên US trước đó.
- **VN OC** (`vnOC`): close phiên VN so với open phiên VN. Đây là kết quả của một lệnh vào lúc mở cửa và thoát lúc đóng cửa.
- **VN gap** (`vnGap`): open phiên VN so với close phiên VN trước.
- **Thuận theo** (follow): long VN nếu US tăng, short VN nếu US giảm. Lợi nhuận = dấu(usRet) × vnOC.
- **Đánh ngược** (fade): ngược lại với thuận theo. Lợi nhuận = −(thuận theo).
- **Đối chứng**: US hai phiên trước (`usLag2Ret`) và US trong phiên (`usIntraRet`).

## 4. Kết Quả

**4.1 Tương quan**

| Cặp biến | Hệ số Pearson r | Spearman ρ | p (Pearson) |
|---|---|---|---|
| US hôm qua vs VN OC | −0,069 | −0,044 | 0,0008 |
| US hôm qua vs VN gap | +0,488 | — | < 0,0001 |
| US hai phiên trước vs VN OC (đối chứng) | +0,080 | — | 0,0001 |

Hệ số tương quan của US hôm qua với VN OC rất nhỏ: r = −0,069, tức là giải thích dưới 0,5% phương sai. Có ý nghĩa thống kê chỉ vì n = 2 316.

Ngược lại, US hôm qua giải thích khoảng 24% phương sai của gap mở cửa VN (r = 0,488). Phần lớn tác động của US đã nằm trong giá mở cửa VN, khi lệnh vào được đặt.

**4.2 Lợi nhuận thuận theo, toàn bộ mẫu**

- Trung bình thuận theo: +0,031% mỗi phiên. Tỉ lệ thắng 48,4%. KTC 95%: [−0,022%; +0,083%], chứa 0.
- Không có lợi thế chung khi thuận theo hay đánh ngược một cách vô điều kiện.

**4.3 Theo biên độ US hôm qua**

| Biên độ US | n | VN OC TB | Thuận theo TB | Thuận theo thắng | KTC 95% thuận theo |
|---|---|---|---|---|---|
| ≤ −2% | 73 | +0,238% | −0,238% | 35,6% | [−0,72; +0,28] |
| −2% đến −1% | 179 | +0,077% | −0,077% | 39,1% | [−0,27; +0,12] |
| −1% đến −0,5% | 261 | −0,040% | +0,040% | 48,7% | [−0,13; +0,22] |
| −0,5% đến +0,5% | 1 154 | −0,003% | +0,080% | 50,1% | [+0,02; +0,15] |
| +0,5% đến +1% | 352 | +0,160% | +0,160% | 53,7% | [+0,02; +0,29] |
| +1% đến +2% | 239 | −0,072% | −0,072% | 45,6% | [−0,24; +0,09] |
| ≥ +2% | 58 | −0,678% | −0,678% | 36,2% | [−1,03; −0,35] |

Cách đọc: với nhóm ≥ +2%, nếu đánh ngược (short VN lúc mở cửa, thoát lúc đóng cửa) thì trung bình được +0,68% mỗi phiên, thắng 63,8% số phiên. Nhóm này có t = −3,8 trên VN OC. Với 7 nhóm được kiểm tra, ngưỡng Bonferroni là p < 0,007. p xấp xỉ 0,0001 nên vượt ngưỡng này.

**4.4 Ổn định theo năm**

| Năm | n | Tương quan | Thuận theo TB | Thuận theo thắng |
|---|---|---|---|---|
| 2017 | 100 | +0,045 | +0,092 | 56,0% |
| 2018 | 250 | −0,069 | −0,040 | 42,8% |
| 2019 | 250 | −0,158 | −0,063 | 44,0% |
| 2020 | 252 | −0,210 | −0,048 | 46,4% |
| 2021 | 250 | +0,075 | +0,189 | 53,6% |
| 2022 | 247 | +0,030 | +0,266 | 53,0% |
| 2023 | 249 | −0,032 | +0,013 | 49,0% |
| 2024 | 250 | +0,111 | +0,032 | 46,8% |
| 2025 | 249 | −0,137 | −0,110 | 47,4% |
| 2026 | 219 | −0,048 | +0,017 | 49,3% |

Dấu của tương quan đổi qua các năm. Không có mối quan hệ tuyến tính ổn định.

Nhóm US ≥ +2% theo năm:

| Năm | n | VN OC TB |
|---|---|---|
| 2018 | 6 | −1,05% |
| 2019 | 2 | −0,24% |
| 2020 | 24 | −0,90% |
| 2021 | 1 | −0,34% |
| 2022 | 14 | −0,61% |
| 2023 | 2 | −0,05% |
| 2024 | 1 | −0,54% |
| 2025 | 3 | −0,33% |
| 2026 | 5 | −0,06% |

Trong 58 phiên này, 2020 và 2022 chiếm 38 phiên. Bỏ 2020, trung bình vẫn âm: −0,52% trên 34 phiên.

**4.5 Độ nhạy**

Loại các phiên VN có |OC| ≥ 6% (n = 7): r = −0,066, thuận theo TB +0,020%, thắng 48,3%. Kết quả gần như không đổi.

## 5. Trả Lời Câu Hỏi

1. **Thuận theo US30 hôm qua nói chung**: không nên. Lợi nhuận trung bình gần 0 và KTC chứa 0.
2. **Đánh ngược khi US30 tăng từ 2% trở lên**: đây là điều kiện duy nhất có bằng chứng thống kê rõ, với trung bình −0,68% VN OC và 63,8% phiên ngược chiều. Bằng chứng yếu hơn ở các năm gần đây và phụ thuộc vào 2020 và 2022.
3. **Thuận theo nhẹ khi US30 tăng từ 0,5% đến 1%**: trung bình +0,16%, thắng 53,7%. KTC mỏng và không qua ngưỡng hiệu chỉnh khi đặt cạnh 7 nhóm. Chỉ nên xem là gợi ý.
4. **US30 giảm mạnh (≤ −2%)**: không có cạnh rõ. Khoảng tin cậy của nhóm này rất rộng, chứa 0 ở cả hai phía.
5. **Vùng trung tính (±0,5%)**: không có lợi thế, n lớn nhưng biên lợi nhuận gần 0.

**Điểm quan trọng khi thực thi**: tương quan với gap r = 0,49 nghĩa là US hôm qua đã phản ánh vào giá mở cửa VN. VN30F không có phiên qua đêm, nên không thể vào lệnh trước khi gap hình thành. Lệnh chỉ có thể đặt sau khi mở cửa, và khi đó phần gap đã nằm trong giá vào lệnh.

## 6. Khuyến Nghị

- **Không trade thuận theo US30 hôm qua như một quy tắc chung.**
- **Nếu muốn thử**: chỉ xem xét nhóm US tăng ≥ 2%, vào short VN30F lúc mở cửa, thoát lúc đóng cửa. Trước khi dùng, cần:
  - Kiểm tra ngoài mẫu: ví dụ huấn luyện 2017–2022, kiểm tra 2023–2026. Với nhóm này, 2026 chỉ có 5 phiên, nên mẫu kiểm tra sẽ rất nhỏ.
  - Tính phí, trượt giá và biên độ ngày thật. Lợi nhuận trung bình 0,68% phải lớn hơn tổng chi phí mới có lãi.
  - Đo gap mở cửa của nhóm ≥ 2% để xác nhận giả thuyết: gap lớn có thể đã bị bán ngược trong ngày. Chưa kiểm tra giả thuyết này.
- **Không tối ưu thêm ngưỡng**: ngưỡng 2% được chọn sau khi xem phân phối. Đổi sang 1,5% hoặc 2,5% có thể cho kết quả khác đáng kể.

## 7. Giới Hạn

- **Mẫu chồng lấp theo đợt**: 58 phiên US ≥ 2% tụ lại trong vài đợt lớn (2020, 2022). Số sự kiện độc lập nhỏ hơn 58.
- **In-sample**: chưa có giai đoạn kiểm tra ngoài mẫu. Ngưỡng và nhóm được chọn trên cùng dữ liệu.
- **Chưa tính chi phí**: phí, trượt giá, và thuế không có trong kết quả.
- **Hợp đồng liên tục**: VN301! có thể có gap roll, và chưa được loại. Đây là hợp đồng liên tục của TradingView, không phải hợp đồng cụ thể đang giao dịch tại thời điểm đó.
- **Chỉ số, không phải tài sản giao dịch**: DJI là chỉ số, US30 CFD có giá và lịch khác. Dùng CFD sẽ có chênh lệch.
- **Không kiểm định cơ chế**: giả thuyết gap bị đảo ngược trong ngày chưa được kiểm tra trực tiếp.
- **Lịch sử ngắn**: VN30F chỉ có từ 2017. Các năm 2017–2019 chỉ có 100–250 phiên mỗi năm.

## Changelog

- `2026-11-21`: Tạo báo cáo lần đầu (DJI và VN301! D1, 2 316 cặp phiên).
