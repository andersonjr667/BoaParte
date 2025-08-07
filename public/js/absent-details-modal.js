// Modal de detalhes de faltas do membro
// Este script cria e gerencia o modal de detalhes de faltas

// Cria o modal no DOM se não existir
document.addEventListener('DOMContentLoaded', function() {
    if (!document.getElementById('absentDetailsModal')) {
        const modal = document.createElement('div');
        modal.id = 'absentDetailsModal';
        modal.style.display = 'none';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.45)';
        modal.style.zIndex = '9999';
        modal.innerHTML = `
            <div id="absentDetailsCard" style="background:#fff;max-width:420px;width:90vw;margin:60px auto 0 auto;padding:32px 24px 24px 24px;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.18);position:relative;">
                <button id="closeAbsentDetailsModal" style="position:absolute;top:12px;right:12px;font-size:1.3em;background:none;border:none;cursor:pointer;">&times;</button>
                <h2 id="absentDetailsName" style="margin-bottom:8px;font-size:1.3em;color:#9e2d4a;"></h2>
                <div style="margin-bottom:8px;"><b>Telefone:</b> <span id="absentDetailsPhone"></span></div>
                <div style="margin-bottom:8px;"><b>Status:</b> <span id="absentDetailsStatus"></span></div>
                <div style="margin-bottom:8px;"><b>Total de Faltas:</b> <span id="absentDetailsCount"></span></div>
                <div style="margin-bottom:12px;"><b>Faltas:</b>
                    <ul id="absentDetailsList" style="max-height:180px;overflow-y:auto;padding-left:18px;margin:8px 0 0 0;font-size:0.98em;"></ul>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('closeAbsentDetailsModal').onclick = function() {
            modal.style.display = 'none';
        };
        modal.onclick = function(e) {
            if (e.target === modal) modal.style.display = 'none';
        };
    }
});

// Função para abrir o modal e preencher os dados detalhados do membro ausente
window.showAbsentDetails = async function(name, phone) {
    const modal = document.getElementById('absentDetailsModal');
    if (!modal) return;
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
    modal.style.display = 'block';
};
