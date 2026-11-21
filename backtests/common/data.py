"""
data.py — Tải & làm sạch dữ liệu OHLC dùng chung cho mọi research/backtest
===========================================================================
Kết nối cùng DB `market_data` mà dashboard Python (python/db.py) dùng, nhưng
tách riêng cho backtests/ để không phụ thuộc venv của dashboard (vốn không
cần cho các script phân tích chạy 1 lần).

Yêu cầu: pandas, numpy, mysql-connector-python (có sẵn trên python3 hệ thống;
xem backtests/README.md).
"""

import math
import os
from typing import Optional

import mysql.connector
import pandas as pd


def _db_config() -> dict:
    """Đọc cấu hình DB từ biến môi trường MARKET_DATA_DB_URL (giống python/db.py)."""
    url = os.getenv("MARKET_DATA_DB_URL")
    if not url:
        raise RuntimeError(
            "Thiếu biến môi trường MARKET_DATA_DB_URL. Set trước khi chạy, ví dụ:\n"
            "  export MARKET_DATA_DB_URL='mysql+aiomysql://<user>:<password>@localhost:3306/market_data'\n"
            "(không commit giá trị thật của biến này vào git)"
        )
    if "://" in url:
        url = url.split("://", 1)[1]
    auth, host_db = url.split("@", 1)
    user, pwd = auth.split(":", 1)
    host_port, db_name = host_db.split("/", 1)
    host, port = host_port.split(":", 1) if ":" in host_port else (host_port, "3306")
    return dict(host=host, port=int(port), user=user, password=pwd, database=db_name)


def load_candles(
    symbol: str,
    timeframe: str,
    start: Optional[str] = None,
    end: Optional[str] = None,
    drop_bad_prices: bool = True,
) -> pd.DataFrame:
    """
    Tải nến OHLC từ MySQL `ohlc_candles`.

    Args:
        symbol, timeframe: VD "VN30F1M", "1m".
        start, end: "YYYY-MM-DD" (None = lấy toàn bộ lịch sử có trong DB).
        drop_bad_prices: loại các nến có open/high/low/close <= 0 (lỗi feed đã
            gặp ở VN30F1M — nến ATO 08:45 một số ngày có open=0). In số lượng
            nến bị loại ra stdout để minh bạch.

    Returns: DataFrame cột bar_time, open, high, low, close[, volume],
        đã thêm cột session_date (date của bar_time — KHÔNG đổi timezone, chỉ
        đúng khi phiên giao dịch không vắt qua nửa đêm UTC, như VN30F1M).
    """
    conn = mysql.connector.connect(**_db_config())
    where = ["symbol = %(symbol)s", "timeframe = %(timeframe)s"]
    params = {"symbol": symbol, "timeframe": timeframe}
    if start:
        where.append("bar_time >= %(start)s")
        params["start"] = start
    if end:
        where.append("bar_time <= %(end)s")
        params["end"] = end
    query = f"""
        SELECT bar_time, open, high, low, close, volume
        FROM ohlc_candles
        WHERE {' AND '.join(where)}
        ORDER BY bar_time ASC
    """
    df = pd.read_sql(query, conn, params=params)
    conn.close()

    df["bar_time"] = pd.to_datetime(df["bar_time"])

    if drop_bad_prices:
        n_before = len(df)
        df = df[(df["open"] > 0) & (df["high"] > 0) & (df["low"] > 0) & (df["close"] > 0)].copy()
        n_dropped = n_before - len(df)
        if n_dropped:
            print(f"[data] Loại {n_dropped} nến lỗi giá (<=0) trên {symbol}/{timeframe}.")

    df["session_date"] = df["bar_time"].dt.date
    return df.reset_index(drop=True)


def session_groups(df: pd.DataFrame) -> list[tuple]:
    """Gom DataFrame nến thành list[(session_date, bars_df)], sort theo ngày tăng dần."""
    return [(d, g.sort_values("bar_time").reset_index(drop=True))
            for d, g in df.groupby("session_date")]


def valid_consecutive_pairs(dates: list, max_gap_days: int = 4) -> list[int]:
    """
    Trả về danh sách index i (1-based trong `dates`) sao cho dates[i] và dates[i-1]
    là 2 phiên THẬT liên tiếp (khoảng cách lịch <= max_gap_days — đủ bao trùm
    nghỉ cuối tuần/lễ dài, nhưng loại các đoạn dữ liệu bị đứt gãy nhiều ngày).

    Dùng cho MỌI research so sánh "phiên hiện tại vs phiên liền trước" — tránh
    lỗi tính nhầm do nguồn dữ liệu 1m bị thiếu một số phiên (đã gặp ở VN30F1M,
    xem docs/reports/va-rule-vn30f1m.md mục 2).
    """
    out = []
    n_excluded = 0
    for i in range(1, len(dates)):
        gap = (dates[i] - dates[i - 1]).days
        if gap > max_gap_days:
            n_excluded += 1
            continue
        out.append(i)
    if n_excluded:
        print(f"[data] Loại {n_excluded} cặp phiên do đứt gãy dữ liệu (gap > {max_gap_days} ngày).")
    return out
