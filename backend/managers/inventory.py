# backend/managers/inventory.py
"""InventoryManager — Singleton service for product catalog operations."""

import logging
from typing import Optional

from backend.patterns.singleton import SingletonMeta
from backend.patterns.observer import StockObserver
from backend.data import CATEGORIES


class InventoryManager(metaclass=SingletonMeta):
    def __init__(self):
        self.products = {}
        self._observers = []
        self.load_from_db()

    def load_from_db(self):
        try:
            from backend.database import get_db_connection
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM products")
            self.products.clear()
            for row in cursor.fetchall():
                self.products[row["id"]] = dict(row)
            conn.close()
        except Exception as e:
            logging.error(f"Error loading inventory from DB: {e}")

    def add_observer(self, observer: StockObserver):
        self._observers.append(observer)

    def notify_observers(self, product_id: int, old_stock: int, new_stock: int):
        for obs in self._observers:
            try:
                obs.update(product_id, old_stock, new_stock)
            except Exception as e:
                logging.error(f"Observer error: {e}")

    def get_all(self, category: Optional[str] = None):
        # Refresh from database to ensure fresh data
        self.load_from_db()
        products_list = list(self.products.values())
        if category:
            products_list = [p for p in products_list if p["category"] == category]
        return products_list

    def get_product(self, product_id: int):
        # Allow string keys from client conversions
        try:
            pid = int(product_id)
        except ValueError:
            pid = product_id
        
        # Pull fresh from DB or fallback to memory
        try:
            from backend.database import get_db_connection
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM products WHERE id = ?", (pid,))
            row = cursor.fetchone()
            conn.close()
            if row:
                self.products[pid] = dict(row)
                return self.products[pid]
        except Exception as e:
            logging.error(f"Error fetching product from DB: {e}")
            
        return self.products.get(pid)

    def add_product(self, name: str, description: str, price: float, stock: int, category: str, image_url: str, rating: Optional[float] = 4.0, discount_percent: Optional[float] = 0.0):
        try:
            from backend.database import get_db_connection
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO products (name, description, price, stock, category, image_url, rating, discount_percent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (name, description, price, stock, category, image_url, rating or 4.0, discount_percent or 0.0))
            new_id = cursor.lastrowid
            conn.commit()
            conn.close()
        except Exception as e:
            logging.error(f"Error saving product to DB: {e}")
            # Fallback to local auto-increment
            new_id = max(self.products.keys(), default=0) + 1

        new_product = {
            "id": new_id,
            "name": name,
            "description": description,
            "price": price,
            "stock": stock,
            "category": category,
            "image_url": image_url,
            "rating": rating or 4.0,
            "discount_percent": discount_percent or 0.0
        }
        self.products[new_id] = new_product
        self.notify_observers(new_id, 0, stock)
        return new_product

    def update_product(self, product_id: int, updates: dict):
        try:
            pid = int(product_id)
        except ValueError:
            pid = product_id

        product = self.get_product(pid)
        if not product:
            return None
        old_stock = product["stock"]

        if updates:
            try:
                from backend.database import get_db_connection
                fields = []
                values = []
                for field, value in updates.items():
                    fields.append(f"{field} = ?")
                    values.append(value)
                values.append(pid)
                
                conn = get_db_connection()
                cursor = conn.cursor()
                cursor.execute(f"UPDATE products SET {', '.join(fields)} WHERE id = ?", tuple(values))
                conn.commit()
                conn.close()
            except Exception as e:
                logging.error(f"Error updating product in DB: {e}")

        # Update in-memory copy
        for field, value in updates.items():
            product[field] = value
        
        new_stock = product["stock"]
        if old_stock != new_stock:
            self.notify_observers(pid, old_stock, new_stock)
        return product

    def delete_product(self, product_id: int):
        try:
            pid = int(product_id)
        except ValueError:
            pid = product_id

        product = self.get_product(pid)
        if not product:
            return None

        try:
            from backend.database import get_db_connection
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("DELETE FROM products WHERE id = ?", (pid,))
            conn.commit()
            conn.close()
        except Exception as e:
            logging.error(f"Error deleting product from DB: {e}")

        return self.products.pop(pid, None)

    def check_stock(self, product_id: int, quantity: int) -> bool:
        product = self.get_product(product_id)
        if not product:
            return False
        return product["stock"] >= quantity

    def reduce_stock(self, product_id: int, quantity: int) -> bool:
        try:
            pid = int(product_id)
        except ValueError:
            pid = product_id

        product = self.get_product(pid)
        if not product:
            return False
        old_stock = product["stock"]
        new_stock = old_stock - quantity

        try:
            from backend.database import get_db_connection
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("UPDATE products SET stock = ? WHERE id = ?", (new_stock, pid))
            conn.commit()
            conn.close()
        except Exception as e:
            logging.error(f"Error reducing stock in DB: {e}")

        product["stock"] = new_stock
        self.notify_observers(pid, old_stock, new_stock)
        return True
