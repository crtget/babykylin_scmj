
var isDebug = true

exports.log = function (string) {
    if(!isDebug)
        return
    console.log(string)
}

exports.error = function (string) {
    if(!isDebug)
        return
    console.error(string)
}