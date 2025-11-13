import { DatabaseService } from './database-service.js';

export class EmployeeService {
  static TABLE = 'employees';

  static async getAllEmployees() {
    return await DatabaseService.query(this.TABLE, {
      order: { column: 'cognome', ascending: true }
    });
  }

  static async getEmployeeByUsername(username) {
    return await DatabaseService.query(this.TABLE, {
      filters: { username },
      single: true
    });
  }

  static async createEmployee(employeeData) {
    const data = {
      username: employeeData.username,
      nome: employeeData.nome,
      cognome: employeeData.cognome,
      email: employeeData.email,
      data_nascita: employeeData.dataNascita || null,
      codice_fiscale: employeeData.codiceFiscale || null,
      numero_matricola: employeeData.numeroMatricola || null,
      photo_url: employeeData.photoUrl || null,
      is_active: employeeData.isActive ?? true,
      created_at: new Date().toISOString()
    };

    return await DatabaseService.insert(this.TABLE, data);
  }

  static async updateEmployee(id, employeeData) {
    const data = {
      nome: employeeData.nome,
      cognome: employeeData.cognome,
      email: employeeData.email,
      data_nascita: employeeData.dataNascita || null,
      codice_fiscale: employeeData.codiceFiscale || null,
      numero_matricola: employeeData.numeroMatricola || null,
      photo_url: employeeData.photoUrl || null,
      is_active: employeeData.isActive,
      updated_at: new Date().toISOString()
    };

    return await DatabaseService.update(this.TABLE, id, data);
  }

  static async deleteEmployee(id) {
    return await DatabaseService.delete(this.TABLE, id);
  }

  static async getActiveEmployees() {
    return await DatabaseService.query(this.TABLE, {
      filters: { is_active: true },
      order: { column: 'cognome', ascending: true }
    });
  }
}
