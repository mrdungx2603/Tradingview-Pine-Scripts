# Tài Liệu Tổng — Danh Mục Script Pine Script

> Đây là tài liệu tổng (index) liệt kê toàn bộ indicator, strategy, library hiện có trong dự án. Mỗi script có 1 tài liệu con riêng (cột **Tài Liệu**) mô tả tổng quan, tham số đầu vào, logic chính, output và giới hạn.
>
> ⚠️ **Quy tắc bắt buộc**: Mỗi khi **tạo mới**, **sửa**, hoặc **xoá** một indicator/strategy/library, phải cập nhật tài liệu con tương ứng VÀ bảng dưới đây trong cùng lúc sửa code — xem chi tiết trong [`.claude/CLAUDE.md`](../.claude/CLAUDE.md), mục "Quản Lý Tài Liệu (Documentation)".

## Indicators

| Tên | File Script | Version | Tài Liệu |
|---|---|---|---|
| Anchor Reversal VN30F (1m) | [indicators/anchor_reversal_vn30f.pine](../indicators/anchor_reversal_vn30f.pine) | 1.1 | [anchor-reversal-vn30f.md](anchor-reversal-vn30f.md) |
| Global Markets Table | [indicators/global_markets_table.pine](../indicators/global_markets_table.pine) | 1.5 | [global-markets-table.md](global-markets-table.md) |
| LSC Pattern | [indicators/lsc_pattern.pine](../indicators/lsc_pattern.pine) | 1.0 | [lsc-pattern.md](lsc-pattern.md) |
| Market Profile (Mind over Markets) | [indicators/market_profile.pine](../indicators/market_profile.pine) | 3.5 | [market-profile.md](market-profile.md) |
| Order Flow & Market Profile Panel | [indicators/order_flow_profile_panel.pine](../indicators/order_flow_profile_panel.pine) | 1.14 | [order-flow-profile-panel.md](order-flow-profile-panel.md) |
| Order Flow Bar | [indicators/order_flow_bar.pine](../indicators/order_flow_bar.pine) | 1.18 | [order-flow-bar.md](order-flow-bar.md) |
| Order Flow Overlay | [indicators/order_flow_overlay.pine](../indicators/order_flow_overlay.pine) | 1.0 | [order-flow-overlay.md](order-flow-overlay.md) |
| SMC Market Structure | [indicators/smc_market_structure.pine](../indicators/smc_market_structure.pine) | 2.0 | [smc-market-structure.md](smc-market-structure.md) |
| SMC Market Structure + MTF | [indicators/smc_market_structure_mtf.pine](../indicators/smc_market_structure_mtf.pine) | 2.2 | [smc-market-structure.md](smc-market-structure.md) *(chung tài liệu với bản base)* |
| SMC MTF Dashboard | [indicators/smc_mtf_dashboard.pine](../indicators/smc_mtf_dashboard.pine) | 1.2 | [smc-mtf-dashboard.md](smc-mtf-dashboard.md) |
| Volume Profile + Delta | [indicators/volume_profile_delta.pine](../indicators/volume_profile_delta.pine) | 1.6 | [volume-profile-delta.md](volume-profile-delta.md) |
| Wyckoff Effort vs Result | [indicators/volume/wyckoff_evr.pine](../indicators/volume/wyckoff_evr.pine) | 1.0 | [wyckoff-evr.md](wyckoff-evr.md) |

## Strategies

| Tên | File Script | Version | Tài Liệu |
|---|---|---|---|
| SMC Strategy | [strategies/smc_strategy.pine](../strategies/smc_strategy.pine) | 2.2 | [smc-strategy.md](smc-strategy.md) |

## Libraries

| Tên | File Script | Version | Tài Liệu |
|---|---|---|---|
| SMC Core Library | [libraries/smc_core.pine](../libraries/smc_core.pine) | 1.3 | [smc-core.md](smc-core.md) |
| Market Profile Core Library | [libraries/market_profile_core.pine](../libraries/market_profile_core.pine) | 1.2 | [market-profile-core.md](market-profile-core.md) |
| Order Flow Core Library | [libraries/order_flow_core.pine](../libraries/order_flow_core.pine) | 1.0 | [order-flow-core.md](order-flow-core.md) |

## Không Tài Liệu Hóa (Có Chủ Đích)

| File | Lý Do |
|---|---|
| `indicators/temp/tmp.pine` | Code tham khảo bên thứ 3 (LuxAlgo "Imbalance Detector", license CC BY-NC-SA 4.0), nằm trong `temp/` — không phải sản phẩm của dự án. |
| `indicators/hist/*.pine`, `strategies/hist/*.pine`, `libraries/hist/*.pine` | Bản backup phiên bản cũ theo quy tắc versioning — tài liệu con chỉ mô tả bản hiện hành (tham chiếu file mới nhất), không viết riêng cho từng bản backup. |

## Báo Cáo Backtest & Thống Kê

| Báo Cáo | Mô Tả | Script Backtest |
|---|---|---|
| [reports/va-rule-vn30f1m.md](reports/va-rule-vn30f1m.md) | Tỉ lệ thành công thực tế của 80% VA Rule (ý tưởng #2) trên dữ liệu thật VN30F1M 1m + khuyến nghị tham số cải tiến | [backtests/va_rule/va_rule_backtest.py](../backtests/va_rule/va_rule_backtest.py) |
| [reports/us30-vn30f-correlation.md](reports/us30-vn30f-correlation.md) | Tương quan US30 phiên trước với VN30F phiên sau theo biên độ: không có lợi thế chung. Chỉ US ≥ +2% đánh ngược có bằng chứng, nhưng tụ ở 2020 và 2022 | [backtests/us30_vn30f/us30_vn30f_backtest.mjs](../backtests/us30_vn30f/us30_vn30f_backtest.mjs) |
| [reports/us30-streak-vnindex.md](reports/us30-streak-vnindex.md) | US30 giảm 5 phiên liên tiếp: phiên 6 xanh 56,8%, VNINDEX phiên đầu giảm trung bình -0,54% (p = 0,002). Báo cáo HTML: [backtests/us30_streak/report.html](../backtests/us30_streak/report.html) | [backtests/us30_streak/us30_streak_backtest.mjs](../backtests/us30_streak/us30_streak_backtest.mjs) |

Hướng dẫn lấy dữ liệu lịch sử TradingView để làm báo cáo: [tradingview-api-guide.md](tradingview-api-guide.md).

## Tài Liệu Tham Khảo Khác

- [quy-trinh-giao-dich-vn30f1m.md](quy-trinh-giao-dich-vn30f1m.md) — Quy trình giao dịch VN30F1M (1m, không qua đêm): vai trò từng indicator (SMC/MP/Order Flow Bar/LSC/GMKT), playbook 3 setup, quy tắc vào lệnh, quản trị rủi ro, checklist trước/trong/sau giờ.
- [ghi-chu-pine-script.md](ghi-chu-pine-script.md) — Ghi chú nhanh hàm/cú pháp Pine Script v6 thường dùng (không phải tài liệu indicator).
- [market-profile-strategy-ideas.md](market-profile-strategy-ideas.md) — Brainstorm 31 ý tưởng strategy dựa trên Market Profile + combo SMC/VPA (ý tưởng #2 đã có backtest thật, xem bảng "Báo Cáo Backtest & Thống Kê" trên).
- `docs/superpowers/` — Plan/spec nội bộ khi dùng skill brainstorming/writing-plans, không thuộc phạm vi tài liệu indicator này.
