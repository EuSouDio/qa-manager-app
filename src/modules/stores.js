import { db } from '../firebase.js';
import { 
  collection, addDoc, onSnapshot, query, where, orderBy, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { $, $$, toast } from './ui.js';

let currentStore = null;
let storesUnsub = null;

export function getCurrentStore(){ return currentStore; }

export function initStores({ onStoreSelected }){
  const grid = $('#storesGrid');
  $('#openCreateStoreModal').addEventListener('click', () => $('#storeModal').showModal());
  $('#storeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#storeName').value.trim();
    if (!name){ toast('Informe o nome da loja'); return; }
    const site = $('#storeSiteInput').value.trim();
    const description = $('#storeDescription').value.trim();
    try{
      await addDoc(collection(db,'stores'), {
        name, site, description,
        environments: ['dev','qa','hml','prod'],
        archived:false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      $('#storeModal').close();
      e.target.reset();
    }catch(err){ toast(err.message); }
  });

  // live list stores
  const q = query(collection(db,'stores'), where('archived','==',FalseOr(false)), orderBy('name'));
  // helper to ensure boolean false in queries
  function FalseOr(v){ return typeof v === 'boolean' ? v : false; }

  if (storesUnsub) storesUnsub();
  storesUnsub = onSnapshot(q, (snap) => {
    grid.innerHTML = '';
    snap.forEach(docu => {
      const s = docu.data();
      const card = document.createElement('div');
      card.className = 'store-card';
      card.innerHTML = `
        <h3>${s.name}</h3>
        <p>Site: ${s.site || '-'}</p>
        <p class="muted">Cenários: <strong data-scenarios="0">…</strong> • Suítes: <strong data-suites="0">…</strong></p>
        <div class="row mt-2">
          <button class="btn small" data-open-store>Ver loja</button>
        </div>
      `;
      card.querySelector('[data-open-store]').addEventListener('click', () => {
        currentStore = { id: docu.id, ...s };
        onStoreSelected && onStoreSelected(currentStore);
      });
      grid.appendChild(card);
    });
  });
}
