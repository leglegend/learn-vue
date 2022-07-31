# 渲染器的设计
## 渲染器的基本概念
render是渲染，动词，renderer是渲染器，名词
渲染器把虚拟DOM渲染为真实DOM，虚拟DOM英文virtual DOM，或者vdom
vdom树形结构，里面一个节点叫做虚拟节点 virtual node vnode，一个节点也是一颗子树
虚拟DOM渲染为真实DOM叫做挂载 mount
mounted表示挂载完成，可以访问真实DOM
挂载点为容器元素 container

createRenderer
第一次渲染 挂载
第二次渲染 更新，打补丁  patch  新旧vnode比较 找出更新变更点
## 自定义渲染器
渲染器可以实现跨平台渲染
