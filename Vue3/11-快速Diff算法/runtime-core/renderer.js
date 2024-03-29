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

  function patch(n1, n2, container, achor) {
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
        mountElement(n2, container, achor)
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
    insert(el, container, achor)
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
        // 快速Diff算法
        patchKeyedChildren(n1, n2, container)
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

  function patchKeyedChildren(n1, n2, container) {
    const oldChildren = n1.children
    const newChildren = n2.children

    // 处理相同的前置节点，索引j指向新旧两组子节点的开头
    let j = 0
    let oldVNode = oldChildren[j]
    let newVNode = newChildren[j]

    // while循环向后遍历，直到遇到了不同key值的节点
    while (oldVNode.key === newVNode.key) {
      // 更新内容
      patch(oldVNode, newVNode, container)

      // 更新索引值
      j++
      oldVNode = oldChildren[j]
      newVNode = newChildren[j]
    }

    // 更新相同的后置节点
    // 索引oldEnd指向旧一组子节点的最后一个
    let oldEnd = oldChildren.length - 1
    // 索引newEnd指向新一组子节点的最后一个
    let newEnd = newChildren.length - 1

    oldVNode = oldChildren[oldEnd]
    newVNode = newChildren[newEnd]

    // while循环从后向前遍历
    while (oldVNode.key === newVNode.key) {
      // 更新
      patch(oldVNode, newVNode, container)
      // 递减oldEnd和newEnd
      oldEnd--
      newEnd--
      oldVNode = oldChildren[oldEnd]
      newVNode = newChildren[newEnd]
    }

    // 预处理完成，如果满足下列条件，则说明j到newEnd是新增节点
    if (j > oldEnd && j <= newEnd) {
      // 锚点的索引
      const anchorIndex = newEnd + 1
      // 锚点元素
      // anchorIndex大于新一组子节点的长度的话，证明新增节点就在末尾
      const anchor =
        anchorIndex < newChildren.length ? newChildren[anchorIndex].el : null
      // 循环挂载新节点
      while (j <= newEnd) {
        patch(null, newChildren[j++], container, anchor)
      }
    } else if (j > newEnd && j <= oldEnd) {
      // j到oldEnd之间的元素应该被卸载
      while (j <= oldEnd) {
        unmount(oldChildren[j++])
      }
    } else {
      // 构造source数组
      // 新的一组子节点中剩余未处理节点数量
      const count = newEnd - j + 1
      const source = new Array(count)
      source.fill(-1)

      // oldStart 和 newStart 分别为起始索引，即j
      const oldStart = j
      const newStart = j

      // 是否需要移动
      let moved = false
      // 最大索引值
      let pos = 0

      // 构建索引表
      const keyIndex = {}
      for (let i = newStart; i <= newEnd; i++) {
        keyIndex[newChildren[i].key] = i
      }

      // 更新过的节点数量
      let patched = 0

      // 遍历旧的一组子节点
      for (let i = oldStart; i <= oldEnd; i++) {
        const oldVNode = oldChildren[i]

        // 如果更新过的节点数量小于等于需要更新的节点数量，则执行更新
        if (patched <= count) {
          // 通过索引表快速找到新一组子节点中具有相同key值节点的位置
          const k = keyIndex[oldVNode.key]

          if (typeof k !== 'undefined') {
            const newVNode = newChildren[k]
            // 更新
            patch(oldVNode, newVNode, container)

            // 已更新节点数+1
            patched++

            // 填充source
            source[k - newStart] = i

            // 判断节点是否需要移动
            if (k < pos) {
              moved = true
            } else {
              pos = k
            }
          } else {
            // 没找到证明需要卸载对应的旧子节点
            unmount(oldVNode)
          }
        } else {
          // 更新过的节点大于需要更新的节点，卸载多余的
          unmount(oldVNode)
        }
      }

      // 如果需要移动DOM
      if (moved) {
        // 计算最长递增子序列
        const seq = lis(source)

        // s指向最长递增子序列的最后一个元素
        let s = seq.length - 1
        // i指向新的一组子节点的最后一个元素
        let i = count - 1

        // 使i递减
        for (i; i >= 0; i--) {
          if (source[i] === -1) {
            // 索引i对应的节点为新节点，需要挂载
            // 该节点在新children中的真实位置索引
            const pos = i + newStart
            const newVNode = newChildren[pos]

            // 该节点的下一个节点的位置索引
            const nextPos = pos + 1
            // 锚点
            const anchor =
              nextPos < newChildren.length ? newChildren[nextPos].el : null

            patch(null, newVNode, container, anchor)
          } else if (i !== seq[s]) {
            // 如果节点的索引 i 不等于 seq[s] 的值，说明该节点需要移动

            // 该节点在新children中的真实位置索引
            const pos = i + newStart
            const newVNode = newChildren[pos]

            // 该节点的下一个节点的位置索引
            const nextPos = pos + 1
            // 锚点
            const anchor =
              nextPos < newChildren.length ? newChildren[nextPos].el : null
            //移动
            insert(newVNode.el, container, anchor)
          } else {
            // 如果节点的索引 i 等于 seq[s] 的值，该节点不需要移动
            // s指向下一个位置
            s--
          }
        }
      }
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

function lis(nums) {
  const lng = nums.length
  let dp = new Array(lng).fill(0).map((v, i) => [i])
  let max = 1
  let maxIndex = 0

  for (let i = 1; i < lng; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[i] > nums[j]) {
        if (dp[i].length < dp[j].length + 1) {
          dp[i] = new Array(...dp[j], nums[i])
        }
        if (dp[i].length > max) {
          max = dp[i].length
          maxIndex = i
        }
      }
    }
  }

  return dp[maxIndex]
}
