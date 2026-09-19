import os
import re
from datetime import datetime, timedelta, timezone

import jwt
from dotenv import load_dotenv
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from database import User


load_dotenv()


# ============================================================
# PASSWORD HASHING
# ============================================================

pwd_context = CryptContext(
    schemes=["pbkdf2_sha256"],
    deprecated="auto",
)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    return pwd_context.verify(
        plain_password,
        hashed_password,
    )


# ============================================================
# VALIDATION
# ============================================================

def validate_email(email: str) -> bool:
    pattern = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    return re.match(pattern, email) is not None


# ============================================================
# USER REGISTRATION
# ============================================================

def register_user(
    db: Session,
    name: str,
    email: str,
    password: str,
    role: str,
):
    name = name.strip()
    email = email.strip().lower()
    role = role.strip().lower()

    if not name:
        raise ValueError("Name is required.")

    if not validate_email(email):
        raise ValueError(
            "Please enter a valid email address."
        )

    if len(password) < 6:
        raise ValueError(
            "Password must contain at least 6 characters."
        )

    if role not in ["teacher", "student"]:
        raise ValueError(
            "Role must be teacher or student."
        )

    existing_user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_user:
        raise ValueError(
            "An account with this email already exists."
        )

    user = User(
        name=name,
        email=email,
        password_hash=hash_password(password),
        role=role,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


# ============================================================
# LOGIN
# ============================================================

def login_user(
    db: Session,
    email: str,
    password: str,
):
    email = email.strip().lower()

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user:
        raise ValueError(
            "Invalid email or password."
        )

    if not verify_password(
        password,
        user.password_hash,
    ):
        raise ValueError(
            "Invalid email or password."
        )

    return user


# ============================================================
# JWT
# ============================================================

def create_access_token(user: User) -> str:
    secret_key = os.getenv("JWT_SECRET_KEY")

    if not secret_key:
        raise RuntimeError(
            "JWT_SECRET_KEY is not configured."
        )

    algorithm = os.getenv(
        "JWT_ALGORITHM",
        "HS256",
    )

    expire_minutes = int(
        os.getenv(
            "JWT_EXPIRE_MINUTES",
            "1440",
        )
    )

    now = datetime.now(timezone.utc)

    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "iat": now,
        "exp": now + timedelta(
            minutes=expire_minutes
        ),
    }

    return jwt.encode(
        payload,
        secret_key,
        algorithm=algorithm,
    )


def decode_access_token(token: str):
    secret_key = os.getenv("JWT_SECRET_KEY")

    if not secret_key:
        raise RuntimeError(
            "JWT_SECRET_KEY is not configured."
        )

    algorithm = os.getenv(
        "JWT_ALGORITHM",
        "HS256",
    )

    try:
        payload = jwt.decode(
            token,
            secret_key,
            algorithms=[algorithm],
        )

        return payload

    except jwt.ExpiredSignatureError:
        raise ValueError(
            "Authentication token has expired."
        )

    except jwt.InvalidTokenError:
        raise ValueError(
            "Invalid authentication token."
        )
