import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import authRoutes from './routes/auth';
import boardsRoutes from './routes/boards';

const server = Fastify({ logger: true });

server.register(jwt, { secret: process.env.JWT_SECRET || 'dev-secret' });

server.register(require('@fastify/socket.io'), {
  cors: {
    origin: '*'
  }
});

server.get('/health', async () => ({ status: 'ok' }));

server.register(authRoutes);
server.register(boardsRoutes);

server.ready().then(() => {
  server.io.on('connection', (socket: any) => {
    server.log.info(`socket connected: ${socket.id}`);

    socket.on('join_board', (boardId: string) => {
      socket.join(`board:${boardId}`);
      server.log.info(`socket ${socket.id} joined board:${boardId}`);
    });

    socket.on('leave_board', (boardId: string) => {
      socket.leave(`board:${boardId}`);
      server.log.info(`socket ${socket.id} left board:${boardId}`);
    });
  });
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 4000;
    await server.listen({ port, host: '0.0.0.0' });
    server.log.info(`API listening on ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();