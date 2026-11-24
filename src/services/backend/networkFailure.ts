type FailureShape = {
  name?: unknown;
  code?: unknown;
  cause?: unknown;
};

// Supabase/PostgREST returns status 0 when fetch never receives an HTTP
// response. Raw fetch implementations reject with TypeError, while timeouts
// and cancellations use AbortError/ABORT_ERR. Do not inspect localized error
// text: a real server error must remain distinguishable from a transport loss.
export function isNetworkFailure(failure: unknown, status?: number): boolean {
  if (status === 0) return true;
  if (failure instanceof TypeError) return true;
  if (!failure || typeof failure !== 'object') return false;
  const value = failure as FailureShape;
  if (value.name === 'TypeError' || value.name === 'AbortError' || value.code === 'ABORT_ERR') return true;
  return value.cause !== undefined && value.cause !== failure && isNetworkFailure(value.cause);
}
