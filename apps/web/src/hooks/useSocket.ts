import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function initSocket(token?: string) {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', {
      transports: ['websocket'],
      auth: { token },
    });
  }
  return socket;
}

export function joinBoard(boardId: string) {
  if (!socket) return;
  socket.emit('join_board', boardId);
}

export function leaveBoard(boardId: string) {
  if (!socket) return;
  socket.emit('leave_board', boardId);
}

export function getSocket() {
  return socket;
}