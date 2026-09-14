"""Pydantic schemas for User."""

from pydantic import BaseModel, EmailStr
from datetime import datetime


class UserBase(BaseModel):
    name: str
    email: str
    role: str = "citizen"
    contact: str | None = None


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(UserBase):
    id: str
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
