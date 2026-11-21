"""
chart_view.py — Plotly Chart Builder
======================================
Tạo biểu đồ candlestick + SMC annotations (BoS, CHoCH, HH/HL/LL/LH) + Volume.

Layout:
  - Row 1 (60%): Candlestick + SMC shapes/annotations
  - Row 2 (15%): Volume bars
  - Dashboard overlay ở góc trên phải
"""

import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from smc_engine import SMCResult, BoSEvent, CHoCHEvent, StructLabel

# ╔══════════════════════════════════════════╗
# ║           COLOR CONSTANTS               ║
# ╚══════════════════════════════════════════╝

BOS_BULL_COLOR = "#2196F3"   # Blue
BOS_BEAR_COLOR = "#F44336"   # Red
CHOCH_COLOR = "#FF9800"      # Orange
HH_COLOR = "#2196F3"         # Blue
HL_COLOR = "#2196F3"         # Blue
LL_COLOR = "#F44336"         # Red
LH_COLOR = "#F44336"         # Red
VOL_UP_COLOR = "rgba(0, 150, 136, 0.5)"
VOL_DOWN_COLOR = "rgba(244, 67, 54, 0.5)"


def build_chart(
    df: pd.DataFrame,
    smc_result: SMCResult,
    title: str = "SMC Market Structure",
    show_bos: bool = True,
    show_choch: bool = True,
    show_labels: bool = True,
) -> go.Figure:
    """
    Tạo Plotly figure với candlestick + SMC annotations + volume.

    Args:
        df: DataFrame với cột open, high, low, close, volume, index = bar_time
        smc_result: Kết quả từ SMCEngine.process()
        title: Tiêu đề biểu đồ
        show_bos: Hiển thị BoS lines
        show_choch: Hiển thị CHoCH lines
        show_labels: Hiển thị Label HH/HL/LL/LH

    Returns:
        plotly.graph_objects.Figure
    """
    n_bars = len(df)

    # ─── Subplot Layout ─────────────────────────────────────
    fig = make_subplots(
        rows=2, cols=1,
        row_heights=[0.75, 0.25],
        shared_xaxes=True,
        vertical_spacing=0.02,
        subplot_titles=None,
    )

    # ─── Row 1: Candlestick ─────────────────────────────────
    fig.add_trace(
        go.Candlestick(
            x=df.index,
            open=df["open"],
            high=df["high"],
            low=df["low"],
            close=df["close"],
            name="Price",
            increasing_line_color="#00E676",
            decreasing_line_color="#FF1744",
            increasing_fillcolor="rgba(0, 230, 118, 0.4)",
            decreasing_fillcolor="rgba(255, 23, 68, 0.4)",
            showlegend=False,
        ),
        row=1, col=1,
    )

    # ─── Row 2: Volume ──────────────────────────────────────
    volume_colors = [
        VOL_UP_COLOR if df["close"].iloc[i] >= df["open"].iloc[i]
        else VOL_DOWN_COLOR
        for i in range(n_bars)
    ]
    fig.add_trace(
        go.Bar(
            x=df.index,
            y=df["volume"],
            name="Volume",
            marker_color=volume_colors,
            showlegend=False,
        ),
        row=2, col=1,
    )

    # ─── SMC Overlays (Row 1) ───────────────────────────────
    y_min = df["low"].min()
    y_max = df["high"].max()
    y_range = y_max - y_min
    y_padding = y_range * 0.05  # Base padding cho label đầu tiên

    # Đếm label trên mỗi bar để offset không chồng lấn
    # Key = (bar_idx, is_high) — tách riêng label trên và dưới
    label_offsets = {}  # {(bar_idx, is_high): offset_multiplier}

    # BoS lines
    if show_bos and smc_result.bos_events:
        for evt in smc_result.bos_events:
            color = BOS_BULL_COLOR if evt.is_bull else BOS_BEAR_COLOR
            _add_hline(fig, evt.start_idx, evt.end_idx, evt.level,
                       color, "solid", 1.5, df.index)

    # CHoCH lines
    if show_choch and smc_result.choch_events:
        for evt in smc_result.choch_events:
            _add_hline(fig, evt.start_idx, evt.end_idx, evt.level,
                       CHOCH_COLOR, "dash", 1.5, df.index)

    # Structure Labels (HH/HL/LL/LH) — có xử lý offset tránh chồng lấn
    if show_labels and smc_result.struct_labels:
        for lbl in smc_result.struct_labels:
            key = (lbl.bar_idx, lbl.is_high)
            offset_idx = label_offsets.get(key, 0)
            _add_label(fig, lbl, df, y_padding, offset_idx, y_range)
            label_offsets[key] = offset_idx + 1

    # ─── Dashboard Overlay (Annotation) ────────────────────
    _add_dashboard_overlay(fig, smc_result, df)

    # ─── Layout Styling ────────────────────────────────────
    fig.update_layout(
        title=dict(
            text=f"<b>{title}</b>",
            font=dict(size=14, color="#E0E0E0"),
            x=0.5,
            xanchor="center",
        ),
        template="plotly_dark",
        paper_bgcolor="#1E1E1E",
        plot_bgcolor="#1E1E1E",
        font=dict(color="#E0E0E0", size=11),
        hovermode="x unified",
        margin=dict(l=5, r=5, t=40, b=5),
        dragmode="pan",
        xaxis=dict(
            rangeslider=dict(visible=False),
            type="category",
            showgrid=True,
            gridcolor="rgba(128,128,128,0.15)",
            title=None,
        ),
        yaxis=dict(
            title=None,
            showgrid=True,
            gridcolor="rgba(128,128,128,0.15)",
            fixedrange=False,
            tickfont=dict(size=10),
        ),
        xaxis2=dict(
            showgrid=True,
            gridcolor="rgba(128,128,128,0.15)",
            title=None,
        ),
        yaxis2=dict(
            title=None,
            showgrid=False,
            fixedrange=True,
            tickfont=dict(size=9),
        ),
        legend=dict(
            x=0.01, y=0.99,
            bgcolor="rgba(0,0,0,0.3)",
            bordercolor="rgba(128,128,128,0.3)",
            font=dict(size=10),
        ),
    )

    return fig


def _add_hline(
    fig: go.Figure,
    start_idx: int,
    end_idx: int,
    level: float,
    color: str,
    dash: str,
    width: float,
    index,
):
    """Vẽ line ngang nối 2 điểm trên trục x (bar index → datetime)."""
    if start_idx >= len(index) or end_idx >= len(index):
        return
    x0 = index[start_idx]
    x1 = index[end_idx]
    fig.add_shape(
        type="line",
        x0=x0, x1=x1,
        y0=level, y1=level,
        line=dict(color=color, width=width, dash=dash),
        xref="x", yref="y",
    )


def _add_label(
    fig: go.Figure,
    lbl: StructLabel,
    df: pd.DataFrame,
    base_padding: float,
    offset_idx: int = 0,
    y_range: float = 0,
):
    """
    Thêm annotation HH/HL/LL/LH với offset để tránh chồng lấn.

    Khi nhiều label cùng bar_idx và cùng phía (trên/dưới),
    mỗi label sau sẽ bị đẩy xa hơn bởi `base_padding * (offset_idx + 1)`.
    """
    if lbl.bar_idx >= len(df):
        return
    x_pos = df.index[lbl.bar_idx]

    # Khoảng cách đẩy: label đầu tiên = base_padding, label thứ 2 = 2x, ...
    step_padding = base_padding * (offset_idx + 1)

    # Thêm margin nhỏ để label không dính sát nến khi bị đẩy xa
    extra_margin = base_padding * 0.3

    if lbl.is_high:
        # Label cho đỉnh (HH/LH) → đặt phía trên high
        y_pos = df["high"].iloc[lbl.bar_idx] + step_padding + extra_margin
        yanchor = "bottom"
    else:
        # Label cho đáy (HL/LL) → đặt phía dưới low
        y_pos = df["low"].iloc[lbl.bar_idx] - step_padding - extra_margin
        yanchor = "top"

    color = HH_COLOR if lbl.is_bull else LL_COLOR

    # Giảm font size nếu bị đẩy xa (label thứ 2 trở đi)
    font_size = 10 if offset_idx == 0 else 9

    fig.add_annotation(
        x=x_pos,
        y=y_pos,
        text=f"<b>{lbl.text}</b>",
        showarrow=False,
        font=dict(size=font_size, color="white"),
        bgcolor=color,
        bordercolor=color,
        borderwidth=1,
        borderpad=2,
        opacity=0.9,
        yanchor=yanchor,
        xanchor="center",
    )


def _add_dashboard_overlay(
    fig: go.Figure,
    smc_result: SMCResult,
    df: pd.DataFrame,
):
    """Thêm bảng Dashboard SMC dạng annotation ở góc trên phải."""
    trend_text = (
        "BULLISH" if smc_result.final_trend == 1
        else "BEARISH" if smc_result.final_trend == -1
        else "WAIT"
    )
    trend_color = "#4CAF50" if smc_result.final_trend == 1 else \
                  "#F44336" if smc_result.final_trend == -1 else "#9E9E9E"

    if smc_result.final_trend == 1:
        swing_high_label = "HH Price"
        swing_low_label = "HL Price"
    else:
        swing_high_label = "LH Price"
        swing_low_label = "LL Price"

    sh = smc_result.final_swing_high or 0
    sl = smc_result.final_swing_low or 0
    pct = smc_result.final_pos_pct or 0

    # Màu cho vị trí Premium/Discount
    if smc_result.final_trend == 1:
        pos_color = "#4CAF50" if pct > 50 else "#F44336"
    elif smc_result.final_trend == -1:
        pos_color = "#F44336" if pct > 50 else "#4CAF50"
    else:
        pos_color = "#9E9E9E"

    dashboard_text = (
        f"<b>SMC</b> | <span style='color:{trend_color}'><b>{trend_text}</b></span><br>"
        f"{swing_high_label}:{sh:,.1f}  {swing_low_label}:{sl:,.1f}<br>"
        f"Swing: <span style='color:{pos_color}'><b>{pct:.1f}%</b></span>"
    )

    fig.add_annotation(
        x=1.0,
        y=1.0,
        xref="paper",
        yref="paper",
        text=dashboard_text,
        showarrow=False,
        font=dict(size=10, color="#E0E0E0", family="monospace"),
        bgcolor="rgba(20, 20, 20, 0.8)",
        bordercolor="rgba(128, 128, 128, 0.4)",
        borderwidth=1,
        borderpad=6,
        align="left",
        xanchor="right",
        yanchor="top",
    )
