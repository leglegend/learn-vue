// defineAsyncComponent函数用于定义一个异步组件，接收一个异步组件加载器作为参数
function defineAsyncComponent(options) {
  // options可以是配置项，也可以是加载器
  if (typeof options === 'function') {
    // 如果options是加载器，将其格式化为配置项格式
    options = {
      loader: options
    }
  }

  const { loader } = options

  // 一个变量，用来存储异步加载的组件
  let InnerComp = null

  // 记录重试次数
  let retries = 0

  // 封装load函数用来加载异步组件
  function load() {
    return (
      loader()
        // 捕获加载器的错误
        .catch((err) => {
          // 如果用户指定了onError回调，则将控制权交给用户
          if (options.onError) {
            // 返回一个新的promise实例
            return new Promise((resolve, reject) => {
              // 重试
              const retry = () => {
                resolve(load())
                retries++
              }

              // 失败
              const fail = () => reject(err)
              // 作为onError会点函数的参数，让用户决定下一步怎么做
              options.onError(retry, fail, retries)
            })
          } else {
            throw error
          }
        })
    )
  }

  // 返回一个包装组件
  return {
    name: 'AsyncComponentWrapper',
    setup() {
      // 异步组件是否加载成功
      const loaded = ref(false)

      // 定义error，当错误发生时，用来存储错误对象
      const error = shallowRef(null)

      // 一个标志，代表是否正在加载
      const loading = ref(false)

      let loadingTimer = null
      if (options.delay) {
        loadingTimer = setTimeout(() => {
          loading.value = true
        }, delay)
      } else {
        loading.value = true
      }

      // 执行加载器函数，返回一个Promise实例
      // 加载成功后，将加载成功的组件赋值给 InnerComp，并将loaded标记为true，代表加载成功
      load()
        .then((c) => {
          InnerComp = c
          loaded.value = true
        })
        // 捕获加载过程中的错误
        .catch((err) => (error.value = err))
        .finally(() => {
          loading.value = false
          clearTimeout(loadingTimer)
        })

      let timer = null
      if (options.timeout) {
        // 如果指定了超时时长，则开启一个定时器
        timer = setTimeout(() => {
          // 超时后创建一个错误对象，并赋值给error
          const err = new Error('timeout')
          error.value = err
        }, options.timeout)
      }

      // 包装组件被卸载时清除定时器
      onUnmounted(() => clearTimeout(timer))

      // 占位内容
      const placeholder = { type: Text, children: '' }

      return () => {
        if (loaded.value) {
          // 如果异步组件加载成功，则渲染该函数
          return { type: InnerComp }
        } else if (error.value && options.errorComponent) {
          // 将错误内容当作参数传给组件
          return { type: options.errorComponent, props: { error: error.value } }
        } else if (loading.value && options.loadingComponent) {
          // 如果异步组件正在加载，并且用户指定了loading组件，则加载loading组件
          return { type: options.loadingComponent }
        } else {
          // 否则渲染一个占位内容
          return placeholder
        }
      }
    }
  }
}

const AsyncComp = defineAsyncComponent({
  loader: () => import('ComA.vue'),
  timeout: 2000,
  errerComponent: MyErrorComp, // 指定出错超时时要渲染的组件
  delay: 200, // 延迟200毫秒展示loading组件
  // loading组件
  loadingComponent: {
    setup() {
      return () => {
        return {
          type: 'h2',
          children: 'Loading...'
        }
      }
    }
  }
})
