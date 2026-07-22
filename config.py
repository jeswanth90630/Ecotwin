import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

DATABASE = os.path.join(BASE_DIR, 'database', 'steg.db')

SECRET_KEY = 'super_secret_key_123'

UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static', 'uploads')
ENCODED_FOLDER = os.path.join(UPLOAD_FOLDER, 'encoded')
ORIGINAL_FOLDER = os.path.join(UPLOAD_FOLDER, 'original')