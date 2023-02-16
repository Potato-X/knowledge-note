class Dragable {
    static dragDOM = null
    constructor(selector) {
        this.selector = selector
        this.els = []
        this.init()
    }
    init() {
        let _this = this
        let els = document.querySelectorAll(this.selector)
        if (els.length == 0) throw '未找到目标节点'
        els.forEach(element => {
            element.draggable = true
            element.addEventListener('dragstart', function (event) {
                event.dataTransfer.effectAllowed = 'move'
                Dragable.dragDOM = this
            })
            element.addEventListener('dragover', function (event) {
                event.preventDefault();
            })
            element.addEventListener('drop', function (event) {
                let parent = this.parentNode
                parent.insertBefore(Dragable.dragDOM, this)
                let data = [].map.call(parent.children,node=>{
                    return node.getAttribute('selfdata')
                })
                console.log(data)
            })
        })
    }
}
