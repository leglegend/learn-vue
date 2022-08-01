// 文本节点
export const Test = Symbol()
// 注释节点
export const Comment = Symbol()
// 片段节点
export const Fragement = Symbol()

export function createRenderer(options) {
  // 通过options得到操作DOM的API
  const {
    createElement,
    insert,
    setElementText,
    createText,
    setText,
    createComment,
    setComment,
    patchProps,
    unmount
  } = options

  function patch(n1, n2, container) {
    // 如果n1存在，对比n1n2的类型
    if (n1 && n1.type !== n2.type) {
      // 如果新旧vnode类型不同，则直接将旧vnode卸载
      unmount(n1)
      n1 = null
    }

    // 代码运行到这里，说明n1n2描述内容相同
    const { type } = n2

    // 如果n2.type是字符串类型，则它描述的是普通标签
    if (typeof type === 'string') {
      // 如果n1不存在，意味着挂载，则调用mountElement函数完成挂载
      if (!n1) {
        mountElement(n2, container)
      } else {
        // n1存在，意味着打补丁
        patchElement(n1, n2)
      }
    } else if (type === Text) {
      // 如果vnode的类型是Text，则该vnode是文本节点
      if (!n1) {
        // 使用createTextNode创建文本节点
        const el = (n2.el = createText(n2.children))
        // 将文本节点插入到容器中
        insert(el, container)
      } else {
        // 如果旧vnode存在，只需要使用新闻本节点的内容更新旧文本节点即可
        const el = (n2.el = n1.el)
        if (n2.children != n1.children) {
          setText(el, n2.children)
        }
      }
    } else if (type === Comment) {
      // 如果vnode的类型是Comment，则该vnode是注释节点
      if (!n1) {
        // 使用createComment创建文本节点
        const el = (n2.el = createComment(n2.children))
        insert(el, container)
      } else {
        // 如果旧vnode存在，只需要使用新闻本节点的内容更新旧文本节点即可
        const el = (n2.el = n1.el)
        if (n2.children != n1.children) {
          setComment(el, n2.children)
        }
      }
    } else if (type === Fragement) {
      if (!n1) {
        // 如果旧vnode不存在，只需要将Fragement的children逐个挂载即可
        n2.children.forEach((c) => patch(null, c, container))
      } else {
        // 如果旧vnode存在，更新children
        patchChildren(n1, n2, container)
      }
    } else if (typeof type === 'object') {
      // type为object，则n2描述的是组件
    } else if (type === 'xxx') {
      // 处理其他类型的vnode
    }
  }

  function mountElement(vnode, container) {
    // 创建DOM元素
    // 让vnode.el引用真实DOM
    const el = (vnode.el = createElement(vnode.type))

    // 处理子节点，如果子节点是字符串，代表元素具有文本节点
    if (typeof vnode.children === 'string') {
      // 对于文本节点，调用setElementText设置元素的文本节点
      setElementText(el, vnode.children)
    } else if (Array.isArray(vnode.children)) {
      // 如果children是数组，则遍历每一个子节点，并调用patch函数挂载他们
      vnode.children.forEach((child) => {
        patch(null, child, el)
      })
    }

    // 如果vnode.props存在才处理它
    if (vnode.props) {
      // 遍历vnode.props
      for (const key in vnode.props) {
        // 设置属性
        patchProps(el, key, null, vnode.props[key])
      }
    }

    // 将元素添加到容器中
    insert(el, container)
  }

  function patchElement(n1, n2) {
    const el = (n2.el = n1.el)
    const oldProps = n1.props
    const newProps = n2.props

    // 更新props
    for (const key in newProps) {
      if (newProps[key] !== oldProps[key]) {
        patchProps(el, key, oldProps[key], newProps[key])
      }
    }

    for (const key in oldProps) {
      if (!(key in newProps)) {
        patchProps(el, key, oldProps[key], null)
      }
    }

    // 更新children
    patchChildren(n1, n2, el)
  }

  function patchChildren(n1, n2, container) {
    // 判断子节点的类型是否是文本节点
    if (typeof n2.children === 'string') {
      // 旧子节点的类型有三种可能，只有当旧子节点为一组子节点时，才需要逐个卸载
      if (Array.isArray(n1.children)) {
        n1.children.forEach((c) => unmount(c))
      }

      // 将新的文本节点设置给容器
      setElementText(container, n2.children)
    } else if (Array.isArray(n2.children)) {
      // 新子节点是一组子节点

      // 判断旧子节点是否也是一组子节点
      if (Array.isArray(n1.children)) {
        // diff算法
        const oldChildren = n1.children
        const newChildren = n2.children

        // 用来存储寻找过程中的最大索引值
        let lastIndex = 0

        for (let i = 0; i < newChildren.length; i++) {
          const newVNode = newChildren[i]

          for (let j = 0; j < oldChildren.length; j++) {
            const oldVNode = oldChildren[j]

            // 如果找到了具有相同key值的两个节点，说明可以复用，但仍需patch更新
            if (newVNode.key === oldVNode.key) {
              patch(oldVNode, newVNode, container)

              if (j < lastIndex) {
                // 如果当前找到的节点在旧children中的索引值小于最大索引值lastIndex，则需要移动
              } else {
                // 如果当前节点在旧children中的索引不小于最大索引，则更新lastIndex
                lastIndex = j
              }
              break
            }
          }
        }

        // >>

        const oldLen = oldChildren.length
        const newLen = newChildren.length

        // 取两组子节点较短的那一组长度
        const commonLength = Math.min(oldLen, newLen)

        for (let i = 0; i < commonLength; i++) {
          patch(oldChildren[i], newChildren[i], container)
        }

        if (newLen > oldLen) {
          // 说明有新节点需要挂载
          for (let i = commonLength; i < newLen; i++) {
            patch(null, newChildren[i], container)
          }
        } else if (oldLen > newLen) {
          // 说明有旧子节点需要卸载
          for (let i = commonLength; i < oldLen; i++) {
            unmount(oldChildren[i])
          }
        }
      } else {
        // 旧子节点是文本或者无，将容器清空，然后逐个挂载
        setElementText(container, '')
        n2.children.forEach((c) => patch(null, c, container))
      }
    } else {
      // 新子节点不存在
      // 旧子节点是一组子节点，逐个卸载
      if (Array.isArray(n1.children)) {
        n1.children.forEach((c) => unmount(c))
      } else {
        // 旧子节点是文本子节点，清空内容
        setElementText(container, '')
      }
      // 如果也没有旧子节点，那么什么都不需要做
    }
  }

  function render(vnode, container) {
    if (vnode) {
      // 新vnode存在，将其与旧vnode一起传递给patch函数，进行打补丁
      patch(container._vnode, vnode, container)
    } else {
      if (container._vnode) {
        // 旧vnode存在，且新vnode不存在，说明是卸载(unmount)操作
        // 调用unmount卸载vnode
        unmount(container._vnode)
      }
    }

    // 把vnode存储到container._vnode下，即后续渲染中的旧vnode
    container._vnode = vnode
  }

  function hydrate(vnode, container) {
    // ...
  }

  return {
    render,
    hydrate
  }
}
