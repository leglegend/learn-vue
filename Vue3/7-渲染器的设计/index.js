import { effect } from './reactivity/effect.js'
import { reactive } from './reactivity/reactive.js'
import { ref } from './reactivity/ref.js'

// function renderer(domString, container) {
//   container.innerHTML = domString
// }

// const count = ref(1)

// effect(() => {
//   renderer(`<h1>${count.value}</h1>`, document.getElementById('app'))
// })

// count.value++
// setTimeout(() => {
//   count.value++
// }, 2000)

function createRenderer(options) {
  // 通过options得到操作DOM的API
  const { createElement, insert, setElement } = options

  function patch(n1, n2, container) {
    // 如果n1不存在，意味着挂载，则调用mountElement函数完成挂载
    if (!n1) {
      mountElement(n2, container)
    } else {
      // n1存在，意味着打补丁
    }
  }

  function mountElement(vnode, container) {
    // 创建DOM元素
    const el = createElement(vnode, type)

    // 处理子节点，如果子节点是字符串，代表元素具有文本节点
    if (typeof vnode.children === 'string') {
      // 对于文本节点，调用setElement设置元素的文本节点
      setElement(el, vnode.children)
    }

    // 将元素添加到容器中
    insert(el, container)
  }

  function render(vnode, container) {
    if (vnode) {
      // 新vnode存在，将其与旧vnode一起传递给patch函数，进行打补丁
      patch(container._vnode, vnode, container)
    } else {
      if (container._vnode) {
        // 旧vnode存在，且新vnode不存在，说明是卸载(unmount)操作，清空container
        container.innerHTML = ''
      }
    }

    // 把vnode存储到container._vnode下，即后续渲染中的旧vnode
  }

  function hydrate(vnode, container) {
    // ...
  }

  return {
    render,
    hydrate
  }
}

// 创建renderer时传入配置项
const renderer = createRenderer({
  // 用于创建元素
  createElment(tag) {
    return document.createElement(tag)
  },
  // 用于设置元素的文本节点
  setElementText(el, text) {
    el.textContent = text
  },
  // 用于在给定的parent下添加指定元素
  insert(el, parent, anchor = null) {
    parent.insertBefore(el, anchor)
  }
})

const vnode = {
  type: 'h1',
  children: 'hello'
}

renderer.render(vnode, document.querySelector('#app'))
