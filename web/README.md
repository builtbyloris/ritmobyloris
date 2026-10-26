# ritmobyloris

Pomodoro personale con Focus, attività, statistiche e preferenze. L'app è costruita con Next.js, React, TypeScript, Motion, Supabase e Vercel.

## Dati e privacy

- Accesso tramite Google con Supabase Auth.
- Attività, sessioni, timer e preferenze sono sincronizzati in Postgres e isolati per `user_id` tramite Row Level Security.
- Al primo accesso, i dati V6 presenti in IndexedDB vengono importati una sola volta nell'account autenticato.
- L'esportazione JSON crea una copia locale dei dati.
- La disconnessione impedisce l'accesso all'app, ma non elimina i dati sincronizzati.

## Sviluppo e verifica

Richiede Node.js 22.13 o successivo.

```bash
npm ci
npm run dev
npm run lint
npm test
npx tsc --noEmit
npm run build
```

I test automatici coprono regole del timer, countdown a timestamp, deduplicazione e aggregazioni statistiche. La funzione Postgres `ritmo_complete_focus` registra sessione, timer e avanzamento attività in una transazione atomica.

## Configurazione cloud

1. Copiare `.env.example` in `.env.local` e valorizzare esclusivamente le due variabili pubbliche richieste.
2. Applicare in ordine le migrazioni presenti in `supabase/migrations/` al progetto Supabase collegato.
3. Abilitare Google in Supabase Auth e registrare il callback OAuth mostrato nel dashboard.
4. Verificare che Vercel esponga `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Production e Preview.

Le migrazioni applicano Row Level Security per utente. La funzione `ritmo_complete_focus` è revocata a `PUBLIC` e `anon`, concessa ad `authenticated` e valida l'identità tramite `auth.uid()`.

## Installazione e offline

Il Web App Manifest e le icone consentono l'installazione come web app nei browser compatibili. Su macOS 14 o successivo, Safari può aggiungere il Site al Dock. Non è incluso un service worker: accesso e sincronizzazione richiedono rete.

## Suoni Focus

L'app include atmosfere sintetizzate localmente (pioggia, onde e rumore bruno), senza richieste a servizi esterni. Sono disponibili anteprima, volume dedicato, disattivazione e arresto automatico quando il Focus non è in esecuzione.
