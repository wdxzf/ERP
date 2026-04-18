const msgEl = document.getElementById("msg");

function showMsg(message, err = false) {
  msgEl.textContent = message || "";
  msgEl.className = `msg ${err ? "err" : "ok"}`;
}

async function loadProfile(force = false) {
  try {
    const basic = await appStore.initBasicData(["companyProfile"], { force });
    const profile = basic.companyProfile || {};
    document.getElementById("cp_company_name").value = profile.company_name || "";
    document.getElementById("cp_tax_no").value = profile.tax_no || "";
    document.getElementById("cp_bank_name").value = profile.bank_name || "";
    document.getElementById("cp_bank_account").value = profile.bank_account || "";
    document.getElementById("cp_address").value = profile.address || "";
    document.getElementById("cp_contact_person").value = profile.contact_person || "";
    document.getElementById("cp_phone").value = profile.phone || "";
  } catch (error) {
    showMsg(error.message || "公司信息加载失败", true);
  }
}

document.getElementById("cp_save").addEventListener("click", async () => {
  const payload = {
    company_name: document.getElementById("cp_company_name").value.trim(),
    tax_no: document.getElementById("cp_tax_no").value.trim() || null,
    bank_name: document.getElementById("cp_bank_name").value.trim() || null,
    bank_account: document.getElementById("cp_bank_account").value.trim() || null,
    address: document.getElementById("cp_address").value.trim() || null,
    contact_person: document.getElementById("cp_contact_person").value.trim() || null,
    phone: document.getElementById("cp_phone").value.trim() || null,
  };

  if (!payload.company_name) return showMsg("公司名称必填", true);

  try {
    await http.request("/company-profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    appStore.invalidate("companyProfile");
    showMsg("已保存");
    await loadProfile(true);
  } catch (error) {
    showMsg(error.message || "保存失败", true);
  }
});

loadProfile();
