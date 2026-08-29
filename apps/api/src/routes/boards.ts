import { FastifyInstance } from 'fastify';
import { prisma } from '../prisma';

export default async function boardsRoutes(server: FastifyInstance) {
  async function requireAuth(req: any, reply: any) {
    try {
      await req.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ error: 'unauthorized' });
    }
  }

  // Get user boards
  server.get('/boards', { preHandler: [requireAuth] }, async (request: any, reply) => {
    const userId = request.user.sub as string;
    try {
      const boards = await prisma.board.findMany({
        where: { members: { some: { id: userId } } },
        include: {
          members: { select: { id: true, name: true, email: true } },
          columns: {
            orderBy: { order: 'asc' },
            include: { cards: { orderBy: { order: 'asc' } } }
          }
        }
      });
      return reply.send(boards);
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ error: 'server error' });
    }
  });

  // Create board
  server.post('/boards', { preHandler: [requireAuth] }, async (request: any, reply) => {
    const userId = request.user.sub as string;
    const { title } = request.body as any;
    if (!title) return reply.status(400).send({ error: 'title required' });
    try {
      const board = await prisma.board.create({
        data: {
          title,
          members: { connect: { id: userId } }
        },
        include: { columns: true, members: true }
      });
      server.io.to('boards').emit('board_created', board);
      return reply.send(board);
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ error: 'server error' });
    }
  });

  // Create column
  server.post('/boards/:boardId/columns', { preHandler: [requireAuth] }, async (request: any, reply) => {
    const { boardId } = request.params as any;
    const { title, order } = request.body as any;
    if (!title) return reply.status(400).send({ error: 'title required' });
    try {
      const column = await prisma.column.create({
        data: {
          title,
          order: typeof order === 'number' ? order : 0,
          board: { connect: { id: boardId } }
        }
      });
      server.io.to(`board:${boardId}`).emit('column_created', column);
      return reply.send(column);
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ error: 'server error' });
    }
  });

  // Update column
  server.put('/columns/:columnId', { preHandler: [requireAuth] }, async (request: any, reply) => {
    const { columnId } = request.params as any;
    const { title, order } = request.body as any;
    try {
      const before = await prisma.column.findUnique({ where: { id: columnId } });
      if (!before) return reply.status(404).send({ error: 'not found' });
      const updated = await prisma.column.update({
        where: { id: columnId },
        data: { title: title ?? before.title, order: typeof order === 'number' ? order : before.order }
      });
      server.io.to(`board:${before.boardId}`).emit('column_updated', updated);
      return reply.send(updated);
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ error: 'server error' });
    }
  });

  // Delete column
  server.delete('/columns/:columnId', { preHandler: [requireAuth] }, async (request: any, reply) => {
    const { columnId } = request.params as any;
    try {
      const before = await prisma.column.findUnique({ where: { id: columnId } });
      if (!before) return reply.status(404).send({ error: 'not found' });
      await prisma.column.delete({ where: { id: columnId } });
      server.io.to(`board:${before.boardId}`).emit('column_deleted', { id: columnId });
      return reply.send({ ok: true });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ error: 'server error' });
    }
  });

  // Create card
  server.post('/columns/:columnId/cards', { preHandler: [requireAuth] }, async (request: any, reply) => {
    const { columnId } = request.params as any;
    const { title, description, order } = request.body as any;
    if (!title) return reply.status(400).send({ error: 'title required' });
    try {
      const column = await prisma.column.findUnique({ where: { id: columnId } });
      if (!column) return reply.status(404).send({ error: 'column not found' });
      const card = await prisma.card.create({
        data: {
          title,
          description: description ?? '',
          order: typeof order === 'number' ? order : 0,
          column: { connect: { id: columnId } }
        }
      });
      server.io.to(`board:${column.boardId}`).emit('card_created', card);
      return reply.send(card);
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ error: 'server error' });
    }
  });

  // Update card
  server.put('/cards/:cardId', { preHandler: [requireAuth] }, async (request: any, reply) => {
    const { cardId } = request.params as any;
    const { title, description, order, columnId } = request.body as any;
    try {
      const before = await prisma.card.findUnique({ where: { id: cardId } });
      if (!before) return reply.status(404).send({ error: 'card not found' });

      const updated = await prisma.card.update({
        where: { id: cardId },
        data: {
          title: title ?? before.title,
          description: description ?? before.description,
          order: typeof order === 'number' ? order : before.order,
          columnId: columnId ?? before.columnId
        }
      });

      const oldColumn = await prisma.column.findUnique({ where: { id: before.columnId } });
      const newColumn = columnId ? await prisma.column.findUnique({ where: { id: columnId } }) : oldColumn;

      if (oldColumn) server.io.to(`board:${oldColumn.boardId}`).emit('card_updated', updated);
      if (newColumn && newColumn.boardId !== oldColumn?.boardId) {
        server.io.to(`board:${newColumn.boardId}`).emit('card_updated', updated);
      }

      return reply.send(updated);
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ error: 'server error' });
    }
  });

  // Delete card
  server.delete('/cards/:cardId', { preHandler: [requireAuth] }, async (request: any, reply) => {
    const { cardId } = request.params as any;
    try {
      const before = await prisma.card.findUnique({ where: { id: cardId } });
      if (!before) return reply.status(404).send({ error: 'not found' });
      const column = await prisma.column.findUnique({ where: { id: before.columnId } });
      await prisma.card.delete({ where: { id: cardId } });
      if (column) server.io.to(`board:${column.boardId}`).emit('card_deleted', { id: cardId });
      return reply.send({ ok: true });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ error: 'server error' });
    }
  });
}