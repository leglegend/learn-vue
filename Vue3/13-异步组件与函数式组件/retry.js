function fetch() {
  let retries = 0
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (retries >= 3) {
        resolve('success')
      } else {
        reject('err')
      }
    }, 1000)
  })
}

function load(onError) {
  const p = fetch()
  return p.catch((err) => {
    // 当错误发生时，返回一个新的promise实例，并调用onError回调
    // 同时retry函数作为onError的回调参数
    return new Promise((resolve, reject) => {
      // retry函数，用来执行重试的函数，执行该函数会重新调用load函数
      const retry = () => resolve(load(onError))
      const fail = () => reject(err)
      onError(retry, fail)
    })
  })
}

load(
  // onError回调
  (retry, fail) => {
    retry()
  }
).then((res) => {
  console.log(res)
})
