// js/app.js

document.addEventListener('DOMContentLoaded', () => {
    
    // --- State ---
    let currentUser = null;
    let currentStoreId = "3fa85f64-5717-4562-b3fc-2c963f66afa6"; // 기본값 (테스트용) - 나중엔 API로 동기화

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

    // 1. 로그인 상태 체크
    function checkAuthStatus() {
        const token = localStorage.getItem('access_token');
        if (token) {
            // 인증 됨: 대시보드 표시
            loginView.classList.remove('active');
            mainView.classList.add('active');
            loadProducts(); // 초기 데이터 로드 (상품 목록)
        } else {
            // 미인증: 로그인 뷰 표시
            mainView.classList.remove('active');
            loginView.classList.add('active');
        }
    }

    // 2. 폼 로그인 처리
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

    // 3. 로그아웃 처리
    btnLogout.addEventListener('click', () => {
        if(confirm("로그아웃 하시겠습니까?")) {
            localStorage.removeItem('access_token');
            checkAuthStatus();
        }
    });

    // 4. 네비게이션(라우팅) 처리
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            // 네비게이션 버튼 활성화 디자인 변경
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // 해당하는 섹션 보이기
            const targetId = link.getAttribute('data-target');
            sections.forEach(section => {
                section.classList.remove('active');
            });
            document.getElementById(targetId).classList.add('active');

            // 페이지 타이틀 변경
            pageTitle.textContent = link.querySelector('span').textContent;

            // 섹션 열릴 때 데이터 로딩 트리거 가능
            if(targetId === 'products-section') {
                loadProducts();
            }
        });
    });

    // --- UI Rendering Functions ---

    // 상품 목록 불러오기 & 화면 그리기
    async function loadProducts() {
        const container = document.getElementById('product-list-container');
        container.innerHTML = '<div class="empty-state">상품 정보를 불러오고 있습니다...</div>';
        
        try {
            // 백엔드 API 호출 (더미 UUID 사용 중, 실제로는 로그인 유저의 상점 ID 할당 필요)
            const products = await API.getProducts(currentStoreId);
            
            if (!products || products.length === 0) {
                container.innerHTML = '<div class="empty-state">등록된 상품이 없습니다. 새 상품을 등록해 보세요!</div>';
                return;
            }

            container.innerHTML = '';
            products.forEach(p => {
                const card = document.createElement('div');
                card.className = 'product-item';
                
                // 판매 상태에 따른 UI 설정
                const isChecked = p.is_active ? 'checked' : '';
                const cardOpacity = p.is_active ? '1' : '0.5';

                card.innerHTML = `
                    <div class="product-top" style="opacity: ${cardOpacity}">
                        <div>
                            <div class="product-name">${p.name}</div>
                            <div class="product-price">₩${p.price.toLocaleString()}</div>
                        </div>
                    </div>
                    
                    <div class="product-actions">
                        <div class="product-actions-group">
                            <span class="product-stock" id="stock-text-${p.id}">재고: ${p.stock}개</span>
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

            // 스위치 이벤트 리스너 부착
            document.querySelectorAll('.toggle-status').forEach(toggle => {
                toggle.addEventListener('change', async (e) => {
                    const id = e.target.getAttribute('data-id');
                    const isActive = e.target.checked;
                    
                    try {
                        const res = await API.updateProductStatus(id, isActive, null); // 재고 수량은 그대로 두고 상태만 변경
                        // UI 피드백 (투명도 조절)
                        e.target.closest('.product-item').querySelector('.product-top').style.opacity = isActive ? '1' : '0.5';
                        // 브라우저 기본 Alert 대신 나중엔 예쁜 Toast 모달 띄워주기
                    } catch(err) {
                        alert("상태 변경 실패: " + err.message);
                        e.target.checked = !isActive; // 실패시 스위치 롤백
                    }
                });
            });

        } catch (error) {
            console.error(error);
            container.innerHTML = `<div class="empty-state" style="color:var(--danger)">상품을 불러오지 못했습니다. <br/>(오류: ${error.message})<br/><br/>백엔드 서버 127.0.0.1:8000 이 켜져있는지 확인해주세요.</div>`;
        }
    }

});
