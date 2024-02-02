import path from 'path';
import fs from 'fs-extra';
import puppeteer from 'puppeteer';
import mime from 'mime-types';
import PQueue from 'p-queue';

export default (options = {}) => {
  options = {
    root: '/',
    debug: false,
    ssgOutDir: 'ssg-templates',
    includes: [], // （选填）只需要处理的路由, String[], 如果传了这个参数，只会处理这个路由，不会处理其他路由
    excludes: [], // （选填）不需要处理的路由, Array
    routeRules: () => true, // 自动路由匹配规则, Array or Function
    pageBeforeEvaluate: () => {}, // 页面渲染前执行的方法
    pageAfterEvaluate: () => {}, // 页面渲染前执行的方法
    concurrency: 5,
    ...options,
  };
  let config = {};
  const queue = new PQueue({ concurrency: options.concurrency });
  const pageOrigin = 'http://localhost:3000';

  // 判断文件是否存在
  function filePathExistsSync(filePath) {
    try {
      const status = fs.statSync(filePath);
      return status.isFile();
    } catch (error) {
      return false;
    }
  }

  function tryFiles(...args) {
    let url, filePath;
    do {
      url = args.shift();
      filePath = path.join(path.resolve(), config.build.outDir, url);
    } while (url && !filePathExistsSync(filePath));
    if (filePathExistsSync(filePath)) {
      return {
        content: fs.readFileSync(filePath),
        type: mime.lookup(filePath) || 'text/html',
      };
    }
  }

  let browser;

  const cacheRoutes = [];
  const penddingRoutes = [];

  function checkRoute(route, rules) {
    if (typeof rules === 'function') {
      return rules(route);
    } else if (rules instanceof RegExp) {
      return rules.test(route);
    } else if (typeof rules === 'string') {
      return rules === route;
    } else if (Array.isArray(rules)) {
      return rules.find(item => checkRoute(route, item));
    }
    throw new Error('rules must be Array or Function');
  }

  async function renderPage(route) {
    if (checkRoute(route, options.excludes) || !checkRoute(route, options.routeRules)) {
      return;
    }

    const suffix = path.extname(route);
    let cacheFileName = path.join(path.resolve(), config.build.outDir, options.ssgOutDir, route, 'index.html');
    if (suffix) {
      cacheFileName = path.join(path.resolve(), config.build.outDir, options.ssgOutDir, route);
    }

    if (cacheRoutes.includes(cacheFileName) || penddingRoutes.includes(cacheFileName)) {
    // 如果已经处理过，则不再处理
      return;
    }
    // eslint-disable-next-line no-console
    console.log('renderPage => ', route);
    penddingRoutes.push(cacheFileName);
    const page = await browser.newPage();
    await page.setRequestInterception(true);

    page.on('request', (request) => {
      const reg = new RegExp(`^(${pageOrigin}|${config.base})`);
      if (request.method() === 'GET' && reg.test(request.url())) {
        const url = request.url().replace(reg, '');
        const file = tryFiles(url, './index.html');
        if (file) {
          request.respond({
            status: 200,
            contentType: file.type,
            body: file.content,
          });
        } else {
          request.respond({
            status: 404,
          });
        }
      } else {
        request.abort();
      }
    });

    await page.evaluateOnNewDocument(options.pageBeforeEvaluate);
    await page.goto(new URL(route, pageOrigin).href);
    await page.evaluate(options.pageAfterEvaluate);
    const content = await page.content();
    let hrefs = await page.$$eval('a', as => as.map(a => a.href));
    hrefs = hrefs.filter(href => href.startsWith(pageOrigin));
    if (!options.debug) {
      await page.close();
    }
    fs.outputFileSync(cacheFileName, content, 'utf-8');
    cacheRoutes.push(cacheFileName);
    // eslint-disable-next-line no-console
    console.log(path.relative(path.resolve(), cacheFileName));

    // 没有includes参数，就自动匹配路由，否则就只处理includes参数中的路由
    if (!options.includes || !options.includes.length) {
      queue.addAll(hrefs.map(href => () => renderPage(new URL(href).pathname)));
    }
  }

  return {
    name: 'vite-plugin-ssg',

    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },

    async writeBundle() {
      browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-web-security', '--disable-features=IsolateOrigins,site-per-process'],
        headless: options.debug ? false : 'new',
      });
      if (options.includes && options.includes.length) {
        queue.addAll(options.includes.map(route => () => renderPage(route)));
      } else {
        queue.add(() => renderPage(options.root));
      }
      await queue.onIdle();
      if (!options.debug) {
        browser.close();
        browser = null;
      }
    },
  };
};
