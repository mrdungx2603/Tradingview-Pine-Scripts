# Global Markets Table — Tài Liệu

> **Script**: [indicators/global_markets_table.pine](../indicators/global_markets_table.pine) (v1.3)
> **Loại**: Indicator (overlay)
> **Pine Script**: v6
> **Ngày tạo**: 2026-11-18 / **Cập nhật**: 2026-11-21

## Tổng Quan

Bảng giá real-time overlay lên chart, hiển thị 9 chỉ số/tài sản quan trọng trên thế giới: **US30** (Dow Jones), **US30 Future** (hợp đồng tương lai E-mini Dow/YM), **USTECH** (Nasdaq 100), **NIKKEI 225**, **HANG SENG**, **KOSPI**, **OIL** (WTI Crude), **XAUUSD** (Vàng), **BTC** (Bitcoin). Dùng để theo dõi nhanh biến động thị trường toàn cầu ngay trên chart đang xem, không phụ thuộc mã/khung thời gian của chart chính. Có 2 kiểu hiển thị chọn qua input, mặc định là kiểu lưới gọn (ít tốn chiều cao chart hơn).

## Tham Số Đầu Vào

| Nhóm | Tham Số | Loại | Mặc Định | Mô Tả |
|---|---|---|---|---|
| Danh Sách Mã | US30 / US30 Future / USTECH / NIKKEI / HANG SENG / KOSPI / OIL / XAUUSD / BTC | `symbol` | `TVC:DJI`, `CBOT_MINI:YM1!`, `TVC:NDX`, `TVC:NI225`, `TVC:HSI`, `KRX:KOSPI`, `TVC:USOIL`, `TVC:GOLD`, `BITSTAMP:BTCUSD` | Mã nguồn dữ liệu từng dòng — đổi được nếu mã mặc định không khả dụng với tài khoản/khu vực |
| Hiển Thị | Kiểu Hiển Thị | `string` | `Lưới Gọn` | 2 lựa chọn: "Lưới Gọn" (lưới 3x3, chỉ 3 dòng cao) / "Bảng Chi Tiết" (bảng 9 dòng x 4 cột như bản gốc) |
| Hiển Thị | Vị Trí Bảng | `string` | `Trên-Phải` | 5 lựa chọn: Trên-Phải/Trên-Trái/Dưới-Phải/Dưới-Trái/Giữa-Phải |
| Hiển Thị | Cỡ Chữ | `string` | `Nhỏ` | Rất Nhỏ/Nhỏ/Thường |
| Hiển Thị | Số Lẻ Thập Phân | `int` | `2` | Áp dụng cho cột Giá và Thay Đổi (0-4) |
| Lưới Gọn - Màu Sắc | Màu Tăng / Màu Giảm | `color` | Xanh / Đỏ | Màu nền ô (trước khi áp độ trong suốt) theo chiều tăng/giảm — **chỉ áp dụng khi Kiểu Hiển Thị = "Lưới Gọn"** |
| Lưới Gọn - Màu Sắc | Màu Chữ | `color` | Trắng | Màu chữ 3 dòng (Tên/Giá/Thay đổi) trong mỗi ô |
| Lưới Gọn - Màu Sắc | Độ Trong Suốt Nền Ô | `int` | `60` | 0 (đặc) - 100 (trong suốt hoàn toàn), áp cho nền ô theo màu Tăng/Giảm |
| Bảng Chi Tiết - Màu Sắc | Màu Tăng / Màu Giảm | `color` | Xanh / Đỏ | Màu chữ cột Giá/Thay Đổi/% — **chỉ áp dụng khi Kiểu Hiển Thị = "Bảng Chi Tiết"** |
| Bảng Chi Tiết - Màu Sắc | Màu Chữ Header / Màu Nền Header | `color` | Trắng / Xám | Styling dòng tiêu đề bảng |
| Bảng Chi Tiết - Màu Sắc | Màu Tên Chỉ Số | `color` | Trắng | Màu chữ cột "Chỉ Số" (tên mã) ở các dòng dữ liệu |
| Bảng Chi Tiết - Màu Sắc | Màu Nền Bảng | `color` | Đen (80% trong suốt) | Màu nền các dòng dữ liệu (không áp dụng cho header) |

## Logic Chính

- Với mỗi mã: lấy giá đóng cửa khung ngày hiện tại (`request.security(sym, "D", close)`) làm **giá hiện tại** (real-time trong phiên đang chạy) và giá đóng cửa ngày trước (`close[1]`) làm mốc so sánh.
- `Thay đổi tuyệt đối = giá hiện tại - giá đóng cửa ngày trước`; `% thay đổi = thay đổi / giá đóng cửa ngày trước × 100`.
- Cột Giá/Thay Đổi định dạng có dấu phân cách nghìn, vd `44,532.1` (số lẻ thập phân theo input "Số Lẻ Thập Phân").
- Bảng chỉ vẽ lại ở `barstate.islast` (tối ưu hiệu năng, không vẽ lại mỗi bar).
- Nếu 1 mã không có dữ liệu (symbol sai/không khả dụng) → dòng đó hiện "N/A"/"—" màu xám, không làm lỗi toàn bảng.

## Output / Tín Hiệu Trên Chart

- **Lưới Gọn** (mặc định): 1 bảng overlay, lưới 3x3 (3 dòng cao), mỗi ô = 1 chỉ số với 3 dòng text (Tên / Giá / Thay đổi tuyệt đối + %), nền ô tô màu xanh/đỏ nhạt theo chiều tăng/giảm.
- **Bảng Chi Tiết**: 1 bảng overlay, 10 dòng (1 header + 9 chỉ số) × 4 cột: Chỉ Số, Giá, Thay Đổi, %, màu chữ xanh/đỏ theo chiều tăng/giảm.

## Giới Hạn & Lưu Ý

- Giá hiển thị là giá **real-time/đang hình thành** (repaint có chủ đích) — đây là bảng theo dõi giá, không phải tín hiệu giao dịch, không dùng cho backtest.
- Một số mã mặc định (đặc biệt `TVC:*`) phụ thuộc gói dữ liệu/khu vực của tài khoản TradingView — nếu không hiện giá, đổi sang mã khác tương đương qua input.
- Dùng khung ngày (`"D"`) cố định để tính % thay đổi — không có input đổi mốc so sánh (vd so với tuần trước).

## Changelog

- **v1.3** (2026-11-21): Tách setting màu sắc/style thành 2 group riêng theo từng kiểu hiển thị — "Lưới Gọn - Màu Sắc" (Màu Tăng/Giảm, Màu Chữ, Độ Trong Suốt Nền Ô) và "Bảng Chi Tiết - Màu Sắc" (giữ các input màu cũ), không còn dùng chung input màu giữa 2 kiểu.
- **v1.2** (2026-11-21): Thêm kiểu hiển thị "Lưới Gọn" (lưới 3x3, 3 dòng cao, nền ô tô màu theo tăng/giảm) để giảm chiều cao chiếm trên chart — đặt làm mặc định; giữ "Bảng Chi Tiết" (layout gốc) làm lựa chọn thứ 2 qua input "Kiểu Hiển Thị".
- **v1.1** (2026-11-18): Thêm input "Màu Tên Chỉ Số" cho cột tên mã (trước đó hardcode màu trắng).
- **v1.0** (2026-11-18): Phát hành lần đầu.
