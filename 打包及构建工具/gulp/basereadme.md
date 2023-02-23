# [gulp的基础认知](https://www.gulpjs.com.cn/docs/getting-started/quick-start/)

## 什么是gulp
gulp是一个构建工具，跟webpack差不多，只不过他两的概念不一样，gulp里面的构建是创建多个任务，然后把创建的多个任务任意嵌套组合起来然后执行

## 安装gulp，搭建gulp构建环境
安装gulp-cli：npm install --global gulp-cli
安装gulp：npm install --save-dev gulp

gulp构建的执行是在一个gulpfile.js的文件中执行的，这个文件需要自己在项目的根目录下创建
执行gulpfile.js文件：在当前项目的命令行终端里面输入命令————gulp

## 什么是Glob

glob 是由普通字符和/或通配字符组成的字符串，用于匹配文件路径。可以利用一个或多个 glob 在文件系统中定位文件。说白了就是表示你的一个或多个目标文件的路径

### 对于Glob的特殊字符的说明
1.特殊字符： * (一个星号)

它能匹配当前指定目录下的所有的目标文件，比如'*.js'表示的就是匹配当前目录下所有的js文件，但是匹配不到当前的子目录下面的文件，意思就是如果我当前的一个目录里面有个a.js，然后还有文件夹b，文件夹b里面有个b.js，那么我只能匹配到当前目录下的a.js，匹配不到b.js，因为b.js是当前文件夹的子目录（子文件夹）

2.特殊字符： ** (两个星号)

这个就是上面这个的补充，意思就是它能匹配到当前文件目录下的所有目标的文件，包括它的子目录（子文件夹）里面的文件

3.特殊字符： ! (取反)

这个通常是放在一个Glob数组里面，表示的是在匹配到的一堆目标文件里面排除其它的文件
p.s官方原话：由于 glob 匹配时是按照每个 glob 在数组中的位置依次进行匹配操作的，所以 glob 数组中的取反（negative）glob 必须跟在一个非取反（non-negative）的 glob 后面。第一个 glob 匹配到一组匹配项，然后后面的取反 glob 删除这些匹配项中的一部分。

e.g ['script/**/*.js', '!scripts/vendor/']意思就是匹配script目录下面所有除了vendor目录的js文件

取反（negative） glob 可以作为对带有两个星号的 glob 的限制手段。
['**/*.js', '!node_modules/']这个就很有用，表示的就是我只匹配除node_modules这个依赖包的js文件

## 创建Task任务

前面说了gulp的执行构建是通过task任务来执行的，task任务可以理解为我要为了处理一个问题而写的js文件，当然多个task可以在一个文件里面，但是为了区分不同的处理问题的类型（处理js类型文件，处理css类型文件，处理image类型文件等等），最好还是把处理每个文件类型的task分开写，同时也是为了方便后续构建的管理，不然所有的task全放到一个文件里面，项目大了可能这个文件会变得很臃肿，看着头也大直接当场劝退
说了这么多，到底该怎么创建task呢？
easy！
老版本可能还需要用到gulp包里面的task方法来创建，现在是直接就像写nodejs模块一样，在一个js文件里面写好一个方法，这个然后把这个方法到处就行了，被导出的这个方法就是一个task，用于我们后续的嵌套执行
多说无益，上代码:

```
const { series } = require('gulp');

// `clean` 函数并未被导出（export），因此被认为是私有任务（private task）。
// 它仍然可以被用在 `series()` 组合中。
function clean(cb) {
  // body omitted
  cb();
}

// `build` 函数被导出（export）了，因此它是一个公开任务（public task），并且可以被 `gulp` 命令直接调用。
// 它也仍然可以被用在 `series()` 组合中。
function build(cb) {
  // body omitted
  cb();
}

exports.build = build;
exports.default = series(clean, build);
```

当我们创建了大量的task后，我们该怎么去按照我们希望的顺序去执行呢？
## gulp的series与parallel
Gulp 提供了两个强大的组合方法： series() 和 parallel()，允许将多个独立的任务组合为一个更大的操作。这两个方法都可以接受任意数目的任务（task）函数或已经组合的操作。series() 和 parallel() 可以互相嵌套至任意深度。
1.如果需要让任务（task）按顺序执行，请使用 series() 方法。
使用方式：
```
const { series } = require('gulp');
function task1() {
  ...
}

function task2() {
  ...
}
exports.build = series(task1, task2);
```
2.对于希望以最大并发来运行的任务（tasks），可以使用 parallel() 方法将它们组合起来
parallel多用于两个互不依赖的task，然后希望他们一起执行，比如js的task和css的task，这两个本身就没啥关系的，我就希望这两个task并发执行
使用方式：
```
const { parallel } = require('gulp');
function javascript(cb) {
  // body omitted
  cb();
}

function css(cb) {
  // body omitted
  cb();
}

exports.build = parallel(javascript, css);
```
p.s. series() 和 parallel() 可以被嵌套到任意深度。就像下面这样：
```
    exports.build = series(
  clean,
  parallel(
    cssTranspile,
    series(jsTranspile, jsBundle)
  ),
  parallel(cssMinify, jsMinify),
  publish
);
```

## 如何处理不同类型的文件
1.这个就跟webpack类似了,它本身没啥能力处理其它类型的文件，它是靠各种三分插件就像webpack里面的各种loader一样去加载处理的
2.gulp处理文件是通过流的形式去处理的
gulp 暴露了 src() 和 dest() 方法用于处理计算机上存放的文件。
（1）src() 接受 glob 参数，并从文件系统中读取文件然后生成一个 Node 流（stream）。它将所有匹配的文件读取到内存中并通过流（stream）进行处理。
（2）流（stream）所提供的主要的 API 是 .pipe() 方法，用于连接转换流（Transform streams）或可写流（Writable streams）。
（3）dest() 接受一个输出目录作为参数，并且它还会产生一个 Node 流（stream），通常作为终止流
这三个方法应该是会在gulp的构建中经常与我们打交道的方法

## 异步执行
详情见[官网](https://www.gulpjs.com.cn/docs/getting-started/async-completion/)
