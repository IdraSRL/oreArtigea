// admin-ore-detail.js - Gestione dettagli ore nel pannello admin
import { FirestoreService } from "../../common/firestore-service.js";
import { ActivityFormBuilder } from "../shared/activity-form-builder.js";
import { ACTIVITY_TYPES } from "../../shared/activity-types.js";
import { calculateTotalMinutes, formatDecimalHours } from '../../common/time-utilis.js';

export class AdminOreDetailManager {
  constructor() {
    this.formBuilder = new ActivityFormBuilder();
    this.currentEmployee = null;
    this.currentDate = null;
    this.currentDayData = null;
  }

  /**
   * Mostra il modal di dettaglio con pulsanti per aggiungere attività
   */
  async showDayModal(employee, date, dayData) {
    this.currentEmployee = employee;
    this.currentDate = date;
    this.currentDayData = dayData || {};

    const container = document.getElementById('dayDetail');
    if (!container) return;

    const title = new Date(date).toLocaleDateString('it-IT', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
    
    let html = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4>${employee} - ${title}</h4>
        <div class="d-flex gap-2">
          ${Object.entries(ACTIVITY_TYPES).map(([type, config]) => `
            <button type="button" class="btn btn-sm add-activity-btn" 
                    data-activity-type="${type}"
                    style="background-color: ${config.color}; color: white; border: none;">
              <i class="${config.icon} me-1"></i>${config.name}
            </button>
          `).join('')}
        </div>
      </div>
    `;
    
    // Status speciali
    ['riposo', 'ferie', 'malattia'].forEach(key => {
      if (dayData[key]) {
        const cls = key === 'ferie' ? 'info' : key === 'malattia' ? 'danger' : 'warning';
        html += `<div class="alert alert-${cls}">${key.charAt(0).toUpperCase() + key.slice(1)}</div>`;
      }
    });
    
    // Container per nuove attività
    html += '<div id="newActivitiesContainer" class="mb-3"></div>';
    
    // Form di modifica attività esistenti
    html += `
      <form id="editForm">
        <div class="table-responsive">
          <table class="table table-bordered">
            <thead>
              <tr>
                <th>Attività</th>
                <th>Tipo</th>
                <th>Min</th>
                <th>Pers</th>
                <th>Mol</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody id="actBody">
    `;
    
    (dayData.attività || []).forEach((a, i) => {
      const typeConfig = ACTIVITY_TYPES[a.tipo];
      const typeColor = typeConfig ? typeConfig.color : '#6c757d';
      
      html += `
        <tr>
          <td><input type="text" name="nome_${i}" class="form-control form-control-sm" value="${a.nome || ''}"></td>
          <td>
            <select name="tipo_${i}" class="form-select form-select-sm">
              <option value="">N/A</option>
              ${Object.entries(ACTIVITY_TYPES).map(([type, config]) => `
                <option value="${type}" ${a.tipo === type ? 'selected' : ''}>${config.name}</option>
              `).join('')}
            </select>
          </td>
          <td><input type="number" name="minuti_${i}" class="form-control form-control-sm" value="${a.minuti || 0}"></td>
          <td><input type="number" name="persone_${i}" class="form-control form-control-sm" value="${a.persone || 1}"></td>
          <td><input type="number" step="0.1" name="moltiplicatore_${i}" class="form-control form-control-sm" value="${a.moltiplicatore || 1}"></td>
          <td><button type="button" class="btn btn-outline-danger btn-sm" onclick="this.closest('tr').remove()">Elimina</button></td>
        </tr>
      `;
    });
    
    html += `
            </tbody>
          </table>
        </div>
        <div class="d-flex justify-content-between align-items-center">
          <button type="button" id="addAct" class="btn btn-outline-secondary">Aggiungi Riga Manuale</button>
          <button type="submit" class="btn btn-success">Salva Tutte le Modifiche</button>
        </div>
      </form>
    `;
    
    container.innerHTML = html;
    
    const modalEl = document.getElementById('dayDetailModal');
    if (modalEl) new bootstrap.Modal(modalEl).show();

    this.setupDetailFormListeners();
  }

  /**
   * Configura i listener per il form di dettaglio
   */
  setupDetailFormListeners() {
    // Pulsanti per aggiungere attività tipizzate
    document.querySelectorAll('.add-activity-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const activityType = e.target.dataset.activityType;
        await this.addTypedActivity(activityType);
      });
    });

    // Pulsante per aggiungere riga manuale
    const addBtn = document.getElementById('addAct');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.addManualActivityRow();
      });
    }

    // Form di salvataggio
    const editForm = document.getElementById('editForm');
    if (editForm) {
      editForm.addEventListener('submit', async (e) => {
        await this.saveAllChanges(e);
      });
    }
  }

  /**
   * Aggiunge una nuova attività tipizzata
   */
  async addTypedActivity(type) {
    const container = document.getElementById('newActivitiesContainer');
    if (!container) return;

    try {
      await this.formBuilder.createActivityForm(
        type,
        container,
        (activityData, form) => this.handleActivitySave(activityData, form),
        (form) => form.remove()
      );
    } catch (error) {
      console.error('Errore creazione form attività:', error);
      this.showError('Errore nella creazione del form attività');
    }
  }

  /**
   * Gestisce il salvataggio di una nuova attività
   */
  async handleActivitySave(activityData, form) {
    try {
      // Aggiungi l'attività ai dati correnti
      if (!this.currentDayData.attività) {
        this.currentDayData.attività = [];
      }
      
      this.currentDayData.attività.push(activityData);
      
      // Salva immediatamente
      const result = await FirestoreService.saveEmployeeDay(
        this.currentEmployee, 
        this.currentDate, 
        this.currentDayData
      );
      
      if (result.success) {
        this.showSuccess('Attività aggiunta con successo!');
        form.remove();
        
        // Ricarica il modal con i dati aggiornati
        setTimeout(async () => {
          const updatedResult = await FirestoreService.getEmployeeDay(this.currentEmployee, this.currentDate);
          if (updatedResult.success) {
            this.showDayModal(this.currentEmployee, this.currentDate, updatedResult.data);
          }
        }, 1000);
      } else {
        this.showError('Errore nel salvataggio dell\'attività');
      }
    } catch (error) {
      console.error('Errore salvataggio attività:', error);
      this.showError('Errore nel salvataggio dell\'attività');
    }
  }

  /**
   * Aggiunge una riga manuale alla tabella
   */
  addManualActivityRow() {
    const body = document.getElementById('actBody');
    if (!body) return;
    
    const idx = body.children.length;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" name="nome_${idx}" class="form-control form-control-sm" placeholder="Nome attività"></td>
      <td>
        <select name="tipo_${idx}" class="form-select form-select-sm">
          <option value="">N/A</option>
          ${Object.entries(ACTIVITY_TYPES).map(([type, config]) => `
            <option value="${type}">${config.name}</option>
          `).join('')}
        </select>
      </td>
      <td><input type="number" name="minuti_${idx}" class="form-control form-control-sm" value="0"></td>
      <td><input type="number" name="persone_${idx}" class="form-control form-control-sm" value="1"></td>
      <td><input type="number" step="0.1" name="moltiplicatore_${idx}" class="form-control form-control-sm" value="1"></td>
      <td><button type="button" class="btn btn-outline-danger btn-sm" onclick="this.closest('tr').remove()">Elimina</button></td>
    `;
    body.appendChild(tr);
  }

  /**
   * Salva tutte le modifiche
   */
  async saveAllChanges(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const activities = [];
    
    // Raccogli tutte le attività dalla tabella
    const rows = document.querySelectorAll('#actBody tr');
    rows.forEach((row, i) => {
      const nome = formData.get(`nome_${i}`);
      const tipo = formData.get(`tipo_${i}`);
      const minuti = Number(formData.get(`minuti_${i}`)) || 0;
      const persone = Number(formData.get(`persone_${i}`)) || 1;
      const moltiplicatore = Number(formData.get(`moltiplicatore_${i}`)) || 1;
      
      if (nome && nome.trim()) {
        activities.push({
          nome: nome.trim(),
          tipo: tipo || null,
          minuti,
          persone,
          moltiplicatore
        });
      }
    });
    
    try {
      const updatedDayData = {
        ...this.currentDayData,
        attività: activities
      };
      
      const result = await FirestoreService.saveEmployeeDay(
        this.currentEmployee, 
        this.currentDate, 
        updatedDayData
      );
      
      if (result.success) {
        this.showSuccess('Modifiche salvate con successo');
        
        // Chiudi modal in modo sicuro
        this.closeModalSafely();
        
        // Notifica il componente parent per ricaricare i dati
        window.dispatchEvent(new CustomEvent('adminDataUpdated', {
          detail: { employee: this.currentEmployee, date: this.currentDate }
        }));
      } else {
        this.showError('Errore durante il salvataggio');
      }
    } catch (error) {
      console.error('Errore salvataggio modifiche:', error);
      this.showError('Errore durante il salvataggio');
    }
  }

  /**
   * Chiude il modal in modo sicuro rimuovendo overlay
   */
  closeModalSafely() {
    const modalElement = document.getElementById('dayDetailModal');
    const modal = bootstrap.Modal.getInstance(modalElement);
    
    if (modal) {
      modal.hide();
    }
    
    // Cleanup completo con timeout per assicurarsi che tutto sia pulito
    setTimeout(() => {
      // Rimuovi tutti i backdrop
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(backdrop => {
        backdrop.remove();
      });
      
      // Reset body
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      
      // Assicurati che il modal sia nascosto
      if (modalElement) {
        modalElement.style.display = 'none';
        modalElement.classList.remove('show');
        modalElement.setAttribute('aria-hidden', 'true');
        modalElement.removeAttribute('aria-modal');
      }
    }, 300);
  }

  /**
   * Mostra messaggio di successo
   */
  showSuccess(message) {
    this.showToast(message, 'success');
  }

  /**
   * Mostra messaggio di errore
   */
  showError(message) {
    this.showToast(message, 'error');
  }

  /**
   * Mostra toast notification
   */
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      animation: slideInRight 0.3s ease-out;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;

    const backgrounds = {
      success: 'linear-gradient(45deg, #10b981, #059669)',
      error: 'linear-gradient(45deg, #ef4444, #dc2626)',
      info: 'linear-gradient(45deg, #3b82f6, #1d4ed8)'
    };

    toast.style.background = backgrounds[type] || backgrounds.info;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Istanza globale
window.adminOreDetailManager = new AdminOreDetailManager();
