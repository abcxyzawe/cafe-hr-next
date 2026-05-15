import { NextResponse } from "next/server";
import pkg from "../../../../package.json" with { type: "json" };

export const dynamic = "force-static";

const STARTED_AT = new Date().toISOString();

export async function GET() {
  return NextResponse.json({
    name: pkg.name,
    version: pkg.version,
    startedAt: STARTED_AT,
    nodeVersion: process.version,
    platform: process.platform,
    env: process.env.NODE_ENV ?? "unknown",
    commit:
      process.env.VERCEL_GIT_COMMIT_SHA ??
      process.env.GIT_COMMIT ??
      null,
  });
}
