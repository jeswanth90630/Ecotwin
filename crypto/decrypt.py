from Crypto.Cipher import AES
import hashlib
import base64

def decrypt_message(data, password):
    key = hashlib.sha256(password.encode()).digest()
    raw = base64.b64decode(data)

    iv = raw[:16]
    ciphertext = raw[16:]

    cipher = AES.new(key, AES.MODE_CBC, iv)
    decrypted = cipher.decrypt(ciphertext)

    pad = decrypted[-1]
    return decrypted[:-pad].decode()