# qiankunjs 沙箱隔离原理

## qiankun沙箱隔离的几种方式
* 快照沙箱
* 单应用代理沙箱
* 多应用代理沙箱

### 快照沙箱
代码原理：
```
import type { SandBox } from '../interfaces';
import { SandBoxType } from '../interfaces';
function iter(obj: typeof window, callbackFn: (prop: any) => void) {
  // eslint-disable-next-line guard-for-in, no-restricted-syntax
  for (const prop in obj) {
    // patch for clearInterval for compatible reason, see #1490
    if (obj.hasOwnProperty(prop) || prop === 'clearInterval') {
      callbackFn(prop);
    }
  }
}
export default class SnapshotSandbox implements SandBox {
  proxy: WindowProxy;
  name: string;
  type: SandBoxType;
  sandboxRunning = true;
  private windowSnapshot!: Window;
  private modifyPropsMap: Record<any, any> = {};
  constructor(name: string) {
    this.name = name;
    this.proxy = window;
    this.type = SandBoxType.Snapshot;
  }
  active() {
    // 记录当前快照
    this.windowSnapshot = {} as Window; //当应用激活的时候给当前的快照对象创建一个空对象
    iter(window, (prop) => {
      this.windowSnapshot[prop] = window[prop]; //将当前的window里面存在的全局属性都临时存在这个快照对象里面
    });
    // 恢复之前的变更
    Object.keys(this.modifyPropsMap).forEach((p: any) => { 
      window[p] = this.modifyPropsMap[p]; //存完快照对象后，将之前存的该应用的全局对象重新赋值给当前window，从而达到切换全局应用对象更新的目的
    });

    this.sandboxRunning = true;
  }
  inactive() {
    this.modifyPropsMap = {};
    iter(window, (prop) => { //当当前应用失活（可能是切换到后台之类的，总之要操作的页面不再是当前这个应用了，切换成了另一个应用）
      if (window[prop] !== this.windowSnapshot[prop]) { //比对当前应用激活时的状态到这会儿失活的时候，相同的属性是否存在修改
        // 记录变更，恢复环境
        this.modifyPropsMap[prop] = window[prop]; //将当前应用变更的属性存到modifyPropsMap对象里面，来记录当前应用有哪些值发生了修改
        window[prop] = this.windowSnapshot[prop]; //重新初始为当前应用最开始的快照状态
      }
    });
    if (process.env.NODE_ENV === 'development') {
      console.info(`[qiankun:sandbox] ${this.name} origin window restore...`, Object.keys(this.modifyPropsMap));
    }
    this.sandboxRunning = false;
  }
}
```

### 单应用代理沙箱

代码原理：
```
import type { SandBox } from '../../interfaces';
import { SandBoxType } from '../../interfaces';
import { getTargetValue } from '../common';

function isPropConfigurable(target: WindowProxy, prop: PropertyKey) {
  const descriptor = Object.getOwnPropertyDescriptor(target, prop);
  return descriptor ? descriptor.configurable : true;
}

/**
 * 基于 Proxy 实现的沙箱
 * TODO: 为了兼容性 singular 模式下依旧使用该沙箱，等新沙箱稳定之后再切换
 */
export default class LegacySandbox implements SandBox {
  /** 沙箱期间新增的全局变量 */
  private addedPropsMapInSandbox = new Map<PropertyKey, any>();

  /** 沙箱期间更新的全局变量 */
  private modifiedPropsOriginalValueMapInSandbox = new Map<PropertyKey, any>();

  /** 持续记录更新的(新增和修改的)全局变量的 map，用于在任意时刻做 snapshot */
  private currentUpdatedPropsValueMap = new Map<PropertyKey, any>();

  name: string;

  proxy: WindowProxy;

  globalContext: typeof window;

  type: SandBoxType;

  sandboxRunning = true;

  latestSetProp: PropertyKey | null = null;

  private setWindowProp(prop: PropertyKey, value: any, toDelete?: boolean) {
    if (value === undefined && toDelete) {
      // eslint-disable-next-line no-param-reassign
      delete (this.globalContext as any)[prop]; //删除新增的数据
    } else if (isPropConfigurable(this.globalContext, prop) && typeof prop !== 'symbol') {
      Object.defineProperty(this.globalContext, prop, { writable: true, configurable: true }); //并且将全局window对象属性修改为可编辑，可查看
      // eslint-disable-next-line no-param-reassign
      (this.globalContext as any)[prop] = value; //将数据进行还原
    }
  }

  active() {
    if (!this.sandboxRunning) {
      this.currentUpdatedPropsValueMap.forEach((v, p) => this.setWindowProp(p, v)); //一个应用激活的时候，根据该应用之前存的currentUpdatedPropsValueMap对象进行将window上的数据进行还原
    }

    this.sandboxRunning = true;
  }

  inactive() {
    this.modifiedPropsOriginalValueMapInSandbox.forEach((v, p) => this.setWindowProp(p, v)); //应用失活的时候，将修改的属性还原为之前的初始值
    this.addedPropsMapInSandbox.forEach((_, p) => this.setWindowProp(p, undefined, true)); //将新增的属性直接删除

    this.sandboxRunning = false;
  }

  constructor(name: string, globalContext = window) {
    this.name = name;
    this.globalContext = globalContext;
    this.type = SandBoxType.LegacyProxy;
    const { addedPropsMapInSandbox, modifiedPropsOriginalValueMapInSandbox, currentUpdatedPropsValueMap } = this;

    const rawWindow = globalContext;
    const fakeWindow = Object.create(null) as Window;

    const setTrap = (p: PropertyKey, value: any, originalValue: any, sync2Window = true) => {
      if (this.sandboxRunning) {
        if (!rawWindow.hasOwnProperty(p)) {
          addedPropsMapInSandbox.set(p, value); //如果之前没有这个属性，则认定为是新增的属性，则将该属性键值对存入到addedPropsMapInSandbox对象里面，表示当前属性是在此次数据更新中是新增的，以便后续还原的时候区别哪些属性是新增的然后删除该属性进行还原
        } else if (!modifiedPropsOriginalValueMapInSandbox.has(p)) {
          // 如果当前 window 对象存在该属性，且 record map 中未记录过，则记录该属性初始值
          modifiedPropsOriginalValueMapInSandbox.set(p, originalValue);
        }

        currentUpdatedPropsValueMap.set(p, value); //存放当前属性的值

        if (sync2Window) {
          // 必须重新设置 window 对象保证下次 get 时能拿到已更新的数据
          (rawWindow as any)[p] = value;
        }

        this.latestSetProp = p;

        return true;
      }
      return true;
    };

    const proxy = new Proxy(fakeWindow, { //通过proxy给window设置代理
      set: (_: Window, p: PropertyKey, value: any): boolean => {
        const originalValue = (rawWindow as any)[p];  //当修改了某个属性值后，触发捕获，获取当前属性的原始值
        
        return setTrap(p, value, originalValue, true);
      },
      get(_: Window, p: PropertyKey): any {
        // avoid who using window.window or window.self to escape the sandbox environment to touch the really window
        // or use window.top to check if an iframe context
        // see https://github.com/eligrey/FileSaver.js/blob/master/src/FileSaver.js#L13
        if (p === 'top' || p === 'parent' || p === 'window' || p === 'self') {
          return proxy;
        }

        const value = (rawWindow as any)[p];
        return getTargetValue(rawWindow, value);
      },
      has(_: Window, p: string | number | symbol): boolean {
        return p in rawWindow;
      },
      getOwnPropertyDescriptor(_: Window, p: PropertyKey): PropertyDescriptor | undefined {
        const descriptor = Object.getOwnPropertyDescriptor(rawWindow, p);
        if (descriptor && !descriptor.configurable) {
          descriptor.configurable = true;
        }
        return descriptor;
      },
      defineProperty(_: Window, p: string | symbol, attributes: PropertyDescriptor): boolean {
        const originalValue = (rawWindow as any)[p];
        const done = Reflect.defineProperty(rawWindow, p, attributes);
        const value = (rawWindow as any)[p];
        setTrap(p, value, originalValue, false);

        return done;
      },
    });

    this.proxy = proxy;
  }
}
```