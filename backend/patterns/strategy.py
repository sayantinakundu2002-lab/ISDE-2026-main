# backend/patterns/strategy.py
"""Strategy pattern — interchangeable discount and shipping calculation algorithms.

Discount strategies:
  - NoDiscountStrategy
  - PercentageDiscountStrategy(percentage)
  - ThresholdFixedDiscountStrategy(threshold, amount) — discount applied if expense >= threshold

Shipping strategies:
  - FlatRateShippingStrategy(amount)
  - FreeOverShippingStrategy(threshold) — free if subtotal >= threshold, else standard rate
  - WeightBasedShippingStrategy(rate_per_kg, weight_per_item) — simulates weight per product
  - FreeShippingStrategy — always free
"""


# --- Discount Strategies ---

class DiscountStrategy:
    """Base class for discount calculation strategies."""

    def calculate_discount(self, subtotal: float) -> float:
        raise NotImplementedError


class NoDiscountStrategy(DiscountStrategy):
    def calculate_discount(self, subtotal: float) -> float:
        return 0.0


class PercentageDiscountStrategy(DiscountStrategy):
    def __init__(self, percentage: float):
        self.percentage = percentage

    def calculate_discount(self, subtotal: float) -> float:
        return round(subtotal * (self.percentage / 100.0), 2)


class ThresholdFixedDiscountStrategy(DiscountStrategy):
    """Applies a fixed discount amount if the subtotal meets or exceeds a threshold."""

    def __init__(self, threshold: float, discount_amount: float):
        self.threshold = threshold
        self.discount_amount = discount_amount

    def calculate_discount(self, subtotal: float) -> float:
        if subtotal >= self.threshold:
            return self.discount_amount
        return 0.0


# Backward-compatible alias
BulkDiscountStrategy = ThresholdFixedDiscountStrategy


# --- Shipping Strategies ---

class ShippingStrategy:
    """Base class for shipping calculation strategies."""

    def calculate_shipping(self, subtotal: float, item_count: int = 1) -> float:
        raise NotImplementedError


class FreeShippingStrategy(ShippingStrategy):
    def calculate_shipping(self, subtotal: float, item_count: int = 1) -> float:
        return 0.0


class FlatRateShippingStrategy(ShippingStrategy):
    def __init__(self, rate: float):
        self.rate = rate

    def calculate_shipping(self, subtotal: float, item_count: int = 1) -> float:
        return self.rate


class FreeOverShippingStrategy(ShippingStrategy):
    """Free shipping if subtotal >= threshold, otherwise a standard rate."""

    def __init__(self, threshold: float, standard_rate: float):
        self.threshold = threshold
        self.standard_rate = standard_rate

    def calculate_shipping(self, subtotal: float, item_count: int = 1) -> float:
        if subtotal >= self.threshold:
            return 0.0
        return self.standard_rate


# Backward-compatible alias
ThresholdFreeShippingStrategy = FreeOverShippingStrategy


class WeightBasedShippingStrategy(ShippingStrategy):
    """Simulates weight-based shipping: rate_per_kg * weight_per_item * item_count."""

    def __init__(self, rate_per_kg: float = 0.5, weight_per_item: float = 1.0):
        self.rate_per_kg = rate_per_kg
        self.weight_per_item = weight_per_item

    def calculate_shipping(self, subtotal: float, item_count: int = 1) -> float:
        return round(self.rate_per_kg * self.weight_per_item * item_count, 2)


# --- Checkout Context ---

class CheckoutContext:
    """Composes a discount and shipping strategy to compute a full bill."""

    def __init__(self, discount_strategy: DiscountStrategy, shipping_strategy: ShippingStrategy, tax_rate: float = 0.08):
        self.discount_strategy = discount_strategy
        self.shipping_strategy = shipping_strategy
        self.tax_rate = tax_rate

    def calculate_bill(self, subtotal: float, item_count: int = 1) -> dict:
        discount = self.discount_strategy.calculate_discount(subtotal)
        remaining = max(0.0, subtotal - discount)
        shipping = self.shipping_strategy.calculate_shipping(subtotal, item_count)
        tax = round(remaining * self.tax_rate, 2)
        total = round(remaining + shipping + tax, 2)
        return {
            "subtotal": round(subtotal, 2),
            "discount": discount,
            "shipping": shipping,
            "tax": tax,
            "total": total
        }
