# 📈 TV Pine — Thư Viện Pine Script TradingView

Dự án phát triển các script Pine Script cho TradingView: indicator, strategy, backtest, library.

Hỗ trợ chứng khoán Việt Nam (HOSE, HNX, UPCOM).

## 📁 Cấu Trúc Dự Án

```
tv_pine/
├── indicators/              # Indicator kỹ thuật
│   ├── trend/               #   Xu hướng (MA, MACD, ADX...)
│   ├── momentum/            #   Động lượng (RSI, Stochastic, CCI...)
│   ├── volatility/          #   Biến động (Bollinger, ATR, Keltner...)
│   ├── volume/              #   Khối lượng (OBV, VWAP, MFI...)
│   └── custom/              #   Indicator tùy chỉnh
├── strategies/              # Strategy giao dịch (có backtest)
│   ├── trend_following/     #   Chiến lược theo xu hướng
│   ├── mean_reversion/      #   Chiến lược hồi quy trung bình
│   ├── breakout/            #   Chiến lược phá vỡ
│   └── scalping/            #   Chiến lược lướt sóng
├── libraries/               # Thư viện dùng chung
│   ├── utils/               #   Hàm tiện ích
│   ├── indicators/          #   Indicator đóng gói
│   └── risk/                #   Quản lý rủi ro
├── backtests/               # Cấu hình & kết quả backtest
├── templates/               # File mẫu khởi tạo nhanh
├── docs/                    # Tài liệu, ghi chú
└── .claude/                 # Cấu hình Claude Code
    ├── CLAUDE.md            #   Hướng dẫn dự án
    ├── settings.json        #   Cài đặt
    └── skills/              #   Skills tùy chỉnh
        ├── pine-create.md   #   /pine-create
        ├── pine-review.md   #   /pine-review
        ├── pine-backtest.md #   /pine-backtest
        └── pine-convert.md  #   /pine-convert
```

## 🚀 Bắt Đầu Nhanh

### Tạo Indicator Mới
```
/pine-create
```
Sau đó mô tả indicator bạn muốn tạo.

### Review Code
```
/pine-review
```
Chỉ định file cần review.

### Chạy Backtest
```
/pine-backtest
```
Mô tả chiến lược cần backtest.

### Chuyển Đổi Phiên Bản
```
/pine-convert
```
Chỉ định file và phiên bản đích.

## 📋 Quy Ước

- **Pine Script v6** là mặc định
- Comment bằng **tiếng Việt**, thuật ngữ kỹ thuật giữ tiếng Anh
- File đặt tên: `ten_indicator.pine` hoặc `ten_strategy.pine`
- Mỗi script có phần mô tả, inputs có group, tooltip đầy đủ

## 📊 Thông Số Chứng Khoán Việt Nam

| Sàn | Giờ Giao Dịch | Biên Độ |
|-----|--------------|---------|
| HOSE | 9:00–11:30, 13:00–14:45 | ±7% |
| HNX | 9:00–11:30, 13:00–14:45 | ±10% |
| UPCOM | 9:00–11:30, 13:00–15:00 | ±15% |

## 🛠️ Skills

| Skill | Chức Năng |
|-------|-----------|
| `/pine-create` | Tạo indicator/strategy mới |
| `/pine-review` | Review code, phát hiện lỗi |
| `/pine-backtest` | Thiết kế & phân tích backtest |
| `/pine-convert` | Chuyển đổi phiên bản (v1→v6) |
