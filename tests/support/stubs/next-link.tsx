import React from "react";

export default function NextLink({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) {
  return React.createElement("a", { ...props, href, "data-testid": "mock-link" }, children);
}
