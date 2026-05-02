import { LogOut } from "lucide-react";
import { logoutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  return (
    <form action={logoutAction}>
      <Button variant="ghost" className="w-full justify-start">
        <LogOut className="h-4 w-4" aria-hidden="true" />
        {compact ? "Logout" : "Log out"}
      </Button>
    </form>
  );
}
