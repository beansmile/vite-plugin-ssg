import fs from 'fs';
import sharp from 'sharp';
import { parse } from 'node-html-parser';

let config = {};

export default (options = {
  lazyLoading: false,
}) => {
  return {
    name: 'vite-plugin-image-sizes',
    enforce: 'pre',

    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },

    async transform(code, id) {
      if (id.endsWith('.vue')) {
        const found = code.match(/<img\s+(?:[^>]*?\s+)?src=['"]([^'"]*)['"][^>]*>/gi);
        if (found) {
          await Promise.all(
            found.map((item) => {
              const root = parse(item);
              const imgTag = root.firstChild;
              let imgSrc = imgTag.getAttribute('src');
              config.resolve.alias.forEach((alias) => {
                imgSrc = imgSrc.replace(alias.find, alias.replacement);
              });

              if (fs.existsSync(imgSrc)) {
                return sharp(imgSrc).metadata().then((imageMetadata) => {
                  imgTag.setAttribute('width', imgTag.getAttribute('width') || imageMetadata.width);
                  imgTag.setAttribute('height', imgTag.getAttribute('height') || imageMetadata.height);
                  if (options.lazyLoading) {
                    imgTag.setAttribute('loading', imgTag.getAttribute('loading') || options.lazyLoading);
                  }
                  code = code.replace(item, root.toString());
                });
              }
              return Promise.resolve();
            }),
          );
        }
      }
      return code;
    },
  };
};
