## 本节内容
`$set`可以新增属性，`$delete`可以删除属性。平时我们通过delete操作符删除对象的属性，在Vue中是无法通过数据监听侦测到，所以需要通过`$delete`方法。
## 用法
```js
vm.$delete(target,key)
```
## 目标
实现下面给出的用法：
```js
const vm = new Vue({
  data: {
    a: {
      b: 1
    }
  }
})
vm.$delete(vm.a,'b')
```
## 实现思路
非常简单，删除属性，然后向依赖发送消息，结束。甚至可以用一种非常讨巧的方式实现：
```js
delete this.obj.name
this.obj.__ob__.dep.notify()
```
当然，这样仅限Object对象，实现`$delete`需要一些思考：
1. 如果target是数组，则使用splice删除指定元素
2. 如果target上没有key属性，直接返回
3. 如果target不是响应式，那么delete属性后返回
4. 最后通过ob通知依赖