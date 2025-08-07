// WhatsApp Configuration Page

document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    // Elementos do DOM
    const qrContainer = document.getElementById('qrContainer');
    const qrPlaceholder = document.getElementById('qrPlaceholder');
    const qrLoadingSpinner = document.getElementById('qrLoadingSpinner');
    const qrError = document.getElementById('qrError');
    const refreshQrBtn = document.getElementById('refreshQrBtn');
    const logoutWhatsAppBtn = document.getElementById('logoutWhatsAppBtn');
    const statusIndicator = document.getElementById('connectionStatus');
    const statusDot = statusIndicator?.querySelector('.status-dot');
    const statusText = statusIndicator?.querySelector('.status-text');
    const waStatus = document.getElementById('wa-status');
    const waStatusIndicator = document.getElementById('wa-status-indicator');
    const waStatusText = document.getElementById('wa-status-text');

    let currentStatus = 'desconhecido';
    let reconnectTimeout = null;

    function setStatus(status) {
        currentStatus = status;
        // Atualiza status visual principal
        if (statusIndicator && statusDot && statusText) {
            switch (status) {
                case 'ready':
                    statusDot.style.background = '#4caf50';
                    statusText.textContent = 'Conectado';
                    statusIndicator.setAttribute('aria-label', 'Conectado ao WhatsApp');
                    break;
                case 'qr':
                    statusDot.style.background = '#ff9800';
                    statusText.textContent = 'Aguardando QR Code';
                    statusIndicator.setAttribute('aria-label', 'Aguardando leitura do QR Code');
                    break;
                case 'disconnected':
                    statusDot.style.background = '#f44336';
                    statusText.textContent = 'Desconectado';
                    statusIndicator.setAttribute('aria-label', 'Desconectado do WhatsApp');
                    break;
                case 'erro':
                    statusDot.style.background = '#b71c1c';
                    statusText.textContent = 'Erro na conexão';
                    statusIndicator.setAttribute('aria-label', 'Erro na conexão do WhatsApp');
                    break;
                default:
                    statusDot.style.background = '#ccc';
                    statusText.textContent = 'Desconhecido';
                    statusIndicator.setAttribute('aria-label', 'Status desconhecido');
            }
        }
        // Atualiza status secundário (wa-status)
        if (waStatusIndicator && waStatusText) {
            switch (status) {
                case 'ready':
                    waStatusIndicator.style.background = '#4caf50';
                    waStatusText.textContent = 'Status: Conectado ao WhatsApp';
                    break;
                case 'qr':
                    waStatusIndicator.style.background = '#ff9800';
                    waStatusText.textContent = 'Status: Aguardando leitura do QRCode';
                    break;
                case 'disconnected':
                    waStatusIndicator.style.background = '#f44336';
                    waStatusText.textContent = 'Status: Desconectado do WhatsApp';
                    break;
                case 'erro':
                    waStatusIndicator.style.background = '#b71c1c';
                    waStatusText.textContent = 'Status: Erro na conexão do WhatsApp';
                    break;
                default:
                    waStatusIndicator.style.background = '#ccc';
                    waStatusText.textContent = 'Status: Desconhecido';
            }
        }
        // Habilita/desabilita botões
        if (refreshQrBtn) refreshQrBtn.disabled = (status === 'ready');
        if (logoutWhatsAppBtn) logoutWhatsAppBtn.disabled = (status !== 'ready');
    }

    function showQrLoading() {
        if (qrLoadingSpinner) qrLoadingSpinner.style.display = '';
        if (qrPlaceholder) qrPlaceholder.style.display = 'none';
        if (qrError) qrError.style.display = 'none';
    }
    function showQrPlaceholder() {
        if (qrLoadingSpinner) qrLoadingSpinner.style.display = 'none';
        if (qrPlaceholder) qrPlaceholder.style.display = '';
        if (qrError) qrError.style.display = 'none';
    }
    function showQrError(msg) {
        if (qrLoadingSpinner) qrLoadingSpinner.style.display = 'none';
        if (qrPlaceholder) qrPlaceholder.style.display = 'none';
        if (qrError) {
            qrError.style.display = '';
            qrError.textContent = msg;
        }
    }

    // Eventos do Socket.IO
    socket.on('ready', () => {
        setStatus('ready');
        // Limpa o QR Code ao conectar
        if (qrContainer) qrContainer.innerHTML = '';
        showQrPlaceholder();
        if (qrPlaceholder) {
            qrPlaceholder.textContent = 'WhatsApp conectado!';
            qrPlaceholder.style.display = '';
        }
        if (qrError) qrError.style.display = 'none';
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
    });
    socket.on('qr', (qrBase64) => {
        setStatus('qr');
        // Exibe o QR Code
        if (qrContainer) qrContainer.innerHTML = `<img src="data:image/png;base64,${qrBase64}" alt="QR Code do WhatsApp" style="width:220px;height:220px;" />`;
        if (qrPlaceholder) {
            qrPlaceholder.textContent = 'Aguardando leitura do QR Code...';
            qrPlaceholder.style.display = '';
        }
        if (qrError) qrError.style.display = 'none';
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
    });
    socket.on('disconnected', () => {
        setStatus('disconnected');
        // Limpa o QR Code ao desconectar
        if (qrContainer) qrContainer.innerHTML = '';
        showQrPlaceholder();
        if (qrPlaceholder) {
            qrPlaceholder.textContent = 'Desconectado. Clique em Atualizar QR Code para reconectar.';
            qrPlaceholder.style.display = '';
        }
        if (qrError) qrError.style.display = 'none';
        // Tenta reconectar automaticamente após 5s
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(() => {
            socket.emit('requestQR');
        }, 5000);
    });
    socket.on('error', (msg) => {
        setStatus('erro');
        let helpMsg = 'Erro na conexão com o WhatsApp: ' + (msg || 'Tente novamente.') + '\n';
        helpMsg += '\nSugestões:\n- Verifique se o servidor está rodando normalmente.\n- Clique em "Atualizar QR Code" para tentar reconectar.\n- Se o erro persistir, reinicie o servidor.\n- Confira se o Chrome/Chromium está instalado corretamente no servidor.';
        showQrError(helpMsg);
        if (qrContainer) qrContainer.innerHTML = '';
        if (qrPlaceholder) qrPlaceholder.style.display = 'none';
        // Tenta reconectar após 10s
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(() => {
            socket.emit('requestQR');
        }, 10000);
    });

    // Botão para atualizar QR Code
    if (refreshQrBtn) {
        refreshQrBtn.addEventListener('click', () => {
            setStatus('qr');
            showQrLoading();
            socket.emit('requestQR');
        });
    }
    // Botão para logout
    if (logoutWhatsAppBtn) {
        logoutWhatsAppBtn.addEventListener('click', () => {
            setStatus('disconnected');
            showQrLoading();
            socket.emit('logout');
        });
    }

    // Solicita status ao conectar
    socket.emit('checkStatus');
    setStatus('desconhecido');
    showQrLoading();

    // Acessibilidade: status ao vivo
    if (statusIndicator) {
        statusIndicator.setAttribute('aria-live', 'polite');
        statusIndicator.setAttribute('aria-atomic', 'true');
    }
});

document.addEventListener('DOMContentLoaded', function() {
  if (window.logAction) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR');
    window.logAction('whatsapp_config_access', `Acesso à configuração do WhatsApp em ${dateStr} às ${timeStr}`, 'info');
  }
});


