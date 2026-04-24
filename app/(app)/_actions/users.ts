"use server";

import { createClient } from "@/lib/supabase/server";

export type UserSearchResult = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_public: boolean;
};

export const searchUsers = async (query: string): Promise<UserSearchResult[]> => {
  const q = query.trim();
  if (q.length < 2) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_users", { q });

  if (error) {
    console.error("searchUsers error:", error);
    return [];
  }

  return (data ?? []) as UserSearchResult[];
};
