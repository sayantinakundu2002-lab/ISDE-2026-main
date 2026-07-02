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

    def __init__(self, order_id: str, items: list, subtotal: float, discount: float, shipping: float, tax: float, total: float, username: str = "guest", delivery_otp: str = None):
        self.order_id = order_id
        self.items = items
        self.subtotal = subtotal
        self.discount = discount
        self.shipping = shipping
        self.tax = tax
        self.total = total
        self.username = username
        self.state = OrderState.CREATED
        self.created_at = datetime.now().strftime("%m/%d/%Y, %I:%M:%S %p")
        self.history = [{"from": None, "to": OrderState.CREATED, "timestamp": self.created_at}]
        self.delivery_otp = delivery_otp

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
        return {
            "order_id": self.order_id,
            "state": self.state.value,
            "items": self.items,
            "username": self.username,
            "subtotal": self.subtotal,
            "discount": self.discount,
            "shipping": self.shipping,
            "tax": self.tax,
            "total": self.total,
            "created_at": self.created_at,
            "allowed_transitions": self.get_allowed_transitions(),
            "history": self.history,
            "delivery_otp": self.delivery_otp,
            "breakdown": {
                "subtotal": self.subtotal,
                "discount": self.discount,
                "shipping": self.shipping,
                "total": self.total,
            },
        }
