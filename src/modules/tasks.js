import { db } from '../firebase.js';
import { 
  collection, addDoc, doc, getDoc, getDocs, setDoc, updateDoc, onSnapshot, serverTimestamp, query, where 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { $, $$, toast, setProgress } from './ui.js';
import { getCurrentStore } from './stores.js';
import { getSuiteById } from './suites.js';

let unsubTasks = null;
let currentTasks = [];
let openedTask = null;

export function initTasks(){
  $('#createTaskBtn').addEventListener('click', async () => {
    const title = prompt('Título da tarefa:');
    if (!title) return;
    const store = getCurrentStore();
    if (!store){ return toast('Abra uma loja e crie uma suíte antes.'); }
    const suiteId = $('#exportSuiteSelect').value;
    if (!suiteId) return toast('Selecione uma suíte na aba da Loja para vincular à tarefa.');
    const tRef = await addDoc(collection(db,'tasks'), {
      title, description:'', createdAt: serverTimestamp(), archived:false, progress:0
    });
    await addDoc(collection(db,'tasks', tRef.id, 'suiteRefs'), { storeId: store.id, suiteId });
    toast('Tarefa criada! Vá em Andamento para ver.');
    // optionally switch tab
    document.querySelector('[data-tab="tasks"]').click();
  });

  $('#closeTaskDrawer').addEventListener('click', () => closeDrawer());
  $('#addBugBtn').addEventListener('click', async () => {
    if (!openedTask) return;
    const title = $('#bugTitle').value.trim();
    const url = $('#bugUrl').value.trim();
    if (!title || !url) return toast('Informe título e URL do JIRA');
    await addDoc(collection(db, 'tasks', openedTask.id, 'bugs'), {
      title, jiraUrl:url, status:'Aberto', createdAt: serverTimestamp()
    });
    $('#bugTitle').value=''; $('#bugUrl').value='';
  });
  $('#archiveTaskBtn').addEventListener('click', async () => {
    if (!openedTask) return;
    await updateDoc(doc(db,'tasks', openedTask.id), { archived:true });
    closeDrawer();
  });
  $('#inviteToTaskBtn').addEventListener('click', () => {
    alert('Convites: MVP futuro (envio de email). Por ora, adicione permissões manualmente se necessário.');
  });
}

export function subscribeTasks(){
  const grid = $('#tasksGrid');
  if (unsubTasks) unsubTasks();
  const q = query(collection(db,'tasks'), where('archived','==',false));
  unsubTasks = onSnapshot(q, async (snap) => {
    grid.innerHTML = '';
    currentTasks = snap.docs.map(d => ({ id:d.id, ...d.data() }));
    for (const t of currentTasks){
      // aggregate quick meta (suites count, scenarios count)
      const srefs = await getDocs(collection(db,'tasks', t.id, 'suiteRefs'));
      let suitesCt = 0, scenariosCt = 0, stores = new Set();
      for (const r of srefs.docs){
        suitesCt++;
        const storeId = r.data().storeId; stores.add(storeId);
        const entries = await getDocs(collection(db,'stores', storeId, 'suites', r.data().suiteId, 'entries'));
        scenariosCt += entries.size;
      }
      const pct = Math.round(t.progress || 0);
      const card = document.createElement('div');
      card.className = 'store-card';
      card.innerHTML = `
        <h3>${t.title}</h3>
        <p class="muted">Lojas: ${Array.from(stores).length} • Suítes: ${suitesCt} • Cenários: ${scenariosCt}</p>
        <div class="progress mt-2"><div class="bar" style="width:${pct}%"></div></div>
        <div class="row mt-2">
          <button class="btn small" data-open="${t.id}">Abrir</button>
          <button class="btn small danger" data-archive="${t.id}">Arquivar</button>
        </div>
      `;
      card.querySelector(`[data-open="${t.id}"]`).addEventListener('click', () => openTask(t));
      card.querySelector(`[data-archive="${t.id}"]`).addEventListener('click', async () => {
        await updateDoc(doc(db,'tasks', t.id), { archived:true });
      });
      grid.appendChild(card);
    }
  });
}

async function openTask(task){
  openedTask = task;
  $('#taskTitle').textContent = task.title;
  $('#taskDrawer').classList.remove('hidden');
  $('#taskRunsTbody').innerHTML = '';
  $('#bugsList').innerHTML = '';
  updateProgressBar(task.progress||0);

  // load suites and scenarios
  const srefs = await getDocs(collection(db,'tasks', task.id, 'suiteRefs'));
  let runs = [];
  for (const r of srefs.docs){
    const { storeId, suiteId } = r.data();
    const entries = await getDocs(collection(db,'stores', storeId, 'suites', suiteId, 'entries'));
    for (const e of entries.docs){
      const scId = e.data().scenarioId;
      const scDoc = await getDoc(doc(db,'stores', storeId, 'scenarios', scId));
      if (scDoc.exists()){
        runs.push({
          taskId: task.id, storeId, suiteId, scenarioId: scId, 
          nome: scDoc.data().nomeTeste, categoria: scDoc.data().categoria, status: 'Backlog'
        });
      }
    }
  }
  // render runs
  const tbody = $('#taskRunsTbody');
  for (const run of runs){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${run.storeId.slice(0,6)}…</td>
      <td>${run.categoria}</td>
      <td>${run.nome}</td>
      <td data-st="${run.scenarioId}">Backlog</td>
      <td><button class="btn small" data-mark="${run.scenarioId}">Marcar Aprovado</button></td>
    `;
    tr.querySelector(`[data-mark="${run.scenarioId}"]`).addEventListener('click', async () => {
      tr.querySelector(`[data-st="${run.scenarioId}"]`).textContent = 'Aprovado';
      await addDoc(collection(db,'tasks', task.id, 'runs'), {
        suiteId: run.suiteId, storeId: run.storeId, scenarioId: run.scenarioId, status:'Aprovado', updatedAt: serverTimestamp()
      });
      await recomputeProgress(task.id);
    });
    tbody.appendChild(tr);
  }

  // bugs
  onSnapshot(collection(db,'tasks', task.id, 'bugs'), (snap) => {
    const list = $('#bugsList'); list.innerHTML = '';
    snap.forEach(d => {
      const b = d.data();
      const item = document.createElement('div');
      item.className = 'row between';
      item.innerHTML = `<span>🐞 <strong>${b.title}</strong> — <a href="${b.jiraUrl}" target="_blank" rel="noopener">Abrir JIRA</a></span><span class="muted">${b.status}</span>`;
      list.appendChild(item);
    });
  });
}

function closeDrawer(){
  $('#taskDrawer').classList.add('hidden');
  openedTask = null;
}

function updateProgressBar(pct){ setProgress($('#taskProgressBar'), pct); }

async function recomputeProgress(taskId){
  // count 'Aprovado' runs
  const runsSnap = await getDocs(collection(db,'tasks', taskId, 'runs'));
  const approved = runsSnap.docs.filter(d => d.data().status === 'Aprovado').length;
  // total expected = sum of all entries in linked suites
  const srefs = await getDocs(collection(db,'tasks', taskId, 'suiteRefs'));
  let total = 0;
  for (const r of srefs.docs){
    const entries = await getDocs(collection(db,'stores', r.data().storeId, 'suites', r.data().suiteId, 'entries'));
    total += entries.size;
  }
  const pct = total ? Math.round((approved/total)*100) : 0;
  await updateDoc(doc(db,'tasks', taskId), { progress: pct });
  updateProgressBar(pct);
}
