# Vue2 diff算法理解

## diff算法执行顺序

* 同层级比较
* 同层级比较时，采用双指针的形式从从新老虚拟dom的两头往中间比较
* 从两头往中间比较时的顺序：（设新dom开始节点/结束节点指针分别是newStartVnode/newEndVnode;旧dom开始节点/结束节点指针分别是oldStartVnode/newEndVnode）
```
//伪代码
...
//旧dom节点
var oldStartIdx = 0;
var oldEndIdx = oldVnodes.length - 1;
var oldStartVnode = oldVnodes[oldStartIdx];
var oldEndVnode = oldVnodes[oldEndIdx];

//新dom节点
var newStartIdx = 0;
var newEndIdx = newVnodes.length - 1;
var newStartVnode = newVnodes[newStartIdx];
var newEndVnode = newVnodes[newEndIdx];

while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) { //只要新dom和旧dom有一方的结束指针索引与开始指针索引位置重合，则代表重合的那一方dom的节点已经全部遍历完成了（同层级）
    if(sameVnode(oldStartVnode,newStartVnode)){ //判断新老dom的开始节点是否相同
        //对比出当前相同的两个dom细节上的不同（dom上的属性这些,dom的element标签名是否一致等）
        patchVnode()
        //旧dom与新dom的开始节点指针都向后移动一位
        oldStartVnode = oldVnodes[++oldStartIdx];
        newStartVnode = newVnodes[++newStartIdx];
    }else if(sameVnode(oldEndVnode,newEndVnode)){//判断新老dom的结束节点是否相同
        patchVnode()
        //旧dom与新dom的开始节点指针都向前移动一位
        oldEndVnode = oldVnodes[--oldEndIdx];
        newEndVnode = newVnodes[--newEndIdx];
    }else if(sameVnode(oldStartVnode, newEndVnode)){//判断旧dom的开始节点与新dom的结束节点是否相同
        patchVnode()
        //旧dom的开始节点指针往后移动一位，新dom的结束节点的指针向前移动一位
        oldStartVnode = oldVnodes[++oldStartIdx];
        newEndVnode = newVnodes[--newEndIdx];
    }else if(sameVnode(oldEndVnode, newStartVnode)){ //判断旧dom的结束节点与新dom的开始节点是否相同
        patchVnode()
        //旧dom的结束节点指针往后移动一位，新dom的结束节点的指针向前移动一位
        oldStartVnode = oldVnodes[--oldEndIdx];
        newEndVnode = newVnodes[++newStartIdx];
    }else{
        patchVnode()
         newStartVnode = newVnodes[++newStartIdx];
    }
}
if (oldStartIdx > oldEndIdx) { //oldstartIdx>oldEndIdx:说明旧dom比新dom长度更短，那也就意味着新dom在旧dom的基础上新增了子节点
    addVnodes();
}
else if (newStartIdx > newEndIdx) {//newStartIdx>newEndIdx:说明新dom比旧dom长度更短(或者说新dom也很多新增的节点然后导致newStartIdx快速增加)，那也就意味着新dom在旧dom的基础上减少了子节点
    removeVnodes();
}
```