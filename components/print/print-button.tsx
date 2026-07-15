"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton({ label = "Print Draft" }: { label?: string }) {
  return (
    <Button type="button" variant="secondary" className="print-hidden" onClick={() => window.print()}>
      <Printer aria-hidden="true" size={18} />
      {label}
    </Button>
  );
}
