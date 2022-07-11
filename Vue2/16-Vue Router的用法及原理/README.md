## Vue Router用法
### 引入方法
```js
import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

const router = new VueRouter({
    mode: 'hash',
    routes: []
})

new Vue({
    el:'#app',
    router
})
```
`this.$router`可以获取到完整的VueRouter实例，`this.$route`可以获取到当前路由。
### 动态路由
```html
<template>
    <router-link to="/about/12"/>
</template>
<script>
    this.$router.push('/about/12')
    this.$router.push({path:'/about/12'})
    this.$router.push({name:'about',params:{id:'12'}})
</script>
```
上面几种跳转，结果是一样的。需要注意的是，path和params一起用，params会被忽略。还可以通过query关键字携带参数：
```html
<template>
    <router-link to="/about?id=123"/>
</template>
<script>
    this.$router.push('/about?id=123')
    this.$router.push({path:'/about',query:{id:'12'}})
    this.$router.push({name:'about',query:{id:'12'}})
</script>
```
### 路由组件传参
```js
routes: [{
    path: '/user/:id'
    component: User,
    props: true
}]
routes: [{
    path: '/user/:id'
    component: User,
    props: route=>route.params
}]
```
上述方法可以将params或者query的值传到props中，增加组件的复用性。
### 导航守卫
全局前置守卫：
```js
router.beforeEach((to,from,next)=>{
  if (to.name !== 'Login' && !isAuthenticated) next({ name: 'Login' })
  else next()
})
```
next可以传入一个对象当作push调用。
全局解析守卫：
```js
router.beforeResolve((to,from,next)=>{
  next()
})
```
和beforeEach用法完全一样，不过beforeResolve是在组件解析完成后才触发的。  
全局后置钩子：
```js
router.afterEach((to,from)=>{
  
})
```
路由独享守卫：
```js
{
    path: '/foo',
    component: Foo,
    beforeEnter: (to, from, next) => {
    // ...
    }
}
```