# RITMO byloris

**RITMO** è una web app pubblica per la produttività personale che combina timer Pomodoro, gestione delle attività, pianificazione quotidiana, statistiche e ambienti sonori per la concentrazione.

[Apri RITMO](https://ritmobyloris.vercel.app) · **Versione corrente: V1.2 — Daily Planner**

## Funzionalità

- [**Focus**](web/components/ritmo-app.tsx): timer Pomodoro 25/5, 50/10 e personalizzato, pause brevi e lunghe, attività associata e obiettivo giornaliero.
- [**Deep Focus**](web/components/focus/deep-focus-mode.tsx): modalità immersiva con timer protagonista, task corrente, controlli audio e fullscreen opzionale.
- [**Task Manager**](web/components/tasks/task-manager.tsx): creazione, modifica, completamento, eliminazione, categorie e Pomodori stimati.
- [**Daily Planner**](web/components/planner/daily-planner.tsx): calendario settimanale, pianificazione per giorno, priorità Alta/Media/Bassa, Pomodori previsti, riordino, avanzamento giornaliero e avvio diretto del Focus.
- [**Command Palette**](web/components/command-palette/command-palette.tsx): ricerca di attività e accesso rapido a navigazione e azioni tramite `⌘K` o `Ctrl+K`.
- [**Statistiche**](web/components/statistics/statistics-dashboard.tsx): minuti di focus, Pomodori completati, giorni attivi, attività completate, distribuzione e cronologia.
- [**Audio Focus**](web/lib/focus-audio.ts): pioggia, onde e rumore bruno generati localmente, con volume dedicato e nessun servizio audio esterno.
- [**Impostazioni**](web/components/settings/settings-dashboard.tsx): durate, preset, obiettivo giornaliero, notifiche, suoni, temi Light/Dark/Automatico ed esportazione JSON.

L'interfaccia è responsive, supporta `prefers-reduced-motion` e mantiene il design graphite/lavender/amber su desktop e mobile.

## Stack

- Next.js 16, React 19 e TypeScript
- Motion per animazioni e microinterazioni
- Supabase Auth e PostgreSQL
- Row Level Security per l'isolamento dei dati
- Vercel per build e distribuzione Production
- Node.js Test Runner, ESLint e TypeScript per le verifiche

## Struttura del monorepo

```text
ritmobyloris/
├── web/                         # Web app attiva
│   ├── app/                     # Route Next.js, login e callback OAuth
│   ├── components/              # Focus, Planner, Task, Statistiche e Settings
│   ├── hooks/                   # Stato applicativo e sincronizzazione
│   ├── lib/                     # Timer, analytics, Supabase e audio
│   ├── supabase/migrations/     # Schema e policy versionabili
│   └── tests/                   # Test di dominio
├── ritmobyloris/                # Prototipo nativo macOS in SwiftUI
└── ritmobyloris.xcodeproj/      # Progetto Xcode del prototipo
```

La web app è il prodotto distribuito. Il prototipo SwiftUI è conservato come riferimento progettuale e non condivide dipendenze o dati con la web app.

## Installazione locale

Richiede **Node.js 22.13 o successivo**.

```bash
cd web
cp .env.example .env.local
npm ci
npm run dev
```

Configurare in `web/.env.local` esclusivamente le variabili pubbliche indicate in `.env.example`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Per un nuovo ambiente Supabase occorre configurare Google OAuth e applicare in ordine le migrazioni in `web/supabase/migrations/`. Non riapplicare manualmente migrazioni già eseguite in produzione.

## Test e build

```bash
cd web
npm run lint
npx tsc --noEmit
npm test
npm run build
```

I test coprono motore Pomodoro, countdown basato su timestamp, deduplicazione delle sessioni, aggregazioni statistiche, scorciatoie e gestione delle date locali del Planner.

## Autenticazione, dati e sicurezza

- L'accesso usa **Google OAuth** tramite Supabase Auth.
- Attività, pianificazioni, sessioni, timer e preferenze sono associati all'utente autenticato.
- Le tabelle Supabase applicano **Row Level Security** su `user_id`: ogni utente può leggere e modificare soltanto i propri dati.
- La RPC `ritmo_complete_focus` è disponibile soltanto per `authenticated` e verifica l'identità con `auth.uid()` prima di registrare sessione, timer e avanzamento del task in modo atomico.
- Le variabili `NEXT_PUBLIC_*` contengono esclusivamente la configurazione browser pubblicabile. Chiavi `service_role`, token OAuth e altri segreti non devono mai essere inclusi nel frontend o nel repository.
- File `.env`, esportazioni personali, database locali, token e output temporanei sono esclusi dal versionamento.

## Prototipo macOS

Il prototipo originario richiede macOS 14+, Xcode 15+ e Swift 5.9+. Aprire `ritmobyloris.xcodeproj`, selezionare il target `ritmobyloris` ed eseguirlo su “My Mac”. È preservato come riferimento UI/UX e non è la versione attualmente distribuita.

## Licenza e pubblicazione

Il codice sorgente è pubblicamente consultabile. La pubblicazione del repository non implica automaticamente la concessione di una licenza di riutilizzo.
