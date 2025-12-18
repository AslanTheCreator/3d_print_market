import { NextResponse } from "next/server";

export async function GET() {
  const serverApiUrl = process.env.API_BASE_URL || "http://localhost:8081";

  const clientApiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

  return NextResponse.json({
    apiUrl: clientApiUrl,
  });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
