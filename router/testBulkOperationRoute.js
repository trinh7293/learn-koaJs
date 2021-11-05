const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const Router = require('koa-router')
const { convertArrJson2JsonLine } = require('../utils/jsonHelper')
const { saveFile } = require('../utils/fileHelper')
const { JSONLINE_DIR, STAGEDUPLOADSCREATE } = require('../constant')
const ShopifyApi = require('shopify-api-node');

// init shopify client
require("dotenv").config()

const bulkShopifyRoute = new Router()

const getShopifyClient = async (ctx) => {
  try {
    // get client
    const {
      SHOP_NAME: shop,
    } = process.env
    const shopData = await ctx.mongo.db('product-importer').collection("sessions").findOne({ shop });
    const { accessToken } = shopData;
    return new ShopifyApi({
      shopName: shop,
      accessToken,
      apiVersion: "2021-10"
    })
  } catch (error) {
    console.log("error", error)
  }
}

const genTestJson = () => {
  let result = []
  for (let i = 0; i < 3; i++) {
    result.push({
      "title": `Sweet new snowboard ${i}`,
      "productType": "Snowboard",
      "vendor": "JadedPixel",
    })
  }
  result.push({
    "title": `Sweet new snowboard 5`,
    "ahuhu": "Snowboard",
    "vendor": "JadedPixel",
  })
  for (let i = 6; i < 8; i++) {
    result.push({
      "title": `Sweet new snowboard ${i}`,
      "productType": "Snowboard",
      "vendor": "JadedPixel",
    })
  }
  return result
}

bulkShopifyRoute.get('/import-test', async ctx => {
  try {
    const jsonProduct = genTestJson()
    // convert to json Line
    const jsonLineString = await convertArrJson2JsonLine(jsonProduct.map(item => ({
      input: { ...item }
    })))
    const current = new Date()
    const fileName = current.toJSON();
    const JsonLineFilePath = saveFile(`${fileName}.jsonl`, JSONLINE_DIR, jsonLineString)


    // init shopify client
    const shopifyClient = await getShopifyClient(ctx)

    // get upload place
    const dataStr = `mutation {
      stagedUploadsCreate(input: {resource: BULK_MUTATION_VARIABLES, filename: "${fileName}", mimeType: "text/jsonl", httpMethod: POST}) {
        userErrors {
          field
          message
        }
        stagedTargets {
          url
          resourceUrl
          parameters {
            name
            value
          }
        }
      }
    }`
    const resHuhu = await shopifyClient.graphql(dataStr)
    const resPath = saveFile(`${fileName}.json`, STAGEDUPLOADSCREATE, JSON.stringify(resHuhu, null, 2))

    // get params, url
    const { parameters, url } = resHuhu.stagedUploadsCreate.stagedTargets[0]

    // upload file
    let formDataUpload = new FormData()
    let stagedUploadPath = ""
    parameters.forEach(item => {
      const { name, value } = item
      if (name === "key") {
        stagedUploadPath = value
      }
      formDataUpload.append(name, value)
    })

    // const testjsonL = "{\"input\":{\"handle\":\"clay-plant-pot1\",\"title\":\"options1\",\"options\":[\"<p>Classic blown clay pot for plants</p>\",\"Outdoor\"],\"variants\":[{\"options\":[\"Company 123\",\"Pot, Plants\"]},{\"options\":[\"Company 1\",\"Pot, Plants\"]},{\"options\":[\"Company 2\",\"Pot, Plants\"]},{\"options\":[\"Company 3\",\"Pot, Plants\"]}],\"published\":true}}\r\n{\"input\":{\"handle\":\"black-bean-bag\",\"title\":\"Black Beanbag\",\"options\":[\"<p>Black leather beanbag</p>\",\"Indoor\"],\"variants\":[{\"options\":[\"Company 123\",\"Black, Leather\"]},{\"options\":[\"Company 123\",\"Black, Leather\"]},{\"options\":[\"Company 123\",\"Black, Leather\"]},{\"options\":[\"Company 123\",\"Black, Leather\"]}],\"published\":true}}\r\n{\"input\":{\"handle\":\"bedside-table\",\"title\":\"Bedside Table\",\"options\":[\"<p>Wooden bedside table</p>\",\"Indoor\"],\"variants\":[{\"options\":[\"Company 123\",\"Wood, Bedroom\"]},{\"options\":[\"Company 123\",\"Wood, Bedroom\"]},{\"options\":[\"Company 123\",\"Wood, Bedroom\"]},{\"options\":[\"Company 123\",\"Wood, Bedroom\"]}],\"published\":true}}"
    // formDataUpload.append('file', testjsonL);
    formDataUpload.append('file', jsonLineString);

    var requestOptions = {
      method: 'POST',
      body: formDataUpload,
      redirect: 'follow'
    };

    const res5 = await fetch(url, requestOptions)
    let mutationType = "productCreate"
    // mutationType = "productUpdate"
    const bulkOperationRunMutationData = `mutation {
          bulkOperationRunMutation(
            mutation: "mutation call($input: ProductInput!) { ${mutationType}(input: $input) { product {id title variants(first: 10) {edges {node {id title inventoryQuantity }}}} userErrors { message field } } }",
            stagedUploadPath: "${stagedUploadPath}") {
          bulkOperation {
              id
              url
              status
            }
          userErrors {
              message
              field
            }
          }
    }
      `
    const bulkRes = await shopifyClient.graphql(bulkOperationRunMutationData)
    ctx.body = bulkRes
  } catch (error) {
    console.log("error: ", error)
  }

})

bulkShopifyRoute.get('/perform-bulk', async ctx => {
  // get client
  const shopifyClient = await getShopifyClient(ctx)
  const stagedUploadPath = "tmp/59957412010/bulk/484e7c72-0934-4d93-aa92-a3a285dcebf2/2021-10-13T16_31_44.838Z"
  let mutationType = "productCreate"
  // mutationType = "productUpdate"
  const bulkOperationRunMutationData = `mutation {
        bulkOperationRunMutation(
          mutation: "mutation call($input: ProductInput!) { ${mutationType}(input: $input) { product {id title variants(first: 10) {edges {node {id title inventoryQuantity }}}} userErrors { message field } } }",
          stagedUploadPath: "${stagedUploadPath}") {
        bulkOperation {
            id
            url
            status
          }
        userErrors {
            message
            field
          }
        }
  }
    `
  const bulkRes = await shopifyClient.graphql(bulkOperationRunMutationData)
  ctx.body = bulkRes
})

bulkShopifyRoute.get('/get-result', async ctx => {
  // get client
  const shopifyClient = await getShopifyClient(ctx)
  const queryGetBulkRes = `query {
    currentBulkOperation(type: MUTATION) {
      id
      status
      errorCode
      createdAt
      completedAt
      objectCount
      fileSize
      url
      partialDataUrl
    }
  } `
  const ahuhu3 = await shopifyClient.graphql(queryGetBulkRes)
  ctx.body = ahuhu3
})

bulkShopifyRoute.get('/get-products', async ctx => {
  try {
    // get client
    const shopifyClient = await getShopifyClient(ctx)
    const dataQuery = `{
        products(first: 1) {
          edges {
            node {
              id
              title
              handle,
              variants (first: 10) {
                edges {
                  node {
                    id
                    title
                    sku
                    barcode
                    metafields (first: 10, namespace: "jijiji") {
                      edges {
                        node {
                          key
                          value
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }`

    const res1 = await shopifyClient.graphql(dataQuery)

    ctx.body = res1
  } catch (error) {
    console.log("error", error)
  }
})

bulkShopifyRoute.get('/delete-products', async ctx => {
  try {
    // // get client
    const shopifyClient = await getShopifyClient(ctx)
    const res = await shopifyClient.product.list()

    const res3 = []
    await Promise.all(res.map(async (item) => {
      const re = await shopifyClient.product.delete(item.id)
      res3.push(re)
    }))
    ctx.body = res3
  } catch (error) {
    console.log("error", error)
  }
})

bulkShopifyRoute.get('/create-product', async ctx => {
  try {
    // // get client
    const shopifyClient = await getShopifyClient(ctx)
    const productMutation = `mutation {
      productCreate(input: {
        handle: "sweet-new"
        title: "Sweet new product",
        productType: "Snowboard",
        vendor: "JadedPixel"
      }) {
        product {
          id
          title
          handle
        }
      }
    }`
    const res = await shopifyClient.graphql(productMutation)

    ctx.body = res
  } catch (error) {
    console.log("error", error)
  }
})

bulkShopifyRoute.get('/count-product', async ctx => {
  try {
    // // get client
    const shopifyClient = await getShopifyClient(ctx)
    const count = await shopifyClient.product.count()

    ctx.body = count
  } catch (error) {
    console.log("error", error)
  }
})
bulkShopifyRoute.get('/import-speed', async ctx => {
  try {
    const { time: second } = ctx.request.query
    // // get client
    const shopifyClient = await getShopifyClient(ctx)
    const count1 = await shopifyClient.product.count()

    // delay func
    const timeOutDelay = (ms) => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve('resolved');
        }, ms);
      });
    }
    await timeOutDelay(1000 * second)
    const count2 = await shopifyClient.product.count()
    console.log(`${count2 - count1} product created after ${second} second`)


    ctx.body = `${count2 - count1} product created after ${second} second`
  } catch (error) {
    console.log("error", error)
  }
})

module.exports = {
  bulkShopifyRoute
}