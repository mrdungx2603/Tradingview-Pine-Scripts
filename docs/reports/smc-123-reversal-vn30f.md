# Báo Cáo Backtest — Đảo Chiều 1-2-3 + Bộ Lọc SMC trên VN30F1 (1m / 3m / 5m)

> Trả lời câu hỏi: *"Mô hình 1-2-3 nên kích hoạt bằng phá trendline hay CHoCH, và bộ lọc SMC nào
> ở điểm 2 thực sự giúp?"* Ý tưởng gốc: [smc-123-reversal-ideas.md](../smc-123-reversal-ideas.md).

## 1. Tổng Quan

- **Logic tham chiếu**: state machine CHoCH giống `backtests/smc_choch/` (bám
  `indicators/smc_market_structure.pine`, Session Seed). Trendline và 1-2-3 viết mới trong script.
- **Nguồn dữ liệu**: TradingView `HNX:VN301!` qua `backtests/common/tradingview/fetch_daily.mjs`
  (giới hạn 5 000 nến/lần). MySQL `market_data` không dùng được lần này: `python3` thiếu
  `mysql-connector` và `.env` không có `MARKET_DATA_DB_URL`.

| TF | Phiên | Giai đoạn |
|---|---|---|
| 1m | 26 | 2026-10-22 → 2026-11-27 (gộp file cũ của `smc_choch` + file mới) |
| 3m | 62 | 2026-08-28 → 2026-11-27 |
| 5m | 102 | 2026-07-03 → 2026-11-27 |

- **Script**: `backtests/smc_123/smc_123_backtest.mjs`. Kết quả thô: `backtests/smc_123/results.json`.

## 2. Làm Sạch Dữ Liệu

- Chỉ giữ nến khớp lệnh liên tục 9:00–11:30, 13:00–14:45 (giờ VN). Loại nến giá ≤ 0 (không có).
- Phiên < 30 nến bị bỏ. Gộp 2 file 1m theo timestamp (đã kiểm tra trùng khớp giá ở vùng giao nhau).

## 3. Định Nghĩa

**Setup SHORT** (LONG đối xứng), pivot K nến mỗi bên, K ∈ {3, 5}:

- **Trigger**: `CHoCH` (đóng cửa dưới HL khi đang HH+HL) hoặc `TL` (đóng cửa dưới trendline nối 2
  pivot low tăng dần, không nến nào giữa 2 điểm neo có low dưới đường).
- **Điểm 1** = high cao nhất từ đáy neo tới nến trigger. **C** = low thấp nhất sau điểm 1, dời theo
  khi giá đi tiếp.
- **Điểm 2**: `pivot` (pivot high đã xác nhận) hoặc `fast` (high cao nhất của nhịp hồi, hồi ≥ 23,6%
  chân, cách C ≥ 2 nến).
- **Hủy**: `strict` (high > điểm 1) hoặc `2B` (chỉ hủy khi đóng cửa > điểm 1). Hết hạn sau 60 nến.
- **Điểm 3** = nến đóng cửa < C → vào lệnh giá đóng.
- **Kết quả**: SL = điểm 2 + 0,25×ATR(14). TP 1R, 2R, hoặc measured move. Cùng nến chạm cả SL và TP
  thì tính SL. Không chạm thì đóng cuối phiên. Phí giả định **0,5 điểm/lệnh**. Đo bằng **R ròng**.
- **Đối chứng**: vào lệnh ở mỗi nến thứ 3 cả 2 chiều, SL = cực trị 10 nến + 0,25×ATR, TP 1R.

## 4. Kết Quả

### 4.1 So sánh cấu hình (K=5, kỳ vọng R ròng, TP 1R)

| Cấu hình | 1m n | 1m E | 3m n | 3m E | 5m n | 5m E |
|---|---|---|---|---|---|---|
| CHoCH · strict · pivot | 9 | −0,01 | 1 | — | 0 | — |
| CHoCH · 2B · fast | 24 | −0,03 | 5 | +0,26 | 1 | — |
| TL · strict · pivot | 20 | +0,10 | 5 | +0,52 | 0 | — |
| TL · 2B · fast | 51 | −0,06 | 22 | +0,12 | 11 | +0,09 |
| **Đối chứng** | — | −0,31 | — | −0,18 | — | −0,15 |

K=3, TL · 2B · fast: 1m n=82 E=−0,11 [−0,32; +0,10], 3m n=38 E=+0,14 [−0,13; +0,40],
5m n=31 E=+0,05 [−0,22; +0,33].

**Trước phí**: đối chứng ≈ 0,00R ở mọi TF. 1-2-3 TL · 2B · fast trước phí: 1m +0,03 đến +0,07R,
3m +0,21R. Rủi ro trung bình mỗi lệnh 1m chỉ khoảng 4,5 điểm, nên phí 0,5 điểm ăn khoảng 0,11R.

### 4.2 Phễu (1m, K=5)

| Trigger | Số trigger | Hủy do vượt P1 | Hết hạn | Ra tín hiệu |
|---|---|---|---|---|
| CHoCH (2B · fast) | 60 | 22 | 9 | 24 |
| TL (2B · fast) | 185 | 60 | 30 | 51 |

Trendline cho khoảng 3 lần số trigger so với CHoCH. Khoảng 1/3 setup bị hủy vì giá vượt điểm 1.

### 4.3 Bộ lọc (gộp 1m+3m+5m, cấu hình 2B · fast, R ròng TP 1R)

| Bộ lọc | TL K=3 (n=151) | TL K=5 (n=84) | CHoCH K=3 (n=49) | CHoCH K=5 (n=30) |
|---|---|---|---|---|
| Tất cả | −0,02 | +0,01 | −0,01 | +0,03 |
| P2 chạm FVG / không | +0,05 / −0,09 | −0,01 / +0,03 | +0,13 / −0,35 | +0,15 / −0,29 |
| Hồi ≥ 61,8% / 38–62% | +0,07 / −0,15 | +0,19 / −0,14 | +0,39 / −0,25 | +0,24 / −0,09 |
| Thuận / ngược VWAP | +0,01 / −0,17 | +0,02 / −0,06 | −0,01 / −0,03 | +0,06 / −0,29 |
| Hợp lưu TL+CHoCH / không | −0,03 / −0,01 | −0,01 / +0,01 | −0,12 / +0,35 | −0,09 / +0,24 |
| 2B sweep / không | +0,34 (n=10) / −0,04 | +0,23 (n=4) / −0,01 | +0,33 (n=4) / −0,04 | n=2 |
| Short / Long | +0,07 / −0,11 | +0,14 / −0,16 | −0,05 / +0,04 | −0,19 / +0,29 |
| Giờ 09:00–10:00 | −0,83 (n=6) | −1,13 (n=2) | −1,13 (n=2) | −1,13 (n=2) |

Khoảng tin cậy 95% của **mọi ô** đều chứa 0, trừ CHoCH K=3 hồi ≥ 61,8% (+0,39 [+0,03; +0,76],
n=15) và CHoCH 14:00–14:45 (+0,27, n=13). Với ~40 phép so sánh, vài ô "có ý nghĩa" là điều chờ
đợi được do ngẫu nhiên.

## 5. Trả Lời Câu Hỏi

- **Trendline hay CHoCH?** Không phân biệt được. Cả hai cho kỳ vọng ròng quanh 0R (−0,1 đến +0,1R
  ở 1m). Trendline cho nhiều tín hiệu hơn khoảng 2–3 lần với chất lượng tương đương.
- **1-2-3 có tốt hơn vào lệnh ngẫu nhiên không?** Có, trước phí 1-2-3 khoảng +0,03 đến +0,2R so với
  0R của đối chứng, nhưng chưa có ý nghĩa thống kê.
- **Bộ lọc nào giúp?** Ba hướng cùng dấu ở cả 4 nhóm gộp (chưa có ý nghĩa thống kê): hồi điểm 2
  ≥ 61,8%, điểm 2 chạm FVG (rõ ở CHoCH), thuận VWAP. Tránh 09:00–10:00 (mẫu rất nhỏ).
- **Không giúp**: hợp lưu TL + CHoCH (còn kém hơn đơn lẻ), độ dốc trendline, TP 2R ở 1m.

## 6. Khuyến Nghị

1. **Chưa viết indicator/strategy** dựa trên kết quả này: chưa có cấu hình nào có kỳ vọng ròng dương
   chắc chắn.
2. Nếu vẫn dựng indicator để quan sát, dùng mặc định: trigger `TL`, hủy kiểu `2B`, điểm 2 `fast`,
   lọc hồi ≥ 61,8% và thuận VWAP, khung **3m** thay vì 1m (phí nhỏ hơn so với rủi ro).
3. Lấy thêm dữ liệu rồi chạy lại để kiểm tra 3 bộ lọc trên mẫu ngoài (xem Giới Hạn).

## 7. Giới Hạn

- **Mẫu nhỏ**: 26 phiên 1m, 62 phiên 3m, 102 phiên 5m. Tín hiệu mỗi cấu hình 5–82.
- **Gộp TF không độc lập**: 1m/3m/5m trùng ngày nên cùng một biến động có thể đếm nhiều lần.
- **Nhiều phép so sánh**: 16 cấu hình × 3 TF × 9 bộ lọc, chưa hiệu chỉnh. Chưa có out-of-sample thật.
  Cột chia nửa (`split` trong `results.json`) cho thấy nhiều cấu hình đổi dấu giữa 2 nửa.
- **Giả định**: phí 0,5 điểm/lệnh, vào lệnh giá đóng nến điểm 3, SL ưu tiên khi cùng nến.
  Trendline chỉ xét cặp pivot mới nhất hợp lệ, không chấm điểm "đẹp".
- **Chưa làm**: lọc OB (chỉ đo FVG), delta order flow, trend khung lớn, trailing stop.

## Changelog

- 2026-11-27: Tạo báo cáo lần đầu.
