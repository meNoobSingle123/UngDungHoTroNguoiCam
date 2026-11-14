import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  CardStore,
  MAX_CARD_CONTENT_LENGTH,
  MAX_PINNED_CARDS,
  UNDO_DELETE_WINDOW_MS,
  type CardSyncTransport,
  type DefaultCardSeed,
  type OutboxOp,
} from '../../src/features/cards/cardStore.ts';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const defaultCards = JSON.parse(
  fs.readFileSync(path.join(ROOT_DIR, 'src/features/cards/defaultCards.json'), 'utf8')
) as DefaultCardSeed[];

describe('U-05 Cards store, default seeds, 5s undo, pin <= 8', () => {
  it('loads >= 30 default cards <= 140 chars and prevents editing/deleting defaults', () => {
    assert.ok(defaultCards.length >= 30, `Expected >= 30 default cards, got ${defaultCards.length}`);
    for (const c of defaultCards) {
      assert.ok(c.content.length > 0 && c.content.length <= MAX_CARD_CONTENT_LENGTH);
    }

    const store = new CardStore({ defaultCards, syncEnabled: false });
    assert.equal(store.listVisibleCards({ scope: 'all' }).length, defaultCards.length);
    assert.equal(store.listVisibleCards({ scope: 'mine' }).length, 0);
    assert.ok(store.listVisibleCards({ topic: 'Y tế' }).length >= 5);
    assert.ok(store.listVisibleCards({ query: 'bác sĩ' }).length >= 1);

    assert.throws(() => store.editCard(defaultCards[0].id, { content: 'Sửa' }), /cannot be edited/);
    assert.throws(() => store.deleteCard(defaultCards[0].id), /cannot be deleted/);
  });

  it('enforces <= 140 chars, <= 8 pinned cards, and 5-second undo window on soft delete', () => {
    let seqId = 0;
    const store = new CardStore({
      defaultCards,
      syncEnabled: true,
      generateId: () => `00000000-0000-4000-8000-${String(++seqId).padStart(12, '0')}`,
    });

    assert.throws(() => store.createCard({ content: 'a'.repeat(141) }), /1\.\.140/);

    for (let i = 0; i < MAX_PINNED_CARDS; i += 1) {
      store.createCard({ content: `Thẻ ghim ${i + 1}`, pinned: true }, 1000 + i);
    }
    assert.throws(() => store.createCard({ content: 'Thẻ ghim 9', pinned: true }), /more than 8/);

    const mine = store.createCard({ content: 'Tôi cần giúp', topic: 'Y tế' }, 2000);
    store.deleteCard(mine.id, 3000);
    assert.equal(store.listVisibleCards({ query: 'Tôi cần giúp' }).length, 0);

    // Undo within 5000ms succeeds
    const restored = store.undoDelete(3000 + UNDO_DELETE_WINDOW_MS);
    assert.ok(restored);
    assert.equal(store.listVisibleCards({ query: 'Tôi cần giúp' }).length, 1);

    // Undo after 5000ms fails
    store.deleteCard(mine.id, 10000);
    assert.equal(store.undoDelete(10000 + UNDO_DELETE_WINDOW_MS + 1), null);
  });
});

describe('B-06 Offline outbox push-then-pull sync & 3 logout options', () => {
  it('pushes outbox ops then pulls pages, and handles 3 logout choices', async () => {
    let idCounter = 0;
    const store = new CardStore({
      defaultCards,
      syncEnabled: true,
      generateId: () => `11111111-1111-4111-8111-${String(++idCounter).padStart(12, '0')}`,
    });

    const card = store.createCard({ content: 'Xin chào bác sĩ', topic: 'Y tế' }, 5000);
    assert.equal(store.getOutbox().length, 1);

    const pushedOps: OutboxOp[] = [];
    const transport: CardSyncTransport = {
      async pushOps(ops) {
        pushedOps.push(...ops);
        return {
          results: ops.map((op) => ({
            opId: op.opId,
            status: 'APPLIED',
            item: { ...op, seq: 10 },
          })),
        };
      },
      async pullSince(sinceSeq) {
        if (sinceSeq >= 10) {
          return {
            items: [
              {
                id: '22222222-2222-4222-8222-000000000099',
                content: 'Thẻ từ thiết bị khác',
                topic: 'Đi lại',
                pinned: false,
                updatedAt: '2026-11-10T10:00:00Z',
                deleted: false,
                seq: 11,
              },
            ],
            nextCursor: 11,
          };
        }
        return { items: [], nextCursor: sinceSeq };
      },
    };

    await store.syncWithServer(transport);
    assert.equal(pushedOps.length, 1);
    assert.equal(store.getOutbox().length, 0);
    assert.equal(store.getCursorSeq(), 11);
    assert.equal(store.listVisibleCards({ query: 'thiết bị khác' }).length, 1);

    // 1) keep_local retains personal cards & outbox
    store.editCard(card.id, { content: 'Chưa đồng bộ' }, 6000);
    await store.handleLogout('keep_local');
    assert.equal(store.getOutbox().length, 1);
    assert.equal(store.listVisibleCards({ scope: 'mine' }).length, 2);

    // 2) sync_then_logout pushes before exit
    await store.handleLogout('sync_then_logout', transport);
    assert.equal(store.getOutbox().length, 0);

    // 3) discard_unsynced wipes personal cards & outbox while keeping defaults
    store.createCard({ content: 'Sẽ bị xóa khi thoát' }, 7000);
    await store.handleLogout('discard_unsynced');
    assert.equal(store.getOutbox().length, 0);
    assert.equal(store.listVisibleCards({ scope: 'mine' }).length, 0);
    assert.equal(store.listVisibleCards({ scope: 'all' }).length, defaultCards.length);
  });

  it('blocks sync when syncEnabled=false (Play offline release mode)', async () => {
    const store = new CardStore({ defaultCards, syncEnabled: false });
    store.createCard({ content: 'Chỉ lưu máy' }, 1000);
    assert.equal(store.getOutbox().length, 0);
    await assert.rejects(
      () =>
        store.syncWithServer({
          async pushOps() {
            return { results: [] };
          },
          async pullSince(s) {
            return { items: [], nextCursor: s };
          },
        }),
      /disabled/
    );
  });
});

describe('Enterprise CI & CODEOWNERS governance', () => {
  it('defines CODEOWNERS for recognizer-contract & openapi.yaml and CI workflow', () => {
    const codeowners = fs.readFileSync(path.join(ROOT_DIR, '.github/CODEOWNERS'), 'utf8');
    const ci = fs.readFileSync(path.join(ROOT_DIR, '.github/workflows/ci.yml'), 'utf8');

    assert.match(codeowners, /\/packages\/recognizer-contract\//);
    assert.match(codeowners, /\/docs\/api\/openapi\.yaml/);
    assert.match(ci, /npm test/);
    assert.match(ci, /npm run check:release-bundle/);
    assert.match(ci, /\.\/mvnw -B verify/);
  });
});

