import { effect } from './effect.js'
import { reactive } from './reactive.js'

const arr = reactive(['foo'])
effect(() => {
  console.log(arr.length)
})

// 设置索引1的值 会导致数组的长度变为2
arr[1] = 'bar'
