# Copilot Token Auth & Renewal Flow

## Overview

This document describes the logic and implementation for handling GitHub Copilot token acquisition, expiration detection, and automatic renewal in the Cline VSCode extension.

---

## Token Types

- **access_token**: GitHub OAuth token, obtained via device code flow, persisted securely in VSCode secrets as `copilotAccessToken`.
- **Copilot Token**: Special string (not JWT) used for Copilot API, format: `key1=val1;exp=TIMESTAMP;key2=val2;...`

---

## Expiration Handling

- The Copilot token contains an `exp` field (UNIX timestamp, seconds) indicating its expiration.
- Before using the Copilot token, the extension parses the token string, extracts `exp`, and checks if it is expired (with a configurable buffer, default 60s).
- If the token is expired, the extension attempts to renew it automatically using the persisted `access_token`.

### Token Parsing Utility

```ts
/**
 * Extracts the expiration timestamp (exp) from a Copilot token string.
 */
export function extractCopilotTokenExp(token: string): number | undefined {
  const match = token.match(/exp=(\d+)/)
  if (match) {
    return parseInt(match[1], 10)
  }
  return undefined
}

/**
 * Checks if a Copilot token is expired.
 */
export function isCopilotTokenExpired(token: string, bufferSeconds = 60): boolean {
  const exp = extractCopilotTokenExp(token)
  if (!exp) return true
  const now = Math.floor(Date.now() / 1000)
  return now >= (exp - bufferSeconds)
}
```

---

## Renewal Flow

1. **Expiration Check**: On each use, check if the Copilot token is expired.
2. **Automatic Renewal**: If expired, use the `access_token` (from VSCode secrets) to request a new Copilot token.
3. **Update Token**: If renewal succeeds, update the stored Copilot token and continue.
4. **User Intervention**: If renewal fails (e.g., `access_token` is also expired or revoked), prompt the user to re-authenticate via device code flow.

---

## User Experience

- The user only needs to re-authenticate if both the Copilot token and the `access_token` are expired or invalid.
- Otherwise, token renewal is transparent and automatic.
- The "Sign in with GitHub Copilot" button should only be shown if there is no valid access token with which to renew the Copilot token.
- Once the device authorization code is obtained (sometimes called "User code"), it should be displayed with a convenient option to copy it to the clipboard.
- [PENDING] The error "Anthropic API key is required" is still appearing in some flows and should be handled or hidden if the user is not using Anthropic.

---

## Implementation Notes

- The `access_token` is persisted using the same mechanism as other provider API keys (VSCode secrets).
- The Copilot token is parsed and validated using the utility functions above.
- This approach is inspired by the logic used in the opencode assistant.
