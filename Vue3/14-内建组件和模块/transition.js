const Transition = {
  name: 'Transition',
  setup(props, { slots }) {
    return () => {
      // 通过默认插槽获取需要过度的元素
      const innerVNode = slots.default()

      // 在过度元素的VNode上添加transition相应的钩子函数
      innerVNode.transition = {
        beforeEnter(el) {},
        enter(el) {},
        leave(el, performRemove) {}
      }

      // 渲染需要过度的元素
      return innerVNode
    }
  }
}
