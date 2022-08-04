# 组件的实现原理
## 渲染组件
当vnode.type是object时，当作组件渲染
组件需要返回一个render函数
挂载组件时运行render函数，其返回值是一个虚拟DOM，挂载该虚拟DOM
## 组件状态与自更新
在组件中定义data函数，调用时能够返回状态数据
将data放回的对象通过reactive变为响应式数据state
调用render函数时，通过call将state传过去，这样render函数可通过this拿到state
将render函数放进effect中，并在effect中调用render函数，返回虚拟DOM，通过渲染器将虚拟DOM渲染到页面上，当状态值发生变化时，会重新渲染
effect可以设置一个调度器，值发生变化时将副作用函数放入微队列执行

## 组件实例与组件生命周期
组件实例本质上就是一个对象，我们把state，subTree放进组件实例中，再添加一个isMounted属性，默认false
在更新时判断isMounted，ture则挂载，false则更新
更新时，重新调用render函数生成的subTree作为新节点，之前的subTree作为老节点
最后更新实例中的subTree属性
生命周期函数实际上是从option里拿到函数，在合适的时间调用(并绑定上state，使this指向state)

## props与组件的被动更新
先来看下props的用法：
```html
<!--父组件-->
<my-conponent :title="'props'"></my-conponent>
<!--子组件-->
<div>title is {{ title }}</div>
<script>
export default {
  data() {
    return {
      name: 'this is a component'
    }
  },
  props: {
    title: String
  }
}
</script>
```
其对应的虚拟节点：
```js
// 父组件
const vnode = {
  type: MyComponent,
  props: {
    title: 'props'
  }
}
// 子组件
const MyComponent = {
  props: {
    title: String
  },
  render() {
    return {
      type: 'div',
      children: `title is ${this.title}`
    }
  }
}
```
上边的例子有两个props，一个是父组件传递给子组件的props，一个是子组件自身定义的props
我们需要通过这两个props判断哪些是子组件接收的props(父子组件key相同)，哪些是要放到子组件的attrs中的(父组件传递的props子组件没有接收)
父组件在更新时，也会更新子组件，这叫做被动更新，我们需要判断被动更新时子组件是否需要更新
当props数量发生变化，或者props的值发生变化时才需要更新
由于渲染函数需要通过this拿到props和data中的值，所以我们实现一个组件instance的代理，能够同时拿到props和data的值(或修改他们的值)

## setup函数的作用与实现
setup返回值有两种，返回一个函数，将作为该组件的render函数
返回一个对象，该对象将暴露给模板使用
运行setup函数，将props作为第一个参数，attrs/slots/emit作为第二个参数，得到其返回值
如果返回值是函数，将其代替render函数
如果是对象，则添加到组件实例的代理中，使this能够访问到setup的返回值对象

## 组件事件与emit的实现
我们在组件中发射的事件：
```js
const MyComponent = {
  setup(props, { emit }) {
    // 发射change事件，并传递参数
    emit('change', 1, 2)
  }
}
```
当使用该组件时，应该监听该事件：
```html
<my-component @change="handler"></my-conponent>
```
```js
const CompVNode = {
  type: MyComponent,
  props: {
    onChange: handler
  }
}
```
声明一个emit函数，并传入setup的第二个参数中
emit接收两个参数，事件名和事件参数
emit会通过事件名从props中寻找对应的函数并调用
以on开头的props，无论是否显式声明，都应放入props中

## 插槽的工作原理与实现
先展示下插槽的用法：
```html
<template>
  <header>
    <slot name="header" />
  </header>
  <div>
    <slot name="body" />
  </div>
</template>
```
父组件使用MyComponent时，可以使用这些插槽：
```html
<my-component>
  <template #header>
    <h1>标题</h1>
  </template>
  <template #body>
    <section>内容</section>
  </template>
</my-component>
```
父组件会被变成成如下渲染函数：
```js
// 父组件的渲染函数
function render() {
  return {
    type: MyComponent,
    // 组件的children会被编译成一个对象
    children: {
      header() {
        return {type:'h1',children:'我是标题'}
      },
      body() {
        return {type:'section',children:'内容'}
      }
    }
  }
}
```
组件模板中的插槽会被编译成插槽函数，返回具体内容
MyComponent组件会编译成如下渲染函数：
```js
function render() {
  return [
    {
      type: 'header',
      children: [this.$slots.header()]
    },
    {
      type: 'div',
      children: [this.$slots.body()]
    }
  ]
}
```
直接将虚拟节点上的children当作slots，赋值到组件实例上，并传递给setup函数
在组件实例的代理中，当访问`$slots`时，直接返回实例上的slots，这样渲染函数就可以通过`$slots`访问到插槽函数了

## 注册声明周期
在组件初始化时，setup函数执行之前，将组件实例放进一个全局变量中，使用onMounted函数注册的函数都将放进组件实例的mounted数组中，setup函数执行完毕后，将该全局变量设置为空
合适的时候调用实例中mounted数组中的方法
