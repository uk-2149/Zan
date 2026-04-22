import { prisma } from '@repo/db'

export function startHeartbeatMonitor() {
  setInterval(async () => {
    try {
      const result = await prisma.provider.updateMany({
        where: {
          status: { in: ['ACTIVE', 'BUSY'] },
          lastHeartbeat: {
            lt: new Date(Date.now() - 90_000) // missed 3 heartbeats
          }
        },
        data: { status: 'OFFLINE' }
      })

      if (result.count > 0) {
        console.log(`Marked ${result.count} providers offline`)
      }
    } catch (err) {
      console.error('Heartbeat monitor error:', err)
    }
  }, 30_000)

  console.log('Heartbeat monitor started')
}