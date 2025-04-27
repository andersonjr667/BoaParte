async function loadMembers() {
    try {
        console.log('Fetching members...');
        const response = await fetch('/api/members');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const members = await response.json();
        console.log('Members loaded:', members.length);
        
        if (members.length === 0) {
            document.getElementById('members-list').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>Nenhum membro encontrado</p>
                </div>`;
            return;
        }
        
        displayMembers(members);
    } catch (error) {
        console.error('Error loading members:', error);
        document.getElementById('members-list').innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Erro ao carregar membros: ${error.message}</p>
                <button onclick="loadMembers()" class="retry-btn">
                    <i class="fas fa-redo"></i> Tentar novamente
                </button>
            </div>`;
    }
}

// Carregar membros quando a página carregar
document.addEventListener('DOMContentLoaded', loadMembers);
