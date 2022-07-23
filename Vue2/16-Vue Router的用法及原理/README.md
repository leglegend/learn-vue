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


## 原理分析
### hash的本质
```html
<a href="/#/home">Home</a>
<a href="/#/about">About</a>
<div id="view"></div>
<script>
  let view = document.querySelector('#view')

  function cb() {
    let hash = location.hash || '/#/home'
    view.innerText = hash
  }
  window.addEventListener('hashchange', cb)
  window.addEventListener('load', cb)
</script>
```
在浏览器中，`#`后面的内容变化不会重新刷新界面，并且可以通过`hashchange`事件监听到`#`后面内容的变化，因此可以通过监听hash的变化，将不同的内容渲染到view中，这就是`ronter-link`和`router-view`的本质。  
### history的简单实现
```html
<a href="/home">Home</a>
<a href="/about">About</a>
<div id="view"></div>
<script>
  let view = document.querySelector('#view')

  function push(path = '/home') {
    window.history.pushState(null, '', path)
  }

  function update() {
    view.innerHTML = location.pathname
  }

  window.addEventListener('popstate', () => {
    console.log('popstate')
    update()
  })

  window.addEventListener('load', (e) => {
    let links = document.querySelectorAll('a[href]')
    links.forEach((el) =>
      el.addEventListener('click', (e) => {
        // 阻止a标签的默认行为
        e.preventDefault()
        push(el.getAttribute('href'))
      })
    )
  })
</script>
```
利用`window.history.pushState`不会实际跳转，只会更改url的特性，通过点击事件监听到url的变化，阻止事件并进行view的显示操作。
### Vue.use(VueRouter)
VueRouter向外暴露了install方法，供Vue.use使用。install方法主要做了以下几件事：
1. 通过混入在实例中注册VueRouter节点
在install函数中，通过Vue.mixin传入beforeCreate生命周期，并在beforeCreate中将初始化Vue时传入的router实例赋值给Vue实例的_router属性，非根实例可通过_rootRouter获取到根实例，进而获取到_router属性。
2. 在Vue的原型对象上添加代理属性`$router`和`$route`
getter中直接返回this._rootRouter中的_router和_route属性。
3. 注册RouterView和RouterLink组件
### new VueRouter

1