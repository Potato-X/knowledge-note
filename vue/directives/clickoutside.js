const on = function (element, event, handler) {
    element.addEventListener(event, handler, false)
}
let startClick
let seid = 0
const ctx = "_@clickoutside"
const nodeList = []
on(document, 'mousedown', e => startClick = e)
on(document, 'mouseup', (e) => {
    nodeList.forEach(node => node[ctx].documentHandler(e, startClick))
})
function createDocumentHandler(el, binding, vnode) {
    
    return function (mouseup = {}, mousedown = {}) {
        // console.log(`el=${el},vnode=${vnode},mouseup=${mouseup},mousedown=${mousedown}`)
        console.log('el:', el)
        console.log('vnode:', vnode)
        console.log('mouseup:', mouseup)
        console.log('mousedown:', mousedown)
        console.log(this)
        if (el.contains(mouseup.target) || el.contains(mousedown.target)) {
            return 
        }
        this.bindingFn()
    }
}
export default {
    bind(el, binding, vnode) {
        nodeList.push(el)
        el[ctx] = {
            id: ++seid,
            documentHandler: createDocumentHandler(el, binding, vnode),
            methodName: binding.expression,
            bindingFn: binding.value
        }
        console.log(el, binding, vnode)

    },
    update(el, binding, vnode) {
        console.log(333)
    },
    unbind(el, binding, vnode) {

    }
}