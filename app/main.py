from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from app import crud
from app.database import (
    BASE_DIR,
    Base,
    SessionLocal,
    engine,
    ensure_company_profile,
    ensure_company_profile_columns,
    ensure_default_material_categories,
    ensure_default_system_options,
    ensure_purchase_order_extensions,
    ensure_sqlite_app_integration_woocommerce_columns,
    ensure_sqlite_material_columns,
    ensure_sqlite_sales_order_lines_product_id,
    ensure_sqlite_sales_orders_columns,
    ensure_sqlite_supplier_columns,
    migrate_inquiry_lines_material_ref_only,
)
from app.routes import (
    bom,
    company_settings,
    excel_exports,
    excel_imports,
    inquiries,
    integrations_taobao,
    integrations_woocommerce,
    inventory,
    material_categories,
    materials,
    procurement,
    production_plans,
    products,
    purchase_orders,
    revisions,
    sales,
    suppliers,
    system_options,
    ui,
)

Base.metadata.create_all(bind=engine)
ensure_sqlite_material_columns()
ensure_sqlite_supplier_columns()
ensure_default_system_options()
ensure_default_material_categories()
ensure_company_profile()
ensure_company_profile_columns()
migrate_inquiry_lines_material_ref_only()
ensure_purchase_order_extensions()
ensure_sqlite_sales_orders_columns()
ensure_sqlite_sales_order_lines_product_id()
ensure_sqlite_app_integration_woocommerce_columns()
(BASE_DIR / "uploads" / "purchase_invoices").mkdir(parents=True, exist_ok=True)
(BASE_DIR / "uploads" / "revision_drawings").mkdir(parents=True, exist_ok=True)
_db_boot = SessionLocal()
try:
    crud.get_or_create_integration_settings(_db_boot)
finally:
    _db_boot.close()

app = FastAPI(
    title="ERP_W / Inventory API",
    version="0.1.0",
    description="ERP_W API",
)

api_routers = [
    materials.router,
    material_categories.router,
    system_options.router,
    revisions.router,
    bom.router,
    inventory.router,
    procurement.router,
    production_plans.router,
    products.router,
    inquiries.router,
    company_settings.router,
    integrations_taobao.router,
    integrations_woocommerce.router,
    sales.router,
    purchase_orders.router,
    suppliers.router,
    excel_exports.router,
    excel_imports.router,
    ui.api_router,
]

for router in api_routers:
    app.include_router(router)
    app.include_router(router, prefix="/api")

app.include_router(ui.router)
app.mount("/static", StaticFiles(directory="app/static"), name="static")


@app.get("/")
def root():
    return RedirectResponse(url="/ui/materials")


@app.get("/inventory")
@app.get("/inventory/")
def inventory_entry():
    return RedirectResponse(url="/ui/materials")


@app.get("/pcba")
@app.get("/pcba/")
@app.get("/designs")
@app.get("/designs/")
def pcba_entry():
    return RedirectResponse(url="/ui/self-products")
