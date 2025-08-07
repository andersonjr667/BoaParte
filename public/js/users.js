// Função para buscar e renderizar usuários do banco users.json
async function fetchAndRenderUsers() {
    let users = [];
    let erroApi = false;
    let apiStatus = 200;
    try {
        // Tenta buscar da API autenticada
        const token = localStorage.getItem('token');
        if (token) {
            const response = await fetch('/api/users', {
                headers: token ? { 'Authorization': 'Bearer ' + token } : {}
            });
            apiStatus = response.status;
            if (response.ok) {
                users = await response.json();
            } else if (response.status === 401 || response.status === 403) {
                // Token inválido ou expirado: redireciona para login
                window.location.href = '/pages/login.html';
                return;
            } else {
                erroApi = true;
            }
        } else {
            // Sem token: redireciona para login
            window.location.href = '/pages/login.html';
            return;
        }
    } catch (e) {
        erroApi = true;
    }
    if (erroApi) {
        // Fallback: busca do arquivo local
        try {
            const response = await fetch('../db/users.json');
            if (response.ok) {
                users = await response.json();
            } else {
                showErrorMsg('Não foi possível carregar a lista de usuários.');
            }
        } catch {
            showErrorMsg('Não foi possível carregar a lista de usuários.');
        }
    }
    // Filtra apenas usuários que têm username
    const filteredUsers = Array.isArray(users) ? users.filter(u => u.username) : [];
    document.getElementById('totalUsers').textContent = filteredUsers.length;
    document.getElementById('totalAdmins').textContent = filteredUsers.filter(u => u.role === 'admin').length;
    document.getElementById('totalNormalUsers').textContent = filteredUsers.filter(u => u.role === 'user').length;
    renderUserTable(filteredUsers);
}

function showErrorMsg(msg) {
    let el = document.getElementById('usersErrorMsg');
    if (!el) {
        el = document.createElement('div');
        el.id = 'usersErrorMsg';
        el.style.color = 'red';
        el.style.textAlign = 'center';
        el.style.margin = '16px 0';
        document.body.insertBefore(el, document.body.firstChild);
    }
    el.textContent = msg;
}

function renderUserTable(users) {
    const tableBody = document.querySelector('#usersTable tbody');
    tableBody.innerHTML = '';
    let currentUser = null;
    try {
        currentUser = JSON.parse(localStorage.getItem('user'));
    } catch {}
    // Mostra ou esconde a coluna de ações no cabeçalho
    const actionsTh = document.querySelector('#usersTable th.admin-only');
    if (actionsTh) {
        actionsTh.style.display = (currentUser && currentUser.role === 'admin') ? '' : 'none';
    }
    if (!users.length) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="5" style="text-align:center;color:#888;">Nenhum usuário encontrado</td>`;
        tableBody.appendChild(tr);
        return;
    }
    users.forEach(user => {
        const tr = document.createElement('tr');
        let actionsTd = '';
        if (currentUser && currentUser.role === 'admin') {
            actionsTd = `
                <td class="actions admin-only">
                    <button class="icon-btn btn-role" title="Alterar papel" data-action="role" data-user-id="${user._id}" data-user-role="${user.role}">
                        <span class="material-icons" aria-label="Alterar papel">swap_horiz</span>
                    </button>
                    <button class="icon-btn btn-delete" title="Excluir usuário" data-action="delete" data-user-id="${user._id}" data-username="${user.username}">
                        <span class="material-icons" aria-label="Excluir">delete</span>
                    </button>
                </td>
            `;
        } else {
            actionsTd = '<td class="actions admin-only" style="display:none"></td>';
        }
        tr.innerHTML = `
            <td>${user.username}</td>
            <td>${user.role ? user.role : '-'}</td>
            <td>${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</td>
            <td>${user._id}</td>
            ${actionsTd}
        `;
        tableBody.appendChild(tr);
    });
}

// Chamada inicial
document.addEventListener('DOMContentLoaded', fetchAndRenderUsers);

// ...existing code...
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.location.href = '/pages/login.html';
        });
    }
    // Delegated event listeners for user actions (table)
    const usersTable = document.getElementById('usersTable');
    if (usersTable) {
        usersTable.addEventListener('click', function(e) {
            const btn = e.target.closest('button[data-action]');
            if (!btn) return;
            const action = btn.getAttribute('data-action');
            const userId = btn.getAttribute('data-user-id');
            if (action === 'role') {
                const currentRole = btn.getAttribute('data-user-role');
                changeRole(userId, currentRole);
            } else if (action === 'delete') {
                const username = btn.getAttribute('data-username');
                confirmDelete(userId, username);
            }
        });
    }
    // Delegated event listeners for user actions (card view)
    const usersList = document.getElementById('users-list');
    if (usersList) {
        usersList.addEventListener('click', function(e) {
            const btn = e.target.closest('button[data-action]');
            if (!btn) return;
            const action = btn.getAttribute('data-action');
            const userId = btn.getAttribute('data-user-id');
            if (action === 'role') {
                const currentRole = btn.getAttribute('data-user-role');
                changeRole(userId, currentRole);
            } else if (action === 'delete') {
                const username = btn.getAttribute('data-username');
                confirmDelete(userId, username);
            }
        });
    }
    if (window.logAction) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('pt-BR');
        const timeStr = now.toLocaleTimeString('pt-BR');
        window.logAction('users_access', `Acesso à página de usuários em ${dateStr} às ${timeStr}`, 'info');
    }


async function changeRole(userId, currentRole) {
    if (!confirm(`Deseja alterar o papel do usuário de ${currentRole} para ${currentRole === 'admin' ? 'user' : 'admin'}?`)) {
        return;
    }
    try {
        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/users/${userId}/role`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': 'Bearer ' + token } : {})
            },
            body: JSON.stringify({ role: newRole })
        });
        if (!response.ok) throw new Error('Falha ao alterar papel');
        await fetchAndRenderUsers();
        alert('Papel alterado com sucesso!');
        if (window.logAction) await window.logAction('change_role', `Papel do usuário ${userId} alterado de ${currentRole} para ${newRole}`);
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao alterar papel do usuário');
        if (window.logAction) await window.logAction('error', `Erro ao alterar papel: ${error.message}`, 'error');
    }
}

async function deleteUser(userId) {
    try {
        // Chama a nova rota customizada para deletar usuário do arquivo JSON
        const response = await fetch(`/api/users/json/${userId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Falha ao excluir usuário');
        }
        await fetchAndRenderUsers();
        alert('Usuário excluído com sucesso!');
        if (window.logAction) {
            await window.logAction('user_deleted', `Usuário ${userId} excluído do JSON`, 'info');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert(`Erro ao excluir usuário: ${error.message}`);
        if (window.logAction) {
            await window.logAction('error', `Erro ao excluir usuário: ${error.message}`, 'error');
        }
    }
}

function confirmDelete(userId, username) {
    if (confirm(`Tem certeza que deseja excluir o usuário "${username}"?`)) {
        deleteUser(userId);
    }
}

