const fs = require('fs')
const path = require('path')
IMAGE_DIR = 'images'

function saveImage(name, imageBuffer) {
    fs.writeFileSync(path.join(IMAGE_DIR, name), imageBuffer);
}

module.exports = { saveImage }