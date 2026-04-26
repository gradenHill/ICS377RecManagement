let isSignedIn = localStorage.getItem('isSignedIn') === 'true';

function updateCartBadge() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const badge = document.getElementById('cart-badge');
    
    if (badge) {
        if (cart.length > 0) {
            badge.innerText = cart.length;
            badge.classList.remove('d-none'); // Show it
        } else {
            badge.classList.add('d-none'); // Hide it if empty
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Selectors
    const authModal = new bootstrap.Modal(document.getElementById('authModal'));
    const memberModal = new bootstrap.Modal(document.getElementById('memberModal'));
    const loginSimBtn = document.getElementById('login-sim-btn');
    let currentSelection = null;
    const activityContainer = document.getElementById('activity-list');
    const filterContainer = document.getElementById('filter-sidebar');
    const tabContainer = document.getElementById('catalog-tabs');
    const resultsHeader = document.getElementById('results-count');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');


    // State
    let activities = [];
    let filterConfig = [];
    let activeTab = "All";
    let currentView = "catalog"; 
    let selectedActivity = null;

    // 1. Initial Load
    Promise.all([
        fetch('data/activities.json').then(res => res.json()),
        fetch('data/filters.json').then(res => res.json())
    ]).then(([activityData, filterData]) => {
        activities = activityData;
        filterConfig = filterData.categories;
        renderTabs();
        renderFilters();
        updateUI();
    });

    updateCartBadge();

    if (loginSimBtn) {
        loginSimBtn.onclick = () => {
            isSignedIn = true; 
            // Save the state so it survives a reload
            localStorage.setItem('isSignedIn', 'true'); 
            
            authModal.hide();
            updateUI(); // Refresh the view now that we're "logged in"
            alert("You are now signed in! This will persist even if you reload.");
        };
    }



    function handleSignOut() {
        isSignedIn = false;
        localStorage.setItem('isSignedIn', 'false');
        // localStorage.removeItem('user'); // Optional: clear user data too
        window.location.reload(); // Refresh to lock the "Add to Cart" buttons again
    }

    // 2. View Switching Logic
    activityContainer.addEventListener('click', (e) => {
        const link = e.target.closest('.activity-card-trigger');
        if (link) {
            e.preventDefault();
            const id = link.getAttribute('data-id');
            selectedActivity = activities.find(a => a.id === id);
            currentView = "detail";
            updateUI();
        }
    });

    // 4. Missing Helper: getActiveFilters
    function getActiveFilters() {
        const filters = {};
        if (!filterConfig) return {};
        filterConfig.forEach(cat => {
            filters[cat.id] = Array.from(document.querySelectorAll(`input[data-category="${cat.id}"]:checked`))
                                   .map(cb => cb.value);
        });
        return filters;
    }

    function filterAndRank(list, filters, search) {
        let result = list.filter(act => {
            // 1. Category Tab Check (Horizontal Tabs)
            if (activeTab !== "All" && act.category !== activeTab) return false;
            
            // 2. Sidebar Filter Checks
            return Object.keys(filters).every(catId => {
                const selected = filters[catId];
                if (selected.length === 0) return true; // Skip if no options selected
                
                // DAYS FILTER: Checks sections
                if (catId === 'days') {
                    return act.sections.some(sec => 
                        sec.days.some(day => selected.includes(day))
                    );
                }
                
                // AGE FILTER: Maps "Youth", "Adult", "Senior" to ranges
                if (catId === 'age') {
                    return selected.some(opt => {
                        if (opt === "Youth") return act.minAge <= 12;
                        if (opt === "Adult") return act.maxAge >= 18 && act.minAge < 55;
                        if (opt === "Senior") return act.minAge >= 55;
                        return true; // "All Ages"
                    });
                }

                // GENDER FILTER: Checks allowedGenders array
                if (catId === 'gender') {
                    return selected.some(opt => {
                        if (opt === "Men") return act.allowedGenders.includes("Male");
                        if (opt === "Women") return act.allowedGenders.includes("Female");
                        if (opt === "Co-Rec") return act.allowedGenders.length > 1;
                        return false;
                    });
                }

                // SPORT FILTER: Checks name or category
                if (catId === 'sport') {
                    return selected.some(opt => 
                        act.name.toLowerCase().includes(opt.toLowerCase()) || 
                        act.category.toLowerCase().includes(opt.toLowerCase())
                    );
                }
                
                return true;
            });
        });

        // 3. Search Ranking remains the same
        if (search.trim() !== "") {
            result = result.map(act => ({
                ...act,
                score: getLongestMatchLength(act.name, search)
            })).filter(act => act.score > 0).sort((a, b) => b.score - a.score);
        }
        
        return result;
    }

    // 5. Rendering functions
    function renderCatalog(list) {
        activityContainer.innerHTML = list.length > 0 
            ? list.map(act => `
                <div class="card p-3 shadow-sm border rounded-4 activity-card-trigger mb-3" data-id="${act.id}" style="cursor:pointer">
                    <div class="d-flex align-items-center">
                        <div class="bg-light border rounded-3 p-3 me-4 fw-bold text-center" style="width:60px;">${act.abbr}</div>
                        <div class="flex-grow-1">
                            <h5 class="mb-0 fw-bold">${act.name}</h5>
                            <small class="text-muted">Ages ${act.minAge}-${act.maxAge} • ${act.category}</small>
                        </div>
                        <i class="bi bi-chevron-right text-muted"></i>
                    </div>
                </div>`).join('')
            : `<div class="text-center py-5 text-muted">No activities match your filters.</div>`;
    }

    function updateUI() {
        if (!activityContainer) return;
        
        const filters = getActiveFilters();
        const searchTerm = searchInput ? searchInput.value : "";
        const sidebarCount = Object.values(filters).flat().length;

        // FIX: Re-added visibility logic for "Clear All"
        const clearBtn = document.getElementById('clear-filters-btn');
        if (clearBtn) {
            clearBtn.style.visibility = sidebarCount > 0 ? 'visible' : 'hidden';
        }

        if (currentView === "catalog") {
            // Parent activities disappear if no sections match the days
            const filtered = filterAndRank(activities, filters, searchTerm);
            renderCatalog(filtered);
            
            if(tabContainer) tabContainer.classList.remove('d-none');
            updateStatusHeader(filtered.length, searchTerm);
        } else {
            // Inside Detail View: Only show sections matching the active days
            const filteredSections = selectedActivity.sections.filter(sec => {
                if (filters.days.length === 0) return true;
                return sec.days.some(d => filters.days.includes(d));
            });

            renderDetail(selectedActivity, filteredSections);
            
            if(tabContainer) tabContainer.classList.add('d-none');
            if(resultsHeader) resultsHeader.innerText = `Viewing: ${selectedActivity.name}`;
        }
    }

    function renderDetail(act, sections) {
        activityContainer.innerHTML = `
            <div class="card border rounded-4 shadow-sm p-4 bg-white">
                <div class="d-flex justify-content-start align-items-center mb-4 border-bottom pb-3">
                    <button id="back-btn" class="btn btn-outline-dark rounded-pill px-4">
                        <i class="bi bi-chevron-left me-1"></i>Back
                    </button>
                    
                    <h3 class="fw-bold ms-4 mb-0">${act.name}</h3>
                </div>
                <p class="text-muted mb-4">${act.description}</p>
                <div class="d-flex flex-column gap-3">
                    ${sections.map(sec => `
                        <div class="card p-3 border rounded-3">
                            <div class="d-flex justify-content-between align-items-center">
                                <div><span class="fw-bold">${sec.name}</span></div>
                                <div class="d-flex align-items-center gap-3">
                                    <span class="fw-bold">$${sec.price}</span>
                                    <button class="btn btn-dark px-3 fw-bold cart-trigger" 
                                            data-section-name="${sec.name}" 
                                            data-price="${sec.price}">Add to Cart</button>
                                </div>
                            </div>
                        </div>`).join('')}
                </div>
            </div>`;

        document.getElementById('back-btn').onclick = () => { currentView = "catalog"; updateUI(); };

        document.querySelectorAll('.cart-trigger').forEach(btn => {
            btn.onclick = (e) => {
                if (!isSignedIn) {
                    authModal.show();
                    return;
                }

                currentSelection = {
                    activity: act.name,
                    section: e.target.dataset.sectionName,
                    price: e.target.dataset.price
                };
                document.getElementById('modal-activity-info').innerText = `${currentSelection.activity} - ${currentSelection.section}`;

                // 1. Fetch household and current cart
                const primaryUser = JSON.parse(localStorage.getItem('user')) || { name: "John Doe", age: 38, gender: "Male" };
                const familyMembers = JSON.parse(localStorage.getItem('householdMembers')) || [];
                const allMembers = [primaryUser, ...familyMembers].filter(m => m && m.name);
                
                // NEW: Get current cart to check for duplicates
                const currentCart = JSON.parse(localStorage.getItem('cart') || '[]');

                // 2. Build the list with AGE, GENDER, and DUPLICATE checks
                const listContainer = document.getElementById('member-selection-list');
                listContainer.innerHTML = allMembers.map(member => {
                    // Validation Logic
                    const age = parseInt(member.age);
                    const isAgeValid = age >= (act.minAge || 0) && age <= (act.maxAge || 999);
                    const isGenderValid = !act.allowedGenders || act.allowedGenders.includes(member.gender);
                    
                    // NEW: Duplicate Check Logic
                    const isAlreadyInCart = currentCart.some(item => 
                        item.activity === currentSelection.activity && 
                        item.section === currentSelection.section && 
                        item.member === member.name
                    );
                    
                    // A member is only "eligible" if they pass age/gender AND aren't already registered
                    const isEligible = isAgeValid && isGenderValid && !isAlreadyInCart;
                    
                    let statusText = isEligible ? 'Select' : 'Ineligible';
                    let badgeClass = isEligible ? 'bg-secondary' : 'bg-danger';
                    let reason = "";

                    if (isAlreadyInCart) {
                        reason = " (Already in Cart)";
                        statusText = "In Cart";
                        badgeClass = "bg-warning text-dark"; // Use yellow for visibility of system status
                    } else if (!isAgeValid) {
                        reason = " (Age Ineligible)";
                    } else if (!isGenderValid) {
                        reason = " (Gender Ineligible)";
                    }

                    return `
                        <button class="btn btn-outline-dark text-start p-3 rounded-3 d-flex justify-content-between align-items-center selection-btn ${!isEligible ? 'opacity-50 disabled' : ''}" 
                                data-member="${member.name}"
                                ${!isEligible ? 'disabled' : ''}>
                            <div>
                                <span class="fw-bold">${member.name}</span>
                                <div class="small text-muted">${member.age} yrs • ${member.gender}${reason}</div>
                            </div>
                            <span class="badge ${badgeClass}">${statusText}</span>
                        </button>
                    `;
                }).join('');

                // 3. Attach click events only to eligible buttons
                document.querySelectorAll('.selection-btn:not(.disabled)').forEach(sBtn => {
                    sBtn.onclick = () => {
                        const chosenMember = sBtn.dataset.member;
                        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
                        cart.push({ ...currentSelection, member: chosenMember });
                        localStorage.setItem('cart', JSON.stringify(cart));

                        memberModal.hide();
                        if (typeof updateCartBadge === 'function') updateCartBadge();
                        
                        // Visual Toast or Alert feedback
                        alert(`${currentSelection.activity} added for ${chosenMember}!`);
                    };
                });

                memberModal.show();
            };
        });
        
    }

    // Logic for final member selection (Cart Responsiveness) 
    document.querySelectorAll('.member-select-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const member = e.currentTarget.dataset.member;
            
            // 1. Save to cart (localStorage)
            const cart = JSON.parse(localStorage.getItem('cart') || '[]');
            cart.push({ ...currentSelection, member });
            localStorage.setItem('cart', JSON.stringify(cart));

            // 2. Visual feedback
            memberModal.hide();
            const toast = new bootstrap.Toast(document.getElementById('cartToast'));
            toast.show();
            
            // Update navigation badge
            const badge = document.getElementById('cart-badge');
            if (badge) {
                badge.innerText = cart.length;
                badge.classList.remove('d-none');
            }
        });
    });

    // 6. Ranking Helpers
    function normalizeSimple(str) { return str.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim(); }
    function getLongestMatchLength(name, query) {
        const n = normalizeSimple(name), q = normalizeSimple(query);
        if (!q) return 0;
        let longest = 0;
        for (let i = 0; i < n.length; i++) {
            for (let j = i + 1; j <= n.length; j++) {
                const sub = n.substring(i, j);
                if (q.includes(sub) && sub.length > longest) longest = sub.length;
            }
        }
        return longest;
    }

    function renderTabs() {
        if (!tabContainer) return;
        const categories = [...new Set(activities.map(a => a.category))];
        tabContainer.innerHTML = `<li class="nav-item"><button class="nav-link active rounded-pill px-4 shadow-sm border bg-dark text-white" data-tab="All">All</button></li>` +
            categories.map(c => `<li class="nav-item"><button class="nav-link rounded-pill px-4 shadow-sm border bg-white text-dark" data-tab="${c}">${c}</button></li>`).join('');
    }

    function renderFilters() {
        if (!filterContainer) return;
        filterContainer.innerHTML = filterConfig.map((cat, index) => `
            <div class="mb-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="fw-bold mb-0">${cat.label}</h6>
                    ${index === 0 ? `<button id="clear-filters-btn" class="btn btn-link text-danger p-0 text-decoration-none" style="font-size: 0.75rem;">Clear All</button>` : ''}
                </div>
                ${cat.options.map(opt => `
                    <div class="form-check mb-2">
                        <input class="form-check-input filter-check" type="checkbox" data-category="${cat.id}" value="${opt}" id="${cat.id}-${opt}">
                        <label class="form-check-label" for="${cat.id}-${opt}">${opt}</label>
                    </div>`).join('')}
            </div>`).join('');
        
        const clearBtn = document.getElementById('clear-filters-btn');
        if (clearBtn) clearBtn.onclick = () => { document.querySelectorAll('.filter-check').forEach(c => c.checked = false); updateUI(); };
    }

    function updateStatusHeader(count, search) {
        if (!resultsHeader) return;
        resultsHeader.innerText = search ? `Found ${count} Activities for "${search}"` : "Showing All Activities";
    }

    // Event Delegation for Tabs and Filters
    if (tabContainer) {
        tabContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.nav-link');
            if (btn) {
                tabContainer.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active', 'bg-dark', 'text-white'));
                btn.classList.add('active', 'bg-dark', 'text-white');
                activeTab = btn.dataset.tab;
                currentView = "catalog";
                updateUI();
            }
        });
    }

    if (filterContainer) filterContainer.addEventListener('change', updateUI);
    if (searchInput) searchInput.addEventListener('input', updateUI);
    if (searchBtn) searchBtn.onclick = updateUI;
});