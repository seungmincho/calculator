CREATE TABLE IF NOT EXISTS everland_weather (id INTEGER PRIMARY KEY CHECK (id=1), forecast TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS everland_daily (day TEXT PRIMARY KEY, observations INTEGER NOT NULL, mean_median REAL, updated_at TEXT NOT NULL);
