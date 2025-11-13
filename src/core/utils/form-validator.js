/**
 * Form Validator Module
 * Consolidates validation logic from enhanced-form-validation.js and inline validators
 */

export class FormValidator {
  /**
   * Validation rules
   */
  static rules = {
    required: (value) => {
      if (typeof value === 'string') {
        return value.trim().length > 0;
      }
      return value !== null && value !== undefined && value !== '';
    },

    email: (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },

    minLength: (value, length) => {
      return value && value.length >= length;
    },

    maxLength: (value, length) => {
      return value && value.length <= length;
    },

    numeric: (value) => {
      return !isNaN(parseFloat(value)) && isFinite(value);
    },

    integer: (value) => {
      return Number.isInteger(Number(value));
    },

    positive: (value) => {
      return parseFloat(value) > 0;
    },

    min: (value, min) => {
      return parseFloat(value) >= min;
    },

    max: (value, max) => {
      return parseFloat(value) <= max;
    },

    pattern: (value, pattern) => {
      const regex = new RegExp(pattern);
      return regex.test(value);
    },

    url: (value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },

    date: (value) => {
      const date = new Date(value);
      return !isNaN(date.getTime());
    },

    phone: (value) => {
      const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
      return phoneRegex.test(value);
    }
  };

  /**
   * Error messages
   */
  static messages = {
    required: 'Questo campo è obbligatorio',
    email: 'Inserisci un indirizzo email valido',
    minLength: 'Il valore deve contenere almeno {length} caratteri',
    maxLength: 'Il valore deve contenere al massimo {length} caratteri',
    numeric: 'Il valore deve essere un numero',
    integer: 'Il valore deve essere un numero intero',
    positive: 'Il valore deve essere positivo',
    min: 'Il valore deve essere almeno {min}',
    max: 'Il valore deve essere al massimo {max}',
    pattern: 'Il formato non è valido',
    url: 'Inserisci un URL valido',
    date: 'Inserisci una data valida',
    phone: 'Inserisci un numero di telefono valido'
  };

  /**
   * Validate a single field
   * @param {*} value - Value to validate
   * @param {Object} rules - Validation rules
   * @returns {Object} Validation result {valid: boolean, errors: string[]}
   */
  static validateField(value, rules) {
    const errors = [];

    for (const [ruleName, ruleValue] of Object.entries(rules)) {
      const ruleFunc = this.rules[ruleName];

      if (!ruleFunc) {
        console.warn(`Validation rule '${ruleName}' not found`);
        continue;
      }

      let isValid;
      if (typeof ruleValue === 'boolean' && ruleValue === true) {
        isValid = ruleFunc(value);
      } else {
        isValid = ruleFunc(value, ruleValue);
      }

      if (!isValid) {
        let message = this.messages[ruleName] || 'Valore non valido';
        message = message.replace('{length}', ruleValue).replace('{min}', ruleValue).replace('{max}', ruleValue);
        errors.push(message);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate form data
   * @param {Object} formData - Form data to validate
   * @param {Object} validationRules - Validation rules for each field
   * @returns {Object} Validation result {valid: boolean, errors: Object}
   */
  static validate(formData, validationRules) {
    const errors = {};
    let isValid = true;

    for (const [fieldName, rules] of Object.entries(validationRules)) {
      const value = formData[fieldName];
      const result = this.validateField(value, rules);

      if (!result.valid) {
        errors[fieldName] = result.errors;
        isValid = false;
      }
    }

    return {
      valid: isValid,
      errors
    };
  }

  /**
   * Show validation errors in form
   * @param {Object} errors - Errors object {fieldName: [error1, error2]}
   * @param {string} formSelector - Form selector (optional)
   */
  static showErrors(errors, formSelector = null) {
    this.clearErrors(formSelector);

    for (const [fieldName, fieldErrors] of Object.entries(errors)) {
      const input = formSelector
        ? document.querySelector(`${formSelector} [name="${fieldName}"]`)
        : document.querySelector(`[name="${fieldName}"]`);

      if (!input) continue;

      input.classList.add('is-invalid');

      const errorDiv = document.createElement('div');
      errorDiv.className = 'invalid-feedback d-block';
      errorDiv.textContent = fieldErrors.join(', ');

      input.parentElement.appendChild(errorDiv);
    }
  }

  /**
   * Clear validation errors from form
   * @param {string} formSelector - Form selector (optional)
   */
  static clearErrors(formSelector = null) {
    const container = formSelector
      ? document.querySelector(formSelector)
      : document;

    if (!container) return;

    const invalidInputs = container.querySelectorAll('.is-invalid');
    invalidInputs.forEach(input => {
      input.classList.remove('is-invalid');
    });

    const errorMessages = container.querySelectorAll('.invalid-feedback');
    errorMessages.forEach(msg => msg.remove());
  }

  /**
   * Validate form element on submit
   * @param {HTMLFormElement} form - Form element
   * @param {Object} validationRules - Validation rules
   * @param {Function} onValid - Callback when form is valid
   * @returns {boolean} True if valid
   */
  static validateForm(form, validationRules, onValid = null) {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    const result = this.validate(data, validationRules);

    if (result.valid) {
      this.clearErrors();
      if (typeof onValid === 'function') {
        onValid(data);
      }
      return true;
    } else {
      this.showErrors(result.errors);
      return false;
    }
  }

  /**
   * Add real-time validation to form
   * @param {HTMLFormElement|string} formOrSelector - Form or selector
   * @param {Object} validationRules - Validation rules
   */
  static addRealTimeValidation(formOrSelector, validationRules) {
    const form = typeof formOrSelector === 'string'
      ? document.querySelector(formOrSelector)
      : formOrSelector;

    if (!form) return;

    for (const fieldName of Object.keys(validationRules)) {
      const input = form.querySelector(`[name="${fieldName}"]`);

      if (!input) continue;

      input.addEventListener('blur', () => {
        const value = input.value;
        const result = this.validateField(value, validationRules[fieldName]);

        input.classList.remove('is-invalid', 'is-valid');

        const existingFeedback = input.parentElement.querySelector('.invalid-feedback, .valid-feedback');
        if (existingFeedback) {
          existingFeedback.remove();
        }

        if (result.valid) {
          input.classList.add('is-valid');
        } else {
          input.classList.add('is-invalid');
          const errorDiv = document.createElement('div');
          errorDiv.className = 'invalid-feedback d-block';
          errorDiv.textContent = result.errors.join(', ');
          input.parentElement.appendChild(errorDiv);
        }
      });

      input.addEventListener('input', () => {
        if (input.classList.contains('is-invalid') || input.classList.contains('is-valid')) {
          const value = input.value;
          const result = this.validateField(value, validationRules[fieldName]);

          input.classList.remove('is-invalid', 'is-valid');

          const existingFeedback = input.parentElement.querySelector('.invalid-feedback, .valid-feedback');
          if (existingFeedback) {
            existingFeedback.remove();
          }

          if (result.valid) {
            input.classList.add('is-valid');
          } else {
            input.classList.add('is-invalid');
            const errorDiv = document.createElement('div');
            errorDiv.className = 'invalid-feedback d-block';
            errorDiv.textContent = result.errors.join(', ');
            input.parentElement.appendChild(errorDiv);
          }
        }
      });
    }
  }

  /**
   * Add custom validation rule
   * @param {string} name - Rule name
   * @param {Function} validator - Validator function
   * @param {string} message - Error message
   */
  static addRule(name, validator, message) {
    this.rules[name] = validator;
    this.messages[name] = message;
  }
}
