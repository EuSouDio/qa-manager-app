import { initAuth } from './modules/auth.js';
import { initStores, getCurrentStore } from './modules/stores.js';
import { initCategories, loadCategories } from './modules/categories.js';
import { initScenarios, subscribeScenarios } from './modules/scenarios.js';
import { initSuites, subscribeSuites } from './modules/suites.js';
import { exportMarkdown } from './modules/markdown.js';
import { initTasks, subscribeTasks } from './modules/tasks.js';

const tabs = document.querySelectorAll('.tab');
tabs.forEach(btn => btn.addEventListener('click', () => {
  tabs.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
  document.querySelector('#tab-' + btn.dataset.tab).classList.remove('hidden');
}));

document.getElementById('exportMdBtn').addEventListener('click', exportMarkdown);

initAuth({
  onLogin(){
    initStores({ onStoreSelected: async () => {
      // Show store detail
      document.getElementById('storeDetail').classList.remove('hidden');
      const store = getCurrentStore();
      document.getElementById('storeTitle').textContent = store.name;
      document.getElementById('storeSite').textContent = store.site || '-';
      // categories + scenarios
      await loadCategories();
      subscribeScenarios();
      // suites
      subscribeSuites();
    }});
    initCategories();
    initScenarios();
    initSuites();
    initTasks();
    subscribeTasks();
  }
});
