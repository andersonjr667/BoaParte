document.addEventListener('DOMContentLoaded', async () => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login.html';
            return;
        }

        const response = await fetch('/api/admin/stats', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to load stats');
        }

        updateDashboardStats(data.data);

    } catch (error) {
        console.error('Error loading admin stats:', error);
        showError(error.message || 'Error loading admin statistics');
    }
});

function updateDashboardStats(data) {
    // Update statistics display
    document.getElementById('totalUsers').textContent = data.totalUsers || 0;
    document.getElementById('totalContacts').textContent = data.totalContacts || 0;
    document.getElementById('totalMembers').textContent = data.totalMembers || 0;
    document.getElementById('contactsToday').textContent = data.contactsToday || 0;

    // Update monthly chart if it exists
    if (data.monthlyData && document.getElementById('monthlyChart')) {
        createMonthlyChart(data.monthlyData);
    }

    // Update user activity if it exists
    if (data.userActivity && document.getElementById('userActivity')) {
        createUserActivityChart(data.userActivity);
    }
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.querySelector('.admin-content').prepend(errorDiv);
}
