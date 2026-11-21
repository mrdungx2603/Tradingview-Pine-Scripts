"""
market_profile.py — Tính Market Profile (TPO/POC/VAH/VAL) bằng Python
========================================================================
Tái tạo ĐÚNG thuật toán trong libraries/market_profile_core.pine
(f_add_bar_tpo, f_calc_poc, f_calc_value_area) để mọi research dựa trên
Market Profile dùng chung 1 cách tính duy nhất, khớp với indicator thật
đang chạy trên TradingView (indicators/market_profile.pine).

Tham số mặc định khớp default của indicators/market_profile.pine:
    tpo_period_min = 30   (chuẩn CBOT)
    va_pct         = 0.70
    price_step     = 0.1
"""

import math

import pandas as pd

TPO_PERIOD_MIN = 30
VA_PCT = 0.70
PRICE_STEP = 0.1


def calc_profile(
    bars: pd.DataFrame,
    tpo_period_min: int = TPO_PERIOD_MIN,
    va_pct: float = VA_PCT,
    price_step: float = PRICE_STEP,
) -> dict:
    """
    Tính POC/VAH/VAL cho 1 phiên từ DataFrame nến trong phiên đó (cột
    bar_time, open, high, low, close — đã sort theo thời gian tăng dần).

    Trả về dict: poc, vah, val, sess_high, sess_low, open, close, n_bars.
    """
    bt = bars["bar_time"]
    period_key = (bt.dt.hour * 60 + bt.dt.minute) // tpo_period_min
    counts: dict[int, int] = {}
    for _, grp in bars.groupby(period_key):
        row_lo = int(math.floor(grp["low"].min() / price_step))
        row_hi = int(math.floor(grp["high"].max() / price_step))
        for r in range(row_lo, row_hi + 1):
            counts[r] = counts.get(r, 0) + 1

    rows = sorted(counts.keys())
    sess_high = bars["high"].max()
    sess_low = bars["low"].min()
    mid_row = ((sess_high + sess_low) / 2.0) / price_step - 0.5

    # POC: TPO count cao nhất, tie-break ưu tiên hàng gần giá giữa phiên nhất
    poc_row = rows[0]
    max_tpo = -1
    for r in rows:
        c = counts[r]
        if c > max_tpo:
            max_tpo, poc_row = c, r
        elif c == max_tpo and abs(r - mid_row) < abs(poc_row - mid_row):
            poc_row = r

    total_tpo = sum(counts.values())
    target_va = round(total_tpo * va_pct)
    cur_va = counts[poc_row]
    up_idx = dn_idx = poc_row
    row_min, row_max = rows[0], rows[-1]
    while cur_va < target_va and (up_idx < row_max or dn_idx > row_min):
        up_tpo = counts.get(up_idx + 1, -1) if up_idx < row_max else -1
        dn_tpo = counts.get(dn_idx - 1, -1) if dn_idx > row_min else -1
        if up_tpo >= dn_tpo and up_idx < row_max:
            up_idx += 1
            cur_va += up_tpo
        elif dn_idx > row_min:
            dn_idx -= 1
            cur_va += dn_tpo

    return dict(
        poc=round((poc_row + 0.5) * price_step, 4),
        vah=round((up_idx + 1.0) * price_step, 4),
        val=round(dn_idx * price_step, 4),
        sess_high=sess_high, sess_low=sess_low,
        open=bars.iloc[0]["open"], close=bars.iloc[-1]["close"],
        n_bars=len(bars),
    )


def build_session_profiles(df: pd.DataFrame, **profile_kwargs) -> list[dict]:
    """
    Nhận DataFrame nến nhiều phiên (cột session_date — xem backtests/common/data.py)
    và trả về list[dict] mỗi phần tử là 1 phiên: {..._calc_profile fields, date, bars}.
    `bars` giữ lại DataFrame gốc của phiên đó để caller tự quét thêm (vd: scan tín
    hiệu intraday) mà không phải tải lại dữ liệu.
    """
    out = []
    for d, grp in df.groupby("session_date"):
        grp = grp.sort_values("bar_time").reset_index(drop=True)
        prof = calc_profile(grp, **profile_kwargs)
        prof["date"] = d
        prof["bars"] = grp
        out.append(prof)
    return out
