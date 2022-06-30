## 模板编译
模板编译分为三个部分
- 将模板解析为AST （解析器）
- 遍历AST标记静态节点 （优化器）
- 使用AST生成渲染函数 （代码生成器）

ATS：抽象语法树
## 解析器
分为HTML解析器、文本解析器和过滤解析器，负责将模板解析为AST：
```html
<div>
  <p>{{name}}</p>
</div>
```
To
```js
{
    tag: 'div',
    children: [{
        tag: 'p',
        parent: {tag: 'div'...},
        children: [{
            type: 2
            text: '{{name}}'
        }]
    }]
}
```
### 目标
能够写出一个简单的解析器，将下面的HTML代码转换为AST对象：
```html
<div>
  <p>my name is{{name}}</p>
</div>
```
### 实现思路
实现：
```js
parseHTML(template, {
  start() {
    // 解析到标签开始位置时触发
  },
  end() {
    // 解析到标签结束位置时触发
  },
  chars() {
    // 解析到文本时触发
  },
  comment() {
    // 解析到注释时触发
  }
})

function parseHTML(html, options) {
  while (html) {
    let text

    // 判断<在html中的位置
    let textEnd = html.indexOf('<')

    // <在开头 说明是一个标签的开始
    if (textEnd === 0) {
      // 是否是结束标签
      if (endTagMatch) {
        options.end()
        continue
      }

      // 是否是开始标签
      if (startTagMatch) {
        // 触发start
        options.start()
        continue
      }
    }

    // <不在开头
    if (textEnd >= 0) {
      // 判断<是否是text
      text = html.substring(0, textEnd)
    }

    if (textEnd < 0) {
      text = html
    }

    if (text) {
      // text有值 截取html
      advance(text.length)
    }

    // 触发charts
    if (options.chars && text) {
      options.chars(text, index - text.length, index)
    }
  }
}
```
把template转换为字符串，一直循环template，挨个解析标签，直到把整个字符串解析空了。

## 优化器
优化器的作用是在AST中找出静态子树并打上标记(static属性为true)。  
1. 在AST中找出所有静态节点并打上标记
2. 在AST中找出所有静态根节点并打上标记

静态根节点：子节点都是静态节点的节点(staticRoot为true)。  

## 代码生成器
代码生成器的作用是将AST转换成渲染函数中的内容（代码字符串）。渲染函数执行后，可以生成一份VNode，虚拟DOM可通过VNode渲染视图。  

