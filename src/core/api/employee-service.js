/**
 * Employee Service
 * Specialized service for employee operations
 * Maintains compatibility with existing FirestoreService.getEmployees()
 */

import { db } from '../../../assets/js/common/firebase-config.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export class EmployeeService {
  /**
   * Get all employees from Data/employees document
   * @returns {Promise<Array>} Array of employee objects
   */
  static async getAll() {
    try {
      const ref = doc(db, 'Data', 'employees');
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        const employees = data.employees || [];

        if (!Array.isArray(employees)) {
          console.warn('employees is not an array:', employees);
          return [];
        }

        return employees.map(emp => {
          if (typeof emp === 'string') {
            return { name: emp };
          } else if (emp && typeof emp === 'object') {
            return {
              name: emp.name || emp.nome || 'N/A',
              password: emp.password || '',
              ...emp
            };
          }
          return { name: 'N/A' };
        }).filter(emp => emp.name !== 'N/A');
      }

      return [];
    } catch (error) {
      console.error('Error loading employees:', error);
      return [];
    }
  }

  /**
   * Get employee by name
   * @param {string} name - Employee name
   * @returns {Promise<Object|null>} Employee object or null
   */
  static async getByName(name) {
    try {
      const employees = await this.getAll();
      return employees.find(emp => emp.name === name) || null;
    } catch (error) {
      console.error('Error getting employee by name:', error);
      return null;
    }
  }

  /**
   * Save employees list to Data/employees document
   * @param {Array} employees - Array of employee objects
   * @returns {Promise<Object>} Success result
   */
  static async saveAll(employees) {
    try {
      const ref = doc(db, 'Data', 'employees');
      await setDoc(ref, { employees }, { merge: true });
      return { success: true };
    } catch (error) {
      console.error('Error saving employees:', error);
      return { success: false, error };
    }
  }

  /**
   * Add new employee
   * @param {Object} employee - Employee data
   * @returns {Promise<Object>} Success result
   */
  static async add(employee) {
    try {
      const employees = await this.getAll();

      const exists = employees.some(emp => emp.name === employee.name);
      if (exists) {
        return { success: false, error: 'Employee already exists' };
      }

      employees.push(employee);
      return await this.saveAll(employees);
    } catch (error) {
      console.error('Error adding employee:', error);
      return { success: false, error };
    }
  }

  /**
   * Update employee
   * @param {string} name - Employee name
   * @param {Object} updates - Employee updates
   * @returns {Promise<Object>} Success result
   */
  static async update(name, updates) {
    try {
      const employees = await this.getAll();
      const index = employees.findIndex(emp => emp.name === name);

      if (index === -1) {
        return { success: false, error: 'Employee not found' };
      }

      employees[index] = { ...employees[index], ...updates };
      return await this.saveAll(employees);
    } catch (error) {
      console.error('Error updating employee:', error);
      return { success: false, error };
    }
  }

  /**
   * Delete employee
   * @param {string} name - Employee name
   * @returns {Promise<Object>} Success result
   */
  static async delete(name) {
    try {
      const employees = await this.getAll();
      const filtered = employees.filter(emp => emp.name !== name);

      if (filtered.length === employees.length) {
        return { success: false, error: 'Employee not found' };
      }

      return await this.saveAll(filtered);
    } catch (error) {
      console.error('Error deleting employee:', error);
      return { success: false, error };
    }
  }

  /**
   * Check if employee exists
   * @param {string} name - Employee name
   * @returns {Promise<boolean>} True if exists
   */
  static async exists(name) {
    try {
      const employee = await this.getByName(name);
      return employee !== null;
    } catch (error) {
      console.error('Error checking employee existence:', error);
      return false;
    }
  }

  /**
   * Validate employee credentials
   * @param {string} name - Employee name
   * @param {string} password - Employee password
   * @returns {Promise<boolean>} True if credentials are valid
   */
  static async validateCredentials(name, password) {
    try {
      const employee = await this.getByName(name);

      if (!employee) {
        return false;
      }

      return employee.password === password;
    } catch (error) {
      console.error('Error validating credentials:', error);
      return false;
    }
  }

  /**
   * Get employee names only
   * @returns {Promise<Array<string>>} Array of employee names
   */
  static async getNames() {
    try {
      const employees = await this.getAll();
      return employees.map(emp => emp.name);
    } catch (error) {
      console.error('Error getting employee names:', error);
      return [];
    }
  }

  /**
   * Search employees by name
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} Array of matching employees
   */
  static async search(searchTerm) {
    try {
      const employees = await this.getAll();
      const term = searchTerm.toLowerCase();

      return employees.filter(emp =>
        emp.name.toLowerCase().includes(term)
      );
    } catch (error) {
      console.error('Error searching employees:', error);
      return [];
    }
  }

  /**
   * Count total employees
   * @returns {Promise<number>} Employee count
   */
  static async count() {
    try {
      const employees = await this.getAll();
      return employees.length;
    } catch (error) {
      console.error('Error counting employees:', error);
      return 0;
    }
  }
}

export const getEmployees = () => EmployeeService.getAll();
