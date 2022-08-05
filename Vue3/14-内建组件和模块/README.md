# 内建组件和模块
KeepAlive、Teleport、Transition组件
## KeepAlive组件的实现原理
### 组件的激活与失活
KeepLive可以避免一个组件被频繁的创建/销毁
KeepLive组件被卸载/重新挂载时其实是假的，只是放进了隐藏容器中，从隐藏容器中取出和放入的操作对应的声明周期时activated和deactivated


### include和exclude
判断当前组件的name是否不在include中或在exclude中，是的话直接返回组件

### 缓存管理
缓存组件的数量不能没有限制，超出限制时需要对当前缓存进行修剪

## Teleport组件的实现原理
### Teleport组件要解决的问题
将内部组件发射到根组件，解决组件不能跨越父组件层级的问题

### 实现Teleport组件
记得结合Vue3官网整理笔记

## Transition组件
实现原理：
DOM元素挂载时，将动效附加到该DOM元素上
DOM元素卸载时，不立即卸载，等到附加到该DOM元素上的动效执行完成后再卸载
### 原生DOM过渡

### 实现Transition组件
```js
const render() {
  return {
    type: Transition,
    children: {
      default() {
        return { type:'div', children: '我是需要过渡的元素'}
      }
    }
  }
}

```

