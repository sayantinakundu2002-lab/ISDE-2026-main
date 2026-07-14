# backend/patterns/state.py
"""State pattern — Order lifecycle state machine with guarded transitions.

States: Created → Paid → Packed → Shipped → Delivered → Cancelled
"""

from enum import Enum
from datetime import datetime


class OrderState(str, Enum):
    CREATED = "CREATED"
    PAID = "PAID"
    PACKED = "PACKED"
    SHIPPED = "SHIPPED"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"


# Define allowed transitions for each state
_ALLOWED_TRANSITIONS = {
    OrderState.CREATED: {OrderState.PAID, OrderState.CANCELLED},
    OrderState.PAID: {OrderState.PACKED, OrderState.CANCELLED},
    OrderState.PACKED: {OrderState.SHIPPED, OrderState.CANCELLED},
    OrderState.SHIPPED: {OrderState.DELIVERED},
    OrderState.DELIVERED: set(),   # terminal state
    OrderState.CANCELLED: set(),   # terminal state
}


class Order:
    """Represents a placed order with a finite-state transition model."""

    def __init__(self, order_id: str, items: list, subtotal: float, discount: float, shipping: float, tax: float, total: float, username: str = "guest", delivery_otp: str = None, created_at: str = None, shipping_address: str = "", seller_username: str = None, customer_account_id: int = None, seller_account_id: int = None):
        self.order_id = order_id
        self.items = items
        self.subtotal = subtotal
        self.discount = discount
        self.shipping = shipping
        self.tax = tax
        self.total = total
        self.username = username
        self.state = OrderState.CREATED
        self.created_at = created_at or datetime.now().strftime("%m/%d/%Y, %I:%M:%S %p")
        self.history = [{"from": None, "to": OrderState.CREATED.value, "timestamp": self.created_at}]
        self.delivery_otp = delivery_otp
        self.shipping_address = shipping_address
        self.seller_username = seller_username
        self.customer_account_id = customer_account_id
        self.seller_account_id = seller_account_id

    def transition_to(self, target_state: OrderState) -> bool:
        """Attempt a state transition. Returns True if allowed, False otherwise."""
        allowed = _ALLOWED_TRANSITIONS.get(self.state, set())
        if target_state in allowed:
            old_state = self.state
            self.state = target_state
            self.history.append({
                "from": old_state.value,
                "to": target_state.value,
                "timestamp": datetime.now().strftime("%m/%d/%Y, %I:%M:%S %p"),
            })
            return True
        return False

    def get_allowed_transitions(self) -> list:
        """Return a list of states this order can transition to."""
        return [s.value for s in _ALLOWED_TRANSITIONS.get(self.state, set())]

    def to_dict(self) -> dict:
        """Serialize the order to a JSON-compatible dictionary."""
        seller_name = "ISDE Seller"
        seller_address = "Not Provided"

        # Look up seller details using seller_username stored on the order
        seller_user = self.seller_username
        if seller_user:
            from backend.database import get_db_connection
            try:
                conn = get_db_connection()
                cursor = conn.cursor()
                if self.seller_account_id:
                    cursor.execute("SELECT full_name, address FROM users WHERE account_id = ? AND role = 'admin'", (self.seller_account_id,))
                else:
                    cursor.execute("SELECT full_name, address FROM users WHERE username = ? AND role = 'admin' ORDER BY account_id LIMIT 1", (seller_user,))
                user_row = cursor.fetchone()
                conn.close()
                if user_row:
                    seller_name = user_row["full_name"] or seller_user
                    seller_address = user_row["address"] or "Not Provided"
            except Exception:
                pass

        # Enrich items with image_url from inventory if not already present
        enriched_items = []
        from backend.managers import inventory_manager
        for item in self.items:
            enriched = dict(item)
            if not enriched.get("image_url"):
                prod = inventory_manager.get_product(item["product_id"])
                if prod:
                    enriched["image_url"] = prod.get("image_url", "")
            enriched_items.append(enriched)

        return {
            "order_id": self.order_id,
            "state": self.state.value,
            "items": enriched_items,
            "username": self.username,
            "subtotal": self.subtotal,
            "discount": self.discount,
            "shipping": self.shipping,
            "tax": self.tax,
            "total": self.total,
            "created_at": self.created_at,
            "shipping_address": self.shipping_address,
            "allowed_transitions": self.get_allowed_transitions(),
            "history": self.history,
            "delivery_otp": self.delivery_otp,
            "seller_name": seller_name,
            "seller_address": seller_address,
            "seller_username": self.seller_username,
            "customer_account_id": self.customer_account_id,
            "seller_account_id": self.seller_account_id,
            "breakdown": {
                "subtotal": self.subtotal,
                "discount": self.discount,
                "shipping": self.shipping,
                "total": self.total,
            },
        }
