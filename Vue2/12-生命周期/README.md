## 声明周期
## 初始化阶段
new Vue()到created之间的阶段，该阶段主要在Vue实例上初始化一些属性、事件以及响应式数据。
### 初始化实例属性
初始化实例中`$root`、`$parent`、`$children`、`$refs`、_watcher、_isDestroyed、_isBeingDestroyed等属性。
### 初始化事件
初始化通过`v-on`或`@`注册的事件
## 模板编译阶段
created和beforeMount之间的阶段，主要将模板编译为渲染函数，只有完整版才有这个阶段。
## 挂载阶段
将模板渲染到指定的DOM中，已挂载状态下，Vue仍会支持追踪状态变化，当数据发生变化时，Watcher会通知虚拟DOM重新渲染视图，并触发beforeUpdate函数，并在渲染完成后触发updated函数。
## 卸载阶段
beforeDestroy和destroyed之间的阶段，该阶段会将Vue实例从父组件删除，取消实例上的依赖并移除所有事件监听器。