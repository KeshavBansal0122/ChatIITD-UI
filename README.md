# ChatIITD Frontend

React + TypeScript frontend for the IITD Chat Agent system with DevClub OAuth authentication.

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your values (see Environment Variables below).

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

## Docker Setup

Requires the backend stack running at `http://localhost:8000` (see `backend/docker-compose.yml`).

```bash
cp .env.example .env   # set VITE_DEVCLUB_CLIENT_ID and URLs
docker compose up --build
```

- SPA: `http://localhost:3000`
- `VITE_*` values are **build args** — change them in `.env` / Compose and rebuild (`docker compose up --build`)

## Environment Variables

```bash
# Backend API URL (REQUIRED)
VITE_BACKEND_URL=http://localhost:8000

# Frontend URL — used for OAuth redirect (REQUIRED)
# Local Vite: http://localhost:5173  |  Docker: http://localhost:3000
VITE_FRONTEND_URL=http://localhost:5173

# DevClub OAuth (REQUIRED)
VITE_DEVCLUB_CLIENT_ID=your_client_id_here
VITE_DEVCLUB_OAUTH_BASE_URL=https://oauth.devclub.in

# Bypass authentication for demos/presentations
VITE_DEMO_MODE=false
```

## Project Structure

```
src/
├── components/
│   ├── ChatInterface.tsx  # Chat message display and input
│   ├── ChatSidebar.tsx    # Chat list / session management
│   └── Login.tsx          # Authentication UI
├── contexts/
│   └── AuthContext.tsx    # Authentication state management
├── hooks/
│   ├── index.ts           # Hook exports
│   └── useChatWebSocket.ts # WebSocket hook for real-time chat
├── pages/
│   ├── CallbackPage.tsx   # OAuth callback handler
│   ├── ChatPage.tsx       # Main chat view
│   ├── LoginPage.tsx      # Login view
│   ├── ProfilePage.tsx    # User profile view
│   └── index.ts           # Page exports
├── services/
│   └── api.ts             # API service layer
├── App.tsx                # Root component and routing
├── index.css              # Global styles
└── main.tsx               # App entry point
```

## Available Scripts

| Script | Description |
| ------ | ----------- |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |

## Backend API Endpoints Used

| Endpoint | Description |
| -------- | ----------- |
| `GET /auth/signin-url` | Get DevClub OAuth signin URL |
| `POST /auth/callback` | Exchange code/state for JWT |
| `GET /chats` | List user chats |
| `POST /chats/new` | Create chat with first message |
| `POST /chats/{id}/messages` | Send message |
| `GET /chats/{id}/messages` | Get chat history |

Requires backend running at `VITE_BACKEND_URL` with DevClub OAuth configured. See `backend/README.md`.

## Production Deployment

1. Build the app (or use Docker Compose above):
   ```bash
   npm run build
   ```

2. Update environment variables before build:
   - `VITE_BACKEND_URL` → production backend URL
   - `VITE_FRONTEND_URL` → production frontend origin (OAuth redirect base)
   - Ensure DevClub OAuth is registered for production URLs

3. Deploy the `dist/` folder to your static hosting provider. Configure the host for SPA routing (all paths → `index.html`). Docker Compose uses `nginx.conf` for this.

## Demo Mode

To bypass OAuth for presentations:
```bash
VITE_DEMO_MODE=true
```
