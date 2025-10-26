import time
import requests
import firebase_admin
from firebase_admin import credentials, auth, firestore

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))


# ─────────────────────────
# 1. Firebase initialization
# ─────────────────────────
SERVICE_ACCOUNT_PATH = "serviceAccountKey.json"
FIREBASE_WEB_API_KEY = os.getenv("FIREBASE_API_KEY")

if not firebase_admin._apps:
    cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
    firebase_admin.initialize_app(cred)

db = firestore.client()

# ─────────────────────────
# 2. Helpers
# ─────────────────────────
def _now_ms() -> int:
    return int(time.time() * 1000)

def _user_doc_ref(uid: str):
    return db.collection("users").document(uid)

def _is_username_taken(username: str) -> bool:
    """
    Checks if a given username already exists in Firestore.
    Returns True if taken, False if available.
    """
    existing = db.collection("users").where("username", "==", username.strip().lower()).limit(1).get()
    return len(existing) > 0

def create_user_profile(uid: str, name: str, username: str, email: str):
    doc_ref = _user_doc_ref(uid)
    snap = doc_ref.get()

    if not snap.exists:
        doc_ref.set({
            "name": name.strip(),
            "username": username.strip().lower(),
            "email": email.strip().lower(),
            "createdAt": _now_ms(),
            "lastLogin": _now_ms(),
        })
    else:
        doc_ref.update({
            "lastLogin": _now_ms(),
        })

# ─────────────────────────
# 3. SIGN UP FLOW
# ─────────────────────────
def signup_with_email_password(name: str, username: str, email: str, password: str):
    if not name.strip() or not username.strip() or not email.strip() or not password:
        raise ValueError("All fields are required")

    # 🔹 Check if username already exists
    if _is_username_taken(username):
        raise ValueError(f"Username '{username}' is already taken. Please choose another one.")

    try:
        user_record = auth.create_user(
            email=email.strip().lower(),
            password=password,
            display_name=name.strip(),
        )
    except Exception as e:
        raise RuntimeError(f"Signup failed: {e}")

    uid = user_record.uid

    try:
        create_user_profile(
            uid=uid,
            name=name,
            username=username,
            email=email,
        )
    except Exception as e:
        # Optionally delete auth user to avoid a stranded account
        auth.delete_user(uid)
        raise RuntimeError(f"Profile creation failed (user rolled back): {e}")

    return {
        "uid": uid,
        "email": user_record.email,
        "message": "User created and profile stored successfully.",
    }

# ─────────────────────────
# 4. LOGIN FLOW
# ─────────────────────────
def login_with_email_password(email: str, password: str):
    if not email.strip() or not password:
        raise ValueError("Email and password are required")

    endpoint = (
        "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword"
        f"?key={FIREBASE_WEB_API_KEY}"
    )

    payload = {
        "email": email.strip().lower(),
        "password": password,
        "returnSecureToken": True,
    }

    resp = requests.post(endpoint, json=payload)

    if resp.status_code != 200:
        data = resp.json()
        err_code = data.get("error", {}).get("message", "UNKNOWN")
        raise RuntimeError(f"Login failed: {err_code}")

    data = resp.json()
    uid = data["localId"]

    try:
        create_user_profile(
            uid=uid,
            name="",  # not needed on login
            username="",
            email=email,
        )
    except Exception as e:
        raise RuntimeError(f"Login succeeded but Firestore update failed: {e}")

    return {
        "uid": uid,
        "email": email.strip().lower(),
        "idToken": data["idToken"],
        "refreshToken": data["refreshToken"],
        "expiresInSeconds": int(data["expiresIn"]),
        "message": "Login OK, Firestore lastLogin updated.",
    }

# ─────────────────────────
# 5. CLI test
# ─────────────────────────
if __name__ == "__main__":
    try:
        print("Creating account...")
        result_signup = signup_with_email_password(
            name="Alice Johnson",
            username="alicej",
            email="alice@example.com",
            password="supersecret123",
        )
        print("SIGNUP RESULT:", result_signup)

        print("Logging in...")
        result_login = login_with_email_password(
            email="alice@example.com",
            password="supersecret123",
        )
        print("LOGIN RESULT:", result_login)

    except Exception as e:
        print("ERROR:", e)
