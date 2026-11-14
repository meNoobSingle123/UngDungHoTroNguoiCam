CREATE TABLE users (
  id UUID PRIMARY KEY,
  firebase_uid TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE SEQUENCE card_seq;

CREATE TABLE cards (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content VARCHAR(140) NOT NULL,
  topic TEXT,
  icon TEXT,
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted BOOLEAN NOT NULL DEFAULT FALSE,
  seq BIGINT NOT NULL DEFAULT nextval('card_seq')
);

CREATE INDEX cards_user_seq ON cards(user_id, seq);

CREATE TABLE settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE processed_ops (
  op_id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE library_packs (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  word_count INT NOT NULL,
  url TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL
);

