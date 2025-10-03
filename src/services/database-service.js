import { supabase } from '../lib/supabase-client.js';

export class DatabaseService {
  static async query(table, options = {}) {
    try {
      let query = supabase.from(table).select(options.select || '*');

      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else {
            query = query.eq(key, value);
          }
        });
      }

      if (options.order) {
        query = query.order(options.order.column, {
          ascending: options.order.ascending ?? true
        });
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.single) {
        query = query.maybeSingle();
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error(`Database query error on ${table}:`, error);
      return { success: false, error: error.message };
    }
  }

  static async insert(table, data) {
    try {
      const { data: result, error } = await supabase
        .from(table)
        .insert(data)
        .select()
        .maybeSingle();

      if (error) throw error;

      return { success: true, data: result };
    } catch (error) {
      console.error(`Database insert error on ${table}:`, error);
      return { success: false, error: error.message };
    }
  }

  static async update(table, id, data) {
    try {
      const { data: result, error } = await supabase
        .from(table)
        .update(data)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;

      return { success: true, data: result };
    } catch (error) {
      console.error(`Database update error on ${table}:`, error);
      return { success: false, error: error.message };
    }
  }

  static async delete(table, id) {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error(`Database delete error on ${table}:`, error);
      return { success: false, error: error.message };
    }
  }

  static async upsert(table, data, options = {}) {
    try {
      const { data: result, error } = await supabase
        .from(table)
        .upsert(data, options)
        .select();

      if (error) throw error;

      return { success: true, data: result };
    } catch (error) {
      console.error(`Database upsert error on ${table}:`, error);
      return { success: false, error: error.message };
    }
  }
}
