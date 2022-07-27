import { ITERATE_KEY, effect, track, trigger, TriggerType } from './effect.js'

const obj = { foo: 1 }

const p = new Proxy(obj, {
  // 访问属性
  get(target, key, receiver) {
    track(target, key)
    return Reflect.get(target, key, receiver)
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
    // 如果属性不存在，则说明是在添加新属性，否则是设置已有属性
    const type = Object.prototype.hasOwnProperty.call(target, key)
      ? TriggerType.SET
      : TriggerType.ADD

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
      trigger(target, key, TriggerType.DELETE)
    }
  }
})

effect(() => {
  for (const key in p) {
    console.log(key)
  }
})
debugger
p.foo = 2
