import { ApiResponse } from "types/store/bases";

const UNREACHABLE =
  "Could not reach the server. Check your connection and try again.";

const TIMED_OUT = "The server took too long to answer. Please try again.";

export const apiErrorMessage = (error: unknown, fallback: string): string => {
  const status = (error as { status?: unknown } | undefined)?.status;

  if (status === "FETCH_ERROR") return UNREACHABLE;
  if (status === "TIMEOUT_ERROR") return TIMED_OUT;

  const body = (error as { data?: unknown } | undefined)?.data as
    | ApiResponse<unknown>
    | undefined;

  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (message) return message;

  if (status === "PARSING_ERROR") {
    const original = (error as { originalStatus?: unknown }).originalStatus;
    return `The server replied with something this app could not read (${
      typeof original === "number" ? original : "no status"
    }).`;
  }

  if (typeof status === "number") {
    return `The server answered ${status} without saying why.`;
  }

  return fallback;
};

export default apiErrorMessage;
