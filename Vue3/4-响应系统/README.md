# 透过Vue2看Vue3，详解Vue3的响应式原理
我们都知道，Vue2中的响应式是通过数据劫持和消息发布订阅实现的，而数据劫持主要是通过`Object.defineProperty`实现的(数组通过改写数组方式实现)。而在Vue3中，数据劫持通过Proxy实现。
## Proxy
我们可以通过实例化一个proxy对象来对数据进行监听，当代理对象被读取或修改时，能通过代理对象的getter/setter拦截这个操作，我们可以在这里进行一些操作(比如说更新DOM)，再返回原来的对象值：
```js
// 定义源数据
const data = {
  name: 'zs',
  age: 18
}

// 定义代理对象
const proxy = new Proxy(data, {
  // 拦截读取操作
  get(target, key) {
    console.log('数据被读取了')
    return traget[key]
  },
  // 拦截设置操作
  set(target, key, newVal) {
    target[key] = newVal
    console.log('数据被修改了')
  }
})
```
上述代码就实现了一个简单的数据劫持，现在我们能思考下数据被读取和修改时分别应该做什么？在Vue2中，数据被读取时会将当前的订阅者放进订阅器中，数据被修改时，会把当前数据的订阅器中的订阅者取出来并执行。这里其实很好理解，就是数据需要知道谁访问了自己，这样当数据更新时才能通知到那些曾经访问了自己的人。但并不是所有的访问都会放进订阅器：
```js
<template>
  <div>{{ count }}</div>
</template>
export default {
  data {
    count: 1,
    unit: 'yuan'
  },
  mounted() {
    console.log(this.count)
  }
}
```
如上述代码，页面和mounted都访问了count，但当count改变时，需要通知页面，却不需要通知mounted，因为mounted中并不需要对count的改变做出响应。这个逻辑Vue3是通过在全局变量上注册副作用函数来实现的，如果访问count时，存在副作用函数，则将副作用函数放进count的“桶”(用来存在副作用函数的容器)中，反之，访问时没有全局副作用函数，则直接返回值。
## effect
上文我们有提到过，并不是所有对proxy的访问都会存在副作用函数，我们先来考虑什么是副作用函数以及如何在全局注册副作用函数。我们接着使用上边的例子，`template`中使用了count属性，在count变化时，我们需要更新DOM，假设DOM是通过下面的函数更新的：
```js
function effect() {
  document.getElementByTag('div')[0].innerText = count
}
```
这样，只要我们在count变化后调用这个函数，就可以实现DOM的实时更新了。这个effect函数就叫做副作用函数，我们并没有直接修改DOM，而是修改count之后带来的**副作用**。  
其实直接把这个函数丢进proxy的setter中就能实现这个效果，但是这样有个问题，proxy代理的是整个data对象，data中除了count属性还有name属性，我们修改name也会触发setter，我们期望的是哪个属性的副作用函数，只在其对应的属性更新是调用。  
在Vue2中，每个属性都有自己的`__ob__`对象，可以理解为该属性的观察者，当该属性发生变化时，观察者会通知该属性的订阅器，进而通知到所有的订阅者。Vue3中实现的方法类似，每个属性都维护了一个存储副作用函数的`桶`，当属性发生变化时，将`桶`里的函数拿出来执行。  
有了大概思路，我们先来解决最开始问题，如何将副作用函数放进对应属性的`桶`中？  
我们先来回忆下Vue2中的订阅者(怎么又是Vue2？)，Vue2中的每个component都会有一个Watcher对象，用以在数据发生变化时执行render函数重新获取虚拟DOM，然后再update到页面上，看起来好像做了很多操作，其实就是在初始化Watcher实例时传入了一个函数(这不就是Vue3的副作用函数么)。在实例化Watcher时，我们可以传入一个属性或者一个函数，Watcher会访问该属性(或者执行该函数)，当属性被访问时(或函数中的属性被访问时)，就将Watcher放进被访问属性的订阅器中。这不就是我们想要的效果吗？在属性被访问时将副作用函数放进属性的`桶`中，属性被修改时再执行`桶`里面的函数:
```js
let activeEffect
function effect(fn) {
  activeEffect = fn
  fn()
}

// 存放属性的key以及它的副作用函数们
const keyMap = new Map()
const proxy = new Proxy(data, {
  get(target, key) {
    if(!activeEffect) return traget[key]
    targetMap.set(key, activeEffect)
    return traget[key]
  },
  set(target, key, newVal) {
    target[key] = newVal
    const effect = targetMap.get(key)
    effect&&effect()
  }
})

effect(()=>{
  document.getElementByTag('div')[0].innerText = count
})
```
这样我们就实现了，将副作用函数注册在全局变量中，在访问属性时将副作用函数放进数据的桶中，修改时从桶中拿出副作用函数并执行。  
但是上面的例子有很多问题，就是桶里面只能放一个副作用函数，这个好解决，可以放到一个数组中嘛。还有个问题，这时候再代理一个data2，并且data2上也有个count属性，就不行了。我们先来看下Vue2中是如何处理这个问题的。  
在Vue2中，每一个属性都会通过defineProperty方法重新定义在_data上，并且通过闭包在defineReactive方法中给每一个属性都新建了自己的订阅器，所以Vue2并不存在多个对象统一管理副作用函数的情况(那你看Vue2干啥？)。  
虽然Vue2没有相关问题，但实现起来其实并不复杂，先用一个Map保存对象和对象中的属性的关系，然后再用一个Map保存属性的key和桶的关系，再来一个数组保存对应key的副作用函数。说起来比较啰嗦，其实实现起来很简单：
```js
// key为代理的源对象 value为一个新的Map
const targetMap = new WeakMap()
const proxy = new Proxy(data, {
  get(target, key) {
    if(!activeEffect) return traget[key]

    // 先取出该对象对应的桶
    let depsMap = targetMap.get(target)

    // 没有就初始化
    if(!depsMap) targetMap.set(target, (depsMap=new Map()))

    // 通过key取出该属性所有的副作用函数
    let dep = depsMap.get(key)
    // 如果没有就新建一个桶
    if(!dep) depsMap.set(key, (dep = new Set()))

    // 将副作用函数放进桶里
    dep.add(activeEffect)
    return traget[key]
  }
})
```
好像代码看起来也不是很直观，没事，我们画一个图表示一下：
```mermaid
graph LR
A[WeakMap key=target]-->|value|B[Map key=key]
-->|value|C[Set]-->D[fn]
```
我们将实际数据带入到上图中：
```mermaid
graph LR
A[WeakMap key=data]-->|value|B[Map key=count]
-->|value|C[Set]-->D[fn]
C-->fn2
A-->|value|E[Map key=name]
E-->|value|Set-->fn3
Set-->fn4
```
targetMap之所以是一个WeakMap，是因为data被释放后，其所有的副作用函数都将一并被回收，这个逻辑在Vue2中是通过Watcher上的`teardown`方法实现的。