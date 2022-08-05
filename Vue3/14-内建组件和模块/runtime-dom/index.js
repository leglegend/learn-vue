import { createRenderer } from '../runtime-core/renderer.js'
import { Fragement } from '../runtime-core/renderer.js'

// 创建renderer时传入配置项
export const renderer = createRenderer({
  // 用于创建元素
  createElement(tag) {
    return document.createElement(tag)
  },
  // 用于设置元素的文本节点
  setElementText(el, text) {
    el.textContent = text
  },
  // 用于在给定的parent下添加指定元素
  insert(el, parent, anchor = null) {
    parent.insertBefore(el, anchor)
  },
  // 创建文本节点
  createText(text) {
    return document.createTextNode(text)
  },
  // 设置文本节点文本值
  setText(el, text) {
    el.nodeValue = text
  },
  createComment(text) {
    return document.createComment(text)
  },
  setComment(el, text) {
    el.nodeValue = text
  },
  // 用于设置属性
  patchProps(el, key, prevValue, nextValue) {
    // 匹配以on开头的属性，视其为事件
    if (/^on/.test(key)) {
      // 定义el._vei为一个对象，存在事件名称到事件处理函数的映射
      const invokers = el._vei || (el._vei = {})

      // 获取该元素的伪造的事件处理函数 invoker
      let invoker = invokers[key]

      // 根据属性名得到对应的事件名称
      const name = key.slice(2).toLowerCase()

      if (nextValue) {
        if (!invoker) {
          // 如果没有invoker，则将一个伪造的invoker缓存到el._vei中
          // vei是vnode el invoker的缩写
          invoker = el._vei[key] = (e) => {
            // e.timeStamp 是事件发生的时间
            // 如果事件发生的事件早于事件处理函数绑定的时间，则不执行事件处理函数
            if (e.timeStamp < invoker.attached) return

            // 如果 invoker.value 是数组，则遍历它并逐个调用事件处理函数
            if (Array.isArray(invoker)) {
              invoker.value.forEach((fn) => fn(e))
            } else {
              // 当伪造的事件处理函数执行时，会执行真正的事件处理函数
              invoker.value(e)
            }
          }

          // 将真正的事件处理函数赋值给 invoker.value
          invoker.value = nextValue

          // 添加invoker.attached属性，存储事件处理函数被绑定的时间
          invoker.attached = performance.now()

          // 绑定invoker作为事件处理函数
          el.addEventListener(name, invoker)
        } else {
          // 如果invoker存在，只需要更新invoker.value的值即可
          invoker.value = nextValue
        }
      } else if (invoker) {
        // 新的事件绑定函数不存在，移除绑定
        el.removeEventListener(name, invoker)
      }
    } else if (key === 'class') {
      // 对class进行特殊处理
      el.className = nextValue || ''
    } else if (shouldSetAsProps(el, key, nextValue)) {
      const type = typeof el[key]
      if (type === 'boolean' && nextValue === '') {
        el[key] = true
      } else {
        el[key] = nextValue
      }
    } else {
      el.setAttribute(key, nextValue)
    }
  },
  // 卸载
  unmount(vnode) {
    // 判断VNode是否需要过度
    const needTransition = vnode.transition

    // 在卸载时，如果卸载的vnode类型为Fragment，则需要卸载其children
    if (vnode.type === Fragement) {
      vnode.children.forEach((c) => unmount(c))
      return
    } else if (typeof vnode.type === 'object') {
      // 判断该组件是否应该被KeepAlive
      if (vnode.shouldKeepAlive) {
        // 对于需要被KeepAlive的组件，不应该真的卸载它，儿是调用父组件
        // 即KeepAlive组件的_deActivated函数使其失活
        vnode.keepAliveInstance._deActivated(vnode)
      } else {
        // 对于组件的卸载，本质上是要卸载组件所渲染的内容，即subTree
        unmount(vnode.component.subTree)
      }
      return
    }

    // 获取el的父元素
    const parent = vnode.el.parentNode

    // 调用removeChild移除元素
    if (parent) {
      // 将卸载动作封装到performRemove函数中
      const performRemove = () => parent.removeChild(vnode.el)

      if (needTransition) {
        // 如果需要过度，将元素和performRemove函数当作参数传入transition.leave钩子
        vnode.transition.leave(vnode.el, performRemove)
      } else {
        // 不需要过度，立即卸载
        performRemove()
      }
    }
  }
})

function shouldSetAsProps(el, key, value) {
  // 特殊处理
  if (key === 'form' && el.tagName === 'INPUT') return false
  // 用in操作符判断key是否存在对应的DOM Properties
  return key in el
}
