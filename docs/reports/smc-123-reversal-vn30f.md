# Báo Cáo Backtest — Đảo Chiều 1-2-3 + Bộ Lọc SMC trên VN30F1M (1m / 3m)

> Trả lời câu hỏi: *"Mô hình 1-2-3 nên kích hoạt bằng phá trendline hay CHoCH, và bộ lọc SMC nào
> ở điểm 2 thực sự giúp?"* Ý tưởng gốc: [smc-123-reversal-ideas.md](../smc-123-reversal-ideas.md).

## 1. Tổng Quan

- **Logic tham chiếu**: state machine CHoCH giống `backtests/smc_choch/` (bám
  `indicators/smc_market_structure.pine`, Session Seed). Trendline và 1-2-3 viết mới trong script.
- **Nguồn dữ liệu**: MySQL `market_data.ohlc_candles`, symbol `VN30F1M`, khung `1m` (gốc) +
  `3m` (resample từ 1m, gộp mỗi 3 nến theo mốc đồng hồ UTC). **26/05/2026 → 26/11/2026, 112 phiên**
  cho cả 2 khung — thay cho lần chạy trước dùng CSV TradingView `HNX:VN301!` (chỉ 26 phiên 1m,
  giới hạn 5 000 nến/lần export, lúc đó MySQL chưa dùng được vì thiếu `mysql-connector`).
  `VN30F1M` ≠ `VN301!` về ký hiệu (mã hợp đồng tương lai cụ thể vs mã liên tục TradingView) nên
  không đảm bảo khớp giá tuyệt đối với báo cáo lần trước, dù cùng là VN30 Futures.
- **Chưa làm lần này**: khung 5m (MySQL chỉ có sẵn 1m/1d, resample 5m chưa thực hiện).
- **Script**: `backtests/smc_123/smc_123_backtest.mjs`. Dữ liệu CSV trung gian:
  `backtests/smc_123/data/vn30f1m_m1.csv`, `vn30f1m_m3.csv`. Kết quả thô: `results.json`.

## 2. Làm Sạch Dữ Liệu

- Loại 11 nến giá ≤ 0 trên tổng 28 885 nến 1m thô (0,04%) khi tải từ `ohlc_candles`.
- Khung 3m resample bằng `floor(time, 3min)` trên dữ liệu 1m đã làm sạch (OHLC chuẩn: open=nến
  đầu, close=nến cuối, high/low=max/min, volume=tổng) — không phải nến 3m gốc từ sàn.
- Chỉ giữ nến khớp lệnh liên tục 9:00–11:30, 13:00–14:45 (giờ VN). Phiên < 30 nến bị bỏ (không
  phiên nào bị loại ở bước này với dữ liệu MySQL).

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

### 4.1 Khung 1m (112 phiên) — đối chứng 1R = −0,33, 2R = −0,29

| K | Cấu hình | trig | huỷ P1 | hết hạn | n sig | win 1R | E(1R) | E(2R) | E(MM) | nửa 1 / nửa 2 |
|---|---|---|---|---|---|---|---|---|---|---|
| 3 | CHoCH·strict·pivot | 390 | 190 | 104 | 67 | 42% | −0,25 | −0,11 | −0,15 | −0,36 / −0,13 |
| 3 | CHoCH·strict·fast | 390 | 169 | 66 | 134 | 46% | −0,19 | −0,12 | −0,11 | −0,20 / −0,19 |
| 3 | CHoCH·2B·pivot | 390 | 162 | 109 | 81 | 46% | −0,18 | −0,12 | −0,13 | −0,29 / −0,04 |
| 3 | CHoCH·2B·fast | 390 | 147 | 68 | 146 | 47% | −0,18 | −0,15 | −0,13 | −0,21 / −0,14 |
| 3 | TL·strict·pivot | 1479 | 525 | 212 | 156 | 51% | −0,05 | +0,08 | +0,04 | −0,04 / −0,07 |
| 3 | TL·strict·fast | 1479 | 518 | 156 | 305 | 50% | −0,11 | −0,02 | −0,03 | −0,14 / −0,08 |
| 3 | TL·2B·pivot | 1479 | 454 | 227 | 167 | 50% | −0,05 | +0,08 | +0,00 | −0,06 / −0,04 |
| 3 | TL·2B·fast | 1479 | 446 | 163 | 328 | 49% | −0,14 | −0,03 | −0,09 | −0,19 / −0,08 |
| 5 | CHoCH·strict·pivot | 261 | 105 | 102 | 36 | 53% | −0,03 | +0,15 | +0,19 | +0,02 / −0,10 |
| 5 | CHoCH·strict·fast | 261 | 93 | 62 | 90 | 53% | −0,05 | +0,05 | +0,07 | −0,02 / −0,09 |
| 5 | CHoCH·2B·pivot | 261 | 91 | 107 | 41 | 56% | +0,03 | +0,17 | +0,20 | +0,05 / +0,01 |
| 5 | CHoCH·2B·fast | 261 | 80 | 66 | 95 | 52% | −0,09 | −0,02 | +0,03 | −0,05 / −0,13 |
| 5 | TL·strict·pivot | 862 | 316 | 173 | 92 | 57% | +0,06 | **+0,21** | +0,19 | −0,03 / +0,18 |
| 5 | TL·strict·fast | 862 | 297 | 113 | 217 | 53% | −0,07 | +0,00 | +0,04 | −0,13 / −0,01 |
| 5 | TL·2B·pivot | 862 | 262 | 193 | 102 | 56% | +0,05 | **+0,20** | +0,16 | −0,05 / +0,19 |
| 5 | TL·2B·fast | 862 | 250 | 127 | 228 | 53% | −0,07 | +0,01 | +0,02 | −0,15 / +0,02 |

### 4.2 Khung 3m (112 phiên) — đối chứng 1R = −0,17, 2R = −0,14

| K | Cấu hình | trig | huỷ P1 | hết hạn | n sig | win 1R | E(1R) | E(2R) | E(MM) | nửa 1 / nửa 2 |
|---|---|---|---|---|---|---|---|---|---|---|
| 3 | CHoCH·strict·pivot | 117 | 34 | 62 | 11 | 64% | +0,12 | +0,33 | +0,06 | +0,14 / +0,10 |
| 3 | CHoCH·strict·fast | 117 | 26 | 53 | 29 | 45% | −0,16 | −0,22 | −0,21 | −0,24 / −0,10 |
| 3 | CHoCH·2B·pivot | 117 | 30 | 63 | 14 | 64% | +0,16 | +0,21 | +0,00 | +0,09 / +0,23 |
| 3 | CHoCH·2B·fast | 117 | 22 | 54 | 32 | 47% | −0,12 | −0,22 | −0,21 | −0,21 / −0,04 |
| 3 | TL·strict·pivot | 389 | 150 | 100 | 34 | 50% | +0,04 | +0,11 | +0,06 | −0,18 / +0,26 |
| 3 | TL·strict·fast | 389 | 134 | 82 | 82 | 50% | −0,00 | +0,04 | +0,00 | −0,13 / +0,14 |
| 3 | TL·2B·pivot | 389 | 124 | 103 | 39 | 49% | +0,05 | +0,07 | +0,05 | −0,16 / +0,27 |
| 3 | TL·2B·fast | 389 | 108 | 87 | 88 | 50% | +0,00 | +0,02 | −0,00 | −0,10 / +0,12 |
| 5 | CHoCH·strict·pivot | 57 | 15 | 41 | **1** | 100% | +0,94 | +1,94 | +0,72 | — / +0,94 |
| 5 | CHoCH·strict·fast | 57 | 14 | 32 | 11 | 45% | +0,00 | +0,08 | −0,03 | −0,23 / +0,40 |
| 5 | CHoCH·2B·pivot | 57 | 12 | 42 | 3 | 33% | +0,12 | +0,45 | +0,43 | — / +0,12 |
| 5 | CHoCH·2B·fast | 57 | 11 | 33 | 13 | 38% | −0,04 | +0,02 | +0,02 | −0,23 / +0,17 |
| 5 | TL·strict·pivot | 187 | 70 | 78 | 12 | 42% | +0,09 | −0,08 | +0,05 | −0,27 / +0,27 |
| 5 | TL·strict·fast | 187 | 64 | 57 | 45 | 47% | +0,04 | −0,03 | +0,05 | −0,20 / +0,31 |
| 5 | TL·2B·pivot | 187 | 60 | 82 | 14 | 36% | +0,05 | −0,10 | +0,09 | −0,25 / +0,21 |
| 5 | TL·2B·fast | 187 | 55 | 61 | 47 | 47% | +0,05 | −0,04 | +0,07 | −0,16 / +0,28 |

Dòng `CHoCH·strict·pivot` K=5 3m **n=1** — chỉ 1 lệnh, không phải tín hiệu thống kê, bỏ qua khi
kết luận. Các dòng `pivot` khác ở 3m cũng có n quá nhỏ (3–39) để tin.

### 4.3 Bộ lọc (gộp 1m+3m, cấu hình `2B·fast`, R ròng TP 1R, khoảng tin cậy 95%)

| Bộ lọc | TL K=3 (n=416) | TL K=5 (n=275) | CHoCH K=3 (n=178) | CHoCH K=5 (n=108) |
|---|---|---|---|---|
| Tất cả | **−0,11 [−0,20;−0,02]** | −0,05 [−0,16;0,06] | **−0,17 [−0,31;−0,03]** | −0,08 [−0,26;0,09] |
| P2 chạm FVG / không | −0,06 / **−0,16** | −0,02 / −0,09 | −0,11 / **−0,29** | −0,02 / −0,28 |
| Hồi ≥ 61,8% / 38–62% / < 38% | **−0,16** / −0,05 / −0,07 | −0,16 / +0,01 / +0,05 | −0,19 / −0,14 / −0,17 | **−0,30** / +0,02 / +0,09 |
| Thuận / ngược VWAP | −0,04 / **−0,38** | +0,01 / **−0,28** | −0,14 / −0,28 | −0,06 / −0,23 |
| Hợp lưu TL+CHoCH / không | −0,15 / −0,09 | −0,00 / −0,06 | **−0,22** / +0,11 | −0,07 / −0,11 |
| 2B sweep / không | −0,12 / **−0,10** | −0,07 / −0,05 | +0,06 / **−0,19** | −0,27 / −0,06 |
| Short / Long | −0,09 / −0,13 | +0,05 / −0,16 | **−0,22** / −0,12 | −0,06 / −0,11 |

In đậm = khoảng tin cậy 95% không chứa 0 (có ý nghĩa thống kê ở mức này). Khác biệt rõ nhất so
với báo cáo cũ (mẫu 26 phiên, mọi ô CI chứa 0): với 112 phiên thật, **tổng thể cấu hình `TL·2B·fast`
K=3 và `CHoCH·2B·fast` K=3 có kỳ vọng ròng âm có ý nghĩa thống kê** — không còn ở mức "chưa chứng
minh được", mà nghiêng về "có bằng chứng là lỗ" ở K=3. Giao dịch **ngược VWAP** rõ ràng tệ hơn
(CI âm hoàn toàn ở cả TL K=3 và K=5) — đây là bộ lọc có bằng chứng mạnh nhất trong bảng.

## 5. Trả Lời Câu Hỏi

- **Trendline hay CHoCH?** Trendline cho nhiều tín hiệu hơn (~3,5–8 lần tuỳ K) nhưng không tốt hơn
  CHoCH về kỳ vọng — ở K=3 cả hai đều âm có ý nghĩa thống kê (bảng 4.3). Ở K=5 (điểm 2 `pivot`,
  bảng 4.1) TL nhúc nhích nhỉnh hơn (E(2R) 1m +0,20–0,21 vs CHoCH +0,17–0,20) nhưng n nhỏ (92–102)
  và lệch nửa kỳ (xem dưới) nên chưa đủ tin.
- **1-2-3 có tốt hơn vào lệnh ngẫu nhiên không?** Khó nói là "có" như báo cáo cũ kết luận. Đối
  chứng vẫn âm (do phí/trượt giá), nhưng với mẫu lớn hơn, chính cấu hình chính `2B·fast` K=3 (dùng
  cho cả TL và CHoCH) lại **âm có ý nghĩa thống kê**, tệ hơn mức "quanh 0" của báo cáo trước.
- **Bộ lọc nào giúp?** Chỉ **thuận VWAP** có bằng chứng rõ (tránh ngược VWAP, CI âm hoàn toàn ở cả
  2 khung với TL). Chạm FVG và hồi ≥ 61,8% nghiêng đúng hướng ở vài ô nhưng không nhất quán giữa
  TL/CHoCH. **Hợp lưu TL+CHoCH không giúp**, thậm chí tệ hơn ở CHoCH K=3 (−0,22 có ý nghĩa).
- **Các config `pivot` ở K=5 (vẻ dương nhất, bảng 4.1)**: chưa đủ tin — nửa đầu kỳ âm, nửa sau
  dương khá rõ ở cả TL·strict·pivot và TL·2B·pivot (1m: −0,03/−0,05 → +0,18/+0,19), gợi ý phụ
  thuộc giai đoạn (regime) nhiều hơn là một edge ổn định. Bản thân việc chờ xác nhận pivot cũng
  khó cài vào Pine real-time (trễ K nến, gần với repaint khi quan sát live).

## 6. Khuyến Nghị

1. **Vẫn chưa viết indicator/strategy** dựa trên kết quả này — với mẫu 112 phiên thật, cấu hình
   khả thi để code (`2B·fast`, không trễ) cho kỳ vọng **âm có ý nghĩa thống kê** ở K=3, và quanh 0
   ở K=5. Đây là bằng chứng mạnh hơn (và tiêu cực hơn) so với kết luận "chưa chứng minh được" của
   báo cáo cũ.
2. Nếu muốn khai thác tiếp: tập trung vào **bộ lọc VWAP** (chỉ vào thuận VWAP) — đây là tín hiệu
   có ý nghĩa thống kê nhất trong toàn bộ nghiên cứu này, dù chưa đủ để tự nó thành kỳ vọng dương.
3. Trước khi thử lại các config `pivot` (K=5), cần thêm dữ liệu để tách rõ hiệu ứng theo giai đoạn
   (xem Giới Hạn, mục regime) — tránh nhầm "chạy đúng nửa sau kỳ dữ liệu hiện có" với "có edge".

## 7. Giới Hạn

- **Một giai đoạn giá duy nhất**: toàn bộ 112 phiên (26/05–26/11/2026) nằm trong 1 đợt giảm giá
  kéo dài của VN30F1M (giá giảm từ vùng ~2020 xuống ~1730, khoảng −14%). Kết quả nghiêng về chiều
  SHORT có thể phản ánh xu hướng chung của giai đoạn này hơn là bản chất mô hình 1-2-3 — **chưa có
  giai đoạn sideways/tăng để đối chứng**. Đây là giới hạn lớn nhất của lần cập nhật này.
- **Chưa resample 5m**: MySQL chỉ có sẵn 1m/1d cho `VN30F1M`; 3m ở trên là resample từ 1m, 5m chưa
  làm trong lần cập nhật này.
- **Mẫu `pivot` ở 3m rất nhỏ** (n=1–39) — không dùng để kết luận, chỉ tham khảo.
- **Nhiều phép so sánh**: 16 cấu hình × 2 TF × 7 bộ lọc, chưa hiệu chỉnh (Bonferroni...). Vài ô
  "có ý nghĩa" ở bảng 4.3 nên được đọc cùng với số phép so sánh này, không tuyệt đối hoá.
- **Giả định**: phí 0,5 điểm/lệnh, vào lệnh giá đóng nến điểm 3, SL ưu tiên khi cùng nến chạm cả
  SL/TP. Trendline chỉ xét cặp pivot mới nhất hợp lệ, không chấm điểm "đẹp".
- **Chưa làm**: lọc order block, delta order flow, trend khung lớn hơn, trailing stop, kiểm định
  trên giai đoạn giá khác (sideways/tăng).

## Changelog

- 2026-11-27: Tạo báo cáo lần đầu (CSV TradingView `VN301!`, mẫu 26/62/102 phiên 1m/3m/5m).
- 2026-11-28: Cập nhật dữ liệu sang MySQL thật `VN30F1M` (112 phiên 1m + 3m resample, 26/05–
  26/11/2026). Kết quả tổng thể yếu hơn hẳn: cấu hình chính `2B·fast` K=3 chuyển từ "chưa chứng
  minh được" sang **âm có ý nghĩa thống kê**; phát hiện mới về bộ lọc VWAP có ý nghĩa thống kê;
  thêm giới hạn về giai đoạn giá đơn lẻ (toàn mẫu là 1 đợt giảm). Chưa resample khung 5m.
