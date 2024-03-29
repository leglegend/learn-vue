import {
  ITERATE_KEY,
  MAP_KEY_ITERATE_KEY,
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
  clear() {
    const target = this.raw
    const hadItems = target.size !== 0
    const res = target.clear()
    if (hadItems) {
      trigger(target, null, TriggerType.CLEAR)
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
  },
  forEach(callback, thisArg) {
    // wrap函数用来把可代理的值转换为响应式数据
    const wrap = (val) => (typeof val === 'object' ? reactive(val) : val)
    const target = this.raw
    track(target, ITERATE_KEY)
    target.forEach((v, k) => {
      // 手动调用callback，用wrap函数包裹value和key后再传给callback
      callback.call(thisArg, wrap(v), wrap(k), this)
    })
  },
  [Symbol.iterator]: iteratorMethod,
  entries: iteratorMethod,
  values: valuesIteratorMethod,
  keys: keysIteratorMethod
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

function targetTypeMap(rawType) {
  switch (rawType) {
    case 'Object':
    case 'Array':
      return 1
    case 'Map':
    case 'Set':
    case 'WeakMap':
    case 'WeakSet':
      return 2
    default:
      return 0
  }
}

// 封装createReactive函数，接收一个参数isShallow，默认false即非浅响应
function createReactive(obj, isShallow = false, isReadonly = false) {
  // 获得 "[object RawType]" 形式的rawType
  const rawType = targetTypeMap(
    Object.prototype.toString.call(obj).slice(8, -1)
  )
  if (rawType === 1) {
    return new Proxy(obj, {
      // 访问属性
      get(target, key, receiver) {
        // 代理对象可以通过raw属性访问原始数据
        if (key === 'raw') {
          return target
        }

        // 如果操作的目标对象是数组，并且key存在于arrayInstrumentations上，那么返回定义在其上的值
        if (
          Array.isArray(target) &&
          arrayInstrumentations.hasOwnProperty(key)
        ) {
          return Reflect.get(arrayInstrumentations, key, receiver)
        }

        // 如果key的类型是symbol，则不进行追踪
        // 非只读的时候才需要建立响应式
        if (!isReadonly && typeof key !== 'symbol') {
          track(target, key)
        }

        // 得到原始结果
        const res = Reflect.get(target, key, receiver)

        // 如果是浅响应，直接返回原始结果
        if (isShallow) {
          return res
        }

        if (typeof res === 'object' && res !== null) {
          // 调用reactive将结果包装成响应式并返回
          // 如果数据为只读，则调用readonly对值进行包装
          return isReadonly ? readonly(res) : reactive(res)
        }

        return res
      },
      // in操作符
      has(target, key) {
        track(target, key)
        return Reflect.has(target, key)
      },
      // for...in 循环
      ownKeys(target) {
        // 将副作用函数与ITERATE_KEY关联
        // 如果操作目标是数组，则使用length为key并建立响应关联
        track(target, Array.isArray(target) ? 'length' : ITERATE_KEY)
        return Reflect.ownKeys(target)
      },
      // 修改属性
      set(target, key, newVal, receiver) {
        // 如果是只读的，打印警告信息并返回
        if (isReadonly) {
          console.warn(`属性${key}是只读的`)
          return true
        }
        // 先取回旧值
        const oldVal = target[key]

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

        // 设置属性值
        const res = Reflect.set(target, key, newVal, receiver)

        // target === receiver.raw 说明receiver时target的代理对象
        if (target === receiver.raw) {
          // 比较新值和旧值，只要当不全等的时候才触发响应，并派出NaN的情况
          if (oldVal !== newVal && (oldVal === oldVal || newVal === newVal)) {
            // 将type传递给trigger
            // 增加第四个参数，触发响应的新值
            trigger(target, key, type, newVal)
          }
        }

        return res
      },
      // delete属性
      deleteProperty(target, key) {
        // 如果是只读的，打印警告信息并返回
        if (isReadonly) {
          console.warn(`属性${key}是只读的`)
          return true
        }

        // 检查操作属性是否为对象自己的属性
        const hadKey = Object.prototype.hasOwnProperty.call(target, key)
        // 使用Reflect完成属性的删除
        const res = Reflect.deleteProperty(target, key)

        if (res && hadKey) {
          // 只有当被删除的属性是对象自己的属性并且成功删除时，才触发更新
          trigger(target, key, TriggerType.DELETE)
        }

        return res
      }
    })
  } else if (rawType === 2) {
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
  } else {
    return obj
  }
}
