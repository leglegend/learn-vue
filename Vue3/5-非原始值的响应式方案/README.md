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
首先可以肯定的是，副作用函数一定是可以执行的，因为我们访问p.foo.bar的同时，也访问了p.foo。但当我们修改p.foo.bar时，副作用函数却不会再次执行，因为p是响应式的，但是foo不是，当foo中的bar属性更改时，并没有任何副作用函数与之关联，所以也不会执行。  
想要解决上述问题，我们需要把foo也改成响应式的，这个很简单，如果访问属性时发现访问的属性是个Object，那么就将他也变成响应式就可以了。我们先把proxy封装下，方便调用：
```js
function reactive(obj) {
  return new Proxy(obj,{
    get() {
      // 省略其他操作
      if (typeof res === 'object' && res !== null) {
        // 调用reactive将结果包装成响应式并返回
        return reactive(res)
      }

      return res
    },
    set() {/** */}
  })
}
```
如上代码，我们把proxy封装在reactive函数下，这样只要对元对象使用reactive函数，返回值就是其代理对象。在proxy的get访问器增加一个逻辑，如果访问的属性是object，则对该属性调用reactive方法，把它也变成响应式的再返回。  
### 深浅响应和深浅只读
下面我们来实现Vue3中的几个方法：`reactive`，`shallowReactive`，`readonly`，`shallowReadonly`。其中`reactive`我们已经实现也知道其用法，`shallowReactive`功能和`reactive`类似，但是只将第一层数据变为响应式，所以叫做浅响应。其实实现方法很简单，因为我们在没做上节内容时，实现的响应式就是浅响应，现在我们只需要把这两个方法封装下：
```js
// 创建响应式，默认为非浅响应
function createReactive(obj,isShallow=false) {
  return new Proxy(obj,{
    get() {
      // 省略其他操作

      // 如果是浅响应，直接返回原始结果
      if (isShallow) {
        return res
      }

      if (typeof res === 'object' && res !== null) {
        // 调用reactive将结果包装成响应式并返回
        return reactive(res)
      }

      // 省略其他操作
    }
  })
}

function reactive(obj) {
  return createReactive(obj)
}

function shallowReactive(obj) {
  return createReactive(obj, true)
}
```
只要在get访问起中判断传入的isShallow为true时直接返回原始值，就能够实现，是不是很简单？接下来我们实现readonly：
```js
function createReactive(obj,isShallow=false,isReadonly=false) {
  return new Proxy(obj,{
    get() {
      // 省略其他操作

      // 如果是浅响应，直接返回原始结果
      if (isShallow) {
        return res
      }

      if (typeof res === 'object' && res !== null) {
        // 调用reactive将结果包装成响应式并返回
        return isReadonly?readonly(res):reactive(res)
      }

      // 省略其他操作
    },
    set(target,key) {
      // 如果是只读的，打印警告信息并返回
      if (isReadonly) {
        console.warn(`属性${key}是只读的`)
        return true
      }
    },
    deleteProperty(target,key) {
      // 如果是只读的，打印警告信息并返回
      if (isReadonly) {
        console.warn(`属性${key}是只读的`)
        return true
      } 
    }
  })
}
function readonly(obj) {
  return createReactive(obj, false, true)
}
function shallowReadonly(obj) {
  return createReactive(obj, true, true)
}
```
实现起来也是很简单，只需要在set和deleteProperty拦截器中拦截该操作并打印提示就可以了。同样的，对于深只读，属性中的object类型也要进行readonly操作。  
## 代理数组
对于数组，我们需要捕获到数组的下列操作：  
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
其实我们对Object对象实现的大部分功能都能对数组生效，比如通过下标或length属性访问数组会被get捕捉器捕获，通过下标修改数组元素会被set捕捉器捕获，所以我们只需要对数组的特殊操作和数组方法进行特殊处理就行。
### 访问数组长度
这里其实不需要做任何处理，把length当作数组的一个属性(或者说Object的一个属性，数组也是Object)，length作为key保存使用了length的副作用函数。  
### for...in
ownKeys捕捉器可以捕获for...in操作：
```js
ownKeys(target) {
  // 将副作用函数与ITERATE_KEY关联
  // 如果操作目标是数组，则使用length为key并建立响应关联
  track(target, Array.isArray(target) ? 'length' : ITERATE_KEY)
  return Reflect.ownKeys(target)
}
```
for...in操作不会读取属性的值，只会读取其key，所以只有在数组长度变化时才应该触发，所以这里我们将for..in操作通过length追踪，如果之后length发生变化，就会触发for...in的操作。  
### 不改变数组本身的方法
对于大部分不改变数组本身的方法，并不需要特殊处理，但是对于indexOf、includes这种判断元素是否存在在数组中的方法，会有问题，因为我们使用的数组其实是个代理数组，数组里面的内容也被我们改成了响应式内容，当用户用原始对象为参数判断数组中是否包含时，会得到错误的结果，比如：
```js
const obj = {}
const arr = reactive([obj])
console.log(arr.includes(obj)) // false
```
上面的代码会返回false，因为arr中的obj已经被我们换成了响应式的obj(就是包装了proxy的obj)，肯定不会和原始对象相等，但用户这么用其实是符合尝试的，所以我们需要兼容这种用法：
```js
const arrayInstrumentations = {}
;['includes', 'indexOf', 'lastIndexOf'].forEach((method) => {
  const originMethod = Array.prototype[method]
  arrayInstrumentations[method] = function (...args) {
    // this是代理对象，现在代理对象中查找，将结果存储在res中
    let res = originMethod.apply(this, args)

    if (res === false || res === -1) {
      // res为false说明该没找到，通过this.raw拿到原始数组，再去其中查找并更新res值
      res = originMethod.apply(this.raw, args)
    }

    return res
  }
})

function createReactive(obj, isShallow = false, isReadonly = false) {
  return new Proxy(obj, {
    // 访问属性
    get(target, key, receiver) {
      //  ...
      // 如果操作的目标对象是数组，并且key存在于arrayInstrumentations上，那么返回定义在其上的值
      if (Array.isArray(target) && arrayInstrumentations.hasOwnProperty(key)) {
        return Reflect.get(arrayInstrumentations, key, receiver)
      }

      // ...
    }
  })
}
```
重写这三个方法，当get捕捉器捕捉到这三个方法时，调用我们重写的方法。其实我们改写的内容很简单，就是在代理数组和原数组中都找一遍传入的参数，然后再返回结果，这样就算传入的参数时非响应式的，也能够在原始数组中找到其正确的位置。   
### 修改数组长度
我们在访问length和for..in遍历中都添加了对length的追踪，修改length属性会触发set捕捉器进而触发length相关的副作用函数。但是我们修改length不仅仅应该通知到length相关的副作用函数，因为修改length还会删除数组元素，那些被删除的元素相关的副作用函数也应该被调用：
```js
trigger(target,key) {
  // 如果目标对象是数组，且修改了数组的length属性
  if (Array.isArray(target) && key === 'length') {
    // 对于索引大于或等于length值的元素，需要运行其副作用函数(因为被删掉了)
    depsMap.forEach((effect, key) => {
      if (key >= length) {
        effect.forEach((effectFn) => {
          if (effectFn !== activeEffect) {
            effectsToRun.add(effectFn)
          }
        })
      }
    })
  }
}
```
### 通过索引修改数组
刚才说过这种方式和Object是一致的，但也有地方需要特殊处理下，如果我们修改的key大于等于length，其实相当于是新加了一个数组元素，这时候其实是改变了length的值，需要通知到length相关的副作用函数：
```js
set(target,key) {
  // 如果属性不存在，则说明是在添加新属性，否则是设置已有属性
  const type = Array.isArray(target)
    ? // 如果代理目标是数组，则检测被设置的索引值是否小于数组长度，
      // 如果是，则视为SET操作，如果否则是ADD操作
      Number(key) < target.length
      ? TriggerType.SET
      : TriggerType.ADD
    : Object.prototype.hasOwnProperty.call(target, key)
    ? TriggerType.SET
    : TriggerType.ADD
}
```
在trigger中，如果是ADD操作的话，还需要通知到length：
```js
trigger(target,key) {
  // 当操作类型是ADD且目标对象是数组时，应该取出并执行那些与length属性相关的副作用函数
  if (type === TriggerType.ADD && Array.isArray(target)) {
    // 取出与length相关联的副作用函数
    const lengthEffects = depsMap.get('length')
    lengthEffects &&
      lengthEffects.forEach((effectFn) => {
        if (effectFn !== activeEffect) {
          effectsToRun.add(effectFn)
        }
      })
  }
}
```
### 数组栈方法
数组的push/pop/shift/unshift方法，这几个方法本身没有什么问题，都能够正确的触发set/deleteProperty捕捉器，但是这些方法调用时会先访问数组的length属性，调用结束时会修改数组的length属性，这就导致调用方法时会将所在的副作用函数放进length的`桶`中，如果恰巧有别的副作用函数也在同时通过栈方法修改数组，那么将会互相触发length导致栈溢出，所以我们需要在调用栈操作方法时禁用追踪：
```js
let shouldTrack = true
;['push', 'pop', 'shift', 'unshift', 'splice'].forEach((method) => {
  // 取得原始方法
  const originMethod = Array.prototype[method]
  // 重写
  arrayInstrumentations[method] = function (...args) {
    // 在调用原始方法前，禁止追踪
    shouldTrack = false
    // push方法的默认行为
    let res = originMethod.apply(this, args)
    // 恢复追踪
    shouldTrack = true
    return res
  }
})
```
前面我们已经定义过arrayInstrumentations，这里可以直接用。逻辑也很简单，重写原方法，在调用原方法前禁用追踪，调用完原方法后再启用，还需要在track中做下修改：
```js
track(target, key) {
  // 没有注册副作用函数或者禁止追踪时，直接返回
  if (!activeEffect || !shouldTrack) return
}
```

## 代理Map和Set
老规矩，我们还是先看一下代理Map和Set需要捕获其哪些操作：
Map：
1. map.set(key,value)
2. map.get(key)
3. map.has(key)
4. map.delete(key)
5. map.keys()
6. map.values()
7. map.entries()
8. map[@@iterator]
9. map.forEach(callback, thisArg)
10. map.clear()
11. map.size
Set:
1. set.add(key)
2. set.has(key)
3. set.delete(key)
4. set.keys()
5. set.values()
6. set.entries()
7. set[@@iterator]
8. set.forEach(callback, thisArg)
9. set.clear()
10. set.size
好消息：Map/Set的操作不多(比数组少多了)  
坏消息：每一个都要重写  
因为map无法通过索引访问，也不能通过key访问，所以Object和数组那一套响应式在Map这里不灵了。但是还是通过Proxy实现，get捕捉器能捕获上述所有操作，我们把重写后的方法返回回去，在重写的方法中实现追踪和触发操作：(Set/Map的接口可以复用，下面以Map为标准，除了add)
```js
const mutableInstrumentations = {
  get() { },
  set() { }
}
function createReactive(obj, isShallow = false, isReadonly = false) {
  return new Proxy(obj, {
    get(target, key, receiver) {
      if (key === 'raw') return target
      // 如果读取的是size属性，则指定第三个参数receiver为原始对象target
      // 因为size是个访问器属性，this指向代理对象的话，没有size这个属性
      if (key === 'size') {
        track(target, ITERATE_KEY)
        return Reflect.get(target, key, target)
      }

      // 返回定义在mutableInstrumentations上的方法
      return mutableInstrumentations[key]
    }
  })
}
```
当get捕捉器捕获到访问size时，需要特殊操作，因为代理对象上没有size这个属性，通过Reflect反射时将this指向原对象就可以了。捕获到其他操作时，返回我们在mutableInstrumentations上定义的同名方法。
### get
```js
const mutableInstrumentations = {
  get(key) {
    const target = this.raw
    const had = target.has(key)

    track(target, key)

    // 如果存在，返回结果，如果得到的结果仍然是可代理数据，则返回reactive包装后的响应式数据
    if (had) {
      const res = target.get(key)
      return typeof res === 'object' ? reactive(res) : res
    }
  }
}
```
get的实现逻辑跟Object类似，追踪get的key，返回value，如果value是个object，那就变为响应式再返回。可以判断原对象有没有这个key，没有的话可以省去一些操作。
### set
```js
const mutableInstrumentations = {
 set(key, value) {
    const target = this.raw
    const had = target.has(key)

    // 获取旧值
    const oldValue = target.get(key)

    // 获取原始值，由于value本身可能已经是原始数据，所以value.raw不存在，直接使用value
    const rawValue = value.raw || value

    // 设置新值
    target.set(key, rawValue)

    // 如果不存在，则说明是ADD操作
    if (!had) {
      trigger(target, key, TriggerType.ADD)
    } else if (
      oldValue !== value ||
      (oldValue === oldValue && value === value)
    ) {
      // 如果不存在，并且值变了，则是SET操作
      trigger(target, key, TriggerType.SET)
    }
  }
}
```
get追踪了key，set自然就是触发key了。不过需要先判断下有没有这个值，因为没有这个key的话是新增，有的话是修改，修改不需要触发size相关的副作用函数。  
还有一点需要注意，调用原始对象的set方法时，有个获取原始值的操作，因为value本身可能是个响应式对象，我们将响应式对象放进原始对象中，会造成原始对象污染，所以这里取value的原始对象的值，再放进原始对象中。  
### delete
```js
const mutableInstrumentations = {
  delete(key) {
    const target = this.raw
    const hadKey = target.has(key)
    const res = target.delete(key)

    // 要删除的元素存在时，才触发响应
    if (hadKey) {
      trigger(target, key, TriggerType.DELETE)
    }

    return res
  }
}
```
删除时调用trigger需要传入delete，因为该操作会修改size。
### clear
```js
const mutableInstrumentations = {
  clear() {
    const target = this.raw
    const hadItems = target.size !== 0
    const res = target.clear()
    if (hadItems) {
      trigger(target, null, TriggerType.CLEAR)
    }
    return res
  }
}
```
clear会清空map，传入type为clear，trigger中识别到clear会把所有副作用函数拿出来执行：
```js
function trigger(target, key, type) {
  const depsMap = bucket.get(target)

  if (!depsMap) return
  // 如果是clear操作，取出所有副作用函数
  const effects =
    type === TriggerType.CLEAR ? [...depsMap.values()] : depsMap.get(key)

  // 执行副作用函数
}
```
### forEach
```js
const mutableInstrumentations = {
  forEach(callback, thisArg) {
    // wrap函数用来把可代理的值转换为响应式数据
    const wrap = (val) => (typeof val === 'object' ? reactive(val) : val)
    const target = this.raw
    track(target, ITERATE_KEY)
    target.forEach((v, k) => {
      // 手动调用callback，用wrap函数包裹value和key后再传给callback
      callback.call(thisArg, wrap(v), wrap(k), this)
    })
  }
}
```
这里我们定义了一个wrap函数，可以将object数据转换为响应式对象，手动调用forEach，将key和value都变成响应式的数据。

### entries、Symbol.iterator
entries和Symbol.iterator实现的逻辑完全一样，所以放在同一个函数中：
```js
const mutableInstrumentations = {
  [Symbol.iterator]: iteratorMethod,
  entries: iteratorMethod,
}

function iteratorMethod() {
  const target = this.raw
  // 获取原始值的迭代器
  const itr = target[Symbol.iterator]()

  const wrap = (val) => (typeof val === 'object' ? reactive(val) : val)

  track(target, ITERATE_KEY)

  return {
    next() {
      // 调用原始迭代器的方法获得vlue和done
      const { value, done } = itr.next()

      return {
        // 如果value不是undefined，则对其进行包装
        value: value ? [wrap(value[0]), wrap[value[1]]] : value,
        done
      }
    },
    [Symbol.iterator]() {
      return this
    }
  }
}
```
就是把迭代器取出来自己实现了一个迭代器，并将value转换为响应式的。return的时候之所以返回一个`[Symbol.iterator]`属性，是因为只有实现了这个属性的对象才是可迭代对象，否则会报错该对象不可迭代。

### values
```js
const mutableInstrumentations = {
  values: valuesIteratorMethod
}
function valuesIteratorMethod() {
  const target = this.raw
  const itr = target.values()

  const wrap = (val) => (typeof val === 'object' ? reactive(val) : val)

  track(target, ITERATE_KEY)

  return {
    next() {
      const { value, done } = itr.next()
      return {
        // value是值，而非键值对，所以只需要包裹value即可
        value: wrap(value),
        done
      }
    },
    [Symbol.iterator]() {
      return this
    }
  }
}
```
和entries的实现思路完全一样，不过返回时不用返回key了。

### keys
```js
const mutableInstrumentations = {
   keys: keysIteratorMethod
}
function keysIteratorMethod() {
  const target = this.raw
  const itr = target.values()

  const wrap = (val) => (typeof val === 'object' ? reactive(val) : val)

  // 调用track函数追踪依赖，在副作用函数与MAP_KEY_ITERATE_KEY之间建立联系
  track(target, MAP_KEY_ITERATE_KEY)

  return {
    next() {
      const { value, done } = itr.next()
      return {
        // value是值，而非键值对，所以只需要包裹value即可
        value: wrap(value),
        done
      }
    },
    [Symbol.iterator]() {
      return this
    }
  }
}
```
只会访问key不会访问values，所以和其他迭代是不同的，只需要在size发生变化时通知到相关副作用函数即可(也就是ADD和DELETE操作时触发副作用函数)。
### add
```js
const mutableInstrumentations = {
  add(key) {
    // this 仍然指向的是代理对象，通过raw获取原始对象
    const target = this.raw

    // 判断添加的值是否已存在
    const hadKey = target.has(key)

    // 通过原始对象执行add方法添加具体的值
    // 这里不需要bind了，因为可以通过target调用执行
    const res = target.add(key)

    // 只有在值不存在的情况下才需要触发响应
    if (!hadKey) {
      // 调用trigger函数触发响应，操作类型为ADD
      trigger(target, key, TriggerType.ADD)
    }

    return res
  },
}
```


