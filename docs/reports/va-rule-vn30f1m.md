# Báo Cáo Backtest — 80% Value Area Rule trên VN30F1M (1 phút)

> Trả lời câu hỏi: *"Tỉ lệ thành công của VA Rule là bao nhiêu, cần những thông số nào để cải
> tiến tỉ lệ thành công?"* — dựa trên dữ liệu thật VN30F1M khung 1 phút. Đây là bản backtest
> định lượng đầu tiên cho ý tưởng **#2 — 80% VA Rule (Fade về Value Area)** trong
> [market-profile-strategy-ideas.md](../market-profile-strategy-ideas.md), vốn trước đó chỉ mới
> xếp hạng **định tính** ("Cao", chưa backtest).

## 1. Tổng Quan

- **Rule gốc**: `mpcore.f_check_80_rule` (`libraries/market_profile_core.pine`) — khi phiên
  **mở ngoài Value Area (VA) phiên trước** và giá quay trở lại trong VA cũ đủ số bar xác nhận,
  tín hiệu "Active" kích hoạt, kỳ vọng giá tiếp tục đi về phía biên/POC của VA cũ.
- **Nguồn dữ liệu**: MySQL `market_data.ohlc_candles`, symbol `VN30F1M`, timeframe `1m`,
  **2026-05-26 → 2026-11-18** (109 phiên thô).
- **Phương pháp tính Market Profile**: tái tạo đúng thuật toán trong
  `libraries/market_profile_core.pine` (`f_add_bar_tpo`, `f_calc_poc`, `f_calc_value_area`) với
  tham số mặc định của `indicators/market_profile.pine`: TPO Period = **30 phút** (chuẩn CBOT),
  Value Area = **70%**, lưới giá (`price_step`) = **0.1**.
- **Script backtest**: [`backtests/va_rule/va_rule_backtest.py`](../../backtests/va_rule/va_rule_backtest.py)
  (Python, kết nối trực tiếp MySQL). Kết quả thô: `backtests/va_rule/results.json`.

## 2. Làm Sạch Dữ Liệu (quan trọng — ảnh hưởng trực tiếp đến số liệu)

| Vấn đề phát hiện | Xử lý |
|---|---|
| 11 nến có `open=0`/`low=0` tại đúng bar 08:45 mỗi ngày xuất hiện (lỗi feed ở nến ATO, không phải giá giao dịch thật — giá VN30F1M đang ở vùng 1800-2100 điểm) | Loại bỏ toàn bộ nến có giá ≤ 0 trước khi tính profile |
| 5 cặp phiên liên tiếp bị **đứt dữ liệu** (gap lịch > 4 ngày, ví dụ thiếu hẳn 29-30/10 trước phiên 02/11, thiếu nhiều phiên đầu tháng 9 và tháng 11) — nếu tính, sẽ ra "mở ngoài VA phiên trước" ảo do đứt dữ liệu chứ không phải hành vi thị trường thật | Loại các cặp phiên có khoảng cách lịch > 4 ngày khỏi tập test |

Sau làm sạch: **103 cặp phiên hợp lệ** (phiên hiện tại so với phiên liền trước thật) từ 109 phiên
thô. ⚠️ **Phát hiện phụ**: nguồn dữ liệu VN30F1M 1m trong DB hiện có khoảng trống nhiều ngày ở
vài thời điểm (quanh cuối tháng 6, đầu tháng 9, đầu/giữa tháng 11) — nên rà soát lại pipeline thu
thập dữ liệu nếu muốn dùng cho backtest dài hạn/tin cậy hơn.

## 3. Định Nghĩa "Thành Công" — Test Song Song 2 Tiêu Chí

| Tiêu chí | Định nghĩa | Ghi chú |
|---|---|---|
| **A. Đóng phiên trong VA** | Giá **đóng cửa cuối phiên** nằm trong `[prev_val, prev_vah]` | Đúng định nghĩa gốc của Dalton/Steidlmayer — nghiêm nhất |
| **B. Chạm lại POC** | Giá chạm `prev_poc` tại **bất kỳ lúc nào** sau khi trigger, trước khi hết phiên | Khớp với mục tiêu "fade về `prof.prev_poc`" nêu trong ý tưởng #2 |
| **C. Chạm biên đối diện** | Giá chạm hẳn sang `prev_val` (nếu mở trên VA) hoặc `prev_vah` (nếu mở dưới VA) | Khớp đúng câu trạng thái `"Active → pVAL/pVAH"` trong code hiện tại |

## 4. Kết Quả Theo Ngưỡng Xác Nhận (số bar 1m quay lại trong VA)

| Ngưỡng | Số phiên setup (mở ngoài VA) | Số phiên trigger | Tỉ lệ trigger | **A. Đóng trong VA** | **B. Chạm POC** | **C. Chạm biên đối diện** |
|---|---|---|---|---|---|---|
| 2 bar (reset) | 64 | 46 | 71.9% | **43.5%** | **71.7%** | 50.0% |
| 2 bar (cumulative — *y hệt code hiện tại*) | 64 | 46 | 71.9% | 43.5% | 71.7% | 50.0% |
| 5 bar (reset) | 64 | 46 | 71.9% | 43.5% | 71.7% | 50.0% |
| 15 bar (reset) | 64 | 39 | 60.9% | 48.7% | 66.7% | 53.8% |
| 30 bar (reset) | 64 | 33 | 51.6% | 51.5% | 63.6% | 54.5% |

**Baseline đối chứng** (không điều kiện gì, cứ lấy ngẫu nhiên 1 phiên so với phiên trước): chỉ
**29.1%** số phiên đóng cửa trong VA của phiên trước. ⇒ Rule có lọc (mở ngoài VA + xác nhận quay
lại) thực sự nâng tỉ lệ so với baseline ngẫu nhiên (29.1% → 43.5-51.5%).

## 5. Trả Lời Câu Hỏi 1 — Tỉ Lệ Thành Công Là Bao Nhiêu?

**Không có một con số duy nhất — phụ thuộc hoàn toàn vào định nghĩa "thành công":**

- Nếu đo đúng nghĩa gốc "80% Rule" (**đóng cửa phiên trong VA cũ**): tỉ lệ thực tế trên
  VN30F1M chỉ **~43.5% - 51.5%** tuỳ ngưỡng xác nhận — **thấp hơn rất nhiều** so với cái tên "80%"
  ngụ ý. Cái tên gốc trong sách Dalton đo trên khung TPO 30 phút cổ điển và trên thị trường
  future Mỹ thập niên 80-90, không hẳn áp dụng trực tiếp cho VN30F1M hiện tại.
- Nếu đo tiêu chí lỏng hơn (**chạm lại POC** bất kỳ lúc nào trong phiên — gần với cách ý tưởng
  #2 định nghĩa entry/target): tỉ lệ **~63.6% - 71.7%** — gần với trực giác "rule mạnh" hơn, dù
  vẫn chưa đạt 80%.
- Tiêu chí chạm hẳn sang biên đối diện (tiêu chí khó nhất, đúng câu trạng thái trong code hiện
  tại): chỉ **~50-55%** — gần mức ngẫu nhiên (50%), cho thấy kỳ vọng "đi hết sang biên kia" là
  **quá tham vọng**, không nên dùng làm target chính.

⚠️ **Lưu ý thống kê quan trọng**: mẫu chỉ có 103 phiên hợp lệ (~5 tháng), 33-46 lần trigger tuỳ
ngưỡng. Với n≈46, khoảng tin cậy 95% của tỉ lệ 43.5% rộng tới **~30%-58%**; của tỉ lệ 71.7% rộng
**~57%-83%**. Các số liệu trên là **định hướng**, chưa đủ mẫu để khẳng định chắc chắn — cần theo
dõi/tích lũy thêm dữ liệu dài hạn hơn để thu hẹp khoảng tin cậy.

## 6. Trả Lời Câu Hỏi 2 — Thông Số Nào Cần Cải Tiến?

1. **Chốt lại đúng tiêu chí "thành công" trước khi trade** — khoảng cách giữa 43.5% (đóng trong
   VA) và 71.7% (chạm POC) lớn hơn ảnh hưởng của mọi tham số khác trong bảng dưới. Khuyến nghị
   dùng tiêu chí B (chạm POC) làm mục tiêu chốt lời thực tế (khớp đúng ý tưởng #2 gốc: "fade về
   `prof.prev_poc`"), không kỳ vọng đóng cửa trong VA hay đi hết sang biên đối diện.

2. **Ngưỡng xác nhận 2→5 bar (phút) không tốn gì — nên nâng mặc định**: trên dữ liệu này, 2 bar
   và 5 bar cho **ra đúng y hệt 46/46 tín hiệu** (không mất cơ hội nào) nhưng chờ lâu hơn
   = ít bị vào lệnh theo nhiễu 1-2 phút ngẫu nhiên. Khuyến nghị sửa mặc định
   `bars_inside_prev_va >= 2` trong `f_check_80_rule` lên **≥ 5** cho khung 1m.

3. **Ngưỡng 15-30 bar đánh đổi tần suất lấy chất lượng**: số lệnh giảm (64→39→33) nhưng tỉ lệ
   đóng-trong-VA tăng dần (43.5%→48.7%→51.5%). Phù hợp nếu ưu tiên ít lệnh/chất lượng cao hơn số
   lượng — có thể dùng ngưỡng cao làm **filter phụ** (chỉ vào lệnh "mạnh" khi ≥15 bar) song song
   với tín hiệu sớm ở 5 bar.

4. **Thêm filter giới hạn "biên độ mở ngoài VA" (overshoot)** — chia theo % độ rộng VA mà giá mở
   lệch ra ngoài:

   | Overshoot (so với độ rộng VA cũ) | n | Đóng trong VA | Chạm POC |
   |---|---|---|---|
   | 0-20% | 11 | 63.6% | 63.6% |
   | 20-40% | 8 | 50.0% | 50.0% |
   | 40-70% | 9 | 22.2% | 77.8% |
   | > 70% | 18 | 38.9% | 83.3% |

   Phiên mở **lệch nhẹ** (0-20%) có tỉ lệ đóng-trong-VA cao nhất (63.6%); phiên mở **lệch rất xa**
   (>70% độ rộng VA — khả năng cao đã thành Trend Day thật) tỉ lệ rơi xuống còn ~39%. Khuyến nghị
   thêm điều kiện **loại bỏ setup khi overshoot > ~70% độ rộng VA cũ** nếu mục tiêu là đóng trong
   VA; ngược lại nếu mục tiêu là chạm POC thì overshoot lớn vẫn ổn (chạm POC tỉ lệ cao ~83-87%
   kể cả khi mở lệch xa — vì biên độ dao động trong ngày lớn hơn).

5. **Thêm filter thời điểm trigger trong phiên** — chia theo % thời gian còn lại của phiên tại
   lúc trigger:

   | Thời gian còn lại | n | Đóng trong VA | Chạm POC |
   |---|---|---|---|
   | 0-30% (trigger rất muộn) | 4 | 25.0% | 50.0% |
   | 30-60% | 4 | 25.0% | 75.0% |
   | 60-100% (trigger sớm) | 38 | 47.4% | 73.7% |

   Trigger xảy ra **quá muộn trong phiên** (ví dụ sau ~13h30-14h) có tỉ lệ thành công thấp hơn rõ
   rệt — đơn giản vì không còn đủ thời gian cho giá di chuyển về target trước khi hết phiên.
   Khuyến nghị **bỏ qua tín hiệu trigger sau một mốc giờ cố định** (ví dụ 14:00) hoặc hạ kỳ vọng
   target (chỉ kỳ vọng chạm POC, không kỳ vọng đóng trong VA) cho các trigger muộn.

6. **Sửa logic "không reset" của code hiện tại** — `mpcore.f_check_80_rule` hiện đếm
   `bars_inside_prev_va` **không reset về 0** khi giá ra khỏi VA lại (không đúng tinh thần "N kỳ
   LIÊN TỤC" của rule gốc). Trên mẫu 103 phiên này, biến thể reset và không-reset cho kết quả
   giống hệt nhau (chưa thấy ảnh hưởng thực tế) — nhưng về lý thuyết, logic không-reset có thể
   trigger sai trên các phiên giá dao động qua lại nhiều lần quanh biên VA cách xa nhau trong
   ngày. Khuyến nghị sửa lại cho đúng ngữ nghĩa "liên tục", dù chưa phải lỗi cấp bách.

7. **Kết hợp VPA (ý tưởng #31)** chưa được test trong báo cáo này — là hướng mở rộng hợp lý tiếp
   theo nếu muốn tăng thêm tỉ lệ thành công bằng cách lọc No Demand/No Supply tại điểm bị từ chối.

## 7. Giới Hạn Của Báo Cáo

- **Mẫu nhỏ**: 103 cặp phiên hợp lệ (~5 tháng dữ liệu 1m hiện có trong DB), 33-46 lần trigger
  tuỳ ngưỡng — các nhóm con (overshoot bucket, time-left bucket) chỉ 4-24 mẫu, khoảng tin cậy rất
  rộng. Cần tích lũy thêm dữ liệu dài hạn để kết luận chắc chắn hơn.
- **Dữ liệu 1m có đoạn bị thiếu**: đã loại 5 cặp phiên bị đứt gãy lịch, nhưng nên rà soát lại
  pipeline thu thập dữ liệu VN30F1M nếu muốn mở rộng backtest.
- **Chưa phải backtest P&L đầy đủ**: đây là thống kê xác suất xảy ra của rule (tỉ lệ
  thành/thất bại theo từng tiêu chí), **chưa** tính entry/exit thực tế, stop-loss, phí giao dịch,
  trượt giá, R:R — cần bước tiếp theo nếu muốn đánh giá lợi nhuận kỳ vọng thực tế.
- **Chưa test kết hợp VPA/SMC** (ý tưởng #31, #25) — chỉ test thuần Market Profile.

## Changelog

- 2026-11-21: Tạo báo cáo lần đầu — backtest 80% VA Rule trên VN30F1M 1m
  (2026-05-26 → 2026-11-18, 103 cặp phiên hợp lệ sau làm sạch dữ liệu).
