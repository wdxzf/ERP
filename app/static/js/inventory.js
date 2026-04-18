const typeMap = { in: "入库", out: "出库", adjust: "调整" };

let materialMap = new Map();

function invMsg(message, err = false) {
  const el = document.getElementById("msg");
  el.textContent = message || "";
  el.className = `msg ${err ? "err" : "ok"}`;
}

function fmt3(value) {
  return value === null || value === undefined || value === ""
    ? ""
    : Number.isFinite(Number(value))
      ? Number(value).toFixed(3)
      : String(value);
}

async function loadMaterialsOptions(force = false) {
  const basic = await appStore.initBasicData(["materials"], { force });
  const materials = basic.materials || [];
  materialMap = new Map(materials.map((item) => [item.id, item]));
  const select = document.getElementById("t_material_id");
  select.innerHTML = materials
    .map((item) => `<option value="${item.id}">${item.code} | ${item.name} | 库存:${fmt3(item.current_stock)}</option>`)
    .join("");
}

async function loadTransactions() {
  const materialId = document.getElementById("i_material_id").value.trim();
  const type = document.getElementById("i_type").value;
  const url = materialId ? `/inventory/materials/${materialId}/transactions` : "/inventory/transactions";

  try {
    let rows = await http.get(url);
    if (type) rows = rows.filter((item) => item.transaction_type === type);

    const tbody = document.getElementById("tx-tbody");
    tbody.innerHTML = rows
      .map((item) => {
        const material = materialMap.get(item.material_id);
        return `<tr>
          <td>${item.id}</td>
          <td>${item.material_id} ${material ? `(${material.code} ${material.name})` : ""}</td>
          <td>${typeMap[item.transaction_type] || item.transaction_type}</td>
          <td>${fmt3(item.qty)}</td>
          <td>${fmt3(item.unit_price)}</td>
          <td>${item.reference_type || ""}</td>
          <td>${item.reference_no || ""}</td>
          <td>${item.remark || ""}</td>
          <td>${(item.created_at || "").replace("T", " ").slice(0, 19)}</td>
        </tr>`;
      })
      .join("");

    const total = document.getElementById("tx-record-total");
    if (total) total.textContent = `共 ${rows.length} 条记录`;
  } catch (error) {
    const total = document.getElementById("tx-record-total");
    if (total) total.textContent = "共 0 条记录";
    invMsg(error.message || "加载流水失败", true);
  }
}

function openTxModal() {
  document.getElementById("tx-modal").classList.remove("hidden");
}

function closeTxModal() {
  document.getElementById("tx-modal").classList.add("hidden");
}

async function saveTx() {
  const payload = {
    material_id: Number(t_material_id.value),
    transaction_type: t_transaction_type.value,
    qty: Number(t_qty.value),
    unit_price: Number(t_unit_price.value || 0),
    reference_type: t_reference_type.value || null,
    reference_no: t_reference_no.value || null,
    remark: t_remark.value || null,
  };

  try {
    await http.request("/inventory/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    appStore.invalidate("materials");
    invMsg("库存流水新增成功");
    closeTxModal();
    await loadMaterialsOptions(true);
    await loadTransactions();
  } catch (error) {
    invMsg(error.message || "保存失败", true);
  }
}

window.loadTransactions = loadTransactions;
window.openTxModal = openTxModal;
window.closeTxModal = closeTxModal;
window.saveTx = saveTx;

loadMaterialsOptions().then(loadTransactions);
