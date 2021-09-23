
//init
const Koa = require('koa')
const Router = require('koa-router')
const mongo = require('koa-mongo')
const app = new Koa()

// init environment variable
require('dotenv').config()

// error handler
const error_handler = async (ctx, next) => {
    try {
        await next()
    } catch (err) {
        console.log(err.status)
        ctx.status = err.status || 500
        ctx.body = err.message
    }
}

// logger middleware
const loggerMid = async (ctx, next) => {
    await next()
    const rt = ctx.response.get('X-Response-Time')
    console.log(`${ctx.method} ${ctx.url} - ${rt}`)
}

// response time middleware
const responseTime = async (ctx, next) => {
    const start = Date.now()
    await next()
    const ms = Date.now() - start
    ctx.set('X-Response-Time', `${ms}ms`)
}

app.use(error_handler, loggerMid, responseTime)

// setup koa-mongo
// mongodb config
const MONGODB_CONFIG = {
    uri: process.env.MONGO_URI,
    db: process.env.MONGO_DB,
    max: 100,
    min: 1,
}

// setup router
const router = Router()
router.get('/hello', async ctx => {
    ctx.body = "Hello An"
})
router.get('home', '/', async ctx => {
    ctx.body = "Hello Home"
})

router.post('addProducts', 'addProduct')

app.use(mongo(MONGODB_CONFIG))
app.use(router.routes())
app.use(router.allowedMethods())

app.listen(3000)
