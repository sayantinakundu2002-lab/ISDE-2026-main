import os

os.environ["TESTING"] = "1"

from backend.database import DB_PATH, init_db, reset_database_to_defaults

if os.path.exists(DB_PATH):
    try:
        os.remove(DB_PATH)
    except Exception:
        pass

init_db()

import pytest
from fastapi.testclient import TestClient

from backend.auth import TOKENS
from backend.main import app
from backend.managers import (
    cart_manager,
    inventory_manager,
    order_manager,
    stock_decrement_observer,
    low_stock_observer,
)

client = TestClient(app)

ADMIN_USERNAME = "TestAdmin"
ADMIN_PASSWORD = "TestAdmin"
USER_USERNAME = "TestUser"
USER_PASSWORD = "TesUser"


@pytest.fixture(autouse=True)
def reset_state():
    reset_database_to_defaults()
    TOKENS.clear()
    inventory_manager.products.clear()
    cart_manager.carts.clear()
    order_manager.orders.clear()
    stock_decrement_observer.logs.clear()
    low_stock_observer.alerts.clear()
    low_stock_observer.reorders.clear()
    yield
    reset_database_to_defaults()
    TOKENS.clear()
    inventory_manager.products.clear()
    cart_manager.carts.clear()
    order_manager.orders.clear()
    stock_decrement_observer.logs.clear()
    low_stock_observer.alerts.clear()
    low_stock_observer.reorders.clear()


def login_as_admin():
    login_res = client.post(
        "/auth/login",
        data={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
    )
    assert login_res.status_code == 200
    return login_res.json()["token"]


def login_as_user():
    login_res = client.post(
        "/auth/login",
        data={"username": USER_USERNAME, "password": USER_PASSWORD}
    )
    assert login_res.status_code == 200
    return login_res.json()["token"]


def create_product(name="Test Product", stock=100, price=9.99):
    token = login_as_admin()
    new_product = {
        "name": name,
        "description": "This is a test product",
        "price": price,
        "stock": stock,
        "category": "electronics",
        "image_url": "https://example.com/image.jpg",
        "discount_percent": 0.0
    }
    response = client.post(
        "/products",
        json=new_product,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    return response.json()["product"], token


def test_homepage_ok():
    r = client.get("/")
    assert r.status_code == 200


def test_list_products_starts_empty():
    r = client.get("/products")
    assert r.status_code == 200
    data = r.json()
    assert "products" in data
    assert data["products"] == []
    assert data["total_count"] == 0


def test_default_accounts_login():
    user_login = client.post(
        "/auth/login",
        data={"username": USER_USERNAME, "password": USER_PASSWORD}
    )
    assert user_login.status_code == 200
    assert user_login.json()["user"]["role"] == "user"

    admin_login = client.post(
        "/auth/login",
        data={"username": "testadmin@gmail.com", "password": ADMIN_PASSWORD}
    )
    assert admin_login.status_code == 200
    assert admin_login.json()["user"]["username"] == ADMIN_USERNAME
    assert admin_login.json()["user"]["role"] == "admin"


def test_add_product():
    product, _ = create_product()
    assert product["name"] == "Test Product"
    assert product["id"] == 1


def test_add_new_product_to_cart():
    product, token = create_product("Cart Test Product", stock=25)

    cart_res = client.post(
        "/cart/add",
        data={"product_id": product["id"], "quantity": 1, "cart_id": "default"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert cart_res.status_code == 200
    assert "error" not in cart_res.json()
    assert "Added" in cart_res.json()["message"]

    view_res = client.get("/cart?cart_id=default", headers={"Authorization": f"Bearer {token}"})
    assert view_res.status_code == 200
    items = view_res.json()["items"]
    assert any(item["product_id"] == product["id"] for item in items)


def test_add_to_cart():
    product, _ = create_product("Guest Cart Product", stock=10)

    r = client.post("/cart/add", data={"product_id": product["id"], "quantity": 2, "cart_id": "default"})
    assert r.status_code == 200

    r = client.get("/cart?cart_id=default")
    assert r.status_code == 200
    data = r.json()
    assert data["cart_id"] == "default"
    assert len(data["items"]) == 1
    assert data["items"][0]["product_id"] == product["id"]
    assert data["items"][0]["quantity"] == 2


def test_remove_from_cart():
    product, _ = create_product("Remove Cart Product", stock=10)
    client.post("/cart/add", data={"product_id": product["id"], "quantity": 1, "cart_id": "default"})

    r = client.delete(f"/cart/{product['id']}?cart_id=default")
    assert r.status_code == 200

    r = client.get("/cart?cart_id=default")
    assert r.status_code == 200
    data = r.json()
    assert len(data["items"]) == 0


def test_checkout_shipping_is_ten_dollars_under_fifty_and_free_at_fifty():
    low_product, _ = create_product("Under Fifty Product", stock=5, price=25.00)
    r = client.post("/cart/add", data={"product_id": low_product["id"], "quantity": 1, "cart_id": "low-cart"})
    assert r.status_code == 200

    low_summary = client.get("/cart/checkout-summary?cart_id=low-cart")
    assert low_summary.status_code == 200
    low_data = low_summary.json()
    assert low_data["subtotal"] == 25.0
    assert low_data["shipping"] == 10.0
    assert low_data["total"] == 37.0

    high_product, _ = create_product("Fifty Dollar Product", stock=5, price=50.00)
    r = client.post("/cart/add", data={"product_id": high_product["id"], "quantity": 1, "cart_id": "high-cart"})
    assert r.status_code == 200

    high_summary = client.get("/cart/checkout-summary?cart_id=high-cart")
    assert high_summary.status_code == 200
    high_data = high_summary.json()
    assert high_data["subtotal"] == 50.0
    assert high_data["shipping"] == 0.0
    assert high_data["total"] == 54.0


def test_checkout_requires_non_empty_shipping_address():
    product, _ = create_product("Address Required Product", stock=5, price=20.00)
    user_token = login_as_user()

    add_res = client.post(
        "/cart/add",
        data={"product_id": product["id"], "quantity": 1, "cart_id": "default"},
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert add_res.status_code == 200

    checkout_res = client.post(
        "/checkout/place-order",
        data={"cart_id": "default", "shipping_address": "   "},
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert checkout_res.status_code == 400
    assert checkout_res.json()["detail"] == "Shipping address is required"


def test_user_registration_direct_flow():
    import random

    test_user = f"user_{random.randint(1000, 9999)}"
    r = client.post("/auth/register", data={
        "username": test_user,
        "password": "userpass",
        "full_name": "Test User",
        "email": f"{test_user}@example.com",
        "role": "user"
    })
    assert r.status_code == 200
    res_data = r.json()
    assert "token" in res_data
    assert res_data["user"]["username"] == test_user

    r_login = client.post("/auth/login", data={"username": test_user, "password": "userpass"})
    assert r_login.status_code == 200
    assert "token" in r_login.json()
    assert r_login.json()["user"]["username"] == test_user


def test_order_delivery_direct_flow():
    product, admin_token = create_product("Checkout Product", stock=5)

    cart_res = client.post(
        "/cart/add",
        data={"product_id": product["id"], "quantity": 1, "cart_id": "default"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert cart_res.status_code == 200

    checkout_res = client.post(
        "/checkout/place-order",
        data={"cart_id": "default", "shipping_address": "42 Test Street, Test City"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert checkout_res.status_code == 200
    checkout_data = checkout_res.json()
    assert checkout_data["state"] == "PAID"
    assert checkout_data["shipping_address"] == "42 Test Street, Test City"
    assert set(checkout_data["allowed_transitions"]) == {"PACKED", "CANCELLED"}
    order_id = checkout_data["order_id"]

    states = ["PACKED", "SHIPPED", "DELIVERED"]
    for state in states:
        r = client.post(
            f"/orders/{order_id}/transition",
            data={"target_state": state},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert r.status_code == 200
        res_data = r.json()
        assert res_data["success"] is True
        assert res_data["order"]["state"] == state


def test_order_api_rejects_invalid_state_jump():
    product, _ = create_product("Invalid Transition Product", stock=5)
    user_token = login_as_user()

    client.post(
        "/cart/add",
        data={"product_id": product["id"], "quantity": 1, "cart_id": "default"},
        headers={"Authorization": f"Bearer {user_token}"}
    )
    checkout_res = client.post(
        "/checkout/place-order",
        data={"cart_id": "default", "shipping_address": "7 Lifecycle Lane, Test City"},
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert checkout_res.status_code == 200
    order_id = checkout_res.json()["order_id"]

    jump_res = client.post(
        f"/orders/{order_id}/transition",
        data={"target_state": "SHIPPED"},
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert jump_res.status_code == 403

    admin_token = login_as_admin()
    jump_res = client.post(
        f"/orders/{order_id}/transition",
        data={"target_state": "SHIPPED"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert jump_res.status_code == 400
    assert "Cannot transition from PAID to SHIPPED" in jump_res.json()["detail"]


def test_inventory_logs_are_admin_only_and_capture_reorder_alerts():
    product, _ = create_product("Low Stock Product", stock=6)
    user_token = login_as_user()

    add_res = client.post(
        "/cart/add",
        data={"product_id": product["id"], "quantity": 2, "cart_id": "default"},
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert add_res.status_code == 200

    checkout_res = client.post(
        "/checkout/place-order",
        data={"cart_id": "default", "shipping_address": "9 Inventory Road, Test City"},
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert checkout_res.status_code == 200

    unauthenticated_logs = client.get("/admin/inventory/logs")
    assert unauthenticated_logs.status_code == 401

    user_logs = client.get(
        "/admin/inventory/logs",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert user_logs.status_code == 403

    admin_token = login_as_admin()
    admin_logs = client.get(
        "/admin/inventory/logs",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert admin_logs.status_code == 200
    data = admin_logs.json()
    assert len(data["logs"]) == 1
    assert len(data["reorders"]) == 1
    assert str(product["id"]) in data["logs"][0]
    assert str(product["id"]) in data["reorders"][0]
