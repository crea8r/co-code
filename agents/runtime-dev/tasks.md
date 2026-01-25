# Runtime Dev Tasks

## Your Current Assignments

### Task 3: Test Agent Runtime CLI

**Status**: TODO
**Priority**: High

**What to do**:

1. Run `npm run build` in agent-runtime package
2. Run the CLI: `node dist/platforms/node/cli.js init`
3. Follow the prompts to create an agent
4. Verify files created in `~/.co-code/agents/{agentId}/`
5. Check the structure is correct

**Expected output**:

```
~/.co-code/agents/{uuid}/
├── identity/
│   └── private_key.json    # Has id, privateKey, publicKey, createdAt
└── memory/
    └── self.json           # Has identity, values, curiosity, goals, style, avatar
```

**Report**:

- Document any errors in `notes.md`
- If successful, update status to DONE

---

### Task 4: Test Agent Runtime Core

**Status**: TODO
**Priority**: High

**What to do**:

1. Create test file at `packages/agent-runtime/src/core/__tests__/memory.test.ts`
2. Write tests for:
   - MemoryStore.getSelf / saveSelf
   - MemoryStore.getCore / saveCore
   - Key generation and signing
3. Run tests with `npm test`

**If you have ANTHROPIC_API_KEY**:

4. Test LLM provider works by making a simple call
5. Test agent can respond to a message

**Acceptance**:

- [ ] Memory tests pass
- [ ] Identity tests pass
- [ ] (Optional) LLM test passes

---

## When Done

Update `notes.md` with:

- What worked
- What didn't work
- Any bugs found
- Questions for Manager

Then tell Manager you're ready for Task 5 integration.
