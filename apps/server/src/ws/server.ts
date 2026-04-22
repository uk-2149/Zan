import { WebSocketServer, WebSocket } from 'ws'
import { Server } from 'http'
import type { WSMessage } from '@repo/types'

// Map of providerId → WebSocket connection
const connections = new Map<string, WebSocket>()

export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws, req) => {
    const providerId = new URL(req.url!, `http://localhost`).searchParams.get('providerId')

    if (!providerId) {
      ws.close()
      return
    }

    connections.set(providerId, ws)
    console.log(`Provider ${providerId} connected via WebSocket`)

    ws.on('message', (data) => {
      const msg: WSMessage = JSON.parse(data.toString())
      if (msg.type === 'PONG') return // heartbeat ack
    })

    ws.on('close', () => {
      connections.delete(providerId)
      console.log(`Provider ${providerId} disconnected`)
    })
  })

  console.log('WebSocket server ready')
}

// Called by Matchmaker to push job to a specific provider
export function sendJobToProvider(providerId: string, job: any) {
  const ws = connections.get(providerId)

  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn(`Provider ${providerId} not connected`)
    return false
  }

  ws.send(JSON.stringify({ type: 'JOB_ASSIGNED', payload: job }))
  return true
}