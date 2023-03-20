import { app } from './app'
import { env } from './env'
const port = env.PORT

app.listen({ port }, (error, address) => {
  console.log(error, address)
})
