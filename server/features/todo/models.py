from server.extensions import get_db
import datetime

class Todo:
    @staticmethod
    def create_table():
        db = get_db()
        db.execute("""
            CREATE TABLE IF NOT EXISTS todos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                is_completed BOOLEAN NOT NULL DEFAULT 0,
                indent_level INTEGER NOT NULL DEFAULT 0,
                section TEXT NOT NULL DEFAULT 'today',
                display_order INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        db.commit()

    @staticmethod
    def get_all():
        db = get_db()
        todos = db.execute("SELECT * FROM todos ORDER BY display_order ASC, created_at ASC").fetchall()
        return [dict(todo) for todo in todos]

    @staticmethod
    def create(content, section='today'):
        db = get_db()
        # Get max display_order
        max_order = db.execute("SELECT MAX(display_order) FROM todos WHERE section = ?", (section,)).fetchone()[0]
        new_order = (max_order or 0) + 1
        
        cursor = db.execute(
            "INSERT INTO todos (content, section, display_order) VALUES (?, ?, ?)",
            (content, section, new_order)
        )
        db.commit()
        return cursor.lastrowid

    @staticmethod
    def update(todo_id, data):
        db = get_db()
        fields = []
        values = []
        for key, value in data.items():
            if key in ['content', 'is_completed', 'indent_level', 'section', 'display_order']:
                fields.append(f"{key} = ?")
                values.append(value)
        
        if not fields:
            return False
            
        values.append(todo_id)
        db.execute(f"UPDATE todos SET {', '.join(fields)} WHERE id = ?", values)
        db.commit()
        return True

    @staticmethod
    def delete(todo_id):
        db = get_db()
        db.execute("DELETE FROM todos WHERE id = ?", (todo_id,))
        db.commit()
        return True

    @staticmethod
    def reorder(items):
        db = get_db()
        for item in items:
            db.execute("UPDATE todos SET display_order = ?, section = ?, indent_level = ? WHERE id = ?",
                       (item['display_order'], item['section'], item.get('indent_level', 0), item['id']))
        db.commit()
        return True

    @staticmethod
    def rollover_tasks():
        """日付切替時に完了済みを削除し、未完了のtodayをfutureへ移動する"""
        db = get_db()
        
        db.execute("DELETE FROM todos WHERE is_completed = 1")
        
        db.execute("""
            UPDATE todos 
            SET section = 'future' 
            WHERE section = 'today' AND is_completed = 0
        """)
        db.commit()
        return True
