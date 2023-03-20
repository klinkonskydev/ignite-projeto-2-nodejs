import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import crypto, { randomUUID } from 'node:crypto'
import { knex } from '../database'
import { checkSessionIdExist } from '../middlewares/check-session-id-exists'

const createTransactionsBodySchema = z.object({
  title: z.string(),
  amount: z.number(),
  type: z.enum(['credit', 'debit'])
})

const getTransactionsParamsSchema = z.object({
  id: z.string()
})

export async function transactionsRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [checkSessionIdExist] }, async (req) => {
    const { sessionId } = req.cookies

    const transactions = await knex('transactions')
      .where('session_id', sessionId)
      .select('*')

    return { transactions }
  })

  app.get('/:id', { preHandler: [checkSessionIdExist] }, async (req, res) => {
    const params = getTransactionsParamsSchema.parse(req.params)

    const { sessionId } = req.cookies
    const { id } = params

    const transaction = await knex('transactions')
      .where({ session_id: sessionId, id })
      .first()

    return res.status(200).send({ transaction })
  })

  app.get(
    '/summary',
    { preHandler: [checkSessionIdExist] },
    async (req, res) => {
      const { sessionId } = req.cookies

      const summary = await knex('transactions')
        .where('session_id', sessionId)
        .sum('amount', { as: 'amount' })
        .first()

      return res.status(200).send({ summary })
    }
  )

  app.post('/', async (request, res) => {
    const body = createTransactionsBodySchema.parse(request.body)
    const { amount, title, type } = body
    let sessionId = request.cookies.sessionId

    if (!sessionId) {
      sessionId = randomUUID()

      res.setCookie('sessionId', sessionId, {
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
      })
    }

    await knex('transactions').insert({
      id: crypto.randomUUID(),
      title,
      amount: type === 'credit' ? amount : amount * -1,
      session_id: sessionId
    })

    return res.status(201).send()
  })
}
