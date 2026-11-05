const express = require("express")
const router = express.Router()
const sharp = require("sharp")
const crypto = require("crypto")
const jwt = require('jsonwebtoken')
const { randomUUID } = require('crypto')

require('dotenv').config()

const { authentication } = require("../sheets/auth/authjwt.js")
const { db, sheets } = require("../sheets/sheets")



const upImg = async i => { if (!i || typeof i !== "string") return ""
    if (i.startsWith("http")) return i
    const clean = i.includes(",") ? i.split(",")[1] : i
    if (!clean) return ""
    let bufferToUpload = clean
    try {
        const b = await sharp(Buffer.from(clean, "base64")).resize(800, 800, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 60 }).toBuffer();
        bufferToUpload = b.toString("base64")
    } catch (e) {
        console.warn("Falha no Sharp, enviando imagem original:", e.message);
    }
    try {
        const params = new URLSearchParams()
        params.append("image", bufferToUpload)
        params.append("mimeType", "image/jpeg")
        params.append("name", `${Date.now()}.jpg`)
        const res = await fetch("https://script.google.com/macros/s/AKfycbxpNRGKsVmJp4Yy6kNFVPa68buikeX903xUSpGHL9Qsaxm8BJ63KEY7-s0f9LiCR3GHsg/exec", {
            method: "POST",
            body: params
        }).then(r => r.json())
        return res.url || res.data || ""
    } catch (err) {
        console.error("Erro na api do Script:", err)
        return ""
    }
}



router.post("/add", authentication, async (req, res) => {
    try {
        const { name, price, desc, images } = req.body
        rows = (await db.get()).data || [], 
        safeParse = v => { try { 
            return typeof v === "string" ? JSON.parse(v) : v 
        } catch { return v } }
        const i = rows.findIndex(r => r[0] === req.user?.id); if (i === -1) return res.status(404).json(
            { 
                status: false, 
                info: "",
                message: "Usuário não encontrado." 
            }
        )
        const profile = safeParse(rows[i][2]) || {}
        store = safeParse(rows[i][6]) || {}
        if (profile.status !== true || store.status !== true) return res.status(403).json(
            { 
                status: false, 
                info: "",
                message: "Conta ou loja inativa." 
            }
        )
        let products = safeParse(rows[i][7]) || []
        if (!Array.isArray(products)) products = []
        if (products.length >= 60) return res.status(400).json(
            { 
                status: false, 
                info: "",
                message: "Limite de 60 produtos atingido." 
            }
        )
        if (!name || !price) return res.status(400).json(
            { 
                status: false, 
                info: "",
                message: "Nome e preço são obrigatórios." 
            }
        )
        const imgArr = Array.isArray(images) ? images.slice(0, 3) : (images ? [images] : [])
        const uploadedImgs = await Promise.all(imgArr.map(img => upImg(img)))
        const slugBase = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
        const newProd = { 
            id: crypto.randomUUID(), 
            name, 
            price: Number(price), 
            desc: (desc || "").slice(0, 150), 
            images: uploadedImgs.filter(Boolean), 
            createdAt: new Date().toLocaleString("pt-MZ", { timeZone: "Africa/Maputo" }), 
            slug: `${slugBase}-${Math.random().toString(36).substring(2, 8)}`, 
            views: 0, 
            status: true, 
            visibility: "show" 
        }
        products.push(newProd)
        await db.update(`H${i + 1}`, [products])
        return res.json(
            { 
                status: true, 
                info: "",
                message: "Produto cadastrado com sucesso!", 
                product: newProd 
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





router.put("/update", authentication, async (req, res) => {
    try {
        const { id, name, price, desc, images } = req.body
        rows = (await db.get()).data || [], 
        safeParse = v => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; } }
        const i = rows.findIndex(r => r[0] === req.user?.id)
        if (i === -1) return res.status(404).json(
            { 
                status: false, 
                info: "",
                message: "Usuário não encontrado." 
            }
        )
        let products = safeParse(rows[i][7]) || []
        if (!Array.isArray(products)) products = []
        const pIdx = products.findIndex(p => String(p.id).trim() === String(id).trim())
        if (pIdx === -1) return res.status(404).json(
            { 
                status: false, 
                message: "Produto não encontrado." 
            }
        )
        let currentImgs = [...(products[pIdx].images || [])]
        if (Array.isArray(images)) {
            for (const imgItem of images) {
                const imgData = typeof imgItem === "object" ? imgItem.data : imgItem, targetIdx = typeof imgItem === "object" ? imgItem.index : undefined;
                if (!imgData) continue
                const uploadedUrl = await upImg(imgData)
                if (!uploadedUrl) continue
                if (Number.isInteger(targetIdx) && targetIdx >= 0 && targetIdx < 3) currentImgs[targetIdx] = uploadedUrl;
                else if (currentImgs.length < 3) currentImgs.push(uploadedUrl)
            }
        }
        if (name) {
            products[pIdx].name = name; 
            products[pIdx].slug = `${name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}-${Math.random().toString(36).substring(2, 8)}`
        }
        if (price !== undefined) products[pIdx].price = Number(price)
        if (desc !== undefined) products[pIdx].desc = desc.slice(0, 150)
        products[pIdx].images = currentImgs.slice(0, 3)
        await db.update(`H${i + 1}`, [products])
        return res.json(
            { 
                status: true,
                info: "", 
                message: "Produto atualizado com sucesso!", 
                product: products[pIdx] 
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




router.delete("/destroy", authentication, async (req, res) => {
    try {
        const { id } = req.body
        rows = (await db.get()).data || []
        afeParse = v => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; } };
        const i = rows.findIndex(r => r[0] === req.user?.id)
        if (i === -1) return res.status(404).json(
            { 
                status: false, 
                info: "",
                message: "Usuário não encontrado." 
            }
        )
        let products = safeParse(rows[i][7]) || []
        if (!Array.isArray(products)) products = []
        const filtered = products.filter(p => String(p.id).trim() !== String(id).trim())
        if (filtered.length === products.length) return res.status(404).json(
            { 
                status: false, 
                info: "",
                message: "Produto não encontrado." 
            }
        )
        await db.update(`H${i + 1}`, [filtered])
        return res.json(
            { 
                status: true,
                info: "",
                message: "Produto removido com sucesso!" 
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





router.put("/visibility", authentication, async (req, res) => {
    try {
        const { id } = req.body, 
        rows = (await db.get()).data || [], 
        safeParse = v => { 
            try { 
                return typeof v === "string" ? JSON.parse(v) : v; 
            } catch {
                return v
            } 
        }
        const i = rows.findIndex(r => r[0] === req.user?.id)
        if (i === -1) return res.status(404).json(
            { 
                status: false, 
                info: "",
                message: "Usuário não encontrado." 
            }
        )
        let products = safeParse(rows[i][7]) || [] 
        if (!Array.isArray(products)) products = []
        const pIndex = products.findIndex(p => String(p.id).trim() === String(id).trim())
        if (pIndex === -1) return res.status(404).json(
            { 
                status: false, 
                info: "",
                message: "Produto não encontrado." 
            }
        )
        products[pIndex].visibility = products[pIndex].visibility === "hidden" ? "show" : "hidden"
        await db.update(`H${i + 1}`, [products])
        return res.json(
            { 
                status: true,
                info: "", 
                message: `Visibilidade alterada para ${products[pIndex].visibility}!`, visibility: products[pIndex].visibility 
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





router.get("/:slug/:itemId", async (req, res) => {
    try {
        const { slug, itemId } = req.params;

        const safeParse = v => { 
            try { return typeof v === "string" ? JSON.parse(v) : v } 
            catch { return v } 
        };

        const rows = (await db.get()).data || [];

        // 1. Busca o usuário/loja pelo slug da loja (coluna 6 do BD)
        const userRow = rows.find(r => {
            const store = safeParse(r[6]) || {};
            return store.slug === slug;
        });

        if (!userRow) {
            return res.status(404).json({
                status: false,
                info: "",
                message: "Loja não encontrada."
            });
        }

        // 2. Validações da Conta e da Loja
        const profile = safeParse(userRow[2]) || {};
        const store = safeParse(userRow[6]) || {};

        if (profile.status !== true || store.status !== true) {
            return res.status(403).json({
                status: false,
                info: "",
                message: "Loja inativa no momento."
            });
        }

        // 3. Busca a lista de produtos (coluna 7/H)
        const products = safeParse(userRow[7]) || [];
        if (!Array.isArray(products)) {
            return res.status(404).json({
                status: false,
                info: "",
                message: "Nenhum produto cadastrado."
            });
        }

        // 4. Busca o produto pelo itemId (que equivale à slug do produto) ou pelo ID
        const product = products.find(p => p.slug === itemId || p.id === itemId);

        if (!product) {
            return res.status(404).json({
                status: false,
                info: "",
                message: "Produto não encontrado."
            });
        }

        // 5. Verifica se o produto está visível
        if (product.status === false || product.visibility === "hide") {
            return res.status(404).json({
                status: false,
                info: "",
                message: "Produto indisponível."
            });
        }

        // 6. Retorna o produto com confirmação de loja ativa
        return res.json({
            status: true,
            info: "",
            message: "Produto encontrado com sucesso.",
            storeActive: true,
            store: {
                name: store.name || "",
                slug: store.slug,
                phone: store.phone || ""
            },
            product
        });

    } catch (e) {
        return res.status(500).json({
            status: false,
            info: "",
            message: e.message
        });
    }
});




module.exports = router










const express = require("express")
const router = express.Router()
const crypto = require("crypto")
const jwt = require('jsonwebtoken')
const { randomUUID } = require('crypto')

require('dotenv').config()

const { authentication } = require("../sheets/auth/authjwt.js")
const { db, sheets } = require("../sheets/sheets")



router.get("/:slug", async (req, res) => {
    try {
        const rows = (await db.get()).data || [],
        safeParse = v => { try { return typeof v === "string" ? JSON.parse(v) : v } catch { return v } }
        const row = rows.find(r => r[5] === req.params.slug)
        if (!row) return res.status(404).json(
            {
                status: false,
                info: "",
                message: "Loja não encontrada."
            }
        )
        const profile = safeParse(row[2]) || {}
        store = safeParse(row[6]) || {}
        products = safeParse(row[7]) || []
        if (profile.status !== true || store.status !== true) return res.status(403).json(
            {
                status: false,
                info: "",
                message: "Loja indisponível no momento."
            }
        )
        const parseDate = d => {
            if (!d) return 0
            if (typeof d === "number") return d
            const parts = String(d).split(/[\/\s,:-]+/)
            return parts.length >= 3 ? new Date(parts[2], parts[1] - 1, parts[0], parts[3] || 0, parts[4] || 0).getTime() : new Date(d).getTime();
        }
        const now = Date.now()
        trialEnd = parseDate(store.subscription?.periodEnd)
        if (trialEnd > 0 && now > trialEnd) return res.status(403).json(
            {
                status: false,
                info: "",
                message: "Loja indisponível no momento."
            }
        )
        store.metrics = store.metrics || { totalViews: 0, totalSales: 0 }
        store.metrics.totalViews = (Number(store.metrics.totalViews) || 0) + 1
        const rowIndex = rows.indexOf(row) + 1
        await db.update(`G${rowIndex}`, [store])
        return res.json(
            {
                status: true,
                info: "",
                message: "Operação realizada com sucesso!",
                store,
                products: Array.isArray(products) ? products.filter(p => p.status !== false && p.visibility !== "hidden") : []
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




router.put("/update", authentication, async (req, res) => {
    try {
        const { name, whatsapp, description } = req.body,
            rows = (await db.get()).data || [],
            parse = v => typeof v === "string" ? (v.startsWith("{") ? JSON.parse(v) : v) : v;
        if (!name || !name.trim()) return res.status(400).json(
            {
                status: false,
                info: "",
                message: "O nome da loja é obrigatório."
            }
        )
        const i = rows.findIndex(r => r[0] === req.user?.id);
        if (i === -1) return res.status(404).json(
            {
                status: false,
                info: "",
                message: "Usuário não encontrado."
            }
        )
        let storeData = parse(rows[i][6]) || {};
        storeData.ecommerce = {
            ...storeData.ecommerce,
            name: name.trim(),
            whatsapp: (whatsapp || "").trim(),
            description: (description || "").trim()
        }
        await db.update(`G${i + 1}`, [storeData]);
        return res.json(
            {
                status: true,
                info: "",
                message: "Informações da loja atualizadas com sucesso!"
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





router.post("/subscription/renew", authentication, async (req, res) => {
    try {
        const safeParse = v => {
            try { return typeof v === "string" ? JSON.parse(v) : v; }
            catch { return v }
        }
        const userId = req.user?.id || req.user?.slug || req.userId;
        if (!userId) {
            return res.status(401).json(
                {
                    status: false,
                    message: "Usuário não autenticado.",
                    info: "null"
                }
            )
        }
        const rows = (await db.get()).data || [];
        const row = rows.find(r => r[0] === userId || r[5] === userId);
        if (!row) {
            return res.status(404).json(
                {
                    status: false,
                    message: "Usuário/Loja não encontrado.",
                    info: "null"
                }
            )
        }
        const profile = safeParse(row[2]) || {}
        const store = safeParse(row[6]) || {}
        if (profile.status !== true || store.status !== true) {
            return res.status(403).json(
                {
                    status: false,
                    message: "Conta ou loja indisponível.",
                    info: "null"
                }
            )
        }
        const now = new Date()
        const dateMz = now.toLocaleString("pt-MZ", { timeZone: "Africa/Maputo" })
        const endDate = new Date(now.getTime() + 30 * 86400000).toLocaleString("pt-MZ", { timeZone: "Africa/Maputo" });
        store.subscription = store.subscription || {};
        const currentBillingCycle = Number(store.subscription.billingCycle) || 0;
        store.subscription = {
            periodStart: dateMz,
            periodEnd: endDate,
            billingCycle: currentBillingCycle + 1
        }
        const rowIndex = rows.indexOf(row) + 1;
        await db.update(`G${rowIndex}`, [store])
        return res.json({
            status: true,
            message: "Subscrição renovada com sucesso.",
            info: {
                subscription: store.subscription,
                updatedAt: dateMz
            }
        })
    } catch (e) {
        return res.status(500).json(
            {
                status: false,
                message: e.message,
                info: "null"
            }
        )
    }
})





router.post("/ord/:slug", async (req, res) => {
    try {
        const rows = (await db.get()).data || [], 
        safeParse = v => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; } }, parseDate = d => { if (!d) return 0; const p = String(d).split(/[\/\s,:-]+/); return p.length >= 3 ? new Date(p[2], p[1] - 1, p[0], p[3] || 0, p[4] || 0).getTime() : new Date(d).getTime(); };
        const rowIndex = rows.findIndex(r => r[5] === req.params.slug)
        if (rowIndex === -1) return res.status(404).json(
            { 
                status: false, 
                info: "",
                message: "Loja não encontrada." 
            }
        )
        const row = rows[rowIndex]
        profile = safeParse(row[2]) || {}
        store = safeParse(row[6]) || {}
        products = safeParse(row[7]) || [] 
        orders = safeParse(row[8]) || []
        if (profile.status !== true || store.status !== true || (parseDate(store.subscription?.periodEnd) > 0 && Date.now() > parseDate(store.subscription?.periodEnd))) return res.status(403).json(
            { 
                status: false, 
                info: "",
                message: "Loja indisponível." 
            }
        )
        const { costumer, items } = req.body
        if (!costumer?.name || !costumer?.whatsapp || !Array.isArray(items) || !items.length) return res.status(400).json(
            { 
                status: false, 
                info: "",
                message: "Dados do pedido inválidos." 
            }
        )
        const now = Date.now(), sixtyDaysMs = 60 * 24 * 60 * 60 * 1000
        let validOrders = orders.filter(o => (now - parseDate(o.creatAt)) <= sixtyDaysMs)
        if (validOrders.length >= 90) return res.status(400).json(
            { 
                status: false, 
                info: "",
                message: "Limite de pedidos atingido." 
            }
        )
        let totalAmount = 0, msgItems = []
        const orderProducts = items.map(i => {
            const prod = products.find(p => String(p.id).trim() === String(i.id).trim())
            const price = Number(prod?.price) || 0, subtotal = price * Number(i.qtd || 1)
            totalAmount += subtotal
            if (prod) msgItems.push(`- ${i.qtd}x *${prod.name}* (${subtotal.toLocaleString("pt-MZ")} MT)`)
            return { id: i.id, qtd: Number(i.qtd || 1) };
        })
        const orderId = 'L' + Math.floor(10000 + Math.random() * 90000)
        const dateMz = new Date().toLocaleString("pt-MZ", { timeZone: "Africa/Maputo" })
        const unicId = crypto.randomUUID()
        const newOrder = { 
            id: unicId, 
            orderCode: orderId, 
            status: "pendente", 
            creatAt: dateMz, 
            costumer: { 
                name: costumer.name.trim(), 
                whatsapp: costumer.whatsapp.trim(), 
                adress: costumer.adress || "", 
                note: costumer.note || "" 
            }, 
            oreder: { 
                prodct: orderProducts, 
                lojium_payment: { paid: false, date: "" }, 
                total_ammount: totalAmount 
            } 
        }
        validOrders.push(newOrder)
        await db.update(`I${rowIndex + 1}`, [validOrders])
        const waNum = store.ecommerce?.whatsapp?.replace(/\D/g, "")
        if (!waNum) return res.json(
            { 
                status: true, 
                info: "",
                message: "Pedido registrado!", 
                redirect: "successpage" 
            }
        )
        let linkPay = `https://lojium.vercel.app/c/${req.params.slug}/${unicId}`
        const waText = `🛍️ *NOVO PEDIDO - ${store.ecommerce?.name || "Loja"}*\n\n*NOME:* ${costumer.name}\n*WHATSAPP:* ${costumer.whatsapp}\n*ENDEREÇO:* ${costumer.adress || "N/A"}\n*CODIGO: #${orderId}*\n\n*OBSERVAÇÕES:* ${costumer.note || ""}\n\n📦 *ITENS:* \n${msgItems.join("\n")}\n\n *TOTAL:* ${totalAmount.toLocaleString("pt-MZ")} MT\n\n *LINK DE PAGAMENTO:*\n ${linkPay}`;
        return res.json(
            { 
                status: true, 
                info: "",
                message: "Pedido enviado!", 
                redirect: `https://wa.me/${waNum.startsWith("258") ? waNum : "258" + waNum}?text=${encodeURIComponent(waText)}` 
            }
        )
    } catch (e) { 
        return res.status(500).json(
            { 
                status: false, 
                message: e.message 
            }
        )
    }
})




router.put("/ord/status", authentication, async (req, res) => {
    try {
        const { orderId, status } = req.body,
        validStatuses = ["pendente", "finalizado", "rejeitado"]
        if (!orderId || !validStatuses.includes(status)) return res.status(400).json(
            { 
                status: false, 
                info: "",
                message: "Parâmetros inválidos." 
            }
        )
        const safeParse = v => { 
            try { return typeof v === "string" ? JSON.parse(v) : v; } catch { 
                return v; 
            }
        } 
        rows = (await db.get()).data || []
        const rowIndex = rows.findIndex(r => String(r[0]) === String(req.user.id))
        if (rowIndex === -1 || safeParse(rows[rowIndex][2])?.status !== true) return res.status(403).json(
            { 
                status: false, 
                info: "",
                message: "Acesso negado ou conta inativa." 
            }
        )
        const orders = safeParse(rows[rowIndex][8]) || [] 
        idx = orders.findIndex(o => String(o.id) === String(orderId) || String(o.orderCode) === String(orderId))
        if (idx === -1) return res.status(404).json(
            { 
                status: false,
                info: "", 
                message: "Pedido não encontrado." 
            }
        )
        if (["finalizado", "rejeitado"].includes(orders[idx].status)) return res.status(400).json(
            { 
                status: false, 
                info: "",
                message: "Pedidos finalizados ou rejeitados não podem ser alterados." 
            }
        )
        orders[idx].status = status; await db.update(`I${rowIndex + 1}`, [orders])
        return res.json(
            { 
                status: true, 
                info: "",
                message: "Status atualizado com sucesso!" 
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








const express = require("express")
const router = express.Router()
const path = require("path")
const fs = require("fs")
require("dotenv").config()


const cssAbdulfaquir = path.join(__dirname, '../public/src/abdulfaquir.css')
const cssDashboard = path.join(__dirname, '../public/src/dashboard.css')
const cssEcommerce = path.join(__dirname, '../public/src/ecommerce.css')
const cssPublics = path.join(__dirname, '../public/src/publics.css')

const jsPublics = path.join(__dirname, '../public/src/publics.js')
const jsDashboard = path.join(__dirname, '../public/src/dashboard.js')
const jsEcommerce = path.join(__dirname, '../public/src/ecommerce.js')


const cssFileAbdulfaquir = fs.existsSync(cssAbdulfaquir) ? fs.readFileSync(cssAbdulfaquir, 'utf8') : ''
const cssFileDashboard = fs.existsSync(cssDashboard) ? fs.readFileSync(cssDashboard, 'utf8') : ''
const cssFileEcommerce = fs.existsSync(cssEcommerce) ? fs.readFileSync(cssEcommerce, 'utf8') : ''
const cssFilePublics = fs.existsSync(cssPublics) ? fs.readFileSync(cssPublics, 'utf8') : ''

const jsFilePublics = fs.existsSync(jsPublics) ? fs.readFileSync(jsPublics, 'utf8') : ''
const jsFileDashboard = fs.existsSync(jsDashboard) ? fs.readFileSync(jsDashboard, 'utf8') : ''
const jsFileEcommerce = fs.existsSync(jsEcommerce) ? fs.readFileSync(jsEcommerce, 'utf8') : ''


const { authentication } = require("../sheets/auth/authjwt.js")
const { db, sheets } = require("../sheets/sheets")


router.get("/", (req, res) => {
  fs.readFile(path.join(__dirname, "../public/views/publics.html"), "utf8", (err, html) => {
    if (err) return res.status(500).send("ERROR: Erro ao renderizar a pagina " + err.message)
    const file = html
      .replace("{{title}}", "Lojium empreendimentos")
      .replace("{{path}}", "ladingpage")
      .replace("{{ogTitle}}", `Simplifique suas vendas. Escale seu negócio`)
      .replace("{{ogDescription}}", `Solução completa para gestão e venda online. Crie a sua loja digital, controle seu catálogo e centralize todos os pedidos no WhatsApp. Começe gratuitamente`)
      .replace("{{ogImage}}", `https://i.ibb.co/LDv4vb7V/lojium.png`)
      .replace("{{ogUrl}}", `https://lojium.vercel.app`)

      .replace("</head>", `<style>${cssFilePublics}</style></head>`)
      .replace("</body>", `<script>${jsFilePublics}</script></body>`)
    res.send(file)
  })
})



router.get("/authentication", (req, res) => {
  fs.readFile(path.join(__dirname, "../public/views/publics.html"), "utf8", (err, html) => {
    if (err) return res.status(500).send("ERROR: Erro ao renderizar a pagina " + err.message)
    const file = html
      .replace("{{title}}", "Autenticação")
      .replace("{{path}}", "authentication")
      .replace("{{ogTitle}}", `ACESSAR A PLATAFORMA - LOJIUM`)
      .replace("{{ogDescription}}", `Entre na sua Conta ou Crie uma Conta, 100% seguro com criptografia`)
      .replace("{{ogImage}}", `https://i.ibb.co/gbYmcVFz/logo.jpg`)
      .replace("{{ogUrl}}", `https://lojium.vercel.app/authentication`)

      .replace("</head>", `<style>${cssFilePublics}</style></head>`)
      .replace("</body>", `<script>${jsFilePublics}</script></body>`)
    res.send(file)
  })
})


router.get("/politica", (req, res) => {
  fs.readFile(path.join(__dirname, "../public/views/publics.html"), "utf8", (err, html) => {
    if (err) return res.status(500).send("ERROR: Erro ao renderizar a pagina " + err.message)
    const file = html
      .replace("{{title}}", "Politica de privacidade")
      .replace("{{path}}", "politica")
      .replace("{{ogTitle}}", `Politica de privacidade`)
      .replace("{{ogDescription}}", `Politica de privacidade`)
      .replace("{{ogImage}}", `https://i.ibb.co/gbYmcVFz/logo.jpg`)
      .replace("{{ogUrl}}", `https://lojium.vercel.app/authentication`)

      .replace("</head>", `<style>${cssFilePublics}</style></head>`)
      .replace("</body>", `<script>${jsFilePublics}</script></body>`)
    res.send(file)
  })
})



router.get("/dashboard", authentication, (req, res) => {
  let view = "dashboard_use"
  const role = req.user.role
  if(role === "adm") view = "dashboard_adm"

  fs.readFile(path.join(__dirname, "../public/views/dashboard.html"), "utf8", (err, html) => {
    if (err) return res.status(500).send("ERROR: Erro ao renderizar a pagina " + err.message)
    const file = html
      .replace("{{title}}", "Dashboard")
      .replace("{{path}}", view)
      .replace("{{ogTitle}}", `O ECOSISTEMA COMPLETO PARA A SUA LOJA`)
      .replace("{{ogDescription}}", `O ECOSISTEMA COMPLETO PARA A SUA LOJA`)
      .replace("{{ogImage}}", `https://i.ibb.co/gbYmcVFz/logo.jpg`)
      .replace("{{ogUrl}}", `https://lojium.vercel.app/dashboard`)

      .replace("</head>", `<style>${cssFileDashboard}</style></head>`)
      .replace("</body>", `<script>${jsFileDashboard}</script></body>`)
    res.send(file)
  })
})


router.get("/marketplace", (req, res) => {
  fs.readFile(path.join(__dirname, "../public/views/ecommerce.html"), "utf8", (err, html) => {
    if (err) return res.status(500).send("ERROR: Erro ao renderizar a pagina " + err.message)
    const file = html
      .replace("{{title}}", "Marketplace")
      .replace("{{path}}", "ecommerce_marketplace")
      .replace("{{ogTitle}}", `Compre e venda qualquer produto na lojium`)
      .replace("{{ogDescription}}", "O ECOSISTEMA COMPLETO PARA A SUA LOJA")
      .replace("{{ogImage}}", `https://i.ibb.co/gbYmcVFz/logo.jpg`)
      .replace("{{ogUrl}}", `https://lojium.vercel.app/${req.params.slug}`)

      .replace("</head>", `<style>${cssFileEcommerce}</style></head>`)
      .replace("</body>", `<script>${jsFileEcommerce}</script></body>`)
    res.send(file)
  })
})


router.get("/abdulfaquir", (req, res) => {
  fs.readFile(path.join(__dirname, "../public/views/abdulfaquir.html"), "utf8", (err, html) => {
    if (err) return res.status(500).send("ERROR: Erro ao renderizar a pagina " + err.message)
    const file = html
     .replace("{{title}}", "ABDUL FAQUIR")
     .replace("{{path}}", "abdulfaquir")
     .replace("{{ogTitle}}", `OLÁ SOU ABDUL FAQUIR ESPECIALISTA EM WEB DEVELOPER`)
     .replace("{{ogDescription}}", `Criação de Website | Aplicações Web | Paginas de Vendas`)
     .replace("{{ogImage}}", `https://i.ibb.co/27CV8Cw4/abdulfaquir.jpg`)
     .replace("{{ogUrl}}", `https://lojium.vercel.app/abdulfaquir`)

     .replace("</head>", `<style>${cssFileAbdulfaquir}</style></head>`)
     .replace("</body>", `<script>${"js"}</script></body>`)
    res.send(file)
  })
})




router.get("/:slug", (req, res) => {
  fs.readFile(path.join(__dirname, "../public/views/ecommerce.html"), "utf8", (err, html) => {
    if (err) return res.status(500).send("ERROR: Erro ao renderizar a pagina " + err.message)
    const file = html
      .replace("{{title}}", `${req.params.slug}`)
      .replace("{{path}}", "slugstore")
      .replace("{{ogTitle}}", `O ECOSISTEMA COMPLETO PARA A SUA LOJA`)
      .replace("{{ogDescription}}", `${req.params.slug} - O ECOSISTEMA COMPLETO PARA A SUA LOJA`)
      .replace("{{ogImage}}", `https://i.ibb.co/gbYmcVFz/logo.jpg`)
      .replace("{{ogUrl}}", `https://lojium.vercel.app/${req.params.slug}`)

      .replace("</head>", `<style>${cssFileEcommerce}</style></head>`)
      .replace("</body>", `<script>${jsFileEcommerce}</script></body>`)
    res.send(file)
  })
})



router.get("/c/:slug/:inteId", (req, res) => {
  fs.readFile(path.join(__dirname, "../public/views/ecommerce.html"), "utf8", (err, html) => {
    if (err) return res.status(500).send("LOJIUM ERROR: Erro ao renderizar a pagina " + err.message)
    const file = html
      .replace("{{title}}", "Lojium payment")
      .replace("{{path}}", "checkout")
      .replace("{{ogTitle}}", `O ECOSISTEMA COMPLETO PARA A SUA LOJA`)
      .replace("{{ogDescription}}", `O ECOSISTEMA COMPLETO PARA A SUA LOJA - LOJIUM PAYMENT`)
      .replace("{{ogImage}}", `https://i.ibb.co/gbYmcVFz/logo.jpg`)
      .replace("{{ogUrl}}", `https://lojium.vercel.app/checkout/${req.params.slug}/${req.params.inteId}`)

      .replace("</head>", `<style>${cssFileEcommerce}</style></head>`)
      .replace("</body>", `<script>${jsFileEcommerce}</script></body>`)
    res.send(file)
  })
})



router.get("/p/:slug/:inteId", (req, res) => {
  fs.readFile(path.join(__dirname, "../public/views/ecommerce.html"), "utf8", (err, html) => {
    if (err) return res.status(500).send("LOJIUM ERROR: Erro ao renderizar a pagina " + err.message)
    const file = html
      .replace("{{title}}", "Lojium pamoção")
      .replace("{{path}}", "promocao")
      .replace("{{ogTitle}}", `O ECOSISTEMA COMPLETO PARA A SUA LOJA`)
      .replace("{{ogDescription}}", `O ECOSISTEMA COMPLETO PARA A SUA LOJA - LOJIUM PAYMENT`)
      .replace("{{ogImage}}", `https://i.ibb.co/gbYmcVFz/logo.jpg`)
      .replace("{{ogUrl}}", `https://lojium.vercel.app/c/${req.params.slug}/${req.params.inteId}`)

      .replace("</head>", `<style>${cssFileEcommerce}</style></head>`)
      .replace("</body>", `<script>${jsFileEcommerce}</script></body>`)
    res.send(file)
  })
})

module.exports = router
