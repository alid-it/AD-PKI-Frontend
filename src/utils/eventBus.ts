// src/utils/eventBus.ts

import mitt from 'mitt'
import type { AuditLog } from '@/types/auditlog'

// =========================================
// 🔥 Event Types
// =========================================

export interface CaHealthEvent {
  component: string
  status: string
  url?: string
}

export type Events = {
  // 🔥 Audit Log — alle Views die Logs brauchen
  'audit-log': AuditLog

  // 🔥 CA Health — SystemInfoView
  'ca-health': CaHealthEvent

  // 🔥 Spezifische Aktionen — für gezielte Updates
  'certificate.issued':   AuditLog
  'certificate.revoked':  AuditLog
  'certificate.requested': AuditLog
  'certificate.approved': AuditLog
  'certificate.rejected': AuditLog
}

const bus = mitt<Events>()

export default bus