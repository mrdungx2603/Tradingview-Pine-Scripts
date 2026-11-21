"""
stats_panel.py — Bảng Thống Kê SMC (Responsive)
=================================================
Hiển thị thông tin tổng hợp, tự động xếp lại trên mobile:
  - Card Dashboard SMC: Swing High/Low, Vị trí %
  - Card Xu Hướng: Trend status (BULLISH/BEARISH/WAIT)
  - Card Sự Kiện: Đếm BoS, CHoCH, HH, HL, LL, LH

Desktop: 3 cột ngang
Mobile:  Stack dọc full-width
"""

from dash import html
import dash_bootstrap_components as dbc
from smc_engine import SMCResult


_CARD_STYLE = {
    "border": "1px solid #333",
    "borderRadius": "6px",
    "background": "#1E1E1E",
}
_HEADER_STYLE = {
    "background": "#2C2C2C",
    "borderBottom": "1px solid #444",
    "padding": "6px 10px",
}
_BODY_STYLE = {"padding": "8px 10px"}


def build_stats_panel(smc_result: SMCResult) -> html.Div:
    """
    Tạo panel thống kê responsive.
    """
    # ─── Compute values ─────────────────────────────────────
    trend_text = (
        "BULLISH ▲" if smc_result.final_trend == 1
        else "BEARISH ▼" if smc_result.final_trend == -1
        else "WAIT ■"
    )
    trend_color = (
        "success" if smc_result.final_trend == 1
        else "danger" if smc_result.final_trend == -1
        else "secondary"
    )

    if smc_result.final_trend == 1:
        sh_label, sl_label = "HH", "HL"
        sh_val = smc_result.final_swing_high
        sl_val = smc_result.final_swing_low
    elif smc_result.final_trend == -1:
        sh_label, sl_label = "LH", "LL"
        sh_val = smc_result.final_swing_high
        sl_val = smc_result.final_swing_low
    else:
        sh_label, sl_label = "—", "—"
        sh_val = smc_result.final_swing_high
        sl_val = smc_result.final_swing_low

    pct = smc_result.final_pos_pct or 0
    if smc_result.final_trend == 1:
        pos_color = "success" if pct > 50 else "danger"
        pos_zone = "Discount" if pct > 50 else "Premium"
    elif smc_result.final_trend == -1:
        pos_color = "danger" if pct > 50 else "success"
        pos_zone = "Premium" if pct > 50 else "Discount"
    else:
        pos_color = "secondary"
        pos_zone = "—"

    # Event counts
    labels = smc_result.struct_labels
    hh_count = sum(1 for l in labels if l.text == "HH")
    hl_count = sum(1 for l in labels if l.text == "HL")
    ll_count = sum(1 for l in labels if l.text == "LL")
    lh_count = sum(1 for l in labels if l.text == "LH")
    bos_count = len(smc_result.bos_events)
    choch_count = len(smc_result.choch_events)

    # ─── Helper: stat row ───────────────────────────────────
    def stat_row(label, value, lw=4, vw=8):
        return dbc.Row([
            dbc.Col(html.Span(label, className="fw-bold"), width=lw),
            dbc.Col(html.Span(value), width=vw),
        ], className="mb-1")

    # ─── Card 1: Dashboard SMC ──────────────────────────────
    card_dashboard = dbc.Card(
        [
            dbc.CardHeader(html.H6("📊 Dashboard", className="mb-0"), style=_HEADER_STYLE),
            dbc.CardBody(
                [
                    stat_row(sh_label, f"{sh_val:,.2f}" if sh_val else "—"),
                    stat_row(sl_label, f"{sl_val:,.2f}" if sl_val else "—"),
                    dbc.Row([
                        dbc.Col(html.Span("Vị trí", className="fw-bold"), width=4),
                        dbc.Col(
                            dbc.Badge(
                                f"{pct:.1f}% {pos_zone}",
                                color=pos_color,
                                className="me-1",
                            ),
                            width=8,
                        ),
                    ]),
                ],
                style=_BODY_STYLE,
            ),
        ],
        className="h-100 shadow-sm mb-2 mb-md-0",
        style=_CARD_STYLE,
    )

    # ─── Card 2: Trend ──────────────────────────────────────
    card_trend = dbc.Card(
        [
            dbc.CardHeader(html.H6("📈 Xu Hướng", className="mb-0"), style=_HEADER_STYLE),
            dbc.CardBody(
                dbc.Badge(trend_text, color=trend_color, className="fs-6 w-100 py-2"),
                className="d-flex align-items-center justify-content-center",
                style={"padding": "8px", "minHeight": "85px"},
            ),
        ],
        className="h-100 shadow-sm text-center mb-2 mb-md-0",
        style=_CARD_STYLE,
    )

    # ─── Card 3: Event Counts ───────────────────────────────
    card_events = dbc.Card(
        [
            dbc.CardHeader(html.H6("🔍 Sự Kiện", className="mb-0"), style=_HEADER_STYLE),
            dbc.CardBody(
                [
                    dbc.Row([
                        dbc.Col(html.Span("HH:", className="fw-bold text-success"), width=3),
                        dbc.Col(html.Span(str(hh_count)), width=3),
                        dbc.Col(html.Span("HL:", className="fw-bold text-success"), width=3),
                        dbc.Col(html.Span(str(hl_count)), width=3),
                    ], className="mb-1"),
                    dbc.Row([
                        dbc.Col(html.Span("LL:", className="fw-bold text-danger"), width=3),
                        dbc.Col(html.Span(str(ll_count)), width=3),
                        dbc.Col(html.Span("LH:", className="fw-bold text-danger"), width=3),
                        dbc.Col(html.Span(str(lh_count)), width=3),
                    ], className="mb-1"),
                    dbc.Row([
                        dbc.Col(html.Span("BoS:", className="fw-bold text-info"), width=3),
                        dbc.Col(html.Span(str(bos_count)), width=3),
                        dbc.Col(html.Span("CHoCH:", className="fw-bold text-warning"), width=3),
                        dbc.Col(html.Span(str(choch_count)), width=3),
                    ]),
                ],
                style=_BODY_STYLE,
            ),
        ],
        className="h-100 shadow-sm",
        style=_CARD_STYLE,
    )

    return html.Div(
        dbc.Row(
            [
                # xs=12 full-width trên mobile, xếp lại trên desktop
                dbc.Col(card_dashboard, xs=12, sm=6, lg=4, className="mb-2"),
                dbc.Col(card_trend, xs=12, sm=6, lg=3, className="mb-2"),
                dbc.Col(card_events, xs=12, sm=12, lg=5, className="mb-2"),
            ],
            className="g-2 mt-2",
        ),
    )
