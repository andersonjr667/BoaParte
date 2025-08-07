// ATENÇÃO: Altere para true para ativar o modo manutenção
const maintenanceMode = false;

if (maintenanceMode && !window.location.pathname.endsWith('maintenance.html')) {
  window.location.href = '/maintenance.html';
}

document.addEventListener('DOMContentLoaded', function() {
  if (window.logAction) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR');
    window.logAction('maintenance_access', `Acesso à página de manutenção em ${dateStr} às ${timeStr}`, 'info');
  }
});
