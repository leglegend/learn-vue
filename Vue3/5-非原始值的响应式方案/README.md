# 非原始值的响应式方案
上一节我们主要围绕着副作用函数展开响应式的讨论，这节我们回归数据本身。我们主要通过Proxy拦截对数据的访问和修改操作，并为相关属性添加副作用函数来实现响应式，但我们用Vue的时候，肯定不希望自己一个个的定义Proxy，这节我们主要来实现代理相关的逻辑，使得我们只需要调用一个函数就能实现完整的响应式。
## Proxy与Reflect
在上一节中，我们访问属性时都是通过target[key]的方式将属性值返回的，这在特定情况下会出错：
```js

```
return target[key]不行，需要使用Reflect和recevier
## 代理Object
在学习副作用函数时，我们实现的响应式都是围绕Object展开的，所以对Object的一些基本操作都能实现响应式。但是在某些特定情况下仍旧有问题。我们只实现了proxy的get和set拦截器，还有几种特殊情况需要特殊对待。
### 对Object的访问操作
需要拦截所有对Object的访问操作：
1. 访问属性：obj.foo
2. 判断对象上是否存在指定的key：key in obj
3. 使用for...in遍历循环：for(const key in obj)
对于访问属性，我们提到过如何拦截：
```js
const obj = {foo:1}
const p = new Proxy(obj,{
  // 访问属性
  get(target,key,receiver) {
    track(target,key)
    return Reflect.get(target,key,receiver)
  },
  // in操作符
  has(target,key) {
    track(target,key)
    return Reflect.has(target,key)
  }
})
```
`in`操作符可以判断某个对象中是否包含某个`key`，这个操作也可以直接通过proxy提供的`has`拦截。  
接下来我们着重说一下对遍历的拦截。proxy提供了`ownKeys`用以拦截遍历操作，但是这里有一个问题，遍历并没有真正的访问某个属性，所以并不像`get`和`has`拦截器那样拥有具体的key，但是我们保存副作用函数需要用到key。  
```js
effect(()=>{
  for(const key in obj) {
    console.log(key)
  }
})
```
虽然它没访问具体的key，但是我们可以随便找个不会重复的值当作key来用，因为我们想要代表的是这个具体的操作，只要getter和setter中使用相同的key，无论是不是它真正的key，都不影响我们实现响应式。  
这么说可能有点绕，比如说obj.foo，我们在foo上添加了副作用函数，但是我可以不用foo这个key，用bar，然后修改foo时我也用bar去取副作用函数，能实现一样的效果。  
反过来看遍历，什么时候需要我们重新触发这个遍历呢？当我们修改某个元素时，遍历的结果不会变，只有我们增加/删除元素时，遍历的次数发生变化，这时候才需要通知副作用函数重新执行。  
添加是可以通过proxy的set拦截器拦截的，而删除元素也有对应的拦截器————`deleteProperty`，也就是说我们在添加/删除元素时能够通知到遍历就行，实现如下：
```js
const ITERATE_KEY = Symbol('iterate')
const p = new Proxy(obj, {
  // for...in 循环
  ownKeys(target) {
    // 将副作用函数与ITERATE_KEY关联
    track(target, ITERATE_KEY)
    return Reflect.ownKeys(target)
  },
  // 修改属性
  set(target, key, newVal, receiver) {
    // 如果属性不存在，则说明是在添加新属性，否则是设置已有属性
    const type = Object.prototype.hasOwnProperty.call(target, key)
      ? SET
      : ADD
    // 设置属性值
    const res = Reflect.set(target, key, newVal, receiver)
    // 把副作用函数从桶里取出并执行，将type传递给trigger
    trigger(target, key, type)
    return res
  },
  // delete属性
  deleteProperty(target, key) {
    // 检查操作属性是否为对象自己的属性
    const hadKey = Object.prototype.hasOwnProperty.call(target, key)
    // 使用Reflect完成属性的删除
    const res = Reflect.deleteProperty(target, key)
    if (res && hadKey) {
      // 只有当被删除的属性是对象自己的属性并且成功删除时，才触发更新
      trigger(target, key, DELETE)
    }
  }
})
```
如上面的代码，我们通过`ownKeys`拦截了遍历操作，因为随便传入一个不会重复的key就行，所以这里我们使用symbol创建了一个key并保存在一个常量中。在`set`拦截其中，我们判断了该次操作是增加新属性还是修改现有属性(通过hasOwnProperty很容易实现)，并告知触发函数。在`deleteProperty`拦截器中我们同样告知trigger该次该次操作是delete，然后我们只需要在trigger中添加对key为ITERATE_KEY的副作用函数的处理就可以了：
```js
export function trigger(target, key, type) {
  const depsMap = bucket.get(target)
  if (!depsMap) return
  ...
  // 只有当操作类型是ADD或DELETE时，才触发与ITERATE_KEY相关联的副作用函数重新执行
  if (type === ADD || type === DELETE) {
    // 将于ITERATE_KEY相关联得到副作用函数也添加到effectsToRun
    iterateEffects &&
      iterateEffects.forEach((effectFn) => {
        if (effectFn !== activeEffect) {
          effectsToRun.add(effectFn)
        }
      })
  }
  ...
}
```
因为我们在`set`和`deleteProperty`拦截器传入了该次操作的type，trigger只需要在新增和删除操作时取出与遍历相关的副作用函数执行就可以了。  
### 合理的触发响应
现在考虑下面这种情况：
```js
const data = {
  foo: {
    bar: 1
  }
}
const p = new Proxy(data)

effect(()=>{
  console.log(p.foo.bar)
})
p.foo.bar = 1
```
首先可以肯定的是，副作用函数一定是可以执行的，因为我们访问p.foo.bar的同时，也访问了p.foo。但当我们修改p.foo.bar时，副作用函数却不会再次执行，因为data是响应式的，但是foo不是，当foo中的bar属性更改时，并没有任何副作用函数与之关联，所以也不会执行。  
想要解决上述问题，我们需要把foo也改成响应式的，这个很简单，如果访问属性时发现访问的属性是个Object，那么就将他也变成响应式就可以了。我们先把proxy封装下，方便调用：
```js

```
### 深浅响应和深浅只读

## 代理数组
对数组的所有访问操作：
1. 通过索引访问数组元素值：arr[0]
2. 访问数组长度：arr.length
3. 把数组作为对象，使用for...in遍历循环
4. 数组所有不改变数组本身的方法：concat/join/every/some/find/findIndex/includes
对数组的修改操作：
1. 通过索引修改数组元素值：arr[0] = 1
2. 修改数组长度：arr.length = 0
3. 数组栈方法：push/pop/shift/unshift
4. 修改数组的原型方法：splice/sort/reverse/fill