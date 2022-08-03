import { effect, ref } from './reactivity/index.js'
import { renderer } from './runtime-dom/index.js'

const MyComponent = {
  name: 'MyComponent',
  // 用data函数来定义组件的状态
  data() {
    return {
      foo: 'hello world'
    }
  },
  render() {
    return {
      type: 'div',
      children: `foo的值是${this.foo}`
    }
  }
}

const CompVnode = {
  type: MyComponent
}

renderer.render(CompVnode, document.querySelector('#app'))
