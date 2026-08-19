# CollabBoard — Real-Time Collaborative Whiteboard

A production-quality collaborative workspace built with **Vue 3 + TypeScript**, **ASP.NET Core 10**, **SignalR**, **Yjs (CRDT)**, and deployed to **Azure** via **Docker + GitHub Actions**.

## Architecture

```
Vue 3 (Konva canvas + Pinia + Yjs)
        ↕ WebSocket (SignalR)
ASP.NET Core 10 (SignalR Hub — pure relay)
        ↕ Azure SignalR Service (managed, auto-scales)
Azure SQL (board metadata + Yjs snapshots)
Azure Container Registry → Azure App Service (Linux containers)
```

## Features

- 🖊 **Freehand drawing** — smooth Konva v-line paths with configurable color + stroke
- 🗒 **Sticky cards** — drag, resize, double-click to edit text, delete
- 👥 **Live cursors** — see remote user cursors with name labels in real-time
- 🔴 **Presence avatars** — online user indicators in the toolbar
- ↩ **Undo/Redo** — powered by Yjs `UndoManager`
- 🔌 **Auto-reconnect** — SignalR automatic reconnect with exponential backoff
- 🔒 **JWT auth** — register/login with secure JWT tokens
- 💾 **Persistent boards** — Yjs snapshots saved to Azure SQL every 30 seconds

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vue 3, TypeScript, Vite 5, Pinia |
| Canvas | Konva.js via vue-konva |
| Real-time sync | Yjs (CRDT), @microsoft/signalr |
| Backend | ASP.NET Core 10, SignalR Hub |
| Auth | ASP.NET Core Identity + JWT |
| Database | Entity Framework Core 9 + Azure SQL |
| Cloud | Azure App Service, Azure SignalR Service, Azure Container Registry |
| CI/CD | GitHub Actions — OIDC auth, Docker Buildx, Cypress E2E |

## Local Development

### Prerequisites
- Docker Desktop
- .NET 10 SDK
- Node 20+

### Quick Start

```bash
# 1. Clone and enter the project
git clone <repo-url>
cd collaborative-whiteboard

# 2. Start SQL Server + API + frontend (hot-reload)
docker-compose up

# 3. Open http://localhost:5173
```

### Running separately (without Docker)

```bash
# Terminal 1 — Backend
cd backend/CollabWhiteboard.API
dotnet run

# Terminal 2 — Frontend
cd frontend/collab-whiteboard-ui
npm install --legacy-peer-deps
npm run dev
```

## Testing

```bash
# Backend unit tests
cd backend
dotnet test

# Frontend unit tests
cd frontend/collab-whiteboard-ui
npm run test:unit

# Cypress E2E (requires backend + frontend running)
npx cypress open
# or headless:
npx cypress run --e2e
```

## Azure Deployment

### 1. Provision Azure Resources

```bash
# Variables
RG=collab-whiteboard-rg
LOCATION=eastus
ACR_NAME=collabwhiteboardacr
SQL_SERVER=collabwhiteboard-sql
SIGNALR_NAME=collabwhiteboard-signalr
APP_NAME=collabwhiteboard-app

# Resource Group
az group create --name $RG --location $LOCATION

# Container Registry
az acr create --resource-group $RG --name $ACR_NAME --sku Basic

# Azure SQL
az sql server create --name $SQL_SERVER --resource-group $RG \
  --location $LOCATION --admin-user sqladmin --admin-password <strong-password>
az sql db create --resource-group $RG --server $SQL_SERVER \
  --name CollabWhiteboard --service-objective S1

# Azure SignalR Service
az signalr create --name $SIGNALR_NAME --resource-group $RG \
  --sku Standard_S1 --service-mode Default

# App Service Plan (Linux containers)
az appservice plan create --name $APP_NAME-plan --resource-group $RG \
  --is-linux --sku P1V3

# Web App for Containers
az webapp create --resource-group $RG --plan $APP_NAME-plan \
  --name $APP_NAME --deployment-container-image-name nginx
```

### 2. Configure GitHub Secrets

| Secret | Description |
|---|---|
| `AZURE_CLIENT_ID` | OIDC app registration |
| `AZURE_TENANT_ID` | Azure tenant |
| `AZURE_SUBSCRIPTION_ID` | Subscription |
| `ACR_NAME` | Registry name (without .azurecr.io) |
| `ACR_LOGIN_SERVER` | e.g. `collabwhiteboardacr.azurecr.io` |
| `AZURE_WEBAPP_NAME` | App Service name |
| `CYPRESS_USER_A_EMAIL` | E2E test user A email |
| `CYPRESS_USER_A_PASSWORD` | E2E test user A password |
| `CYPRESS_USER_B_EMAIL` | E2E test user B email |
| `CYPRESS_USER_B_PASSWORD` | E2E test user B password |

### 3. Configure App Service Environment Variables

Set these in Azure Portal → App Service → Configuration → Application Settings:

```
ConnectionStrings__DefaultConnection   = <azure-sql-connection-string>
ConnectionStrings__AzureSignalR        = <azure-signalr-connection-string>
Jwt__Key                               = <strong-random-32+-char-secret>
Jwt__Issuer                            = CollabWhiteboard
Jwt__Audience                          = CollabWhiteboardUsers
Cors__AllowedOrigins__0                = https://<your-app>.azurewebsites.net
```

### 4. Push to main → triggers GitHub Actions deploy automatically

## Project Structure

```
collaborative-whiteboard/
├── backend/
│   ├── CollabWhiteboard.API/
│   │   ├── Controllers/      AuthController, BoardsController
│   │   ├── Hubs/             WhiteboardHub (SignalR)
│   │   ├── Models/           ApplicationUser, Board, BoardMember
│   │   ├── Data/             AppDbContext (EF Core)
│   │   ├── DTOs/             Request/Response contracts
│   │   └── Program.cs        Full DI, JWT, SignalR, CORS setup
│   └── CollabWhiteboard.Tests/
│       └── BoardsServiceTests.cs
├── frontend/
│   └── collab-whiteboard-ui/
│       ├── src/
│       │   ├── components/canvas/   WhiteboardCanvas, StickyCard, DrawLayer, CursorLayer
│       │   ├── components/ui/       Toolbar, PresenceAvatars
│       │   ├── composables/         useCollaboration (Yjs ↔ SignalR bridge)
│       │   ├── stores/              whiteboardStore (Yjs), authStore, presenceStore
│       │   ├── services/            signalrService, apiService
│       │   ├── views/               LoginView, BoardsView, WhiteboardView
│       │   └── types/               whiteboard.ts
│       └── cypress/e2e/             whiteboard.cy.ts
├── .github/workflows/
│   ├── ci.yml               Build + test on every push
│   └── deploy.yml           Docker build → ACR → App Service on main
├── Dockerfile               Multi-stage (Node 20 + .NET 9 Alpine)
└── docker-compose.yml       Local dev (SQL Server + API + Vite)
```
