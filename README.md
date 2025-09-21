# QA Manager (HTML/CSS/JS + Firebase)

Aplicativo web simples (vanilla) para gerenciar cenários de teste por Loja, com Firebase Auth + Firestore.

## 1) Pré-requisitos
- Conta Firebase (projeto criado).
- Habilitar **Authentication → Email/Password**.
- Habilitar **Firestore** em modo de produção.
- Criar um **App Web** no Firebase Console (gera o `firebaseConfig`).

## 2) Configuração local
1. Copie `src/firebase-config.example.js` para `src/firebase-config.js` e **preencha** com as chaves do seu projeto Firebase.
2. Abra `index.html` no navegador usando um servidor local (extensão Live Server no VS Code, por exemplo).

## 3) Estrutura
```
/src
  /styles        # CSS
  /modules       # JS (auth, lojas, categorias, cenários, suites, tasks, markdown)
  app.js         # orquestra a UI
  firebase.js    # inicialização Firebase
  firebase-config.js # (você cria a partir do .example)
index.html
```

## 4) Regras Firestore (sugestão inicial)
Ajuste conforme necessário. Garante leitura de dados apenas autenticado e escrita básica.

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() { return request.auth != null; }

    match /users/{uid} {
      allow read, write: if isSignedIn() && request.auth.uid == uid;
    }

    match /stores/{storeId} {
      allow read: if isSignedIn();
      allow create, update, delete: if isSignedIn(); // refine por papel depois

      // subcoleções
      match /{collName=**}/{docId} {
        allow read: if isSignedIn();
        allow write: if isSignedIn();
      }
    }

    match /tasks/{taskId} {
      allow read, write: if isSignedIn();
      match /{sub=**}/{id} {
        allow read, write: if isSignedIn();
      }
    }
  }
}
```

> **Observação:** Unicidade de **categoria por loja** é feita pela app usando **ID slug** na subcoleção `stores/{storeId}/categories/{slug}`.

## 5) Deploy na **Vercel**
### Opção A — Repositório Git
1. Suba este projeto para um repositório GitHub/GitLab/Bitbucket.
2. No painel da **Vercel**, clique **New Project** → **Import** seu repositório.
3. **Build & Output Settings**: como é projeto estático, deixe **Build Command** vazio e **Output Directory** como `.` (raiz).
4. Variáveis de ambiente **não são necessárias** (o Firebase config fica no arquivo `src/firebase-config.js`).  
   > Lembre-se: as chaves do Firebase **não são secretas**.
5. Deploy!

### Opção B — CLI (Vercel CLI)
1. Instale a CLI: `npm i -g vercel`  
2. Faça login: `vercel login`  
3. No diretório do projeto: `vercel` → confirme as opções (build vazio, output `.`).  
4. Para produção: `vercel --prod`

## 6) Dicas
- Se desejar **roteamento SPA**, mantenha tudo em `index.html` (já é uma Single Page) — sem necessidade de rewrites.
- Para CSV grande (centenas de linhas), o navegador lida bem; para milhares, considere dividir ou implementar *batch writes*.
- Para controle de papéis por loja/tarefa, inclua documentos `storeMembers`/`taskMembers` e refine as rules.

## 7) Roadmap rápido
- Suítes **cross-loja** (atualmente intra-loja).
- Convites por email (Functions + Dynamic Links).
- Relatórios/Métricas.
- Variação Mobile/Desktop por dispositivo.
```

