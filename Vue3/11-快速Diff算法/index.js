import { effect, ref } from './reactivity/index.js'
import { renderer } from './runtime-dom/index.js'

// 8.8
const bol = ref(false)

effect(() => {
  const vnode = {
    type: 'div',
    props: bol.value
      ? {
          onClick: () => {
            alert('父元素alert')
          }
        }
      : {},
    children: [
      {
        type: 'p',
        props: {
          onClick: () => {
            bol.value = true
            console.log('click')
          }
        },
        children: 'test'
      }
    ]
  }

  console.log(bol.value)

  renderer.render(vnode, document.querySelector('#app'))
})

// const vnode = {
//   type: 'div',
//   // 使用props描述一个元素的属性
//   props: {
//     id: 'foo',
//     onClick: () => {
//       console.log('click')
//     },
//     onContextmenu: () => {
//       console.log('contextmenu')
//     }
//   },
//   children: [
//     {
//       type: 'p',
//       children: 'hello',
//       props: {
//         onClick: [
//           () => {
//             console.log('click1')
//           },
//           () => {
//             console.log('click2')
//           }
//         ]
//       }
//     }
//   ]
// }
