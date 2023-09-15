# webpack优化

## 1.解析文件时，缩小文件查询范围

当我们使用loader去解析不同文件的时候，很可能我们只需要解析我们自己写的那些内容，但是如果我们不去给loader解析限定一个解析范围，它甚至能解析到module里面去，这样的话随着我们项目文件和项目依赖的剧增，还是会影响我们loader解析的速度，当然也就是间接影响了构建速度。

解决方案：
我们可以通过loader里面的include,exclude,test这三个东西来限定loader解析的文件范围,比如我们项目里面我们自己写的js代码实际上都是在项目的src文件夹下面的，这里我们如果用babel-loader解析文件转es5的时候就可以这样写：
```
const path = require('path')
module.exports={
    module:{
        rules:[
            {
                test:/\.js$/,
                use:['babel-loader],
                // 只对项目根目录下的 src 目录中的文件采用 babel-loader
                include:path.resolve(__dirname,'src')
            }
        ]
    }
}
```

## 2.dll（动态链接库）分包
在项目构建的时候，实际上很多时候项目里面有很多代码我们是不会去修改的，比如那些三方依赖或者框架源码vue,vue-router,vuex,element-ui这些
这些东西如果我们每次构建的时候，都要构建一遍的话，实际上还是很影响构建速度的
采用dll分包的原因在于包含大量复用模块的动态链接库只需要编译一次，在之后的构建过程中被动态链接库包含的模块将不会在重新编译，而是直接使用动态链接库中的代码。 由于动态链接库中大多数包含的是常用的第三方模块，例如 vue,vue-router,vuex,element-ui只要不升级这些模块的版本，动态链接库就不用重新编译。
步骤：
1.先建立一个用于生成dll的config配置文件,
```
//webpack.dll.config.js
const path = require('path');
const DllPlugin = require('webpack/lib/DllPlugin')
module.exports={
    entry:{
        libs:['vue','vue-router','vuex','element-ui'],
    },
    output:{
        fileName:'[name].dll.js', //输出的dll文件名
        path:path.resolve(__dirname,'dist'),//指定dll文件生成的位置，这里是生成在dist文件夹下
        library:'libs_[name]'
    },
    plugins:[
        new webpack.DllPlugin({
            path: path.join(__dirname, 'dist', '[name]-manifest.json'),
            name: 'libs_[name]', // 要与output.library一致
            context: process.cwd()
        })
    ]
}
```
然后执行webpack --config webpack.dll.config.js 命令，生成dll文件（libs.dll.js）和关联映射文件lib-manifest.json

2.在构建的时候引用生成的dll文件
```
const path = require('path');
const DllReferencePlugin = require('webpack/lib/DllReferencePlugin');

module.exports={
    ...
    plugins:[
        DllReferencePlugin({
            context:process.cwd(),
            manifest:require('./dist/libs-manifest.json')
        })
    ]
}
```
然后执行webpack构建命令就行了，因为已经构建了dll.js文件，所以webpack构建的时候直接引用了dll.js里面的代码，从而减少了再次编译构建那几个三方依赖的时间，大大提高的构建速度

## 3.happypack(快乐的打包😀)
官方原话:HappyPack makes initial webpack builds faster by transforming files in parallel(happypack通过并行处理文件从而加快webpack的构建速度).
针对大量的不同类型的文件，loader对不同文件类型的解释，在webpack里面本来都是单一进程的，这样的话会极大的影响webpack的构建速度（webpack:我得一个一个的对每个文件单独做啊，我目前人就只有这么一个人，我也很累）
而happypack就让webpack快乐了起来，因为它能让webpack拥有并行处理的能力，happypack能把任务分给许多子进程，然后每个子进程把分配到自己的任务做完后，把结果给到webpack主进程,js本身是单线程语言，所以是把分给子进程去做而不是线程；因为增加了子进程，所以webpack里loader对文件的解析更快了（因为都是并行的），从而加快了webpack的构建速度，webpack快乐了，我们也就快乐了，大家快乐才是真的快乐😊

happypack的使用：
```
const path = require('path')
const HappyPack = require('happypack')

module.exports = {
    module:{
        rules:[
            {
                test:/\.js$/,
                use:['happypack/loader?id=babel'],//这一步关键
                exclude:path.resolve(__dirname,'node_modules') //babel解析的时候，不解析node_modules里面的js文件
            }
        ]
    },
    plugins:[
        new HappyPack({ //开启一个happypack的实例用于处理babel-loader对js文件的解析,示例可以不止一个，因为比较我们项目里面有许多的文件类型，可以一个实例处理一个类型
            id:"babel" //这里的id就是rules里面每一项use参数里面的那个id（['happypack/loader?id=babel']）这里的id
            loaders:[
                {
                    loader:'babel-loader',
                    options:{ //这里面对实际loader的操作就更module.rules 里面的loader操作一致了
                        ...
                    }
                }
            ]
        })
    ]
}
```
tips:
以上代码有两点重要的修改：

在 Loader 配置中，所有文件的处理都交给了 happypack/loader 去处理，使用紧跟其后的 querystring ?id=babel 去告诉 happypack/loader 去选择哪个 HappyPack 实例去处理文件。
在 Plugin 配置中，新增了两个 HappyPack 实例分别用于告诉 happypack/loader 去如何处理 .js 和 .css 文件。选项中的 id 属性的值和上面 querystring 中的 ?id=babel 相对应，选项中的 loaders 属性和 Loader 配置中一样。
在实例化 HappyPack 插件的时候，除了可以传入 id 和 loaders 两个参数外，HappyPack 还支持如下参数：

threads 代表开启几个子进程去处理这一类型的文件，默认是3个，类型必须是整数。
verbose 是否允许 HappyPack 输出日志，默认是 true。
threadPool 代表共享进程池，即多个 HappyPack 实例都使用同一个共享进程池中的子进程去处理任务，以防止资源占用过多

## HappyPack原理
在整个 Webpack 构建流程中，最耗时的流程可能就是 Loader 对文件的转换操作了，因为要转换的文件数据巨多，而且这些转换操作都只能一个个挨着处理。 HappyPack 的核心原理就是把这部分任务分解到多个进程去并行处理，从而减少了总的构建时间。

从前面的使用中可以看出所有需要通过 Loader 处理的文件都先交给了 happypack/loader 去处理，收集到了这些文件的处理权后 HappyPack 就好统一分配了。

每通过 new HappyPack() 实例化一个 HappyPack 其实就是告诉 HappyPack 核心调度器如何通过一系列 Loader 去转换一类文件，并且可以指定如何给这类转换操作分配子进程。

核心调度器的逻辑代码在主进程中，也就是运行着 Webpack 的进程中，核心调度器会把一个个任务分配给当前空闲的子进程，子进程处理完毕后把结果发送给核心调度器，它们之间的数据交换是通过进程间通信 API 实现的。

核心调度器收到来自子进程处理完毕的结果后会通知 Webpack 该文件处理完毕。



