from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MaterialCategoryBase(BaseModel):
    name: str
    code_prefix: str
    sort_order: int = 0
    is_active: bool = True
    remark: str | None = None


class MaterialCategoryCreate(MaterialCategoryBase):
    pass


class MaterialCategoryUpdate(BaseModel):
    name: str | None = None
    code_prefix: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None
    remark: str | None = None


class MaterialCategoryRead(MaterialCategoryBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SystemOptionBase(BaseModel):
    option_type: str
    name: str
    sort_order: int = 0
    is_active: bool = True
    remark: str | None = None


class SystemOptionCreate(SystemOptionBase):
    pass


class SystemOptionUpdate(BaseModel):
    name: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None
    remark: str | None = None


class SystemOptionRead(SystemOptionBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
