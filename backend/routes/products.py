# backend/routes/products.py
"""Product CRUD endpoints + homepage + image upload + categories."""

import os
import uuid
import shutil
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Depends

from backend.models import ProductCreate, ProductUpdate
from backend.data import CATEGORIES
from backend.managers import inventory_manager
from backend.auth import require_admin

router = APIRouter()

# Paths for file uploads
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
UPLOAD_DIR = os.path.join(STATIC_DIR, "uploads")


@router.get("/")
def homepage():
    return {"message": "Welcome to ISDE MiniShop!"}


@router.post("/upload")
def upload_image(file: UploadFile = File(...)):
    # Validate the file type
    allowed_extensions = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"}
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Only images (PNG, JPG, JPEG, WEBP, GIF, SVG) are allowed.")

    # Generate unique filename
    unique_filename = f"{uuid.uuid4().hex}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")

    # Return a relative path so it resolves correctly in both localhost and Codespaces
    return {"url": f"/static/uploads/{unique_filename}"}


@router.get("/categories")
def list_categories():
    return {"categories": CATEGORIES}


@router.get("/products")
def list_products(category: Optional[str] = None, cart_id: str = "default"):
    products = inventory_manager.get_all(category)
    return {"products": products, "cart_id": cart_id, "total_count": len(products)}


@router.get("/products/{product_id}")
def get_product(product_id: int):
    product = inventory_manager.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    return product


@router.post("/products")
def add_product(product: ProductCreate, admin: dict = Depends(require_admin)):
    new_product = inventory_manager.add_product(
        name=product.name,
        description=product.description,
        price=product.price,
        stock=product.stock,
        category=product.category,
        image_url=product.image_url,
        rating=product.rating,
        discount_percent=product.discount_percent,
        listed_by=admin["username"]
    )
    return {"message": f"Product '{product.name}' added successfully", "product": new_product}


@router.put("/products/{product_id}")
def update_product(product_id: int, updates: ProductUpdate, admin: dict = Depends(require_admin)):
    product = inventory_manager.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    if product.get("listed_by") != admin["username"]:
        raise HTTPException(status_code=403, detail="Access denied. You can only manage your own products.")
    updated = inventory_manager.update_product(product_id, updates.model_dump(exclude_none=True))
    return {"message": f"Product {product_id} updated", "product": updated}


@router.delete("/products/{product_id}")
def delete_product(product_id: int, admin: dict = Depends(require_admin)):
    product = inventory_manager.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    if product.get("listed_by") != admin["username"]:
        raise HTTPException(status_code=403, detail="Access denied. You can only manage your own products.")
    deleted = inventory_manager.delete_product(product_id)
    return {"message": f"Product '{deleted['name']}' deleted successfully"}
