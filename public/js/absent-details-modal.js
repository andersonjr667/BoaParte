// Modal de detalhes de faltas
// Este script será incluído em admin-panel.html para mostrar detalhes de faltas ao clicar em um membro ausente

let absentDetailsModal = null;

function createAbsentDetailsModal() {
    if (document.getElementById('absentDetailsModal')) return;
    const modal = document.createElement('div');
    modal.id = 'absentDetailsModal';
    modal.className = 'member-stats-modal';
    modal.innerHTML = `
        <div class="member-stats-content" style="max-width:500px;">
            <span class="close-stats" id="closeAbsentDetailsModal">&times;</span>
            <h2>Detalhes do Membro Ausente</h2>
            <div id="absentDetailsContent">
                <div style="text-align:center;padding:2em;">Carregando...</div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('closeAbsentDetailsModal').onclick = () => {
        modal.style.display = 'none';
    };
    absentDetailsModal = modal;
}

async function showAbsentDetails(name, phone) {
    createAbsentDetailsModal();
    absentDetailsModal.style.display = 'block';
    const content = document.getElementById('absentDetailsContent');
    content.innerHTML = '<div style="text-align:center;padding:2em;">Carregando...</div>';
    try {
        // Busca status do membro
        let status = '--';
        let member = null;
        try {
            const res = await fetch('/db/members.json');
            if (res.ok) {
                const members = await res.json();
                member = members.find(m => (m.phone === phone) || (m.name === name));
                if (member) status = member.status || '--';
            }
        } catch {}
        // Busca faltas
        const res = await fetch('/db/absentmembers.json');
        let absentsData = [];
        if (res.ok) absentsData = await res.json();
        // Faltas por mês
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
        let faltasMes = [];
        let faltasTodas = [];
        absentsData.forEach(entry => {
            (entry.absents||[]).forEach(abs => {
                if ((abs.phone === phone) || (abs.name === name)) {
                    faltasTodas.push(entry.date);
                    if (entry.date.startsWith(currentMonth)) faltasMes.push(entry.date);
                }
            });
        });
        // Renderiza
        content.innerHTML = `
            <div><b>Nome:</b> ${name}</div>
            <div><b>Número:</b> ${phone || '--'}</div>
            <div><b>Status:</b> ${status}</div>
            <div style="margin-top:1em;">
                <b>Faltas:</b>
                <div style="margin:0.5em 0;">
                    <button id="showMonthAbsencesBtn" class="btn btn-primary btn-small">Este mês (${faltasMes.length})</button>
                    <button id="showAllAbsencesBtn" class="btn btn-small">Todos os meses (${faltasTodas.length})</button>
                </div>
                <div id="absencesList"></div>
            </div>
        `;
        // Inicial: mostra faltas do mês
        function renderAbsences(list) {
            if (!list.length) {
                document.getElementById('absencesList').innerHTML = '<div style="color:#9e2d4a;">Nenhuma falta registrada.</div>';
            } else {
                document.getElementById('absencesList').innerHTML = '<ul style="padding-left:1.2em;">' + list.map(d => `<li>${new Date(d).toLocaleDateString('pt-BR')}</li>`).join('') + '</ul>';
            }
        }
        renderAbsences(faltasMes);
        document.getElementById('showMonthAbsencesBtn').onclick = () => renderAbsences(faltasMes);
        document.getElementById('showAllAbsencesBtn').onclick = () => renderAbsences(faltasTodas);
    } catch (e) {
        content.innerHTML = '<div style="color:#9e2d4a;">Erro ao carregar detalhes.</div>';
    }
}

// Torna a função global para uso inline
window.showAbsentDetails = showAbsentDetails;
