import { db } from '../firebase.js';
import { 
  collection, addDoc, doc, setDoc, getDoc, getDocs, query, where, onSnapshot, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { $, toast } from './ui.js';
import { getCurrentStore } from './stores.js';
import { getSuiteSelectedIds } from './scenarios.js';

let unsubSuites = null;
let currentSuites = [];

export function initSuites(){
  $('#createSuiteBtn').addEventListener('click', async () => {
    const store = getCurrentStore(); if (!store) return;
    const name = $('#suiteName').value.trim(); if (!name) return toast('Informe o nome da suíte');
    const scenarioIds = getSuiteSelectedIds();
    const suiteRef = await addDoc(collection(db,'stores', store.id, 'suites'), {
      name, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    });
    // save entries as subcollection
    for (const sid of scenarioIds){
      await addDoc(collection(db,'stores', store.id, 'suites', suiteRef.id, 'entries'), {
        scenarioId: sid, storeId: store.id
      });
    }
    $('#suiteName').value = '';
    toast('Suíte criada!');
  });
}

export function subscribeSuites(){
  const store = getCurrentStore(); if (!store) return;
  const select = $('#exportSuiteSelect');
  if (unsubSuites) unsubSuites();
  unsubSuites = onSnapshot(collection(db,'stores', store.id, 'suites'), (snap) => {
    currentSuites = snap.docs.map(d => ({ id:d.id, ...d.data() }));
    select.innerHTML = '<option value="">Selecione a suíte</option>';
    for (const s of currentSuites){
      const o = document.createElement('option');
      o.value = s.id; o.textContent = s.name;
      select.appendChild(o);
    }
  });
}

export function getSuiteById(id){
  return currentSuites.find(s => s.id === id);
}
