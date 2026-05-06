import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, '..', 'dev.db'));
const now = new Date().toISOString();

// FTE data sourced from: RxEVO Modernization Milestones(FTEs).csv
// timelineId = 1 (RxEVO Modernization)
const records = [
  { fy: 2021, q: 'Q3', total: 5,  platform: 3, replacement: 2, newFte: 0, bc: 0 },
  { fy: 2021, q: 'Q4', total: 5,  platform: 3, replacement: 2, newFte: 0, bc: 0 },
  { fy: 2022, q: 'Q1', total: 8,  platform: 4, replacement: 4, newFte: 0, bc: 0 },
  { fy: 2022, q: 'Q2', total: 8,  platform: 4, replacement: 4, newFte: 0, bc: 0 },
  { fy: 2022, q: 'Q3', total: 10, platform: 4, replacement: 4, newFte: 2, bc: 0 },
  { fy: 2022, q: 'Q4', total: 13, platform: 3, replacement: 4, newFte: 5, bc: 1 },
  { fy: 2023, q: 'Q1', total: 16, platform: 3, replacement: 3, newFte: 1, bc: 9 },
  { fy: 2023, q: 'Q2', total: 18, platform: 5, replacement: 4, newFte: 0, bc: 9 },
  { fy: 2023, q: 'Q3', total: 19, platform: 5, replacement: 3, newFte: 2, bc: 9 },
  { fy: 2023, q: 'Q4', total: 17, platform: 3, replacement: 3, newFte: 2, bc: 9 },
  { fy: 2024, q: 'Q1', total: 16, platform: 3, replacement: 2, newFte: 2, bc: 9 },
  { fy: 2024, q: 'Q2', total: 19, platform: 3, replacement: 6, newFte: 1, bc: 9 },
  { fy: 2024, q: 'Q3', total: 18, platform: 4, replacement: 8, newFte: 3, bc: 3 },
  { fy: 2024, q: 'Q4', total: 18, platform: 4, replacement: 8, newFte: 3, bc: 3 },
  { fy: 2025, q: 'Q1', total: 18, platform: 4, replacement: 8, newFte: 3, bc: 3 },
  { fy: 2025, q: 'Q2', total: 20, platform: 5, replacement: 5, newFte: 2, bc: 8 },
  { fy: 2025, q: 'Q3', total: 18, platform: 4, replacement: 4, newFte: 2, bc: 8 },
  { fy: 2025, q: 'Q4', total: 14, platform: 4, replacement: 4, newFte: 2, bc: 4 },
  { fy: 2026, q: 'Q1', total: 18, platform: 4, replacement: 8, newFte: 2, bc: 4 },
  { fy: 2026, q: 'Q2', total: 16, platform: 4, replacement: 7, newFte: 1, bc: 4 },
];

const stmt = db.prepare(`
  INSERT INTO QuarterlyCapacity
    (timelineId, fiscalYear, quarter, totalFte, platformFte, replacementFte, newFte, businessContinuityFte, createdAt, updatedAt)
  VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(timelineId, fiscalYear, quarter) DO UPDATE SET
    totalFte=excluded.totalFte,
    platformFte=excluded.platformFte,
    replacementFte=excluded.replacementFte,
    newFte=excluded.newFte,
    businessContinuityFte=excluded.businessContinuityFte,
    updatedAt=excluded.updatedAt
`);

const insertMany = db.transaction((rows) => {
  for (const r of rows) {
    stmt.run(r.fy, r.q, r.total, r.platform, r.replacement, r.newFte, r.bc, now, now);
  }
});

insertMany(records);
console.log(`Seeded ${records.length} quarterly capacity records for timeline 1 (RxEVO Modernization).`);
db.close();
