/**
 * Admin Registro Attività
 * Gestione del registro completo delle attività dei dipendenti
 */

import { AuthService } from "../../auth/auth.js";
import { FirestoreService } from "../../common/firestore-service.js";
import { exportToExcel } from "../../common/export-excel.js";
import { showToast } from "../../common/utils.js";
import { ACTIVITY_TYPES } from "../../shared/activity-types.js";
import {
  calculateTotalMinutes,
  formatDecimalHours
} from '../../common/time-utilis.js';

class RegistroActivityManager {
  constructor() {
    this.allActivities = [];
    this.filteredActivities = [];
    this.currentPage = 1;
    this.itemsPerPage = 50;
    this.sortField = 'data';
    this.sortDirection = 'desc';
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;
    
    this.setupEventListeners();
    await this.loadEmployees();
    this.setupFilters();
    await this.loadAllActivities();
    this.renderTable();
    this.isInitialized = true;
  }

  setupEventListeners() {
    const refreshBtn = document.getElementById('refreshRegistroBtn');
    const exportBtn = document.getElementById('exportRegistroBtn');
    const applyFiltersBtn = document.getElementById('applyRegistroFilters');
    const resetFiltersBtn = document.getElementById('resetRegistroFilters');

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refresh());
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportData());
    }

    if (applyFiltersBtn) {
      applyFiltersBtn.addEventListener('click', () => this.applyFilters());
    }

    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener('click', () => this.resetFilters());
    }

    // Filtro ricerca in tempo reale
    const activityFilter = document.getElementById('registroFilterActivity');
    if (activityFilter) {
      activityFilter.addEventListener('input', this.debounce(() => this.applyFilters(), 300));
    }
  }

  async loadEmployees() {
    try {
      const employees = await FirestoreService.getEmployees();
      const employeeSelect = document.getElementById('registroFilterEmployee');
      
      if (employeeSelect) {
        employeeSelect.innerHTML = '<option value="">Tutti i dipendenti</option>';
        employees.sort((a, b) => a.name.localeCompare(b.name, 'it'))
          .forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.name;
            option.textContent = emp.name;
            employeeSelect.appendChild(option);
          });
      }
    } catch (error) {
      console.error('Errore caricamento dipendenti:', error);
    }
  }

  setupFilters() {
    // Popola filtro mesi
    const monthSelect = document.getElementById('registroFilterMonth');
    if (monthSelect) {
      const today = new Date();
      monthSelect.innerHTML = '<option value="">Tutti i mesi</option>';
      
      for (let i = 0; i < 12; i++) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const label = date.toLocaleString('it-IT', { month: 'long', year: 'numeric' });
        
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        monthSelect.appendChild(option);
      }
    }

    // Imposta date di default (ultimo mese)
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    
    const dateFromInput = document.getElementById('registroFilterDateFrom');
    const dateToInput = document.getElementById('registroFilterDateTo');
    
    if (dateFromInput) {
      dateFromInput.value = lastMonth.toISOString().split('T')[0];
    }
    if (dateToInput) {
      dateToInput.value = endOfLastMonth.toISOString().split('T')[0];
    }
  }

  async loadAllActivities() {
    try {
      this.showLoading();
      
      const employees = await FirestoreService.getEmployees();
      this.allActivities = [];
      
      // Carica attività per ogni dipendente
      for (const employee of employees) {
        try {
          const activities = await FirestoreService.getAllEmployeeActivities(employee.name);
          
          activities.forEach(dayData => {
            if (dayData.attività && Array.isArray(dayData.attività)) {
              dayData.attività.forEach(activity => {
                const minutes = parseInt(activity.minuti, 10) || 0;
                const people = parseInt(activity.persone, 10) || 1;
                const multiplier = parseInt(activity.moltiplicatore, 10) || 1;
                const effectiveMinutes = Math.round((minutes * multiplier) / people);
                
                this.allActivities.push({
                  data: dayData.date,
                  dipendente: employee.name,
                  nome: activity.nome || '',
                  tipo: activity.tipo || '',
                  minuti: minutes,
                  persone: people,
                  moltiplicatore: multiplier,
                  minutiEffettivi: effectiveMinutes,
                  originalData: { ...activity } // Mantieni i dati originali per il confronto
                });
              });
            }
          });
        } catch (error) {
          console.warn(`Errore caricamento attività per ${employee.name}:`, error);
        }
      }
      
      // Ordina per data (più recenti prima)
      this.allActivities.sort((a, b) => new Date(b.data) - new Date(a.data));
      this.filteredActivities = [...this.allActivities];
      
      this.updateStats();
      this.hideLoading();
      
    } catch (error) {
      console.error('Errore caricamento registro:', error);
      this.showError('Errore nel caricamento del registro attività');
      this.hideLoading();
    }
  }

  applyFilters() {
    const employeeFilter = document.getElementById('registroFilterEmployee')?.value || '';
    const typeFilter = document.getElementById('registroFilterType')?.value || '';
    const dateFromFilter = document.getElementById('registroFilterDateFrom')?.value || '';
    const dateToFilter = document.getElementById('registroFilterDateTo')?.value || '';
    const activityFilter = document.getElementById('registroFilterActivity')?.value.toLowerCase() || '';
    const monthFilter = document.getElementById('registroFilterMonth')?.value || '';

    this.filteredActivities = this.allActivities.filter(activity => {
      // Filtro dipendente
      if (employeeFilter && activity.dipendente !== employeeFilter) return false;
      
      // Filtro tipo
      if (typeFilter && activity.tipo !== typeFilter) return false;
      
      // Filtro data da/a
      if (dateFromFilter && activity.data < dateFromFilter) return false;
      if (dateToFilter && activity.data > dateToFilter) return false;
      
      // Filtro mese
      if (monthFilter) {
        const activityMonth = activity.data.substring(0, 7); // YYYY-MM
        if (activityMonth !== monthFilter) return false;
      }
      
      // Filtro nome attività
      if (activityFilter && !activity.nome.toLowerCase().includes(activityFilter)) return false;
      
      return true;
    });

    this.currentPage = 1;
    this.updateStats();
    this.renderTable();
  }

  resetFilters() {
    document.getElementById('registroFilterEmployee').value = '';
    document.getElementById('registroFilterType').value = '';
    document.getElementById('registroFilterDateFrom').value = '';
    document.getElementById('registroFilterDateTo').value = '';
    document.getElementById('registroFilterActivity').value = '';
    document.getElementById('registroFilterMonth').value = '';
    
    this.filteredActivities = [...this.allActivities];
    this.currentPage = 1;
    this.updateStats();
    this.renderTable();
  }

  updateStats() {
    const totalActivities = this.filteredActivities.length;
    const activeEmployees = new Set(this.filteredActivities.map(a => a.dipendente)).size;
    const daysCovered = new Set(this.filteredActivities.map(a => a.data)).size;
    
    // Calcola ore totali
    const totalMinutes = this.filteredActivities.reduce((sum, activity) => {
      return sum + activity.minutiEffettivi;
    }, 0);
    const totalHours = formatDecimalHours(totalMinutes, 1);

    // Aggiorna UI
    this.updateStatElement('totalActivitiesCount', totalActivities);
    this.updateStatElement('activeEmployeesCount', activeEmployees);
    this.updateStatElement('daysCoveredCount', daysCovered);
    this.updateStatElement('totalHoursCount', totalHours.toLocaleString('it-IT', { minimumFractionDigits: 1 }));
  }

  updateStatElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  renderTable() {
    const tableBody = document.getElementById('registroTableBody');
    const loadingElement = document.getElementById('loadingRegistroMessage');
    const contentElement = document.getElementById('registroContent');
    const noDataElement = document.getElementById('noRegistroData');

    if (loadingElement) loadingElement.style.display = 'none';

    if (this.filteredActivities.length === 0) {
      if (contentElement) contentElement.style.display = 'none';
      if (noDataElement) noDataElement.style.display = 'block';
      return;
    }

    if (contentElement) contentElement.style.display = 'block';
    if (noDataElement) noDataElement.style.display = 'none';

    if (!tableBody) return;

    // Calcola paginazione
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = Math.min(startIndex + this.itemsPerPage, this.filteredActivities.length);
    const pageData = this.filteredActivities.slice(startIndex, endIndex);

    // Renderizza righe
    tableBody.innerHTML = '';
    pageData.forEach(activity => {
      const row = this.createTableRow(activity);
      tableBody.appendChild(row);
    });

    // Aggiorna info paginazione
    this.updatePaginationInfo(startIndex + 1, endIndex, this.filteredActivities.length);
    this.renderPagination();
  }

  createTableRow(activity) {
    const row = document.createElement('tr');
    
    // Aggiungi classe per colorazione in base al tipo
    const typeClass = this.getTypeRowClass(activity.tipo);
    if (typeClass) {
      row.classList.add(typeClass);
    }
    
    // Formatta la data
    const formattedDate = new Date(activity.data).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    row.innerHTML = `
      <td class="small">
        <input type="text" class="form-control form-control-sm bg-secondary text-light border-0" 
               value="${activity.nome}" data-field="nome" data-original="${activity.nome}">
      </td>
      <td class="small">${formattedDate}</td>
      <td class="small">${activity.dipendente}</td>
      <td class="small">
        <select class="form-select form-select-sm bg-secondary text-light border-0" data-field="tipo" data-original="${activity.tipo || ''}">
          <option value="">N/A</option>
          <option value="uffici" ${activity.tipo === 'uffici' ? 'selected' : ''}>Uffici</option>
          <option value="appartamenti" ${activity.tipo === 'appartamenti' ? 'selected' : ''}>Appartamenti</option>
          <option value="bnb" ${activity.tipo === 'bnb' ? 'selected' : ''}>BnB</option>
          <option value="pst" ${activity.tipo === 'pst' ? 'selected' : ''}>PST</option>
        </select>
      </td>
      <td class="small text-center">
        <input type="number" class="form-control form-control-sm bg-secondary text-light border-0 text-center" 
               value="${activity.minuti}" data-field="minuti" data-original="${activity.minuti}" min="1" max="480" style="width: 80px;">
      </td>
      <td class="small text-center">
        <select class="form-select form-select-sm bg-secondary text-light border-0" data-field="persone" data-original="${activity.persone}" style="width: 70px;">
          <option value="1" ${activity.persone === 1 ? 'selected' : ''}>1</option>
          <option value="2" ${activity.persone === 2 ? 'selected' : ''}>2</option>
          <option value="3" ${activity.persone === 3 ? 'selected' : ''}>3</option>
          <option value="4" ${activity.persone === 4 ? 'selected' : ''}>4</option>
        </select>
      </td>
      <td class="small text-center">
        <input type="number" class="form-control form-control-sm bg-secondary text-light border-0 text-center" 
               value="${activity.moltiplicatore}" data-field="moltiplicatore" data-original="${activity.moltiplicatore}" 
               min="0.1" max="10" step="0.1" style="width: 80px;">
      </td>
      <td class="small text-center fw-bold effective-minutes">${activity.minutiEffettivi}</td>
      <td class="small text-center">
        <button class="btn btn-success btn-sm save-activity-btn" 
                data-employee="${activity.dipendente}" 
                data-date="${activity.data}"
                data-original-name="${activity.nome}"
                data-original-type="${activity.tipo || ''}"
                data-original-minutes="${activity.minuti}"
                onclick="registroActivityManager.saveActivityChanges(this)">
          <i class="fas fa-save"></i>
        </button>
      </td>
    `;

    // Aggiungi event listener per ricalcolare i minuti effettivi quando cambiano i valori
    const minutiInput = row.querySelector('[data-field="minuti"]');
    const personeSelect = row.querySelector('[data-field="persone"]');
    const moltiplicatoreInput = row.querySelector('[data-field="moltiplicatore"]');
    const effectiveCell = row.querySelector('.effective-minutes');
    const tipoSelect = row.querySelector('[data-field="tipo"]');

    const updateEffectiveMinutes = () => {
      const minuti = parseInt(minutiInput.value) || 0;
      const persone = parseInt(personeSelect.value) || 1;
      const moltiplicatore = parseFloat(moltiplicatoreInput.value) || 1;
      const effective = Math.round((minuti * moltiplicatore) / persone);
      effectiveCell.textContent = effective;
    };

    const updateRowColor = () => {
      // Rimuovi classi di colore esistenti
      row.classList.remove('row-appartamenti', 'row-uffici', 'row-bnb', 'row-pst');
      
      // Aggiungi nuova classe
      const newType = tipoSelect.value;
      const newTypeClass = this.getTypeRowClass(newType);
      if (newTypeClass) {
        row.classList.add(newTypeClass);
      }
    };

    minutiInput.addEventListener('input', updateEffectiveMinutes);
    personeSelect.addEventListener('change', updateEffectiveMinutes);
    moltiplicatoreInput.addEventListener('input', updateEffectiveMinutes);
    tipoSelect.addEventListener('change', updateRowColor);

    return row;
  }

  getTypeRowClass(tipo) {
    const typeClasses = {
      'appartamenti': 'row-appartamenti',
      'uffici': 'row-uffici',
      'bnb': 'row-bnb',
      'pst': 'row-pst'
    };
    return typeClasses[tipo] || '';
  }

  getTypeColor(tipo) {
    const colors = {
      'uffici': 'info',
      'appartamenti': 'primary',
      'bnb': 'warning',
      'pst': 'secondary'
    };
    return colors[tipo] || 'dark';
  }

  updatePaginationInfo(from, to, total) {
    const fromElement = document.getElementById('showingFrom');
    const toElement = document.getElementById('showingTo');
    const totalElement = document.getElementById('totalRecords');

    if (fromElement) fromElement.textContent = from;
    if (toElement) toElement.textContent = to;
    if (totalElement) totalElement.textContent = total;
  }

  renderPagination() {
    const paginationContainer = document.getElementById('registroPagination');
    if (!paginationContainer) return;

    const totalPages = Math.ceil(this.filteredActivities.length / this.itemsPerPage);
    
    if (totalPages <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }

    let paginationHtml = '';

    // Pulsante Previous
    paginationHtml += `
      <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
        <button class="page-link" onclick="registroActivityManager.goToPage(${this.currentPage - 1})" ${this.currentPage === 1 ? 'disabled' : ''}>
          <i class="fas fa-chevron-left"></i>
        </button>
      </li>
    `;

    // Numeri di pagina (mostra max 5 pagine)
    const startPage = Math.max(1, this.currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);

    for (let i = startPage; i <= endPage; i++) {
      paginationHtml += `
        <li class="page-item ${i === this.currentPage ? 'active' : ''}">
          <button class="page-link" onclick="registroActivityManager.goToPage(${i})">${i}</button>
        </li>
      `;
    }

    // Pulsante Next
    paginationHtml += `
      <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
        <button class="page-link" onclick="registroActivityManager.goToPage(${this.currentPage + 1})" ${this.currentPage === totalPages ? 'disabled' : ''}>
          <i class="fas fa-chevron-right"></i>
        </button>
      </li>
    `;

    paginationContainer.innerHTML = paginationHtml;
  }

  goToPage(page) {
    const totalPages = Math.ceil(this.filteredActivities.length / this.itemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    this.currentPage = page;
    this.renderTable();
  }

  sortTable(field) {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }

    this.filteredActivities.sort((a, b) => {
      let valueA = a[field];
      let valueB = b[field];

      // Gestione tipi diversi
      if (field === 'data') {
        valueA = new Date(valueA);
        valueB = new Date(valueB);
      } else if (field === 'minuti' || field === 'persone' || field === 'moltiplicatore' || field === 'minutiEffettivi') {
        valueA = Number(valueA) || 0;
        valueB = Number(valueB) || 0;
      } else {
        valueA = String(valueA).toLowerCase();
        valueB = String(valueB).toLowerCase();
      }

      if (valueA < valueB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    this.currentPage = 1;
    this.renderTable();
  }

  async viewActivityDetail(date, employee) {
    try {
      const result = await FirestoreService.getEmployeeDay(employee, date);
      
      if (result.success) {
        this.showActivityDetailModal(employee, date, result.data);
      } else {
        this.showError('Errore nel caricamento dei dettagli');
      }
    } catch (error) {
      this.showError('Errore nel caricamento dei dettagli');
    }
  }

  showActivityDetailModal(employee, date, dayData) {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-content bg-dark text-light">
          <div class="modal-header border-secondary">
            <h5 class="modal-title">
              <i class="fas fa-calendar-day me-2"></i>
              ${employee} - ${new Date(date).toLocaleDateString('it-IT', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            ${this.renderDayDetails(dayData)}
          </div>
          <div class="modal-footer border-secondary">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Chiudi</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    const bootstrapModal = new bootstrap.Modal(modal);
    
    modal.addEventListener('hidden.bs.modal', () => {
      modal.remove();
    });
    
    bootstrapModal.show();
  }

  renderDayDetails(dayData) {
    if (!dayData) {
      return '<p class="text-muted">Nessun dato disponibile per questo giorno.</p>';
    }

    let html = '';

    // Status speciali
    if (dayData.riposo) {
      html += '<div class="alert alert-warning"><i class="fas fa-bed me-2"></i>Giorno di riposo</div>';
    } else if (dayData.ferie) {
      html += '<div class="alert alert-info"><i class="fas fa-umbrella-beach me-2"></i>Giorno di ferie</div>';
    } else if (dayData.malattia) {
      html += '<div class="alert alert-danger"><i class="fas fa-thermometer me-2"></i>Giorno di malattia</div>';
    }

    // Attività
    if (dayData.attività && dayData.attività.length > 0) {
      html += `
        <div class="table-responsive">
          <table class="table table-striped table-sm">
            <thead>
              <tr>
                <th>Attività</th>
                <th>Tipo</th>
                <th>Minuti</th>
                <th>Persone</th>
                <th>Moltiplicatore</th>
                <th>Min. Effettivi</th>
              </tr>
            </thead>
            <tbody>
      `;

      let totalEffectiveMinutes = 0;

      dayData.attività.forEach(activity => {
        const minutes = parseInt(activity.minuti, 10) || 0;
        const people = parseInt(activity.persone, 10) || 1;
        const multiplier = parseInt(activity.moltiplicatore, 10) || 1;
        const effectiveMinutes = Math.round((minutes * multiplier) / people);
        
        totalEffectiveMinutes += effectiveMinutes;

        html += `
          <tr>
            <td>${activity.nome}</td>
            <td><span class="badge bg-${this.getTypeColor(activity.tipo)}">${activity.tipo || 'N/A'}</span></td>
            <td class="text-center">${minutes}</td>
            <td class="text-center">${people}</td>
            <td class="text-center">${multiplier}</td>
            <td class="text-center fw-bold">${effectiveMinutes}</td>
          </tr>
        `;
      });

      const totalHours = formatDecimalHours(totalEffectiveMinutes, 2);

      html += `
            </tbody>
          </table>
        </div>
        <div class="alert alert-success mt-3">
          <i class="fas fa-clock me-2"></i>
          Totale giornaliero: <strong>${totalHours.toLocaleString('it-IT', { minimumFractionDigits: 2 })} ore</strong>
        </div>
      `;
    } else if (!dayData.riposo && !dayData.ferie && !dayData.malattia) {
      html += '<p class="text-muted">Nessuna attività registrata per questo giorno.</p>';
    }

    return html;
  }

  async refresh() {
    const refreshBtn = document.getElementById('refreshRegistroBtn');
    if (refreshBtn) {
      const originalText = refreshBtn.innerHTML;
      refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Aggiornamento...';
      refreshBtn.disabled = true;

      await this.loadAllActivities();
      this.applyFilters();

      refreshBtn.innerHTML = originalText;
      refreshBtn.disabled = false;
    }
  }

  async exportData() {
    if (this.filteredActivities.length === 0) {
      this.showError('Nessun dato da esportare');
      return;
    }

    try {
      // Prepara i dati per l'export
      const exportData = {};
      
      this.filteredActivities.forEach(activity => {
        const employee = activity.dipendente;
        const date = activity.data;
        
        if (!exportData[employee]) {
          exportData[employee] = {};
        }
        
        if (!exportData[employee][date]) {
          exportData[employee][date] = {
            attività: []
          };
        }
        
        exportData[employee][date].attività.push({
          nome: activity.nome,
          tipo: activity.tipo,
          minuti: activity.minuti,
          persone: activity.persone,
          moltiplicatore: activity.moltiplicatore
        });
      });

      // Determina periodo per il nome file
      const dates = this.filteredActivities.map(a => a.data).sort();
      const startDate = dates[0];
      const endDate = dates[dates.length - 1];
      
      const startMonth = new Date(startDate).toLocaleString('it-IT', { month: 'long', year: 'numeric' });
      const endMonth = new Date(endDate).toLocaleString('it-IT', { month: 'long', year: 'numeric' });
      
      const period = startMonth === endMonth ? startMonth : `${startMonth} - ${endMonth}`;
      
      await exportToExcel(exportData, new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1);
      
      this.showSuccess('Registro esportato con successo!');
      
    } catch (error) {
      console.error('Errore export:', error);
      this.showError('Errore durante l\'esportazione');
    }
  }

  async saveActivityChanges(button) {
    const row = button.closest('tr');
    const employee = button.dataset.employee;
    const date = button.dataset.date;
    const originalName = button.dataset.originalName;
    const originalType = button.dataset.originalType || '';
    const originalMinutes = button.dataset.originalMinutes || '';
    
    // Raccogli i nuovi valori dai campi editabili
    const newNome = row.querySelector('[data-field="nome"]').value.trim();
    const newTipo = row.querySelector('[data-field="tipo"]').value;
    const newMinuti = parseInt(row.querySelector('[data-field="minuti"]').value) || 0;
    const newPersone = parseInt(row.querySelector('[data-field="persone"]').value) || 1;
    const newMoltiplicatore = parseFloat(row.querySelector('[data-field="moltiplicatore"]').value) || 1;
    
    // Validazione
    if (!newNome) {
      this.showError('Il nome dell\'attività non può essere vuoto');
      return;
    }
    
    if (newMinuti <= 0 || newMinuti > 480) {
      this.showError('I minuti devono essere tra 1 e 480');
      return;
    }
    
    // Disabilita il pulsante durante il salvataggio
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    try {
      // Carica i dati del giorno
      const result = await FirestoreService.getEmployeeDay(employee, date);
      
      if (!result.success || !result.data || !result.data.attività) {
        throw new Error('Impossibile caricare i dati del giorno');
      }
      
      const dayData = result.data;
      
      // Trova l'attività usando più criteri per maggiore precisione
      const activityIndex = dayData.attività.findIndex(activity => {
        const nameMatch = activity.nome === originalName;
        const typeMatch = !originalType || activity.tipo === originalType;
        const minutesMatch = !originalMinutes || activity.minuti == originalMinutes;
        
        // Se abbiamo tutti i dati originali, usa tutti i criteri
        if (originalType && originalMinutes) {
          return nameMatch && typeMatch && minutesMatch;
        }
        // Altrimenti usa solo nome e tipo
        return nameMatch && typeMatch;
      });
      
      if (activityIndex === -1) {
        // Prova una ricerca più flessibile
        const flexibleIndex = dayData.attività.findIndex(activity => 
          activity.nome === originalName
        );
        
        if (flexibleIndex === -1) {
          console.error('Attività non trovata. Dati disponibili:', dayData.attività);
          console.error('Ricerca per:', { originalName, originalType, originalMinutes });
          throw new Error(`Attività "${originalName}" non trovata nei dati del giorno`);
        }
        
        // Usa l'indice trovato con ricerca flessibile
        dayData.attività[flexibleIndex] = {
          ...dayData.attività[flexibleIndex],
          nome: newNome,
          tipo: newTipo,
          minuti: newMinuti,
          persone: newPersone,
          moltiplicatore: newMoltiplicatore
        };
      } else {
        // Aggiorna l'attività trovata
        dayData.attività[activityIndex] = {
          ...dayData.attività[activityIndex],
          nome: newNome,
          tipo: newTipo,
          minuti: newMinuti,
          persone: newPersone,
          moltiplicatore: newMoltiplicatore
        };
      }
      
      // Salva i dati aggiornati
      const saveResult = await FirestoreService.saveEmployeeDay(employee, date, dayData);
      
      if (saveResult.success) {
        this.showSuccess('Attività aggiornata con successo!');
        
        // Aggiorna i valori originali per future modifiche
        row.querySelector('[data-field="nome"]').dataset.original = newNome;
        row.querySelector('[data-field="tipo"]').dataset.original = newTipo;
        row.querySelector('[data-field="minuti"]').dataset.original = newMinuti;
        row.querySelector('[data-field="persone"]').dataset.original = newPersone;
        row.querySelector('[data-field="moltiplicatore"]').dataset.original = newMoltiplicatore;
        
        // Aggiorna il dataset del pulsante per il nome originale
        button.dataset.originalName = newNome;
        button.dataset.originalType = newTipo;
        button.dataset.originalMinutes = newMinuti;
        
        // Ricarica i dati per aggiornare la vista
        setTimeout(() => {
          this.loadAllActivities();
        }, 1000);
        
      } else {
        throw new Error('Errore nel salvataggio dei dati');
      }
      
    } catch (error) {
      console.error('Errore salvataggio attività:', error);
      this.showError('Errore nel salvataggio: ' + error.message);
    } finally {
      // Riabilita il pulsante
      button.disabled = false;
      button.innerHTML = originalText;
    }
  }

  showLoading() {
    const loadingElement = document.getElementById('loadingRegistroMessage');
    if (loadingElement) loadingElement.style.display = 'block';
  }

  hideLoading() {
    const loadingElement = document.getElementById('loadingRegistroMessage');
    if (loadingElement) loadingElement.style.display = 'none';
  }

  showSuccess(message) {
    showToast(message, 'success');
  }

  showError(message) {
    showToast(message, 'error');
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// Istanza globale
window.registroActivityManager = new RegistroActivityManager();

// Inizializza quando la tab viene attivata
document.addEventListener('DOMContentLoaded', () => {
  const registroTab = document.getElementById('registro-tab');
  let registroManager = null;

  if (registroTab) {
    registroTab.addEventListener('shown.bs.tab', async () => {
      if (!registroManager) {
        registroManager = window.registroActivityManager;
        await registroManager.init();
      }
    });
  }
});

export { RegistroActivityManager };