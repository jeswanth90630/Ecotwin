# STEG | Secure Steganographic Communication System 🛡️

STEG is a premium, high-integrity security tool designed to enable confidential communication by hiding encrypted messages within ordinary images. By combining **AES-256 Encryption** with **LSB Steganography**, STEG ensures that your data is not only unreadable but also completely invisible to the naked eye.

---

## ✨ Features

- **Dual-Layer Security**: Protect your data twice. First with industry-standard encryption, then by hiding it inside an image carrier.
- **Advanced AES-256 Encryption**: Messages are encrypted using a user-defined key before being embedded, ensuring maximum cryptographic strength.
- **LSB Steganography**: Utilizes Least Significant Bit embedding to hide data in the pixel shaders of images with zero detectable visual degradation.
- **Secure Extraction Portal**: A dedicated "Decode Section" with privacy blur allows you to clarify and extract messages only after multi-factor authentication.
- **Hashed Password Control**: Access to images is guarded by `bcrypt` hashing, ensuring your vault remains private even at the database level.
- **Interactive Security Dashboard**: Monitor your assets in a futuristic, neon-cyan themed "Cyber-Vault."
- **One-Click Purge**: Securely delete your encrypted assets and messages from the server with a single click after decryption.

## 🛠️ Tech Stack

- **Frontend**: 
    - **HTML5 & CSS3**: Custom vanilla design system with Glassmorphism and Neon-Cyber aesthetics.
    - **JavaScript**: Interactive elements and clipboard integration.
    - **Libraries**: Chart.js (Analytics), AOS.js (Animations), SweetAlert2 (Premium Alerts), Popper.js.
- **Backend**: 
    - **Flask**: Python-based micro-framework for robust routing and server-side logic.
    - **Pillow (PIL)**: Advanced image processing for LSB data embedding.
    - **PyCryptodome**: High-level cryptographic library for AES-256 implementation.
    - **Flask-Bcrypt**: Secure password hashing.
- **Database**: 
    - **SQLite**: Lightweight, relational database for secure asset tracking.

## 🚀 How to Execute

### 1. Prerequisites
Ensure you have **Python 3.8+** installed on your system.

### 2. Clone and Setup
```bash
# Clone the repository (or navigate to current folder)
cd STEG

# Install dependencies
pip install -r requirements.txt
```

### 3. Initialize the Database
```bash
# Run the database initialization script
python database/init_db.py
```

### 4. Run the Application
```bash
# Start the Flask server
python app.py
```

### 5. Access the Portal
Open your web browser and navigate to:
**[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 🔒 Security Workflow

1. **Encode**: Upload a carrier image, enter your secret message, and set two separate passwords—one for Vault Access and one for Message Encryption.
2. **Decode**: Navigate to the **Decode Section** (Vault). Your assets will be blurred for privacy. Click **"OPEN DECODE PORTAL"** and enter your Vault Access Password.
3. **Extract**: Provide the Encryption Key to reveal the hidden message.
4. **Purge**: Use the Purge button to completely erase the data once communication is complete.

---
*Developed with ❤️ for Secure Communication*
