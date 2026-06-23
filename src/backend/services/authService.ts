import { supabase } from "@/db/client";
import type { Session } from "@supabase/supabase-js";

export const authService = {
  async signIn(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password });
  },

  async signUp(email: string, password: string) {
    return supabase.auth.signUp({ email, password });
  },

  async resetPassword(email: string, redirectTo: string) {
    return supabase.auth.resetPasswordForEmail(email, { redirectTo });
  },

  async updatePassword(password: string) {
    return supabase.auth.updateUser({ password });
  },

  async signOut() {
    return supabase.auth.signOut();
  },

  async getSession() {
    return supabase.auth.getSession();
  },

  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};
