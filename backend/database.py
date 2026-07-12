# backend/database.py
import sqlite3
import os
import hashlib

DB_NAME = "minishop_test.db" if os.environ.get("TESTING") == "1" else "minishop.db"
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), DB_NAME)
BASELINE_VERSION = "2026-07-01-default-test-accounts"

DEFAULT_USERS = (
    {
        "username": "TestUser",
        "email": "testuser@gmail.com",
        "password": "TestUser",
        "role": "user",
        "full_name": "TestUser",
    },
    {
        "username": "TestAdmin",
        "email": "testadmin@gmail.com",
        "password": "TestAdmin",
        "role": "admin",
        "full_name": "TestAdmin",
    },
)

RESET_TABLES = (
    "otps",
    "carts",
    "order_history",
    "order_items",
    "orders",
    "inventory_logs",
    "products",
    "users",
)

def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def _create_schema(cursor):
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        email TEXT,
        password TEXT,
        role TEXT,
        full_name TEXT,
        is_verified INTEGER DEFAULT 1
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS otps (
        email TEXT PRIMARY KEY,
        otp_code TEXT,
        expires_at REAL,
        purpose TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        description TEXT,
        price REAL,
        stock INTEGER,
        category TEXT,
        image_url TEXT,
        rating REAL DEFAULT 4.0,
        discount_percent REAL DEFAULT 0.0
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS carts (
        cart_id TEXT,
        product_id INTEGER,
        quantity INTEGER,
        PRIMARY KEY (cart_id, product_id)
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS orders (
        order_id TEXT PRIMARY KEY,
        username TEXT,
        state TEXT,
        subtotal REAL,
        discount REAL,
        shipping REAL,
        tax REAL,
        total REAL,
        created_at TEXT,
        shipping_address TEXT,
        delivery_otp TEXT
    )
    """)
    _ensure_column(cursor, "orders", "shipping_address", "TEXT")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT,
        product_id INTEGER,
        name TEXT,
        quantity INTEGER,
        unit_price REAL,
        subtotal REAL
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS order_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT,
        from_state TEXT,
        to_state TEXT,
        timestamp TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS inventory_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER,
        product_name TEXT,
        change_type TEXT,
        quantity INTEGER,
        timestamp TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS app_metadata (
        key TEXT PRIMARY KEY,
        value TEXT
    )
    """)


def _ensure_column(cursor, table_name: str, column_name: str, column_type: str):
    """Add a missing column to an existing SQLite table."""
    cursor.execute(f"PRAGMA table_info({table_name})")
    existing_columns = {row["name"] for row in cursor.fetchall()}
    if column_name not in existing_columns:
        cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}")


def _reset_runtime_data(cursor):
    for table in RESET_TABLES:
        cursor.execute(f"DELETE FROM {table}")

    try:
        cursor.execute(
            "DELETE FROM sqlite_sequence WHERE name IN (?, ?, ?)",
            ("products", "order_items", "inventory_logs")
        )
    except sqlite3.OperationalError:
        pass


def _ensure_default_users(cursor):
    for user in DEFAULT_USERS:
        cursor.execute("""
        INSERT INTO users (username, email, password, role, full_name, is_verified)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(username) DO UPDATE SET
            email = excluded.email,
            password = excluded.password,
            role = excluded.role,
            full_name = excluded.full_name,
            is_verified = excluded.is_verified
        """, (
            user["username"],
            user["email"],
            _hash_password(user["password"]),
            user["role"],
            user["full_name"],
            1
        ))


def _set_baseline_version(cursor):
    cursor.execute("""
    INSERT INTO app_metadata (key, value)
    VALUES ('baseline_version', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
    """, (BASELINE_VERSION,))


def _needs_baseline_reset(cursor) -> bool:
    cursor.execute("SELECT value FROM app_metadata WHERE key = 'baseline_version'")
    row = cursor.fetchone()
    return not row or row["value"] != BASELINE_VERSION


def reset_database_to_defaults():
    """Reset this SQLite file to the shared project baseline."""
    conn = get_db_connection()
    cursor = conn.cursor()
    _create_schema(cursor)
    _reset_runtime_data(cursor)
    _ensure_default_users(cursor)
    _set_baseline_version(cursor)
    conn.commit()
    cursor.execute("VACUUM")
    conn.close()


def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    _create_schema(cursor)
    needs_reset = _needs_baseline_reset(cursor)
    if needs_reset:
        _reset_runtime_data(cursor)
        _set_baseline_version(cursor)

    _ensure_default_users(cursor)

    conn.commit()
    if needs_reset:
        cursor.execute("VACUUM")
    conn.close()
