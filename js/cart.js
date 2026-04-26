document.addEventListener('DOMContentLoaded', () => {
    const listContainer = document.getElementById('cart-items-list');
    const subtotalEl = document.getElementById('cart-subtotal');
    const totalEl = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');

    function renderCart() {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        
        if (cart.length === 0) {
            listContainer.innerHTML = `
                <div class="text-center py-5 bg-white rounded-4 border border-dashed">
                    <i class="bi bi-cart-x fs-1 text-muted"></i>
                    <p class="mt-3 text-muted">Your cart is currently empty.</p>
                </div>`;
            subtotalEl.innerText = "$0.00";
            totalEl.innerText = "$0.00";
            checkoutBtn.disabled = true;
            return;
        }

        let subtotal = 0;
        listContainer.innerHTML = cart.map((item, index) => {
            subtotal += parseFloat(item.price);
            return `
                <div class="card border-0 shadow-sm rounded-4 p-3 mb-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center">
                            <div class="bg-light rounded-3 p-3 me-3 text-center" style="width: 60px;">
                                <i class="bi bi-person-check-fill fs-4 text-dark"></i>
                            </div>
                            <div>
                                <h6 class="fw-bold mb-0">${item.activity}</h6>
                                <p class="text-muted small mb-0">${item.section} • <strong>Participant: ${item.member}</strong></p>
                            </div>
                        </div>
                        <div class="text-end">
                            <span class="fw-bold d-block">$${item.price}</span>
                            <button class="btn btn-sm btn-link text-danger p-0 remove-item" data-index="${index}">
                                Remove
                            </button>
                        </div>
                    </div>
                </div>`;
        }).join('');

        subtotalEl.innerText = `$${subtotal.toFixed(2)}`;
        totalEl.innerText = `$${subtotal.toFixed(2)}`;
        checkoutBtn.disabled = false;

        // Attach remove events
        document.querySelectorAll('.remove-item').forEach(btn => {
            btn.onclick = (e) => removeItem(e.target.dataset.index);
        });
    }

    function removeItem(index) {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        cart.splice(index, 1);
        localStorage.setItem('cart', JSON.stringify(cart));
        renderCart();
    }

    if (checkoutBtn) {
        checkoutBtn.onclick = () => {
            alert("Thank you! This high-fidelity prototype ends here. In a real system, you would now enter payment info.");
            localStorage.removeItem('cart'); // Clear after "checkout"
            window.location.href = 'index.html';
        };
    }

    renderCart();
});