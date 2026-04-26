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

// Call it immediately on every page load
updateNavbar();