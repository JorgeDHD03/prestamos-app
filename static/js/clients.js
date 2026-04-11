/* ══════════════════════════════════════════════════
   Clients View
   ══════════════════════════════════════════════════ */

async function renderClients() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="fade-in-up">
            <div class="page-header">
                <h1>👥 Clientes</h1>
                <div class="header-actions">
                    <div class="search-bar">
                        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="7" cy="7" r="5"/><path d="M14 14l-3-3"/></svg>
                        <input type="text" id="client-search" placeholder="Buscar por nombre o ID...">
                    </div>
                    <button class="btn btn-primary" id="btn-new-client">+ Nuevo Cliente</button>
                </div>
            </div>
            <div class="card">
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Identificación</th>
                                <th>Teléfono</th>
                                <th>Préstamos</th>
                                <th>Saldo Activo</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="clients-table-body">
                            <tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted);">Cargando...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    document.getElementById('btn-new-client').addEventListener('click', () => showClientForm(null));

    let searchTimeout;
    document.getElementById('client-search').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => loadClients(e.target.value), 300);
    });

    await loadClients();
}

async function loadClients(search = '') {
    try {
        const clients = await API.getClients(search);
        const tbody = document.getElementById('clients-table-body');

        if (clients.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><h3>No hay clientes</h3><p>Crea tu primer cliente para comenzar</p></div></td></tr>`;
            return;
        }

        tbody.innerHTML = clients.map(c => `
            <tr class="clickable" onclick="viewClient(${c.id})">
                <td><strong>${c.full_name}</strong></td>
                <td>${c.id_number}</td>
                <td>${c.phone || '—'}</td>
                <td>${c.loan_count}</td>
                <td class="money">${formatMoney(c.active_balance)}</td>
                <td>
                    <button class="btn-icon" title="Editar" onclick="event.stopPropagation(); editClient(${c.id})">✏️</button>
                    <button class="btn-icon" title="Eliminar" onclick="event.stopPropagation(); deleteClient(${c.id}, '${c.full_name.replace(/'/g, "\\'")}')">🗑️</button>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        showToast('Error cargando clientes: ' + e.message, 'error');
    }
}

function showClientForm(clientData = null) {
    const isEdit = clientData && clientData.id;
    showGenericModal(`
        <div class="modal-header">
            <h2>${isEdit ? 'Editar' : 'Nuevo'} Cliente</h2>
            <button class="modal-close" onclick="closeModal('generic-modal')">&times;</button>
        </div>
        <div id="client-form">
            <div class="form-group">
                <label>Nombre Completo</label>
                <input type="text" id="cf-name" value="${isEdit ? clientData.full_name : ''}" placeholder="Nombre completo del cliente">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Número de Identificación</label>
                    <input type="text" id="cf-id-number" value="${isEdit ? clientData.id_number : ''}" placeholder="Cédula o NIT" ${isEdit ? 'readonly style="opacity:0.6"' : ''}>
                </div>
                <div class="form-group">
                    <label>Teléfono</label>
                    <input type="text" id="cf-phone" value="${isEdit ? (clientData.phone || '') : ''}" placeholder="Número de contacto">
                </div>
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="cf-email" value="${isEdit ? (clientData.email || '') : ''}" placeholder="correo@ejemplo.com">
            </div>
            <div class="form-group">
                <label>Dirección</label>
                <input type="text" id="cf-address" value="${isEdit ? (clientData.address || '') : ''}" placeholder="Dirección del cliente">
            </div>
            <button type="button" class="btn btn-primary btn-full" id="cf-submit">${isEdit ? 'Guardar Cambios' : 'Crear Cliente'}</button>
        </div>
    `);

    document.getElementById('cf-submit').addEventListener('click', async () => {
        const data = {
            full_name: document.getElementById('cf-name').value,
            phone: document.getElementById('cf-phone').value || null,
            email: document.getElementById('cf-email').value || null,
            address: document.getElementById('cf-address').value || null,
        };

        if (!data.full_name) { showToast('Ingrese el nombre del cliente', 'error'); return; }

        try {
            if (isEdit) {
                await API.updateClient(clientData.id, data);
                showToast('Cliente actualizado', 'success');
            } else {
                data.id_number = document.getElementById('cf-id-number').value;
                if (!data.id_number) { showToast('Ingrese el número de identificación', 'error'); return; }
                await API.createClient(data);
                showToast('Cliente creado exitosamente', 'success');
            }
            closeModal('generic-modal');
            loadClients();
        } catch (e) {
            showToast(e.message, 'error');
        }
    });
}

async function editClient(id) {
    try {
        const client = await API.getClient(id);
        showClientForm(client);
    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function deleteClient(id, name) {
    if (!confirm(`¿Seguro que deseas eliminar al cliente "${name}"? Se eliminarán también sus préstamos.`)) return;
    try {
        await API.deleteClient(id);
        showToast('Cliente eliminado', 'success');
        loadClients();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function viewClient(id) {
    try {
        const client = await API.getClient(id);
        showGenericModal(`
            <div class="modal-header">
                <h2>${client.full_name}</h2>
                <button class="modal-close" onclick="closeModal('generic-modal')">&times;</button>
            </div>
            <div style="margin-bottom:1.5rem;">
                <p style="color:var(--text-muted);font-size:0.85rem;">ID: ${client.id_number} &nbsp;|&nbsp; Tel: ${client.phone || '—'} &nbsp;|&nbsp; Email: ${client.email || '—'}</p>
                <p style="color:var(--text-muted);font-size:0.85rem;">Dirección: ${client.address || '—'}</p>
            </div>
            <h3 style="margin-bottom:1rem;font-size:1rem;">Préstamos (${client.loans.length})</h3>
            ${client.loans.length === 0 ? '<p style="color:var(--text-muted);">Sin préstamos registrados</p>' : `
            <div class="table-container">
                <table>
                    <thead><tr><th>ID</th><th>Capital</th><th>Tasa</th><th>Saldo</th><th>Estado</th></tr></thead>
                    <tbody>
                        ${client.loans.map(l => `
                            <tr class="clickable" onclick="closeModal('generic-modal'); navigateTo('loans'); setTimeout(()=>viewLoan(${l.id}),300);">
                                <td>#${l.id}</td>
                                <td class="money">${formatMoney(l.principal)}</td>
                                <td>${l.interest_rate}%</td>
                                <td class="money">${formatMoney(l.outstanding_balance)}</td>
                                <td>${statusBadge(l.status)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`}
            <div style="margin-top:1.5rem;">
                <button class="btn btn-primary" onclick="closeModal('generic-modal'); showNewLoanForm(${client.id}, '${client.full_name.replace(/'/g, "\\'")}');">+ Nuevo Préstamo</button>
            </div>
        `);
    } catch (e) {
        showToast(e.message, 'error');
    }
}
