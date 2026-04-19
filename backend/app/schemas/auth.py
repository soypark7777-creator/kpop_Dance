from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    password_confirm: str | None = None
    nickname: str = Field(min_length=2, max_length=50)
    avatar_id: str | None = None


class RegisterResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
