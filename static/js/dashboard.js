/* ══════════════════════════════════════════════════
   Dashboard View
   ══════════════════════════════════════════════════ */

let monthlyChart = null;
let distributionChart = null;

async function renderDashboard() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="fade-in-up">
            <div class="page-header">
                <h1>📊 Dashboard</h1>
                <div class="header-actions">
                    <select id="dashboard-year" class="btn btn-secondary" style="padding:0.5rem 1rem;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text-primary);font-family:var(--font);">
                    </select>
                </div>
            </div>
            <div class="stats-grid" id="stats-cards"></div>
            <div class="charts-grid">
                <div class="card">
                    <div class="card-header"><span class="card-title">Recaudo Mensual</span></div>
                    <div class="chart-container"><canvas id="monthly-chart"></canvas></div>
                </div>
                <div class="card">
                    <div class="card-header"><span class="card-title">Distribución</span></div>
                    <div class="chart-container"><canvas id="distribution-chart"></canvas></div>
                </div>
            </div>
            <div class="card" style="margin-top:2rem;">
                <div class="card-header"><span class="card-title">Desglose Mensual Analítico</span></div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Mes</th>
                                <th>Capital Cobrado</th>
                                <th>Intereses y Otros</th>
                                <th>Total Recaudado</th>
                            </tr>
                        </thead>
                        <tbody id="monthly-breakdown-body">
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // Populate years
    const yearSel = document.getElementById('dashboard-year');
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= currentYear - 5; y--) {
        yearSel.innerHTML += `<option value="${y}">${y}</option>`;
    }
    yearSel.addEventListener('change', () => loadDashboardData(parseInt(yearSel.value)));

    await loadDashboardData(currentYear);
}

async function loadDashboardData(year) {
    try {
        const stats = await API.getStats(year);
        renderStatsCards(stats);
        renderCharts(stats);
    } catch (e) {
        showToast('Error cargando dashboard: ' + e.message, 'error');
    }
}

function renderStatsCards(stats) {
    document.getElementById('stats-cards').innerHTML = `
        <div class="stat-card purple">
            <div class="stat-label">Total Clientes</div>
            <div class="stat-value purple">${stats.total_clients}</div>
        </div>
        <div class="stat-card green">
            <div class="stat-label">Préstamos Activos</div>
            <div class="stat-value green">${stats.active_loans}</div>
        </div>
        <div class="stat-card red">
            <div class="stat-label">En Mora</div>
            <div class="stat-value red">${stats.delinquent_loans}</div>
        </div>
        <div class="stat-card blue">
            <div class="stat-label">Saldados</div>
            <div class="stat-value blue">${stats.paid_loans}</div>
        </div>
        <div class="stat-card orange">
            <div class="stat-label">Portafolio Total</div>
            <div class="stat-value orange money">${formatMoney(stats.total_portfolio)}</div>
        </div>
        <div class="stat-card purple">
            <div class="stat-label">Saldo Pendiente</div>
            <div class="stat-value purple money">${formatMoney(stats.total_outstanding)}</div>
        </div>
    `;
}

function renderCharts(stats) {
    const months = stats.monthly_summaries.map(s => s.month.substring(0, 3));
    const capitalData = stats.monthly_summaries.map(s => s.capital_collected);
    const interestData = stats.monthly_summaries.map(s => s.interest_collected);

    // Destroy old charts
    if (monthlyChart) monthlyChart.destroy();
    if (distributionChart) distributionChart.destroy();

    const chartStyles = {
        color: '#cbd5e1',
        gridColor: 'rgba(255,255,255,0.05)',
    };

    // Monthly bar chart
    const ctx1 = document.getElementById('monthly-chart').getContext('2d');
    monthlyChart = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Capital',
                    data: capitalData,
                    backgroundColor: 'rgba(99, 102, 241, 0.7)',
                    borderRadius: 6,
                    borderSkipped: false,
                },
                {
                    label: 'Intereses',
                    data: interestData,
                    backgroundColor: 'rgba(168, 85, 247, 0.7)',
                    borderRadius: 6,
                    borderSkipped: false,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: chartStyles.color, font: { family: 'Inter' } } },
            },
            scales: {
                x: { ticks: { color: chartStyles.color }, grid: { color: chartStyles.gridColor } },
                y: { ticks: { color: chartStyles.color, callback: v => '$' + v.toLocaleString() }, grid: { color: chartStyles.gridColor } },
            },
        },
    });

    // Distribution doughnut
    const totalCapital = capitalData.reduce((a, b) => a + b, 0);
    const totalInterest = interestData.reduce((a, b) => a + b, 0);

    const ctx2 = document.getElementById('distribution-chart').getContext('2d');
    distributionChart = new Chart(ctx2, {
        type: 'doughnut',
        data: {
            labels: ['Capital', 'Intereses'],
            datasets: [{
                data: [totalCapital || 1, totalInterest || 0],
                backgroundColor: ['rgba(99, 102, 241, 0.8)', 'rgba(168, 85, 247, 0.8)'],
                borderColor: ['rgba(99, 102, 241, 1)', 'rgba(168, 85, 247, 1)'],
                borderWidth: 2,
                hoverOffset: 10,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: { position: 'bottom', labels: { color: chartStyles.color, font: { family: 'Inter' }, padding: 20 } },
            },
        },
    });

    // Render Explicit Table
    document.getElementById('monthly-breakdown-body').innerHTML = stats.monthly_summaries.map(s => {
        if (s.total_collected === 0) return '';
        return `
            <tr>
                <td style="font-weight:600;">${s.month}</td>
                <td class="money">${formatMoney(s.capital_collected)}</td>
                <td class="money" style="color:var(--primary-light);">${formatMoney(s.interest_collected + (s.penalty_collected||0))}</td>
                <td class="money" style="font-weight:700;color:var(--success);">${formatMoney(s.total_collected)}</td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="4" style="text-align:center;padding:1.5rem;color:var(--text-muted);">No hay cobros en este año.</td></tr>';
}
