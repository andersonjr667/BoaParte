// DOM Elements
let contactsList;
let loadingIndicator;
let errorMessage;
let monthFilter;

// Initialize DOM elements
function initializeElements() {
    contactsList = document.getElementById('contatos-lista');
    loadingIndicator = document.getElementById('loading-indicator');
    errorMessage = document.getElementById('error-message');
    monthFilter = document.getElementById('month-filter');

    // Add event listener for month filter
    if (monthFilter) {
        monthFilter.addEventListener('change', (e) => {
            updateContactsDisplay(e.target.value);
        });
    }
}

let allContacts = []; // Store all contacts
let contatosAgrupados = {}; // Store grouped contacts

// Show/hide loading indicator
function toggleLoading(show) {
    loadingIndicator.classList.toggle('hidden', !show);
}

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

// Hide error message
function hideError() {
    errorMessage.classList.add('hidden');
}

// Format date to Brazilian locale
function formatDate(dateString) {
    return new Date(dateString).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Create contact element
function createContactElement(contato) {
    const li = document.createElement('li');
    const dataFormatada = formatDate(contato.createdAt);
    li.innerHTML = `
        <strong>${contato.name}</strong>
        <br>
        Telefone: ${contato.phone}
        <br>
        <small>Adicionado por ${contato.username} em ${dataFormatada}</small>
    `;
    return li;
}

// Create month group element
function createMonthGroupElement(mesAno) {
    const titulo = document.createElement('h3');
    titulo.textContent = mesAno;
    titulo.style.marginTop = '20px';
    titulo.style.color = '#1b5e20';
    return titulo;
}

// Update contacts display based on selected month
function updateContactsDisplay(selectedMonth = 'todos') {
    contactsList.innerHTML = '';
    
    if (selectedMonth === 'todos') {
        Object.entries(contatosAgrupados).forEach(([mesAno, contatos]) => {
            contactsList.appendChild(createMonthGroupElement(mesAno));
            contatos.forEach(contato => {
                contactsList.appendChild(createContactElement(contato));
            });
        });
    } else {
        const contatos = contatosAgrupados[selectedMonth] || [];
        if (contatos.length > 0) {
            contactsList.appendChild(createMonthGroupElement(selectedMonth));
            contatos.forEach(contato => {
                contactsList.appendChild(createContactElement(contato));
            });
        } else {
            contactsList.innerHTML = '<li>Nenhum contato encontrado para este mês.</li>';
        }
    }
}

// Populate month filter options
function populateMonthFilter() {
    monthFilter.innerHTML = '<option value="todos">Todos os meses</option>';
    Object.keys(contatosAgrupados)
        .sort((a, b) => {
            const [mesA, anoA] = a.split(' de ').reverse();
            const [mesB, anoB] = b.split(' de ').reverse();
            return anoB - anoA || mesesOrdem[mesA] - mesesOrdem[mesB];
        })
        .forEach(mesAno => {
            const option = document.createElement('option');
            option.value = mesAno;
            option.textContent = mesAno;
            monthFilter.appendChild(option);
        });
}

// Month order helper for sorting
const mesesOrdem = {
    'janeiro': 1, 'fevereiro': 2, 'março': 3, 'abril': 4,
    'maio': 5, 'junho': 6, 'julho': 7, 'agosto': 8,
    'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12
};

// Load contacts from server
async function carregarContatos() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        contactsList.classList.add('blurred');
        showError('Você precisa estar logado para ver os contatos.');
        return;
    }

    try {
        toggleLoading(true);
        hideError();

        const resposta = await fetch('/contatos', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!resposta.ok) {
            throw new Error(resposta.status === 401 
                ? 'Sessão expirada. Por favor, faça login novamente.' 
                : 'Erro ao carregar contatos. Por favor, tente novamente.');
        }

        allContacts = await resposta.json();
        
        if (allContacts.length === 0) {
            contactsList.innerHTML = '<li>Nenhum contato encontrado.</li>';
            return;
        }

        // Group contacts by month/year
        contatosAgrupados = allContacts.reduce((groups, contato) => {
            const data = new Date(contato.createdAt);
            const mesAno = data.toLocaleString('pt-BR', { 
                year: 'numeric', 
                month: 'long' 
            });
            
            if (!groups[mesAno]) {
                groups[mesAno] = [];
            }
            groups[mesAno].push(contato);
            return groups;
        }, {});

        // Populate filter and display contacts
        if (monthFilter) {
            populateMonthFilter();
        }
        updateContactsDisplay('todos');

    } catch (erro) {
        console.error('Erro ao carregar contatos:', erro);
        showError(erro.message || 'Erro ao carregar contatos. Verifique sua conexão.');
    } finally {
        toggleLoading(false);
    }
}

// Logout function
async function logout() {
    try {
        const response = await fetch("/logout", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao fazer logout');
        }

        localStorage.removeItem("token");
        window.location.href = "index.html";
    } catch (error) {
        console.error("Erro no logout:", error);
        alert("Erro ao fazer logout. Tente novamente.");
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeElements();
    carregarContatos();
});
