/**
 * Sends an in-app notification + push to a specific user.
 * Fire-and-forget from client mutations — errors are swallowed intentionally.
 */
export async function notifyUser(params: {
  user_id: string;
  type: string;
  title: string;
  body?: string;
  url?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await fetch("/api/push/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: params.user_id,
        type: params.type,
        title: params.title,
        notif_body: params.body,
        url: params.url,
        metadata: params.metadata,
      }),
    });
  } catch {
    // Notifications are best-effort; never break the main flow
  }
}
