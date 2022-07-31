# 挂载与更新

HTML Attributes 和 DOM Properties

el.getAttribute('value') 获取的是初始值
el.value获取的当前值
el.defaultValue也能获取到初始值

HTML Attributes的作用是设置与之定影的DOM Properties的初始值。

props处理

class处理：
```html
<!-- class是字符串 -->
<p class="foo bar"></p>
<!-- class是一个对象 -->
<p :class="cls"></p>
<!-- class是一个数组 -->
<p :class="arr"></p>
```
```js
// class是字符串
const vnode = {
  type: 'p',
  props: {
    class: 'foo bar' 
  }
}
// class是一个对象
const cls = {
  foo: true,
  bar: false
}
const vnode = {
  type: 'p',
  props: {
    class: { foo: true, bar: false }
  }
}
// class是一个数组
const arr = [
  'foo bar',
  {
    bar: true
  }
]
const vnode = {
  type: 'p',
  props: {
    class: [
      'foo bar',
      { baz: true }
    ]
  }
}
```
normalizeClass，将class转换为统一格式

## 卸载
应该正确调用unmounted，beforeUnmounted函数
自定义指令钩子函数正确执行
移除DOM元素上的绑定事件

```js
// 初次挂载
renderer.render(vnode, document.querySelector('#app'))
// 再次挂载新vnode，将触发更新
renderer.render(newVnode, document.querySelector('#app'))
// 新node为null，卸载之前渲染的内容
renderer.render(null, document.querySelector('#app'))
```

## 区分vnode类型
更新时，新旧vnode类型不同，需要卸载旧vnode再挂载新vnode

## 事件的处理
将事件作为函数添加到props中
渲染到页面上时，将函数放进一个伪造函数中，更新时只更新伪造函数就行，而不用取消监听再重新监听
存在一个元素绑定多个事件的情况，需要多个伪造函数
同一个事件还能绑定多个处理函数

## 事件冒泡与更新时机问题
数据更新后渲染器重新渲染界面，触发更新的操作冒泡可能导致本不该触发的事件被触发
解决方法：屏蔽所有绑定时间晚于事件触发时间的事件处理函数的执行

## 更新子节点

