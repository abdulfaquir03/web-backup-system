/*
    PROJECTO: SISTEMA DE GESTÃO CM - CETROPROHC.
    ******
    DESENVOLVIDO POR: 
    |Abdul faquir | Desenvolvedor web
    |EMAIL: abdulfaquir03@gmail.com
    |WHATSAPP: +258 879181555
    |WEBSITE: https://lojium.vercel.app/abdulfaquir
*/
const express = require("express")
const router = express.Router()

const path = require("path")
const fs = require("fs")

const globalCssPath = path.join(__dirname, '/views/css/global.css')
const indexCssPath = path.join(__dirname, '/views/css/index.css')
const cursosCssPath = path.join(__dirname, '/views/css/cursos.css')
const estauthCssPath = path.join(__dirname, '/views/css/est-auth.css')
const estapainelCssPath = path.join(__dirname, '/views/css/est-painel.css')
const porauthCssPath = path.join(__dirname, '/views/css/portal-auth.css')
const superadminCssPath = path.join(__dirname, '/views/css/superadmin.css')
const coordenacaogeralCssPath = path.join(__dirname, '/views/css/coordenacao.css')
const financasCssPath = path.join(__dirname, '/views/css/financas.css')
const formadorCssPath = path.join(__dirname, '/views/css/formador.css')
const secretariaCssPath = path.join(__dirname, '/views/css/secretaria.css')
const marketingCssPath = path.join(__dirname, '/views/css/marketing.css')



const superadminJsPath = path.join(__dirname, '/views/js/superadmin.js')
const coogJsPath = path.join(__dirname, '/views/js/coordenacao.js')
const financasJsPath = path.join(__dirname, '/views/js/financas.js')
const painelJsPath = path.join(__dirname, '/views/js/est-painel.js')
const secretariaJsPath = path.join(__dirname, '/views/js/secretaria.js')
const formadorJsPath = path.join(__dirname, '/views/js/formador.js')



const globalCssFile = fs.existsSync(globalCssPath) ? fs.readFileSync(globalCssPath, 'utf8') : ''
const indexCssFile = fs.existsSync(indexCssPath) ? fs.readFileSync(indexCssPath, 'utf8') : ''
const cursosCssFile = fs.existsSync(cursosCssPath) ? fs.readFileSync(cursosCssPath, 'utf8') : ''
const estauthCssFile = fs.existsSync(estauthCssPath) ? fs.readFileSync(estauthCssPath, 'utf8') : ''
const estpainelCssFile = fs.existsSync(estapainelCssPath) ? fs.readFileSync(estapainelCssPath, 'utf8') : ''
const portalauthCssFile = fs.existsSync(porauthCssPath) ? fs.readFileSync(porauthCssPath, 'utf8') : ''
const superadminCssFile = fs.existsSync(superadminCssPath) ? fs.readFileSync(superadminCssPath, 'utf8') : ''
const cordenacaogeralCssFile = fs.existsSync(coordenacaogeralCssPath) ? fs.readFileSync(coordenacaogeralCssPath, 'utf8') : ''
const financasCssFile = fs.existsSync(financasCssPath) ? fs.readFileSync(financasCssPath, 'utf8') : ''
const formadorCssFile = fs.existsSync(formadorCssPath) ? fs.readFileSync(formadorCssPath, 'utf8') : ''
const secretariaCssFile = fs.existsSync(secretariaCssPath) ? fs.readFileSync(secretariaCssPath, 'utf8') : ''
const marketingCssFile = fs.existsSync(marketingCssPath) ? fs.readFileSync(marketingCssPath, 'utf8') : ''



const superadminJsFile = fs.existsSync(superadminJsPath) ? fs.readFileSync(superadminJsPath, 'utf8') : ''
const coordenacaoJsFile = fs.existsSync(coogJsPath) ? fs.readFileSync(coogJsPath, 'utf8') : ''
const financasJsFile = fs.existsSync(financasJsPath) ? fs.readFileSync(financasJsPath, 'utf8') : ''
const painelJsFile = fs.existsSync(painelJsPath) ? fs.readFileSync(painelJsPath, 'utf8') : ''
const secretariaJsFile = fs.existsSync(secretariaJsPath) ? fs.readFileSync(secretariaJsPath, 'utf8') : ''
const formadorJsFile = fs.existsSync(formadorJsPath) ? fs.readFileSync(formadorJsPath, 'utf8') : ''




router.get("/", (req, res)=>{
    fs.readFile(path.join(__dirname, "/views/index.html"), "utf8", (err, html) =>{
        if(err) return res.status(500).send("Error: Erro ao renderizar a pagina " + err.message)
        const file = html
            .replace("{{title}}", "CM-CETROPROHC")
            
            .replace("</head>", `<style>${globalCssFile} ${indexCssFile}</style></head>`)
        res.send(file)
    })
})



router.get("/cursos", (req, res)=>{
    fs.readFile(path.join(__dirname, "/views/cursos.html"), "utf8", (err, html) =>{
        if(err) return res.status(500).send("Error: Erro ao renderizar a pagina " + err.message)
        const file = html
            .replace("{{title}}", "Nossos cursos")
            
            .replace("</head>", `<style>${globalCssFile} ${cursosCssFile}</style></head>`)
        res.send(file)
    })
})


router.get("/authentication", (req, res)=>{
    fs.readFile(path.join(__dirname, "/views/est-auth.html"), "utf8", (err, html) =>{
        if(err) return res.status(500).send("Error: Erro ao renderizar a pagina " + err.message)
        const file = html
            .replace("{{title}}", "Autenticação")
            
            .replace("</head>", `<style>${globalCssFile} ${estauthCssFile}</style></head>`)
        res.send(file)
    })
})




router.get("/painel", (req, res) => {
    fs.readFile(path.join(__dirname, "/views/est-painel.html"), "utf8", (err, html) =>{
        if(err) return res.status(500).send("Error: Erro ao renderizar a pagina " + err.message)
        const file = html
            .replace("{{title}}", "Dashboard")
            
            .replace("</head>", `<style>${globalCssFile} ${estpainelCssFile}</style></head>`)
            .replace("</body>", `<script>${painelJsFile}</script></body>`)
        res.send(file)
    })
})


router.get("/portal", (req, res) => {
    fs.readFile(path.join(__dirname, "/views/portal-auth.html"), "utf8", (err, html) =>{
        if(err) return res.status(500).send("Error: Erro ao renderizar a pagina " + err.message)
        const file = html
            .replace("{{title}}", "Funcionarios autorizados")
            
            .replace("</head>", `<style>${globalCssFile} ${portalauthCssFile}</style></head>`)
        res.send(file)
    })
})



router.get("/superadmin", (req, res) => {
    fs.readFile(path.join(__dirname, "/views/superadmin.html"), "utf8", (err, html) =>{
        if(err) return res.status(500).send("Error: Erro ao renderizar a pagina " + err.message)
        const file = html
            .replace("{{title}}", "Administrador geral")
            
            .replace("</head>", `<style>${globalCssFile} ${superadminCssFile}</style></head>`)
            .replace("</body>", `<script>${superadminJsFile}</script></body>`)
        res.send(file)
    })
})




router.get("/coordenacao", (req, res) => {
    fs.readFile(path.join(__dirname, "/views/coordenacao.html"), "utf8", (err, html) =>{
        if(err) return res.status(500).send("Error: Erro ao renderizar a pagina " + err.message)
        const file = html
            .replace("{{title}}", "Coordenação única")
            
            .replace("</head>", `<style>${globalCssFile} ${cordenacaogeralCssFile}</style></head>`)
            .replace("</body>", `<script>${coordenacaoJsFile}</script></body>`)
        res.send(file)
    })
})




router.get("/financas", (req, res) => {
    fs.readFile(path.join(__dirname, "/views/financas.html"), "utf8", (err, html) =>{
        if(err) return res.status(500).send("Error: Erro ao renderizar a pagina " + err.message)
        const file = html
            .replace("{{title}}", "Financas")
            
            .replace("</head>", `<style>${globalCssFile} ${financasCssFile}</style></head>`)
            .replace("</body>", `<script>${financasJsFile}</script></body>`)
        res.send(file)
    })
})



router.get("/formador", (req, res) => {
    fs.readFile(path.join(__dirname, "/views/formador.html"), "utf8", (err, html) =>{
        if(err) return res.status(500).send("Error: Erro ao renderizar a pagina " + err.message)
        const file = html
            .replace("{{title}}", "Formador")
            
            .replace("</head>", `<style>${globalCssFile} ${formadorCssFile}</style></head>`)
            .replace("</body>", `<script>${formadorJsFile}</script></body>`)
        res.send(file)
    })
})




router.get("/secretaria", (req, res) => {
    fs.readFile(path.join(__dirname, "/views/secretaria.html"), "utf8", (err, html) =>{
        if(err) return res.status(500).send("Error: Erro ao renderizar a pagina " + err.message)
        const file = html
            .replace("{{title}}", "Secretaria")
            
            .replace("</head>", `<style>${globalCssFile} ${secretariaCssFile}</style></head>`)
            .replace("</body>", `<script>${secretariaJsFile}</script></body>`)
        res.send(file)
    })
})






router.get("/marketing", (req, res) => {
    fs.readFile(path.join(__dirname, "/views/secretaria.html"), "utf8", (err, html) =>{
        if(err) return res.status(500).send("Error: Erro ao renderizar a pagina " + err.message)
        const file = html
            .replace("{{title}}", "marketing")
            
            .replace("</head>", `<style>${globalCssFile} ${marketingCssFile}</style></head>`)
        res.send(file)
    })
})





module.exports = router