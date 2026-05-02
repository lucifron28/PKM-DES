"use client";

import { useActionState } from "react";
import { UserPlus } from "lucide-react";
import { createStudentAccountAction, type CreateAccountState } from "@/app/create-account/actions";
import {
  CREATE_ACCOUNT_STUDENT_TYPES,
  PROGRAM,
  YEAR_LEVELS
} from "@/lib/constants/pkm";
import { Button, ButtonLink } from "@/components/ui/button";
import { SelectInput, TextInput } from "@/components/ui/field";

const initialState: CreateAccountState = {};

export function CreateAccountForm() {
  const [state, formAction, pending] = useActionState(createStudentAccountAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      {state.message ? (
        <div
          className={
            state.success
              ? "rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700"
              : "rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800"
          }
        >
          {state.message}
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput id="first_name" name="first_name" label="First Name" required />
        <TextInput id="last_name" name="last_name" label="Last Name" required />
      </div>
      <TextInput
        id="email"
        name="email"
        label="Active Email Address"
        type="email"
        autoComplete="email"
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
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectInput id="student_type" name="student_type" label="Student Type" required defaultValue="">
          <option value="" disabled>
            Select student type
          </option>
          {CREATE_ACCOUNT_STUDENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </SelectInput>
        <TextInput id="student_id_number" name="student_id_number" label="Student ID Number" />
      </div>
      <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
        <p className="text-sm font-semibold text-sky-900">MVP password setup placeholder</p>
        <p className="mt-1 text-sm leading-6 text-sky-900">
          The official generated-password and email-sending workflow is pending approval. For local MVP testing,
          set a password here; this placeholder is documented in the README.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
      </div>
      <p className="rounded-md bg-secondary-100 px-3 py-2 text-sm text-slateui-text">
        You will be required to change your password after first login.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" disabled={pending}>
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          {pending ? "Creating..." : "Create Account"}
        </Button>
        <ButtonLink href="/" variant="outline">
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}
