# Wyckoff Effort vs Result (EVR) — Tài Liệu

> **Script**: [indicators/volume/wyckoff_evr.pine](../indicators/volume/wyckoff_evr.pine) (v1.0)
> **Loại**: Indicator (pane riêng, không overlay)
> **Pine Script**: v6
> **Ngày tạo**: 2026-07-10 / **Cập nhật**: 2026-07-10

## Tổng Quan

Phân tích định lượng nguyên lý Wyckoff "Effort vs Result" — so sánh **Nỗ lực** (Volume) với **Kết quả** (Price Spread) để phát hiện sự hài hoà hoặc phân kỳ giữa 2 yếu tố này.

Chỉ số trung tâm: **WER (Wyckoff Efficiency Ratio) = Spread Ratio / Volume Ratio**, trong đó:
- `Spread Ratio = |high-low| / ATR` — biến động nến so với biến động trung bình.
- `Volume Ratio = volume / SMA(volume)` — khối lượng so với trung bình.

WER > 1 → giá dịch chuyển hiệu quả so với nỗ lực (xu hướng khoẻ). WER < 1 → nỗ lực nhiều nhưng kết quả ít (dấu hiệu yếu/phân kỳ).

## Tham Số Đầu Vào

| Nhóm | Tham Số | Loại | Mặc Định | Mô Tả |
|---|---|---|---|---|
| Dữ Liệu | Nguồn Giá Cao/Thấp | `source` | `high`/`low` | Nguồn tính spread |
| Dữ Liệu | Chu Kỳ ATR | `int` | `14` | Chuẩn hoá spread |
| Dữ Liệu | Chu Kỳ Volume MA | `int` | `20` | Chuẩn hoá volume |
| Dữ Liệu | Chu Kỳ Làm Mịn WER | `int` | `5` | SMA làm mịn WER thô |
| Ngưỡng | Ngưỡng Volume Cao/Thấp | `float` | `1.5` / `0.5` | Phân loại volume |
| Ngưỡng | Ngưỡng Spread Cao/Thấp | `float` | `1.3` / `0.7` | Phân loại spread |
| Ngưỡng | Ngưỡng Climax | `float` | `2.0` | Volume cực đoan |
| Hiển Thị | Hiển thị Histogram/WER/WER MA/Tín hiệu/Nền/Bảng | `bool` | `true` | Bật/tắt từng thành phần |
| Hiển Thị | Vị Trí Bảng | `string` | `Top Right` | 4 góc |
| Hiển Thị | Chu Kỳ WER MA | `int` | `10` | SMA dài hạn của WER |
| Màu Sắc | 7 input màu | `color` | — | Harmony, Effort w/o Result, Result w/o Effort, Low Interest, Climax, WER line, WER MA |

## Logic Chính

### Phân loại trạng thái (ưu tiên theo thứ tự, loại trừ nhau)

| Thứ tự | Trạng thái | Điều kiện |
|---|---|---|
| 1 | **Effort w/o Result** (Stopping) | `vol_ratio > vol_high` và `spread_ratio < spread_low` |
| 2 | **Result w/o Effort** (Pseudo) | `vol_ratio < vol_low` và `spread_ratio > spread_high` |
| 3 | **Low Interest** | `vol_ratio < 1.0` và `spread_ratio < 1.0` |
| 4 | **Harmony** (fallback) | Còn lại — volume & spread đều trên trung bình |

### 5 Tín hiệu (không loại trừ nhau, có thể trùng bar)

| Mã | Tên | Điều Kiện | Ý Nghĩa |
|---|---|---|---|
| `SV` | Stopping Volume | `vol_ratio>1.5` & `spread_ratio<0.7` | Dòng tiền lớn nhưng giá không dịch chuyển → sắp đảo chiều |
| `ND` | No Demand | `vol_ratio<0.5` & `spread_ratio<0.7` & nến tăng | Cầu yếu trong uptrend → xu hướng tăng sắp kết thúc |
| `NS` | No Supply | `vol_ratio<0.5` & `spread_ratio<0.7` & nến giảm | Cung yếu trong downtrend → xu hướng giảm sắp kết thúc |
| `PT` | Pushing Through | `vol_ratio>1.5` & `spread_ratio>1.3` | Breakout thật, xu hướng được xác nhận |
| `PB` | Pseudo Breakout | `vol_ratio<0.5` & `spread_ratio>1.3` | Breakout giả — bẫy |
| `CLX` | Climax | `vol_ratio > climax_threshold` | Volume cực đoan — đỉnh/đáy quan trọng |

## Output / Tín Hiệu Trên Chart

- Volume histogram tô màu theo trạng thái (Harmony/Stopping/Pseudo/Low Interest).
- Đường WER (đã làm mịn) + đường WER MA + đường tham chiếu `1.0`.
- Nền tô màu (bgcolor) vùng Stopping / Pseudo.
- Label `SV`/`ND`/`NS`/`PT`/`PB`/`CLX` tại nến tín hiệu.
- Bảng thống kê tích lũy (12 dòng): đếm + % mỗi trạng thái, đếm mỗi tín hiệu.
- 8 `alertcondition`: 6 tín hiệu + 2 trạng thái phân kỳ (Effort w/o Result, Result w/o Effort).

## Giới Hạn & Lưu Ý

- Volume trên forex/một số thị trường không phản ánh khối lượng thật (chỉ là tick volume) — độ tin cậy WER giảm trên các thị trường này.
- Ngưỡng (`vol_high/low`, `spread_high/low`, `climax_threshold`) là cố định toàn cục — nên điều chỉnh theo đặc tính biến động của từng mã/timeframe.
- Không có bộ lọc xu hướng — tín hiệu cần kết hợp với market structure hoặc vùng hỗ trợ/kháng cự để tránh nhiễu ở sideway.

## Changelog

- **v1.0** (2026-07-10): Phát hành lần đầu.
