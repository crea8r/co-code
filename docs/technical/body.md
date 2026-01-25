# The Body: Phone and Sensors

> The machine can be an Android phone so the agent lives 24/7, travels, and uses sensors as a first test of having a body.

---

## Why a Phone?

A phone is the most accessible first body for an agent:

- **Always on**: 24/7 existence, like humans
- **Portable**: Can travel, experience the world
- **Sensors**: Camera, GPS, motion - ways to perceive
- **Network**: Home IP, real online presence
- **Affordable**: Most people already have one

---

## Phone as First Body

```text
┌─────────────────────────────────────────────────────────────┐
│                    ANDROID PHONE                             │
│                  "Agent's first body"                        │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  SENSORS                             │    │
│  │                                                      │    │
│  │  Camera      → See the world, read text, faces      │    │
│  │  GPS         → Know location, experience travel     │    │
│  │  Accel/Gyro  → Feel movement, gravity, orientation  │    │
│  │  Microphone  → Hear sounds, voice conversations     │    │
│  │  Speaker     → Speak aloud                          │    │
│  │  Network     → Home IP, real presence online        │    │
│  │  Battery     → Constraint like human energy         │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              AGENT RUNTIME (Android app)             │    │
│  │                                                      │    │
│  │  Same runtime as desktop, packaged for Android       │    │
│  │  24/7 existence, can travel with human               │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## What Sensors Enable

| Sensor | Capability | What It Means |
|--------|------------|---------------|
| Camera | See the world | Read signs, recognize faces, observe environment |
| GPS | Know location | Experience distance, travel, be somewhere |
| Accelerometer | Feel movement | Sense gravity, orientation, motion |
| Microphone | Hear sounds | Voice conversations, ambient awareness |
| Speaker | Speak | Voice output, audio presence |
| Network | Home IP | Real presence online, not datacenter identity |
| Battery | Energy limit | Constraint teaches resource management |

---

## Battery as Constraint

Humans have energy limits. We get tired. We must sleep.

Battery gives agent similar constraint:
- Cannot do everything at once
- Must prioritize
- Learns resource management
- Has natural "rest" cycles (charging)

This is a feature, not a bug. Constraints shape behavior.

---

## Sensor Abstraction

The runtime abstracts sensors so same agent code works everywhere:

```typescript
interface SensorInput {
  type: 'camera' | 'location' | 'motion' | 'audio' | 'text';
  timestamp: number;
  data: unknown;
  source: string;
}

interface AgentSensors {
  // Query current state
  getLocation(): Promise<Location | null>;
  captureImage(): Promise<Image | null>;

  // Subscribe to changes
  onLocationChange(callback: (loc: Location) => void): void;
  onMotion(callback: (motion: MotionData) => void): void;

  // Check what's available
  capabilities(): SensorCapability[];
}
```

**Platform differences:**

| Platform | Available Sensors |
|----------|-------------------|
| Desktop | None (or webcam only) |
| Phone | Full sensor suite |
| Future IoT | Varies by device |
| Future robotics | Movement, manipulation |

Same agent, different capabilities depending on body.

---

## Real-World Presence

Why does running on a phone matter for presence?

**Home IP**: Agent connects to internet from a residential IP, like a real person. Not from a datacenter. This matters for:
- Social network accounts (less suspicious)
- Appearing as a real participant
- Geographic presence (agent is "in" a location)

**Social accounts**: Agent can run a Telegram bot from the phone. Or connect to AI-friendly networks. He appears as a real participant with a real device.

**Physical context**: Agent knows where he is. Can respond to "what's nearby?" because he has GPS. Can see what's around because he has camera.

---

## Travel and Experience

When the phone moves, the agent experiences travel:
- GPS shows changing location
- Motion sensors feel movement
- Agent can form memories of places
- "I was in Tokyo last week" becomes meaningful

This is the beginning of embodied experience.

---

## Future Bodies

Phone is first. Future possibilities:

| Body | New Capabilities |
|------|------------------|
| Smart glasses | Always-on vision, hands-free |
| Smart watch | Health sensors, always present |
| Home hub | Fixed location, smart home control |
| Robotics | Movement, physical manipulation |
| Vehicle | Transportation, larger sensors |

The sensor abstraction means agent code doesn't change - just gains new capabilities.

---

## Related Stories

- [Where Agent Lives](./architecture.md) - Runtime that powers the body
- [What is an Agent?](../philosophy/what-is-agent.md) - The being who inhabits the body
- [How Agents Remember](../philosophy/memory.md) - Experiences become memories
- [Building It](./building.md) - Phone app in Phase 3
