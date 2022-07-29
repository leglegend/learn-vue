import { reactive } from './reactive.js'

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

function toRefs(obj) {
  const ret = {}
  for (const key in obj) {
    ret[key] = toRef(obj, key)
  }
  return ret
}

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
