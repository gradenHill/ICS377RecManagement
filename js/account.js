// js/account.js

// 1. Safety Check: If not signed in, kick to home immediately
(function checkAuth() {
    const isSignedIn = localStorage.getItem('isSignedIn') === 'true';
    if (!isSignedIn) {
        window.location.href = 'index.html'; 
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    const memberListContainer = document.getElementById('members-list');
    const addMemberForm = document.getElementById('add-member-form');
    const addMemberModal = new bootstrap.Modal(document.getElementById('addMemberModal'));
    const modalTitle = document.querySelector('#addMemberModal .modal-title');
    
    const addressDisplay = document.getElementById('address-display');
    const addressModal = new bootstrap.Modal(document.getElementById('addressModal'));
    const addressForm = document.getElementById('edit-address-form');

    let isEditing = false;
    let editIndex = -1;

    // --- ADDRESS LOGIC ---
    function renderAddress() {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && addressDisplay) {
            addressDisplay.innerText = user.address || "No address provided";
            addressDisplay.classList.toggle('text-muted', !user.address);
        }
    }

    const editAddrBtn = document.getElementById('edit-address-btn');
    if (editAddrBtn) {
        editAddrBtn.onclick = () => {
            const user = JSON.parse(localStorage.getItem('user')) || {};
            document.getElementById('input-address').value = user.address || "";
            addressModal.show();
        };
    }

    if (addressForm) {
        addressForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = JSON.parse(localStorage.getItem('user')) || {};
            user.address = document.getElementById('input-address').value;
            localStorage.setItem('user', JSON.stringify(user));
            addressModal.hide();
            renderAddress();
        });
    }

    // --- FAMILY MEMBERS LOGIC ---
    function renderMembers() {
        if (!memberListContainer) return;

        // Fallback to "John Doe" if the signup data isn't found
        const primaryUser = JSON.parse(localStorage.getItem('user')) || { name: "John Doe", age: 38 };
        const familyMembers = JSON.parse(localStorage.getItem('householdMembers')) || [];
        
        const allMembers = [primaryUser, ...familyMembers].filter(m => m && m.name);

        memberListContainer.innerHTML = allMembers.map((member, index) => `
            <div class="member-card mb-3">
                <div>
                    <span class="fs-5 fw-bold">${member.name}</span>
                    <span class="ms-3 text-muted">${member.age} yrs</span>
                </div>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-dark edit-member-btn" data-index="${index}">Edit</button>
                    ${index > 0 ? `<button class="btn btn-sm btn-outline-danger ms-2 delete-member-btn" data-index="${index}">Delete</button>` : ''}
                </div>
            </div>
        `).join('');
    }

    if (addMemberForm) {
        addMemberForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newMember = {
                name: document.getElementById('new-member-name').value,
                age: document.getElementById('new-member-age').value,
                gender: document.querySelector('input[name="new-gender"]:checked').value
            };

            const familyMembers = JSON.parse(localStorage.getItem('householdMembers')) || [];
            if (isEditing) {
                familyMembers[editIndex - 1] = newMember;
                isEditing = false;
            } else {
                familyMembers.push(newMember);
            }

            localStorage.setItem('householdMembers', JSON.stringify(familyMembers));
            addMemberForm.reset();
            addMemberModal.hide();
            renderMembers();
        });
    }

    if (memberListContainer) {
        memberListContainer.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            const rawFamily = JSON.parse(localStorage.getItem('householdMembers')) || [];
            const primaryUser = JSON.parse(localStorage.getItem('user')) || { name: "John Doe" };
            const displayed = [primaryUser, ...rawFamily].filter(m => m && m.name);
            const target = displayed[index];

            if (e.target.classList.contains('delete-member-btn')) {
                if (confirm(`Remove ${target.name}?`)) {
                    const updated = rawFamily.filter(m => m.name !== target.name);
                    localStorage.setItem('householdMembers', JSON.stringify(updated));
                    renderMembers();
                }
            }

            if (e.target.classList.contains('edit-member-btn')) {
                document.getElementById('new-member-name').value = target.name;
                document.getElementById('new-member-age').value = target.age;
                isEditing = true;
                editIndex = index;
                if (modalTitle) modalTitle.innerText = "Edit Member Info";
                addMemberModal.show();
            }
        });
    }

    const addBtn = document.getElementById('open-add-member');
    if (addBtn) {
        addBtn.onclick = () => {
            isEditing = false;
            addMemberForm.reset();
            if (modalTitle) modalTitle.innerText = "Add Household Member";
            addMemberModal.show();
        };
    }

    // --- MISC LOGIC ---
    const signOutBtn = document.getElementById('sign-out-btn');
    if (signOutBtn) {
        signOutBtn.onclick = () => {
            localStorage.clear(); // Wipe all for a clean slate
            window.location.href = 'index.html';
        };
    }

    const addPaymentBtn = document.getElementById('add-payment-btn');
    if (addPaymentBtn) {
        addPaymentBtn.onclick = () => alert("This prototype ends here. In production, this would open a secure payment form.");
    }

    // Initial Renders
    renderAddress();
    renderMembers();
});