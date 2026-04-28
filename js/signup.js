document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');
    const loginLink = document.getElementById('login-info-link');
    const protoModal = new bootstrap.Modal(document.getElementById('prototypeModal'));
    if (loginLink) {
        loginLink.onclick = (e) => {
            e.preventDefault();
            protoModal.show();
        };
    }

    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        localStorage.clear();
        const genderRaw = signupForm.querySelector('input[name="gender"]:checked').value;
        const gender = genderRaw.charAt(0).toUpperCase() + genderRaw.slice(1); // Capitalizes it correctly

        const userData = {
            name: signupForm.querySelector('input[type="text"]').value,
            age: signupForm.querySelector('input[type="number"]').value,
            email: signupForm.querySelector('input[type="email"]').value,
            gender: gender, 
            address: "" 
        };

        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('isSignedIn', 'true');
        window.location.href = 'index.html';
    });

});

