# backend/main.py
"""
Thin entry point — re-exports the FastAPI app and all public classes.

Keeps backward compatibility so that:
  - `fastapi dev backend/main.py` still works
  - `from backend.main import app` still works
  - `from backend.main import InventoryManager, ...` still works for tests
"""

# App instance
from backend.app import app  # noqa: F401

# Design pattern classes (for test imports)
from backend.patterns.singleton import SingletonMeta  # noqa: F401
from backend.patterns.observer import StockObserver, StockDecrementObserver, LowStockAlertObserver  # noqa: F401
from backend.patterns.strategy import (  # noqa: F401
    DiscountStrategy,
    NoDiscountStrategy,
    PercentageDiscountStrategy,
    ThresholdFixedDiscountStrategy,
    BulkDiscountStrategy,
    ShippingStrategy,
    FreeShippingStrategy,
    FlatRateShippingStrategy,
    FreeOverShippingStrategy,
    ThresholdFreeShippingStrategy,
    WeightBasedShippingStrategy,
    CheckoutContext,
)
from backend.patterns.state import OrderState, Order  # noqa: F401

# Manager classes (for test imports)
from backend.managers.inventory import InventoryManager  # noqa: F401
from backend.managers.cart import CartManager  # noqa: F401
from backend.managers.order import OrderManager  # noqa: F401

# Manager singleton instances
from backend.managers import (  # noqa: F401
    inventory_manager,
    cart_manager,
    order_manager,
    stock_decrement_observer,
    low_stock_observer,
)

# Pydantic models
from backend.models import ProductCreate, ProductUpdate  # noqa: F401

# In-memory data
from backend.data import PRODUCTS, CATEGORIES, CARTS  # noqa: F401