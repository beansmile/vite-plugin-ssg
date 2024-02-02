- [VitePluginSsg](#vitepluginssg)
  - [Options](#vitepluginssg-options)
  - [Nginx](#nginx)
- [VitePluginImageSizes](#vitepluginimagesizes)
  - [Options](#vitepluginimagesizes-options)

# VitePluginSsg
方便前端纯 vue 静态页面SEO。

```javascript
// vite.config.js
import { VitePluginSSG } from 'vite-plugin-ssg'

export default {
  plugins: [VitePluginSSG()],
}
```

## VitePluginSsg Options
```typescript
export interface Options {
  /**
   * @default '/'
   * @description 第一次访问的路由
   */
  root: '/',

  // debug 模式下，会打开浏览器，只在调试时使用，禁止在生产环境使用
  debug: false,

  /**
   * @default 'ssg-templates'
   * @description ssg模板输出目录, 相对于build.outDir
   */
  ssgOutDir: 'ssg-templates',

  /**
   * @default []
   * @description 只需要处理的路由, String[]
   * @description 如果传了这个参数，只会处理这些路由，不会处理其他路由
   */
  includes: [],

  /**
   * @default []
   * @description 不需要处理的路由, Functin | String[] | RegExp[] | Function[]
   * @param {string} route 路由
   * @returns {boolean} true: 不处理，false: 处理
   */
  excludes: [],

  /**
   * @default () => true
   * @description 自动路由匹配规则, Functin | String[] | RegExp[] | Function[]
   * @param {string} route 路由
   * @returns {boolean} true: 匹配，false: 不匹配
   */
  routeRules: () => true,

  /**
   * @default () => {}
   * @description 页面渲染前，在页面执行的方法
   * @description 会在每个页面执行，可以在这里注入一些全局变量，如：window.xxx = xxx
   */
  pageBeforeEvaluate: () => {},

  /**
   * @default () => {}
   * @description 页面渲染后，在页面执行的方法
   * @description 会在每个页面执行，可以在这里做一些 DOM 操作，如：document.querySelector('.xxx').innerHTML = 'xxx'
   */
  pageAfterEvaluate: () => {}, // 页面渲染前执行的方法

  /**
   * @default 5
   * @description 并发数，用于控制同时 render 的页面数量
   */
  concurrency: 5,
}
```

## Nginx

```
map $http_user_agent $is_bot {
  default         0;
  "~* qihoobot|Baiduspider|Googlebot|Googlebot-Mobile|Googlebot-Image|Mediapartners-Google|Adsbot-Google|Feedfetcher-Google|Yahoo! Slurp|Yahoo! Slurp China|YoudaoBot|Sosospider|Sogou spider|Sogou web spider|MSNBot|ia_archiver|Tomato Bot|FeedDemon|JikeSpider|Indy Library|Alexa Toolbar|AskTbFXTV|AhrefsBot|CrawlDaddy|CoolpadWebkit|Java|Feedly|UniversalFeedParser|ApacheBench|Microsoft URL Control|Swiftbot|ZmEu|oBot|jaunty|Python-urllib|lightDeckReports
  Bot|YYSpider|DigExt|YisouSpider|HttpClient|MJ12bot|heritrix|EasouSpider|Ezooms|^$"  1;
}

server{
  # 所有请求优先访问 SSG，参考以下配置
  location / {
    root xxxx;
    try_files /ssg-templates$uri /ssg-templates$uri/index.html $uri /index.html =404;
  }

  # 只需要 seo 访问，参考以下配置
  location / {
    root xxxx;
    if ($is_bot) {
      rewrite ^ /ssg-templates$request_uri last;
    }
    try_files $uri /index.html =404;
  }

  location /ssg-templates {
    internal;
    alias xxxx;
    try_files /ssg-templates$uri /ssg-templates$uri/index.html $uri /index.html =404;
  }
}
```

# VitePluginImageSizes
自动计算图片大小，给图片添加 width 和 height 属性。
如果图片已设置 width 和 height 属性，则不会再次计算。

```javascript
// vite.config.js
import { VitePluginImageSizes } from 'vite-plugin-ssg';

export default {
  plugins: [VitePluginImageSizes()],
}
```

## VitePluginImageSizes Options

```typescript
export interface Options {
  /**
   * @default false
   * @description 是否自动给图片添加 loading 属性
   * @description 如图片已设置 loading 属性，则不会处理
   */
  lazyLoading: false ｜ 'lazy' | 'eager';
}
```
