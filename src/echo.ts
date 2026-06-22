// src/echo.ts

import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { getReverbConfig } from '@/api/config'

// @ts-ignore
window.Pusher = Pusher

// @ts-ignore
let echo: Echo | null = null

// @ts-ignore
export const initEcho = async (): Promise<Echo> => {
  if (echo) return echo

  const cfg = await getReverbConfig()

  // @ts-ignore
  echo = new Echo({
    broadcaster: 'reverb',
    key: cfg.reverb_key,
    wsHost: cfg.reverb_host,
    wsPort: cfg.reverb_port,
    wssPort: cfg.reverb_port,
    forceTLS: cfg.reverb_scheme === 'https',
    enabledTransports: ['ws', 'wss'],
  })

  return echo
}

// @ts-ignore
export const getEcho = (): Echo | null => echo