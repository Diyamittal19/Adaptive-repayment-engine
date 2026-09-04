import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

// Wraps a dashboard route (BorrowerApp, LenderApp) and checks two things
// before letting it render:
//   1. Is there a logged-in session at all?
//   2. Does that user's profile role actually match this route?
//
// Without this, typing /borrower or /lender directly in the URL bar
// works with no login at all — the React Router route exists regardless
// of whether anyone ever passed through /login. Row Level Security still
// protects the actual data either way, but this stops the empty
// dashboard shell itself from rendering for a logged-out or wrong-role
// visitor, and sends them somewhere sensible instead.
export default function RequireRole({
  role,
  children,
}: {
  role: "borrower" | "lender";
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;

    async function check() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate("/login", { replace: true });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (!active) return;

      if (!profile || profile.role !== role) {
        // Logged in, but as the wrong role (or no profile row at all) —
        // send them to their own dashboard rather than leaving them
        // stuck on one that isn't theirs.
        navigate(profile?.role ? `/${profile.role}` : "/login", { replace: true });
        return;
      }

      setChecked(true);
    }

    check();
    return () => {
      active = false;
    };
  }, [role, navigate]);

  if (!checked) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    );
  }

  return <>{children}</>;
}