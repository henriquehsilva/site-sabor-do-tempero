// =========================[ EDITADO – SUPORTE A FIREBASE ]=========================
// Inicialização opcional do Firebase usando window.env (sem bundler)
// Requer <script src="/env.js"></script> ANTES deste arquivo no seu HTML.
window.localStorage.setItem('firebase:log', 'debug');

function assertFirebaseEnv() {
  const req = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID'
  ];
  const missing = req.filter(k => !window.env?.[k] || String(window.env[k]).trim() === '');
  if (missing.length) {
    throw new Error('Firebase CONFIGURATION_NOT_FOUND: faltam variáveis -> ' + missing.join(', '));
  }
}

function checkDomainAllowed() {
  const allow = window.env?.AUTHORIZED_DOMAINS;
  if (Array.isArray(allow) && allow.length) {
    const host = location.hostname.toLowerCase();
    const ok = allow.some(d => {
      const dom = String(d).toLowerCase();
      return host === dom || host.endsWith('.' + dom);
    });
    if (!ok) {
      throw new Error(`Firebase DOMAIN_NOT_ALLOWED: '${host}' não está em AUTHORIZED_DOMAINS.`);
    }
  }
}

async function initFirebaseIfAvailable() {
  try {
    if (window.__fb?.db) return window.__fb;

    if (!window.env || !window.env.VITE_FIREBASE_API_KEY) {
      console.warn('[Firebase] window.env ausente – usando apenas localStorage.');
      return null;
    }

    // Valida variáveis e domínio (sem chamadas prévias à API do Google para evitar CORS)
    assertFirebaseEnv();
    checkDomainAllowed();

    // Carrega SDKs (sem bundler, via CDN; funciona dentro de script normal)
    const [
      { initializeApp },
      { getAuth, signInAnonymously, onAuthStateChanged },
      { getFirestore, doc, collection, onSnapshot, setDoc, deleteDoc, serverTimestamp, getCountFromServer }
    ] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js')
    ]);

    const firebaseConfig = {
      apiKey: window.env.VITE_FIREBASE_API_KEY,
      authDomain: window.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: window.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: window.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: window.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: window.env.VITE_FIREBASE_APP_ID
    };

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    // Tenta auth anônima; se falhar, usa fallback localStorage
    try {
      await signInAnonymously(auth);
    } catch (err) {
      const code = err?.code || String(err);
      if (code.includes('operation-not-allowed')) {
        console.warn('[Firebase] Provider Anônimo desabilitado – usando localStorage.');
      } else if (code.includes('domain')) {
        console.warn('[Firebase] Domínio não autorizado – usando localStorage.');
      } else if (code.includes('configuration-not-found')) {
        console.warn('[Firebase] Config inválida (app Web não criado/credenciais incorretas) – usando localStorage.');
      } else {
        console.warn('[Firebase] signInAnonymously falhou – usando localStorage. Motivo:', code);
      }
      return null;
    }

    const db = getFirestore(app);
    let currentUid = null;
    onAuthStateChanged(auth, (u) => { currentUid = u?.uid || null; });

    window.__fb = {
      app, auth, db,
      doc, collection, onSnapshot, setDoc, deleteDoc, serverTimestamp, getCountFromServer,
      get uid() { return currentUid; }
    };

    console.log('[Firebase] OK – auth anônima ativa.');
    return window.__fb;

  } catch (e) {
    console.warn('[Firebase] Falha ao inicializar, caindo para localStorage:', e.message || e);
    return null;
  }
}

// Gera uma chave determinística caso não exista prato.id
function pratoKeyFrom(prato) {
  if (prato?.id) return String(prato.id);
  return String(prato?.nome || 'prato')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// =============================[ SEU JSON / ESTADO ]===============================
const SAMPLE_JSON = {
  "meta": {
    "titulo_dia": "Cardápio do Dia",
    "data": "2025-10-18",
    "flags": {
      "mostrar_itens_prato": true,
      "mostrar_sessao_sobre": true,
      "mostrar_endereco": true,
      "mostrar_whatsapp": true,
      "mostrar_botao_ouvir": true,
      "usar_grade_compacta": false
    }
  },
  "opcoes_do_dia": 3,
  "pratos": [
    {
      "id": "feijoada",
      "nome": "Feijoada",
      "itens": ["Feijão preto", "Arroz branco", "Torresmo", "Linguiça", "Banana", "Farofa", "Vinagrete"],
      "disponivel": true
    },
    {
      "id": "costelinha",
      "nome": "Costelinha suína alho e óleo",
      "itens": ["Farofa", "Couve refogada", "Banana frita", "Mandioca"],
      "disponivel": true
    },
    {
      "id": "strogonoff",
      "nome": "Strogonoff de Frango",
      "itens": ["Arroz branco", "Batata palha", "Feijão"],
      "disponivel": true
    }
  ],
  "sobre": {
    "cozinheira": "Dona Maria (Sabor do Tempero)",
    "endereco": "Rua das Acácias, 123 - Bairro Centro",
    "horario": "Seg a Sáb, 10h às 14h",
    "telefone": "+55 62 90000-0000",
    "whatsapp": "+5562900000000"
  }
};

let menuData = null;

// ===============================[ CARREGAMENTO ]=================================
async function carregarMenu() {
  const loading = document.getElementById('loading');
  const offlineAlert = document.getElementById('offlineAlert');

  try {
    loading.style.display = 'block';

    const response = await fetch('/data/menu.json', {
      cache: 'no-cache',
      headers: { 'Cache-Control': 'no-cache' }
    });

    if (!response.ok) throw new Error('Arquivo não encontrado');

    menuData = await response.json();
    offlineAlert.style.display = 'none';
  } catch (error) {
    console.log('Usando dados de exemplo:', error.message);
    menuData = SAMPLE_JSON;

    if (!navigator.onLine) {
      offlineAlert.style.display = 'flex';
    }
  } finally {
    loading.style.display = 'none';
    renderizarMenu();
  }
}

function renderizarMenu() {
  if (!menuData) return;

  const { meta, opcoes_do_dia, pratos, sobre } = menuData;

  document.getElementById('tituloDia').textContent = meta.titulo_dia || 'Cardápio do Dia';
  document.getElementById('dataDia').textContent = formatarData(meta.data);

  renderizarCardapio(pratos, opcoes_do_dia, meta.flags);
  renderizarSobre(sobre, meta.flags);
  configurarBotoes(meta.flags);
}

function formatarData(dataStr) {
  if (!dataStr) return '';
  try {
    const [ano, mes, dia] = dataStr.split('-');
    const data = new Date(ano, mes - 1, dia);
    const opcoes = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return data.toLocaleDateString('pt-BR', opcoes);
  } catch (error) {
    return dataStr;
  }
}

// ===============================[ RENDER CARDÁPIO ]==============================
function renderizarCardapio(pratos, opcoesQtd, flags) {
  const cardapioContainer = document.getElementById('cardapio');
  cardapioContainer.innerHTML = '';

  const pratosDisponiveis = pratos.filter(p => p.disponivel);
  const pratosExibir = pratosDisponiveis.slice(0, opcoesQtd);

  const gridClass = `grid-${opcoesQtd}`;
  cardapioContainer.className = `cardapio ${gridClass}`;

  pratosExibir.forEach(prato => {
    const card = criarCardPrato(prato, flags);
    cardapioContainer.appendChild(card);
  });
}

// ===============================[ CARD DO PRATO ]================================
function criarCardPrato(prato, flags) {
  const card = document.createElement('article');
  card.className = 'prato-card';
  if (flags.usar_grade_compacta) card.classList.add('compacto');

  // --- Imagem + Lupinha ---
  const capa = prato.imagem || (prato.galeria && prato.galeria[0]);
  if (capa) {
    const media = document.createElement('div');
    media.className = 'prato-media';

    const img = document.createElement('img');
    img.className = 'prato-imagem';
    img.src = capa;
    img.alt = prato.nome || 'Imagem do prato';
    img.loading = 'lazy';
    img.decoding = 'async';
    media.appendChild(img);

    // Botão de zoom (lupinha)
    const zoomBtn = document.createElement('button');
    zoomBtn.className = 'prato-zoom-btn';
    zoomBtn.type = 'button';
    zoomBtn.setAttribute('aria-label', `Ver fotos de ${prato.nome || 'prato'}`);
    zoomBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2" aria-hidden="true">
        <circle cx="11" cy="11" r="7"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
    `;
    zoomBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const imagens = prato.galeria && prato.galeria.length ? prato.galeria : [capa];
      openLightbox(imagens, 0, prato.nome);
    });

    // Double-tap/click na imagem: curtir (integra com handler do botão)
    let lastTap = 0;
    media.addEventListener('click', () => {
      const now = Date.now();
      if (now - lastTap < 350) {
        const likeBtn = card.querySelector('.prato-like-btn');
        likeBtn?.click();
      }
      lastTap = now;
    });

    media.appendChild(zoomBtn);
    card.appendChild(media);
  }

  // --- Título ---
  const nome = document.createElement('h2');
  nome.className = 'prato-nome';
  nome.textContent = prato.nome;
  nome.setAttribute('data-prato-nome', '');
  card.appendChild(nome);

  // --- Itens ---
  if (flags.mostrar_itens_prato && prato.itens?.length) {
    const lista = document.createElement('ul');
    lista.className = 'prato-itens';
    prato.itens.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      lista.appendChild(li);
    });
    card.appendChild(lista);
  }

  // --- Ações (Curtir) ---
  const actions = document.createElement('div');
  actions.className = 'prato-actions';

  const likeBtn = document.createElement('button');
  likeBtn.className = 'prato-like-btn';
  likeBtn.type = 'button';
  likeBtn.setAttribute('aria-label', 'Curtir este prato');
  likeBtn.setAttribute('aria-pressed', 'false');
  likeBtn.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12.1 21.35l-1.1-1.02C5.14 15.24 2 12.39 2 8.9 2 6.36 4.02 4.4 6.6 4.4c1.54 0 3.04.73 4 1.87 0.96-1.14 2.46-1.87 4-1.87 2.58 0 4.6 1.96 4.6 4.5 0 3.49-3.14 6.34-8.9 11.43l-1.2 1.02z"
            stroke="currentColor" stroke-width="1.6"></path>
    </svg>
  `;

  const likeCount = document.createElement('span');
  likeCount.className = 'prato-likes-count';
  likeCount.textContent = `0 curtidas`;

  actions.appendChild(likeBtn);
  actions.appendChild(likeCount);
  card.appendChild(actions);

  // ============= Integração Firebase + fallback localStorage =============
  const key = pratoKeyFrom(prato);

  // Fallback localStorage helpers
  function likeStorageKey(id) { return `cardapio_like_${id}`; }
  function getLocalLikeState(id) {
    try { return JSON.parse(localStorage.getItem(likeStorageKey(id)) || 'null'); }
    catch { return null; }
  }
  function setLocalLikeState(id, state) {
    localStorage.setItem(likeStorageKey(id), JSON.stringify(state));
  }
  function applyLocalToggle(id, btnEl, countEl) {
    const state = getLocalLikeState(id) || { liked: false, count: 0 };
    const wasLiked = !!state.liked;
    state.liked = !wasLiked;
    state.count = Math.max(0, state.count + (state.liked ? 1 : -1));
    setLocalLikeState(id, state);
    // UI
    if (btnEl) {
      btnEl.classList.toggle('liked', state.liked);
      btnEl.setAttribute('aria-pressed', String(state.liked));
    }
    if (countEl) countEl.textContent = `${state.count} curtidas`;
  }

  (async () => {
    const fb = await initFirebaseIfAvailable();
    if (!fb || !fb.db) {
      // Sem Firebase: usa somente localStorage
      const initial = getLocalLikeState(key) || { liked: false, count: 0 };
      likeBtn.classList.toggle('liked', !!initial.liked);
      likeBtn.setAttribute('aria-pressed', String(!!initial.liked));
      likeCount.textContent = `${initial.count} curtidas`;
      likeBtn.addEventListener('click', () => applyLocalToggle(key, likeBtn, likeCount));
      return;
    }

    const {
      db, onSnapshot, doc, collection, setDoc, deleteDoc,
      serverTimestamp, getCountFromServer
    } = fb;

    const likeDocRef   = doc(db, 'likes', key);
    const votesCollRef = collection(likeDocRef, 'votes');

    // Guarda última contagem “real” para reconciliar com agregado
    let lastRealCount = 0;

    // Busca contagem real no servidor (sem baixar todos os docs)
    async function fetchRealCountAndRender() {
      try {
        const agg = await getCountFromServer(votesCollRef);
        lastRealCount = (agg?.data()?.count) || 0;
        // Se já existe algo na UI, preserva o maior entre o visto e o real
        const visible = parseInt((likeCount.textContent || '0').replace(/\D/g,''), 10) || 0;
        const finalCount = Math.max(visible, lastRealCount);
        likeCount.textContent = `${finalCount} curtidas`;
        return finalCount;
      } catch (err) {
        console.warn('Falha ao obter contagem real de votos:', err);
        return null;
      }
    }

    // Primeiro: pinta a contagem real imediatamente
    await fetchRealCountAndRender();

    // 1) Assina o documento agregado likes/{key}
    onSnapshot(likeDocRef, (snap) => {
      const aggCount = (snap.exists() && typeof snap.data().count === 'number') ? snap.data().count : 0;
      // Reconciliamos sempre com a última contagem real conhecida
      const finalCount = Math.max(aggCount, lastRealCount);
      likeCount.textContent = `${finalCount} curtidas`;
    });

    // 2) Espera o uid e assina o voto do usuário para estado do botão
    const waitUid = setInterval(() => {
      if (!window.__fb?.uid) return;
      clearInterval(waitUid);

      const voteRef = doc(votesCollRef, window.__fb.uid);

      // Mantém estado do botão em tempo real
      onSnapshot(voteRef, (snap) => {
        const liked = snap.exists() ? !!snap.data().liked : false;
        likeBtn.classList.toggle('liked', liked);
        likeBtn.setAttribute('aria-pressed', String(liked));
      });

      // Clique com UI otimista + recálculo real pós-operação
      likeBtn.onclick = async () => {
        const likedNow = likeBtn.classList.contains('liked');
        const visible  = parseInt((likeCount.textContent || '0').replace(/\D/g,''), 10) || 0;
        // aplica delta otimista
        likeCount.textContent = `${Math.max(0, visible + (likedNow ? -1 : +1))} curtidas`;

        try {
          if (likedNow) {
            // descurtir => remover voto do usuário
            await deleteDoc(voteRef);
          } else {
            // curtir => gravar voto
            await setDoc(voteRef, { liked: true, ts: serverTimestamp() }, { merge: true });
          }
          // após sucesso, força contagem real para refletir imediatamente
          await fetchRealCountAndRender();
        } catch (e) {
          console.error('Erro ao alternar like via Firebase; revertendo e usando fallback local:', e);
          // reverte o otimista
          likeCount.textContent = `${visible} curtidas`;
          applyLocalToggle(key, likeBtn, likeCount);
        }
      };
    }, 100);
  })();

  return card;
}

// ===========================[ SOBRE / CONTROLES ]===============================
function renderizarSobre(sobre, flags) {
  const secaoSobre = document.getElementById('secaoSobre');
  const sobreNome = document.getElementById('sobreNome');
  const sobreInfo = document.getElementById('sobreInfo');

  if (!flags.mostrar_sessao_sobre) {
    secaoSobre.style.display = 'none';
    return;
  }

  secaoSobre.style.display = 'block';
  sobreNome.textContent = sobre.cozinheira || '';

  sobreInfo.innerHTML = '';

  if (flags.mostrar_endereco && sobre.endereco) {
    const enderecoEl = criarItemSobre(
      'Endereço',
      sobre.endereco,
      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>`
    );
    enderecoEl.classList.add('sobre-left');
    sobreInfo.appendChild(enderecoEl);
  }

  if (flags.mostrar_endereco && sobre.horario) {
    sobreInfo.appendChild(criarItemSobre(
      'Horário',
      sobre.horario,
      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>`
    ));
  }

  if (sobre.telefone) {
    sobreInfo.appendChild(criarItemSobre(
      'Telefone',
      sobre.telefone,
      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
      </svg>`
    ));
  }
}

function criarItemSobre(label, valor, iconeSvg) {
  const div = document.createElement('div');
  div.className = 'sobre-item';
  div.innerHTML = `
    ${iconeSvg}
    <div>
      <span class="sobre-label">${label}:</span>
      <span>${valor}</span>
    </div>
  `;
  return div;
}

function configurarBotoes(flags) {
  const btnAtualizar = document.getElementById('btnAtualizar');
  const btnOuvir = document.getElementById('btnOuvir');
  const btnWhatsApp = document.getElementById('btnWhatsApp');

  if (btnAtualizar) {
    btnAtualizar.addEventListener('click', () => {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
      }
      window.location.reload();
    });
  }

  if (btnOuvir && flags.mostrar_botao_ouvir && 'speechSynthesis' in window) {
    btnOuvir.style.display = 'inline-flex';
    btnOuvir.addEventListener('click', lerCardapio);
  }

  // 👉 Botão agora abre o fluxo de pedido completo
  if (btnWhatsApp) {
    if (flags.mostrar_whatsapp && menuData?.sobre?.whatsapp) {
      btnWhatsApp.addEventListener('click', (e) => {
        e.preventDefault();
        openOrderModal(); // abre o modal
      });
      btnWhatsApp.style.display = 'inline-flex';
    } else {
      btnWhatsApp.style.display = 'none';
    }
  }
}

// ------- Preços -------
// Se o prato no JSON tiver campo "preco", usa ele; senão, assume 25,00
function getDishPriceById(id) {
  const prato = (menuData?.pratos || []).find(p => String(p.id) === String(id));
  const val = Number(prato?.preco);
  return Number.isFinite(val) && val > 0 ? val : 25.00;
}

// ------- UI do modal -------
function openOrderModal() {
  const modal = document.getElementById('orderModal');
  const closeBtn = document.getElementById('ordClose');
  const cancelBtn = document.getElementById('ordCancel');
  const backdrop = modal.querySelector('.ord-backdrop');
  const form = document.getElementById('ordForm');
  const addBtn = document.getElementById('ordAddItem');
  const itemsBox = document.getElementById('ordItems');

  // monta um item inicial
  itemsBox.innerHTML = '';
  addOrderItemRow(itemsBox);
  // listeners
  addBtn.onclick = () => addOrderItemRow(itemsBox);
  form.oninput = updateOrderTotals;
  form.onsubmit = handleSubmitOrder;
  closeBtn.onclick = () => toggleOrderModal(false);
  cancelBtn.onclick = () => toggleOrderModal(false);
  backdrop.onclick = (e) => { if (e.target.dataset.close) toggleOrderModal(false); };

  // Prefill de dados
  try {
    const savedPhone = localStorage.getItem('userPhone');
    if (savedPhone) document.getElementById('cliFone').value = formatDisplayPhone(savedPhone);
  } catch(_) {}

  updateOrderTotals();
  toggleOrderModal(true);
}
function toggleOrderModal(show) {
  const modal = document.getElementById('orderModal');
  if (!modal) return;
  modal.classList.toggle('is-open', !!show);
  modal.setAttribute('aria-hidden', show ? 'false' : 'true');
}

// Cria uma linha (item) com select de prato e quantidade
function addOrderItemRow(container) {
  const pratosDisponiveis = (menuData?.pratos || []).filter(p => p.disponivel);

  const row = document.createElement('div');
  row.className = 'ord-item';

  // Select de prato (full width no mobile)
  const sel = document.createElement('select');
  sel.className = 'ord-sel';
  sel.setAttribute('aria-label', 'Escolha o prato');

  pratosDisponiveis.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    const preco = getDishPriceById(p.id);
    opt.textContent = `${p.nome} — R$ ${preco.toFixed(2).replace('.', ',')}`;
    sel.appendChild(opt);
  });

  // Linha de controles: stepper + remover
  const ctrls = document.createElement('div');
  ctrls.className = 'ord-ctrls';

  // Stepper (mobile-first)
  const stepper = document.createElement('div');
  stepper.className = 'ord-stepper';

  const minus = document.createElement('button');
  minus.type = 'button';
  minus.setAttribute('aria-label', 'Diminuir quantidade');
  minus.textContent = '−';

  const qty = document.createElement('input');
  qty.type = 'number';
  qty.min = '1';
  qty.value = '1';
  qty.inputMode = 'numeric';
  qty.pattern = '[0-9]*';
  qty.className = 'ord-qty';
  qty.setAttribute('aria-label', 'Quantidade');

  const plus = document.createElement('button');
  plus.type = 'button';
  plus.setAttribute('aria-label', 'Aumentar quantidade');
  plus.textContent = '+';

  stepper.appendChild(minus);
  stepper.appendChild(qty);
  stepper.appendChild(plus);

  // Remover
  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'ord-del';
  del.setAttribute('aria-label', 'Remover item');
  del.textContent = 'Remover';

  ctrls.appendChild(stepper);
  ctrls.appendChild(del);

  // Eventos
  const clampQty = () => {
    const n = Math.max(1, Number(qty.value || 1));
    qty.value = String(n);
  };

  sel.addEventListener('change', updateOrderTotals);
  qty.addEventListener('input', () => { clampQty(); updateOrderTotals(); });

  minus.addEventListener('click', () => {
    qty.value = String(Math.max(1, Number(qty.value || 1) - 1));
    updateOrderTotals();
  });

  plus.addEventListener('click', () => {
    qty.value = String(Number(qty.value || 1) + 1);
    updateOrderTotals();
  });

  del.addEventListener('click', () => {
    row.remove();
    updateOrderTotals();
  });

  // Monta
  row.appendChild(sel);
  row.appendChild(ctrls);
  container.appendChild(row);

  // recalcula ao inserir
  updateOrderTotals();
}

// Calcula e pinta subtotal, desconto, frete e total
function updateOrderTotals() {
  const itemsBox = document.getElementById('ordItems');
  const rows = [...itemsBox.querySelectorAll('.ord-item')];
  let subtotal = 0;

  rows.forEach(r => {
    const sel = r.querySelector('.ord-sel');
    const qty = Number(r.querySelector('.ord-qty')?.value || 0);
    if (!sel?.value || !Number.isFinite(qty) || qty <= 0) return;
    const unit = getDishPriceById(sel.value);
    subtotal += unit * qty;
  });

  // desconto 10% sobre subtotal
  const desconto = subtotal * 0.10;

  // frete: Rio Quente = 0, Esplanada = 5
  const localVal = (document.querySelector('input[name="cliLocal"]:checked')?.value) || 'rio-quente';
  const frete = localVal === 'esplanada' ? 5.00 : 0.00;

  const total = Math.max(0, subtotal - desconto) + frete;

  // pinta
  document.getElementById('tSub').textContent   = money(subtotal);
  document.getElementById('tDesc').textContent  = `- ${money(desconto)}`;
  document.getElementById('tFrete').textContent = money(frete);
  document.getElementById('tTotal').textContent = money(total);
}

function money(n){ return `R$ ${Number(n||0).toFixed(2).replace('.', ',')}`; }

// ------- Envio: grava no Firebase (se disponível) e manda pro WhatsApp -------
async function handleSubmitOrder(e) {
  e.preventDefault();
  const f = e.currentTarget;

  const nome = (document.getElementById('cliNome').value || '').trim();
  const foneDisplay = (document.getElementById('cliFone').value || '').trim();
  const foneDigits = foneDisplay.replace(/\D/g,'');
  const end = (document.getElementById('cliEndereco').value || '').trim();
  const obs = (document.getElementById('cliObs').value || '').trim();
  const localVal = (document.querySelector('input[name="cliLocal"]:checked')?.value) || 'rio-quente';

  if (!nome || !foneDigits || !end) {
    alert('Preencha nome, WhatsApp e endereço.');
    return;
  }

  // guarda o Whats do cliente
  try { localStorage.setItem('userPhone', foneDigits); } catch(_) {}

  // coleta itens
  const items = [];
  const rows = [...document.querySelectorAll('#ordItems .ord-item')];
  rows.forEach(r => {
    const id = r.querySelector('.ord-sel')?.value;
    const qtd = Number(r.querySelector('.ord-qty')?.value || 0);
    if (!id || qtd <= 0) return;
    const prato = (menuData?.pratos || []).find(p => String(p.id) === String(id));
    const unit = getDishPriceById(id);
    items.push({
      id,
      nome: prato?.nome || String(id),
      preco: unit,
      qtd,
      total: unit * qtd
    });
  });
  if (!items.length) { alert('Adicione pelo menos 1 item.'); return; }

  // totais
  const subtotal = items.reduce((s,i)=>s+i.total,0);
  const desconto = subtotal * 0.10;
  const frete = localVal === 'esplanada' ? 5.00 : 0.00;
  const total = Math.max(0, subtotal - desconto) + frete;

  // 👉 pede geolocalização (não bloqueia o fluxo se falhar)
  const coords = await requestLocation().catch(()=>null);
  const mapsLink = buildMapsLink(coords);

  // payload
  const payload = {
    cliente: {
      nome,
      foneE164: normalizePhoneToE164(foneDigits),
      foneDisplay,
      endereco: end,
      local: localVal,
      geo: coords ? { ...coords, maps: mapsLink } : null
    },
    itens: items,
    financeiro: { subtotal, desconto, frete, total, moeda: 'BRL', origem: 'site-10off' },
    obs,
    criadoEm: new Date().toISOString(),
    status: 'novo'
  };

  // grava
  let orderId = null;
  try {
    const fb = await initFirebaseIfAvailable();
    if (fb && fb.db) {
      const { db, collection, doc, setDoc, serverTimestamp } = fb;
      const autoId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
      const ref = doc(collection(db, 'orders'), autoId);
      await setDoc(ref, { ...payload, ts: serverTimestamp() }, { merge: true });
      orderId = autoId;
    } else {
      const arr = JSON.parse(localStorage.getItem('orders') || '[]');
      orderId = 'local-' + (Date.now());
      arr.push({ id: orderId, ...payload });
      localStorage.setItem('orders', JSON.stringify(arr));
    }
  } catch (err) {
    console.warn('Falha ao gravar no Firebase; salvando localmente:', err);
    const arr = JSON.parse(localStorage.getItem('orders') || '[]');
    orderId = 'local-' + (Date.now());
    arr.push({ id: orderId, ...payload });
    localStorage.setItem('orders', JSON.stringify(arr));
  }

  // WhatsApp
  const numeroLoja = (menuData?.sobre?.whatsapp || '').replace(/\D/g,'');
  if (!numeroLoja) { alert('WhatsApp da loja não configurado.'); return; }

  const resumo = buildOrderMessage(payload, orderId); // já inclui o link do Maps
  const { primary, fallback } = buildWaLinks(numeroLoja, resumo);

  toggleOrderModal(false);

  try {
    window.location.href = primary;
    setTimeout(() => {
      if (document.visibilityState === 'visible') window.location.href = fallback;
    }, 350);
  } catch {
    window.location.href = fallback;
  }
}

function normalizePhoneToE164(digits) {
  const d = (digits||'').replace(/\D/g,'');
  if (d.startsWith('55')) return '+'+d;    // já no país BR
  if (d.length === 11 || d.length === 10) return '+55'+d;
  return '+'+d;
}

function buildOrderMessage(pedido, orderId) {
  const loc = pedido.cliente.local === 'esplanada' ? 'Esplanada (R$ 5,00)' : 'Rio Quente (Grátis)';
  const linhas = [];
  linhas.push(`🧾 *Novo pedido via site* ${orderId ? `(#${orderId})` : ''}`);
  linhas.push(`👤 *Cliente:* ${pedido.cliente.nome}`);
  linhas.push(`📱 *WhatsApp:* ${pedido.cliente.foneDisplay || pedido.cliente.foneE164}`);
  linhas.push(`🏠 *Endereço:* ${pedido.cliente.endereco}`);
  linhas.push(`🚚 *Entrega:* ${loc}`);
  if (pedido.obs) linhas.push(`📝 *Obs.:* ${pedido.obs}`);

  linhas.push('');
  linhas.push('🍽️ *Itens:*');
  pedido.itens.forEach((i, idx) => {
    linhas.push(`${idx+1}. ${i.nome}  x${i.qtd} — ${money(i.preco)} (linha: ${money(i.total)})`);
  });

  linhas.push('');
  linhas.push(`Subtotal: ${money(pedido.financeiro.subtotal)}`);
  linhas.push(`Desconto do site (10%): - ${money(pedido.financeiro.desconto)}`);
  linhas.push(`Entrega: ${money(pedido.financeiro.frete)}`);
  linhas.push(`*Total:* ${money(pedido.financeiro.total)}`);

  linhas.push('');
  linhas.push('_Pedido com 10% de desconto realizado pelo site._');

  return linhas.join('\n');
}

// ===============================[ LIGHTBOX, ETC ]===============================
let LB_STATE = { images: [], index: 0, title: '' };

function ensureLightboxRoot(){
  if (document.getElementById('lbBackdrop')) return;
  const wrap = document.createElement('div');
  wrap.className = 'lb-backdrop';
  wrap.id = 'lbBackdrop';
  wrap.setAttribute('role','dialog');
  wrap.setAttribute('aria-modal','true');
  wrap.setAttribute('aria-label','Galeria de imagens do prato');

  wrap.innerHTML = `
    <div class="lb-content">
      <button class="lb-close" id="lbClose" aria-label="Fechar">
        <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <button class="lb-prev" id="lbPrev" aria-label="Anterior">
        <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      <img class="lb-img" id="lbImg" alt="Imagem do prato">

      <button class="lb-next" id="lbNext" aria-label="Próxima">
        <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>

      <div class="lb-counter" id="lbCounter">1/1</div>
    </div>
  `;
  document.body.appendChild(wrap);

  document.getElementById('lbClose').addEventListener('click', closeLightbox);
  document.getElementById('lbPrev').addEventListener('click', () => stepLightbox(-1));
  document.getElementById('lbNext').addEventListener('click', () => stepLightbox(1));
  wrap.addEventListener('click', (e) => { if (e.target === wrap) closeLightbox(); });

  window.addEventListener('keydown', (e) => {
    const open = document.getElementById('lbBackdrop')?.classList.contains('is-open');
    if (!open) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') stepLightbox(1);
    if (e.key === 'ArrowLeft') stepLightbox(-1);
  });

  let startX = null;
  wrap.addEventListener('touchstart', (e) => { startX = e.changedTouches[0].clientX; }, {passive:true});
  wrap.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) stepLightbox(dx < 0 ? 1 : -1);
    startX = null;
  });
}

function montarMensagemBase() { return "Olá gostaria de fazer um pedido!"; }

function getUserPhone() {
  const saved = localStorage.getItem('userPhone');
  if (saved) return saved;
  const entrada = prompt('Informe seu WhatsApp com DDD (ex: 62900000000):') || "";
  const digits = entrada.replace(/\D/g, "");
  if (digits) localStorage.setItem('userPhone', digits);
  return digits;
}

function formatDisplayPhone(digits) {
  if (!digits) return "";
  const d = digits.replace(/\D/g, "");
  if (d.length === 13 && d.startsWith('55')) { return `+${d.slice(0,2)} (${d.slice(2,4)}) ${d.slice(4,5)} ${d.slice(5,9)}-${d.slice(9)}`; }
  if (d.length === 12 && d.startsWith('55')) { return `+${d.slice(0,2)} (${d.slice(2,4)}) ${d.slice(4,8)}-${d.slice(8)}`; }
  if (d.length === 11) { return `(${d.slice(0,2)}) ${d.slice(2,3)} ${d.slice(3,7)}-${d.slice(7)}`; }
  if (d.length === 10) { return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`; }
  return digits;
}

function requestLocation(options = { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }) {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      options
    );
  });
}

function buildMapsLink(coords) {
  if (!coords) return "";
  const { lat, lng } = coords;
  return `https://maps.google.com/?q=${lat},${lng}`;
}

function buildWaLinks(phoneDigits, mensagem) {
  const p = (phoneDigits || "").replace(/\D/g, "");
  const t = encodeURIComponent(mensagem || "");
  return { primary: `https://wa.me/${p}?text=${t}`, fallback: `https://api.whatsapp.com/send?phone=${p}&text=${t}` };
}

function openLightbox(images, startIndex = 0, title = ''){
  if (!images || !images.length) return;
  ensureLightboxRoot();
  LB_STATE.images = images;
  LB_STATE.index = Math.max(0, Math.min(startIndex, images.length - 1));
  LB_STATE.title = title || 'Imagem do prato';
  const backdrop = document.getElementById('lbBackdrop');
  backdrop.classList.add('is-open');
  updateLightbox();
}

function updateLightbox(){
  const img = document.getElementById('lbImg');
  const counter = document.getElementById('lbCounter');
  const { images, index, title } = LB_STATE;
  img.src = images[index];
  img.alt = `${title} (${index+1}/${images.length})`;
  counter.textContent = `${index+1}/${images.length}`;
}

function stepLightbox(delta){
  const { images } = LB_STATE;
  LB_STATE.index = (LB_STATE.index + delta + images.length) % images.length;
  updateLightbox();
}

function closeLightbox(){
  const backdrop = document.getElementById('lbBackdrop');
  if (backdrop) backdrop.classList.remove('is-open');
}

function compartilharWhatsApp() {
  if (!menuData) return;
  const { meta, opcoes_do_dia, pratos, sobre } = menuData;
  const numeroWhatsApp = sobre.whatsapp?.replace(/\D/g, '');
  if (!numeroWhatsApp) { alert('Número de WhatsApp não informado.'); return; }

  let mensagem = `🍽️ *${meta.titulo_dia}*\n\n`;
  const pratosDisponiveis = pratos.filter(p => p.disponivel).slice(0, opcoes_do_dia);
  pratosDisponiveis.forEach((prato, index) => {
    mensagem += `${index + 1}. *${prato.nome}*\n`;
    if (prato.itens?.length) mensagem += `${prato.itens.join(', ')}\n`;
    mensagem += '\n';
  });
  mensagem += `📍 ${sobre.endereco}\n🕒 ${sobre.horario}\n📞 ${sobre.telefone}\n\n_Faça seu pedido pelo WhatsApp!_`;

  const mensagemEncoded = encodeURIComponent(mensagem);
  window.location.href = `https://wa.me/${numeroWhatsApp}?text=${mensagemEncoded}`;
}

function lerCardapio() {
  if (!('speechSynthesis' in window)) { alert('Seu navegador não suporta leitura em voz alta.'); return; }
  if (window.speechSynthesis.speaking) { window.speechSynthesis.cancel(); return; }
  if (!menuData) return;

  const { meta, opcoes_do_dia, pratos } = menuData;
  const pratosDisponiveis = pratos.filter(p => p.disponivel).slice(0, opcoes_do_dia);

  let texto = `${meta.titulo_dia}. `;
  pratosDisponiveis.forEach((prato, index) => {
    texto += `Opção ${index + 1}: ${prato.nome}. `;
    if (prato.itens && prato.itens.length > 0) {
      texto += `Acompanha: ${prato.itens.join(', ')}. `;
    }
  });
  lerTexto(texto);
}

function buildWhatsLink(numeroE164, mensagem) {
  const phone = (numeroE164 || "").replace(/\D/g, "");
  const text = encodeURIComponent(mensagem || "");
  return { primary: `https://wa.me/${phone}?text=${text}`, fallback: `https://api.whatsapp.com/send?phone=${phone}&text=${text}` };
}

function montarMensagemWhats(meta, pratos, opcoes_do_dia, sobre) {
  const pratosDisponiveis = pratos.filter(p => p.disponivel).slice(0, opcoes_do_dia);
  let msg = `🍽️ *${meta.titulo_dia}*\n\n`;
  pratosDisponiveis.forEach((prato, i) => {
    msg += `${i + 1}. *${prato.nome}*\n`;
    if (prato.itens?.length) msg += `${prato.itens.join(', ')}\n`;
    msg += '\n';
  });
  if (sobre.endereco) msg += `📍 ${sobre.endereco}\n`;
  if (sobre.horario) msg += `🕒 ${sobre.horario}\n`;
  if (sobre.telefone) msg += `📞 ${sobre.telefone}\n`;
  msg += `\n_Faça seu pedido pelo WhatsApp!_`;
  return msg;
}

// ===============================[ UTILS GERAIS ]================================
const $ = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => [...ctx.querySelectorAll(sel)];

function timeAgo(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  const diff = (Date.now() - d.getTime()) / 1000;
  const map = [
    [60, 'seg'], [3600, 'min'], [86400, 'h'], [604800, 'd'], [2629800, 'm'], [31557600, 'a']
  ];
  for (let i = 0; i < map.length; i++) {
    const [limit, label] = map[i];
    if (diff < limit) {
      const val = Math.max(1, Math.floor(diff / (limit / (i === 0 ? 60 : i === 1 ? 60 : i === 2 ? 24 : i === 3 ? 7 : i === 4 ? 12 : 1))));
      return `há ${val} ${label}`;
    }
  }
  return 'agora';
}

// ===============================[ ONLINE/OFFLINE ]==============================
window.addEventListener('online', () => {
  const el = document.getElementById('offlineAlert');
  if (el) el.style.display = 'none';
});
window.addEventListener('offline', () => {
  const el = document.getElementById('offlineAlert');
  if (el) el.style.display = 'flex';
});

// ===============================[ BOOTSTRAP ]===================================
document.addEventListener('DOMContentLoaded', async () => {
  // inicializa Firebase se houver env; se não houver, segue com localStorage
  await initFirebaseIfAvailable();
  await carregarMenu();
});

// ===============================[ EXEMPLO ENV ]=================================
// Crie um arquivo público "env.js" carregado antes deste script com algo assim:
//
// window.env = {
//   VITE_FIREBASE_API_KEY: "AIzaSy...",
//   VITE_FIREBASE_AUTH_DOMAIN: "seu-projeto.firebaseapp.com",
//   VITE_FIREBASE_PROJECT_ID: "seu-projeto",
//   VITE_FIREBASE_STORAGE_BUCKET: "seu-projeto.appspot.com",
//   VITE_FIREBASE_MESSAGING_SENDER_ID: "1234567890",
//   VITE_FIREBASE_APP_ID: "1:1234567890:web:abcdef0123456789",
//   AUTHORIZED_DOMAINS: ["localhost","127.0.0.1","seu-dominio.com"] // opcional
// };
