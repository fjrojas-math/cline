/**
 * Utilities for parsing and validating GitHub Copilot tokens.
 */

/**
 * Extracts the expiration timestamp (exp) from a Copilot token string.
 * @param token Copilot token string (format: key1=val1;exp=TIMESTAMP;key2=val2;...)
 * @returns Expiration timestamp in seconds, or undefined if not found.
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
 * @param token Copilot token string
 * @param bufferSeconds Optional buffer in seconds before actual expiration (default: 60)
 * @returns true if expired or exp not found, false if still valid
 */
export function isCopilotTokenExpired(token: string, bufferSeconds = 60): boolean {
	const exp = extractCopilotTokenExp(token)
	if (!exp) return true
	const now = Math.floor(Date.now() / 1000)
	return now >= exp - bufferSeconds
}
