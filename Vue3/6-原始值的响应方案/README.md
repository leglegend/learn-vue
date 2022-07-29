# 原始值的响应方案
原始值是指Boolean、Number、String、BigInt、Symbol、undefined、null类型的值，在JavaScript中，原始值是按值传递的。一个函数接收原始值为参数，则他们两个就是独立的值，proxy也无法代理原始值，所以需要对其进行一层包裹。
## ref
无论是访问原始值还是修改原始值，都是没有办法拦截的，所以我们需要给原始值包裹在一个对象上，访问这个对象的value就能获取原始值，并且对value的访问和修改都能够拦截的到。这就像是通过reactive定义了一个`{value:123}`：
```js
function ref(val) {
  const wrapper = {
    value: val
  }

  // 使用Object.defineProperty在wrapper对象上定义一个不可枚举的__v_isRef属性
  Object.defineProperties(wrapper, '__v_isRef', {
    value: true
  })

  return reactive(wrapper)
}
```
上面的ref函数实现了对原始值的包裹，并且在包裹的对象上定义了一个`__v_isRef`属性，用来区分是ref包裹对象还是`reactive({value:123})`。包裹完成后的对象通过reactive定义成响应式对象，之后对value的修改就变为可追踪的了。  
## toRef和toRefs
`toRef`用于将响应式对象中的某个原始值转换为ref对象，为什么需要这个操作？我们看下下面这个例子：
```js
const obj = reactive({foo:1,bar:2})

const {foo,bar} = obj

effect(()=>{
  console.log(foo+bar)
})
```
我们从响应式对对象obj中结构出来了foo和bar，并将foo和bar放进了副作用函数，这里的foo和bar并不是响应式的，儿是原始值1和2，那副作用函数就很难发挥其作用。我们期望结构出来的foo和bar依旧是响应式的：
```js
function toRef(obj, key) {
  const wrapper = {
    get value() {
      return obj[key]
    },
    set value(val) {
      obj[key] = val
    }
  }

  Object.defineProperties(wrapper, '__v_isRef', {
    value: true
  })

  return wrapper
}
```
toRef的逻辑非常简单，定义一个访问起属性value，每次访问都像其对象获取值，修改也是修改其对象上的值，这样每次访问修改都能触达其对象：
```js

const foo = toRef(obj,'foo')
const bar = toRef(bar,'foo')

effect(()=>{
  console.log(foo.value+bar.value)
})
```
当属性比较多时，用toRef比较麻烦，用toRefs将一个对象的所有属性变为ref类型的数据：
```js
function toRefs(obj) {
  const ret = {}
  for (const key in obj) {
    ret[key] = toRef(obj, key)
  }
  return ret
}
const {foo,bar} = toRefs(objs)
```
## 解包ref
我们在模板中使用ref对象是不需要添加value的，这是因为Vue自动帮我们解包了ref对象：
```js
// 解包ref对象
function proxyRefs(target) {
  return new Proxy(target, {
    get(target, key, receiver) {
      value = Reflect.get(target, key, receiver)
      // 自动脱ref实现：如果读取的值是ref，则返回它的value属性
      return value.__v_isRef ? value.value : value0
    },
    set(target, key, newValue, receiver) {
      const value = target[key]

      if (value.__v_isRef) {
        value.value = newValue
        return true
      }

      return Reflect.set(target, key, newValue, receiver)
    }
  })
}
```
其实就是访问ref属性时，能够自动返回其value的值，修改也是一样，能够直接修改其value的值。通过将目标对象变为proxy，当访问和修改ref属性时，可在其捕捉器更改为value。  
