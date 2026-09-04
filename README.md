# Real-time Collaborative Kanban

**Full-stack collaborative Kanban board with authentication, realtime updates, drag-and-drop ordering, and persistent board data.**

Real-time Kanban is a TypeScript full-stack application built around a Next.js frontend and Fastify API. It demonstrates authenticated users, board and card management, Socket.IO realtime communication, optimistic UI updates, persistent data access, and end-to-end browser testing.

> **Local-first portfolio project:** This repository does not currently claim a public hosted deployment. The project is documented for local evaluation so another developer can clone it, install dependencies, start the API and web applications, and inspect the full-stack implementation.

## Features

- User signup and login
- JWT authentication and refresh-token flow
- Protected board routes
- Board creation and listing
- Kanban columns and cards
- Card creation and movement
- Drag-and-drop card reordering
- Batch reorder endpoint for persistent placements
- Optimistic UI updates
- Socket.IO realtime communication
- Realtime board updates
- Fastify backend API
- Prisma/PostgreSQL data layer
- Next.js frontend
- Playwright end-to-end testing

## Architecture

```text
Next.js / React UI
        │
        ├──── HTTP / JWT ────► Fastify API
        │                         │
        │                         ├── Auth
        │                         ├── Boards
        │                         └── Card Reordering
        │                         │
        │                         ▼
        │                     Prisma
        │                         │
        │                         ▼
        │                     PostgreSQL
        │
        └──── Socket.IO ─────► Realtime Events
```

## Languages

- **TypeScript** — frontend and backend application code

> JSX/TSX, Node.js, and CSS are part of the development stack; TypeScript is the primary application language for this repository.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 14, React 18, TypeScript |
| API | Fastify, TypeScript |
| Authentication | JWT, refresh tokens |
| Database | PostgreSQL, Prisma |
| Realtime | Socket.IO |
| HTTP Client | Axios |
| Testing | Playwright / browser E2E |
| Package Manager | pnpm |
| Runtime | Node.js |

## Project Structure

```text
real-time-kanban/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts
│   │   │   │   └── boards.ts
│   │   │   ├── index.ts
│   │   │   └── prisma.ts
│   │   └── tsconfig.json
│   │
│   └── web/
│       ├── pages/
│       │   ├── boards/
│       │   ├── login.tsx
│       │   └── signup.tsx
│       ├── src/
│       │   ├── components/
│       │   ├── hooks/
│       │   └── utils/
│       ├── styles/
│       ├── package.json
│       └── tsconfig.json
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

Install:

- Node.js
- pnpm
- PostgreSQL

Verify:

```bash
node --version
pnpm --version
```

### 1. Clone

```bash
git clone https://github.com/Scarlet-Twinz/real-time-kanban.git
cd real-time-kanban
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure the API

Configure the PostgreSQL connection and JWT settings expected by the API environment.

### 4. Start the API

```bash
pnpm --filter real-time-kanban dev
```

The API runs on the configured local port, with the default development setup using port `4000`.

### 5. Start the web application

In another terminal:

```bash
pnpm --filter web dev
```

The Next.js application runs at:

```text
http://localhost:3000
```

## Realtime Flow

When a user changes a board or card, the frontend communicates with the Fastify API and the realtime layer broadcasts the relevant update to connected clients.

```text
User action
    │
    ▼
Optimistic UI update
    │
    ▼
API request
    │
    ▼
Database persistence
    │
    ▼
Socket.IO event
    │
    ▼
Connected clients update
```

For card movement, the frontend sends a batch of card placements so the new ordering can be persisted consistently rather than issuing an independent request for every card.

## Authentication

The application includes:

- Signup
- Login
- JWT-based authorization
- Refresh-token handling
- Protected board operations

Authentication is implemented as part of the portfolio application's backend/frontend flow and should receive additional hardening before production use, including secure secret management, secure cookie configuration, rate limiting, and comprehensive authorization testing.

## Testing

The repository includes Playwright browser tests for important user flows.

The tests are intended to validate browser-level behavior such as authentication and board interactions rather than only isolated functions.

## Build

Build the API:

```bash
pnpm --filter real-time-kanban build
```

Build the web application:

```bash
pnpm --filter web build
```

If your local workspace uses the root build script, you can also run:

```bash
pnpm build
```

## Current Status

**Status: Functional full-stack portfolio project.**

The repository contains the frontend, backend API, authentication flow, board/card functionality, realtime Socket.IO integration, drag-and-drop ordering, and supporting TypeScript configuration.

There is currently no public hosted URL. The intended evaluation path is local execution from the repository.

## Engineering Focus

This project demonstrates:

- Full-stack TypeScript development
- REST API design with Fastify
- Authentication and protected routes
- Persistent relational data access
- Realtime application communication with Socket.IO
- Optimistic frontend state updates
- Batch persistence for drag-and-drop ordering
- Browser-level E2E testing
- Separation between frontend and backend application concerns

## Security Notes

Never commit:

- Database passwords
- JWT secrets
- Refresh tokens
- `.env` files
- Production credentials

Use local environment variables for secrets and development configuration.

## Author

**Anthony Emmanuella Mmasinachi**

Full-stack developer focused on frontend engineering, backend systems, APIs, realtime applications, automation, databases, and practical software architecture.

**GitHub:** https://github.com/Scarlet-Twinz
