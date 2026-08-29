import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import authRoutes from './routes/auth';

const server = Fastify({ logger: true });

server.register(jwt, { secret: process.env.JWT_SECRET || 'dev-secret' });

server.get('/health', async () => ({ status: 'ok' }));
server.register(authRoutes);

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