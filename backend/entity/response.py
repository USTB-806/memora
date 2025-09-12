from pydantic import BaseModel
from typing import Generic, TypeVar

T = TypeVar("T")


class Response(BaseModel, Generic[T]):
    code: int = 200
    message: str = "success"
    data: T | None = None
