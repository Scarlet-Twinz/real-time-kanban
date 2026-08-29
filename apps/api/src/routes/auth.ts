import { FastifyInstance } from 'fastify';
import { prisma } from '../prisma';
import bcrypt from 'bcryptjs';
import { isValidPhoneNumber } from 'libphonenumber-js';

type RegisterBody = { email?: string; phone?: string; password?: string };
type LoginBody = { email?: string; phone?: string; password?: string };

export default async function authRoutes(server: FastifyInstance) {
  function signAccessToken(userId: string) {
    return server.jwt.sign({ sub: userId, type: 'access' }, { expiresIn: '15m' });
  }

  function signRefreshToken(userId: string) {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'refresh-secret';
    return server.jwt.sign({ sub: userId, type: 'refresh' }, { expiresIn: '7d', secret });
  }

  server.post('/auth/register', async (request, reply) => {
    const body = request.body as RegisterBody;
    const { email, phone, password } = body || {};

    if (!email && !phone) {
      return reply.status(400).send({ error: 'email or phone is required' });
    }
    if (phone && !isValidPhoneNumber(phone)) {
      return reply.status(400).send({ error: 'invalid phone number' });
    }
    if (!password || password.length < 6) {
      return reply.status(400).send({ error: 'password required (min 6 chars)' });
    }

    try {
      if (email) {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) return reply.status(409).send({ error: 'email already in use' });
      }

      const hashed = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { email, phone, password: hashed },
      });

      const accessToken = signAccessToken(user.id);
      const refreshToken = signRefreshToken(user.id);

      return reply.send({ accessToken, refreshToken, user: { id: user.id, email: user.email, phone: user.phone } });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ error: 'server error' });
    }
  });

  server.post('/auth/login', async (request, reply) => {
    const body = request.body as LoginBody;
    const { email, phone, password } = body || {};

    if ((!email && !phone) || !password) {
      return reply.status(400).send({ error: 'email/phone and password required' });
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

      return reply.send({ accessToken, refreshToken, user: { id: user.id, email: user.email, phone: user.phone } });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ error: 'server error' });
    }
  });
}