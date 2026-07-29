"use server";

import { NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/email";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  let setupUrl: URL;
  try {
    setupUrl = new URL("/setup-account", getAppBaseUrl());
  } catch {
    return new NextResponse("Account setup is not available.", { status: 400 });
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(setupUrl);
    }
  }

  return NextResponse.redirect(setupUrl);
}
