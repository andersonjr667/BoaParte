// hamburger.js

document.addEventListener("DOMContentLoaded", () => {
    // Seletores
    const hamburgerMenu = document.querySelector(".hamburger-menu");
    const menuOverlay = document.querySelector(".menu-overlay");
    const sidebar = document.querySelector(".sidebar");
    const hamburgerIcon = document.querySelector(".hamburger-icon");

    // Função para alternar o menu
    function toggleMenu() {
        if (!sidebar || !hamburgerIcon || !menuOverlay) return;

        sidebar.classList.toggle("open");
        hamburgerIcon.classList.toggle("open");
        menuOverlay.classList.toggle("active");

        if (sidebar.classList.contains("open")) {
            menuOverlay.style.display = "block";
            document.body.classList.add("menu-open");
        } else {
            setTimeout(() => {
                menuOverlay.style.display = "none";
            }, 300);
            document.body.classList.remove("menu-open");
        }
    }

    // Evento de clique no botão do menu
    if (hamburgerMenu) {
        hamburgerMenu.addEventListener("click", toggleMenu);
    }

    // Evento de clique no overlay para fechar o menu
    if (menuOverlay) {
        menuOverlay.addEventListener("click", toggleMenu);
    }

    // Fecha o menu ao clicar em um link do menu (mobile)
    const menuLinks = document.querySelectorAll(".sidebar .nav-menu a");
    menuLinks.forEach((link) => {
        link.addEventListener("click", () => {
            if (window.innerWidth <= 992 && sidebar.classList.contains("open")) {
                toggleMenu();
            }
        });
    });

    // Fecha o menu ao redimensionar para desktop
    window.addEventListener("resize", () => {
        if (window.innerWidth > 992 && sidebar && sidebar.classList.contains("open")) {
            sidebar.classList.remove("open");
            if (hamburgerIcon) hamburgerIcon.classList.remove("open");
            if (menuOverlay) {
                menuOverlay.classList.remove("active");
                menuOverlay.style.display = "none";
            }
            document.body.classList.remove("menu-open");
        }
    });
});
