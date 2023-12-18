# webpack安装后，在项目里使用webpack命令报错
error:webpack : 无法将“webpack”项识别为 cmdlet、函数、脚本文件或可运行程序的名称。请检查名称的拼写，如果包括路径，请确保路径正确，然后再试一次。
在项目本地使用直接使用的命令webpack导致上述报错时，
原因：
1.安装webpack的时候没有安装webpack-cli，webpack-cli是提供webpack命令的工具，也需要安装
2.如果webpack和webpack-cli都安装了，但是在项目本地使用webpack命令依然报上诉错误的话，那多半就是安装webpack和webpack-cli的时候是安装到项目本地的，这样不是在全局安装的情况下，要通过npx去执行webpack命令才行，比如我要查询webpack版本

以下指令打开的终端均是在项目的目录终端下：
只是本地项目安装的情况下：npx webpack -v
本地安装：npm install webpack webpack-cli --save-dev
如果是全局安装webpack webpack-cli的话：npm install -g webpack webpack-cli
则可以在项目的位置打开终端直接输入webpack指令即可：webpack -v