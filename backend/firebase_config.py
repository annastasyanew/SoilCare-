import os
from uuid import uuid4

import firebase_admin
from dotenv import load_dotenv
from firebase_admin import credentials, db

load_dotenv()

DATABASE_URL = os.getenv("FIREBASE_DATABASE_URL")
SERVICE_ACCOUNT = os.getenv("FIREBASE_SERVICE_ACCOUNT", "serviceAccountKey.json")

_memory_store = {
    "latest": None,
    "readings": {}
}


def firebase_is_ready():
    return bool(DATABASE_URL and os.path.exists(SERVICE_ACCOUNT))


def initialize_firebase():
    if not firebase_is_ready():
        return False

    if not firebase_admin._apps:
        cred = credentials.Certificate(SERVICE_ACCOUNT)
        firebase_admin.initialize_app(cred, {
            "databaseURL": DATABASE_URL
        })

    return True


def save_to_firebase(data):
    if initialize_firebase():
        db.reference("latest").set(data)
        db.reference("readings").push(data)
        return

    key = str(uuid4())
    _memory_store["latest"] = data
    _memory_store["readings"][key] = data


def get_latest_data():
    if initialize_firebase():
        return db.reference("latest").get()

    return _memory_store["latest"]


def get_readings_data():
    if initialize_firebase():
        return db.reference("readings").get()

    return _memory_store["readings"]
