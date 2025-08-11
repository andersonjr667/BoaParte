document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const errorToast = document.getElementById('errorToast');

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(registerForm);
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');
        // const registerCode = formData.get('registerCode');
        // const REQUIRED_CODE = 'IGREJA2025';

        // if (registerCode !== REQUIRED_CODE) {
        //     showError('Código de registro inválido. Solicite o código à liderança.');
        //     return;
        // }

        if (password !== confirmPassword) {
            showError('As senhas não coincidem');
            return;
        }

        const userData = {
            name: formData.get('name'),
            email: formData.get('email'),
            password: password
        };

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (!response.ok || !data.success || !data.token) {
                throw new Error(data.message || 'Erro ao registrar');
            }

            // Salva token e dados do usuário no localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            window.location.href = '/pages/dashboard.html';
        } catch (error) {
            showError(error.message);
        }
    });

    function showError(message) {
        errorToast.textContent = message;
        errorToast.style.display = 'block';
        
        setTimeout(() => {
            errorToast.style.display = 'none';
        }, 3000);
    }
});
