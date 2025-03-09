// Atualizar a função loadMembers para verificar o token
async function loadMembers() {
    try {
        showLoadingIndicator(true);
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        const response = await fetch('/api/members', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401 || response.status === 403) {
            window.location.href = 'login.html';
            return;
        }

        if (!response.ok) {
            throw new Error('Erro ao carregar membros');
        }

        const members = await response.json();
        displayMembers(members);
    } catch (error) {
        console.error('Erro ao carregar membros:', error);
        showNotification(`❌ Erro ao carregar membros: ${error.message}`, true);
    } finally {
        showLoadingIndicator(false);
    }
}

// Função para validar o token
async function validateToken() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const response = await fetch('/api/auth/validate-token', {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    }
}

// Verificar o token e carregar os membros ao carregar a página
document.addEventListener('DOMContentLoaded', async () => {
    await validateToken();
    loadMembers();
    displayWelcomeMessage();
});

// Função para mostrar indicador de carregamento
function showLoadingIndicator(show) {
    const loadingIndicator = document.getElementById('loading-indicator');
    loadingIndicator.style.display = show ? 'block' : 'none';
}

// Função para mostrar mensagem de boas-vindas
function displayWelcomeMessage() {
    const username = sessionStorage.getItem('username');
    const welcomeMessage = document.getElementById('welcome-message');
    welcomeMessage.textContent = `Bem-vindo, ${username}!`;
}

// Função para filtrar membros
function filterMembers() {
    const searchInput = document.getElementById('search-input').value.toLowerCase();
    const filteredMembers = allMembers.filter(member => member.name.toLowerCase().includes(searchInput));
    displayMembers(filteredMembers);
}

// Função para exportar membros para CSV
function exportToCSV() {
    const members = document.querySelectorAll('.member-card');
    let csvContent = "data:text/csv;charset=utf-8,Nome,Telefone,Data de Nascimento\n";
    members.forEach(member => {
        const name = member.querySelector('.member-name').textContent;
        const phone = member.querySelector('.member-phone').textContent.replace('📞 ', '');
        const birthday = member.querySelector('.member-birthday').textContent.replace('🎂 ', '');
        csvContent += `${name},${phone},${birthday}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'members.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Função para alternar entre modo claro e escuro
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
}

// Função para logout
function logout() {
    localStorage.removeItem('token');
    sessionStorage.clear();
    window.location.href = 'login.html';
}
