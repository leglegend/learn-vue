function render() {
  return h('div', [h('p', 'vue'), h('p', 'template')])
}

const FunctionDeclNode = {
  // 代表该节点是函数声明
  type: 'FunctionDecl',
  // 函数的名称是一个标识符，标识符本身也是一个节点
  id: {
    type: 'Identifier',
    name: 'render' // name用来存储标识符的名称，在这里它就是渲染函数的名称render
  },
  params: [], // 参数，目前渲染函数还不需要参数
  // 渲染函数的函数体只有一个语句，即return语句
  body: [
    {
      type: 'ReturnStatement',
      return: {
        // 代表该节点是函数调用
        type: 'CallExpression',
        // 被调用函数的名称，它是一个标识符
        callee: {
          type: 'Identifier',
          name: 'h'
        },
        // 参数
        arguments: [
          {
            type: 'StringLiteral',
            value: 'div'
          },
          {
            type: 'ArrayExpression',
            elements: []
          }
        ]
      }
    }
  ]
}

const CallExp = {
  // 代表该节点是函数调用
  type: 'CallExpression',
  // 被调用函数的名称，它是一个标识符
  callee: {
    type: 'Identifier',
    name: 'h'
  },
  // 参数
  arguments: []
}

const Str = {
  type: 'StringLiteral',
  value: 'div'
}

const Arr = {
  type: 'ArrayExpression',
  elements: []
}

// 用来创建StringLiteral节点
function createStringLiteral(value) {
  return {
    type: 'StringLiteral',
    value
  }
}

// 用于创建Identifier节点
function createIdentfier(name) {
  return {
    type: 'Identifier',
    name
  }
}

// 用来创建ArrayExpression节点
function createArrayExpression(elements) {
  return {
    type: 'ArrayExpression',
    elements
  }
}

// 用来创建CallExpression节点
function createCallExpression(callee, arguments) {
  return {
    type: 'CallExpression',
    callee: createIdentfier(callee),
    arguments
  }
}

// 转换文本节点
function transformText(node) {
  // 如果不是文本节点，直接返回
  if (node.type !== 'Text') {
    return
  }

  // 文本节点对应的 JS AST节点其实就是一个字符串字面量
  // 因此只需要使用node.content创建一个StringLiteral类型节点即可
  // 最后将文本节点对应的JS AST节点天机道node.jsNode属性下
  node.jsNode = createStringLiteral(node.content)
}

// 转换标签节点
function transformElements(node) {
  // 将转换代码编写在推出阶段的回调函数中
  // 这样就可以保证该标签的子节点全部被处理完毕
  return () => {
    // 如果被转换的节点不是元素节点，则什么都不做
    if (node.type !== 'Element') {
      return
    }

    // 1.创建h函数调用语句，h函数调用的第一个参数是标签名称，因此我们以node.tag来创建一个字符串字面量节点作为第一个参数
    const callExp = createCallExpression('h', [createStringLiteral(node.tag)])

    // 2.处理h函数调用的参数
    node.children.length === 1
      ? // 如果当前标签节点只有一个子节点，则直接使用子节点的jsNode作为参数
        callExp.arguments.push(node.children[0].jsNode)
      : // 如果当前标签节点有多个子节点，则创建一个ArrayExpreession节点作为参数
        callExp.arguments.push(
          // 数组的每个元素都是子节点的jsNode
          createArrayExpression(node.children.map((c) => c.jsNode))
        )
    // 3. 将当前标签节点对应的JS AST添加到jsNode属性下
    node.jsNode = callExp
  }
}

// 转换Root根节点
function transformRoot(node) {
  return () => {
    if (node.type !== 'Root') {
      return
    }

    // node是根节点，根节点的第一个子节点就是模板的根节点，暂不考虑多模板的情况
    const vnodeJSAST = node.children[0].jsNode
    // 创建render函数的声明语句节点，将vnodeJSAST作为render函数体的额返回语句
    node.jsNode = {
      type: 'FunctionDecl',
      id: { type: 'Identiffier', name: 'render' },
      params: [],
      body: [
        {
          type: 'ReturnStatement',
          return: vnodeJSAST
        }
      ]
    }
  }
}
