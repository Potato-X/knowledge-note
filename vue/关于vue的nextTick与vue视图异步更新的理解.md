# vue视图的的更新与nextTick($nextTick)之间的关系
## vue视图是异步更新的
* 原因：介于可能会存在频繁更新数据的情况，处于对性能的考虑，采取对视图展示进行异步的更新（当数据在一段代码内反复修改的时候，我们不再关心中间态，我们对数据在试图上的展示实际上只关心最后的结果），所以异步处理就成了首要考虑的优化方面，当我们在代码里面修改数据时
```vue
<template>
  <span>{{times}}</span>
</template>
<sript>
export default {
  data(){
      return {
        times:0
      }
  },
  mounted(){
      for(let index=0;index<100;index++){
        this.times++
      }
  }
}
</sript>
```
* 如以上这段代码，页面初始化的时候，我们就循环了100次进行对times的修改，如果我们不采取异步更新处理视图的话，那么就意味着我们就要进行100次的视图更新，这在一个有多个响应式数据的项目里面显然是不可取的（因为一般一个项目里面光是响应式变量就多达上百个，跟别说中间数据交互时对响应式变量的赋值处理更新，更是多不胜数，这样会极大的增加我们js运输内存的消耗，影响性能），
* 但是如果我们换成了异步更新，那上面这段代码最后造成的视图更新次数就只有1次，因为在我们给this.times赋值的时候，这个过程实际上是同步的，由于我们视图更新打算用异步的方式处理，所以当我们要进行视图更新的时候，实际上同步的这些代码早就已经跑完了，那就意味着我们的这个times早已经是循环了100次的最后结果了，此时我们异步处理的时候，拿到的就是最后这个100次过后的结果进行数据视图更新就行了
```ecmascript 6
export function queueWatcher (watcher: Watcher) {
  /*获取watcher的id*/
  const id = watcher.id
  /*检验id是否存在，已经存在则直接跳过，不存在则标记哈希表has，用于下次检验*/
  if (has[id] == null) {
    has[id] = true
    if (!flushing) {
      /*如果没有flush掉，直接push到队列中即可*/
      queue.push(watcher)
    } else {
      // if already flushing, splice the watcher based on its id
      // if already past its id, it will be run next immediately.
      let i = queue.length - 1
      while (i >= 0 && queue[i].id > watcher.id) {
        i--
      }
      queue.splice(Math.max(i, index) + 1, 0, watcher)
    }
    // queue the flush
    if (!waiting) {
      waiting = true
      nextTick(flushSchedulerQueue)
    }
  }
}
function flushSchedulerQueue () {
    flushing = true
    let watcher, id

    // Sort queue before flush.
    // This ensures that:
    // 1. Components are updated from parent to child. (because parent is always
    //    created before the child)
    // 2. A component's user watchers are run before its render watcher (because
    //    user watchers are created before the render watcher)
    // 3. If a component is destroyed during a parent component's watcher run,
    //    its watchers can be skipped.
    /*
      给queue排序，这样做可以保证：
      1.组件更新的顺序是从父组件到子组件的顺序，因为父组件总是比子组件先创建。
      2.一个组件的user watchers比render watcher先运行，因为user watchers往往比render watcher更早创建
      3.如果一个组件在父组件watcher运行期间被销毁，它的watcher执行将被跳过。
    */
    queue.sort((a, b) => a.id - b.id)

    // do not cache length because more watchers might be pushed
    // as we run existing watchers
    /*这里不用index = queue.length;index > 0; index--的方式写是因为不要将length进行缓存，因为在执行处理现有watcher对象期间，更多的watcher对象可能会被push进queue*/
    for (index = 0; index < queue.length; index++) {
        watcher = queue[index]
        id = watcher.id
        /*将has的标记删除*/
        has[id] = null
        /*执行watcher*/
        watcher.run()
        // in dev build, check and stop circular updates.
        /*
          在测试环境中，检测watch是否在死循环中
          比如这样一种情况
          watch: {
            test () {
              this.test++;
            }
          }
          持续执行了一百次watch代表可能存在死循环
        */
        if (process.env.NODE_ENV !== 'production' && has[id] != null) {
            circular[id] = (circular[id] || 0) + 1
            if (circular[id] > MAX_UPDATE_COUNT) {
                warn(
                    'You may have an infinite update loop ' + (
                        watcher.user
                            ? `in watcher with expression "${watcher.expression}"`
                            : `in a component render function.`
                    ),
                    watcher.vm
                )
                break
            }
        }
    }

    // keep copies of post queues before resetting state
    /**/
    /*得到队列的拷贝*/
    const activatedQueue = activatedChildren.slice()
    const updatedQueue = queue.slice()

    /*重置调度者的状态*/
    resetSchedulerState()

    // call component updated and activated hooks
    /*使子组件状态都改编成active同时调用activated钩子*/
    callActivatedHooks(activatedQueue)
    /*调用updated钩子*/
    callUpdateHooks(updatedQueue)

    // devtool hook
    /* istanbul ignore if */
    if (devtools && config.devtools) {
        devtools.emit('flush')
    }
}
```
* 总结：虽然我们数据修改同样都进行了相同次数的处理，但是最后的更新视图次数却大大减少，这也是为什么vue采取异步更新视图的原因，主要是架不住它香呀😊

## nextTick（$nextTick）的运行机制
前面讲完了视图的更新机制以及他为什么采取这样的更新行为机制后，这里来讲下nextTick的运行机制,nextTick里面的回调是放进了一个微任务的队列里面进行处理的
当我们调用this.$nextTick(()=>{})的时候，这个nextTick里面的这个回调函数就会被推入到vue源码层里面的一个全局变量callbacks的一个数组里面（专门用于存放nextTick传进来的回调函数）

### nextTick里面的回调函数执行时机
当前事件循环执行的时候，轮到微任务了，就会去这个执行callbacks里面的所有回调函数

### 对vue文档里面(关于在下一个的事件循环“tick”中，Vue 刷新队列并执行实际 (已去重的) 工作)这句话的理解
这段话里面提到了一个tick，其实也就是一个一轮事件循环，前面我们提到过vue视图的更新是一个异步的过程，vue是将每一个响应式数据的watcher都存进了一个queue变量的队列里面，当响应式数据发生改变的时候，就会通过
queueWatcher 的方法去逐一触发每一个wathcer从而达到更新每一个watcher监听的当前响应式数据在视图上展示用到的地方，然而在queueWatcher里面就调用到了nextTick这个方法，这个就和这里的nextTick联系起来了

```ecmascript 6
export const nextTick = (function () {
  /*存放异步执行的回调*/
  const callbacks = []
  /*一个标记位，如果已经有timerFunc被推送到任务队列中去则不需要重复推送*/
  let pending = false
  /*一个函数指针，指向函数将被推送到任务队列中，等到主线程任务执行完时，任务队列中的timerFunc被调用*/
  let timerFunc

  /*下一个tick时的回调*/
  function nextTickHandler () {
    /*一个标记位，标记等待状态（即函数已经被推入任务队列或者主线程，已经在等待当前栈执行完毕去执行），这样就不需要在push多个回调到callbacks时将timerFunc多次推入任务队列或者主线程*/
    pending = false
    /*执行所有callback*/
    const copies = callbacks.slice(0)
    callbacks.length = 0
    for (let i = 0; i < copies.length; i++) {
      copies[i]()
    }
  }

  /*
    这里解释一下，一共有Promise、MutationObserver以及setTimeout三种尝试得到timerFunc的方法
    优先使用Promise，在Promise不存在的情况下使用MutationObserver，这两个方法都会在microtask中执行，会比setTimeout更早执行，所以优先使用。
    如果上述两种方法都不支持的环境则会使用setTimeout，在task尾部推入这个函数，等待调用执行。
    参考：https://www.zhihu.com/question/55364497
  */
  if (typeof Promise !== 'undefined' && isNative(Promise)) {
    /*使用Promise*/
    var p = Promise.resolve()
    var logError = err => { console.error(err) }
    timerFunc = () => {
      p.then(nextTickHandler).catch(logError)
      if (isIOS) setTimeout(noop)
    }
  } else if (typeof MutationObserver !== 'undefined' && (
    isNative(MutationObserver) ||
    // PhantomJS and iOS 7.x
    MutationObserver.toString() === '[object MutationObserverConstructor]'
  )) {
    /*新建一个textNode的DOM对象，用MutationObserver绑定该DOM并指定回调函数，在DOM变化的时候则会触发回调,该回调会进入主线程（比任务队列优先执行），即textNode.data = String(counter)时便会触发回调*/
    var counter = 1
    var observer = new MutationObserver(nextTickHandler)
    var textNode = document.createTextNode(String(counter))
    observer.observe(textNode, {
      characterData: true
    })
    timerFunc = () => {
      counter = (counter + 1) % 2
      textNode.data = String(counter)
    }
  } else {
    // fallback to setTimeout
    /* istanbul ignore next */
    /*使用setTimeout将回调推入任务队列尾部*/
    timerFunc = () => {
      setTimeout(nextTickHandler, 0)
    }
  }

  /*
    推送到队列中下一个tick时执行
    cb 回调函数
    ctx 上下文
  */
  return function queueNextTick (cb?: Function, ctx?: Object) {
    let _resolve
    /*cb存到callbacks中*/
    callbacks.push(() => {
      if (cb) {
        try {
          cb.call(ctx)
        } catch (e) {
          handleError(e, ctx, 'nextTick')
        }
      } else if (_resolve) {
        _resolve(ctx)
      }
    })
    if (!pending) {
      pending = true
      timerFunc()
    }
    if (!cb && typeof Promise !== 'undefined') {
      return new Promise((resolve, reject) => {
        _resolve = resolve
      })
    }
  }
})()
```
在上面这段nextTick的源码里面就能看出前面我们用于更新每个watcher的回调函数flushSchedulerQueue就在这里面被传入到了callbacks这个队列里面，并且将这个callbacks最后真正执行的作用域放在了nextTickHandler这个方法里面，然后vue为了能异步更新，变将这个nextTickHandler方法根据浏览器环境的不同放进了一个异步队列里面（这里只promise.then,MutationObserver,settimeout）；所以当我们页面所有的同步代码执行完了过后才会去执行这里的异步代码，别问问就是js事件循环机制就是这样（先执行宏任务（包括每个script标签里面的代码），然后再执行微任务，每执行一次宏任务就可以理解为开启了新一轮的事件循环）
所以就成功的将页面的视图更新放进了异步队列里面进行处理，并且再页面初始化的时候，flushSchedulerQueue始终是再这个callbacks的第一个，所以这也就解释了为什么我们能在nextTick的回调里面去获取我们视图更新后的dom
其实为了证明这一点可以去修改源码进行测试，可以将nextTickHandler里面的callbacks.length = 0这段代码注释掉，以下是修改后的代码以及测试代码
```vue
//源码修改
function nextTickHandler () {
    /*一个标记位，标记等待状态（即函数已经被推入任务队列或者主线程，已经在等待当前栈执行完毕去执行），这样就不需要在push多个回调到callbacks时将timerFunc多次推入任务队列或者主线程*/
    pending = false
    /*执行所有callback*/
    const copies = callbacks.slice(0)
    //callbacks.length = 0 //把这一行注释掉,因为vue底层对nexttick的回调处理是在执行了一轮的事件循环的异步队列里面的回调函数后，就直接清空了里面的方法，这样的话我们就不能验证我们页面视图每次更新的时候，nextTick的回调会触发的问题了
    for (let i = 0; i < copies.length; i++) {
        copies[i]()
    }
}
//测试代码
<template>
  <button @click="clickHandler">修改</button>
  <span>{{times}}</span>
</template>
<script>
  export default  {
      data(){
          return {
              times:0
          }
      },
    mounted(){
          this.$nextTick(()=>{
              console.log('视图变化了，我更新啦！！！')
          })
    },
    methods:{
      clickHandler(){
          this.times++
      }
    }
  }
</script>
```
在以上测试代码中，由于我们阻止了vue底层的对异步队列里面的回调函数的清空，所以，当我们每次点击按钮触发times变化并展示在页面上面的时候，watcher就会像我们前面所说的在一轮事件循环里面去更新页面，此时vue底层就会调用nextTick，这样一来，我们自己写的这个回调因为在上一轮循环执行后，没有被清空，所以这一次这个回调还是会触发（这个证明了我们业务里面写的nextTick的回调触发是接在视图更新的这个flushSchedulerQueue回调后面的）


## 总结
* vue的视图更新是异步的，并且底层也是自己调用了nextTick去执行异步的视图更新
* 业务里面的nextTick里面的回调实际上就是在vue视图更新的那个回调后面的，所以能在nextTick里面处理更新后的dom相关内容
* vue官方文档里对nextTick的说明————“在下次 DOM 更新循环结束之后执行延迟回调。在修改数据之后立即使用这个方法，获取更新后的 DOM。”；这个”下次dom的更新循环结束之后“实际上就是我们当前这一次业务里面的同步代码执行完后，即将执行的异步操作（包括的对本次响应式数据在视图上的更新）

