# Global Markets Table — Tài Liệu

> **Script**: [indicators/global_markets_table.pine](../indicators/global_markets_table.pine) (v1.0)
> **Loại**: Indicator (overlay)
> **Pine Script**: v6
> **Ngày tạo**: 2026-11-18 / **Cập nhật**: 2026-11-18

## Tổng Quan

Bảng giá real-time overlay lên chart, hiển thị 9 chỉ số/tài sản quan trọng trên thế giới: **US30** (Dow Jones), **US30 Future** (hợp đồng tương lai E-mini Dow/YM), **USTECH** (Nasdaq 100), **NIKKEI 225**, **HANG SENG**, **KOSPI**, **OIL** (WTI Crude), **XAUUSD** (Vàng), **BTC** (Bitcoin). Dùng để theo dõi nhanh biến động thị trường toàn cầu ngay trên chart đang xem, không phụ thuộc mã/khung thời gian của chart chính.

## Tham Số Đầu Vào

| Nhóm | Tham Số | Loại | Mặc Định | Mô Tả |
|---|---|---|---|---|
| Danh Sách Mã | US30 / US30 Future / USTECH / NIKKEI / HANG SENG / KOSPI / OIL / XAUUSD / BTC | `symbol` | `TVC:DJI`, `CBOT_MINI:YM1!`, `TVC:NDX`, `TVC:NI225`, `TVC:HSI`, `KRX:KOSPI`, `TVC:USOIL`, `TVC:GOLD`, `BITSTAMP:BTCUSD` | Mã nguồn dữ liệu từng dòng — đổi được nếu mã mặc định không khả dụng với tài khoản/khu vực |
| Hiển Thị | Vị Trí Bảng | `string` | `Trên-Phải` | 5 lựa chọn: Trên-Phải/Trên-Trái/Dưới-Phải/Dưới-Trái/Giữa-Phải |
| Hiển Thị | Cỡ Chữ | `string` | `Nhỏ` | Rất Nhỏ/Nhỏ/Thường |
| Hiển Thị | Số Lẻ Thập Phân | `int` | `2` | Áp dụng cho cột Giá và Thay Đổi (0-4) |
| Hiển Thị | Màu Tăng / Màu Giảm | `color` | Xanh / Đỏ | Màu chữ Giá/Thay Đổi/% theo chiều biến động |
| Hiển Thị | Màu Chữ Header / Màu Nền Header | `color` | Trắng / Xám | Styling dòng tiêu đề bảng |
| Hiển Thị | Màu Nền Bảng | `color` | Đen (80% trong suốt) | Màu nền các dòng dữ liệu (không áp dụng cho header) |

## Logic Chính

- Với mỗi mã: lấy giá đóng cửa khung ngày hiện tại (`request.security(sym, "D", close)`) làm **giá hiện tại** (real-time trong phiên đang chạy) và giá đóng cửa ngày trước (`close[1]`) làm mốc so sánh.
- `Thay đổi tuyệt đối = giá hiện tại - giá đóng cửa ngày trước`; `% thay đổi = thay đổi / giá đóng cửa ngày trước × 100`.
- Cột Giá/Thay Đổi định dạng có dấu phân cách nghìn, vd `44,532.1` (số lẻ thập phân theo input "Số Lẻ Thập Phân").
- Bảng chỉ vẽ lại ở `barstate.islast` (tối ưu hiệu năng, không vẽ lại mỗi bar).
- Nếu 1 mã không có dữ liệu (symbol sai/không khả dụng) → dòng đó hiện "N/A"/"—" màu xám, không làm lỗi toàn bảng.

## Output / Tín Hiệu Trên Chart

- 1 bảng overlay, 10 dòng (1 header + 9 chỉ số) × 4 cột: Chỉ Số, Giá, Thay Đổi, %.
- Màu xanh/đỏ theo chiều tăng/giảm so với phiên trước.

## Giới Hạn & Lưu Ý

- Giá hiển thị là giá **real-time/đang hình thành** (repaint có chủ đích) — đây là bảng theo dõi giá, không phải tín hiệu giao dịch, không dùng cho backtest.
- Một số mã mặc định (đặc biệt `TVC:*`) phụ thuộc gói dữ liệu/khu vực của tài khoản TradingView — nếu không hiện giá, đổi sang mã khác tương đương qua input.
- Dùng khung ngày (`"D"`) cố định để tính % thay đổi — không có input đổi mốc so sánh (vd so với tuần trước).

## Changelog

- **v1.0** (2026-11-18): Phát hành lần đầu.
