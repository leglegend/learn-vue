## 本节内容
Vue通过`Object.defineProperty()`绑定到数据的每一项上，从而监听数据的变化，并在捕获到变化时更新视图。
## 目标
通过`Object.defineProperty()`完成对data的数据绑定，在修改data的内容后给出响应：
```js
let app = new Vue({
  el: '#app',
  data: {
    a: '1',
    b: '2'
  },
  render(){
    console.log("render");
  }
})
```