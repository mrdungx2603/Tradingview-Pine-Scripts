# Tài Liệu Tổng — Danh Mục Script Pine Script

> Đây là tài liệu tổng (index) liệt kê toàn bộ indicator, strategy, library hiện có trong dự án. Mỗi script có 1 tài liệu con riêng (cột **Tài Liệu**) mô tả tổng quan, tham số đầu vào, logic chính, output và giới hạn.
>
> ⚠️ **Quy tắc bắt buộc**: Mỗi khi **tạo mới**, **sửa**, hoặc **xoá** một indicator/strategy/library, phải cập nhật tài liệu con tương ứng VÀ bảng dưới đây trong cùng lúc sửa code — xem chi tiết trong [`.claude/CLAUDE.md`](../.claude/CLAUDE.md), mục "Quản Lý Tài Liệu (Documentation)".

## Indicators

| Tên | File Script | Version | Tài Liệu |
|---|---|---|---|
| LSC Pattern | [indicators/lsc_pattern.pine](../indicators/lsc_pattern.pine) | 1.0 | [lsc-pattern.md](lsc-pattern.md) |
| Market Profile (Mind over Markets) | [indicators/market_profile.pine](../indicators/market_profile.pine) | 2.2 | [market-profile.md](market-profile.md) |
| Order Flow & Market Profile Panel | [indicators/order_flow_profile_panel.pine](../indicators/order_flow_profile_panel.pine) | 1.14 | [order-flow-profile-panel.md](order-flow-profile-panel.md) |
| Order Flow Bar | [indicators/order_flow_bar.pine](../indicators/order_flow_bar.pine) | 1.11 | [order-flow-bar.md](order-flow-bar.md) |
| Order Flow Overlay | [indicators/order_flow_overlay.pine](../indicators/order_flow_overlay.pine) | 1.0 | [order-flow-overlay.md](order-flow-overlay.md) |
| SMC Market Structure | [indicators/smc_market_structure.pine](../indicators/smc_market_structure.pine) | 1.16 | [smc-market-structure.md](smc-market-structure.md) |
| SMC Market Structure + MTF | [indicators/smc_market_structure_mtf.pine](../indicators/smc_market_structure_mtf.pine) | 2.0 | [smc-market-structure.md](smc-market-structure.md) *(chung tài liệu với bản base)* |
| Wyckoff Effort vs Result | [indicators/volume/wyckoff_evr.pine](../indicators/volume/wyckoff_evr.pine) | 1.0 | [wyckoff-evr.md](wyckoff-evr.md) |

## Strategies

| Tên | File Script | Version | Tài Liệu |
|---|---|---|---|
| SMC Strategy | [strategies/smc_strategy.pine](../strategies/smc_strategy.pine) | 2.0 | [smc-strategy.md](smc-strategy.md) |

## Libraries

| Tên | File Script | Version | Tài Liệu |
|---|---|---|---|
| SMC Core Library | [libraries/smc_core.pine](../libraries/smc_core.pine) | 1.0 | [smc-core.md](smc-core.md) |

## Không Tài Liệu Hóa (Có Chủ Đích)

| File | Lý Do |
|---|---|
| `indicators/temp/tmp.pine` | Code tham khảo bên thứ 3 (LuxAlgo "Imbalance Detector", license CC BY-NC-SA 4.0), nằm trong `temp/` — không phải sản phẩm của dự án. |
| `indicators/hist/*.pine`, `strategies/hist/*.pine` | Bản backup phiên bản cũ theo quy tắc versioning — tài liệu con chỉ mô tả bản hiện hành (tham chiếu file mới nhất), không viết riêng cho từng bản backup. |

## Tài Liệu Tham Khảo Khác

- [ghi-chu-pine-script.md](ghi-chu-pine-script.md) — Ghi chú nhanh hàm/cú pháp Pine Script v6 thường dùng (không phải tài liệu indicator).
- `docs/superpowers/` — Plan/spec nội bộ khi dùng skill brainstorming/writing-plans, không thuộc phạm vi tài liệu indicator này.
