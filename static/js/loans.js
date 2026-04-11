/* ══════════════════════════════════════════════════
   Loans View + Simulator
   ══════════════════════════════════════════════════ */

async function renderLoans() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="fade-in-up">
            <div class="page-header">
                <h1>💳 Préstamos</h1>
                <div class="header-actions">
                    <select id="loan-filter" class="btn btn-secondary" style="padding:0.5rem 1rem;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text-primary);font-family:var(--font);">
                        <option value="">Todos</option>
                        <option value="ACTIVE">Activos</option>
                        <option value="PAID">Saldados</option>
                        <option value="DELINQUENT">En Mora</option>
                    </select>
                    <button class="btn btn-primary" id="btn-new-loan">+ Nuevo Préstamo</button>
                </div>
            </div>
            <div class="card">
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Cliente</th>
                                <th>Capital</th>
                                <th>Tasa</th>
                                <th>Frecuencia</th>
                                <th>Saldo</th>
                                <th>Estado</th>
                                <th>Pagos</th>
                            </tr>
                        </thead>
                        <tbody id="loans-table-body">
                            <tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-muted);">Cargando...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    document.getElementById('btn-new-loan').addEventListener('click', () => showNewLoanForm());
    document.getElementById('loan-filter').addEventListener('change', (e) => loadLoans(e.target.value));

    await loadLoans();
}

async function loadLoans(statusFilter = '') {
    try {
        const params = {};
        if (statusFilter) params.status = statusFilter;
        const loans = await API.getLoans(params);
        const tbody = document.getElementById('loans-table-body');

        if (loans.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><h3>No hay préstamos</h3><p>Crea un préstamo desde la ficha de un cliente</p></div></td></tr>`;
            return;
        }

        const freqMap = { 'DAILY': 'Diario', 'WEEKLY': 'Semanal', 'MONTHLY': 'Mensual' };

        tbody.innerHTML = loans.map(l => `
            <tr class="clickable" onclick="viewLoan(${l.id})">
                <td>#${l.id}</td>
                <td>${l.client_name}</td>
                <td class="money">${formatMoney(l.principal)}</td>
                <td>${l.interest_rate}%</td>
                <td>${freqMap[l.payment_frequency] || l.payment_frequency}</td>
                <td class="money">${formatMoney(l.outstanding_balance)}</td>
                <td>${statusBadge(l.status)}</td>
                <td>${l.payments_count}</td>
            </tr>
        `).join('');
    } catch (e) {
        showToast('Error cargando préstamos: ' + e.message, 'error');
    }
}

async function showNewLoanForm(clientId = null, clientName = '') {
    let clientsOptions = '';
    try {
        const clients = await API.getClients();
        clientsOptions = clients.map(c =>
            `<option value="${c.id}" ${c.id === clientId ? 'selected' : ''}>${c.full_name} (${c.id_number})</option>`
        ).join('');
    } catch (e) { /* ignore */ }

    const today = new Date().toISOString().split('T')[0];

    showGenericModal(`
        <div class="modal-header">
            <h2>Nuevo Préstamo${clientName ? ` — ${clientName}` : ''}</h2>
            <button class="modal-close" onclick="closeModal('generic-modal')">&times;</button>
        </div>
        <div id="loan-form">
            <div class="form-group">
                <label>Cliente</label>
                <select id="lf-client">${clientsOptions}</select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Capital ($)</label>
                    <input type="number" id="lf-principal" min="1" step="0.01" placeholder="10000">
                </div>
                <div class="form-group">
                    <label>Tasa de Interés (% por periodo)</label>
                    <input type="number" id="lf-rate" min="0.01" step="0.01" placeholder="5">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Frecuencia de Cobro</label>
                    <select id="lf-frequency">
                        <option value="MONTHLY">Mensual</option>
                        <option value="WEEKLY">Semanal</option>
                        <option value="DAILY">Diario</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Número de Periodos</label>
                    <input type="number" id="lf-periods" min="1" placeholder="12">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Fecha de Inicio</label>
                    <input type="date" id="lf-start" value="${today}">
                </div>
                <div class="form-group">
                    <label>Tasa de Mora (%)</label>
                    <input type="number" id="lf-penalty" value="2" min="0" step="0.01">
                </div>
            </div>
            <button type="button" class="btn btn-primary btn-full" id="lf-submit">Crear Préstamo</button>
        </div>
    `);

    document.getElementById('lf-submit').addEventListener('click', async () => {
        try {
            const data = {
                client_id: parseInt(document.getElementById('lf-client').value),
                principal: parseFloat(document.getElementById('lf-principal').value),
                interest_rate: parseFloat(document.getElementById('lf-rate').value),
                interest_type: 'FIXED',
                payment_frequency: document.getElementById('lf-frequency').value,
                total_periods: parseInt(document.getElementById('lf-periods').value),
                penalty_rate: parseFloat(document.getElementById('lf-penalty').value),
                start_date: document.getElementById('lf-start').value,
            };
            await API.createLoan(data);
            showToast('Préstamo creado exitosamente', 'success');
            closeModal('generic-modal');
            if (document.getElementById('loans-table-body')) loadLoans();
        } catch (e) {
            showToast(e.message, 'error');
        }
    });
}

async function viewLoan(id) {
    try {
        const loan = await API.getLoan(id);
        const freqMap = { 'DAILY': 'Diario', 'WEEKLY': 'Semanal', 'MONTHLY': 'Mensual' };

        showGenericModal(`
            <div class="modal-header">
                <h2>Préstamo #${loan.id}</h2>
                <button class="modal-close" onclick="closeModal('generic-modal')">&times;</button>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem;">
                <div>
                    <span style="color:var(--text-muted);font-size:0.8rem;">Cliente</span>
                    <p style="font-weight:600;">${loan.client_name}</p>
                </div>
                <div>
                    <span style="color:var(--text-muted);font-size:0.8rem;">Estado</span>
                    <p>${statusBadge(loan.status)}</p>
                </div>
                <div>
                    <span style="color:var(--text-muted);font-size:0.8rem;">Capital</span>
                    <p style="font-weight:600;" class="money">${formatMoney(loan.principal)}</p>
                </div>
                <div>
                    <span style="color:var(--text-muted);font-size:0.8rem;">Saldo Pendiente</span>
                    <p style="font-weight:600;color:var(--warning);" class="money">${formatMoney(loan.outstanding_balance)}</p>
                </div>
                <div>
                    <span style="color:var(--text-muted);font-size:0.8rem;">Tasa</span>
                    <p>${loan.interest_rate}% ${freqMap[loan.payment_frequency] || ''}</p>
                </div>
                <div>
                    <span style="color:var(--text-muted);font-size:0.8rem;">Total a Pagar</span>
                    <p class="money">${formatMoney(loan.total_amount)}</p>
                </div>
                <div>
                    <span style="color:var(--text-muted);font-size:0.8rem;">Inicio</span>
                    <p>${formatDate(loan.start_date)}</p>
                </div>
                <div>
                    <span style="color:var(--text-muted);font-size:0.8rem;">Vencimiento</span>
                    <p>${formatDate(loan.end_date)}</p>
                </div>
            </div>

            <div style="display:flex;gap:0.5rem;margin-bottom:1.5rem;flex-wrap:wrap;">
                ${loan.status === 'ACTIVE' ? `
                    <button class="btn btn-success btn-sm" onclick="closeModal('generic-modal'); showPaymentForm(${loan.id}, ${loan.outstanding_balance}, ${loan.interest_rate});">Registrar Pago</button>
                    <button class="btn btn-danger btn-sm" onclick="changeLoanStatus(${loan.id}, 'DELINQUENT')">Marcar en Mora</button>
                ` : ''}
                ${loan.status === 'DELINQUENT' ? `
                    <button class="btn btn-success btn-sm" onclick="closeModal('generic-modal'); showPaymentForm(${loan.id}, ${loan.outstanding_balance}, ${loan.interest_rate});">Registrar Pago</button>
                    <button class="btn btn-outline btn-sm" onclick="changeLoanStatus(${loan.id}, 'ACTIVE')">Reactivar</button>
                ` : ''}
            </div>

            <h3 style="font-size:1rem;margin-bottom:0.75rem;">Tabla de Amortización</h3>
            <div class="table-container" style="max-height:250px;overflow-y:auto;">
                <table>
                    <thead><tr><th>#</th><th>Cuota</th><th>Capital</th><th>Interés</th><th>Saldo</th></tr></thead>
                    <tbody>
                        ${loan.amortization_table.map(r => `
                            <tr>
                                <td>${r.period}</td>
                                <td class="money">${formatMoney(r.payment)}</td>
                                <td class="money">${formatMoney(r.principal_portion)}</td>
                                <td class="money">${formatMoney(r.interest_portion)}</td>
                                <td class="money">${formatMoney(r.balance)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            ${loan.payments.length > 0 ? `
            <h3 style="font-size:1rem;margin:1.5rem 0 0.75rem;">Historial de Pagos (${loan.payments.length})</h3>
            <div class="table-container" style="max-height:200px;overflow-y:auto;">
                <table>
                    <thead><tr><th>Fecha</th><th>Monto</th><th>Capital</th><th>Interés</th><th>Saldo</th><th>Recibo</th></tr></thead>
                    <tbody>
                        ${loan.payments.map(p => `
                            <tr>
                                <td>${formatDate(p.payment_date)}</td>
                                <td class="money">${formatMoney(p.amount)}</td>
                                <td class="money">${formatMoney(p.principal_portion)}</td>
                                <td class="money">${formatMoney(p.interest_portion)}</td>
                                <td class="money">${formatMoney(p.balance_after)}</td>
                                <td><a href="#" onclick="event.preventDefault(); showReceipt(${p.id})">${p.receipt_number}</a></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>` : ''}
        `);
    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function changeLoanStatus(id, status) {
    try {
        await API.updateLoanStatus(id, status);
        showToast('Estado actualizado', 'success');
        closeModal('generic-modal');
        if (document.getElementById('loans-table-body')) loadLoans();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

/* ── Simulator ─────────────────────────────────── */

async function renderSimulator() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="fade-in-up">
            <div class="page-header">
                <h1>🧮 Simulador de Préstamos</h1>
            </div>
            <div class="simulator-grid">
                <div class="card">
                    <h3 style="margin-bottom:1.25rem;font-size:1rem;">Parámetros del Préstamo</h3>
                    <div id="sim-form">
                        <div class="form-group">
                            <label>Capital ($)</label>
                            <input type="number" id="sim-principal" min="1" step="0.01" value="10000" placeholder="Monto del préstamo">
                        </div>
                        <div class="form-group">
                            <label>Tasa de Interés (% por periodo)</label>
                            <input type="number" id="sim-rate" min="0.01" step="0.01" value="5" placeholder="Tasa por periodo">
                        </div>
                        <div class="form-group">
                            <label>Frecuencia de Cobro</label>
                            <select id="sim-frequency">
                                <option value="MONTHLY">Mensual</option>
                                <option value="WEEKLY">Semanal</option>
                                <option value="DAILY">Diario</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Número de Periodos</label>
                            <input type="number" id="sim-periods" min="1" value="12" placeholder="Periodos">
                        </div>
                        <button type="button" class="btn btn-primary btn-full" id="sim-submit">Calcular</button>
                    </div>
                </div>
                <div id="sim-results">
                    <div class="card" style="text-align:center;padding:3rem;">
                        <p style="color:var(--text-muted);">Configura los parámetros y presiona "Calcular" para ver la proyección.</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('sim-submit').addEventListener('click', runSimulation);
}

async function runSimulation() {
    const data = {
        principal: parseFloat(document.getElementById('sim-principal').value),
        interest_rate: parseFloat(document.getElementById('sim-rate').value),
        interest_type: 'FIXED',
        payment_frequency: document.getElementById('sim-frequency').value,
        total_periods: parseInt(document.getElementById('sim-periods').value),
    };

    try {
        const result = await API.simulateLoan(data);
        const freqMap = { 'DAILY': 'Diario', 'WEEKLY': 'Semanal', 'MONTHLY': 'Mensual' };

        document.getElementById('sim-results').innerHTML = `
            <div class="sim-result fade-in-up">
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.75rem;">
                    <div class="sim-result-card">
                        <div class="sim-result-label">Cuota ${freqMap[result.payment_frequency]}</div>
                        <div class="sim-result-value" style="color:var(--primary-light);">${formatMoney(result.periodic_payment)}</div>
                    </div>
                    <div class="sim-result-card">
                        <div class="sim-result-label">Total a Pagar</div>
                        <div class="sim-result-value" style="color:var(--warning);">${formatMoney(result.total_amount)}</div>
                    </div>
                    <div class="sim-result-card">
                        <div class="sim-result-label">Total Intereses</div>
                        <div class="sim-result-value" style="color:var(--danger);">${formatMoney(result.total_interest)}</div>
                    </div>
                </div>
                <div class="card" style="margin-top:0.5rem;">
                    <h3 style="margin-bottom:0.75rem;font-size:1rem;">Tabla de Amortización</h3>
                    <div class="table-container" style="max-height:400px;overflow-y:auto;">
                        <table>
                            <thead>
                                <tr><th>#</th><th>Cuota</th><th>Capital</th><th>Interés</th><th>Saldo</th></tr>
                            </thead>
                            <tbody>
                                ${result.table.map(r => `
                                    <tr>
                                        <td>${r.period}</td>
                                        <td class="money">${formatMoney(r.payment)}</td>
                                        <td class="money">${formatMoney(r.principal_portion)}</td>
                                        <td class="money">${formatMoney(r.interest_portion)}</td>
                                        <td class="money">${formatMoney(r.balance)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    } catch (e) {
        showToast('Error en simulación: ' + e.message, 'error');
    }
}
