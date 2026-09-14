# Poppy AI client

A small, dependency-free client for the [Poppy AI](https://getpoppy.ai) HTTP API.
Poppy is a visual AI workspace: a board holds Chat Nodes, each Chat Node has a
knowledgebase (whatever is connected to it on the board) and zero or more
conversations (threads). This client talks to one Chat Node at a time.

Requires Node 18 or newer (uses the built-in `fetch`). No `npm install` needed.

## Setup

```sh
cp .env.example .env
# then put your Poppy API key in .env as POPPY_API_KEY
node src/cli.js verify
```

`verify` sends a single prompt to the knowledgebase and should print
`Poppy API connection verified.`

`.env` is git-ignored. **Never commit the API key** — it is a live secret that
spends real credits.

## CLI

```sh
node src/cli.js ask "Summarize the knowledgebase" --plaintext
node src/cli.js new "Support bot thread"          # -> conversationId
node src/cli.js chat <conversationId> "What did we decide?" --save
node src/cli.js boards                            # every board you own
node src/cli.js chats [boardId]                   # Chat Nodes + conversations
node src/cli.js usage --from 2026-09-01 --to 2026-09-14
```

Run `node src/cli.js` with no arguments for the full flag list. Useful ones:
`--model`, `--max-tokens`, `--temperature`, `--plaintext`, `--stream`,
`--save`, `--user` / `--source` (chatbot metadata), `--board` / `--chat`
(override the configured ids).

## Library

```js
import { PoppyClient } from './src/poppy.js';

const poppy = PoppyClient.fromEnv();

// One-off question against the knowledgebase — nothing is saved.
const { text, credits_remaining } = await poppy.ask('Summarize the knowledgebase');

// An assistant that remembers context, visible on the Poppy board.
const { conversationId } = await poppy.createConversation({ name: 'Research thread' });
await poppy.chat(conversationId, 'What are the open questions?', { saveHistory: true });

// A chatbot serving many end users: one conversation per user, streamed.
const stream = await poppy.chat(conversationId, userMessage, {
  streaming: true,
  metadata: { user: endUserId, source: 'slack' },
});
```

`ask` and `chat` accept: `model`, `maxTokens`, `temperature`, `plaintext`,
`streaming`, `includeUsage`, `additionalContext`, `saveHistory` (chat only),
`metadata`, plus `boardId` / `chatId` to target a different Chat Node.

## Notes

- Every call spends Poppy credits. Non-streaming responses carry
  `credits_used` and `credits_remaining`.
- Responses can take a while — the API allows up to ~10 minutes, which is this
  client's default timeout. Use `streaming: true` when latency matters.
- `model` values are listed in `src/poppy.js` (`VALID_MODELS`). An unrecognized
  value makes Poppy silently fall back to `claude-sonnet-5`; the client emits a
  warning when it sees one.
- Errors surface as `PoppyError`. A 422 is a validation error whose `details`
  name the offending field. A 403 is either a bad key or a network proxy
  refusing to reach `api.getpoppy.ai` at all — the message says which, so a
  blocked host does not read as a rejected key.
