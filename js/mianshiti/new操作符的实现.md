# new操作符的实现

```
function _new(fn,...arg){
    let obj = Object.create(Object.prototype)
    obj.fn = fn
    obj.fn(...arg)
    delete obj.fn
    return obj
}
```