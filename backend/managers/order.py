# backend/managers/order.py
import random
import logging
from datetime import datetime
from typing import Optional

from backend.patterns.singleton import SingletonMeta
from backend.patterns.state import Order, OrderState


class OrderManager(metaclass=SingletonMeta):
    def __init__(self):
        self.orders = {}
        self.load_from_db()

    def load_from_db(self):
        try:
            from backend.database import get_db_connection
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Fetch all orders
            cursor.execute("SELECT * FROM orders")
            orders_rows = cursor.fetchall()
            
            self.orders.clear()
            for r in orders_rows:
                order_id = r["order_id"]
                
                # Fetch items for this order
                cursor.execute("SELECT * FROM order_items WHERE order_id = ?", (order_id,))
                items_rows = cursor.fetchall()
                items = []
                for it in items_rows:
                    item_dict = {
                        "product_id": it["product_id"],
                        "name": it["name"],
                        "quantity": it["quantity"],
                        "unit_price": it["unit_price"],
                        "subtotal": it["subtotal"]
                    }
                    # Include image_url if available
                    try:
                        img = it["image_url"]
                        if img:
                            item_dict["image_url"] = img
                    except (IndexError, KeyError):
                        pass
                    items.append(item_dict)
                
                # Fetch history for this order
                cursor.execute("SELECT * FROM order_history WHERE order_id = ? ORDER BY id ASC", (order_id,))
                history_rows = cursor.fetchall()
                history = []
                for hist in history_rows:
                    history.append({
                        "from": hist["from_state"],
                        "to": hist["to_state"],
                        "timestamp": hist["timestamp"]
                    })
                
                # Get seller_username (may be None for old orders)
                seller_username = None
                try:
                    seller_username = r["seller_username"]
                except (IndexError, KeyError):
                    pass
                customer_account_id = None
                seller_account_id = None
                try:
                    customer_account_id = r["customer_account_id"]
                    seller_account_id = r["seller_account_id"]
                except (IndexError, KeyError):
                    pass

                # Reconstruct Order object
                order = Order(
                    order_id=order_id,
                    items=items,
                    subtotal=r["subtotal"],
                    discount=r["discount"],
                    shipping=r["shipping"],
                    tax=r["tax"],
                    total=r["total"],
                    username=r["username"],
                    delivery_otp=r["delivery_otp"],
                    created_at=r["created_at"],
                    shipping_address=r["shipping_address"] or "",
                    seller_username=seller_username,
                    customer_account_id=customer_account_id,
                    seller_account_id=seller_account_id
                )
                order.state = OrderState(r["state"])
                if history:
                    order.history = history
                self.orders[order_id] = order
                
            conn.close()
        except Exception as e:
            logging.error(f"Error loading orders from DB: {e}")

    def create_order(self, items: list, subtotal: float, discount: float, shipping: float, tax: float, total: float, username: str = "guest", shipping_address: str = "", seller_username: str = None, customer_account_id: int = None, seller_account_id: int = None) -> Order:
        """Create and persist an order with its shipping destination and seller."""
        order_id = 'ORD-' + str(random.randint(10000000, 99999999))
        created_at = datetime.now().strftime("%m/%d/%Y, %I:%M:%S %p")
        
        try:
            from backend.database import get_db_connection
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Insert order main record
            cursor.execute("""
            INSERT INTO orders (order_id, username, state, subtotal, discount, shipping, tax, total, created_at, shipping_address, delivery_otp, seller_username, customer_account_id, seller_account_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (order_id, username, OrderState.CREATED.value, subtotal, discount, shipping, tax, total, created_at, shipping_address, None, seller_username, customer_account_id, seller_account_id))
            
            # Insert items
            for item in items:
                cursor.execute("""
                INSERT INTO order_items (order_id, product_id, name, quantity, unit_price, subtotal, image_url)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (order_id, item["product_id"], item["name"], item["quantity"], item["unit_price"], item["subtotal"], item.get("image_url", "")))
                
            # Insert initial state transition history
            cursor.execute("""
            INSERT INTO order_history (order_id, from_state, to_state, timestamp)
            VALUES (?, ?, ?, ?)
            """, (order_id, None, OrderState.CREATED.value, created_at))
            
            conn.commit()
            conn.close()
        except Exception as e:
            logging.error(f"Error creating order in DB: {e}")
            
        order = Order(order_id, items, subtotal, discount, shipping, tax, total, username=username, created_at=created_at, shipping_address=shipping_address, seller_username=seller_username, customer_account_id=customer_account_id, seller_account_id=seller_account_id)
        self.orders[order_id] = order
        return order

    def get_order(self, order_id: str) -> Optional[Order]:
        self.load_from_db()
        return self.orders.get(order_id)

    def get_all_orders(self) -> list:
        self.load_from_db()
        return [order.to_dict() for order in reversed(list(self.orders.values()))]

    def get_user_orders(self, username: str, account_id: int = None) -> list:
        self.load_from_db()
        return [
            order.to_dict()
            for order in reversed(list(self.orders.values()))
            if (account_id is not None and order.customer_account_id == account_id)
            or (order.customer_account_id is None and order.username == username)
        ]

    def get_admin_orders(self, admin_username: str, account_id: int = None) -> list:
        """Return only orders where the seller identity matches the admin."""
        self.load_from_db()
        return [
            order.to_dict()
            for order in reversed(list(self.orders.values()))
            if (account_id is not None and order.seller_account_id == account_id)
            or (order.seller_account_id is None and order.seller_username == admin_username)
        ]

    def transition_order(self, order_id: str, target_state_str: str) -> dict:
        self.load_from_db()
        order = self.orders.get(order_id)
        if not order:
            return {"success": False, "error": f"Order {order_id} not found", "order": None}

        target_state_upper = target_state_str.strip().upper()
        

        try:
            target_state = OrderState(target_state_upper)
        except ValueError:
            valid = [s.value for s in OrderState]
            return {"success": False, "error": f"Invalid state '{target_state_str}'. Valid: {valid}", "order": order.to_dict()}

        old_state = order.state
        if order.transition_to(target_state):
            # Update state and insert state history record in SQLite database
            try:
                from backend.database import get_db_connection
                conn = get_db_connection()
                cursor = conn.cursor()
                cursor.execute("UPDATE orders SET state = ? WHERE order_id = ?", (target_state.value, order_id))
                
                timestamp = order.history[-1]["timestamp"]
                cursor.execute("""
                INSERT INTO order_history (order_id, from_state, to_state, timestamp)
                VALUES (?, ?, ?, ?)
                """, (order_id, old_state.value, target_state.value, timestamp))
                
                conn.commit()
                conn.close()
            except Exception as e:
                logging.error(f"Error transitioning order in DB: {e}")
                
            return {"success": True, "order": order.to_dict()}
        else:
            allowed = order.get_allowed_transitions()
            return {
                "success": False,
                "error": f"Cannot transition from {order.state.value} to {target_state.value}. Allowed: {allowed}",
                "order": order.to_dict()
            }
