// Add this function at the top of the file
function isTokenValid() {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return Date.now() < payload.exp * 1000;
    } catch (error) {
        console.error('Error validating token:', error);
        return false;
    }
}

// Admin authentication check
document.addEventListener('DOMContentLoaded', async () => {
    const username = localStorage.getItem('username');
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    // Check if user is admin and token is valid
    if (!username || !token || role !== 'admin' || !isTokenValid()) {
        console.log('Access denied: Not an admin or invalid token');
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('admin-username').textContent = `Administrador: ${username}`;
    await loadInitialData();
});

// Navigation functions
function showSection(sectionName) {
    document.querySelectorAll('.admin-section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(`${sectionName}-section`).style.display = 'block';

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    loadSectionData(sectionName);
}

// Chart functions
function createActivityChart(data) {
    const ctx = document.getElementById('activity-chart').getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Atividades do Sistema',
                data: data.values,
                borderColor: '#2E7D32',
                backgroundColor: 'rgba(76, 175, 80, 0.2)',
                borderWidth: 3,
                tension: 0.4,
                pointBackgroundColor: '#1B5E20',
                pointBorderColor: '#fff',
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#1B5E20',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        color: '#2E7D32',
                        font: {
                            weight: 'bold'
                        }
                    },
                    grid: {
                        color: '#E8F5E9'
                    }
                },
                x: {
                    ticks: {
                        color: '#2E7D32',
                        font: {
                            weight: 'bold'
                        }
                    },
                    grid: {
                        color: '#E8F5E9'
                    }
                }
            }
        }
    });
}

function getChartOptions(type) {
    // ... existing chart options ...
}

// API calls
async function loadStats() {
    try {
        const response = await fetch('/api/admin/stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Falha ao carregar estatísticas');

        const data = await response.json();
        updateDashboardStats(data);
        createCharts(data);
    } catch (error) {
        console.error('Erro:', error);
        showNotification(error.message, 'error');
    }
}

// Utility functions
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';

    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = 'index.html';
}

// ... other functions ...

async function loadSectionData(sectionName) {
    showLoading();
    try {
        switch(sectionName) {
            case 'overview':
                await loadOverviewData();
                break;
            case 'users':
                await loadUsersData();
                break;
            case 'stats':
                await loadStatsData();
                break;
            case 'logs':
                await loadLogsData();
                break;
            case 'members':
                await loadMembersData();
                break;
            case 'messages':
                await loadMessagesData();
                break;
            case 'notifications':
                await loadNotificationsData();
                break;
        }
    } catch (error) {
        console.error(`Erro ao carregar dados da seção ${sectionName}:`, error);
        showNotification(`❌ Erro ao carregar ${sectionName}`, 'error');
    } finally {
        hideLoading();
    }
}

async function loadOverviewData() {
    const response = await fetch('/api/admin/stats', {
        headers: getAuthHeaders()
    });
    
    if (!response.ok) throw new Error('Falha ao carregar visão geral');
    
    const data = await response.json();
    
    // Atualiza cards
    document.getElementById('total-users').textContent = data.totalUsers;
    document.getElementById('total-contacts').textContent = data.totalContacts;
    document.getElementById('today-contacts').textContent = data.contactsToday;
    document.getElementById('active-users').textContent = data.activeUsers;

    // Atualiza gráfico
    createActivityChart({
        labels: data.chartData.labels,
        values: data.chartData.data
    });
}

async function loadUsersData() {
    const response = await fetch('/api/users', {
        headers: getAuthHeaders()
    });
    
    if (!response.ok) throw new Error('Falha ao carregar usuários');
    
    const data = await response.json();
    const usersList = document.getElementById('users-list');
    
    usersList.innerHTML = data.users.map(user => `
        <div class="user-card">
            <div class="user-info">
                <div class="user-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="user-details">
                    <h3>${user.username}</h3>
                    <p>
                        <i class="fas fa-user-tag"></i>
                        <span class="user-role">${user.role}</span>
                    </p>
                    <p>
                        <i class="fas fa-calendar-alt"></i>
                        Criado em: ${new Date(user.createdAt).toLocaleDateString()}
                    </p>
                    <p>
                        <i class="fas fa-clock"></i>
                        Último acesso: ${new Date(user.lastAccess || user.createdAt).toLocaleString()}
                    </p>
                </div>
            </div>
            <div class="user-actions">
                <button onclick="changeUserRole('${user.username}')" 
                        class="action-btn" 
                        ${user.username === 'Anderson' ? 'disabled' : ''}>
                    <i class="fas fa-user-cog"></i>
                    Alterar Função
                </button>
                <button onclick="deleteUser('${user.username}')"
                        class="action-btn delete"
                        ${user.username === 'Anderson' ? 'disabled' : ''}
                        style="margin-left: 0.5rem;">
                    <i class="fas fa-trash-alt"></i>
                    Deletar
                </button>
            </div>
        </div>
    `).join('');
}

async function loadStatsData() {
    try {
        showLoading();
        console.log('Iniciando carregamento de estatísticas...');
        
        // Criar dados padrão caso algo falhe
        const defaultStats = {
            totalUsers: 0,
            totalContacts: 0,
            contactsToday: 0,
            growthRate: 0,
            contactsByMonth: [],
            contactsByUser: [],
            messageStats: [],
            latestContacts: []
        };

        const response = await fetch('/api/admin/detailed-stats', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        console.log('Status da resposta:', response.status);
        console.log('Headers:', Object.fromEntries(response.headers.entries()));

        // First check if response is OK
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Resposta não-OK do servidor:', {
                status: response.status,
                text: errorText
            });
            
            // Se recebemos HTML, provavelmente é um erro de autenticação
            if (errorText.includes('<!DOCTYPE html>')) {
                console.log('Recebido HTML em vez de JSON - usando dados padrão');
                return updateStatsDisplay(defaultStats);
            }
            
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        // Attempt to parse response as JSON
        let data;
        try {
            const text = await response.text();
            console.log('Texto da resposta:', text.substring(0, 200) + '...'); // Log first 200 chars
            data = JSON.parse(text);
        } catch (parseError) {
            console.error('Erro ao fazer parse do JSON:', parseError);
            return updateStatsDisplay(defaultStats);
        }

        // Use received data or fallback to defaults
        const stats = {
            totalUsers: data?.totalUsers ?? defaultStats.totalUsers,
            totalContacts: data?.totalContacts ?? defaultStats.totalContacts,
            contactsToday: data?.contactsToday ?? defaultStats.contactsToday,
            growthRate: data?.growthRate ?? defaultStats.growthRate,
            contactsByMonth: data?.contactsByMonth ?? defaultStats.contactsByMonth,
            contactsByUser: data?.contactsByUser ?? defaultStats.contactsByUser,
            messageStats: data?.messageStats ?? defaultStats.messageStats,
            latestContacts: data?.latestContacts ?? defaultStats.latestContacts
        };

        updateStatsDisplay(stats);
        console.log('Estatísticas atualizadas com sucesso');

    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        showNotification('Erro ao carregar estatísticas: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Helper function to update stats display
function updateStatsDisplay(stats) {
    // Update basic stats
    document.getElementById('total-users').textContent = stats.totalUsers;
    document.getElementById('total-contacts').textContent = stats.totalContacts;
    document.getElementById('today-contacts').textContent = stats.contactsToday;
    document.getElementById('growth-rate').textContent = `${stats.growthRate}%`;

    // Update charts if data exists
    const chartUpdates = [
        { id: 'contacts-by-month-chart', data: stats.contactsByMonth, fn: createContactsByMonthChart },
        { id: 'contacts-by-user-chart', data: stats.contactsByUser, fn: createContactsByUserChart },
        { id: 'message-status-chart', data: stats.messageStats, fn: createMessageStatusChart },
        { id: 'growth-trend-chart', data: stats.contactsByMonth, fn: createGrowthTrendChart }
    ];

    chartUpdates.forEach(({id, data, fn}) => {
        const container = document.getElementById(id);
        if (container && data?.length > 0) {
            try {
                fn(data);
            } catch (error) {
                console.error(`Erro ao criar gráfico ${id}:`, error);
            }
        }
    });

    // Update table if data exists
    if (stats.latestContacts?.length > 0) {
        updateLatestContactsTable(stats.latestContacts);
    }
}

async function loadLogsData() {
    try {
        showLoading();
        console.log('Iniciando carregamento de estatísticas...');
        
        const response = await fetch('/api/admin/detailed-stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        console.log('Resposta recebida:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
        });

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status} ${response.statusText}`);
        }

        let data;
        try {
            const text = await response.text();
            console.log('Texto da resposta:', text);
            data = JSON.parse(text);
        } catch (parseError) {
            console.error('Erro ao fazer parse do JSON:', parseError);
            throw new Error('Resposta inválida do servidor: ' + parseError.message);
        }

        console.log('Dados processados:', data);

        if (!data || typeof data !== 'object') {
            throw new Error('Dados inválidos recebidos do servidor');
        }

        // Fornece dados padrão se não existirem
        const stats = {
            totalUsers: data.totalUsers || 0,
            totalContacts: data.totalContacts || 0,
            contactsToday: data.contactsToday || 0,
            growthRate: data.growthRate || 0,
            contactsByMonth: data.contactsByMonth || [],
            contactsByUser: data.contactsByUser || [],
            messageStats: data.messageStats || [],
            latestContacts: data.latestContacts || []
        };

        // Update stats display
        document.getElementById('total-users').textContent = stats.totalUsers;
        document.getElementById('total-contacts').textContent = stats.totalContacts;
        document.getElementById('today-contacts').textContent = stats.contactsToday;
        document.getElementById('growth-rate').textContent = `${stats.growthRate}%`;

        // Create charts only if container exists
        const chartContainers = {
            'contacts-by-month-chart': () => createContactsByMonthChart(stats.contactsByMonth),
            'contacts-by-user-chart': () => createContactsByUserChart(stats.contactsByUser),
            'message-status-chart': () => createMessageStatusChart(stats.messageStats),
            'growth-trend-chart': () => createGrowthTrendChart(stats.contactsByMonth)
        };

        Object.entries(chartContainers).forEach(([containerId, createChart]) => {
            const container = document.getElementById(containerId);
            if (container) {
                try {
                    createChart();
                } catch (chartError) {
                    console.error(`Erro ao criar gráfico ${containerId}:`, chartError);
                }
            }
        });

        // Update table if container exists
        const tableBody = document.getElementById('latest-contacts');
        if (tableBody && stats.latestContacts.length > 0) {
            updateLatestContactsTable(stats.latestContacts);
        }

        console.log('Estatísticas carregadas com sucesso');

    } catch (error) {
        console.error('Erro detalhado ao carregar estatísticas:', error);
        showNotification('Erro ao carregar estatísticas: ' + error.message, 'error');
        
        // Mostra mensagem de erro na interface
        const statsSection = document.getElementById('stats-section');
        if (statsSection) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.innerHTML = `
                <p>❌ Erro ao carregar estatísticas</p>
                <p class="error-details">${error.message}</p>
                <button onclick="loadStatsData()" class="retry-btn">
                    <i class="fas fa-sync"></i> Tentar novamente
                </button>
            `;
            statsSection.appendChild(errorDiv);
        }
    } finally {
        hideLoading();
    }
}

function createContactsByMonthChart(data) {
    console.log('Dados para o gráfico de contatos por mês:', data); // Adicione este log para verificar os dados do gráfico
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const ctx = document.getElementById('contacts-by-month-chart').getContext('2d');
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => `${months[d._id.month - 1]}/${d._id.year}`),
            datasets: [{
                label: 'Contatos por Mês',
                data: data.map(d => d.count),
                backgroundColor: 'rgba(76, 175, 80, 0.6)',
                borderColor: '#2E7D32',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function createContactsByUserChart(data) {
    console.log('Dados para o gráfico de contatos por usuário:', data); // Adicione este log para verificar os dados do gráfico
    const ctx = document.getElementById('contacts-by-user-chart').getContext('2d');
    
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: data.map(d => d._id || 'Não atribuído'),
            datasets: [{
                data: data.map(d => d.count),
                backgroundColor: [
                    '#4CAF50', '#2196F3', '#FFC107', '#9C27B0', '#F44336',
                    '#009688', '#673AB7', '#FF5722', '#795548', '#607D8B'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

function createMessageStatusChart(data) {
    console.log('Dados para o gráfico de status das mensagens:', data); // Adicione este log para verificar os dados do gráfico
    const ctx = document.getElementById('message-status-chart').getContext('2d');
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Mensagem Enviada', 'Pendente'],
            datasets: [{
                data: [
                    data.find(d => d._id === true)?.count || 0,
                    data.find(d => d._id === false)?.count || 0
                ],
                backgroundColor: ['#4CAF50', '#FFC107']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function createGrowthTrendChart(data) {
    console.log('Dados para o gráfico de tendência de crescimento:', data); // Adicione este log para verificar os dados do gráfico
    const ctx = document.getElementById('growth-trend-chart').getContext('2d');
    
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const sortedData = data.sort((a, b) => {
        return a._id.year - b._id.year || a._id.month - b._id.month;
    });

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedData.map(d => `${months[d._id.month - 1]}/${d._id.year}`),
            datasets: [{
                label: 'Crescimento Mensal',
                data: sortedData.map(d => d.count),
                borderColor: '#2E7D32',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function updateLatestContactsTable(contacts) {
    const tableBody = document.getElementById('latest-contacts');
    tableBody.innerHTML = contacts.map(contact => `
        <tr>
            <td>${contact.name}</td>
            <td>${contact.phone}</td>
            <td>${contact.birthDate ? new Date(contact.birthDate).toLocaleDateString() : 'N/A'}</td>
            <td>${contact.createdBy || 'Sistema'}</td>
            <td>${new Date(contact.createdAt).toLocaleString()}</td>
        </tr>
    `).join('');
}

// Event listeners for chart controls
document.getElementById('chart-type')?.addEventListener('change', function(e) {
    const chartType = e.target.value;
    updateChartTypes(chartType);
});

document.getElementById('date-range')?.addEventListener('change', function(e) {
    const range = e.target.value;
    filterChartsByDate(range);
});

function updateChartTypes(type) {
    const charts = [
        window.contactsByMonthChart,
        window.userDistributionChart,
        window.messageStatusChart,
        window.growthTrendChart
    ];

    charts.forEach(chart => {
        if (chart && type !== 'pie' && type !== 'doughnut') {
            chart.config.type = type;
            chart.update();
        }
    });
}

function filterChartsByDate(days) {
    loadStatsData(days); // Reload data with new date range
}

// Função para carregar dados das estatísticas
async function loadStatsData(days = 30) {
    try {
        showLoading();
        const response = await fetch(`/api/admin/stats?days=${days}`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Falha ao carregar estatísticas');
        const data = await response.json();

        updateDashboardStats(data);
        createAllCharts(data);
        
    } catch (error) {
        console.error('Erro:', error);
        showNotification('Erro ao carregar estatísticas', 'error');
    } finally {
        hideLoading();
    }
}

// Função para criar todos os gráficos
function createAllCharts(data) {
    // Gráfico de Contatos por Usuário
    createUserContactsChart(data.contactsByUser);
    
    // Gráfico de Evolução Mensal
    createMonthlyEvolutionChart(data.monthlyStats);
    
    // Gráfico de Status das Mensagens
    createMessageStatusChart(data.messageStats);
    
    // Gráfico de Horários de Atividade
    createActivityHoursChart(data.activityHours);
}

// Gráfico de Contatos por Usuário
function createUserContactsChart(data) {
    const ctx = document.getElementById('contacts-by-user-chart').getContext('2d');
    
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: data.map(d => d.username),
            datasets: [{
                data: data.map(d => d.count),
                backgroundColor: [
                    '#4CAF50', '#2196F3', '#FFC107', '#9C27B0',
                    '#F44336', '#00BCD4', '#795548', '#FF5722'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

// Gráfico de Evolução Mensal
function createMonthlyEvolutionChart(data) {
    const ctx = document.getElementById('monthly-evolution-chart').getContext('2d');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.month),
            datasets: [{
                label: 'Novos Contatos',
                data: data.map(d => d.count),
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

// Gráfico de Status das Mensagens
function createMessageStatusChart(data) {
    const ctx = document.getElementById('message-status-chart').getContext('2d');
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Enviadas', 'Pendentes', 'Falhas'],
            datasets: [{
                data: [
                    data.sent || 0,
                    data.pending || 0,
                    data.failed || 0
                ],
                backgroundColor: ['#4CAF50', '#FFC107', '#F44336']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Gráfico de Horários de Atividade
function createActivityHoursChart(data) {
    const ctx = document.getElementById('activity-hours-chart').getContext('2d');
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => `${d.hour}h`),
            datasets: [{
                label: 'Atividades',
                data: data.map(d => d.count),
                backgroundColor: '#2196F3',
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

async function loadLogsData() {
    try {
        const response = await fetch('/admin/logs', {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) throw new Error('Falha ao carregar logs');
        
        const data = await response.json();
        const logsList = document.getElementById('logs-list');
        
        logsList.innerHTML = data.logs.map(log => `
            <div class="log-entry ${log.type}">
                <div class="log-icon">
                    <i class="fas ${getLogIcon(log.type)}"></i>
                </div>
                <div class="log-content">
                    <h4>${log.action}</h4>
                    <p>${log.description}</p>
                    <div class="log-details">
                        <span class="log-user">
                            <i class="fas fa-user"></i> ${log.username}
                        </span>
                        <span class="log-date">
                            <i class="fas fa-clock"></i> ${new Date(log.timestamp).toLocaleString()}
                        </span>
                        ${log.details ? `
                            <span class="log-extra">
                                <i class="fas fa-info-circle"></i> ${JSON.stringify(log.details)}
                            </span>
                        ` : ''}
                    </div>
                </div>
            </div>
        `).join('');
        
        updateLogCounters(data.logs);
    } catch (error) {
        console.error('Erro ao carregar logs:', error);
        showNotification('Erro ao carregar logs', 'error');
    }
}

async function filterLogs() {
    const type = document.getElementById('log-type').value;
    const startDate = document.getElementById('log-start-date').value;
    const endDate = document.getElementById('log-end-date').value;
    const user = document.getElementById('log-user').value;

    try {
        const response = await fetch('/api/admin/logs/filter', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                type,
                startDate,
                endDate,
                user
            })
        });

        if (!response.ok) throw new Error('Falha ao filtrar logs');
        
        const data = await response.json();
        renderLogs(data.logs);
        updateLogStats(data.stats);
    } catch (error) {
        console.error('Erro ao filtrar logs:', error);
        showNotification('Erro ao filtrar logs', 'error');
    }
}

function renderLogs(logs) {
    const container = document.getElementById('logs-list');
    
    container.innerHTML = logs.map(log => `
        <div class="log-entry">
            <div class="log-timestamp">
                ${new Date(log.timestamp).toLocaleString()}
            </div>
            <div class="log-type ${log.type}">
                ${formatLogType(log.type)}
            </div>
            <div class="log-user">
                ${log.username || 'Sistema'}
            </div>
            <div class="log-action">
                ${log.action}
            </div>
            <div class="log-details">
                ${formatLogDetails(log)}
            </div>
        </div>
    `).join('');
}

function formatLogType(type) {
    const types = {
        auth: 'Autenticação',
        create: 'Criação',
        update: 'Atualização',
        delete: 'Exclusão',
        message: 'Mensagem',
        system: 'Sistema',
        error: 'Erro'
    };
    return types[type] || type;
}

function formatLogDetails(log) {
    if (!log.details) return '-';
    
    try {
        const details = typeof log.details === 'string' ? 
            JSON.parse(log.details) : log.details;
        
        return Object.entries(details)
            .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
            .join('<br>');
    } catch (e) {
        return log.details;
    }
}

async function exportLogs() {
    try {
        const response = await fetch('/api/admin/logs/export', {
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Falha ao exportar logs');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showNotification('Logs exportados com sucesso!');
    } catch (error) {
        console.error('Erro ao exportar logs:', error);
        showNotification('Erro ao exportar logs', 'error');
    }
}

function clearLogFilters() {
    document.getElementById('log-type').value = 'all';
    document.getElementById('log-start-date').value = '';
    document.getElementById('log-end-date').value = '';
    document.getElementById('log-user').value = '';
    filterLogs();
}

// Funções auxiliares
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        throw new Error('No authentication token found');
    }
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
}

function showLoading() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

function isToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
}

function getLogIcon(type) {
    return {
        create: 'fa-plus-circle',
        update: 'fa-edit',
        delete: 'fa-trash',
        auth: 'fa-key',
        message: 'fa-envelope',
        system: 'fa-cog',
        role: 'fa-user-shield',
        member: 'fa-church',
        notification: 'fa-bell'
    }[type] || 'fa-info-circle';
}

function updateLogCounters(logs) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayLogs = logs.filter(log => new Date(log.timestamp) >= today);
    
    document.getElementById('total-logs').textContent = logs.length;
    document.getElementById('today-logs').textContent = todayLogs.length;
}

async function loadNotificationsData() {
    try {
        const response = await fetch('/api/admin/notifications', {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) throw new Error('Falha ao carregar notificações');
        
        const data = await response.json();
        updateNotificationBadge(data.notifications);
        renderNotifications(data.notifications);
    } catch (error) {
        console.error('Erro:', error);
        showNotification('❌ Erro ao carregar notificações', 'error');
    }
}

function updateNotificationBadge(notifications) {
    const unreadCount = notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notification-count');
    badge.textContent = unreadCount;
    badge.style.display = unreadCount > 0 ? 'block' : 'none';
}

function renderNotifications(notifications) {
    const container = document.getElementById('notifications-list');
    container.innerHTML = notifications.map(notification => `
        <div class="notification-item ${notification.read ? '' : 'unread'}" 
             data-type="${notification.type}">
            <div class="notification-icon">
                <i class="fas ${getNotificationIcon(notification.type)}"></i>
            </div>
            <div class="notification-content">
                <h4>${notification.title}</h4>
                <p>${notification.message}</p>
                <div class="notification-meta">
                    <span>
                        <i class="fas fa-clock"></i>
                        ${new Date(notification.timestamp).toLocaleString()}
                    </span>
                    <span>
                        <i class="fas fa-user"></i>
                        ${notification.sender}
                    </span>
                </div>
            </div>
            ${!notification.read ? `
                <button onclick="markAsRead('${notification._id}')" class="mark-read-btn">
                    <i class="fas fa-check"></i>
                </button>
            ` : ''}
        </div>
    `).join('');
}

async function sendNotification(event) {
    event.preventDefault();
    
    try {
        const title = document.getElementById('notification-title').value;
        const message = document.getElementById('notification-message').value;
        showNotification('✅ Notificação enviada com sucesso!');
        closeModal('send-notification-modal');
        await loadNotificationsData();
    } catch (error) {
        console.error('Erro:', error);
        showNotification('❌ ' + error.message, 'error');
    }
}

function filterNotifications() {
    const type = document.getElementById('notification-type-filter').value;
    const search = document.getElementById('notification-search').value.toLowerCase();
    const notifications = document.querySelectorAll('.notification-item');
    
    notifications.forEach(notification => {
        const matchesType = type === 'all' || notification.dataset.type === type;
        const matchesSearch = notification.textContent.toLowerCase().includes(search);
        notification.style.display = matchesType && matchesSearch ? 'flex' : 'none';
    });
}

// Função para enviar notificação push
async function sendPushNotification(users, title, message) {
    try {
        const response = await fetch('/api/admin/notifications/push', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                users,
                notification: {
                    title,
                    message,
                    timestamp: new Date()
                }
            })
        });

        if (!response.ok) throw new Error('Falha ao enviar notificação');
        
        showNotification('Notificação enviada com sucesso');
    } catch (error) {
        console.error('Erro ao enviar notificação:', error);
        showNotification('Erro ao enviar notificação', 'error');
    }
}

async function loadInitialData() {
    try {
        showLoading();
        await loadOverviewData();
        // Carrega a seção inicial (overview)
        document.getElementById('overview-section').style.display = 'block';
    } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
        showNotification('Erro ao carregar dados iniciais', 'error');
    } finally {
        hideLoading();
    }
}

function createCharts(data) {
    // Gráfico de Atividades
    createActivityChart({
        labels: data.chartData.labels,
        values: data.chartData.data
    });

    // Outros gráficos
    if (data.contactsByMonth) {
        createContactsChart(data.contactsByMonth);
    }
    if (data.activeUsersData) {
        createUsersChart(data.activeUsersData);
    }
    if (data.contactsByUser) {
        createPerformanceChart(data.contactsByUser);
    }
}

function updateDashboardStats(data) {
    document.getElementById('total-users').textContent = data.totalUsers || 0;
    document.getElementById('total-contacts').textContent = data.totalContacts || 0;
    document.getElementById('today-contacts').textContent = data.contactsToday || 0;
    document.getElementById('active-users').textContent = data.activeUsers || 0;
}

async function changeUserRole(username) {
    try {
        const newRole = prompt('Digite a nova função (admin/user):');
        if (!newRole) return;

        const response = await fetch(`/api/users/${username}/role`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ role: newRole })
        });

        if (!response.ok) throw new Error('Erro ao alterar função');

        showNotification('Função alterada com sucesso');
        await loadUsersData();
    } catch (error) {
        console.error('Erro:', error);
        showNotification(error.message, 'error');
    }
}

async function sendWhatsAppMessage(phone, name, contactId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Token de autenticação não encontrado');
        }

        let cleanPhone = phone.replace(/\D/g, '');
        
        // Remove extra '9' after DDD
        if (cleanPhone.length === 11) {
            const ddd = cleanPhone.slice(0, 2);
            const remainder = cleanPhone.slice(3);
            if (cleanPhone[2] === '9') {
                cleanPhone = ddd + remainder;
            }
        }
        
        const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
        
        const response = await fetch('/api/send-whatsapp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                phone: formattedPhone,
                name: name,
                contactId: contactId
            })
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = 'login.html';
                return;
            }
            throw new Error('Erro ao enviar mensagem');
        }

        const data = await response.json();
        
        if (data.success) {
            console.log(`[${timestamp}] ✅ Mensagem enviada com sucesso para ${name}`);
            showNotification('✅ Mensagem enviada com sucesso!');
            await loadContacts();
        } else {
            console.error(`[${timestamp}] ❌ Falha ao enviar mensagem para ${name}: ${data.message}`);
            throw new Error(data.message || 'Erro ao enviar mensagem');
        }
    } catch (error) {
        const timestamp = new Date().toLocaleString('pt-BR');
        console.error(`[${timestamp}] Erro ao enviar mensagem:`, error);
        showNotification('❌ ' + (error.message || 'Erro ao enviar mensagem'), true);
        
        if (error.message.includes('Token')) {
            window.location.href = 'login.html';
        }
    }
}

async function deleteUser(username) {
    try {
        if (!confirm(`Tem certeza que deseja excluir o usuário ${username}?`)) {
            return;
        }

        const response = await fetch(`/api/users/${username}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Erro ao deletar usuário');
        }

        showNotification('✅ Usuário excluído com sucesso!');
        await loadUsersData(); // Recarrega a lista de usuários
    } catch (error) {
        console.error('Erro ao deletar usuário:', error);
        showNotification('❌ ' + error.message, 'error');
    }
}

async function checkAdminAccess() {
    try {
        const role = localStorage.getItem('role');
        const isAdmin = role === 'admin';
        
        if (!isAdmin) {
            window.location.href = 'dashboard.html';
            return false;
        }

        // Show/hide admin elements
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(el => {
            el.style.display = isAdmin ? 'block' : 'none';
        });

        return isAdmin;
    } catch (error) {
        console.error('Erro ao verificar acesso admin:', error);
        return false;
    }
}

async function initVisitorsChart() {
    try {
        const response = await fetch('/api/visitors/stats');
        const data = await response.json();

        const dates = data.map(item => item.date);
        const counts = data.map(item => item.count);

        const ctx = document.getElementById('visitorsChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Número de Visitantes',
                    data: counts,
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Histórico de Visitantes por Dia'
                    },
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Erro ao carregar dados do gráfico:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initVisitorsChart();
});
