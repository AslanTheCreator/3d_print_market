import { NextResponse } from "next/server";
import { getClientApiBaseUrl } from "@/shared/config/env";

export async function GET() {
  return NextResponse.json({
    apiUrl: getClientApiBaseUrl(),
  });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
