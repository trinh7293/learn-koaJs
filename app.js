require('isomorphic-fetch');
const Koa = require('koa')
const Router = require('koa-router')
const { bulkShopifyRoute } = require('./router/testBulkOperationRoute')
const mongo = require('koa-mongo')
const bodyParser = require('koa-bodyparser')
const multer = require('@koa/multer')
const Queue = require('bull')
const bullMaster = require('bull-master')
const { saveImage } = require('./helper')
const app = new Koa()

// init environment variable
require('dotenv').config()

// error handler
const handleError = async (ctx, next) => {
    try {
        await next()
    } catch (err) {
        console.log(err.status)
        ctx.status = err.status || 500
        ctx.body = err.message
    }
}

// logger middleware
const showLog = async (ctx, next) => {
    await next()
    const rt = ctx.response.get('X-Response-Time')
    console.log(`${ctx.method} ${ctx.url} - ${rt}`)
}

// response time middleware
const getResponseTime = async (ctx, next) => {
    const start = Date.now()
    await next()
    const ms = Date.now() - start
    ctx.set('X-Response-Time', `${ms}ms`)
}

// upload file middleware
const handleUpload = multer().fields([{ name: 'file', maxCount: 1 }])

app.use(handleError, showLog, getResponseTime)

// setup router
const router = Router()
router.get('/hello', async ctx => {
    ctx.body = "fuck"
})
router.get('home', '/', async ctx => {
    ctx.body = "Hello Home"
})

// insert mongodb
// router.post('add-products', '/add-product', async ctx => {
//     const newProduct = ctx.request.body
//     const result = await ctx.db.collection('products').insert(newProduct)
//     ctx.body = result
// })

// upload file
router.post('/upload', handleUpload, ctx => {
    const { name } = ctx.request.body;
    if (!name) {
        ctx.body = 'Missing name';
        return;
    }
    saveImage(name, ctx.files.file[0].buffer);
    ctx.body = "success";
}
);

const videoQueue = new Queue('video transcoding')
const pdfQueue = new Queue('pdf transcoding');

router.all('/admin/queues/(.*)', bullMaster.koa({
    queues: [videoQueue, pdfQueue],
    prefix: '/admin/queues',
}))



// setup koa-mongo
// mongodb config
const MONGODB_CONFIG = {
    uri: process.env.MONGO_URI,
    db: process.env.MONGO_DB,
    max: 100,
    min: 1,
}

app.use(mongo(MONGODB_CONFIG))
app.use(bodyParser())
app.use(bulkShopifyRoute.routes())
app.use(bulkShopifyRoute.allowedMethods())
app.use(router.routes())
app.use(router.allowedMethods())

app.listen(4000)