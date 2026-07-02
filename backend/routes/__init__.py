# backend/routes/__init__.py
"""Routes package — registers all API routers on the FastAPI app."""

from backend.routes.products import router as products_router
from backend.routes.cart import router as cart_router
from backend.routes.checkout import router as checkout_router
from backend.routes.inventory import router as inventory_router
from backend.routes.auth import router as auth_router


def register_routes(app):
    """Include all route modules on the given FastAPI app instance."""
    app.include_router(auth_router)
    app.include_router(products_router)
    app.include_router(cart_router)
    app.include_router(checkout_router)
    app.include_router(inventory_router)
