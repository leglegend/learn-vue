# 内建组件和模块
KeepAlive、Teleport、Transition组件
## KeepAlive组件的实现原理
### 组件的激活与失活
KeepLive可以避免一个组件被频繁的创建/销毁
KeepLive组件被卸载/重新挂载时其实是假的，只是放进了隐藏容器中，从隐藏容器中取出和放入的操作对应的声明周期时activated和deactivated


### include和exclude
判断当前组件的name是否不在include中或在exclude中，是的话直接返回组件

### 缓存管理
