from server.extensions import get_db
import datetime

def init_db():
    db = get_db()
    cursor = db.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS words (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word TEXT NOT NULL,
            meaning TEXT NOT NULL,
            example_en TEXT,
            example_jp TEXT,
            pronunciation TEXT,
            status TEXT DEFAULT 'new', -- new / learning / mastered を表す
            next_review_date DATE,
            level INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    db.commit()

def add_word(data):
    db = get_db()
    cursor = db.cursor()
    
    now = datetime.datetime.now()
    today = now.date()
    
    cursor.execute('''
        INSERT INTO words (word, meaning, example_en, example_jp, pronunciation, status, next_review_date, level, created_at, memo, is_favorite)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    ''', (
        data['word'],
        data['meaning'],
        data.get('example_en'),
        data.get('example_jp'),
        data.get('pronunciation'),
        'new',
        today,
        0,
        now,
        data.get('memo', '')
    ))
    
    word_id = cursor.lastrowid
    db.commit()
    return word_id

def get_words(status=None):
    db = get_db()
    cursor = db.cursor()
    
    if status:
        cursor.execute('SELECT * FROM words WHERE status = ? ORDER BY created_at DESC', (status,))
    else:
        cursor.execute('SELECT * FROM words ORDER BY created_at DESC')
        
    return [dict(row) for row in cursor.fetchall()]

def get_review_words(limit=10):
    db = get_db()
    cursor = db.cursor()
    
    today = datetime.date.today()
    
    cursor.execute('''
        SELECT * FROM words 
        WHERE next_review_date <= ? 
        ORDER BY next_review_date ASC, level ASC 
        LIMIT ?
    ''', (today, limit))
    
    return [dict(row) for row in cursor.fetchall()]

def update_word_status(word_id, result):
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute('SELECT * FROM words WHERE id = ?', (word_id,))
    row = cursor.fetchone()
    if not row:
        return None
        
    current_level = row['level']
    
    next_level = current_level
    days_to_add = 1
    
    if result == 'ok':
        next_level += 1
        if next_level == 1: days_to_add = 1
        elif next_level == 2: days_to_add = 3
        elif next_level == 3: days_to_add = 7
        elif next_level == 4: days_to_add = 14
        else: days_to_add = 30
        new_status = 'learning' if next_level < 5 else 'mastered'
        
    elif result == 'ambiguous':
        next_level = max(0, current_level - 1)
        days_to_add = 1
        new_status = 'learning'
        
    else: # ng
        next_level = 0
        days_to_add = 0
        new_status = 'learning'
    
    next_date = datetime.date.today() + datetime.timedelta(days=days_to_add)
    
    cursor.execute('''
        UPDATE words 
        SET status = ?, next_review_date = ?, level = ? 
        WHERE id = ?
    ''', (new_status, next_date, next_level, word_id))
    
    db.commit()
    return True

def update_word(word_id, data):
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute('''
        UPDATE words 
        SET word = ?, meaning = ?, pronunciation = ?, example_en = ?, example_jp = ?, memo = ?, status = ?
        WHERE id = ?
    ''', (
        data['word'],
        data['meaning'],
        data['pronunciation'],
        data['example_en'],
        data['example_jp'],
        data.get('memo', ''),
        data.get('status', 'new'),
        word_id
    ))
    db.commit()
    return True

def delete_word(word_id):
    db = get_db()
    cursor = db.cursor()
    cursor.execute('DELETE FROM words WHERE id = ?', (word_id,))
    db.commit()
    return True

def toggle_favorite(word_id):
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute('SELECT is_favorite FROM words WHERE id = ?', (word_id,))
    row = cursor.fetchone()
    if not row:
        return None
        
    new_status = 0 if row['is_favorite'] else 1
    
    cursor.execute('UPDATE words SET is_favorite = ? WHERE id = ?', (new_status, word_id))
    db.commit()
    return new_status
