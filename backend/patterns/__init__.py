# backend/patterns/__init__.py
"""Design Patterns package — re-exports all pattern classes for convenient imports."""

from backend.patterns.singleton import SingletonMeta
from backend.patterns.observer import StockObserver, StockDecrementObserver, LowStockAlertObserver
from backend.patterns.strategy import (
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
from backend.patterns.state import OrderState, Order
