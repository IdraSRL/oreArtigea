import { supabase } from '../lib/supabase-client.js';

export class AuthService {
  static ADMIN_ROLE = 'admin';
  static EMPLOYEE_ROLE = 'employee';

  static async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      return { success: true, user: data.user, session: data.session };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message };
    }
  }

  static async signUp(email, password, userData = {}) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });

      if (error) throw error;

      return { success: true, user: data.user };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: error.message };
    }
  }

  static async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    }
  }

  static async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  static async getSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    } catch (error) {
      console.error('Get session error:', error);
      return null;
    }
  }

  static checkAuth() {
    const session = localStorage.getItem('supabase.auth.token');
    return !!session;
  }

  static async isAdmin() {
    const user = await this.getCurrentUser();
    return user?.user_metadata?.role === this.ADMIN_ROLE;
  }

  static onAuthStateChange(callback) {
    supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        await callback(event, session);
      })();
    });
  }

  static async requireAuth(requiredRole = null) {
    const user = await this.getCurrentUser();

    if (!user) {
      window.location.href = '/pages/login.html';
      return false;
    }

    if (requiredRole && user.user_metadata?.role !== requiredRole) {
      window.location.href = '/index.html';
      return false;
    }

    return true;
  }
}
