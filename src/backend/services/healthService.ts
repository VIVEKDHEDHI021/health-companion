import { supabase } from "@/db/client";
import { subDays, format } from "date-fns";

export const healthService = {
  async getDashboardData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const since = subDays(new Date(), 30).toISOString();
    return Promise.all([
      supabase
        .from("glucose_entries")
        .select("*")
        .eq("user_id", user.id)
        .gte("date_time", since)
        .order("date_time", { ascending: false }),
      supabase
        .from("insulin_entries")
        .select("*")
        .eq("user_id", user.id)
        .gte("entry_date", format(subDays(new Date(), 30), "yyyy-MM-dd"))
        .order("entry_date", { ascending: false }),
      supabase
        .from("weight_entries")
        .select("*")
        .eq("user_id", user.id)
        .gte("entry_date", format(subDays(new Date(), 30), "yyyy-MM-dd"))
        .order("entry_date", { ascending: false }),
      supabase.from("profiles").select("name").eq("user_id", user.id).maybeSingle(),
    ]);
  },

  async getHistory() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    return supabase
      .from("glucose_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("date_time", { ascending: false });
  },

  async deleteGlucoseEntry(id: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    return supabase.from("glucose_entries").delete().eq("id", id).eq("user_id", user.id);
  },

  async getExportData(fromIso: string, toIso: string, from: string, to: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    return Promise.all([
      supabase
        .from("glucose_entries")
        .select("*")
        .eq("user_id", user.id)
        .gte("date_time", fromIso)
        .lte("date_time", toIso)
        .order("date_time"),
      supabase
        .from("insulin_entries")
        .select("*")
        .eq("user_id", user.id)
        .gte("entry_date", from)
        .lte("entry_date", to),
      supabase
        .from("weight_entries")
        .select("*")
        .eq("user_id", user.id)
        .gte("entry_date", from)
        .lte("entry_date", to),
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    ]);
  },

  async getReportsData(sinceIso: string, sinceDate: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    return Promise.all([
      supabase
        .from("glucose_entries")
        .select("*")
        .eq("user_id", user.id)
        .gte("date_time", sinceIso)
        .order("date_time"),
      supabase
        .from("insulin_entries")
        .select("*")
        .eq("user_id", user.id)
        .gte("entry_date", sinceDate)
        .order("entry_date"),
      supabase
        .from("weight_entries")
        .select("*")
        .eq("user_id", user.id)
        .gte("entry_date", sinceDate)
        .order("entry_date"),
    ]);
  },

  async getProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    return supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  },

  async updateProfile(data: { name?: string; phone?: string }) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    return supabase.from("profiles").update(data).eq("user_id", user.id);
  },
};
