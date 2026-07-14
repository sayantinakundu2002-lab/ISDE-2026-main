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
        "phone_number": "123-456-7890",
        "profile_photo": "",
        "address": "123 Delivery Road, Test City",
    },
    {
        "username": "TestAdmin",
        "email": "testadmin@gmail.com",
        "password": "TestAdmin",
        "role": "admin",
        "full_name": "TestAdmin",
        "phone_number": "987-654-3210",
        "profile_photo": "",
        "address": "100 Seller Blvd, E-commerce City",
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
    "admin_registration_requests",
    "tokens",
)

def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def get_db_connection():
    conn = sqlite3.connect(DB_PATH, timeout=5.0)
    # Enable WAL mode for concurrent read/write and performance
    try:
        conn.execute("PRAGMA journal_mode=WAL;")
    except Exception:
        pass
    conn.row_factory = sqlite3.Row
    return conn

def _create_schema(cursor):
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        account_id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT COLLATE NOCASE NOT NULL,
        email TEXT COLLATE NOCASE NOT NULL,
        password TEXT,
        role TEXT NOT NULL,
        full_name TEXT,
        is_verified INTEGER DEFAULT 1,
        phone_number TEXT,
        profile_photo TEXT,
        address TEXT,
        UNIQUE(role, email)
    )
    """)
    _ensure_column(cursor, "users", "phone_number", "TEXT")
    _ensure_column(cursor, "users", "profile_photo", "TEXT")
    _ensure_column(cursor, "users", "address", "TEXT")
    _migrate_users_to_role_scoped_identity(cursor)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tokens (
        token TEXT PRIMARY KEY,
        account_id INTEGER,
        username TEXT,
        role TEXT,
        created_at REAL
    )
    """)
    _ensure_column(cursor, "tokens", "account_id", "INTEGER")
    _ensure_column(cursor, "tokens", "role", "TEXT")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS admin_registration_requests (
        request_id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        email TEXT COLLATE NOCASE,
        password TEXT,
        full_name TEXT,
        product_name TEXT,
        product_description TEXT,
        product_price REAL,
        product_stock INTEGER,
        product_category TEXT,
        image_url TEXT,
        confirmation_code TEXT,
        status TEXT DEFAULT 'PENDING'
    )
    """)
    _migrate_admin_registration_requests(cursor)
    cursor.execute("""
    CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_registration_requests_email
    ON admin_registration_requests(email)
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
        discount_percent REAL DEFAULT 0.0,
        listed_by TEXT DEFAULT 'TestAdmin',
        listed_by_account_id INTEGER
    )
    """)
    _ensure_column(cursor, "products", "listed_by", "TEXT DEFAULT 'TestAdmin'")
    _ensure_column(cursor, "products", "listed_by_account_id", "INTEGER")

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
        delivery_otp TEXT,
        seller_username TEXT,
        customer_account_id INTEGER,
        seller_account_id INTEGER
    )
    """)
    _ensure_column(cursor, "orders", "shipping_address", "TEXT")
    _ensure_column(cursor, "orders", "seller_username", "TEXT")
    _ensure_column(cursor, "orders", "customer_account_id", "INTEGER")
    _ensure_column(cursor, "orders", "seller_account_id", "INTEGER")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT,
        product_id INTEGER,
        name TEXT,
        quantity INTEGER,
        unit_price REAL,
        subtotal REAL,
        image_url TEXT
    )
    """)
    _ensure_column(cursor, "order_items", "image_url", "TEXT")

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

    _backfill_account_references(cursor)


def _ensure_column(cursor, table_name: str, column_name: str, column_type: str):
    """Add a missing column to an existing SQLite table."""
    cursor.execute(f"PRAGMA table_info({table_name})")
    existing_columns = {row["name"] for row in cursor.fetchall()}
    if column_name not in existing_columns:
        cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}")


def _migrate_users_to_role_scoped_identity(cursor):
    """Move old username-primary-key/user-role-unique tables to email-scoped accounts."""
    cursor.execute("PRAGMA table_info(users)")
    columns = {row["name"]: row for row in cursor.fetchall()}
    username_pk = columns["username"]["pk"] if "username" in columns else 0
    cursor.execute("PRAGMA index_list(users)")
    unique_username_by_role = False
    for index_row in cursor.fetchall():
        if not index_row["unique"]:
            continue
        index_name = index_row["name"]
        cursor.execute(f"PRAGMA index_info({index_name})")
        index_columns = [row["name"] for row in cursor.fetchall()]
        if index_columns == ["role", "username"]:
            unique_username_by_role = True
            break

    if "account_id" in columns and username_pk == 0 and not unique_username_by_role:
        return

    cursor.execute("""
    CREATE TABLE users_role_scoped (
        account_id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT COLLATE NOCASE NOT NULL,
        email TEXT COLLATE NOCASE NOT NULL,
        password TEXT,
        role TEXT NOT NULL,
        full_name TEXT,
        is_verified INTEGER DEFAULT 1,
        phone_number TEXT,
        profile_photo TEXT,
        address TEXT,
        UNIQUE(role, email)
    )
    """)

    selectable_columns = {
        "username": "username",
        "email": "COALESCE(NULLIF(email, ''), username)",
        "password": "password",
        "role": "COALESCE(NULLIF(role, ''), 'user')",
        "full_name": "COALESCE(NULLIF(full_name, ''), username)",
        "is_verified": "COALESCE(is_verified, 1)",
        "phone_number": "phone_number" if "phone_number" in columns else "''",
        "profile_photo": "profile_photo" if "profile_photo" in columns else "''",
        "address": "address" if "address" in columns else "''",
    }
    cursor.execute(f"""
    INSERT OR IGNORE INTO users_role_scoped (
        username, email, password, role, full_name, is_verified, phone_number, profile_photo, address
    )
    SELECT
        {selectable_columns["username"]},
        {selectable_columns["email"]},
        {selectable_columns["password"]},
        {selectable_columns["role"]},
        {selectable_columns["full_name"]},
        {selectable_columns["is_verified"]},
        {selectable_columns["phone_number"]},
        {selectable_columns["profile_photo"]},
        {selectable_columns["address"]}
    FROM users
    """)
    cursor.execute("DROP TABLE users")
    cursor.execute("ALTER TABLE users_role_scoped RENAME TO users")


def _migrate_admin_registration_requests(cursor):
    """Move old username-primary-key admin requests to email-scoped requests."""
    cursor.execute("PRAGMA table_info(admin_registration_requests)")
    columns = {row["name"]: row for row in cursor.fetchall()}
    username_pk = columns["username"]["pk"] if "username" in columns else 0
    if "request_id" in columns and username_pk == 0:
        return

    cursor.execute("""
    CREATE TABLE admin_registration_requests_new (
        request_id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        email TEXT COLLATE NOCASE,
        password TEXT,
        full_name TEXT,
        product_name TEXT,
        product_description TEXT,
        product_price REAL,
        product_stock INTEGER,
        product_category TEXT,
        image_url TEXT,
        confirmation_code TEXT,
        status TEXT DEFAULT 'PENDING'
    )
    """)
    cursor.execute("""
    INSERT OR IGNORE INTO admin_registration_requests_new (
        username, email, password, full_name,
        product_name, product_description, product_price, product_stock, product_category,
        image_url, confirmation_code, status
    )
    SELECT
        username, email, password, full_name,
        product_name, product_description, product_price, product_stock, product_category,
        image_url, confirmation_code, status
    FROM admin_registration_requests
    """)
    cursor.execute("DROP TABLE admin_registration_requests")
    cursor.execute("ALTER TABLE admin_registration_requests_new RENAME TO admin_registration_requests")


def _backfill_account_references(cursor):
    cursor.execute("""
    UPDATE products
    SET listed_by_account_id = (
        SELECT account_id FROM users
        WHERE users.role = 'admin' AND users.username = products.listed_by
        ORDER BY account_id
        LIMIT 1
    )
    WHERE listed_by_account_id IS NULL
    """)

    cursor.execute("""
    UPDATE orders
    SET customer_account_id = (
        SELECT account_id FROM users
        WHERE users.role = 'user' AND users.username = orders.username
        ORDER BY account_id
        LIMIT 1
    )
    WHERE customer_account_id IS NULL
    """)

    cursor.execute("""
    UPDATE orders
    SET seller_account_id = (
        SELECT account_id FROM users
        WHERE users.role = 'admin' AND users.username = orders.seller_username
        ORDER BY account_id
        LIMIT 1
    )
    WHERE seller_account_id IS NULL
    """)


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
        INSERT INTO users (username, email, password, role, full_name, is_verified, phone_number, profile_photo, address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(role, email) DO UPDATE SET
            username = excluded.username,
            password = excluded.password,
            full_name = excluded.full_name,
            is_verified = excluded.is_verified,
            phone_number = COALESCE(users.phone_number, excluded.phone_number),
            profile_photo = COALESCE(users.profile_photo, excluded.profile_photo),
            address = COALESCE(users.address, excluded.address)
        """, (
            user["username"],
            user["email"],
            _hash_password(user["password"]),
            user["role"],
            user["full_name"],
            1,
            user.get("phone_number", ""),
            user.get("profile_photo", ""),
            user.get("address", "")
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
