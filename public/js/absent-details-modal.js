// Modal de detalhes de faltas do membro
// Este script cria e gerencia o modal de detalhes de faltas

// Cria o modal no DOM se não existir
document.addEventListener('DOMContentLoaded', function() {
    console.log('[Modal Debug] Script absent-details-modal.js carregado!');
    if (!document.getElementById('absentDetailsModal')) {
        console.log('[Modal Debug] Criando modal absentDetailsModal no DOM...');
        const overlay = document.createElement('div');
        overlay.id = 'absentDetailsModal';
        overlay.className = 'absent-modal-overlay';
        overlay.innerHTML = `
            <div class="absent-modal" id="absentDetailsCard">
                <button class="close-modal" id="closeAbsentDetailsModal">&times;</button>
                <h2 id="absentDetailsName"></h2>
                <div class="modal-row"><span class="modal-label"><b>Telefone:</b></span> <span class="modal-value" id="absentDetailsPhone"></span></div>
                <div class="modal-row"><span class="modal-label"><b>Status:</b></span> <span class="modal-value" id="absentDetailsStatus"></span></div>
                <div class="modal-row"><span class="modal-label"><b>Total de Faltas:</b></span> <span class="modal-value" id="absentDetailsCount"></span></div>
                <div class="modal-row"><span class="modal-label"><b>Faltas:</b></span>
                    <ul id="absentDetailsList" style="max-height:180px;overflow-y:auto;padding-left:18px;margin:8px 0 0 0;font-size:0.98em;"></ul>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        document.getElementById('closeAbsentDetailsModal').onclick = function(e) {
            e.stopPropagation();
            overlay.classList.remove('active');
        };
        overlay.onclick = function(e) {
            if (e.target === overlay) overlay.classList.remove('active');
        };
    }
    // TESTE: Forçar modal a abrir ao carregar a página
    setTimeout(() => {
        const overlay = document.getElementById('absentDetailsModal');
        if (overlay) overlay.classList.add('active');
    }, 500);
});

// Função para abrir o modal e preencher os dados detalhados do membro ausente
window.showAbsentDetails = async function(name, phone) {
    const overlay = document.getElementById('absentDetailsModal');
    if (!overlay) return;
    // Busca dados de membros e ausências
    const [membersRes, absentsRes] = await Promise.all([
        fetch('/db/members.json'),
        fetch('/db/absentmembers.json')
    ]);
    const members = await membersRes.json();
    const absents = await absentsRes.json();
    // Busca membro pelo telefone
    const member = members.find(m => m.phone === phone);
    // Busca todas as faltas desse membro
    const faltas = absents
        .filter(entry => (entry.absents || []).some(a => a.phone === phone))
        .map(entry => ({ date: entry.date, time: entry.time }));
    // Preenche dados no modal
    document.getElementById('absentDetailsName').textContent = member ? member.name : name;
    document.getElementById('absentDetailsPhone').textContent = phone;
    document.getElementById('absentDetailsStatus').textContent = member ? (member.status || '-') : '-';
    document.getElementById('absentDetailsCount').textContent = faltas.length;
    const list = document.getElementById('absentDetailsList');
    if (faltas.length) {
        list.innerHTML = faltas.map((f, idx) => `<li style="background:${idx%2===0?'var(--button-primary-text)':'var(--secondary-color)'};padding:4px 8px;text-align:center;">${f.date} ${f.time || ''}</li>`).join('');
    } else {
        list.innerHTML = '<li style="background:var(--button-primary-text);padding:4px 8px;text-align:center;">Nenhuma falta registrada</li>';
    }
    overlay.classList.add('active');
};
