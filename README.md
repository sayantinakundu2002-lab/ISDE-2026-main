# ISDE 2026 MiniShop

ISDE 2026 MiniShop is a full-stack e-commerce learning project built with a FastAPI backend, SQLite storage, and a React + Vite frontend. It demonstrates practical API design, authentication, product management, cart operations, checkout, order state transitions, inventory observers, and several software design patterns in one small application.

The project is designed to run locally or inside GitHub Codespaces. A shared SQLite database file is included so every clone starts from the same cleaned baseline.

## Default Test Accounts

Use these accounts for running and testing the project.

| Role | Username | Email | Password | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| User | `TestUser` | `testuser@gmail.com` | `TesUser` | Browse products, use the cart, checkout, and view personal orders. |
| Admin | `TestAdmin` | `testadmin@gmail.com` | `TestAdmin` | Create, edit, and delete products; manage orders; inspect inventory logs. |

You can log in with either the username or the email address.

## Clean Data Baseline

The checked-in database baseline intentionally contains:

- The `TestUser` account.
- The `TestAdmin` account.
- No products.
- No carts.
- No orders.
- No inventory logs.
- No old admin or old sample catalog data.

This means the first thing to do in a manual demo is sign in as `TestAdmin` and create products from the Admin Dashboard. Product data you add while running the app is stored in `backend/minishop.db`.

The application also has a one-time baseline guard in `backend/database.py`. If an older local database still contains the previous seed data, the app will clean it once and apply the new baseline. After that, normal app restarts do not wipe new products or orders you create during testing.

## Tech Stack

- Backend: Python, FastAPI, Uvicorn, SQLite, Pydantic.
- Frontend: React, Vite, lucide-react.
- Tests: pytest and FastAPI TestClient.
- Package runners: npm scripts from the repository root.

## Project Structure

```text
ISDE-2026/
  backend/
    app.py                  FastAPI app setup, CORS, static files, route registration
    auth.py                 Token authentication and role checks
    config.py               Checkout, discount, shipping, tax, and threshold settings
    data.py                 Shared category constants and empty compatibility stores
    database.py             SQLite schema, baseline accounts, and reset helpers
    main.py                 Backend entry point and compatibility exports
    managers/
      cart.py               Cart persistence and cart operations
      inventory.py          Product catalog persistence and stock updates
      order.py              Order persistence and state transitions
    patterns/
      observer.py           Stock decrement logs and low-stock alerts
      singleton.py          Singleton manager metaclass
      state.py              Order lifecycle state machine
      strategy.py           Discount, shipping, tax, and checkout strategies
    routes/
      auth.py               Login, registration, and current-user endpoints
      cart.py               Cart add, update, clear, remove, and view endpoints
      checkout.py           Checkout and order management endpoints
      inventory.py          Admin inventory log endpoints
      products.py           Product CRUD, categories, homepage, and upload endpoints
    minishop.db             Shared local development database baseline
    minishop_test.db        Shared test database baseline
  frontend/
    src/
      api.js                Frontend API client and Codespaces URL detection
      App.jsx               Main routes and global app state
      components/           Header, product cards, category sidebar, terminal log
      pages/                Login, home, cart, checkout, admin, orders, product forms
    vite.config.js          Vite dev server config
  tests/
    test_api.py             API integration tests
    test_design_patterns.py Design pattern unit tests
  package.json              Root scripts for backend, frontend, dev, and tests
  requirements.txt          Python dependencies
```

## Prerequisites

Install these before running locally:

- Python 3.10 or newer.
- Node.js 18 or newer.
- npm.
- Git.

GitHub Codespaces already includes the main system tools. You still need to install this project's Python and Node dependencies inside the codespace.

## Local Setup

Clone the project and enter the repository:

```bash
git clone https://github.com/sayantinakundu2002-lab/ISDE-2026.git
cd ISDE-2026-main
```

Create and activate a Python virtual environment:

```bash
# Windows PowerShell
python -m venv venv
.\venv\Scripts\Activate.ps1

# macOS or Linux
python3 -m venv venv
Set-ExecutionPolicy Bypass -Scope Process
source venv/bin/activate
```

Install backend dependencies:

```bash
pip install -r requirements.txt
```

Install root and frontend Node dependencies:

```bash
npm install
npm install --prefix frontend
```

## Run Locally

Run backend and frontend together from the repository root with one command:

```bash
npm start
```

This starts:

- Backend API: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
- Frontend app: `http://localhost:5173`

You can also run each side separately.

Backend only:

```bash
npm run backend
```

Frontend only:

```bash
npm run frontend
```

## GitHub Codespaces Setup

1. Open the repository on GitHub.
2. Select **Code**.
3. Select **Codespaces**.
4. Create or open a codespace.
5. In the codespace terminal, install dependencies:

```bash
pip install -r requirements.txt
npm install
npm install --prefix frontend
```

6. Start the full app:

```bash
npm start
```

7. Open the forwarded `5173` port for the frontend.
8. Keep the forwarded `8000` port available for the backend API.

The scripts bind both dev servers to `0.0.0.0`, which is required for reliable port forwarding in Codespaces. The frontend API client automatically maps a Codespaces frontend URL such as:

```text
https://your-codespace-name-5173.app.github.dev
```

to the matching backend URL:

```text
https://your-codespace-name-8000.app.github.dev
```

If your Codespaces port URL format is different, set the API URL manually before starting the frontend:

```bash
# macOS/Linux
export VITE_API_BASE_URL=https://your-backend-8000-url
npm start

# Windows PowerShell
$env:VITE_API_BASE_URL="https://your-backend-8000-url"
npm start
```

## Manual Testing Flow

1. Open the frontend at `http://localhost:5173` locally or the forwarded `5173` URL in Codespaces.
2. Go to the login page.
3. Sign in as the admin:

```text
Username: TestAdmin
Password: TestAdmin
```

4. Open the Admin Dashboard.
5. Create a product with a name, description, price, stock quantity, category, and image URL.
6. Browse the catalog and confirm the new product appears.
7. Log out and sign in as the user:

```text
Username: TestUser
Password: TesUser
```

8. Add the product to the cart.
9. Open the cart and proceed to checkout.
10. Optionally test promo codes:

```text
SAVE10
BULK20
```

11. Place the order.
12. Log back in as `TestAdmin`.
13. Open the Admin Dashboard and transition the order through:

```text
PAID -> PACKED -> SHIPPED -> DELIVERED
```

14. Open Inventory Logs to inspect stock deductions and low-stock alerts.

## Automated Tests

Run the full test suite from the repository root:

```bash
python -m pytest -v
```

The tests cover:

- API health checks.
- Empty default product catalog.
- Default user and admin login.
- Admin product creation.
- Cart add, view, and remove operations.
- Registration flow.
- Checkout and order delivery transitions.
- Singleton manager behavior.
- Strategy pattern calculations.
- State pattern order lifecycle rules.
- Observer pattern stock decrement and low-stock alert behavior.

The tests use `backend/minishop_test.db` and reset it to the same default baseline before API tests.

## Important Runtime Notes

- The production development database is `backend/minishop.db`.
- The test database is `backend/minishop_test.db`.
- Both database files are intentionally kept in the project so each clone has the same baseline data.
- Do not delete the database files if you want the repository to keep the shared baseline.
- If you want to remove local products, orders, carts, and logs while keeping the default accounts, run:

```bash
python -c "from backend.database import reset_database_to_defaults; reset_database_to_defaults()"
```

- Uploaded product images are saved under `backend/static/uploads/`.
- The frontend reads `VITE_API_BASE_URL` when it is set.
- Without `VITE_API_BASE_URL`, the frontend uses `http://localhost:8000` locally and auto-detects Codespaces forwarded backend URLs.

## Useful Commands

Install everything:

```bash
pip install -r requirements.txt
npm install
npm install --prefix frontend
```

Run full app:

```bash
npm start
```

Equivalent development command:

```bash
npm run dev
```

Run backend only:

```bash
npm run backend
```

Run frontend only:

```bash
npm run frontend
```

Run tests:

```bash
python -m pytest -v
```

Reset database baseline:

```bash
python -c "from backend.database import reset_database_to_defaults; reset_database_to_defaults()"
```

## Troubleshooting

If the frontend opens but API calls fail:

- Confirm the backend is running on port `8000`.
- In Codespaces, confirm port `8000` is forwarded.
- Set `VITE_API_BASE_URL` manually to the forwarded backend URL and restart `npm start`.

If login fails:

- Use `TestUser / TesUser` for the user account.
- Use `TestAdmin / TestAdmin` for the admin account.
- You may also use `testuser@gmail.com` or `testadmin@gmail.com` in the username field.
- Reset the database baseline if local data was changed.

If products do not appear:

- The default catalog is intentionally empty.
- Sign in as `TestAdmin`.
- Create products from the Admin Dashboard.
- Refresh the catalog.

If tests fail because imports cannot be found:

- Run tests from the repository root, not from inside `backend/` or `frontend/`.
- Confirm the virtual environment is active.
- Reinstall Python dependencies with `pip install -r requirements.txt`.

If `npm start` cannot find `concurrently`:

- Run `npm install` from the repository root.

If the frontend dependencies are missing:

- Run `npm install --prefix frontend`.

## Design Patterns Included

| Pattern | Location | What it does |
| :--- | :--- | :--- |
| Singleton | `backend/patterns/singleton.py` | Ensures shared manager services have one instance per process. |
| Strategy | `backend/patterns/strategy.py` | Switches discount, shipping, and tax calculations without changing checkout routes. |
| State | `backend/patterns/state.py` | Enforces valid order transitions from creation through delivery or cancellation. |
| Observer | `backend/patterns/observer.py` | Reacts to stock changes by recording logs and generating low-stock alerts. |

## API Overview

Key backend routes:

| Method | Route | Purpose |
| :--- | :--- | :--- |
| `GET` | `/` | Health and welcome response. |
| `POST` | `/auth/login` | Log in with username/email and password. |
| `POST` | `/auth/register` | Register a new account. |
| `GET` | `/auth/me` | Read the current logged-in user. |
| `GET` | `/categories` | List product categories. |
| `GET` | `/products` | List products. |
| `POST` | `/products` | Add a product. Admin only. |
| `PUT` | `/products/{product_id}` | Update a product. Admin only. |
| `DELETE` | `/products/{product_id}` | Delete a product. Admin only. |
| `POST` | `/cart/add` | Add an item to a cart. |
| `GET` | `/cart` | View a cart. |
| `POST` | `/checkout/place-order` | Place an order from the current cart. |
| `GET` | `/orders` | List orders. Admin sees all; users see their own. |
| `POST` | `/orders/{order_id}/transition` | Move an order to the next state. Admin only. |
| `GET` | `/admin/inventory/logs` | View stock logs and alerts. Admin only. |
