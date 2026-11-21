"""
smc_engine.py — SMC Market Structure State Machine
====================================================
Dịch chính xác thuật toán từ Pine Script:
  indicators/smc_market_structure.pine (v1.2)

Phát hiện:
  - Cấu trúc xu hướng: HH (Higher High), HL (Higher Low), LL (Lower Low), LH (Lower High)
  - Break of Structure (BoS) — phá vỡ cùng chiều xu hướng
  - Change of Character (CHoCH) — phá vỡ ngược chiều, tín hiệu đảo xu hướng

Hai chế độ Seed:
  - Pivot Seed: Dùng ta.pivothigh/pivotlow để khởi tạo cấu trúc ban đầu
  - Session Seed: Dùng bar đầu phiên làm tham chiếu, chờ breakout xác định trend
"""

import numpy as np
import pandas as pd
from dataclasses import dataclass, field
from typing import Optional


# ╔══════════════════════════════════════════╗
# ║           DATA CLASSES                   ║
# ╚══════════════════════════════════════════╝

@dataclass
class BoSEvent:
    """Break of Structure event."""
    start_idx: int        # Index trong DataFrame (trigger_bar)
    end_idx: int          # Index xác nhận
    level: float          # Mức giá bị phá vỡ
    is_bull: bool         # True = BoS tăng, False = BoS giảm


@dataclass
class CHoCHEvent:
    """Change of Character event."""
    start_idx: int
    end_idx: int
    level: float
    is_bull_to_bear: bool  # True = Uptrend → Downtrend


@dataclass
class StructLabel:
    """Label cấu trúc HH/HL/LL/LH."""
    bar_idx: int
    text: str              # "HH", "HL", "LL", "LH"
    is_bull: bool
    is_high: bool          # True = label ở dưới bar (đỉnh), False = ở trên bar (đáy)


@dataclass
class SMCResult:
    """Kết quả sau khi chạy SMC engine."""
    bos_events: list[BoSEvent] = field(default_factory=list)
    choch_events: list[CHoCHEvent] = field(default_factory=list)
    struct_labels: list[StructLabel] = field(default_factory=list)
    trend_history: list[dict] = field(default_factory=list)
    final_trend: int = 0
    final_swing_high: Optional[float] = None
    final_swing_low: Optional[float] = None
    final_pos_pct: Optional[float] = None


# ╔══════════════════════════════════════════╗
# ║     HELPER: PIVOT DETECTION             ║
# ╚══════════════════════════════════════════╝

def find_pivothigh(high_series: np.ndarray, i: int, length: int) -> bool:
    """
    Kiểm tra bar i có phải pivot high không.
    Cần 'length' bar bên trái và bên phải có high thấp hơn.
    Tương đương ta.pivothigh(length, length) trong Pine Script.
    """
    n = len(high_series)
    if i < length or i >= n - length:
        return False
    h = high_series[i]
    for j in range(i - length, i + length + 1):
        if j == i:
            continue
        if high_series[j] >= h:
            return False
    return True


def find_pivotlow(low_series: np.ndarray, i: int, length: int) -> bool:
    """
    Kiểm tra bar i có phải pivot low không.
    Cần 'length' bar bên trái và bên phải có low cao hơn.
    """
    n = len(low_series)
    if i < length or i >= n - length:
        return False
    l = low_series[i]
    for j in range(i - length, i + length + 1):
        if j == i:
            continue
        if low_series[j] <= l:
            return False
    return True


# ╔══════════════════════════════════════════╗
# ║     HELPER: SESSION DETECTION           ║
# ╚══════════════════════════════════════════╝

def is_new_session(df: pd.DataFrame, i: int, timeframe: str) -> bool:
    """
    Phát hiện bar đầu tiên của phiên giao dịch mới.

    Với CK Việt Nam và timeframe intraday:
    - Nếu bar_time.date() khác bar trước đó → session mới
    - Với daily: mỗi bar là 1 session mới
    """
    if i == 0:
        return True
    if timeframe in ("1d", "1w"):
        return True  # Mỗi bar daily/weekly là 1 session mới

    current_date = df.index[i].date()
    prev_date = df.index[i - 1].date()
    return current_date != prev_date


# ╔══════════════════════════════════════════╗
# ║           SMC ENGINE                     ║
# ╚══════════════════════════════════════════╝

class SMCEngine:
    """
    State machine SMC — dịch chính xác từ Pine Script.

    Parameters
    ----------
    seed_mode : str
        "pivot" = Pivot Seed, "session" = Session Seed
    pivot_length : int
        Số bar trái/phải để xác định pivot (2-50)
    """

    def __init__(
        self,
        seed_mode: str = "pivot",
        pivot_length: int = 5,
    ):
        if seed_mode not in ("pivot", "session"):
            raise ValueError(f"seed_mode phải là 'pivot' hoặc 'session', nhận: {seed_mode}")
        self.seed_mode = seed_mode
        self.pivot_length = pivot_length

        # State variables (giống Pine Script var)
        self._reset_state()

    def _reset_state(self):
        """Reset toàn bộ state (dùng khi bắt đầu hoặc session mới)."""
        self.trend = 0         # 1 = UPTREND, -1 = DOWNTREND, 0 = INIT
        self.hh_bar = None
        self.hh_price = None
        self.hl_bar = None
        self.hl_price = None
        self.ll_bar = None
        self.ll_price = None
        self.lh_bar = None
        self.lh_price = None
        self.cand_bar = None
        self.cand_high = None
        self.cand_low = None
        self.cand_type = 0     # 1 = săn HH, -1 = săn LL, 0 = idle
        self.trigger_bar = None
        self.seeded = False

    # ─── Main Process ─────────────────────────────────────────

    def process(self, df: pd.DataFrame) -> SMCResult:
        """
        Chạy state machine bar-by-bar trên DataFrame.

        Args:
            df: DataFrame với index là bar_time, cột: open, high, low, close, volume

        Returns:
            SMCResult chứa tất cả events và final state.
        """
        n = len(df)
        high_arr = df["high"].values
        low_arr = df["low"].values
        close_arr = df["close"].values
        timeframe = self._guess_timeframe(df)

        self._reset_state()
        result = SMCResult()

        # ─── Step 1: Seeding ──────────────────────────────────
        if self.seed_mode == "pivot":
            self._seed_pivot(high_arr, low_arr)
        else:
            self._seed_session(high_arr, low_arr, 0)

        # ─── Step 2: State Machine (bar by bar) ───────────────
        # Bắt đầu từ bar đã seeded hoặc từ đầu nếu chưa seeded
        start_bar = max(self.hh_bar or 0, self.ll_bar or 0)

        for i in range(start_bar + 1, n):
            # Session Seed: kiểm tra session mới → reset
            if self.seed_mode == "session":
                if is_new_session(df, i, timeframe):
                    self._seed_session(high_arr, low_arr, i)
                    continue

            self._run_state_machine(i, high_arr, low_arr, close_arr, result)
            # Lưu trend history
            result.trend_history.append({
                "bar_idx": i,
                "trend": self.trend,
                "hh_price": self.hh_price,
                "hl_price": self.hl_price,
                "ll_price": self.ll_price,
                "lh_price": self.lh_price,
            })

        # ─── Step 3: Final state (Dashboard) ──────────────────
        if self.trend == 1:
            result.final_swing_high = self.hh_price
            result.final_swing_low = self.hl_price
        elif self.trend == -1:
            result.final_swing_high = self.lh_price
            result.final_swing_low = self.ll_price
        else:
            result.final_swing_high = self.hh_price
            result.final_swing_low = self.ll_price

        result.final_trend = self.trend

        # Tính % vị trí trong Swing (Premium/Discount)
        if (
            result.final_swing_high is not None
            and result.final_swing_low is not None
        ):
            swing_range = result.final_swing_high - result.final_swing_low
            if swing_range != 0:
                raw_pct = ((close_arr[-1] - result.final_swing_low) / swing_range) * 100
                if self.trend == 1:
                    result.final_pos_pct = 100 - raw_pct
                else:
                    result.final_pos_pct = raw_pct

        return result

    def _guess_timeframe(self, df: pd.DataFrame) -> str:
        """Đoán timeframe từ DataFrame."""
        if len(df) < 2:
            return "1d"
        diff = (df.index[1] - df.index[0]).total_seconds()
        if diff <= 60:
            return "1m"
        elif diff <= 300:
            return "5m"
        elif diff <= 900:
            return "15m"
        elif diff <= 1800:
            return "30m"
        elif diff <= 3600:
            return "1h"
        elif diff <= 14400:
            return "4h"
        elif diff <= 86400:
            return "1d"
        return "1w"

    # ─── Seeding Logic ────────────────────────────────────────

    def _seed_pivot(self, high_arr: np.ndarray, low_arr: np.ndarray):
        """Pivot Seed: Duyệt tìm pivot đầu tiên để xác định trend ban đầu."""
        n = len(high_arr)
        last_ph_bar = None
        last_ph_val = None
        last_pl_bar = None
        last_pl_val = None

        for i in range(self.pivot_length, n - self.pivot_length):
            if find_pivothigh(high_arr, i, self.pivot_length):
                last_ph_bar = i
                last_ph_val = high_arr[i]
            if find_pivotlow(low_arr, i, self.pivot_length):
                last_pl_bar = i
                last_pl_val = low_arr[i]

            # Khi có đủ cả 2 pivot → xác định trend
            if (
                last_ph_bar is not None
                and last_pl_bar is not None
            ):
                if last_ph_bar > last_pl_bar:
                    # High xuất hiện sau Low → Uptrend
                    self.trend = 1
                    self.hh_bar = last_ph_bar
                    self.hh_price = last_ph_val
                    self.hl_bar = last_pl_bar
                    self.hl_price = last_pl_val
                else:
                    # Low xuất hiện sau High → Downtrend
                    self.trend = -1
                    self.ll_bar = last_pl_bar
                    self.ll_price = last_pl_val
                    self.lh_bar = last_ph_bar
                    self.lh_price = last_ph_val
                self.seeded = True
                return

    def _seed_session(self, high_arr: np.ndarray, low_arr: np.ndarray, bar_idx: int):
        """Session Seed: Dùng bar đầu phiên làm tham chiếu."""
        self.trend = 0
        self.hh_bar = bar_idx
        self.hh_price = high_arr[bar_idx]
        self.hl_bar = bar_idx
        self.hl_price = low_arr[bar_idx]
        self.ll_bar = bar_idx
        self.ll_price = low_arr[bar_idx]
        self.lh_bar = bar_idx
        self.lh_price = high_arr[bar_idx]
        self.cand_type = 0
        self.cand_bar = None
        self.seeded = True

    # ─── State Machine ────────────────────────────────────────
    # Dịch nguyên văn từ Pine Script: PART 6 — STATE MACHINE & CANDIDATE HUNTING

    def _run_state_machine(
        self,
        i: int,
        high: np.ndarray,
        low: np.ndarray,
        close: np.ndarray,
        result: SMCResult,
    ):
        """Chạy 1 bước state machine cho bar i."""

        # ─── CASE 0: KHỞI TẠO TỪ SESSION SEED ────────────────
        if self.trend == 0:
            if close[i] > self.hh_price:
                self.cand_type = 1
                self.cand_bar = i
                self.cand_high = high[i]
                self.trigger_bar = i
                result.bos_events.append(BoSEvent(
                    start_idx=int(self.hh_bar), end_idx=i,
                    level=float(self.hh_price), is_bull=True,
                ))
                self.trend = 1
            elif close[i] < self.ll_price:
                self.cand_type = -1
                self.cand_bar = i
                self.cand_low = low[i]
                self.trigger_bar = i
                result.bos_events.append(BoSEvent(
                    start_idx=int(self.ll_bar), end_idx=i,
                    level=float(self.ll_price), is_bull=False,
                ))
                self.trend = -1
            return

        # ─── CASE 1: UPTREND ─────────────────────────────────
        if self.trend == 1:
            # --- IDLE (cand_type == 0) ---
            if self.cand_type == 0:
                if close[i] > self.hh_price:
                    self.cand_type = 1
                    self.cand_bar = i
                    self.cand_high = high[i]
                    self.trigger_bar = int(self.hh_bar)
                    result.bos_events.append(BoSEvent(
                        start_idx=int(self.hh_bar), end_idx=i,
                        level=float(self.hh_price), is_bull=True,
                    ))
                elif close[i] < self.hl_price:
                    self.cand_type = -1
                    self.cand_bar = i
                    self.cand_low = low[i]
                    self.trigger_bar = int(self.hl_bar)
                    result.choch_events.append(CHoCHEvent(
                        start_idx=int(self.hl_bar), end_idx=i,
                        level=float(self.hl_price), is_bull_to_bear=True,
                    ))

            # --- Đang săn HH (cand_type == 1) ---
            elif self.cand_type == 1:
                if high[i] > self.cand_high:
                    self.cand_bar = i
                    self.cand_high = high[i]
                elif close[i] < low[self.cand_bar]:
                    # XÁC NHẬN NEW HH
                    new_hh_bar = self.cand_bar
                    new_hh_price = self.cand_high
                    result.struct_labels.append(StructLabel(
                        bar_idx=new_hh_bar, text="HH",
                        is_bull=True, is_high=True,
                    ))
                    # Quét Range tìm HL mới
                    self._scan_range_low(
                        high, low, int(self.trigger_bar), new_hh_bar, result,
                    )
                    self.hh_bar = new_hh_bar
                    self.hh_price = new_hh_price
                    self.cand_type = 0

            # --- Đang săn đảo chiều (cand_type == -1, CHoCH) ---
            elif self.cand_type == -1:
                if low[i] < self.cand_low:
                    self.cand_bar = i
                    self.cand_low = low[i]
                elif close[i] > high[self.cand_bar]:
                    # XÁC NHẬN NEW LL + CHUYỂN XU HƯỚNG
                    new_ll_bar = self.cand_bar
                    new_ll_price = self.cand_low
                    result.struct_labels.append(StructLabel(
                        bar_idx=new_ll_bar, text="LL",
                        is_bull=False, is_high=False,
                    ))
                    # Quét Range tìm LH mới
                    self._scan_range_high(
                        high, low, int(self.trigger_bar), new_ll_bar, result,
                    )
                    self.ll_bar = new_ll_bar
                    self.ll_price = new_ll_price
                    self.trend = -1
                    self.cand_type = 0

        # ─── CASE -1: DOWNTREND ───────────────────────────────
        elif self.trend == -1:
            # --- IDLE (cand_type == 0) ---
            if self.cand_type == 0:
                if close[i] < self.ll_price:
                    self.cand_type = -1
                    self.cand_bar = i
                    self.cand_low = low[i]
                    self.trigger_bar = int(self.ll_bar)
                    result.bos_events.append(BoSEvent(
                        start_idx=int(self.ll_bar), end_idx=i,
                        level=float(self.ll_price), is_bull=False,
                    ))
                elif close[i] > self.lh_price:
                    self.cand_type = 1
                    self.cand_bar = i
                    self.cand_high = high[i]
                    self.trigger_bar = int(self.lh_bar)
                    result.choch_events.append(CHoCHEvent(
                        start_idx=int(self.lh_bar), end_idx=i,
                        level=float(self.lh_price), is_bull_to_bear=False,
                    ))

            # --- Đang săn LL (cand_type == -1) ---
            elif self.cand_type == -1:
                if low[i] < self.cand_low:
                    self.cand_bar = i
                    self.cand_low = low[i]
                elif close[i] > high[self.cand_bar]:
                    # XÁC NHẬN NEW LL
                    new_ll_bar = self.cand_bar
                    new_ll_price = self.cand_low
                    result.struct_labels.append(StructLabel(
                        bar_idx=new_ll_bar, text="LL",
                        is_bull=False, is_high=False,
                    ))
                    # Quét Range tìm LH mới
                    self._scan_range_high(
                        high, low, int(self.trigger_bar), new_ll_bar, result,
                    )
                    self.ll_bar = new_ll_bar
                    self.ll_price = new_ll_price
                    self.cand_type = 0

            # --- Đang săn đảo chiều (cand_type == 1, CHoCH) ---
            elif self.cand_type == 1:
                if high[i] > self.cand_high:
                    self.cand_bar = i
                    self.cand_high = high[i]
                elif close[i] < low[self.cand_bar]:
                    # XÁC NHẬN NEW HH + CHUYỂN XU HƯỚNG
                    new_hh_bar = self.cand_bar
                    new_hh_price = self.cand_high
                    result.struct_labels.append(StructLabel(
                        bar_idx=new_hh_bar, text="HH",
                        is_bull=True, is_high=True,
                    ))
                    # Quét Range tìm HL mới
                    self._scan_range_low(
                        high, low, int(self.trigger_bar), new_hh_bar, result,
                    )
                    self.hh_bar = new_hh_bar
                    self.hh_price = new_hh_price
                    self.trend = 1
                    self.cand_type = 0

    # ─── Range Scanning ───────────────────────────────────────

    def _scan_range_low(self, high, low, start_bar, end_bar, result):
        """
        Quét range tìm đáy thấp nhất làm HL mới.
        Loại trừ end_bar (bar xác nhận HH/LL) để tránh label chồng lấn.
        """
        _end = end_bar - 1
        if _end < start_bar:
            _end = start_bar

        lowest_idx = start_bar
        lowest_val = low[start_bar]
        for j in range(start_bar, _end + 1):
            if low[j] < lowest_val:
                lowest_val = low[j]
                lowest_idx = j
        self.hl_bar = lowest_idx
        self.hl_price = lowest_val

        # Dedup: bỏ qua nếu bar này đã có label low (LL/HL)
        has_low_label = any(
            not lbl.is_high and lbl.bar_idx == lowest_idx
            for lbl in result.struct_labels
        )
        if not has_low_label:
            result.struct_labels.append(StructLabel(
                bar_idx=lowest_idx, text="HL", is_bull=True, is_high=False,
            ))

    def _scan_range_high(self, high, low, start_bar, end_bar, result):
        """
        Quét range tìm đỉnh cao nhất làm LH mới.
        Loại trừ end_bar (bar xác nhận HH/LL) để tránh label chồng lấn.
        """
        _end = end_bar - 1
        if _end < start_bar:
            _end = start_bar

        highest_idx = start_bar
        highest_val = high[start_bar]
        for j in range(start_bar, _end + 1):
            if high[j] > highest_val:
                highest_val = high[j]
                highest_idx = j
        self.lh_bar = highest_idx
        self.lh_price = highest_val

        # Dedup: bỏ qua nếu bar này đã có label high (HH/LH)
        has_high_label = any(
            lbl.is_high and lbl.bar_idx == highest_idx
            for lbl in result.struct_labels
        )
        if not has_high_label:
            result.struct_labels.append(StructLabel(
                bar_idx=highest_idx, text="LH", is_bull=False, is_high=True,
            ))
