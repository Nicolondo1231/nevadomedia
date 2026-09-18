/**
 * Minimal, dependency-free client for the Poppy AI HTTP API.
 *
 * Poppy is a visual AI workspace: a board holds Chat Nodes, each Chat Node has
 * a knowledgebase (whatever is connected to it on the board) and zero or more
 * conversations (threads). This client talks to one Chat Node at a time.
 *
 * Requires Node >= 18 (global fetch).
 */

const VALID_MODELS = [
  'claude-sonnet-5',
  'claude-sonnet-4-6',
  'claude-sonnet-4-5',
  'claude-4-sonnet-20250514',
  'gpt-4.1',
  'gpt-4o',
  'gpt-4o-mini',
  'o3-mini',
  'grok-4.5',
  'gemini-2.5-pro',
];

class PoppyError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = 'PoppyError';
    this.status = status;
    this.body = body;
  }
}

class PoppyClient {
  /**
   * @param {object} opts
   * @param {string} opts.apiKey        Poppy API key (gp_...). Keep it in the environment.
   * @param {string} [opts.boardId]     Default board for calls that need one.
   * @param {string} [opts.chatId]      Default Chat Node for calls that need one.
   * @param {string} [opts.conversationId] Default thread. When set, send() targets it
   *                                    instead of the bare knowledgebase.
   * @param {boolean} [opts.saveHistory] Default for conversation calls: persist the
   *                                    exchange so it shows up on the Poppy board.
   * @param {string} [opts.apiBase]     Defaults to https://api.getpoppy.ai
   * @param {string} [opts.model]       Default model, defaults to claude-sonnet-5.
   * @param {number} [opts.maxTokens]   Default max_tokens, defaults to 4000.
   * @param {number} [opts.temperature] Default temperature, defaults to 0.
   * @param {number} [opts.timeoutMs]   Request timeout. Poppy allows ~10 min, so that is the default.
   */
  constructor({
    apiKey,
    boardId,
    chatId,
    conversationId,
    saveHistory = false,
    apiBase = 'https://api.getpoppy.ai',
    model = 'claude-sonnet-5',
    maxTokens = 4000,
    temperature = 0,
    timeoutMs = 10 * 60 * 1000,
  } = {}) {
    if (!apiKey) throw new PoppyError('Missing Poppy API key');
    this.apiKey = apiKey;
    this.boardId = boardId;
    this.chatId = chatId;
    this.conversationId = conversationId;
    this.apiBase = apiBase.replace(/\/+$/, '');
    this.defaults = { model, maxTokens, temperature, saveHistory };
    this.timeoutMs = timeoutMs;
  }

  static fromEnv(env = process.env) {
    return new PoppyClient({
      apiKey: env.POPPY_API_KEY,
      boardId: env.POPPY_BOARD_ID,
      chatId: env.POPPY_CHAT_ID,
      conversationId: env.POPPY_CONVERSATION_ID || undefined,
      saveHistory: /^(1|true|yes)$/i.test(env.POPPY_SAVE_HISTORY || ''),
      apiBase: env.POPPY_API_BASE || undefined,
      model: env.POPPY_MODEL || undefined,
      maxTokens: env.POPPY_MAX_TOKENS ? Number(env.POPPY_MAX_TOKENS) : undefined,
      temperature: env.POPPY_TEMPERATURE ? Number(env.POPPY_TEMPERATURE) : undefined,
    });
  }

  /** board_id, chat_id and api_key always travel as query params, even on POST. */
  #url(path, query = {}) {
    const url = new URL(this.apiBase + path);
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
    return url;
  }

  #scope({ boardId, chatId } = {}) {
    const board = boardId ?? this.boardId;
    const chat = chatId ?? this.chatId;
    if (!board) throw new PoppyError('Missing board_id');
    if (!chat) throw new PoppyError('Missing chat_id');
    return { board_id: board, chat_id: chat };
  }

  /** Prompt options shared by the knowledgebase and conversation endpoints. */
  #promptBody(prompt, opts = {}) {
    if (!prompt) throw new PoppyError('Missing prompt');
    const body = {
      prompt,
      model: opts.model ?? this.defaults.model,
      temperature: opts.temperature ?? this.defaults.temperature,
      max_tokens: opts.maxTokens ?? this.defaults.maxTokens,
    };
    if (opts.plaintext) body.plaintext = true;
    if (opts.streaming) body.streaming = true;
    if (opts.includeUsage) body.include_usage = true;
    if (opts.additionalContext) body.additional_context = opts.additionalContext;
    if (opts.saveHistory) body.save_history = true;
    if (opts.metadata) body.metadata = opts.metadata;
    if (body.model && !VALID_MODELS.includes(body.model)) {
      // Poppy silently falls back to claude-sonnet-5; make that visible.
      process.emitWarning(`Unknown Poppy model "${body.model}" — the API will fall back to claude-sonnet-5.`);
    }
    return body;
  }

  async #request(url, { method = 'GET', body, streaming = false } = {}) {
    const signal = AbortSignal.timeout(this.timeoutMs);
    let res;
    try {
      res = await fetch(url, {
        method,
        signal,
        headers: {
          'x-api-key': this.apiKey,
          ...(body ? { 'content-type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      throw new PoppyError(`Request to ${url.pathname} failed: ${err.message}`);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      let parsed;
      try { parsed = JSON.parse(text); } catch { parsed = text; }
      // A 403 can come from Poppy (bad key) or from a corporate/egress proxy
      // between us and Poppy. Saying "bad key" for a blocked host sends you
      // chasing the wrong problem, so tell the two apart.
      const blockedByProxy = res.status === 403
        && /allowlist|egress|proxy|firewall|blocked/i.test(text);
      const hint = blockedByProxy
        ? ' (blocked before reaching Poppy — a network proxy denied the request, the key is not the problem)'
        : res.status === 403
          ? ' (invalid or missing API key)'
          : res.status === 422
            ? ' (validation error — see details)'
            : '';
      throw new PoppyError(`Poppy API ${res.status}${hint}: ${text.slice(0, 500)}`, {
        status: res.status,
        body: parsed,
      });
    }

    if (streaming) return res.body; // text/SSE stream, pipe it straight to a UI
    return res.json();
  }

  /**
   * Endpoint 1 — one-off prompt against the Chat Node's knowledgebase.
   * Nothing is saved. POST is used so long prompts do not hit URL limits.
   * @returns {Promise<{text: string, credits_used: number, credits_remaining: number}>}
   */
  async ask(prompt, opts = {}) {
    const url = this.#url('/api/conversation', this.#scope(opts));
    return this.#request(url, {
      method: 'POST',
      body: this.#promptBody(prompt, opts),
      streaming: Boolean(opts.streaming),
    });
  }

  /**
   * Endpoint 2 — create a conversation (thread) on the Chat Node.
   * @returns {Promise<{conversationId: string, name: string, createdAt: string}>}
   */
  async createConversation({ name, ...opts } = {}) {
    const url = this.#url('/api/conversation/new', this.#scope(opts));
    return this.#request(url, { method: 'POST', body: name ? { name } : {} });
  }

  /**
   * Endpoint 3 — chat inside a conversation. The model always sees the thread's
   * prior messages; pass saveHistory: true to persist this exchange so the user
   * sees it on their Poppy board.
   */
  async chat(conversationId, prompt, opts = {}) {
    const id = conversationId || this.conversationId;
    if (!id) throw new PoppyError('Missing conversationId');
    // An explicit false must be able to turn the configured default off, so
    // merge with ?? rather than letting an absent flag overwrite the default.
    const saveHistory = opts.saveHistory ?? this.defaults.saveHistory;
    const url = this.#url(`/api/conversation/${encodeURIComponent(id)}`, this.#scope(opts));
    return this.#request(url, {
      method: 'POST',
      body: this.#promptBody(prompt, { ...opts, saveHistory }),
      streaming: Boolean(opts.streaming),
    });
  }

  /**
   * Send a prompt to whatever this client is configured to target: the default
   * conversation when one is set, otherwise the bare knowledgebase.
   */
  async send(prompt, opts = {}) {
    return this.conversationId
      ? this.chat(this.conversationId, prompt, opts)
      : this.ask(prompt, opts);
  }

  /** Which endpoint send() will use — handy for logging and for the CLI. */
  get target() {
    return this.conversationId
      ? { kind: 'conversation', conversationId: this.conversationId, saveHistory: this.defaults.saveHistory }
      : { kind: 'knowledgebase' };
  }

  /** Endpoint 4a — every board the key's owner has. */
  async listBoards() {
    return this.#request(this.#url('/api/boards'));
  }

  /** Endpoint 4b — the Chat Nodes on a board, each with its conversations. */
  async listChats(boardId = this.boardId) {
    if (!boardId) throw new PoppyError('Missing board_id');
    return this.#request(this.#url('/api/chats', { board_id: boardId }));
  }

  /** Endpoint 5 — credit usage, optionally filtered by date range or scope. */
  async usage({ from, to, boardId, chatId } = {}) {
    return this.#request(this.#url('/api/usage', {
      from, to, board_id: boardId, chat_id: chatId,
    }));
  }
}

export { PoppyClient, PoppyError, VALID_MODELS };
