let swRegistration = null;
let vapidPublicKey = null;

// A chave pública será obtida do servidor via API
async function getVapidPublicKey() {
    try {
        const response = await fetch('/api/vapid-public-key');
        const data = await response.json();
        vapidPublicKey = data.publicKey;
    } catch (error) {
        console.error('Erro ao buscar chave VAPID:', error);
    }
}

// Registra o service worker
async function registerServiceWorker() {
    try {
        await getVapidPublicKey(); // Busca a chave primeiro
        swRegistration = await navigator.serviceWorker.register('/js/notification-worker.js');
        console.log('Service Worker registrado com sucesso');
    } catch (error) {
        console.error('Erro ao registrar Service Worker:', error);
    }
}

// Solicita permissão para notificações
async function requestNotificationPermission() {
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('Permissão para notificações concedida');
            subscribeUserToPush();
        }
    } catch (error) {
        console.error('Erro ao solicitar permissão:', error);
    }
}

// Atualiza a função subscribeUserToPush
async function subscribeUserToPush() {
    try {
        if (!vapidPublicKey) {
            throw new Error('Chave VAPID não encontrada');
        }

        const subscription = await swRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });

        // Envia a inscrição para o servidor
        await fetch('/api/push-subscription', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(subscription)
        });

        console.log('Usuário inscrito nas notificações push');
    } catch (error) {
        console.error('Erro ao inscrever nas notificações:', error);
    }
}

// Função auxiliar para converter chave VAPID
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Inicializa as notificações
if ('serviceWorker' in navigator && 'PushManager' in window) {
    window.addEventListener('load', function() {
        registerServiceWorker();
        
        // Solicita permissão quando o usuário fizer login
        document.addEventListener('userLoggedIn', requestNotificationPermission);
    });
}
