function toggleMenuMobile() {
    const menu = document.querySelector('.unitec-menu');
    const icon = document.getElementById('iconMenu');
    menu.classList.toggle('active');

    if (menu.classList.contains('active')) {
        icon.className = 'ri-close-line';
        document.body.style.overflow = 'hidden';
    } else {
        icon.className = 'ri-menu-line';
        document.body.style.overflow = 'auto';
    }
}

function fecharMenuMobile() {
    const menu = document.querySelector('.unitec-menu');
    const icon = document.getElementById('iconMenu');
    if (menu.classList.contains('active')) {
        menu.classList.remove('active');
        icon.className = 'ri-menu-line';
        document.body.style.overflow = 'auto';
    }
}