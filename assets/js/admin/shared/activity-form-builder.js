// activity-form-builder.js - Builder per form di attività
import { ACTIVITY_TYPES } from "../../shared/activity-types.js";
import { FirestoreService } from "../../common/firestore-service.js";

export class ActivityFormBuilder {
  constructor() {
    this.formCounter = 0;
  }

  /**
   * Crea un form per aggiungere una nuova attività
   */
  async createActivityForm(type, targetContainer, onSave, onCancel) {
    const config = ACTIVITY_TYPES[type];
    if (!config) {
      throw new Error(`Tipo di attività non valido: ${type}`);
    }

    const formId = `activity-form-${this.formCounter++}`;
    const form = document.createElement('div');
    form.className = 'activity-form-container mb-3';
    form.id = formId;

    if (type === 'pst') {
      form.innerHTML = this.createPSTForm(config, formId, onSave, onCancel);
    } else {
      const activities = await this.loadActivitiesForType(type);
      form.innerHTML = this.createStandardForm(config, activities, formId, onSave, onCancel);
    }

    targetContainer.appendChild(form);
    this.setupFormEventListeners(form, type, onSave, onCancel);
    
    return formId;
  }

  /**
   * Crea form per attività PST
   */
  createPSTForm(config, formId, onSave, onCancel) {
    return `
      <div class="card bg-dark border-2" style="border-color: ${config.color} !important;">
        <div class="card-header text-white d-flex justify-content-between align-items-center" 
             style="background-color: ${config.color};">
          <h6 class="mb-0">
            <i class="${config.icon} me-2"></i>Aggiungi ${config.name}
          </h6>
          <button type="button" class="btn btn-sm btn-outline-light cancel-activity-btn">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="card-body p-3">
          <div class="row g-3">
            <div class="col-12">
              <label class="form-label small fw-bold">
                <i class="fas fa-edit me-1"></i>Descrizione Attività
              </label>
              <input type="text" class="form-control form-control-sm bg-secondary text-light border-0" 
                     name="activityName" placeholder="Descrizione dell'attività PST" required>
            </div>
            <div class="col-6">
              <label class="form-label small fw-bold">
                <i class="fas fa-clock me-1"></i>Minuti
              </label>
              <input type="number" class="form-control form-control-sm bg-secondary text-light border-0" 
                     name="minutes" placeholder="Minuti" required min="1" max="480" value="60">
            </div>
            <div class="col-6">
              <label class="form-label small fw-bold">
                <i class="fas fa-users me-1"></i>Persone
              </label>
              <select name="people" class="form-select form-select-sm bg-secondary text-light border-0" required>
                <option value="1">1</option>
                <option value="2" selected>2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
            </div>
            <div class="col-12">
              <label class="form-label small fw-bold">
                <i class="fas fa-times me-1"></i>Moltiplicatore
              </label>
              <input type="number" class="form-control form-control-sm bg-secondary text-light border-0" 
                     name="multiplier" step="0.1" min="0.1" max="10" value="1">
            </div>
          </div>
          <div class="d-flex justify-content-end gap-2 mt-3">
            <button type="button" class="btn btn-outline-secondary btn-sm cancel-activity-btn">
              <i class="fas fa-times me-1"></i>Annulla
            </button>
            <button type="button" class="btn btn-success btn-sm save-activity-btn">
              <i class="fas fa-save me-1"></i>Aggiungi Attività
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Crea form per attività standard
   */
  createStandardForm(config, activities, formId, onSave, onCancel) {
    const optionsHtml = activities
      .map(a => `<option value="${a.name}" data-minutes="${a.minutes}">${a.name}</option>`)
      .join('');

    const multiplierField = config.collection === 'bnb' ? `
      <div class="col-6">
        <label class="form-label small fw-bold">
          <i class="fas fa-times me-1"></i>Moltiplicatore
        </label>
        <select name="multiplier" class="form-select form-select-sm bg-secondary text-light border-0" required>
          ${[...Array(10)].map((_, n) => `<option value="${n + 1}" ${n === 0 ? 'selected' : ''}>${n + 1}</option>`).join('')}
        </select>
      </div>
    ` : `
      <input type="hidden" name="multiplier" value="1">
    `;

    return `
      <div class="card bg-dark border-2" style="border-color: ${config.color} !important;">
        <div class="card-header text-white d-flex justify-content-between align-items-center" 
             style="background-color: ${config.color};">
          <h6 class="mb-0">
            <i class="${config.icon} me-2"></i>Aggiungi ${config.name}
          </h6>
          <button type="button" class="btn btn-sm btn-outline-light cancel-activity-btn">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="card-body p-3">
          <div class="row g-3">
            <div class="col-12">
              <label class="form-label small fw-bold">
                <i class="fas fa-list me-1"></i>Attività
              </label>
              <select name="activityName" class="form-select form-select-sm bg-secondary text-light border-0" required>
                <option value="">Seleziona attività</option>
                ${optionsHtml}
              </select>
            </div>
            <div class="col-6">
              <label class="form-label small fw-bold">
                <i class="fas fa-clock me-1"></i>Minuti
              </label>
              <input type="number" name="minutes" 
                     class="form-control form-control-sm bg-secondary text-light border-0" 
                     min="1" required readonly>
            </div>
            <div class="col-6">
              <label class="form-label small fw-bold">
                <i class="fas fa-users me-1"></i>Persone
              </label>
              <select name="people" class="form-select form-select-sm bg-secondary text-light border-0" required>
                <option value="1">1</option>
                <option value="2" selected>2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
            </div>
            ${multiplierField}
          </div>
          <div class="d-flex justify-content-end gap-2 mt-3">
            <button type="button" class="btn btn-outline-secondary btn-sm cancel-activity-btn">
              <i class="fas fa-times me-1"></i>Annulla
            </button>
            <button type="button" class="btn btn-success btn-sm save-activity-btn">
              <i class="fas fa-save me-1"></i>Aggiungi Attività
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Carica le attività per un tipo specifico
   */
  async loadActivitiesForType(type) {
    try {
      const activities = await FirestoreService.getActivitiesByType(type);
      return activities.map(item => {
        if (typeof item === 'string' && item.includes('|')) {
          const [name, minutes] = item.split('|');
          return { name: name.trim(), minutes: parseInt(minutes, 10) || 0 };
        } else if (item && typeof item === 'object') {
          return {
            name: item.nome || item.name || '',
            minutes: item.minuti || item.minutes || 0
          };
        }
        return null;
      }).filter(Boolean);
    } catch (error) {
      console.error(`Errore caricamento attività ${type}:`, error);
      return [];
    }
  }

  /**
   * Configura i listener per il form
   */
  setupFormEventListeners(form, type, onSave, onCancel) {
    // Auto-aggiornamento minuti per attività standard
    if (type !== 'pst') {
      const activitySelect = form.querySelector('[name="activityName"]');
      const minutesInput = form.querySelector('[name="minutes"]');
      
      if (activitySelect && minutesInput) {
        activitySelect.addEventListener('change', (e) => {
          const selectedOption = e.target.options[e.target.selectedIndex];
          const minutes = selectedOption.dataset.minutes;
          if (minutes) {
            minutesInput.value = minutes;
          }
        });
      }
    }

    // Pulsanti di azione
    const saveBtn = form.querySelector('.save-activity-btn');
    const cancelBtns = form.querySelectorAll('.cancel-activity-btn');

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const activityData = this.collectFormData(form, type);
        if (activityData && onSave) {
          onSave(activityData, form);
        }
      });
    }

    cancelBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (onCancel) {
          onCancel(form);
        } else {
          form.remove();
        }
      });
    });
  }

  /**
   * Raccoglie i dati dal form
   */
  collectFormData(form, type) {
    const formData = new FormData();
    const inputs = form.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      if (input.name) {
        formData.append(input.name, input.value);
      }
    });

    const activityName = formData.get('activityName');
    const minutes = parseInt(formData.get('minutes')) || 0;
    const people = parseInt(formData.get('people')) || 1;
    const multiplier = parseFloat(formData.get('multiplier')) || 1;

    // Validazione
    if (!activityName || !activityName.trim()) {
      this.showError('Il nome dell\'attività è obbligatorio');
      return null;
    }

    if (minutes <= 0 || minutes > 480) {
      this.showError('I minuti devono essere tra 1 e 480');
      return null;
    }

    return {
      tipo: type,
      nome: activityName.trim(),
      minuti: minutes,
      persone: people,
      moltiplicatore: multiplier
    };
  }

  /**
   * Mostra messaggio di errore
   */
  showError(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification toast-error';
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
      background: linear-gradient(45deg, #ef4444, #dc2626);
    `;
    
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}