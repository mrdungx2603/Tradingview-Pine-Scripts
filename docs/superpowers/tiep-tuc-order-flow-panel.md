# Ghi chú bàn giao — Order Flow & Market Profile Panel

> Ghi chú làm việc nội bộ (không phải tài liệu indicator chính thức — xem `docs/order-flow-profile-panel.md` cho tài liệu đầy đủ). Mục đích: để tiếp tục đúng mạch công việc khi chuyển sang máy khác.

**Cập nhật lần cuối:** 2026-11-14
**File chính:** `indicators/order_flow_profile_panel.pine`
**Version hiện tại:** v1.10 (commit `124f051`, **đã push lên origin/master**)
**Spec/Plan gốc (Phase 1):** `docs/superpowers/specs/2026-11-14-order-flow-profile-panel-design.md` + `docs/superpowers/plans/2026-11-14-order-flow-profile-panel.md`

## Trạng thái git

Tại thời điểm ghi chú này: `local master` == `origin/master` (đã push, không có gì cần push thêm). Commit mới nhất trên remote là `a16c5e3` (thuộc `market_profile.pine` v2.1 — **không liên quan** tới panel này, do 1 phiên làm việc khác thực hiện).

Working tree còn 2 thứ **không liên quan** tới panel này, chưa commit, đừng động vào trừ khi được yêu cầu: `indicators/volume/wyckoff_evr.pine` (untracked), `python/` (untracked).

## Việc đã làm (toàn bộ lịch sử version)

Panel bắt đầu từ yêu cầu: 1 pane riêng theo dõi order flow (scalping M1) + cấu trúc Market Profile, test trên `HNX:VN30F1!`.

- **v1.0**: Phase 1 — file độc lập, 7 dòng (Delta/CVD/TPO Count/Day Type/Open Type/RF/RSI), 1 cột = 1 nến M1. Review toàn branch (subagent Opus) tìm 3 Critical (box.new nhận float, band Day/Open Type lỗi runtime bar đầu, `ib_bars_cnt` sai đơn vị M1) + 4 Important, đã fix hết trước khi báo hoàn thành.
- **v1.1**: Đổi 1 cột = 1 nến M1 → 1 cột = N phút (gộp), RSI tính thật qua `request.security()`.
- **v1.2**: Tăng cỡ chữ, thêm nhãn tên dòng (ban đầu dùng `label.new()`).
- **v1.3**: Sửa lỗi khung cuối phiên sáng (11:25-11:30) không hiện cột do suy toạ độ sai qua gap nghỉ trưa.
- **v1.4**: Đổi input khung gộp cột sang `input.timeframe` (dropdown), toggle ẩn hậu tố F/L/A, đổi thứ tự dòng, input cỡ chữ, thêm VAH/POC/VAL, toggle ẩn/hiện riêng từng dòng (+ bỏ qua tính toán khi ẩn).
- **v1.5**: Dòng ẩn không chừa chỗ trống (Y tính động); **bỏ hẳn Day Type & Open Type** (user yêu cầu bỏ thuật toán, không chỉ ẩn).
- **v1.6**: Delta/CVD hiện đúng 2 số lẻ (`f_format_delta()` riêng, không dùng `format.volume`).
- **v1.7**: Thêm dòng Time (giờ:phút) ở trên cùng.
- **v1.8**: Sửa lỗi CVD cột đầu phiên không khớp Delta (lệch 1 bar do thứ tự Section 6/7) — thêm `bucket_cvd_end` snapshot.
- **v1.9**: Chia input group theo chức năng; tên dòng chuyển từ `label.new()` sang `plot(display=display.price_scale)` (neo trục giá bên phải, không hiện trong legend); **xác nhận + sửa nguyên nhân cột lệch khi chart ở chế độ Volume Candles** — đổi toàn bộ box từ `xloc.bar_time` sang `xloc.bar_index`.
- **v1.10** (mới nhất): Xác nhận + sửa lỗi "mất cột" khi `col_tf` nhỏ (vd 3 phút) — một số khung hoàn toàn không có nến M1 (thanh khoản mỏng) nên không bao giờ được tạo cột, khiến dòng Time nhảy cóc (14:15→14:21, mất 14:18). Thêm cơ chế lấp "gap": chèn cột placeholder (nền xám, Delta="0", các dòng khác giữ giá trị cũ) cho mỗi khung bị bỏ trống, neo bằng `xloc.bar_time` riêng (`f_push_cell_time()`) vì không có `bar_index` đại diện. Chỉ áp dụng khi `col_tf` là số phút thuần, chỉ trong cùng 1 phiên (`not is_new_session` — không lấp gap qua đêm/cuối tuần).

Mỗi version đều có backup trong `indicators/hist/order_flow_profile_panel_vX.Y.pine` theo đúng quy tắc version của `.claude/CLAUDE.md`, và `docs/order-flow-profile-panel.md` đã cập nhật đầy đủ (Tham Số Đầu Vào, Logic Chính, Giới Hạn & Lưu Ý, Changelog).

## Trạng thái panel hiện tại (10 dòng, thứ tự trên→xuống)

Time → Delta → CVD → VAH → POC → VAL → TPO Count → RF → RSI (9 dòng gộp cột) — **lưu ý**: dòng Day Type/Open Type đã bị xoá hẳn ở v1.5, không còn trong panel.

## Việc CHƯA xác nhận / cần làm tiếp khi sang máy khác

1. **Chưa xác nhận v1.10 (gap-fill) chạy đúng trên chart thật.** User mới report bug ở v1.9 (mất cột khi `col_tf=3m`), tôi đã fix nhưng **chưa có phản hồi test thực tế** từ user cho bản v1.10. Việc cần làm đầu tiên khi tiếp tục: hỏi/chờ user dán code v1.10 vào Pine Editor, bật `col_tf=3`, xác nhận dòng Time không còn nhảy cóc (có cột xám thay cho khung trống).
2. **Chưa kiểm tra hiệu năng thực tế của gap-fill tại giờ nghỉ trưa** (11:30-13:00, ~30 khung nếu `col_tf=3`) — về lý thuyết ổn (≤270 box operations/bar, cap bởi `n_bars_display`), nhưng chưa quan sát trên chart thật.
3. **Phase 2 (chưa làm, đúng kế hoạch ban đầu)**: nếu Phase 1 (file độc lập) chạy ổn lâu dài, tách engine Market Profile (TPO/POC/VAH/VAL/RF) dùng chung giữa `order_flow_profile_panel.pine` và `market_profile.pine` thành 1 library riêng (`libraries/`), theo tiền lệ `smc_core.pine`. Chưa có spec/plan riêng cho Phase 2 — cần brainstorm lại khi tới lúc.
4. **Các câu hỏi đã hỏi nhưng chưa quay lại**: không có — mọi yêu cầu của user tới thời điểm này đều đã được xử lý và commit.

## Lưu ý kỹ thuật quan trọng (tránh lặp lại nhầm lẫn)

- **CLAUDE.md có 1 mục sai** (chưa tự sửa, đã báo cho user ở một lần trả lời trước): pitfall "`for start > end` chạy 1 lần" — SAI theo tài liệu Pine chính thức (Pine tự động đếm giảm khi `from > to`). Nếu áp dụng guard `if start <= end` theo gợi ý đó vào vòng `sell_tail_rows`-kiểu sẽ gây bug ngược. Không tự sửa file CLAUDE.md của user.
- Pine v6 cho phép gọi `request.*()` trong `if` khi điều kiện chỉ phụ thuộc `input.bool`/`input.*` (simple, cố định suốt script) — đã dùng cách này để bỏ qua tính toán khi dòng bị ẩn (`need_delta`, `show_rsi`, v.v.).
- `box.new()` cần toạ độ `series int` khi dùng `xloc.bar_index` — không truyền `bar_index - 0.5` (float) được.
- `box.new()` neo theo `xloc.bar_time` sẽ SAI vị trí nếu chart ở chế độ Volume Candles — đã đổi sang `xloc.bar_index` ở v1.9 cho mọi box có dữ liệu thật; chỉ box "gap placeholder" (v1.10) mới dùng `xloc.bar_time` vì không có `bar_index` thay thế.
