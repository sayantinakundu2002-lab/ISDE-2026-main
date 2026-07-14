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
USER_PASSWORD = "TestUser"


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

    states = ["PACKED", "SHIPPED"]
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

    # Request delivery OTP
    req_otp = client.post(
        f"/orders/{order_id}/request-delivery-otp",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert req_otp.status_code == 200

    # Retrieve OTP code from DB
    from backend.database import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT otp_code FROM otps WHERE email = ? AND purpose = 'delivery'", (order_id,))
    row = cursor.fetchone()
    assert row is not None
    otp_code = row["otp_code"]
    conn.close()

    # Verify delivery OTP
    verify_res = client.post(
        f"/orders/{order_id}/verify-delivery",
        data={"otp_code": otp_code},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["success"] is True
    assert verify_res.json()["order"]["state"] == "DELIVERED"


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


def test_product_discount_checkout_calculation():
    token = login_as_admin()
    new_product = {
        "name": "Discounted Product",
        "description": "This is a product with 10% discount",
        "price": 150.00,
        "stock": 100,
        "category": "electronics",
        "image_url": "https://example.com/image.jpg",
        "discount_percent": 10.0
    }
    response = client.post(
        "/products",
        json=new_product,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    product = response.json()["product"]
    
    user_token = login_as_user()
    
    add_res = client.post(
        "/cart/add",
        data={"product_id": product["id"], "quantity": 1, "cart_id": "default"},
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert add_res.status_code == 200
    
    cart_res = client.get("/cart?cart_id=default", headers={"Authorization": f"Bearer {user_token}"})
    assert cart_res.status_code == 200
    cart_data = cart_res.json()
    assert cart_data["items"][0]["unit_price"] == 135.00
    assert cart_data["items"][0]["subtotal"] == 135.00
    assert cart_data["total"] == 135.00
    
    summary_res = client.get("/cart/checkout-summary?cart_id=default", headers={"Authorization": f"Bearer {user_token}"})
    assert summary_res.status_code == 200
    summary_data = summary_res.json()
    assert summary_data["subtotal"] == 150.00
    assert summary_data["discount"] == 15.00
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


def test_user_registration_rejects_duplicate_email_within_user_role():
    first = client.post("/auth/register", data={
        "username": "EmailUserOne",
        "password": "userpass1",
        "full_name": "Email User One",
        "email": "shared-user@example.com",
        "role": "user"
    })
    assert first.status_code == 200

    duplicate = client.post("/auth/register", data={
        "username": "EmailUserTwo",
        "password": "userpass2",
        "full_name": "Email User Two",
        "email": "shared-user@example.com",
        "role": "user"
    })
    assert duplicate.status_code == 400
    assert duplicate.json()["detail"] == "User email already exists"


def test_user_registration_allows_duplicate_username_with_distinct_emails():
    first = client.post("/auth/register", data={
        "username": "SharedName",
        "password": "firstpass",
        "full_name": "Shared Name One",
        "email": "shared-name-one@example.com",
        "role": "user"
    })
    assert first.status_code == 200

    second = client.post("/auth/register", data={
        "username": "SharedName",
        "password": "secondpass",
        "full_name": "Shared Name Two",
        "email": "shared-name-two@example.com",
        "role": "user"
    })
    assert second.status_code == 200

    first_login = client.post("/auth/login", data={"username": "shared-name-one@example.com", "password": "firstpass"})
    assert first_login.status_code == 200
    assert first_login.json()["user"]["email"] == "shared-name-one@example.com"

    second_login = client.post("/auth/login", data={"username": "shared-name-two@example.com", "password": "secondpass"})
    assert second_login.status_code == 200
    assert second_login.json()["user"]["email"] == "shared-name-two@example.com"


def test_user_and_admin_can_share_username_and_email_across_roles():
    req_res = client.post("/auth/admin-register/request", data={
        "username": USER_USERNAME,
        "password": "adminpassword",
        "full_name": "Role Scoped Admin",
        "email": "testuser@gmail.com",
        "product_name": "Role Scoped Product",
        "product_description": "Product for role-scoped identity test",
        "product_price": 75.00,
        "product_stock": 10,
        "product_category": "electronics"
    })
    assert req_res.status_code == 200

    from backend.database import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT confirmation_code FROM admin_registration_requests WHERE username = ?", (USER_USERNAME,))
    code = cursor.fetchone()["confirmation_code"]
    conn.close()

    confirm_res = client.post("/auth/admin-register/confirm", data={
        "username": USER_USERNAME,
        "confirmation_code": code
    })
    assert confirm_res.status_code == 200
    assert confirm_res.json()["user"]["role"] == "admin"

    user_login = client.post("/auth/login", data={"username": USER_USERNAME, "password": USER_PASSWORD})
    assert user_login.status_code == 200
    assert user_login.json()["user"]["role"] == "user"

    admin_login = client.post("/auth/login", data={"username": USER_USERNAME, "password": "adminpassword"})
    assert admin_login.status_code == 200
    assert admin_login.json()["user"]["role"] == "admin"


def test_accounts_with_same_username_have_separate_carts():
    product, _ = create_product("Shared Username Cart Product", stock=10, price=10.0)

    user_login = client.post("/auth/login", data={"username": USER_USERNAME, "password": USER_PASSWORD})
    assert user_login.status_code == 200
    user_token = user_login.json()["token"]

    req_res = client.post("/auth/admin-register/request", data={
        "username": USER_USERNAME,
        "password": "admincartpass",
        "full_name": "Shared Cart Admin",
        "email": "shared-cart-admin@example.com",
        "product_name": "Shared Cart Admin Product",
        "product_description": "Product for cart identity test",
        "product_price": 50.00,
        "product_stock": 10,
        "product_category": "electronics"
    })
    assert req_res.status_code == 200

    from backend.database import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT confirmation_code FROM admin_registration_requests WHERE email = ?", ("shared-cart-admin@example.com",))
    code = cursor.fetchone()["confirmation_code"]
    conn.close()

    confirm_res = client.post("/auth/admin-register/confirm", data={
        "username": USER_USERNAME,
        "confirmation_code": code
    })
    assert confirm_res.status_code == 200
    admin_token = confirm_res.json()["token"]

    user_add = client.post(
        "/cart/add",
        data={"product_id": product["id"], "quantity": 1, "cart_id": "default"},
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert user_add.status_code == 200

    admin_add = client.post(
        "/cart/add",
        data={"product_id": product["id"], "quantity": 2, "cart_id": "default"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert admin_add.status_code == 200

    user_cart = client.get("/cart?cart_id=default", headers={"Authorization": f"Bearer {user_token}"})
    admin_cart = client.get("/cart?cart_id=default", headers={"Authorization": f"Bearer {admin_token}"})
    assert user_cart.status_code == 200
    assert admin_cart.status_code == 200
    assert user_cart.json()["items"][0]["quantity"] == 1
    assert admin_cart.json()["items"][0]["quantity"] == 2


def test_admin_registration_allows_duplicate_username_with_distinct_emails():
    first = client.post("/auth/admin-register/request", data={
        "username": "SharedSeller",
        "password": "adminpassword1",
        "full_name": "Shared Seller One",
        "email": "shared-seller-one@example.com",
        "product_name": "Shared Seller One Product",
        "product_description": "First seller product",
        "product_price": 80.00,
        "product_stock": 5,
        "product_category": "electronics"
    })
    assert first.status_code == 200

    second = client.post("/auth/admin-register/request", data={
        "username": "SharedSeller",
        "password": "adminpassword2",
        "full_name": "Shared Seller Two",
        "email": "shared-seller-two@example.com",
        "product_name": "Shared Seller Two Product",
        "product_description": "Second seller product",
        "product_price": 90.00,
        "product_stock": 5,
        "product_category": "electronics"
    })
    assert second.status_code == 200

    from backend.database import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT email, confirmation_code FROM admin_registration_requests WHERE username = ?", ("SharedSeller",))
    codes = {row["email"]: row["confirmation_code"] for row in cursor.fetchall()}
    conn.close()

    first_confirm = client.post("/auth/admin-register/confirm", data={
        "username": "SharedSeller",
        "confirmation_code": codes["shared-seller-one@example.com"]
    })
    assert first_confirm.status_code == 200
    assert first_confirm.json()["user"]["email"] == "shared-seller-one@example.com"

    second_confirm = client.post("/auth/admin-register/confirm", data={
        "username": "SharedSeller",
        "confirmation_code": codes["shared-seller-two@example.com"]
    })
    assert second_confirm.status_code == 200
    assert second_confirm.json()["user"]["email"] == "shared-seller-two@example.com"


def test_admin_registration_rejects_duplicate_email_within_admin_role():
    first = client.post("/auth/admin-register/request", data={
        "username": "AdminEmailOne",
        "password": "adminpassword1",
        "full_name": "Admin Email One",
        "email": "shared-admin@example.com",
        "product_name": "Admin Email One Product",
        "product_description": "First admin product",
        "product_price": 80.00,
        "product_stock": 5,
        "product_category": "electronics"
    })
    assert first.status_code == 200

    duplicate = client.post("/auth/admin-register/request", data={
        "username": "AdminEmailTwo",
        "password": "adminpassword2",
        "full_name": "Admin Email Two",
        "email": "shared-admin@example.com",
        "product_name": "Admin Email Two Product",
        "product_description": "Second admin product",
        "product_price": 90.00,
        "product_stock": 5,
        "product_category": "electronics"
    })
    assert duplicate.status_code == 400
    assert duplicate.json()["detail"] == "A registration request for this email is already pending"


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

    states = ["PACKED", "SHIPPED"]
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

    # Request delivery OTP
    req_otp = client.post(
        f"/orders/{order_id}/request-delivery-otp",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert req_otp.status_code == 200

    # Retrieve OTP code from DB
    from backend.database import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT otp_code FROM otps WHERE email = ? AND purpose = 'delivery'", (order_id,))
    row = cursor.fetchone()
    assert row is not None
    otp_code = row["otp_code"]
    conn.close()

    # Verify delivery OTP
    verify_res = client.post(
        f"/orders/{order_id}/verify-delivery",
        data={"otp_code": otp_code},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["success"] is True
    assert verify_res.json()["order"]["state"] == "DELIVERED"


def test_order_customer_can_request_delivery_otp_for_own_shipped_order():
    product, admin_token = create_product("Customer OTP Product", stock=5)
    user_token = login_as_user()

    cart_res = client.post(
        "/cart/add",
        data={"product_id": product["id"], "quantity": 1, "cart_id": "default"},
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert cart_res.status_code == 200

    checkout_res = client.post(
        "/checkout/place-order",
        data={"cart_id": "default", "shipping_address": "42 Customer Lane"},
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert checkout_res.status_code == 200
    order_id = checkout_res.json()["order_id"]

    for state in ["PACKED", "SHIPPED"]:
        r = client.post(
            f"/orders/{order_id}/transition",
            data={"target_state": state},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert r.status_code == 200

    req_otp = client.post(
        f"/orders/{order_id}/request-delivery-otp",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert req_otp.status_code == 200
    assert req_otp.json()["success"] is True

    from backend.database import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT otp_code FROM otps WHERE email = ? AND purpose = 'delivery'", (order_id,))
    row = cursor.fetchone()
    assert row is not None
    otp_code = row["otp_code"]
    conn.close()

    verify_res = client.post(
        f"/orders/{order_id}/verify-delivery",
        data={"otp_code": otp_code},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["order"]["state"] == "DELIVERED"


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


def test_product_discount_checkout_calculation():
    token = login_as_admin()
    new_product = {
        "name": "Discounted Product",
        "description": "This is a product with 10% discount",
        "price": 150.00,
        "stock": 100,
        "category": "electronics",
        "image_url": "https://example.com/image.jpg",
        "discount_percent": 10.0
    }
    response = client.post(
        "/products",
        json=new_product,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    product = response.json()["product"]
    
    user_token = login_as_user()
    
    add_res = client.post(
        "/cart/add",
        data={"product_id": product["id"], "quantity": 1, "cart_id": "default"},
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert add_res.status_code == 200
    
    cart_res = client.get("/cart?cart_id=default", headers={"Authorization": f"Bearer {user_token}"})
    assert cart_res.status_code == 200
    cart_data = cart_res.json()
    assert cart_data["items"][0]["unit_price"] == 135.00
    assert cart_data["items"][0]["subtotal"] == 135.00
    assert cart_data["total"] == 135.00
    
    summary_res = client.get("/cart/checkout-summary?cart_id=default", headers={"Authorization": f"Bearer {user_token}"})
    assert summary_res.status_code == 200
    summary_data = summary_res.json()
    assert summary_data["subtotal"] == 150.00
    assert summary_data["discount"] == 15.00
    assert summary_data["shipping"] == 0.0
    assert summary_data["tax"] == 10.80
    assert summary_data["total"] == 145.80


def test_admin_registration_flow():
    req_res = client.post("/auth/admin-register/request", data={
        "username": "NewAdmin",
        "password": "adminpassword",
        "full_name": "New Admin Name",
        "email": "newadmin@example.com",
        "product_name": "Proposed Keyboards",
        "product_description": "Custom keycap mechanical keyboard",
        "product_price": 120.00,
        "product_stock": 50,
        "product_category": "electronics"
    })
    assert req_res.status_code == 200
    assert req_res.json()["success"] is True
    
    from backend.database import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT confirmation_code FROM admin_registration_requests WHERE username = 'NewAdmin'")
    row = cursor.fetchone()
    assert row is not None
    code = row["confirmation_code"]
    conn.close()
    
    confirm_res = client.post("/auth/admin-register/confirm", data={
        "username": "NewAdmin",
        "confirmation_code": code
    })
    assert confirm_res.status_code == 200
    confirm_data = confirm_res.json()
    assert confirm_data["success"] is True
    assert confirm_data["user"]["role"] == "admin"
    
    login_res = client.post("/auth/login", data={
        "username": "NewAdmin",
        "password": "adminpassword"
    })
    assert login_res.status_code == 200
    assert login_res.json()["user"]["role"] == "admin"
    
    products_res = client.get("/products")
    assert products_res.status_code == 200
    products = products_res.json()["products"]
    assert any(p["name"] == "Proposed Keyboards" and p["price"] == 120.00 for p in products)


def test_admin_isolation():
    admin1_token = login_as_admin()
    
    req_res = client.post("/auth/admin-register/request", data={
        "username": "NewAdmin2",
        "password": "adminpassword2",
        "full_name": "New Admin 2",
        "email": "newadmin2@example.com",
        "product_name": "Admin 2 Keyboard",
        "product_description": "Keyboard from Admin 2",
        "product_price": 99.00,
        "product_stock": 20,
        "product_category": "electronics"
    })
    assert req_res.status_code == 200
    
    from backend.database import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT confirmation_code FROM admin_registration_requests WHERE username = 'NewAdmin2'")
    code = cursor.fetchone()["confirmation_code"]
    conn.close()
    
    confirm_res = client.post("/auth/admin-register/confirm", data={
        "username": "NewAdmin2",
        "confirmation_code": code
    })
    assert confirm_res.status_code == 200
    admin2_token = confirm_res.json()["token"]
    
    products_res = client.get("/products")
    prod2 = [p for p in products_res.json()["products"] if p["name"] == "Admin 2 Keyboard"][0]
    prod2_id = prod2["id"]
    
    assert prod2["listed_by"] == "NewAdmin2"
    
    update_res = client.put(
        f"/products/{prod2_id}",
        json={"price": 89.00},
        headers={"Authorization": f"Bearer {admin1_token}"}
    )
    assert update_res.status_code == 403
    
    delete_res = client.delete(
        f"/products/{prod2_id}",
        headers={"Authorization": f"Bearer {admin1_token}"}
    )
    assert delete_res.status_code == 403
    
    update_res2 = client.put(
        f"/products/{prod2_id}",
        json={"price": 89.00},
        headers={"Authorization": f"Bearer {admin2_token}"}
    )
    assert update_res2.status_code == 200
    
    user_token = login_as_user()
    add_res = client.post(
        "/cart/add",
        data={"product_id": prod2_id, "quantity": 1, "cart_id": "default"},
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert add_res.status_code == 200
    
    checkout_res = client.post(
        "/checkout/place-order",
        data={"cart_id": "default", "shipping_address": "Admin Isolation Lane, Test City"},
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert checkout_res.status_code == 200
    order_id = checkout_res.json()["order_id"]
    
    orders_res1 = client.get(
        "/orders",
        headers={"Authorization": f"Bearer {admin1_token}"}
    )
    assert orders_res1.status_code == 200
    orders1 = orders_res1.json()["orders"]
    assert not any(o["order_id"] == order_id for o in orders1)
    
    get_res1 = client.get(
        f"/orders/{order_id}",
        headers={"Authorization": f"Bearer {admin1_token}"}
    )
    assert get_res1.status_code == 403
    
    orders_res2 = client.get(
        "/orders",
        headers={"Authorization": f"Bearer {admin2_token}"}
    )
    assert orders_res2.status_code == 200
    orders2 = orders_res2.json()["orders"]
    assert any(o["order_id"] == order_id for o in orders2)


def test_cart_splitting_by_seller():
    p1, admin1_token = create_product("Admin 1 Item", stock=10, price=100.00)
    
    req_res = client.post("/auth/admin-register/request", data={
        "username": "SellerB",
        "password": "sellerpassword",
        "full_name": "Seller B",
        "email": "sellerb@example.com",
        "product_name": "Admin 2 Item",
        "product_description": "Listed by SellerB",
        "product_price": 200.00,
        "product_stock": 10,
        "product_category": "electronics"
    })
    assert req_res.status_code == 200
    
    from backend.database import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT confirmation_code FROM admin_registration_requests WHERE username = 'SellerB'")
    code = cursor.fetchone()["confirmation_code"]
    conn.close()
    
    confirm_res = client.post("/auth/admin-register/confirm", data={
        "username": "SellerB",
        "confirmation_code": code
    })
    assert confirm_res.status_code == 200
    admin2_token = confirm_res.json()["token"]
    
    products_res = client.get("/products")
    p2 = [p for p in products_res.json()["products"] if p["name"] == "Admin 2 Item"][0]
    
    user_token = login_as_user()
    
    add1 = client.post(
        "/cart/add",
        data={"product_id": p1["id"], "quantity": 1, "cart_id": "default"},
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert add1.status_code == 200
    
    add2 = client.post(
        "/cart/add",
        data={"product_id": p2["id"], "quantity": 1, "cart_id": "default"},
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert add2.status_code == 200
    
    place_res = client.post(
        "/checkout/place-order",
        data={"cart_id": "default", "shipping_address": "Splitting Junction, Splitting City"},
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert place_res.status_code == 200
    res_data = place_res.json()
    
    assert "," in res_data["order_id"]
    order_ids = [oid.strip() for oid in res_data["order_id"].split(",")]
    assert len(order_ids) == 2
    
    orders_res1 = client.get(
        "/orders",
        headers={"Authorization": f"Bearer {admin1_token}"}
    )
    orders1 = [o["order_id"] for o in orders_res1.json()["orders"]]
    assert any(oid in orders1 for oid in order_ids)
    
    orders_res2 = client.get(
        "/orders",
        headers={"Authorization": f"Bearer {admin2_token}"}
    )
    orders2 = [o["order_id"] for o in orders_res2.json()["orders"]]
    assert any(oid in orders2 for oid in order_ids)


def test_profile_settings_and_invoice_format():
    # Login as admin to update settings
    admin_token = login_as_admin()
    
    # 1. Update Settings
    settings_res = client.post(
        "/auth/settings",
        data={
            "full_name": "Updated Admin Name",
            "email": "updatedadmin@gmail.com",
            "phone_number": "555-555-5555",
            "profile_photo": "https://example.com/photo.jpg",
            "address": "123 Admin Office, Seller City"
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert settings_res.status_code == 200
    settings_data = settings_res.json()
    assert settings_data["success"] is True
    assert settings_data["user"]["full_name"] == "Updated Admin Name"
    assert settings_data["user"]["email"] == "updatedadmin@gmail.com"
    assert settings_data["user"]["phone_number"] == "555-555-5555"
    assert settings_data["user"]["profile_photo"] == "https://example.com/photo.jpg"
    assert settings_data["user"]["address"] == "123 Admin Office, Seller City"

    # 2. Verify settings are reflected in /me
    me_res = client.get("/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["full_name"] == "Updated Admin Name"
    assert me_data["address"] == "123 Admin Office, Seller City"

    # 3. Create a product listed by this admin (registered as admin)
    prod_res = client.post(
        "/products",
        json={
            "name": "Settings Test Product",
            "description": "Test description",
            "price": 10.0,
            "stock": 100,
            "category": "Electronics",
            "image_url": "",
            "discount_percent": 0.0
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert prod_res.status_code == 200
    prod = prod_res.json()["product"]

    # Login as user
    user_token = login_as_user()

    # Add to cart
    add_res = client.post(
        "/cart/add",
        data={"product_id": prod["id"], "quantity": 1, "cart_id": "default"},
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert add_res.status_code == 200

    # Place order
    place_res = client.post(
        "/checkout/place-order",
        data={"cart_id": "default", "shipping_address": "456 User Street, User City"},
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert place_res.status_code == 200
    order_id = place_res.json()["order_id"]

    # Get order detail and verify seller_name and seller_address
    order_res = client.get(f"/orders/{order_id}", headers={"Authorization": f"Bearer {user_token}"})
    assert order_res.status_code == 200
    order_data = order_res.json()
    assert order_data["seller_name"] == "Updated Admin Name"
    assert order_data["seller_address"] == "123 Admin Office, Seller City"
