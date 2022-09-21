function compile(template) {
  // 模板AST
  const ast = parse(template)

  // 将模板AST转换为JS AST
  transform(ast)

  // 代码生成
  const code = generate(ast.jsNode)

  return code
}

function generate(node) {
  const context = {
    // 存储最终生成得到渲染函数代码
    code: '',
    // 在生成代码时，通过调用push函数完成代码的拼接
    push(code) {
      context.code += code
    },
    // 当前缩进的级别，初始为0，即没有缩进
    currentIndent: 0,
    // 该函数用来换行，即在代码字符串的后面追加\n字符
    // 另外，换行时应该保留缩进，所以我们海牙追加currentIndent*2个空格字符
    newline() {
      context.code += '\n' + `  `.repeat(context.currentIndent)
    },
    // 用来缩进，即让currentIndent自增后，调用换行函数
    indent() {
      context.currentIndent++
      context.newline()
    },
    // 取消缩进，即让currentIndent自减后，调用换行函数
    deIndent() {
      context.currentIndent--
      context.newline()
    }
  }

  // 调用genNode函数完成代码生成工作
  genNode(node, context)

  return context.code
}

function genNode(node, context) {
  switch (node.type) {
    case 'FunctionDecl':
      genFunctionDecl(node, context)
      break
    case 'ReturnStatement':
      genReturnStatement(node, context)
      break
    case 'StringLiteral':
      genStringLiteral(node, context)
      break
    case 'ArrayExpression':
      genArrayExpression(node, context)
      break
  }
}

function genFunctionDecl(node, context) {
  // 从context对象中取出工具函数
  const { push, indent, deIndent } = context
  // node.id是一个标识符，用来描述函数的名称，即node.id.name
  push(`function ${node.id.name}`)
  push('(')
  // 调用genNodeList为函数得到参数生成代码
  genNodeList(node.params, context)
  push(')')
  push('{')
  // 缩进
  indent()
  // 为函数体生成代码，这里递归地调用了genNode函数
  node.body.forEach((n) => genNode(n, context))
  // 取消缩进
  deIndent()
  push('}')
}
