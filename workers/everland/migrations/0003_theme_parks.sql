CREATE TABLE IF NOT EXISTS park_forecasts (park TEXT PRIMARY KEY, forecast TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS park_snapshots (park TEXT NOT NULL, bucket INTEGER NOT NULL, fetched_at TEXT NOT NULL, snapshot TEXT NOT NULL, PRIMARY KEY(park,bucket));
