"use client";

import { useActionState } from "react";
import { Search, UserPlus } from "lucide-react";
import {
  claimOfficialRecordAction,
  createStudentAccountAction,
  type ClaimAccountState,
  type ClaimRecordSummary,
  type CreateAccountState
} from "@/app/create-account/actions";
import {
  CREATE_ACCOUNT_STUDENT_TYPES,
  PROGRAM,
  YEAR_LEVELS
} from "@/lib/constants/pkm";
import { Button, ButtonLink } from "@/components/ui/button";
import { SelectInput, TextInput } from "@/components/ui/field";

const initialClaimState: ClaimAccountState = {};
const initialCreateState: CreateAccountState = {};

function AlertMessage({ message, success }: { message?: string; success?: boolean }) {
  if (!message) {
    return null;
  }

  return (
    <div
      className={
        success
          ? "rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700"
          : "rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800"
      }
    >
      {message}
    </div>
  );
}

function DetailGrid({ record }: { record: ClaimRecordSummary }) {
  const rows = [
    ["Student ID Number", record.studentIdNumber ?? "Not provided"],
    ["Full Name", `${record.firstName} ${record.lastName}`],
    ["Active Email Address", record.email],
    ["Program", record.programName],
    ["Year Level", record.yearLevel],
    ["Student Type", record.studentType],
    ["Enrollment Status", record.enrollmentStatus]
  ];

  return (
    <dl className="grid gap-3 rounded-lg border border-slateui-border bg-slateui-surfaceAlt p-4 text-sm sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="font-medium text-slateui-muted">{label}</dt>
          <dd className="mt-1 font-semibold text-slateui-text">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function PasswordFields() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextInput
        id="password"
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        required
      />
      <TextInput
        id="confirm_password"
        name="confirm_password"
        label="Confirm Password"
        type="password"
        autoComplete="new-password"
        required
      />
    </div>
  );
}

export function CreateAccountForm() {
  const [claimState, claimAction, claiming] = useActionState(claimOfficialRecordAction, initialClaimState);
  const [createState, createAction, creating] = useActionState(createStudentAccountAction, initialCreateState);

  return (
    <div className="space-y-6">
      <form action={claimAction} className="space-y-5">
        <AlertMessage message={claimState.message} />
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
          <p className="font-semibold">Find your Registrar-managed record first.</p>
          <p className="mt-1">
            Enter either your active email address or Student ID Number. If a matching official record exists, the system will use those official details for your account.
          </p>
        </div>
        <SelectInput id="student_type" name="student_type" label="Student Type" required defaultValue={claimState.selectedStudentType ?? ""}>
          <option value="" disabled>
            Select student type
          </option>
          {CREATE_ACCOUNT_STUDENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </SelectInput>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            id="email"
            name="email"
            label="Active Email Address"
            type="email"
            autoComplete="email"
            placeholder="maria.santos@example.com"
            defaultValue={claimState.email ?? ""}
          />
          <TextInput
            id="student_id_number"
            name="student_id_number"
            label="Student ID Number"
            placeholder="23-00340"
            defaultValue={claimState.studentIdNumber ?? ""}
          />
        </div>
        <Button type="submit" disabled={claiming}>
          <Search className="h-4 w-4" aria-hidden="true" />
          {claiming ? "Finding..." : "Find My Record"}
        </Button>
      </form>

      {claimState.matchedRecord ? (
        <form action={createAction} className="space-y-5 rounded-lg border border-green-200 bg-white p-4">
          <AlertMessage message={createState.message} success={createState.success} />
          <input type="hidden" name="mode" value="official_claim" />
          <input type="hidden" name="official_record_id" value={claimState.matchedRecord.id} />
          <input type="hidden" name="claimed_student_type" value={claimState.selectedStudentType ?? ""} />
          <div>
            <p className="text-sm font-semibold text-green-800">Official record found</p>
            <p className="mt-1 text-sm text-slateui-muted">
              Review these official details, then set your password to create the account.
            </p>
          </div>
          <DetailGrid record={claimState.matchedRecord} />
          <PasswordFields />
          <Button type="submit" disabled={creating}>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            {creating ? "Creating..." : "Create Account"}
          </Button>
        </form>
      ) : null}

      {claimState.oldStudentFallback ? (
        <form action={createAction} className="space-y-5 rounded-lg border border-amber-200 bg-white p-4">
          <AlertMessage message={createState.message} success={createState.success} />
          <input type="hidden" name="mode" value="old_manual" />
          <div>
            <p className="text-sm font-semibold text-amber-900">No official record was found for this Old Student claim.</p>
            <p className="mt-1 text-sm text-slateui-muted">
              Old Student self-registration may continue with Student ID Number and basic account details.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput id="first_name" name="first_name" label="First Name" required />
            <TextInput id="last_name" name="last_name" label="Last Name" required />
          </div>
          <TextInput
            id="manual_email"
            name="email"
            label="Active Email Address"
            type="email"
            autoComplete="email"
            defaultValue={claimState.oldStudentFallback.email}
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectInput id="program_code" name="program_code" label="Program" required defaultValue={PROGRAM.code}>
              <option value={PROGRAM.code}>{PROGRAM.name}</option>
            </SelectInput>
            <SelectInput id="year_level" name="year_level" label="Year Level" required defaultValue="">
              <option value="" disabled>
                Select year level
              </option>
              {YEAR_LEVELS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </SelectInput>
          </div>
          <TextInput
            id="manual_student_id_number"
            name="student_id_number"
            label="Student ID Number"
            defaultValue={claimState.oldStudentFallback.studentIdNumber}
            required
          />
          <PasswordFields />
          <Button type="submit" disabled={creating}>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            {creating ? "Creating..." : "Create Account"}
          </Button>
        </form>
      ) : null}

      <p className="rounded-md bg-secondary-100 px-3 py-2 text-sm text-slateui-text">
        You may change your password after first login. The official generated-password email workflow remains pending.
      </p>
      <ButtonLink href="/" variant="outline">
        Cancel
      </ButtonLink>
    </div>
  );
}
