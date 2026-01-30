import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { parse as parseUrl } from 'node:url';

type AttentionState = 'idle' | 'active' | 'queued';

export type RuntimeUiMessage = {
  id: string;
  channelId: string;
  senderId: string;
  senderType: string;
  content: { text?: string };
  createdAt?: number;
};

export type MentionQueueEntry = {
  message: RuntimeUiMessage;
  enqueuedAt: number;
  priority: 'high' | 'normal';
};

export type RuntimeStatus = {
  agentId: string;
  connected: boolean;
  attention: AttentionState;
  queueSize: number;
  lastMentionChannel?: string | null;
};

export type IdentitySummary = {
  name: string;
  description?: string;
  values?: string[];
  tone?: string;
  verbosity?: string;
  budget?: { totalBalance: number; spentToday: number; spentThisMonth: number };
  providers?: string[];
  lastLoadedAt?: string;
  errors?: string[];
};

export type RuntimeUiConfig = {
  host?: string;
  port?: number;
};

export type RuntimeUiDependencies = {
  getStatus: () => RuntimeStatus;
  getIdentitySummary: () => Promise<IdentitySummary>;
  getMessages: (channelId?: string) => RuntimeUiMessage[];
  getQueuedMentions: () => MentionQueueEntry[];
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  stopRuntime: () => Promise<void>;
  setPresence: (status: string) => void;
  joinChannel: (channelId: string) => void;
  sendMessage: (channelId: string, text: string) => void;
};

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function parseBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? (JSON.parse(data) as Record<string, unknown>) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function renderHtml(): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Agent Runtime UI</title>
    <style>
      body { font-family: system-ui, sans-serif; background: #0f1316; color: #e6edf3; padding: 24px; }
      h1, h2 { margin: 0 0 8px; }
      section { margin-bottom: 24px; padding: 16px; border-radius: 12px; background: #151b20; }
      input, button { padding: 8px 10px; border-radius: 8px; border: 1px solid #2a323a; background: #0f1316; color: #e6edf3; }
      button { cursor: pointer; }
      .row { display: flex; gap: 12px; flex-wrap: wrap; }
      pre { background: #0f1316; padding: 12px; border-radius: 8px; overflow: auto; }
    </style>
  </head>
  <body>
    <h1>Agent Runtime UI</h1>
    <section>
      <h2>Status</h2>
      <div id="status"></div>
      <button onclick="refreshStatus()">Refresh</button>
      <button onclick="connectRuntime()">Connect</button>
      <button onclick="disconnectRuntime()">Disconnect</button>
      <button onclick="stopRuntime()">Stop Runtime</button>
    </section>

    <section>
      <h2>Presence</h2>
      <div class="row">
        <input id="presence" placeholder="online/away/sleeping" />
        <button onclick="setPresence()">Set</button>
      </div>
    </section>

    <section>
      <h2>Join Channel</h2>
      <div class="row">
        <input id="channelId" placeholder="Channel ID" />
        <button onclick="joinChannel()">Join</button>
      </div>
    </section>

    <section>
      <h2>Send Message</h2>
      <div class="row">
        <input id="sendChannelId" placeholder="Channel ID" />
        <input id="sendText" placeholder="Message" />
        <button onclick="sendMessage()">Send</button>
      </div>
    </section>

    <section>
      <h2>Queued Mentions</h2>
      <pre id="mentions"></pre>
    </section>

    <section>
      <h2>Recent Messages</h2>
      <div class="row">
        <input id="messagesChannelId" placeholder="Channel ID (optional)" />
        <button onclick="loadMessages()">Load</button>
      </div>
      <pre id="messages"></pre>
    </section>

    <section>
      <h2>Identity Summary</h2>
      <pre id="identity"></pre>
    </section>

    <script>
      async function api(path, options) {
        const res = await fetch(path, options);
        return res.json();
      }
      async function refreshStatus() {
        document.getElementById('status').textContent = JSON.stringify(await api('/status'), null, 2);
        document.getElementById('mentions').textContent = JSON.stringify(await api('/mentions'), null, 2);
        document.getElementById('identity').textContent = JSON.stringify(await api('/identity'), null, 2);
      }
      async function connectRuntime() { await api('/connect', { method: 'POST' }); refreshStatus(); }
      async function disconnectRuntime() { await api('/disconnect', { method: 'POST' }); refreshStatus(); }
      async function stopRuntime() { await api('/stop', { method: 'POST' }); }
      async function setPresence() {
        const status = document.getElementById('presence').value;
        await api('/presence', { method: 'POST', body: JSON.stringify({ status }) });
        refreshStatus();
      }
      async function joinChannel() {
        const channelId = document.getElementById('channelId').value;
        await api('/join', { method: 'POST', body: JSON.stringify({ channelId }) });
      }
      async function sendMessage() {
        const channelId = document.getElementById('sendChannelId').value;
        const text = document.getElementById('sendText').value;
        await api('/send', { method: 'POST', body: JSON.stringify({ channelId, text }) });
      }
      async function loadMessages() {
        const channelId = document.getElementById('messagesChannelId').value;
        const url = channelId ? '/messages?channelId=' + encodeURIComponent(channelId) : '/messages';
        document.getElementById('messages').textContent = JSON.stringify(await api(url), null, 2);
      }
      refreshStatus();
    </script>
  </body>
</html>`;
}

export function createRuntimeUiHandler(deps: RuntimeUiDependencies) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const url = parseUrl(req.url ?? '/', true);
    const method = req.method ?? 'GET';

    if (url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(renderHtml());
      return;
    }

    if (url.pathname === '/health') {
      return sendJson(res, 200, { ok: true });
    }

    if (url.pathname === '/status') {
      return sendJson(res, 200, deps.getStatus());
    }

    if (url.pathname === '/identity') {
      return sendJson(res, 200, await deps.getIdentitySummary());
    }

    if (url.pathname === '/messages') {
      const channelId = typeof url.query.channelId === 'string' ? url.query.channelId : undefined;
      return sendJson(res, 200, deps.getMessages(channelId));
    }

    if (url.pathname === '/mentions') {
      return sendJson(res, 200, deps.getQueuedMentions());
    }

    if (method === 'POST' && url.pathname === '/connect') {
      await deps.connect();
      return sendJson(res, 200, { ok: true });
    }

    if (method === 'POST' && url.pathname === '/disconnect') {
      await deps.disconnect();
      return sendJson(res, 200, { ok: true });
    }

    if (method === 'POST' && url.pathname === '/stop') {
      await deps.stopRuntime();
      return sendJson(res, 200, { ok: true });
    }

    if (method === 'POST' && url.pathname === '/presence') {
      const body = await parseBody(req);
      if (typeof body.status === 'string') {
        deps.setPresence(body.status);
      }
      return sendJson(res, 200, { ok: true });
    }

    if (method === 'POST' && url.pathname === '/join') {
      const body = await parseBody(req);
      if (typeof body.channelId === 'string') {
        deps.joinChannel(body.channelId);
      }
      return sendJson(res, 200, { ok: true });
    }

    if (method === 'POST' && url.pathname === '/send') {
      const body = await parseBody(req);
      if (typeof body.channelId === 'string' && typeof body.text === 'string') {
        deps.sendMessage(body.channelId, body.text);
      }
      return sendJson(res, 200, { ok: true });
    }

    sendJson(res, 404, { error: 'Not found' });
  };
}

export function startRuntimeUi(config: RuntimeUiConfig, deps: RuntimeUiDependencies) {
  const host = config.host ?? '127.0.0.1';
  const port = config.port ?? 3841;

  const handler = createRuntimeUiHandler(deps);
  const server = createServer(handler);

  server.listen(port, host);
  const address = server.address();
  const resolvedPort =
    typeof address === 'object' && address ? address.port : port;

  return {
    host,
    port: resolvedPort,
    close: () => server.close(),
  };
}
