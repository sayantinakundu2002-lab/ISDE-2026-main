# backend/routes/inventory.py
"""Inventory admin endpoints — stock logs and reorder alerts (Issue #4)."""

from fastapi import APIRouter, Depends

from backend.managers import stock_decrement_observer, low_stock_observer
from backend.auth import require_admin

router = APIRouter()


@router.get("/admin/inventory/logs")
def get_inventory_logs(admin: dict = Depends(require_admin)):
    """Return all stock decrement logs and low-stock reorder alerts.

    Returns:
        logs: list of strings — all product stock decrement updates
        reorders: list of strings — all low product stock (reorder) updates
    """
    return {
        "logs": stock_decrement_observer.logs,
        "reorders": low_stock_observer.reorders,
    }
