# SMC MTF Dashboard — Tài Liệu Hướng Dẫn

> **Script**: [indicators/smc_mtf_dashboard.pine](../indicators/smc_mtf_dashboard.pine) (v1.1b)
> **Ngày tạo**: 2026-11-15
> **Pine Script**: v6
> **Loại**: Indicator (dashboard, không vẽ trên chart)

---

## Tổng Quan

Dashboard hiển thị xu hướng cấu trúc SMC của tối đa 3 khung thời gian tự chọn, ngay trên chart bất kỳ.

- **BULLISH**: cấu trúc gần nhất là HH và HL, xu hướng tăng.
- **BEARISH**: cấu trúc gần nhất là LL và LH, xu hướng giảm.
- **WAIT**: chưa đủ cấu trúc để xác định xu hướng.
- **CHỜ SEED**: chưa tìm được hai pivot đầu tiên.
- **KHUNG < CHART**: khung tự chọn nhỏ hơn khung chart đang xem.

Logic cấu trúc giống [smc_market_structure.pine](smc-market-structure.md) v1.16b, chỉ dùng Pivot Seed. Mỗi khung chạy state machine riêng, không import library.

## Tham Số Đầu Vào

| Tham Số | Loại | Mặc Định | Mô Tả |
|---|---|---|---|
| **Pivot Length** | `int` | `5` | Số nến trái/phải để xác định pivot, dùng chung cho cả 3 khung (2–50) |
| **Khung TG 1 / 2 / 3** | `string` | `15` / `60` / `240` | Khung tự chọn: `5`, `15`, `60`, `240`, `D`, ... Để trống để tắt |
| **Hiển Thị** | `bool` | `true` | Bật/tắt dashboard |
| **Vị Trí** | `string` | `Top Right` | Vị trí bảng: Top / Middle / Bottom kết hợp Left / Center / Right (9 vị trí) |
| **Màu Tăng / Giảm** | `color` | blue / red | Màu xu hướng BULLISH / BEARISH |

## Logic Chính

1. Lấy giá `high`, `low`, `close`, thời điểm mở nến và pivot của từng khung bằng `request.security()`, với `lookahead_off`.
2. Khi thời điểm mở nến khung đổi, nghĩa là một nến khung vừa đóng, gọi `f_step` đúng một lần cho nến đó.
3. `f_step`:
   - Ghi giá vào mảng theo số thứ tự nến.
   - Cập nhật pivot gần nhất. Pivot được xác nhận sau `Pivot Length` nến, nên vị trí thực là `n - Pivot Length`.
   - Seed: pivot nào xuất hiện sau thì quyết định xu hướng ban đầu.
   - Săn HH/LL: nến đóng vượt cực trị thì bắt đầu săn. Khi có nến mới đóng phá đáy/đỉnh của nến ứng viên, cấu trúc được xác nhận và xu hướng đổi theo.
4. Dashboard hiển thị xu hướng và cặp Swing High / Swing Low hiện tại:
   - Uptrend: Swing High = HH, Swing Low = HL.
   - Downtrend: Swing High = LH, Swing Low = LL.

## Giới Hạn & Lưu Ý

| Vấn Đề | Mô Tả |
|---|---|
| **Khung nhỏ hơn chart** | Dòng hiển thị "KHUNG < CHART". Pine không cho đọc đúng từng nến khung nhỏ khi chart ở khung lớn hơn. Muốn xem khung nhỏ, đổi chart xuống khung đó hoặc nhỏ hơn. |
| **Độ trễ một nến khung** | Trend chỉ cập nhật khi nến khung đóng. Trong lúc nến khung đang chạy, dashboard vẫn hiện trend của nến đã đóng trước đó. |
| **Phụ thuộc lịch sử chart** | Trend được seed từ đoạn lịch sử chart đã tải. Chart 1m chỉ tải vài tháng nên có thể seed khác chart D, dẫn đến trend khác nhau giữa các chart. |
| **Không có tín hiệu** | Chỉ hiển thị trạng thái, không có alert. |

## Changelog

### v1.2 (2026-11-15)

- [x] Cột "Xu Hướng" chỉ hiển thị BULLISH hoặc BEARISH (bỏ nhãn HH/HL, LL/LH). WAIT vẫn giữ nguyên.
- [x] Vị trí bảng mở rộng lên 9 vị trí: Top, Middle, Bottom kết hợp Left, Center, Right.
- [x] Backup bản trước: `indicators/hist/smc_mtf_dashboard_v1.1c.pine`.

### v1.1b (2026-11-15)

- [x] Bỏ input "Bắt Đầu Từ" và trạng thái "THIẾU LỊCH SỬ". Trend dùng toàn bộ lịch sử chart đã tải, như v1.0. Lý do: mốc cố định buộc chart 1m phải có lịch sử từ mốc đó, nhưng chart 1m chỉ tải vài tháng gần nhất.
- [x] Bỏ cột "Seed Từ" khỏi bảng.
- [x] Backup các bản trước: `indicators/hist/smc_mtf_dashboard_v1.1.pine` (mốc 01/01/24) và `indicators/hist/smc_mtf_dashboard_v1.1b.pine` (mốc 02/12/25).

### v1.1 (2026-11-15)

- [x] Thêm input "Bắt Đầu Từ": mọi khung seed từ cùng một mốc cố định, thay vì từ đầu lịch sử chart đã tải.
- [x] Trạng thái "THIẾU LỊCH SỬ" khi chart chưa tải đến mốc.
- [x] Mốc mặc định đặt là 02/12/25 00:00 (UTC+7). Mốc 01/01/24 ban đầu khiến chart 1m (chỉ tải từ 17/11/25) báo THIẾU LỊCH SỬ ở mọi khung. Mốc mới nằm trong lịch sử mà cả ba khung trên chart 1m đều có.
- [x] Cột "Seed Từ" hiển thị ngày nến đầu tiên chart tải được khi thiếu lịch sử, để chẩn đoán.
- [x] Cột "Seed Từ" hiển thị thời điểm nến pivot dùng để seed.
- [x] Backup bản trước: `indicators/hist/smc_mtf_dashboard_v1.0.pine`.

### v1.0 (2026-11-15)

- [x] Dashboard xu hướng HH/HL và LL/LH trên 3 khung thời gian tự chọn.
- [x] Logic cấu trúc viết lại trong file, không import library, chỉ dùng Pivot Seed.
- [x] Xử lý mỗi nến đã đóng của khung đúng một lần, không đổi trạng thái theo tick của nến đang chạy.
