#!/usr/bin/env node
/**
 * CLI for the Poppy AI API. Reads config from .env (or the real environment).
 *
 *   node src/cli.js verify
 *   node src/cli.js ask "Summarize the knowledgebase" --plaintext
 *   node src/cli.js new "Support bot thread"
 *   node src/cli.js chat <conversationId> "What did we decide?" --save
 *   node src/cli.js boards
 *   node src/cli.js chats [boardId]
 *   node src/cli.js usage --from 2026-09-01 --to 2026-09-14
 *
 * Flags: --model <id> --max-tokens <n> --temperature <n> --plaintext --stream
 *        --save (persist to the Poppy board) --usage (token usage)
 *        --user <id> --source <name> (chatbot metadata)
 *        --board <id> --chat <id> (override the configured ids)
 */
import { readFileSync } from 'node:fs';
import { PoppyClient, PoppyError } from './poppy.js';

/** Load .env into process.env without a dependency. Real env vars win. */
function loadDotenv(path = '.env') {
  let raw;
  try { raw = readFileSync(path, 'utf8'); } catch { return; }
  for (const line of raw.split('\n')) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match || line.trimStart().startsWith('#')) continue;
    const value = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
    if (process.env[match[1]] === undefined) process.env[match[1]] = value;
  }
}

const USAGE = `Poppy AI CLI — config comes from .env (see .env.example)

  node src/cli.js verify
  node src/cli.js send "What did we decide?"     # the configured target
  node src/cli.js ask "Summarize the knowledgebase" --plaintext
  node src/cli.js new "Support bot thread"
  node src/cli.js chat [conversationId] "..."    # id defaults to POPPY_CONVERSATION_ID
  node src/cli.js target                         # show what send would hit
  node src/cli.js boards
  node src/cli.js chats [boardId]
  node src/cli.js usage --from 2026-09-01 --to 2026-09-14

Flags
  --model <id>        one of the models listed in src/poppy.js
  --max-tokens <n>    default 4000
  --temperature <n>   0 to 1, default 0
  --context <text>    extra context prepended to the prompt
  --plaintext         strip markdown from the reply
  --stream            stream the reply as text/SSE
  --save / --no-save  persist the exchange to the Poppy board, or don't
                      (overrides POPPY_SAVE_HISTORY; conversation calls only)
  --usage             include token usage in the response
  --user <id>         chatbot metadata: who sent the message
  --source <name>     chatbot metadata: where it came from
  --board <id>        override POPPY_BOARD_ID
  --chat <id>         override POPPY_CHAT_ID
`;

function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) { positional.push(arg); continue; }
    const name = arg.slice(2);
    const boolean = ['plaintext', 'stream', 'save', 'no-save', 'usage'];
    if (boolean.includes(name)) flags[name] = true;
    else flags[name] = argv[++i];
  }
  return { positional, flags };
}

function promptOptions(flags) {
  const opts = {
    plaintext: flags.plaintext,
    streaming: flags.stream,
    includeUsage: flags.usage,
    boardId: flags.board,
    chatId: flags.chat,
  };
  // Leave saveHistory absent unless asked either way, so the configured
  // default (POPPY_SAVE_HISTORY) survives.
  if (flags.save) opts.saveHistory = true;
  if (flags['no-save']) opts.saveHistory = false;
  if (flags.model) opts.model = flags.model;
  if (flags['max-tokens']) opts.maxTokens = Number(flags['max-tokens']);
  if (flags.temperature) opts.temperature = Number(flags.temperature);
  if (flags.context) opts.additionalContext = flags.context;
  if (flags.user || flags.source) {
    opts.metadata = { user: flags.user, source: flags.source };
  }
  return opts;
}

/** Streaming replies come back as a plain text/SSE stream — pipe it through. */
async function printResult(result) {
  if (result && typeof result.getReader === 'function') {
    const decoder = new TextDecoder();
    for await (const chunk of result) process.stdout.write(decoder.decode(chunk, { stream: true }));
    process.stdout.write('\n');
    return;
  }
  if (result && typeof result.text === 'string') {
    process.stdout.write(result.text + '\n');
    if (result.credits_used !== undefined) {
      console.error(`\n[credits used ${result.credits_used}, remaining ${result.credits_remaining}]`);
    }
    return;
  }
  console.log(JSON.stringify(result, null, 2));
}

async function main() {
  loadDotenv();
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const [command, ...rest] = positional;

  const known = ['verify', 'send', 'ask', 'new', 'chat', 'target', 'boards', 'chats', 'usage'];
  if (!command || !known.includes(command)) {
    console.error(USAGE);
    process.exitCode = command ? 1 : 0;
    return;
  }

  const poppy = PoppyClient.fromEnv();

  switch (command) {
    case 'verify': {
      const res = await poppy.ask('Reply with exactly: Poppy API connection verified.', {
        ...promptOptions(flags),
        maxTokens: 100,
        plaintext: true,
      });
      await printResult(res);
      break;
    }
    case 'ask':
      await printResult(await poppy.ask(rest.join(' '), promptOptions(flags)));
      break;
    case 'new':
      await printResult(await poppy.createConversation({
        name: rest.join(' ') || undefined,
        ...promptOptions(flags),
      }));
      break;
    case 'send':
      await printResult(await poppy.send(rest.join(' '), promptOptions(flags)));
      break;
    case 'chat': {
      // A leading UUID-shaped token is a conversation id; anything else is the
      // start of the prompt and the configured conversation is used.
      const looksLikeId = rest.length > 1 && /^[0-9a-f]{8}-[0-9a-f-]{8,}$/i.test(rest[0]);
      const conversationId = looksLikeId ? rest[0] : undefined;
      const words = looksLikeId ? rest.slice(1) : rest;
      await printResult(await poppy.chat(conversationId, words.join(' '), promptOptions(flags)));
      break;
    }
    case 'target':
      console.log(JSON.stringify(poppy.target, null, 2));
      break;
    case 'boards':
      await printResult(await poppy.listBoards());
      break;
    case 'chats':
      await printResult(await poppy.listChats(rest[0]));
      break;
    case 'usage':
      await printResult(await poppy.usage({
        from: flags.from, to: flags.to, boardId: flags.board, chatId: flags.chat,
      }));
      break;
  }
}

main().catch((err) => {
  if (err instanceof PoppyError) {
    console.error(`Poppy error: ${err.message}`);
    if (err.body?.details) console.error(JSON.stringify(err.body.details, null, 2));
  } else {
    console.error(err);
  }
  process.exitCode = 1;
});
