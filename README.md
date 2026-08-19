# Collaborative Whiteboard — Frontend

A real-time, multi-user collaborative whiteboard application built with **Vue 3**, **Vite**, and **Yjs**.

This frontend provides an infinite canvas where multiple users can draw, add sticky notes, and see each other's cursors moving in real-time. It uses **SignalR** as the WebSocket transport layer to synchronize **Yjs** (CRDT) binary data between clients, ensuring conflict-free collaboration.

---

## ✨ Features

- **Real-time Sync**: Instant updates across all connected clients with zero conflict.
- **Live Cursors**: See where other users are pointing and moving in real-time.
- **Drawing Tool**: Freehand drawing with customizable colors and smooth SVG/Canvas rendering via Konva.
- **Sticky Notes**: Add, move, and edit text cards on the board.
- **Offline Tolerance**: Yjs allows for offline edits that automatically merge cleanly when the connection drops and restores.
- **JWT Authentication**: Secure API and WebSocket handshakes.

## 🛠️ Tech Stack

- **Framework**: [Vue 3](https://vuejs.org/) (Composition API & `<script setup>`)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Language**: TypeScript
- **Canvas Engine**: [Konva](https://konvajs.org/) / `vue-konva`
- **Collaboration / CRDT**: [Yjs](https://yjs.dev/)
- **WebSocket Transport**: `@microsoft/signalr`
- **State Management**: Pinia (Custom Stores)
- **HTTP Client**: Axios

---

## 🏗️ Architecture: How Sync Works

Unlike traditional apps where state lives exclusively on the server, this app uses a **Distributed State** model:

1. **Yjs (CRDT)**: The source of truth for the whiteboard lives inside a Yjs Document (`Y.Doc`) in the browser memory.
2. **SignalR Transport**: When a user draws a line, Yjs generates a tiny, highly-compressed binary "diff". We pass this binary diff to `signalrService`, which broadcasts it to all other users in the room.
3. **Merging**: When remote users receive the binary diff, they apply it to their local `Y.Doc`. Yjs mathematically guarantees that everyone's boards will look exactly the same, regardless of the order in which updates arrive or if network latency occurs.
4. **Vue Reactivity**: A custom `whiteboardStore` listens to Yjs updates and mirrors the Yjs Maps/Arrays into Vue `ref`s, triggering the UI (Konva) to re-render.

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or v20+)
- The ASP.NET Core Backend API running locally (defaults to `http://localhost:5000`)

### 1. Install Dependencies
Because of some specific package dependencies (like Vue-Konva and Yjs), we use the `--legacy-peer-deps` flag to ensure a smooth installation.

```bash
npm install --legacy-peer-deps
```

### 2. Environment Variables
By default, the Vite dev server uses a proxy to route `/api` and `/hubs` traffic to `http://localhost:5000`. 
If your backend is running on a different port, you can create a `.env.development` file:

```env
VITE_API_URL=http://localhost:5000
```

### 3. Run the Development Server
```bash
npm run dev
```
The app will be available at `http://localhost:5173`.

---

## 📂 Project Structure

```text
src/
├── assets/          # Global CSS, images, and static assets
├── components/      
│   ├── canvas/      # Konva canvas components (DrawLayer, WhiteboardCanvas)
│   └── common/      # Reusable UI components (Modals, Buttons)
├── composables/     
│   └── useCollaboration.ts # Binds Yjs, SignalR, and the Vue Store together
├── router/          # Vue Router configuration
├── services/        
│   ├── apiService.ts       # Axios REST client
│   └── signalrService.ts   # WebSocket connection manager
├── stores/          
│   ├── authStore.ts        # JWT and user session state
│   └── whiteboardStore.ts  # Yjs document manager & Vue reactive state
├── types/           
│   └── whiteboard.ts       # Shared TypeScript interfaces
├── views/           # Page-level components (Login, Board List, Active Board)
└── main.ts          # App entry point
```

---

## 📦 Production Build

To build the app for production:

```bash
# 1. Type-check the codebase
npm run type-check

# 2. Compile and minify for production
npm run build
```

The optimized static assets will be output to the `/dist` directory, ready to be hosted on Azure Static Web Apps, AWS S3, Vercel, or served directly from the ASP.NET Core `wwwroot` folder.
