let isSignedIn = localStorage.getItem('isSignedIn') === 'true';

document.addEventListener('DOMContentLoaded', () => {
    const authModalElement = document.getElementById('authModal');
    const memberModalElement = document.getElementById('memberModal');
    const authModal = authModalElement ? new bootstrap.Modal(authModalElement) : null;
    const memberModal = memberModalElement ? new bootstrap.Modal(memberModalElement) : null;
    const loginSimBtn = document.getElementById('login-sim-btn');
    let currentSelection = null;
    const activityContainer = document.getElementById('activity-list');
    const filterContainer = document.getElementById('filter-sidebar');
    const tabContainer = document.getElementById('catalog-tabs');
    const resultsHeader = document.getElementById('results-count');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');

    let activities = [];
    let filterConfig = [];
    let activeTab = "All";
    let currentView = "catalog"; 
    let selectedActivity = null;

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

    if (loginSimBtn && authModal) {
        loginSimBtn.onclick = () => {
            isSignedIn = true; 
            localStorage.setItem('isSignedIn', 'true'); 
            
            authModal.hide();
            updateUI(); 
            alert("You are now signed in! This will persist even if you reload.");
        };
    }

    function handleSignOut() {
        isSignedIn = false;
        localStorage.setItem('isSignedIn', 'false');
        window.location.reload(); 
    }

    if (activityContainer) {
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
    }

    function getActiveFilters() {
        const filters = {};
        if (!filterConfig) return {};
        filterConfig.forEach(cat => {
            filters[cat.id] = Array.from(document.querySelectorAll(`input[data-category="${cat.id}"]:checked`)).map(cb => cb.value);
        });
        return filters;
    }

    function filterAndRank(list, filters, search) {
        let result = list.filter(act => {
            if (activeTab !== "All" && act.category !== activeTab) return false;
            return Object.keys(filters).every(catId => {
                const selected = filters[catId];
                if (selected.length === 0) return true;
                if (catId === 'days') {
                    return act.sections.some(sec => 
                        sec.days.some(day => selected.includes(day))
                    );
                }
                if (catId === 'age') {
                    return selected.some(opt => {
                        if (opt === "Youth") return act.minAge <= 12;
                        if (opt === "Adult") return act.minAge <= 54 && act.maxAge >= 18;
                        if (opt === "Senior") return act.maxAge >= 55;
                        return true; 
                    });
                }
                if (catId === 'gender') {
                    return selected.some(opt => {
                        if (opt === "Men") return act.allowedGenders.includes("Male");
                        if (opt === "Women") return act.allowedGenders.includes("Female");
                        if (opt === "Co-Rec") return act.allowedGenders.includes("Male") && act.allowedGenders.includes("Female");
                        return false;
                    });
                }
                if (catId === 'sport') {
                    return selected.some(opt => {
                        if (opt === "Other") {
                            const mainSports = ["basketball", "volleyball", "kickball", "bean bags"];
                            return act.category === "Sports" && !mainSports.some(s => act.name.toLowerCase().includes(s));
                        }
                        return act.name.toLowerCase().includes(opt.toLowerCase()) || 
                               act.category.toLowerCase().includes(opt.toLowerCase());
                    });
                }
                return true;
            });
        });
        if (search.trim() !== "") {
            result = result.map(act => ({
                ...act,
                score: getLongestMatchLength(act.name, search)
            })).filter(act => act.score > 0).sort((a, b) => b.score - a.score);
        }
        return result;
    }

    function renderCatalog(list) {
        activityContainer.innerHTML = list.length > 0 
            ? list.map(act => `
                <div class="activity-card activity-card-trigger" data-id="${act.id}" style="cursor:pointer">
                    <div class="d-flex align-items-center w-100">
                        <div class="bg-light border rounded-3 p-3 me-4 fw-bold text-center text-secondary" style="width:65px;">${act.abbr}</div>
                        <div class="flex-grow-1">
                            <h5 class="mb-1 fw-bold text-dark">${act.name}</h5>
                            <small class="text-muted">Ages ${act.minAge}-${act.maxAge} • ${act.category}</small>
                        </div>
                        <i class="bi bi-chevron-right text-muted fs-5"></i>
                    </div>
                </div>`).join('')
            : `<div class="text-center py-5 text-muted fw-semibold">No activities match your filters.</div>`;
    }

    function updateUI() {
        if (!activityContainer) return;
        
        const filters = getActiveFilters();
        const searchTerm = searchInput ? searchInput.value : "";
        const sidebarCount = Object.values(filters).flat().length;

        const clearBtn = document.getElementById('clear-filters-btn');
        if (clearBtn) {
            clearBtn.style.visibility = sidebarCount > 0 ? 'visible' : 'hidden';
        }

        if (currentView === "catalog") {
            const filtered = filterAndRank(activities, filters, searchTerm);
            renderCatalog(filtered);
            
            if(tabContainer) tabContainer.classList.remove('d-none');
            updateStatusHeader(filtered.length, searchTerm);
        } else {
            const isActivityValid = filterAndRank([selectedActivity], filters, searchTerm).length > 0;
            let filteredSections = [];
            if (isActivityValid) {
                filteredSections = selectedActivity.sections.filter(sec => {
                    if (filters.days.length === 0) return true;
                    return sec.days.some(d => filters.days.includes(d));
                });
            }
            renderDetail(selectedActivity, filteredSections);
            if(tabContainer) tabContainer.classList.add('d-none');
            if(resultsHeader) resultsHeader.innerText = `Viewing: ${selectedActivity.name}`;
        }
    }

    function renderDetail(act, sections) {
        const genderText = act.allowedGenders ? act.allowedGenders.join(', ') : 'All Genders';

        activityContainer.innerHTML = `
            <div class="card border-0 rounded-4 shadow-sm p-4 bg-white">
                <div class="d-flex justify-content-start align-items-center mb-4 border-bottom pb-3">
                    <button id="back-btn" class="btn-secondary">
                        <i class="bi bi-chevron-left me-1"></i>Back
                    </button>
                    
                    <h3 class="fw-bold ms-4 mb-0 text-dark">${act.name}</h3>
                </div>
                <p class="text-secondary mb-4 lh-lg">${act.description}</p>
                <div class="d-flex flex-column gap-3">
                    ${sections.length > 0 ? sections.map(sec => `
                        <div class="card p-3 border rounded-3 shadow-sm">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <span class="fw-bold text-dark d-block mb-1">${sec.name}</span>
                                    <div class="small text-muted">
                                        Eligible: <span class="fw-medium">${genderText}</span>
                                    </div>
                                </div>
                                <div class="d-flex align-items-center gap-3">
                                    <span class="fw-bold text-dark fs-5">$${sec.price}</span>
                                    <button class="btn-primary cart-trigger" 
                                            data-section-name="${sec.name}" 
                                            data-price="${sec.price}">Add to Cart</button>
                                </div>
                            </div>
                        </div>`).join('') : `<div class="text-center py-5 text-muted fw-semibold bg-light rounded-3 border">No sessions match your current filters.</div>`}
                </div>
            </div>`;

        document.getElementById('back-btn').onclick = () => { 
            if (searchInput) searchInput.value = "";
            currentView = "catalog"; 
            updateUI(); 
        };

        document.querySelectorAll('.cart-trigger').forEach(btn => {
            btn.onclick = (e) => {
                if (!isSignedIn) {
                    if(authModal) authModal.show();
                    return;
                }

                currentSelection = {
                    activity: act.name,
                    section: e.target.dataset.sectionName,
                    price: e.target.dataset.price
                };
                document.getElementById('modal-activity-info').innerText = `${currentSelection.activity} - ${currentSelection.section}`;

                const primaryUser = JSON.parse(localStorage.getItem('user')) || { name: "John Doe", age: 38, gender: "Male" };
                const familyMembers = JSON.parse(localStorage.getItem('householdMembers')) || [];
                const allMembers = [primaryUser, ...familyMembers].filter(m => m && m.name);
                
                const currentCart = JSON.parse(localStorage.getItem('cart') || '[]');

                const listContainer = document.getElementById('member-selection-list');
                listContainer.innerHTML = allMembers.map(member => {
                    const age = parseInt(member.age);
                    const isAgeValid = age >= (act.minAge || 0) && age <= (act.maxAge || 999);
                    const isGenderValid = !act.allowedGenders || act.allowedGenders.includes(member.gender);
                    
                    const isAlreadyInCart = currentCart.some(item => 
                        item.activity === currentSelection.activity && 
                        item.section === currentSelection.section && 
                        item.member === member.name
                    );
                    
                    const isEligible = isAgeValid && isGenderValid && !isAlreadyInCart;
                    
                    let statusText = isEligible ? 'Select' : 'Ineligible';
                    let badgeClass = isEligible ? 'bg-secondary' : 'bg-danger';
                    let reason = "";

                    if (isAlreadyInCart) {
                        reason = " (Already in Cart)";
                        statusText = "In Cart";
                        badgeClass = "bg-warning text-dark"; 
                    } else if (!isAgeValid) {
                        reason = " (Age Ineligible)";
                    } else if (!isGenderValid) {
                        reason = " (Gender Ineligible)";
                    }

                    return `
                        <button class="btn btn-outline-secondary text-start p-3 rounded-3 d-flex justify-content-between align-items-center selection-btn ${!isEligible ? 'opacity-50 disabled' : ''}" 
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

                document.querySelectorAll('.selection-btn:not(.disabled)').forEach(sBtn => {
                    sBtn.onclick = () => {
                        const chosenMember = sBtn.dataset.member;
                        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
                        cart.push({ ...currentSelection, member: chosenMember });
                        localStorage.setItem('cart', JSON.stringify(cart));

                        if(memberModal) memberModal.hide();
                        updateCartBadge();
                        
                        const toastEl = document.getElementById('cartToast');
                        if(toastEl) {
                            const toast = new bootstrap.Toast(toastEl);
                            toast.show();
                        }
                    };
                });

                if(memberModal) memberModal.show();
            };
        });
    }
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
        
        // Extract unique categories from activities
        const categories = [...new Set(activities.map(a => a.category))];
        
        // Render buttons directly into the container
        tabContainer.innerHTML = 
            `<button class="catalog-tab-btn active" data-tab="All">All Activities</button>` +
            categories.map(c => `<button class="catalog-tab-btn" data-tab="${c}">${c}</button>`).join('');
    }

    function renderFilters() {
        if (!filterContainer) return;
        filterContainer.innerHTML = filterConfig.map((cat, index) => `
            <div class="mb-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="fw-bold mb-0 text-dark">${cat.label}</h6>
                    ${index === 0 ? `<button id="clear-filters-btn" class="btn btn-link text-danger p-0 text-decoration-none" style="font-size: 0.75rem;">Clear All</button>` : ''}
                </div>
                ${cat.options.map(opt => `
                    <div class="form-check mb-2">
                        <input class="form-check-input filter-check" type="checkbox" data-category="${cat.id}" value="${opt}" id="${cat.id}-${opt}">
                        <label class="form-check-label text-secondary fw-medium" for="${cat.id}-${opt}">${opt}</label>
                    </div>`).join('')}
            </div>`).join('');
        
        const clearBtn = document.getElementById('clear-filters-btn');
        if (clearBtn) clearBtn.onclick = () => { document.querySelectorAll('.filter-check').forEach(c => c.checked = false); updateUI(); };
    }

    function updateStatusHeader(count, search) {
        if (!resultsHeader) return;
        resultsHeader.innerText = search ? `Found ${count} Activities for "${search}"` : "Showing All Activities";
    }
    if (tabContainer) {
        tabContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.catalog-tab-btn');
            if (btn) {
                tabContainer.querySelectorAll('.catalog-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeTab = btn.dataset.tab;
                if (currentView === "detail") {
                    currentView = "catalog";
                }
                updateUI();
            }
        });
    }
    if (filterContainer) filterContainer.addEventListener('change', updateUI);
    if (searchInput) searchInput.addEventListener('input', updateUI);
    if (searchBtn) searchBtn.onclick = updateUI;
});