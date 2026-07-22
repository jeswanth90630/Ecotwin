def create_tables(conn):
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        image_name TEXT,
        display_name TEXT,
        stored_path TEXT,
        access_password_hash BLOB
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        image_id INTEGER,
        encrypted_data TEXT
    )
    """)

    conn.commit()