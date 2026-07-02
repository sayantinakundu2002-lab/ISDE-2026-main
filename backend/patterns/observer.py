# backend/patterns/observer.py
"""Observer pattern — stock-level monitoring with pluggable alert observers.

Two observer types:
  1. StockDecrementObserver — logs every stock decrement event.
  2. LowStockAlertObserver — logs when stock drops below a threshold (reorder alert).
"""

import logging
from datetime import datetime


class StockObserver:
    """Base class for stock change observers."""

    def update(self, product_id: int, old_stock: int, new_stock: int):
        raise NotImplementedError


class StockDecrementObserver(StockObserver):
    """Logs every stock decrement event to an in-memory list."""

    def __init__(self):
        self.logs: list[str] = []

    def update(self, product_id: int, old_stock: int, new_stock: int):
        if new_stock < old_stock:
            timestamp = datetime.now().strftime("%m/%d/%Y, %I:%M:%S %p")
            msg = f"[{timestamp}] Product {product_id} stock decremented from {old_stock} to {new_stock}"
            self.logs.append(msg)
            logging.info(msg)


class LowStockAlertObserver(StockObserver):
    """Fires an alert when stock drops below a configurable threshold."""

    def __init__(self, threshold: int = 5):
        self.threshold = threshold
        self.alerts: list[str] = []      # kept for backward compat
        self.reorders: list[str] = []    # issue #4 naming

    def update(self, product_id: int, old_stock: int, new_stock: int):
        if new_stock < self.threshold and old_stock >= self.threshold:
            timestamp = datetime.now().strftime("%m/%d/%Y, %I:%M:%S %p")
            alert_msg = f"[{timestamp}] Product {product_id} needs reorder. Stock: {new_stock}, threshold: {self.threshold}"
            self.alerts.append(alert_msg)
            self.reorders.append(alert_msg)
            logging.warning(alert_msg)
