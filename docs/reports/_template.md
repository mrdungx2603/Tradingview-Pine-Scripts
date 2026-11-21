# Báo Cáo Backtest — <Tên Rule/Câu Hỏi> trên <Symbol> (<Timeframe>)

> Trả lời câu hỏi: *"<câu hỏi gốc của người dùng>"* — dựa trên dữ liệu thật <symbol> khung
> <timeframe>. <1 câu liên kết tới ý tưởng strategy liên quan trong
> market-profile-strategy-ideas.md hoặc tài liệu khác, nếu có>.

## 1. Tổng Quan

- **Rule/câu hỏi gốc**: tham chiếu code/indicator liên quan (file + hàm).
- **Nguồn dữ liệu**: MySQL `market_data.ohlc_candles`, symbol `<...>`, timeframe `<...>`,
  `<ngày bắt đầu> → <ngày kết thúc>` (`<N>` phiên thô).
- **Phương pháp tính** (nếu dùng Market Profile): tham số TPO Period/VA%/price_step dùng.
- **Script backtest**: `backtests/<ten>/<ten>_backtest.py`. Kết quả thô: `results.json`.

## 2. Làm Sạch Dữ Liệu

Bảng vấn đề phát hiện + cách xử lý (nến lỗi, cặp phiên đứt gãy dữ liệu, outlier...). Nêu rõ
số phiên/nến bị loại và còn lại bao nhiêu sau làm sạch.

## 3. Định Nghĩa "Thành Công"

Nếu có nhiều cách đo hợp lý, liệt kê tất cả + lý do chọn (hoặc test song song).

## 4. Kết Quả

Bảng số liệu chính theo các biến thể/tham số đã test.

## 5. Trả Lời Câu Hỏi

Trả lời trực tiếp, ngắn gọn, kèm con số cụ thể — tránh mơ hồ ("khá cao", "tương đối tốt").

## 6. Khuyến Nghị Tham Số / Cải Tiến

Danh sách cụ thể, mỗi mục nêu rõ bằng chứng số liệu đi kèm.

## 7. Giới Hạn

- Cỡ mẫu, khoảng tin cậy (nếu n nhỏ).
- Giả định/đơn giản hoá đã dùng.
- Hướng mở rộng tiếp theo chưa làm trong báo cáo này.

## Changelog

- `<YYYY-MM-DD>`: Tạo báo cáo lần đầu.
