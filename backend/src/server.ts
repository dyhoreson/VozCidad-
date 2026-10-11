import express from 'express'
import cors from 'cors'
import { env } from './config/env.js'
import { errorHandler, notFound } from './middleware/errors.js'
import { requestLogger } from './middleware/requestLogger.js'
import { billsRouter } from './routes/bills.js'
import { incidentsRouter } from './routes/incidents.js'
import { protocolsRouter } from './routes/protocols.js'
import { adminRoutes } from './routes/adminRoutes.js'
import { newsRouter } from './routes/news.js'

const app = express()
app.disable('x-powered-by')
app.use(requestLogger)
app.use(cors({ origin: env.FRONTEND_ORIGIN, methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'x-transaction-password'] }))
app.use(express.json({ limit: '1mb' }))
app.get('/health', (_req, res) => res.json({ status: 'ok', region: 'RN' }))
app.use('/api/news', newsRouter)
app.use('/api/incidents', incidentsRouter)
app.use('/api/bills', billsRouter)
app.use('/api/protocols', protocolsRouter)
app.use('/api/admin', adminRoutes)
app.use(notFound)
app.use(errorHandler)

app.listen(env.PORT, () => console.info(JSON.stringify({ level: 'info', message: 'API listening', port: env.PORT, environment: env.NODE_ENV })))
