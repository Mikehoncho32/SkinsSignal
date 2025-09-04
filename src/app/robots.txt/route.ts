import { NextResponse } from "next/server";
export async function GET() { return new NextResponse("User-agent: *\nAllow: /\n", { headers: { "Content-Type": "text/plain" } }); }
