//防抖
export function debounced(fn, timeout) {
    let timer = null;
    return function (data) {
        if (timer) {
            clearTimeout(timer)
        }
        timer = setTimeout(() => {
            fn.call(this, data)
        }, timeout);
    }
}