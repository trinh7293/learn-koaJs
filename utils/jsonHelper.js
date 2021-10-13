const jq = require("node-jq");

const convertArrJson2JsonLine = async (jsonOrig) => {
    const result = await jq.run(".[]", jsonOrig, {
        input: "json",
        output: "compact",
    });
    return result;
};

module.exports = {
    convertArrJson2JsonLine
}