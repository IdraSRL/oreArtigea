import { DatabaseService } from './database-service.js';

export class TimeEntryService {
  static TABLE = 'time_entries';
  static ACTIVITIES_TABLE = 'activities';

  static async getTimeEntriesForEmployee(employeeId, startDate, endDate) {
    return await DatabaseService.query(this.TABLE, {
      filters: { employee_id: employeeId },
      order: { column: 'date', ascending: false }
    });
  }

  static async getTimeEntriesForDate(date) {
    return await DatabaseService.query(this.TABLE, {
      filters: { date },
      order: { column: 'created_at', ascending: true }
    });
  }

  static async createTimeEntry(entryData) {
    const data = {
      employee_id: entryData.employeeId,
      date: entryData.date,
      activities: entryData.activities || [],
      riposo: entryData.riposo || false,
      ferie: entryData.ferie || false,
      malattia: entryData.malattia || false,
      total_minutes: this.calculateTotalMinutes(entryData.activities || []),
      created_at: new Date().toISOString()
    };

    return await DatabaseService.insert(this.TABLE, data);
  }

  static async updateTimeEntry(id, entryData) {
    const data = {
      activities: entryData.activities || [],
      riposo: entryData.riposo || false,
      ferie: entryData.ferie || false,
      malattia: entryData.malattia || false,
      total_minutes: this.calculateTotalMinutes(entryData.activities || []),
      updated_at: new Date().toISOString()
    };

    return await DatabaseService.update(this.TABLE, id, data);
  }

  static async deleteTimeEntry(id) {
    return await DatabaseService.delete(this.TABLE, id);
  }

  static async getActivitiesByType(type) {
    return await DatabaseService.query(this.ACTIVITIES_TABLE, {
      filters: { tipo: type, is_active: true },
      order: { column: 'nome', ascending: true }
    });
  }

  static async getAllActivities() {
    return await DatabaseService.query(this.ACTIVITIES_TABLE, {
      filters: { is_active: true },
      order: { column: 'tipo', ascending: true }
    });
  }

  static calculateTotalMinutes(activities) {
    return activities.reduce((total, activity) => {
      const minutes = parseInt(activity.minuti || 0);
      const people = parseInt(activity.persone || 1);
      const multiplier = parseFloat(activity.moltiplicatore || 1);
      return total + (minutes * people * multiplier);
    }, 0);
  }

  static async getMonthSummary(employeeId, year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    const result = await DatabaseService.query(this.TABLE, {
      filters: { employee_id: employeeId },
      order: { column: 'date', ascending: true }
    });

    if (!result.success) return result;

    const filteredData = result.data.filter(entry => {
      return entry.date >= startDate && entry.date <= endDate;
    });

    const totalMinutes = filteredData.reduce((sum, entry) => sum + (entry.total_minutes || 0), 0);
    const totalDays = filteredData.length;
    const daysWithRiposo = filteredData.filter(e => e.riposo).length;
    const daysWithFerie = filteredData.filter(e => e.ferie).length;
    const daysWithMalattia = filteredData.filter(e => e.malattia).length;

    return {
      success: true,
      data: {
        entries: filteredData,
        summary: {
          totalMinutes,
          totalHours: (totalMinutes / 60).toFixed(2),
          totalDays,
          daysWithRiposo,
          daysWithFerie,
          daysWithMalattia
        }
      }
    };
  }
}
