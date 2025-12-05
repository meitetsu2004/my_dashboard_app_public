import sqlite3
import json
from datetime import datetime, timedelta
from server.extensions import get_db

class WorkSession:
    @staticmethod
    def create_table():
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS work_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                start_time TIMESTAMP NOT NULL,
                end_time TIMESTAMP,
                duration INTEGER DEFAULT 0,
                status TEXT DEFAULT 'running'
            )
        ''')
        conn.commit()
        conn.close()

    @staticmethod
    def start_session():
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("SELECT id, status FROM work_sessions WHERE status IN ('running', 'paused') ORDER BY id DESC LIMIT 1")
        existing = cursor.fetchone()
        
        if existing:
            if existing['status'] == 'running':
                conn.close()
                return existing['id']
            elif existing['status'] == 'paused':
                cursor.execute(
                    "UPDATE work_sessions SET status = 'running', start_time = ? WHERE id = ?",
                    (datetime.now(), existing['id'])
                )
                conn.commit()
                conn.close()
                return existing['id']

        start_time = datetime.now()
        cursor.execute(
            "INSERT INTO work_sessions (start_time, duration, status) VALUES (?, 0, 'running')",
            (start_time,)
        )
        session_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return session_id

    @staticmethod
    def pause_session():
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM work_sessions WHERE status = 'running'")
        session = cursor.fetchone()
        
        if not session:
            conn.close()
            return None

        now = datetime.now()
        start_time = datetime.fromisoformat(session['start_time'])
        elapsed = int((now - start_time).total_seconds())
        new_duration = (session['duration'] or 0) + elapsed
        
        cursor.execute(
            "UPDATE work_sessions SET status = 'paused', duration = ? WHERE id = ?",
            (new_duration, session['id'])
        )
        conn.commit()
        conn.close()
        return new_duration

    @staticmethod
    def stop_session():
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM work_sessions WHERE status IN ('running', 'paused')")
        session = cursor.fetchone()
        
        if not session:
            conn.close()
            return None

        end_time = datetime.now()
        final_duration = session['duration'] or 0
        
        if session['status'] == 'running':
            start_time = datetime.fromisoformat(session['start_time'])
            final_duration += int((end_time - start_time).total_seconds())
        
        cursor.execute(
            "UPDATE work_sessions SET end_time = ?, duration = ?, status = 'completed' WHERE id = ?",
            (end_time, final_duration, session['id'])
        )
        conn.commit()
        conn.close()
        return final_duration

    @staticmethod
    def get_current_session():
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM work_sessions WHERE status IN ('running', 'paused')")
        session = cursor.fetchone()
        conn.close()
        
        if session:
            current_duration = session['duration'] or 0
            if session['status'] == 'running':
                start_time = datetime.fromisoformat(session['start_time'])
                current_duration += int((datetime.now() - start_time).total_seconds())
            
            return {
                'id': session['id'],
                'start_time': session['start_time'],
                'current_duration': current_duration,
                'status': session['status']
            }
        return None

    @staticmethod
    def get_stats():
        conn = get_db()
        cursor = conn.cursor()
        
        now = datetime.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=today_start.weekday())
        
        cursor.execute(
            "SELECT SUM(duration) as total FROM work_sessions WHERE end_time >= ?",
            (today_start,)
        )
        today_total = cursor.fetchone()['total'] or 0
        
        cursor.execute("SELECT start_time FROM work_sessions WHERE status = 'running'")
        running = cursor.fetchone()
        if running:
            start_time = datetime.fromisoformat(running['start_time'])
            if start_time >= today_start:
                today_total += int((now - start_time).total_seconds())
            else:
                today_total += int((now - today_start).total_seconds())

        cursor.execute(
            "SELECT SUM(duration) as total FROM work_sessions WHERE end_time >= ?",
            (week_start,)
        )
        weekly_total = cursor.fetchone()['total'] or 0
        
        if running:
            start_time = datetime.fromisoformat(running['start_time'])
            if start_time >= week_start:
                weekly_total += int((now - start_time).total_seconds())

        conn.close()
        
        return {
            'today': today_total,
            'weekly': weekly_total
        }

    @staticmethod
    def get_history(days=7):
        conn = get_db()
        cursor = conn.cursor()
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days - 1)
        
        cursor.execute('''
            SELECT 
                date(start_time) as date,
                SUM(duration) as total_duration
            FROM work_sessions
            WHERE start_time >= ? AND status = 'completed'
            GROUP BY date(start_time)
            ORDER BY date(start_time) DESC
        ''', (start_date,))
        
        rows = cursor.fetchall()
        daily_map = {row['date']: row['total_duration'] for row in rows}

        history = []
        current = start_date
        while current.date() <= end_date.date():
            date_str = current.date().isoformat()
            history.append({'date': date_str, 'duration': daily_map.get(date_str, 0)})
            current += timedelta(days=1)
        
        cursor.execute('''
            SELECT * FROM work_sessions 
            WHERE start_time >= ? 
            ORDER BY start_time DESC
            LIMIT 50
        ''', (start_date,))
        sessions = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        return {
            'daily_summary': history,
            'sessions': sessions
        }

    @staticmethod
    def update_session(session_id, data):
        conn = get_db()
        cursor = conn.cursor()
        
        fields = []
        values = []
        if 'start_time' in data:
            fields.append("start_time = ?")
            values.append(data['start_time'])
        if 'end_time' in data:
            fields.append("end_time = ?")
            values.append(data['end_time'])
        if 'duration' in data:
            fields.append("duration = ?")
            values.append(data['duration'])
            
        if not fields:
            conn.close()
            return False
            
        values.append(session_id)
        cursor.execute(f"UPDATE work_sessions SET {', '.join(fields)} WHERE id = ?", values)
        conn.commit()
        conn.close()
        return True

    @staticmethod
    def delete_session(session_id):
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM work_sessions WHERE id = ?", (session_id,))
        conn.commit()
        conn.close()
        return True

    @staticmethod
    def get_weekly_history(weeks=12):
        conn = get_db()
        cursor = conn.cursor()
        
        # 完了済みセッションを年-週単位で集計
        cursor.execute('''
            SELECT 
                strftime('%Y-%W', start_time) as week_key,
                MIN(date(start_time)) as week_start,
                SUM(duration) as total_duration
            FROM work_sessions
            WHERE status = 'completed'
            GROUP BY week_key
            ORDER BY week_key DESC
            LIMIT ?
        ''', (weeks,))
        
        rows = cursor.fetchall()
        weekly_map = {row['week_key']: row['total_duration'] for row in rows}

        now = datetime.now()
        current_week_start = now - timedelta(days=now.weekday())
        start_week = current_week_start - timedelta(weeks=weeks - 1)

        history = []
        for i in range(weeks):
            week_start_date = start_week + timedelta(weeks=i)
            week_key = week_start_date.strftime('%Y-%W')
            history.append({
                'week': week_key,
                'start_date': week_start_date.date().isoformat(),
                'duration': weekly_map.get(week_key, 0)
            })
        
        conn.close()
        return history
