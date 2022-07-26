import { ITERATE_KEY, effect, track, trigger } from './effect.js'

const obj = { foo: 1 }

const p = new Proxy(obj, {
  ownKeys(target) {
    // 将副作用函数与ITERATE_KEY关联
    track(target, ITERATE_KEY)
    return Reflect.ownKeys(target)
  },
  set(target, key, newVal, receiver) {
    // 设置属性值
    const res = Reflect.set(target, key, newVal, receiver)
    // 把副作用函数从桶里取出并执行
    trigger(target, key)

    return res
  }
})

effect(() => {
  for (const key in p) {
    console.log(key)
  }
})
debugger
p.foo = 2
