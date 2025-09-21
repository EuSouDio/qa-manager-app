import { db } from '../firebase.js';
import { 
  collection, addDoc, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, serverTimestamp, getDocs 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { $, $$, toast, formatBool } from './ui.js';
import { getCurrentStore } from './stores.js';
import { getSelectedCategories, ensureCategory } from './categories.js';

let scenariosUnsub = null;
let currentSort = { field: 'nomeTeste', dir: 'asc' };
let cache = []; // local cache for sorting without extra reads

export function initScenarios(){
  $('#openCreateScenario').addEventListener('click', async () => {
    const name = prompt('Nome do teste:');
    if (!name) return;
    const criticidade = prompt('Criticidade (ALTA|MÉDIA|BAIXA):','MÉDIA') || 'MÉDIA';
    const categoria = prompt('Categoria:', 'Geral') || 'Geral';
    const execucao = prompt('Execução (Manual|Automatizado):','Manual') || 'Manual';
    const desktop = confirm('Desktop?');
    const mobile = confirm('Mobile?');
    const status = 'Pronto';
    const observacoes = '';
    await createScenario({ nomeTeste: name, criticidade, categoria, execucao, desktop, mobile, status, observacoes });
  });

  $('#downloadCsvTemplate').addEventListener('click', () => {
    const header = 'nomeTeste,criticidade,categoria,execucao,desktop,mobile,status,observacoes\n';
    const blob = new Blob([header + '"Login cliente",ALTA,Autenticação,Manual,true,false,Pronto,"Validar login com credenciais válidas"\n'], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'modelo-cenarios.csv';
    a.click();
  });

  $('#csvInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const sep = text.includes(';') && (!text.includes(',"') || (text.split(';').length > text.split(',').length)) ? ';' : ',';
    const lines = text.split(/\r?\n/).filter(Boolean);
    const header = lines.shift(); // skip header
    let imported = 0, failed = 0;
    for (const line of lines){
      const parts = parseCsvLine(line, sep);
      if (parts.length < 8){ failed++; continue; }
      const [nomeTeste, criticidade, categoria, execucao, desktop, mobile, status, observacoes] = parts;
      try{
        await createScenario({
          nomeTeste: nomeTeste.replace(/^"|"$/g,''),
          criticidade: (criticidade||'').toUpperCase(),
          categoria: categoria,
          execucao: execucao,
          desktop: String(desktop).toLowerCase()==='true',
          mobile: String(mobile).toLowerCase()==='true',
          status: status,
          observacoes: observacoes?.replace(/^"|"$/g,'') || ''
        });
        imported++;
      }catch(e){ console.error(e); failed++; }
    }
    toast(`Importação concluída: ${imported} ok, ${failed} erro(s).`);
    e.target.value = '';
  });

  // Sorting
  $$('#scenariosTable th').forEach(th => {
    const key = th.getAttribute('data-sort');
    if (!key) return;
    th.addEventListener('click', () => {
      const dir = (currentSort.field === key && currentSort.dir === 'asc') ? 'desc' : 'asc';
      currentSort = { field: key, dir };
      renderTable();
    });
  });

  window.addEventListener('categories:change', () => subscribeScenarios());
}

function parseCsvLine(line, sep){
  // naive CSV parser for semicolon/comma separated
  const result = []; let current = ''; let insideQuotes = false;
  for (let i=0;i<line.length;i++){
    const ch = line[i];
    if (ch === '"'){ insideQuotes = !insideQuotes; continue; }
    if (ch === sep && !insideQuotes){ result.push(current); current=''; }
    else current += ch;
  }
  result.push(current);
  return result.map(s=>s.trim());
}

export async function createScenario(data){
  const store = getCurrentStore();
  const category = await ensureCategory(data.categoria || 'Geral');
  const payload = {
    storeId: store.id,
    nomeTeste: data.nomeTeste,
    criticidade: data.criticidade || 'MÉDIA',
    categoriaId: category.id,
    categoria: category.name,
    execucao: data.execucao || 'Manual',
    desktop: !!data.desktop,
    mobile: !!data.mobile,
    status: data.status || 'Pronto',
    observacoes: data.observacoes || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  await addDoc(collection(db,'stores', store.id, 'scenarios'), payload);
}

export function subscribeScenarios(){
  const store = getCurrentStore();
  if (!store) return;
  const tbody = $('#scenariosTbody');
  tbody.innerHTML = '';
  if (scenariosUnsub) scenariosUnsub();

  const selected = getSelectedCategories();
  if (selected.length === 0){
    cache = [];
    renderTable();
    return;
  }

  const q = query(
    collection(db, 'stores', store.id, 'scenarios'),
    where('categoriaId','in', selected)
  );

  scenariosUnsub = onSnapshot(q, (snap) => {
    cache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTable();
    populateSuiteBuilder();
  });
}

function renderTable(){
  const tbody = $('#scenariosTbody');
  tbody.innerHTML = '';

  const data = [...cache].sort((a,b) => {
    const f = currentSort.field, d = currentSort.dir === 'asc' ? 1 : -1;
    const av = (a[f] ?? '').toString().toLowerCase();
    const bv = (b[f] ?? '').toString().toLowerCase();
    if (av < bv) return -1*d; if (av > bv) return 1*d; return 0;
  });

  for (const s of data){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s.criticidade}</td>
      <td>${s.categoria}</td>
      <td>${s.execucao}</td>
      <td>${s.nomeTeste}</td>
      <td>${formatBool(s.desktop)}</td>
      <td>${formatBool(s.mobile)}</td>
      <td>${s.status}</td>
      <td>${s.observacoes||''}</td>
      <td>
        <button class="btn small" data-edit="${s.id}">Editar</button>
        <button class="btn small danger" data-del="${s.id}">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);

    tr.querySelector(`[data-edit="${s.id}"]`).addEventListener('click', async () => {
      const novoStatus = prompt('Novo status:', s.status) || s.status;
      await updateDoc(doc(db,'stores', s.storeId, 'scenarios', s.id), { status: novoStatus, updatedAt: serverTimestamp() });
    });
    tr.querySelector(`[data-del="${s.id}"]`).addEventListener('click', async () => {
      if (confirm('Excluir cenário?')) await deleteDoc(doc(db,'stores', s.storeId, 'scenarios', s.id));
    });
  }
}

// Suite builder (intra-loja)
export async function populateSuiteBuilder(){
  const store = getCurrentStore();
  if (!store) return;
  const list = $('#suiteScenarioList');
  list.innerHTML = '';
  for (const s of cache){
    const div = document.createElement('label');
    div.className = 'store-card';
    div.innerHTML = `
      <input type="checkbox" data-sel="${s.id}" />
      <strong>${s.nomeTeste}</strong><br/>
      <span class="muted">${s.categoria} • ${s.criticidade} • ${s.execucao}</span>
    `;
    list.appendChild(div);
  }
}

export function getSuiteSelectedIds(){
  const boxes = $$('[data-sel]');
  return boxes.filter(b => b.checked).map(b => b.getAttribute('data-sel'));
}
