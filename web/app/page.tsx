import { redirect } from "next/navigation";
import { RitmoApp } from "@/components/ritmo-app";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const metadata = user.user_metadata ?? {};
  const fullName = typeof metadata.full_name === "string" ? metadata.full_name : "";
  const firstName = fullName.trim().split(/\s+/)[0] || user.email?.split("@")[0] || "Utente";
  return <RitmoApp userId={user.id} userName={firstName} userEmail={user.email ?? "Account Google"} />;
}
