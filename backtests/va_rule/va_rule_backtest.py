"""
va_rule_backtest.py
====================
Backtest định lượng "80% Value Area Rule" (mpcore.f_check_80_rule) trên dữ liệu
thật VN30F1M khung 1 phút (MySQL market_data.ohlc_candles).

Dùng chung backtests/common/data.py (tải & làm sạch dữ liệu, loại cặp phiên
đứt gãy) và backtests/common/market_profile.py (tính TPO/POC/VAH/VAL) — xem
backtests/README.md về quy ước chung cho mọi research dạng này.

Chạy: python3 backtests/va_rule/va_rule_backtest.py
Output: backtests/va_rule/results.json (số liệu thô để viết báo cáo/artifact)
Báo cáo: docs/reports/va-rule-vn30f1m.md
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # cho phép import "common"

from common.data import load_candles, valid_consecutive_pairs
from common.market_profile import build_session_profiles

THRESHOLDS = [2, 5, 15, 30]  # số bar 1m xác nhận quay lại VA cũ
SYMBOL, TIMEFRAME = "VN30F1M", "1m"


def scan_setup(sess: dict, prev: dict, threshold: int, reset: bool) -> dict | None:
    """Trả về record tín hiệu (hoặc None nếu không có setup/không trigger)."""
    open_price = sess["open"]
    opened_above = open_price > prev["vah"]
    opened_below = open_price < prev["val"]
    if not opened_above and not opened_below:
        return None

    direction = "short" if opened_above else "long"
    bars = sess["bars"]
    n = len(bars)
    consec = 0
    trigger_idx = None
    for i in range(n):
        hi, lo = bars.at[i, "high"], bars.at[i, "low"]
        inside = (hi >= prev["val"]) and (lo <= prev["vah"])
        if reset:
            consec = consec + 1 if inside else 0
        else:
            consec = consec + 1 if inside else consec
        if consec >= threshold:
            trigger_idx = i
            break

    rec = dict(date=str(sess["date"]), direction=direction,
               open=open_price, prev_vah=prev["vah"], prev_val=prev["val"],
               prev_poc=prev["poc"], triggered=trigger_idx is not None,
               overshoot_pct=None, time_left_pct=None,
               touch_poc=False, touch_opposite=False, close_in_va=False)

    va_width = prev["vah"] - prev["val"]
    if va_width > 0:
        overshoot = (open_price - prev["vah"]) if opened_above else (prev["val"] - open_price)
        rec["overshoot_pct"] = round(overshoot / va_width * 100, 1)

    if trigger_idx is None:
        return rec

    rec["time_left_pct"] = round((n - 1 - trigger_idx) / n * 100, 1)
    rest = bars.iloc[trigger_idx + 1:]
    opposite = prev["val"] if direction == "short" else prev["vah"]
    if len(rest):
        rec["touch_poc"] = bool(((rest["low"] <= prev["poc"]) & (rest["high"] >= prev["poc"])).any())
        rec["touch_opposite"] = bool(((rest["low"] <= opposite) & (rest["high"] >= opposite)).any())
    final_close = bars.iloc[-1]["close"]
    rec["close_in_va"] = bool(prev["val"] <= final_close <= prev["vah"])
    return rec


def main():
    df = load_candles(SYMBOL, TIMEFRAME)
    sessions = build_session_profiles(df)
    print(f"Tổng số phiên: {len(sessions)}  ({sessions[0]['date']} -> {sessions[-1]['date']})")

    dates = [s["date"] for s in sessions]
    valid_pairs = valid_consecutive_pairs(dates, max_gap_days=4)

    results = {"n_sessions": len(sessions), "n_gap_excluded_pairs": len(sessions) - 1 - len(valid_pairs),
               "by_variant": {}}

    # Baseline: tỉ lệ đóng phiên trong VA phiên trước, KHÔNG điều kiện setup gì cả
    baseline_hits = sum(
        1 for i in valid_pairs
        if sessions[i - 1]["val"] <= sessions[i]["close"] <= sessions[i - 1]["vah"]
    )
    results["baseline_close_in_prev_va_pct"] = round(baseline_hits / len(valid_pairs) * 100, 1)

    variants = [("reset_2", 2, True), ("cumulative_2_current_code", 2, False),
                ("reset_5", 5, True), ("reset_15", 15, True), ("reset_30", 30, True)]

    for name, threshold, reset in variants:
        records = []
        for i in valid_pairs:
            rec = scan_setup(sessions[i], sessions[i - 1], threshold, reset)
            if rec is not None:
                records.append(rec)

        n_setup = len(records)
        triggered = [r for r in records if r["triggered"]]
        n_trig = len(triggered)
        n_close = sum(r["close_in_va"] for r in triggered)
        n_poc = sum(r["touch_poc"] for r in triggered)
        n_opp = sum(r["touch_opposite"] for r in triggered)

        def pct(a, b):
            return round(a / b * 100, 1) if b else None

        results["by_variant"][name] = dict(
            threshold=threshold, reset=reset,
            n_setup_days=n_setup, n_triggered=n_trig,
            trigger_rate_pct=pct(n_trig, n_setup),
            win_close_in_va_pct=pct(n_close, n_trig),
            win_touch_poc_pct=pct(n_poc, n_trig),
            win_touch_opposite_pct=pct(n_opp, n_trig),
            by_direction={}, by_overshoot_bucket={}, by_time_left_bucket={},
        )

        for d in ("short", "long"):
            sub = [r for r in triggered if r["direction"] == d]
            results["by_variant"][name]["by_direction"][d] = dict(
                n=len(sub),
                win_close_in_va_pct=pct(sum(r["close_in_va"] for r in sub), len(sub)),
                win_touch_poc_pct=pct(sum(r["touch_poc"] for r in sub), len(sub)),
            )

        for lo, hi in [(0, 20), (20, 40), (40, 70), (70, 1e9)]:
            sub = [r for r in triggered if r["overshoot_pct"] is not None and lo <= r["overshoot_pct"] < hi]
            key = f"{lo}-{hi if hi < 1e9 else 'inf'}%"
            results["by_variant"][name]["by_overshoot_bucket"][key] = dict(
                n=len(sub),
                win_close_in_va_pct=pct(sum(r["close_in_va"] for r in sub), len(sub)),
                win_touch_poc_pct=pct(sum(r["touch_poc"] for r in sub), len(sub)),
            )

        for lo, hi in [(0, 30), (30, 60), (60, 100)]:
            sub = [r for r in triggered if r["time_left_pct"] is not None and lo <= r["time_left_pct"] < hi]
            key = f"{lo}-{hi}%"
            results["by_variant"][name]["by_time_left_bucket"][key] = dict(
                n=len(sub),
                win_close_in_va_pct=pct(sum(r["close_in_va"] for r in sub), len(sub)),
                win_touch_poc_pct=pct(sum(r["touch_poc"] for r in sub), len(sub)),
            )

        if name == "reset_2":
            results["sample_records_reset_2"] = records[:5] + records[-5:]

    out_path = Path(__file__).parent / "results.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2, default=str)
    print(f"Đã lưu kết quả: {out_path}")
    print(json.dumps(results["by_variant"], ensure_ascii=False, indent=2, default=str))


if __name__ == "__main__":
    main()
