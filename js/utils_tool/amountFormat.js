/**
 * 金额格式化,3点一逗的那种
 * @param num 金额
 * @param len 保留小数位数
 * @param magnitude 数量级 （ 5 代表万 ）
 * @returns {*}
 */
export function amountFormat(num, len = 2, magnitude) {
    if (typeof num === 'number') {
        num = String(num)
    }
    // 已经格式化的数据
    if (String(num).includes(',')) {
        num = num.replace(/\,/g, '')
    }

    // 非空校验
    if (isNaN(Number(num)) || [null, '', undefined].includes(num)) {
        return ''
    }

    const magnitudeObj = {
        1: { label: '元', value: 1E0 },
        5: { label: '万元', value: 1E4 },
        6: { label: '十万元', value: 1E5 },
        7: { label: '百万元', value: 1E6 },
        8: { label: '千万元', value: 1E7 },
        9: { label: '亿元', value: 1E8 }
    }
    let temp = +num

    if (magnitude) {
        const t = magnitudeObj[magnitude]

        temp = (temp / (t.value))
    }

    temp = temp.toFixed(len)

    // 三点一逗
    function get_thousand_num(num) {
        return num.toString().replace(/\d+/, function (n) { // 先提取整数部分
            return n.replace(/(\d)(?=(\d{3})+$)/g, function ($1) { // 对整数部分添加分隔符
                return $1 + ','
            })
        })
    }

    temp = get_thousand_num(temp)

    return temp
}