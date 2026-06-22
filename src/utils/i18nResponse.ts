// src/utils/i18nResponse.ts
import type { ComposerTranslation } from 'vue-i18n'

export function backendMessage(
  t: ComposerTranslation,
  responseData: any,
  fallbackKey = 'backend.unknownError'
): string {
  if (responseData?.message_key) return t(responseData.message_key)
  if (responseData?.error_key) return t(responseData.error_key)

  if (responseData?.message) return responseData.message
  if (responseData?.error) return responseData.error

  return t(fallbackKey)
}