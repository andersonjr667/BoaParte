// Mensagens de erro amigáveis
const errorMessages = {
    // Erros de autenticação
    'auth/invalid-credentials': 'Usuário ou senha incorretos. Por favor, verifique suas credenciais.',
    'auth/user-not-found': 'Usuário não encontrado. Verifique seu nome de usuário.',
    'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
    'auth/username-exists': 'Este nome de usuário já está em uso. Por favor, escolha outro.',
    'auth/invalid-invite': 'Código de convite inválido. Por favor, verifique o código.',
    'auth/session-expired': 'Sua sessão expirou. Por favor, faça login novamente.',
    'auth/missing-fields': 'Por favor, preencha todos os campos obrigatórios.',

    // Erros de contato
    'contact/invalid-phone': 'Formato de telefone inválido. Use apenas números, parênteses, espaços e hífens.',
    'contact/duplicate': 'Este contato já existe na sua lista.',
    'contact/missing-fields': 'Nome e telefone são obrigatórios.',
    'contact/load-error': 'Não foi possível carregar os contatos. Por favor, tente novamente.',
    'contact/save-error': 'Erro ao salvar o contato. Por favor, tente novamente.',

    // Erros de senha
    'password/current-invalid': 'Senha atual incorreta.',
    'password/change-error': 'Erro ao alterar a senha. Por favor, tente novamente.',
    'password/mismatch': 'As senhas não coincidem. Por favor, verifique.',
    'password/too-short': 'A nova senha deve ter pelo menos 6 caracteres.',

    // Erros gerais
    'error/network': 'Erro de conexão. Verifique sua internet e tente novamente.',
    'error/server': 'Erro no servidor. Por favor, tente novamente mais tarde.',
    'error/unknown': 'Ocorreu um erro inesperado. Por favor, tente novamente.',
    'error/timeout': 'A operação demorou muito. Por favor, tente novamente.',
    'error/validation': 'Por favor, verifique os dados inseridos e tente novamente.',
};

// Função para obter mensagem de erro amigável
function getErrorMessage(errorCode) {
    return errorMessages[errorCode] || errorMessages['error/unknown'];
}

// Função para mostrar notificação de erro
function showErrorNotification(message, duration = 5000) {
    const notification = document.createElement('div');
    notification.className = 'notification error';
    
    // Criar ícone
    const icon = document.createElement('i');
    icon.className = 'fas fa-exclamation-circle';
    notification.appendChild(icon);
    
    // Adicionar espaço após o ícone
    notification.appendChild(document.createTextNode(' '));
    
    // Adicionar mensagem
    notification.appendChild(document.createTextNode(message));
    
    // Adicionar botão de fechar
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.className = 'notification-close';
    closeButton.onclick = () => notification.remove();
    notification.appendChild(closeButton);
    
    document.body.appendChild(notification);
    
    // Adicionar classe show após um pequeno delay para ativar a animação
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Remover após a duração especificada
    if (duration > 0) {
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }
}

// Função para mostrar notificação de sucesso
function showSuccessNotification(message, duration = 3000) {
    const notification = document.createElement('div');
    notification.className = 'notification success';
    
    // Criar ícone
    const icon = document.createElement('i');
    icon.className = 'fas fa-check-circle';
    notification.appendChild(icon);
    
    // Adicionar espaço após o ícone
    notification.appendChild(document.createTextNode(' '));
    
    // Adicionar mensagem
    notification.appendChild(document.createTextNode(message));
    
    document.body.appendChild(notification);
    
    // Adicionar classe show após um pequeno delay para ativar a animação
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Remover após a duração especificada
    if (duration > 0) {
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }
}

// Exportar funções
window.errorHandling = {
    getErrorMessage,
    showErrorNotification,
    showSuccessNotification
};
