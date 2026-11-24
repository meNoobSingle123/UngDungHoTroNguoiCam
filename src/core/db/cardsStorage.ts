import { create } from 'zustand';
import defaultCardsJson from '../../features/cards/defaultCards.json';
import {
  CardStore,
  type CardFilterScope,
  type CardRecord,
  type DefaultCardSeed,
} from '../../features/cards/cardStore.ts';
import {
  registerHistoryPersistListener,
  registerSettingsPersistListener,
  useSystemStore,
  type ConversationEntry,
  type PersistedSettingsSnapshot,
} from '../store/systemStatus.ts';

const defaultCards = defaultCardsJson as DefaultCardSeed[];
const cardStoreInstance = new CardStore({
  defaultCards,
  syncEnabled: false,
});

interface SqliteDbLike {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: unknown[]): Promise<unknown>;
  getAllAsync<T>(sql: string): Promise<T[]>;
}

let cachedDb: SqliteDbLike | null = null;

async function getSqliteDb(): Promise<SqliteDbLike | null> {
  if (cachedDb) return cachedDb;
  try {
    const SQLite = await import('expo-sqlite');
    const db = (await SQLite.openDatabaseAsync('sign_comm.db')) as unknown as SqliteDbLike;
    await db.execAsync(
      'CREATE TABLE IF NOT EXISTS cards (id TEXT PRIMARY KEY, content TEXT NOT NULL, topic TEXT, icon TEXT, pinned INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0);' +
        'CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);' +
        'CREATE TABLE IF NOT EXISTS conversation_history (id TEXT PRIMARY KEY, speaker TEXT NOT NULL, text TEXT NOT NULL, t_ms INTEGER NOT NULL);'
    );
    cachedDb = db;
    return db;
  } catch {
    return null;
  }
}

async function persistCardRecord(card: CardRecord): Promise<void> {
  const db = await getSqliteDb();
  if (!db) return;
  await db.runAsync(
    'INSERT OR REPLACE INTO cards (id, content, topic, icon, pinned, updated_at, deleted) VALUES (?, ?, ?, ?, ?, ?, ?);',
    card.id,
    card.content,
    card.topic ?? null,
    card.icon ?? null,
    card.pinned ? 1 : 0,
    card.updatedAt,
    card.deleted ? 1 : 0
  );
}

async function persistSettingsSnapshot(
  settings: Required<PersistedSettingsSnapshot>
): Promise<void> {
  const db = await getSqliteDb();
  if (!db) return;
  await db.runAsync(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?);',
    'preferences',
    JSON.stringify(settings)
  );
}

registerSettingsPersistListener((settings) => {
  persistSettingsSnapshot(settings).catch(() => {});
});

async function persistHistoryEntry(entry: ConversationEntry): Promise<void> {
  const db = await getSqliteDb();
  if (!db) return;
  await db.runAsync(
    'INSERT OR REPLACE INTO conversation_history (id, speaker, text, t_ms) VALUES (?, ?, ?, ?);',
    entry.id,
    entry.speaker,
    entry.text,
    entry.tMs
  );
}

async function clearHistoryDb(): Promise<void> {
  const db = await getSqliteDb();
  if (!db) return;
  await db.runAsync('DELETE FROM conversation_history;');
}

registerHistoryPersistListener({
  onAdd: (entry) => {
    persistHistoryEntry(entry).catch(() => {});
  },
  onClear: () => {
    clearHistoryDb().catch(() => {});
  },
});

export interface CardsUiState {
  revision: number;
  pinnedCards: CardRecord[];
  lastError: string | null;
  undoAvailableUntilMs: number | null;
  hydrateSqlite: () => Promise<void>;
  listCards: (filter?: { scope?: CardFilterScope; topic?: string; query?: string }) => CardRecord[];
  getPinnedCards: () => CardRecord[];
  createCard: (input: { content: string; topic?: string; pinned?: boolean }) => void;
  editCard: (id: string, patch: { content?: string; topic?: string; pinned?: boolean }) => void;
  deleteCard: (id: string) => void;
  undoDelete: () => void;
  togglePin: (id: string) => void;
  clearError: () => void;
}

export const useCardsStore = create<CardsUiState>((set, get) => ({
  revision: 0,
  pinnedCards: cardStoreInstance.getPinnedCards(),
  lastError: null,
  undoAvailableUntilMs: null,

  hydrateSqlite: async () => {
    const db = await getSqliteDb();
    if (!db) return;

    try {
      const cardRows = await db.getAllAsync<{
        id: string;
        content: string;
        topic: string | null;
        icon: string | null;
        pinned: number;
        updated_at: string;
        deleted: number;
      }>('SELECT id, content, topic, icon, pinned, updated_at, deleted FROM cards;');

      if (cardRows.length > 0) {
        cardStoreInstance.hydratePersonalCards(
          cardRows.map((row) => ({
            id: row.id,
            content: row.content,
            topic: row.topic ?? undefined,
            icon: row.icon ?? undefined,
            pinned: row.pinned === 1,
            updatedAt: row.updated_at,
            deleted: row.deleted === 1,
            isDefault: false,
          }))
        );
        set((s) => ({
          revision: s.revision + 1,
          pinnedCards: cardStoreInstance.getPinnedCards(),
        }));
      }

      const prefRows = await db.getAllAsync<{ key: string; value: string }>(
        'SELECT key, value FROM app_settings;'
      );
      const pref = prefRows.find((r) => r.key === 'preferences');
      if (pref) {
        const parsed = JSON.parse(pref.value) as PersistedSettingsSnapshot;
        useSystemStore.getState().applyPersistedSettings(parsed);
      }

      const historyRows = await db.getAllAsync<{
        id: string;
        speaker: string;
        text: string;
        t_ms: number;
      }>('SELECT id, speaker, text, t_ms FROM conversation_history ORDER BY t_ms ASC;');
      if (historyRows && historyRows.length > 0) {
        useSystemStore.setState({
          history: historyRows.map((r) => ({
            id: r.id,
            speaker: r.speaker === 'other' ? 'other' : 'me',
            text: r.text,
            tMs: r.t_ms,
          })),
        });
      }
    } catch {
      // Safe fallback when SQLite rows are empty or unreadable in tests.
    }
  },

  listCards: (filter) => {
    void get().revision;
    return cardStoreInstance.listVisibleCards(filter);
  },

  getPinnedCards: () => {
    void get().revision;
    return cardStoreInstance.getPinnedCards();
  },

  createCard: (input) => {
    try {
      const created = cardStoreInstance.createCard(input);
      persistCardRecord(created).catch(() => {});
      set((s) => ({
        revision: s.revision + 1,
        pinnedCards: cardStoreInstance.getPinnedCards(),
        lastError: null,
      }));
    } catch (err) {
      set({ lastError: err instanceof Error ? err.message : String(err) });
    }
  },

  editCard: (id, patch) => {
    try {
      const updated = cardStoreInstance.editCard(id, patch);
      persistCardRecord(updated).catch(() => {});
      set((s) => ({
        revision: s.revision + 1,
        pinnedCards: cardStoreInstance.getPinnedCards(),
        lastError: null,
      }));
    } catch (err) {
      set({ lastError: err instanceof Error ? err.message : String(err) });
    }
  },

  deleteCard: (id) => {
    try {
      const deleted = cardStoreInstance.deleteCard(id);
      persistCardRecord(deleted).catch(() => {});
      set((s) => ({
        revision: s.revision + 1,
        pinnedCards: cardStoreInstance.getPinnedCards(),
        lastError: null,
        undoAvailableUntilMs: Date.now() + 5000,
      }));
    } catch (err) {
      set({ lastError: err instanceof Error ? err.message : String(err) });
    }
  },

  undoDelete: () => {
    const restored = cardStoreInstance.undoDelete();
    if (restored) {
      persistCardRecord(restored).catch(() => {});
    }
    set((s) => ({
      revision: restored ? s.revision + 1 : s.revision,
      pinnedCards: restored ? cardStoreInstance.getPinnedCards() : s.pinnedCards,
      undoAvailableUntilMs: null,
    }));
  },

  togglePin: (id) => {
    try {
      const current = cardStoreInstance.listVisibleCards().find((c) => c.id === id);
      if (!current || current.isDefault) return;
      const updated = cardStoreInstance.editCard(id, { pinned: !current.pinned });
      persistCardRecord(updated).catch(() => {});
      set((s) => ({
        revision: s.revision + 1,
        pinnedCards: cardStoreInstance.getPinnedCards(),
        lastError: null,
      }));
    } catch (err) {
      set({ lastError: err instanceof Error ? err.message : String(err) });
    }
  },

  clearError: () => set({ lastError: null }),
}));
