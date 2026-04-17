/* ══════════════════════════════════════════════════
   Payments View
   ══════════════════════════════════════════════════ */

async function renderPayments() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="fade-in-up">
            <div class="page-header">
                <h1>💵 Registrar Pago</h1>
            </div>
            <div class="card" style="max-width:600px;">
                <div id="payment-page-form">
                    <div class="form-group">
                        <label>Préstamo</label>
                        <select id="pf-loan">
                            <option value="">Seleccionar préstamo...</option>
                        </select>
                    </div>
                    <div id="pf-loan-info" style="display:none;margin-bottom:1.25rem;padding:1rem;background:var(--bg-input);border-radius:var(--radius-sm);"></div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Monto del Pago ($)</label>
                            <input type="number" id="pf-amount" min="0.01" step="0.01" placeholder="Monto a abonar">
                        </div>
                        <div class="form-group">
                            <label>Fecha de Pago</label>
                            <input type="date" id="pf-date" value="${new Date().toISOString().split('T')[0]}">
                        </div>
                    </div>
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label>Tipo de Abono</label>
                        <div style="display: flex; gap: 1rem; align-items: center; margin-top: 0.5rem; font-size: 0.9rem;">
                            <label style="font-weight:normal; display:flex; align-items:center; gap:0.3rem; margin:0;"><input type="radio" name="pf-type" value="NORMAL" checked> Cuota Completa</label>
                            <label style="font-weight:normal; display:flex; align-items:center; gap:0.3rem; margin:0;"><input type="radio" name="pf-type" value="CAPITAL_ONLY"> Solo Capital</label>
                            <label style="font-weight:normal; display:flex; align-items:center; gap:0.3rem; margin:0;"><input type="radio" name="pf-type" value="INTEREST_ONLY"> Solo Interés</label>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Notas (opcional)</label>
                        <input type="text" id="pf-notes" placeholder="Observaciones del pago">
                    </div>
                    <button type="button" class="btn btn-primary btn-full" id="pf-submit">Registrar Pago</button>
                </div>
            </div>
        </div>
    `;

    // Load active loans
    try {
        const loans = await API.getLoans({ status: 'ACTIVE' });
        const delinquent = await API.getLoans({ status: 'DELINQUENT' });
        const allLoans = [...loans, ...delinquent];
        const sel = document.getElementById('pf-loan');
        allLoans.forEach(l => {
            sel.innerHTML += `<option value="${l.id}">#${l.id} — ${l.client_name} (Saldo: ${formatMoney(l.outstanding_balance)})</option>`;
        });

        sel.addEventListener('change', () => {
            const loan = allLoans.find(l => l.id === parseInt(sel.value));
            const info = document.getElementById('pf-loan-info');
            if (loan) {
                info.style.display = 'block';
                const interestDue = (loan.outstanding_balance * loan.interest_rate / 100).toFixed(2);
                info.innerHTML = `
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;font-size:0.85rem;">
                        <div><span style="color:var(--text-muted);">Saldo:</span> <strong class="money">${formatMoney(loan.outstanding_balance)}</strong></div>
                        <div><span style="color:var(--text-muted);">Tasa:</span> <strong>${loan.interest_rate}%</strong></div>
                        <div><span style="color:var(--text-muted);">Interés del periodo:</span> <strong class="money">${formatMoney(interestDue)}</strong></div>
                        <div><span style="color:var(--text-muted);">Estado:</span> ${statusBadge(loan.status)}</div>
                    </div>
                `;
            } else {
                info.style.display = 'none';
            }
        });
    } catch (e) { /* ignore */ }

    document.getElementById('pf-submit').addEventListener('click', async () => {
        const loanId = parseInt(document.getElementById('pf-loan').value);
        if (!loanId) { showToast('Selecciona un préstamo', 'error'); return; }

        try {
            const paymentType = document.querySelector('input[name="pf-type"]:checked').value;
            const payment = await API.createPayment({
                loan_id: loanId,
                amount: parseFloat(document.getElementById('pf-amount').value),
                payment_date: document.getElementById('pf-date').value,
                payment_type: paymentType,
                notes: document.getElementById('pf-notes').value || null,
            });
            showToast('Pago registrado exitosamente', 'success');
            showReceipt(payment.id);
        } catch (e) {
            showToast(e.message, 'error');
        }
    });
}

function showPaymentForm(loanId, balance, rate) {
    const interestDue = (balance * rate / 100).toFixed(2);
    const today = new Date().toISOString().split('T')[0];

    showGenericModal(`
        <div class="modal-header">
            <h2>Registrar Pago — Préstamo #${loanId}</h2>
            <button class="modal-close" onclick="closeModal('generic-modal')">&times;</button>
        </div>
        <div style="margin-bottom:1.25rem;padding:1rem;background:var(--bg-input);border-radius:var(--radius-sm);font-size:0.85rem;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;">
                <div><span style="color:var(--text-muted);">Saldo Actual:</span> <strong class="money">${formatMoney(balance)}</strong></div>
                <div><span style="color:var(--text-muted);">Interés del periodo:</span> <strong class="money">${formatMoney(interestDue)}</strong></div>
            </div>
        </div>
        <div id="quick-payment-form">
            <div class="form-row">
                <div class="form-group">
                    <label>Monto ($)</label>
                    <input type="number" id="qpf-amount" min="0.01" step="0.01" placeholder="Monto a pagar">
                </div>
                <div class="form-group">
                    <label>Fecha</label>
                    <input type="date" id="qpf-date" value="${today}">
                </div>
            </div>
            <div class="form-group" style="margin-bottom: 1rem;">
                <label>Tipo de Abono</label>
                <div style="display: flex; gap: 1rem; align-items: center; margin-top: 0.5rem; font-size: 0.85rem;">
                    <label style="font-weight:normal; display:flex; align-items:center; gap:0.3rem; margin:0;"><input type="radio" name="qpf-type" value="NORMAL" checked> Normal</label>
                    <label style="font-weight:normal; display:flex; align-items:center; gap:0.3rem; margin:0;"><input type="radio" name="qpf-type" value="CAPITAL_ONLY"> A Capital</label>
                    <label style="font-weight:normal; display:flex; align-items:center; gap:0.3rem; margin:0;"><input type="radio" name="qpf-type" value="INTEREST_ONLY"> A Interés</label>
                </div>
            </div>
            <div class="form-group">
                <label>Notas</label>
                <input type="text" id="qpf-notes" placeholder="Observaciones">
            </div>
            <button type="button" class="btn btn-primary btn-full" id="qpf-submit">Confirmar Pago</button>
        </div>
    `);

    document.getElementById('qpf-submit').addEventListener('click', async () => {
        try {
            const paymentType = document.querySelector('input[name="qpf-type"]:checked').value;
            const payment = await API.createPayment({
                loan_id: loanId,
                amount: parseFloat(document.getElementById('qpf-amount').value),
                payment_date: document.getElementById('qpf-date').value,
                payment_type: paymentType,
                notes: document.getElementById('qpf-notes').value || null,
            });
            showToast('Pago registrado exitosamente', 'success');
            closeModal('generic-modal');
            showReceipt(payment.id);
        } catch (e) {
            showToast(e.message, 'error');
        }
    });
}

async function showReceipt(paymentId) {
    try {
        const r = await API.getReceipt(paymentId);

        showGenericModal(`
            <div class="modal-header">
                <h2>Comprobante de Pago</h2>
                <button class="modal-close" onclick="closeModal('generic-modal')">&times;</button>
            </div>
            <div class="receipt">
                <div class="receipt-header">Prestamos App</div>
                <div class="receipt-number">${r.receipt_number}</div>

                <div class="receipt-row">
                    <span class="receipt-label">Cliente</span>
                    <span class="receipt-value">${r.client_name}</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-label">Identificación</span>
                    <span class="receipt-value">${r.client_id_number}</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-label">Préstamo</span>
                    <span class="receipt-value">#${r.loan_id}</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-label">Fecha</span>
                    <span class="receipt-value">${formatDate(r.payment_date)}</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-label">Saldo Anterior</span>
                    <span class="receipt-value money">${formatMoney(r.balance_before)}</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-label">Abono a Capital</span>
                    <span class="receipt-value money">${formatMoney(r.principal_portion)}</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-label">Intereses</span>
                    <span class="receipt-value money">${formatMoney(r.interest_portion)}</span>
                </div>
                <div class="receipt-total">
                    <span>Total Pagado</span>
                    <span class="money">${formatMoney(r.amount)}</span>
                </div>
                <div class="receipt-row" style="border:none;margin-top:0.5rem;">
                    <span class="receipt-label">Nuevo Saldo</span>
                    <span class="receipt-value money" style="color:var(--success);">${formatMoney(r.balance_after)}</span>
                </div>
            </div>
            <div style="text-align:center;margin-top:1.25rem;">
                <button class="btn btn-outline btn-sm" onclick="window.print()">🖨️ Imprimir</button>
            </div>
        `);
    } catch (e) {
        showToast('Error cargando recibo: ' + e.message, 'error');
    }
}
