"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ConfirmSetupButton() {
  const [submitting, setSubmitting] = useState(false);

  return (
    <Button
      type="submit"
      variant="primary"
      disabled={submitting}
      onClick={() => setSubmitting(true)}
      className="w-full"
    >
      {submitting ? "Verifying setup link..." : "Continue Account Setup"}
    </Button>
  );
}
