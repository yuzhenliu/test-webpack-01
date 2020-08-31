# webpack 学习

#### 热更新

###### 热更新实现

- 配置 `watch: true`, 需要手动刷新
- webpack.HotModuleReplacementPlugin 和 webpack-dev-server 配置使用，不输出实际文件，而是放在内存中，不用磁盘 io，速度更快,不用手动刷新
- webpack-dev-middleware,将 webpack 的输出文件传输给服务器，适用于灵活定制的场景

```js
const express = require('express');
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');

const app = express();
const config = require('./webpack.dev.config.js');
const compiler = webpack(config);

app.use(
  webpackDevMiddleware(compiler, {
    publicPath: config.output.publicPath,
  }),
);

app.listen(3000, () => {
  console.log('运行在 3000 端口');
});
```

###### 热更新原理

- webpack compiler 将 js 编译成 bundle
- HMR Server 将热更新的文件输出给 HMR Runtime
- Bundle Server 提供在浏览器中访问的方式
- HMR Runtime 会被注入到浏览器中，更新文件的变化
- bundle.js 构建输出的文件

文件编辑器更新了文件，检测到文件系统中的编辑，webpack compiler 会进行打包，给 HMR Server，HMR Server 是在服务器，通过 websocket 跟 HMR Runtime 通信, HMR Runtime 在客户端，就会更新 Js Code

#### 文件指纹

- hash: 和整个项目的构建相关，只要项目有改动，整个项目构建的 hash 值就会变动
- chunkhash: 和 webpack 打包的 chunk 相关，不同的 entry 生成不同的 chunkhash 值
- contenthash: 根据文件内容来定义 hash，文件内容不变，则 contenthash 不变

###### 文件指纹使用

- 设置 output 的 fileName, 使用 [chunkhash]
- css 使用 [contenthash], 如果使用 style-loader css-loader, 实际上是把经过 css-loader 转化的文件，传给 style-loader,由 style-loader 插入到文件的 style 头部，因此并不会产生一个 css 文件，通常会使用 MiniCssExtractPlugin 来把 style-loader 中的 css 提取出来，提取出一个单独的文件, 所以设置在 MiniCssExtractPlugin 里面, 但是跟 style-loader 是互斥的，因为这个是把 css 提取出单独的文件，但是 style-loader 是将 css 插入，所以要把 style-loader 删掉, 加上 MiniCssExtractPlugin.loader
- 图片的文件指纹使用 [hash], 设置在 file-loader / url-loader 里面

````text
问题一：
```Cannot use [chunkhash] or [contenthash] for chunk in '[name][chunkhash:8].js' (use [hash] instead)```
css的contenthash, 以及js的chunkhash, 这个跟hotModuleReplacementPlugin有冲突导致的。mode已经改成了development仍然报错
将new webpack.HotModuleReplacementPlugin()这一段注释掉，就ok了
````

#### 兼容性

###### 浏览器前缀自动添加

- css3 前缀，原因还是因为各浏览器的标准还没有统一，可以通过在构建时期加上 css3 前缀来避免一些兼容性问题, 插件 postcss-loader / autoprefixer 配合使用 , postcss 跟 less, sass 不同， less, sass 是预处理器，打包前进行处理，然后处理好了文件，postcss 在处理 @see https://github.com/postcss/postcss
  - IE Trident(-ms)
  - 火狐 Geko(-moz)
  - 谷歌 Webkit(-webkit)
  - O Presto(-O)
- 使用 @see https://github.com/browserslist/browserslist#readme https://github.com/postcss/autoprefixer

###### 浏览器前缀设置

```js
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader", "postcss-loader"]
      }
    ]
  }
}
// 在 package.json 中配置  或者 .browserslistrc 文件中配置
  "browserslist": [
    "last 2 version",
    "> 1%",
    "iOS >= 7",
    "Android > 4.1",
    "Firefox > 20"
  ]
// postcss.config.js 配置文件
module.exports = {
  plugins: [
    require('autoprefixer'),
  ]
}

```

#### 页面适配

###### rem 适配

- rem 是相对单位，相对于根元素，而 px 是绝对单位

###### rem 适配设置

- px2rem-loader / lib-flexible 配合使用, px2rem 转，转换单位， 使用 lib-flexible 来计算当页面打开之后 rem 的值
- px2rem-loader 使用有问题，issues 作者回复使用 postcss 代替 @see https://github.com/Jinjiang/px2rem-loader/issues/18

```js
// 使用 px2rem-loader 一直报错 Error: undefined:7:3: missing '}' 作者回复使用 postcss 代替
{
  loader: 'px2rem-loader',
  options: {
  // remUnit 是指 1 rem 对应 多少 px， 最好是设计稿 / 10, 比如这里最好是 750 的设计稿
  remUnit: 75,
  // 转换成 rem 后小数点位数
  remPrecision: 8,
        },
},
// @todo 使用 postcss 代替

// @todo lib-flexible 手动找到下载的 lib-flexible 库，在头部内联进来，但是这样很不方便

```

#### 资源内联

###### 资源内联意义

- 代码层面
  - 页面框架初始化相关脚本
  - 上报相关打点
  - css 内联避免页面闪动
- 请求层面: 减少 http 网络请求数
  - 小图片 / 字体内联 (url-loader)

###### 资源内联方法

- 使用 row-loader 来对 html, js 库等内联进来
- css 内联可以使用 style-loader, options 中 singleon: true, 它会把所有的 style 标签合并成一个, 如果是打包好的 css 代码，可以使用 html-inline-css-webpack-plugin

#### 多页面打包

- 一个 entry 一个页面和一个 new HtmlWebpackPlugin() ， 缺点： 每次新增 / 删除都需要修改 webpack.config.js 中的配置
- 利用 glob.sync

###### 多页面打包实现

```js
const glob = require('glob');

const ROOT_PATH = path.resolve(__dirname);
const ENTRY_FILE_REG = /src\/(.*)\/index\.js/;

const setMPA = () => {
  const entry = {};
  const htmlWebpackPlugins = [];

  const entryFiles = glob.sync(path.resolve(ROOT_PATH, './src/*/index.js'));

  entryFiles.map((entryFile) => {
    const match = entryFile.match(ENTRY_FILE_REG);
    const pageName = match && match[1];

    entry[pageName] = entryFile;
    htmlWebpackPlugins.push(
      new HtmlWebpackPlugin({
        template: path.join(__dirname, `/src/${pageName}/index.html`),
        filename: `${pageName}.html`,
        chunks: [pageName],
        inject: true,
        minify: {
          html5: true,
          minifyCSS: true,
          minifyJS: true,
          removeComments: false,
          collapseWhitespace: true,
          preserveLineBreaks: false,
        },
      }),
    );
  });

  return {
    entry,
    htmlWebpackPlugins,
  };
};
```

#### Source Map 定位源代码

- Source Map 科普文 @see http://www.ruanyifeng.com/blog/2013/01/javascript_source_map.html
- webpack 文章 @see https://www.webpackjs.com/configuration/devtool/
- 开发环境开启，线上环境关闭，线上排查问题的时候，可以将 source map 上传到错误监控系统
- Source Map 关键字
  - eval: 使用 eval 包裹模块代码
  - source map: 产生 .map 文件
  - cheap: 不包含列信息
  - inline: 将.map 作为 DataUrl 嵌入, 不单独生成 .map 文件
  - module: 不包含 loader 的 source map

###### Source Map 配置

```js
// 在 webpack 的 devtool 中配置
devtool: 'eval-source-map',
```

#### 提取公共资源

- 一些公共资源是可以提取出来的，这样就不用重复打包, 比如 vue / react 的基础包
- 方法一: 使用 html-webpack-externals-plugin,像 react / react-dom, 可以是本地的文件或者通过 cdn 引入(模板中引入)，不打入 bundle 中, @see https://www.npmjs.com/package/html-webpack-externals-plugin
- 方法二: 使用 SplitChunksPlugin 进行公共脚本分离, webpack4 内置的，替代 CommonsChunkPlugin 插件, @see https://www.webpackjs.com/plugins/split-chunks-plugin/

```text
Chunks 参数说明
- async 异步引入的库进行分离(默认)
- initial 同步引入的库进行分离
- all 所有引入的库进行分离(推荐)
```

#### 摇树优化 tree shaking

```text
概念：一个模块可能有多个方法，只要其中的某个方法用到了，整个文件都会被打到 bundle 中去,
tree shaking 就是只把用到的方法打入 bundle, 没用到的方法会在 uglify 阶段被擦除掉

webpack 默认支持,  mode 为 production 的情况下会默认开启

要求是 es6 的语法，commonJs 的方式不支持

原理：DCE
if (false) {
  console.log('代码不会执行到');
}

代码不会被执行，不可到达
代码的结果不会被用到
代码只会影响死变量(只写不读)
```

###### tree shaking 原理

- 利用 es6 模块的特点
  - 只能作为模块顶层的语句出现
  - import 的模块名只能是字符串常量
  - import binding 是 immutable 的
- 代码擦除，uglify (使用 terser-webpack-plugin 代替)阶段删除无用代码
- 对模块代码进行静态分析，在编译阶段会分析哪些代码没有用到，增加注释来标记(-p / --optimize-minimize)，在 uglify 阶段通过标记来删除无用代码
- tree shaking 要求使用到的代码是不能有副作用的，如果有副作用，tree shaking 会失效
- 「副作用」的定义是，在导入时会执行特殊行为的代码，而不是仅仅暴露一个 export 或多个 export。举例说明，例如 polyfill，它影响全局作用域，并且通常不提供 export。
- @see https://www.webpackjs.com/guides/tree-shaking/

###### 问题点

```text
production 环境报错： Unexpected token: keyword «const» [index_1202ed92.js:163,0]

问题原因:
1，是 UglifyJS 不支持 ES6 的语法。
2，发现 uglifyjs-webpack-plugin 2.0 版本的 Release 日志中，明确提示重新切换回到 uglify-js，因为 uglify-es 被废弃了，如果需要 ES6 代码压缩，请使用 terser-webpack-plugin

解决方案
使用terser-webpack-plugin 替换 uglifyjs-webpack-plugin进行代码压缩。

1: 安装terser-webpack-plugin
npm install terser-webpack-plugin --save-dev
2: 引入terser-webpack-plugin
const TerserPlugin = require('terser-webpack-plugin');
3: 使用TerserPlugin替换UglifyJsPlugin, terserOptions替换uglifyOptions
其他参数基本一致。

@see https://github.com/webpack-contrib/terser-webpack-plugin
```

#### 多环境配置

- @see https://www.webpackjs.com/guides/production/
- 使用 webpack-merge 工具来合并
- 官网引入有点问题，应该是 const {merge} = require('webpack-merge'), webpack-merge 源码是暴露来一个对象

#### 模块转换分析

- 模块 -> 模块初始化函数
- 结论
  - 被 webpack 转换后的函数会带上一层包裹
  - import 会转换成 \_webpack_require
  - export 会转换成 \_webpack_exports

###### Scope hoisting 原理

```text
将所有模块代码按照引用顺序放在函数作用域里，然后适当地重命名以防止变量名冲突

对比：通过 scope hoisting 可以减少函数声明代码和内存开销
```

- webpack4 中 mode 为 production 会默认开启, webpack3 中还需要手动添加配置

```js
new webpack.optimize.ModuleConcatenationPlugin(),
```
