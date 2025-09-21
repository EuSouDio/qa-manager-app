import { db } from '../firebase.js';
import { 
  collection, doc, setDoc, getDocs, onSnapshot, query, orderBy 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { $, $$, toast, slugify } from './ui.js';
import { getCurrentStore } from './stores.js';

let selectedCategories = new Set();
let unsub = null;

export function getSelectedCategories(){ return Array.from(selectedCategories); }

export function initCategories(){
  // nothing global; categories are loaded per store in loadCategories
}

export async function loadCategories(){
  const store = getCurrentStore();
  if (!store) return;
  const chips = $('#categoryChips');
  chips.innerHTML = '';
  if (unsub) unsub();

  const q = query(collection(db, 'stores', store.id, 'categories'), orderBy('name'));
  unsub = onSnapshot(q, (snap) => {
    chips.innerHTML = '';
    snap.forEach(docu => {
      const c = docu.data();
      const chip = document.createElement('button');
      chip.className = 'chip';
      chip.textContent = c.name;
      chip.addEventListener('click', () => {
        const isActive = chip.classList.toggle('active');
        if (isActive) selectedCategories.add(docu.id); else selectedCategories.delete(docu.id);
        const event = new CustomEvent('categories:change');
        window.dispatchEvent(event);
      });
      chips.appendChild(chip);
    });
  });
}

export async function ensureCategory(name){
  const store = getCurrentStore();
  const slug = slugify(name);
  const ref = doc(collection(db,'stores', store.id, 'categories'), slug);
  await setDoc(ref, { name: name.trim() }, { merge: true });
  return { id: slug, name: name.trim() };
}
