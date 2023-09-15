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
这个就是直接初始化data里面的数据了，并且给data里面的数据都添加响应式
#### 1.vue是如何将data上面的数据代理到vue示例上面的？
在initData里面通过调用proxy(vm, "_data", key)这个方法来实现的，
跟前面代理props一样，还是通过vue自己写的proxy这个方法去实现的，上代码：
```
function proxy(target, sourceKey, key) {
    sharedPropertyDefinition.get = function proxyGetter() {
        return this[sourceKey][key];
    };
    sharedPropertyDefinition.set = function proxySetter(val) {
        this[sourceKey][key] = val;
    };
    Object.defineProperty(target, key, sharedPropertyDefinition);
}
```
分析：就是给了一个中间的变量属性，然后将data的数据都存到_data这个属性里面，然后再在vm的实例上面，新增data里面存在的那些属性名，访问实例上面的这些属性的时候，就是通过读取或赋值刚刚那个中间属性_data里面的对应的属性名来实现的

#### 2.如何给data里面的数据添加响应式的
通过Observer这个构造函数来实现,Observer构造函数如下：
```
function Observer(value, shallow, mock) {
    if (shallow === void 0) { shallow = false; }
    if (mock === void 0) { mock = false; }
    this.value = value;
    this.shallow = shallow;
    this.mock = mock;
    // this.value = value
    this.dep = mock ? mockDep : new Dep();
    this.vmCount = 0;
    def(value, '__ob__', this);
    if (isArray(value)) {
        if (!mock) {
            if (hasProto) {
                value.__proto__ = arrayMethods;
                /* eslint-enable no-proto */
            }
            else {
                    for (var i = 0, l = arrayKeys.length; i < l; i++) {
                        var key = arrayKeys[i];
                        def(value, key, arrayMethods[key]);
                    }
            }         
            if (!shallow) {
                this.observeArray(value);
            }
        }
    }
    else {
        /**
        * Walk through all properties and convert them into
        * getter/setters. This method should only be called when
        * value type is Object.
        */
        var keys = Object.keys(value);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            defineReactive(value, key, NO_INIITIAL_VALUE, undefined, shallow, mock);
        }
    }
}
```
这里区分了当前需要响应的对象是数组还是其它类型的，如果是数组则还需要额外再处理下，我们先看不是数组的
不是数组的这里，首先value就是我们刚刚传进来的data，这里是循环遍历了value，实际上就是循环遍历了data里面的属性，然后再将data里面的每个属性都执行defineReactive(value, key, NO_INIITIAL_VALUE, undefined, shallow, mock)，
而这个defineReactive方法就是具体处理给每个属性添加响应式的方法，defineReactive方法定义如下：
```
  function defineReactive(obj, key, val, customSetter, shallow, mock) {
      var dep = new Dep();
      var property = Object.getOwnPropertyDescriptor(obj, key);
      if (property && property.configurable === false) {
          return;
      }
      // cater for pre-defined getter/setters
      var getter = property && property.get;
      var setter = property && property.set;
      if ((!getter || setter) &&
          (val === NO_INIITIAL_VALUE || arguments.length === 2)) {
          val = obj[key];
      }
      var childOb = !shallow && observe(val, false, mock);
      Object.defineProperty(obj, key, {
          enumerable: true,
          configurable: true,
          get: function reactiveGetter() {
              var value = getter ? getter.call(obj) : val;
              if (Dep.target) {
                  {
                      dep.depend({
                          target: obj,
                          type: "get" /* TrackOpTypes.GET */,
                          key: key
                      });
                  }
                  if (childOb) {
                      childOb.dep.depend();
                      if (isArray(value)) {
                          dependArray(value);
                      }
                  }
              }
              return isRef(value) && !shallow ? value.value : value;
          },
          set: function reactiveSetter(newVal) {
              var value = getter ? getter.call(obj) : val;
              if (!hasChanged(value, newVal)) {
                  return;
              }
              if (customSetter) {
                  customSetter();
              }
              if (setter) {
                  setter.call(obj, newVal);
              }
              else if (getter) {
                  // #7981: for accessor properties without setter
                  return;
              }
              else if (!shallow && isRef(value) && !isRef(newVal)) {
                  value.value = newVal;
                  return;
              }
              else {
                  val = newVal;
              }
              childOb = !shallow && observe(newVal, false, mock);
              {
                  dep.notify({
                      type: "set" /* TriggerOpTypes.SET */,
                      target: obj,
                      key: key,
                      newValue: newVal,
                      oldValue: value
                  });
              }
          }
      });
      return dep;
  }
```
挺长的一段哈，这里给data里面的每一个属性都定义了这样的一个getter和setter，这里的getter和setter目前只是定义在这里了，但是记住这里的getter和setter，因为这两个函数的调用实际上是在你的项目代码跑起来的时候，才回去执行的，当你的data里面的某一个属性被访问或被赋值的时候，那么就会触发这里的getter或setter方法了。
1.首先这里要明白的就是这个getter和setter执行的时机，这个还是挺关键的。
2.当你再项目中读取data里面的某个属性的时候，比如你在项目中data里面定义了一个xxx属性：
```
data(){
    return {
        xxx:''
    }
}
```
当你在读取this.xxx的时候，就会触发这里关于xxx的getter方法，但是随着我们getter方法的执行，我们发现了一个Dep.target这个东西，在if条件里面判断了Dep.target这个，
Dep.target这是个什么东西呢，这个Dep.target里面实际上存的就是当前环境正在生效的watcher。
但是我们讲到目前位置，似乎是没看到哪里有往这个Dep.target里面存入watcher啊。
解析：其实当我们项目运行起来的时候，是不是就等于是vue底层的初始化实际上是已经初始化完成了，在初始化的时候，实际上走了这么一段代码：
```
vm.$mount(vm.$options.el);
```
而这个$mount里面执行了mountComponent，mountComponent这个方法里面有段代码
```
new Watcher(vm, updateComponent, noop, watcherOptions, true /* isRenderWatcher */);//这里就是在初始化的时候，执行的第一个watcher，这个
```
watcher也就是网上众多文档里面写的渲染watcher

因为new Watcher的时候，watcher这个构造函数是会去执行this.get()这个方法，而这个get方法里面就会把当前这个wathcer实例通过pushTarget这个方法，把当前执行栈里面的wathcer指向当前这个渲染watcher，至此我们前面data里面提到的那个Dep.target就是指的这个渲染watcher。
```
function pushTarget(target) { //target就是指当前推入的watcher，vm.$mount(vm.$options.el);执行的时候，这个target就是指定的渲染watcher
    targetStack.push(target);
    Dep.target = target;
}
```
这个渲染watcher不同于computed Watcher（计算属性用到的watcher）和watch watcher（watch里面用到的watcher）,这个渲染watcher仅此一家，是全局的唯一的一个watcher，当后面data里面的某个属性值或者computed里面的计算属性发生改变的时候，就会通过这个watcher里面传入的回调方法去更新dom树上面的这些属性对应的变量
前面提到了在渲染watcher里面传入了一个回调方法，这个方法是watcher的第二个参数
```
//new Watcher(vm, updateComponent, noop, watcherOptions, true /* isRenderWatcher */);
updateComponent = function () {
    vm._update(vm._render(), hydrating);
};
```
当data里面的数据发生改变的时候，就会直接调用updateComponent，updateComponent方法是在new Watcher的时候，通过判断expOrFn是否是个函数，传递给了this.getter这个属性，随后执行了Watcher里面的实例方法run，run里面this.get()方法回去执行this.getter()，从而才执行的updateComponent这个方法，这里是为了把updateComponent方法如何被执行的来龙去脉给分析清楚,避免后面对这里为什么执行而产生疑问.

#### 3.watch watcher(options选项里面的那个watch)
这个watch底层也是用之前那个watcher实现的,这里称之为watch watcher,这个watcher是在initData执行过后再执行的initWatch(vm)
上代码：
```
function initWatch(vm, watch) {
      for (var key in watch) {
          var handler = watch[key];
          if (isArray(handler)) {
              for (var i = 0; i < handler.length; i++) {
                  createWatcher(vm, key, handler[i]);
              }
          }
          else {
              createWatcher(vm, key, handler);
          }
      }
  }
function createWatcher(vm, expOrFn, handler, options) {
    if (isPlainObject(handler)) {
        options = handler;
        handler = handler.handler;
    }
    if (typeof handler === 'string') {
        handler = vm[handler];
    }
    return vm.$watch(expOrFn, handler, options);
}
```
initwatch里面的入参watch就是我们options里面监听了很多个数据变化的watch对象
initWatch这里循环获取了watch对象里面的所有被监听的属性（实际上就是watch里面写的所有需要被监听的数据源）
将watch里面的每个数据源和回调函数handler进行绑定，传入createWatcher，key和handler一起传入vm.$watch:
```
Vue.prototype.$watch = function (expOrFn, cb, options) {
    var vm = this;
    if (isPlainObject(cb)) {
        return createWatcher(vm, expOrFn, cb, options);
    }
    options = options || {};
    options.user = true;
    var watcher = new Watcher(vm, expOrFn, cb, options);
    if (options.immediate) {
        var info = "callback for immediate watcher \"".concat(watcher.expression, "\"");
        pushTarget();
        invokeWithErrorHandling(cb, vm, [watcher.value], vm, info);
        popTarget();
    }
    return function unwatchFn() {
        watcher.teardown();
    };
};
```
这里对应一下传参：
这里的expOrFn就是watch里面的key;
cb对应的就是handler;
options这里没有传，所以就不管了
在这个$watch里面，对每个key都进行了至少一次new Watcher(vm, expOrFn, cb, options),因为同一个key可能handler是一个数组的形式，所以会对每个key的每个handler都进行一次new Watcher
当这些被监听的数据源发生改变的时候，就会执行执行之前的那个watcher里面的get方法，通过get方法拿到当前数据源的最新的值，然后将值传给那个cb，也就是handler回调函数，这样我们在业务代码里面就能获取得到当前最新的值以及之前的值了。










