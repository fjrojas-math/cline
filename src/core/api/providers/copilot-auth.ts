// Utilidades para autorización y gestión de tokens Copilot en Cline

import fetch from "node-fetch"

const CLIENT_ID = "Iv1.b507a08c87ecfe98"
const DEVICE_CODE_URL = "https://github.com/login/device/code"
const ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token"
const COPILOT_API_KEY_URL = "https://api.github.com/copilot_internal/v2/token"

export interface DeviceCodeResult {
	device: string
	user: string
	verification: string
	interval: number
	expiry: number
}

export async function copilotAuthorize(): Promise<DeviceCodeResult> {
	const deviceResponse = await fetch(DEVICE_CODE_URL, {
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
	const deviceData = await deviceResponse.json()
	return {
		device: deviceData.device_code,
		user: deviceData.user_code,
		verification: deviceData.verification_uri,
		interval: deviceData.interval || 5,
		expiry: deviceData.expires_in,
	}
}

export async function copilotPoll(device_code: string): Promise<"pending" | "complete" | "failed"> {
	const response = await fetch(ACCESS_TOKEN_URL, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			"User-Agent": "GitHubCopilotChat/0.26.7",
		},
		body: JSON.stringify({
			client_id: CLIENT_ID,
			device_code,
			grant_type: "urn:ietf:params:oauth:grant-type:device_code",
		}),
	})

	if (!response.ok) return "failed"

	const data = await response.json()

	if (data.access_token) {
		// Aquí deberías almacenar el refresh token de forma segura
		// Por ahora, solo lo devolvemos
		return "complete"
	}

	if (data.error === "authorization_pending") return "pending"
	if (data.error) return "failed"
	return "pending"
}

export interface CopilotTokenResult {
	token: string
	expires_at: number
	refresh_in: number
	endpoints: { api: string }
}

export async function copilotAccess(refreshToken: string): Promise<CopilotTokenResult | undefined> {
	const response = await fetch(COPILOT_API_KEY_URL, {
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${refreshToken}`,
			"User-Agent": "GitHubCopilotChat/0.26.7",
			"Editor-Version": "vscode/1.99.3",
			"Editor-Plugin-Version": "copilot-chat/0.26.7",
		},
	})

	if (!response.ok) return

	const tokenData = await response.json()
	return tokenData
}
