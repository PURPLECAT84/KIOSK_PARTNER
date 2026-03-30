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
    // 사용자의 현재 상점 리스트를 가져옴
    async getStores() {
        return this.request('/store/'); 
    },

    async createStore(data) {
        return this.request('/store/', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async updateStore(storeId, data) {
        return this.request(`/store/${storeId}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    },

    // ===== 3. 대시보드 API =====
    async getDashboardSummary() {
        return this.request('/dashboard/summary');
    },

    async getBestSellers() {
        return this.request('/dashboard/best-sellers');
    },

    // ===== 4. 상품 및 카테고리 API =====
    async getCategories(storeId) {
        return this.request(`/categories/store/${storeId}`);
    },

    async getProducts(storeId) {
        return this.request(`/products/store/${storeId}`);
    },

    // 2MB 이미지 업로드 처리
    async uploadProductImage(file) {
        const formData = new FormData();
        formData.append("file", file);

        const token = localStorage.getItem('access_token');
        const headers = {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }; // Content-Type을 지정하지 않아야 브라우저가 자동 boundary 추가함

        const response = await fetch(`${BASE_URL}/products/image`, {
            method: 'POST',
            headers: headers,
            body: formData
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.detail || '이미지 업로드에 실패했습니다.');
        }
        return data;
    },

    async createProduct(data) {
        return this.request(`/products/`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async deleteProduct(storeId, productId) {
        return this.request(`/products/store/${storeId}/product/${productId}`, {
            method: 'DELETE'
        });
    },

    async updateProductStatus(productId, is_active, stock) {
        return this.request(`/products/${productId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ is_active, stock })
        });
    },

    // ===== 5. 회원 및 개인정보 API =====
    async getMe() {
        return this.request('/users/me');
    },

    async updateMe(data) {
        return this.request('/users/me', {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    },

    // ===== 6. 주문 내역 API =====
    async getOrders(storeId, startDate, endDate) {
        let url = `/order/?store_id=${storeId}`;
        if(startDate) url += `&start_date=${startDate}`;
        if(endDate) url += `&end_date=${endDate}`;
        return this.request(url);
    }
};
