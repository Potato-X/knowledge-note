# 前言
1.本篇分析的vue2的源码
2.建议结合断点运行调试学习源码，这样在读源码的时候，大部分时候能知道程序代码走向，可以跟着程序的思路去走，这样学习源码的思路要清晰点
# vue入口
读vue源码肯定是从入口看的，vue的入口是从new vue开始的即如下代码开始执行
```
  function Vue(options) {
      if (!(this instanceof Vue)) {
          warn$2('Vue is a constructor and should be called with the `new` keyword');
      }
      this._init(options);
  }
```
在this._init(options)这里正式进入执行vue底层源码

在这个方法里面值得注意的有两个小点就是
1.
```
vm.$options = mergeOptions(resolveConstructorOptions(vm.constructor), options || {}, vm);
```
这段代码，这里其实就是将我们new vue时，写在构造函数里面的传参options的信息全部合并道理vue的实例vm上面的$options上，因为后面操作vue的opions属性全是在$options上面操作的，所有这里需要注意下
2.
```
initProxy(vm);
```
这段代码是将vue的实例vm重新有代理到了vm._renderproxy上面,这里写这个的原因是因为后续会用到这个_renderproxy属性，在更新视图的时候，所以希望在到时候更新读到那里的源码时，看到有个vm._renderproxy作为参数传了下去，不至于懵逼不清楚这是个啥东西

然后说回这个_init方法，重点的来了，需要分析的就是
```
Vue.prototype._init = function (options){
...
    initLifecycle(vm);
    initEvents(vm);
    initRender(vm);
    callHook$1(vm, 'beforeCreate', undefined, false /* setContext */);
    initInjections(vm); // resolve injections before data/props
    initState(vm);
    initProvide(vm); // resolve provide after data/props
    callHook$1(vm, 'created');
    ...
    if (vm.$options.el) {
        vm.$mount(vm.$options.el);
    }

}
```
罗列出来的这几个函数：initLifecycle，initEvents，initRender，initState，vm.$mount(vm.$options.el)；
我会在后面逐一解释每个函数做了什么，这里面有些函数可能就只是个初始化定义的功能，我会一笔带过；here we go！

## initLifecycle
```
function initLifecycle(vm) {
      var options = vm.$options;
      // locate first non-abstract parent
      var parent = options.parent;
      if (parent && !options.abstract) {
          while (parent.$options.abstract && parent.$parent) {
              parent = parent.$parent;
          }
          parent.$children.push(vm);
      }
      vm.$parent = parent;
      vm.$root = parent ? parent.$root : vm;
      vm.$children = [];
      vm.$refs = {};
      vm._provided = parent ? parent._provided : Object.create(null);
      vm._watcher = null;
      vm._inactive = null;
      vm._directInactive = false;
      vm._isMounted = false;
      vm._isDestroyed = false;
      vm._isBeingDestroyed = false;
  }
```
由于这个函数比较少，这里就直接贴出来了，这个函数其实就是做一个前期vue框架启动时的一个实例上的属性定义以及初始化的功能，没啥聊的
## initEvents
```
  function initEvents(vm) {
      vm._events = Object.create(null);
      vm._hasHookEvent = false;
      // init parent attached events
      var listeners = vm.$options._parentListeners;
      if (listeners) {
          updateComponentListeners(vm, listeners);
      }
  }
  ```
  这个函数更多的是初始化更新组件上面的绑定的事件

## initRender
1.这个函数主要是将渲染函数挂在vm的$createElement这个属性上，这个渲染函数会返回一个虚拟节点，后面统称vnode
2.对组件上面的属性$attrs和$listeners做出响应式监听

## initState
这个函数完成的就是vue响应式数据驱动的核心代码了，管理数据状态，负责数据更新
```
  function initState(vm) {
      var opts = vm.$options;
      if (opts.props)
          initProps$1(vm, opts.props);
      if (opts.methods)
          initMethods(vm, opts.methods);
      if (opts.data) {
          initData(vm);
      }
      else {
          var ob = observe((vm._data = {}));
          ob && ob.vmCount++;
      }
      if (opts.computed)
          initComputed$1(vm, opts.computed);
      if (opts.watch && opts.watch !== nativeWatch) {
          initWatch(vm, opts.watch);
      }
  }
```
这个函数主要就做5件事情，初始化props，methods，data，computed，watch

### 初始化props initProps
```
function initProps$1(vm, propsOptions){
    var _loop_1 = function (key) {
        ...
          var value = validateProp(key, propsOptions, propsData, vm);
          {
              defineReactive(props, key, value, function () {
                  if (!isRoot && !isUpdatingChildComponent) {
                      warn$2("Avoid mutating a prop directly since the value will be " +
                          "overwritten whenever the parent component re-renders. " +
                          "Instead, use a data or computed property based on the prop's " +
                          "value. Prop being mutated: \"".concat(key, "\""), vm);
                  }
              });
          }
          if (!(key in vm)) {
              proxy(vm, "_props", key);
          }
    };
    for (var key in propsOptions) {
        _loop_1(key);
    }
}
```
在initprops这个方法里面最主要的就是这个_loop_1方法
从上述代码得知，我们是逐一循环props里面的属性，然后将每一个prop传给了_loop_1进行处理
在这个函数里面做了3件事情
1.通过validateProp函数来校验我们传进来的prop（校验我们实际再传prop数据的时候，数据类型是否与我们定义时prop指定的类型是否一致或者属于我们定义类型时的一种），其次再更具prop是否含有validator这个属性来进行执行我们定义的validator函数
2.将props里面的定义的prop都添加响应式
3.将props上面的prop代理到vm上面，通过vm直接访问prop
这里主要讲下第2步
```
defineReactive(props, key, value, function () {
    if (!isRoot && !isUpdatingChildComponent) {
        warn$2("Avoid mutating a prop directly since the value will be " +
        "overwritten whenever the parent component re-renders. " +
        "Instead, use a data or computed property based on the prop's " +
        "value. Prop being mutated: \"".concat(key, "\""), vm);
    }
});
```
通过defineReactive这个方法实现对一个对象的响应式操作，在defineReactive这个函数里面通过Object.defineProperty这样一个js原生方法进行的添加响应式的具体处理，这里只是简单提一下，
这里要注意的地方是Object.defineProperty这个里面的set方法，这个set方法里面有这样一段代码
```
function defineReactive(obj, key, val, customSetter, shallow, mock){
    set: function reactiveSetter(newVal) {
        ...
        if (customSetter) {
            customSetter();
        }
        ...
    }
}
```
这个customSetter就是刚刚在initprops这个里面调用defineReactive这个时，传入的那个回调函数，这个回调的意思主要就是想说当前这个prop被修改的时候，这个prop是被子组件自己修改的还是父组件修改的，如果是子组件修改的话，则就会执行这个回调函数if里面的这个warn$2方法，给出警告不能在子组件里面去直接修改父组件传入进来的prop
这也就解释了为什么vue里面不能在子组件里面直接去修改父组件通过prop传入进来的东西了。

*但这里有个例外，就是我们可以看到实际上在给prop添加响应式的时候，只在prop这一层添加了响应式，并没有也就是说当prop不是一个基本类型数据的时候，而是一个引用类型的数据的时候，我们是可以直接通过修改这个引用类型数据里面的值从而来直接影响这个父组件传进来的prop的值的，这是因为vue本身并没有对prop做深监听，而js的引用类型的特性就是大家是公用一个地址，所以只要地址不改，那么我修改你当前存储地址里面某一个数据的时候，会直接影响到与它公用地址的这个数据的，因为他们本质上就是一个数据

### 初始化methods initMethods
这个initMethods方法主要就做2个事情：
1.
（1）检验当前methods里面的属性是否都是function
（2）检验当前methods里面的属性是否与props里面定义的属性是否存在冲突
（3）检验当前methods里面的方法是否与vue内置定义的方法存在冲突
2.将methods里面的属性方法代理到vm上，后面直接通过vue实例去访问这些方法

### 初始化data initData

