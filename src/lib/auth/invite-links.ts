const INVITE_ACCEPT_PATH = "/auth/accept-invite";

type InviteCallbackParams = {
  code?: string;
  error?: string;
  error_description?: string;
  type?: string;
  token_hash?: string;
};

export function getInviteAcceptPath() {
  return INVITE_ACCEPT_PATH;
}

export function shouldRedirectToInviteAccept(params: InviteCallbackParams) {
  return Boolean(
    params.code ||
      params.error ||
      params.error_description ||
      params.token_hash ||
      params.type === "invite"
  );
}

export function buildInviteAcceptRedirect(params: InviteCallbackParams) {
  const searchParams = new URLSearchParams();

  for (const key of ["code", "error", "error_description", "type", "token_hash"] as const) {
    const value = params[key];

    if (value) {
      searchParams.set(key, value);
    }
  }

  const queryString = searchParams.toString();

  return queryString ? `${INVITE_ACCEPT_PATH}?${queryString}` : INVITE_ACCEPT_PATH;
}

export function ensureInviteAcceptRedirect(actionLink: string, inviteAcceptUrl: string) {
  const url = new URL(actionLink);
  url.searchParams.set("redirect_to", inviteAcceptUrl);

  return url.toString();
}
