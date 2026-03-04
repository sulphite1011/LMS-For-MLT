import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(public message: string, public status: number, public code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

export function handleApiError(error: unknown) {
  console.error("[API Error]:", error);

  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status }
    );
  }

  // Handle Mongoose Validation Errors
  if (error instanceof Error && error.name === "ValidationError") {
    return NextResponse.json(
      { error: "Validation failed", details: error.message },
      { status: 400 }
    );
  }

  // Handle Mongoose Cast Errors (Invalid ID)
  if (error instanceof Error && error.name === "CastError") {
    return NextResponse.json(
      { error: "Invalid resource ID" },
      { status: 400 }
    );
  }

  // Default error
  const message = error instanceof Error ? error.message : "An unexpected error occurred";
  return NextResponse.json(
    { error: message },
    { status: 500 }
  );
}

export const AppErrors = {
  Unauthorized: (msg = "Authentication required") => new ApiError(msg, 401, "UNAUTHORIZED"),
  Forbidden: (msg = "Access denied") => new ApiError(msg, 403, "FORBIDDEN"),
  NotFound: (msg = "Resource not found") => new ApiError(msg, 404, "NOT_FOUND"),
  BadRequest: (msg = "Invalid request") => new ApiError(msg, 400, "BAD_REQUEST"),
  Conflict: (msg = "Resource already exists") => new ApiError(msg, 409, "CONFLICT"),
};
