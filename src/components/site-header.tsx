import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { GraduationCap, History as HistoryIcon, LogOut, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin, useSession } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { session } = useSession();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="border-b border-border bg-exam-header text-exam-header-foreground">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <GraduationCap className="size-6" />
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-wide">NEET 2027 CBT Practice</p>
            <p className="text-[11px] opacity-75">National Testing Agency style interface</p>
          </div>
        </Link>
        <nav className="flex items-center gap-1">
          {session ? (
            <>
              <Button asChild variant="ghost" size="sm" className="hover:bg-white/10">
                <Link to="/history">
                  <History className="size-4" /> History
                </Link>
              </Button>
              {isAdmin && (
                <Button asChild variant="ghost" size="sm" className="hover:bg-white/10">
                  <Link to="/admin">
                    <ShieldCheck className="size-4" /> Admin
                  </Link>
                </Button>
              )}
              <Button variant="ghost" size="sm" className="hover:bg-white/10" onClick={signOut}>
                <LogOut className="size-4" /> Sign out
              </Button>
            </>
          ) : (
            <Button asChild variant="secondary" size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
