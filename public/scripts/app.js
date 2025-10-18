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

async function carregarMenu() {
  const loading = document.getElementById('loading');
  const cardapioContainer = document.getElementById('cardapio');
  const offlineAlert = document.getElementById('offlineAlert');

  try {
    loading.style.display = 'block';

    const response = await fetch('/data/menu.json', {
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error('Arquivo não encontrado');
    }

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

    const opcoes = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };

    return data.toLocaleDateString('pt-BR', opcoes);
  } catch (error) {
    return dataStr;
  }
}

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

    // Clique na imagem também abre
    media.addEventListener('click', () => {
      const imagens = prato.galeria && prato.galeria.length ? prato.galeria : [capa];
      openLightbox(imagens, 0, prato.nome);
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

  return card;
}

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
    sobreInfo.appendChild(criarItemSobre(
      'Endereço',
      sobre.endereco,
      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>`
    ));
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

  btnAtualizar.addEventListener('click', () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
    }

    window.location.reload();
  });

  if (flags.mostrar_botao_ouvir && 'speechSynthesis' in window) {
    btnOuvir.style.display = 'inline-flex';
    btnOuvir.addEventListener('click', lerCardapio);
  }

  if (flags.mostrar_whatsapp && menuData.sobre.whatsapp) {
    btnWhatsApp.style.display = 'inline-flex';
    btnWhatsApp.addEventListener('click', compartilharWhatsApp);
  } else {
    btnWhatsApp.style.display = 'none';
  }
}

// ---------- LIGHTBOX / CARROSSEL ----------
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

  // Eventos básicos
  document.getElementById('lbClose').addEventListener('click', closeLightbox);
  document.getElementById('lbPrev').addEventListener('click', () => stepLightbox(-1));
  document.getElementById('lbNext').addEventListener('click', () => stepLightbox(1));
  wrap.addEventListener('click', (e) => { if (e.target === wrap) closeLightbox(); });

  // Teclado
  window.addEventListener('keydown', (e) => {
    const open = document.getElementById('lbBackdrop')?.classList.contains('is-open');
    if (!open) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') stepLightbox(1);
    if (e.key === 'ArrowLeft') stepLightbox(-1);
  });

  // Gestos (toque)
  let startX = null;
  wrap.addEventListener('touchstart', (e) => { startX = e.changedTouches[0].clientX; }, {passive:true});
  wrap.addEventListener('touchend', (e) => {
    if (startX == null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) stepLightbox(dx < 0 ? 1 : -1);
    startX = null;
  });
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

  const pratosDisponiveis = pratos.filter(p => p.disponivel).slice(0, opcoes_do_dia);

  let mensagem = `🍽️ *${meta.titulo_dia}*\n\n`;

  pratosDisponiveis.forEach((prato, index) => {
    mensagem += `${index + 1}. *${prato.nome}*\n`;
    if (prato.itens && prato.itens.length > 0) {
      mensagem += `${prato.itens.join(', ')}\n`;
    }
    mensagem += '\n';
  });

  if (sobre.endereco) {
    mensagem += `📍 ${sobre.endereco}\n`;
  }

  if (sobre.horario) {
    mensagem += `🕒 ${sobre.horario}\n`;
  }

  if (sobre.telefone) {
    mensagem += `📞 ${sobre.telefone}\n`;
  }

  mensagem += '\n_Faça seu pedido pelo WhatsApp!_';

  const numeroWhatsApp = sobre.whatsapp.replace(/\D/g, '');
  const mensagemEncoded = encodeURIComponent(mensagem);
  const url = `https://wa.me/${numeroWhatsApp}?text=${mensagemEncoded}`;

  window.open(url, '_blank');
}

function lerCardapio() {
  if (!('speechSynthesis' in window)) {
    alert('Seu navegador não suporta leitura em voz alta.');
    return;
  }

  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    return;
  }

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

window.addEventListener('online', () => {
  document.getElementById('offlineAlert').style.display = 'none';
});

window.addEventListener('offline', () => {
  document.getElementById('offlineAlert').style.display = 'flex';
});

document.addEventListener('DOMContentLoaded', carregarMenu);
