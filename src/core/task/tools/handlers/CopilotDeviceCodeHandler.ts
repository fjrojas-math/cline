/**
 * Handler to start the GitHub Copilot device code OAuth flow in Cline.
 * Based on the opencode implementation (authorize).
 */
import fetch from "node-fetch"

const CLIENT_ID = "Iv1.b507a08c87ecfe98"
const DEVICE_CODE_URL = "https://github.com/login/device/code"
const ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token"
const COPILOT_TOKEN_URL = "https://api.github.com/copilot_internal/v2/token"

export interface DeviceCodeResponse {
	device_code: string
	user_code: string
	verification_uri: string
	expires_in: number
	interval: number
}

export interface CopilotDeviceCodeResult {
	device: string
	user: string
	verification: string
	interval: number
	expiry: number
}

export interface AccessTokenResult {
	access_token: string
	token_type: string
	scope: string
}

export interface CopilotTokenResult {
	token: string
	expires_at: string
}

/**
 * Starts the device code OAuth flow for GitHub Copilot.
 * @returns {Promise<CopilotDeviceCodeResult>}
 */
export async function getCopilotDeviceCode(): Promise<CopilotDeviceCodeResult> {
	const response = await fetch(DEVICE_CODE_URL, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			"User-Agent": "GitHubCopilotChat/0.26.7",
		},
		body: JSON.stringify({
			client_id: CLIENT_ID,
			scope: "read:user",
		}),
	})
	if (!response.ok) {
		throw new Error(`GitHub device code request failed: ${response.statusText}`)
	}
	const deviceData: DeviceCodeResponse = await response.json()
	return {
		device: deviceData.device_code,
		user: deviceData.user_code,
		verification: deviceData.verification_uri,
		interval: deviceData.interval || 5,
		expiry: deviceData.expires_in,
	}
}

/**
 * Polls GitHub to obtain the access_token after user authorization.
 * @param deviceCode The device_code received in the previous step
 * @param interval Polling interval in seconds
 * @returns {Promise<AccessTokenResult>}
 */
export async function pollForAccessToken(deviceCode: string, interval: number): Promise<AccessTokenResult> {
	const maxAttempts = 60 // ~5 minutos
	let attempt = 0

	while (attempt < maxAttempts) {
		const response = await fetch(ACCESS_TOKEN_URL, {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				"User-Agent": "GitHubCopilotChat/0.26.7",
			},
			body: JSON.stringify({
				client_id: CLIENT_ID,
				device_code: deviceCode,
				grant_type: "urn:ietf:params:oauth:grant-type:device_code",
			}),
		})

		const data = await response.json()

		if (data.error === "authorization_pending") {
			// User has not authorized yet, wait and retry
			await new Promise((resolve) => setTimeout(resolve, interval * 1000))
			attempt++
		} else if (data.error === "slow_down") {
			// GitHub requests to increase the interval
			interval += 5
			await new Promise((resolve) => setTimeout(resolve, interval * 1000))
			attempt++
		} else if (data.error) {
			throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`)
		} else if (data.access_token) {
			// Authorization successful!
			return {
				access_token: data.access_token,
				token_type: data.token_type,
				scope: data.scope,
			}
		} else {
			throw new Error("Unexpected response from GitHub OAuth")
		}
	}

	throw new Error("Timeout waiting for user authorization")
}

/**
 * Obtains the Copilot Token (JWT) using the GitHub access_token.
 * @param accessToken GitHub access token
 * @returns {Promise<CopilotTokenResult>}
 */
export async function getCopilotToken(accessToken: string): Promise<CopilotTokenResult> {
	const response = await fetch(COPILOT_TOKEN_URL, {
		method: "GET",
		headers: {
			Authorization: `token ${accessToken}`,
			"User-Agent": "GitHubCopilotChat/0.26.7",
			Accept: "application/json",
		},
	})
	if (!response.ok) {
		throw new Error(`Copilot token request failed: ${response.statusText}`)
	}
	const data = await response.json()
	if (!data.token) {
		throw new Error("No Copilot token received")
	}
	return {
		token: data.token,
		expires_at: data.expires_at,
	}
}
