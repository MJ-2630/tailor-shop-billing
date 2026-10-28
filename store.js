/* Shared by billing page and dresses page.
   The dress list is saved in this browser (localStorage). */
const STORE_KEY = "tailorDresses_v1";

const DEFAULT_DRESSES = [
  { id: "d1", name: "Shirt", measures: ["Length", "Chest", "Shoulder", "Sleeve", "Collar"], rate: null },
  { id: "d2", name: "Pant", measures: ["Length", "Waist", "Hip", "Bottom"], rate: null },
  { id: "d3", name: "Chudithar / Sudithar", measures: ["Top Length", "Chest", "Waist", "Hip", "Sleeve", "Bottom Length", "Bottom Waist"], rate: null },
  { id: "d4", name: "Blouse", measures: ["Length", "Chest", "Waist", "Shoulder", "Sleeve"], rate: null },
  { id: "d5", name: "Saree Blouse", measures: ["Length", "Chest", "Waist", "Shoulder", "Sleeve"], rate: null },
  { id: "d6", name: "Saree Fall / Pico", measures: [], rate: null },
  { id: "d7", name: "Alteration", measures: [], rate: null },
  { id: "d8", name: "Other", measures: [], rate: null }
];

function loadDresses() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return list;
    }
  } catch (e) {}
  return JSON.parse(JSON.stringify(DEFAULT_DRESSES));
}

function saveDresses(list) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    return false;
  }
}