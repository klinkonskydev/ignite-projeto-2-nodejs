import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { execSync } from 'node:child_process'
import request from 'supertest'
import { app } from '../app'

describe('/transactions', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    execSync('yarn knex migrate:rollback --all')
    execSync('yarn knex migrate:latest')
  })

  it('should be able to create a new transaction', async () => {
    const res = await request(app.server).post('/transactions').send({
      title: 'New transaction',
      amount: 5000,
      type: 'credit'
    })

    expect(res.statusCode).toEqual(201)
  })

  it('should not be able to list all transactions if they do not have created a transaction', async () => {
    const res = await request(app.server).get('/transactions')
    expect(res.statusCode).toEqual(401)
  })

  it('should be able list all user transactions', async () => {
    const transaction = {
      title: 'New transaction',
      amount: 5000,
      type: 'credit'
    }

    const createTransactionRes = await request(app.server)
      .post('/transactions')
      .send(transaction)

    const cookies = createTransactionRes.get('Set-Cookie')

    const listTransactionsRes = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies)
      .expect(200)

    expect(listTransactionsRes.body.transactions).toEqual([
      expect.objectContaining({
        title: transaction.title,
        amount: transaction.amount
      })
    ])
  })

  it('should be able list a specific transaction', async () => {
    const transaction = {
      title: 'New transaction',
      amount: 5000,
      type: 'credit'
    }

    const createTransactionRes = await request(app.server)
      .post('/transactions')
      .send(transaction)

    const cookies = createTransactionRes.get('Set-Cookie')

    const listTransactionsRes = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies)
      .expect(200)

    const transactionId = listTransactionsRes.body.transactions[0].id

    const getTransactionRes = await request(app.server)
      .get(`/transactions/${transactionId}`)
      .set('Cookie', cookies)
      .expect(200)

    expect(getTransactionRes.body.transaction).toEqual(
      expect.objectContaining({
        title: transaction.title,
        amount: transaction.amount
      })
    )
  })

  it('should be able get the summary', async () => {
    const createTransactionRes = await request(app.server)
      .post('/transactions')
      .send({
        title: 'New transaction',
        amount: 8000,
        type: 'credit'
      })

    const cookies = createTransactionRes.get('Set-Cookie')

    await request(app.server)
      .post('/transactions')
      .set('Cookie', cookies)
      .send({
        title: 'New transaction',
        amount: 4000,
        type: 'debit'
      })

    const summaryRes = await request(app.server)
      .get('/transactions/summary')
      .set('Cookie', cookies)
      .expect(200)

    expect(summaryRes.body.summary).toEqual({
      amount: 4000
    })
  })
})
