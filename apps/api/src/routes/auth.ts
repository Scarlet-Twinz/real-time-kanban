import { FastifyInstance } from 'fastify';
import { prisma } from '../prisma';
import bcrypt from 'bcryptjs';
import { isValidPhoneNumber } from 'libphonenumber-js';

type RegisterBody = { email?: string; phone?: string; password?: string; name?: string };
type LoginBody = { email?: string; phone?: string; password?: string };

export default async function authRoutes(server: FastifyInstance) {
  function signAccessToken(userId: string) {
    return server.jwt.sign({ sub: userId, type: 'access' }, { expiresIn: '15m' });
  }

  function signRefreshToken(userId: string) {
    return server.jwt.sign({ sub: userId, type: 'refresh' }, { expiresIn: '7d' });
  }

  // Register
  server.post('/auth/register', async (request, reply) => {
    const body = request.body as RegisterBody;
    const { email, phone, password, name } = body || {};

    if (!email && !phone) {
      return reply.status(400).send({ error: 'email or phone is required' });
    }
    if (!name || typeof name !== 'string') {
      return reply.status(400).send({ error: 'name is required' });
    }
    if (phone && !isValidPhoneNumber(phone)) {
      return reply.status(400).send({ error: 'invalid phone number (include country code, e.g. +44...)' });
    }
    if (!password || password.length < 6) {
      return reply.status(400).send({ error: 'password required (min 6 chars) for this demo' });
    }

    try {
      if (email) {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) return reply.status(409).send({ error: 'email already in use' });
      }
      if (phone) {
        const existing = await prisma.user.findUnique({ where: { phone } });
        if (existing) return reply.status(409).send({ error: 'phone already in use' });
      }

      const hashed = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { email: email || '', phone, password: hashed, name },
      });

      const accessToken = signAccessToken(user.id);
      const refreshToken = signRefreshToken(user.id);

      return reply.send({
        accessToken,
        refreshToken,
        user: { id: user.id, email: user.email, phone: user.phone, name: user.name },
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ error: 'server error' });
    }
  });

  // Login
  server.post('/auth/login', async (request, reply) => {
    const body = request.body as LoginBody;
    const { email, phone, password } = body || {};

    if ((!email && !phone) || !password) {
      return reply.status(400).send({ error: 'email or phone and password required' });
    }

    try {
      const user =
        (email && (await prisma.user.findUnique({ where: { email } }))) ||
        (phone && (await prisma.user.findUnique({ where: { phone } })));

      if (!user || !user.password) return reply.status(401).send({ error: 'invalid credentials' });

      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return reply.status(401).send({ error: 'invalid credentials' });

      const accessToken = signAccessToken(user.id);
      const refreshToken = signRefreshToken(user.id);

      return reply.send({
        accessToken,
        refreshToken,
        user: { id: user.id, email: user.email, phone: user.phone, name: user.name },
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ error: 'server error' });
    }
  });

  // Refresh token
  server.post('/auth/refresh', async (request, reply) => {
    const body = request.body as any;
    const { refreshToken } = body || {};
    if (!refreshToken) return reply.status(400).send({ error: 'refreshToken required' });

    try {
      let payload: any;
      try {
        payload = server.jwt.verify(refreshToken);
      } catch (err) {
        return reply.status(401).send({ error: 'invalid refresh token' });
      }
      if (payload.type !== 'refresh') return reply.status(401).send({ error: 'invalid token type' });

      const userId = payload.sub as string;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return reply.status(404).send({ error: 'user not found' });

      const accessToken = signAccessToken(userId);
      const newRefresh = signRefreshToken(userId);
      return reply.send({ accessToken, refreshToken: newRefresh });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ error: 'server error' });
    }
  });

  // Protected profile - /me
  server.get(
    '/me',
    {
      preHandler: [
        async (req, reply) => {
          try {
            await (req as any).jwtVerify();
          } catch (e) {
            return reply.status(401).send({ error: 'unauthorized' });
          }
        },
      ],
    },
    async (request, reply) => {
      const req: any = request;
      const userId = req.user?.sub as string;
      if (!userId) return reply.status(401).send({ error: 'unauthorized' });

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return reply.status(404).send({ error: 'not found' });
      return reply.send({ id: user.id, email: user.email, phone: user.phone, name: user.name });
    }
  );
}