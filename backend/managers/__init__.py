# backend/managers/__init__.py
"""Managers package — instantiates singletons and wires up observers."""

from backend.managers.inventory import InventoryManager
from backend.managers.cart import CartManager
from backend.managers.order import OrderManager
from backend.patterns.observer import StockDecrementObserver, LowStockAlertObserver
from backend.config import StrategyConfig

# Instantiate singletons
inventory_manager = InventoryManager()
cart_manager = CartManager()
order_manager = OrderManager()

# Wire up stock observers (Issue #4)
stock_decrement_observer = StockDecrementObserver()
low_stock_observer = LowStockAlertObserver(threshold=StrategyConfig.LOW_STOCK_THRESHOLD)

inventory_manager.add_observer(stock_decrement_observer)
inventory_manager.add_observer(low_stock_observer)
