import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const jar = await cookies();
  jar.delete("folio_session");
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.delete("folio_session");
  return response;
}
