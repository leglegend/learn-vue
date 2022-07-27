import {
  ITERATE_KEY,
  track,
  trigger,
  TriggerType,
  pauseTracking,
  enableTracking
} from './effect.js'

// 定义一个Map实例，存储原始值对象到代理对象的映射
const reactiveMap = new Map()

export function reactive(obj) {
  // 优先通过原始值对象obj寻找之前创建的代理对象，如果找到，直接返回已有对象
  const existionProxy = reactiveMap.get(obj)
  if (existionProxy) return existionProxy

  // 否则，创建新的代理对象
  const proxy = createReactive(obj)
  reactiveMap.set(obj, proxy)

  return proxy
}

export function shallowReactive(obj) {
  return createReactive(obj, true)
}

export function readonly(obj) {
  return createReactive(obj, false, true)
}

export function shallowReadonly(obj) {
  return createReactive(obj, true, true)
}

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
;['push', 'pop', 'shift', 'unshift', 'splice'].forEach((method) => {
  // 取得原始方法
  const originMethod = Array.prototype[method]
  // 重写
  arrayInstrumentations[method] = function (...args) {
    // 在调用原始方法前，禁止追踪
    pauseTracking()
    // push方法的默认行为
    let res = originMethod.apply(this, args)
    // 恢复追踪
    enableTracking()
    return res
  }
})

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
  },
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
  },
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

// 封装createReactive函数，接收一个参数isShallow，默认false即非浅响应
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
