# Frontend-Dokumentation

Diese Dokumentation beschreibt Aufbau, Konventionen und Funktionsweise des AD-PKI-Frontends im Detail. Sie richtet sich an Entwickler:innen, die am Code arbeiten oder das Projekt in einer eigenen Umgebung betreiben wollen.

## Inhalt

- [Architektur & Datenfluss](#architektur--datenfluss)
- [Projektstruktur](#projektstruktur)
- [Routing & Permission-Guards](#routing--permission-guards)
- [State-Management](#state-management)
- [API-Layer](#api-layer)
- [Runtime-Konfiguration](#runtime-konfiguration)
- [Echtzeit-Kommunikation (WebSocket)](#echtzeit-kommunikation-websocket)
- [Internationalisierung (i18n)](#internationalisierung-i18n)
- [Branding](#branding)
- [Build & Entwicklung](#build--entwicklung)

---

## Architektur & Datenfluss

Das Frontend ist eine reine Single-Page-Application (SPA) und enthält keine eigene Geschäftslogik. Jede fachliche Entscheidung (Berechtigungen, Zertifikatserzeugung, Validierung) liegt im Backend.

```
Browser (Vue SPA)
   │  REST (Axios, Bearer-Token)
   ▼
Backend-API
   │  WebSocket (Broadcasting: audit-logs, system-health)
   ▼
Certificate Authority / Crypto-Engine
```

Typischer Ablauf:
1. Login über `/login` → Backend liefert Token + Benutzer inkl. Permission-Liste
2. Token wird in `localStorage` gespeichert und vom Axios-Client bei jeder Anfrage als `Authorization: Bearer <token>` mitgeschickt
3. Nach erfolgreichem Login wird eine WebSocket-Verbindung aufgebaut, über die Audit-Events live als Toast-Benachrichtigungen angezeigt werden
4. Bei `401`-Antworten wird der lokale Auth-State gelöscht und zur Login-Seite weitergeleitet

## Projektstruktur

```
src/
├── api/                 # Ein Modul pro Backend-Ressource
│   ├── client.ts        # Zentrale Axios-Instanz inkl. Interceptors
│   ├── auth.ts           # login / me / logout
│   ├── certificates.ts, certificatescreate.ts, certificateRequests.ts, revoke.ts
│   ├── ca.ts, acme.ts, tsa.ts, dns.ts
│   ├── users.ts, roles.ts, permissions.ts, teams.ts
│   ├── settings.ts, templates.ts, notifications.ts, preferences.ts
│   ├── auditlogs.ts, dashboard.ts, system.ts
│   └── config.ts          # Reverb/Broadcasting-Konfiguration vom Backend
│
├── components/
│   ├── auth/             # LoginForm
│   ├── common/            # BaseButton, BaseCard, BaseInput, BaseTable, ToastContainer
│   ├── layout/             # AppLayout, Navbar
│   └── production/         # Formulare zur Zertifikatserstellung (TLS, Client, Code-Signing)
│
├── views/
│   ├── auth/               # LoginView
│   └── production/          # Dashboard, Certificates, CA, Settings*, Users, Teams,
│                              Infrastructure, AuditLogs, SystemInfo, Branding, Me, …
│
├── router/index.ts          # Routendefinition + Auth-/Permission-Guards
├── stores/                  # auth.ts, toast.ts, toastSettings.ts
├── i18n/index.ts, locales/  # vue-i18n-Setup und Sprachdateien
├── types/                   # Geteilte TypeScript-Typen (API-Antworten, Domänenmodelle)
├── utils/                   # auth.ts, permissions.ts, eventBus.ts, i18nResponse.ts
├── config.ts                 # Laufzeit-Konfiguration (API-Basis-URL)
├── echo.ts                    # WebSocket-/Broadcasting-Client
├── App.vue                    # Root-Komponente: globaler WebSocket-Listener, Toast-Mapping
└── main.ts                     # Einstiegspunkt (Vue-, Router-, i18n-Bootstrapping)
```

## Routing & Permission-Guards

Routing erfolgt über `vue-router` mit `createWebHistory`. Jede geschützte Route ist in `AppLayout` eingebettet und kann über `meta.permission` (einzelnes Recht) oder `meta.permissions` (eine von mehreren Berechtigungen reicht) abgesichert werden.

Der globale `router.beforeEach`-Guard (`src/router/index.ts`) prüft in dieser Reihenfolge:

1. **Authentifizierung** — ist kein Token in `localStorage` vorhanden, wird auf `/login` umgeleitet (außer bei öffentlichen Pfaden)
2. **Bereits eingeloggt + `/login` aufgerufen** → Weiterleitung zum Dashboard
3. **`meta.permission`** — fehlt das Recht, Weiterleitung zum Dashboard
4. **`meta.permissions`** — keines der angegebenen Rechte vorhanden → Weiterleitung zum Dashboard

Berechtigungen werden nicht erneut vom Server abgefragt, sondern aus dem beim Login erhaltenen und in `localStorage` gespiegelten Benutzerobjekt gelesen (`stores/auth.ts`).

## State-Management

Es kommt **kein** externes State-Management-Framework (z. B. Pinia/Vuex) zum Einsatz. Stattdessen exportieren Module unter `src/stores/` direkt reaktive Variablen auf Basis von Vues `ref`/`computed` — ein einfaches Singleton-Pattern:

- **`stores/auth.ts`** — `currentUser`, abgeleitetes `permissions`-Array, `setUser`/`clearUser`, Synchronisation des Auth-Status über mehrere Browser-Tabs hinweg via `storage`-Event
- **`stores/toast.ts`** — Toast-Benachrichtigungs-API (`success`, `danger`, `warning`, `info`)
- **`stores/toastSettings.ts`** — pro Benutzer konfigurierbare Ein-/Ausschaltbarkeit von Toast-Kategorien

Da die Variablen modulweit als Singleton exportiert werden, teilen sich alle Komponenten denselben State, ohne dass ein Provider/Plugin nötig ist.

## API-Layer

Jede Backend-Ressource hat ein eigenes Modul unter `src/api/`, das auf der zentralen Axios-Instanz (`src/api/client.ts`) aufbaut:

```ts
// Request-Interceptor: hängt automatisch das Bearer-Token an
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response-Interceptor: bei 401 Token/Session löschen und zum Login umleiten
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('permissions')
      if (window.location.pathname !== '/login') window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

Konvention: Jede Funktion in einem `api/*.ts`-Modul kapselt genau einen Endpunkt und gibt einen typisierten Wert zurück (Typen aus `src/types/`). Komponenten rufen ausschließlich diese Funktionen auf, niemals `apiClient` direkt.

## Runtime-Konfiguration

Die API-Basis-URL ist **kein Build-Time-Wert**, sondern wird zur Laufzeit aus dem globalen Objekt `window.__ADPKI_CONFIG__` gelesen (`src/config.ts`):

```ts
const cfg = (window as any).__ADPKI_CONFIG__

export const config: AppConfig = {
  apiBaseUrl: cfg?.apiBaseUrl ?? 'http://localhost:8000/api',
}
```

`index.html` lädt dafür vor dem Anwendungs-Bundle ein Script `/config.js`:

```html
<script src="/config.js"></script>
<script type="module" src="/src/main.js"></script>
```

Dadurch lässt sich die API-URL **nach dem Build** anpassen, ohne neu bauen zu müssen — z. B. beim Deployment in unterschiedliche Umgebungen. `public/config.js` ist bewusst **nicht** Teil des Repositories (deployment-spezifisch) und muss lokal/auf dem Zielserver bereitgestellt werden:

```js
// public/config.js
window.__ADPKI_CONFIG__ = {
  apiBaseUrl: "http://localhost:8000/api"
};
```

Fehlt die Datei, greift der oben gezeigte Fallback.

> **Hinweis:** `src/env.d.ts` deklariert zusätzlich `VITE_REVERB_*`-Build-Time-Variablen. Diese werden im aktuellen Code nicht mehr referenziert (`import.meta.env` kommt nirgends zum Einsatz) — die Reverb/Broadcasting-Konfiguration wird stattdessen vollständig zur Laufzeit vom Backend bezogen (siehe nächster Abschnitt). Die Typdeklaration ist ein Überbleibsel aus einer früheren Implementierung.

## Echtzeit-Kommunikation (WebSocket)

Live-Updates laufen über [Laravel Echo](https://github.com/laravel/echo) mit [Pusher JS](https://github.com/pusher/pusher-js) als Transport, konfiguriert für den `reverb`-Broadcaster (`src/echo.ts`):

```ts
const cfg = await getReverbConfig()       // GET /config — vom Backend, nicht aus .env

echo = new Echo({
  broadcaster: 'reverb',
  key: cfg.reverb_key,
  wsHost: cfg.reverb_host,
  wsPort: cfg.reverb_port,
  wssPort: cfg.reverb_port,
  forceTLS: cfg.reverb_scheme === 'https',
  enabledTransports: ['ws', 'wss'],
})
```

`App.vue` initialisiert die Verbindung, sobald ein Benutzer eingeloggt ist, und abonniert zwei Channels:

- **`audit-logs`** (`.AuditLogCreated`) — jedes Ereignis wird permissionsbewusst in eine Toast-Benachrichtigung übersetzt (z. B. nur sichtbar für Benutzer mit `certificate.view`) und zusätzlich über den internen Event-Bus (`utils/eventBus.ts`, basierend auf `mitt`) an interessierte Komponenten weitergereicht
- **`system-health`** (`.CaHealthChanged`) — CA-Statusänderungen

Beim Logout wird die Verbindung wieder getrennt (`stopGlobalListener`).

## Internationalisierung (i18n)

Mehrsprachigkeit basiert auf [vue-i18n](https://vue-i18n.intlify.dev/) (`src/i18n/index.ts`):

```ts
export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: localStorage.getItem('locale') || 'de',
  fallbackLocale: 'de',
  messages: { de, en, es, fr, it, tr },
})
```

Unterstützte Sprachen: Deutsch (Standard & Fallback), Englisch, Spanisch, Französisch, Italienisch, Türkisch. Jede Sprachdatei unter `src/locales/*.json` ist strukturell identisch aufgebaut (gleiche Top-Level-Namespaces wie `common`, `login`, `navbar`, `toast`, …).

**Neue Sprache hinzufügen:**
1. Neue Datei `src/locales/<code>.json` anlegen, Struktur einer bestehenden Datei spiegeln
2. In `src/i18n/index.ts` importieren und unter `messages` registrieren

## Branding

Firmenname und Farbschema sind über die UI unter „Einstellungen → Branding“ konfigurierbar (`src/views/production/BrandingView.vue`, persistiert über das Settings-API-Modul). Der Auslieferungs-Standardwert ist `"AD-PKI"`; Theme-Farben werden typisiert über `src/types/theme.ts` verwaltet.

## Build & Entwicklung

```bash
npm install
npm run dev       # Entwicklungsserver (Vite, Hot-Module-Reload)
npm run build      # Produktions-Build nach dist/
npm run preview    # lokale Vorschau des Builds aus dist/
```

Pfad-Alias: `@` zeigt auf `src/` (konfiguriert in `vite.config.ts` und `tsconfig.json`).

Es ist aktuell **kein automatisierter Test-Runner** im Projekt konfiguriert (`package.json` enthält keinen `test`-Skript-Eintrag). Typprüfung erfolgt über `vue-tsc`/TypeScript im strikten Modus.
