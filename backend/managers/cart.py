# backend/managers/cart.py
"""CartManager — Singleton service for shopping cart operations."""

from backend.patterns.singleton import SingletonMeta
from backend.data import CARTS


class CartManager(metaclass=SingletonMeta):
    def __init__(self):
        self.carts = {}
        self.load_from_db()

    def load_from_db(self):
        try:
            from backend.database import get_db_connection
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM carts")
            self.carts.clear()
            for row in cursor.fetchall():
                cid = row["cart_id"]
                pid = row["product_id"]
                qty = row["quantity"]
                if cid not in self.carts:
                    self.carts[cid] = {}
                self.carts[cid][pid] = qty
            conn.close()
        except Exception as e:
            import logging
            logging.error(f"Error loading carts from DB: {e}")

    def get_cart(self, cart_id: str):
        self.load_from_db()
        if cart_id not in self.carts:
            self.carts[cart_id] = {}
        return self.carts[cart_id]

    def add_to_cart(self, cart_id: str, product_id: int, quantity: int):
        cart = self.get_cart(cart_id)
        current = cart.get(product_id, 0)
        new_qty = current + quantity
        
        try:
            from backend.database import get_db_connection
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO carts (cart_id, product_id, quantity)
            VALUES (?, ?, ?)
            ON CONFLICT(cart_id, product_id) DO UPDATE SET quantity = ?
            """, (cart_id, product_id, new_qty, new_qty))
            conn.commit()
            conn.close()
        except Exception as e:
            import logging
            logging.error(f"Error adding to cart in DB: {e}")
            
        cart[product_id] = new_qty
        return new_qty

    def update_quantity(self, cart_id: str, product_id: int, quantity: int):
        cart = self.get_cart(cart_id)
        if quantity <= 0:
            if product_id in cart:
                del cart[product_id]
            try:
                from backend.database import get_db_connection
                conn = get_db_connection()
                cursor = conn.cursor()
                cursor.execute("DELETE FROM carts WHERE cart_id = ? AND product_id = ?", (cart_id, product_id))
                conn.commit()
                conn.close()
            except Exception as e:
                import logging
                logging.error(f"Error deleting from cart in DB: {e}")
        else:
            try:
                from backend.database import get_db_connection
                conn = get_db_connection()
                cursor = conn.cursor()
                cursor.execute("""
                INSERT INTO carts (cart_id, product_id, quantity)
                VALUES (?, ?, ?)
                ON CONFLICT(cart_id, product_id) DO UPDATE SET quantity = ?
                """, (cart_id, product_id, quantity, quantity))
                conn.commit()
                conn.close()
            except Exception as e:
                import logging
                logging.error(f"Error updating cart quantity in DB: {e}")
            cart[product_id] = quantity

    def remove_from_cart(self, cart_id: str, product_id: int):
        cart = self.get_cart(cart_id)
        if product_id in cart:
            del cart[product_id]
            try:
                from backend.database import get_db_connection
                conn = get_db_connection()
                cursor = conn.cursor()
                cursor.execute("DELETE FROM carts WHERE cart_id = ? AND product_id = ?", (cart_id, product_id))
                conn.commit()
                conn.close()
            except Exception as e:
                import logging
                logging.error(f"Error removing from cart in DB: {e}")
            return True
        return False

    def clear_cart(self, cart_id: str):
        self.carts[cart_id] = {}
        try:
            from backend.database import get_db_connection
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("DELETE FROM carts WHERE cart_id = ?", (cart_id,))
            conn.commit()
            conn.close()
        except Exception as e:
            import logging
            logging.error(f"Error clearing cart in DB: {e}")
