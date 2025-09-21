import { db } from '../firebase.js';
import { 
  doc, getDoc, getDocs, collection 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { $, formatBool } from './ui.js';
import { getCurrentStore } from './stores.js';
import { getSuiteById } from './suites.js';

export async function exportMarkdown(){
  const store = getCurrentStore(); if (!store) return;
  const suiteId = $('#exportSuiteSelect').value;
  const ambiente = $('#exportEnvSelect').value;
  if (!suiteId) { alert('Selecione a suíte'); return; }
  const suite = getSuiteById(suiteId);
  if (!suite){ alert('Suíte não encontrada'); return; }

  // fetch entries
  const entriesSnap = await getDocs(collection(db, 'stores', store.id, 'suites', suiteId, 'entries'));
  const scenarioIds = entriesSnap.docs.map(d => d.data().scenarioId);

  // get scenarios
  const scSnap = await getDocs(collection(db, 'stores', store.id, 'scenarios'));
  const scenarios = scSnap.docs.map(d => ({ id:d.id, ...d.data() })).filter(s => scenarioIds.includes(s.id));

  const qtdAuto = scenarios.filter(s => s.execucao === 'Automatizado').length;
  const qtdManual = scenarios.filter(s => s.execucao === 'Manual').length;
  const qtdTotal = scenarios.length;

  let md = '';
  md += `Loja: ${store.name}\n`;
  md += `Ambiente: ${ambiente}\n`;
  md += `Qtde Cenários automatizados: ${qtdAuto}\n`;
  md += `Qtde Cenários manuais: ${qtdManual}\n`;
  md += `Qtde Cenários totais: ${qtdTotal}\n\n`;
  md += `| Criticidade | Categoria | Execução | Nome do teste | Desktop | Mobile | Status | Observações |\n`;
  md += `|-------------|-----------|----------|---------------|---------|--------|--------|-------------|\n`;
  for (const s of scenarios){
    md += `| ${s.criticidade} | ${s.categoria} | ${s.execucao} | ${s.nomeTeste} | ${formatBool(s.desktop)} | ${formatBool(s.mobile)} | ${s.status} | ${s.observacoes||''} |\n`;
  }

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `export-${store.name}-${suite.name}-${ambiente}.md`;
  a.click();

  await navigator.clipboard.writeText(md).catch(()=>{});
  alert('Markdown gerado e copiado para a área de transferência!');
}
