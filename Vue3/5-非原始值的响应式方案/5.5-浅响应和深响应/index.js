import { effect } from './effect.js'
import { reactive } from './reactive.js'

const obj = {}
const proto = { bar: 1 }
const child = reactive(obj)
const parent = reactive(proto)
// 使用parent作为child的原型
Object.setPrototypeOf(child, parent)

effect(() => {
  console.log(child.bar)
})
//
child.bar = 2
