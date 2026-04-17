const msgBox = document.getElementById("msg");
const tbody = document.querySelector("#materials-table tbody");

const MATERIAL_TYPE_OPTIONS = [
  "电子元器件",
  "电气件",
  "机电件",
  "结构件",
  "五金件",
  "模块",
  "板卡",
  "整机",
  "其他",
];

let allMaterials = [];
let allSuppliers = [];
let allCategories = [];
let optionMap = { unit: [], tax_rate: [], material_attr: [], grade: [] };
let materialTableEditMode = false;

const statusMap = {
  draft: "草稿",
  released: "已发布",
  obsolete: "已归档",
};

const escapeHtml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const escapeAttr = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");

const escapeTextarea = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

function normStr(v) {
  return (v ?? "").toString().trim();
}

function formatNumber(v) {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  if (Math.abs(n - Math.round(n)) < 0.000001) return String(Math.round(n));
  return n.toFixed(3).replace(/\.?0+$/, "");
}

function parseSpecDrawingInput(raw) {
  const lines = String(raw || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
  if (!lines.length) return { spec: null, drawing_no: null };
  return {
    spec: lines[0] || null,
    drawing_no: lines.slice(1).join(" / ") || null,
  };
}

function formatModel(material) {
  return [normStr(material.spec), normStr(material.drawing_no)].filter(Boolean).join(" / ");
}

function getMaterialType(material) {
  return normStr(material.material_type) || "其他";
}

function isLowStock(material) {
  const current = Number(material.current_stock || 0);
  const safety = Number(material.safety_stock || 0);
  return safety > 0 && current <= safety;
}

function materialMatchesViewMode(material) {
  const mode = (document.getElementById("view_mode")?.value || "all").toLowerCase();
  if (mode === "standard") return material.part_type === "standard";
  if (mode === "nonstandard") return material.part_type === "custom" || material.part_type === "assembly";
  return true;
}

function getFilters() {
  return {
    keyword: normStr(document.getElementById("f_keyword")?.value).toLowerCase(),
    material_type: normStr(document.getElementById("f_material_type")?.value),
    category: normStr(document.getElementById("f_category")?.value),
    package_name: normStr(document.getElementById("f_package")?.value),
    storage_location: normStr(document.getElementById("f_location")?.value),
    low_stock_only: document.getElementById("f_low_stock_only")?.checked || false,
  };
}

function filterMaterials() {
  const filters = getFilters();
  return allMaterials.filter((material) => {
    if (!materialMatchesViewMode(material)) return false;
    const haystack = [
      material.code,
      material.name,
      material.spec,
      material.drawing_no,
      material.material_type,
      material.category,
      material.package_name,
      material.storage_location,
      material.remark,
    ]
      .join(" ")
      .toLowerCase();
    return (
      (!filters.keyword || haystack.includes(filters.keyword)) &&
      (!filters.material_type || getMaterialType(material) === filters.material_type) &&
      (!filters.category || normStr(material.category) === filters.category) &&
      (!filters.package_name || normStr(material.package_name) === filters.package_name) &&
      (!filters.storage_location || normStr(material.storage_location) === filters.storage_location) &&
      (!filters.low_stock_only || isLowStock(material))
    );
  });
}

function renderSummary(rows) {
  const categorySet = new Set(rows.map((item) => normStr(item.category)).filter(Boolean));
  const locationSet = new Set(rows.map((item) => normStr(item.storage_location)).filter(Boolean));
  document.getElementById("m_total_count").textContent = rows.length;
  document.getElementById("m_low_stock_count").textContent = rows.filter(isLowStock).length;
  document.getElementById("m_category_count").textContent = categorySet.size;
  document.getElementById("m_location_count").textContent = locationSet.size;
}

function renderOptionSelect(selectId, options, placeholder) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const current = select.value;
  select.innerHTML = `<option value="">${placeholder}</option>${(options || [])
    .map((option) => `<option value="${escapeAttr(option.name)}">${escapeHtml(option.name)}</option>`)
    .join("")}`;
  select.value = current;
}

function renderMaterialTypeOptions() {
  const filterSelect = document.getElementById("f_material_type");
  const formSelect = document.getElementById("m_material_type");
  const filterCurrent = filterSelect?.value || "";
  const formCurrent = formSelect?.value || "";
  const options = MATERIAL_TYPE_OPTIONS.map(
    (item) => `<option value="${escapeAttr(item)}">${escapeHtml(item)}</option>`
  ).join("");
  if (filterSelect) filterSelect.innerHTML = `<option value="">全部类型</option>${options}`;
  if (formSelect) formSelect.innerHTML = `<option value="">请选择物料类型</option>${options}`;
  if (filterSelect) filterSelect.value = filterCurrent;
  if (formSelect) formSelect.value = formCurrent || "电子元器件";
}

function renderCategoryOptions() {
  const filterSelect = document.getElementById("f_category");
  const formSelect = document.getElementById("m_category");
  const currentFilter = filterSelect?.value || "";
  const currentForm = formSelect?.value || "";
  const options = allCategories
    .map((item) => `<option value="${escapeAttr(item.name)}">${escapeHtml(item.name)}</option>`)
    .join("");
  if (filterSelect) filterSelect.innerHTML = `<option value="">全部分类</option>${options}`;
  if (formSelect) formSelect.innerHTML = `<option value="">请选择分类</option>${options}`;
  if (filterSelect) filterSelect.value = currentFilter;
  if (formSelect) formSelect.value = currentForm;
}

function renderDynamicFilterOptions() {
  const packageSelect = document.getElementById("f_package");
  const locationSelect = document.getElementById("f_location");
  const currentPackage = packageSelect?.value || "";
  const currentLocation = locationSelect?.value || "";
  const packages = [...new Set(allMaterials.map((item) => normStr(item.package_name)).filter(Boolean))].sort();
  const locations = [...new Set(allMaterials.map((item) => normStr(item.storage_location)).filter(Boolean))].sort();
  if (packageSelect) {
    packageSelect.innerHTML = `<option value="">全部封装</option>${packages
      .map((item) => `<option value="${escapeAttr(item)}">${escapeHtml(item)}</option>`)
      .join("")}`;
    packageSelect.value = currentPackage;
  }
  if (locationSelect) {
    locationSelect.innerHTML = `<option value="">全部库位</option>${locations
      .map((item) => `<option value="${escapeAttr(item)}">${escapeHtml(item)}</option>`)
      .join("")}`;
    locationSelect.value = currentLocation;
  }
}

function refreshSupplierOptions(selected = "") {
  const category = normStr(document.getElementById("m_category")?.value);
  const supplierSelect = document.getElementById("m_default_supplier");
  if (!supplierSelect) return;
  const filtered = allSuppliers.filter((supplier) => {
    const categories = supplier.supplier_categories || [];
    return !category || categories.includes(category);
  });
  supplierSelect.innerHTML =
    `<option value="">请选择供应商</option>` +
    filtered
      .map(
        (supplier) =>
          `<option value="${escapeAttr(supplier.company_name)}">${escapeHtml(supplier.company_name)}${
            supplier.supplier_code ? `（${escapeHtml(supplier.supplier_code)}）` : ""
          }</option>`
      )
      .join("");
  if (selected) supplierSelect.value = selected;
}

function setMaterialFiltersDisabled(disabled) {
  ["f_keyword", "f_material_type", "f_category", "f_package", "f_location", "f_low_stock_only"].forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.disabled = disabled;
  });
}

function updateMaterialBatchBar() {
  const toggle = document.getElementById("material-batch-toggle");
  const save = document.getElementById("material-batch-save");
  const cancel = document.getElementById("material-batch-cancel");
  if (toggle) toggle.classList.toggle("hidden", materialTableEditMode);
  if (save) save.classList.toggle("hidden", !materialTableEditMode);
  if (cancel) cancel.classList.toggle("hidden", !materialTableEditMode);
  setMaterialFiltersDisabled(materialTableEditMode);
}

function renderStatus(material) {
  if (!material.is_active) return `<span class="tag obsolete">停用</span>`;
  const status = material.status || "draft";
  return `<span class="tag ${status}">${statusMap[status] || escapeHtml(status)}</span>`;
}

function renderStockCell(material) {
  const current = formatNumber(material.current_stock) || "0";
  const safety = formatNumber(material.safety_stock) || "0";
  const klass = isLowStock(material) ? "stock-badge stock-badge-low" : "stock-badge";
  return `<div class="stock-stack"><span class="${klass}">${current}</span><span class="muted-mini">最低 ${safety}</span></div>`;
}

function renderTypeSelect(material) {
  const current = getMaterialType(material);
  return `<select class="me-input me-type">${MATERIAL_TYPE_OPTIONS.map(
    (item) =>
      `<option value="${escapeAttr(item)}"${item === current ? " selected" : ""}>${escapeHtml(item)}</option>`
  ).join("")}</select>`;
}

function renderRemarkCell(material) {
  const remark = normStr(material.remark) || "—";
  return `<div class="remark-cell">${escapeHtml(remark)}</div>`;
}

function renderMaterialMetaSummary(material) {
  const parts = [
    material.category ? `分类：${material.category}` : "",
    material.package_name ? `封装：${material.package_name}` : "",
    material.storage_location ? `库位：${material.storage_location}` : "",
  ].filter(Boolean);
  return parts.length ? `<div class="material-subline material-mobile-meta">${escapeHtml(parts.join(" / "))}</div>` : "";
}

function materialRowUnchanged(material, payload, spec, drawingNo) {
  return (
    normStr(payload.name) === normStr(material.name) &&
    normStr(spec) === normStr(material.spec) &&
    normStr(drawingNo) === normStr(material.drawing_no) &&
    normStr(payload.material_type) === normStr(material.material_type) &&
    normStr(payload.package_name) === normStr(material.package_name) &&
    normStr(payload.storage_location) === normStr(material.storage_location) &&
    normStr(payload.remark) === normStr(material.remark) &&
    Number(payload.current_stock) === Number(material.current_stock || 0) &&
    Number(payload.safety_stock) === Number(material.safety_stock || 0)
  );
}

function renderTable() {
  const rows = filterMaterials();
  renderSummary(rows);
  const editing = materialTableEditMode;
  tbody.innerHTML = rows
    .map((material) => {
      const actionsDisabled = editing ? "disabled" : "";
      const actions = `
        <div class="material-actions">
          <button type="button" class="btn sm" onclick="editMaterial(${material.id})" ${actionsDisabled}>编辑</button>
          <button type="button" class="btn sm" onclick="disableMaterial(${material.id})" ${actionsDisabled}>停用</button>
          <button type="button" class="btn sm" onclick="removeMaterial(${material.id})" ${actionsDisabled}>删除</button>
          <a class="btn sm" href="/ui/materials/${material.id}/revisions">版本</a>
        </div>`;
      if (!editing) {
        return `<tr data-mid="${material.id}">
          <td>
            <div class="material-name-cell">${escapeHtml(material.name || "")}</div>
            <div class="material-subline">${escapeHtml(material.code || "")}</div>
            ${renderMaterialMetaSummary(material)}
          </td>
          <td>
            <div class="material-model-cell">${escapeHtml(formatModel(material) || "未填写")}</div>
            <div class="material-subline">${renderStatus(material)}</div>
          </td>
          <td><span class="meta-pill meta-pill-type">${escapeHtml(getMaterialType(material))}</span></td>
          <td><span class="category-chip">${escapeHtml(material.category || "未分类")}</span></td>
          <td><span class="meta-pill">${escapeHtml(material.package_name || "—")}</span></td>
          <td>${renderStockCell(material)}</td>
          <td><span class="meta-pill">${escapeHtml(material.storage_location || "—")}</span></td>
          <td>${renderRemarkCell(material)}</td>
          <td>${actions}</td>
        </tr>`;
      }
      return `<tr data-mid="${material.id}">
        <td>
          <input type="text" class="me-input me-name" value="${escapeAttr(material.name || "")}">
          <div class="material-subline">${escapeHtml(material.code || "")}</div>
        </td>
        <td><textarea class="me-input me-specdraw" rows="2" spellcheck="false">${escapeTextarea(
          [material.spec || "", material.drawing_no || ""].filter(Boolean).join("\n")
        )}</textarea></td>
        <td>${renderTypeSelect(material)}</td>
        <td><span class="category-chip">${escapeHtml(material.category || "未分类")}</span></td>
        <td><input type="text" class="me-input me-package" value="${escapeAttr(material.package_name || "")}"></td>
        <td>
          <input type="number" class="me-input me-cstock" step="0.001" value="${Number(material.current_stock ?? 0)}">
          <input type="number" class="me-input me-sstock" step="0.001" value="${Number(material.safety_stock ?? 0)}" placeholder="最低库存">
        </td>
        <td><input type="text" class="me-input me-location" value="${escapeAttr(material.storage_location || "")}"></td>
        <td><textarea class="me-input me-remark" rows="2">${escapeTextarea(material.remark || "")}</textarea></td>
        <td>${actions}</td>
      </tr>`;
    })
    .join("");
  const total = document.getElementById("materials-record-total");
  if (total) total.textContent = `共 ${rows.length} 条记录`;
}

const showMsg = (message, err = false) => {
  msgBox.textContent = message;
  msgBox.className = err ? "msg err" : "msg ok";
};

async function saveMaterialBatchEdits() {
  const rows = [...tbody.querySelectorAll("tr[data-mid]")];
  if (!rows.length) {
    materialTableEditMode = false;
    updateMaterialBatchBar();
    renderTable();
    return;
  }
  const errors = [];
  let saved = 0;
  let skipped = 0;
  for (const row of rows) {
    const id = Number(row.dataset.mid);
    const material = allMaterials.find((item) => item.id === id);
    if (!material) continue;
    const name = normStr(row.querySelector(".me-name")?.value);
    if (!name) {
      errors.push(`${material.code || id}：名称不能为空`);
      continue;
    }
    const { spec, drawing_no } = parseSpecDrawingInput(row.querySelector(".me-specdraw")?.value || "");
    const payload = {
      name,
      spec,
      drawing_no,
      material_type: normStr(row.querySelector(".me-type")?.value) || null,
      package_name: normStr(row.querySelector(".me-package")?.value) || null,
      storage_location: normStr(row.querySelector(".me-location")?.value) || null,
      remark: normStr(row.querySelector(".me-remark")?.value) || null,
      current_stock: Number(row.querySelector(".me-cstock")?.value || 0),
      safety_stock: Number(row.querySelector(".me-sstock")?.value || 0),
    };
    if (materialRowUnchanged(material, payload, spec, drawing_no)) {
      skipped += 1;
      continue;
    }
    const response = await fetch(`/materials/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      let detail = "保存失败";
      try {
        const data = await response.json();
        detail = data.detail || detail;
        if (Array.isArray(detail)) detail = JSON.stringify(detail);
      } catch (_) {}
      errors.push(`${material.code || id}：${detail}`);
      continue;
    }
    saved += 1;
  }
  materialTableEditMode = false;
  updateMaterialBatchBar();
  await loadMaterials();
  if (errors.length) {
    showMsg(
      `已保存 ${saved} 条，跳过 ${skipped} 条，失败 ${errors.length} 条：${errors.slice(0, 2).join("；")}${
        errors.length > 2 ? "…" : ""
      }`,
      true
    );
    return;
  }
  showMsg(saved ? `已保存 ${saved} 条${skipped ? `，未改动 ${skipped} 条` : ""}` : "没有检测到需要保存的修改");
}

async function loadSuppliers() {
  const response = await fetch("/suppliers");
  allSuppliers = await response.json();
}

async function loadCategories() {
  const response = await fetch("/material-categories");
  const rows = await response.json();
  allCategories = rows.filter((item) => item.is_active);
  renderCategoryOptions();
}

async function loadSystemOptions() {
  const response = await fetch("/system-options");
  const rows = await response.json();
  const active = rows.filter((item) => item.is_active);
  optionMap = {
    unit: active.filter((item) => item.option_type === "unit"),
    tax_rate: active.filter((item) => item.option_type === "tax_rate"),
    material_attr: active.filter((item) => item.option_type === "material_attr"),
    grade: active.filter((item) => item.option_type === "grade"),
  };
  renderOptionSelect("m_unit", optionMap.unit, "请选择单位");
  renderOptionSelect("m_tax_rate", optionMap.tax_rate, "请选择税率");
  renderOptionSelect("m_material_name_attr", optionMap.material_attr, "请选择品牌 / 材质");
  renderOptionSelect("m_grade_attr", optionMap.grade, "请选择等级 / 属性");
}

async function loadMaterials() {
  const response = await fetch("/materials");
  allMaterials = await response.json();
  renderDynamicFilterOptions();
  renderTable();
}

function openMaterialModal() {
  document.getElementById("material-modal").classList.remove("hidden");
  document.getElementById("material-modal-title").textContent = "新增物料";
  document.getElementById("material-form").reset();
  document.getElementById("m_id").value = "";
  document.getElementById("m_code").value = "";
  if (!document.getElementById("m_material_type").value) {
    document.getElementById("m_material_type").value = "电子元器件";
  }
  if (!document.getElementById("m_category").value && allCategories.length) {
    document.getElementById("m_category").value = allCategories[0].name;
  }
  refreshSupplierOptions();
}

function closeMaterialModal() {
  document.getElementById("material-modal").classList.add("hidden");
  document.getElementById("material-form").reset();
  document.getElementById("m_id").value = "";
}

function openImportModal() {
  document.getElementById("material-import-modal").classList.remove("hidden");
  document.getElementById("material-import-file").value = "";
}

function closeImportModal() {
  document.getElementById("material-import-modal").classList.add("hidden");
  document.getElementById("material-import-file").value = "";
}

function editMaterial(id) {
  const material = allMaterials.find((item) => item.id === id);
  if (!material) return;
  openMaterialModal();
  document.getElementById("material-modal-title").textContent = "编辑物料";
  [
    "id",
    "code",
    "name",
    "material_type",
    "package_name",
    "storage_location",
    "unit",
    "category",
    "default_supplier",
    "tax_rate",
    "unit_price",
    "safety_stock",
    "current_stock",
    "usage",
    "material_name_attr",
    "grade_attr",
    "purchase_link",
    "current_revision",
    "status",
    "remark",
  ].forEach((key) => {
    const element = document.getElementById(`m_${key}`);
    if (element) element.value = material[key] ?? "";
  });
  document.getElementById("m_spec_draw").value = [material.spec || "", material.drawing_no || ""]
    .filter(Boolean)
    .join("\n");
  if (!document.getElementById("m_material_type").value) {
    document.getElementById("m_material_type").value = getMaterialType(material);
  }
  if (material.status === "obsolete") {
    document.getElementById("m_status").value = "draft";
  }
  refreshSupplierOptions(material.default_supplier || "");
}

async function saveMaterial() {
  const id = document.getElementById("m_id").value;
  const { spec, drawing_no } = parseSpecDrawingInput(document.getElementById("m_spec_draw")?.value || "");
  const payload = {
    name: normStr(document.getElementById("m_name").value),
    spec,
    drawing_no,
    material_type: normStr(document.getElementById("m_material_type").value) || null,
    package_name: normStr(document.getElementById("m_package_name").value) || null,
    storage_location: normStr(document.getElementById("m_storage_location").value) || null,
    unit: document.getElementById("m_unit").value,
    category: document.getElementById("m_category").value,
    default_supplier: document.getElementById("m_default_supplier").value || null,
    tax_rate: document.getElementById("m_tax_rate").value || null,
    unit_price: Number(document.getElementById("m_unit_price").value || 0),
    safety_stock: Number(document.getElementById("m_safety_stock").value || 0),
    current_stock: Number(document.getElementById("m_current_stock").value || 0),
    usage: normStr(document.getElementById("m_usage").value) || null,
    material_name_attr: document.getElementById("m_material_name_attr").value || null,
    grade_attr: document.getElementById("m_grade_attr").value || null,
    purchase_link: normStr(document.getElementById("m_purchase_link").value) || null,
    current_revision: normStr(document.getElementById("m_current_revision").value) || null,
    status: document.getElementById("m_status").value,
    remark: normStr(document.getElementById("m_remark").value) || null,
  };
  if (!payload.name) return showMsg("名称必填", true);
  if (!payload.material_type) return showMsg("物料类型必填", true);
  if (!payload.category) return showMsg("分类必填", true);
  const url = id ? `/materials/${id}` : "/materials";
  const method = id ? "PUT" : "POST";
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    return showMsg(error.detail || "保存失败", true);
  }
  showMsg("保存成功");
  closeMaterialModal();
  await loadMaterials();
}

async function disableMaterial(id) {
  if (!confirm("确认停用该物料？")) return;
  const response = await fetch(`/materials/${id}`, { method: "DELETE" });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    return showMsg(error.detail || "停用失败", true);
  }
  showMsg("已停用");
  await loadMaterials();
}

async function removeMaterial(id) {
  if (!confirm("确认彻底删除该物料？删除后不可恢复。")) return;
  const response = await fetch(`/materials/${id}/hard-delete`, { method: "DELETE" });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    return showMsg(error.detail || "删除失败", true);
  }
  showMsg("已删除");
  await loadMaterials();
}

async function importMaterialsFromFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch("/import/materials", { method: "POST", body: formData });
  let data = {};
  try {
    data = await response.json();
  } catch (_) {}
  if (!response.ok) {
    const detail = data.detail;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? JSON.stringify(detail)
          : response.statusText || "导入失败";
    return showMsg(message, true);
  }
  let message = `导入完成：成功 ${data.created ?? 0} 条，失败 ${data.failed ?? 0} 条`;
  if (data.errors && data.errors.length) {
    const example = data.errors[0];
    message += `。示例：第 ${example.row} 行 - ${example.message}`;
    if (data.errors.length > 1) message += `（另 ${data.errors.length - 1} 条错误已省略）`;
  }
  showMsg(message, (data.failed || 0) > 0 && (data.created || 0) === 0);
  closeImportModal();
  if (data.created > 0) await loadMaterials();
}

document.getElementById("material-import-open-btn")?.addEventListener("click", openImportModal);
document.getElementById("material-import-cancel-btn")?.addEventListener("click", closeImportModal);

document.getElementById("material-import-confirm-btn")?.addEventListener("click", async () => {
  const file = document.getElementById("material-import-file")?.files?.[0];
  if (!file) {
    showMsg("请先选择 Excel 文件", true);
    return;
  }
  await importMaterialsFromFile(file);
});

document.getElementById("material-quick-low-stock")?.addEventListener("click", () => {
  const checkbox = document.getElementById("f_low_stock_only");
  checkbox.checked = !checkbox.checked;
  renderTable();
});

document.getElementById("material-clear-filters")?.addEventListener("click", () => {
  document.getElementById("f_keyword").value = "";
  document.getElementById("f_material_type").value = "";
  document.getElementById("f_category").value = "";
  document.getElementById("f_package").value = "";
  document.getElementById("f_location").value = "";
  document.getElementById("f_low_stock_only").checked = false;
  renderTable();
});

[
  ["f_keyword", "input"],
  ["f_material_type", "change"],
  ["f_category", "change"],
  ["f_package", "change"],
  ["f_location", "change"],
  ["f_low_stock_only", "change"],
].forEach(([id, eventName]) => {
  const element = document.getElementById(id);
  if (element) element.addEventListener(eventName, renderTable);
});

document.getElementById("material-batch-toggle")?.addEventListener("click", () => {
  materialTableEditMode = true;
  updateMaterialBatchBar();
  renderTable();
});

document.getElementById("material-batch-cancel")?.addEventListener("click", () => {
  materialTableEditMode = false;
  updateMaterialBatchBar();
  renderTable();
});

document.getElementById("material-batch-save")?.addEventListener("click", () => {
  saveMaterialBatchEdits().catch((error) => showMsg(error.message || "保存失败", true));
});

renderMaterialTypeOptions();

loadCategories()
  .then(() => loadSystemOptions())
  .then(() => loadSuppliers())
  .then(() => loadMaterials());

updateMaterialBatchBar();
