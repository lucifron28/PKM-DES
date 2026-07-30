import React from "react";

interface LogoutButtonProps {
  className?: string;
}

export function LogoutButton({ className }: LogoutButtonProps) {
  return React.createElement("button", {
    className,
    "data-testid": "logout-button",
    type: "button"
  }, "Logout");
}
