import sqlite3
import os

def cleanup():
    db_path = 'database/steg.db'
    if not os.path.exists(db_path):
        print("Database not found.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get all paths
    cursor.execute('SELECT stored_path FROM images')
    paths = cursor.fetchall()
    
    # Delete files
    for (path,) in paths:
        if os.path.exists(path):
            os.remove(path)
            print(f"Deleted file: {path}")

    # Delete records
    cursor.execute('DELETE FROM messages')
    cursor.execute('DELETE FROM images')
    conn.commit()
    conn.close()
    print("Database purged successfully.")

if __name__ == "__main__":
    cleanup()
