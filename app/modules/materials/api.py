from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.materials import service
from app.modules.materials.schema import MaterialCreate, MaterialRead, MaterialUpdate

router = APIRouter(prefix="/materials", tags=["materials"])


@router.get("", response_model=list[MaterialRead])
def get_materials(db: Session = Depends(get_db)):
    return service.list_materials(db)


@router.post("", response_model=MaterialRead)
def create_material(payload: MaterialCreate, db: Session = Depends(get_db)):
    return service.create_material(db, payload)


@router.get("/{material_id}", response_model=MaterialRead)
def get_material(material_id: int, db: Session = Depends(get_db)):
    return service.get_material(db, material_id)


@router.put("/{material_id}", response_model=MaterialRead)
def update_material(material_id: int, payload: MaterialUpdate, db: Session = Depends(get_db)):
    return service.update_material(db, material_id, payload)


@router.delete("/{material_id}", response_model=MaterialRead)
def delete_material(material_id: int, db: Session = Depends(get_db)):
    return service.soft_delete_material(db, material_id)


@router.delete("/{material_id}/hard-delete")
def hard_delete_material(material_id: int, db: Session = Depends(get_db)):
    return service.hard_delete_material(db, material_id)
