# SMC Market Structure Indicator — Tài Liệu Hướng Dẫn

> **Script Base**: [indicators/smc_market_structure.pine](../indicators/smc_market_structure.pine) (v1.2)
> **Script MTF**: [indicators/smc_market_structure_mtf.pine](../indicators/smc_market_structure_mtf.pine) (v1.4)
> **Ngày tạo**: 2026-06-18
> **Pine Script**: v6
> **Loại**: Indicator (overlay)

---

## Mục Lục

1. [Tổng Quan](#tổng-quan)
2. [Khái Niệm SMC](#khái-niệm-smc)
3. [Tham Số Đầu Vào](#tham-số-đầu-vào)
4. [Kiến Trúc Hệ Thống](#kiến-trúc-hệ-thống)
5. [Luồng Hoạt Động](#luồng-hoạt-động)
6. [Các Tín Hiệu Trên Chart](#các-tín-hiệu-trên-chart)
7. [Bảng Thống Kê (Dashboard)](#bảng-thống-kê-dashboard)
8. [Hướng Dẫn Sử Dụng](#hướng-dẫn-sử-dụng)
9. [Hạn Chế & Lưu Ý](#hạn-chế--lưu-ý)
10. [Multi-Timeframe (MTF) Trend](#multi-timeframe-mtf-trend--chỉ-có-trong-bản-mtf)
11. [Kế Hoạch Phát Triển](#kế-hoạch-phát-triển)

---

## Tổng Quan

**SMC Market Structure Indicator** là công cụ phân tích cấu trúc thị trường dựa trên phương pháp **Smart Money Concepts (SMC)** — một trường phái giao dịch tập trung vào việc theo dõi hành vi của "dòng tiền thông minh" (tổ chức, ngân hàng, quỹ đầu tư) thông qua cấu trúc giá.

Indicator tự động phát hiện và đánh dấu:

| Thành Phần | Ký Hiệu | Ý Nghĩa |
|---|---|---|
| **Higher High** | `HH` | Đỉnh cao hơn đỉnh trước — xác nhận xu hướng tăng |
| **Higher Low** | `HL` | Đáy cao hơn đáy trước — duy trì xu hướng tăng |
| **Lower Low** | `LL` | Đáy thấp hơn đáy trước — xác nhận xu hướng giảm |
| **Lower High** | `LH` | Đỉnh thấp hơn đỉnh trước — duy trì xu hướng giảm |
| **Break of Structure** | `BoS` | Phá vỡ cấu trúc cùng chiều xu hướng |
| **Change of Character** | `CHoCH` | Phá vỡ cấu trúc ngược chiều — tín hiệu đảo xu hướng |
| **Vị trí Premium/Discount** | `% trong Swing` | Giá đang ở vùng Premium (>50%) hay Discount (<50%) |

---

## Khái Niệm SMC

### Cấu Trúc Thị Trường (Market Structure)

Trong SMC, thị trường vận động theo cấu trúc **sóng đỉnh-đáy**:

```
UPTREND (Xu hướng tăng):
    HH₂ ←───┐
   ╱        │
  ╱  HH₁    │  Đỉnh sau cao hơn đỉnh trước
 ╱  ╱       │
╱  ╱        │
  ╱  HL₂    │  Đáy sau cao hơn đáy trước
 ╱  ╱       │
╱  HL₁ ←────┘

DOWNTREND (Xu hướng giảm):
  LH₁ ←───┐
   ╲       │
    ╲ LH₂  │  Đỉnh sau thấp hơn đỉnh trước
     ╲ ╲   │
      ╲ ╲  │
      LL₁   │  Đáy sau thấp hơn đáy trước
       ╲ ╲ │
       LL₂←─┘
```

### Break of Structure (BoS)

**BoS** xảy ra khi giá phá vỡ một mức cấu trúc quan trọng **cùng chiều** với xu hướng hiện tại:
- **Uptrend**: Giá đóng cửa vượt qua HH trước đó → tiếp tục xu hướng tăng
- **Downtrend**: Giá đóng cửa vượt qua LL trước đó → tiếp tục xu hướng giảm

BoS là tín hiệu **tiếp diễn xu hướng** (continuation).

### Change of Character (CHoCH)

**CHoCH** xảy ra khi giá phá vỡ một mức cấu trúc **ngược chiều** với xu hướng hiện tại:
- **Uptrend**: Giá đóng cửa xuống dưới HL → cảnh báo xu hướng tăng yếu đi, có thể đảo chiều
- **Downtrend**: Giá đóng cửa vượt lên trên LH → cảnh báo xu hướng giảm yếu đi, có thể đảo chiều

CHoCH là tín hiệu **đảo chiều tiềm năng** (potential reversal).

### Premium & Discount

Trong SMC, mỗi Swing (đoạn giá từ Swing Low đến Swing High) được chia thành 2 vùng:

```
Swing High ──────────────────── 100% (Premium Zone)
    │
    │  Vùng Premium (>50%): Vùng giá đắt — tìm cơ hội BÁN
    │  Vùng Discount (<50%): Vùng giá rẻ — tìm cơ hội MUA
    │
Swing Low  ────────────────────   0% (Discount Zone)
```

---

## Tham Số Đầu Vào

### Nhóm "Tham Số Chính"

| Tham Số | Loại | Mặc Định | Mô Tả |
|---|---|---|---|
| **Seed Mode** | `string` | `"Pivot Seed"` | Phương pháp khởi tạo cấu trúc ban đầu |
| **Pivot Length** | `int` | `5` | Số bar trái/phải để xác định Pivot High/Low (2–50) |

#### Seed Mode: Pivot Seed

- Dùng `ta.pivothigh()` và `ta.pivotlow()` để tìm đỉnh/đáy đầu tiên
- Từ 2 pivot đó, suy ra xu hướng ban đầu (uptrend hay downtrend)
- **Phù hợp**: Mọi khung thời gian (kể cả Daily, Weekly)
- **Logic**: Dựa vào thứ tự thời gian của Pivot High và Pivot Low
  - Pivot High xuất hiện **sau** Pivot Low → Uptrend (đỉnh cao hơn đáy)
  - Pivot Low xuất hiện **sau** Pivot High → Downtrend (đáy thấp hơn đỉnh)

#### Seed Mode: Session Seed

- Dùng bar đầu tiên của phiên giao dịch làm cấu trúc tham chiếu
- `trend = 0` (chưa xác định xu hướng), chờ breakout đầu tiên để xác lập
- Tự động reset vào đầu mỗi phiên mới
- **Phù hợp**: Khung thời gian phút (1m, 5m, 15m, 30m, 1H)
- **Lưu ý**: Sẽ báo lỗi `runtime.error` nếu dùng với khung thời gian Daily trở lên

### Nhóm "BoS" (Break of Structure)

| Tham Số | Loại | Mặc Định | Mô Tả |
|---|---|---|---|
| **Hiển Thị** | `bool` | `true` | Bật/tắt toàn bộ đường BoS và label |
| **Tiêu Đề Label** | `string` | `"BoS"` | Nội dung text hiển thị trên label BoS |
| **Kiểu Đường** | `string` | `"Solid"` | `Solid` / `Dashed` / `Dotted` |
| **Màu Đường BoS Tăng** | `color` | `blue` | Màu đường và label BoS trong xu hướng tăng |
| **Màu Đường BoS Giảm** | `color` | `red` | Màu đường và label BoS trong xu hướng giảm |

### Nhóm "CHoCH" (Change of Character)

| Tham Số | Loại | Mặc Định | Mô Tả |
|---|---|---|---|
| **Hiển Thị** | `bool` | `true` | Bật/tắt toàn bộ đường CHoCH và label |
| **Tiêu Đề Label** | `string` | `"CHoCH"` | Nội dung text hiển thị trên label CHoCH |
| **Kiểu Đường** | `string` | `"Dashed"` | `Solid` / `Dashed` / `Dotted` |
| **Màu Đường CHoCH** | `color` | `orange` | Màu đường và label CHoCH |

### Nhóm "Label Cấu Trúc"

| Tham Số | Loại | Mặc Định | Mô Tả |
|---|---|---|---|
| **Hiển Thị** | `bool` | `true` | Bật/tắt label HH/HL/LL/LH |
| **Màu Label Bull (HH/HL)** | `color` | `blue` | Màu cho label HH và HL |
| **Màu Label Bear (LL/LH)** | `color` | `red` | Màu cho label LL và LH |

### Nhóm "Dashboard"

| Tham Số | Loại | Mặc Định | Mô Tả |
|---|---|---|---|
| **Hiển Thị** | `bool` | `true` | Bật/tắt bảng thống kê SMC |
| **Vị Trí** | `string` | `"Top Right"` | Góc đặt bảng: `Top Right` / `Top Left` / `Bottom Right` / `Bottom Left` |

---

## Kiến Trúc Hệ Thống

### Biến Trạng Thái (State Variables)

```
┌─────────────────────────────────────────────────────┐
│                    TREND STATE                       │
│  trend = 1  → UPTREND                               │
│  trend = -1 → DOWNTREND                             │
│  trend = 0  → INIT (chưa xác định)                  │
│                                                     │
│  SWING POINTS (điểm cấu trúc hiện tại)               │
│  ┌─────────────────┬─────────────────┐              │
│  │ Uptrend         │ Downtrend       │              │
│  ├─────────────────┼─────────────────┤              │
│  │ hh_bar/price    │ lh_bar/price    │  (đỉnh)      │
│  │ hl_bar/price    │ ll_bar/price    │  (đáy)       │
│  └─────────────────┴─────────────────┘              │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                  CANDIDATE SYSTEM                    │
│  cand_type = 1  → Đang săn HIGHER HIGH              │
│  cand_type = -1 → Đang săn LOWER LOW                │
│  cand_type = 0  → Không hoạt động (IDLE)            │
│                                                     │
│  cand_bar   → Bar nơi candidate form thành          │
│  cand_high  → Giá cao nhất của candidate            │
│  cand_low   → Giá thấp nhất của candidate           │
│  trigger_bar → Bar nơi xảy ra breakout              │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                  SESSION MANAGEMENT                  │
│  seeded = true  → Đã khởi tạo cấu trúc xong         │
│  seeded = false → Chưa hoặc cần khởi tạo lại         │
│  is_new_session → Đầu phiên mới (Session Seed)      │
└─────────────────────────────────────────────────────┘
```

### Sơ Đồ Máy Trạng Thái (State Machine)

```
                         ┌─────────────┐
                         │   INIT      │
                         │  trend = 0  │
                         └──┬──────┬───┘
                   close>HH│      │close<LL
                           ▼      ▼
                  ┌──────────┐ ┌──────────┐
                  │ UPTREND  │ │DOWNTREND │
                  │ trend=1  │ │trend=-1  │
                  └──┬───┬───┘ └──┬───┬───┘
        close>HH│    │   │close<HL  │   │close<LL
       (săn HH) ▼    │   ▼(CHoCH)   │   ▼(săn LL)
           ┌────────┐│ ┌──────────┐ │┌────────┐
           │CAND=1  ││ │ CAND=-1  │ ││CAND=-1 │
           │Săn HH  ││ │Săn LL↓   │ ││Săn LL  │
           └───┬────┘│ └────┬─────┘ │└───┬────┘
      close<low│     │      │close>high  │close>high
       [Xác Nhận]    │      │[CHoCH XN]  │[Xác Nhận]
               ▼      │      ▼           │    ▼
        ┌───────────┐ │ ┌───────────┐   │┌───────────┐
        │NEW HH+HL  │ │ │NEW LL+LH  │   ││NEW LL+LH  │
        │Xu hướng   │ │ │CHUYỂN SANG│   ││Xu hướng   │
        │tiếp diễn ▲│ │ │DOWNTREND  │   ││tiếp diễn ▼│
        └───────────┘ │ └───────────┘   │└───────────┘
                      │                 │
        close>lh│    │                 │    │close<hl
       (săn HH) ▼    │                 │    ▼(CHoCH)
           ┌────────┐│                 │┌──────────┐
           │CAND=1  ││                 ││ CAND=1   │
           │Săn HH↑ ││                 ││Săn HH    │
           └───┬────┘│                 │└────┬─────┘
      close<low│     │                 │     │close>high
       [CHoCH XN]    │                 │     │[CHoCH XN]
               ▼     │                 │     ▼
        ┌───────────┐│                 │┌───────────┐
        │NEW HH+HL  ││                 ││NEW HH+HL  │
        │CHUYỂN SANG│◄────────────────┘│Xu hướng   │
        │UPTREND    │                  │tiếp diễn ▲ │
        └───────────┘                  └───────────┘
```

---

## Luồng Hoạt Động

### Bước 1: Seeding (Khởi Tạo Cấu Trúc)

Script chạy một lần duy nhất (hoặc mỗi phiên nếu dùng Session Seed) để xác lập cấu trúc ban đầu:

**Pivot Seed**:
1. Dùng `ta.pivothigh()` và `ta.pivotlow()` với `pivotLength` để tìm pivot
2. Khi cả Pivot High và Pivot Low đều đã xuất hiện, so sánh `bar_index`:
   - `ph_bar > pl_bar` → đỉnh xuất hiện sau đáy → **Uptrend**
   - `pl_bar > ph_bar` → đáy xuất hiện sau đỉnh → **Downtrend**
3. Gán giá trị cho các biến `hh/hl/ll/lh` tương ứng

**Session Seed**:
1. Lấy bar đầu tiên của phiên: gán tất cả `hh/hl/ll/lh = bar_index`
2. `trend = 0` — chưa xác định xu hướng
3. Chờ breakout (close vượt HH hoặc LL) để xác định trend

### Bước 2: State Machine (Máy Trạng Thái)

Sau khi seeded, mỗi bar mới đều được đánh giá qua máy trạng thái:

#### Chế Độ IDLE (`cand_type == 0`)

Script đang chờ tín hiệu breakout:
- **Uptrend**: Đợi `close > HH` (bắt đầu săn HH mới) hoặc `close < HL` (CHoCH — cảnh báo đảo chiều)
- **Downtrend**: Đợi `close < LL` (bắt đầu săn LL mới) hoặc `close > LH` (CHoCH — cảnh báo đảo chiều)

#### Chế Độ SĂN ĐIỂM CỰC TRỊ (`cand_type == 1` hoặc `-1`)

Script đang theo dõi một candidate để xác nhận:

**Săn HH (cand_type == 1 trong Uptrend)**:
- Mỗi bar mới có `high > cand_high` → cập nhật candidate (bar hiện tại là đỉnh mới)
- Khi `close < low` của bar candidate → **XÁC NHẬN**: HH form thành
- Quét toàn bộ range từ HH cũ đến HH mới để tìm HL (đáy thấp nhất)
- Reset `cand_type = 0` (về chế độ IDLE), tiếp tục uptrend

**Săn LL (cand_type == -1 trong Downtrend)**:
- Mỗi bar mới có `low < cand_low` → cập nhật candidate
- Khi `close > high` của bar candidate → **XÁC NHẬN**: LL form thành
- Quét toàn bộ range từ LL cũ đến LL mới để tìm LH (đỉnh cao nhất)
- Reset `cand_type = 0`, tiếp tục downtrend

**Săn CHoCH (cand_type ngược trend)**:
- Uptrend + `cand_type == -1`: Đang săn đảo chiều → săn LL
- Khi `close > high` của candidate → **CHoCH XÁC NHẬN**: Xu hướng chuyển từ UPTREND → DOWNTREND
- Downtrend + `cand_type == 1`: Đang săn đảo chiều → săn HH
- Khi `close < low` của candidate → **CHoCH XÁC NHẬN**: Xu hướng chuyển từ DOWNTREND → UPTREND

### Bước 3: Quét Range

Sau khi một điểm cực trị được xác nhận, script quét toàn bộ range giữa `trigger_bar` và điểm mới:

- **HH form thành** → quét range tìm **đáy thấp nhất** (HL mới)
- **LL form thành** → quét range tìm **đỉnh cao nhất** (LH mới)

Điều này đảm bảo HL/LH luôn phản ánh chính xác điểm cực trị trong khoảng giữa 2 điểm cấu trúc.

### Bước 4: Vẽ Đồ Họa

Mỗi sự kiện được vẽ ngay lập tức lên chart bằng `line.new()`, `label.new()`:

| Sự Kiện | Đường Kẻ | Label | Màu |
|---|---|---|---|
| BoS (bull) | Solid ngang | `BoS` | Bullish Color |
| BoS (bear) | Solid ngang | `BoS` | Bearish Color |
| CHoCH | Dashed ngang | `CHoCH` | CHoCH Color |
| HH | — | `HH` (dưới bar) | Bullish Color |
| HL | — | `HL` (trên bar) | Bullish Color |
| LL | — | `LL` (trên bar) | Bearish Color |
| LH | — | `LH` (dưới bar) | Bearish Color |

---

## Các Tín Hiệu Trên Chart

### Cách Đọc Chart

```
                     HH ██
  BoS ─────────────────────── BoS ────────
    ╱               HL ▲           ╲
   ╱                                   ╲
  ╱                                     ╲ HH ██
 ╱            LH ██                       ╲
              ─ ─ ─ ─ CHoCH                ╲
                         ╲                   HL ▲
                          ╲
                           ╲ LL ▼
                    BoS ────────────────────
                                    LL ▼
```

**Chú giải ký hiệu**:
- `───` Solid line = BoS (phá vỡ cùng chiều xu hướng)
- `- - -` Dashed line = CHoCH (phá vỡ ngược chiều, đảo xu hướng)
- `██` Label dưới bar = HH hoặc LH (đỉnh)
- `▲` Label trên bar = HL (đáy trong uptrend)
- `▼` Label trên bar = LL (đáy trong downtrend)

### Ví Dụ Kịch Bản Giao Dịch

#### Kịch bản 1: Mua theo Uptrend

1. Xuất hiện BoS (đường xanh solid) → xác nhận xu hướng tăng
2. HH và HL liên tiếp được đánh dấu → cấu trúc uptrend vững
3. Dashboard hiển thị vị trí Discount (<50%) → giá đang ở vùng rẻ
4. → **Cân nhắc vào lệnh BUY** khi giá ở vùng Discount, dừng lỗ dưới HL gần nhất

#### Kịch bản 2: Bán khi CHoCH xuất hiện

1. Đang trong uptrend, HL bị phá vỡ → xuất hiện CHoCH (đường cam dashed)
2. Sau CHoCH, xuất hiện LL và LH → cấu trúc chuyển sang downtrend
3. Dashboard chuyển từ BULLISH → BEARISH
4. → **Cân nhắc vào lệnh SELL** sau khi CHoCH được xác nhận

#### Kịch bản 3: Chốt lời theo Premium/Discount

1. Đang trong uptrend, giá ở vùng Premium (>50%)
2. Giá gần Swing High → vùng quá mua
3. → **Cân nhắc chốt lời** hoặc giảm vị thế

---

## Bảng Thống Kê (Dashboard)

Dashboard hiển thị ở góc trên bên phải chart, cập nhật real-time:

```
┌──────────────────────────┐
│ THÔNG SỐ SMC  │ BULLISH  │  ← Tiêu đề + Trạng thái xu hướng
├──────────────────────────┤
│ HH Price      │ 1,250.50 │  ← Swing High hiện tại
├──────────────────────────┤
│ HL Price      │ 1,180.00 │  ← Swing Low hiện tại
├──────────────────────────┤
│ Vị trí trong  │  32.45%  │  ← % Discount/Premium
│ Swing         │          │     Màu xanh: Discount
│               │          │     Màu đỏ: Premium
└──────────────────────────┘
```

| Hàng | Ý Nghĩa |
|---|---|
| **Hàng 1** | Tiêu đề bảng + Trạng thái BULLISH (xanh) hoặc BEARISH (đỏ) |
| **Hàng 2** | Giá Swing High — HH (uptrend) hoặc LH (downtrend) |
| **Hàng 3** | Giá Swing Low — HL (uptrend) hoặc LL (downtrend) |
| **Hàng 4** | Vị trí % của giá trong Swing **(quan trọng nhất cho entry)** |

### Cách Đọc Vị Trí Premium/Discount

| % | Ý Nghĩa | Hành Động |
|---|---|---|
| **0–25%** | Discount sâu (giá rẻ) | Cân nhắc BUY (trong uptrend) |
| **25–50%** | Discount (giá hợp lý) | Có thể BUY |
| **50%** | Midpoint (cân bằng) | Trung lập, chờ xác nhận |
| **50–75%** | Premium (giá đắt) | Có thể SELL (trong downtrend) |
| **75–100%** | Premium sâu (giá rất đắt) | Cân nhắc SELL hoặc chốt lời BUY |

---

## Hướng Dẫn Sử Dụng

### Bước 1: Chọn Khung Thời Gian

| Khung Thời Gian | Seed Mode Khuyên Dùng | Ghi Chú |
|---|---|---|
| **1m, 5m, 15m** | `Session Seed` | Phân tích intraday, reset mỗi phiên |
| **30m, 1H** | `Pivot Seed` hoặc `Session Seed` | Linh hoạt cả hai |
| **4H, Daily, Weekly** | `Pivot Seed` | Phân tích swing dài hạn |

### Bước 2: Điều Chỉnh Pivot Length

- `pivotLength = 3–5`: Nhạy hơn, phát hiện nhiều cấu trúc nhỏ (scalping)
- `pivotLength = 7–10`: Trung bình, phù hợp swing trade
- `pivotLength = 15–30`: Chậm hơn, chỉ bắt các cấu trúc lớn (position trade)

### Bước 3: Đọc Tín Hiệu

1. **Xác định xu hướng** từ Dashboard (BULLISH/BEARISH) và chuỗi HH/HL hoặc LL/LH
2. **Tìm điểm entry** dựa vào vị trí Premium/Discount:
   - Uptrend + Discount = cơ hội BUY
   - Downtrend + Premium = cơ hội SELL
3. **Xác nhận bằng BoS**: BoS mới xuất hiện = xu hướng còn mạnh
4. **Cảnh báo bằng CHoCH**: CHoCH xuất hiện = cân nhắc thoát lệnh hoặc chuẩn bị đảo chiều

### Bước 4: Quản Lý Rủi Ro

- **Stop Loss trong Uptrend**: Dưới HL gần nhất
- **Stop Loss trong Downtrend**: Trên LH gần nhất
- **Take Profit**: Khi giá chạm vùng Premium (uptrend) hoặc Discount (downtrend)

---

## Hạn Chế & Lưu Ý

### Hạn Chế Kỹ Thuật

| Hạn Chế | Mô Tả | Cách Xử Lý |
|---|---|---|
| **Repainting** | `ta.pivothigh()`/`ta.pivotlow()` có độ trễ `pivotLength` bar, pivot có thể biến mất khi giá thay đổi | Dùng `barstate.isconfirmed` kiểm tra bar đã đóng |
| **Vòng lặp `for`** | Các vòng quét range có thể nặng với cấu trúc dài | Đã giới hạn scope trong `trigger_bar → confirm_bar` |
| **Giới hạn 500 objects** | TradingView giới hạn 500 lines và 500 labels | Đã khai báo `max_lines_count=500`, `max_labels_count=500`. Khi đầy, các đối tượng cũ sẽ tự động bị xóa |
| **Không có historical labels** | Chỉ nhìn thấy cấu trúc từ thời điểm thêm indicator | Đây là hạn chế cố hữu của Pine Script, không thể vẽ lại quá khứ từ đầu chart |
| **Session Seed chỉ dùng cho intraday** | Sẽ `runtime.error` nếu dùng Daily+ | Chuyển sang Pivot Seed cho timeframe lớn |

### Cạm Bẫy Thường Gặp

1. **CHoCH không có nghĩa là đảo chiều ngay lập tức**: CHoCH là tín hiệu cảnh báo sớm, thị trường có thể sideway hoặc retest trước khi đảo chiều thực sự.

2. **Không giao dịch chỉ dựa trên 1 tín hiệu**: Market Structure nên được kết hợp với:
   - Volume profile / Order block
   - Liquidity sweep / Stop hunt
   - FVG (Fair Value Gap)
   - Các chỉ báo xác nhận khác (RSI divergence, volume spike)

3. **Sideway market**: Trong thị trường đi ngang, BoS và CHoCH có thể xuất hiện liên tục (whipsaw), tạo tín hiệu nhiễu.

4. **Khung thời gian thấp**: 1m-5m có nhiều nhiễu. Nên dùng multi-timeframe analysis: xác định xu hướng trên H1/H4, tìm entry trên M5/M15.

---

## Multi-Timeframe (MTF) Trend — Chỉ Có Trong Bản MTF

Bản **SMC Market Structure + MTF** (`smc_market_structure_mtf.pine`) bổ sung bảng hiển thị xu hướng của 3 khung thời gian khác nhau.

### Cách Hoạt Động

Bảng MTF hiển thị trend (BULL/BEAR/WAIT) kèm theo giá trị Swing High/Low cho từng khung thời gian được chọn. Logic xác định trend dùng **trend score** dựa trên chuỗi 3 pivot:

```
Với mỗi pivot trong chuỗi:
  HH → +1,  LH → -1
  HL → +1,  LL → -1

Tổng score:
  >= +2  →  BULL (cần ít nhất 2/4 tín hiệu đồng thuận)
  <= -2  →  BEAR
  -1..+1 →  Giữ trend cũ (không đủ mạnh để đổi)
```

Cách tiếp cận này chống nhiễu tốt hơn so với việc chỉ so sánh 2 pivot đơn lẻ. Trend chỉ thay đổi khi có đủ tín hiệu xác nhận từ chuỗi pivot — bám sát nguyên lý state machine của indicator chính.

### Cấu Trúc Bảng MTF

```
┌────────────────────────────────────────┐
│         MTF TREND                      │
├────────┬─────────┬─────────────────────┤
│  D1    │  BULL   │ HH/HL: 1250 / 1180  │
├────────┼─────────┼─────────────────────┤
│  4H    │  BEAR   │ LH/LL: 1220 / 1150  │
├────────┼─────────┼─────────────────────┤
│  1H    │  WAIT   │ PH/PL: 1210 / 1165  │
└────────┴─────────┴─────────────────────┘
```

| Cột | Nội Dung |
|---|---|
| **TF** | Tên khung thời gian |
| **Trend** | BULL (xanh) / BEAR (đỏ) / WAIT (xám) |
| **Swing** | Nhãn cấu trúc (HH/HL, LH/LL, hoặc PH/PL nếu WAIT) + giá trị |

### Hiệu Năng

- Khi `show_mtf = false` (tắt MTF): script không gọi `request.security()` → chạy nhẹ ngang bản base
- Khi `show_mtf = true`: mỗi TF active gọi 1 `request.security()`, tối đa 3 lần
- Có thể chọn "None" cho từng TF để giảm số lượng request

### So Sánh 2 Phiên Bản

| | Base (v1.2) | MTF (v1.4) |
|---|---|---|
| **File** | `indicators/smc_market_structure.pine` | `indicators/smc_market_structure_mtf.pine` |
| **Input groups** | 5 (Tham Số Chính, BoS, CHoCH, Label, Dashboard) | 6 (+ Multi-Timeframe) |
| **MTF toggle** | Không có | Có (`show_mtf`) |
| **request.security()** | 0 | 0–3 (tùy số TF active) |
| **Phù hợp** | Máy yếu, chart đơn giản | Phân tích đa khung thời gian |

---

## Kế Hoạch Phát Triển

### v1.5 (Dự Kiến)

- [ ] Thêm FVG (Fair Value Gap) detection
- [ ] Thêm Order Block detection
- [ ] Cảnh báo (alertcondition) cho BoS và CHoCH
- [x] Multi-timeframe dashboard (hiển thị cấu trúc của timeframe cao hơn) ✓ Đã hoàn thành v1.4

### v1.2 (Dự Kiến)

- [ ] Chuyển đổi sang Strategy để backtest
- [ ] Liquidity sweep detection
- [ ] Tự động vẽ trendline nối các điểm cấu trúc
- [ ] Hỗ trợ Inducement (IDM) — cấu trúc phụ để tinh chỉnh entry

### Ý Tưởng Xa Hơn

- [ ] ICT Killzone highlight (London Open, New York Open, etc.)
- [ ] Tích hợp với Volume Profile
- [ ] Export thành Library để tái sử dụng

---

## Tham Khảo

- [Pine Script v6 Documentation](https://www.tradingview.com/pine-script-docs/en/v6/)
- [Pine Script v6 Migration Guide](https://www.tradingview.com/pine-script-docs/en/v6/migration_guides/from_v5_to_v6.html)
- Smart Money Concepts (SMC) — phương pháp giao dịch phổ biến trong cộng đồng Forex/Crypto, dựa trên hành vi của tổ chức lớn.
