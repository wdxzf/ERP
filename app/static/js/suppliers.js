const msgEl = document.getElementById("msg");
const tbody = document.getElementById("supplier-tbody");

let allSuppliers = [];
let allCategories = [];
let allMaterials = [];

function showMsg(message, err = false) {
  msgEl.textContent = message || "";
  msgEl.className = `msg ${err ? "err" : "ok"}`;
}

function getCategoryValues() {
  return Array.from(document.querySelectorAll("#sp_supplier_categories input[type='checkbox']:checked")).map((item) => item.value);
}

function renderCategoryCheckboxes() {
  const container = document.getElementById("sp_supplier_categories");
  container.innerHTML = allCategories
    .map((item) => `<label><input type="checkbox" value="${item.name}">${item.name}</label>`)
    .join("");
}

function setCategoryValues(values = []) {
  const selected = new Set(values || []);
  document.querySelectorAll("#sp_supplier_categories input[type='checkbox']").forEach((item) => {
    item.checked = selected.has(item.value);
  });
}

function getManagedMaterialIds() {
  return Array.from(document.querySelectorAll("#sp_managed_materials input[type='checkbox']:checked"))
    .map((item) => Number(item.value))
    .filter((item) => Number.isFinite(item));
}

function renderMaterialCheckboxes() {
  const keyword = (document.getElementById("sp_material_kw")?.value || "").trim().toLowerCase();
  const container = document.getElementById("sp_managed_materials");
  const rows = allMaterials.filter((item) =>
    !keyword || (item.code || "").toLowerCase().includes(keyword) || (item.name || "").toLowerCase().includes(keyword)
  );
  container.innerHTML = rows
    .map((item) => `<label><input type="checkbox" value="${item.id}"><span>${item.code} | ${item.name}</span></label>`)
    .join("");
}

function setManagedMaterialIds(values = []) {
  const selected = new Set((values || []).map(Number));
  document.querySelectorAll("#sp_managed_materials input[type='checkbox']").forEach((item) => {
    item.checked = selected.has(Number(item.value));
  });
}

function getFilters() {
  return {
    code: document.getElementById("s_code").value.trim().toLowerCase(),
    name: document.getElementById("s_name").value.trim().toLowerCase(),
    creditCode: document.getElementById("s_credit_code").value.trim().toLowerCase(),
  };
}

function renderTable() {
  const filters = getFilters();
  const rows = allSuppliers.filter((item) =>
    (!filters.code || (item.supplier_code || "").toLowerCase().includes(filters.code)) &&
    (!filters.name || (item.company_name || "").toLowerCase().includes(filters.name)) &&
    (!filters.creditCode || (item.credit_code || "").toLowerCase().includes(filters.creditCode))
  );

  tbody.innerHTML = rows
    .map((item) => `<tr>
      <td>${item.supplier_code || ""}</td>
      <td>${item.company_name || ""}</td>
      <td>${(item.supplier_categories || []).join("、")}</td>
      <td>${item.payment_term_days != null && item.payment_term_days !== "" ? item.payment_term_days : "-"}</td>
      <td>${item.credit_code || ""}</td>
      <td>${item.bank_name || ""}</td>
      <td>${item.bank_account || ""}</td>
      <td>${item.bank_no || ""}</td>
      <td>${item.contact_person || ""}</td>
      <td>${item.phone || ""}</td>
      <td>${item.address || ""}</td>
      <td>${item.is_active ? '<span class="tag released">启用</span>' : '<span class="tag obsolete">停用</span>'}</td>
      <td>
        <button class="btn sm" onclick="editSupplier(${item.id})">编辑</button>
        <button class="btn sm" onclick="disableSupplier(${item.id})">停用</button>
      </td>
    </tr>`)
    .join("");

  const total = document.getElementById("supplier-record-total");
  if (total) total.textContent = `共 ${rows.length} 条记录`;
}

async function loadSuppliers() {
  allSuppliers = await http.get("/suppliers");
  renderTable();
}

async function loadCategories() {
  const basic = await appStore.initBasicData(["materialCategories"]);
  allCategories = (basic.materialCategories || []).filter((item) => item.is_active);
  renderCategoryCheckboxes();
}

async function loadMaterials() {
  const basic = await appStore.initBasicData(["materials"]);
  allMaterials = (basic.materials || []).filter((item) => item.is_active);
  renderMaterialCheckboxes();
}

function openSupplierModal() {
  document.getElementById("supplier-modal").classList.remove("hidden");
  document.getElementById("supplier-modal-title").textContent = "新增供应商";
  document.getElementById("sp_supplier_code").value = "";
}

function closeSupplierModal() {
  document.getElementById("supplier-modal").classList.add("hidden");
  document.getElementById("supplier-form").reset();
  document.getElementById("sp_id").value = "";
  setCategoryValues([]);
  document.getElementById("sp_material_kw").value = "";
  renderMaterialCheckboxes();
  setManagedMaterialIds([]);
}

function editSupplier(id) {
  const supplier = allSuppliers.find((item) => item.id === id);
  if (!supplier) return;

  openSupplierModal();
  document.getElementById("supplier-modal-title").textContent = "编辑供应商";
  [
    "id",
    "supplier_code",
    "company_name",
    "payment_term_days",
    "credit_code",
    "bank_name",
    "bank_account",
    "bank_no",
    "contact_person",
    "phone",
    "address",
  ].forEach((key) => {
    const element = document.getElementById(`sp_${key}`);
    if (element) element.value = supplier[key] ?? "";
  });
  setCategoryValues(supplier.supplier_categories || []);
  const paymentDays = document.getElementById("sp_payment_term_days");
  if (paymentDays) {
    paymentDays.value =
      supplier.payment_term_days != null && supplier.payment_term_days !== "" ? String(supplier.payment_term_days) : "";
  }
  document.getElementById("sp_material_kw").value = "";
  renderMaterialCheckboxes();
  setManagedMaterialIds(supplier.managed_material_ids || []);
}

async function saveSupplier() {
  const id = document.getElementById("sp_id").value;
  const paymentTermRaw = (document.getElementById("sp_payment_term_days")?.value || "").trim();
  let payment_term_days = null;

  if (paymentTermRaw !== "") {
    const num = parseInt(paymentTermRaw, 10);
    if (!Number.isFinite(num) || num < 0) return showMsg("账期需为非负整数或留空", true);
    payment_term_days = num;
  }

  const payload = {
    company_name: sp_company_name.value,
    supplier_categories: getCategoryValues(),
    managed_material_ids: getManagedMaterialIds(),
    payment_term_days,
    credit_code: sp_credit_code.value || null,
    bank_name: sp_bank_name.value || null,
    bank_account: sp_bank_account.value || null,
    bank_no: sp_bank_no.value || null,
    contact_person: sp_contact_person.value || null,
    phone: sp_phone.value || null,
    address: sp_address.value || null,
    is_active: true,
  };

  if (!payload.company_name) return showMsg("公司名称必填", true);

  try {
    await http.request(id ? `/suppliers/${id}` : "/suppliers", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    appStore.invalidate("suppliers");
    showMsg("保存成功");
    closeSupplierModal();
    await loadSuppliers();
  } catch (error) {
    showMsg(error.message || "保存失败", true);
  }
}

async function disableSupplier(id) {
  if (!confirm("确认停用该供应商？")) return;
  try {
    await http.request(`/suppliers/${id}`, { method: "DELETE" });
    appStore.invalidate("suppliers");
    showMsg("已停用");
    await loadSuppliers();
  } catch (error) {
    showMsg(error.message || "停用失败", true);
  }
}

["s_code", "s_name", "s_credit_code"].forEach((id) => {
  document.getElementById(id).addEventListener("input", renderTable);
});

document.getElementById("sp_material_kw").addEventListener("input", () => {
  const selected = getManagedMaterialIds();
  renderMaterialCheckboxes();
  setManagedMaterialIds(selected);
});

window.openSupplierModal = openSupplierModal;
window.closeSupplierModal = closeSupplierModal;
window.editSupplier = editSupplier;
window.saveSupplier = saveSupplier;
window.disableSupplier = disableSupplier;

Promise.all([loadCategories(), loadMaterials()]).then(loadSuppliers);
