import os
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "kpc_inuka_secure_secret_key_2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

USERS_DB = {
    "admin_kamau": {
        "username": "admin_kamau",
        "hashed_password": pwd_context.hash("KpcAdmin2026!"),
        "full_name": "Peter Kamau",
        "role": "admin",
        "program_access": ["Scholarship", "Plus", "Vocational", "Tech"],
    },
    "manager_grace": {
        "username": "manager_grace",
        "hashed_password": pwd_context.hash("KpcManager2026!"),
        "full_name": "Grace Otieno",
        "role": "manager",
        "program_access": ["Scholarship", "Plus"],
    },
}


class User(BaseModel):
    username: str
    full_name: str
    role: str
    program_access: List[str]


class TokenData(BaseModel):
    username: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: User


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    payload.update({"exp": expire})
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if not username:
            raise credentials_exception
    except JWTError as exc:
        raise credentials_exception from exc

    user_dict = USERS_DB.get(username)
    if user_dict is None:
        raise credentials_exception
    return User(**user_dict)


def require_role(allowed_roles: List[str]):
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action forbidden. Required role: one of {allowed_roles}",
            )
        return current_user

    return dependency
