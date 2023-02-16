//深克隆
export function deepclone(data) {
    let newData
    if (typeof data == 'object' && data != null) {
        newData = Array.isArray(data) ? [] : {}
        for (let key in data) {
            newData[key] = deepclone(data[key])
        }
    } else {
        newData = data
    }
    return newData
}