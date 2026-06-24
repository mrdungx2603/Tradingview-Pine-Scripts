# Spec: Order Blocks (OB) Cho SMC Market Structure Indicator

**Ngày:** 2026-06-21
**File:** `indicators/smc_market_structure.pine` (v1.3 → v1.4)
**Phiên bản spec:** 1.0

---

## 1. Mục Tiêu

Thêm layer Order Block (OB) vào indicator SMC hiện có, cho phép:
- Xác định OB từ candle origin của FVG/OG/VI
- Theo dõi vòng đời OB: active → mitigated
- Visualize OB active (kéo dài) và OB mitigated (đóng tại nến mitigation)
- Dashboard thống kê active/mitigated
- Bộ lọc hiển thị: All / Active / Mitigated

---

## 2. UDT `OrderBlock`

```pinescript
type OrderBlock
    int    bar_origin       // bar index của candle gốc
    float  top              // giá high của candle origin
    float  bottom           // giá low của candle origin
    bool   is_bullish       // true = Demand OB, false = Supply OB
    string source           // "FVG" | "OG" | "VI"
    bool   is_mitigated     // đã bị mitigation chưa
    int    bar_mitigation   // bar index lúc mitigation (na nếu chưa)
```

## 3. Array & Pool Management

```pinescript
var array<OrderBlock> ob_list    = array.new_OrderBlock(0)  // tất cả OB
var array<box>        ob_boxes   = array.new_box(0)         // pool box active
var array<box>        ob_m_boxes = array.new_box(0)         // pool box mitigated
var array<line>       ob_m_lines = array.new_line(0)        // pool line fill
```

Giới hạn `max_ob_active` kiểm soát số box active tối đa. Khi vượt, xóa OB cũ nhất (cả khỏi chart và array).

## 4. OB Creation — Khi Nào Tạo

OB được tạo cùng lúc với imbalance gốc:

| Loại | Trigger | Origin Bar |
|---|---|---|
| Bullish FVG | `bull_fvg == true` | `bar_index - 2` |
| Bearish FVG | `bear_fvg == true` | `bar_index - 2` |
| Bullish OG | `bull_og == true` | `bar_index - 1` |
| Bearish OG | `bear_og == true` | `bar_index - 1` |
| Bullish VI | `bull_vi == true` | `bar_index - 1` |
| Bearish VI | `bear_vi == true` | `bar_index - 1` |

OB zone = `high[origin]` → `low[origin]` của candle gốc.

## 5. Mitigation Rules

Mỗi bar, duyệt `ob_list`. OB chưa mitigated sẽ được kiểm tra:

| OB Type | Mitigation khi |
|---|---|
| **Bullish (Demand)** | `low <= ob.top` |
| **Bearish (Supply)** | `high >= ob.bottom` |

Khi mitigation: gán `is_mitigated = true`, `bar_mitigation = bar_index`.

## 6. Visualization

### Active OB
- **Box:** từ `bar_origin` → `bar_index + 1`, border style dashed, bgcolor theo màu với transparency từ input
- **Màu:** `ob_bull_color` (default `#089981`), `ob_bear_color` (default `#f23645`)

### Mitigated OB
- **Box:** từ `bar_origin` → `bar_mitigation`, border style solid, bgcolor đậm hơn active
- **Line fill ngang:** đường ngang nối từ origin đến mitigation bar, cùng màu
- **Hoặc:** Ẩn hoàn toàn nếu `ob_filter_mode = "Active"`

### Bộ lọc `ob_filter_mode`

| Chế độ | Active OB | Mitigated OB |
|---|---|---|
| **All** | Hiện | Hiện (đậm hơn) |
| **Active** | Hiện | Ẩn |
| **Mitigated** | Ẩn | Hiện |

## 7. Inputs Mới (Group: `OB`)

```pinescript
show_ob            = input.bool(true, "Hiển Thị OB")
max_ob_active      = input.int(30, "Số OB Active Tối Đa", minval=0, maxval=100)
ob_filter_mode     = input.string("All", "Bộ Lọc OB Đã Mitigated", options=["All", "Active", "Mitigated"])
ob_bull_color      = input.color(#089981, "Màu OB Tăng (Demand)")
ob_bear_color      = input.color(#f23645, "Màu OB Giảm (Supply)")
ob_transparency    = input.int(70, "Độ Trong Suốt OB Active", minval=0, maxval=100)
```

## 8. Dashboard Mở Rộng

Bảng `imb_table` từ `columns=5` → `columns=6` (thêm cột OB ở vị trí 5).

Cột OB hiển thị:
- **Bullish:** Tần suất (tổng OB bullish trong `ob_list`), Đã lấp (% mitigated)
- **Bearish:** Tần suất (tổng OB bearish), Đã lấp (%)

## 9. Tối Ưu Giao Diện (Nền Sáng)

Cập nhật màu cho cả 2 bảng `smc_table` và `imb_table`:

| Thành phần | Màu |
|---|---|
| Nền bảng | `#1e222d` (đục, không transparency) |
| Viền / Khung | `#5b5f6b` |
| Text thường | `color.white` |
| Text Bullish | `#00e676` |
| Text Bearish | `#ff5252` |
| Header | `#3d4252` |

## 10. Vị Trí Trong File

Thêm code OB sau phần `// ║   IMBALANCE DETECTION (FVG / OG / VI)   ║` (dòng ~608 hiện tại), trước phần `// ║     BẢNG THỐNG KÊ CẤU TRÚC SMC          ║`.

Trình tự block mới:
1. Imbalance Detection (FVG/OG/VI) — giữ nguyên
2. **OB Creation & Mitigation Loop** — mới
3. Bảng thống kê SMC — giữ nguyên
4. Bảng Imbalance — mở rộng thêm cột OB
5. Alerts — giữ nguyên

## 11. Không Thay Đổi

- FVG/OG/VI inputs, detection logic, visualization — giữ nguyên
- State machine (BoS/CHoCH/HH/HL) — giữ nguyên
- `imbalance_detection()`, `bull_filled()`, `bear_filled()` — giữ nguyên
- Bộ lọc imbalance (`imb_usewidth`, imb_gapwidth) — dùng chung
