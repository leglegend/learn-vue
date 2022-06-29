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