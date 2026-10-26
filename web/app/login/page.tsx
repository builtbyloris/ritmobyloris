"use client";

import { useState } from "react";
import { LoaderCircle, LogIn, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setLoading(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { prompt: "select_account" } },
    });
    if (authError) {
      setError("Accesso Google non riuscito. Riprova tra qualche istante.");
      setLoading(false);
    }
  }

  return <main className="login-shell">
    <section className="login-card">
      <div className="brand login-brand" aria-label="Ritmo"><span className="brand-mark" /><span>R I T M O</span></div>
      <div className="login-copy"><span className="login-icon"><ShieldCheck /></span><h1>Il tuo ritmo, ovunque.</h1><p>Accedi per sincronizzare attività, sessioni e preferenze. Ogni account può vedere esclusivamente i propri dati.</p></div>
      <button className="button primary login-button" onClick={signIn} disabled={loading}>{loading ? <LoaderCircle className="spin" size={19} /> : <LogIn size={19} />} Continua con Google</button>
      {error && <p className="login-error" role="alert">{error}</p>}
      <small>Nessun dato viene venduto o condiviso con servizi pubblicitari. <Link href="/privacy">Privacy</Link></small>
    </section>
  </main>;
}
