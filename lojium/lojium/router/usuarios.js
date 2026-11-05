const express = require("express")
const router = express.Router()
const crypto = require("crypto")
const jwt = require('jsonwebtoken')
const { randomUUID } = require('crypto')

require('dotenv').config()

const { authentication } = require("../sheets/auth/authjwt.js")
const { db, sheets } = require("../sheets/sheets")



router.post("/sigup", async (req, res) => {  
    const { name, email, password, store } = req.body
    slug = (store?.slug || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "")
    
    if (!name || name.trim().split(/\s+/).length < 2) return res.status(400).json({
        status: false,
        info: "",
        message: "Informe nome e sobrenome." 
    })
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return res.status(400).json({
        status: false,
        info: "",
        message: "O e-mail é inválido." 
    })
    if (!password || password.length < 6) return res.status(400).json({
        status: false,
        info: "",
        message: "A senha é muito curta." 
    })
    if (!store?.name?.trim()) return res.status(400).json({
        status: false,
        info: "",
        message: "Nome da loja é obrigatório." 
    })
    if (slug.length < 3) return res.status(400).json({
        status: false,
        info: "",
        message: "A slug é muito curta." 
    })
    try{
        const rows = (await db.get()).data || [], cleanEmail = email.trim().toLowerCase()
        if (rows.some(r => r[1]?.toLowerCase() === cleanEmail)) return res.status(400).json({
            status: false,
            info: "",
            message: "O e-mail está cadastrado." 
        })
        if (rows.some(r => r[5]?.toLowerCase() === slug)) return res.status(400).json({
            status: false,
            info: "",
            message: "Slug já está em uso por outro comerciante." 
        })
        const salt = crypto.randomBytes(16).toString('hex')
        const hash = crypto.scryptSync(password, salt, 64).toString('hex')
        const id = crypto.randomUUID(), now = new Date()
        dateMz = now.toLocaleString("pt-MZ", { timeZone: "Africa/Maputo" })
        endDate = new Date(now.getTime() + 30 * 86400000).toLocaleString("pt-MZ", { timeZone: "Africa/Maputo" })
        const userData = {
            name: name.trim(),
            password: `${salt}:${hash}`,
            status: true, 
            role: "user", kyc: {},
            createdAt: dateMz, updatedAt: dateMz
        }, 
        statsData = { processed_total: 0, total_transactions: 0, unprocessed_total: 0 };
        const storeData = {
            status: true,
            ecommerce: {name: store.name.trim(), description: "", whatsapp: "", logoUrl: "", createdAt: dateMz}, 
            category: [], 
            branding: {primaryColor: "#000000"},
            metrics: {totalViews: 0, totalSales: 0},
            subscription: {periodStart: dateMz, periodEnd: endDate, billingCycle: 0 }}
        await db.post([
            id,
            cleanEmail,
            userData, 
            statsData,
            "[]",
            slug,
            storeData, "[]", "[]", "[]"
        ])
        const token = jwt.sign(
            { id, role: "user" },
            process.env.CHAVE_SECRETA,
            { expiresIn: "60d" }
        )
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 60 * 24 * 60 * 60 * 1000
        })
        return res.redirect("/dashboard")
    } catch (error) {
        return res.status(500).json({
            status: false,
            info: "",
            message: "Erro na aplicação. " + error.message
        })
    }
})



router.post("/sigin", async (req, res) => {
  const { email, password } = req.body, cleanEmail = email?.trim().toLowerCase();
  
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return res.status(400).json({
        status: false,
        info: "",
        message: "O e-mail é inválido."
    })
    if (!password) return res.status(400).json({
        status: false,
        info: "",
        message: "A senha é obrigatória." 
    })
    try {
    const rows = (await db.get()).data || [], userRow = rows.find(r => r[1]?.toLowerCase() === cleanEmail)
    if (!userRow) return res.status(404).json({
        status: false, 
        info: "",
        message: "Usuário não encontrado."
    })
    const userObj = typeof userRow[2] === 'string' ? JSON.parse(userRow[2]) : userRow[2]
    const [slat, hashSalvo] = userObj.password.split(':')
    const hashReq = crypto.scryptSync(password, slat, 64).toString('hex')
    if (hashReq !== hashSalvo) return res.status(401).json({ 
        status: false,
        info: "", 
        message: "Senha incorreta." 
    })
    const storeObj = typeof userRow[6] === 'string' ? JSON.parse(userRow[6]) : userRow[6]
        const token = jwt.sign(
            { id: userRow[0], role: userObj.role || "user" },
            process.env.CHAVE_SECRETA,
            { expiresIn: "60d" }
        )
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 60 * 24 * 60 * 60 * 1000
        })
        return res.redirect("/dashboard")
    } catch (error) {
        return res.status(500).json({ 
            status: false,
            info: "",
            message: "Erro na aplicação. " + error.message 
        })
    }
})



router.get("/logout", (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict"
    });
    
    return res.redirect("/authentication");
})

router.get("/logged", (req, res) => {
    const token = req.cookies.token
    if(!token) return res.status(401).json({logged: false})
    try{
        const user = jwt.verify(token, process.env.CHAVE_SECRETA)
        return res.json({logged: true})
    }catch{
        return res.status(401).json({logged: false})
    }
})




router.get("/profile", authentication, async (req, res) => {
  try {const rows = (await db.get()).data || [],

    nowMz = new Date().toLocaleString("pt-MZ", {
        timeZone: "Africa/Maputo" 
    })
    isAdmin = ["adm", "admin"].includes(req.user?.role), 
    parse = v => typeof v === "string" ? (v.startsWith("{") || v.startsWith("[") ? JSON.parse(v) : v) : v;
    const formatRow = async (r, i) => { 
        let u = parse(r[2]) || {}; 
        u.updatedAt = nowMz; await db.update(`C${i + 1}`, [u]); 
        delete u.password;
        return { 
            id: r[0],
            email: r[1],
            profile: u, wallet: parse(r[3]),
            transactions: parse(r[4]),
            slug: r[5], 
            ecommerce: parse(r[6]),
            products: parse(r[7]),
            orders: parse(r[8]) 
        }
    }
    const dataRows = rows.filter(
        (r, i) => i > 0 || !isNaN(Date.parse(r[2]?.createdAt || r[0]))
    )
    if (!isAdmin) { 
        const i = rows.findIndex(r => r[0] === req.user?.id)
        if (i === -1) return res.status(404).json({
            status: false,
            info: "",
            message: "Usuário não encontrado."
        })
        return res.json({
            status: true,
            info: "",
            message: "Operação realizada com sucesso.",
            data: await formatRow(rows[i], i)
        })
    }
    const allUsers = await Promise.all(
        rows.slice(1).map((r, index) => {
            const originalIndex = index + 1;
            return (r[0] && r[0] !== "id" && r[0] !== "ID") ? formatRow(r, originalIndex) : null;
        })
    )
    return res.json({
        status: true,
        info: "",
        message: "Operação realizada com sucesso.",
        data: allUsers.filter(Boolean) 
    })
  } catch (error) {
        return res.status(500).json({
            status: false,
            info: "", 
            message: "Erro na aplicação. " + error.message
        })
    }
})




router.put("/block/:id", authentication, async (req, res) => {
    try {
        const rows = (await db.get()).data || []
        parse = v => typeof v === "string" ? (v.startsWith("{") ? JSON.parse(v) : v) : v;
        const adminRow = rows.find(r => r[0] === req.user?.id)
        adminProfile = parse(adminRow?.[2] || {})

        if (!["adm", "admin"].includes(adminProfile?.role)) return res.status(403).json(
            { status: false, info: "", message: "Acesso negado." }
        )
        const i = rows.findIndex(r => r[0] === req.params.id)
        if (i === -1) return res.status(404).json(
            { 
                status: false,
                info: "",
                message: "Usuário não encontrado." 
            }
        )
        let profile = parse(rows[i][2]) || {}
        profile.status = !profile.status
        profile.updatedAt = new Date().toLocaleString("pt-MZ", 
            { timeZone: "Africa/Maputo" }
        )
        await db.update(`C${i + 1}`, [profile])
        return res.json(
            { 
                status: true,
                info: "", 
                message: `Usuário ${profile.status ? "desbloqueado" : "bloqueado"} com sucesso.`, 
                newStatus: profile.status 
            }
        )
    } catch (e) { 
        return res.status(500).json(
            { 
                status: false,
                info: "",
                message: e.message 
            }
        )
    }
})




router.put("/senderid", authentication, async (req, res) => {
    try {
        const { senderId } = req.body
        rows = (await db.get()).data || []
        parse = v => typeof v === "string" ? (v.startsWith("{") ? JSON.parse(v) : v) : v;
        if (!senderId || !senderId.trim()) return res.status(400).json(
            { 
                status: false,
                info: "", 
                message: "Informe um SenderID válido." 
            }
        )
        const i = rows.findIndex(r => ["adm", "admin"].includes(parse(r[2] || {})?.role))
        if (i === -1) return res.status(403).json(
            { 
                status: false,
                info: "", 
                message: "Administrador não encontrado." 
            }
        )
        let profile = parse(rows[i][2]) || {}
        profile.config = profile.config || { senderId: [] }
        if (profile.config.senderId.length >= 9) return res.status(400).json(
            {
                status: false,
                info: "", 
                message: "Limite máximo de 9 SenderIDs atingido."
            }
        )
        profile.config.senderId.push(senderId.trim())
        profile.updatedAt = new Date().toLocaleString("pt-MZ", { timeZone: "Africa/Maputo" })
        await db.update(`C${i + 1}`, [profile])
        return res.json(
            { 
                status: true,
                info: "", 
                message: "SenderID registrado com sucesso!", 
                senderIds: profile.config.senderId 
            }
        )
    } catch (e) {
        return res.status(500).json(
            { 
                status: false, 
                info: "",
                message: e.message 
            }
        )
    }
})




router.delete("/senderid", authentication, async (req, res) => {
    try {
        const { senderId } = req.body
        rows = (await db.get()).data || [], 
        parse = v => typeof v === "string" ? (v.startsWith("{") ? JSON.parse(v) : v) : v
        
        const i = rows.findIndex(r => ["adm", "admin"].includes(parse(r[2] || {})?.role))
        if (i === -1) return res.status(403).json(
            { 
                status: false, 
                info: "",
                message: "Acesso negado." 
            }
        )
        let profile = parse(rows[i][2]) || {}
        profile.config = profile.config || { senderId: [] }

        profile.config.senderId = profile.config.senderId.filter(s => s !== senderId)
        profile.updatedAt = new Date().toLocaleString("pt-MZ", { timeZone: "Africa/Maputo" })
        await db.update(`C${i + 1}`, [profile])
        return res.json(
            { 
                status: true,
                info: "", 
                message: "SenderID removido com sucesso!", 
                senderIds: profile.config.senderId 
            }
        )
    } catch (e) {
        return res.status(500).json(
            { 
                status: false,
                info: "", 
                message: e.message 
            }
        )
    }
})



router.post("/campaign", authentication, async (req, res) => {
    try {
        const { emails, title, message, senderId } = req.body
        rows = (await db.get()).data || []
        parse = v => typeof v === "string" ? (v.startsWith("{") ? JSON.parse(v) : v) : v;
        const adminRow = rows.find(r => r[0] === req.user?.id)

        if (!["adm", "admin"].includes(parse(adminRow?.[2] || {})?.role)) return res.status(403).json(
            { 
                status: false,
                info: "", 
                message: "Acesso negado." 
            }
        )
        if (!emails?.length || !title || !message || !senderId) return res.status(400).json(
            { 
                status: false,
                info: "", 
                message: "Todos os campos são obrigatórios." 
            }
        )
        const scriptUrl = 'https://script.google.com/macros/s/AKfycbw1L3RKYZg-m6o4jH_OMduJlfIMybbAa2hDLF3Qc0Xe-tPd5FItiwiBpLYu9LRTDFHnDg/exec'
        const apiRes = await fetch(scriptUrl, {
            method: 'POST', 
            body: JSON.stringify(
                { 
                    email: emails,
                    title, 
                    message, 
                    senderId 
                }
            ) 
        }).then(r => r.json())
        
        return res.json(
            { 
                status: apiRes.status === 'success',
                info: "", 
                message: apiRes.message 
            }
        )
    } catch (e) { 
        return res.status(500).json(
            { 
                status: false, 
                info: "",
                message: e.message 
            }
        )
    }
})




router.put("/numpayment", authentication, async (req, res) => {
    try {
        const { number } = req.body, 
        rows = (await db.get()).data || [], parse = v => typeof v === "string" ? (v.startsWith("{") ? JSON.parse(v) : v) : v;
        if (!number || !/^\d{9}$/.test(number.trim())) return res.status(400).json(
            { 
                status: false, 
                info: "",
                message: "Número inválido. Deve conter 9 dígitos." 
            }
        )
        const i = rows.findIndex(r => r[0] === req.user?.id)
        if (i === -1) return res.status(404).json(
            { 
                status: false, 
                info: "",
                message: "Usuário não encontrado." 
            }
        )
        let wallet = parse(rows[i][3]) || { processed_total: 0, total_transactions: 0, unprocessed_total: 0 }
        wallet.transaction_number = number.trim()
        await db.update(`D${i + 1}`, [wallet])
        return res.json(
            { 
                status: true, 
                info: "",
                message: "Número salvo com sucesso!" 
            }
        )
    } catch (e) {
        return res.status(500).json(
            { 
                status: false, 
                info: "",
                message: e.message 
            }
        )
    }
})


module.exports = router