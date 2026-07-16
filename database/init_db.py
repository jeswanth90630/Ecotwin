from db import get_db
from models import create_tables

conn = get_db()
create_tables(conn)

print("DB Ready")