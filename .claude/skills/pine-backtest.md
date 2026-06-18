# /pine-backtest — Hỗ Trợ Backtest

Skill này hỗ trợ thiết kế, cấu hình và phân tích kết quả backtest cho Pine Script strategy trên TradingView.

## Quy Trình

### Bước 1: Xác Định Yêu Cầu Backtest

Hỏi người dùng:
- **Loại chiến lược**: Trend following, Mean reversion, Breakout, Scalping...?
- **Thị trường**: Chứng khoán Việt Nam (mã nào?), Crypto, Forex...?
- **Khung thời gian**: 1m, 5m, 15m, 1H, 4H, 1D...?
- **Vốn ban đầu**: Bao nhiêu? (VND, USD...)
- **Khẩu vị rủi ro**: Bảo thủ, cân bằng, hay mạo hiểm?

### Bước 2: Cấu Hình Strategy

Thiết lập `strategy()` với các tham số phù hợp:

```pinescript
strategy(
    title="Tên Chiến Lược",
    shorttitle="VIẾT_TẮT",
    overlay=true,

    // ─── Quản lý vốn ───
    initial_capital=100000000,          // 100 triệu VND
    default_qty_type=strategy.percent_of_equity,
    default_qty_value=100,              // 100% vốn mỗi lệnh (all-in)

    // ─── Phí & trượt giá ───
    commission_type=strategy.commission.percent,
    commission_value=0.15,              // 0.15% (môi giới + thuế)
    slippage=2,                         // 2 tick trượt giá

    // ─── Giới hạn giao dịch ───
    pyramiding=1,                       // Tối đa 1 lệnh cùng lúc
    max_bars_back=500,                  // Số bar lịch sử tối đa

    // ─── Tiền tệ (cho crypto/forex) ───
    // currency=currency.USD

    // ─── Tỷ lệ margin (nếu dùng margin) ───
    // margin_long=100,                   // 100% = không margin
    // margin_short=100
)
```

**Tham số phí cho chứng khoán Việt Nam:**
- Phí môi giới: 0.15%–0.35% (tùy công ty)
- Thuế bán: 0.1%
- Tổng phí khứ hồi: ~0.4%–0.8%

### Bước 3: Thiết Kế Logic Vào/Thoát Lệnh

#### Điều Kiện Vào Lệnh

```pinescript
// ─── Điều kiện Long ───
long_condition = signal_buy and barstate.isconfirmed

// ─── Điều kiện Short (nếu có) ───
short_condition = signal_sell and barstate.isconfirmed

// ─── Vào lệnh ───
if (long_condition)
    strategy.entry("Long", strategy.long)
if (short_condition)
    strategy.entry("Short", strategy.short)
```

#### Điều Kiện Thoát Lệnh

```pinescript
// ─── Take Profit / Stop Loss cố định ───
tp_pct = input.float(title="Take Profit (%)", defval=5.0, step=0.5, group="Quản Lý Rủi Ro") / 100
sl_pct = input.float(title="Stop Loss (%)", defval=2.0, step=0.5, group="Quản Lý Rủi Ro") / 100

// Long TP/SL
strategy.exit("Long TP/SL", "Long",
    limit=strategy.position_avg_price * (1 + tp_pct),
    stop=strategy.position_avg_price * (1 - sl_pct))

// ─── Trailing Stop ───
trail_pct = input.float(title="Trailing Stop (%)", defval=3.0, step=0.5, group="Quản Lý Rủi Ro") / 100
strategy.exit("Trailing Stop", "Long", trail_points=close * trail_pct / syminfo.mintick, trail_offset=close * trail_pct / syminfo.mintick)

// ─── Thoát theo tín hiệu ───
exit_condition = signal_exit and barstate.isconfirmed
if (exit_condition)
    strategy.close("Long", comment="Tín hiệu thoát")
```

#### ATR-based Stop Loss

```pinescript
atr_len = input.int(title="ATR Period", defval=14, group="Quản Lý Rủi Ro")
atr_mult = input.float(title="ATR Multiplier", defval=2.0, group="Quản Lý Rủi Ro")
atr_val = ta.atr(atr_len)

// Dynamic SL dựa trên ATR
sl_price_long = close - atr_val * atr_mult
tp_price_long = close + atr_val * atr_mult * 1.5   // Tỷ lệ R:R = 1.5
```

### Bước 4: Phân Tích Kết Quả

Sau khi chạy backtest trên TradingView, giải thích các chỉ số:

| Chỉ Số | Mô Tả | Ngưỡng Tốt |
|---|---|---|
| **Net Profit** | Lợi nhuận ròng | > 0, càng cao càng tốt |
| **% Profitable** | Tỷ lệ lệnh thắng | > 40% |
| **Profit Factor** | Tổng lãi / Tổng lỗ | > 1.5 |
| **Max Drawdown** | Mức sụt giảm tối đa | < 20% vốn |
| **Sharpe Ratio** | Lợi nhuận điều chỉnh rủi ro | > 1.0 |
| **Avg Trade** | Lợi nhuận trung bình mỗi lệnh | Dương |
| **Avg Bars in Trade** | Số bar trung bình mỗi lệnh | Tùy timeframe |

### Bước 5: Tránh Lookahead Bias

Lookahead bias là lỗi nghiêm trọng nhất trong backtest — dùng thông tin tương lai để quyết định hiện tại.

```pinescript
// ❌ SAI: Lookahead bias — dùng giá close của bar hiện tại nhưng chưa đóng
if (close > ta.sma(close, 20))  // bar chưa đóng, close vẫn đang biến động
    strategy.entry("Long", strategy.long)

// ✅ ĐÚNG: Dùng barstate.isconfirmed hoặc tham chiếu bar trước
if (close[1] > ta.sma(close, 20)[1] and barstate.isconfirmed)
    strategy.entry("Long", strategy.long)

// ✅ ĐÚNG: Dùng process_orders_on_close=true trong strategy()
strategy(..., process_orders_on_close=true)
```

### Bước 6: Tối Ưu Hóa

Hỗ trợ tối ưu tham số:
- Dùng `input.float()` với `step` nhỏ để tinh chỉnh tham số
- Gợi ý khoảng giá trị tối ưu cho từng tham số dựa trên backtest
- Cảnh báo overfitting: quá nhiều tham số → không tổng quát

## Định Dạng Kết Quả

```
## 📊 Phân Tích Backtest: [tên chiến lược]

### Cấu Hình
- Vốn: [số] VND
- Timeframe: [khung TG]
- Mã: [mã CK]
- Giai đoạn: [từ ngày - đến ngày]

### Kết Quả
| Chỉ Số | Giá Trị | Đánh Giá |
|---|---|---|
| Net Profit | ... | ... |

### Nhận Xét
- Điểm mạnh: ...
- Điểm yếu: ...
- Đề xuất cải thiện: ...
```
