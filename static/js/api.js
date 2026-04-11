/* ══════════════════════════════════════════════════
   API Client — Fetch wrapper with JWT management
   ══════════════════════════════════════════════════ */

const API = {
    BASE: '',
    token: localStorage.getItem('token'),
    user: JSON.parse(localStorage.getItem('user') || 'null'),

    setAuth(token, user) {
        this.token = token;
        this.user = user;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
    },

    clearAuth() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    isAuthenticated() {
        return !!this.token;
    },

    async request(method, path, body = null) {
        const opts = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (this.token) {
            opts.headers['Authorization'] = `Bearer ${this.token}`;
        }

        if (body) {
            opts.body = JSON.stringify(body);
        }

        const res = await fetch(`${this.BASE}${path}`, opts);

        if (res.status === 401) {
            // Don't reload - just clear auth and let the calling code handle it
            this.clearAuth();
            // Show login screen without reload to avoid infinite loop
            const loginScreen = document.getElementById('login-screen');
            const app = document.getElementById('app');
            if (loginScreen) loginScreen.style.display = 'flex';
            if (app) app.style.display = 'none';
            throw new Error('Sesión expirada. Inicie sesión nuevamente.');
        }

        if (res.status === 204) return null;

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.detail || 'Error en la solicitud');
        }

        return data;
    },

    get(path) { return this.request('GET', path); },
    post(path, body) { return this.request('POST', path, body); },
    put(path, body) { return this.request('PUT', path, body); },
    del(path) { return this.request('DELETE', path); },

    // Auth
    login(username, password) { return this.post('/api/auth/login', { username, password }); },
    register(data) { return this.post('/api/auth/register', data); },

    // Clients
    getClients(search = '') { return this.get(`/api/clients${search ? `?search=${encodeURIComponent(search)}` : ''}`); },
    getClient(id) { return this.get(`/api/clients/${id}`); },
    createClient(data) { return this.post('/api/clients', data); },
    updateClient(id, data) { return this.put(`/api/clients/${id}`, data); },
    deleteClient(id) { return this.del(`/api/clients/${id}`); },

    // Loans
    getLoans(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return this.get(`/api/loans${qs ? `?${qs}` : ''}`);
    },
    getLoan(id) { return this.get(`/api/loans/${id}`); },
    createLoan(data) { return this.post('/api/loans', data); },
    updateLoanStatus(id, status) { return this.put(`/api/loans/${id}/status?new_status=${status}`); },
    simulateLoan(data) { return this.post('/api/loans/simulate', data); },

    // Payments
    createPayment(data) { return this.post('/api/payments', data); },
    getReceipt(id) { return this.get(`/api/payments/${id}/receipt`); },

    // Dashboard
    getStats(year) { return this.get(`/api/dashboard/stats${year ? `?year=${year}` : ''}`); },
};

/* Utility helpers */
function formatMoney(n) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function formatDate(d) {
    if (!d) return '—';
    return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusBadge(status) {
    const map = {
        'ACTIVE': '<span class="badge badge-active">Activo</span>',
        'PAID': '<span class="badge badge-paid">Saldado</span>',
        'DELINQUENT': '<span class="badge badge-delinquent">En Mora</span>',
    };
    return map[status] || status;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-message">${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100px)'; setTimeout(() => toast.remove(), 300); }, 3500);
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function showGenericModal(html) {
    document.getElementById('generic-modal-content').innerHTML = html;
    openModal('generic-modal');
}
