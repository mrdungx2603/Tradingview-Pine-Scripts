# LSC Pattern Indicator — Tài Liệu

> **Script**: [indicators/lsc_pattern.pine](../indicators/lsc_pattern.pine) (v1.0)
> **Loại**: Indicator (overlay)
> **Pine Script**: v6
> **Ngày tạo**: 2026-06-24 / **Cập nhật**: 2026-06-24

## Tổng Quan

Phát hiện pattern đảo chiều 3 nến LSC (Low/High Spike + Confirmation):

- **LSC Low (▲)**: nến giữa tạo đáy thấp nhất trong 3 nến, nến thứ 3 đóng cửa vượt lên trên high của nến giữa → tín hiệu tăng (đảo chiều từ đáy).
- **LSC High (▼)**: nến giữa tạo đỉnh cao nhất trong 3 nến, nến thứ 3 đóng cửa xuống dưới low của nến giữa → tín hiệu giảm (đảo chiều từ đỉnh).

Indicator nhẹ, không dùng UDT/array, chỉ vẽ label khi tín hiệu xác nhận trên nến đã đóng (`barstate.isconfirmed`) — không repaint.

## Tham Số Đầu Vào

| Nhóm | Tham Số | Loại | Mặc Định | Mô Tả |
|---|---|---|---|---|
| Hiển Thị | Hiển Thị LSC Low | `bool` | `true` | Bật/tắt label ▲ |
| Hiển Thị | Hiển Thị LSC High | `bool` | `true` | Bật/tắt label ▼ |
| Hiển Thị | Màu LSC Low (▲) | `color` | `#00bcd4` | Màu label tăng |
| Hiển Thị | Màu LSC High (▼) | `color` | `#ff5252` | Màu label giảm |
| Hiển Thị | Hiển Thị Nền Label | `bool` | `true` | Tắt → label chỉ có viền chữ màu, nền trong suốt |

## Logic Chính

```
LSC Low  = confirmed AND low[1] < low[0] AND low[1] < low[2] AND close > high[1]
LSC High = confirmed AND high[1] > high[0] AND high[1] > high[2] AND close < low[1]
```

Nến giữa (`[1]`) là nến xoay trục (có đáy/đỉnh cực trị so với 2 nến lân cận); nến hiện tại (`[0]`) phải đóng cửa xuyên qua phía đối diện của nến giữa để xác nhận.

## Output / Tín Hiệu Trên Chart

- Label `▲` dưới đáy nến giữa khi LSC Low xác nhận.
- Label `▼` trên đỉnh nến giữa khi LSC High xác nhận.
- 2 `alertcondition`: "LSC Low (Tăng)", "LSC High (Giảm)".

## Giới Hạn & Lưu Ý

- Tín hiệu chỉ xác nhận sau khi nến thứ 3 đóng cửa — không repaint nhưng có độ trễ 1 nến so với đỉnh/đáy thực tế.
- Không có bộ lọc xu hướng/volume — nên kết hợp với indicator khác (SMC, Volume Profile) để tăng độ tin cậy.
- `max_labels_count=500` — pattern xuất hiện thường xuyên trên timeframe thấp có thể đạt giới hạn ở lịch sử dài.

## Changelog

- **v1.0** (2026-06-24): Phát hành lần đầu.
