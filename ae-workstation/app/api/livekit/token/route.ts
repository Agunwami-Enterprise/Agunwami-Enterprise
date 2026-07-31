import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export async function POST(req: Request) {
  try {
    const { room, username, userId } = await req.json();

    if (!room) {
      return NextResponse.json({ error: "Room name is required" }, { status: 400 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY || "API8mRucaoS3EA3";
    const apiSecret = process.env.LIVEKIT_API_SECRET || "DsfZnQAfUVsm7yA2IDwiWcdolE9QCqH7zNaclNlU7vC";
    const wsUrl =
      process.env.LIVEKIT_URL ||
      process.env.NEXT_PUBLIC_LIVEKIT_URL ||
      "wss://web-meeting-6y58g3jg.livekit.cloud";

    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId || username || "anonymous",
      name: username || "Staff Member",
    });

    at.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();
    return NextResponse.json({ token, wsUrl });
  } catch (error: any) {
    console.error("Error generating LiveKit token:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate meeting token" },
      { status: 500 }
    );
  }
}
