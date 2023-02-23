// 捕捉目标文件夹里面所有的中文，并生成json文件2.0
//update：新增过滤文件中所有的注释，js以及html注释
const fs = require('fs');
const pinyin = require('node-pinyin')
let languagePackge = []
let jsonObj = {}
let jsonnewobj = ""
function fund_chinese(fileName) {
    fs.stat(fileName, (err, stats) => {
        console.log(err, stats.isDirectory())
        if (stats.isDirectory()) {
            fs.readdir(`${fileName}/`, (err, files) => {
                if (err) return console.error(err)
                files.forEach(file => {
                    console.log(file)
                    fund_chinese(`${fileName}/${file}`)
                })
            })
        }
        if (stats.isFile()) {
            let fileData = fs.readFileSync(fileName)
            let fileStr = fileData.toString()
            fileStr = fileStr.replace(/\/\*[^\/]*\*\/|\/\/.+\n?/g, "") //清楚js的注释，单行以及多行
            fileStr = fileStr.replace(/<!--[\s\S]*?-->/g, "") //清楚html的注释，包括多行

            let temp = fileStr.replace(/[\u4e00-\u9fa5]+/g, (str) => {
                console.log(str)
                if (!languagePackge.includes(str)) {
                    languagePackge.push(str)
                    let pin = pinyin(str, {
                        style: "normal"
                    }).join("")
                    jsonObj[str] = { "en": pin }
                    jsonnewobj = JSON.stringify(jsonObj)
                }
            })
            fs.writeFile('languagePackge1.json', jsonnewobj, (err) => {
                if (err) throw err;
                console.log('The file has been saved!');
            })
        }
    })
}
fund_chinese('project') //项目的路径