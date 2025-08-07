// Enhanced dashboard.js with mobile support
// Garante que window.getAuthHeaders existe
window.getAuthHeaders = () => ({ "Content-Type": "application/json" })

let messagesModule = null
const checkAuth = async () => true // Placeholder for checkAuth function
;(async () => {
  try {
    messagesModule = await import("./messages.js")
  } catch (e) {
    console.warn("Não foi possível importar messages.js:", e)
  }
})()

// Inicialização principal do dashboard
async function initializeDashboard() {
  try {
    const response = await fetch("/api/contacts", { headers: window.getAuthHeaders() })
    if (!response.ok) throw new Error("Erro ao buscar contatos")
    const contacts = await response.json()
    // Deduplicar por telefone, mantendo o mais recente
    const uniqueMap = new Map()
    for (const c of contacts) {
      const key = (c.phone || "").replace(/\D/g, "")
      if (!key) continue
      if (!uniqueMap.has(key) || new Date(c.createdAt) > new Date(uniqueMap.get(key).createdAt)) {
        uniqueMap.set(key, c)
      }
    }
    const uniqueContacts = Array.from(uniqueMap.values()).map((c) => ({ ...c, status: c.status || "novo" }))
    updateStats(uniqueContacts)
    updateContactsList(uniqueContacts)
    updateMobileContactsList(uniqueContacts) // Nova função para mobile
  } catch (error) {
    console.error("Dashboard error:", error)
    if (error.message.includes("401") || error.message.includes("403")) {
      localStorage.clear()
      window.location.href = "/pages/login.html"
    }
  }
}

function initializeEventListeners() {
  addSafeEventListener("logoutBtn", "click", () => {
    localStorage.clear()
    window.location.href = "/pages/login.html"
  })
  addSafeEventListener("addContactBtn", "click", () => {
    const modal = document.getElementById("contactModal")
    if (modal) modal.style.display = "block"
  })
  document.querySelectorAll(".close, .close-modal").forEach((element) => {
    element?.addEventListener("click", () => {
      const modal = document.getElementById("contactModal")
      if (modal) {
        modal.style.display = "none"
        const form = document.getElementById("contactForm")
        if (form) form.reset()
      }
    })
  })
  const quickAddForm = document.getElementById("quickAddForm")
  const quickPhoneInput = document.getElementById("quickPhone")
  if (quickPhoneInput) {
    quickPhoneInput.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\D/g, "")
      if (value.length > 11) value = value.slice(0, 11)
      if (value.length > 2) value = `(${value.slice(0, 2)}) ${value.slice(2)}`
      if (value.length > 10) value = `${value.slice(0, 10)}-${value.slice(10)}`
      e.target.value = value
    })
    quickPhoneInput.addEventListener("paste", (e) => {
      e.preventDefault()
      let paste = (e.clipboardData || window.clipboardData).getData("text")
      paste = paste.replace(/\D/g, "").slice(0, 11)
      let value = paste
      if (value.length > 2) value = `(${value.slice(0, 2)}) ${value.slice(2)}`
      if (value.length > 10) value = `${value.slice(0, 10)}-${value.slice(10)}`
      e.target.value = value
    })
  }
  if (quickAddForm) {
    quickAddForm.addEventListener("submit", async (e) => {
      e.preventDefault()
      const submitBtn = document.getElementById("quickAddContactBtn")
      if (submitBtn) submitBtn.disabled = true
      const name = document.getElementById("quickName").value
      const phone = document.getElementById("quickPhone").value
      const birthday = document.getElementById("quickBirthday").value
      const phoneDigits = phone.replace(/\D/g, "")
      if (!name || !phone || phoneDigits.length !== 11) {
        showError("Nome e telefone válidos são obrigatórios. Telefone deve ter 11 dígitos.")
        if (submitBtn) submitBtn.disabled = false
        return
      }
      try {
        const userData = JSON.parse(localStorage.getItem("user"))
        const payload = {
          name: name,
          phone: phone.replace(/\D/g, ""),
          birthday: birthday || null,
          owner: userData.username,
          username: userData.username,
        }
        const response = await fetch("/api/contacts", {
          method: "POST",
          headers: window.getAuthHeaders(),
          body: JSON.stringify(payload),
        })
        if (!response.ok) throw new Error("Erro ao criar contato")
        document.getElementById("quickName").value = ""
        document.getElementById("quickPhone").value = ""
        document.getElementById("quickBirthday").value = ""
        await initializeDashboard()
        showToast("Contato adicionado com sucesso", "success")
      } catch (error) {
        showError("Erro ao criar contato")
      } finally {
        if (submitBtn) submitBtn.disabled = false
      }
    })
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(async () => {
    const isAuth = await checkAuth()
    if (!isAuth) return
    initializeEventListeners()
    initializeDashboard()
    setInterval(initializeDashboard, 30000)
  }, 100)
})

document.addEventListener("DOMContentLoaded", () => {
  if (window.logAction) {
    const now = new Date()
    const dateStr = now.toLocaleDateString("pt-BR")
    const timeStr = now.toLocaleTimeString("pt-BR")
    window.logAction("dashboard_access", `Acesso ao dashboard em ${dateStr} às ${timeStr}`, "info")
  }
})

function updateStats(contacts) {
  const totalContactsEl = document.getElementById("totalContacts")
  const todayAttendanceEl = document.getElementById("todayAttendance")
  const totalVisitorsEl = document.getElementById("totalVisitors")
  if (totalContactsEl) totalContactsEl.textContent = contacts.length
  const today = new Date().toISOString().split("T")[0]
  const contactsToday = contacts.filter((contact) => {
    if (!contact.createdAt) return false
    const contactDate = new Date(contact.createdAt).toISOString().split("T")[0]
    return contactDate === today
  }).length
  if (todayAttendanceEl) todayAttendanceEl.textContent = contactsToday
  const visitors = contacts.filter((contact) => contact.status === "novo").length
  if (totalVisitorsEl) totalVisitorsEl.textContent = visitors
}

function formatDate(dateStr) {
  if (!dateStr) return "--"
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatPhone(phone) {
  if (!phone) return ""
  const cleaned = phone.replace(/\D/g, "")
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
  } else if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

function updateContactsList(contacts) {
  const activityList = document.getElementById("activityList")
  if (!contacts || contacts.length === 0) {
    activityList.innerHTML = `
            <div class="activity-header">
                <div class="activity-col">Nome</div>
                <div class="activity-col">Número</div>
                <div class="activity-col">Data de Adição</div>
                <div class="activity-col">Aniversário</div>
                <div class="activity-col">Status Mensagem</div>
                <div class="activity-col">Ações</div>
            </div>
            <div class="activity-item">Nenhum contato registrado</div>
        `
    return
  }
  const header = `
        <div class="activity-header">
            <div class="activity-col">Nome</div>
            <div class="activity-col">Número</div>
            <div class="activity-col">Data de Adição</div>
            <div class="activity-col">Aniversário</div>
            <div class="activity-col">Status Mensagem</div>
            <div class="activity-col">Ações</div>
        </div>
    `
  const contactsHtml = contacts
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(
      (contact) => `
            <div class="activity-item">
                <div class="activity-col">${contact.name}</div>
                <div class="activity-col">${formatPhone(contact.phone)}</div>
                <div class="activity-col">${formatDate(contact.createdAt)}</div>
                <div class="activity-col">${contact.birthday ? formatDate(contact.birthday) : "--"}</div>
                <div class="activity-col">
                    <span class="message-status ${contact.receivedMessage ? "message-sent" : "message-pending"}">
                        <i class="fas ${contact.receivedMessage ? "fa-check-circle" : "fa-clock"}"></i>
                        ${contact.receivedMessage ? "Enviada" : "Pendente"}
                    </span>
                </div>
                <div class="activity-col">
                    <div class="action-dropdown-wrapper">
                        <button class="action-trigger" data-contact-id="${contact._id}" data-received-message="${contact.receivedMessage ? "1" : "0"}" title="Ações">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                    </div>
                </div>
            </div>
        `,
    )
    .join("")
  activityList.innerHTML = header + contactsHtml
  document.querySelectorAll(".action-trigger").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation()
      const contactId = btn.getAttribute("data-contact-id")
      showActions(contactId, event)
    })
  })
}

// Nova função para atualizar a lista mobile
function updateMobileContactsList(contacts) {
  const mobileList = document.getElementById("mobileContactsList")
  if (!mobileList) return

  if (!contacts || contacts.length === 0) {
    mobileList.innerHTML = `
            <div class="loading-message">
                <i class="fas fa-users" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>Nenhum contato registrado</p>
            </div>
        `
    return
  }

  const contactsHtml = contacts
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(
      (contact) => `
            <div class="mobile-contact-card">
                <div class="mobile-card-header">
                    <div>
                        <h3 class="mobile-card-name">${contact.name}</h3>
                        <p class="mobile-card-phone">
                            <i class="fas fa-phone"></i>
                            ${formatPhone(contact.phone)}
                        </p>
                    </div>
                    <button class="mobile-action-btn" data-contact-id="${contact._id}" data-received-message="${contact.receivedMessage ? "1" : "0"}" onclick="showActions('${contact._id}', event)">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                </div>
                <div class="mobile-card-details">
                    <div class="mobile-card-detail">
                        <i class="fas fa-calendar"></i>
                        <span>Adicionado: ${formatDate(contact.createdAt)}</span>
                    </div>
                    <div class="mobile-card-detail">
                        <i class="fas fa-birthday-cake"></i>
                        <span>Aniversário: ${contact.birthday ? formatDate(contact.birthday) : "--"}</span>
                    </div>
                </div>
                <div class="mobile-card-footer">
                    <span class="message-status ${contact.receivedMessage ? "message-sent" : "message-pending"}">
                        <i class="fas ${contact.receivedMessage ? "fa-check-circle" : "fa-clock"}"></i>
                        ${contact.receivedMessage ? "Enviada" : "Pendente"}
                    </span>
                </div>
            </div>
        `,
    )
    .join("")

  mobileList.innerHTML = contactsHtml
}

function showActions(contactId, event) {
  event.preventDefault()
  event.stopPropagation()

  const dropdown = document.getElementById("actionDropdown")
  const button = event.currentTarget
  const card = button.closest(".activity-item") || button.closest(".mobile-contact-card")
  if (!dropdown || !card) return
  // Se já está aberto para este contato, fecha
  if (dropdown.style.display === "block" && dropdown.getAttribute("data-contact-id") === contactId) {
    hideAllDropdowns();
    return;
  }
  hideAllDropdowns();
  // Adiciona fundo branco e sombra ao dropdown (caso não tenha)
  dropdown.style.background = "#fff";
  dropdown.style.boxShadow = "0 8px 32px rgba(33,0,15,0.18), 0 2px 8px #0001";
  dropdown.style.border = "1.5px solid #c5b89f";
  dropdown.style.borderRadius = "14px";

  // Detecta mobile
  const isMobile = window.matchMedia && window.matchMedia("(max-width: 768px)").matches;
  if (isMobile) {
    document.body.appendChild(dropdown);
    dropdown.style.position = "fixed";
    dropdown.style.left = "12px";
    dropdown.style.right = "12px";
    dropdown.style.bottom = "20px";
    dropdown.style.top = "auto";
    dropdown.style.minWidth = "auto";
    dropdown.style.maxWidth = "none";
    dropdown.style.marginTop = "0";
  } else {
    document.body.appendChild(dropdown);
    function positionDropdown() {
      const btnRect = button.getBoundingClientRect();
      const dropdownRect = dropdown.getBoundingClientRect();
      let left = btnRect.right + 6;
      let top = btnRect.top + window.scrollY - 4;
      // Se passar da tela à direita, coloca à esquerda do botão
      if (left + dropdownRect.width > window.innerWidth) {
        left = btnRect.left - dropdownRect.width - 6;
      }
      // Se ainda sair da tela, gruda na borda
      if (left < 8) left = 8;
      // Se passar embaixo da tela, ajusta para cima do botão
      if (top + dropdownRect.height > window.scrollY + window.innerHeight) {
        top = btnRect.top + window.scrollY - dropdownRect.height + button.offsetHeight + 4;
      }
      if (top < window.scrollY) top = window.scrollY + 8;
      dropdown.style.position = "absolute";
      dropdown.style.left = left + "px";
      dropdown.style.top = top + "px";
      dropdown.style.minWidth = "180px";
      dropdown.style.maxWidth = "320px";
      dropdown.style.marginTop = "0";
      dropdown.style.zIndex = 99999;
    }
    // Primeira posição
    setTimeout(positionDropdown, 0);
    // Atualiza ao rolar ou redimensionar
    function updateDropdownFollow() {
      positionDropdown();
    }
    window.addEventListener("scroll", updateDropdownFollow, true);
    window.addEventListener("resize", updateDropdownFollow, true);
    dropdown._removeListeners = () => {
      window.removeEventListener("scroll", updateDropdownFollow, true);
      window.removeEventListener("resize", updateDropdownFollow, true);
    };
  }

  // Esconde o botão "Enviar Mensagem" se já foi enviada
  const received = button.getAttribute("data-received-message") === "1"
  const sendMsgBtn = dropdown.querySelector('.action-btn[data-action="message"]')
  if (sendMsgBtn) {
    sendMsgBtn.style.display = received ? "none" : ""
  }

  function updateDropdownPosition() {
    const btnRect = button.getBoundingClientRect()
    const cardRect = card.getBoundingClientRect()
    let left = btnRect.right - cardRect.left - dropdown.offsetWidth
    const top = btnRect.bottom - cardRect.top + 4
    if (left < 0) left = 0
    if (left + dropdown.offsetWidth > card.offsetWidth) {
      left = card.offsetWidth - dropdown.offsetWidth - 8
    }
    dropdown.style.position = "absolute"
    dropdown.style.left = `${left}px`
    dropdown.style.top = `${top}px`
    dropdown.style.minWidth = "180px"
    dropdown.style.maxWidth = `${card.offsetWidth - 16}px`
  }
  updateDropdownPosition()
  if (dropdown._removeListeners) dropdown._removeListeners()
  card.addEventListener("scroll", updateDropdownPosition, true)
  window.addEventListener("resize", updateDropdownPosition, true)
  window.addEventListener("scroll", updateDropdownPosition, true)
  dropdown._removeListeners = () => {
    card.removeEventListener("scroll", updateDropdownPosition, true)
    window.removeEventListener("resize", updateDropdownPosition, true)
    window.removeEventListener("scroll", updateDropdownPosition, true)
  }
  dropdown.style.display = "block"
  dropdown.setAttribute("data-contact-id", contactId)
  dropdown.querySelectorAll(".action-btn").forEach((button) => {
    button.onclick = async (e) => {
      e.stopPropagation()
      const action = button.dataset.action
      try {
        switch (action) {
          case "message":
            await sendWelcomeMessage(contactId)
            break
          case "reminder":
            await sendReminderMessage(contactId)
            break
          case "edit":
            await editContact(contactId)
            break
          case "delete":
            await deleteContact(contactId)
            break
          case "convert":
            await convertToMember(contactId)
            break
          default:
            console.error("Unknown action:", action)
        }
      } catch (error) {
        showError("Erro ao executar ação")
      } finally {
        hideAllDropdowns()
      }
    }
  })
}

function hideAllDropdowns() {
  const dropdowns = document.querySelectorAll(".action-dropdown")
  dropdowns.forEach((dropdown) => {
    dropdown.style.display = "none"
    if (dropdown._removeListeners) dropdown._removeListeners()
  })
}

document.addEventListener("click", (e) => {
  if (
    !e.target.closest(".action-trigger") &&
    !e.target.closest(".mobile-action-btn") &&
    !e.target.closest(".action-dropdown")
  ) {
    hideAllDropdowns()
  }
})

function showError(message) {
  const errorDiv = document.createElement("div")
  errorDiv.className = "error-toast"
  errorDiv.textContent = message
  document.body.appendChild(errorDiv)
  setTimeout(() => {
    errorDiv.remove()
  }, 3000)
}

function showToast(message, type = "success") {
  const toast = document.createElement("div")
  toast.className = `toast toast-${type}`
  toast.textContent = message
  document.body.appendChild(toast)
  setTimeout(() => {
    toast.remove()
  }, 3500)
}

function addSafeEventListener(elementId, event, handler) {
  const element = document.getElementById(elementId)
  if (element) {
    element.addEventListener(event, handler)
  }
}

// Funções de ação (mantidas iguais)
async function sendMessage(contactId) {
  if (window._sendingMessage) return
  window._sendingMessage = true
  try {
    if (!messagesModule) {
      try {
        messagesModule = await import("./messages.js")
      } catch (e) {
        messagesModule = { default: {} }
      }
    }
    const contacts = await fetch("/api/contacts", { headers: window.getAuthHeaders() }).then((r) => r.json())
    const contact = contacts.find((c) => c._id === contactId)
    if (!contact) throw new Error("Contato não encontrado")
    let message = "Olá! Que a paz do Senhor esteja com você!"
    try {
      if (typeof messagesModule?.getMessageByDay === "function") {
        message = messagesModule.getMessageByDay(contact.name || "irmão(ã)")
      } else if (typeof messagesModule?.messages?.getMessageByDay === "function") {
        message = messagesModule.messages.getMessageByDay(contact.name || "irmão(ã)")
      } else if (typeof messagesModule?.default?.getMessageByDay === "function") {
        message = messagesModule.default.getMessageByDay(contact.name || "irmão(ã)")
      }
    } catch (e) {}
    const res = await fetch(`/api/contacts/${contactId}/message`, {
      method: "POST",
      headers: window.getAuthHeaders(),
      body: JSON.stringify({ message }),
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData.message || "Erro ao enviar mensagem")
    }
    await initializeDashboard()
    showToast(`Mensagem enviada para ${contact.name}!`, "success")
    return true
  } catch (error) {
    showToast(error.message || "Erro ao enviar mensagem", "error")
    return false
  } finally {
    window._sendingMessage = false
  }
}

async function sendReminderMessage(contactId) {
  try {
    const contacts = await fetch("/api/contacts", { headers: window.getAuthHeaders() }).then((r) => r.json())
    const contact = contacts.find((c) => c._id === contactId)
    if (!contact) return showError("Contato não encontrado")
    let message = ""
    if (messagesModule && typeof messagesModule.serviceReminderMessage === "function") {
      message = messagesModule.serviceReminderMessage(contact.name || "irmão(ã)")
    } else if (
      messagesModule &&
      messagesModule.messages &&
      typeof messagesModule.messages.serviceReminderMessage === "function"
    ) {
      message = messagesModule.messages.serviceReminderMessage(contact.name || "irmão(ã)")
    } else if (
      messagesModule &&
      messagesModule.default &&
      typeof messagesModule.default.serviceReminderMessage === "function"
    ) {
      message = messagesModule.default.serviceReminderMessage(contact.name || "irmão(ã)")
    }
    if (!message) {
      showError("Erro: Não foi possível gerar a mensagem dinâmica. Verifique o módulo messages.js.")
      return
    }
    const res = await fetch(`/api/contacts/${contactId}/message`, {
      method: "POST",
      headers: window.getAuthHeaders(),
      body: JSON.stringify({ message }),
    })
    if (!res.ok) throw new Error("Erro ao enviar lembrete")
    showToast("Lembrete enviado com sucesso!", "success")
  } catch (e) {
    showError("Erro ao enviar lembrete")
  }
}

async function editContact(contactId) {
  try {
    const response = await fetch(`/api/contacts`)
    const contacts = await response.json()
    const contact = contacts.find((c) => c._id === contactId)
    if (!contact) return showError("Contato não encontrado")
    const name = prompt("Nome:", contact.name)
    if (name === null) return
    const phone = prompt("Telefone (apenas números):", contact.phone)
    if (phone === null) return
    const birthday = prompt("Data de aniversário (YYYY-MM-DD):", contact.birthday || "")
    if (birthday === null) return
    const putResp = await fetch(`/api/contacts/${contactId}`, {
      method: "PUT",
      headers: window.getAuthHeaders(),
      body: JSON.stringify({ name, phone, birthday }),
    })
    if (!putResp.ok) throw new Error("Erro ao editar contato")
    await initializeDashboard()
    showToast("Contato editado com sucesso", "success")
  } catch (err) {
    showError("Erro ao editar contato")
  }
}

async function deleteContact(contactId) {
  if (!confirm("Tem certeza que deseja excluir este contato?")) return
  const response = await fetch(`/api/contacts/${contactId}`, {
    method: "DELETE",
    headers: window.getAuthHeaders(),
  })
  if (!response.ok) {
    showError("Erro ao excluir contato")
    return
  }
  await initializeDashboard()
  showToast("Contato excluído com sucesso", "success")
}

async function convertToMember(contactId) {
  const response = await fetch(`/api/contacts/${contactId}/convert`, {
    method: "POST",
    headers: window.getAuthHeaders(),
  })
  if (!response.ok) {
    showError("Erro ao converter contato")
    return
  }
  await initializeDashboard()
  showToast("Contato convertido com sucesso", "success")
}

async function sendWelcomeMessage(contactId) {
  try {
    const contacts = await fetch("/api/contacts", { headers: window.getAuthHeaders() }).then((r) => r.json())
    const contact = contacts.find((c) => c._id === contactId)
    if (!contact) return showError("Contato não encontrado")
    let message = "Bem-vindo à igreja!"
    if (messagesModule && messagesModule.welcomeMessage) {
      message = messagesModule.welcomeMessage(contact.name || "irmão(ã)")
    }
    const res = await fetch(`/api/contacts/${contactId}/message`, {
      method: "POST",
      headers: window.getAuthHeaders(),
      body: JSON.stringify({ message }),
    })
    if (!res.ok) throw new Error("Erro ao enviar mensagem de boas-vindas")
    showToast("Mensagem de boas-vindas enviada!", "success")
  } catch (e) {
    showError("Erro ao enviar mensagem de boas-vindas")
  }
}
