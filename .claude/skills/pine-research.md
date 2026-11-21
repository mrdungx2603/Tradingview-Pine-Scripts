# /pine-research — Research Định Lượng Dựa Trên Dữ Liệu Thật

Skill này hỗ trợ trả lời các câu hỏi dạng **"tỉ lệ thành công của rule/pattern X là bao nhiêu,
cần tham số nào để cải tiến"** bằng cách backtest định lượng trên dữ liệu lịch sử thật trong
MySQL (`market_data.ohlc_candles`) — khác với `/pine-backtest` (hỗ trợ cấu hình Strategy Tester
của TradingView, chạy trong Pine Editor, không chạm dữ liệu DB).

Xem `backtests/README.md` để biết chi tiết cấu trúc thư mục và quy ước — skill này tóm tắt quy
trình thực thi.

## Quy Trình

### Bước 1: Làm Rõ Câu Hỏi Trước Khi Code

Trước khi viết bất kỳ dòng code nào, chốt với người dùng (nếu còn mơ hồ):
- **Định nghĩa "thành công"** — ví dụ với rule fade về 1 vùng giá: "thành công" là đóng cửa
  phiên trong vùng đó, hay chỉ cần chạm tới bất kỳ lúc nào? Đây thường là yếu tố ảnh hưởng tới
  kết quả NHIỀU hơn bất kỳ tham số nào khác — đừng ngầm định.
- **Symbol/timeframe/giai đoạn** cụ thể.
- **Tham số nào cần test nhiều mốc** (nếu câu hỏi có ý "cần cải tiến gì" — nghĩa là cần so sánh
  nhiều biến thể, không chỉ 1 lần chạy).
- **Output mong muốn**: chỉ cần số liệu trong chat, hay cần doc + artifact trực quan?

Nếu các điểm trên có từ 2 cách hiểu hợp lý trở lên, dùng `AskUserQuestion` — đừng tự chọn ngầm
rồi báo cáo sai câu hỏi.

### Bước 2: Khảo Sát Dữ Liệu Có Sẵn

```sql
SELECT symbol, timeframe, COUNT(*) AS n, MIN(bar_time) AS min_t, MAX(bar_time) AS max_t
FROM ohlc_candles
WHERE symbol = '<symbol>'
GROUP BY symbol, timeframe;
```

Kiểm tra luôn dữ liệu có sạch không trước khi tin số liệu cuối:
```sql
-- Nến lỗi giá
SELECT COUNT(*) FROM ohlc_candles WHERE symbol='<symbol>' AND timeframe='<tf>'
  AND (open<=0 OR high<=0 OR low<=0 OR close<=0);
-- Đoạn dữ liệu bị đứt gãy (thiếu nhiều ngày liên tiếp)
-- → so sánh khoảng cách giữa các DATE(bar_time) liên tiếp, xem backtests/common/data.py
--   hàm valid_consecutive_pairs()
```

Nếu mẫu quá nhỏ (vài chục phiên) hoặc có đoạn thiếu dữ liệu lớn, báo trước cho người dùng biết
giới hạn này sẽ ảnh hưởng tới độ tin cậy của kết quả.

### Bước 3: Viết Script Backtest

Tạo `backtests/<ten_research>/<ten>_backtest.py`, dùng module chung — **không copy-paste lại
logic Market Profile/TPO**:

```python
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from common.data import load_candles, valid_consecutive_pairs
from common.market_profile import build_session_profiles

df = load_candles("VN30F1M", "1m")          # tự loại nến giá <= 0
sessions = build_session_profiles(df)        # tính POC/VAH/VAL mỗi phiên
dates = [s["date"] for s in sessions]
valid_pairs = valid_consecutive_pairs(dates)  # loại cặp phiên bị đứt gãy dữ liệu
```

Chạy bằng **`python3` hệ thống** (có sẵn pandas/numpy/mysql-connector), không phải
`python/.venv`. Lưu kết quả thô ra `results.json` trong cùng thư mục (để không phải query lại
DB mỗi lần viết/sửa báo cáo).

### Bước 4: Diễn Giải Kết Quả Trung Thực

- Nêu rõ cỡ mẫu và — nếu n < ~100 — ước lượng khoảng tin cậy xấp xỉ (dùng Wilson score hoặc
  quy tắc ngón tay cái `±1.96*sqrt(p(1-p)/n)`), tránh trình bày % như con số tuyệt đối chắc
  chắn.
- Nếu test nhiều biến thể tham số, trình bày dạng bảng so sánh (không chỉ chốt 1 số).
- Tách rõ "tìm thấy pattern" khỏi "tham số nào nên đổi trong code hiện tại" — phần sau phải
  trỏ đúng tên biến/hàm trong code thật (vd `mpcore.f_check_80_rule`, biến `bars_inside_prev_va`).

### Bước 5: Viết Báo Cáo

Copy `docs/reports/_template.md` → `docs/reports/<ten_research>.md`, điền đủ mục (đặc biệt
mục Giới Hạn — không bỏ qua). Cập nhật bảng "Báo Cáo Backtest & Thống Kê" trong
`docs/README.md`. Nếu ý tưởng liên quan đã có trong `docs/market-profile-strategy-ideas.md`,
thêm dòng chú thích "✅ đã backtest — xem [report]" + 1 dòng changelog ở đó.

### Bước 6 (Tuỳ Chọn): Artifact Trực Quan

Nếu người dùng muốn bản trực quan: load skill `dataviz` rồi `artifact-design` TRƯỚC khi viết
HTML — dùng palette đã validate sẵn trong `dataviz/references/palette.md` cho các chart, chạy
`validate_palette.js` nếu chọn subset màu khác mặc định.

## Khác Biệt Với `/pine-backtest`

| | `/pine-research` (skill này) | `/pine-backtest` |
|---|---|---|
| Chạy ở đâu | Python, local, dữ liệu MySQL | TradingView Strategy Tester |
| Trả lời câu hỏi | "Rule X có đúng không, tỉ lệ bao nhiêu" | "Chiến lược Y lãi/lỗ bao nhiêu, cấu hình sao" |
| Input | Dữ liệu lịch sử thật trong DB | Script `.pine` chạy trực tiếp trên chart |
| Output | `docs/reports/*.md` + `results.json` + artifact | Performance Summary / List of Trades trên TradingView |
