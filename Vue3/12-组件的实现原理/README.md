# 组件的实现原理
## 渲染组件
当vnode.type是object时，当作组件渲染
组件需要返回一个render函数
挂载组件时运行render函数，其返回值是一个虚拟DOM，挂载该虚拟DOM
## 组件状态与自更新
