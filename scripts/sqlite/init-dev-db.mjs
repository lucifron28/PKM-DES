import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const workspaceRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const databasePath = resolve(workspaceRoot, "data/sqlite/pkm-des.dev.sqlite");
const schemaPath = resolve(workspaceRoot, "db/sqlite/schema.sql");
const subjectsPath = resolve(workspaceRoot, "lib/constants/subjects.ts");

mkdirSync(dirname(databasePath), { recursive: true });

const db = new DatabaseSync(databasePath);
db.exec("pragma foreign_keys = on");
db.exec(readFileSync(schemaPath, "utf8"));

const programId = "program-ais";
db.prepare(
  `insert into programs (id, name, code)
   values (?, ?, ?)
   on conflict(code) do update set name = excluded.name`
).run(programId, "Accounting Information System", "AIS");

const subjectSource = readFileSync(subjectsPath, "utf8");
const subjectPattern =
  /\{ course_code: "([^"]+)", course_description: "([^"]+)", units: (\d+), year_level: "([^"]+)", semester: "([^"]+)" \}/g;

const insertSubject = db.prepare(
  `insert into subjects (id, program_id, course_code, course_description, units, year_level, semester)
   values (?, ?, ?, ?, ?, ?, ?)
   on conflict(program_id, course_code, year_level, semester)
   do update set
     course_description = excluded.course_description,
     units = excluded.units`
);

let subjectsCount = 0;
let unitsTotal = 0;
let match;

while ((match = subjectPattern.exec(subjectSource)) !== null) {
  const [, courseCode, courseDescription, units, yearLevel, semester] = match;
  const subjectId = `${programId}-${courseCode}-${yearLevel}-${semester}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  insertSubject.run(subjectId, programId, courseCode, courseDescription, Number(units), yearLevel, semester);
  subjectsCount += 1;
  unitsTotal += Number(units);
}

if (subjectsCount === 0) {
  throw new Error("No AIS subjects were parsed from lib/constants/subjects.ts.");
}

const seeded = db
  .prepare(
    `select
       (select count(*) from programs) as programs_count,
       (select count(*) from subjects) as subjects_count,
       (select coalesce(sum(units), 0) from subjects) as total_units`
  )
  .get();

db.close();

console.log(`SQLite dev database initialized: ${databasePath}`);
console.log(`Parsed subjects: ${subjectsCount}`);
console.log(`Parsed total units: ${unitsTotal}`);
console.log(`Seeded programs: ${seeded.programs_count}`);
console.log(`Seeded subjects: ${seeded.subjects_count}`);
console.log(`Seeded total units: ${seeded.total_units}`);
