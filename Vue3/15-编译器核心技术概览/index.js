// 定义状态机的状态
const State = {
  initial: 1, // 初始状态
  tagOpen: 2, // 标签开始状态
  tagName: 3, // 标签名状态
  text: 4, // 文本状态
  tagEnd: 5, // 结束标签状态
  tagEndName: 6 // 结束标签名称状态
}

// 一个辅助函数，用于判断是否是字母
function isAlpha(char) {
  return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z')
}

// 接收模板字符串作为参数，并将模板切割为Token返回
function tokenize(str) {
  // 状态机的当前状态：初始状态
  let currentState = State.initial
  // 用于缓存字符
  let chars = []
  // 生成的Token会存储到tokens缓存中，并作为函数的返回值返回
  const tokens = []
  // 使用while循环开启自动机，只要模板字符串没有被消费尽，自动机会一直运行
  while (str) {
    // 查看第一个字符，注意，这里只是查看，没有消费该字符
    const char = str[0]

    switch (currentState) {
      // 初始状态
      case State.initial:
        // 遇到字符<
        if (char === '<') {
          // 状态机切换到标签开始状态
          currentState = State.tagOpen
          str = str.slice(1)
        } else if (isAlpha(char)) {
          // 遇到字母，切换到文本状态
          currentState = State.text
          // 将当前字母缓存到chars数组
          chars.push(char)
          str = str.slice(1)
        }
        break
      // 标签开始状态
      case State.tagOpen:
        if (isAlpha(char)) {
          // 遇到字母，切换到标签名称状态
          currentState = State.tagName
          // 将当前字符缓存到chars数组
          chars.push(char)
          str = str.slice(1)
        } else if (char === '/') {
          // 遇到/，切换到标签结束状态
          currentState = State.tagEnd
          str = str.slice(1)
        }
        break
      // 标签名称状态
      case State.tagName:
        if (isAlpha(char)) {
          // 遇到字母，当前已处于标签名称状态，只需要缓存到数组
          chars.push(char)
          str = str.slice(1)
        } else if (char === '>') {
          // 遇到>，切换到初始状态
          currentState = State.initial
          // 创建一个标签Token，添加到tokens数组中，此时chars数组就是标签名称
          tokens.push({
            type: 'tag',
            name: chars.join('')
          })
          // chars的内容已被消费，清空它
          chars.length = 0
          str = str.slice(1)
        }
        break
      // 文本状态
      case State.text:
        if (isAlpha(char)) {
          // 遇到字母状态不变，缓存到chars中
          chars.push(char)
          str = str.slice(1)
        } else if (char === '<') {
          // 遇到字符<，切换到标签开始状态
          currentState = State.tagOpen
          // 从文本到标签开始状态，应创建文本Token，此时chart数组就是文本内容
          tokens.push({
            type: 'text',
            content: chars.join('')
          })
          chars.length = 0
          str = str.slice(1)
        }
        break
      // 标签结束状态
      case State.tagEnd:
        if (isAlpha(char)) {
          // 遇到字母，切换到标签名称状态
          currentState = State.tagName
          chars.push(char)
          str = str.slice(1)
        }
        break
      // 结束标签名称状态
      case State.tagEndName:
        if (isAlpha(char)) {
          // 遇到字母状态不变，缓存到chars中
          chars.push(char)
          str = str.slice(1)
        } else if (char === '>') {
          // 遇到>。切换到初始状态
          currentState = State.initial
          // 从结束标签名称装态到初始状态，应保存结束标签名称token
          tokens.push({
            type: 'tagEnd',
            name: chars.join('')
          })
          chars.length = 0
          str = str.slice(1)
        }
        break
    }
  }

  return yokens
}

// parse函数接收模板作为参数
function parse(str) {
  // 首先对模板进行标记，得到tokens
  const tokens = tokenize(str)
  // 创建Root根节点
  const root = {
    type: 'Root',
    children: []
  }
  // 创建elmentStack栈，起初只有Root根节点
  const elementStack = [root]

  // 开启一个while循环扫描tokens，直到所有Token都被扫描完毕为止
  while (tokens.length) {
    // 获取当前栈顶节点作为父节点parent
    const parent = elementStack[elementStack.length - 1]
    // 当前扫描的Token
    const t = tokens[0]
    switch (t.type) {
      // 如果当前Token是开始标签，则创建Element类型的AST节点
      case 'tag':
        const elementNode = {
          type: 'Element',
          tag: t.name,
          children: []
        }
        // 将其添加到父级节点的children中
        parent.children.push(elementNode)
        // 将当前节点压入栈
        elementStack.push(elementNode)
        break
      // 如果当前Token是文本，则创建Text类型的AST节点
      case 'text':
        const textNode = {
          type: 'Text',
          content: t.content
        }
        // 将其添加到父级节点的children中
        parent.children.push(textNode)
        break
      case 'tagEnd':
        // 遇到结束标签，将栈顶弹出
        elementStack.pop()
        break
    }
    // 消费已经扫描过的token
    tokens.unshift()
  }

  return root
}

function transform(ast) {
  const context = {
    // 增加currentNode，用来存储当前正在转换的节点
    currentNode: null,
    // 增加childIndex，用来存储当前节点再父节点的children中的位置索引
    childIndex: 0,
    // 增加parent，用来存储当前转换节点的父节点
    parent: null,
    // 用于替换节点的函数，接收新节点作为参数
    replaceNode(node) {
      // 为了替换节点，我们需要修改AST
      // 找到当前节点再父节点的children中的位置:context.childIndex
      // 使用新节点替换
      context.parent.children[context.childIndex] = node
      // 由于当前节点已经被新节点替换掉了，因此我们需要将currentNode更新为新节点
      context.currentNode = node
    },
    // 用于删除当前节点
    removeNode() {
      if (context.parent) {
        // 调用数组的splice方法，根据当前节点的索引删除当前节点
        context.parent.children.splice(context.childIndex, 1)
        // 将context.currentNode置空
        context.currentNode = null
      }
    },
    nodeTransforms: []
  }

  traverseNode(ast, context)
  console.log(dump(ast))
}

function traverseNode(ast, context) {
  // 当前系欸但那，ast本身就是Root节点
  const currentNode = ast

  // 退出阶段的回调函数数组
  const exitFns = []

  // context.nodeTransforms是一个数组，其中每一个元素都是一个函数
  const transforms = context.nodeTransforms
  for (let i = 0; i < transforms.length; i++) {
    // 将当前节点currentNode和context都传递给nodeTransforms中注册的回调函数
    // 转换函数可以返回另外一个函数，该函数作为退出阶段的回调函数
    const onExit = transforms[i](currentNode, context)

    if (onExit) {
      exitFns.push(onExit)
    }
    // 由于任何转换函数都可能移除当前节点，因此每个转换函数执行完毕后
    // 都应该检查当前节点是否已被移除
    if (!context.currentNode) return
  }

  // 如果有子节点，则递归调用traverseNode函数进行遍历
  const children = currentNode.children
  if (children) {
    for (let i = 0; i < children.length; i++) {
      // 递归调用traverseNode前，将当前节点设置为父节点
      context.parent = context.currentNode
      // 设置位置索引
      context.childIndex = i

      traverseNode(children[i], context)
    }
  }

  // 在节点处理的最后阶段执行缓存到exitFns中的回调函数，需要反序执行
  let i = exitFns.length
  while (i--) {
    exitFns[i]()
  }
}

// 打印当前节点的信息
function dump(node, indent = 0) {
  // 节点的类型
  const type = node.type
  // 节点的描述，如果是根节点，则没有描述
  // 如果是Element节点，则使用node.tag作为节点的描述
  // 如果是Text类型的节点，则使用node.content作为节点描述
  const desc =
    node.type === 'Root'
      ? ''
      : node.type === 'Element'
      ? node.tag
      : node.content

  // 打印节点类型和描述信息
  console.log(`${'-'.repeat(indent)}${type}:${desc}`)

  // 递归打印子节点
  if (node.children) {
    node.children.forEach((n) => dump(n, indent + 2))
  }
}
