from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import models


def list_materials(db: Session):
    return db.scalars(select(models.Material).order_by(models.Material.id.desc())).all()


def get_material_or_404(db: Session, material_id: int):
    material = db.get(models.Material, material_id)
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    return material


def get_active_category_by_name(db: Session, category_name: str | None):
    if not category_name:
        return None
    return db.scalar(
        select(models.MaterialCategory).where(
            models.MaterialCategory.name == category_name,
            models.MaterialCategory.is_active.is_(True),
        )
    )


def get_material_by_code(db: Session, code: str):
    return db.scalar(select(models.Material).where(models.Material.code == code))


def list_material_codes_by_prefix(db: Session, prefix: str):
    return db.scalars(select(models.Material.code).where(models.Material.code.like(f"{prefix}-%"))).all()


def count_material_revisions(db: Session, material_id: int):
    return db.scalar(
        select(func.count(models.PartRevision.id)).where(models.PartRevision.material_id == material_id)
    ) or 0


def count_material_bom_items(db: Session, material_id: int):
    return db.scalar(select(func.count(models.BOMItem.id)).where(models.BOMItem.material_id == material_id)) or 0


def count_material_transactions(db: Session, material_id: int):
    return db.scalar(
        select(func.count(models.StockTransaction.id)).where(models.StockTransaction.material_id == material_id)
    ) or 0
