import { ipcMain } from 'electron'
import type { IpcResponse } from '../../shared/ipc-response'
import type { ValidationResult } from '../../shared/validation'
import { logError } from '../services/loggerService'

interface ErrorWithValidationResult extends Error {
  validationResult?: ValidationResult
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function ipcSuccess<T>(data: T, validationResult?: ValidationResult): IpcResponse<T> {
  return {
    success: true,
    data,
    error: null,
    ...(validationResult ? { validationResult } : {})
  }
}

export function ipcFailure<T>(error: unknown): IpcResponse<T> {
  const typedError = error as ErrorWithValidationResult
  return {
    success: false,
    data: null,
    error: toErrorMessage(error),
    ...(typedError?.validationResult ? { validationResult: typedError.validationResult } : {})
  }
}

export function handleIpc<TArgs extends unknown[], TResult>(
  channel: string,
  handler: (...args: TArgs) => Promise<TResult> | TResult
): void {
  ipcMain.handle(channel, async (_event, ...args: TArgs) => {
    try {
      const data = await handler(...args)
      return ipcSuccess(data)
    } catch (error) {
      logError('ipc.handler.failure', `IPC handler failed for ${channel}.`, {
        channel,
        error
      })
      return ipcFailure<TResult>(error)
    }
  })
}
