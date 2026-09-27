# Real-time Collaborative Kanban

**Full-stack collaborative Kanban board with authentication, optimistic updates, realtime synchronization, and persistent ordering.**

This project explores the engineering behind a responsive collaborative board: the UI reacts immediately, the API persists the authoritative state, and Socket.IO propagates the resulting change to connected clients.

## Interaction Flow

```text
User drag/drop
      │
      ▼
Optimistic UI update
      │
      ▼
Fastify API
      │
      ▼
Prisma / PostgreSQL
      │
      ▼
Socket.IO broadcast
      │
      ▼
Connected clients
```

Card movement uses a batch reorder operation so the persisted board ordering is updated as a coherent set rather than issuing one request per card.

## Features

- User signup/login
- JWT authentication and refresh-token flow
- Protected board routes
- Board creation/listing
- Kanban columns and cards
- Drag-and-drop card movement
- Persistent card ordering
- Batch reorder endpoint
- Optimistic UI updates
- Socket.IO realtime events
- Fastify backend
- Prisma/PostgreSQL persistence
- Next.js frontend
- Playwright browser testing

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 14, React 18, TypeScript |
| API | Fastify, TypeScript |
| Auth | JWT, refresh tokens |
| Database | PostgreSQL, Prisma |
| Realtime | Socket.IO |
| HTTP | Axios |
| Testing | Playwright |
| Runtime | Node.js |
| Workspace | pnpm |

## Repository Structure

```text
real-time-kanban/
├── apps/
│   ├── api/
│   │   └── src/routes/
│   └── web/
│       ├── pages/
│       ├── src/components/
│       ├── src/hooks/
│       └── src/utils/
├── package.json
└── README.md
```

## Getting Started

Prerequisites:

- Node.js
- pnpm
- PostgreSQL

```bash
git clone https://github.com/Scarlet-Twinz/real-time-kanban.git
cd real-time-kanban
pnpm install
```

Configure the PostgreSQL connection and JWT settings required by the API, then run the API and web application in separate terminals using the repository's package scripts.

The default development web application runs at `http://localhost:3000`; the API uses the configured development port, normally `4000`.

## Testing

The repository includes Playwright browser tests for authentication and board interactions. The tests exercise browser-level behavior rather than only isolated functions.

## Current Status

**Functional full-stack application.**

The repository contains the frontend, backend API, authentication flow, board/card operations, realtime synchronization, drag-and-drop ordering, and E2E testing support.

There is no public hosted URL; the intended usage is local development.

## Production Hardening

Before production use, authentication and infrastructure would need additional controls including secure secret management, secure cookie configuration, authorization testing, rate limiting, TLS, and stronger session handling.

## Engineering Focus

This project demonstrates full-stack TypeScript, REST API design, relational persistence, realtime communication, optimistic state updates, batch persistence, and browser-level testing.

## License

MIT


The README is intended to make the realtime architecture, local setup, and engineering trade-offs clear before someone opens the source.


The README is intended to make the realtime architecture, local setup, and engineering trade-offs clear before someone opens the source.

## Author

**Anthony Emmanuella Mmasinachi**

Full-stack and systems engineer focused on application architecture, backend systems, realtime systems, databases, distributed processing, networking, and AI integration.
