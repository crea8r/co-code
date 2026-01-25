/**
 * WebSocket Handler
 *
 * Handles real-time communication for chat and presence.
 */

import type { FastifyInstance } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import type {
  ClientEvent,
  ServerEvent,
  Message,
  EntityType,
  PresenceStatus,
} from '@co-code/shared';
import * as channelsService from '../channels/service.js';
import * as authService from '../auth/service.js';

interface Connection {
  socket: WebSocket;
  entityId: string;
  entityType: EntityType;
  channels: Set<string>;
}

// Active connections
const connections = new Map<WebSocket, Connection>();
// Entity to connection mapping
const entityConnections = new Map<string, Connection>();
// Channel rooms
const channelRooms = new Map<string, Set<WebSocket>>();

/**
 * Register WebSocket routes
 */
export function registerWebSocketHandler(app: FastifyInstance): void {
  app.get('/ws', { websocket: true }, (socket, req) => {
    console.log('New WebSocket connection');

    socket.on('message', async (data) => {
      try {
        const event = JSON.parse(data.toString()) as ClientEvent;
        await handleClientEvent(socket, event);
      } catch (error) {
        console.error('Error handling message:', error);
        sendEvent(socket, {
          type: 'error',
          code: 'INVALID_MESSAGE',
          message: 'Failed to parse message',
          timestamp: Date.now(),
        });
      }
    });

    socket.on('close', () => {
      handleDisconnect(socket);
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      handleDisconnect(socket);
    });
  });
}

/**
 * Handle client event
 */
async function handleClientEvent(
  socket: WebSocket,
  event: ClientEvent
): Promise<void> {
  switch (event.type) {
    case 'authenticate':
      await handleAuthenticate(socket, event.token);
      break;

    case 'join_channel':
      await handleJoinChannel(socket, event.channelId);
      break;

    case 'leave_channel':
      await handleLeaveChannel(socket, event.channelId);
      break;

    case 'send_message':
      await handleSendMessage(socket, event.channelId, event.content);
      break;

    case 'typing':
      await handleTyping(socket, event.channelId);
      break;

    case 'set_status':
      await handleSetStatus(socket, event.status);
      break;
  }
}

/**
 * Handle authentication
 */
async function handleAuthenticate(
  socket: WebSocket,
  token: string
): Promise<void> {
  try {
    // Verify JWT (simplified - in real app, use fastify-jwt verify)
    const payload = decodeJWT(token);
    if (!payload) {
      sendEvent(socket, {
        type: 'authenticated',
        success: false,
        error: 'Invalid token',
        timestamp: Date.now(),
      });
      return;
    }

    // Verify entity exists
    if (payload.type === 'user') {
      const user = await authService.getUserById(payload.sub);
      if (!user) {
        sendEvent(socket, {
          type: 'authenticated',
          success: false,
          error: 'User not found',
          timestamp: Date.now(),
        });
        return;
      }
    } else {
      const agent = await authService.getAgentById(payload.sub);
      if (!agent) {
        sendEvent(socket, {
          type: 'authenticated',
          success: false,
          error: 'Agent not found',
          timestamp: Date.now(),
        });
        return;
      }
      // Update agent status
      await authService.updateAgentStatus(payload.sub, 'online');
    }

    // Create connection
    const connection: Connection = {
      socket,
      entityId: payload.sub,
      entityType: payload.type,
      channels: new Set(),
    };

    connections.set(socket, connection);
    entityConnections.set(payload.sub, connection);

    // Send success
    sendEvent(socket, {
      type: 'authenticated',
      success: true,
      entityId: payload.sub,
      entityType: payload.type,
      timestamp: Date.now(),
    });

    // Broadcast presence
    broadcastPresence(payload.sub, payload.type, 'online');
  } catch (error) {
    console.error('Auth error:', error);
    sendEvent(socket, {
      type: 'authenticated',
      success: false,
      error: 'Authentication failed',
      timestamp: Date.now(),
    });
  }
}

/**
 * Handle join channel
 */
async function handleJoinChannel(
  socket: WebSocket,
  channelId: string
): Promise<void> {
  const connection = connections.get(socket);
  if (!connection) {
    sendEvent(socket, {
      type: 'error',
      code: 'NOT_AUTHENTICATED',
      message: 'Not authenticated',
      timestamp: Date.now(),
    });
    return;
  }

  // Check if member
  const isMember = await channelsService.isChannelMember(
    channelId,
    connection.entityId,
    connection.entityType
  );

  if (!isMember) {
    // Auto-join for now (can be changed to require invitation)
    await channelsService.addChannelMember(
      channelId,
      connection.entityId,
      connection.entityType
    );
  }

  // Add to room
  let room = channelRooms.get(channelId);
  if (!room) {
    room = new Set();
    channelRooms.set(channelId, room);
  }
  room.add(socket);
  connection.channels.add(channelId);

  // Get channel details
  const channel = await channelsService.getChannelById(channelId);
  if (channel) {
    sendEvent(socket, {
      type: 'channel_joined',
      channel,
      timestamp: Date.now(),
    });
  }
}

/**
 * Handle leave channel
 */
async function handleLeaveChannel(
  socket: WebSocket,
  channelId: string
): Promise<void> {
  const connection = connections.get(socket);
  if (!connection) return;

  const room = channelRooms.get(channelId);
  if (room) {
    room.delete(socket);
    if (room.size === 0) {
      channelRooms.delete(channelId);
    }
  }
  connection.channels.delete(channelId);
}

/**
 * Handle send message
 */
async function handleSendMessage(
  socket: WebSocket,
  channelId: string,
  content: Message['content']
): Promise<void> {
  const connection = connections.get(socket);
  if (!connection) {
    sendEvent(socket, {
      type: 'error',
      code: 'NOT_AUTHENTICATED',
      message: 'Not authenticated',
      timestamp: Date.now(),
    });
    return;
  }

  // Create message
  const message = await channelsService.createMessage(
    channelId,
    connection.entityId,
    connection.entityType,
    content
  );

  // Broadcast to room
  const room = channelRooms.get(channelId);
  if (room) {
    const event: ServerEvent = {
      type: 'new_message',
      message: {
        id: message.id,
        channelId: message.channelId,
        senderId: message.senderId,
        senderType: message.senderType,
        content: message.content,
        createdAt: typeof message.createdAt === 'object'
          ? (message.createdAt as Date).getTime()
          : message.createdAt,
        editedAt: null,
      },
      timestamp: Date.now(),
    };

    for (const client of room) {
      sendEvent(client, event);
    }
  }
}

/**
 * Handle typing indicator
 */
async function handleTyping(socket: WebSocket, channelId: string): Promise<void> {
  const connection = connections.get(socket);
  if (!connection) return;

  const room = channelRooms.get(channelId);
  if (room) {
    const event: ServerEvent = {
      type: 'member_typing',
      channelId,
      entityId: connection.entityId,
      entityType: connection.entityType,
      timestamp: Date.now(),
    };

    for (const client of room) {
      if (client !== socket) {
        sendEvent(client, event);
      }
    }
  }
}

/**
 * Handle set status
 */
async function handleSetStatus(
  socket: WebSocket,
  status: PresenceStatus
): Promise<void> {
  const connection = connections.get(socket);
  if (!connection) return;

  // Update in database if agent
  if (connection.entityType === 'agent') {
    await authService.updateAgentStatus(connection.entityId, status);
  }

  // Broadcast presence change
  broadcastPresence(connection.entityId, connection.entityType, status);
}

/**
 * Handle disconnect
 */
function handleDisconnect(socket: WebSocket): void {
  const connection = connections.get(socket);
  if (!connection) return;

  // Remove from rooms
  for (const channelId of connection.channels) {
    const room = channelRooms.get(channelId);
    if (room) {
      room.delete(socket);
      if (room.size === 0) {
        channelRooms.delete(channelId);
      }
    }
  }

  // Update agent status
  if (connection.entityType === 'agent') {
    authService.updateAgentStatus(connection.entityId, 'offline').catch(console.error);
  }

  // Broadcast presence
  broadcastPresence(connection.entityId, connection.entityType, 'offline');

  // Clean up
  entityConnections.delete(connection.entityId);
  connections.delete(socket);

  console.log(`Disconnected: ${connection.entityType} ${connection.entityId}`);
}

/**
 * Broadcast presence change
 */
function broadcastPresence(
  entityId: string,
  entityType: EntityType,
  status: PresenceStatus
): void {
  const event: ServerEvent = {
    type: 'presence_change',
    entityId,
    entityType,
    status,
    timestamp: Date.now(),
  };

  // Broadcast to all connections
  for (const conn of connections.values()) {
    sendEvent(conn.socket, event);
  }
}

/**
 * Send event to socket
 */
function sendEvent(socket: WebSocket, event: ServerEvent): void {
  if (socket.readyState === 1) { // WebSocket.OPEN
    socket.send(JSON.stringify(event));
  }
}

/**
 * Decode JWT (simplified - use proper library in production)
 */
function decodeJWT(token: string): { sub: string; type: EntityType } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

    // Check expiry
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }

    return {
      sub: payload.sub,
      type: payload.type,
    };
  } catch {
    return null;
  }
}

/**
 * Get connection for entity
 */
export function getEntityConnection(entityId: string): Connection | undefined {
  return entityConnections.get(entityId);
}

/**
 * Check if entity is online
 */
export function isEntityOnline(entityId: string): boolean {
  return entityConnections.has(entityId);
}
