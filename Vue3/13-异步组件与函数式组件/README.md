# 异步组件与函数式组件

## 异步组件要解决的问题
异步组件可以异步加载

## 异步组件的实现原理
### 封装defineAsyncComponent函数
```html
<template>
  <AsyncComp />
</template>
<script>
export default {
  components: {
    // 使用defineAsyncComponent定义一个异步组件，它接收一个加载器作为参数
    AsyncComp: defineAsyncComponent(()=>import('CompA'))
  }
}
</script>
```
调用defineAsyncComponent实际上返回了一个组件，该组件通过setup返回一个render函数，当实际组建没有加载完成时，该组件是个占位内容，加载完成后替换为真实组件
### 超时与Error组件
可以设置组件加载的超时时间，设置一个定时器，超过指定时间后将err赋值为Error组件

### 延迟与Loading组件
与Error组件类似，通过传入delay和loadingComponent实现在没加载成功异步组件时显示loading组件，delay就是设置一个延迟的delay毫秒的定时器，到时后将loading设置为true，以显示loading组件

### 重试机制
与请求的重试机制类似，在catch中重新返回一个Promise，可在此Promise中选择是抛出错误还是重试

## 函数组件
一个函数式组件就是一个返回虚拟DOM的函数
复用普通组件的mountComponent
判断是否是函数式组件，是则将options的render赋值为函数式组件返回的函数
