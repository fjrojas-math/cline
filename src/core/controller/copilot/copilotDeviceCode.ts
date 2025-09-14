import { EmptyRequest } from "@shared/proto/cline/common"
import {
	CopilotAccessTokenRequest,
	CopilotAccessTokenResponse,
	CopilotDeviceCodeResponse,
	CopilotGetCopilotTokenRequest,
	CopilotGetCopilotTokenResponse,
} from "@shared/proto/cline/copilot"
import { getCopilotDeviceCode, getCopilotToken, pollForAccessToken } from "../../task/tools/handlers/CopilotDeviceCodeHandler"
import { Controller } from "../index"

/**
 * gRPC handler for the copilotDeviceCode endpoint.
 * @param controller Controller instance
 * @param _request EmptyRequest
 * @returns {Promise<CopilotDeviceCodeResponse>}
 */
export async function copilotDeviceCode(controller: Controller, _request: EmptyRequest): Promise<CopilotDeviceCodeResponse> {
	const result = await getCopilotDeviceCode()
	return CopilotDeviceCodeResponse.create({
		device: result.device,
		user: result.user,
		verification: result.verification,
		interval: result.interval,
		expiry: result.expiry,
	})
}

/**
 * gRPC handler for the copilotPollAccessToken endpoint.
 * @param controller Controller instance
 * @param request CopilotAccessTokenRequest
 * @returns {Promise<CopilotAccessTokenResponse>}
 */
export async function copilotPollAccessToken(
	controller: Controller,
	request: CopilotAccessTokenRequest,
): Promise<CopilotAccessTokenResponse> {
	const { deviceCode, interval } = request
	const result = await pollForAccessToken(deviceCode, interval)
	return CopilotAccessTokenResponse.create({
		accessToken: result.access_token,
		tokenType: result.token_type,
		scope: result.scope,
	})
}

/**
 * gRPC handler for the copilotGetCopilotToken endpoint.
 * @param controller Controller instance
 * @param request CopilotGetCopilotTokenRequest
 * @returns {Promise<CopilotGetCopilotTokenResponse>}
 */
export async function copilotGetCopilotToken(
	controller: Controller,
	request: CopilotGetCopilotTokenRequest,
): Promise<CopilotGetCopilotTokenResponse> {
	const { accessToken } = request
	const result = await getCopilotToken(accessToken)
	return CopilotGetCopilotTokenResponse.create({
		token: result.token,
		expiresAt: result.expires_at,
	})
}
