// ── Provider ──
export interface HardwareInfo {
  gpuModel: string
  vramGB: number
  cudaVersion: string | null
  driverVersion: string | null
  computeCapability: string | null
  downloadMbps: number | null
  uploadMbps: number | null
  pingMs: number | null
}

export interface HeartbeatPayload {
  providerId: string
  gpuUtilization: number
  vramUsedMb: number
  temperatureC: number
  isBusy: boolean
}

export interface JobPayload {
  jobId: string
  type: string
  dockerImage: string
  inputUri: string
  requiredVramGB: number
  timeLimitSeconds: number
}

export interface JobResultPayload {
  jobId: string
  providerId: string
  outputUri: string
  executionMetadata: ExecutionMetadata
  success: boolean
  errorMessage?: string
}

export interface ExecutionMetadata {
  executionTimeMs: number
  vramUsedMb: number
  avgUtilization: number
  peakUtilization: number
  tempDeltaC: number
  powerDrawW: number
  exitCode: number
}

// ── WebSocket message types ──
export type WSMessageType =
  | "JOB_ASSIGNED"
  | "JOB_CANCELLED"
  | "PING"
  | "PONG"

export interface WSMessage {
  type: WSMessageType
  payload: any
}

// ── API Responses ──
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}