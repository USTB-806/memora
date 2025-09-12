from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime


class UserRegister(BaseModel):
    """用户注册模型"""

    username: str
    email: EmailStr
    password: str

    @field_validator("username")
    @classmethod
    def validate_username(cls, v):
        if len(v) < 3:
            raise ValueError("用户名长度不能少于3个字符")
        if len(v) > 50:
            raise ValueError("用户名长度不能超过50个字符")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError("密码长度不能少于6个字符")
        return v


class UserLogin(BaseModel):
    """用户登录模型"""

    username: str
    password: str


class UserProfile(BaseModel):
    """用户个人信息模型"""

    id: int
    username: str
    email: str
    avatar_attachment_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    """用户信息更新模型"""

    email: Optional[EmailStr] = None
    avatar_attachment_id: Optional[str] = None
