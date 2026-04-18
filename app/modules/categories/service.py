from fastapi import HTTPException
from sqlalchemy.orm import Session

from app import models
from app.modules.categories import repository
from app.modules.categories.schema import (
    MaterialCategoryCreate,
    MaterialCategoryUpdate,
    SystemOptionCreate,
    SystemOptionUpdate,
)

VALID_OPTION_TYPES = {"unit", "tax_rate", "material_attr", "grade", "product_category"}


def list_material_categories(db: Session):
    return repository.list_material_categories(db)


def get_material_category(db: Session, category_id: int):
    return repository.get_material_category_or_404(db, category_id)


def create_material_category(db: Session, payload: MaterialCategoryCreate):
    if repository.get_material_category_by_name(db, payload.name):
        raise HTTPException(status_code=400, detail="Category name already exists")
    if repository.get_material_category_by_prefix(db, payload.code_prefix):
        raise HTTPException(status_code=400, detail="Category code prefix already exists")
    category = models.MaterialCategory(**payload.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def update_material_category(db: Session, category_id: int, payload: MaterialCategoryUpdate):
    category = repository.get_material_category_or_404(db, category_id)
    data = payload.model_dump(exclude_unset=True)

    next_name = data.get("name")
    if next_name and next_name != category.name and repository.get_material_category_by_name(db, next_name):
        raise HTTPException(status_code=400, detail="Category name already exists")

    next_prefix = data.get("code_prefix")
    if next_prefix and next_prefix != category.code_prefix and repository.get_material_category_by_prefix(db, next_prefix):
        raise HTTPException(status_code=400, detail="Category code prefix already exists")

    for key, value in data.items():
        setattr(category, key, value)
    db.commit()
    db.refresh(category)
    return category


def soft_delete_material_category(db: Session, category_id: int):
    category = repository.get_material_category_or_404(db, category_id)
    category.is_active = False
    db.commit()
    db.refresh(category)
    return category


def hard_delete_material_category(db: Session, category_id: int):
    category = repository.get_material_category_or_404(db, category_id)
    if repository.count_materials_by_category_name(db, category.name):
        raise HTTPException(status_code=400, detail="璇ョ墿鏂欏垎绫诲凡琚墿鏂欎娇鐢紝鏃犳硶鍒犻櫎")
    if repository.count_suppliers_using_category_name(db, category.name):
        raise HTTPException(status_code=400, detail="璇ョ墿鏂欏垎绫诲凡琚緵搴斿晢浣跨敤锛屾棤娉曞垹闄?")
    db.delete(category)
    db.commit()
    return {"message": "Material category deleted"}


def list_system_options(db: Session, option_type: str | None = None):
    return repository.list_system_options(db, option_type)


def get_system_option(db: Session, option_id: int):
    return repository.get_system_option_or_404(db, option_id)


def create_system_option(db: Session, payload: SystemOptionCreate):
    if payload.option_type not in VALID_OPTION_TYPES:
        raise HTTPException(status_code=400, detail="Invalid option_type")
    if repository.get_system_option_by_type_and_name(db, payload.option_type, payload.name):
        raise HTTPException(status_code=400, detail="Option already exists in this type")
    option = models.SystemOption(**payload.model_dump())
    db.add(option)
    db.commit()
    db.refresh(option)
    return option


def update_system_option(db: Session, option_id: int, payload: SystemOptionUpdate):
    option = repository.get_system_option_or_404(db, option_id)
    data = payload.model_dump(exclude_unset=True)

    next_name = data.get("name")
    if next_name and next_name != option.name:
        existing = repository.get_system_option_by_type_and_name(db, option.option_type, next_name)
        if existing and existing.id != option_id:
            raise HTTPException(status_code=400, detail="Option already exists in this type")

    for key, value in data.items():
        setattr(option, key, value)
    db.commit()
    db.refresh(option)
    return option


def soft_delete_system_option(db: Session, option_id: int):
    option = repository.get_system_option_or_404(db, option_id)
    option.is_active = False
    db.commit()
    db.refresh(option)
    return option


def hard_delete_system_option(db: Session, option_id: int):
    option = repository.get_system_option_or_404(db, option_id)
    if option.option_type == "unit" and repository.count_materials_by_unit(db, option.name):
        raise HTTPException(status_code=400, detail="璇ュ崟浣嶅凡琚墿鏂欎娇鐢紝鏃犳硶鍒犻櫎")
    if option.option_type == "tax_rate" and repository.count_materials_by_tax_rate(db, option.name):
        raise HTTPException(status_code=400, detail="璇ョ◣鐜囧凡琚墿鏂欎娇鐢紝鏃犳硶鍒犻櫎")
    if option.option_type == "material_attr" and repository.count_materials_by_material_attr(db, option.name):
        raise HTTPException(status_code=400, detail="璇ユ潗璐ㄥ凡琚墿鏂欎娇鐢紝鏃犳硶鍒犻櫎")
    if option.option_type == "grade" and repository.count_materials_by_grade(db, option.name):
        raise HTTPException(status_code=400, detail="璇ョ瓑绾у凡琚墿鏂欎娇鐢紝鏃犳硶鍒犻櫎")
    if option.option_type == "product_category" and repository.count_products_by_product_category(db, option.name):
        raise HTTPException(status_code=400, detail="璇ヤ骇鍝佺被鍒凡琚骇鍝佷娇鐢紝鏃犳硶鍒犻櫎")
    db.delete(option)
    db.commit()
    return {"message": "System option deleted"}
