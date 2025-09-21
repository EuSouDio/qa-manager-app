export const $ = (sel, root=document) => root.querySelector(sel);
export const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

export function toast(msg){
  alert(msg); // simples para MVP; pode trocar por um toast bonito
}

export function formatBool(b){
  return b ? "✅" : "";
}

export function slugify(name){
  return name.trim().toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu,'')
    .replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
}

export function setProgress(el, pct){
  el.style.width = `${Math.max(0, Math.min(100, pct))}%`;
}
