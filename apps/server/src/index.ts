// src/index.ts
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { createServer } from 'http'
import { authRouter }     from './routes/auth.routes.js'
import { providerRouter } from './routes/provider.routes.js'
import { setupWebSocketServer } from './ws/server.js'
import { startHeartbeatMonitor } from './jobs/heartbeatMonitor.js'

const app = express()

app.use(helmet())
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*' }))
app.use(express.json())

// Routes
app.use('/api/auth',     authRouter)
app.use('/api/providers', providerRouter)

// Health check
app.get('/health', (_, res) => res.json({ ok: true, ts: new Date().toISOString() }))

// 404
app.use((_, res) => res.status(404).json({ error: 'Not found' }))

const server = createServer(app)
setupWebSocketServer(server)
startHeartbeatMonitor()

const PORT = process.env.PORT ?? 3001
server.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`)
})