"""
db.py — Database Layer
=======================
Kết nối MySQL, truy vấn dữ liệu OHLC candles cho SMC Dashboard.

Schema bảng ohlc_candles:
    id, symbol, timeframe, bar_time, open, high, low, close, volume, created_at
"""

import os
from datetime import date
from typing import Optional

import mysql.connector
from mysql.connector import pooling
import pandas as pd
from sqlalchemy import create_engine


class CandleDB:
    """Quản lý kết nối và truy vấn MySQL cho dữ liệu nến."""

    _instance: Optional["CandleDB"] = None
    _pool: Optional[pooling.MySQLConnectionPool] = None
    _sql_engine = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if self._pool is None:
            self._create_pool()

    def _create_pool(self):
        """Tạo connection pool MySQL."""
        db_url = os.getenv(
            "MARKET_DATA_DB_URL",
            "mysql+aiomysql://market_data:market_data_pass@localhost:3306/market_data",
        )
        # Parse URL: mysql+aiomysql://user:pass@host:port/db
        # Hoặc format: mysql://user:pass@host:port/db
        url = db_url
        if "://" in url:
            url = url.split("://", 1)[1]  # Bỏ scheme
        if "@" in url:
            auth, host_db = url.split("@", 1)
            user, pwd = auth.split(":", 1)
            host_port, db_name = host_db.split("/", 1)
            if ":" in host_port:
                host, port = host_port.split(":", 1)
            else:
                host, port = host_port, "3306"
        else:
            # Fallback
            user, pwd = "market_data", "market_data_pass"
            host, port = "localhost", "3306"
            db_name = "market_data"

        self._pool = pooling.MySQLConnectionPool(
            pool_name="smc_pool",
            pool_size=3,
            host=host,
            port=int(port),
            user=user,
            password=pwd,
            database=db_name,
            charset="utf8mb4",
            use_unicode=True,
        )
        # SQLAlchemy engine cho pandas.read_sql
        self._sql_engine = create_engine(
            f"mysql+mysqlconnector://{user}:{pwd}@{host}:{port}/{db_name}",
            pool_recycle=3600,
        )

    def get_connection(self):
        """Lấy connection từ pool."""
        return self._pool.get_connection()

    # ─── Query Dữ Liệu Candle ───────────────────────────────────

    def get_candles(
        self,
        symbol: str,
        timeframe: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> pd.DataFrame:
        """
        Lấy dữ liệu OHLC từ MySQL.

        Args:
            symbol: Mã chứng khoán (VD: "VCB", "FPT")
            timeframe: Khung thời gian (VD: "1d", "1m")
            start_date: Ngày bắt đầu "YYYY-MM-DD" (None = 1 năm trước)
            end_date: Ngày kết thúc "YYYY-MM-DD" (None = hôm nay)

        Returns:
            DataFrame với cột: bar_time, open, high, low, close, volume
            Sắp xếp theo bar_time ASC.
        """
        if start_date is None:
            start_date = (date.today().replace(year=date.today().year - 1)).isoformat()
        if end_date is None:
            end_date = (date.today()).isoformat() + " 23:59:59"

        query = """
            SELECT bar_time, open, high, low, close, volume
            FROM ohlc_candles
            WHERE symbol = %(symbol)s
              AND timeframe = %(timeframe)s
              AND bar_time BETWEEN %(start)s AND %(end)s
            ORDER BY bar_time ASC
        """
        df = pd.read_sql(
            query,
            self._sql_engine,
            params={
                "symbol": symbol,
                "timeframe": timeframe,
                "start": start_date,
                "end": end_date,
            },
        )
        df["bar_time"] = pd.to_datetime(df["bar_time"])
        df = df.set_index("bar_time")
        return df

    # ─── Danh Sách Mã / Timeframe ────────────────────────────────

    def get_available_symbols(
        self, timeframe: Optional[str] = "1d"
    ) -> list[dict]:
        """
        Lấy danh sách mã chứng khoán có dữ liệu.

        Args:
            timeframe: Lọc theo timeframe (None = tất cả)

        Returns:
            List[dict] với keys: code, name, exchange, candle_count
        """
        conn = self.get_connection()
        try:
            cursor = conn.cursor(dictionary=True)
            if timeframe:
                cursor.execute(
                    """
                    SELECT
                        o.symbol AS code,
                        COALESCE(s.name, o.symbol) AS name,
                        COALESCE(s.exchange, '') AS exchange,
                        COUNT(*) AS candle_count
                    FROM ohlc_candles o
                    LEFT JOIN symbols s ON o.symbol = s.code
                    WHERE o.timeframe = %s
                      AND LENGTH(o.symbol) <= 3
                    GROUP BY o.symbol, s.name, s.exchange
                    ORDER BY o.symbol ASC
                    """,
                    (timeframe,),
                )
            else:
                cursor.execute(
                    """
                    SELECT
                        o.symbol AS code,
                        COALESCE(s.name, o.symbol) AS name,
                        COALESCE(s.exchange, '') AS exchange,
                        COUNT(*) AS candle_count
                    FROM ohlc_candles o
                    LEFT JOIN symbols s ON o.symbol = s.code
                    WHERE LENGTH(o.symbol) <= 3
                    GROUP BY o.symbol, s.name, s.exchange
                    ORDER BY o.symbol ASC
                    """
                )
            return cursor.fetchall()
        finally:
            conn.close()

    def get_available_timeframes(self, symbol: str) -> list[str]:
        """
        Lấy danh sách timeframe có dữ liệu cho 1 mã.

        Returns:
            List[str] VD: ["1d", "1m"]
        """
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT DISTINCT timeframe
                FROM ohlc_candles
                WHERE symbol = %s
                ORDER BY
                    CASE timeframe
                        WHEN '1m' THEN 1
                        WHEN '5m' THEN 2
                        WHEN '15m' THEN 3
                        WHEN '30m' THEN 4
                        WHEN '1h' THEN 5
                        WHEN '4h' THEN 6
                        WHEN '1d' THEN 7
                        WHEN '1w' THEN 8
                        ELSE 99
                    END
                """,
                (symbol,),
            )
            return [row[0] for row in cursor.fetchall()]
        finally:
            conn.close()
