## 与事件相关的实例方法
一共有四个：`vm.$on`、`vm.$once`、`vm.$off`、`vm.$emit`
## $on实现原理
`$on`用来监听一个事件，通过`$emit`触发：
```js
vm.$on(event, callback)
```