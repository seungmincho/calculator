-- Raw snapshots expire after 7 days; these keep the history needed for calendars and statistics.
-- ride '_park' = the park-wide median of displayed waits for that hour.
CREATE TABLE IF NOT EXISTS ride_hourly (park TEXT NOT NULL, day TEXT NOT NULL, hour INTEGER NOT NULL, ride TEXT NOT NULL, name TEXT NOT NULL, samples INTEGER NOT NULL, operating INTEGER NOT NULL, reported INTEGER NOT NULL, avg_wait REAL, max_wait REAL, PRIMARY KEY(park,day,hour,ride));
-- Provider operating hours (OPERATING entries only). Absence of a day means unknown, not closed.
CREATE TABLE IF NOT EXISTS park_schedules (park TEXT NOT NULL, day TEXT NOT NULL, opening TEXT NOT NULL, closing TEXT NOT NULL, fetched_at TEXT NOT NULL, PRIMARY KEY(park,day));
