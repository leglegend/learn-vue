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