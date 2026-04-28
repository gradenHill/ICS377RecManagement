document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const activityId = params.get('id');
    const memberModal = new bootstrap.Modal(document.getElementById('memberModal'));
    let currentSection = null;

    fetch('data/activities.json')
        .then(res => res.json())
        .then(data => {
            const activity = data.find(a => a.id === activityId);
            if (activity) renderDetail(activity);
        });

    function renderDetail(activity) {
        document.getElementById('activity-name').innerText = activity.name;
        document.getElementById('activity-abbr').innerText = activity.abbr;
        
        const list = document.getElementById('sections-list');
        list.innerHTML = activity.sections.map(sec => `
            <div class="card p-3 border rounded-3">
                <div class="d-flex justify-content-between align-items-center">
                    <span class="fs-5 fw-bold">${sec.name}</span>
                    <div class="d-flex align-items-center gap-4">
                        <span class="fs-5 fw-bold">$${sec.price}</span>
                        <button class="btn btn-dark px-4 fw-bold add-btn" 
                                data-section="${sec.name}" 
                                data-price="${sec.price}">Add to Cart</button>
                    </div>
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.add-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                currentSection = {
                    name: e.target.dataset.section,
                    price: e.target.dataset.price,
                    activity: activity.name
                };
                document.getElementById('modal-activity-name').innerText = `"${currentSection.activity}: ${currentSection.name}"`;
                memberModal.show();
            });
        });
    }

    document.querySelectorAll('.member-select-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const member = e.currentTarget.dataset.member;
            const cart = JSON.parse(localStorage.getItem('cart') || '[]');
            cart.push({ ...currentSection, member });
            localStorage.setItem('cart', JSON.stringify(cart));
            memberModal.hide();
            alert(`Success! ${currentSection.name} added to cart for ${member}.`);
        });
    });
});