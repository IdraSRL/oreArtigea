// admin-fatturazione.js - Gestione fatturazione cantieri nel pannello admin
import { getMonthEmployeeCantiereMapOptimized } from './fatturazione-data-readers.js';
import { generateMonthlyDashboardModel } from './fatturazione-report.js';
import { generateAnnualReport, clearAnnualCache } from './fatturazione-annual-report.js';
import { showToast } from "../../common/utils.js";

class AdminFatturazioneManager {
    constructor() {
        this.currentTab = 'dashboard';
        this.currentData = { dashboard: null, employee: null, annual: null };
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;
        this.setupEventListeners();
        this.initializeDateInputs();
        await this.loadInitialData();
        this.isInitialized = true;
    }

    setupEventListeners() {
        document.querySelectorAll('.nav-tab').forEach((tab) => {
            tab.addEventListener('click', (e) => {
                const targetTab = e.currentTarget.dataset.tab;
                this.switchTab(targetTab);
            });
        });
        const dashboardMonth = document.getElementById('dashboard-month');
        if (dashboardMonth) dashboardMonth.addEventListener('change', () => this.loadDashboardData());
        const exportDashboard = document.getElementById('export-dashboard');
        if (exportDashboard) exportDashboard.addEventListener('click', () => this.exportDashboard());

        const employeeMonth = document.getElementById('employee-month');
        if (employeeMonth) employeeMonth.addEventListener('change', () => this.loadEmployeeData());
        const exportEmployee = document.getElementById('export-per-dipendente');
        if (exportEmployee) exportEmployee.addEventListener('click', () => this.exportEmployeeData());

        const annualYear = document.getElementById('annual-year');
        if (annualYear) annualYear.addEventListener('change', () => this.loadAnnualData());
        const exportAnnual = document.getElementById('export-annual-report');
        if (exportAnnual) exportAnnual.addEventListener('click', () => this.exportAnnualData());
        const clearCacheBtn = document.getElementById('clear-annual-cache');
        if (clearCacheBtn) clearCacheBtn.addEventListener('click', () => this.clearAnnualCache());

        const refreshBtn = document.getElementById('refreshFatturazioneBtn');
        if (refreshBtn) refreshBtn.addEventListener('click', () => this.refresh());
    }

    initializeDateInputs() {
        const currentDate = new Date();
        const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        const dashboardMonth = document.getElementById('dashboard-month');
        const employeeMonth = document.getElementById('employee-month');
        if (dashboardMonth) dashboardMonth.value = currentMonth;
        if (employeeMonth) employeeMonth.value = currentMonth;
        const annualYear = document.getElementById('annual-year');
        if (annualYear) {
            annualYear.innerHTML = '';
            const y = currentDate.getFullYear();
            for (let year = y; year >= 2020; year--) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                if (year === y) option.selected = true;
                annualYear.appendChild(option);
            }
        }
    }

    switchTab(tabName) {
        console.log(`🔄 Switching to fatturazione tab: ${tabName}`);
        document.querySelectorAll('.nav-tab').forEach((tab) => tab.classList.remove('active'));
        const btn = document.querySelector(`[data-tab="${tabName}"]`);
        if (btn) btn.classList.add('active');

        document.querySelectorAll('.content-section').forEach((section) => { section.style.display = 'none'; });
        const sec = document.getElementById(tabName);
        if (sec) sec.style.display = 'block';

        this.currentTab = tabName;
        this.loadTabData(tabName);
    }

    async loadTabData(tabName) {
        switch (tabName) {
            case 'dashboard':
                if (!this.currentData.dashboard) await this.loadDashboardData();
                break;
            case 'per-employee':
                if (!this.currentData.employee) await this.loadEmployeeData();
                break;
            case 'annual-report':
                if (!this.currentData.annual) await this.loadAnnualData();
                break;
        }
    }

    async loadInitialData() { await this.loadDashboardData(); }

    renderDashboard(model) {
        const container = document.getElementById('dashboard-content');
        if (!container || !model || !model.rows) return;

        const rows = model.rows;
        if (rows.length === 0) {
            container.innerHTML = '<div class="alert alert-info">Nessun dato disponibile per il mese selezionato.</div>';
            return;
        }

        let totalActivities = 0;
        let totalLaborCost = 0;
        let totalBiancheria = 0;
        let totalProdotti = 0;
        let totalRicavi = 0;
        let totalMargine = 0;

        rows.forEach(row => {
            totalActivities += row.totalActivities;
            totalLaborCost += row.laborCost;
            totalBiancheria += row.costoBiancheria;
            totalProdotti += row.costoProdotti;
            totalRicavi += row.totaleRicavi;
            totalMargine += row.margine;
        });

        const html = `
            <div class="mb-4">
                <h5>Riepilogo Dashboard - ${String(model.month).padStart(2, '0')}/${model.year}</h5>
                <div class="row g-3 mb-4">
                    <div class="col-md-3">
                        <div class="card bg-primary text-white">
                            <div class="card-body">
                                <h6 class="card-title">Totale Attività</h6>
                                <h3>${totalActivities}</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-info text-white">
                            <div class="card-body">
                                <h6 class="card-title">Costo Manodopera</h6>
                                <h3>€${totalLaborCost.toFixed(2)}</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-success text-white">
                            <div class="card-body">
                                <h6 class="card-title">Totale Ricavi</h6>
                                <h3>€${totalRicavi.toFixed(2)}</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card ${totalMargine >= 0 ? 'bg-success' : 'bg-danger'} text-white">
                            <div class="card-body">
                                <h6 class="card-title">Margine</h6>
                                <h3>€${totalMargine.toFixed(2)}</h3>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="table-responsive">
                    <table class="table table-dark table-striped table-hover">
                        <thead>
                            <tr>
                                <th>Cantiere</th>
                                <th>Tipo</th>
                                <th class="text-end">Attività</th>
                                <th class="text-end">Ore</th>
                                <th class="text-end">Costo Lavoro</th>
                                <th class="text-end">Biancheria</th>
                                <th class="text-end">Prodotti</th>
                                <th class="text-end">Ricavi</th>
                                <th class="text-end">Margine</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows.map(row => `
                                <tr>
                                    <td>${row.name}</td>
                                    <td><span class="badge bg-secondary">${row.type}</span></td>
                                    <td class="text-end">${row.totalActivities}</td>
                                    <td class="text-end">${(row.totalMinutesEffective / 60).toFixed(2)}</td>
                                    <td class="text-end">€${row.laborCost.toFixed(2)}</td>
                                    <td class="text-end">€${row.costoBiancheria.toFixed(2)}</td>
                                    <td class="text-end">€${row.costoProdotti.toFixed(2)}</td>
                                    <td class="text-end">€${row.totaleRicavi.toFixed(2)}</td>
                                    <td class="text-end ${row.margine >= 0 ? 'text-success' : 'text-danger'}">
                                        €${row.margine.toFixed(2)}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr class="table-primary fw-bold">
                                <td colspan="2">TOTALE</td>
                                <td class="text-end">${totalActivities}</td>
                                <td class="text-end">${(rows.reduce((sum, r) => sum + r.totalMinutesEffective, 0) / 60).toFixed(2)}</td>
                                <td class="text-end">€${totalLaborCost.toFixed(2)}</td>
                                <td class="text-end">€${totalBiancheria.toFixed(2)}</td>
                                <td class="text-end">€${totalProdotti.toFixed(2)}</td>
                                <td class="text-end">€${totalRicavi.toFixed(2)}</td>
                                <td class="text-end ${totalMargine >= 0 ? 'text-success' : 'text-danger'}">
                                    €${totalMargine.toFixed(2)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    async loadDashboardData() {
        const monthInput = document.getElementById('dashboard-month');
        if (!monthInput || !monthInput.value) return;
        const [year, month] = monthInput.value.split('-').map(Number);
        const container = document.getElementById('dashboard-content');
        if (!container) return;
        container.innerHTML = `<div class="text-center py-4"><div class="spinner-border text-primary mb-3"></div><p class="text-muted">Caricamento dati dashboard...</p></div>`;

        try {
            const model = await generateMonthlyDashboardModel(year, month);
            this.currentData.dashboard = model;
            this.renderDashboard(model);
        } catch (err) {
            console.error('❌ Dashboard load error:', err);
            showToast('Errore nel caricamento della dashboard', 'error');
        }
    }

    async loadEmployeeData() {
        const monthInput = document.getElementById('employee-month');
        if (!monthInput || !monthInput.value) return;
        const [year, month] = monthInput.value.split('-').map(Number);
        const container = document.getElementById('employee-content');
        if (!container) return;
        container.innerHTML = `<div class="text-center py-4"><div class="spinner-border text-primary mb-3"></div><p class="text-muted">Caricamento dati dipendenti...</p></div>`;

        try {
            const map = await getMonthEmployeeCantiereMapOptimized(year, month);
            const rows = [];

            Object.entries(map).forEach(([employee, employeeData]) => {
                let totalMinutes = 0;
                if (employeeData && employeeData.cantieri) {
                    Object.values(employeeData.cantieri).forEach((cantiere) => {
                        totalMinutes += (cantiere.minutesEff || 0);
                    });
                }
                rows.push({ employee, totalMinutes });
            });

            rows.sort((a,b)=> b.totalMinutes - a.totalMinutes);
            container.innerHTML = `
                <table class="table table-dark table-striped">
                    <thead><tr><th>Dipendente</th><th class="text-end">Ore</th></tr></thead>
                    <tbody>
                        ${rows.map(r => `<tr><td>${r.employee}</td><td class="text-end">${(r.totalMinutes/60).toFixed(2)}</td></tr>`).join('')}
                    </tbody>
                </table>`;
            this.currentData.employee = rows;
        } catch (err) {
            console.error('❌ Employee load error:', err);
            showToast('Errore nel caricamento dati per dipendente', 'error');
        }
    }

    async loadAnnualData() {
        const annualYear = document.getElementById('annual-year');
        const container = document.getElementById('annual-content');
        if (!annualYear || !container) return;
        container.innerHTML = `<div class="text-center py-4"><div class="spinner-border text-primary mb-3"></div><p class="text-muted">Caricamento report annuale...</p></div>`;
        try {
            const year = Number(annualYear.value);
            const report = await generateAnnualReport(year);
            container.innerHTML = report.html || '<div class="alert alert-info">Report annuale generato.</div>';
            this.currentData.annual = report;
        } catch (err) {
            console.error('❌ Annual report error:', err);
            showToast('Errore nel caricamento del report annuale', 'error');
        }
    }

    exportDashboard() { showToast('Esportazione dashboard non ancora implementata', 'info'); }
    exportEmployeeData() { showToast('Esportazione per dipendente non ancora implementata', 'info'); }
    exportAnnualData() { showToast('Esportazione annuale non ancora implementata', 'info'); }
    clearAnnualCache() { try { clearAnnualCache(); showToast('Cache annuale pulita', 'success'); } catch(e){ console.warn(e); } }
    refresh() { this.currentData = { dashboard: null, employee: null, annual: null }; this.loadTabData(this.currentTab); }
}

window.adminFatturazioneManager = new AdminFatturazioneManager();

document.addEventListener('DOMContentLoaded', () => {
    const fatturazioneTab = document.getElementById('fatturazione-tab');
    let fatturazioneManager = null;
    if (fatturazioneTab) {
        fatturazioneTab.addEventListener('shown.bs.tab', async () => {
            if (!fatturazioneManager) {
                fatturazioneManager = window.adminFatturazioneManager;
                await fatturazioneManager.init();
            }
        });
    }
});

export { AdminFatturazioneManager };
