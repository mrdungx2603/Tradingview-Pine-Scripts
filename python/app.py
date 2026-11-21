"""
app.py — SMC Market Structure Dashboard (Dash)
================================================
Entry point cho ứng dụng web Dash. Responsive cho desktop + mobile.

Chạy:
    python app.py
    → Mở browser: http://localhost:8050

Kiến trúc:
    Desktop: Sidebar trái (3 cột) + Chart area phải (9 cột)
    Mobile:  Offcanvas drawer chứa controls + Chart full-width
"""

import traceback
from datetime import date, timedelta

import dash
from dash import html, dcc, Input, Output, State, ctx, clientside_callback, ClientsideFunction
import dash_bootstrap_components as dbc

from db import CandleDB
from smc_engine import SMCEngine, SMCResult
from components.controls import build_controls_offcanvas, OFFCANVAS_ID
from components.chart_view import build_chart
from components.stats_panel import build_stats_panel


# ╔══════════════════════════════════════════╗
# ║                 APP INIT                ║
# ╚══════════════════════════════════════════╝

app = dash.Dash(
    __name__,
    external_stylesheets=[dbc.themes.DARKLY, dbc.icons.FONT_AWESOME],
    title="SMC Market Structure",
    suppress_callback_exceptions=True,
    meta_tags=[
        {"name": "viewport", "content": "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"},
        {"name": "apple-mobile-web-app-capable", "content": "yes"},
        {"name": "apple-mobile-web-app-status-bar-style", "content": "black-translucent"},
        {"name": "theme-color", "content": "#121212"},
    ],
)

server = app.server  # Dành cho production deploy (gunicorn)

# ╔══════════════════════════════════════════╗
# ║               LAYOUT                     ║
# ╚══════════════════════════════════════════╝

app.layout = dbc.Container(
    [
        # ─── Store components (ẩn) ──────────────────────────
        dcc.Store(id="store-result"),

        # ─── Header (compact cho mobile) ────────────────────
        dbc.Row(
            dbc.Col(
                html.Div(
                    [
                        html.H3(
                            ["🏠 ", html.Span("SMC Market Structure", className="d-none d-sm-inline"), " SMC"],
                            className="mb-0 d-inline",
                        ),
                    ],
                    className="d-flex align-items-center justify-content-between",
                ),
                width=12,
            ),
            className="py-2",
        ),

        # ─── Body: responsive layout ────────────────────────
        dbc.Row(
            [
                # Desktop: Sidebar visible (lg=3), Mobile: ẩn
                dbc.Col(
                    [
                        build_controls_offcanvas(default_symbol="VCB"),
                    ],
                    xs=0, lg=3,
                    className="d-none d-lg-block",
                    id="sidebar-desktop",
                ),

                # Main Area: full-width trên mobile, 9 cột trên desktop
                dbc.Col(
                    [
                        # Toolbar row: nút mở filter (mobile only) + info
                        dbc.Row(
                            dbc.Col(
                                [
                                    # Nút floating mở offcanvas (mobile chỉ thấy nút này)
                                    dbc.Button(
                                        html.I(className="fas fa-sliders-h me-1"),
                                        id="btn-open-offcanvas",
                                        color="primary",
                                        size="sm",
                                        className="d-lg-none me-2",
                                        style={"borderRadius": "20px"},
                                    ),
                                    html.Small(
                                        id="chart-info-text",
                                        className="text-muted d-none d-sm-inline",
                                    ),
                                ],
                                className="d-flex align-items-center mb-2",
                            ),
                        ),

                        # Biểu đồ (responsive height)
                        dcc.Loading(
                            id="loading-chart",
                            type="cube",
                            color="#2196F3",
                            children=html.Div(
                                id="chart-area",
                                children=dbc.Alert(
                                    [
                                        html.I(className="fas fa-hand-point-left me-2 d-none d-lg-inline"),
                                        "Chọn tham số và nhấn ",
                                        html.B("Cập Nhật"),
                                        " để hiển thị biểu đồ.",
                                    ],
                                    color="info",
                                    className="text-center mt-3 py-2",
                                ),
                                className="chart-container",
                            ),
                        ),

                        # Stats Panel
                        html.Div(id="stats-area"),
                    ],
                    xs=12, lg=9,
                ),
            ],
            className="g-2",
        ),

        # ─── Offcanvas: drawer controls cho mobile ──────────
        # Nằm ngoài Row để offcanvas không bị giới hạn bởi overflow
        html.Div(id="offcanvas-container"),

        # Footer (ẩn trên mobile)
        html.Hr(style={"borderColor": "#444", "marginTop": "20px"}, className="d-none d-sm-block"),
        dbc.Row(
            dbc.Col(
                html.P(
                    "SMC Market Structure • MySQL • Dash & Plotly",
                    className="text-center text-muted small d-none d-sm-block",
                ),
            ),
        ),
    ],
    fluid=True,
    style={"minHeight": "100vh", "backgroundColor": "#121212", "color": "#E0E0E0"},
    className="px-2 px-md-3",
)


# ╔══════════════════════════════════════════╗
# ║               CSS TÙY CHỈNH              ║
# ╚══════════════════════════════════════════╝

app.index_string = """<!DOCTYPE html>
<html>
    <head>
        {%metas%}
        <title>{%title%}</title>
        {%favicon%}
        {%css%}
        <style>
            /* ─── Mobile optimizations ─── */
            @media (max-width: 576px) {
                .chart-container .js-plotly-plot {
                    height: 55vh !important;
                }
                .card-header {
                    padding: 6px 10px !important;
                }
                .card-body {
                    padding: 8px !important;
                }
                h6 { font-size: 0.85rem !important; }
                .fs-5 { font-size: 1rem !important; }
                .badge { font-size: 0.8rem !important; }
                .small, small { font-size: 0.7rem !important; }
                h3 { font-size: 1.1rem !important; }
                /* Fix DatePickerSingle trên mobile */
                .DateInput { width: 100% !important; }
                .DateInput_input { font-size: 14px !important; padding: 4px 8px !important; }
                /* Plotly modebar nhỏ hơn */
                .modebar-btn { padding: 2px !important; }
                .modebar-btn svg { width: 14px !important; height: 14px !important; }
                /* Offcanvas rộng full */
                .offcanvas-start { width: 90vw !important; max-width: 400px !important; }
            }
            @media (min-width: 577px) and (max-width: 992px) {
                .chart-container .js-plotly-plot {
                    height: 65vh !important;
                }
            }
            @media (min-width: 993px) {
                .chart-container .js-plotly-plot {
                    height: 75vh !important;
                }
            }
            /* Touch-friendly: tăng tap target */
            .offcanvas .form-check-label,
            .offcanvas .btn,
            .offcanvas .Select-control {
                min-height: 44px;
                display: flex;
                align-items: center;
            }
            .offcanvas .dash-dropdown .Select-control {
                min-height: 40px;
            }
            /* Prevents iOS zoom on input */
            input, select, textarea { font-size: 16px !important; }
            /* Smooth scroll */
            .offcanvas-body { -webkit-overflow-scrolling: touch; }
        </style>
    </head>
    <body>
        {%app_entry%}
        <footer>
            {%config%}
            {%scripts%}
            {%renderer%}
        </footer>
    </body>
</html>"""

# ╔══════════════════════════════════════════╗
# ║            CALLBACKS                     ║
# ╚══════════════════════════════════════════╝

# ─── Clientside: Toggle Offcanvas ─────────────────────────
app.clientside_callback(
    """
    function(n_clicks) {
        if (!n_clicks) return window.dash_clientside.no_update;
        var el = document.getElementById('offcanvas-controls');
        if (!el) return window.dash_clientside.no_update;
        var bs = bootstrap.Offcanvas.getInstance(el);
        if (!bs) bs = new bootstrap.Offcanvas(el);
        bs.toggle();
        return window.dash_clientside.no_update;
    }
    """,
    Output("offcanvas-controls", "is_open"),
    Input("btn-open-offcanvas", "n_clicks"),
    prevent_initial_call=True,
    allow_duplicate=True,
)

# ─── Khởi tạo: Load symbol list khi trang load ─────────────

# ─── Khởi tạo: Load symbol list khi trang load ─────────────

@app.callback(
    Output("dd-symbol", "options"),
    Output("dd-symbol", "value", allow_duplicate=True),
    Output("dd-symbol-offcanvas", "options"),
    Output("dd-symbol-offcanvas", "value", allow_duplicate=True),
    Input("dd-timeframe", "value"),
    prevent_initial_call="initial_duplicate",
)
def populate_symbols(timeframe):
    """Khi timeframe thay đổi → cập nhật cả 2 dropdown (desktop + offcanvas)."""
    db = CandleDB()
    symbols = db.get_available_symbols(timeframe=timeframe)
    options = [
        {
            "label": f"{s['code']} — {s['name'][:20]}" if len(s.get('name', '')) > 20
                     else f"{s['code']} — {s['name']} ({s['exchange']})",
            "value": s["code"],
        }
        for s in symbols
    ]
    default_value = options[0]["value"] if options else "VCB"
    return options, default_value, options, default_value


@app.callback(
    Output("dd-symbol", "value", allow_duplicate=True),
    Output("dd-symbol-offcanvas", "value", allow_duplicate=True),
    Input("dd-symbol", "value"),
    prevent_initial_call=True,
)
def sync_symbol_desktop_to_offcanvas(desktop_val):
    """Đồng bộ symbol từ desktop → offcanvas."""
    return desktop_val, desktop_val


@app.callback(
    Output("dd-timeframe", "options"),
    Output("dd-timeframe-offcanvas", "options"),
    Input("dd-symbol", "value"),
    prevent_initial_call=True,
)
def update_timeframe_options(symbol):
    """Khi symbol thay đổi → cập nhật danh sách timeframe khả dụng."""
    if not symbol:
        return [], []
    db = CandleDB()
    tfs = db.get_available_timeframes(symbol)
    tf_labels = {
        "1m": "1 phút", "5m": "5 phút", "15m": "15 phút",
        "30m": "30 phút", "1h": "1 giờ", "4h": "4 giờ",
        "1d": "1 ngày", "1w": "1 tuần",
    }
    options = [{"label": tf_labels.get(t, t), "value": t} for t in tfs]
    opts = options if options else [{"label": "1 ngày", "value": "1d"}]
    return opts, opts


# ─── Đồng bộ offcanvas controls về desktop khi đóng offcanvas ────

@app.callback(
    Output("dd-symbol", "value", allow_duplicate=True),
    Output("dd-timeframe", "value"),
    Output("radio-seed", "value"),
    Output("slider-pivot", "value"),
    Output("dp-start", "date"),
    Output("dp-end", "date"),
    Output("toggle-bos", "value"),
    Output("toggle-choch", "value"),
    Output("toggle-labels", "value"),
    Input("offcanvas-close", "n_clicks"),
    State("dd-symbol-offcanvas", "value"),
    State("dd-timeframe-offcanvas", "value"),
    State("radio-seed-offcanvas", "value"),
    State("slider-pivot-offcanvas", "value"),
    State("dp-start-offcanvas", "date"),
    State("dp-end-offcanvas", "date"),
    State("toggle-bos-offcanvas", "value"),
    State("toggle-choch-offcanvas", "value"),
    State("toggle-labels-offcanvas", "value"),
    prevent_initial_call=True,
)
def sync_offcanvas_to_desktop(n_close, symbol, tf, seed, pivot, dp_s, dp_e, bos, choch, labels):
    """Khi đóng offcanvas → đồng bộ giá trị vào desktop controls."""
    return symbol, tf, seed, pivot, dp_s, dp_e, bos or [], choch or [], labels or []


# ─── Callback chính: Cập Nhật Biểu Đồ ──────────────────────────

@app.callback(
    Output("chart-area", "children"),
    Output("stats-area", "children"),
    Output("chart-info-text", "children"),
    Output("offcanvas-container", "children"),
    Input("btn-update", "n_clicks"),
    Input("btn-update-offcanvas", "n_clicks"),
    State("dd-symbol", "value"),
    State("dd-timeframe", "value"),
    State("radio-seed", "value"),
    State("slider-pivot", "value"),
    State("dp-start", "date"),
    State("dp-end", "date"),
    State("toggle-bos", "value"),
    State("toggle-choch", "value"),
    State("toggle-labels", "value"),
    # Offcanvas states (dùng khi trigger từ offcanvas)
    State("dd-symbol-offcanvas", "value"),
    State("dd-timeframe-offcanvas", "value"),
    State("radio-seed-offcanvas", "value"),
    State("slider-pivot-offcanvas", "value"),
    State("dp-start-offcanvas", "date"),
    State("dp-end-offcanvas", "date"),
    State("toggle-bos-offcanvas", "value"),
    State("toggle-choch-offcanvas", "value"),
    State("toggle-labels-offcanvas", "value"),
)
def update_dashboard(
    n_clicks_desk,
    n_clicks_off,
    sym_desk, tf_desk, seed_desk, pivot_desk, dp_s_desk, dp_e_desk,
    bos_desk, choch_desk, labels_desk,
    sym_off, tf_off, seed_off, pivot_off, dp_s_off, dp_e_off,
    bos_off, choch_off, labels_off,
):
    """
    Callback chính: Load data → Chạy SMC → Build chart + stats.
    Kích hoạt khi nhấn [Cập Nhật] từ desktop hoặc offcanvas.
    """
    triggered_id = ctx.triggered_id if ctx.triggered_id else None

    # Lần đầu load → placeholder
    if triggered_id is None:
        return dash.no_update, dash.no_update, dash.no_update, dash.no_update

    # Chọn nguồn giá trị: offcanvas hoặc desktop
    if triggered_id == "btn-update-offcanvas":
        symbol, timeframe, seed_mode, pivot_length = sym_off, tf_off, seed_off, pivot_off
        start_date, end_date = dp_s_off, dp_e_off
        show_bos_list, show_choch_list, show_labels_list = bos_off, choch_off, labels_off
    else:
        symbol, timeframe, seed_mode, pivot_length = sym_desk, tf_desk, seed_desk, pivot_desk
        start_date, end_date = dp_s_desk, dp_e_desk
        show_bos_list, show_choch_list, show_labels_list = bos_desk, choch_desk, labels_desk

    if not symbol or not timeframe:
        return (
            dbc.Alert("⚠️ Vui lòng chọn Symbol và Timeframe.", color="warning", className="py-2"),
            "",
            "",
            dash.no_update,
        )

    # Parse toggles
    show_bos = "bos" in (show_bos_list or [])
    show_choch = "choch" in (show_choch_list or [])
    show_labels = "labels" in (show_labels_list or [])

    try:
        # ─── 1. Load Data ─────────────────────────────────
        db = CandleDB()
        df = db.get_candles(
            symbol=symbol.upper(),
            timeframe=timeframe,
            start_date=start_date,
            end_date=end_date,
        )

        if df.empty:
            return (
                dbc.Alert(
                    f"⚠️ Không có dữ liệu cho {symbol.upper()} ({timeframe}).",
                    color="warning", className="py-2",
                ),
                "",
                "",
                dash.no_update,
            )

        # ─── 2. Run SMC Engine ────────────────────────────
        engine = SMCEngine(seed_mode=seed_mode, pivot_length=pivot_length)
        result = engine.process(df)

        # ─── 3. Build Chart ────────────────────────────────
        title = f"SMC {symbol.upper()} — {timeframe} ({seed_mode.title()}, P={pivot_length})"
        fig = build_chart(
            df=df,
            smc_result=result,
            title=title,
            show_bos=show_bos,
            show_choch=show_choch,
            show_labels=show_labels,
        )

        # ─── 4. Build Stats + Info ────────────────────────
        stats_div = build_stats_panel(result)

        info_text = (
            f"📅 {df.index[0].strftime('%d/%m/%y')}→{df.index[-1].strftime('%d/%m/%y')} "
            f"• {len(df)} nến "
            f"• BoS:{len(result.bos_events)} CHoCH:{len(result.choch_events)}"
        )

        data_info = html.Div(
            [
                dcc.Graph(
                    figure=fig,
                    config={
                        "displayModeBar": True,
                        "modeBarButtonsToRemove": ["lasso2d", "select2d"],
                        "displaylogo": False,
                        "scrollZoom": True,
                        "responsive": True,
                    },
                    responsive=True,
                ),
            ],
        )

        # ─── 5. Tạo offcanvas với controls đã sync ────────
        # Chỉ rebuild offcanvas container; nội dung luôn có sẵn
        offcanvas_div = html.Div(id="offcanvas-dummy")

        return data_info, stats_div, info_text, offcanvas_div

    except Exception as e:
        traceback.print_exc()
        return (
            dbc.Alert(
                [
                    html.H5("❌ Lỗi xử lý"),
                    html.P(str(e)[:200]),
                ],
                color="danger", className="py-2",
            ),
            "",
            "",
            dash.no_update,
        )


# ─── Auto-close offcanvas khi nhấn Cập Nhật từ mobile ──────

@app.callback(
    Output("offcanvas-controls", "is_open", allow_duplicate=True),
    Input("btn-update-offcanvas", "n_clicks"),
    prevent_initial_call=True,
)
def close_offcanvas_on_update(n):
    """Tự động đóng offcanvas khi người dùng nhấn Cập Nhật từ drawer."""
    return False


# ╔══════════════════════════════════════════╗
# ║               MAIN                       ║
# ╚══════════════════════════════════════════╝

if __name__ == "__main__":
    import socket
    TAILSCALE_HOST = "100.67.89.20"
    PORT = 8050
    print("=" * 60)
    print("  SMC Market Structure Dashboard")
    print(f"  Local:   http://localhost:{PORT}")
    print(f"  Tailscale: http://{TAILSCALE_HOST}:{PORT}")
    print("=" * 60)
    app.run(debug=True, host=TAILSCALE_HOST, port=PORT)
