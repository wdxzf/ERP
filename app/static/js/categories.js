const PAGE_SIZE = 10;

let allCategories = [];
let currentPage = 1;

const typeSelect = () => document.getElementById("c_type");
const isCategoryType = () => typeSelect().value === "category";

const typeMetaMap = {
  category: { label: "元件分类", title: "元件分类列表" },
  unit: { label: "单位", title: "单位列表" },
  tax_rate: { label: "税率", title: "税率列表" },
  material_attr: { label: "品牌 / 系列", title: "品牌 / 系列列表" },
  grade: { label: "等级 / 属性", title: "等级 / 属性列表" },
  product_category: { label: "产品分类", title: "产品分类列表" },
};

function catMsg(message, err = false) {
  const el = document.getElementById("msg");
  if (!message) {
    el.textContent = "";
    el.className = "msg";
    return;
  }
  el.textContent = message;
  el.className = `msg ${err ? "err" : "ok"}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function refreshIcons() {
  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

function getTypeMeta() {
  return typeMetaMap[typeSelect().value] || { label: "名称", title: "分类列表" };
}

function isSystemRemark(remark) {
  return String(remark || "").trim().startsWith("默认");
}

function renderRemarkCell(remark) {
  const text = String(remark || "").trim();
  if (!text) return '<span class="muted-note">-</span>';
  if (isSystemRemark(text)) {
    return `<span class="auto-remark">${escapeHtml(text)}</span>`;
  }
  return escapeHtml(text);
}

function setTableState(message) {
  const showPrefix = isCategoryType();
  document.getElementById("cat-tbody").innerHTML = `<tr><td colspan="${showPrefix ? 6 : 5}" class="table-state-cell">${escapeHtml(message)}</td></tr>`;
  const mobileList = document.getElementById("categories-mobile-list");
  if (mobileList) {
    mobileList.innerHTML = `<div class="mobile-state-card">${escapeHtml(message)}</div>`;
  }
}

function setPage(page, totalPages) {
  currentPage = Math.min(Math.max(page, 1), Math.max(totalPages, 1));
}

function renderPagination(totalRows) {
  const totalPages = Math.max(Math.ceil(totalRows / PAGE_SIZE), 1);
  setPage(currentPage, totalPages);
  const start = totalRows ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const end = totalRows ? Math.min(currentPage * PAGE_SIZE, totalRows) : 0;

  const pageSummary = document.getElementById("cat-page-summary");
  if (pageSummary) {
    pageSummary.textContent = totalRows ? `显示 ${start}-${end} / ${totalRows}` : "暂无数据";
  }

  const text = document.getElementById("cat-pagination-text");
  if (text) text.textContent = `第 ${currentPage} / ${totalPages} 页`;

  const prevBtn = document.getElementById("cat-prev-page");
  const nextBtn = document.getElementById("cat-next-page");
  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages;

  const wrapper = document.getElementById("cat-pagination");
  if (wrapper) wrapper.classList.toggle("hidden", totalRows <= PAGE_SIZE);

  return { startIndex: (currentPage - 1) * PAGE_SIZE, endIndex: currentPage * PAGE_SIZE };
}

function renderStatusTagCell(category) {
  return `<button type="button" class="status-toggle ${category.is_active ? "is-active" : "is-inactive"}" onclick="toggleCategoryActive(${category.id}, ${category.is_active ? "false" : "true"})">
    ${category.is_active ? "启用" : "停用"}
  </button>`;
}

function renderActionCell(category) {
  return `<div class="table-actions icon-actions">
    <button class="btn icon-btn" onclick="editCategoryById(${category.id})" aria-label="编辑 ${escapeHtml(category.name)}" title="编辑">
      <i data-lucide="square-pen"></i>
    </button>
    <button class="btn icon-btn danger" onclick="deleteCategory(${category.id})" aria-label="删除 ${escapeHtml(category.name)}" title="删除">
      <i data-lucide="trash-2"></i>
    </button>
  </div>`;
}

function renderTypeSummary(rows) {
  const typeMeta = getTypeMeta();
  const activeCount = rows.filter((item) => item.is_active).length;
  const inactiveCount = rows.length - activeCount;

  const badge = document.getElementById("cat-type-badge");
  if (badge) badge.textContent = typeMeta.label;

  const totalEl = document.getElementById("cat-total-stat");
  const activeEl = document.getElementById("cat-active-stat");
  const inactiveEl = document.getElementById("cat-inactive-stat");
  if (totalEl) totalEl.textContent = String(rows.length);
  if (activeEl) activeEl.textContent = String(activeCount);
  if (inactiveEl) inactiveEl.textContent = String(inactiveCount);
}

function renderMobileCards(rows, visibleRows) {
  const mobileList = document.getElementById("categories-mobile-list");
  if (!mobileList) return;

  if (!visibleRows.length) {
    mobileList.innerHTML = `<div class="mobile-state-card">暂无匹配数据</div>`;
    return;
  }

  mobileList.innerHTML = visibleRows
    .map((item) => `
      <article class="mobile-entity-card">
        <div class="mobile-entity-head">
          <div>
            <h3>${escapeHtml(item.name)}</h3>
            <p>${escapeHtml(getTypeMeta().label)}</p>
          </div>
          <div class="mobile-entity-tags">
            <span class="mobile-status-pill ${item.is_active ? "" : "is-muted"}">${item.is_active ? "启用" : "停用"}</span>
          </div>
        </div>
        <dl class="mobile-entity-meta">
          ${isCategoryType() ? `<div><dt>编码前缀</dt><dd>${escapeHtml(item.code_prefix || "-")}</dd></div>` : ""}
          <div><dt>排序</dt><dd>${escapeHtml(item.sort_order)}</dd></div>
          <div><dt>备注</dt><dd>${renderRemarkCell(item.remark)}</dd></div>
        </dl>
        <div class="mobile-entity-actions">
          <button type="button" class="btn" onclick="editCategoryById(${item.id})">编辑</button>
          <button type="button" class="btn" onclick="toggleCategoryActive(${item.id}, ${item.is_active ? "false" : "true"})">${item.is_active ? "停用" : "启用"}</button>
          <button type="button" class="btn danger" onclick="deleteCategory(${item.id})">删除</button>
        </div>
      </article>
    `)
    .join("");
}

function renderCategories() {
  const keyword = (document.getElementById("c_name").value || "").toLowerCase();
  const rows = allCategories.filter((item) => !keyword || (item.name || "").toLowerCase().includes(keyword));
  const showPrefix = isCategoryType();
  const page = renderPagination(rows.length);
  const visibleRows = rows.slice(page.startIndex, page.endIndex);
  renderTypeSummary(rows);

  if (!visibleRows.length) {
    setTableState("暂无匹配数据");
  } else {
    document.getElementById("cat-tbody").innerHTML = visibleRows
      .map((item) => `<tr>
        <td>${escapeHtml(item.name)}</td>
        ${showPrefix ? `<td>${escapeHtml(item.code_prefix || "")}</td>` : ""}
        <td>${escapeHtml(item.sort_order)}</td>
        <td>${renderStatusTagCell(item)}</td>
        <td>${renderRemarkCell(item.remark)}</td>
        <td>${renderActionCell(item)}</td>
      </tr>`)
      .join("");
  }

  renderMobileCards(rows, visibleRows);
  const total = document.getElementById("cat-record-total");
  if (total) total.textContent = `共 ${rows.length} 条`;
  refreshIcons();
}

async function loadCategories(force = false) {
  setTableState("加载中...");
  const type = typeSelect().value;

  if (type === "category") {
    const basic = await appStore.initBasicData(["materialCategories"], { force });
    allCategories = basic.materialCategories || [];
  } else {
    const basic = await appStore.initBasicData(["systemOptions"], { force });
    allCategories = (basic.systemOptions || []).filter((item) => item.option_type === type);
  }

  renderCategories();
}

function openCategoryModal() {
  document.getElementById("cat-modal").classList.remove("hidden");
  document.getElementById("cat-title").textContent = "新增类别";
}

function closeCategoryModal() {
  document.getElementById("cat-modal").classList.add("hidden");
  document.getElementById("cat-form").reset();
  document.getElementById("ct_id").value = "";
}

function editCategory(category) {
  openCategoryModal();
  document.getElementById("cat-title").textContent = "编辑类别";
  ["id", "name", "code_prefix", "sort_order", "remark"].forEach((key) => {
    const el = document.getElementById(`ct_${key}`);
    if (el) el.value = category[key] ?? "";
  });
  document.getElementById("ct_is_active").value = category.is_active ? "true" : "false";
}

function editCategoryById(id) {
  const category = allCategories.find((item) => item.id === id);
  if (!category) return;
  editCategory(category);
}

function invalidateCurrentTypeCache() {
  appStore.invalidate(isCategoryType() ? "materialCategories" : "systemOptions");
}

async function saveCategory() {
  const id = document.getElementById("ct_id").value;
  const base = {
    name: ct_name.value,
    sort_order: Number(ct_sort_order.value || 0),
    is_active: ct_is_active.value === "true",
    remark: ct_remark.value || null,
  };

  let payload = base;
  let url = "";
  if (isCategoryType()) {
    payload = { ...base, code_prefix: ct_code_prefix.value };
    if (!payload.code_prefix) return catMsg("分类必须填写编码前缀", true);
    url = id ? `/material-categories/${id}` : "/material-categories";
  } else {
    payload = { ...base, option_type: typeSelect().value };
    url = id ? `/system-options/${id}` : "/system-options";
  }

  try {
    await http.request(url, {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    invalidateCurrentTypeCache();
    catMsg("保存成功");
    closeCategoryModal();
    await loadCategories(true);
  } catch (error) {
    catMsg(error.message || "保存失败", true);
  }
}

async function deleteCategory(id) {
  if (!confirm("确认删除该项？")) return;
  const url = isCategoryType() ? `/material-categories/${id}/hard-delete` : `/system-options/${id}/hard-delete`;
  try {
    await http.request(url, { method: "DELETE" });
    invalidateCurrentTypeCache();
    catMsg("删除成功");
    await loadCategories(true);
  } catch (error) {
    catMsg(error.message || "删除失败", true);
  }
}

async function toggleCategoryActive(id, nextState) {
  const url = isCategoryType() ? `/material-categories/${id}` : `/system-options/${id}`;
  const isNextActive = nextState === true || nextState === "true";
  try {
    await http.request(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: isNextActive }),
    });
    invalidateCurrentTypeCache();
    catMsg(isNextActive ? "已启用" : "已停用");
    await loadCategories(true);
  } catch (error) {
    catMsg(error.message || "状态更新失败", true);
  }
}

function onTypeChanged() {
  const showPrefix = isCategoryType();
  document.getElementById("label-prefix").style.display = showPrefix ? "" : "none";
  document.getElementById("th-prefix").style.display = showPrefix ? "" : "none";

  const typeMeta = getTypeMeta();
  const keyword = document.getElementById("c_name");
  if (keyword) keyword.placeholder = `按${typeMeta.label}搜索`;
  const title = document.getElementById("cat-table-title");
  if (title) title.textContent = typeMeta.title;

  currentPage = 1;
  loadCategories();
}

document.getElementById("c_type").addEventListener("change", onTypeChanged);
document.getElementById("c_name").addEventListener("input", () => {
  currentPage = 1;
  renderCategories();
});
document.getElementById("cat-prev-page").addEventListener("click", () => {
  currentPage -= 1;
  renderCategories();
});
document.getElementById("cat-next-page").addEventListener("click", () => {
  currentPage += 1;
  renderCategories();
});

window.onTypeChanged = onTypeChanged;
window.openCategoryModal = openCategoryModal;
window.closeCategoryModal = closeCategoryModal;
window.saveCategory = saveCategory;
window.editCategory = editCategory;
window.editCategoryById = editCategoryById;
window.deleteCategory = deleteCategory;
window.toggleCategoryActive = toggleCategoryActive;

setTableState("加载中...");
onTypeChanged();
