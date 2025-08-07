// Add headers configuration at the top

const headers = {
    'Content-Type': 'application/json',
    'Authorization': localStorage.getItem('token')
};

// DOM Elements
const systemLogs = document.getElementById('systemLogs');
const refreshLogsBtn = document.getElementById('refreshLogsBtn');
const clearLogsBtn = document.getElementById('clearLogsBtn');
// --- ENVIO EM MASSA DE MENSAGENS ---

let selectedBulkType = 'reminder'; // default

const sendBulkReminderBtn = document.getElementById('sendBulkReminderBtn');
const sendBulkDayMessageBtn = document.getElementById('sendBulkDayMessageBtn');
const sendBulkWelcomeBtn = document.getElementById('sendBulkWelcomeBtn');
const sendBulkGRBtn = document.getElementById('sendBulkGRBtn');
const bulkRecipients = document.getElementById('bulkRecipients');
const executeBulkActionBtn = document.getElementById('executeBulkActionBtn');
const massMessageStatus = document.getElementById('massMessageStatus');

// Load initial data
document.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth()) return;
  loadSystemLogs();
});

// Event Listeners
if (sendBulkGRBtn) {
    sendBulkGRBtn.onclick = () => {
        selectedBulkType = 'day';
        sendBulkReminderBtn.classList.remove('btn-primary');
        sendBulkDayMessageBtn.classList.add('btn-primary');
        sendBulkWelcomeBtn.classList.remove('btn-primary');
        loadMessageTemplates('day');
        // Seleciona automaticamente a opção GR Sacerdotes no dropdown
        setTimeout(() => {
            const templateSelect = document.getElementById('messageTemplateSelect');
            if (templateSelect) templateSelect.value = 'grSacerdotes';
        }, 100);
    };
}
refreshLogsBtn.addEventListener('click', loadSystemLogs);
clearLogsBtn.addEventListener('click', clearSystemLogs);

// Load system logs
async function loadSystemLogs() {
    try {
        const response = await fetch('/db/logs.json');
        if (!response.ok) throw new Error('Failed to load logs');
        const logs = await response.json();
        renderSystemLogs(logs);
        showToast('Logs atualizados com sucesso');
    } catch (error) {
        console.error('Error loading logs:', error);
        showToast('Erro ao carregar logs', 'error');
    }
}

// Clear system logs
async function clearSystemLogs() {
    if (!confirm('Tem certeza que deseja limpar todos os logs do sistema?')) return;
    
    // Apenas limpa visualmente, pois não há backend para deletar logs
    systemLogs.innerHTML = '';
    showToast('Logs limpos com sucesso');
}

// Render system logs
function renderSystemLogs(logs) {
    systemLogs.innerHTML = logs.map(log => `
        <div class="log-entry ${log.level}">
            <span class="log-timestamp">${new Date(log.timestamp).toLocaleString()}</span>
            <span class="log-level">${log.level}</span>
            <span class="log-message">${log.message}</span>
        </div>
    `).join('');
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.querySelectorAll('.toast').forEach(t => t.remove());
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

// Carrega contatos do contacts.json
async function loadBulkRecipients() {
    try {
        const res = await fetch('../db/contacts.json');
        if (!res.ok) throw new Error('Erro ao carregar contatos');
        const contacts = await res.json();
        // Limpa e adiciona opção "Enviar para todos"
        bulkRecipients.innerHTML = '<option value="__all__">Enviar para todos</option>';
        contacts.filter(c => c && c._id && c.name).forEach(c => {
            const opt = document.createElement('option');
            opt.value = c._id;
            opt.textContent = `${c.name} (${c.phone || ''})`;
            bulkRecipients.appendChild(opt);
        });
        updateSelectedCount();
    } catch (e) {
        bulkRecipients.innerHTML = '<option>Erro ao carregar contatos</option>';
    }
}

// Carregar destinatários (contatos ou membros)
async function loadRecipients(type) {
    const select = document.getElementById('bulkRecipients');
    select.innerHTML = '';
    let url = type === 'members' ? '../db/members.json' : '../db/contacts.json';
    let res;
    try {
        res = await fetch(url);
    } catch {
        select.innerHTML = '<option>Erro ao carregar destinatários</option>';
        return;
    }
    let data = await res.json();
    if (!Array.isArray(data)) data = [];
    // Adiciona opção "Enviar para todos" apenas para contatos
    if (type === 'contacts') {
        select.innerHTML += '<option value="__all__">Enviar para todos</option>';
    }
    data.forEach(item => {
        if (item && item._id && item.name) {
            select.innerHTML += `<option value="${item._id}">${item.name} (${item.phone || ''})</option>`;
        }
    });
    updateSelectedCount();
}

// Troca entre contatos e membros
const recipientTypeSelect = document.getElementById('recipientType');
if (recipientTypeSelect) {
    recipientTypeSelect.addEventListener('change', e => {
        loadRecipients(e.target.value);
    });
    // Carregar inicialmente contatos
    loadRecipients(recipientTypeSelect.value);
}

document.getElementById('selectAllBtn').onclick = () => {
    Array.from(bulkRecipients.options).forEach(opt => opt.selected = true);
    updateSelectedCount();
};

document.getElementById('clearSelectionBtn').onclick = () => {
    Array.from(bulkRecipients.options).forEach(opt => opt.selected = false);
    updateSelectedCount();
};

bulkRecipients.onchange = updateSelectedCount;

function updateSelectedCount() {
    const selected = Array.from(bulkRecipients.selectedOptions);
    document.getElementById('selectedCount').textContent = 
        `${selected.length} ${selected.length === 1 ? 'selecionado' : 'selecionados'}`;
}

// Seleção de tipo de mensagem
sendBulkReminderBtn.onclick = () => {
    selectedBulkType = 'reminder';
    sendBulkReminderBtn.classList.add('btn-primary');
    sendBulkDayMessageBtn.classList.remove('btn-primary');
    sendBulkWelcomeBtn.classList.remove('btn-primary');
    loadMessageTemplates('reminder');
};
sendBulkDayMessageBtn.onclick = () => {
    selectedBulkType = 'day';
    sendBulkReminderBtn.classList.remove('btn-primary');
    sendBulkDayMessageBtn.classList.add('btn-primary');
    sendBulkWelcomeBtn.classList.remove('btn-primary');
    loadMessageTemplates('day');
};
sendBulkWelcomeBtn.onclick = () => {
    selectedBulkType = 'welcome';
    sendBulkReminderBtn.classList.remove('btn-primary');
    sendBulkDayMessageBtn.classList.remove('btn-primary');
    sendBulkWelcomeBtn.classList.add('btn-primary');
    loadMessageTemplates('welcome');
};

// Envio em massa
executeBulkActionBtn.onclick = async () => {
    massMessageStatus.textContent = '';
    let selected = Array.from(bulkRecipients.selectedOptions).map(o => o.value);
    if (selected.includes('__all__')) {
        // Se "Enviar para todos" está selecionado, pega todos os contatos
        const res = await fetch('../db/contacts.json');
        const contacts = await res.json();
        selected = contacts.filter(c => c && c._id).map(c => c._id);
    }
    if (!selected.length) {
        massMessageStatus.textContent = 'Selecione pelo menos um destinatário.';
        return;
    }
    // Busca destinatários (contatos ou membros)
    const recipientType = document.getElementById('recipientType') ? document.getElementById('recipientType').value : 'contacts';
    let url = recipientType === 'members' ? '../db/members.json' : '../db/contacts.json';
    let recipients = [];
    try {
        const res = await fetch(url);
        recipients = await res.json();
    } catch {
        massMessageStatus.textContent = 'Erro ao carregar destinatários.';
        return;
    }
    // Importa funções de mensagem
    let messagesModule;
    try {
        messagesModule = await import('./messages.js');
    } catch (e) {
        massMessageStatus.textContent = 'Erro ao carregar módulo de mensagens.';
        return;
    }
    // Determina mensagem selecionada
    const templateSelect = document.getElementById('messageTemplateSelect');
    const templateValue = templateSelect ? templateSelect.value : '';
    let getMsg;
    if (selectedBulkType === 'reminder' && templateValue === 'reminder') {
        getMsg = messagesModule.bulkReminderMessage;
    } else if (selectedBulkType === 'day' && templateValue.startsWith('followup_')) {
        const idx = parseInt(templateValue.replace('followup_', ''));
        getMsg = messagesModule.followUpMessages[idx];
    } else if (selectedBulkType === 'day' && templateValue === 'grSacerdotes') {
        getMsg = messagesModule.grSacerdotesMessage;
    } else if (selectedBulkType === 'welcome' && templateValue === 'welcome') {
        getMsg = messagesModule.welcomeMessage;
    } else {
        getMsg = () => 'Mensagem.';
    }
    // Envio em massa: envia para cada destinatário individualmente
    let success = 0, fail = 0;
    let errorDetails = [];
    for (const id of selected) {
        const recipient = recipients.find(c => c && c._id === id);
        if (!recipient || !recipient.phone) { fail++; errorDetails.push(`Faltando telefone para ${recipient ? recipient.name : 'destinatário'}`); continue; }
        let msg = '';
        try {
            msg = typeof getMsg === 'function' ? getMsg(recipient.name || 'irmão(ã)') : String(getMsg);
        } catch {
            msg = 'Mensagem.';
        }
        try {
            const resp = await fetch('/api/notify-absent-direct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: recipient.phone, name: recipient.name, message: msg })
            });
            if (resp.ok) {
                success++;
            } else {
                fail++;
                const err = await resp.json().catch(() => ({}));
                errorDetails.push(`${recipient.name || recipient.phone}: ${err.message || 'Falha desconhecida'}`);
            }
        } catch (e) {
            fail++;
            errorDetails.push(`${recipient.name || recipient.phone}: ${e.message || 'Erro de rede'}`);
        }
    }
    let msg = `Mensagens enviadas: ${success}. Falhas: ${fail}.`;
    if (errorDetails.length) {
        msg += '\n' + errorDetails.join('\n');
    }
    massMessageStatus.textContent = msg;
};

// Carregar templates de mensagem prontos
async function loadMessageTemplates(type) {
    const select = document.getElementById('messageTemplateSelect');
    select.innerHTML = '<option value="">Selecione uma mensagem...</option>';
    let messagesModule;
    try {
        messagesModule = await import('./messages.js');
    } catch (e) {
        select.innerHTML = '<option value="">Erro ao carregar mensagens</option>';
        return;
    }
    if (type === 'reminder' && messagesModule.bulkReminderMessage) {
        select.innerHTML += `<option value="reminder">Lembrete padrão</option>`;
    } else if (type === 'day' && Array.isArray(messagesModule.followUpMessages)) {
        messagesModule.followUpMessages.forEach((fn, idx) => {
            select.innerHTML += `<option value="followup_${idx}">Mensagem pronta #${idx+1}</option>`;
        });
        if (messagesModule.grSacerdotesMessage) {
            select.innerHTML += `<option value="grSacerdotes">GR Sacerdotes</option>`;
        }
    } else if (type === 'welcome' && messagesModule.welcomeMessage) {
        select.innerHTML += `<option value="welcome">Boas-vindas padrão</option>`;
    }
}

// Carregar inicialmente templates de lembrete
loadMessageTemplates('reminder');