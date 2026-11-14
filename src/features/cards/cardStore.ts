export const MAX_CARD_CONTENT_LENGTH = 140;
export const MAX_PINNED_CARDS = 8;
export const UNDO_DELETE_WINDOW_MS = 5000;

export type CardTopic = 'Ăn uống' | 'Mua bán' | 'Đi lại' | 'Y tế';
export type CardFilterScope = 'all' | 'mine';

export interface CardRecord {
  id: string;
  content: string;
  topic?: string;
  icon?: string;
  pinned: boolean;
  updatedAt: string;
  deleted: boolean;
  seq?: number;
  isDefault: boolean;
}

export interface OutboxOp {
  opId: string;
  id: string;
  content: string;
  topic?: string;
  icon?: string;
  pinned: boolean;
  updatedAt: string;
  deleted: boolean;
}

export type SyncResultStatus = 'APPLIED' | 'DUPLICATE' | 'SERVER_WINS';

export interface RemoteSyncResponse {
  results: Array<{
    opId: string;
    status: SyncResultStatus;
    item?: {
      id: string;
      content: string;
      topic?: string;
      icon?: string;
      pinned?: boolean;
      updatedAt: string;
      deleted: boolean;
      seq?: number;
    };
  }>;
}

export interface RemoteCardPage {
  items: Array<{
    id: string;
    content: string;
    topic?: string;
    icon?: string;
    pinned?: boolean;
    updatedAt: string;
    deleted: boolean;
    seq?: number;
  }>;
  nextCursor: number;
}

export type LogoutSyncChoice =
  | 'sync_then_logout'
  | 'keep_local'
  | 'discard_unsynced';

export interface DefaultCardSeed {
  id: string;
  content: string;
  topic: string;
  icon: string;
}

export interface CardSyncTransport {
  pushOps(ops: OutboxOp[]): Promise<RemoteSyncResponse>;
  pullSince(sinceSeq: number, limit: number): Promise<RemoteCardPage>;
}

export interface CardStoreOptions {
  defaultCards: readonly DefaultCardSeed[];
  syncEnabled: boolean;
  generateId?: () => string;
}

interface PendingDelete {
  id: string;
  previousState: CardRecord;
  expiresAtMs: number;
}

export class CardStore {
  private readonly cards = new Map<string, CardRecord>();
  private readonly outbox: OutboxOp[] = [];
  private readonly syncEnabled: boolean;
  private readonly generateId: () => string;
  private lastDelete: PendingDelete | null = null;
  private cursorSeq = 0;

  constructor(options: CardStoreOptions) {
    this.syncEnabled = options.syncEnabled;
    this.generateId = options.generateId ?? (() => crypto.randomUUID());

    for (const seed of options.defaultCards) {
      if (seed.content.length > MAX_CARD_CONTENT_LENGTH) {
        throw new Error(`Default card "${seed.id}" exceeds ${MAX_CARD_CONTENT_LENGTH} chars.`);
      }
      this.cards.set(seed.id, {
        id: seed.id,
        content: seed.content,
        topic: seed.topic,
        icon: seed.icon,
        pinned: false,
        updatedAt: '1970-01-01T00:00:00.000Z',
        deleted: false,
        isDefault: true,
      });
    }
  }

  public isSyncEnabled(): boolean {
    return this.syncEnabled;
  }

  public listVisibleCards(filter: {
    scope?: CardFilterScope;
    topic?: string;
    query?: string;
  } = {}): CardRecord[] {
    const scope = filter.scope ?? 'all';
    const q = filter.query?.trim().toLowerCase() ?? '';

    return [...this.cards.values()].filter((card) => {
      if (card.deleted) return false;
      if (scope === 'mine' && card.isDefault) return false;
      if (filter.topic && card.topic !== filter.topic) return false;
      if (q && !card.content.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  public getPinnedCards(): CardRecord[] {
    return [...this.cards.values()].filter((c) => !c.deleted && c.pinned);
  }

  public hydratePersonalCards(records: readonly CardRecord[]): void {
    for (const record of records) {
      const existing = this.cards.get(record.id);
      if (existing?.isDefault) continue;
      this.cards.set(record.id, { ...record, isDefault: false });
    }
  }

  public getOutbox(): readonly OutboxOp[] {
    return [...this.outbox];
  }

  public getCursorSeq(): number {
    return this.cursorSeq;
  }

  public createCard(
    input: { content: string; topic?: string; icon?: string; pinned?: boolean },
    nowMs = Date.now()
  ): CardRecord {
    const content = input.content.trim();
    if (!content || content.length > MAX_CARD_CONTENT_LENGTH) {
      throw new Error(`Card content must be 1..${MAX_CARD_CONTENT_LENGTH} characters.`);
    }
    const pinned = Boolean(input.pinned);
    if (pinned && this.getPinnedCards().length >= MAX_PINNED_CARDS) {
      throw new Error(`Cannot pin more than ${MAX_PINNED_CARDS} cards.`);
    }

    const record: CardRecord = {
      id: this.generateId(),
      content,
      topic: input.topic,
      icon: input.icon,
      pinned,
      updatedAt: new Date(nowMs).toISOString(),
      deleted: false,
      isDefault: false,
    };

    this.cards.set(record.id, record);
    this.enqueueOutbox(record);
    return record;
  }

  public editCard(
    id: string,
    patch: { content?: string; topic?: string; icon?: string; pinned?: boolean },
    nowMs = Date.now()
  ): CardRecord {
    const existing = this.cards.get(id);
    if (!existing || existing.deleted) {
      throw new Error(`Card not found: ${id}`);
    }
    if (existing.isDefault) {
      throw new Error('Default cards cannot be edited.');
    }

    const nextContent = patch.content !== undefined ? patch.content.trim() : existing.content;
    if (!nextContent || nextContent.length > MAX_CARD_CONTENT_LENGTH) {
      throw new Error(`Card content must be 1..${MAX_CARD_CONTENT_LENGTH} characters.`);
    }

    const nextPinned = patch.pinned !== undefined ? patch.pinned : existing.pinned;
    if (!existing.pinned && nextPinned && this.getPinnedCards().length >= MAX_PINNED_CARDS) {
      throw new Error(`Cannot pin more than ${MAX_PINNED_CARDS} cards.`);
    }

    const updated: CardRecord = {
      ...existing,
      content: nextContent,
      topic: patch.topic !== undefined ? patch.topic : existing.topic,
      icon: patch.icon !== undefined ? patch.icon : existing.icon,
      pinned: nextPinned,
      updatedAt: new Date(nowMs).toISOString(),
    };

    this.cards.set(id, updated);
    this.enqueueOutbox(updated);
    return updated;
  }

  public deleteCard(id: string, nowMs = Date.now()): CardRecord {
    const existing = this.cards.get(id);
    if (!existing || existing.deleted) {
      throw new Error(`Card not found: ${id}`);
    }
    if (existing.isDefault) {
      throw new Error('Default cards cannot be deleted.');
    }

    this.lastDelete = {
      id,
      previousState: { ...existing },
      expiresAtMs: nowMs + UNDO_DELETE_WINDOW_MS,
    };

    const softDeleted: CardRecord = {
      ...existing,
      deleted: true,
      pinned: false,
      updatedAt: new Date(nowMs).toISOString(),
    };
    this.cards.set(id, softDeleted);
    this.enqueueOutbox(softDeleted);
    return softDeleted;
  }

  public undoDelete(nowMs = Date.now()): CardRecord | null {
    if (!this.lastDelete || nowMs > this.lastDelete.expiresAtMs) {
      this.lastDelete = null;
      return null;
    }

    const restored: CardRecord = {
      ...this.lastDelete.previousState,
      deleted: false,
      updatedAt: new Date(nowMs).toISOString(),
    };
    this.cards.set(restored.id, restored);
    this.lastDelete = null;
    this.enqueueOutbox(restored);
    return restored;
  }

  /**
   * B-06: push outbox then pull remote cursor when online (disabled in Play offline build).
   */
  public async syncWithServer(transport: CardSyncTransport, pageLimit = 200): Promise<void> {
    if (!this.syncEnabled) {
      throw new Error('Cloud sync is disabled in this build.');
    }

    if (this.outbox.length > 0) {
      const batch = this.outbox.splice(0, this.outbox.length);
      const pushResp = await transport.pushOps(batch);
      for (const res of pushResp.results) {
        if (res.item) {
          this.upsertFromRemote(res.item);
        }
      }
    }

    while (true) {
      const page = await transport.pullSince(this.cursorSeq, pageLimit);
      for (const remote of page.items) {
        this.upsertFromRemote(remote);
      }
      if (page.nextCursor <= this.cursorSeq || page.items.length < pageLimit) {
        this.cursorSeq = Math.max(this.cursorSeq, page.nextCursor);
        break;
      }
      this.cursorSeq = page.nextCursor;
    }
  }

  /**
   * B-06: handle 3 explicit logout options when unsynced outbox items exist.
   */
  public async handleLogout(
    choice: LogoutSyncChoice,
    transport?: CardSyncTransport
  ): Promise<void> {
    if (choice === 'sync_then_logout') {
      if (!transport) {
        throw new Error('Transport required to sync before logout.');
      }
      await this.syncWithServer(transport);
      return;
    }
    if (choice === 'discard_unsynced') {
      this.outbox.length = 0;
      for (const [id, card] of [...this.cards.entries()]) {
        if (!card.isDefault) {
          this.cards.delete(id);
        }
      }
      this.cursorSeq = 0;
      return;
    }
    // 'keep_local': preserve local cards & outbox untouched on device.
  }

  private enqueueOutbox(card: CardRecord): void {
    if (!this.syncEnabled || card.isDefault) {
      return;
    }
    this.outbox.push({
      opId: this.generateId(),
      id: card.id,
      content: card.content,
      topic: card.topic,
      icon: card.icon,
      pinned: card.pinned,
      updatedAt: card.updatedAt,
      deleted: card.deleted,
    });
  }

  private upsertFromRemote(remote: NonNullable<RemoteSyncResponse['results'][number]['item']>): void {
    const existing = this.cards.get(remote.id);
    if (existing?.isDefault) {
      return;
    }
    this.cards.set(remote.id, {
      id: remote.id,
      content: remote.content,
      topic: remote.topic,
      icon: remote.icon,
      pinned: Boolean(remote.pinned),
      updatedAt: remote.updatedAt,
      deleted: remote.deleted,
      seq: remote.seq,
      isDefault: false,
    });
    if (typeof remote.seq === 'number' && remote.seq > this.cursorSeq) {
      this.cursorSeq = remote.seq;
    }
  }
}

