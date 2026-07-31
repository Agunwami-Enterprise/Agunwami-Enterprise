export async function generateLiveKitToken(
  room: string,
  username: string,
  userId: string
): Promise<{ token: string; wsUrl: string }> {
  const res = await fetch("/api/livekit/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ room, username, userId }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to fetch LiveKit meeting token.");
  }

  return await res.json();
}
