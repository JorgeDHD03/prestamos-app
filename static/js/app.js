/* ══════════════════════════════════════════════════
   App — Main Router & Initialization
   ══════════════════════════════════════════════════ */

let currentView = 'dashboard';

const VIEWS = {
    dashboard: renderDashboard,
    clients: renderClients,
    loans: renderLoans,
    simulator: renderSimulator,
    payments: renderPayments,
};

function navigateTo(view) {
    if (!VIEWS[view]) return;
    currentView = view;

    // Update nav
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.view === view);
    });

    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('open');

    // Render view
    VIEWS[view]();
}

function initApp() {
    // Check auth
    if (!API.isAuthenticated()) {
        showLogin();
        return;
    }

    showApp();
}

function showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';

    // Login — use the button click directly
    const loginBtn = document.getElementById('login-btn');
    loginBtn.onclick = async function(e) {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const errEl = document.getElementById('login-error');

        if (!username || !password) {
            errEl.textContent = 'Ingrese usuario y contraseña';
            errEl.style.display = 'block';
            return;
        }

        try {
            const res = await API.login(username, password);
            API.setAuth(res.access_token, res.user);
            errEl.style.display = 'none';
            showApp();
        } catch (e) {
            errEl.textContent = e.message;
            errEl.style.display = 'block';
        }
    };

    // Enter key on password field triggers login
    document.getElementById('login-password').onkeydown = function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            loginBtn.click();
        }
    };

    // Show register
    document.getElementById('show-register').onclick = function(e) {
        e.preventDefault();
        openModal('register-modal');
    };

    // Register — use the button click directly
    const registerBtn = document.getElementById('register-btn');
    registerBtn.onclick = async function(e) {
        e.preventDefault();
        const errEl = document.getElementById('register-error');
        const fullname = document.getElementById('reg-fullname').value;
        const username = document.getElementById('reg-username').value;
        const password = document.getElementById('reg-password').value;

        if (!fullname || !username || !password) {
            errEl.textContent = 'Complete todos los campos';
            errEl.style.display = 'block';
            return;
        }

        try {
            await API.register({
                username: username,
                password: password,
                full_name: fullname,
            });
            closeModal('register-modal');
            showToast('Cuenta creada. Ahora inicia sesión.', 'success');
        } catch (e) {
            errEl.textContent = e.message;
            errEl.style.display = 'block';
        }
    };
}

function showApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';

    // Set user info
    if (API.user) {
        document.getElementById('user-name').textContent = API.user.full_name;
        document.getElementById('user-avatar').textContent = API.user.full_name.charAt(0).toUpperCase();
    }

    // Navigation handlers
    document.querySelectorAll('.nav-item').forEach(el => {
        el.onclick = function(e) {
            e.preventDefault();
            navigateTo(el.dataset.view);
        };
    });

    // Logout
    const doLogout = () => {
        API.clearAuth();
        window.location.reload();
    };
    document.getElementById('logout-btn').onclick = doLogout;
    document.getElementById('mobile-logout-btn').onclick = doLogout;

    // Mobile hamburger
    document.getElementById('hamburger-btn').onclick = function() {
        document.getElementById('sidebar').classList.toggle('open');
    };

    // Close sidebar on overlay click (mobile)
    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('sidebar');
        const hamburger = document.getElementById('hamburger-btn');
        if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && !hamburger.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });

    // Close generic modal on overlay click
    document.getElementById('generic-modal').addEventListener('click', (e) => {
        if (e.target.id === 'generic-modal') closeModal('generic-modal');
    });

    // Load default view
    navigateTo('dashboard');
}

// Initialize
document.addEventListener('DOMContentLoaded', initApp);
