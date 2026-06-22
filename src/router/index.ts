import { createRouter, createWebHistory } from 'vue-router'
import { permissions } from '@/stores/auth'

// Layout
import AppLayout from '@/components/layout/AppLayout.vue'

// Views
import DashboardView from '@/views/production/DashboardView.vue'
import WelcomeView from '@/views/setup/WelcomeView.vue'
import CAView from '@/views/production/CAView.vue'
import CertificateCreateView from '@/views/production/CertificateCreateView.vue'
import CertificatesRevokeView from '@/views/production/CertificatesRevokeView.vue'
import SystemInfoView from '@/views/production/SystemInfoView.vue'
import AcmeView from '@/views/production/SettingsAcmeView.vue'
import CertificateRequestsView from '@/views/production/CertificateRequestsView.vue'
import SettingsView from '@/views/production/SettingsView.vue'
import BrandingView from '@/views/production/BrandingView.vue'
import UsersView from '@/views/production/UsersView.vue'
import NotificationsView from '@/views/production/NotificationsView.vue'
import SettingsSecurityView from '@/views/production/SettingsSecurityView.vue'
import SettingsAclsView from '@/views/production/SettingsAclsView.vue'
import LoginView from '@/views/auth/LoginView.vue'
import MeView from '@/views/production/MeView.vue'

const routes = [
  // 🔥 ROOT → redirect
  {
    path: '/',
    redirect: '/dashboard'
  },

  {
    path: '/login',
    name: 'Login',
    component: LoginView
  },

  // ======================
  // 🔥 APP (mit Layout)
  // ======================

  {
    path: '/dashboard',
    component: AppLayout,
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: DashboardView
      }
    ]
  },

  {
    path: '/certificates',
    component: AppLayout,
    meta: {
      permission: 'certificate.view'
    },
    children: [
      {
        path: '',
        name: 'Certificates',
        component: () => import('@/views/production/CertificatesView.vue')
      }
    ]
  },

  {
    path: '/certificates/create',
    component: AppLayout,
    meta: {
      permissions: ['certificate.create', 'certificate.request']
    },
    children: [
      {
        path: '',
        name: 'CertificateCreate',
        component: CertificateCreateView
      }
    ]
  },
  {
    path: '/certificates/requests',
    component: AppLayout,
    meta: {
      permission: 'certificate.approve'
    },
    children: [
      {
        path: '',
        name: 'CertificateRequests',
        component: CertificateRequestsView
      }
    ]
  },
  {
    path: '/certificates/revoke',
    component: AppLayout,
    meta: {
      permission: 'certificate.revoke'
    },
    children: [
      {
        path: '',
        name: 'CertificatesRevoke',
        component: CertificatesRevokeView
      }
    ]
  },

  {
    path: '/ca',
    component: AppLayout,
    children: [
      {
        path: '',
        name: 'CA',
        component: CAView
      }
    ]
  },

  {
    path: '/system',
    component: AppLayout,
    children: [
      {
        path: '',
        name: 'System',
        component: SystemInfoView
      }
    ]
  },


  // ======================
  // ⚙️ SETTINGS
  // ======================

  {
    path: '/settings',
    component: AppLayout,
    children: [
      {
        path: '',
        name: 'Settings',
        component: SettingsView
      }
    ]
  },

  {
    path: '/settings/acme',
    component: AppLayout,
    meta: {
      permission: 'acme.manage'
    },
    children: [
      {
        path: '',
        name: 'SettingsAcme',
        component: AcmeView
      }
    ]
  },

  {
    path: '/settings/branding',
    component: AppLayout,
    meta: {
      permission: 'settings.manage'
    },
    children: [
      {
        path: '',
        name: 'SettingsBranding',
        component: BrandingView
      }
    ]
  },

  {
    path: '/settings/users',
    component: AppLayout,
    meta: {
      permission: 'user.view'
    },
    children: [
      {
        path: '',
        name: 'SettingsUsers',
        component: UsersView
      }
    ]
  },

  {
    path: '/settings/notifications',
    component: AppLayout,
    meta: {
      permission: 'settings.manage'
    },
    children: [
      {
        path: '',
        name: 'SettingsNotifications',
        component: NotificationsView
      }
    ]
  },

  {
    path: '/settings/security',
    component: AppLayout,
    meta: {
      permission: 'settings.manage'
    },
    children: [
      {
        path: '',
        name: 'SettingsSecurity',
        component: SettingsSecurityView
      }
    ]
  },

  {
    path: '/settings/acls',
    component: AppLayout,
    meta: {
      permission: 'settings.manage'
    },
    children: [
      {
        path: '',
        name: 'SettingsAcls',
        component: SettingsAclsView
      }
    ]
  },
  {
    path: '/settings/audit-logs',
    component: AppLayout,
    meta: { permission: 'settings.manage' },
    children: [
      {
        path: '',
        name: 'AuditLogs',
        component: () => import('@/views/production/AuditLogsView.vue')
      }
    ]
  },

  {
    path: '/settings/infrastructure',
    component: AppLayout,
    meta: { permission: 'settings.manage' },
    children: [
      {
        path: '',
        name: 'PKIInfrastructure',
        component: () => import('@/views/production/InfrastructureView.vue'),
      }
    ]
  },

  {
    path: '/settings/teams',
    component: AppLayout,
    meta: { permission: 'settings.manage' },
    children: [
      {
        path: '',
        name: 'Teams',
        component: () => import('@/views/production/TeamsView.vue'),
      }
    ]
  },

  {
    path: '/me',
    component: AppLayout,
    children: [
      {
        path: '',
        name: 'Me',
        component: MeView
      }
    ]
  },


]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// =========================================
// 🔐 AUTH GUARD
// =========================================

// =========================================
// 🔐 AUTH + PERMISSION GUARD
// =========================================

router.beforeEach((to) => {
  const publicPages = [
    '/login',
    '/setup'
  ]

  const token = localStorage.getItem('token')
  const authRequired = !publicPages.includes(to.path)

  // ❌ Nicht eingeloggt
  if (authRequired && !token) {
    return '/login'
  }

  // ✅ Bereits eingeloggt und will Login öffnen
  if (to.path === '/login' && token) {
    return '/dashboard'
  }

  // 🔐 Einzelnes benötigtes Recht
  const requiredPermission = to.meta.permission as string | undefined

  if (requiredPermission && !permissions.value.includes(requiredPermission)) {
    return '/dashboard'
  }

  // 🔐 Mindestens eines von mehreren Rechten
  const requiredPermissions = to.meta.permissions as string[] | undefined

  if (
    requiredPermissions &&
    requiredPermissions.length > 0 &&
    !requiredPermissions.some(permission => permissions.value.includes(permission))
  ) {
    return '/dashboard'
  }

  return true
})

export default router