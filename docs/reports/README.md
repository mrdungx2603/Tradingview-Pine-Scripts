# Mục Lục Research

Danh sách các báo cáo research định lượng. Mỗi báo cáo theo template [_template.md](_template.md).

## Quy Ước

- File báo cáo: `docs/reports/<chu-de-kebab-case>.md`, ví dụ `va-rule-vn30f1m.md`.
- Script backtest: `backtests/<ten>/<ten>_backtest.py`, kết quả thô `backtests/<ten>/results.json`.
- Thêm một dòng vào bảng bên dưới khi tạo báo cáo mới. Cập nhật cột Trạng thái khi báo cáo có thêm kết quả.
- Trạng thái: `Hoàn thành`, `Đang làm`, `Cần dữ liệu thêm`.

## Danh Sách

| Ngày | Chủ đề | Câu hỏi | Symbol / TF | Dữ liệu | Trạng thái | Báo cáo | Backtest | Kết luận chính |
|---|---|---|---|---|---|---|---|---|
| 2026-11-21 | US30 streak → VNINDEX | US30 giảm 5 phiên liên tiếp thì phiên 6 xanh bao nhiêu và VNINDEX phản ứng thế nào | DJ:DJI, HOSE:VNINDEX / D1 | DJI 1990-01-02 → 2026-11-20; VNINDEX 2000-07-28 → 2026-11-20, 74 episode | Hoàn thành | [us30-streak-vnindex.md](us30-streak-vnindex.md) | [backtests/us30_streak](../../backtests/us30_streak/) | Phiên 6 xanh 56,8% (không khác nền 53,2%, p=0,54). VN phiên 1 TB -0,54%, 33,8% xanh (p=0,002, Bonferroni 0,011). Sau 5–10 phiên không có ý nghĩa. |
| 2026-11-21 | 80% Value Area Rule | Tỉ lệ thành công của VA Rule và thông số nào cải thiện nó | VN30F1M / 1m | 2026-05-26 → 2026-11-18, 103 cặp phiên sau làm sạch | Hoàn thành (chưa tính P&L) | [va-rule-vn30f1m.md](va-rule-vn30f1m.md) | [backtests/va_rule](../../backtests/va_rule/) | Đóng trong VA cũ 43.5%, chạm POC 71.7%, baseline ngẫu nhiên 29.1%. Nên dùng tiêu chí chạm POC và xác nhận ≥5 bar. |

## Liên Quan

- Ý tưởng strategy gốc: [market-profile-strategy-ideas.md](../market-profile-strategy-ideas.md)
- Vấn đề dữ liệu đã biết: khoảng trống trong dữ liệu VN30F1M 1m được ghi trong mục 2 của báo cáo VA Rule.

## Changelog

- 2026-11-21: Tạo mục lục với một báo cáo (VA Rule).
- 2026-11-21: Thêm báo cáo US30 streak → VNINDEX và hướng dẫn [tradingview-api-guide.md](../tradingview-api-guide.md).
