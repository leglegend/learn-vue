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

// 封装createReactive函数，接收一个参数isShallow，默认false即非浅响应
function createReactive(obj, isShallow = false, isReadonly = false) {
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
        arrayInstrumentations.hasOwnProperty('key')
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
    }
  })
}
