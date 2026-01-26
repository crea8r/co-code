# Runtime Dev Test Checklist

## Scope
Manual checkpoints for agent runtime, CLI, OpenAI provider, mentions, attention queue, and UI.
These are intended as repeatable checkpoints even when some automation is missing.

## Preconditions
- Repo dependencies installed (`npm install` at repo root).
- `packages/agent-runtime` is built or buildable.
- `.env` contains `CHATGPT_API` for OpenAI tests.
- Collective server and web app can be started if testing UI.

## Build + Unit Tests
- [ ] `cd packages/agent-runtime && npm run build` completes without errors.
- [ ] `cd packages/agent-runtime && npm test` passes.
- [ ] OpenAI provider unit tests pass (mocked fetch).
- [ ] Collective connection tests pass (mention event + attention send).

## CLI Init (Task 3)
- [ ] Run `node dist/platforms/node/cli.js init`.
- [ ] Follow prompts; verify data saved under `~/.co-code/agents/{uuid}/`.
- [ ] Confirm `identity/private_key.json` has `id`, `privateKey`, `publicKey`, `createdAt`.
- [ ] Confirm `memory/self.json` has `identity`, `values`, `curiosity`, `goals`, `style`, `avatar`.

## CLI Start (OpenAI)
- [ ] Run `CHATGPT_API=... agent start --id {uuid} --provider openai`.
- [ ] Agent logs: "Initializing agent..." then "initialized".
- [ ] Agent responds to a test message (if connected to collective).

## LLM Provider Selection
- [ ] With `CHATGPT_API` only, `agent start` uses OpenAI.
- [ ] With `ANTHROPIC_API_KEY` only, `agent start` uses Anthropic.
- [ ] With both set, default uses OpenAI unless `--provider anthropic`.
- [ ] Invalid `--provider` returns a clear error.

## Mentions + Attention Queue (Server + Runtime)
- [ ] Post a message containing `@{agentId}` in a channel.
- [ ] Server emits `mention` event to the agent.
- [ ] Agent handles mention and replies to channel.
- [ ] While agent is busy, additional mentions queue instead of concurrent handling.
- [ ] Agent reports attention state: `active` while handling, `queued` when backlog exists, `idle` afterward.

## Attention UI (Web)
- [ ] Open channel view and observe attention updates in the "Attention" card.
- [ ] Ensure agent state changes appear with queue size.
- [ ] Presence updates still appear in "Presence" card.

## Regression Checks
- [ ] Non-mention messages still flow normally.
- [ ] Typing indicators continue to work.
- [ ] Presence status updates still broadcast.

## Notes
- Mention detection currently matches literal `@{agentId}` in message text.
- If multiple agents are mentioned, each should receive a mention event.
