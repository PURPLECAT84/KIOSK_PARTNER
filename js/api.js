// js/api.js

/**
 * 프로젝트 백엔드 URL
 * 로컬 FastAPI 백엔드가 8000번 포트에서 실행 중이므로 이를 바라봅니다.
 */
const BASE_URL = 'http://127.0.0.1:8000';

const API = {
    // 공통 Fetch 함수 (토큰 자동 주입)
    async request(endpoint, options = {}) {
        const token = localStorage.getItem('access_token');
        
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...options.headers
        };

        try {
            const response = await fetch(`${BASE_URL}${endpoint}`, {
                ...options,
                headers
            });
            
            // 204 No Content 처리
            if (response.status === 204) return null;
            
            const data = await response.json();
            
            if (!response.ok) {
                // 토큰 만료 등 401 처리
                if (response.status === 401) {
                    localStorage.removeItem('access_token');
                    window.location.reload(); 
                }
                throw new Error(data.detail || 'API 요청 중 오류가 발생했습니다.');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // ===== 1. 로그인 API =====
    async login(username, password) {
        // FastAPI의 OAuth2PasswordRequestForm 은 x-www-form-urlencoded 방식을 요구합니다.
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const response = await fetch(`${BASE_URL}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.detail || '로그인에 실패했습니다.');
        }
        return data; // { access_token, token_type }
    },

    // ===== 2. 상점 API =====
    // 사용자의 현재 상점 정보를 가져옴 (로그인 즉시 호출)
    async getMyStores() {
        return this.request('/store/my'); // *주의: 현재 작성하신 API에 /my 가 없다면 수정이 필요합니다. 일단 가정하고 만듭니다.
        // 현재 user 데이터만 가져오게끔 하거나, 백엔드 라우터 구조에 맞춥니다.
    },

    // ===== 3. 상품 API =====
    async getProducts(storeId) {
        return this.request(`/products/store/${storeId}`);
    },

    async updateProductStatus(productId, is_active, stock) {
        return this.request(`/products/${productId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ is_active, stock })
        });
    }
    
    // 이후 추가될 API들 (주문 내역 등) 여기에 작성
};
