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

// Keep an existing local development database compatible with the dual-source
// enrollment attachment columns introduced after the initial SQLite schema.
for (const column of [
  ["course_offering_id", "text"],
  ["course_code", "text"],
  ["course_description", "text"],
  ["units", "integer"]
]) {
  try {
    db.exec(`alter table enrollment_subjects add column ${column[0]} ${column[1]}`);
  } catch (error) {
    if (!String(error).toLowerCase().includes("duplicate column")) {
      throw error;
    }
  }
}

db.exec(`
  update enrollment_subjects
  set
    course_code = (select course_code from subjects where subjects.id = enrollment_subjects.subject_id),
    course_description = (select course_description from subjects where subjects.id = enrollment_subjects.subject_id),
    units = (select units from subjects where subjects.id = enrollment_subjects.subject_id)
  where subject_id is not null and (course_code is null or course_description is null or units is null)
`);

const programId = "program-bsais";
const programs = [
  { id: "program-bsais", name: "Accounting Information System", code: "BSAIS" },
  { id: "program-bsma", name: "Management Accounting", code: "BSMA" },
  { id: "program-beed", name: "Bachelor of Elementary Education", code: "BEED" },
  { id: "program-english", name: "Bachelor of Arts in English", code: "ENGLISH" },
  { id: "program-filipino", name: "Bachelor of Arts in Filipino", code: "FILIPINO" },
  { id: "program-math", name: "Bachelor of Science in Mathematics", code: "MATH" },
  { id: "program-ss", name: "Bachelor of Arts in Social Studies", code: "SS" },
  { id: "program-crim", name: "Bachelor of Science in Criminology", code: "CRIM" },
  { id: "program-acp", name: "Agriculture Crop Production", code: "ACP" },
  { id: "program-fsm", name: "Food Service Management", code: "FSM" }
];

const insertProgram = db.prepare(
  `insert into programs (id, name, code)
   values (?, ?, ?)
   on conflict(code) do update set name = excluded.name`
);

for (const p of programs) {
  insertProgram.run(p.id, p.name, p.code);
}

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
console.log("Seeded historical course offerings: 0 (client workbook is intentionally excluded from the repository seed)");
console.log("Seeded active standard-load sets: 0 (requires Registrar-approved term configuration)");
