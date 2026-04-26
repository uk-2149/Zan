// src/routes/auth.routes.ts
import { Router } from 'express'
import { registerUser, loginUser, getMe, updateWallet } from '../controllers/auth.controller.js'
import { verifyJWT } from '../middlewares/verifyJWT.js'

const authRouter = Router()

authRouter.post('/register', registerUser)
authRouter.post('/login',    loginUser)
authRouter.get('/me',        verifyJWT, getMe)
authRouter.patch('/wallet', verifyJWT, updateWallet)

export { authRouter }