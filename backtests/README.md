# Khung Làm Việc — Research Định Lượng (Backtest Thống Kê)

> Dành cho các câu hỏi dạng *"tỉ lệ thành công của rule X là bao nhiêu / cần cải tiến tham số
> nào"* — khác với backtest chiến lược trên TradingView Strategy Tester (xem skill
> `/pine-backtest`). Ở đây ta trả lời bằng Python + dữ liệu lịch sử thật trong MySQL
> (`market_data.ohlc_candles`), không chạy trong Pine Editor.
>
> Có thể dùng trực tiếp skill `/pine-research` (xem `.claude/skills/pine-research.md`) để
> Claude tự thực hiện đúng quy trình dưới đây cho 1 câu hỏi research mới.

## Môi Trường

- Dùng **`python3` hệ thống** (không phải `python/.venv` — venv đó dành riêng cho dashboard
  `python/app.py`, không có pip/đang thiếu dependency). `python3` hệ thống đã có sẵn `pandas`,
  `numpy`, `mysql-connector-python`.
- **Bắt buộc set biến môi trường `MARKET_DATA_DB_URL`** trước khi chạy bất kỳ script nào trong
  `backtests/` (giống `python/db.py`) — không có giá trị mặc định hardcode trong code (tránh
  commit credential thật vào git). Ví dụ:
  ```bash
  export MARKET_DATA_DB_URL='mysql+aiomysql://<user>:<password>@localhost:3306/market_data'
  ```
  Nên thêm dòng này vào `~/.bashrc`/`~/.zshrc` hoặc 1 file `.env` cục bộ (không commit) để khỏi
  phải set lại mỗi lần — xem `.env.example` ở thư mục gốc.
- Schema bảng nến: `ohlc_candles(symbol, timeframe, bar_time, open, high, low, close, volume)`.

## Cấu Trúc Thư Mục

```
backtests/
├── README.md              # file này
├── common/                # module dùng CHUNG cho mọi research — import, đừng copy-paste
│   ├── data.py            # load_candles(), valid_consecutive_pairs() — tải & làm sạch dữ liệu
│   └── market_profile.py  # calc_profile(), build_session_profiles() — TPO/POC/VAH/VAL
└── <ten_research>/        # 1 thư mục riêng cho mỗi câu hỏi research
    ├── <ten>_backtest.py  # script phân tích, import từ ../common
    └── results.json       # số liệu thô (output của script, để viết báo cáo/artifact)
```

`docs/reports/<ten_research>.md` (dùng template `docs/reports/_template.md`) là nơi viết kết
luận bằng lời — `results.json` chỉ là số liệu thô, không phải sản phẩm cuối.

## Quy Trình Thêm 1 Research Mới

1. **Xác định câu hỏi cụ thể** — "tỉ lệ thành công của X là bao nhiêu, đo theo tiêu chí nào,
   trên mã/timeframe/giai đoạn nào". Nếu tiêu chí "thành công" có thể hiểu nhiều cách (như VA
   Rule: đóng trong VA vs chạm lại POC), hỏi người dùng chốt trước khi code — khác tiêu chí ra
   khác con số, không phải khác tham số.
2. **Kiểm tra dữ liệu có sẵn** — `SELECT symbol,timeframe,COUNT(*),MIN(bar_time),MAX(bar_time)
   FROM ohlc_candles GROUP BY symbol,timeframe` để biết phạm vi dữ liệu thật đang có trước khi
   hứa hẹn kết quả.
3. **Tạo `backtests/<ten_research>/`**, viết script dùng:
   - `common.data.load_candles(symbol, timeframe)` — đã tự loại nến giá ≤ 0.
   - `common.data.valid_consecutive_pairs(dates, max_gap_days=4)` — bất kỳ research nào so
     sánh "phiên nay vs phiên trước" PHẢI dùng hàm này để loại cặp phiên bị đứt gãy dữ liệu
     (đã phát hiện VN30F1M có vài đoạn mất dữ liệu nhiều ngày liên tiếp — xem
     `docs/reports/va-rule-vn30f1m.md` mục 2).
   - `common.market_profile.build_session_profiles(df)` — nếu cần POC/VAH/VAL, không viết lại
     thuật toán TPO từ đầu (phải khớp đúng `libraries/market_profile_core.pine`).
4. **Lưu số liệu thô ra `results.json`** trong cùng thư mục — để tái tạo báo cáo mà không cần
   chạy lại DB mỗi lần.
5. **Viết báo cáo** `docs/reports/<ten_research>.md` theo `docs/reports/_template.md` — luôn
   có mục Giới Hạn (cỡ mẫu, khoảng tin cậy) nếu n nhỏ, không khẳng định chắc chắn với mẫu nhỏ.
6. **Cập nhật bảng** "Báo Cáo Backtest & Thống Kê" trong `docs/README.md`.
7. *(Tuỳ chọn)* Dựng Artifact trực quan — load skill `dataviz` + `artifact-design` trước khi
   viết chart, dùng palette đã validate trong `dataviz/references/palette.md`.

## Quy Tắc Bắt Buộc (rút ra từ research VA Rule đầu tiên)

- **Luôn làm sạch dữ liệu trước khi tin số liệu** — nến lỗi giá=0, cặp phiên đứt gãy do thiếu
  dữ liệu nhiều ngày đều làm sai lệch kết quả nếu không lọc. Đừng giả định dữ liệu trong DB đã
  sạch 100%, luôn kiểm tra outlier trước khi chạy full backtest.
- **Định nghĩa "thành công"/"thắng" ảnh hưởng tới kết quả nhiều hơn mọi tham số khác** — luôn
  nêu rõ + test song song nhiều tiêu chí nếu còn mơ hồ, đừng chọn 1 tiêu chí ngầm định.
- **Nêu rõ giới hạn thống kê** — với mẫu vài chục/vài trăm phiên, khoảng tin cậy 95% có thể
  rất rộng (chênh ±10-15 điểm %). Không trình bày số liệu như sự thật tuyệt đối.
- **Tái dùng `backtests/common/`**, không copy-paste lại thuật toán Market Profile mỗi lần —
  nếu cần sửa/tối ưu thuật toán, sửa ở đây để mọi research cũ/mới đều nhất quán.
