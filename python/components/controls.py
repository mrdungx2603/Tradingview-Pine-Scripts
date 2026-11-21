"""
controls.py — Input Controls (Responsive: Desktop Sidebar + Mobile Offcanvas)
==============================================================================
Các widget cho phép người dùng chọn tham số:
  - Symbol dropdown (searchable)
  - Timeframe dropdown
  - Seed Mode radio
  - Pivot Length slider
  - Date range pickers
  - Hiển thị toggles (BoS, CHoCH, Labels)
  - Nút Cập Nhật

Layout:
  Desktop: dbc.Card sidebar
  Mobile:  dbc.Offcanvas (drawer từ trái) + nút floating trigger
"""

from dash import html, dcc
import dash_bootstrap_components as dbc

# ╔══════════════════════════════════════════╗
# ║              CONSTANTS                   ║
# ╚══════════════════════════════════════════╝

OFFCANVAS_ID = "offcanvas-controls"
OFFCANVAS_TRIGGER = "btn-open-offcanvas"

TIMEFRAME_OPTIONS = [
    {"label": "1 phút", "value": "1m"},
    {"label": "5 phút", "value": "5m"},
    {"label": "15 phút", "value": "15m"},
    {"label": "30 phút", "value": "30m"},
    {"label": "1 giờ", "value": "1h"},
    {"label": "4 giờ", "value": "4h"},
    {"label": "1 ngày", "value": "1d"},
    {"label": "1 tuần", "value": "1w"},
]

# ─── Style dùng chung ────────────────────────────────────
_INPUT_STYLE = {"color": "#000"}
_SECTION_STYLE = {
    "fontWeight": "600",
    "fontSize": "12px",
    "color": "#AAA",
    "marginBottom": "3px",
    "textTransform": "uppercase",
    "letterSpacing": "0.5px",
}
_CARD_STYLE = {
    "border": "1px solid #333",
    "borderRadius": "8px",
    "background": "#1E1E1E",
    "height": "100%",
}


def _section_label(text: str) -> html.Label:
    return html.Label(text, style=_SECTION_STYLE)


def _control_body(suffix: str = "", compact: bool = False) -> list:
    """
    Tạo body controls với các ID có suffix ("" cho desktop, "-offcanvas" cho mobile).

    Args:
        suffix: Hậu tố cho ID để tránh xung đột DOM ("" hoặc "-offcanvas")
        compact: True = mobile layout (ít padding/spacing hơn)

    Returns:
        List các Dash components.
    """
    s = suffix  # shorthand
    spacing = html.Br() if not compact else html.Div(style={"height": "8px"})
    card_padding = "10px" if compact else "15px"

    return [
        # ─── Symbol ───────────────────────────────────
        _section_label("Mã Chứng Khoán"),
        dcc.Dropdown(
            id=f"dd-symbol{s}",
            placeholder="Nhập mã...",
            clearable=False,
            searchable=True,
            style=_INPUT_STYLE,
        ),

        spacing,

        # ─── Timeframe ────────────────────────────────
        _section_label("Khung Thời Gian"),
        dcc.Dropdown(
            id=f"dd-timeframe{s}",
            options=TIMEFRAME_OPTIONS,
            value="1d",
            clearable=False,
            searchable=False,
            style=_INPUT_STYLE,
        ),

        spacing,

        # ─── Seed Mode ────────────────────────────────
        _section_label("Seed Mode"),
        dbc.RadioItems(
            id=f"radio-seed{s}",
            options=[
                {"label": "Pivot", "value": "pivot"},
                {"label": "Session", "value": "session"},
            ],
            value="pivot",
            inline=True,
            className="mb-1",
            input_checked_style={"accentColor": "#2196F3"},
        ),

        spacing,

        # ─── Pivot Length ─────────────────────────────
        _section_label("Pivot Length"),
        html.Div(
            dcc.Slider(
                id=f"slider-pivot{s}",
                min=2, max=30, step=1, value=5,
                marks={2: "2", 5: "5", 10: "10", 15: "15", 20: "20", 25: "25", 30: "30"},
                tooltip={"placement": "bottom", "always_visible": True},
            ),
            style={"paddingLeft": "8px", "paddingRight": "8px"},
        ),

        spacing,

        # ─── Date Range ──────────────────────────────
        _section_label("Khoảng Thời Gian"),
        dbc.Row(
            [
                dbc.Col(
                    dcc.DatePickerSingle(
                        id=f"dp-start{s}",
                        placeholder="Từ",
                        display_format="DD/MM/YYYY",
                        first_day_of_week=1,
                    ),
                    width=6,
                ),
                dbc.Col(
                    dcc.DatePickerSingle(
                        id=f"dp-end{s}",
                        placeholder="Đến",
                        display_format="DD/MM/YYYY",
                        first_day_of_week=1,
                    ),
                    width=6,
                ),
            ],
            className="g-1",
        ),

        html.Hr(className="my-2", style={"borderColor": "#444"}),

        # ─── Hiển Thị Toggles ──────────────────────────
        _section_label("Hiển Thị"),
        dbc.Checklist(
            id=f"toggle-bos{s}",
            options=[{"label": "BoS (Break of Structure)", "value": "bos"}],
            value=["bos"],
            switch=True,
            className="mb-1",
        ),
        dbc.Checklist(
            id=f"toggle-choch{s}",
            options=[{"label": "CHoCH (Change of Char)", "value": "choch"}],
            value=["choch"],
            switch=True,
            className="mb-1",
        ),
        dbc.Checklist(
            id=f"toggle-labels{s}",
            options=[{"label": "Labels HH/HL/LL/LH", "value": "labels"}],
            value=["labels"],
            switch=True,
            className="mb-2",
        ),

        # ─── Nút Cập Nhật ──────────────────────────────
        dbc.Button(
            "🔄 Cập Nhật",
            id=f"btn-update{s}",
            color="primary",
            className="w-100",
            size="md" if compact else "lg",
        ),
    ]


# ╔══════════════════════════════════════════╗
# ║        PUBLIC BUILD FUNCTION             ║
# ╚══════════════════════════════════════════╝

def build_controls_offcanvas(default_symbol: str = "VCB") -> dbc.Card:
    """
    Build Desktop Card + Mobile Offcanvas trong 1 component.

    Desktop: Card sidebar (d-none d-lg-block)
    Mobile:  Offcanvas drawer + nút trigger (d-lg-none)
    """

    # ─── Desktop Card ──────────────────────────────────────
    desktop_card = dbc.Card(
        [
            dbc.CardHeader(
                html.H6("⚙️ Bộ Lọc", className="mb-0 text-center"),
                style={"background": "#2C2C2C", "borderBottom": "1px solid #444"},
            ),
            dbc.CardBody(
                _control_body(suffix="", compact=False),
                style={"padding": "15px"},
            ),
            # Spinner khi loading
            dcc.Loading(
                id="loading-update-desktop",
                type="dot",
                color="#2196F3",
                children=html.Div(),
                parent_style={"display": "none"},
            ),
        ],
        className="shadow-sm",
        style=_CARD_STYLE,
    )

    # ─── Mobile Offcanvas ──────────────────────────────────
    offcanvas = dbc.Offcanvas(
        [
            html.Div(
                [
                    html.H6("⚙️ Bộ Lọc", className="mb-0"),
                    dbc.Button(
                        html.I(className="fas fa-times"),
                        id="offcanvas-close",
                        color="link",
                        size="sm",
                        className="text-light ms-auto",
                        n_clicks=0,
                    ),
                ],
                className="d-flex align-items-center justify-content-between p-3",
                style={"background": "#2C2C2C", "borderBottom": "1px solid #444"},
            ),
            html.Div(
                _control_body(suffix="-offcanvas", compact=True),
                style={"padding": "12px", "overflowY": "auto", "flex": "1"},
            ),
        ],
        id=OFFCANVAS_ID,
        is_open=False,
        placement="start",
        style={"background": "#1E1E1E", "maxWidth": "400px", "width": "90vw"},
        className="d-lg-none",
        backdrop=True,
        scrollable=True,
        keyboard=True,
    )

    return html.Div([desktop_card, offcanvas])


# ╔══════════════════════════════════════════╗
# ║        CLIENTSIDE CALLBACK HELPER        ║
# ╚══════════════════════════════════════════╝

def get_offcanvas_toggle_js() -> str:
    """
    Trả về JavaScript để toggle offcanvas từ nút floating.
    Dùng clientside callback để không cần Python server roundtrip.
    """
    return f"""
    function(n) {{
        if (!n) return false;
        var offcanvasEl = document.getElementById('{OFFCANVAS_ID}');
        if (!offcanvasEl) return false;
        var bsOffcanvas = bootstrap.Offcanvas.getInstance(offcanvasEl);
        if (!bsOffcanvas) {{
            bsOffcanvas = new bootstrap.Offcanvas(offcanvasEl);
        }}
        bsOffcanvas.toggle();
        return false;
    }}
    """
