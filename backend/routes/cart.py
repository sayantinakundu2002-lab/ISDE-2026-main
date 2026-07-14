# backend/routes/cart.py
"""Cart management endpoints."""

from typing import Optional
from fastapi import APIRouter, Form, Depends

from backend.managers import inventory_manager, cart_manager
from backend.auth import get_current_user, get_account_storage_key

router = APIRouter()


def _get_cart_id(user: Optional[dict], cart_id: str) -> str:
    """Use a role/account-scoped cart id when authenticated, otherwise use provided cart_id."""
    if user:
        return get_account_storage_key(user)
    return cart_id


@router.post("/cart/add")
def add_to_cart(
    product_id: int = Form(...),
    quantity: int = Form(...),
    cart_id: str = Form(...),
    user: Optional[dict] = Depends(get_current_user)
):
    actual_cart_id = _get_cart_id(user, cart_id)

    product = inventory_manager.get_product(product_id)
    if not product:
        return {"error": f"Product {product_id} not found"}

    if not inventory_manager.check_stock(product_id, quantity):
        return {"error": f"Only {product['stock']} units available"}

    cart_manager.add_to_cart(actual_cart_id, product_id, quantity)
    return {"message": f"Added {quantity} x {product['name']} to cart"}


@router.get("/cart")
def view_cart(cart_id: str = "default", user: Optional[dict] = Depends(get_current_user)):
    actual_cart_id = _get_cart_id(user, cart_id)
    cart = cart_manager.get_cart(actual_cart_id)
    if not cart:
        return {"cart_id": actual_cart_id, "items": [], "total": 0.0}

    items = []
    total = 0.0
    for pid, qty in cart.items():
        product = inventory_manager.get_product(pid)
        if product:
            discount_pct = product.get("discount_percent", 0.0) or 0.0
            unit_price = product["price"] * (1 - discount_pct / 100.0)
            subtotal = unit_price * qty
            items.append({
                "product_id": pid,
                "name": product["name"],
                "image_url": product["image_url"],
                "quantity": qty,
                "unit_price": round(unit_price, 2),
                "subtotal": round(subtotal, 2)
            })
            total += subtotal

    return {"cart_id": actual_cart_id, "items": items, "total": round(total, 2)}


@router.post("/cart/update")
def update_cart_item(
    product_id: int = Form(...),
    quantity: int = Form(...),
    cart_id: str = Form(...),
    user: Optional[dict] = Depends(get_current_user)
):
    actual_cart_id = _get_cart_id(user, cart_id)
    product = inventory_manager.get_product(product_id)
    if not product:
        return {"error": f"Product {product_id} not found"}

    if quantity > product["stock"]:
        return {"error": f"Only {product['stock']} units available"}

    cart_manager.update_quantity(actual_cart_id, product_id, quantity)
    return {"message": f"Updated quantity for {product['name']}"}


@router.post("/cart/clear")
def clear_cart(cart_id: str = Form(...), user: Optional[dict] = Depends(get_current_user)):
    actual_cart_id = _get_cart_id(user, cart_id)
    cart_manager.clear_cart(actual_cart_id)
    return {"message": "Cart cleared successfully"}


@router.delete("/cart/{product_id}")
def remove_from_cart(product_id: int, cart_id: str = "default", user: Optional[dict] = Depends(get_current_user)):
    actual_cart_id = _get_cart_id(user, cart_id)
    removed = cart_manager.remove_from_cart(actual_cart_id, product_id)
    if not removed:
        return {"error": "Item not found in cart"}
    return {"message": f"Removed product {product_id} from cart"}
