## 生命周期相关实例方法
包括`vm.$forceUpdate`，`vm.$destroy`和`vm.$nextTick`。
## forceUpdate
## destroy
## nextTick
nextTick接收一个函数为参数，函数中的内容将在下次DOM更新后执行。Vue中修改数据并不会直接更新DOM，而是把一次事件循环中所有的改变缓存起来，一起执行。`Vue.nextTick`和`vm.$nextTick`调用的是同一个方法。  
nextTick会优先使用microTask，不能用则会使用macroTak，优先级如下：  
Promise > MutationObserver > setImmediate > setTimeout