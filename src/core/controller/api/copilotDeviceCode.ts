import { getCopilotDeviceCode } from "../../task/tools/handlers/CopilotDeviceCodeHandler"
import { Controller } from "../index"

/**
 * Endpoint para exponer el flujo de device code OAuth de GitHub Copilot al frontend.
 * @param controller Instancia del Controller
 * @returns {Promise<{ device: string, user: string, verification: string, interval: number, expiry: number }>}
 */
export async function copilotDeviceCode(controller: Controller) {
	return await getCopilotDeviceCode()
}
