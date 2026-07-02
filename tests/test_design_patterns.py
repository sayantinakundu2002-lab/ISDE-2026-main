# tests/test_design_patterns.py
import os
os.environ["TESTING"] = "1"
import pytest
from backend.main import (
    InventoryManager,
    CartManager,
    OrderManager,
    PercentageDiscountStrategy,
    ThresholdFixedDiscountStrategy,
    BulkDiscountStrategy,
    NoDiscountStrategy,
    FreeOverShippingStrategy,
    ThresholdFreeShippingStrategy,
    FlatRateShippingStrategy,
    FreeShippingStrategy,
    WeightBasedShippingStrategy,
    CheckoutContext,
    Order,
    OrderState,
    StockDecrementObserver,
    LowStockAlertObserver
)

def test_singleton_managers():
    # Verify InventoryManager is a Singleton
    inv1 = InventoryManager()
    inv2 = InventoryManager()
    assert inv1 is inv2

    # Verify CartManager is a Singleton
    cart1 = CartManager()
    cart2 = CartManager()
    assert cart1 is cart2

    # Verify OrderManager is a Singleton
    ord1 = OrderManager()
    ord2 = OrderManager()
    assert ord1 is ord2


def test_strategy_calculations():
    # 1. Discount Strategies
    pct_discount = PercentageDiscountStrategy(10.0)
    assert pct_discount.calculate_discount(150.0) == 15.0

    # ThresholdFixedDiscountStrategy (aliased as BulkDiscountStrategy)
    bulk_discount = ThresholdFixedDiscountStrategy(150.0, 20.0)
    assert bulk_discount.calculate_discount(200.0) == 20.0
    assert bulk_discount.calculate_discount(100.0) == 0.0

    # Verify the alias still works
    alias_discount = BulkDiscountStrategy(150.0, 20.0)
    assert alias_discount.calculate_discount(200.0) == 20.0

    no_discount = NoDiscountStrategy()
    assert no_discount.calculate_discount(100.0) == 0.0

    # 2. Shipping Strategies
    flat_shipping = FlatRateShippingStrategy(15.0)
    assert flat_shipping.calculate_shipping(50.0) == 15.0

    free_shipping = FreeShippingStrategy()
    assert free_shipping.calculate_shipping(100.0) == 0.0

    # FreeOverShippingStrategy (aliased as ThresholdFreeShippingStrategy)
    threshold_shipping = FreeOverShippingStrategy(100.0, 12.50)
    assert threshold_shipping.calculate_shipping(150.0) == 0.0
    assert threshold_shipping.calculate_shipping(80.0) == 12.50

    # Verify the alias still works
    alias_shipping = ThresholdFreeShippingStrategy(100.0, 12.50)
    assert alias_shipping.calculate_shipping(150.0) == 0.0

    # WeightBasedShippingStrategy
    weight_shipping = WeightBasedShippingStrategy(rate_per_kg=2.0, weight_per_item=1.5)
    assert weight_shipping.calculate_shipping(100.0, item_count=3) == 9.0  # 2.0 * 1.5 * 3

    # 3. Context Calculation
    context = CheckoutContext(pct_discount, threshold_shipping, tax_rate=0.10)
    # Subtotal 100. Discount 10% -> remaining = 90. Shipping for remaining 90 -> 12.50. Tax for remaining 90 -> 9.00. Total = 90 + 12.50 + 9 = 111.50
    bill = context.calculate_bill(100.0)
    assert bill["subtotal"] == 100.0
    assert bill["discount"] == 10.0
    assert bill["shipping"] == 12.50
    assert bill["tax"] == 9.00
    assert bill["total"] == 111.50


def test_order_state_machine():
    """Test the full order lifecycle: CREATED → PAID → PACKED → SHIPPED → DELIVERED."""
    order = Order("ORD-TEST", [], 100.0, 10.0, 0.0, 8.0, 98.0)
    assert order.state == OrderState.CREATED

    # Try invalid transition: cannot jump to DELIVERED from CREATED
    assert not order.transition_to(OrderState.DELIVERED)
    assert order.state == OrderState.CREATED

    # Try invalid: cannot go to PACKED without PAID first
    assert not order.transition_to(OrderState.PACKED)
    assert order.state == OrderState.CREATED

    # Valid transition to PAID
    assert order.transition_to(OrderState.PAID)
    assert order.state == OrderState.PAID

    # Valid transition to PACKED
    assert order.transition_to(OrderState.PACKED)
    assert order.state == OrderState.PACKED

    # Valid transition to SHIPPED
    assert order.transition_to(OrderState.SHIPPED)
    assert order.state == OrderState.SHIPPED

    # Valid transition to DELIVERED
    assert order.transition_to(OrderState.DELIVERED)
    assert order.state == OrderState.DELIVERED

    # Can't go back from DELIVERED (terminal state)
    assert not order.transition_to(OrderState.PAID)
    assert order.state == OrderState.DELIVERED


def test_order_cancellation():
    """Test that orders can be cancelled from CREATED, PAID, or PACKED states."""
    # Cancel from CREATED
    order1 = Order("ORD-C1", [], 50.0, 0.0, 5.0, 4.0, 59.0)
    assert order1.transition_to(OrderState.CANCELLED)
    assert order1.state == OrderState.CANCELLED

    # Cancel from PAID
    order2 = Order("ORD-C2", [], 50.0, 0.0, 5.0, 4.0, 59.0)
    order2.transition_to(OrderState.PAID)
    assert order2.transition_to(OrderState.CANCELLED)
    assert order2.state == OrderState.CANCELLED

    # Cancel from PACKED
    order3 = Order("ORD-C3", [], 50.0, 0.0, 5.0, 4.0, 59.0)
    order3.transition_to(OrderState.PAID)
    order3.transition_to(OrderState.PACKED)
    assert order3.transition_to(OrderState.CANCELLED)
    assert order3.state == OrderState.CANCELLED

    # Cannot cancel from SHIPPED
    order4 = Order("ORD-C4", [], 50.0, 0.0, 5.0, 4.0, 59.0)
    order4.transition_to(OrderState.PAID)
    order4.transition_to(OrderState.PACKED)
    order4.transition_to(OrderState.SHIPPED)
    assert not order4.transition_to(OrderState.CANCELLED)
    assert order4.state == OrderState.SHIPPED

    # Cannot transition from CANCELLED
    assert not order1.transition_to(OrderState.PAID)
    assert order1.state == OrderState.CANCELLED


def test_stock_observer_alerts():
    """Test LowStockAlertObserver fires when stock drops below threshold."""
    inv_manager = InventoryManager()
    observer = LowStockAlertObserver(threshold=5)
    inv_manager.add_observer(observer)

    # Mock product in inventory
    inv_manager.products[999] = {
        "id": 999,
        "name": "Observer Test Product",
        "description": "testing",
        "price": 10.0,
        "stock": 10,
        "category": "electronics"
    }

    # Reduce stock but stay above threshold (10 -> 6)
    inv_manager.reduce_stock(999, 4)
    assert len(observer.alerts) == 0
    assert len(observer.reorders) == 0

    # Reduce stock below threshold (6 -> 3)
    inv_manager.reduce_stock(999, 3)
    assert len(observer.alerts) == 1
    assert len(observer.reorders) == 1
    assert "product 999" in observer.alerts[0].lower() or "Product 999" in observer.alerts[0]

    # Clean up
    if 999 in inv_manager.products:
        del inv_manager.products[999]


def test_stock_decrement_observer():
    """Test StockDecrementObserver logs every stock decrement event."""
    inv_manager = InventoryManager()
    decrement_observer = StockDecrementObserver()
    inv_manager.add_observer(decrement_observer)

    # Mock product
    inv_manager.products[998] = {
        "id": 998,
        "name": "Decrement Test Product",
        "description": "testing",
        "price": 5.0,
        "stock": 20,
        "category": "electronics"
    }

    initial_count = len(decrement_observer.logs)

    # Reduce stock (20 -> 15)
    inv_manager.reduce_stock(998, 5)
    assert len(decrement_observer.logs) == initial_count + 1
    assert "998" in decrement_observer.logs[-1]
    assert "20" in decrement_observer.logs[-1]
    assert "15" in decrement_observer.logs[-1]

    # Reduce again (15 -> 10)
    inv_manager.reduce_stock(998, 5)
    assert len(decrement_observer.logs) == initial_count + 2

    # Clean up
    if 998 in inv_manager.products:
        del inv_manager.products[998]
