export const ITERATE_KEY = Symbol('iterate')
export const TriggerType = {
  SET: 'set',
  ADD: 'add',
  DELETE: 'delete'
}

// 存储被注册的副作用函数
let activeEffect
// effect 栈
const effectStack = []
// 存储副作用函数的桶
const bucket = new WeakMap()
// 注册副作用函数的函数
export function effect(fn, options = {}) {
  const effectFn = () => {
    // 调用cleanup函数完成清楚工作
    cleanup(effectFn)
    // 当effect执行时 设置其为当前激活的副作用函数
    activeEffect = effectFn
    // 在调用副作用函数之前 将当前副作用函数压入栈中
    effectStack.push(effectFn)
    // 将fn的执行结果储存在res中
    const res = fn()
    // 在当前副作用函数执行完毕后，将当前副作用函数弹出栈
    effectStack.pop()
    // 把activeEffect还原为之前的值
    activeEffect = effectStack[effectStack.length - 1]
    // 将res作为effectFn的返回值返回
    return res
  }
  // 将options挂载到effectFn上
  effectFn.options = options
  // activeEffect.deps用来存储所有与该副作用函数相关联的依赖集合
  effectFn.deps = []
  // 只有非lazy的时候，才执行副作用函数
  if (!options.lazy) effectFn()
  // 将副作用函数作为返回值返回
  return effectFn
}

function cleanup(effectFn) {
  for (let i = 0; i < effectFn.deps.length; i++) {
    // deps是依赖集合
    const deps = effectFn.deps[i]
    // 将effectFn从依赖集合中删除
    deps.delete(effectFn)
  }
  // 重置effectFn.deps数组
  effectFn.deps.length = 0
}

export function track(target, key) {
  // 没有注册副作用函数 直接返回
  if (!activeEffect) return
  // 根据target从`桶`中取得depsMap: Map = key --> effects
  let depsMap = bucket.get(target)
  // 如果不存在depsMap，就新建一个Map与target关联
  if (!depsMap) {
    depsMap = new Map()
    bucket.set(target, depsMap)
  }
  // 根据key从depsMap中取得deps，他是一个set，存着与key关联的effects
  let deps = depsMap.get(key)
  // 如果deps不存在，新建一个set并与key关联
  if (!deps) {
    depsMap.set(key, (deps = new Set()))
  }
  // 将当前激活的副作用函数添加到`桶`里
  deps.add(activeEffect)
  // deps就是一个与当前副作用函数存在联系的依赖集合
  // 将其添加到 activeEffect.deps 数组中
  activeEffect.deps.push(deps)
}

export function trigger(target, key, type, newVal) {
  // 根据target从桶中取得depsMap
  const depsMap = bucket.get(target)

  if (!depsMap) return

  // 根据key取得所有副作用函数
  const effects = depsMap.get(key)

  // 通过effects创建一个新集合，避免无限循环
  const effectsToRun = new Set()

  // 如果trigger触发执行的副作用函数与当前正在执行的副作用函数相同，则不触发执行
  effects &&
    effects.forEach((effectFn) => {
      if (effectFn !== activeEffect) {
        effectsToRun.add(effectFn)
      }
    })

  // 只有当操作类型是ADD或DELETE时，才触发与ITERATE_KEY相关联的副作用函数重新执行
  if (type === TriggerType.ADD || type === TriggerType.DELETE) {
    // 取得与ITERATE_KEY相关的副作用函数
    const iterateEffects = depsMap.get(ITERATE_KEY)
    // 将于ITERATE_KEY相关联得到副作用函数也添加到effectsToRun
    iterateEffects &&
      iterateEffects.forEach((effectFn) => {
        if (effectFn !== activeEffect) {
          effectsToRun.add(effectFn)
        }
      })
  }

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

  // 执行所有副作用函数
  effectsToRun.forEach((effectFn) => {
    // 如果一个副作用函数存在调度器，则调用该调度器，并将该副作用函数作为参数传递
    if (effectFn.options.scheduler) {
      effectFn.options.scheduler(effectFn)
    } else {
      // 否则直接执行副作用函数
      effectFn()
    }
  })
}
