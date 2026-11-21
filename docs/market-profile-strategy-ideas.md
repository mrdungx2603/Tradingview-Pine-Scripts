# Ý Tưởng Strategy Dựa Trên Market Profile (+ Combo SMC/VPA)

> Tài liệu brainstorm (chưa triển khai code) — tổng hợp các hướng strategy có thể xây dựng
> dựa trên dữ liệu đã được tính sẵn trong [`indicators/market_profile.pine`](../indicators/market_profile.pine)
> và [`libraries/market_profile_core.pine`](../libraries/market_profile_core.pine)
> (`mpcore.SessionProfile`), cộng thêm các hướng kết hợp với **SMC**
> ([`libraries/smc_core.pine`](../libraries/smc_core.pine)) và **VPA**
> ([`indicators/volume/wyckoff_evr.pine`](../indicators/volume/wyckoff_evr.pine)). Mục tiêu:
> liệt kê đầy đủ ý tưởng, nêu rõ nguồn kiến thức dùng và đánh giá hiệu quả dự kiến, trước khi
> chọn 1-2 hướng để viết plan/thiết kế chi tiết và code thật bằng `/pine-create`.

## Cách Đọc Tài Liệu

Mỗi strategy có 3 nhãn:

- **Nguồn kiến thức** — `MP` (chỉ dùng Market Profile), `SMC` (chỉ dùng Smart Money Concepts),
  `VPA` (chỉ dùng Volume Price Analysis/Wyckoff EVR), hoặc `Combo: X + Y (+ Z)` nếu kết hợp
  nhiều trường phái. Phần 1 (#1-20) toàn bộ là `MP` đơn lẻ; Phần 2 (#21-31) toàn bộ là combo.
- **Nguồn dữ liệu** — **Sẵn có** (dùng trực tiếp field đã có trong `mpcore.SessionProfile`/
  `smc_core.SwingState`/indicator hiện tại) hay **Cần bổ sung** (cần thêm cơ chế lưu trữ/tính
  toán mới, ví dụ lịch sử nhiều phiên, composite profile đa timeframe, hoặc tách
  `wyckoff_evr.pine` thành library trước khi dùng chung với `mpcore`/`smc_core`).
- **Hiệu quả dự kiến** — đánh giá **định tính** (xem mục "Đánh Giá Hiệu Quả" ngay dưới), **chưa
  backtest**, chỉ dựa trên độ vững của lý thuyết nền, mức độ confluence/lọc nhiễu, và rủi ro
  chủ quan/overfitting. Cần backtest thật trước khi tin tưởng tuyệt đối.

## Đánh Giá Hiệu Quả & Xếp Hạng (Định Tính — Chưa Backtest)

**Phương pháp đánh giá** (định tính, dựa trên lý thuyết, không phải kết quả backtest):

1. **Độ vững lý thuyết** — strategy có phải là rule đã được ghi nhận/kiểm chứng nhiều trong tài
   liệu kinh điển (Dalton/Steidlmayer cho MP, ICT/ Smart Money cho SMC, Wyckoff cho VPA) không,
   hay là suy luận mới chưa có tiền lệ rõ.
2. **Mức độ confluence/lọc nhiễu** — strategy kết hợp bao nhiêu nguồn tín hiệu độc lập; combo
   2-3 nguồn độc lập thường lọc nhiễu tốt hơn 1 nguồn đơn lẻ.
3. **Rủi ro chủ quan/overfitting** — strategy có nhiều tham số/ngưỡng tự do, hay điều kiện kích
   hoạt rõ ràng, ít phải "tinh chỉnh" chủ quan.
4. **Tần suất cơ hội** — strategy xảy ra thường xuyên (đủ mẫu để tin cậy thống kê) hay hiếm
   (mẫu nhỏ, khó kiểm chứng dù lý thuyết hợp lý).

⚠️ Đây là xếp hạng **kỳ vọng ban đầu** để ưu tiên thứ tự brainstorm/triển khai tiếp theo —
không thay thế cho backtest thật trên dữ liệu lịch sử của từng mã/timeframe cụ thể.

### Bảng Xếp Hạng Tổng Hợp (Cao → Thấp)

| Hạng | # | Strategy | Nguồn Kiến Thức | Mức Hiệu Quả Dự Kiến | Lý Do Ngắn |
|---|---|---|---|---|---|
| 1 | 2 | 80% VA Rule — Fade Về Value Area | MP | **Cao** (✅ đã backtest — xem [reports/va-rule-vn30f1m.md](reports/va-rule-vn30f1m.md)) | Rule MP được kiểm chứng/ghi nhận nhiều nhất trong lý thuyết Dalton, điều kiện kích hoạt rõ, ít tham số chủ quan |
| 2 | 21 | OB + VAH/VAL/POC Confluence Filter | Combo: SMC + MP | **Cao** | 2 nguồn độc lập (dấu chân tổ chức + vùng giá trị thống kê) cùng chỉ 1 mức → giảm nhiễu mạnh |
| 3 | 22 | BoS Xác Nhận Bằng Pushing Through | Combo: SMC + VPA | **Cao** | Vá đúng điểm yếu lớn nhất của BoS thuần cấu trúc (hay bị breakout giả không volume) |
| 4 | 23 | CHoCH + Stopping Volume Reversal | Combo: SMC + VPA | **Cao** | Cấu trúc giá (CHoCH) + dòng tiền chặn đà (SV) là combo đảo chiều kinh điển, rủi ro thấp hơn CHoCH đơn thuần |
| 5 | 27 | Climax Volume Tại Session Extreme + Tail | Combo: VPA + MP | **Cao** | Ghép đúng định nghĩa cổ điển Selling/Buying Climax (Wyckoff) với cấu trúc Tail (MP) — 2 trường phái cùng mô tả 1 hiện tượng |
| 6 | 30 | SMC Entry, Market Profile Target | Combo: SMC + MP | **Cao** | Tái dùng entry đã có của `smc_strategy.pine`, chỉ đổi TP sang mức MP có ý nghĩa thống kê — rủi ro triển khai thấp nhất trong cả danh sách |
| 7 | 31 | 80% VA Rule Fade + No Demand/No Supply Xác Nhận | Combo: MP + VPA | **Cao** | Củng cố thêm cho rule đã mạnh (#2) bằng xác nhận dòng tiền, giảm tiếp phần false signal còn lại |
| 8 | 1 | IB Breakout + Day Type Filter | MP | Khá cao | Concept MP lâu đời, lọc Day Type hợp lý nhưng xác nhận trễ → mất 1 phần đầu sóng |
| 9 | 6 | Open-Drive Continuation | MP | Khá cao | Tín hiệu tin cậy cao khi xảy ra, nhưng tần suất thấp → ít cơ hội trade |
| 10 | 12 | Narrow IB → Kỳ Vọng Range Expansion | MP (cần bổ sung) | Khá cao | Edge thống kê được ghi nhận nhiều trong tài liệu MP, nhưng cần lịch sử nhiều phiên mới đủ tin cậy |
| 11 | 14 | VA Overlap Balance/Trend Classifier | MP (cần bổ sung) | Khá cao | Định lượng hoá đúng tinh thần MP cổ điển (balance vs trend), hữu ích làm regime filter |
| 12 | 15 | Failed Auction / Spring-Upthrust Reversal | MP (mượn thuật ngữ Wyckoff, data thuần MP) | Khá cao | Pattern đảo chiều mạnh kinh điển, nhưng cần định nghĩa "thất bại" đủ chặt để tránh chủ quan |
| 13 | 24 | IB Breakout Lọc Bằng No Demand/No Supply | Combo: MP + VPA | Khá cao | Giảm đáng kể breakout giả của IB Breakout thuần (#1) |
| 14 | 25 | Naked POC Mean-Reversion Trong Premium/Discount | Combo: MP + SMC | Khá cao | Vá đúng điểm yếu lớn nhất của #3 (không có filter hướng) bằng bối cảnh SMC |
| 15 | 26 | Order Block Trùng Single Print/Ledge | Combo: SMC + MP | Khá cao | 2 lớp xác nhận S/R độc lập rất mạnh về lý thuyết, nhưng cần hạ tầng lưu trữ mới nên chưa kiểm chứng ngay được |
| 16 | 29 | Confluence Score Engine (3 nguồn) | Combo: MP + SMC + VPA | Khá cao | Tổng hợp 3 nguồn tốt về lý thuyết nhưng nhiều tham số/ngưỡng → rủi ro overfit khi tối ưu điểm số |
| 17 | 4 | Liquidity Sweep Tại Poor High/Low | MP | Trung bình | Concept stop-hunt hợp lý nhưng Poor High/Low có thể lặp lại nhiều lần trước khi thật sự đảo chiều |
| 18 | 7 | Open-Rejection-Reverse Fade | MP | Trung bình | Hợp lý nhưng cần xác nhận rõ ràng "rejection" để tránh vào sớm |
| 19 | 9 | Single Print / Ledge Retest | MP (cần bổ sung) | Trung bình | Concept TPO cổ điển tốt nhưng hiệu quả phụ thuộc hạ tầng lưu trữ đa phiên chưa có |
| 20 | 13 | POC Migration Trend-Following (đa phiên) | MP (cần bổ sung) | Trung bình | Hợp lý về ý tưởng nhưng dễ nhiễu bởi POC dao động ngắn hạn giữa các phiên range |
| 21 | 17 | Gap-and-Go vs Gap Fill | MP | Trung bình | Concept phổ biến nhưng độ tin cậy phụ thuộc nhiều vào đặc tính thị trường cụ thể |
| 22 | 18 | Composite Profile Tuần/Tháng — Swing Bias | MP (cần bổ sung, MTF) | Trung bình | Tốt về lý thuyết cho bias swing, nhưng độ phức tạp kỹ thuật cao, dễ sai nếu gộp lưới TPO không đúng |
| 23 | 19 | Poor High/Low Double-Tap Breakout | MP (cần bổ sung) | Trung bình | Double-tap tăng ý nghĩa thống kê nhưng cần đếm số lần test chính xác qua nhiều phiên |
| 24 | 20 | IB Range vs ATR — Regime Filter (meta) | MP + ATR (cần bổ sung) | Trung bình | Hữu ích như regime filter tổng quát (không phải entry), hiệu quả phụ thuộc chất lượng ATR tham chiếu |
| 25 | 28 | Double-Distribution Gap Breakout Lọc Pseudo Breakout | Combo: MP + VPA | Trung bình | Double-Distribution Day là trường hợp hiếm — lọc bằng Pseudo Breakout hợp lý nhưng mẫu nhỏ |
| 26 | 8 | Rotation Factor (RF) Momentum/Divergence | MP | Trung bình-thấp | Nên dùng làm filter phụ; đứng riêng dễ cho tín hiệu mơ hồ vì không có ngưỡng rõ ràng |
| 27 | 10 | Double-Distribution Gap Breakout (gốc, chưa lọc VPA) | MP | Trung bình-thấp | Chỉ áp dụng được trên Double-Distribution Day (hiếm), giới hạn số lượng cơ hội |
| 28 | 16 | b-shape / p-shape / D-shape Profile Classification | MP (cần bổ sung) | Trung bình-thấp | Hữu ích mô tả nhưng cần dữ liệu đa phiên mới thành tín hiệu dự báo thật, đứng riêng khá mơ hồ |
| 29 | 3 | Naked POC Magnet (gốc, chưa lọc SMC) | MP | Thấp | Không có filter hướng — dễ vào ngược trend mạnh (chính vì vậy #25 ghép SMC để sửa) |
| 30 | 5 | Tail Reversal (Buying/Selling Tail) | MP | Thấp | Phản ứng quá nhanh, không filter trend/context, dễ nhiễu trên phiên hẹp/Nontrend Day |
| 31 | 11 | Late Spike Fade | MP | Thấp | Giả định "spike luôn fade" sai trên Trend Day thật — rủi ro vào ngược chiều cao |

**Quan sát chính từ bảng xếp hạng**: 6/7 strategy hạng **Cao** là combo (SMC/VPA/MP kết hợp) —
xác nhận trực giác rằng ghép nhiều trường phái độc lập để lọc nhiễu hiệu quả hơn dùng 1 nguồn
đơn lẻ. Ngoại lệ duy nhất ở hạng Cao là #2 (80% VA Rule) — một rule MP đơn lẻ nhưng đã được
kiểm chứng rất kỹ trong lý thuyết. Ngược lại, 3 strategy hạng **Thấp** (#3, #5, #11) đều là MP
đơn lẻ, phản ứng nhanh, không có filter hướng/context — đây cũng chính là 3 strategy đã được
"vá" bằng bản combo tương ứng (#25, #27, #31 lần lượt nâng cấp #3, tương tự #5; #11 hiện chưa
có bản combo — có thể là hướng bổ sung tốt nếu muốn, ví dụ ghép với VPA No Demand/No Supply để
lọc late spike giả).

## Bảng Tổng Hợp — Phần 1 (Market Profile Đơn Lẻ)

| # | Strategy | Kiểu | Nguồn Kiến Thức | Nguồn Dữ Liệu |
|---|---|---|---|---|
| 1 | IB Breakout + Day Type Filter | Breakout | MP | Sẵn có |
| 2 | 80% VA Rule — Fade về Value Area | Mean-reversion | MP | Sẵn có |
| 3 | Naked POC Magnet | Mean-reversion | MP | Sẵn có |
| 4 | Liquidity Sweep tại Poor High/Low | Reversal | MP | Sẵn có |
| 5 | Tail Reversal (Buying/Selling Tail) | Reversal | MP | Sẵn có |
| 6 | Open-Drive Continuation | Breakout/Momentum | MP | Sẵn có |
| 7 | Open-Rejection-Reverse Fade | Reversal | MP | Sẵn có |
| 8 | Rotation Factor (RF) Momentum/Divergence | Filter/Momentum | MP | Sẵn có |
| 9 | Single Print / Ledge Retest | Breakout + Retest | MP | Cần bổ sung (lưu vùng SP/ledge qua phiên) |
| 10 | Double-Distribution Gap Breakout | Breakout | MP | Sẵn có |
| 11 | Late Spike Fade | Mean-reversion | MP | Sẵn có |
| 12 | Narrow IB → Kỳ Vọng Range Expansion | Breakout (volatility regime) | MP | Cần bổ sung (lịch sử IB range N phiên) |
| 13 | POC Migration Trend-Following (đa phiên) | Trend-following | MP | Cần bổ sung (lưu POC N phiên) |
| 14 | VA Overlap Balance/Trend Classifier | Regime filter | MP | Cần bổ sung (tính % overlap VA) |
| 15 | Failed Auction / Spring-Upthrust Reversal | Reversal | MP | Sẵn có |
| 16 | b-shape / p-shape / D-shape Profile Classification | Trend-following (đa phiên) | MP | Cần bổ sung (tỷ lệ TPO trên/dưới POC qua nhiều phiên) |
| 17 | Gap-and-Go vs Gap Fill (so với VA/Close phiên trước) | Breakout/Mean-reversion | MP | Sẵn có |
| 18 | Composite Profile Tuần/Tháng — Swing Bias | Trend-following (MTF) | MP | Cần bổ sung (composite TPO đa timeframe) |
| 19 | Poor High/Low Double-Tap Breakout | Breakout (sau nhiều lần test) | MP | Cần bổ sung (đếm số lần test qua phiên) |
| 20 | IB Range vs ATR — Regime Filter (meta-strategy) | Filter (không phải entry độc lập) | MP + ATR | Cần bổ sung (tính ATR tham chiếu) |

## Chi Tiết Từng Strategy — Phần 1

### 1. IB Breakout + Day Type Filter — *(MP · Khá cao)*
Vào lệnh theo hướng phá `prof.ib_high`/`prof.ib_low`, chỉ giữ lệnh khi `prof.day_type` xác nhận
Trend Day, target ở các mức extension 1.5x/2.0x (`mpcore.f_calc_ib_extensions`).
**Rủi ro**: chờ Day Type xác nhận → entry trễ, mất phần đầu breakout.

### 2. 80% VA Rule — Fade Về Value Area — *(MP · Cao)*
Khi phiên mở ngoài VA phiên trước và giá quay vào trong VA cũ, giữ 2 nến xác nhận
(logic đã có ở `mpcore.f_check_80_rule`) → vào lệnh fade về `prof.prev_poc`.
**Rủi ro**: false signal trên Trend Day thật (giá không quay lại).

### 3. Naked POC Magnet — *(MP · Thấp)*
Coi các đường Naked POC còn trống (`active_npocs`) là nam châm giá sẽ tìm về lấp; vào lệnh
theo hướng nPOC gần nhất, exit khi `mpcore.f_check_level_tested` xác nhận đã lấp.
**Rủi ro**: không có filter hướng mạnh, cần kết hợp trend filter → xem bản combo #25.

### 4. Liquidity Sweep Tại Poor High/Low — *(MP · Trung bình)*
Khi `prof.has_poor_high`/`has_poor_low` xuất hiện, chờ giá sweep qua mức đó rồi đảo chiều
(stop-hunt reversal) → vào ngược hướng sweep, stop ngoài `sess_high`/`sess_low`.
**Rủi ro**: Poor High/Low có thể tồn tại nhiều phiên liên tiếp, cần quản lý vị thế chặt.

### 5. Tail Reversal — *(MP · Thấp)*
Khi `prof.buying_tail_h`/`selling_tail_l` được phát hiện, vào lệnh theo hướng tail ngay khi
hình thành, stop dưới/trên đáy/đỉnh tail. Tín hiệu phản ứng nhanh, dễ nhiễu trên phiên hẹp.
Xem bản combo #27 (ghép VPA Climax) để tăng độ tin cậy.

### 6. Open-Drive Continuation — *(MP · Khá cao)*
Khi `prof.open_type == "Open-Drive"` (mở và lao thẳng 1 hướng, không rotate lại) → vào lệnh
theo hướng drive ngay từ sớm, không chờ IB breakout.

### 7. Open-Rejection-Reverse Fade — *(MP · Trung bình)*
Khi `open_type == "Open-Rejection-Reverse"` (mở, test 1 hướng, bị từ chối, đảo chiều) → vào
lệnh theo hướng đảo chiều sau xác nhận (ví dụ giá vượt lại `open_price`).

### 8. Rotation Factor (RF) Momentum/Divergence — *(MP · Trung bình-thấp)*
`prof.rf_score` đo độ lệch rotational lên/xuống trong phiên. Dùng làm filter momentum (RF
mạnh cùng chiều breakout IB → tăng độ tin cậy #1) hoặc tìm divergence (giá tạo đỉnh/đáy mới
nhưng RF yếu dần) để cảnh báo đảo chiều sớm. Hiệu quả tốt hơn khi dùng làm filter phụ, không
nên đứng standalone.

### 9. Single Print / Ledge Retest — *(MP · Trung bình, cần bổ sung)*
Vùng Single Prints (`sp_mid_bot/top`) và `ledge_price` thường thành vùng hỗ trợ/kháng cự ở
phiên sau. Chờ giá quay lại test vùng này → vào lệnh bounce (nếu giữ) hoặc breakout tiếp diễn
(nếu xuyên qua). **Cần bổ sung**: lưu vùng SP/ledge của phiên trước sang phiên sau. Xem bản
combo #26 (ghép SMC Order Block) để tăng độ tin cậy.

### 10. Double-Distribution Gap Breakout — *(MP · Trung bình-thấp)*
Khi `day_type == "Double-Distribution Trend Day"`, vùng trũng TPO giữa 2 cụm phân phối
(chính là `sp_mid`) có rất ít acceptance → giá đi qua vùng này thường nhanh, dứt khoát.
Trade breakout tiếp diễn khi giá xuyên gap này lần 2 (retest). Xem bản combo #28 (lọc bằng
VPA Pseudo Breakout) để giảm false breakout.

### 11. Late Spike Fade — *(MP · Thấp)*
`prof.has_late_spike` + `spike_base` đánh dấu cú spike cuối phiên (thường do short-covering/
panic). Fade về `spike_base` vào đầu phiên kế tiếp, stop ngoài sess_high/low.
**Rủi ro**: spike cuối phiên của Trend Day thật có thể không fade lại. Chưa có bản combo —
có thể cải thiện bằng cách ghép VPA (No Demand/No Supply tại điểm spike) tương tự cách #31
nâng cấp #2.

### 12. Narrow IB → Kỳ Vọng Range Expansion — *(MP · Khá cao, cần bổ sung)*
IB hẹp bất thường (so với trung bình nhiều phiên) có xác suất cao dẫn tới ngày range rộng.
Đo `ib_high - ib_low` so với trung bình N phiên trước, nếu hẹp bất thường → chờ breakout IB
với kỳ vọng target xa hơn (ext 2.0x+). **Cần bổ sung**: lưu lịch sử IB range nhiều phiên.

### 13. POC Migration Trend-Following (Đa Phiên) — *(MP · Trung bình, cần bổ sung)*
Theo dõi hướng dịch POC qua nhiều phiên liên tiếp; nếu POC "leo thang" liên tục → trend đang
hình thành bền, vào lệnh khi POC phiên mới breakout qua POC phiên trước.
**Cần bổ sung**: lưu POC của N phiên gần nhất (hiện chỉ có `prev_poc` của 1 phiên trước).

### 14. VA Overlap Balance/Trend Classifier — *(MP · Khá cao, cần bổ sung)*
So % chồng lấp giữa VA phiên này (đang developing) và phiên trước (`prev_vah`/`prev_val`):
overlap cao → balance, trade range giữa VAH/VAL; overlap thấp/lệch hẳn 1 phía → trend, trade
theo hướng lệch. **Cần bổ sung**: phép tính % overlap VA giữa 2 phiên.

### 15. Failed Auction / Spring-Upthrust Reversal — *(MP, mượn thuật ngữ Wyckoff · Khá cao)*
Khi giá phá `ib_high`/`ib_low` (hoặc VAH/VAL) nhưng không giữ được, quay ngược vào trong
range trong thời gian ngắn → coi là "failed auction" (spring/upthrust kinh điển), fade theo
hướng quay lại. Lưu ý: tên gọi mượn thuật ngữ Wyckoff nhưng toàn bộ data dùng là field MP
thuần (IB/VA) — không phải bản combo VPA thật.

### 16. b-shape / p-shape / D-shape Profile Classification — *(MP · Trung bình-thấp, cần bổ sung)*
Phân loại hình dạng TPO profile (b-shape: nặng phía trên POC, thường báo hiệu yếu đi/giảm;
p-shape: nặng phía dưới POC, báo hiệu mạnh lên/tăng; D-shape: cân đối, balance) dựa trên tỷ lệ
`tpo_above_poc` vs `tpo_below_poc`, theo dõi xu hướng hình dạng qua nhiều phiên để dự đoán
hướng phiên kế tiếp. **Cần bổ sung**: lưu tỷ lệ này qua nhiều phiên để nhận diện xu hướng hình
dạng (1 phiên đơn lẻ dùng field có sẵn, nhưng để "classification" có ý nghĩa cần so sánh chuỗi
phiên).

### 17. Gap-and-Go vs Gap Fill — *(MP · Trung bình)*
So `open_price` phiên mới với `prev_vah`/`prev_val`/`prev_poc` và close phiên trước: mở gap
hẳn ra ngoài VA trước mà không hồi lại ngay (gap-and-go) → trade tiếp diễn theo hướng gap;
ngược lại nếu giá nhanh chóng lấp gap về lại VA trước → trade mean-reversion (gần với #2 nhưng
tập trung vào khoảnh khắc mở phiên, không chờ 2 nến xác nhận như 80% Rule).

### 18. Composite Profile Tuần/Tháng — Swing Bias — *(MP · Trung bình, cần bổ sung, MTF)*
Gộp TPO nhiều phiên thành composite profile tuần/tháng để tìm POC/VA ở timeframe cao hơn,
dùng làm bias cho các tín hiệu intraday (chỉ trade theo hướng bias composite). Phù hợp swing
trade hơn là scalping. **Cần bổ sung**: cơ chế composite TPO đa timeframe (phức tạp nhất trong
danh sách — cần thiết kế riêng về cách gộp lưới TPO giữa các phiên khác base_row/step).

### 19. Poor High/Low Double-Tap Breakout — *(MP · Trung bình, cần bổ sung)*
Khi 1 Poor High/Low tồn tại và bị test từ 2 lần trở lên qua nhiều phiên mà không bị phá —
mức đó trở thành vùng cung/cầu mạnh hơn; khi cuối cùng bị phá, xác suất tiếp diễn breakout cao
hơn so với lần test đầu. **Cần bổ sung**: đếm số lần test của 1 mức Poor High/Low qua nhiều
phiên (hiện tại field `has_poor_high/low` chỉ phản ánh trạng thái trong phiên hiện tại).

### 20. IB Range vs ATR — Regime Filter (Meta-Strategy) — *(MP + ATR · Trung bình, cần bổ sung)*
Không phải tín hiệu entry độc lập, mà là bộ lọc chế độ thị trường: so `ib_high - ib_low` với
ATR tham chiếu (ví dụ ATR 14 ngày) để quyết định nên áp dụng nhóm strategy breakout (IB hẹp so
ATR) hay nhóm mean-reversion (IB rộng so ATR, thị trường đã "nổ" từ sớm). **Cần bổ sung**: tính
ATR tham chiếu và ngưỡng so sánh.

## Phần 2 — Kết Hợp Market Profile + SMC + VPA (Wyckoff EVR)

Nhóm ý tưởng dưới đây ghép dữ liệu Market Profile (`mpcore.SessionProfile`) với **SMC**
(`smc_core.SwingState` — trend, HH/HL/LL/LH, BoS/CHoCH, Order Block, Premium/Discount, xem
[smc-core.md](smc-core.md)) và **VPA** (đại diện bởi
[`indicators/volume/wyckoff_evr.pine`](../indicators/volume/wyckoff_evr.pine) — WER, Stopping
Volume/No Demand/No Supply/Pushing Through/Pseudo Breakout/Climax). Ý tưởng chung: Market
Profile cho biết **"ở đâu"** (vùng giá trị, S/R), SMC cho biết **"cấu trúc/hướng nào"**, VPA cho
biết **"có thật hay giả"** (có dòng tiền thật đứng sau hay không) — 3 lớp lọc chồng lên nhau sẽ
giảm tín hiệu nhiễu đáng kể so với dùng riêng từng indicator. Đây cũng là lý do nhóm combo
chiếm đa số các vị trí xếp hạng **Cao** trong bảng xếp hạng tổng hợp ở trên.

> ⚠️ **Lưu ý kiến trúc**: `wyckoff_evr.pine` hiện là indicator độc lập, chưa tách thành library
> như `mpcore`/`smc_core`. Muốn 1 script duy nhất `import` cả 3 nguồn, nên tách công thức
> Effort-vs-Result (WER, phân loại Harmony/Stopping/Pseudo/Low Interest, 6 tín hiệu SV/ND/NS/
> PT/PB/CLX) ra `libraries/wyckoff_core.pine` theo đúng pattern đã dùng cho `mpcore`/`smc_core`
> — đây sẽ là việc cần làm trước khi code bất kỳ ý tưởng nào trong phần này.

| # | Strategy | Nguồn Kiến Thức | Ghép Từ |
|---|---|---|---|
| 21 | OB + VAH/VAL/POC Confluence Filter | Combo: SMC + MP | SMC Order Block + MP S/R |
| 22 | BoS Xác Nhận Bằng Pushing Through | Combo: SMC + VPA | SMC BoS + VPA PT |
| 23 | CHoCH + Stopping Volume Reversal | Combo: SMC + VPA | SMC CHoCH + VPA SV |
| 24 | IB Breakout Lọc Bằng No Demand/No Supply | Combo: MP + VPA | MP IB Breakout + VPA ND/NS |
| 25 | Naked POC Mean-Reversion Trong Premium/Discount | Combo: MP + SMC | MP Naked POC + SMC Zone |
| 26 | Order Block Trùng Single Print/Ledge | Combo: SMC + MP | SMC OB + MP SP/Ledge |
| 27 | Climax Volume Tại Session Extreme + Tail | Combo: VPA + MP | VPA Climax + MP Tail |
| 28 | Double-Distribution Gap Breakout Lọc Pseudo Breakout | Combo: MP + VPA | MP DD Day + VPA PB |
| 29 | Confluence Score Engine (Trend Alignment 3 nguồn) | Combo: MP + SMC + VPA | MP + SMC + VPA (meta-filter) |
| 30 | SMC Entry, Market Profile Target | Combo: SMC + MP | SMC OB/BoS entry + MP VAH/VAL/POC/nPOC làm TP |
| 31 | 80% VA Rule Fade + No Demand/No Supply Xác Nhận | Combo: MP + VPA | MP 80% Rule + VPA ND/NS |

## Chi Tiết Từng Strategy — Phần 2

### 21. OB + VAH/VAL/POC Confluence Filter — *(Combo: SMC + MP · Cao)*
Chỉ ưu tiên tín hiệu SMC OB Retest (#1-2 trong `smc_strategy.pine`) khi vùng Order Block trùng
hoặc rất gần `prof.vah`/`prof.val`/`prof.poc` (hoặc Naked POC) — OB là "dấu chân tổ chức", MP
level là "vùng giá trị thống kê"; trùng nhau = xác suất bounce/breakout cao hơn OB đơn thuần.

### 22. BoS Xác Nhận Bằng Pushing Through — *(Combo: SMC + VPA · Cao)*
Chỉ tin `st.event` = BoS Bull/Bear khi đúng bar đó (hoặc 1-2 bar sau) VPA (`wyckoff_evr`) báo
**Pushing Through (PT)** (`vol_ratio>1.5` & `spread_ratio>1.3`) — loại bỏ các BoS "giả" xảy ra
trên volume/spread yếu, vốn hay bị quét ngược ngay sau đó.

### 23. CHoCH + Stopping Volume Reversal — *(Combo: SMC + VPA · Cao)*
Khi `st.event` = CHoCH (đảo trend) trùng với tín hiệu **Stopping Volume (SV)** (volume lớn,
spread hẹp) tại cùng bar hoặc bar ngay trước → tăng mạnh độ tin cậy đảo chiều, vì CHoCH đơn
thuần chỉ là cấu trúc giá, còn SV xác nhận có dòng tiền lớn đang chặn đà đi.

### 24. IB Breakout Lọc Bằng No Demand/No Supply — *(Combo: MP + VPA · Khá cao)*
Trước khi IB breakout (#1), nếu các nến tiến gần `ib_high` xuất hiện **No Demand (ND)** (volume
thấp, spread hẹp, nến tăng) → cảnh báo breakout lên khả năng yếu/giả; đối xứng **No Supply
(NS)** gần `ib_low` cảnh báo breakdown yếu. Dùng làm filter loại bỏ trade #1 chứ không phải
entry độc lập.

### 25. Naked POC Mean-Reversion Trong Premium/Discount — *(Combo: MP + SMC · Khá cao)*
Chỉ vào lệnh Naked POC Magnet (#3) theo hướng long khi giá đang ở vùng **Discount** của SMC
swing, và short khi ở vùng **Premium** — tránh mean-reversion ngược hẳn với cấu trúc SMC hiện
tại (ví dụ không long nPOC khi giá đang ở Premium của 1 downtrend mạnh).

### 26. Order Block Trùng Single Print/Ledge — *(Combo: SMC + MP · Khá cao, cần bổ sung)*
Vùng Order Block (dấu chân tổ chức) trùng vùng Single Prints/`ledge_price` (vùng mỏng, ít
acceptance của TPO) là 2 lớp xác nhận độc lập cùng chỉ về 1 mức giá quan trọng → S/R mạnh hơn
hẳn so với chỉ dùng 1 trong 2. Có thể dùng làm bộ lọc ưu tiên cho #9.

### 27. Climax Volume Tại Session Extreme + Tail — *(Combo: VPA + MP · Cao)*
Khi tín hiệu **Climax (CLX)** của VPA xảy ra đúng lúc giá đang tạo `buying_tail_h`/
`selling_tail_l` ở đáy/đỉnh phiên (`sess_low`/`sess_high`) → đây chính là "Selling Climax"/
"Buying Climax" kinh điển theo Wyckoff, xác nhận bằng cả volume cực đoan và cấu trúc TPO tail —
độ tin cậy đảo chiều cao hơn #5 dùng riêng.

### 28. Double-Distribution Gap Breakout Lọc Pseudo Breakout — *(Combo: MP + VPA · Trung bình)*
Trước khi follow breakout qua gap `sp_mid` (#10), kiểm tra VPA: nếu là **Pseudo Breakout (PB)**
(volume thấp, spread rộng) thì fade lại thay vì follow — tránh bị "breakout giả" của Double
Distribution Day (giá đi nhanh qua gap nhưng không có dòng tiền thật đẩy).

### 29. Confluence Score Engine (Trend Alignment 3 Nguồn) — *(Combo: MP + SMC + VPA · Khá cao)*
Không phải entry riêng mà là bộ lọc/điểm tổng hợp: cộng điểm khi 3 nguồn đồng thuận hướng —
`st.trend` (SMC) + `prof.day_type`/`rf_score` (MP) + trạng thái VPA (`Harmony` & không phải
`Low Interest`). Dùng điểm này (ví dụ 0-3) làm ngưỡng bật/tắt các strategy breakout khác (#1,
#6, #10...) — chỉ cho trade khi điểm ≥ 2/3.

### 30. SMC Entry, Market Profile Target — *(Combo: SMC + MP · Cao)*
Giữ nguyên logic entry của `smc_strategy.pine` (OB Retest/OB Mới/BoS+OB) nhưng thay TP cố định
theo RR bằng các mức MP gần nhất theo hướng lệnh (`prof.vah`/`val`/`poc`, Naked POC, hoặc
`prev_vah`/`prev_val` chưa test) — TP "có ý nghĩa thị trường" thay vì tỷ lệ RR cứng.

### 31. 80% VA Rule Fade + No Demand/No Supply Xác Nhận — *(Combo: MP + VPA · Cao)*
Tăng độ tin cậy cho #2: khi giá bị từ chối ở ngoài VA trước (điều kiện kích hoạt 80% Rule),
kiểm tra thêm VPA tại điểm từ chối — nếu là **No Demand** (khi bị từ chối ở trên `prev_vah`)
hoặc **No Supply** (khi bị từ chối ở dưới `prev_val`) thì xác nhận lực đẩy ra ngoài VA là yếu,
càng ủng hộ kịch bản fade quay lại VA.

## Trạng Thái

Toàn bộ 31 ý tưởng trên đang ở giai đoạn **brainstorm** — chưa có plan thiết kế hay code nào
được viết. Khi chọn hướng để triển khai thật, nên viết thêm 1 design doc riêng (theo skill
`superpowers:brainstorming` → `superpowers:writing-plans`) hoặc dùng trực tiếp `/pine-create`
nếu phạm vi đơn giản. Gợi ý thứ tự ưu tiên dựa trên xếp hạng: bắt đầu từ **#30** (rủi ro triển
khai thấp nhất, tái dùng code có sẵn) hoặc **#2**/**#31** (rule MP vững + bản combo nâng cấp).

## Changelog

- 2026-11-21: #2 (80% VA Rule) đã có backtest định lượng thật trên VN30F1M 1m — xem
  [reports/va-rule-vn30f1m.md](reports/va-rule-vn30f1m.md). Kết quả: tỉ lệ "thành công" dao
  động 43.5%-71.7% tuỳ tiêu chí đo (đóng trong VA vs chạm lại POC), không phải "80%" như tên gọi
  — đã có khuyến nghị tham số cải tiến cụ thể trong báo cáo.

- 2026-11-18: Tạo tài liệu, tổng hợp 20 ý tưởng strategy ban đầu dựa trên
  `market_profile.pine` v3.1 và `market_profile_core.pine` v1.1.
- 2026-11-18: Thêm Phần 2 — 11 ý tưởng combo Market Profile + SMC (`smc_core` v1.0) + VPA
  (`wyckoff_evr.pine` v1.0), tổng 31 ý tưởng.
- 2026-11-18: Thêm nhãn "Nguồn kiến thức" (MP/SMC/VPA/Combo) cho từng strategy (kể cả Phần 1,
  trước đó mặc định toàn bộ là MP nên chưa ghi rõ); thêm mục "Đánh Giá Hiệu Quả & Xếp Hạng"
  (định tính, chưa backtest) xếp toàn bộ 31 ý tưởng từ cao xuống thấp kèm lý do.
