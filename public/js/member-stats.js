// Member Stats Modal functionality
const memberStatsModal = document.getElementById('memberStatsModal');
const closeStatsBtn = document.querySelector('.close-stats');

async function openMemberStats() {
    try {
        memberStatsModal.style.display = 'block';
        
        const response = await fetch('/api/members/stats');
        
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/pages/login.html';
                return;
            }
            const errorData = await response.json();
            throw new Error(errorData.error || `Erro no servidor: ${response.status}`);
        }
        
        const stats = await response.json();
        console.log('Received stats:', stats);
        
        // Update stats in the modal
        document.getElementById('totalMen').textContent = stats.totalMen || 0;
        document.getElementById('inactiveMen').textContent = stats.inactiveMen || 0;
        document.getElementById('totalWomen').textContent = stats.totalWomen || 0;
        document.getElementById('inactiveWomen').textContent = stats.inactiveWomen || 0;
        document.getElementById('averageAge').textContent = stats.averageAge ? `${stats.averageAge} anos` : '0';
        document.getElementById('boaParteMembers').textContent = stats.boaParteMembers || 0;
        document.getElementById('louvorMembers').textContent = stats.louvorMembers || 0;
        document.getElementById('dancaMembers').textContent = stats.dancaMembers || 0;
        document.getElementById('midiaMembers').textContent = stats.midiaMembers || 0;
        document.getElementById('intersecaoMembers').textContent = stats.intersecaoMembers || 0;
        document.getElementById('mostInactive').textContent = stats.mostInactive || '-';
        document.getElementById('weeklyAbsences').textContent = stats.weeklyAbsences || 0;
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        alert('Erro ao carregar estatísticas. Por favor, tente novamente.');
    }
}

// Close modal when clicking the X button
closeStatsBtn.onclick = function() {
    memberStatsModal.style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target === memberStatsModal) {
        memberStatsModal.style.display = 'none';
    }
}
