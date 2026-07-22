from Crypto.Cipher import AES
import hashlib
import base64

def encrypt_message(message, password):
    key = hashlib.sha256(password.encode()).digest()
    cipher = AES.new(key, AES.MODE_CBC)
    iv = cipher.iv

    pad = 16 - len(message) % 16
    message += chr(pad) * pad

    encrypted = cipher.encrypt(message.encode())
    return base64.b64encode(iv + encrypted).decode()