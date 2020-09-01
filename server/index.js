// 添加 hack
if (typeof window === 'undefined') {
  global.window = {};
}
const express = require('express');
const {
  renderToString
} = require('react-dom/server');
const SSR = require('../dist/search-server');
const path = require('path');
const fs = require('fs');
const template = fs.readFileSync(path.resolve(__dirname, '../dist/search.html'), 'utf8')
const data = require('../common/city.json');

const server = (port) => {
  const app = express();
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('/search', (req, res) => {
    const html = renderMarkup(renderToString(SSR));
    res.status(200).send(html);
  });
  app.listen(port, () => {
    console.log(`server is running on ${port}`);
  });
};

const renderMarkup = (str) => {
  const dataStr = JSON.stringify(data);
  return template.replace('<!--HTML_PLACEHOLDER-->', str).replace('<!--INITIAL_DATA_PLACEHOLDER-->', `<script type="text/javascript">window.initialData=${dataStr}</script>`)

};

server(process.env.port || 3000);
