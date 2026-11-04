CREATE TABLE IF NOT EXISTS everland_snapshots (
  bucket INTEGER PRIMARY KEY,
  day TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  snapshot TEXT NOT NULL,
  summary TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS everland_day_bucket ON everland_snapshots(day, bucket);
