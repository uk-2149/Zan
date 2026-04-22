// src/jobs/heartbeatMonitor.ts
import { prisma } from '@repo/db'

export function startHeartbeatMonitor() {
  setInterval(async () => {
    try {
      const result = await prisma.provider.updateMany({
        where: {
          status:        { in: ['ACTIVE', 'BUSY'] },
          lastHeartbeat: { lt: new Date(Date.now() - 90_000) }
        },
        data: { status: 'OFFLINE' }
      })

      if (result.count > 0) {
        console.log(`[HeartbeatMonitor] Marked ${result.count} provider(s) offline`)
      }
    } catch (err) {
      console.error('[HeartbeatMonitor] Error:', err)
    }
  }, 30_000)

  console.log('[HeartbeatMonitor] Started')
}