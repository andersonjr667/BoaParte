// Estado global para armazenar os contatos
let contacts = [];

// Função para carregar contatos
async function carregarContatos() {
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');
    const contactsList = document.getElementById('contatos-lista');

    try {
        loadingIndicator.classList.remove('hidden');
        errorMessage.classList.add('hidden');

        const response = await fetch("/getContacts", {
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar contatos');
        }

        contacts = await response.json();
        
        // Atualiza o filtro de meses
        updateMonthFilter();
        
        // Mostra os contatos
        displayContacts(contacts);

    } catch (error) {
        console.error("Erro:", error);
        errorMessage.textContent = "Erro ao carregar contatos. Por favor, tente novamente.";
        errorMessage.classList.remove('hidden');
        contactsList.innerHTML = '';
    } finally {
        loadingIndicator.classList.add('hidden');
    }
}

// Função para atualizar o filtro de meses
function updateMonthFilter() {
    const monthFilter = document.getElementById('month-filter');
    const months = new Set();
    
    // Coleta todos os meses únicos dos contatos
    contacts.forEach(contact => {
        const date = new Date(contact.createdAt);
        const monthYear = `${date.getMonth()}-${date.getFullYear()}`;
        months.add(monthYear);
    });

    // Limpa opções existentes, mantendo a opção "todos"
    monthFilter.innerHTML = '<option value="todos">Todos os meses</option>';

    // Adiciona as opções de meses
    [...months].sort((a, b) => {
        const [monthA, yearA] = a.split('-').map(Number);
        const [monthB, yearB] = b.split('-').map(Number);
        if (yearA !== yearB) return yearB - yearA;
        return monthB - monthA;
    }).forEach(monthYear => {
        const [month, year] = monthYear.split('-').map(Number);
        const date = new Date(year, month);
        const monthName = date.toLocaleString('pt-BR', { month: 'long' });
        const optionText = `${monthName} de ${year}`;
        
        const option = document.createElement('option');
        option.value = monthYear;
        option.textContent = optionText;
        monthFilter.appendChild(option);
    });
}

// Função para exibir os contatos
function displayContacts(contactsToShow) {
    const contactsList = document.getElementById('contatos-lista');
    contactsList.innerHTML = '';

    if (contactsToShow.length === 0) {
        const emptyMessage = document.createElement('li');
        emptyMessage.className = 'empty-message';
        emptyMessage.textContent = 'Nenhum contato encontrado.';
        contactsList.appendChild(emptyMessage);
        return;
    }

    contactsToShow.forEach(contact => {
        const li = document.createElement('li');
        li.className = 'contact-card';
        
        const date = new Date(contact.createdAt);
        const formattedDate = date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });

        li.innerHTML = `
            <div class="contact-info">
                <span class="contact-name">${contact.name}</span>
                <span class="contact-phone">${contact.phone}</span>
                <span class="contact-date">Adicionado em ${formattedDate}</span>
            </div>
        `;

        contactsList.appendChild(li);
    });
}

// Função para filtrar contatos por mês
function filterContacts(event) {
    const selectedValue = event.target.value;
    
    if (selectedValue === 'todos') {
        displayContacts(contacts);
        return;
    }

    const [selectedMonth, selectedYear] = selectedValue.split('-').map(Number);
    
    const filteredContacts = contacts.filter(contact => {
        const date = new Date(contact.createdAt);
        return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
    });

    displayContacts(filteredContacts);
}

// Função para logout
async function logout() {
    try {
        // Limpa dados do usuário
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        
        // Redireciona para a página inicial
        window.location.href = "/index.html";
        
        // Faz a requisição de logout após redirecionar
        await fetch("/logout", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: 'include'
        });
    } catch (error) {
        console.error("Erro no logout:", error);
    }
}

// Inicialização da página
function initializeElements() {
    // Adiciona listener para o filtro de meses
    const monthFilter = document.getElementById('month-filter');
    monthFilter.addEventListener('change', filterContacts);
}

// Verifica autenticação
async function checkAuth() {
    const token = localStorage.getItem("token");
    
    if (!token) {
        window.location.href = "index.html";
        return;
    }

    try {
        const response = await fetch("/verify-auth", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Token inválido');
        }
    } catch (error) {
        console.error("Erro na verificação de auth:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        window.location.href = "index.html";
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth(); // Verifica autenticação primeiro
    initializeElements(); // Só inicializa se estiver autenticado
    carregarContatos();
});
