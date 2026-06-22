export interface NotificationSettings {
  mail_enabled: boolean
  mail_host: string
  mail_port: string
  mail_username: string
  mail_password: string
  mail_from_email: string
  mail_from_name: string
  mail_encryption: string

  webhook_enabled: boolean
  webhook_url: string
  webhook_method: string
  webhook_secret: string

  telegram_enabled: boolean
  telegram_bot_token: string
  telegram_chat_id: string
}

export interface NotificationEventRecipient {
  role: string
}

export interface NotificationEvent {
  id: number
  event: string

  enabled: boolean
  mail: boolean
  webhook: boolean
  telegram: boolean

  title_template?: string
  message_template?: string

  recipients: { role: string }[]

  roles?: string[] // 🔥 nur frontend
}

export interface NotificationEventUpdate {
  id: number
  enabled: boolean
  mail: boolean
  webhook: boolean
  telegram: boolean
  title_template?: string
  message_template?: string
}

export type NotificationVariables = Record<
  string,
  Record<string, Record<string, string>>
>
