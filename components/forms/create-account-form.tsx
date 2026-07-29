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
import { CREATE_ACCOUNT_STUDENT_TYPES } from "@/lib/constants/pkm";
import { EXPIRED_CLAIM_MESSAGE } from "@/lib/account-claim/rules";
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
          ? "rounded-md border-l-4 border-green-600 bg-green-50 px-4 py-3 text-sm font-medium text-green-700"
          : "rounded-md border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800"
      }
    >
      {message}
    </div>
  );
}

function DetailGrid({ record }: { record: ClaimRecordSummary }) {
  const rows = [
    ["Student ID Number", record.maskedStudentId],
    ["Student Name", record.displayName],
    ["Active Email Address", record.maskedEmail],
    ["Program", record.programName],
    ["Year Level", record.yearLevel],
    ["Student Type", record.studentType]
  ];

  return (
    <dl className="grid gap-3 border border-slateui-border bg-slateui-surfaceAlt p-4 text-sm sm:grid-cols-2">
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

export function CreateAccountForm({ claimExpired = false, emailEnabled = false }: { claimExpired?: boolean; emailEnabled?: boolean }) {
  const [claimState, claimAction, claiming] = useActionState(claimOfficialRecordAction, initialClaimState);
  const [createState, createAction, creating] = useActionState(createStudentAccountAction, initialCreateState);
  const matchedRecord = !createState.success ? claimState.matchedRecord : undefined;

  return (
    <div className="space-y-6">
      <form action={claimAction} className="space-y-5 border-b border-slateui-border pb-6">
        {claimExpired ? <AlertMessage message={EXPIRED_CLAIM_MESSAGE} /> : null}
        <AlertMessage message={claimState.message} />
        <div className="border-l-4 border-sky-500 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
          <p className="font-semibold">Find your Registrar-managed record first.</p>
          <p className="mt-1">
            Enter your active email address and Student ID Number exactly as recorded by the Registrar. If a matching official record exists, the system will use those official details for your account.
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
            required
          />
          <TextInput
            id="student_id_number"
            name="student_id_number"
            label="Student ID Number"
            placeholder="23-00340"
            defaultValue={claimState.studentIdNumber ?? ""}
            required
          />
        </div>
        <Button type="submit" disabled={claiming}>
          <Search className="h-4 w-4" aria-hidden="true" />
          {claiming ? "Finding..." : "Find My Record"}
        </Button>
      </form>

      {createState.success ? (
        <div className="border-l-4 border-green-600 bg-green-50 p-4 text-sm text-green-900">
          <AlertMessage message={createState.message} success />
          <ButtonLink href="/login" className="mt-3">Go to Login</ButtonLink>
        </div>
      ) : null}

      {matchedRecord ? (
        <form action={createAction} className="space-y-5 border border-green-200 bg-white p-5 shadow-panel">
          <AlertMessage message={createState.message} success={createState.success} />
          <div>
            <p className="text-sm font-semibold text-green-800">Official record found</p>
            <p className="mt-1 text-sm text-slateui-muted">
              Review these official details, then set your password to create the account.
            </p>
          </div>
          <DetailGrid record={matchedRecord} />
          {!emailEnabled && <PasswordFields />}
          {emailEnabled && (
            <div className="border-l-4 border-sky-500 bg-sky-50 px-3 py-2 text-sm text-sky-800">
              A setup link will be sent to your email address to complete account creation.
            </div>
          )}
          <Button type="submit" disabled={creating}>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            {creating ? "Creating..." : "Create Account"}
          </Button>
        </form>
      ) : null}

      <p className="border-l-4 border-secondary-600 bg-secondary-100 px-3 py-2.5 text-sm leading-6 text-slateui-text">
        You may change your password after first login. The official generated-password email workflow remains pending.
      </p>
      <ButtonLink href="/" variant="outline">
        Cancel
      </ButtonLink>
    </div>
  );
}
