import Link from "next/link";

export const metadata = {
  title: "Privacy — RITMO",
  description: "Informativa privacy di RITMO.",
};

export default function PrivacyPage() {
  return <main className="legal-shell">
    <article className="legal-card">
      <Link className="legal-back" href="/login">← Torna a RITMO</Link>
      <p className="eyebrow">PRIVACY</p>
      <h1>I tuoi dati restano tuoi.</h1>
      <p className="legal-lead">RITMO raccoglie solo le informazioni necessarie a offrirti il timer Pomodoro e la sincronizzazione privata tra i tuoi dispositivi.</p>

      <h2>Dati trattati</h2>
      <p>Quando accedi con Google riceviamo il tuo identificativo account, nome, indirizzo email e immagine profilo. Salviamo inoltre attività, sessioni di focus, stato del timer e preferenze create nell’app.</p>

      <h2>Finalità e conservazione</h2>
      <p>I dati servono esclusivamente per autenticarti e sincronizzare le funzioni di RITMO. Sono conservati su Supabase e protetti con regole Row Level Security: ogni account può leggere e modificare soltanto i propri record.</p>

      <h2>Condivisione</h2>
      <p>Non vendiamo dati, non usiamo pubblicità e non trasmettiamo informazioni a servizi esterni oltre a Google per l’accesso, Supabase per autenticazione e database e Vercel per l’hosting dell’app.</p>

      <h2>Controllo dei dati</h2>
      <p>Puoi esportare i tuoi dati dalle Impostazioni. Per richiederne la cancellazione o ricevere assistenza, usa l’indirizzo di supporto indicato nella schermata di consenso Google.</p>

      <p className="legal-updated">Ultimo aggiornamento: 22 ottobre 2026.</p>
    </article>
  </main>;
}
