import os
import base64
import hashlib
from cryptography.fernet import Fernet

# Master encryption secret from environment or fallback
SECRET_KEY = os.getenv("GBP_ENCRYPTION_SECRET", os.getenv("JWT_SECRET_KEY", "buzzspire-gbp-encryption-key-secret-2026"))

def _get_fernet_key() -> bytes:
    # Derive a valid 32-byte url-safe base64 encoded key from SECRET_KEY
    key_bytes = hashlib.sha256(SECRET_KEY.encode()).digest()
    return base64.urlsafe_b64encode(key_bytes)

def encrypt_token(token: str) -> str:
    """Encrypt a plain text token string."""
    if not token:
        return ""
    fernet = Fernet(_get_fernet_key())
    encrypted = fernet.encrypt(token.encode("utf-8"))
    return encrypted.decode("utf-8")

def decrypt_token(encrypted_token: str) -> str:
    """Decrypt an encrypted token string back to plain text."""
    if not encrypted_token:
        return ""
    try:
        fernet = Fernet(_get_fernet_key())
        decrypted = fernet.decrypt(encrypted_token.encode("utf-8"))
        return decrypted.decode("utf-8")
    except Exception as e:
        print(f"Error decrypting token: {e}")
        return ""
