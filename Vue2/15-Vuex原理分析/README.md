## Vuex用法
```js
// 引入
Vue.use(Vuex)
new Vue({
  store
})
// 初始化
new Vuex.Store({
  state: {
    count: 0 
  },
  actions: {
    addCount(context, payload) {
      context.commit('addCount', payload)
    }
  },
  mutations: {
    addCount(state, payload) {
      state.count += payload
    }
  },
  getters: {
    getCount: state => {
      return state.count
    },
    getAddCount: state => num => {
      return state.count + num
    }
  }
})
// 使用
{
  computed: {
    ...mapState(['count']),
    ...mapState({
      count: 'count',
      getCount(state) {
        return state.count
      }
    })
  },
  mounted() {
    this.$store.dispatch('addCount', 2)
  }
}
```
## Vue.use(Vuex)都做了什么
Vuex向外暴露了`install`方法，供Vue.use调用。`install`方法主要是将一个`vuexInit`方法混入进Vue的beforeCreate钩子函数中：
```js
function applyMixin(Vue) {
  Vue.mixin({ beforeCreate: vuexInit })
  function vuexInit() {
    const options = this.$options
    if(options.store) {
      // root
      this.$store = options.store
    } else {
      // 非root，从parent中获取，这样所有组件都使用同一个store
      this.$store = options.parent.$store
    }
  }
}
```
## state和getter
Vuex的state和getter是通过Vue的data和computed实现的，在store._vm上实现了一个Vue实例，并将state和getter作为options的data和computed传过去，在store.getters上实现一个代理，能够访问到computed，Store实例上有state的getter方法，可以访问到store._vm._data.$$state。
```js
// store._vm上是一个Vue实例
store._vm = new Vue({
  data: {
    $$state: state
  },
  computed
})
// state的getter
class Store {
  get state() {
    return this._vm._data.$$state
  }
}
// 通过代理把computed放到getters上
forEachValue(wrappedGetters, (fn, key) => {
    // use computed to leverage its lazy-caching mechanism
    computed[key] = () => fn(store)
    Object.defineProperty(store.getters, key, {
      get: () => store._vm[key],
      enumerable: true // for local getters
    })
  })
```

## commit
