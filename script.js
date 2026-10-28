/* ===== Shop details: change these ===== */
const SHOP = {
  name: "YOUR TAILORING SHOP",
  address: "Shop address, City",
  phone: "Ph: 00000 00000",
  thanks: "Thank you! Visit again."
};

let dresses = loadDresses();

const $ = id => document.getElementById(id);
let items = [];

/* ---------- helpers ---------- */
const money = n => (Math.round(n * 100) / 100).toFixed(2);
const esc = s => String(s).replace(/[&<>"']/g, c => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const today = () => {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
};
const fmtDate = iso => iso ? iso.split("-").reverse().join("/") : "";

/* ---------- bill number (kept in browser storage) ---------- */
function getCounter() {
  try { return parseInt(localStorage.getItem("billCounter"), 10) || 1; }
  catch (e) { return 1; }
}
function setCounter(n) {
  try { localStorage.setItem("billCounter", String(n)); } catch (e) {}
}
function nextBillNo() { return "TB-" + String(getCounter()).padStart(4, "0"); }

/* ---------- setup ---------- */
function init() {
  dresses.forEach(d => {
    const o = document.createElement("option");
    o.value = d.id;
    o.textContent = d.name;
    $("dressType").appendChild(o);
  });
  $("billDate").value = today();
  $("billNo").value = nextBillNo();
  onDressChange();
  loadOptions();
  setPaper();
  refresh();

  $("dressType").addEventListener("change", onDressChange);
  $("addMeasureBtn").addEventListener("click", addExtraRow);
  $("addBtn").addEventListener("click", addItem);
  $("clearBtn").addEventListener("click", clearForm);
  $("printBtn").addEventListener("click", printBill);
  $("paperWidth").addEventListener("change", () => { setPaper(); saveOptions(); refresh(); });
  ["printMeasure", "printCloth"].forEach(id =>
    $(id).addEventListener("change", () => { saveOptions(); refresh(); }));
  ["custName", "custMobile", "billNo", "billDate", "paid"].forEach(id =>
    $(id).addEventListener("input", refresh));
  ["qty", "rate", "itemNote"].forEach(id =>
    $(id).addEventListener("keydown", e => { if (e.key === "Enter") addItem(); }));

  window.addEventListener("afterprint", () => {
    if (window.__printed) {
      window.__printed = false;
      setCounter(getCounter() + 1);
      clearForm(true);
    }
  });
}

const currentDress = () => dresses.find(d => d.id === $("dressType").value);

function onDressChange() {
  buildMeasureFields();
  const d = currentDress();
  $("rate").value = d && d.rate != null ? d.rate : "";
}

function buildMeasureFields() {
  const d = currentDress();
  const fields = d ? d.measures : [];
  const box = $("measureFields");
  box.innerHTML = "";
  box.hidden = fields.length === 0;
  fields.forEach(f => {
    const l = document.createElement("label");
    l.textContent = f;
    const i = document.createElement("input");
    i.type = "text";
    i.dataset.name = f;
    i.inputMode = "decimal";
    l.appendChild(i);
    box.appendChild(l);
  });
  $("extraFields").innerHTML = "";
}

/* extra measurement for this bill only (does not change the dress list) */
function addExtraRow() {
  const row = document.createElement("div");
  row.className = "extra-row";
  row.innerHTML = '<input type="text" class="x-name" placeholder="Measurement name" maxlength="30">' +
    '<input type="text" class="x-val" placeholder="Value" inputmode="decimal" maxlength="20">' +
    '<button type="button" class="link" aria-label="Remove measurement">&times;</button>';
  row.querySelector("button").addEventListener("click", () => row.remove());
  $("extraFields").appendChild(row);
  row.querySelector(".x-name").focus();
}

/* remember paper size and bill toggles on this device */
function loadOptions() {
  try {
    const o = JSON.parse(localStorage.getItem("billOptions") || "{}");
    if (o.paper) $("paperWidth").value = o.paper;
    if (typeof o.cloth === "boolean") $("printCloth").checked = o.cloth;
    if (typeof o.measure === "boolean") $("printMeasure").checked = o.measure;
  } catch (e) {}
}
function saveOptions() {
  try {
    localStorage.setItem("billOptions", JSON.stringify({
      paper: $("paperWidth").value,
      cloth: $("printCloth").checked,
      measure: $("printMeasure").checked
    }));
  } catch (e) {}
}

function setPaper() {
  const w = $("paperWidth").value;
  $("receipt").classList.toggle("w58", w === "58");
  $("pageStyle").textContent = "@page{size:" + w + "mm auto;margin:0}";
}

/* ---------- items ---------- */
function addItem() {
  const qty = parseFloat($("qty").value);
  const rate = parseFloat($("rate").value);
  const err = $("itemError");
  err.textContent = "";

  const dress = currentDress();
  if (!dress) { err.textContent = "No dress selected. Add one in Manage Dresses."; return; }
  if (!(qty > 0) || !Number.isInteger(qty)) { err.textContent = "Enter a quantity of 1 or more."; return; }
  if (isNaN(rate) || rate < 0) { err.textContent = "Enter a valid rate."; return; }

  const measures = [];
  $("measureFields").querySelectorAll("input").forEach(i => {
    if (i.value.trim()) measures.push(i.dataset.name + " " + i.value.trim());
  });

  $("extraFields").querySelectorAll(".extra-row").forEach(r => {
    const n = r.querySelector(".x-name").value.trim();
    const v = r.querySelector(".x-val").value.trim();
    if (n) measures.push(v ? n + " " + v : n);
  });

  items.push({
    dress: dress.name,
    cloth: $("clothType").value,
    measures,
    note: $("itemNote").value.trim(),
    qty, rate
  });

  // reset entry fields for the next dress
  buildMeasureFields();
  $("itemNote").value = "";
  $("qty").value = 1;
  $("rate").value = currentDress() && currentDress().rate != null ? currentDress().rate : "";
  refresh();
}

function removeItem(index) {
  items.splice(index, 1);
  refresh();
}

const grandTotal = () => items.reduce((s, it) => s + it.qty * it.rate, 0);

/* ---------- payment ---------- */
function payment() {
  const total = grandTotal();
  const raw = $("paid").value.trim();
  const paid = raw === "" ? 0 : parseFloat(raw);
  let error = "";
  if (isNaN(paid)) error = "Enter a valid paid amount.";
  else if (paid < 0) error = "Paid amount cannot be negative.";
  else if (paid > total) error = "Paid amount cannot be more than the total.";

  const balance = error ? 0 : total - paid;
  let status = "Unpaid";
  if (!error && total > 0) {
    if (paid === total) status = "Paid";
    else if (paid > 0) status = "Balance";
  }
  return { total, paid: error ? 0 : paid, balance, status, error };
}

/* ---------- render ---------- */
function refresh() {
  // item table
  const body = $("itemBody");
  if (!items.length) {
    body.innerHTML = '<tr><td colspan="5" class="empty">No items added yet.</td></tr>';
  } else {
    body.innerHTML = items.map((it, i) => `
      <tr>
        <td>${esc(it.dress)} <small>${esc(it.cloth)}${it.measures.length ? " | " + esc(it.measures.join(", ")) : ""}${it.note ? " | " + esc(it.note) : ""}</small></td>
        <td class="num" data-label="Qty">${it.qty}</td>
        <td class="num" data-label="Rate">${money(it.rate)}</td>
        <td class="num" data-label="Total">${money(it.qty * it.rate)}</td>
        <td><button type="button" class="link" data-remove="${i}">Remove</button></td>
      </tr>`).join("");
    body.querySelectorAll("[data-remove]").forEach(b =>
      b.addEventListener("click", () => removeItem(+b.dataset.remove)));
  }

  const p = payment();
  $("grandTotal").textContent = money(p.total);
  $("balance").textContent = money(p.balance);
  const st = $("status");
  st.textContent = p.status;
  st.className = "badge " + p.status.toLowerCase();
  $("payError").textContent = p.error;

  renderReceipt(p);
}

function renderReceipt(p) {
  const showMeasure = $("printMeasure").checked;
  const showCloth = $("printCloth").checked;
  const name = $("custName").value.trim();
  const mobile = $("custMobile").value.trim();

  let h = `
    <div class="c shop">${esc(SHOP.name)}</div>
    <div class="c">${esc(SHOP.address)}</div>
    <div class="c">${esc(SHOP.phone)}</div>
    <div class="sep"></div>
    <div class="row"><span>Bill No: ${esc($("billNo").value)}</span><span>${esc(fmtDate($("billDate").value))}</span></div>
    <div>Name: ${esc(name)}</div>
    ${mobile ? `<div>Mobile: ${esc(mobile)}</div>` : ""}
    <div class="sep"></div>`;

  if (!items.length) {
    h += `<div class="c">No items</div>`;
  } else {
    items.forEach((it, i) => {
      h += `<div class="item">
        <div class="b">${i + 1}. ${esc(it.dress)}</div>
        ${showCloth ? `<div class="meas">${esc(it.cloth)}</div>` : ""}
        ${showMeasure && it.measures.length ? `<div class="meas">${esc(it.measures.join(", "))}</div>` : ""}
        ${it.note ? `<div class="meas">${esc(it.note)}</div>` : ""}
        <div class="row"><span>${it.qty} x ${money(it.rate)}</span><span>${money(it.qty * it.rate)}</span></div>
      </div>`;
    });
  }

  h += `
    <div class="sep"></div>
    <div class="row big"><span>TOTAL</span><span>${money(p.total)}</span></div>
    <div class="row"><span>Paid</span><span>${money(p.paid)}</span></div>
    <div class="row b"><span>Balance</span><span>${money(p.balance)}</span></div>
    <div class="row"><span>Status</span><span>${p.status.toUpperCase()}</span></div>
    <div class="sep"></div>
    <div class="c">${esc(SHOP.thanks)}</div>`;

  $("receipt").innerHTML = h;
}

/* ---------- actions ---------- */
function printBill() {
  const err = $("payError");
  if (!items.length) { $("itemError").textContent = "Add at least one item before printing."; return; }
  if (payment().error) { err.textContent = payment().error; return; }
  window.__printed = true;
  window.print();
}

function clearForm(afterPrint) {
  if (afterPrint !== true && items.length && !confirm("Clear this bill?")) return;
  items = [];
  ["custName", "custMobile", "paid", "rate", "itemNote"].forEach(id => $(id).value = "");
  $("qty").value = 1;
  $("billNo").value = nextBillNo();
  $("billDate").value = today();
  $("itemError").textContent = "";
  onDressChange();
  refresh();
}

init();