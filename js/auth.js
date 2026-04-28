function updateNavbar() {
    const isSignedIn = localStorage.getItem('isSignedIn') === 'true';
    const navLink = document.getElementById('main-nav-link');
    if (navLink) {
        if (isSignedIn) {
            navLink.innerText = "ACCOUNT";
            navLink.href = "account.html";
        } else {
            navLink.innerText = "LOG IN / SIGN UP";
            navLink.href = "signup.html";
        }
    }
}

function updateCartBadge() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const badge = document.getElementById('cart-badge');
    
    if (badge) {
        if (cart.length > 0) {
            badge.innerText = cart.length;
            badge.classList.remove('d-none');
        } else {
            badge.classList.add('d-none');
        }
    }
}
updateNavbar();
document.addEventListener('DOMContentLoaded', updateCartBadge);