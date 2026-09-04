import { supabase } from "./supabaseClient";

export type AuditAction = "Approved" | "Created" | "Modified" | "Rejected" | "Flagged";

// Writes one audit trail entry to the lender's log. Failures here are
// intentionally swallowed (not surfaced to the user) — a missed audit
// entry shouldn't block the actual action (approving a loan, sending a
// request) from completing.
export async function logAuditEvent(opts: {
  lenderId: string;
  actorId: string;
  action: AuditAction;
  actionText: string;
  entity: string;
}) {
  try {
    await supabase.from("audit_log").insert({
      lender_id: opts.lenderId,
      actor_id: opts.actorId,
      action: opts.action,
      action_text: opts.actionText,
      entity: opts.entity,
    });
  } catch {
    // best-effort — see comment above
  }
}