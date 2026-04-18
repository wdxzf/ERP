from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, computed_field

from app.models import PartType, StatusType


def _join_display_parts(*values: str | None) -> str | None:
    parts = [str(value).strip() for value in values if str(value or "").strip()]
    return " / ".join(parts) or None


class MaterialBase(BaseModel):
    code: str | None = None
    name: str
    spec: str | None = None
    material_type: str | None = None
    package_name: str | None = None
    storage_location: str | None = None
    unit: str | None = None
    category: str | None = None
    part_type: PartType = PartType.standard
    default_supplier: str | None = None
    tax_rate: str | None = None
    unit_price: Decimal = Decimal("0")
    safety_stock: Decimal = Decimal("0")
    current_stock: Decimal = Decimal("0")
    usage: str | None = None
    material_name_attr: str | None = None
    standard_attr: str | None = None
    grade_attr: str | None = None
    purchase_link: str | None = None
    remark: str | None = None
    current_revision: str | None = None
    status: StatusType = StatusType.draft
    drawing_no: str | None = None
    is_active: bool = True


class MaterialCreate(MaterialBase):
    model_spec: str | None = None
    brand_attr: str | None = None


class MaterialUpdate(BaseModel):
    name: str | None = None
    spec: str | None = None
    model_spec: str | None = None
    material_type: str | None = None
    package_name: str | None = None
    storage_location: str | None = None
    unit: str | None = None
    category: str | None = None
    part_type: PartType | None = None
    default_supplier: str | None = None
    tax_rate: str | None = None
    unit_price: Decimal | None = None
    safety_stock: Decimal | None = None
    current_stock: Decimal | None = None
    usage: str | None = None
    material_name_attr: str | None = None
    brand_attr: str | None = None
    standard_attr: str | None = None
    grade_attr: str | None = None
    purchase_link: str | None = None
    remark: str | None = None
    current_revision: str | None = None
    status: StatusType | None = None
    drawing_no: str | None = None
    is_active: bool | None = None


class MaterialRead(MaterialBase):
    code: str
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @computed_field(return_type=str | None)
    @property
    def model_spec(self) -> str | None:
        return _join_display_parts(self.spec, self.drawing_no, self.package_name)

    @computed_field(return_type=str | None)
    @property
    def brand_attr(self) -> str | None:
        return _join_display_parts(self.material_name_attr, self.grade_attr)
