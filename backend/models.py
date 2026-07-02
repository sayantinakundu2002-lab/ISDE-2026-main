# backend/models.py
"""Pydantic request/response models for the ISDE MiniShop API."""

from pydantic import BaseModel
from typing import Optional


class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    stock: int
    category: str
    image_url: str
    rating: Optional[float] = 4.0
    discount_percent: Optional[float] = 0.0


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    rating: Optional[float] = None
    discount_percent: Optional[float] = None
