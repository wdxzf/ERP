from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "inventory.db"

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH.as_posix()}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_sqlite_material_columns():
    """Lightweight schema patch for existing SQLite DB without Alembic."""
    expected_columns = {
        "usage": "VARCHAR(255)",
        "material_name_attr": "VARCHAR(128)",
        "standard_attr": "VARCHAR(128)",
        "grade_attr": "VARCHAR(64)",
        "purchase_link": "VARCHAR(500)",
        "tax_rate": "VARCHAR(32)",
        "material_type": "VARCHAR(64)",
        "package_name": "VARCHAR(64)",
        "storage_location": "VARCHAR(64)",
    }
    with engine.begin() as conn:
        rows = conn.execute(text("PRAGMA table_info(materials)")).fetchall()
        existing = {r[1] for r in rows}  # PRAGMA columns: cid, name, type, notnull, dflt_value, pk
        for col, col_type in expected_columns.items():
            if col not in existing:
                conn.execute(text(f'ALTER TABLE "materials" ADD COLUMN "{col}" {col_type}'))
        conn.execute(
            text(
                """
                UPDATE materials
                SET material_type = CASE
                    WHEN material_type IS NOT NULL AND TRIM(material_type) != '' THEN material_type
                    WHEN part_type = 'custom' THEN '板卡'
                    WHEN part_type = 'assembly' THEN '模块'
                    ELSE '电子元器件'
                END
                """
            )
        )


def ensure_sqlite_supplier_columns():
    expected_columns = {
        "supplier_code": "VARCHAR(64)",
        "supplier_categories": "TEXT",
        "contact_person": "VARCHAR(64)",
        "payment_term_days": "INTEGER",
    }
    with engine.begin() as conn:
        rows = conn.execute(text("PRAGMA table_info(suppliers)")).fetchall()
        if not rows:
            return
        existing = {r[1] for r in rows}
        for col, col_type in expected_columns.items():
            if col not in existing:
                conn.execute(text(f'ALTER TABLE "suppliers" ADD COLUMN "{col}" {col_type}'))


def ensure_company_profile():
    with engine.begin() as conn:
        try:
            rows = conn.execute(text('SELECT COUNT(1) FROM "company_profile"')).scalar()
        except Exception:
            return
        if rows and int(rows) > 0:
            return
        conn.execute(
            text(
                'INSERT INTO "company_profile" (id, company_name, updated_at) '
                "VALUES (1, '', CURRENT_TIMESTAMP)"
            )
        )


def ensure_company_profile_columns():
    expected_columns = {"contact_person": "VARCHAR(64)"}
    with engine.begin() as conn:
        try:
            rows = conn.execute(text('PRAGMA table_info("company_profile")')).fetchall()
        except Exception:
            return
        if not rows:
            return
        existing = {r[1] for r in rows}
        for col, col_type in expected_columns.items():
            if col not in existing:
                conn.execute(text(f'ALTER TABLE "company_profile" ADD COLUMN "{col}" {col_type}'))


def migrate_inquiry_lines_material_ref_only():
    """询价明细改为仅保存 material_id + qty + remark；旧表含 target_price 等快照字段时迁移。"""
    from app.models import InquiryLine

    with engine.begin() as conn:
        tab = conn.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' AND name='inquiry_lines'")
        ).fetchone()
        if not tab:
            return
        col_rows = conn.execute(text('PRAGMA table_info("inquiry_lines")')).fetchall()
        col_names = [r[1] for r in col_rows]
        if "target_price" not in col_names:
            return
        conn.execute(text('ALTER TABLE "inquiry_lines" RENAME TO "inquiry_lines_old"'))

    InquiryLine.__table__.create(bind=engine, checkfirst=True)

    with engine.begin() as conn:
        old_info = conn.execute(text('PRAGMA table_info("inquiry_lines_old")')).fetchall()
        idx = {r[1]: r[0] for r in old_info}
        for row in conn.execute(text('SELECT * FROM "inquiry_lines_old"')):
            tup = tuple(row)
            oid = tup[idx["id"]]
            iid = tup[idx["inquiry_id"]]
            lno = tup[idx["line_no"]]
            mid = tup[idx["material_id"]] if "material_id" in idx else None
            if mid is not None:
                try:
                    mid = int(mid)
                except (TypeError, ValueError):
                    mid = None
            if mid is None and "material_code" in idx:
                code = (tup[idx["material_code"]] or "").strip()
                if code:
                    r = conn.execute(
                        text("SELECT id FROM materials WHERE code = :c LIMIT 1"),
                        {"c": code},
                    ).fetchone()
                    if r:
                        mid = int(r[0])
            if mid is None:
                continue
            qty = tup[idx["qty"]]
            remark = tup[idx["remark"]] if "remark" in idx else None
            conn.execute(
                text(
                    'INSERT INTO "inquiry_lines" (id, inquiry_id, line_no, material_id, qty, remark) '
                    "VALUES (:id, :iid, :lno, :mid, :qty, :remark)"
                ),
                {"id": oid, "iid": iid, "lno": lno, "mid": mid, "qty": qty, "remark": remark},
            )
        conn.execute(text('DROP TABLE "inquiry_lines_old"'))


def ensure_purchase_order_extensions():
    """采购订单：付款状态、明细 material_id/已收数量、采购发票表。"""
    from app.models import PurchaseInvoice

    with engine.begin() as conn:
        po_cols = conn.execute(text('PRAGMA table_info("purchase_orders")')).fetchall()
        if po_cols:
            po_names = {r[1] for r in po_cols}
            if "payment_status" not in po_names:
                conn.execute(
                    text(
                        'ALTER TABLE "purchase_orders" ADD COLUMN "payment_status" VARCHAR(16) NOT NULL DEFAULT \'unpaid\''
                    )
                )

        ln_cols = conn.execute(text('PRAGMA table_info("purchase_order_lines")')).fetchall()
        if ln_cols:
            ln_names = {r[1] for r in ln_cols}
            if "material_id" not in ln_names:
                conn.execute(text('ALTER TABLE "purchase_order_lines" ADD COLUMN "material_id" INTEGER'))
            if "received_qty" not in ln_names:
                conn.execute(
                    text(
                        'ALTER TABLE "purchase_order_lines" ADD COLUMN "received_qty" NUMERIC(12,4) NOT NULL DEFAULT 0'
                    )
                )
            conn.execute(
                text(
                    """
                    UPDATE purchase_order_lines
                    SET material_id = (
                        SELECT id FROM materials WHERE materials.code = purchase_order_lines.material_code LIMIT 1
                    )
                    WHERE material_id IS NULL
                      AND material_code IS NOT NULL
                      AND TRIM(material_code) != ''
                    """
                )
            )

    PurchaseInvoice.__table__.create(bind=engine, checkfirst=True)


def ensure_sqlite_app_integration_woocommerce_columns():
    cols = {
        "woocommerce_site_url": "VARCHAR(512)",
        "woocommerce_consumer_key": "VARCHAR(128)",
        "woocommerce_consumer_secret": "VARCHAR(128)",
        "woocommerce_last_sync": "DATETIME",
    }
    with engine.begin() as conn:
        try:
            rows = conn.execute(text('PRAGMA table_info("app_integration_settings")')).fetchall()
        except Exception:
            return
        if not rows:
            return
        existing = {r[1] for r in rows}
        for col, typ in cols.items():
            if col not in existing:
                conn.execute(text(f'ALTER TABLE "app_integration_settings" ADD COLUMN "{col}" {typ}'))


def ensure_sqlite_sales_order_platform_order_no():
    """保留函数名供兼容；逻辑已并入 ensure_sqlite_sales_orders_columns。"""
    ensure_sqlite_sales_orders_columns()


def ensure_sqlite_sales_orders_columns():
    """销售订单：平台单号、抬头备注、发票字段（SQLite 增量补列）。"""
    cols = {
        "platform_order_no": 'VARCHAR(64)',
        "header_remark": "TEXT",
        "invoice_status": "VARCHAR(16) NOT NULL DEFAULT 'none'",
        "invoice_no": "VARCHAR(64)",
        "invoiced_at": "DATETIME",
    }
    with engine.begin() as conn:
        try:
            rows = conn.execute(text('PRAGMA table_info("sales_orders")')).fetchall()
        except Exception:
            return
        if not rows:
            return
        existing = {r[1] for r in rows}
        for col, typ in cols.items():
            if col not in existing:
                conn.execute(text(f'ALTER TABLE "sales_orders" ADD COLUMN "{col}" {typ}'))


def ensure_sqlite_sales_order_lines_product_id():
    with engine.begin() as conn:
        try:
            rows = conn.execute(text('PRAGMA table_info("sales_order_lines")')).fetchall()
        except Exception:
            return
        if not rows:
            return
        existing = {r[1] for r in rows}
        if "product_id" not in existing:
            conn.execute(text('ALTER TABLE "sales_order_lines" ADD COLUMN "product_id" INTEGER'))


def ensure_default_system_options():
    defaults = {
        "unit": ["只", "个", "盘", "卷", "套", "米"],
        "tax_rate": ["13%专票", "3%普票", "未税", "1%普票", "3%专票", "9%专票"],
        "material_attr": ["TI", "ADI", "ST", "Infineon", "onsemi", "NXP", "Murata", "Yageo"],
        "grade": ["常规", "精密", "工业级", "车规级", "实验用"],
    }
    defaults.pop("tax_rate", None)
    defaults["material_type"] = ["电子元器件", "电气件", "机电件", "结构件", "五金件", "模块", "板卡", "整机", "其他"]
    with engine.begin() as conn:
        for option_type, names in defaults.items():
            for idx, name in enumerate(names, start=1):
                exists = conn.execute(
                    text(
                        'SELECT COUNT(1) FROM "system_options" WHERE option_type=:option_type AND name=:name'
                    ),
                    {"option_type": option_type, "name": name},
                ).scalar()
                if exists and int(exists) > 0:
                    continue
                conn.execute(
                    text(
                        'INSERT INTO "system_options" (option_type, name, sort_order, is_active, created_at, updated_at) '
                        "VALUES (:option_type, :name, :sort_order, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
                    ),
                    {"option_type": option_type, "name": name, "sort_order": idx * 10},
                )


def ensure_default_material_categories():
    defaults = [
        ("电阻", "RES"),
        ("电容", "CAP"),
        ("IC", "IC"),
        ("连接器", "CONN"),
        ("模块", "MOD"),
        ("板卡", "PCB"),
        ("电机", "MOT"),
        ("钢材", "MET"),
        ("螺丝", "SCR"),
        ("五金件", "HW"),
        ("传感器", "SEN"),
        ("机加工件", "MC"),
        ("电源芯片", "PMIC"),
        ("MCU", "MCU"),
    ]
    with engine.begin() as conn:
        count = conn.execute(text('SELECT COUNT(1) FROM "material_categories"')).scalar()
        if count and int(count) > 0:
            return
        for idx, (name, prefix) in enumerate(defaults, start=1):
            conn.execute(
                text(
                    'INSERT INTO "material_categories" '
                    '(name, code_prefix, sort_order, is_active, remark, created_at, updated_at) '
                    "VALUES (:name, :code_prefix, :sort_order, 1, :remark, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
                ),
                {
                    "name": name,
                    "code_prefix": prefix,
                    "sort_order": idx * 10,
                    "remark": "默认电子元器件分类",
                },
            )
