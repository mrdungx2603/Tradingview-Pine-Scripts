# Ý Tưởng Indicator — Đảo Chiều 1-2-3 + SMC

> Tài liệu brainstorm (chưa có code Pine). Nguồn: spec 1-2-3 của người dùng (trendline → điểm 1,
> hồi thất bại → điểm 2, phá mức xác nhận → điểm 3), kết hợp với
> [`libraries/smc_core.pine`](../libraries/smc_core.pine) và
> [`indicators/smc_market_structure.pine`](../indicators/smc_market_structure.pine).
> Đã có research đầu tiên: [reports/smc-123-reversal-vn30f.md](reports/smc-123-reversal-vn30f.md).

## 1. Mô Hình 1-2-3 Trong Ngôn Ngữ SMC

| 1-2-3 (Bearish) | SMC tương ứng (`smc_core`) |
|---|---|
| Trendline tăng bị phá | CHoCH Bear (`event == 2`). Trendline thường bị phá **sớm hơn** HL ngang |
| Điểm 1 = đỉnh trước nhịp phá | HH cuối của uptrend |
| Mức xác nhận = đáy nhịp phá | Đáy chân CHoCH (LL đầu tiên) |
| Điểm 2 = đỉnh hồi không vượt điểm 1 | LH đầu tiên của downtrend mới |
| Điểm 3 = đóng cửa dưới mức xác nhận | BoS Bear đầu tiên sau CHoCH |

Bullish đối xứng. Hệ quả: phần state machine điểm 2 → điểm 3 có thể dùng lại `smc.f_process_bar()`,
chỉ cần viết thêm phần trendline và các bộ lọc.

## 2. Ý Tưởng Kết Hợp

1. **Trigger điểm 1** (`Trigger Mode`): `Trendline` (sớm, nhiều nhiễu), `CHoCH` (muộn, sạch), hoặc
   `Trendline + CHoCH` trong N nến.
2. **Lọc điểm 2 bằng SMC**:
   - Độ hồi điểm 2 so với chân (P1 → C): vùng Premium/Discount, ví dụ ≥ 61,8%.
   - Điểm 2 chạm FVG/OB sinh ra từ chân phá (dùng `smc.f_imbalance_detection`, `smc.OrderBlock`).
   - Biến thể **2B**: râu điểm 2 quét qua điểm 1 nhưng đóng cửa lại bên dưới, coi là liquidity sweep
     thay vì hủy setup.
3. **Xác nhận điểm 3 bằng order flow**: delta cùng chiều (`order_flow_core`,
   `big_aggressor_flow`), vị trí so với VWAP.
4. **Lọc khung lớn**: trend 5m/15m qua `request.security` + `f_run_smc` (lưu ý bug aliasing UDT ở
   `smc_market_structure_mtf.pine`, xem [smc-core.md](smc-core.md) Changelog v1.3).
5. **Quản trị lệnh**: entry tại nến đóng điểm 3 (hoặc limit tại OB điểm 2). SL = điểm 2 ±
   `ATR × hệ số`. TP: 1R/2R, measured move (C ± |P1 − C|), hoặc thanh khoản đối diện. Trailing theo
   LH/HL mới do `smc_core` xác nhận.
6. **VN30F**: reset setup mỗi phiên, không giữ qua nghỉ trưa hay qua đêm, timeout chờ điểm 3.

## 3. Điểm Mơ Hồ Trong Spec Gốc (cần chốt khi code)

| Điểm | Đề xuất |
|---|---|
| "Trendline không cắt nến" | Chỉ xét K pivot gần nhất. Research dùng: không nến nào giữa 2 điểm neo có râu xuyên đường |
| "Góc quá thoải" | Độ dốc tối thiểu theo ATR/nến. Research: chưa thấy ngưỡng nào giúp rõ |
| Đáy nhịp phá kết thúc khi nào | Đáy thấp nhất từ điểm 1 cho tới khi bắt đầu nhịp hồi; C dời theo nếu giá đi tiếp |
| Điểm 2 cần pivot xác nhận? | Pivot (trễ K nến) hoặc "fast" (high cao nhất của nhịp hồi, xác nhận bởi chính nến phá C). Cả hai không repaint |
| Độ trễ pivot | Nhãn "1"/"2" vẽ lùi được, tín hiệu chỉ phát ở nến đóng điểm 3 |

## 4. Kết Quả Research Đầu Tiên (tóm tắt)

Chi tiết: [reports/smc-123-reversal-vn30f.md](reports/smc-123-reversal-vn30f.md).

- 1-2-3 thô **chưa có lợi thế chứng minh được** trên VN30F1 1m/3m/5m (26–102 phiên): kỳ vọng
  quanh 0R, khoảng tin cậy luôn chứa 0. Trên 1m, phí 0,5 điểm ăn khoảng 0,1R mỗi lệnh.
- Hướng có tín hiệu nhất quán (chưa có ý nghĩa thống kê): điểm 2 chạm FVG, hồi ≥ 61,8%, thuận
  VWAP, tránh 09:00–10:00, khung 3m thay vì 1m.
- Hợp lưu Trendline + CHoCH **không** giúp. Biến thể 2B nhỉnh hơn strict một chút.

## 5. Bước Tiếp Theo

1. Lấy thêm dữ liệu (MySQL `market_data` hoặc TradingView nhiều lần fetch) để có ≥ 300 tín hiệu.
2. Kiểm tra lại 3 bộ lọc FVG/retrace/VWAP trên dữ liệu mới, out-of-sample.
3. Chỉ khi bước 2 giữ được kỳ vọng dương mới viết `indicators/smc_123_reversal.pine`.

## Changelog

- 2026-11-27: Tạo tài liệu brainstorm + research đầu tiên.
