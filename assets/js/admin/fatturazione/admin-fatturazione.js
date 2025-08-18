// admin-fatturazione.js - Gestione fatturazione cantieri nel pannello admin
import { generateMonthlyDashboardModel } from './fatturazione-report.js';
import { generateAnnualReport, clearAnnualCache } from './fatturazione-annual-report.js';
import { getEmployeesWithCosts, getJobSitesWithCosts, writeEmployeeCosts, writeJobSiteCosts } from './fatturazione-cost-management.js';
import { getMonthEmployeeCantiereMapOptimized } from './fatturazione-data-readers.js';
import { showToast } from "../../common/utils.js";

class AdminFatturazioneManager {
    constructor() {
        this.currentTab = 'dashboard';
        this.currentData = {
            dashboard: null,
            employee: null,
            annual: null
        };
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
        // Tab navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetTab = e.target.dataset.tab;
                this.switchTab(targetTab);
            });
        });

        // Dashboard controls
        const dashboardMonth = document.getElementById('dashboard-month');
        if (dashboardMonth) {
            dashboardMonth.addEventListener('change', () => this.loadDashboardData());
        }

        const exportDashboard = document.getElementById('export-dashboard');
        if (exportDashboard) {
            exportDashboard.addEventListener('click', () => this.exportDashboard());
        }

        // Employee controls
        const employeeMonth = document.getElementById('employee-month');
        if (employeeMonth) {
            employeeMonth.addEventListener('change', () => this.loadEmployeeData());
        }

        const exportEmployee = document.getElementById('export-per-dipendente');
        if (exportEmployee) {
            exportEmployee.addEventListener('click', () => this.exportEmployeeData());
        }

        // Annual report controls
        const annualYear = document.getElementById('annual-year');
        if (annualYear) {
            annualYear.addEventListener('change', () => this.loadAnnualData());
        }

        const exportAnnual = document.getElementById('export-annual-report');
        if (exportAnnual) {
            exportAnnual.addEventListener('click', () => this.exportAnnualData());
        }

        const clearCache = document.getElementById('clear-annual-cache');
        if (clearCache) {
            clearCache.addEventListener('click', () => this.clearAnnualCache());
        }

        // Cost management controls
        this.setupCostManagementListeners();

        // Refresh button
        const refreshBtn = document.getElementById('refreshFatturazioneBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }
    }

    setupCostManagementListeners() {
        // Employee costs
        const addEmployeeBtn = document.getElementById('add-employee-cost');
        if (addEmployeeBtn) {
            addEmployeeBtn.addEventListener('click', () => this.addEmployeeCostRow());
        }

        const saveEmployeeBtn = document.getElementById('save-employee-costs');
        if (saveEmployeeBtn) {
            saveEmployeeBtn.addEventListener('click', () => this.saveEmployeeCosts());
        }

        const employeeSearch = document.getElementById('employee-search');
        if (employeeSearch) {
            employeeSearch.addEventListener('input', () => this.filterEmployees());
        }

        // Job site costs
        const addJobSiteBtn = document.getElementById('add-jobsite-cost');
        if (addJobSiteBtn) {
            addJobSiteBtn.addEventListener('click', () => this.addJobSiteCostRow());
        }

        const saveJobSiteBtn = document.getElementById('save-jobsite-costs');
        if (saveJobSiteBtn) {
            saveJobSiteBtn.addEventListener('click', () => this.saveJobSiteCosts());
        }

        const jobSiteSearch = document.getElementById('jobsite-search');
        if (jobSiteSearch) {
            jobSiteSearch.addEventListener('input', () => this.filterJobSites());
        }
    }

    initializeDateInputs() {
        const currentDate = new Date();
        const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        
        const dashboardMonth = document.getElementById('dashboard-month');
        const employeeMonth = document.getElementById('employee-month');
        
        if (dashboardMonth) dashboardMonth.value = currentMonth;
        if (employeeMonth) employeeMonth.value = currentMonth;
        
        // Inizializza anno corrente per report annuale
        const annualYear = document.getElementById('annual-year');
        if (annualYear) {
            annualYear.innerHTML = '';
            const currentYear = currentDate.getFullYear();
            for (let year = currentYear; year >= 2020; year--) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                if (year === currentYear) option.selected = true;
                annualYear.appendChild(option);
            }
        }
    }

    switchTab(tabName) {
        console.log(`🔄 Switching to fatturazione tab: ${tabName}`);
        
        // Update tab buttons
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update content sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.style.display = 'none';
        });
        document.getElementById(tabName).style.display = 'block';
        
        this.currentTab = tabName;
        
        // Load data for the selected tab
        this.loadTabData(tabName);
    }

    async loadTabData(tabName) {
        switch(tabName) {
            case 'dashboard':
                if (!this.currentData.dashboard) {
                    await this.loadDashboardData();
                }
                break;
            case 'per-employee':
                if (!this.currentData.employee) {
                    await this.loadEmployeeData();
                }
                break;
            case 'annual-report':
                if (!this.currentData.annual) {
                    await this.loadAnnualData();
                }
                break;
            case 'cost-management':
                await this.loadCostManagementData();
                break;
        }
    }

    async loadInitialData() {
        await this.loadDashboardData();
    }

    async loadDashboardData() {
        const monthInput = document.getElementById('dashboard-month');
        if (!monthInput || !monthInput.value) return;

        const [year, month] = monthInput.value.split('-').map(Number);
        const container = document.getElementById('dashboard-content');
        
        container.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary mb-3"></div>
                <p class="text-muted">Caricamento dati dashboard...</p>
            </div>
        `;
        
        try {
            const data = await generateMonthlyDashboardModel(year, month);
            this.currentData.dashboard = data;
            this.renderDashboard(data);
        } catch (error) {
            console.error('❌ Error loading dashboard:', error);
            container.innerHTML = '<div class="alert alert-danger">Errore nel caricamento dei dati dashboard</div>';
        }
    }

    renderDashboard(data) {
        const container = document.getElementById('dashboard-content');
        
        if (!data || !data.rows || data.rows.length === 0) {
            container.innerHTML = '<div class="alert alert-info">📂 Nessun dato disponibile per questo mese</div>';
            return;
        }
        
        const html = `
            <h6 class="text-primary mb-3">📊 Dashboard ${data.year}-${String(data.month).padStart(2, '0')}</h6>
            <div class="table-responsive">
                <table class="table table-dark table-striped table-hover">
                    <thead class="table-primary">
                        <tr>
                            <th>Tipo</th>
                            <th>Nome Cantiere</th>
                            <th>Totale Attività</th>
                            <th>Minuti Effettivi</th>
                            <th>Costo Manodopera</th>
                            <th>Costo Biancheria</th>
                            <th>Costo Prodotti</th>
                            <th>Totale Ricavi</th>
                            <th>Margine</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.rows.map(row => `
                            <tr>
                                <td><span class="badge bg-${this.getTypeColor(row.type)}">${this.capitalizeType(row.type)}</span></td>
                                <td>${row.name}</td>
                                <td class="text-center">${row.totalActivities}</td>
                                <td class="text-center">${Math.round(row.totalMinutesEffective)}</td>
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
                </table>
            </div>
        `;
        
        container.innerHTML = html;
    }

    async loadEmployeeData() {
        const monthInput = document.getElementById('employee-month');
        if (!monthInput || !monthInput.value) return;

        const [year, month] = monthInput.value.split('-').map(Number);
        const container = document.getElementById('employee-content');
        
        container.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary mb-3"></div>
                <p class="text-muted">Caricamento dati dipendenti...</p>
            </div>
        `;
        
        try {
            const empMap = await getMonthEmployeeCantiereMapOptimized(year, month);
            this.currentData.employee = { year, month, employees: empMap };
            this.renderEmployeeMatrix(this.currentData.employee);
        } catch (error) {
            console.error('❌ Error loading employee data:', error);
            container.innerHTML = '<div class="alert alert-danger">Errore nel caricamento dei dati dipendenti</div>';
        }
    }

    renderEmployeeMatrix(data) {
        const container = document.getElementById('employee-content');
        
        if (!data || !data.employees || Object.keys(data.employees).length === 0) {
            container.innerHTML = '<div class="alert alert-info">📂 Nessun dato disponibile per questo mese</div>';
            return;
        }

        const matrixData = this.buildMatrixData(data.employees);
        
        const html = `
            <h6 class="text-primary mb-3">👥 Matrice Dipendenti-Cantieri ${data.year}-${String(data.month).padStart(2, '0')}</h6>
            
            <div class="table-responsive">
                <table class="table table-dark table-striped table-sm">
                    <thead class="table-primary">
                        <tr>
                            <th>Cantiere</th>
                            ${matrixData.employees.map(emp => `<th class="text-center">${emp.name}</th>`).join('')}
                            <th class="text-center">Tot. Min</th>
                            <th class="text-center">Tot. Ore</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${matrixData.cantieri.map(cantiere => `
                            <tr>
                                <td>
                                    <span class="badge bg-${this.getTypeColor(cantiere.type)}">${this.capitalizeType(cantiere.type)}</span>
                                    ${cantiere.name}
                                </td>
                                ${matrixData.employees.map(emp => {
                                    const activities = cantiere.employeeActivities[emp.id] || 0;
                                    const minutes = cantiere.employeeMinutes[emp.id] || 0;
                                    return `
                                        <td class="text-center ${activities > 0 ? 'bg-success bg-opacity-25' : 'text-muted'}">
                                            ${activities > 0 ? `${activities}<br><small>${Math.round(minutes)}min</small>` : '-'}
                                        </td>
                                    `;
                                }).join('')}
                                <td class="text-center fw-bold">${Math.round(cantiere.totalMinutesEff)}</td>
                                <td class="text-center fw-bold">${(cantiere.totalMinutesEff / 60).toFixed(1)}</td>
                            </tr>
                        `).join('')}
                        
                        <!-- Totali -->
                        <tr class="table-warning">
                            <td><strong>Totali Minuti</strong></td>
                            ${matrixData.employees.map(emp => `
                                <td class="text-center"><strong>${Math.round(emp.totalMinutesEff)}</strong></td>
                            `).join('')}
                            <td class="text-center"><strong>${Math.round(matrixData.grandTotalMinutesEff)}</strong></td>
                            <td class="text-center"><strong>${(matrixData.grandTotalMinutesEff / 60).toFixed(1)}</strong></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
        
        container.innerHTML = html;
    }

    buildMatrixData(employeesData) {
        const cantieriSet = new Set();
        const employeesList = [];
        
        // Build employees list and collect all cantieri
        Object.entries(employeesData).forEach(([employeeId, employee]) => {
            employeesList.push({
                id: employeeId,
                name: employee.name,
                totalMinutesEff: employee.totalMinutesEff || 0
            });
            
            Object.keys(employee.cantieri).forEach(cantiereKey => {
                cantieriSet.add(cantiereKey);
            });
        });
        
        // Build cantieri list with employee activities
        const cantieriList = [];
        cantieriSet.forEach(cantiereKey => {
            let cantiereInfo = null;
            for (const employee of Object.values(employeesData)) {
                if (employee.cantieri[cantiereKey]) {
                    cantiereInfo = employee.cantieri[cantiereKey];
                    break;
                }
            }
            
            if (cantiereInfo) {
                const cantiere = {
                    key: cantiereKey,
                    type: cantiereInfo.type,
                    name: cantiereInfo.name,
                    employeeActivities: {},
                    employeeMinutes: {},
                    totalMinutesEff: 0
                };
                
                employeesList.forEach(emp => {
                    const empData = employeesData[emp.id];
                    if (empData && empData.cantieri[cantiereKey]) {
                        const activities = empData.cantieri[cantiereKey].activities || 0;
                        const minutesEff = empData.cantieri[cantiereKey].minutesEff || 0;
                        cantiere.employeeActivities[emp.id] = activities;
                        cantiere.employeeMinutes[emp.id] = minutesEff;
                        cantiere.totalMinutesEff += minutesEff;
                    } else {
                        cantiere.employeeActivities[emp.id] = 0;
                        cantiere.employeeMinutes[emp.id] = 0;
                    }
                });
                
                cantieriList.push(cantiere);
            }
        });
        
        // Sort cantieri by type and name
        cantieriList.sort((a, b) => {
            if (a.type !== b.type) {
                return a.type.localeCompare(b.type);
            }
            return a.name.localeCompare(b.name);
        });
        
        // Sort employees by name
        employeesList.sort((a, b) => a.name.localeCompare(b.name));
        
        const grandTotalMinutesEff = employeesList.reduce((sum, emp) => sum + emp.totalMinutesEff, 0);
        
        return {
            employees: employeesList,
            cantieri: cantieriList,
            grandTotalMinutesEff: grandTotalMinutesEff
        };
    }

    async loadAnnualData() {
        const yearSelect = document.getElementById('annual-year');
        if (!yearSelect || !yearSelect.value) return;

        const year = parseInt(yearSelect.value);
        const container = document.getElementById('annual-content');
        
        container.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary mb-3"></div>
                <p class="text-muted">Caricamento report annuale...</p>
            </div>
        `;
        
        try {
            const data = await generateAnnualReport(year);
            this.currentData.annual = data;
            this.renderAnnualReport(data);
        } catch (error) {
            console.error('❌ Error loading annual data:', error);
            container.innerHTML = '<div class="alert alert-danger">Errore nel caricamento del report annuale</div>';
        }
    }

    renderAnnualReport(data) {
        const container = document.getElementById('annual-content');
        
        if (!data || !data.summary) {
            container.innerHTML = '<div class="alert alert-info">📂 Nessun dato disponibile per questo anno</div>';
            return;
        }
        
        const html = `
            <h6 class="text-primary mb-3">📊 Report Annuale ${data.year}</h6>
            
            <!-- Annual Summary Cards -->
            <div class="row mb-4">
                <div class="col-md-2 mb-3">
                    <div class="card bg-success text-white h-100 border-0">
                        <div class="card-body text-center p-2">
                            <h6 class="card-title small">Ricavi Totali</h6>
                            <p class="card-text h6 mb-0">€${data.summary.ricavi.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-2 mb-3">
                    <div class="card bg-warning text-dark h-100 border-0">
                        <div class="card-body text-center p-2">
                            <h6 class="card-title small">Costo Manodopera</h6>
                            <p class="card-text h6 mb-0">€${data.summary.manodopera.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-2 mb-3">
                    <div class="card bg-info text-white h-100 border-0">
                        <div class="card-body text-center p-2">
                            <h6 class="card-title small">Costo Biancheria</h6>
                            <p class="card-text h6 mb-0">€${data.summary.biancheria.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-2 mb-3">
                    <div class="card bg-secondary text-white h-100 border-0">
                        <div class="card-body text-center p-2">
                            <h6 class="card-title small">Costo Prodotti</h6>
                            <p class="card-text h6 mb-0">€${data.summary.prodotti.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-2 mb-3">
                    <div class="card bg-danger text-white h-100 border-0">
                        <div class="card-body text-center p-2">
                            <h6 class="card-title small">Costi Totali</h6>
                            <p class="card-text h6 mb-0">€${data.summary.costiTotali.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-2 mb-3">
                    <div class="card bg-${data.summary.margine >= 0 ? 'success' : 'danger'} text-white h-100 border-0">
                        <div class="card-body text-center p-2">
                            <h6 class="card-title small">Margine Totale</h6>
                            <p class="card-text h6 mb-0">€${data.summary.margine.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Cantieri Details -->
            <div class="accordion" id="cantieriAccordion">
                ${data.cantieri.map((cantiere, index) => `
                    <div class="accordion-item bg-dark border-secondary">
                        <h2 class="accordion-header">
                            <button class="accordion-button collapsed bg-dark text-light border-0" 
                                    type="button" data-bs-toggle="collapse" 
                                    data-bs-target="#cantiere-${index}">
                                <span class="badge bg-${this.getTypeColor(cantiere.type)} me-2">${this.capitalizeType(cantiere.type)}</span>
                                ${cantiere.name}
                                <span class="ms-auto me-3">
                                    <span class="badge bg-success">€${cantiere.ricavi.toFixed(0)} ricavi</span>
                                    <span class="badge bg-danger">€${cantiere.costiTotali.toFixed(0)} costi</span>
                                    <span class="badge bg-${cantiere.margine >= 0 ? 'success' : 'danger'}">€${cantiere.margine.toFixed(0)} margine</span>
                                </span>
                            </button>
                        </h2>
                        <div id="cantiere-${index}" class="accordion-collapse collapse" data-bs-parent="#cantieriAccordion">
                            <div class="accordion-body bg-secondary">
                                <div class="row mb-3">
                                    <div class="col-md-2">
                                        <div class="text-center">
                                            <div class="h6 text-success">€${cantiere.ricavi.toFixed(2)}</div>
                                            <small class="text-muted">Ricavi Totali</small>
                                        </div>
                                    </div>
                                    <div class="col-md-2">
                                        <div class="text-center">
                                            <div class="h6 text-warning">€${cantiere.manodopera.toFixed(2)}</div>
                                            <small class="text-muted">Manodopera</small>
                                        </div>
                                    </div>
                                    <div class="col-md-2">
                                        <div class="text-center">
                                            <div class="h6 text-info">€${cantiere.biancheria.toFixed(2)}</div>
                                            <small class="text-muted">Biancheria</small>
                                        </div>
                                    </div>
                                    <div class="col-md-2">
                                        <div class="text-center">
                                            <div class="h6 text-secondary">€${cantiere.prodotti.toFixed(2)}</div>
                                            <small class="text-muted">Prodotti</small>
                                        </div>
                                    </div>
                                    <div class="col-md-2">
                                        <div class="text-center">
                                            <div class="h6 text-danger">€${cantiere.costiTotali.toFixed(2)}</div>
                                            <small class="text-muted">Costi Totali</small>
                                        </div>
                                    </div>
                                    <div class="col-md-2">
                                        <div class="text-center">
                                            <div class="h6 ${cantiere.margine >= 0 ? 'text-success' : 'text-danger'}">€${cantiere.margine.toFixed(2)}</div>
                                            <small class="text-muted">Margine</small>
                                        </div>
                                    </div>
                                </div>
                                
                                <h6 class="text-light">📅 Andamento Mensile</h6>
                                <div class="table-responsive">
                                    <table class="table table-sm table-bordered">
                                        <thead>
                                            <tr>
                                                <th>Mese</th>
                                                <th>Attività</th>
                                                <th>Ricavi</th>
                                                <th>Manodopera</th>
                                                <th>Biancheria</th>
                                                <th>Prodotti</th>
                                                <th>Margine</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${cantiere.monthlyData.map(monthData => `
                                                <tr>
                                                    <td>${monthData.year}-${String(monthData.month).padStart(2, '0')}</td>
                                                    <td class="text-center">${monthData.activities}</td>
                                                    <td class="text-end">€${monthData.ricavi.toFixed(2)}</td>
                                                    <td class="text-end">€${monthData.manodopera.toFixed(2)}</td>
                                                    <td class="text-end">€${monthData.biancheria.toFixed(2)}</td>
                                                    <td class="text-end">€${monthData.prodotti.toFixed(2)}</td>
                                                    <td class="text-end ${monthData.margine >= 0 ? 'text-success' : 'text-danger'}">
                                                        €${monthData.margine.toFixed(2)}
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        container.innerHTML = html;
    }

    async loadCostManagementData() {
        try {
            const [employees, jobSites] = await Promise.all([
                getEmployeesWithCosts(),
                getJobSitesWithCosts()
            ]);
            
            this.renderEmployeeCosts(employees);
            this.renderJobSiteCosts(jobSites);
        } catch (error) {
            console.error('❌ Error loading cost management data:', error);
            showToast('Errore nel caricamento dei dati di costo', 'error');
        }
    }

    renderEmployeeCosts(employees) {
        const container = document.getElementById('employee-costs-container');
        if (!container) return;
        
        if (employees.length === 0) {
            container.innerHTML = '<div class="alert alert-info">📂 Nessun dipendente trovato</div>';
            return;
        }
        
        const html = employees.map(employee => `
            <div class="d-flex align-items-center gap-2 mb-2 p-2 bg-secondary rounded" data-employee-id="${employee.id}">
                <div class="flex-grow-1 fw-bold">${employee.name}</div>
                <input type="number" class="form-control form-control-sm bg-dark text-light border-0" 
                       value="${employee.cost}" step="0.01" min="0" 
                       placeholder="Costo orario" data-field="cost" style="width: 100px;">
                <button class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
        
        container.innerHTML = html;
    }

    renderJobSiteCosts(jobSites) {
        const container = document.getElementById('jobsite-costs-container');
        if (!container) return;
        
        if (jobSites.length === 0) {
            container.innerHTML = '<div class="alert alert-info">📂 Nessun cantiere trovato</div>';
            return;
        }
        
        const html = jobSites.map(jobSite => `
  <div class="p-2 bg-secondary rounded mb-2" data-jobsite-key="${jobSite.key}">
    <div class="jobsite-grid" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.5rem;">
      
      <div class="cell">
        <label for="type-${jobSite.key}" class="form-label small text-light mb-1">Tipo cantiere</label>
        <select id="type-${jobSite.key}" class="form-select form-select-sm bg-dark text-light border-0" data-field="type">
          <option value="uffici" ${jobSite.type === 'uffici' ? 'selected' : ''}>Uffici</option>
          <option value="appartamenti" ${jobSite.type === 'appartamenti' ? 'selected' : ''}>Appartamenti</option>
          <option value="bnb" ${jobSite.type === 'bnb' ? 'selected' : ''}>B&B</option>
          <option value="pst" ${jobSite.type === 'pst' ? 'selected' : ''}>PST</option>
        </select>
      </div>

      <div class="cell">
        <label for="name-${jobSite.key}" class="form-label small text-light mb-1">Nome cantiere</label>
        <input id="name-${jobSite.key}" type="text" class="form-control form-control-sm bg-dark text-light border-0"
               value="${jobSite.name}" placeholder="Nome cantiere" data-field="name">
      </div>

      <div class="cell">
        <label for="biancheria-${jobSite.key}" class="form-label small text-light mb-1">Costo biancheria (€)</label>
        <input id="biancheria-${jobSite.key}" type="number" class="form-control form-control-sm bg-dark text-light border-0"
               value="${jobSite.biancheria}" step="0.01" min="0" placeholder="0,00" data-field="biancheria">
      </div>

      <div class="cell">
        <label for="prodotti-${jobSite.key}" class="form-label small text-light mb-1">Costo prodotti (€)</label>
        <input id="prodotti-${jobSite.key}" type="number" class="form-control form-control-sm bg-dark text-light border-0"
               value="${jobSite.prodotti}" step="0.01" min="0" placeholder="0,00" data-field="prodotti">
      </div>

      <div class="cell">
        <label for="fatt-mensile-${jobSite.key}" class="form-label small text-light mb-1">Fatturato mensile (€)</label>
        <input id="fatt-mensile-${jobSite.key}" type="number" class="form-control form-control-sm bg-dark text-light border-0"
               value="${jobSite.fatturato_mensile}" step="0.01" min="0" placeholder="€/mese" data-field="fatturato_mensile">
      </div>

      <div class="cell">
        <label for="fatt-intervento-${jobSite.key}" class="form-label small text-light mb-1">Fatturato per intervento (€)</label>
        <input id="fatt-intervento-${jobSite.key}" type="number" class="form-control form-control-sm bg-dark text-light border-0"
               value="${jobSite.fatturato_intervento}" step="0.01" min="0" placeholder="€/intervento" data-field="fatturato_intervento">
      </div>

    </div>

    <div class="mt-2 text-end">
      <button class="btn btn-danger btn-sm" onclick="this.closest('[data-jobsite-key]').remove()">
        <i class="fas fa-trash"></i> Elimina
      </button>
    </div>
  </div>
`).join('');

container.innerHTML = html;

        
        container.innerHTML = html;
    }

    addEmployeeCostRow() {
        const container = document.getElementById('employee-costs-container');
        if (!container) return;

        const newRow = document.createElement('div');
        newRow.className = 'd-flex align-items-center gap-2 mb-2 p-2 bg-secondary rounded';
        newRow.innerHTML = `
            <input type="text" class="form-control form-control-sm bg-dark text-light border-0 flex-grow-1" 
                   placeholder="Nome dipendente" data-field="name">
            <input type="number" class="form-control form-control-sm bg-dark text-light border-0" 
                   value="15.00" step="0.01" min="0" 
                   placeholder="Costo orario" data-field="cost" style="width: 100px;">
            <button class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">
                <i class="fas fa-trash"></i>
            </button>
        `;
        container.appendChild(newRow);
    }

    addJobSiteCostRow() {
        const container = document.getElementById('jobsite-costs-container');
        if (!container) return;

        const newRow = document.createElement('div');
        newRow.className = 'row g-2 mb-2 p-2 bg-secondary rounded align-items-center';
        newRow.innerHTML = `
            <div class="col-md-2">
                <select class="form-select form-select-sm bg-dark text-light border-0" data-field="type">
                    <option value="uffici">Uffici</option>
                    <option value="appartamenti">Appartamenti</option>
                    <option value="bnb">B&B</option>
                    <option value="pst">PST</option>
                </select>
            </div>
            <div class="col-md-3">
                <input type="text" class="form-control form-control-sm bg-dark text-light border-0" 
                       placeholder="Nome cantiere" data-field="name">
            </div>
            <div class="col-md-1">
                <input type="number" class="form-control form-control-sm bg-dark text-light border-0" 
                       value="0" step="0.01" min="0" placeholder="Biancheria" data-field="biancheria">
            </div>
            <div class="col-md-1">
                <input type="number" class="form-control form-control-sm bg-dark text-light border-0" 
                       value="0" step="0.01" min="0" placeholder="Prodotti" data-field="prodotti">
            </div>
            <div class="col-md-2">
                <input type="number" class="form-control form-control-sm bg-dark text-light border-0" 
                       value="0" step="0.01" min="0" placeholder="€/mese" data-field="fatturato_mensile">
            </div>
            <div class="col-md-2">
                <input type="number" class="form-control form-control-sm bg-dark text-light border-0" 
                       value="0" step="0.01" min="0" placeholder="€/intervento" data-field="fatturato_intervento">
            </div>
            <div class="col-md-1">
                <button class="btn btn-danger btn-sm w-100" onclick="this.closest('.row').remove()">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(newRow);
    }

    async saveEmployeeCosts() {
        const costItems = document.querySelectorAll('#employee-costs-container > div');
        const costsMap = {};
        
        costItems.forEach(item => {
            const employeeId = item.dataset.employeeId;
            const nameInput = item.querySelector('[data-field="name"]');
            const costInput = item.querySelector('[data-field="cost"]');
            
            let name, cost;
            
            if (employeeId) {
                // Existing employee
                name = item.querySelector('.fw-bold').textContent;
                cost = parseFloat(costInput.value) || 0;
                costsMap[employeeId] = cost;
            } else if (nameInput) {
                // New employee
                name = nameInput.value.trim();
                cost = parseFloat(costInput.value) || 0;
                if (name) {
                    const newEmployeeId = name.replaceAll(' ', '_');
                    costsMap[newEmployeeId] = cost;
                }
            }
        });
        
        try {
            const success = await writeEmployeeCosts(costsMap);
            if (success) {
                showToast('Costi dipendenti salvati con successo', 'success');
                this.loadCostManagementData(); // Reload data
            } else {
                showToast('Errore nel salvataggio dei costi dipendenti', 'error');
            }
        } catch (error) {
            console.error('❌ Error saving employee costs:', error);
            showToast('Errore nel salvataggio dei costi dipendenti', 'error');
        }
    }

    async saveJobSiteCosts() {
        const costItems = document.querySelectorAll('#jobsite-costs-container .row');
        const costsMap = {};
        
        costItems.forEach(item => {
            const jobSiteKey = item.dataset.jobsiteKey;
            const typeSelect = item.querySelector('[data-field="type"]');
            const nameInput = item.querySelector('[data-field="name"]');
            const biancheriaInput = item.querySelector('[data-field="biancheria"]');
            const prodottiInput = item.querySelector('[data-field="prodotti"]');
            const fatturatoMensileInput = item.querySelector('[data-field="fatturato_mensile"]');
            const fatturatoInterventoInput = item.querySelector('[data-field="fatturato_intervento"]');
            
            const type = typeSelect.value;
            const name = nameInput.value.trim();
            
            if (name && type) {
                const key = jobSiteKey || `${type}__${name.toLowerCase().replace(/\s+/g, '_').replace(/[^\w\-]/g, '')}`;
                
                costsMap[key] = {
                    biancheria: parseFloat(biancheriaInput.value) || 0,
                    prodotti: parseFloat(prodottiInput.value) || 0,
                    fatturato_mensile: parseFloat(fatturatoMensileInput.value) || 0,
                    fatturato_intervento: parseFloat(fatturatoInterventoInput.value) || 0
                };
            }
        });
        
        try {
            const success = await writeJobSiteCosts(costsMap);
            if (success) {
                showToast('Costi cantieri salvati con successo', 'success');
                this.loadCostManagementData(); // Reload data
            } else {
                showToast('Errore nel salvataggio dei costi cantieri', 'error');
            }
        } catch (error) {
            console.error('❌ Error saving job site costs:', error);
            showToast('Errore nel salvataggio dei costi cantieri', 'error');
        }
    }

    filterEmployees() {
        const searchTerm = document.getElementById('employee-search').value.toLowerCase();
        const costItems = document.querySelectorAll('#employee-costs-container > div');
        
        costItems.forEach(item => {
            const nameElement = item.querySelector('.fw-bold') || item.querySelector('[data-field="name"]');
            const employeeName = nameElement ? nameElement.textContent.toLowerCase() || nameElement.value.toLowerCase() : '';
            if (employeeName.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    filterJobSites() {
        const searchTerm = document.getElementById('jobsite-search').value.toLowerCase();
        const costItems = document.querySelectorAll('#jobsite-costs-container [data-jobsite-key]');
        
        costItems.forEach(item => {
            const nameInput = item.querySelector('[data-field="name"]');
            const typeSelect = item.querySelector('[data-field="type"]');
            
            if (!nameInput || !typeSelect) return;
            
            const jobSiteName = nameInput.value.toLowerCase();
            const jobSiteType = typeSelect.value.toLowerCase();
            
            if (jobSiteName.includes(searchTerm) || jobSiteType.includes(searchTerm)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    exportDashboard() {
        if (!this.currentData.dashboard || !this.currentData.dashboard.rows) {
            showToast('Nessun dato da esportare', 'error');
            return;
        }
        
        this.exportToExcel(
            this.currentData.dashboard.rows.map(row => ({
                'Tipo': this.capitalizeType(row.type),
                'Nome Cantiere': row.name,
                'Totale Attività': row.totalActivities,
                'Minuti Effettivi': Math.round(row.totalMinutesEffective),
                'Costo Manodopera': row.laborCost.toFixed(2),
                'Costo Biancheria': row.costoBiancheria.toFixed(2),
                'Costo Prodotti': row.costoProdotti.toFixed(2),
                'Totale Ricavi': row.totaleRicavi.toFixed(2),
                'Margine': row.margine.toFixed(2)
            })),
            `Dashboard_${this.currentData.dashboard.year}-${String(this.currentData.dashboard.month).padStart(2, '0')}`
        );
    }

    exportEmployeeData() {
        if (!this.currentData.employee || !this.currentData.employee.employees) {
            showToast('Nessun dato da esportare', 'error');
            return;
        }
        
        const matrixData = this.buildMatrixData(this.currentData.employee.employees);
        const data = [];
        
        matrixData.cantieri.forEach(cantiere => {
            const row = {
                'Tipo': this.capitalizeType(cantiere.type),
                'Nome Cantiere': cantiere.name,
                'Totale Minuti Effettivi': Math.round(cantiere.totalMinutesEff),
                'Totale Ore': (cantiere.totalMinutesEff / 60).toFixed(1)
            };
            
            matrixData.employees.forEach(emp => {
                const activities = cantiere.employeeActivities[emp.id] || 0;
                const minutes = cantiere.employeeMinutes[emp.id] || 0;
                row[emp.name] = activities > 0 ? `${activities} att (${Math.round(minutes)} min)` : 0;
            });
            
            data.push(row);
        });
        
        const filename = `Matrice_Dipendenti_${this.currentData.employee.year}-${String(this.currentData.employee.month).padStart(2, '0')}`;
        this.exportToExcel(data, filename);
    }

    exportAnnualData() {
        if (!this.currentData.annual || !this.currentData.annual.cantieri) {
            showToast('Nessun dato da esportare', 'error');
            return;
        }
        
        const data = this.currentData.annual.cantieri.map(cantiere => ({
            'Tipo': this.capitalizeType(cantiere.type),
            'Nome Cantiere': cantiere.name,
            'Ricavi Totali': cantiere.ricavi.toFixed(2),
            'Costo Manodopera': cantiere.manodopera.toFixed(2),
            'Costo Biancheria': cantiere.biancheria.toFixed(2),
            'Costo Prodotti': cantiere.prodotti.toFixed(2),
            'Costi Totali': cantiere.costiTotali.toFixed(2),
            'Margine': cantiere.margine.toFixed(2)
        }));
        
        const filename = `Report_Annuale_${this.currentData.annual.year}`;
        this.exportToExcel(data, filename);
    }

    clearAnnualCache() {
        clearAnnualCache();
        showToast('Cache pulita con successo', 'success');
        this.loadAnnualData(); // Reload data
    }

    exportToExcel(data, filename) {
        try {
            if (!window.XLSX) {
                showToast('Libreria Excel non disponibile', 'error');
                return;
            }

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Data');
            XLSX.writeFile(wb, `${filename}.xlsx`);
            showToast('File esportato con successo', 'success');
        } catch (error) {
            console.error('❌ Error exporting to Excel:', error);
            showToast('Errore nell\'esportazione del file', 'error');
        }
    }

    async refresh() {
        const refreshBtn = document.getElementById('refreshFatturazioneBtn');
        if (refreshBtn) {
            const originalText = refreshBtn.innerHTML;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Aggiornamento...';
            refreshBtn.disabled = true;

            // Clear current data to force reload
            this.currentData = {
                dashboard: null,
                employee: null,
                annual: null
            };

            await this.loadTabData(this.currentTab);

            refreshBtn.innerHTML = originalText;
            refreshBtn.disabled = false;
        }
    }

    getTypeColor(type) {
        const colors = {
            'uffici': 'info',
            'appartamenti': 'primary',
            'bnb': 'warning',
            'pst': 'secondary'
        };
        return colors[type] || 'dark';
    }

    capitalizeType(type) {
        const typeMap = {
            'uffici': 'Uffici',
            'appartamenti': 'Appartamenti',
            'bnb': 'B&B',
            'pst': 'PST'
        };
        return typeMap[type] || type;
    }
}

// Istanza globale
window.adminFatturazioneManager = new AdminFatturazioneManager();

// Inizializza quando la tab viene attivata
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