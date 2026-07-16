import os
from flask import Flask, render_template, request, redirect, url_for, flash
from werkzeug.utils import secure_filename

from config import SECRET_KEY, UPLOAD_FOLDER, ENCODED_FOLDER, ORIGINAL_FOLDER
from database.db import get_db
from auth.password_utils import hash_password, verify_password
from crypto.encrypt import encrypt_message
from crypto.decrypt import decrypt_message
from stego.embed import embed_data
from stego.extract import extract_data

app = Flask(__name__)
app.secret_key = SECRET_KEY

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(ENCODED_FOLDER, exist_ok=True)
os.makedirs(ORIGINAL_FOLDER, exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/encode', methods=['GET', 'POST'])
def encode():
    if request.method == 'POST':
        file = request.files['image']
        filename = secure_filename(file.filename)

        message = request.form['message']
        access_password = request.form['access_password']
        encryption_password = request.form['encryption_password']

        original_path = os.path.join(ORIGINAL_FOLDER, filename)
        file.save(original_path)

        encrypted_text = encrypt_message(message, encryption_password)

        encoded_filename = "encoded_" + filename
        encoded_path = os.path.join(ENCODED_FOLDER, encoded_filename)

        try:
            embed_data(original_path, encrypted_text, encoded_path)
        except ValueError as e:
            flash(str(e))
            return redirect(url_for('encode'))

        conn = get_db()
        cursor = conn.cursor()

        hashed_access = hash_password(access_password)

        display_name = request.form.get('display_name', 'Untitled Security Asset')
        
        cursor.execute("""
            INSERT INTO images (image_name, display_name, stored_path, access_password_hash)
            VALUES (?, ?, ?, ?)
        """, (encoded_filename, display_name, encoded_path, hashed_access))

        image_id = cursor.lastrowid

        cursor.execute("""
            INSERT INTO messages (image_id, encrypted_data)
            VALUES (?, ?)
        """, (image_id, encrypted_text))

        conn.commit()
        conn.close()

        flash("Encoded Successfully!")
        return redirect('/dashboard')

    return render_template('encode.html')


@app.route('/dashboard')
def dashboard():
    conn = get_db()
    images = conn.execute("SELECT * FROM images").fetchall()
    conn.close()
    return render_template('dashboard.html', images=images)


@app.route('/access/<int:image_id>', methods=['GET', 'POST'])
def access_image(image_id):
    conn = get_db()
    image = conn.execute("SELECT * FROM images WHERE id=?", (image_id,)).fetchone()

    if request.method == 'POST':
        password = request.form['access_password']
        if verify_password(password, image['access_password_hash']):
            return redirect(url_for('decode', image_id=image_id))
        else:
            flash("Wrong Password!")

    return render_template('access.html', image=image)


@app.route('/decode/<int:image_id>', methods=['GET', 'POST'])
def decode(image_id):
    conn = get_db()
    image = conn.execute("SELECT * FROM images WHERE id=?", (image_id,)).fetchone()
    msg = conn.execute("SELECT * FROM messages WHERE image_id=?", (image_id,)).fetchone()

    if request.method == 'POST':
        password = request.form['encryption_password']
        try:
            extracted = extract_data(image['stored_path'])
            decrypted = decrypt_message(extracted, password)
            return render_template('decode.html', message=decrypted, image=image)
        except Exception as e:
            flash("Invalid Decryption Key or Corrupted Data!")
            return redirect(url_for('decode', image_id=image_id))

    return render_template('decode.html', image=image)


@app.route('/delete/<int:image_id>', methods=['POST'])
def delete_image(image_id):
    conn = get_db()
    image = conn.execute("SELECT * FROM images WHERE id=?", (image_id,)).fetchone()
    
    if not image:
        flash("Image not found!")
        return redirect(url_for('dashboard'))

    access_password = request.form.get('access_password')
    
    if not verify_password(access_password, image['access_password_hash']):
        flash("Incorrect Access Password! Delete Denied.")
        return redirect(request.referrer or url_for('dashboard'))

    try:
        # Delete files
        if os.path.exists(image['stored_path']):
            os.remove(image['stored_path'])
            
        # Delete from DB
        conn.execute("DELETE FROM messages WHERE image_id=?", (image_id,))
        conn.execute("DELETE FROM images WHERE id=?", (image_id,))
        conn.commit()
        flash("Data Purged Successfully!")
    except Exception as e:
        flash(f"Error during deletion: {str(e)}")
    finally:
        conn.close()

    return redirect(url_for('dashboard'))


if __name__ == '__main__':
    app.run(debug=True)