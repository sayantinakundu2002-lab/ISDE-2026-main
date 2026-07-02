# backend/config.py
"""Shared configuration module — reads strategy settings from environment variables.

Restart the application to apply changes to these settings.
"""

import os


class StrategyConfig:
    """Configuration for discount and shipping strategies, sourced from env vars."""

    # --- Discount Settings ---
    DISCOUNT_TYPE = os.environ.get("DISCOUNT_TYPE", "none")
    # Options: "none", "percentage", "threshold_fixed"

    DISCOUNT_PERCENTAGE = float(os.environ.get("DISCOUNT_PERCENTAGE", "10"))
    DISCOUNT_THRESHOLD = float(os.environ.get("DISCOUNT_THRESHOLD", "150"))
    DISCOUNT_AMOUNT = float(os.environ.get("DISCOUNT_AMOUNT", "20"))

    # --- Shipping Settings ---
    SHIPPING_TYPE = os.environ.get("SHIPPING_TYPE", "free_over")
    # Options: "flat_rate", "free_over", "weight_based", "free"

    SHIPPING_FLAT_RATE = float(os.environ.get("SHIPPING_FLAT_RATE", "10"))
    SHIPPING_FREE_THRESHOLD = float(os.environ.get("SHIPPING_FREE_THRESHOLD", "100"))
    SHIPPING_WEIGHT_RATE = float(os.environ.get("SHIPPING_WEIGHT_RATE", "0.5"))
    SHIPPING_WEIGHT_PER_ITEM = float(os.environ.get("SHIPPING_WEIGHT_PER_ITEM", "1.0"))

    # --- Tax ---
    TAX_RATE = float(os.environ.get("TAX_RATE", "0.08"))

    # --- Observer ---
    LOW_STOCK_THRESHOLD = int(os.environ.get("LOW_STOCK_THRESHOLD", "5"))


def get_discount_strategy():
    """Return a DiscountStrategy instance based on current configuration."""
    from backend.patterns.strategy import (
        NoDiscountStrategy,
        PercentageDiscountStrategy,
        ThresholdFixedDiscountStrategy,
    )

    dtype = StrategyConfig.DISCOUNT_TYPE.lower()
    if dtype == "percentage":
        return PercentageDiscountStrategy(StrategyConfig.DISCOUNT_PERCENTAGE)
    elif dtype == "threshold_fixed":
        return ThresholdFixedDiscountStrategy(
            StrategyConfig.DISCOUNT_THRESHOLD, StrategyConfig.DISCOUNT_AMOUNT
        )
    return NoDiscountStrategy()


def get_shipping_strategy():
    """Return a ShippingStrategy instance based on current configuration."""
    from backend.patterns.strategy import (
        FlatRateShippingStrategy,
        FreeOverShippingStrategy,
        WeightBasedShippingStrategy,
        FreeShippingStrategy,
    )

    stype = StrategyConfig.SHIPPING_TYPE.lower()
    if stype == "flat_rate":
        return FlatRateShippingStrategy(StrategyConfig.SHIPPING_FLAT_RATE)
    elif stype == "free_over":
        return FreeOverShippingStrategy(
            StrategyConfig.SHIPPING_FREE_THRESHOLD, StrategyConfig.SHIPPING_FLAT_RATE
        )
    elif stype == "weight_based":
        return WeightBasedShippingStrategy(
            StrategyConfig.SHIPPING_WEIGHT_RATE, StrategyConfig.SHIPPING_WEIGHT_PER_ITEM
        )
    elif stype == "free":
        return FreeShippingStrategy()
    # Default: free over threshold
    return FreeOverShippingStrategy(
        StrategyConfig.SHIPPING_FREE_THRESHOLD, StrategyConfig.SHIPPING_FLAT_RATE
    )


def get_checkout_context(promo_code=None, subtotal=0.0):
    """Build a CheckoutContext with appropriate strategies.

    Promo codes override the default configuration:
      - SAVE10: 10% percentage discount
      - BULK20: $20 off if subtotal >= $150
    """
    from backend.patterns.strategy import (
        PercentageDiscountStrategy,
        ThresholdFixedDiscountStrategy,
        CheckoutContext,
    )

    # Select discount: promo code overrides config default
    if promo_code == "SAVE10":
        discount_strategy = PercentageDiscountStrategy(10.0)
    elif promo_code == "BULK20":
        discount_strategy = ThresholdFixedDiscountStrategy(150.0, 20.0)
    elif subtotal >= StrategyConfig.DISCOUNT_THRESHOLD and StrategyConfig.DISCOUNT_TYPE == "none":
        # Auto-apply bulk discount for high-value carts (preserves original behavior)
        discount_strategy = ThresholdFixedDiscountStrategy(150.0, 20.0)
    else:
        discount_strategy = get_discount_strategy()

    shipping_strategy = get_shipping_strategy()
    return CheckoutContext(discount_strategy, shipping_strategy, StrategyConfig.TAX_RATE)
