import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const EXPECTED_HASH = "5352e997d40e1b5da1affaf908ceb2ef8134b64427ba88251813fc9a0a3ac07b";
const EXPECTED_TOTAL = 245;

const EXPECTED_COUNTS = {
  BSAIS: 25,
  BSMA: 24,
  BEED: 24,
  ENGLISH: 25,
  FILIPINO: 25,
  MATH: 25,
  SS: 25,
  CRIM: 16,
  ACP: 28,
  FSM: 28
};

function escapeSqlString(str) {
  return str.replace(/'/g, "''");
}

export function parseWorkbookAndGenerateMigration(workbookPath, outputPath) {
  if (!fs.existsSync(workbookPath)) {
    throw new Error(`Workbook file not found at: ${workbookPath}`);
  }

  const buf = fs.readFileSync(workbookPath);
  const hash = crypto.createHash("sha256").update(buf).digest("hex");

  if (hash !== EXPECTED_HASH) {
    throw new Error(`Workbook SHA-256 mismatch!\nExpected: ${EXPECTED_HASH}\nReceived: ${hash}`);
  }

  const wb = XLSX.read(buf, { type: "buffer" });
  const sheet = wb.Sheets["Sheet1"];
  if (!sheet) {
    throw new Error("Sheet1 not found in workbook.");
  }

  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const rawHeadings = matrix[0] || [];

  function normalizeProgramCode(raw) {
    if (!raw) return null;
    const s = String(raw).trim().toUpperCase();
    if (s === "AIS" || s === "BSAIS") return "BSAIS";
    if (s === "BSMA") return "BSMA";
    if (s === "BEED") return "BEED";
    if (s.includes("ENGLISH")) return "ENGLISH";
    if (s.includes("FILIPINO")) return "FILIPINO";
    if (s.includes("MATHEMATICS") || s === "MATH") return "MATH";
    if (s.includes("SOCIAL STUDIES") || s === "SS") return "SS";
    if (s.includes("CRIMINOLOGY") || s === "CRIM") return "CRIM";
    if (s === "ACP") return "ACP";
    if (s === "FSM") return "FSM";
    return s;
  }

  function normalizeYearLevel(raw) {
    if (!raw) return null;
    const s = String(raw).trim().toUpperCase();
    if (s.includes("FIRST") || s.includes("1ST")) return "1st Year";
    if (s.includes("SECOND") || s.includes("2ND")) return "2nd Year";
    if (s.includes("THIRD") || s.includes("3RD")) return "3rd Year";
    if (s.includes("FOURTH") || s.includes("4TH")) return "4th Year";
    return null;
  }

  const blocks = [];
  for (let c = 0; c < rawHeadings.length; c += 4) {
    const pName = rawHeadings[c];
    if (pName) {
      const code = normalizeProgramCode(pName);
      if (code) {
        blocks.push({ colIndex: c, rawName: String(pName).trim(), programCode: code });
      }
    }
  }

  const rawOfferings = [];

  for (const b of blocks) {
    let currentYearLevel = null;
    for (let r = 1; r < matrix.length; r++) {
      const row = matrix[r] || [];
      const cell0 = row[b.colIndex];
      const cell1 = row[b.colIndex + 1];
      const cell2 = row[b.colIndex + 2];

      const yl = normalizeYearLevel(cell0);
      if (yl) {
        currentYearLevel = yl;
        continue;
      }

      const strCode = cell0 ? String(cell0).trim() : "";
      if (strCode === "COURSE CODE" || strCode === "CORUSE CODE" || strCode === "COURSE") continue;
      if (!strCode || !cell1 || cell2 === undefined || cell2 === null) continue;

      const courseCode = strCode;
      const courseDesc = String(cell1).trim();
      const units = parseInt(String(cell2).trim(), 10);

      if (courseCode && courseDesc && !isNaN(units) && currentYearLevel) {
        rawOfferings.push({
          programCode: b.programCode,
          academicYear: "2025-2026",
          semester: "2nd Semester",
          yearLevel: currentYearLevel,
          courseCode,
          courseDescription: courseDesc,
          units,
          sourceDocument: "LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx"
        });
      }
    }
  }

  const uniqueMap = new Map();
  for (const item of rawOfferings) {
    const key = `${item.programCode}|${item.academicYear}|${item.semester}|${item.yearLevel}|${item.courseCode}|${item.courseDescription}|${item.units}|${item.sourceDocument}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, item);
    }
  }

  const uniqueOfferings = Array.from(uniqueMap.values());

  if (uniqueOfferings.length !== EXPECTED_TOTAL) {
    throw new Error(`Total unique offerings count mismatch!\nExpected: ${EXPECTED_TOTAL}\nReceived: ${uniqueOfferings.length}`);
  }

  const counts = {};
  for (const item of uniqueOfferings) {
    counts[item.programCode] = (counts[item.programCode] || 0) + 1;
  }

  for (const [code, expectedCount] of Object.entries(EXPECTED_COUNTS)) {
    if (counts[code] !== expectedCount) {
      throw new Error(`Program ${code} count mismatch!\nExpected: ${expectedCount}\nReceived: ${counts[code]}`);
    }
  }

  // CRIM assertions
  const crimRow1 = uniqueOfferings.find(r => r.programCode === "CRIM" && r.yearLevel === "1st Year" && r.courseCode === "Criminology 2");
  if (!crimRow1 || crimRow1.courseDescription !== "Theoriues of Crime Causation") {
    throw new Error(`CRIM Criminology 2 assertion failed: ${crimRow1?.courseDescription}`);
  }

  const sqlHeader = `-- Migration for multi-program client-provided course offerings
create table if not exists public.course_offerings (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  academic_year text not null check (academic_year ~ '^[0-9]{4}-[0-9]{4}$'),
  semester text not null check (semester in ('1st Semester', '2nd Semester', 'Summer')),
  year_level text not null check (year_level in ('1st Year', '2nd Year', '3rd Year', '4th Year')),
  course_code text not null,
  course_description text not null,
  units integer not null check (units >= 0),
  source_document text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_offerings_unique_entry unique (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
);

create index if not exists idx_course_offerings_prog_term on public.course_offerings (program_id, academic_year, semester);
create index if not exists idx_course_offerings_prog_term_yl on public.course_offerings (program_id, academic_year, semester, year_level);
create index if not exists idx_course_offerings_prog_code on public.course_offerings (program_id, course_code);

alter table public.course_offerings enable row level security;

drop policy if exists "Authenticated users can read course offerings" on public.course_offerings;
create policy "Authenticated users can read course offerings"
  on public.course_offerings
  for select
  to authenticated
  using (true);

-- Insert 245 unique workbook-derived course offerings
`;

  const sqlInserts = uniqueOfferings.map(o => {
    const code = escapeSqlString(o.programCode);
    const ay = escapeSqlString(o.academicYear);
    const sem = escapeSqlString(o.semester);
    const yl = escapeSqlString(o.yearLevel);
    const cc = escapeSqlString(o.courseCode);
    const cd = escapeSqlString(o.courseDescription);
    const src = escapeSqlString(o.sourceDocument);

    return `insert into public.course_offerings (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
select id, '${ay}', '${sem}', '${yl}', '${cc}', '${cd}', ${o.units}, '${src}'
from public.programs where code = '${code}'
on conflict on constraint course_offerings_unique_entry do nothing;`;
  }).join("\n");

  const fullSql = sqlHeader + "\n" + sqlInserts + "\n";

  if (outputPath) {
    fs.writeFileSync(outputPath, fullSql);
  }

  return { hash, counts, uniqueOfferings, fullSql };
}

// CLI execution
if (process.argv[1] && process.argv[1].includes("generate-course-offerings-migration")) {
  const defaultPath = path.join(process.cwd(), "data-sources", "LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx");
  const defaultOutputPath = path.join(process.cwd(), "supabase", "migrations", "20260730000001_multi_program_course_offerings.sql");
  const workbookPath = process.argv[2] || defaultPath;
  const outputPath = process.argv[3] || defaultOutputPath;

  console.log(`Parsing workbook from: ${workbookPath}`);
  const { hash, counts, uniqueOfferings } = parseWorkbookAndGenerateMigration(workbookPath, outputPath);
  console.log(`Workbook verified. Hash: ${hash}`);
  console.log("Program counts verified:", counts);
  console.log(`Total unique offerings: ${uniqueOfferings.length}`);
  console.log(`Migration written to: ${outputPath}`);
}
