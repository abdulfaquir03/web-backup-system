const express = require("express")
const app = express()
const cookieParser = require("cookie-parser")

app.use(express.json({ limit: "100mb" }))
app.use(express.urlencoded({ limit: "100mb", extended: true }))
app.use(cookieParser())

app.use((req, res, next) => {
  const host = (req.headers.host || '').split(':')[0];
  const isSub = host.endsWith('.lojium.shop') && !host.startsWith('www.');
  req.slug = isSub ? host.replace('.lojium.shop', '') : null;
  console.log('Slug:', req.slug);
  next();
});

// app.use("/api/ecomerce", require("./lojium/router/ecomerc"))
// app.use("/api/produtos", require("./lojium/router/products"))
// app.use("/api/usuarios", require("./lojium/router/usuarios"))


app.get('/{*splat}', (req, res) => {
  let html = require('fs').readFileSync('./lojium/public/index.html', 'utf8');
  const path = req.path, isSub = req.slug !== null;
  const val = isSub ? req.slug : (path === '/' ? 'lojium_public' : path.slice(1));
  res.send(html.replace('{{path}}', val))
});



app.listen(2000, '0.0.0.0', () => {
  console.log("Server running...")
})