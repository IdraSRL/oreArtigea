/**
 * Enhanced Form Validation
 * Sistema di validazione avanzata per form
 */

export class EnhancedFormValidation {
  constructor(formId) {
    this.form = document.getElementById(formId);
    this.validationErrors = [];
  }

  /**
   * Valida il form di registrazione ore
   */
  async validateTimeEntryForm() {
    this.validationErrors = [];

    // Verifica campi obbligatori
    const dateInput = document.getElementById('date');
    const activityGroups = document.querySelectorAll('.activity-group');
    const restDayCheckbox = document.getElementById('restDay');
    const dayStatus = document.querySelector('input[name="dayStatus"]:checked')?.value;

    if (!dateInput?.value) {
      this.validationErrors.push('La data è obbligatoria');
    }

    // Se non è giorno di riposo/ferie/malattia, verifica attività
    if (!restDayCheckbox?.checked && dayStatus === 'normal') {
      if (activityGroups.length === 0) {
        this.validationErrors.push('Aggiungi almeno un\'attività per i giorni lavorativi');
      }

      // Verifica ogni attività
      activityGroups.forEach((group, index) => {
        const nameInput = group.querySelector(`[name^="activityName"]`);
        const minutesInput = group.querySelector(`[name^="minutes"]`);
        
        if (!nameInput?.value) {
          this.validationErrors.push(`Attività ${index + 1}: seleziona un'attività`);
        }
        
        if (!minutesInput?.value || parseInt(minutesInput.value) <= 0) {
          this.validationErrors.push(`Attività ${index + 1}: inserisci minuti validi`);
        }
        
        if (parseInt(minutesInput?.value) > 480) {
          this.validationErrors.push(`Attività ${index + 1}: massimo 480 minuti (8 ore)`);
        }
      });
    }

    if (this.validationErrors.length > 0) {
      this.showValidationErrors();
      return false;
    }

    return true;
  }

  /**
   * Valida il form BnB
   */
  async validateBnbForm(formIndex) {
    this.validationErrors = [];

    const dateInput = document.getElementById(`bnbDate-${formIndex}`);
    const bnbSelect = document.getElementById(`bnbSelect-${formIndex}`);
    const dip1Input = document.getElementById(`dip1Input-${formIndex}`);

    if (!dateInput?.value) {
      this.validationErrors.push('La data è obbligatoria');
    }

    if (!bnbSelect?.value) {
      this.validationErrors.push('Seleziona un BnB');
    }

    if (!dip1Input?.value) {
      this.validationErrors.push('Il dipendente principale è obbligatorio');
    }

    // Verifica che la data non sia futura
    const selectedDate = new Date(dateInput?.value);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (selectedDate > today) {
      this.validationErrors.push('Non puoi inserire bigliettini per date future');
    }

    if (this.validationErrors.length > 0) {
      this.showValidationErrors();
      return false;
    }

    return true;
  }

  /**
   * Mostra gli errori di validazione
   */
  showValidationErrors() {
    if (this.validationErrors.length === 0) return;

    const errorModal = document.createElement('div');
    errorModal.className = 'modal fade';
    errorModal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content bg-dark text-light">
          <div class="modal-header border-secondary">
            <h5 class="modal-title text-danger">
              <i class="fas fa-exclamation-triangle me-2"></i>Errori di Validazione
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-danger">
              <div class="small">
                ${this.validationErrors.map(error => `<div>• ${error}</div>`).join('')}
              </div>
            </div>
          </div>
          <div class="modal-footer border-secondary">
            <button type="button" class="btn btn-primary" data-bs-dismiss="modal">
              <i class="fas fa-check me-1"></i>Ho Capito
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(errorModal);
    const modal = new bootstrap.Modal(errorModal);
    
    errorModal.addEventListener('hidden.bs.modal', () => {
      errorModal.remove();
    });
    
    modal.show();
  }

  /**
   * Ottiene gli errori di validazione
   */
  getValidationErrors() {
    return [...this.validationErrors];
  }
}

// Funzioni helper globali
window.validateTimeEntryForm = async function() {
  const validator = new EnhancedFormValidation('timeEntryForm');
  return await validator.validateTimeEntryForm();
};

window.validateBnbForm = async function(formIndex) {
  const validator = new EnhancedFormValidation(`bnbForm-${formIndex}`);
  return await validator.validateBnbForm(formIndex);
};

export { EnhancedFormValidation };