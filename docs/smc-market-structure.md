# SMC Market Structure Indicator — Tài Liệu Hướng Dẫn

> **Script**: [indicators/smc_market_structure.pine](../indicators/smc_market_structure.pine) (v1.4)
> **Script MTF**: [indicators/smc_market_structure_mtf.pine](../indicators/smc_market_structure_mtf.pine) (v1.4)
> **Ngày tạo**: 2026-06-18 / **Cập nhật**: 2026-06-21
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
7. [Imbalance Detection (FVG / OG / VI)](#imbalance-detection-fvg--og--vi)
8. [Order Blocks (OB)](#order-blocks-ob)
9. [Bảng Thống Kê (Dashboard)](#bảng-thống-kê-dashboard)
10. [Hướng Dẫn Sử Dụng](#hướng-dẫn-sử-dụng)
11. [Hạn Chế & Lưu Ý](#hạn-chế--lưu-ý)
12. [Multi-Timeframe (MTF) Trend](#multi-timeframe-mtf-trend--chỉ-có-trong-bản-mtf)
13. [Kế Hoạch Phát Triển](#kế-hoạch-phát-triển)

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
| **Fair Value Gap** | `FVG` | Khoảng trống giá trị hợp lý (mô hình 3 nến) |
| **Opening Gap** | `OG` | Khoảng trống mở cửa giữa 2 nến liên tiếp |
| **Volume Imbalance** | `VI` | Mất cân bằng khối lượng giữa 2 nến |
| **Order Block** | `OB` | Vùng giá của nến gốc tạo ra imbalance |
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

### Imbalance & Order Blocks

**Imbalance** (mất cân bằng) là các vùng giá mà tại đó lực mua hoặc lực bán mạnh đến mức tạo ra khoảng trống giá (gap). Có 3 loại:

| Loại | Mô Hình | Ý Nghĩa |
|---|---|---|
| **FVG** (Fair Value Gap) | Mô hình 3 nến: nến 1 và 3 không chồng lấp | Vùng giá chưa được "giao dịch công bằng", giá có xu hướng quay lại lấp |
| **OG** (Opening Gap) | Khoảng trống giữa close nến trước và open nến sau | Gap mở cửa, thường thấy ở chứng khoán có thanh khoản thấp |
| **VI** (Volume Imbalance) | 2 nến chồng lấp nhưng quan hệ open/close bất thường | Dấu hiệu dòng tiền lớn đẩy giá đi xa |

**Order Block (OB)** là vùng giá của **nến đầu tiên (origin)** trước khi imbalance xảy ra — đây là nơi các tổ chức lớn đặt lệnh. OB có 2 trạng thái:

```
OB Active (chưa bị phá):
┌─────────────┐
│ origin bar  │ ═══════▶ kéo dài đến bar hiện tại (nét đứt, mờ)
└─────────────┘

OB Mitigated (đã bị phá):
┌─────────────┐
│ origin bar  │ ═══════▶ đến nến mitigation (nét liền, đậm hơn)
└─────────────┘
```

- **Bullish OB (Demand)**: Bị mitigation khi `low <= top` (giá quay lại chạm vùng OB từ trên xuống)
- **Bearish OB (Supply)**: Bị mitigation khi `high >= bottom` (giá quay lại chạm vùng OB từ dưới lên)

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

#### Seed Mode: Session Seed

- Dùng bar đầu tiên của phiên giao dịch làm cấu trúc tham chiếu
- `trend = 0` (chưa xác định xu hướng), chờ breakout đầu tiên
- Tự động reset vào đầu mỗi phiên mới
- **Phù hợp**: Khung thời gian phút (1m, 5m, 15m, 30m, 1H)

### Nhóm "BoS" (Break of Structure)

| Tham Số | Loại | Mặc Định | Mô Tả |
|---|---|---|---|
| **Hiển Thị** | `bool` | `true` | Bật/tắt đường BoS và label |
| **Tiêu Đề Label** | `string` | `"BoS"` | Text hiển thị trên label BoS |
| **Kiểu Đường** | `string` | `"Solid"` | `Solid` / `Dashed` / `Dotted` |
| **Màu Đường BoS Tăng** | `color` | `blue` | Màu BoS trong xu hướng tăng |
| **Màu Đường BoS Giảm** | `color` | `red` | Màu BoS trong xu hướng giảm |

### Nhóm "CHoCH" (Change of Character)

| Tham Số | Loại | Mặc Định | Mô Tả |
|---|---|---|---|
| **Hiển Thị** | `bool` | `true` | Bật/tắt đường CHoCH và label |
| **Tiêu Đề Label** | `string` | `"CHoCH"` | Text hiển thị trên label CHoCH |
| **Kiểu Đường** | `string` | `"Dashed"` | `Solid` / `Dashed` / `Dotted` |
| **Màu Đường CHoCH** | `color` | `orange` | Màu đường và label CHoCH |

### Nhóm "Label Cấu Trúc"

| Tham Số | Loại | Mặc Định | Mô Tả |
|---|---|---|---|
| **Hiển Thị** | `bool` | `true` | Bật/tắt label HH/HL/LL/LH |
| **Màu Label Bull (HH/HL)** | `color` | `blue` | Màu cho HH và HL |
| **Màu Label Bear (LL/LH)** | `color` | `red` | Màu cho LL và LH |

### Nhóm "Dashboard"

| Tham Số | Loại | Mặc Định | Mô Tả |
|---|---|---|---|
| **Hiển Thị** | `bool` | `true` | Bật/tắt bảng thống kê SMC |
| **Vị Trí** | `string` | `"Top Right"` | Góc đặt bảng |

### Nhóm "FVG" (Fair Value Gaps)

| Tham Số | Loại | Mặc Định | Mô Tả |
|---|---|---|---|
| **Hiển Thị** | `bool` | `true` | Bật/tắt FVG |
| **Màu FVG Tăng** | `color` | `#2157f3` | Màu Bullish FVG |
| **Màu FVG Giảm** | `color` | `#ff1100` | Màu Bearish FVG |
| **Kéo Dài FVG** | `int` | `0` | Số bar kéo dài box FVG về phải |

### Nhóm "OG" (Opening Gaps)

| Tham Số | Loại | Mặc Định | Mô Tả |
|---|---|---|---|
| **Hiển Thị** | `bool` | `true` | Bật/tắt OG |
| **Màu OG Tăng** | `color` | `#2157f3` | Màu Bullish OG |
| **Màu OG Giảm** | `color` | `#ff1100` | Màu Bearish OG |
| **Kéo Dài OG** | `int` | `0` | Số bar kéo dài box OG về phải |

### Nhóm "VI" (Volume Imbalance)

| Tham Số | Loại | Mặc Định | Mô Tả |
|---|---|---|---|
| **Hiển Thị** | `bool` | `true` | Bật/tắt VI |
| **Màu VI Tăng** | `color` | `#2157f3` | Màu Bullish VI |
| **Màu VI Giảm** | `color` | `#ff1100` | Màu Bearish VI |
| **Kéo Dài VI** | `int` | `0` | Số bar kéo dài box VI về phải |

### Nhóm "OB" (Order Blocks)

| Tham Số | Loại | Mặc Định | Mô Tả |
|---|---|---|---|
| **Hiển Thị OB** | `bool` | `true` | Bật/tắt OB |
| **Số OB Active Tối Đa** | `int` | `30` | Giới hạn số OB active hiển thị (0=không giới hạn) |
| **Bộ Lọc OB Đã Mitigated** | `string` | `"All"` | `All` / `Active` / `Mitigated` |
| **Màu OB Tăng (Demand)** | `color` | `#089981` | Màu Bullish OB |
| **Màu OB Giảm (Supply)** | `color` | `#f23645` | Màu Bearish OB |
| **Độ Trong Suốt OB Active** | `int` | `70` | 0–100, càng cao càng trong suốt |

### Nhóm "Bộ Lọc Imbalance"

| Tham Số | Loại | Mặc Định | Mô Tả |
|---|---|---|---|
| **Lọc Theo Độ Rộng** | `bool` | `false` | Bật lọc kích thước tối thiểu |
| **Độ Rộng Tối Thiểu** | `float` | `0` | Ngưỡng lọc |
| **Đơn Vị** | `string` | `"Points"` | `Points` / `%` / `ATR` |

### Nhóm "Dashboard Imbalance"

| Tham Số | Loại | Mặc Định | Mô Tả |
|---|---|---|---|
| **Hiển Thị Dashboard** | `bool` | `false` | Bật/tắt bảng thống kê imbalance |
| **Vị Trí** | `string` | `"Bottom Right"` | Góc đặt bảng |
| **Kích Thước Chữ** | `string` | `"Tiny"` | `Tiny` / `Small` / `Normal` |

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
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              ORDER BLOCK (OB) STATE                  │
│  ob_list: array<OrderBlock> — danh sách tất cả OB   │
│  ob_boxes: array<box> — pool box cho OB active       │
│  ob_bull_count / ob_bear_count — tổng OB mỗi loại    │
│  ob_bull_mitigated / ob_bear_mitigated — số đã lấp   │
└─────────────────────────────────────────────────────┘
```

### UDT `OrderBlock`

```pinescript
type OrderBlock
    int    bar_origin       // bar index của candle gốc
    float  top              // giá high của candle origin
    float  bottom           // giá low của candle origin
    bool   is_bullish       // true = Demand OB, false = Supply OB
    string source           // "FVG" | "OG" | "VI"
    bool   is_mitigated     // đã bị mitigation chưa
    int    bar_mitigation   // bar index lúc mitigation
```

---

## Luồng Hoạt Động

### Bước 1: Seeding (Khởi Tạo Cấu Trúc)

Script chạy một lần duy nhất (hoặc mỗi phiên nếu dùng Session Seed) để xác lập cấu trúc ban đầu:

**Pivot Seed**:
1. Dùng `ta.pivothigh()` và `ta.pivotlow()` với `pivotLength` để tìm pivot
2. Khi cả Pivot High và Pivot Low đều đã xuất hiện, so sánh `bar_index`
3. Gán giá trị cho các biến `hh/hl/ll/lh` tương ứng

**Session Seed**:
1. Lấy bar đầu tiên của phiên: gán tất cả `hh/hl/ll/lh = bar_index`
2. `trend = 0`, chờ breakout để xác định trend

### Bước 2: State Machine (Máy Trạng Thái)

Sau khi seeded, mỗi bar mới đều được đánh giá qua máy trạng thái để săn HH, HL, LL, LH và phát hiện BoS/CHoCH. Xem sơ đồ chi tiết ở [phần Kiến Trúc Hệ Thống](#kiến-trúc-hệ-thống).

### Bước 3: Imbalance Detection

Mỗi bar, script kiểm tra 3 loại imbalance:

1. **FVG** (Fair Value Gaps): Mô hình 3 nến — `low > high[2]` (bullish) hoặc `high < low[2]` (bearish), không trùng với OG
2. **OG** (Opening Gaps): `low > high[1]` (bullish) hoặc `high < low[1]` (bearish)
3. **VI** (Volume Imbalance): Chồng lấp giữa 2 nến nhưng quan hệ open/close bất thường

Nếu bật bộ lọc độ rộng, imbalance chỉ được ghi nhận khi gap vượt ngưỡng (theo Points, %, hoặc ATR).

### Bước 4: Order Block Creation

Khi một imbalance (FVG/OG/VI) được phát hiện, OB được tạo từ **nến origin** (nến đầu tiên trước gap):

| Imbalance | Origin Bar |
|---|---|
| Bullish/Bearish FVG | `bar_index - 2` |
| Bullish/Bearish OG | `bar_index - 1` |
| Bullish/Bearish VI | `bar_index - 1` |

OB zone = `high[origin]` → `low[origin]`. Box được vẽ với border dashed và kéo dài đến bar hiện tại.

Cơ chế FIFO: nếu số OB vượt `max_ob_active`, OB cũ nhất bị xóa (cả khỏi chart và array).

### Bước 5: Mitigation Check

Mỗi bar, tất cả OB chưa mitigated được kiểm tra:
- **Bullish OB**: `low <= ob.top` → mitigated
- **Bearish OB**: `high >= ob.bottom` → mitigated

Khi mitigated: box đóng lại tại nến mitigation, border chuyển sang solid, màu đậm hơn.

### Bước 6: Bộ Lọc Hiển Thị OB

Dựa vào `ob_filter_mode`:
- **All**: Hiển thị cả OB active (dashed, mờ) và OB mitigated (solid, đậm)
- **Active**: Chỉ hiển thị OB chưa bị mitigation
- **Mitigated**: Chỉ hiển thị OB đã bị mitigation

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

| Ký Hiệu | Ý Nghĩa |
|---|---|
| `───` Solid line | BoS — phá vỡ cùng chiều xu hướng |
| `- - -` Dashed line | CHoCH — phá vỡ ngược chiều |
| `██` Label dưới bar | HH hoặc LH (đỉnh) |
| `▲` Label trên bar | HL (đáy trong uptrend) |
| `▼` Label trên bar | LL (đáy trong downtrend) |
| ▓▓ Box tô màu | FVG hoặc OG zone |
| ▯ Box viền dotted | VI zone |
| ▣ Box dashed | OB active |
| ▣ Box solid | OB mitigated |

### Ví Dụ Kịch Bản Giao Dịch

#### Kịch bản 1: Mua theo Uptrend + OB Demand + Discount

1. Dashboard hiển thị BULLISH → uptrend
2. OB Demand (bullish) xuất hiện → vùng cầu tiềm năng
3. Dashboard hiển thị vị trí Discount (<50%) → giá đang rẻ
4. → **Cân nhắc BUY** khi giá retest OB Demand ở vùng Discount

#### Kịch bản 2: Bán khi CHoCH + OB Supply + Premium

1. Đang trong uptrend, HL bị phá vỡ → xuất hiện CHoCH
2. Dashboard chuyển sang BEARISH
3. OB Supply (bearish) xuất hiện ở vùng Premium
4. → **Cân nhắc SELL** khi giá retest OB Supply

---

## Imbalance Detection (FVG / OG / VI)

### Fair Value Gaps (FVG)

**Bullish FVG**: `low[0] > high[2]` và `close[1] > high[2]`
```
Nến 1  Nến 2  Nến 3
  ┌─┐   ┌─┐
  │ │   │ │   ┌─┐
  │ │   │ │   │ │  ← gap giữa high[2] và low[0]
  │ │   │ │   │ │
  └─┘   │ │   │ │
        │ │   └─┘
        └─┘
  ← FVG zone (vùng giá chưa được giao dịch)
```
Vẽ: Box tô màu + đường midline, kéo dài `fvg_extend` bars.

**Bearish FVG**: `high[0] < low[2]` và `close[1] < low[2]`
```
Nến 1  Nến 2  Nến 3
        ┌─┐   ┌─┐
  ┌─┐   │ │   │ │
  │ │   │ │   │ │
  │ │   │ │   │ │  ← gap giữa low[2] và high[0]
  └─┘   │ │   └─┘
        └─┘
  ← FVG zone
```

### Opening Gaps (OG)

**Bullish OG**: `low[0] > high[1]` — giá mở cửa cao hơn toàn bộ nến trước
**Bearish OG**: `high[0] < low[1]` — giá mở cửa thấp hơn toàn bộ nến trước

Vẽ: Box tô màu với text "OG", kéo dài `og_extend` bars.

### Volume Imbalance (VI)

XYảy ra khi 2 nến chồng lấp nhưng có sự bất thường trong quan hệ open/close:

**Bullish VI**: `open > close[1]` và `high[1] > low` và `close > close[1]` và `open > open[1]` và `high[1] < min(close, open)`

**Bearish VI**: `open < close[1]` và `low[1] < high` và `close < close[1]` và `open < open[1]` và `low[1] > max(close, open)`

Vẽ: Box viền dotted (không tô nền), kéo dài `vi_extend` bars.

---

## Order Blocks (OB)

### Khái Niệm

OB là vùng giá của **nến origin** — nến đầu tiên trong chuỗi tạo ra imbalance. Đây là nơi các tổ chức lớn (smart money) đặt lệnh, tạo ra vùng cung/cầu mạnh.

### Vòng Đời OB

```
Imbalance xuất hiện
       │
       ▼
┌─────────────┐
│   ACTIVE    │  ← Box dashed, kéo dài đến bar hiện tại
└─────────────┘
       │  Khi wick chạm vùng OB
       ▼
┌─────────────┐
│  MITIGATED  │  ← Box solid, đóng tại nến mitigation
└─────────────┘
```

### OB Creation

| Loại Imbalance | Origin Candle | OB Zone |
|---|---|---|
| Bullish FVG | `bar_index - 2` | `high[2] → low[2]` |
| Bearish FVG | `bar_index - 2` | `high[2] → low[2]` |
| Bullish OG | `bar_index - 1` | `high[1] → low[1]` |
| Bearish OG | `bar_index - 1` | `high[1] → low[1]` |
| Bullish VI | `bar_index - 1` | `high[1] → low[1]` |
| Bearish VI | `bar_index - 1` | `high[1] → low[1]` |

### Mitigation Rules

| OB Type | Điều Kiện Mitigation |
|---|---|
| **Bullish (Demand)** | `low <= ob.top` |
| **Bearish (Supply)** | `high >= ob.bottom` |

### Bộ Lọc Hiển Thị

| Chế Độ | Active OB | Mitigated OB |
|---|---|---|
| **All** | Hiện (dashed, mờ) | Hiện (solid, đậm) |
| **Active** | Hiện | Ẩn |
| **Mitigated** | Ẩn | Hiện |

### Quota Control

Indicator có giới hạn 500 boxes. Để tránh vượt quota:
- `max_ob_active` (mặc định 30) giới hạn số OB active hiển thị
- Khi vượt, OB cũ nhất bị xóa tự động (FIFO)
- Đặt `max_ob_active = 0` để tắt giới hạn (không khuyến nghị)

---

## Bảng Thống Kê (Dashboard)

### Dashboard SMC

Hiển thị ở góc trên bên phải:

```
┌──────────────────────────┐
│ THÔNG SỐ SMC  │ BULLISH  │
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

### Cách Đọc Vị Trí Premium/Discount

| % | Ý Nghĩa | Hành Động |
|---|---|---|
| **0–25%** | Discount sâu (giá rẻ) | Cân nhắc BUY (trong uptrend) |
| **25–50%** | Discount (giá hợp lý) | Có thể BUY |
| **50%** | Midpoint (cân bằng) | Trung lập |
| **50–75%** | Premium (giá đắt) | Có thể SELL (trong downtrend) |
| **75–100%** | Premium sâu (giá rất đắt) | Cân nhắc SELL hoặc chốt lời BUY |

### Dashboard Imbalance/OB

Hiển thị ở góc dưới bên phải (tắt mặc định, bật trong Settings):

```
┌──────────┬──────────┬──────────┬──────────┬──────────┐
│          │  〓 FVG  │  ◼ OG   │  ⬚ VI   │  ▣ OB   │
├──────────┼──────────┼──────────┼──────────┼──────────┤
│ Bullish  │ Tần Suất │    15    │    3     │    8     │   26    │
│          │ Đã Lấp   │   60%    │   33%    │   50%    │   42%   │
├──────────┼──────────┼──────────┼──────────┼──────────┤
│ Bearish  │ Tần Suất │    12    │    2     │    7     │   21    │
│          │ Đã Lấp   │   50%    │   50%    │   43%    │   38%   │
└──────────┴──────────┴──────────┴──────────┴──────────┘
```

| Cột | Ý Nghĩa |
|---|---|
| **〓 FVG** | Fair Value Gaps — tần suất và % đã lấp bởi giá |
| **◼ OG** | Opening Gaps |
| **⬚ VI** | Volume Imbalances |
| **▣ OB** | Order Blocks — thống kê active + mitigated |

Bảng sử dụng nền tối `#1e222d` (không transparency) để đảm bảo độ tương phản cao trên mọi nền chart (kể cả nền trắng).

### Alert Conditions

Indicator cung cấp 10 alert conditions có thể dùng để tạo cảnh báo trên TradingView:

| Alert | Kích Hoạt Khi |
|---|---|
| **Bullish FVG** | Xuất hiện Fair Value Gap tăng |
| **Bearish FVG** | Xuất hiện Fair Value Gap giảm |
| **Bullish OG** | Xuất hiện Opening Gap tăng |
| **Bearish OG** | Xuất hiện Opening Gap giảm |
| **Bullish VI** | Xuất hiện Volume Imbalance tăng |
| **Bearish VI** | Xuất hiện Volume Imbalance giảm |

---

## Hướng Dẫn Sử Dụng

### Bước 1: Chọn Khung Thời Gian

| Khung Thời Gian | Seed Mode Khuyên Dùng | Ghi Chú |
|---|---|---|
| **1m, 5m, 15m** | `Session Seed` | Phân tích intraday |
| **30m, 1H** | `Pivot Seed` hoặc `Session Seed` | Linh hoạt |
| **4H, Daily, Weekly** | `Pivot Seed` | Swing dài hạn |

### Bước 2: Điều Chỉnh Pivot Length

- `pivotLength = 3–5`: Nhạy, phát hiện nhiều cấu trúc nhỏ (scalping)
- `pivotLength = 7–10`: Trung bình (swing trade)
- `pivotLength = 15–30`: Chậm, chỉ bắt cấu trúc lớn (position trade)

### Bước 3: Đọc Tín Hiệu

1. **Xác định xu hướng** từ Dashboard và chuỗi HH/HL hoặc LL/LH
2. **Quan sát OB** mới hình thành — đây là vùng giá tiềm năng cho entry
3. **Kiểm tra vị trí Premium/Discount**:
   - Uptrend + OB Demand ở Discount = tín hiệu BUY mạnh
   - Downtrend + OB Supply ở Premium = tín hiệu SELL mạnh
4. **Theo dõi OB mitigation**: OB bị mitigated → vùng cung/cầu đã được hấp thụ

### Bước 4: Quản Lý Rủi Ro

- **Stop Loss**: Dưới HL gần nhất (uptrend) / Trên LH gần nhất (downtrend)
- **Take Profit**: Vùng Premium (uptrend) hoặc Discount (downtrend)
- **Không giao dịch**: Khi OB đã bị mitigated (vùng giá không còn hiệu lực)

---

## Hạn Chế & Lưu Ý

### Hạn Chế Kỹ Thuật

| Hạn Chế | Mô Tả | Cách Xử Lý |
|---|---|---|
| **Repainting** | `ta.pivothigh()`/`ta.pivotlow()` có độ trễ `pivotLength` bar | Dùng `barstate.isconfirmed` |
| **Giới hạn 500 boxes** | FVG xuất hiện thường xuyên → dễ hết quota | Dùng `max_ob_active` và tắt bớt loại imbalance khi cần |
| **Giới hạn 500 lines** | FVG midline + BoS/CHoCH cùng chia sẻ quota | Tắt FVG khi không cần, hoặc đặt `fvg_extend=0` |
| **Giới hạn 500 labels** | HH/HL + BoS/CHoCH labels | Thường không phải vấn đề |
| **Không có historical labels** | Chỉ thấy cấu trúc từ lúc thêm indicator | Hạn chế cố hữu của Pine Script |

### Cạm Bẫy Thường Gặp

1. **CHoCH ≠ đảo chiều ngay**: CHoCH là cảnh báo sớm, thị trường có thể sideway trước khi đảo chiều.

2. **Không giao dịch chỉ dựa trên 1 tín hiệu**: Market Structure nên kết hợp với OB, volume, RSI divergence.

3. **Sideway market**: BoS và CHoCH xuất hiện liên tục → tín hiệu nhiễu.

4. **Khung thời gian thấp**: 1m-5m có nhiều nhiễu. Xác định trend trên H1/H4, tìm entry trên M5/M15.

5. **OB đã mitigated**: Vùng OB đã bị giá xuyên qua không còn hiệu lực làm hỗ trợ/kháng cự.

---

## Multi-Timeframe (MTF) Trend — Chỉ Có Trong Bản MTF

Bản **SMC Market Structure + MTF** (`smc_market_structure_mtf.pine`) bổ sung bảng hiển thị xu hướng của 3 khung thời gian khác nhau.

### Cách Hoạt Động

Bảng MTF hiển thị trend (BULL/BEAR/WAIT) kèm Swing High/Low cho từng khung thời gian. Logic dùng **trend score** từ chuỗi 3 pivot:

```
Với mỗi pivot: HH → +1, LH → -1, HL → +1, LL → -1
Tổng score:
  >= +2  →  BULL
  <= -2  →  BEAR
  -1..+1 →  Giữ trend cũ
```

### So Sánh 2 Phiên Bản

| | Base (v1.4) | MTF (v1.4) |
|---|---|---|
| **File** | `indicators/smc_market_structure.pine` | `indicators/smc_market_structure_mtf.pine` |
| **Input groups** | 11 | 12 (+ Multi-Timeframe) |
| **request.security()** | 0 | 0–3 |
| **Phù hợp** | Máy yếu, chart đơn giản | Phân tích đa khung thời gian |

---

## Kế Hoạch Phát Triển

### v1.4 (Đã Hoàn Thành — 2026-06-21)

- [x] FVG (Fair Value Gap) detection + visualization
- [x] OG (Opening Gap) detection + visualization
- [x] VI (Volume Imbalance) detection + visualization
- [x] Order Block (OB) detection từ FVG/OG/VI
- [x] OB mitigation tracking + visualization
- [x] Bộ lọc hiển thị OB (All / Active / Mitigated)
- [x] Dashboard imbalance thống kê FVG + OG + VI + OB
- [x] Alert conditions cho FVG, OG, VI
- [x] Tối ưu giao diện bảng cho nền chart sáng
- [x] Cơ chế giới hạn drawing objects (max_ob_active)

### v1.5 (Dự Kiến)

- [ ] Chuyển đổi sang Strategy để backtest tín hiệu OB
- [ ] Liquidity sweep detection
- [ ] Tự động vẽ trendline nối các điểm cấu trúc
- [ ] Inducement (IDM) — cấu trúc phụ để tinh chỉnh entry
- [ ] Tín hiệu Buy/Sell dựa trên OB + Market Structure + Premium/Discount

### Ý Tưởng Xa Hơn

- [ ] ICT Killzone highlight (London Open, New York Open)
- [ ] Tích hợp Volume Profile
- [ ] Export thành Library để tái sử dụng

---

## Tham Khảo

- [Pine Script v6 Documentation](https://www.tradingview.com/pine-script-docs/en/v6/)
- Smart Money Concepts (SMC) — phương pháp giao dịch dựa trên hành vi của tổ chức lớn
- Imbalance Detector logic adapted from LuxAlgo (CC BY-NC-SA 4.0)
