const fs = require("fs");
const path = require("path");

const saveFile = (name, saveDir, buffer) => {
  createDirIfNotExists(saveDir);
  const filePath = path.join(saveDir, name);
  fs.writeFileSync(filePath, buffer);
  return filePath;
};

const createDirIfNotExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
};

module.exports = {
  saveFile
}