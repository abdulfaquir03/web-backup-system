const path = require('path')
const express = require("express")
const app = express()

app.use(express.static(path.join(__dirname, './backend/public/src')))
app.use('/src', express.static(path.join(__dirname, './backend/public/src')))
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }))


const public = require("./backend/public/app")
const authentication = require("./backend/routers/authentication")
const usuarios = require("./backend/routers/usuarios")


app.use("/", public)
app.use("/api/cm/usuarios", authentication)
app.use("/api/cm/dados", usuarios)


app.listen(9000, ()=>{console.log("Running...")})
module.exports = app