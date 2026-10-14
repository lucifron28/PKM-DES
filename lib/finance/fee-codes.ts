import { parseMoneyInput } from "./money";

export const ACCOUNTING_FEE_CODES = [
  { fee_code: "ADMISSION_FEE", fee_name: "Admission Fee", section: "MISCELLANEOUS" },
  { fee_code: "ATHLETIC_FEE", fee_name: "Athletic Fee", section: "MISCELLANEOUS" },
  { fee_code: "COMPUTER_FEE", fee_name: "Computer Fee", section: "MISCELLANEOUS" },
  { fee_code: "CULTURAL_FEE", fee_name: "Cultural Fee", section: "MISCELLANEOUS" },
  { fee_code: "DEVELOPMENT_FEE", fee_name: "Development Fee", section: "MISCELLANEOUS" },
  { fee_code: "ENTRANCE_FEE", fee_name: "Entrance Fee", section: "MISCELLANEOUS" },
  { fee_code: "GUIDANCE_FEE", fee_name: "Guidance Fee", section: "MISCELLANEOUS" },
  { fee_code: "HANDBOOK_FEE", fee_name: "Handbook Fee", section: "MISCELLANEOUS" },
  { fee_code: "LABORATORY_FEE", fee_name: "Laboratory Fee", section: "MISCELLANEOUS" },
  { fee_code: "LIBRARY_FEE", fee_name: "Library Fee", section: "MISCELLANEOUS" },
  { fee_code: "MEDICAL_AND_DENTAL_FEE", fee_name: "Medical and Dental Fee", section: "MISCELLANEOUS" },
  { fee_code: "REGISTRATION_FEE", fee_name: "Registration Fee", section: "MISCELLANEOUS" },
  { fee_code: "SCHOOL_ID_FEE", fee_name: "School ID Fee", section: "MISCELLANEOUS" },
  { fee_code: "TUITION_FEE", fee_name: "Tuition Fee", section: "TUITION" },
  { fee_code: "NSTP_FEE_CWTS", fee_name: "NSTP Fee (CWTS)", section: "NSTP" },
  { fee_code: "SCHOLARSHIP", fee_name: "Scholarship", section: "SCHOLARSHIP" }
] as const;

export type AccountingFeeCode = (typeof ACCOUNTING_FEE_CODES)[number]["fee_code"];
export type AccountingFeeSection = (typeof ACCOUNTING_FEE_CODES)[number]["section"];

export type AccountingFeeCatalogItem = {
  fee_code: AccountingFeeCode;
  fee_name: string;
  section: AccountingFeeSection;
  amount: number | null;
  active: boolean;
};

const accountingFeeCodeSet = new Set<string>(ACCOUNTING_FEE_CODES.map(({ fee_code }) => fee_code));
const accountingFeeByCode = new Map(ACCOUNTING_FEE_CODES.map((item) => [item.fee_code, item]));

export function isAccountingFeeCode(value: string): value is AccountingFeeCode {
  return accountingFeeCodeSet.has(value);
}

export function parseAccountingFeeCatalog(value: unknown): AccountingFeeCatalogItem[] | null {
  if (!Array.isArray(value)) return null;
  const parsed: AccountingFeeCatalogItem[] = [];
  for (const candidate of value) {
    if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) return null;
    const row = candidate as Record<string, unknown>;
    if (typeof row.fee_code !== "string" || !isAccountingFeeCode(row.fee_code)) return null;
    const definition = accountingFeeByCode.get(row.fee_code);
    const amount = row.amount === null ? null :
      typeof row.amount === "number" || typeof row.amount === "string"
        ? parseMoneyInput(String(row.amount), true) : null;
    if (
      !definition ||
      typeof row.fee_name !== "string" ||
      row.section !== definition.section ||
      typeof row.active !== "boolean" ||
      (row.amount !== null && amount === null) ||
      (row.active && amount === null)
    ) return null;
    parsed.push({
      fee_code: row.fee_code,
      fee_name: row.fee_name,
      section: definition.section,
      amount,
      active: row.active
    });
  }
  return parsed;
}
