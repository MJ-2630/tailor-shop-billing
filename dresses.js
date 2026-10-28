const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

let dresses = loadDresses();
let editingId = null;     // null = adding a new dress
let formMeasures = [];

function newId() { return "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

function persist(msg) {
  if (!saveDresses(dresses)) {
    $("listMsg").className = "error";
    $("listMsg").textContent = "Could not save. Browser storage is blocked or full.";
    return false;
  }
  $("listMsg").className = "ok-msg";
  $("listMsg").textContent = msg || "";
  return true;
}

/* ----- list ----- */
function renderList() {
  const box = $("dressList");
  if (!dresses.length) {
    box.innerHTML = '<p class="empty">No dresses yet. Tap Add Dress.</p>';
    return;
  }
  box.innerHTML = dresses.map(d => `
    <div class="dress-row">
      <div class="dress-info">
        <div class="dress-name">${esc(d.name)}${d.rate != null ? ` <span class="rate">Rs ${esc(d.rate)}</span>` : ""}</div>
        <small>${d.measures.length ? esc(d.measures.join(", ")) : "No measurements"}</small>
      </div>
      <div class="dress-btns">
        <button type="button" data-edit="${d.id}">Edit</button>
        <button type="button" class="danger" data-del="${d.id}">Delete</button>
      </div>
    </div>`).join("");
  box.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => openForm(b.dataset.edit)));
  box.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => deleteDress(b.dataset.del)));
}

/* ----- form ----- */
function openForm(id) {
  editingId = id || null;
  const d = id ? dresses.find(x => x.id === id) : null;
  $("formTitle").textContent = d ? "Edit Dress" : "Add Dress";
  $("dName").value = d ? d.name : "";
  $("dRate").value = d && d.rate != null ? d.rate : "";
  formMeasures = d ? d.measures.slice() : [];
  $("mName").value = "";
  $("formError").textContent = "";
  $("listMsg").textContent = "";
  renderChips();
  $("formBox").hidden = false;
  $("formBox").scrollIntoView({ behavior: "smooth", block: "start" });
  $("dName").focus();
}

function closeForm() {
  $("formBox").hidden = true;
  editingId = null;
}

function renderChips() {
  const box = $("chips");
  if (!formMeasures.length) {
    box.innerHTML = '<span class="muted">No measurements. Add below if needed.</span>';
    return;
  }
  box.innerHTML = formMeasures.map((m, i) =>
    `<span class="chip">${esc(m)}<button type="button" aria-label="Remove ${esc(m)}" data-rm="${i}">&times;</button></span>`).join("");
  box.querySelectorAll("[data-rm]").forEach(b => b.addEventListener("click", () => {
    formMeasures.splice(+b.dataset.rm, 1);
    renderChips();
  }));
}

function addMeasure() {
  const v = $("mName").value.trim();
  const err = $("formError");
  err.textContent = "";
  if (!v) return;
  if (formMeasures.some(m => same(m, v))) { err.textContent = "That measurement is already added."; return; }
  formMeasures.push(v);
  $("mName").value = "";
  renderChips();
  $("mName").focus();
}

function saveDress() {
  const name = $("dName").value.trim();
  const rateRaw = $("dRate").value.trim();
  const err = $("formError");
  err.textContent = "";

  if (!name) { err.textContent = "Enter a dress name."; return; }
  if (dresses.some(d => d.id !== editingId && same(d.name, name))) {
    err.textContent = "A dress with this name already exists."; return;
  }
  let rate = null;
  if (rateRaw !== "") {
    rate = parseFloat(rateRaw);
    if (isNaN(rate) || rate < 0) { err.textContent = "Enter a valid rate or leave it empty."; return; }
  }
  // measurement typed but not added yet: add it
  if ($("mName").value.trim()) addMeasure();
  if (err.textContent) return;

  if (editingId) {
    const d = dresses.find(x => x.id === editingId);
    d.name = name; d.rate = rate; d.measures = formMeasures.slice();
  } else {
    dresses.push({ id: newId(), name, measures: formMeasures.slice(), rate });
  }
  if (persist('Saved "' + name + '".')) {
    closeForm();
    renderList();
  }
}

function deleteDress(id) {
  const d = dresses.find(x => x.id === id);
  if (!d || !confirm('Delete "' + d.name + '"?')) return;
  dresses = dresses.filter(x => x.id !== id);
  if (persist('Deleted "' + d.name + '".')) renderList();
}

function resetDefaults() {
  if (!confirm("Replace the whole list with the default dresses? Your changes will be lost.")) return;
  dresses = JSON.parse(JSON.stringify(DEFAULT_DRESSES));
  closeForm();
  if (persist("List reset to default.")) renderList();
}

$("addBtn").addEventListener("click", () => openForm(null));
$("cancelBtn").addEventListener("click", closeForm);
$("saveBtn").addEventListener("click", saveDress);
$("mAddBtn").addEventListener("click", addMeasure);
$("resetBtn").addEventListener("click", resetDefaults);
$("mName").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); addMeasure(); } });
$("dName").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); saveDress(); } });

renderList();