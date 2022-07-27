import { ITERATE_KEY, track, trigger, TriggerType } from './effect.js'

export function reactive(obj) {
  return createReactive(obj)
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

// 封装createReactive函数，接收一个参数isShallow，默认false即非浅响应
function createReactive(obj, isShallow = false, isReadonly = false) {
  return new Proxy(obj, {
    // 访问属性
    get(target, key, receiver) {
      // 代理对象可以通过raw属性访问原始数据
      if (key === 'raw') {
        return target
      }

      // 非只读的时候才需要建立响应式
      if (!isReadonly) {
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
      track(target, ITERATE_KEY)
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
      const type = Object.prototype.hasOwnProperty.call(target, key)
        ? TriggerType.SET
        : TriggerType.ADD

      // 设置属性值
      const res = Reflect.set(target, key, newVal, receiver)

      // target === receiver.raw 说明receiver时target的代理对象
      if (target === receiver.raw) {
        // 比较新值和旧值，只要当不全等的时候才触发响应，并派出NaN的情况
        if (oldVal !== newVal && (oldVal === oldVal || newVal === newVal)) {
          // 把副作用函数从桶里取出并执行，将type传递给trigger
          trigger(target, key, type)
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
