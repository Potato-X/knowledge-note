# 什么是BFC

```
BFC是块级格式化上下文（BLOCK FORMAT CONTEXT）的缩写
来自对W3C官网对FC的翻译表述：
1.FC是格式化上下文，所有的盒子都有属于一个自己的FC
2.块级元素所在的布局是BFC
3.行内元素所在的布局就是IFC

```
# 如何创建BFC

满足以下任意一个条件即可创建BFC：
```
1.根元素HTML，就相当于一个很大的BFC
2.浮动元素，float的值只要不是none就行
3.绝对定位元素，position的值要为absolute或fixed
4.行内块元素：display的值是inline-block
5.overflow的计算值，只要不是visible的块级元素
6.弹性盒子：display为flex或者是inline-flex元素的直接子元素
7.网格盒子：display为grid或者是inline-grid元素的直接子元素
8.display为flow-root的元素
9.表格单元格(元素的display为table-cell，HTML表格单元格默认为该值，表格标题(元素的display为table-caption，HTML表格标题默认为该值)row，tbody，thead，tfoot的默认属性)或inline-table)，感觉比较晦涩，直接就是display为table-cell或者table-caption的元素，只不过表格元素的格子的display是默认table-cell这个属性值，表格标题同理也是默认table-caption
```

# BFC的作用

