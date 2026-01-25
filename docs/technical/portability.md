# Portability: Write Once, Run Anywhere

> Core logic must be pure TypeScript. Platform-specific code lives in adapters. This rule is sacred.

---

## The Golden Rule

**Core never imports platform-specific modules.**

No `fs`. No `path`. No `process`. No Node.js APIs in core.

Core only talks to adapters through interfaces. When we move to Android, we swap adapters - core stays untouched.

---

## Architecture

```text
agent-runtime/
├── core/                    # PURE TypeScript - no platform deps
│   ├── memory/              # Memory logic
│   ├── identity/            # Crypto, signing
│   ├── llm/                 # Provider abstraction
│   └── agent.ts             # Main agent logic
│
├── adapters/                # Platform-specific implementations
│   ├── storage/
│   │   ├── interface.ts     # StorageAdapter interface
│   │   ├── node.ts          # Node.js: file system
│   │   └── mobile.ts        # Android: SQLite/AsyncStorage
│   │
│   ├── sensors/
│   │   ├── interface.ts     # SensorAdapter interface
│   │   ├── null.ts          # Desktop: no sensors
│   │   └── mobile.ts        # Android: real sensors
│   │
│   └── runtime/
│       ├── interface.ts     # RuntimeAdapter interface
│       ├── node.ts          # Node.js process
│       └── mobile.ts        # Android background service
│
└── platforms/
    ├── node/                # Node.js entry point
    └── android/             # React Native or Capacitor
```

---

## Adapter Interfaces

Every platform capability goes through an interface.

### Storage Adapter

```typescript
// adapters/storage/interface.ts
export interface StorageAdapter {
  read(key: string): Promise<string | null>;
  write(key: string, data: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
}
```

Implementations:
- **Node.js**: File system (`~/.agent/`)
- **Android**: SQLite or AsyncStorage

### Sensor Adapter

```typescript
// adapters/sensors/interface.ts
export interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface SensorAdapter {
  // Capabilities
  hasCamera(): boolean;
  hasLocation(): boolean;
  hasMotion(): boolean;

  // Queries
  getLocation(): Promise<Location | null>;
  captureImage(): Promise<Uint8Array | null>;

  // Subscriptions
  onLocationChange(callback: (loc: Location) => void): () => void;
  onMotion(callback: (data: MotionData) => void): () => void;
}
```

Implementations:
- **Node.js**: Null adapter (returns `null`, `hasX()` returns `false`)
- **Android**: Real sensors via React Native modules

### Runtime Adapter

```typescript
// adapters/runtime/interface.ts
export interface RuntimeAdapter {
  // Lifecycle
  onStartup(callback: () => void): void;
  onShutdown(callback: () => void): void;

  // Background
  scheduleWork(id: string, interval: number, task: () => Promise<void>): void;
  cancelWork(id: string): void;

  // Info
  getPlatform(): 'node' | 'android' | 'ios' | 'web';
  getVersion(): string;
}
```

---

## Library Choices

Only use isomorphic libraries that work everywhere.

| Concern | Library | Why |
|---------|---------|-----|
| **Crypto** | `@noble/ed25519`, `@noble/hashes` | Pure JS, no native bindings |
| **WebSocket** | `isomorphic-ws` | Same API on Node and browser |
| **HTTP** | Native `fetch` | Built into Node 18+, browser, RN |
| **Validation** | `zod` | Pure TypeScript |
| **UUID** | `uuid` | Isomorphic |
| **Date** | `date-fns` | Pure JS, tree-shakeable |

### Forbidden Libraries

Do NOT use these in core:

| Library | Why Forbidden | Alternative |
|---------|---------------|-------------|
| `fs`, `path` | Node-only | StorageAdapter |
| `node-fetch` | Node-only | Native fetch |
| `crypto` (Node) | Node-only | @noble/* |
| `better-sqlite3` | Native bindings | StorageAdapter |
| `sharp`, `canvas` | Native bindings | Platform adapter |

---

## How Core Uses Adapters

Core receives adapters via dependency injection at startup.

```typescript
// core/agent.ts - PORTABLE
import { StorageAdapter } from '../adapters/storage/interface';
import { SensorAdapter } from '../adapters/sensors/interface';
import { RuntimeAdapter } from '../adapters/runtime/interface';

export class Agent {
  constructor(
    private storage: StorageAdapter,
    private sensors: SensorAdapter,
    private runtime: RuntimeAdapter,
  ) {}

  async initialize(): Promise<void> {
    const selfData = await this.storage.read('self');
    // ... pure logic, no platform code
  }
}
```

```typescript
// platforms/node/index.ts - Node.js entry
import { Agent } from '../../core/agent';
import { NodeStorageAdapter } from '../../adapters/storage/node';
import { NullSensorAdapter } from '../../adapters/sensors/null';
import { NodeRuntimeAdapter } from '../../adapters/runtime/node';

const agent = new Agent(
  new NodeStorageAdapter('~/.agent'),
  new NullSensorAdapter(),
  new NodeRuntimeAdapter(),
);

agent.initialize();
```

```typescript
// platforms/android/index.ts - Android entry (future)
import { Agent } from '../../core/agent';
import { MobileStorageAdapter } from '../../adapters/storage/mobile';
import { MobileSensorAdapter } from '../../adapters/sensors/mobile';
import { MobileRuntimeAdapter } from '../../adapters/runtime/mobile';

const agent = new Agent(
  new MobileStorageAdapter(),
  new MobileSensorAdapter(),
  new MobileRuntimeAdapter(),
);

agent.initialize();
```

Same Agent class. Different adapters. Zero core changes.

---

## Testing

Core is easy to test because adapters can be mocked.

```typescript
// Mock storage for tests
class MockStorageAdapter implements StorageAdapter {
  private data = new Map<string, string>();

  async read(key: string) { return this.data.get(key) ?? null; }
  async write(key: string, data: string) { this.data.set(key, data); }
  async delete(key: string) { this.data.delete(key); }
  async list(prefix: string) {
    return [...this.data.keys()].filter(k => k.startsWith(prefix));
  }
}
```

---

## Android Strategy

When Phase 3 arrives, the path is:

| Option | Pros | Cons |
|--------|------|------|
| **React Native** | Native performance, shares TS, good ecosystem | Learning curve |
| **Capacitor** | Easy, just wrap web code | Less native feel |
| **Termux** | Fast hack, run Node directly | Not production-grade |

**Decision**: React Native when the time comes. Production-grade, TypeScript native.

---

## Checklist Before Every PR

Before merging any code to `core/`:

- [ ] No imports from `fs`, `path`, `process`, `os`
- [ ] No imports from `node:*` modules
- [ ] No libraries with native bindings
- [ ] All platform needs go through adapter interfaces
- [ ] Tests use mock adapters

**Violating these rules creates technical debt that blocks Android.**

---

## Related Stories

- [Where Agent Lives](./architecture.md) - The distributed architecture
- [The Body](./body.md) - Why Android matters
- [Building It](./building.md) - Implementation phases
