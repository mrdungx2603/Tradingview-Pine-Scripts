# Báo Cáo Research — US30 Giảm 5 Phiên Liên Tiếp và Phản Ứng VNINDEX

> Trả lời câu hỏi: *"Khi US30 giảm 5 phiên liên tiếp thì phiên thứ 6 xanh bao nhiêu, và VNINDEX phản ứng thế nào?"*
> dựa trên dữ liệu D1 thật của `DJ:DJI` và `HOSE:VNINDEX` từ TradingView. Không liên quan trực tiếp tới ý tưởng strategy nào trong `market-profile-strategy-ideas.md`.

Báo cáo HTML có biểu đồ: [backtests/us30_streak/report.html](../../backtests/us30_streak/report.html).

## 1. Tổng Quan

- **Câu hỏi**: (1) phiên thứ 6 của US30 xanh bao nhiêu; (2) VNINDEX có xu hướng gì; (3) thống kê chi tiết từng episode.
- **Nguồn dữ liệu**: TradingView qua `@mathieuc/tradingview`, khung D1.
  - `DJ:DJI`: `1990-01-02 → 2026-11-20`, 9 291 phiên.
  - `HOSE:VNINDEX`: `2000-07-28 → 2026-11-20`, 6 412 phiên.
- **Script**: [backtests/us30_streak/us30_streak_backtest.mjs](../../backtests/us30_streak/us30_streak_backtest.mjs). Đọc CSV trong `backtests/us30_streak/data/`, không gọi mạng.
- **Kết quả thô**: [backtests/us30_streak/results.json](../../backtests/us30_streak/results.json).
- **Tải lại dữ liệu**: [backtests/common/tradingview/fetch_daily.mjs](../../backtests/common/tradingview/fetch_daily.mjs). Xem hướng dẫn trong [docs/tradingview-api-guide.md](../tradingview-api-guide.md).

## 2. Làm Sạch Dữ Liệu

- Episode là đúng 5 phiên US giảm liên tiếp (close thấp hơn close trước). Chuỗi dài hơn 5 chỉ tính một lần ở mốc thứ 5.
- Chỉ dùng episode có ngày US sau ngày VN đầu tiên và có đủ 10 phiên VN sau đó. Còn lại 74 episode.
- Phiên VN đầu tiên là phiên có ngày lớn hơn ngày US đóng cửa phiên thứ 5.
- Giá là giá chỉ số, chưa điều chỉnh cổ tức. Không kiểm tra khoảng trống dữ liệu trong từng chuỗi D1.

## 3. Định Nghĩa "Thành Công"

- **Phiên 6 xanh**: close phiên US thứ 6 cao hơn close phiên thứ 5.
- **VN phản ứng**: đo theo close. VN 1 phiên là close phiên VN đầu so với close trước đó. VN 5 và 10 phiên đo đến close của phiên thứ 5 và 10 tính từ phiên đầu, so với close trước phiên đầu.
- Nền so sánh là mọi phiên VN trong cùng khoảng dữ liệu.

## 4. Kết Quả

**Phiên 6 của US30** (n = 74 episode)

| Chỉ số | Giá trị |
|---|---|
| US phiên 6 xanh | 56,8% (42/74) |
| Nền US30 phiên xanh | 53,2% (9 290 phiên) |
| z (xấp xỉ chuẩn) | 0,61 |
| p hai phía | 0,54 |

**VNINDEX sau tín hiệu**

| Chỉ số | Episode (n=74) | Nền (VN, cùng khoảng) | Chênh lệch | p (Welch) | KTC 95% (bootstrap) |
|---|---|---|---|---|---|
| Phiên 1: trung bình | -0,535% | +0,054% | -0,589 | 0,0022 | [-0,92; -0,16] |
| Phiên 1: trung vị | -0,278% | | | | |
| Phiên 1: tỉ lệ xanh | 33,8% | 53,1% | | | |
| Phiên 5: trung bình | -0,284% | +0,29% | -0,578 | 0,188 | [-1,14; 0,57] |
| Phiên 10: trung bình | -0,12% | +0,61% | -0,733 | 0,249 | |

Sau khi hiệu chỉnh Bonferroni cho 5 kiểm định so với nền (×5), chỉ phiên 1 còn có ý nghĩa: p ≈ 0,011.

**Theo mức giảm US30 (5 phiên)**

| Nhóm | n | VN phiên 1 TB | VN phiên 1 xanh |
|---|---|---|---|
| Giảm nhẹ (≥ -3%) | 35 | -0,41% | 37,1% |
| Giảm vừa (-3% đến -5%) | 20 | -0,48% | 25,0% |
| Giảm mạnh (< -5%) | 19 | -0,83% | 36,8% |

**Theo giai đoạn**

| Giai đoạn | n | VN phiên 1 TB | VN phiên 1 xanh |
|---|---|---|---|
| 2000–2007 | 19 | -0,04% | 42,1% |
| 2008–2012 | 14 | -0,47% | 42,9% |
| 2013–2019 | 20 | -0,59% | 25,0% |
| 2020–2026 | 21 | -0,98% | 28,6% |

**So với các nhóm US giảm khác**

| Nhóm tín hiệu | n | VN phiên 1 TB |
|---|---|---|
| Sau chuỗi 5 phiên giảm | 74 | -0,535% |
| Sau mọi phiên US giảm | 3 089 | -0,111% |
| Sau mọi phiên US tăng | 3 526 | +0,239% |

Phản ứng sau chuỗi 5 phiên giảm yếu hơn sau một phiên US giảm bất kỳ, p ≈ 0,028 (chưa hiệu chỉnh).

## 5. Trả Lời Câu Hỏi

1. **Phiên thứ 6 của US30 xanh 56,8%** (42/74). Cao hơn nền 53,2% một chút, không có ý nghĩa thống kê (p = 0,54).
2. **VNINDEX phiên đầu tiên sau tín hiệu giảm trung bình -0,54%, chỉ 33,8% phiên xanh**. Khác biệt với nền có ý nghĩa thống kê (p = 0,002; sau Bonferroni 0,011). Sau 5 và 10 phiên, mức chênh không đủ chắc chắn để kết luận.
3. **Bảng chi tiết 74 episode** nằm ở mục Phụ Lục bên dưới và trong `results.json`.

## 6. Khuyến Nghị

- Không dùng chuỗi 5 phiên giảm của US30 làm tín hiệu vào lệnh VN. Hiệu ứng có thật ở phiên đầu, nhưng quá nhỏ (trung bình -0,5%) để bù chi phí giao dịch, và không duy trì sau 5 phiên.
- Nếu muốn kiểm tra tiếp: thêm giá mở cửa VN để đo phần gap, và chạy trên khung ngoài mẫu (ví dụ chia 2000–2016 huấn luyện, 2017–2026 kiểm tra).
- Với mẫu nhỏ, không tối ưu thêm ngưỡng mức giảm hay giai đoạn để tìm kết quả đẹp.

## 7. Giới Hạn

- **Mẫu nhỏ và không độc lập**: 74 episode, nhiều đợt tập trung vào cùng cuộc khủng hoảng (2008, 2020, 2022). Số mẫu hiệu dụng nhỏ hơn 74, p thực tế cao hơn.
- **Khoảng tin cậy rộng**: KTC 95% của trung bình phiên 1 là [-0,92%; -0,16%]. Mẫu 5 phiên [-1,14%; +0,57%] chứa 0.
- **Close-to-close bao gồm gap mở cửa**: một lệnh vào ở giá mở cửa VN không hưởng phần gap phản ứng với US. Chưa đo giá mở cửa, nên chưa biết phần đó chiếm bao nhiêu.
- **Chưa tính chi phí**: phí, thuế, trượt giá và giới hạn biên độ HOSE 7% đều chưa xét.
- **Chỉ số không phải tài sản giao dịch**: DJI và VNINDEX là chỉ số. Hợp đồng thực tế (VN30F1M, CFD US30) có giá và lịch khác.
- **In-sample toàn bộ**: chưa có giai đoạn kiểm tra ngoài mẫu.
- **p-value xấp xỉ**: dùng phân phối chuẩn xấp xỉ với Welch, không dùng phân phối t chính xác.

## Phụ Lục: 74 Episode

Chi tiết đầy đủ trong `backtests/us30_streak/results.json` (khóa `episodes`).

## Changelog

- `2026-11-21`: Tạo báo cáo lần đầu (dữ liệu D1 DJI và VNINDEX, 74 episode).
