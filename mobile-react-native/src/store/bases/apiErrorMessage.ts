import { ApiResponse } from "types/store/bases";

/** The request never reached the API, so there is nothing to quote back. */
const UNREACHABLE =
  "Could not reach the server. Check your connection and try again.";

/** The request was still in flight when its deadline ran out. */
const TIMED_OUT = "The server took too long to answer. Please try again.";

/**
 * Why a request failed, in the most specific terms available.
 *
 * Every error the backend raises comes back in the same envelope as a success
 * — `{ status, header, message }` — and those messages are written to be read
 * ("Only JPEG, PNG and WebP images are accepted"), so they are preferred over
 * anything this app could invent.
 *
 * A failure that never got that far has no message to quote, and answering it
 * with the caller's generic line hides the one thing worth knowing: whether the
 * request was refused, timed out, or never left the device. Those three are
 * named here instead. The caller's fallback is the last resort, not the first.
 */
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
