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
const VIEW_MODE_LABELS = {
  all: "全部物料",
  standard: "标准物料",
  nonstandard: "板卡 / 模块",
};

let allMaterials = [];
let allSuppliers = [];
let allCategories = [];
let optionMap = { unit: [], material_attr: [], grade: [] };

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttr(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
}

function normStr(value) {
  return String(value ?? "").trim();
}

function formatNumber(value) {
  if (value === null || value === undefined || value === "") return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  if (Math.abs(num - Math.round(num)) < 0.000001) return String(Math.round(num));
  return num.toFixed(3).replace(/\.?0+$/, "");
}

function showMsg(message, isError = false) {
  msgBox.textContent = message || "";
  msgBox.className = message ? `msg ${isError ? "err" : "ok"}` : "msg";
}

function refreshIcons() {
  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

function setTableState(message, colspan = 8) {
  tbody.innerHTML = `<tr><td colspan="${colspan}" class="table-state-cell">${escapeHtml(message)}</td></tr>`;
  const mobileList = document.getElementById("materials-mobile-list");
  if (mobileList) {
    mobileList.innerHTML = `<div class="mobile-state-card">${escapeHtml(message)}</div>`;
  }
}

function joinDisplayParts(...values) {
  return values.map(normStr).filter(Boolean).join(" / ");
}

function getModelSpec(material) {
  return normStr(material.model_spec) || joinDisplayParts(material.spec, material.drawing_no, material.package_name);
}

function getBrandAttr(material) {
  return normStr(material.brand_attr) || joinDisplayParts(material.material_name_attr, material.grade_attr);
}

function getNoteText(material) {
  return normStr(material.notes) || normStr(material.remark);
}

function getMaterialType(material) {
  return normStr(material.material_type) || "其他";
}

function getViewMode() {
  return (document.getElementById("view_mode")?.value || "all").toLowerCase();
}

function getViewModeLabel() {
  return VIEW_MODE_LABELS[getViewMode()] || VIEW_MODE_LABELS.all;
}

function isLowStock(material) {
  const current = Number(material.current_stock || 0);
  const safety = Number(material.safety_stock || 0);
  return safety > 0 && current <= safety;
}

function materialMatchesViewMode(material) {
  const mode = getViewMode();
  if (mode === "standard") return material.part_type === "standard";
  if (mode === "nonstandard") return material.part_type === "custom" || material.part_type === "assembly";
  return true;
}

function getFilters() {
  return {
    keyword: normStr(document.getElementById("f_keyword")?.value).toLowerCase(),
    materialType: normStr(document.getElementById("f_material_type")?.value),
    category: normStr(document.getElementById("f_category")?.value),
    storageLocation: normStr(document.getElementById("f_location")?.value),
  };
}

function filterMaterials() {
  const filters = getFilters();
  return allMaterials.filter((material) => {
    if (!materialMatchesViewMode(material)) return false;

    const haystack = [
      material.code,
      material.name,
      getModelSpec(material),
      getBrandAttr(material),
      getNoteText(material),
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!filters.keyword || haystack.includes(filters.keyword)) &&
      (!filters.materialType || getMaterialType(material) === filters.materialType) &&
      (!filters.category || normStr(material.category) === filters.category) &&
      (!filters.storageLocation || normStr(material.storage_location) === filters.storageLocation)
    );
  });
}

function renderViewBadge() {
  const badge = document.getElementById("materials-view-badge");
  if (badge) badge.textContent = getViewModeLabel();
}

function renderFilterSummary(filters, rows) {
  const activeLabels = [];
  if (filters.keyword) activeLabels.push(`关键词“${filters.keyword}”`);
  if (filters.materialType) activeLabels.push(`类型 ${filters.materialType}`);
  if (filters.category) activeLabels.push(`分类 ${filters.category}`);
  if (filters.storageLocation) activeLabels.push(`库位 ${filters.storageLocation}`);

  const summary = document.getElementById("materials-filter-summary");
  if (!summary) return;
  if (!activeLabels.length) {
    summary.textContent = `当前视图：${getViewModeLabel()}，未启用筛选`;
    return;
  }
  summary.textContent = `已筛选 ${activeLabels.length} 项，匹配 ${rows.length} 条：${activeLabels.join(" / ")}`;
}

function renderSummary(rows) {
  const lowStockCount = rows.filter((item) => isLowStock(item)).length;
  const uncategorizedCount = rows.filter((item) => !normStr(item.category)).length;
  const recentCount = rows.filter((item) => {
    if (!item.created_at) return false;
    const createdAt = new Date(item.created_at).getTime();
    return Number.isFinite(createdAt) && Date.now() - createdAt <= 7 * 24 * 60 * 60 * 1000;
  }).length;

  const mapping = {
    m_total_count: rows.length,
    m_low_stock_count: lowStockCount,
    m_recent_count: recentCount,
    m_uncategorized_count: uncategorizedCount,
  };

  Object.entries(mapping).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value);
  });
}

function renderSelectOptions(selectId, options, placeholder) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const currentValue = select.value;
  select.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>${(options || [])
    .map((option) => `<option value="${escapeAttr(option.name)}">${escapeHtml(option.name)}</option>`)
    .join("")}`;
  select.value = currentValue;
}

function renderBrandAttrSuggestions() {
  const dataList = document.getElementById("m_brand_attr_options");
  if (!dataList) return;
  const values = [
    ...optionMap.material_attr.map((item) => normStr(item.name)),
    ...optionMap.grade.map((item) => normStr(item.name)),
  ]
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .sort((a, b) => a.localeCompare(b, "zh-CN"));

  dataList.innerHTML = values.map((value) => `<option value="${escapeAttr(value)}"></option>`).join("");
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
  const locationSelect = document.getElementById("f_location");
  const currentLocation = locationSelect?.value || "";
  const locations = [...new Set(allMaterials.map((item) => normStr(item.storage_location)).filter(Boolean))].sort();

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
      .map((supplier) => {
        const suffix = supplier.supplier_code ? `（${escapeHtml(supplier.supplier_code)}）` : "";
        return `<option value="${escapeAttr(supplier.company_name)}">${escapeHtml(supplier.company_name)}${suffix}</option>`;
      })
      .join("");

  supplierSelect.value = selected || "";
}

function renderStockCell(material) {
  const current = formatNumber(material.current_stock) || "0";
  const klass = isLowStock(material) ? "stock-badge stock-badge-low" : "stock-badge";
  return `<div class="stock-stack"><span class="${klass}">${current}</span></div>`;
}

function renderRemarkCell(material) {
  return `<div class="remark-cell">${escapeHtml(getNoteText(material) || "-")}</div>`;
}

function renderMaterialMetaSummary(material) {
  const parts = [
    material.category ? `分类：${material.category}` : "",
    material.storage_location ? `库位：${material.storage_location}` : "",
    !material.is_active ? "已停用" : "",
  ].filter(Boolean);
  return parts.length ? `<div class="material-subline material-mobile-meta">${escapeHtml(parts.join(" / "))}</div>` : "";
}

function renderActionButtons(material) {
  return `
    <div class="material-actions icon-actions">
      <button type="button" class="btn icon-btn" onclick="editMaterial(${material.id})" title="编辑" aria-label="编辑">
        <i data-lucide="square-pen"></i>
      </button>
      <button type="button" class="btn icon-btn" onclick="disableMaterial(${material.id})" title="停用" aria-label="停用">
        <i data-lucide="pause-circle"></i>
      </button>
      <button type="button" class="btn icon-btn danger" onclick="removeMaterial(${material.id})" title="删除" aria-label="删除">
        <i data-lucide="trash-2"></i>
      </button>
      <a class="btn icon-btn" href="/ui/materials/${material.id}/revisions" title="版本" aria-label="版本">
        <i data-lucide="history"></i>
      </a>
    </div>
  `;
}

function renderMobileList(rows) {
  const mobileList = document.getElementById("materials-mobile-list");
  if (!mobileList) return;

  if (!rows.length) {
    mobileList.innerHTML = `<div class="mobile-state-card">暂无匹配数据</div>`;
    return;
  }

  mobileList.innerHTML = rows
    .map((material) => {
      const modelSpec = getModelSpec(material) || "未填写";
      const inactiveTag = material.is_active
        ? ""
        : `<span class="mobile-status-pill is-muted">停用</span>`;
      const stockTag = isLowStock(material)
        ? `<span class="mobile-status-pill is-alert">低库存 ${escapeHtml(formatNumber(material.current_stock) || "0")}</span>`
        : `<span class="mobile-status-pill">库存 ${escapeHtml(formatNumber(material.current_stock) || "0")}</span>`;

      return `
        <article class="mobile-entity-card mobile-material-card">
          <div class="mobile-entity-head">
            <div class="mobile-entity-copy">
              <h3>${escapeHtml(material.name || "")}</h3>
            </div>
            <div class="mobile-entity-tags">
              ${inactiveTag}
              ${stockTag}
            </div>
          </div>
          <dl class="mobile-entity-meta mobile-material-meta">
            <div><dt>分类</dt><dd>${escapeHtml(material.category || "-")}</dd></div>
            <div><dt>库存</dt><dd>${escapeHtml(formatNumber(material.current_stock) || "0")}</dd></div>
            <div><dt>库位</dt><dd>${escapeHtml(material.storage_location || "-")}</dd></div>
            <div><dt>型号 / 规格</dt><dd>${escapeHtml(modelSpec)}</dd></div>
          </dl>
          <div class="mobile-entity-actions mobile-material-actions icon-actions">
            <button type="button" class="btn icon-btn" onclick="editMaterial(${material.id})" title="编辑" aria-label="编辑">
              <i data-lucide="square-pen"></i>
            </button>
            <button type="button" class="btn icon-btn" onclick="disableMaterial(${material.id})" title="停用" aria-label="停用">
              <i data-lucide="pause-circle"></i>
            </button>
            <a class="btn icon-btn" href="/ui/materials/${material.id}/revisions" title="版本" aria-label="版本">
              <i data-lucide="history"></i>
            </a>
            <button type="button" class="btn icon-btn danger" onclick="removeMaterial(${material.id})" title="删除" aria-label="删除">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderTable() {
  const filters = getFilters();
  const rows = filterMaterials();
  renderSummary(rows);
  renderViewBadge();
  renderFilterSummary(filters, rows);

  if (!rows.length) {
    setTableState("暂无匹配数据");
  } else {
    tbody.innerHTML = rows
      .map((material) => {
        const modelSpec = getModelSpec(material) || "未填写";
        return `<tr data-mid="${material.id}">
          <td>
            <div class="material-name-cell">${escapeHtml(material.name || "")}</div>
            ${renderMaterialMetaSummary(material)}
          </td>
          <td><div class="material-model-cell">${escapeHtml(modelSpec)}</div></td>
          <td><span class="meta-pill meta-pill-type">${escapeHtml(getMaterialType(material))}</span></td>
          <td><span class="category-chip">${escapeHtml(material.category || "未分类")}</span></td>
          <td>${renderStockCell(material)}</td>
          <td><span class="meta-pill">${escapeHtml(material.storage_location || "-")}</span></td>
          <td>${renderRemarkCell(material)}</td>
          <td>${renderActionButtons(material)}</td>
        </tr>`;
      })
      .join("");
  }

  renderMobileList(rows);
  const total = document.getElementById("materials-record-total");
  if (total) total.textContent = `共 ${rows.length} 条记录`;
  refreshIcons();
}

function resetMaterialForm() {
  document.getElementById("material-form").reset();
  document.getElementById("m_id").value = "";
  document.getElementById("m_brand_attr").value = "";
  document.querySelector(".material-form-advanced")?.removeAttribute("open");
  if (!document.getElementById("m_material_type").value) {
    document.getElementById("m_material_type").value = "电子元器件";
  }
  if (!document.getElementById("m_category").value && allCategories.length) {
    document.getElementById("m_category").value = allCategories[0].name;
  }
  refreshSupplierOptions();
}

function openMaterialModal() {
  document.getElementById("material-modal").classList.remove("hidden");
  document.getElementById("material-modal-title").textContent = "新增物料";
  resetMaterialForm();
}

function closeMaterialModal() {
  document.getElementById("material-modal").classList.add("hidden");
  resetMaterialForm();
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
    "name",
    "material_type",
    "storage_location",
    "unit",
    "category",
    "default_supplier",
    "unit_price",
    "safety_stock",
    "current_stock",
    "usage",
    "purchase_link",
    "current_revision",
    "remark",
  ].forEach((key) => {
    const element = document.getElementById(`m_${key}`);
    if (element) element.value = material[key] ?? "";
  });

  document.getElementById("m_model_spec").value = getModelSpec(material);
  document.getElementById("m_brand_attr").value = getBrandAttr(material);
  document.querySelector(".material-form-advanced")?.setAttribute("open", "open");

  if (!document.getElementById("m_material_type").value) {
    document.getElementById("m_material_type").value = getMaterialType(material);
  }
  refreshSupplierOptions(material.default_supplier || "");
}

function buildPayload() {
  const modelSpec = normStr(document.getElementById("m_model_spec").value) || null;
  const brandAttr = normStr(document.getElementById("m_brand_attr").value) || null;

  return {
    name: normStr(document.getElementById("m_name").value),
    model_spec: modelSpec,
    spec: modelSpec,
    drawing_no: null,
    package_name: null,
    material_type: normStr(document.getElementById("m_material_type").value) || null,
    storage_location: normStr(document.getElementById("m_storage_location").value) || null,
    unit: normStr(document.getElementById("m_unit").value) || null,
    category: normStr(document.getElementById("m_category").value) || null,
    default_supplier: normStr(document.getElementById("m_default_supplier").value) || null,
    unit_price: Number(document.getElementById("m_unit_price").value || 0),
    safety_stock: Number(document.getElementById("m_safety_stock").value || 0),
    current_stock: Number(document.getElementById("m_current_stock").value || 0),
    usage: normStr(document.getElementById("m_usage").value) || null,
    brand_attr: brandAttr,
    material_name_attr: brandAttr,
    grade_attr: null,
    purchase_link: normStr(document.getElementById("m_purchase_link").value) || null,
    current_revision: normStr(document.getElementById("m_current_revision").value) || null,
    remark: normStr(document.getElementById("m_remark").value) || null,
  };
}

async function refreshMaterials(force = true) {
  const basic = await appStore.initBasicData(["materials"], { force });
  allMaterials = basic.materials || [];
  renderDynamicFilterOptions();
  renderTable();
}

async function saveMaterial() {
  const id = document.getElementById("m_id").value;
  const payload = buildPayload();

  if (!payload.name) return showMsg("名称必填", true);
  if (!payload.material_type) return showMsg("物料类型必填", true);
  if (!payload.category) return showMsg("分类必填", true);

  try {
    await http.request(id ? `/materials/${id}` : "/materials", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    appStore.invalidate("materials");
    showMsg("保存成功");
    closeMaterialModal();
    await refreshMaterials(true);
  } catch (error) {
    showMsg(error.message || "保存失败", true);
  }
}

async function disableMaterial(id) {
  if (!window.confirm("确认停用该物料？")) return;
  try {
    await http.request(`/materials/${id}`, { method: "DELETE" });
    appStore.invalidate("materials");
    showMsg("已停用");
    await refreshMaterials(true);
  } catch (error) {
    showMsg(error.message || "停用失败", true);
  }
}

async function removeMaterial(id) {
  if (!window.confirm("确认彻底删除该物料？删除后不可恢复。")) return;
  try {
    await http.request(`/materials/${id}/hard-delete`, { method: "DELETE" });
    appStore.invalidate("materials");
    showMsg("已删除");
    await refreshMaterials(true);
  } catch (error) {
    showMsg(error.message || "删除失败", true);
  }
}

async function importMaterialsFromFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const data = await http.request("/import/materials", { method: "POST", body: formData });
    let message = `导入完成：成功 ${data.created ?? 0} 条，失败 ${data.failed ?? 0} 条`;
    if (data.errors?.length) {
      const example = data.errors[0];
      message += `。示例：第 ${example.row} 行 - ${example.message}`;
      if (data.errors.length > 1) message += `（另 ${data.errors.length - 1} 条错误已省略）`;
    }
    appStore.invalidate("materials");
    showMsg(message, (data.failed || 0) > 0 && (data.created || 0) === 0);
    closeImportModal();
    if (data.created > 0) {
      await refreshMaterials(true);
    }
  } catch (error) {
    showMsg(error.message || "导入失败", true);
  }
}

async function loadBasicData(force = false) {
  const basic = await appStore.initBasicData(["suppliers", "materialCategories", "systemOptions"], { force });

  allSuppliers = basic.suppliers || [];
  allCategories = (basic.materialCategories || []).filter((item) => item.is_active);
  const activeOptions = (basic.systemOptions || []).filter((item) => item.is_active);

  optionMap = {
    unit: activeOptions.filter((item) => item.option_type === "unit"),
    material_attr: activeOptions.filter((item) => item.option_type === "material_attr"),
    grade: activeOptions.filter((item) => item.option_type === "grade"),
  };

  renderCategoryOptions();
  renderSelectOptions("m_unit", optionMap.unit, "请选择单位");
  renderBrandAttrSuggestions();
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

document.getElementById("material-clear-filters")?.addEventListener("click", () => {
  document.getElementById("f_keyword").value = "";
  document.getElementById("f_material_type").value = "";
  document.getElementById("f_category").value = "";
  document.getElementById("f_location").value = "";
  renderTable();
});

[
  ["f_keyword", "input"],
  ["f_material_type", "change"],
  ["f_category", "change"],
  ["f_location", "change"],
].forEach(([id, eventName]) => {
  const element = document.getElementById(id);
  if (element) element.addEventListener(eventName, renderTable);
});

window.openMaterialModal = openMaterialModal;
window.closeMaterialModal = closeMaterialModal;
window.refreshSupplierOptions = refreshSupplierOptions;
window.editMaterial = editMaterial;
window.saveMaterial = saveMaterial;
window.disableMaterial = disableMaterial;
window.removeMaterial = removeMaterial;

renderMaterialTypeOptions();
setTableState("加载中...");

(async function initMaterialsPage() {
  try {
    await loadBasicData();
    await refreshMaterials(false);
  } catch (error) {
    setTableState("加载失败，请刷新重试");
    showMsg(error.message || "加载失败", true);
  }
})();
