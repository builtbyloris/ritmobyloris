# ritmobyloris

Repository privata di RITMO, un Pomodoro personale con gestione attività, statistiche e preferenze.

## Struttura

- `web/`: applicazione web corrente in Next.js, React e TypeScript, con Supabase Auth/Postgres e deploy Vercel.
- `ritmobyloris/`: prototipo nativo macOS in SwiftUI, preservato senza modifiche.
- `ritmobyloris.xcodeproj/`: progetto Xcode del prototipo macOS.

La web app è il prodotto attivo. Il progetto SwiftUI resta disponibile come riferimento e non condivide dipendenze o dati con la web app.

## Avvio web

Richiede Node.js 22.13 o successivo.

```bash
cd web
cp .env.example .env.local
npm ci
npm run dev
```

Configurare in `.env.local` soltanto le variabili pubbliche Supabase indicate nell'esempio. File `.env`, token, chiavi private, dati locali e output generati sono esclusi da Git.

## Verifiche web

```bash
cd web
npm run lint
npm test
npx tsc --noEmit
npm run build
```

## Prototipo macOS

Richiede macOS 14+, Xcode 15+ e Swift 5.9+. Aprire `ritmobyloris.xcodeproj`, selezionare il target `ritmobyloris` ed eseguire su “My Mac”.

## Privacy

La repository deve rimanere privata. Non versionare file `.env`, token OAuth, chiavi Supabase `service_role`, esportazioni utente o database locali. Le migrazioni in `web/supabase/migrations/` contengono soltanto schema e policy versionabili; i segreti restano nei dashboard Supabase e Vercel.
