// import { effect } from './effect.js'
// import { reactive } from './reactive.js'

// const proxy = reactive(new Map([['key', 1]]))
// effect(() => {
//   console.log(proxy.get('key'))
// })

// proxy.set('key', 2)

const s = new Set([1, 2, 3])
const p = new Proxy(s, {
  get(target, key, receiver) {
    // 如果读取的是size属性，则指定第三个参数receiver为原始对象target
    // 因为size是个访问器属性，this指向代理对象的话，没有size这个属性
    if (key === 'size') {
      return Reflect.get(target, key, target)
    }

    // 手动更改方法的this指向
    return target[key].bind(target)
  }
})

console.log(p.size) // 3
