import { NextResponse } from "next/server";

export function successResponse(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, code: string, status = 400) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
      },
    },
    { status }
  );
}
