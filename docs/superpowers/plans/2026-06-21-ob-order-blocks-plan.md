# Order Blocks (OB) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm layer Order Block vào SMC Market Structure indicator — phát hiện OB từ candle origin của FVG/OG/VI, theo dõi mitigation, visualize active/mitigated, dashboard thống kê.

**Architecture:** Mở rộng file `smc_market_structure.pine` hiện có (805 dòng). Thêm UDT `OrderBlock`, array quản lý vòng đời, pool box cho active/mitigated, mở rộng dashboard `imb_table` thêm cột OB. Dùng chung bộ lọc imbalance hiện có. Cập nhật giao diện 2 bảng cho nền sáng.

**Tech Stack:** Pine Script v6, single-file indicator (`overlay=true`)

## Global Constraints

- `//@version=6` — Pine Script v6
- File: `indicators/smc_market_structure.pine`
- Mọi biến có kiểu phải khai báo + khởi tạo ở scope cha, trước `if`/`for` con
- `true`/`false` cho bool, không dùng `1`/`0`
- UDT field là mutable, nhưng khai báo biến UDT phải ở scope `for`, trước `if`
- Dùng `var` cho biến toàn cục, `:=` để gán lại
- `max_boxes_count=500` đã có sẵn trong `indicator()`
- Comment tiếng Việt, thuật ngữ kỹ thuật giữ tiếng Anh

---

### Task 1: Thêm UDT OrderBlock + Biến Trạng Thái OB

**Files:**
- Modify: `indicators/smc_market_structure.pine` — chèn sau dòng 140 (sau `is_new_session`)

**Interfaces:**
- Produces: `type OrderBlock`, `array<OrderBlock> ob_list`, `array<box> ob_boxes`, `int ob_bull_count`, `int ob_bear_count`, `int ob_bull_mitigated`, `int ob_bear_mitigated`

- [ ] **Step 1: Chèn UDT và biến trạng thái**

Sau dòng 140 `is_new_session = timeframe.isminutes and session.isfirstbar_regular`, thêm:

```pinescript

// ╔══════════════════════════════════════════╗
// ║        ORDER BLOCK (OB) STATE            ║
// ╚══════════════════════════════════════════╝

// ─── UDT OrderBlock ───
type OrderBlock
    int    bar_origin       // bar index của candle gốc (origin)
    float  top              // giá high của candle origin
    float  bottom           // giá low của candle origin
    bool   is_bullish       // true = Demand OB (Tăng), false = Supply OB (Giảm)
    string source           // "FVG" | "OG" | "VI"
    bool   is_mitigated     // đã bị mitigation chưa
    int    bar_mitigation   // bar index lúc mitigation (na nếu chưa)

// ─── OB Pool & Counters ───
var array<OrderBlock> ob_list            = array.new_OrderBlock(0)
var array<box>        ob_boxes           = array.new_box(0)
var int               ob_bull_count       = 0
var int               ob_bear_count       = 0
var int               ob_bull_mitigated   = 0
var int               ob_bear_mitigated   = 0
```

- [ ] **Step 2: Verify — copy to TradingView Pine Editor, compile (Ctrl+Enter)**

Expected: Không lỗi biên dịch.

---

### Task 2: Thêm Input Group OB

**Files:**
- Modify: `indicators/smc_market_structure.pine` — chèn sau dòng 93 (sau `imb_text_size` input)

**Interfaces:**
- Consumes: (none — inputs are self-contained)
- Produces: `show_ob`, `max_ob_active`, `ob_filter_mode`, `ob_bull_color`, `ob_bear_color`, `ob_transparency`

- [ ] **Step 1: Chèn input group OB**

Sau dòng 93 (kết thúc `imb_text_size` input), thêm:

```pinescript

// ─── Order Blocks (OB) ───
show_ob          = input.bool(true, "Hiển Thị OB",                  group="OB")
max_ob_active    = input.int(30, "Số OB Active Tối Đa", minval=0, maxval=100, group="OB")
ob_filter_mode   = input.string("All", "Bộ Lọc OB Đã Mitigated",
    options=["All", "Active", "Mitigated"],                          group="OB")
ob_bull_color    = input.color(#089981, "Màu OB Tăng (Demand)",     group="OB")
ob_bear_color    = input.color(#f23645, "Màu OB Giảm (Supply)",     group="OB")
ob_transparency  = input.int(70, "Độ Trong Suốt OB Active", minval=0, maxval=100, group="OB")
```

- [ ] **Step 2: Verify — compile**

Expected: Không lỗi. Input group "OB" xuất hiện trong Settings.

---

### Task 3: Thêm OB Creation Từ FVG/OG/VI

**Files:**
- Modify: `indicators/smc_market_structure.pine` — trong section Imbalance Detection, thêm OB creation sau mỗi block vẽ FVG/OG/VI

**Interfaces:**
- Consumes: `bull_vi`, `bear_vi`, `bull_og`, `bear_og`, `bull_fvg`, `bear_fvg`, `show_ob`, `max_ob_active`, `ob_list`, `ob_boxes`, `ob_bull_count`, `ob_bear_count`
- Produces: OB instances pushed vào `ob_list`, boxes vào `ob_boxes`, counters tăng

- [ ] **Step 1: Thêm OB Creation cho VI (Bullish + Bearish)**

Sau dòng hiện tại vẽ `box.new(...)` cho bear_vi (khoảng dòng 547), thêm:

```pinescript

// ─── OB từ VI ───
if show_ob and (bull_vi or bear_vi)
    // FIFO: xóa OB cũ nhất nếu vượt giới hạn
    if max_ob_active > 0 and array.size(ob_list) >= max_ob_active
        OrderBlock oldest = array.shift(ob_list)
        if array.size(ob_boxes) > 0
            box dead = array.shift(ob_boxes)
            box.delete(dead)

    if bull_vi
        int    origin_bar = bar_index - 1
        float  origin_high = high[1]
        float  origin_low  = low[1]
        OrderBlock new_ob = OrderBlock.new(origin_bar, origin_high, origin_low, true, "VI", false, na)
        array.push(ob_list, new_ob)
        ob_bull_count += 1

        box b = box.new(origin_bar, origin_high, bar_index + 1, origin_low,
            border_color=ob_bull_color, bgcolor=color.new(ob_bull_color, ob_transparency),
            border_style=line.style_dashed)
        array.push(ob_boxes, b)

    if bear_vi
        int    origin_bar = bar_index - 1
        float  origin_high = high[1]
        float  origin_low  = low[1]
        OrderBlock new_ob = OrderBlock.new(origin_bar, origin_high, origin_low, false, "VI", false, na)
        array.push(ob_list, new_ob)
        ob_bear_count += 1

        box b = box.new(origin_bar, origin_high, bar_index + 1, origin_low,
            border_color=ob_bear_color, bgcolor=color.new(ob_bear_color, ob_transparency),
            border_style=line.style_dashed)
        array.push(ob_boxes, b)
```

- [ ] **Step 2: Thêm OB Creation cho OG (Bullish + Bearish)**

Sau block vẽ `box.new(...)` cho bear_og (khoảng dòng 574), thêm:

```pinescript

// ─── OB từ OG ───
if show_ob and (bull_og or bear_og)
    if max_ob_active > 0 and array.size(ob_list) >= max_ob_active
        OrderBlock oldest = array.shift(ob_list)
        if array.size(ob_boxes) > 0
            box dead = array.shift(ob_boxes)
            box.delete(dead)

    if bull_og
        int    origin_bar = bar_index - 1
        float  origin_high = high[1]
        float  origin_low  = low[1]
        OrderBlock new_ob = OrderBlock.new(origin_bar, origin_high, origin_low, true, "OG", false, na)
        array.push(ob_list, new_ob)
        ob_bull_count += 1

        box b = box.new(origin_bar, origin_high, bar_index + 1, origin_low,
            border_color=ob_bull_color, bgcolor=color.new(ob_bull_color, ob_transparency),
            border_style=line.style_dashed)
        array.push(ob_boxes, b)

    if bear_og
        int    origin_bar = bar_index - 1
        float  origin_high = high[1]
        float  origin_low  = low[1]
        OrderBlock new_ob = OrderBlock.new(origin_bar, origin_high, origin_low, false, "OG", false, na)
        array.push(ob_list, new_ob)
        ob_bear_count += 1

        box b = box.new(origin_bar, origin_high, bar_index + 1, origin_low,
            border_color=ob_bear_color, bgcolor=color.new(ob_bear_color, ob_transparency),
            border_style=line.style_dashed)
        array.push(ob_boxes, b)
```

- [ ] **Step 3: Thêm OB Creation cho FVG (Bullish + Bearish)**

Sau block vẽ `line.new(...)` cho bear_fvg (khoảng dòng 605), thêm:

```pinescript

// ─── OB từ FVG ───
if show_ob and (bull_fvg or bear_fvg)
    if max_ob_active > 0 and array.size(ob_list) >= max_ob_active
        OrderBlock oldest = array.shift(ob_list)
        if array.size(ob_boxes) > 0
            box dead = array.shift(ob_boxes)
            box.delete(dead)

    if bull_fvg
        int    origin_bar = bar_index - 2
        float  origin_high = high[2]
        float  origin_low  = low[2]
        OrderBlock new_ob = OrderBlock.new(origin_bar, origin_high, origin_low, true, "FVG", false, na)
        array.push(ob_list, new_ob)
        ob_bull_count += 1

        box b = box.new(origin_bar, origin_high, bar_index + 1, origin_low,
            border_color=ob_bull_color, bgcolor=color.new(ob_bull_color, ob_transparency),
            border_style=line.style_dashed)
        array.push(ob_boxes, b)

    if bear_fvg
        int    origin_bar = bar_index - 2
        float  origin_high = high[2]
        float  origin_low  = low[2]
        OrderBlock new_ob = OrderBlock.new(origin_bar, origin_high, origin_low, false, "FVG", false, na)
        array.push(ob_list, new_ob)
        ob_bear_count += 1

        box b = box.new(origin_bar, origin_high, bar_index + 1, origin_low,
            border_color=ob_bear_color, bgcolor=color.new(ob_bear_color, ob_transparency),
            border_style=line.style_dashed)
        array.push(ob_boxes, b)
```

- [ ] **Step 4: Verify — compile**

Expected: Không lỗi. OB boxes xuất hiện khi có FVG/OG/VI.

---

### Task 4: Mitigation Loop — Kiểm Tra & Cập Nhật OB Mỗi Bar

**Files:**
- Modify: `indicators/smc_market_structure.pine` — thêm 1 block mới ngay sau phần OB creation (sau Task 3)

**Interfaces:**
- Consumes: `show_ob`, `ob_list`, `ob_boxes`, `ob_bull_mitigated`, `ob_bear_mitigated`, `ob_filter_mode`
- Produces: OB được đánh dấu `is_mitigated`, box style thay đổi, counters tăng

- [ ] **Step 1: Thêm mitigation loop**

Sau toàn bộ OB creation (sau block OB từ FVG của Task 3), thêm:

```pinescript

// ─── OB Mitigation Check ───
if show_ob
    int size = array.size(ob_list)
    if size > 0
        for i = size - 1 to 0
            OrderBlock ob     = array.get(ob_list, i)
            bool       is_bull = ob.is_bullish
            bool       is_mit  = ob.is_mitigated
            if not is_mit
                bool triggered = is_bull ? (low <= ob.top) : (high >= ob.bottom)
                if triggered
                    ob.is_mitigated   := true
                    ob.bar_mitigation := bar_index
                    array.set(ob_list, i, ob)
                    if is_bull
                        ob_bull_mitigated += 1
                    else
                        ob_bear_mitigated += 1

                    // Cập nhật box: đóng tại mitigation bar, đổi style
                    if i < array.size(ob_boxes)
                        box b = array.get(ob_boxes, i)
                        box.set_right(b, bar_index)
                        box.set_border_style(b, line.style_solid)
                        box.set_bgcolor(b, color.new(
                            is_bull ? ob_bull_color : ob_bear_color,
                            math.min(ob_transparency + 15, 100)))
```

- [ ] **Step 2: Thêm logic kéo dài box cho OB active mỗi bar**

Thêm tiếp sau mitigation check (vẫn trong `if show_ob`):

```pinescript

    // Kéo dài box active đến bar hiện tại
    if array.size(ob_boxes) > 0 and array.size(ob_list) > 0
        for i = 0 to math.min(array.size(ob_list), array.size(ob_boxes)) - 1
            OrderBlock ob_chk = array.get(ob_list, i)
            if not ob_chk.is_mitigated
                box b = array.get(ob_boxes, i)
                box.set_right(b, bar_index + 1)
```

- [ ] **Step 3: Verify — compile**

Expected: Không lỗi. Khi wick chạm OB zone, box OB chuyển sang solid và đóng tại nến mitigation.

---

### Task 5: Bộ Lọc Hiển Thị OB (All / Active / Mitigated)

**Files:**
- Modify: `indicators/smc_market_structure.pine` — thêm logic ẩn/hiện box trong cùng block mitigation

**Interfaces:**
- Consumes: `ob_filter_mode`, `ob_boxes`, `ob_list`
- Produces: Box visibility thay đổi theo filter

- [ ] **Step 1: Thêm bộ lọc hiển thị**

Sau phần kéo dài box trong Task 4 Step 2, thêm:

```pinescript

    // Bộ lọc hiển thị OB theo ob_filter_mode
    bool show_active    = ob_filter_mode == "All" or ob_filter_mode == "Active"
    bool show_mitigated = ob_filter_mode == "All" or ob_filter_mode == "Mitigated"

    if array.size(ob_boxes) > 0 and array.size(ob_list) > 0
        int box_count = math.min(array.size(ob_list), array.size(ob_boxes))
        for i = 0 to box_count - 1
            OrderBlock ob_f = array.get(ob_list, i)
            box        b    = array.get(ob_boxes, i)
            if ob_f.is_mitigated
                box.set_visible(b, show_mitigated)
            else
                box.set_visible(b, show_active)
```

- [ ] **Step 2: Verify — compile, đổi filter trong Settings**

Expected: Chọn "Active" → chỉ thấy OB chưa mitigated. Chọn "Mitigated" → chỉ thấy OB đã mitigated. "All" → thấy cả hai.

---

### Task 6: Mở Rộng Dashboard Imbalance — Thêm Cột OB

**Files:**
- Modify: `indicators/smc_market_structure.pine` — phần dashboard `imb_table`

**Interfaces:**
- Consumes: `imb_table`, `show_ob`, `ob_bull_count`, `ob_bull_mitigated`, `ob_bear_count`, `ob_bear_mitigated`, `set_imb_cells()`
- Produces: Cột OB thứ 5 trong bảng imbalance

- [ ] **Step 1: Sửa `columns` của `imb_table` từ 5 → 6**

Tìm dòng khởi tạo `imb_table` (khoảng dòng 718-727 hiện tại), sửa:

```pinescript
var table imb_table = table.new(
    get_imb_dashboard_pos(imb_dashboard_pos),
    columns=6,       // ← sửa từ 5 thành 6
    rows=7,
    bgcolor=#1e222d,
    border_color=#5b5f6b,
    border_width=1,
    frame_color=#5b5f6b,
    frame_width=1
)
```

- [ ] **Step 2: Thêm header cột OB trong `barstate.isfirst`**

Sau dòng `table.cell(imb_table, 4, 0, ...)` cho VI, thêm:

```pinescript

    if show_ob
        table.cell(imb_table, 5, 0, "▣ OB",
            text_color=color.white, text_size=size.small)
```

- [ ] **Step 3: Thêm data cells cho OB trong `barstate.islast`**

Sau block `if show_vi ... set_imb_cells(imb_table, 4, ...)`, thêm:

```pinescript

    if show_ob
        set_imb_cells(imb_table, 5,
            ob_bull_mitigated, ob_bull_count,
            ob_bear_mitigated, ob_bear_count,
            ob_bull_color, ob_bear_color, imb_text_size)
```

- [ ] **Step 4: Verify — compile, bật dashboard imbalance**

Expected: Cột "▣ OB" xuất hiện bên phải cột VI, hiển thị tần suất và % đã lấp.

---

### Task 7: Tối Ưu Giao Diện Bảng Cho Nền Sáng

**Files:**
- Modify: `indicators/smc_market_structure.pine` — sửa màu `smc_table` và `imb_table`

**Interfaces:**
- Consumes: `smc_table`, `imb_table`
- Produces: Cả 2 bảng có màu tương phản cao trên mọi nền

- [ ] **Step 1: Sửa `smc_table` màu nền và viền**

Tìm dòng khởi tạo `smc_table` (khoảng dòng 613-618), sửa:

```pinescript
var table smc_table = table.new(
    get_dashboard_pos(dashboard_pos),
    columns=2,
    rows=4,
    bgcolor=#1e222d,          // ← sửa từ color.new(color.black, 30)
    border_width=1,
    border_color=#5b5f6b      // ← sửa từ color.gray
)
```

Và sửa màu header:

```pinescript
    table.cell(smc_table, 0, 0, "THÔNG SỐ SMC",
        text_color=color.white, text_size=size.small, bgcolor=#3d4252)  // ← sửa từ color.gray
```

- [ ] **Step 2: Sửa `imb_table` màu text bullish/bearish**

Tìm các dòng `text_color=#089981` và `text_color=#f23645` trong phần khởi tạo `imb_table`, sửa:

```pinescript
    // Bullish row
    table.cell(imb_table, 0, 1, "Bullish",
        text_color=#00e676, text_size=size.small)     // ← sửa từ #089981

    table.cell(imb_table, 1, 1, "Tần Suất",
        text_color=#00e676, text_size=size.small, text_halign=text.align_left)  // ← sửa

    table.cell(imb_table, 1, 2, "Đã Lấp",
        text_color=#00e676, text_size=size.small, text_halign=text.align_left)  // ← sửa

    // Bearish row
    table.cell(imb_table, 0, 3, "Bearish",
        text_color=#ff5252, text_size=size.small)     // ← sửa từ #f23645

    table.cell(imb_table, 1, 3, "Tần Suất",
        text_color=#ff5252, text_size=size.small, text_halign=text.align_left)  // ← sửa

    table.cell(imb_table, 1, 4, "Đã Lấp",
        text_color=#ff5252, text_size=size.small, text_halign=text.align_left)  // ← sửa
```

- [ ] **Step 3: Sửa `set_imb_cells()` — text bullish/bearish trong data cells**

Trong hàm `set_imb_cells()` (dòng 699-713), sửa các tham chiếu `bull_css`/`bear_css` — dùng màu từ input giữ nguyên, nhưng thêm biến local để map sang màu sáng hơn cho text:

Thực tế không cần sửa `set_imb_cells()` vì nó dùng `bull_css`/`bear_css` từ input (màu FVG/OG/VI/OB do user chọn). Chỉ sửa text màu trong header của bảng.

- [ ] **Step 4: Verify — compile, kiểm tra trên nền chart trắng**

Expected: Bảng nền tối đặc `#1e222d`, text trắng rõ nét, viền sáng `#5b5f6b` nhìn rõ trên nền trắng.

---

### Task 8: Cập Nhật Header & Phiên Bản

**Files:**
- Modify: `indicators/smc_market_structure.pine` — dòng 1-9

- [ ] **Step 1: Sửa header**

```pinescript
// ─── SMC Market Structure Indicator — Phân tích cấu trúc thị trường theo Smart Money Concepts ───
// Tác giả: TV Pine
// Ngày tạo: 2026-06-18
// Phiên bản: 1.4
// Mô tả: Phát hiện cấu trúc xu hướng (HH/HL, LL/LH), Break of Structure (BoS),
//        Change of Character (CHoCH), Fair Value Gaps (FVG), Opening Gaps (OG),
//        Volume Imbalance (VI), Order Blocks (OB), Dashboard thống kê đầy đủ.
// Credits: Imbalance Detector logic adapted from LuxAlgo (CC BY-NC-SA 4.0)
```

- [ ] **Step 2: Verify — compile lần cuối**

Expected: Không lỗi, tất cả tính năng hoạt động.
