from fastapi import HTTPException
from sqlalchemy.orm import Session

from app import crud, models
from app.modules.materials import repository
from app.modules.materials.schema import MaterialCreate, MaterialUpdate

MATERIAL_TYPE_TO_PART_TYPE = {
    "板卡": models.PartType.custom,
    "模块": models.PartType.assembly,
    "整机": models.PartType.assembly,
}


def _normalize_text(value: str | None) -> str | None:
    text = (value or "").strip()
    return text or None


def _normalize_material_type(value: str | None) -> str | None:
    return _normalize_text(value)


def _default_material_type_from_part_type(part_type: models.PartType | str | None) -> str:
    raw = part_type.value if hasattr(part_type, "value") else str(part_type or "")
    if raw == models.PartType.custom.value:
        return "板卡"
    if raw == models.PartType.assembly.value:
        return "模块"
    return "电子元器件"


def _apply_material_type_defaults(data: dict):
    has_material_type = "material_type" in data
    has_part_type = "part_type" in data
    if has_material_type:
        data["material_type"] = _normalize_material_type(data.get("material_type"))
    if data.get("material_type"):
        mapped = MATERIAL_TYPE_TO_PART_TYPE.get(data["material_type"])
        if not has_part_type:
            data["part_type"] = mapped or models.PartType.standard
        return
    if has_part_type and data.get("part_type"):
        data["material_type"] = _default_material_type_from_part_type(data["part_type"])


def _apply_combined_field_aliases(data: dict):
    if "model_spec" in data and not any(key in data for key in ("spec", "drawing_no", "package_name")):
        data["spec"] = _normalize_text(data.get("model_spec"))
        data["drawing_no"] = None
        data["package_name"] = None
    data.pop("model_spec", None)

    if "brand_attr" in data and not any(key in data for key in ("material_name_attr", "grade_attr")):
        data["material_name_attr"] = _normalize_text(data.get("brand_attr"))
        data["grade_attr"] = None
    data.pop("brand_attr", None)

    for field in (
        "name",
        "spec",
        "drawing_no",
        "package_name",
        "storage_location",
        "unit",
        "category",
        "default_supplier",
        "tax_rate",
        "usage",
        "material_name_attr",
        "standard_attr",
        "grade_attr",
        "purchase_link",
        "remark",
        "current_revision",
    ):
        if field in data:
            data[field] = _normalize_text(data.get(field))


def _ensure_valid_category(db: Session, category_name: str | None):
    if category_name and not repository.get_active_category_by_name(db, category_name):
        raise HTTPException(status_code=400, detail="Invalid material category")


def _generate_material_code(db: Session, category_name: str | None):
    prefix = "WL"
    category = repository.get_active_category_by_name(db, category_name)
    if category and category.code_prefix:
        prefix = category.code_prefix

    max_no = 0
    for code in repository.list_material_codes_by_prefix(db, prefix):
        try:
            current_no = int(str(code).split("-")[-1])
        except Exception:
            continue
        if current_no > max_no:
            max_no = current_no
    return f"{prefix}-{max_no + 1:04d}"


def list_materials(db: Session):
    return repository.list_materials(db)


def get_material(db: Session, material_id: int):
    return repository.get_material_or_404(db, material_id)


def create_material(db: Session, payload: MaterialCreate):
    data = payload.model_dump()
    _apply_combined_field_aliases(data)
    _apply_material_type_defaults(data)
    _ensure_valid_category(db, data.get("category"))

    if not data.get("code"):
        data["code"] = _generate_material_code(db, data.get("category"))
    if repository.get_material_by_code(db, data["code"]):
        raise HTTPException(status_code=400, detail="Material code already exists")

    material = models.Material(**data)
    db.add(material)
    db.commit()
    db.refresh(material)
    return material


def update_material(db: Session, material_id: int, payload: MaterialUpdate):
    material = repository.get_material_or_404(db, material_id)
    data = payload.model_dump(exclude_unset=True)
    _apply_combined_field_aliases(data)
    _apply_material_type_defaults(data)

    if "category" in data and data["category"]:
        _ensure_valid_category(db, data["category"])

    data.pop("code", None)
    for key, value in data.items():
        setattr(material, key, value)
    crud._sync_all_bom_items_for_material(db, material)
    db.commit()
    db.refresh(material)
    return material


def soft_delete_material(db: Session, material_id: int):
    material = repository.get_material_or_404(db, material_id)
    material.is_active = False
    db.commit()
    db.refresh(material)
    return material


def hard_delete_material(db: Session, material_id: int):
    material = repository.get_material_or_404(db, material_id)
    if (
        repository.count_material_revisions(db, material_id)
        or repository.count_material_bom_items(db, material_id)
        or repository.count_material_transactions(db, material_id)
    ):
        raise HTTPException(
            status_code=400,
            detail="Material is referenced by revisions/BOM/inventory transactions and cannot be deleted",
        )
    db.delete(material)
    db.commit()
    return {"message": "Material deleted"}
