type RealtimeHandler = (body: string) => void;

interface SubscriptionEntry {
  destination: string;
  handler: RealtimeHandler;
  serverSubscribed: boolean;
}

const CONNECT_COMMAND = 'CONNECT';
const CONNECTED_COMMAND = 'CONNECTED';
const MESSAGE_COMMAND = 'MESSAGE';
const ERROR_COMMAND = 'ERROR';

class RealtimeService {
  private accessToken: string | null = null;
  private socket: WebSocket | null = null;
  private connected = false;
  private connectPromise: Promise<void> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private subscriptions = new Map<string, SubscriptionEntry>();
  private subscriptionCounter = 0;
  private pendingBuffer = '';

  setAccessToken(token: string | null) {
    this.accessToken = token;

    if (!token) {
      this.disconnect();
    }
  }

  isConnected() {
    return this.connected;
  }

  async ensureConnected() {
    if (this.connected) {
      return;
    }

    if (!this.accessToken) {
      throw new Error('Realtime authentication token is missing.');
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(this.buildWebSocketUrl(this.accessToken!));
      let settled = false;

      socket.onopen = () => {
        this.socket = socket;
        this.pendingBuffer = '';
        this.sendFrame(CONNECT_COMMAND, {
          'accept-version': '1.2',
          'heart-beat': '0,0',
        });
      };

      socket.onmessage = (event) => {
        this.handleSocketData(String(event.data), () => {
          if (!settled) {
            settled = true;
            resolve();
          }
        }, (error) => {
          if (!settled) {
            settled = true;
            reject(error);
          }
        });
      };

      socket.onerror = () => {
        if (!settled) {
          settled = true;
          reject(new Error('Realtime connection error.'));
        }
      };

      socket.onclose = () => {
        this.socket = null;
        this.connected = false;
        this.connectPromise = null;
        this.markSubscriptionsAsPending();
        this.scheduleReconnect();

        if (!settled) {
          settled = true;
          reject(new Error('Realtime connection closed.'));
        }
      };
    });

    try {
      await this.connectPromise;
      await this.resubscribeAll();
    } catch (error) {
      this.connectPromise = null;
      throw error;
    }
  }

  async subscribe(destination: string, handler: RealtimeHandler) {
    await this.ensureConnected();

    const subscriptionId = `sub-${++this.subscriptionCounter}`;
    this.subscriptions.set(subscriptionId, {
      destination,
      handler,
      serverSubscribed: false,
    });

    this.sendSubscribeFrame(subscriptionId);

    return () => {
      const current = this.subscriptions.get(subscriptionId);
      if (!current) {
        return;
      }

      this.subscriptions.delete(subscriptionId);
      if (current.serverSubscribed && this.connected) {
        this.sendFrame('UNSUBSCRIBE', { id: subscriptionId });
      }
    };
  }

  async publish(destination: string, payload: unknown) {
    await this.ensureConnected();

    const body = JSON.stringify(payload);
    this.sendFrame('SEND', {
      destination,
      'content-type': 'application/json',
      'content-length': `${new TextEncoder().encode(body).length}`,
    }, body);
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.markSubscriptionsAsPending();
    this.connected = false;
    this.connectPromise = null;

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  private handleSocketData(
    chunk: string,
    onConnected: () => void,
    onError: (error: Error) => void,
  ) {
    this.pendingBuffer += chunk;

    while (true) {
      const frameTerminatorIndex = this.pendingBuffer.indexOf('\0');
      if (frameTerminatorIndex === -1) {
        return;
      }

      const rawFrame = this.pendingBuffer.slice(0, frameTerminatorIndex);
      this.pendingBuffer = this.pendingBuffer.slice(frameTerminatorIndex + 1);

      const frame = rawFrame.replace(/\r/g, '');
      if (!frame || frame === '\n') {
        continue;
      }

      const parsed = this.parseFrame(frame);
      switch (parsed.command) {
        case CONNECTED_COMMAND:
          this.connected = true;
          onConnected();
          break;
        case MESSAGE_COMMAND: {
          const subscriptionId = parsed.headers.subscription;
          const subscription = subscriptionId ? this.subscriptions.get(subscriptionId) : null;
          if (subscription) {
            subscription.handler(parsed.body);
          }
          break;
        }
        case ERROR_COMMAND:
          onError(new Error(parsed.body || 'Realtime STOMP error.'));
          break;
        default:
          break;
      }
    }
  }

  private parseFrame(frame: string) {
    const [headerBlock = '', ...bodyParts] = frame.split('\n\n');
    const headerLines = headerBlock.split('\n');
    const command = headerLines[0]?.trim() ?? '';
    const headers: Record<string, string> = {};

    for (const line of headerLines.slice(1)) {
      if (!line) {
        continue;
      }
      const separatorIndex = line.indexOf(':');
      if (separatorIndex === -1) {
        continue;
      }
      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      headers[key] = value;
    }

    return {
      command,
      headers,
      body: bodyParts.join('\n\n'),
    };
  }

  private sendSubscribeFrame(subscriptionId: string) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription || !this.connected) {
      return;
    }

    this.sendFrame('SUBSCRIBE', {
      id: subscriptionId,
      destination: subscription.destination,
    });
    subscription.serverSubscribed = true;
  }

  private async resubscribeAll() {
    for (const entry of this.subscriptions.values()) {
      entry.serverSubscribed = false;
    }

    for (const subscriptionId of this.subscriptions.keys()) {
      this.sendSubscribeFrame(subscriptionId);
    }
  }

  private markSubscriptionsAsPending() {
    for (const entry of this.subscriptions.values()) {
      entry.serverSubscribed = false;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || !this.accessToken || !this.subscriptions.size) {
      return;
    }

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      void this.ensureConnected().catch(() => undefined);
    }, 1000);
  }

  private buildWebSocketUrl(token: string) {
    const rawBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
    const sanitizedBaseUrl = rawBaseUrl.replace(/\/+$/, '');
    const baseUrl = sanitizedBaseUrl || window.location.origin;
    const wsBaseUrl = baseUrl
      .replace(/^http:\/\//i, 'ws://')
      .replace(/^https:\/\//i, 'wss://');

    return `${wsBaseUrl}/ws?token=${encodeURIComponent(token)}`;
  }

  private sendFrame(command: string, headers: Record<string, string>, body = '') {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('Realtime socket is not open.');
    }

    const lines = [command];
    for (const [key, value] of Object.entries(headers)) {
      lines.push(`${key}:${value}`);
    }
    lines.push('');
    lines.push(body);
    this.socket.send(`${lines.join('\n')}\0`);
  }
}

export const realtimeService = new RealtimeService();
