# webpack核心概览
```
1.entry:入口模块文件路径，可能是个数组（多入口，常见于多页面），而单页面基本上就是单入口，所以当页面情况下，传递单页面入口模块的文件路径字符串就行了
2.output:打包输出bundle文件时的路径
3.module:模块，webpack的构建对象，在webpack里面，一切项目资源均视为模块
4.bundle：输出文件，webpack打包后的压缩文件集合
5.chunk：中间文件，webpack构建的中间产物
6.loader：文件类型加载器，webpack利用各种loader，将不同类型的文件进行打包处理，因为webpack本身是只支持js类型的文件，为了构建打包其它类型的文件，就需要其它类型文件对应的loader来处理
7.plugin：插件，webpack打包时执行的扩展功能
```
## loader
### cssModule打包的原理
css-loader:cssloader做的事情实际上是将css代码模块化，生成一个叫___CSS_LOADER_EXPORT___的数组，所有模块化的css都会推入到这个数组里面存起来，然后就不干其它事情了，因此当我们在webpack中仅添加css-loader后，打包出来的css样式并不会在页面上展示出效果，因为此时，页面上都还没有把我们写的css代码文件应用上去

style-loader：styleloader做的事情是先自行创建一个style标签，然后挂载到页面上面，然后将css-loader生成的___CSS_LOADER_EXPORT___进行解析，然后将里面的css代码作为字符串拿出来（这也是为啥要把styleloader放到最后执行的原因），接着填入到之前自行创建的style标签里面。通过这样的方式来达到将模块化的css代码与页面css样式展示联系起来，实现一个style in js的目的

自定义loader：同样在loader的规则处加上一个规则（
1.这个自定义loader要处理的文件类型的正则匹配
2.use处理添加该loader，只不过这里因为是自定义的loader，所以这里要添加的自定义loader文件的绝对路径）
自定义loader的简单示例：
```
module: {
        rules: [
            {
                test:/\.js$/,
                use:[path.resolve(__dirname,'./loader/evilLoader.js')]
            }
        ]
    },
```
## 多入口文件项目打包优化
1.将多个入口的js文件分离，而不是全都公用一个打包js文件
2.为了将不同的如何js文件与它对应的html文件打包对应上，可以使用HtmlWebpackPlugin这个插件来进行处理
代码如下：
```
const HtmlWebpackPlugin = require('html-webpack-plugin');
const config = {
  mode: 'development',
  entry: {
    index: path.resolve(__dirname, '../src/index.js'),
    login: path.resolve(__dirname, '../src/login.js'),
  },
  output: {
    filename: 'js/[name].js',
    path: path.resolve(__dirname, '../dist'),
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: path.resolve(__dirname, '../src/index.html'),
      chunks: ['index'],
    }),
    new HtmlWebpackPlugin({
      filename: 'login.html',
      template: path.resolve(__dirname, '../src/login.html'),
      chunks: ['login'],
    }),
  ],
};
```
如上述配置代码所示，我们实际上这个项目有两个入口文件，一个index主页的入口js文件和一个login登录页的login.js文件,这里为了让这两个入口文件在打包后，被模板文件分别引用，则使用了HtmlWebpackPlugin这个插件的chunks配置项，chunks的这个值就是对应的entry的这个入口文件的配置项名称

## 构建打包优化——压缩
### js压缩：uglifyjs-webpack-plugin
### css压缩：css-minimizer-webpack-plugin

## *tree-shaking(很重要的概念)
概念：就是在打包的时候把项目中没有用到的代码删除

### 自动触发tree-shaking
1.通过按需引入的方式
```
import {xxx} from 'x'
```
2.导入的包一定是要满足ESModule的规范，并且还是把包里面暴露出来的方法要有单独使用export来导出
```
//x依赖包
function a(){
    ...
    dosomething()
}
function b(){
    ...
    dosomething()
}
export default{
    a,
    b
}
```
如果是像这种把包里面的方法通过export default的形式以一个对象的形式暴露出来的话，是不能被自动tree-shaking的
如果是通过下面这种方法则可以：
```
//x依赖包
export function a(){
    ...
    dosomething()
}
export function b(){
    ...
    dosomething()
}
export default{
    a,
    b
}
```
当然，知道这点必须成立是很正常的，因为在第一条规则里面就说了是通过按需引入的方式来从一个包里面引入，既然是按需引入，那该依赖包里面的方法必然是通过单独使用export的形式来暴露一个方法的，这一点毋庸置疑
remark:在webpack的mode被设置为'development'的情况下，这种通过按需引入，自动tree-shaking的方式是针对文件来处理的，即如果你只是按需引入了一个依赖包里面的某一个文件里面的方法，那么实际上跟当前文件无关的其它文件都会在打包的过程中被干掉，只会留下当前这个文件被打包。这种方法检测无法将一个文件里面的其它未使用到的方法给删掉。当然在mode为'production'的时候，是依然能正常自动tree-shaking掉我们没有用到的代码部分的

举个例子：
就那上面这段代码来说，假如我引用了x这个依赖包，但实际上我只是调用了这个x依赖包里面的a方法的话，我们希望的时候，在打包的时候只是将a方法给打包进去，x依赖包里面其它没有用到的方法需要通通将它给干掉，但实际上如果我们只是用上述说的默认的按需引入自动tree-shaking的方式的话，在最终打包的时候，还是会将b方法给打包进来。

