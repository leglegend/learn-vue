# 非原始值的响应式方案
上一节我们主要围绕着副作用函数展开响应式的讨论，这节我们回归数据本身。
## Proxy与Reflect
return target[key]不行，需要使用Reflect和recevier
## 代理Object
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
    },
})
```