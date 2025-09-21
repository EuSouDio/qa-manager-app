import { auth, db } from '../firebase.js';
import { 
  onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, signOut 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { $, toast } from './ui.js';

export function initAuth({onLogin, onLogout}){
  const authView = $('#authView');
  const appView = $('#appView');
  const logoutBtn = $('#logoutBtn');
  const welcomeName = $('#welcomeName');
  const toggleThemeBtn = $('#toggleThemeBtn');

  // Theme toggle
  toggleThemeBtn.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('qa_dark_mode', String(isDark));
  });

  // login
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#loginEmail').value.trim();
    const password = $('#loginPassword').value;
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch(err){ toast(err.message); }
  });

  // register
  $('#registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#registerName').value.trim();
    const email = $('#registerEmail').value.trim();
    const password = $('#registerPassword').value;
    const prefersDark = $('#registerDarkMode').checked;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      await setDoc(doc(db, 'users', cred.user.uid), {
        displayName: name,
        email,
        darkMode: prefersDark
      });
      if (prefersDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('qa_dark_mode', 'true');
      }
    } catch(err){ toast(err.message); }
  });

  logoutBtn.addEventListener('click', () => signOut(auth));

  onAuthStateChanged(auth, async (user) => {
    if (user){
      const snap = await getDoc(doc(db, 'users', user.uid));
      const prof = snap.exists() ? snap.data() : { displayName: user.displayName || user.email };
      welcomeName.textContent = `Bem-vindo, ${prof.displayName || user.email}`;
      authView.classList.add('hidden');
      appView.classList.remove('hidden');
      onLogin && onLogin({ user, profile: prof });
    } else {
      appView.classList.add('hidden');
      authView.classList.remove('hidden');
      onLogout && onLogout();
    }
  });
}
