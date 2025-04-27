function checkAuth() {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    
    if (!token) {
        window.location.href = '/login.html';
        return false;
    }

    // Verifica páginas restritas
    if (window.location.pathname.includes('admin.html') || 
        window.location.pathname.includes('admin-panel.html')) {
        if (role !== 'admin') {
            window.location.href = '/dashboard.html';
            return false;
        }
    }

    return true;
}

// Adiciona verificação em todas as páginas
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;

    // Atualiza elementos da UI baseado no role
    const role = localStorage.getItem('role');
    if (role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
    }
});
