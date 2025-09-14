import { EmptyRequest } from "@shared/proto/cline/common"
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { useState } from "react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { CopilotServiceClient } from "@/services/grpc-client"

/**
 * Props for the CopilotProvider component
 */
interface CopilotProviderProps {
	showModelOptions: boolean
	isPopup?: boolean
	currentMode: string
}

/**
 * The GitHub Copilot provider configuration component
 */
export const CopilotProvider = ({ showModelOptions, isPopup, currentMode }: CopilotProviderProps) => {
	const { apiConfiguration } = useExtensionState()
	const [authStatus, setAuthStatus] = useState<"idle" | "authorizing" | "authorized" | "error">("idle")
	const [userCode, setUserCode] = useState<string | null>(null)
	const [verificationUri, setVerificationUri] = useState<string | null>(null)
	const [polling, setPolling] = useState(false)
	const [copilotToken, setCopilotToken] = useState<string | null>(null)

	// Calls the backend to start the device code flow and automatically starts polling
	const handleAuthorize = async () => {
		setAuthStatus("authorizing")
		setUserCode(null)
		setVerificationUri(null)
		setCopilotToken(null)
		setPolling(false)
		try {
			const response = await CopilotServiceClient.copilotDeviceCode(EmptyRequest.create())
			setUserCode(response.user)
			setVerificationUri(response.verification)

			// Automatically open the browser with the verification link
			if (response.verification) {
				window.open(response.verification, "_blank", "noopener,noreferrer")
			}

			// Start polling for the access token in parallel
			setPolling(true)
			try {
				const tokenResponse = await CopilotServiceClient.copilotPollAccessToken({
					deviceCode: response.device,
					interval: response.interval,
				})
				setCopilotToken(tokenResponse.accessToken)
				setAuthStatus("authorized")
			} catch (pollError) {
				setAuthStatus("error")
			} finally {
				setPolling(false)
			}
		} catch (error) {
			setAuthStatus("error")
		}
	}

	return (
		<div>
			<h3 style={{ fontWeight: 600, marginBottom: 8 }}>GitHub Copilot</h3>
			<p>Para usar Copilot, debes autorizar tu cuenta de GitHub. Pulsa el botón para iniciar el proceso de login seguro.</p>
			<VSCodeButton disabled={authStatus === "authorizing" || polling} onClick={handleAuthorize}>
				{authStatus === "authorizing" || polling ? "Authorizing..." : "Sign in with GitHub"}
			</VSCodeButton>
			{userCode && verificationUri && (
				<div style={{ marginTop: 12 }}>
					<p>
						<b>User code:</b> <span style={{ fontFamily: "monospace" }}>{userCode}</span>
					</p>
					<p>
						<b>Visit:</b>{" "}
						<a href={verificationUri} rel="noopener noreferrer" target="_blank">
							{verificationUri}
						</a>
					</p>
					{polling && <p style={{ color: "#888", marginTop: 8 }}>Waiting for user authorization...</p>}
				</div>
			)}
			{authStatus === "authorized" && copilotToken && (
				<p style={{ color: "green", marginTop: 8 }}>Account successfully authorized! (token obtained)</p>
			)}
			{authStatus === "error" && <p style={{ color: "red", marginTop: 8 }}>Authorization error. Please try again.</p>}
		</div>
	)
}
