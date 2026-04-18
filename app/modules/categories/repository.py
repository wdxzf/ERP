from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import models


def list_material_categories(db: Session):
    return db.scalars(select(models.MaterialCategory).order_by(models.MaterialCategory.sort_order.asc())).all()


def get_material_category_or_404(db: Session, category_id: int):
    category = db.get(models.MaterialCategory, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Material category not found")
    return category


def get_material_category_by_name(db: Session, name: str):
    return db.scalar(select(models.MaterialCategory).where(models.MaterialCategory.name == name))


def get_material_category_by_prefix(db: Session, code_prefix: str):
    return db.scalar(select(models.MaterialCategory).where(models.MaterialCategory.code_prefix == code_prefix))


def count_materials_by_category_name(db: Session, category_name: str):
    return db.scalar(select(func.count(models.Material.id)).where(models.Material.category == category_name)) or 0


def count_suppliers_using_category_name(db: Session, category_name: str):
    return db.scalar(
        select(func.count(models.Supplier.id)).where(models.Supplier.supplier_categories.like(f"%{category_name}%"))
    ) or 0


def list_system_options(db: Session, option_type: str | None = None):
    query = select(models.SystemOption)
    if option_type:
        query = query.where(models.SystemOption.option_type == option_type)
    query = query.order_by(models.SystemOption.option_type.asc(), models.SystemOption.sort_order.asc(), models.SystemOption.id.asc())
    return db.scalars(query).all()


def get_system_option_or_404(db: Session, option_id: int):
    option = db.get(models.SystemOption, option_id)
    if not option:
        raise HTTPException(status_code=404, detail="System option not found")
    return option


def get_system_option_by_type_and_name(db: Session, option_type: str, name: str):
    return db.scalar(
        select(models.SystemOption).where(
            models.SystemOption.option_type == option_type,
            models.SystemOption.name == name,
        )
    )


def count_materials_by_unit(db: Session, unit_name: str):
    return db.scalar(select(func.count(models.Material.id)).where(models.Material.unit == unit_name)) or 0


def count_materials_by_material_type(db: Session, material_type_name: str):
    return db.scalar(
        select(func.count(models.Material.id)).where(models.Material.material_type == material_type_name)
    ) or 0


def count_materials_by_material_attr(db: Session, attr_name: str):
    return db.scalar(
        select(func.count(models.Material.id)).where(models.Material.material_name_attr == attr_name)
    ) or 0


def count_materials_by_grade(db: Session, grade_name: str):
    return db.scalar(select(func.count(models.Material.id)).where(models.Material.grade_attr == grade_name)) or 0


def count_products_by_product_category(db: Session, category_name: str):
    return db.scalar(
        select(func.count(models.Product.id)).where(models.Product.product_category == category_name)
    ) or 0
