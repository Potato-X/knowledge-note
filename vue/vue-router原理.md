# Vue-Router原理

## 简介
vue-router实际上就是vue在做单页面项目时，对页面url的跳转或变更进行的一次拦截操作，在这个操作里面，vue-router实际上会把我们路由配置列表里面的那些路由跟跳转的目标路由进行匹配，然后将匹配到的路由对应的组件进行渲染展示到页面上，从而使得我们在页面上看起来好像就是我们的页面随着url的跳转而变化（对比真正的url路由跳转是通过location.href='htttp://xxx.com/xxx'这种方式是不一样的），vue-router对url跳转的处理实际上只是一个视觉上的假象（当然在处理页面跳转的拦截操作里面，vue-router将目标页面的url通过history.pushstate原生js方法将当前的路由记录放到了history路由记录栈里面）

## vue-router使用步骤的原理具体解析

### vue-router插件的注入
```
import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)
```
在调用Vue.use(VueRouter)的时候，就会去执行VueRouter插件里面的install方法：
```
import View from './components/view' //router-view组件
import Link from './components/link' //router-link组件

export let _Vue

export function install (Vue) {
  if (install.installed && _Vue === Vue) return
  install.installed = true

  _Vue = Vue

  const isDef = v => v !== undefined

  const registerInstance = (vm, callVal) => {
    let i = vm.$options._parentVnode
    if (isDef(i) && isDef(i = i.data) && isDef(i = i.registerRouteInstance)) {
      i(vm, callVal)
    }
  }

  Vue.mixin({
    beforeCreate () { //将beforeCreate混入到全局的Vue里面
      if (isDef(this.$options.router)) {
        this._routerRoot = this
        this._router = this.$options.router
        this._router.init(this) //调用 VueRouter实例的init方法
        Vue.util.defineReactive(this, '_route', this._router.history.current) //这一步是重点：将_route设置为响应式属性，这个回在后续_route变化的时候，去更新页面展示
      } else {
        this._routerRoot = (this.$parent && this.$parent._routerRoot) || this
      }
      registerInstance(this, this)
    },
    destroyed () {
      registerInstance(this)
    }
  })

  Object.defineProperty(Vue.prototype, '$router', { //将router实例代理到组件this的$router上，，便于业务里面调用路由api
    get () { return this._routerRoot._router }
  })

  Object.defineProperty(Vue.prototype, '$route', {//将route实例代理到组件this的$route上，便于业务里面获取当前路由信息
    get () { return this._routerRoot._route }
  })

  Vue.component('RouterView', View) //全局注册RouterView
  Vue.component('RouterLink', Link) //全局注册RouterLink

  const strats = Vue.config.optionMergeStrategies
  // use the same hook merging strategy for route hooks
  strats.beforeRouteEnter = strats.beforeRouteLeave = strats.beforeRouteUpdate = strats.created
}
```

### new VueRouter({...})
 
在注入vue-router后，就开始执行new VueRouter({...})，VueRouter类的代码如下：
```
constructor (options: RouterOptions = {}) {
    ...
    this.matcher = createMatcher(options.routes || [], this)

    let mode = options.mode || 'hash'
    this.fallback =
      mode === 'history' && !supportsPushState && options.fallback !== false
    if (this.fallback) {
      mode = 'hash'
    }
    if (!inBrowser) {
      mode = 'abstract'
    }
    this.mode = mode

    switch (mode) { //根据传入的mode不同执行不同的路由模式处理逻辑
      case 'history':
        this.history = new HTML5History(this, options.base) //history模式
        break
      case 'hash':
        this.history = new HashHistory(this, options.base, this.fallback) //hash模式
        break
      case 'abstract':
        this.history = new AbstractHistory(this, options.base)
        break
      default:
        if (process.env.NODE_ENV !== 'production') {
          assert(false, `invalid mode: ${mode}`)
        }
    }
  }
```
在这个构造函数里面有两个执行关键点：
* 创建一个matcher，至于这个createMatcher做了什么操作后面说
* 根据传入的mode不同，调用不同的路由模式处理逻辑

#### 1.createMatcher

* 简介：createMatcher作用创建了matcher实例（废话😀！！），createMatcher的作用是将我们上述传入的routes列表平铺，将存在有children的路由也平铺在一个数组里面，平铺的作用是为了方便后续查找当前路由对应的组件用于页面渲染,顺便创建一个实例用于后续matcher的相关API的调用

createMatcher内部最终在createRouteMap方法里实现了路由列表的平铺
* 代码：
```
export function createRouteMap (
  routes: Array<RouteConfig>,
  oldPathList?: Array<string>,
  oldPathMap?: Dictionary<RouteRecord>,
  oldNameMap?: Dictionary<RouteRecord>,
  parentRoute?: RouteRecord
): {
  pathList: Array<string>,
  pathMap: Dictionary<RouteRecord>,
  nameMap: Dictionary<RouteRecord>
} {
  // the path list is used to control path matching priority
  const pathList: Array<string> = oldPathList || []
  // $flow-disable-line
  const pathMap: Dictionary<RouteRecord> = oldPathMap || Object.create(null)
  // $flow-disable-line
  const nameMap: Dictionary<RouteRecord> = oldNameMap || Object.create(null)

  routes.forEach(route => {
    addRouteRecord(pathList, pathMap, nameMap, route, parentRoute) //循环每一个路由配置，将每一个路由平铺存放在pathList，将pathMap存放路由键值对（键:路由地址path，值:路由地址对应的整个路由配置信息）
  })

  // ensure wildcard routes are always at the end
  for (let i = 0, l = pathList.length; i < l; i++) {
    if (pathList[i] === '*') {
      pathList.push(pathList.splice(i, 1)[0])
      l--
      i--
    }
  }

  if (process.env.NODE_ENV === 'development') {
    // warn if routes do not include leading slashes
    const found = pathList
    // check for missing leading slash
      .filter(path => path && path.charAt(0) !== '*' && path.charAt(0) !== '/')

    if (found.length > 0) {
      const pathNames = found.map(path => `- ${path}`).join('\n')
      warn(false, `Non-nested routes must include a leading slash character. Fix the following routes: \n${pathNames}`)
    }
  }

  return {
    pathList,
    pathMap,
    nameMap
  }
}
```

#### 2.HashHistory
简介：根据mode传入的为'hash'，从而选择使用HashHistory来创建history实例进行后续的路由监听处理，只不过比HTML5History多做了一部操作就是确保url一定会有hash部分（#），因为hash类型的url格式是http://xxxx.com/#/xxx

* setupListeners内部的核心逻辑：
```
const eventType = supportsPushState ? 'popstate' : 'hashchange' //当前浏览器是支持history接口以及pushState为一个函数的时候，路由监听事件采用'popstate'类型否则采用'hashchange'，
    window.addEventListener(
      eventType,
      handleRoutingEvent
    )
    this.listeners.push(() => {
      window.removeEventListener(eventType, handleRoutingEvent)
    })
```


#### HTML5History
简介：根据mode传入的为'history'，从而选择使用HTML5History来创建history实例进行后续的路由监听处理

* setupListeners内部的核心逻辑：
```
const handleRoutingEvent = () => { //当路由发生变化的时候，执行回调
      const current = this.current

      // Avoiding first `popstate` event dispatched in some browsers but first
      // history route not updated since async guard at the same time.
      const location = getLocation(this.base)
      if (this.current === START && location === this._startLocation) {
        return
      }

      this.transitionTo(location, route => { //路由变化，重新执行渲染页面
        if (supportsScroll) {
          handleScroll(router, route, current, true)
        }
      })
    }

window.addEventListener('popstate', handleRoutingEvent) //history模式的时候直接采用popstate进行监听
    this.listeners.push(() => {
      window.removeEventListener('popstate', handleRoutingEvent)
    })
```

### router.init()

在注入了router后，并且创建了router实例后，此时页面就开始初始化，初始化的时候，就会执行全局混入的mixin里面的beforeCreate
* init关键代码：
```
...
const history = this.history

    if (history instanceof HTML5History || history instanceof HashHistory) {
      const handleInitialScroll = routeOrError => {
        const from = history.current
        const expectScroll = this.options.scrollBehavior
        const supportsScroll = supportsPushState && expectScroll

        if (supportsScroll && 'fullPath' in routeOrError) {
          handleScroll(this, routeOrError, from, false)
        }
      }
      //history.setupListeners这个方法目的是为了添加路由的变化的监听事件，根据传入的mode不同，会有不同的监听事件类型判断处理，setupListeners在上诉的两种history里面均有实现逻辑
      const setupListeners = routeOrError => { //history.transitionTo的回调
        history.setupListeners() //在history.transitionTo里面调用回调的时候，会执行该方法history.setupListeners
        handleInitialScroll(routeOrError)
      }
      

      history.transitionTo( //初始化获取当前路由的地址，然后匹配地址获取对应的渲染组件进行页面渲染
        history.getCurrentLocation(),
        setupListeners,
        setupListeners
      )
    }

    history.listen(route => { //将当前的路由传递给app._route，通过给app也就是vue的组件实例this修改_route属性值，从而达到触发更新路由页面渲染的目的，因为在前面注入router的时候，已经将_route设置成立响应式属性
      this.apps.forEach(app => {
        app._route = route
      })
    })
```

### history基类
在前面两种模式里面最后用于更新页面视图的都是调用了transitionTo这个方法
```
function transitionTo(location,onComplete,onAbort){
    ...
    let route = this.router.match(location, this.current) //先从当前路由路径里面匹配出对应的路由配置
     this.confirmTransition(route,
      () => {
        this.updateRoute(route) //更新路由，改方法里面会去执行之前history.listen传入的回调方法，通过执行修改app._route这个响应式属性的值，从而触发页面视图的更新 //这个也是路由变化后更新视图的核心逻辑
        onComplete && onComplete(route)
        this.ensureURL()
        this.router.afterHooks.forEach(hook => {
          hook && hook(route, prev)
        })
        ...
      },) //在这个方法里面去告知组件进行更新，
}
 listen (cb: Function) { //前面调用的history.listen就是这里的实例方法
    this.cb = cb //将传入的回调给到history这个实例对象里面存起来以便在后续的updateRoute里面调用
  }
updateRoute (route: Route) {
    this.current = route
    this.cb && this.cb(route)
}
```

### router-view

* 简介：当确定路由匹配的组件后，该router-view组件就负责把匹配的组件进行渲染出来
* 触发时机：前面提到路由里面有个transitionTo这个方法会执行，最终会执行到app._route=route，从而触发响应式数据的改变来通知页面更新

* 组件源码

render部分
```
render (_, { props, children, parent, data }) {
  data.routerView = true //把所有通过view-router渲染出来的组件都添加一个routerView标识，方便后续查找路由渲染组件
  ...
  while (parent && parent._routerRoot !== parent) { //循环当前路由，不断从当前路由去向上查找父级组件，直到找到当前路由所在的根组件
    const vnodeData = parent.$vnode ? parent.$vnode.data : {}
    if (vnodeData.routerView) { // 在循环的过程中，如果当前父组件被routerView标识过，则添加层级计数
      depth++
    }
    if (vnodeData.keepAlive && parent._directInactive && parent._inactive) {
      inactive = true
    }
    parent = parent.$parent
  }
  ...
  const matched = route.matched[depth] //循环完路由后获得最终当前routerView组件在当前路由所在的层级后，从route去根据当前层级去取对应的match
  const component = matched && matched.components[name] //从该匹配到的matched对象里面获取对应的路由渲染组件
  ...
  return h(component, data, children) //然后将该组件渲染出来
}
```