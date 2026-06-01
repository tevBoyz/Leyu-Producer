import type { ValidationResult } from './validation'

export interface IpcSuccessResponse<T> {
  success: true
  data: T
  error: null
  validationResult?: ValidationResult
}

export interface IpcErrorResponse {
  success: false
  data: null
  error: string
  validationResult?: ValidationResult
}

export type IpcResponse<T> = IpcSuccessResponse<T> | IpcErrorResponse
