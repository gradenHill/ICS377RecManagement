(function checkAuth() {
    const isSignedIn = localStorage.getItem('isSignedIn') === 'true';
    if (!isSignedIn) {
        window.location.href = 'index.html'; 
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    const memberListContainer = document.getElementById('members-list');
    const addMemberForm = document.getElementById('add-member-form');
    const modalEl = document.getElementById('addMemberModal');
    const addMemberModal = modalEl ? new bootstrap.Modal(modalEl) : null;
    const modalTitle = document.querySelector('#addMemberModal .custom-modal-title');
    
    const addressDisplay = document.getElementById('address-display');
    const addressModalEl = document.getElementById('addressModal');
    const addressModal = addressModalEl ? new bootstrap.Modal(addressModalEl) : null;
    const addressForm = document.getElementById('edit-address-form');

    let isEditing = false;
    let editIndex = -1;
    let editOldName = "";

    function getPrimaryUser() {
        const defaultUser = { name: "John Doe", age: 38, gender: "Male" };
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (!storedUser) return defaultUser;
        return { ...defaultUser, ...storedUser }; 
    }

    function getFamilyMembers() {
        const members = JSON.parse(localStorage.getItem('householdMembers')) || [];
        return members.filter(m => m && m.name); 
    }

    function renderAddress() {
        const user = getPrimaryUser();
        if (addressDisplay) {
            addressDisplay.innerText = user.address || "No address provided";
            addressDisplay.classList.toggle('text-secondary', !user.address);
        }
    }

    const editAddrBtn = document.getElementById('edit-address-btn');
    if (editAddrBtn) {
        editAddrBtn.onclick = () => {
            const user = getPrimaryUser();
            document.getElementById('input-address').value = user.address || "";
            if(addressModal) addressModal.show();
        };
    }

    if (addressForm) {
        addressForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = getPrimaryUser();
            user.address = document.getElementById('input-address').value;
            localStorage.setItem('user', JSON.stringify(user));
            if(addressModal) addressModal.hide();
            renderAddress();
        });
    }

    function renderMembers() {
        if (!memberListContainer) return;
        const primaryUser = getPrimaryUser();
        const familyMembers = getFamilyMembers();
        const allMembers = [primaryUser, ...familyMembers];
        memberListContainer.innerHTML = allMembers.map((member, index) => `
            <div class="member-card mb-3">
                <div>
                    <span class="fs-5 fw-bold text-dark">${member.name}</span>
                    <span class="ms-3 text-secondary">${member.age} yrs • ${member.gender || 'Not specified'}</span>
                    ${index === 0 ? `<span class="badge bg-secondary ms-2">Account Holder</span>` : ''}
                </div>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-secondary fw-medium edit-member-btn" data-index="${index}">Edit</button>
                    ${index > 0 ? `<button class="btn btn-sm btn-outline-danger fw-medium ms-2 delete-member-btn" data-index="${index}">Delete</button>` : ''}
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

            if (isEditing) {
                const cart = JSON.parse(localStorage.getItem('cart') || '[]');
                const hasCartItems = cart.some(item => item.member === editOldName);

                if (hasCartItems) {
                    const proceed = confirm(`Warning: Modifying ${editOldName}'s details will remove their activities from the cart, as their eligibility may have changed. Proceed?`);
                    if (!proceed) return;
                    const updatedCart = cart.filter(item => item.member !== editOldName);
                    localStorage.setItem('cart', JSON.stringify(updatedCart));
                    if (typeof updateCartBadge === 'function') updateCartBadge();
                }

                if (editIndex === 0) {
                    const primaryUser = getPrimaryUser();
                    primaryUser.name = newMember.name;
                    primaryUser.age = newMember.age;
                    primaryUser.gender = newMember.gender;
                    localStorage.setItem('user', JSON.stringify(primaryUser));
                } else {
                    const familyMembers = getFamilyMembers();
                    familyMembers[editIndex - 1] = newMember;
                    localStorage.setItem('householdMembers', JSON.stringify(familyMembers));
                }
                isEditing = false;
                editOldName = "";
            } else {
                const familyMembers = getFamilyMembers();
                familyMembers.push(newMember);
                localStorage.setItem('householdMembers', JSON.stringify(familyMembers));
            }
            addMemberForm.reset();
            if(addMemberModal) addMemberModal.hide();
            renderMembers();
        });
    }

    if (memberListContainer) {
        memberListContainer.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            const primaryUser = getPrimaryUser();
            const familyMembers = getFamilyMembers();
            const allMembers = [primaryUser, ...familyMembers];
            const target = allMembers[index];
            if (e.target.classList.contains('delete-member-btn')) {
                const cart = JSON.parse(localStorage.getItem('cart') || '[]');
                const hasCartItems = cart.some(item => item.member === target.name);
                let msg = `Remove ${target.name}?`;
                if (hasCartItems) {
                    msg = `Warning: ${target.name} has activities in the cart. Deleting them will also remove their items from the cart. Proceed?`;
                }
                if (confirm(msg)) {
                    familyMembers.splice(index - 1, 1);
                    localStorage.setItem('householdMembers', JSON.stringify(familyMembers));
                    if (hasCartItems) {
                        const updatedCart = cart.filter(item => item.member !== target.name);
                        localStorage.setItem('cart', JSON.stringify(updatedCart));
                        if (typeof updateCartBadge === 'function') updateCartBadge();
                    }
                    renderMembers();
                }
            }
            if (e.target.classList.contains('edit-member-btn')) {
                document.getElementById('new-member-name').value = target.name;
                document.getElementById('new-member-age').value = target.age;
                if (target.gender) {
                    const genderInput = document.querySelector(`input[name="new-gender"][value="${target.gender}"]`);
                    if (genderInput) genderInput.checked = true;
                }
                isEditing = true;
                editIndex = index;
                editOldName = target.name; // Keep track of their old name for the cart check
                if (modalTitle) modalTitle.innerText = "Edit Member Info";
                if(addMemberModal) addMemberModal.show();
            }
        });
    }

    const addBtn = document.getElementById('open-add-member');
    if (addBtn) {
        addBtn.onclick = () => {
            isEditing = false;
            editOldName = "";
            addMemberForm.reset();
            document.getElementById('g-male').checked = true; 
            if (modalTitle) modalTitle.innerText = "Add Household Member";
            if(addMemberModal) addMemberModal.show();
        };
    }

    const signOutBtn = document.getElementById('sign-out-btn');
    if (signOutBtn) {
        signOutBtn.onclick = () => {
            localStorage.clear(); 
            window.location.href = 'index.html';
        };
    }

    const addPaymentBtn = document.getElementById('add-payment-btn');
    if (addPaymentBtn) {
        addPaymentBtn.onclick = () => alert("This prototype ends here. In production, this would open a secure payment form.");
    }
    
    renderAddress();
    renderMembers();
});