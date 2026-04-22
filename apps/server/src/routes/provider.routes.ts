// src/routes/provider.routes.ts
import { Router } from 'express'
import {
  registerProvider,
  connectAgent,
  heartbeat,
  setStatus,
  getMyProvider,
  getProviderById,
  getProviderStats,
  getAvailableProviders,
} from '../controllers/provider.controller.js'
import { verifyJWT }      from '../middlewares/verifyJWT.js'
import { verifyAgent }    from '../middlewares/verifyAgent.js'
import { verifyInternal } from '../middlewares/verifyInternal.js'

const providerRouter = Router()

// ── JWT protected (web + agent startup) ──
providerRouter.post('/register',      verifyJWT, registerProvider)
providerRouter.post('/agent/connect', verifyJWT, connectAgent)
providerRouter.get('/me',             verifyJWT, getMyProvider)
providerRouter.get('/:id',            verifyJWT, getProviderById)

// ── Agent signature protected ──
providerRouter.post('/heartbeat',     verifyAgent, heartbeat)
providerRouter.patch('/status',       verifyAgent, setStatus)
providerRouter.get('/stats',          verifyAgent, getProviderStats)

// ── Internal (matchmaker only) ──
providerRouter.get('/available',      verifyInternal, getAvailableProviders)

export { providerRouter }