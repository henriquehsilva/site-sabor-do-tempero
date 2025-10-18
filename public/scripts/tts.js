function lerTexto(texto) {
  if (!('speechSynthesis' in window)) {
    console.warn('Speech Synthesis não disponível neste navegador');
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(texto);

  utterance.lang = 'pt-BR';
  utterance.rate = 0.9;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  const vozes = window.speechSynthesis.getVoices();
  const vozPTBR = vozes.find(voz => voz.lang.includes('pt-BR') || voz.lang.includes('pt'));

  if (vozPTBR) {
    utterance.voice = vozPTBR;
  }

  utterance.onstart = () => {
    console.log('Iniciando leitura...');
    const btnOuvir = document.getElementById('btnOuvir');
    if (btnOuvir) {
      btnOuvir.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="6" y="4" width="4" height="16"/>
          <rect x="14" y="4" width="4" height="16"/>
        </svg>
        Parar
      `;
    }
  };

  utterance.onend = () => {
    console.log('Leitura finalizada');
    resetarBotaoOuvir();
  };

  utterance.onerror = (event) => {
    console.error('Erro na leitura:', event.error);
    resetarBotaoOuvir();
  };

  window.speechSynthesis.speak(utterance);
}

function resetarBotaoOuvir() {
  const btnOuvir = document.getElementById('btnOuvir');
  if (btnOuvir) {
    btnOuvir.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      </svg>
      Ouvir
    `;
  }
}

if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    const vozes = window.speechSynthesis.getVoices();
    console.log('Vozes disponíveis:', vozes.length);
  };
}
