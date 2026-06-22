# AD-PKI Frontend

> A web interface for managing an internal public key infrastructure (PKI), including certificates, certificate authorities, ACME, users, and audit logs.

[![Vue 3](https://img.shields.io/badge/Vue-3-42b883)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Build-Vite-646cff)](https://vitejs.dev/)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)

**English** · [Deutsch](README.de.md)

## Overview

AD-PKI Frontend is the user interface for a self-hosted PKI solution. It is designed as a pure UI layer: business logic, authorization checks, and certificate generation run entirely in the backend. The frontend consumes only its REST API and WebSocket events.

The application requires a compatible backend API with REST endpoints for certificates, CAs, users, settings, and ACME, as well as broadcasting support. The backend itself is not part of this repository.

## Screenshots

### Dashboard

![Dashboard](docs/screenshots/Dashboard.png)

Central overview of certificates, CA status, and system information.

### Certificate overview

![Certificate overview](docs/screenshots/Zertifikatsuebersicht.png)

Manage, search, and review all issued certificates.

### ACME

![ACME](docs/screenshots/ACME.png)

Manage ACME settings, accounts, and automated certificate issuance.

## Features

- **Certificate management** — Create, view, download, and revoke TLS, client, and code-signing certificates
- **Certificate requests** — Request and approval workflow for certificates
- **CA management** — Manage root and intermediate CAs
- **ACME support** — View and manage ACME accounts, domains, and the directory URL
- **PKI infrastructure** — Centrally configure CRL, OCSP, TSA, and ACME URLs from a base URL
- **Users, teams, and roles (RBAC)** — Fine-grained permissions that control navigation and routing
- **Audit logs** — Searchable records of security-relevant actions
- **Real-time notifications** — Live toasts for certificate events, CA health changes, and more via WebSocket
- **Notification channels** — Configure webhook and bot notifications
- **Branding** — Customizable company name and color scheme
- **Internationalization** — German, English, French, Italian, Spanish, and Turkish
- **Security and ACL settings**, system status overview, and user profile

## Architecture

```text
Vue 3 frontend  →  Backend API  →  Certificate authority service
  (this repo)       (REST/WS)          (crypto engine)
```

The frontend is responsible only for presentation and interaction. Authentication against the backend API is token-based. Real-time updates, such as audit events and CA health changes, are received via WebSocket broadcasting.

For a detailed technical description, see [`docs/FRONTEND.md`](docs/FRONTEND.md).

## Tech stack

| Area | Technology |
| --- | --- |
| Framework | [Vue 3](https://vuejs.org/) (Composition API, `<script setup>`) |
| Language | TypeScript (strict mode) |
| Build tool | [Vite](https://vitejs.dev/) |
| Routing | [Vue Router](https://router.vuejs.org/) |
| Internationalization | [vue-i18n](https://vue-i18n.intlify.dev/) |
| HTTP client | [Axios](https://axios-http.com/) |
| Real-time / WebSocket | [Laravel Echo](https://github.com/laravel/echo) and [Pusher JS](https://github.com/pusher/pusher-js) (broadcasting client) |
| Event bus | [mitt](https://github.com/developit/mitt) |
| State management | Custom reactive stores based on the Vue Reactivity API (no external state-management framework) |

## Getting started

### Prerequisites

- Node.js (the current LTS version is recommended) and npm
- An accessible backend API that provides the endpoint structure expected by this frontend

### Installation

```bash
git clone https://github.com/alid-it/AD-PKI-Frontend.git
cd AD-PKI-Frontend
npm install
```

### Configuration

The API base URL is configured at runtime through `public/config.js`, not through build-time variables. Create `public/config.js` with the following content:

```js
window.__ADPKI_CONFIG__ = {
  apiBaseUrl: "http://localhost:8000/api"
};
```

If the file is missing, the application falls back to `http://localhost:8000/api`. See [`docs/FRONTEND.md`](docs/FRONTEND.md#runtime-konfiguration) for details and background information.

### Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server with hot reload |
| `npm run build` | Create a production build in `dist/` |
| `npm run preview` | Preview the production build locally |

## Project structure

```text
src/
├── api/            # One Axios-based module per backend resource
├── components/     # UI components (auth, common, layout, production)
├── views/          # Route-level views (auth, production)
├── router/         # Vue Router configuration with auth and permission guards
├── stores/         # Lightweight reactive stores (auth, toasts)
├── i18n/, locales/ # Internationalization
├── types/          # TypeScript type definitions
├── utils/          # Utilities (auth, permissions, event bus, i18n error mapping)
└── echo.ts         # WebSocket/broadcasting client
```

## Contributing

Issues and pull requests are welcome. Describe changes clearly and follow the existing code style: strict TypeScript and the Composition API with `<script setup>`.

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**. See [LICENSE](LICENSE) for the full license text.