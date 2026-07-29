"use client";

import { useActionState } from "react";
import { LockKeyhole, LogIn } from "lucide-react";
import { loginAction, type LoginState } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      {state.message ? (
        <div className="rounded-md border-l-4 border-red-600 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          {state.message}
        </div>
      ) : null}
      <TextInput
        id="email"
        name="email"
        label="Email Address"
        type="email"
        autoComplete="email"
        required
      />
      <TextInput
        id="password"
        name="password"
        label="Password"
        type="password"
        autoComplete="current-password"
      />
      <Button type="submit" className="w-full" disabled={pending}>
        <LogIn className="h-4 w-4" aria-hidden="true" />
        {pending ? "Logging in..." : "Login"}
      </Button>
      <p className="flex items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm leading-6 text-sky-900">
        <LockKeyhole className="h-4 w-4 shrink-0" aria-hidden="true" />
        Do not share your login credentials with anyone.
      </p>
    </form>
  );
}
