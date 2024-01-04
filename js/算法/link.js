//链表
function LinkNode(element) {
    this.element = element
    this.previous = undefined
    this.next = undefined
}
function LinkList() {
    let node = new LinkNode({ message: "这是头", p: 'head', id: 0 })
    this.list = new Set([node])
    this.lastNode = node
}
LinkList.prototype.findNode = function (id) {
    let target = null
    this.list.forEach(item => {
        if (item.element.id == id) {
            target = item
        }
    })
    return target
}
LinkList.prototype.insert = function (node, id) {
    let linkNode = new LinkNode(node)
    if (id) {
        let target = this.findNode(id)
        if (target) {
            let prev = target.previous
            console.log(target, prev)
            linkNode.next = target
            linkNode.previous = prev
            target.previous = linkNode
            prev.next = linkNode
        } else {
            return false
        }
    } else {
        this.lastNode.next = linkNode
        linkNode.previous = this.lastNode
        this.lastNode = linkNode
    }
    this.list.add(linkNode)
}
let list = new LinkList()
list.insert({ message: "这是中间数据", p: "middle", id: 1 })
list.insert({ message: "这是结尾节点", p: "end", id: 2 })
list.insert({ message: "这是中间数据", p: "middle", id: 3 }, 2)

