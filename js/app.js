// js/app.js

document.addEventListener('DOMContentLoaded', () => {
    
    // --- State ---
    let currentUser = null;
    let currentStoreId = null; 
    let allStores = []; // 매장 리스트 캐싱

    // --- DOM Elements ---
    const loginView = document.getElementById('login-view');
    const mainView = document.getElementById('main-view');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const navLinks = document.querySelectorAll('.nav-links li');
    const sections = document.querySelectorAll('.content-section');
    const pageTitle = document.getElementById('page-title');
    const btnLogout = document.getElementById('btn-logout');

    // --- Initialization ---
    checkAuthStatus();

    // 1. 로그인 상태 등 공통 체크
    async function checkAuthStatus() {
        const token = localStorage.getItem('access_token');
        if (token) {
            loginView.classList.remove('active');
            mainView.classList.add('active');
            
            try {
                allStores = await API.getStores(); // Array 캐싱
                if (allStores && allStores.length > 0) {
                    currentStoreId = allStores[0].id;
                    updateHeaderStoreDisplay(allStores[0].name);
                    
                    navLinks.forEach(l => l.style.pointerEvents = 'auto');
                    
                    // 초기 데이터 로드
                    loadDashboard();
                    
                    document.getElementById('store-name').value = allStores[0].name;
                    document.getElementById('store-address').value = allStores[0].address;
                    document.getElementById('settings-title').textContent = "내 매장 정보 관리";
                } else {
                    currentStoreId = null;
                    updateHeaderStoreDisplay("새 매장");
                    
                    alert("환영합니다! 매장 정보를 먼저 등록해 주세요.");
                    navLinks.forEach(l => l.style.pointerEvents = 'none');
                    document.querySelector('[data-target="settings-section"]').style.pointerEvents = 'auto'; 
                    
                    navigateTo('settings-section', '설정');
                }
            } catch (err) {
                console.error("Initialization errors:", err);
            }
        } else {
            mainView.classList.remove('active');
            loginView.classList.add('active');
        }
    }

    // --- Store Dropdown Logic ---
    const profileBtn = document.getElementById('user-profile-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    const storeDropdownList = document.getElementById('store-dropdown-list');

    profileBtn.addEventListener('click', (e) => {
        // 내부 클릭 시 전파 차단을 위해
        if(e.target.closest('#profile-dropdown')) return; 
        
        const isActive = profileDropdown.classList.contains('active');
        if(!isActive) {
            // Render store list
            storeDropdownList.innerHTML = '';
            allStores.forEach(s => {
                const li = document.createElement('li');
                li.innerHTML = `<i class="ph ph-storefront"></i> ${s.name}`;
                if(s.id === currentStoreId) li.classList.add('active-store');
                li.addEventListener('click', () => {
                    switchStore(s.id);
                });
                storeDropdownList.appendChild(li);
            });
            profileDropdown.classList.add('active');
        } else {
            profileDropdown.classList.remove('active');
        }
    });

    document.addEventListener('click', (e) => {
        if(!profileBtn.contains(e.target)) {
            profileDropdown.classList.remove('active');
        }
    });

    function switchStore(storeId) {
        currentStoreId = storeId;
        profileDropdown.classList.remove('active');
        const store = allStores.find(s => s.id === storeId);
        if(store) {
            updateHeaderStoreDisplay(store.name);
            document.getElementById('store-name').value = store.name;
            document.getElementById('store-address').value = store.address;
        }

        // 현재 활성화된 탭에 맞춰 데이터 리로드 (화면 깜빡임 없이 패치)
        const activeSection = document.querySelector('.content-section.active').id;
        if(activeSection === 'dashboard-section') loadDashboard();
        else if(activeSection === 'products-section') loadProducts();
        else if(activeSection === 'orders-section') loadOrders();
    }

    function updateHeaderStoreDisplay(name) {
        document.getElementById('store-name-display').textContent = name;
    }

    // 2. 폼 로그인
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const btn = document.getElementById('btn-login');

        try {
            btn.innerHTML = '로그인 중...';
            btn.disabled = true;
            loginError.textContent = '';

            const res = await API.login(username, password);
            localStorage.setItem('access_token', res.access_token);
            checkAuthStatus();
        } catch (error) {
            loginError.textContent = error.message;
        } finally {
            btn.innerHTML = '로그인';
            btn.disabled = false;
        }
    });

    // 3. 로그아웃
    btnLogout.addEventListener('click', () => {
        if(confirm("로그아웃 하시겠습니까?")) {
            localStorage.removeItem('access_token');
            checkAuthStatus();
        }
    });

    // 4. 네비게이션 라우팅
    function navigateTo(targetId, title) {
        navLinks.forEach(l => {
            l.classList.remove('active');
            if(l.getAttribute('data-target') === targetId) l.classList.add('active');
        });

        sections.forEach(sec => sec.classList.remove('active'));
        document.getElementById(targetId).classList.add('active');
        pageTitle.textContent = title;

        if(currentStoreId) {
            if(targetId === 'dashboard-section') loadDashboard();
            if(targetId === 'products-section') loadProducts();
            if(targetId === 'orders-section') loadOrders();
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navigateTo(link.getAttribute('data-target'), link.querySelector('span').textContent);
        });
    });

    // --- UI Rendering Functions ---

    // [A] 대시보드 로딩
    async function loadDashboard() {
        try {
            const sumData = await API.getDashboardSummary();
            document.getElementById('dashboard-today-sales').textContent = `₩${(sumData.today_sales || 0).toLocaleString()}`;
            document.getElementById('dashboard-today-orders').textContent = `${(sumData.today_orders || 0).toLocaleString()}건`;
            document.getElementById('dashboard-monthly-sales').textContent = `₩${(sumData.monthly_sales || 0).toLocaleString()}`;
        } catch(err) {
            console.error("Dashboard error", err);
        }
    }

    // [B] 상품 로직
    async function loadProducts() {
        const container = document.getElementById('product-list-container');
        container.innerHTML = '<div class="empty-state">상품 정보를 불러오고 있습니다...</div>';
        
        try {
            const products = await API.getProducts(currentStoreId);
            
            if (!products || products.length === 0) {
                container.innerHTML = '<div class="empty-state">등록된 상품이 없습니다. 새 상품을 등록해 보세요!</div>';
                return;
            }

            container.innerHTML = '';
            products.forEach(p => {
                const card = document.createElement('div');
                card.className = 'product-item';
                const isChecked = p.is_active ? 'checked' : '';
                const cardOpacity = p.is_active ? '1' : '0.5';

                let imgSrc = p.image;
                if(!imgSrc.startsWith('http')) {
                    imgSrc = 'http://127.0.0.1:8000' + imgSrc;
                }

                card.innerHTML = `
                    <div class="product-top" style="opacity: ${cardOpacity}">
                        <div style="display:flex; gap:12px; align-items:center;">
                            <img src="${imgSrc}" style="width:50px; height:50px; border-radius:8px; object-fit:cover; border:1px solid #efefef;">
                            <div>
                                <div class="product-name">${p.name}</div>
                                <div class="product-price">₩${p.price.toLocaleString()}</div>
                            </div>
                        </div>
                        <button class="btn-text" style="color:var(--danger);" onclick="window.deleteProduct('${p.id}')">삭제</button>
                    </div>
                    <div class="product-actions">
                        <div class="product-actions-group">
                            <span class="product-stock">재고: ${p.stock || 0}개</span>
                        </div>
                        <div class="product-actions-group">
                            <span style="font-size:14px; color:#636E72;">판매 중</span>
                            <label class="switch">
                                <input type="checkbox" data-id="${p.id}" ${isChecked} class="toggle-status">
                                <span class="slider"></span>
                            </label>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });

            document.querySelectorAll('.toggle-status').forEach(toggle => {
                toggle.addEventListener('change', async (e) => {
                    const id = e.target.getAttribute('data-id');
                    const isActive = e.target.checked;
                    try {
                        await API.updateProductStatus(id, isActive, null);
                        e.target.closest('.product-item').querySelector('.product-top').style.opacity = isActive ? '1' : '0.5';
                    } catch(err) {
                        alert("상태 변경 실패: " + err.message);
                        e.target.checked = !isActive; 
                    }
                });
            });
        } catch (error) {
            container.innerHTML = `<div class="empty-state" style="color:var(--danger)">상품을 불러오지 못했습니다.</div>`;
        }
    }

    window.deleteProduct = async (productId) => {
        if(confirm("정말로 이 상품을 삭제하시겠습니까?")) {
            try {
                await API.deleteProduct(currentStoreId, productId);
                loadProducts();
            } catch(e) {
                alert(e.message);
            }
        }
    }

    const modal = document.getElementById('product-modal');
    const btnOpenModal = document.getElementById('btn-open-modal');
    if(btnOpenModal) {
        btnOpenModal.addEventListener('click', async () => {
            try {
                const cats = await API.getCategories(currentStoreId);
                const select = document.getElementById('product-category');
                select.innerHTML = '<option value="">선택해주세요</option>';
                cats.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.textContent = c.name;
                    select.appendChild(opt);
                });
                modal.classList.add('active');
            } catch(err) {
                alert("카테고리 연동 오류!");
            }
        });
    }

    document.getElementById('close-modal').addEventListener('click', () => {
        modal.classList.remove('active');
        document.getElementById('product-form').reset();
    });

    document.getElementById('product-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-save-product');
        btn.disabled = true;
        btn.textContent = "업로드 중...";

        try {
            const fileInput = document.getElementById('product-image-file');
            const file = fileInput.files[0];
            let imageUrl = "/images/default.jpg";
            if(file) {
                const uploadRes = await API.uploadProductImage(file);
                imageUrl = uploadRes.image_url;
            }

            const productData = {
                category_id: parseInt(document.getElementById('product-category').value),
                name: document.getElementById('product-name').value,
                price: parseInt(document.getElementById('product-price').value),
                barcode: document.getElementById('product-barcode').value || null,
                image: imageUrl
            };

            await API.createProduct(productData);
            alert("성공적으로 등록되었습니다!");
            modal.classList.remove('active');
            document.getElementById('product-form').reset();
            loadProducts();
        } catch(err) {
            alert(err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = "업로드 및 등록하기";
        }
    });

    // [C] 스토어 설정
    document.getElementById('store-form').addEventListener('submit', async(e)=>{
        e.preventDefault();
        const btn = document.getElementById('btn-save-store');
        btn.disabled = true;
        
        const data = {
            name: document.getElementById('store-name').value,
            address: document.getElementById('store-address').value,
            type: "CAFE"
        };
        try {
            if(!currentStoreId) {
                await API.createStore(data);
                alert("매장이 성공적으로 등록되었습니다!");
                checkAuthStatus();
            } else {
                await API.updateStore(currentStoreId, data);
                alert("매장 정보가 수정되었습니다.");
                updateHeaderStoreDisplay(data.name); // 매장 이름 실시간 반영
            }
        } catch(err) {
            alert(err.message);
        } finally {
            btn.disabled = false;
        }
    });

    // [D] 내 정보 수정 (Profile)
    const profileModal = document.getElementById('profile-modal');
    document.getElementById('btn-open-profile-modal').addEventListener('click', async () => {
        profileDropdown.classList.remove('active');
        try {
            const me = await API.getMe();
            document.getElementById('profile-name').value = me.name;
            document.getElementById('profile-phone').value = me.phone;
            document.getElementById('profile-address').value = me.address;
            profileModal.classList.add('active');
        } catch(err) {
            alert("개인정보를 불러올 수 없습니다!");
        }
    });
    
    document.getElementById('close-profile-modal').addEventListener('click', () => {
        profileModal.classList.remove('active');
    });
    
    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-save-profile');
        btn.disabled = true;
        
        const data = {
            name: document.getElementById('profile-name').value,
            phone: document.getElementById('profile-phone').value,
            address: document.getElementById('profile-address').value
        };
        
        try {
            await API.updateMe(data);
            alert("정보가 성공적으로 수정되었습니다.");
            profileModal.classList.remove('active');
        } catch(err) {
            console.error(err);
            alert(err.message || "수정에 실패했습니다.");
        } finally {
            btn.disabled = false;
        }
    });

    // [E] 주문 내역 로드 및 검색
    const startInput = document.getElementById('order-start-date');
    const endInput = document.getElementById('order-end-date');

    document.getElementById('btn-search-orders').addEventListener('click', () => {
        loadOrders();
    });

    async function loadOrders() {
        if(!currentStoreId) return;
        
        const tbody = document.getElementById('orders-table-body');
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">데이터를 불러오는 중입니다...</td></tr>';

        // Set default dates if empty
        if(!startInput.value || !endInput.value) {
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            
            const fmt = (d) => {
                // Timezone safe YYYY-MM-DD
                const offset = d.getTimezoneOffset() * 60000;
                const localISOTime = (new Date(d - offset)).toISOString().split('T')[0];
                return localISOTime;
            };

            if(!startInput.value) startInput.value = fmt(firstDay);
            if(!endInput.value) endInput.value = fmt(today);
        }

        try {
            const orders = await API.getOrders(currentStoreId, startInput.value, endInput.value);
            tbody.innerHTML = '';
            
            if(orders.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:gray;">해당 기간의 주문 내역이 없습니다. (조회 기간을 변경해보세요)</td></tr>';
                return;
            }

            orders.forEach(o => {
                const tr = document.createElement('tr');
                
                // 날짜 포맷 (YYYY.MM.DD HH:mm)
                const d = new Date(o.created_date);
                const dateStr = d.toLocaleString('ko-KR', {
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit'
                });

                // 상품명 렌더링 로직 (ex: 코카콜라 외 2건)
                let itemSummary = "알 수 없음";
                if(o.items && o.items.length > 0) {
                    const firstItem = o.items[0].product_name;
                    itemSummary = o.items.length === 1 ? firstItem : `${firstItem} 외 ${o.items.length - 1}건`;
                }

                // 상태 뱃지
                let statusBadge = '';
                if(o.status === "Completed") statusBadge = `<span class="badge" style="background:#E0F8E9; color:#1BA345;">결제완료</span>`;
                else if(o.status === "REFUNDED") statusBadge = `<span class="badge" style="background:#FDE0E0; color:#E33A3A;">환불됨</span>`;
                else statusBadge = `<span class="badge" style="background:#E2E8F0; color:#475569;">${o.status}</span>`;

                tr.innerHTML = `
                    <td style="font-size:13px;">
                        <span style="font-weight:600;">${o.id}</span>
                        <div style="color:var(--text-muted); font-size:12px; margin-top:2px;">${dateStr}</div>
                    </td>
                    <td><strong>${itemSummary}</strong></td>
                    <td>₩${o.total_amount.toLocaleString()}</td>
                    <td>${o.payment_provider || o.payment_method}</td>
                    <td>${statusBadge}</td>
                `;
                tbody.appendChild(tr);
            });
        } catch(err) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--danger);">데이터를 불러오지 못했습니다. <br/>오류: ${err.message}</td></tr>`;
        }
    }

});
