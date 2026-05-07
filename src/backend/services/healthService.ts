import { supabase } from "@/db/client";
import { subDays, format } from "date-fns";

export const healthService = {
  async getDashboardData(userId: string) {
    const since = subDays(new Date(), 30).toISOString();
    return Promise.all([
      supabase.from("glucose_entries").select("*").gte("date_time", since).order("date_time", { ascending: false }),
      supabase.from("insulin_entries").select("*").gte("entry_date", format(subDays(new Date(), 30), "yyyy-MM-dd")).order("entry_date", { ascending: false }),
      supabase.from("weight_entries").select("*").gte("entry_date", format(subDays(new Date(), 30), "yyyy-MM-dd")).order("entry_date", { ascending: false }),
      supabase.from("profiles").select("name").eq("user_id", userId).maybeSingle(),
    ]);
  },

  async getHistory() {
    return supabase.from("glucose_entries").select("*").order("date_time", { ascending: false });
  },

  async deleteGlucoseEntry(id: string) {
    return supabase.from("glucose_entries").delete().eq("id", id);
  },

  async getExportData(userId: string, fromIso: string, toIso: string, from: string, to: string) {
    return Promise.all([
      supabase.from("glucose_entries").select("*").gte("date_time", fromIso).lte("date_time", toIso).order("date_time"),
      supabase.from("insulin_entries").select("*").gte("entry_date", from).lte("entry_date", to),
      supabase.from("weight_entries").select("*").gte("entry_date", from).lte("entry_date", to),
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    ]);
  },

  async getReportsData(sinceIso: string, sinceDate: string) {
    return Promise.all([
      supabase.from("glucose_entries").select("*").gte("date_time", sinceIso).order("date_time"),
      supabase.from("insulin_entries").select("*").gte("entry_date", sinceDate).order("entry_date"),
      supabase.from("weight_entries").select("*").gte("entry_date", sinceDate).order("entry_date"),
    ]);
  },

  async getProfile(userId: string) {
    return supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  },

  async updateProfile(userId: string, data: { name?: string; phone?: string }) {
    return supabase.from("profiles").update(data).eq("user_id", userId);
  }
};
