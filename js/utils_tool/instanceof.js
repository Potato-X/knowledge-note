function instance_of(a, b) {
    let protoType = b.prototype
    function getprotoType(x, protoType) {
        if (x.__proto__ === protoType) {
            return true
        }
        if (x.__proto__ === null) {
            return false
        }
        return getprotoType(x.__proto__, protoType)
    }
    return getprotoType(a, protoType)
}

function instance_of(L, R) {         // L 表示instanceof左边，R 表示instanceof右边
    let O = R.prototype;         // 取 R 的显示原型
    L = L.__proto__;             // 取 L 的隐式原型
    while (true) {               // 循环执行，直到 O 严格等于 L
        if (L === null) return false;
        if (O === L) return true;
        L = L.__proto__;
    }
}
