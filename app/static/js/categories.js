const catMsg = (m, err = false) => {
  const el = document.getElementById("msg");
  if (!m) {
    el.textContent = "";
    el.className = "msg hidden";
    return;
  }
  el.textContent = m;
  el.className = err ? "msg err" : "msg ok";
};
let allCategories = [];
let currentPage = 1;
const PAGE_SIZE = 10;
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

function getTypeMeta() {
  return typeMetaMap[typeSelect().value] || { label: "名称", title: "分类列表" };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isSystemRemark(remark) {
  const text = String(remark || "").trim();
  return text.startsWith("默认");
}

function renderRemarkCell(remark) {
  const text = String(remark || "").trim();
  if (!text) return '<span class="muted-note">-</span>';
  if (isSystemRemark(text)) {
    return `<span class="auto-remark">${escapeHtml(text)}</span>`;
  }
  return escapeHtml(text);
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

function renderCategories() {
  const keyword = (document.getElementById("c_name").value || "").toLowerCase();
  const rows = allCategories.filter(c => !keyword || (c.name || "").toLowerCase().includes(keyword));
  const showPrefix = isCategoryType();
  const page = renderPagination(rows.length);
  const visibleRows = rows.slice(page.startIndex, page.endIndex);
  const emptyMarkup = `<tr><td colspan="${showPrefix ? 6 : 5}" class="muted-note">暂无匹配数据</td></tr>`;
  document.getElementById("cat-tbody").innerHTML = visibleRows.length ? visibleRows.map(c => `<tr>
    <td>${escapeHtml(c.name)}</td>${showPrefix ? `<td>${escapeHtml(c.code_prefix || "")}</td>` : ""}<td>${escapeHtml(c.sort_order)}</td>
    <td>${renderStatusTagCell(c)}</td>
    <td>${renderRemarkCell(c.remark)}</td>
    <td>
      <div class="table-actions">
        <button class="btn sm" onclick="editCategoryById(${c.id})" aria-label="编辑 ${escapeHtml(c.name)}">✏ 编辑</button>
        <button class="btn sm danger" onclick='deleteCategory(${c.id})' aria-label="删除 ${escapeHtml(c.name)}">🗑 删除</button>
      </div>
    </td>
  </tr>`).join("") : emptyMarkup;
  const tot = document.getElementById("cat-record-total");
  if (tot) tot.textContent = `共 ${rows.length} 条`;
}

async function loadCategories() {
  const t = typeSelect().value;
  const url = t === "category" ? "/material-categories" : `/system-options?option_type=${encodeURIComponent(t)}`;
  const res = await fetch(url);
  allCategories = await res.json();
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
function editCategory(c) {
  openCategoryModal();
  document.getElementById("cat-title").textContent = "编辑类别";
  ["id", "name", "code_prefix", "sort_order", "remark"].forEach(k => {
    const el = document.getElementById("ct_" + k);
    if (el) el.value = c[k] ?? "";
  });
  document.getElementById("ct_is_active").value = c.is_active ? "true" : "false";
}

function editCategoryById(id) {
  const category = allCategories.find(item => item.id === id);
  if (!category) return;
  editCategory(category);
}

function renderStatusTagCell(category) {
  return `<button type="button" class="status-toggle ${category.is_active ? "is-active" : "is-inactive"}" onclick="toggleCategoryActive(${category.id}, ${category.is_active ? "false" : "true"})">
    ${category.is_active ? "启用" : "停用"}
  </button>`;
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
    payload = {...base, code_prefix: ct_code_prefix.value};
    if (!payload.code_prefix) return catMsg("分类必须填写编码前缀", true);
    url = id ? `/material-categories/${id}` : "/material-categories";
  } else {
    payload = {...base, option_type: typeSelect().value};
    url = id ? `/system-options/${id}` : "/system-options";
  }
  const method = id ? "PUT" : "POST";
  const res = await fetch(url, { method, headers: {"Content-Type":"application/json"}, body: JSON.stringify(payload) });
  if (!res.ok) {
    const e = await res.json();
    return catMsg(e.detail || "保存失败", true);
  }
  catMsg("保存成功");
  closeCategoryModal();
  loadCategories();
}

async function deleteCategory(id) {
  if (!confirm("确认删除该项？")) return;
  let url = "";
  if (isCategoryType()) {
    url = `/material-categories/${id}/hard-delete`;
  } else {
    url = `/system-options/${id}/hard-delete`;
  }
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    return catMsg(e.detail || "删除失败", true);
  }
  catMsg("删除成功");
  loadCategories();
}

async function toggleCategoryActive(id, nextState) {
  const matched = allCategories.find(item => item.id === id);
  if (!matched) return;
  const payload = { is_active: nextState };
  const url = isCategoryType() ? `/material-categories/${id}` : `/system-options/${id}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    return catMsg(e.detail || "状态更新失败", true);
  }
  catMsg(nextState ? "已启用" : "已停用");
  loadCategories();
}

function onTypeChanged() {
  const showPrefix = isCategoryType();
  document.getElementById("label-prefix").style.display = showPrefix ? "" : "none";
  document.getElementById("th-prefix").style.display = showPrefix ? "" : "none";
  const typeMeta = getTypeMeta();
  const nm = document.getElementById("c_name");
  if (nm) nm.placeholder = `按${typeMeta.label}搜索`;
  const title = document.getElementById("cat-table-title");
  if (title) title.textContent = typeMeta.title;
  currentPage = 1;
  loadCategories();
}

// Explicit binding avoids relying on inline handlers only.
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

// Expose handlers for inline onclick/onchange attributes in template.
window.onTypeChanged = onTypeChanged;
window.openCategoryModal = openCategoryModal;
window.closeCategoryModal = closeCategoryModal;
window.saveCategory = saveCategory;
window.editCategory = editCategory;
window.editCategoryById = editCategoryById;
window.deleteCategory = deleteCategory;
window.toggleCategoryActive = toggleCategoryActive;

onTypeChanged();
