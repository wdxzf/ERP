from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.categories import service
from app.modules.categories.schema import (
    MaterialCategoryCreate,
    MaterialCategoryRead,
    MaterialCategoryUpdate,
    SystemOptionCreate,
    SystemOptionRead,
    SystemOptionUpdate,
)

material_categories_router = APIRouter(prefix="/material-categories", tags=["material-categories"])
system_options_router = APIRouter(prefix="/system-options", tags=["system-options"])


@material_categories_router.get("", response_model=list[MaterialCategoryRead])
def get_material_categories(db: Session = Depends(get_db)):
    return service.list_material_categories(db)


@material_categories_router.post("", response_model=MaterialCategoryRead)
def create_material_category(payload: MaterialCategoryCreate, db: Session = Depends(get_db)):
    return service.create_material_category(db, payload)


@material_categories_router.get("/{category_id}", response_model=MaterialCategoryRead)
def get_material_category(category_id: int, db: Session = Depends(get_db)):
    return service.get_material_category(db, category_id)


@material_categories_router.put("/{category_id}", response_model=MaterialCategoryRead)
def update_material_category(category_id: int, payload: MaterialCategoryUpdate, db: Session = Depends(get_db)):
    return service.update_material_category(db, category_id, payload)


@material_categories_router.delete("/{category_id}", response_model=MaterialCategoryRead)
def delete_material_category(category_id: int, db: Session = Depends(get_db)):
    return service.soft_delete_material_category(db, category_id)


@material_categories_router.delete("/{category_id}/hard-delete")
def hard_delete_material_category(category_id: int, db: Session = Depends(get_db)):
    return service.hard_delete_material_category(db, category_id)


@system_options_router.get("", response_model=list[SystemOptionRead])
def get_system_options(option_type: str | None = Query(default=None), db: Session = Depends(get_db)):
    return service.list_system_options(db, option_type)


@system_options_router.post("", response_model=SystemOptionRead)
def create_system_option(payload: SystemOptionCreate, db: Session = Depends(get_db)):
    return service.create_system_option(db, payload)


@system_options_router.get("/{option_id}", response_model=SystemOptionRead)
def get_system_option(option_id: int, db: Session = Depends(get_db)):
    return service.get_system_option(db, option_id)


@system_options_router.put("/{option_id}", response_model=SystemOptionRead)
def update_system_option(option_id: int, payload: SystemOptionUpdate, db: Session = Depends(get_db)):
    return service.update_system_option(db, option_id, payload)


@system_options_router.delete("/{option_id}", response_model=SystemOptionRead)
def delete_system_option(option_id: int, db: Session = Depends(get_db)):
    return service.soft_delete_system_option(db, option_id)


@system_options_router.delete("/{option_id}/hard-delete")
def hard_delete_system_option(option_id: int, db: Session = Depends(get_db)):
    return service.hard_delete_system_option(db, option_id)
