import '@fastify/jwt';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; type: 'access' | 'refresh' };
    user: { sub: string; type: 'access' | 'refresh' };
  }
}