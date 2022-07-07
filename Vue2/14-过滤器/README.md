## 初始化状态
初始化props、methods、data、computed
### 初始化props
可以通过数组接收prop，Vue会把数组格式的props转换为对象格式。也就是说，无论我们以何种方式接收props，最后都会转化为一下格式：
```js
props:['name','age']
props: {
    name:String,
    age:Number
}
-->
props: {
    name: {
        type:String
    },
    age: {
        type:Number
    }
}
```
## 初始化methods
循环methods中的对象，并将每个属性挂载到vm上。