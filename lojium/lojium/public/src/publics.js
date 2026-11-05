document.addEventListener("DOMContentLoaded", async () => {
    const path = document.getElementById("body_path")?.dataset?.res
    const getEl = id => document.getElementById(id)
    
    getEl("lojium_public").style.display = "block"
    if (path === "ladingpage") {
        getEl("public_ladingpage").style.display = "block"
    }
    else if (path === "authentication") {
        getEl("public_ladingpage").style.display = "none"
        getEl("public_authentication").style.display = "block"
        const resp = await fetch("/api/usuarios/logged")
        const isLoged = await resp.json()
        if (isLoged.logged) {
            bubble("success", "Usuario logado com sucesso!")
            setTimeout(() => {
                window.location.href = "/dashboard"
            }, 1000)
        }
    }
    else if (path === "politica") {
        getEl("public_ladingpage").style.display = "none"
        getEl("public_politica").style.display = "block"
    }
})

function bubble(type, message) {
    const config = { message: message, position: 'topRight', timeout: 4000 }
    if (type === 'error') { iziToast.error({ title: 'Erro', ...config }) }
    else if (type === 'warn' || type === 'warning') { iziToast.warning({ title: 'Atenção', ...config }) }
    else { iziToast.success({ title: 'Sucesso', ...config }) }
}

function authNav(a) {
    ["authentication_signin", "authentication_signup", "authentication_rstpassemail"]
        .forEach(p => document.getElementById(p).style.display = "none")
    document.getElementById(a).style.display = "block"
}


async function auth_addusers() {
    const ip = (id) => document.getElementById(id).value; const btn = document.getElementById("btn_up");
    if (!ip("store_name")) return bubble("error", "Porfavor informe o nome da sua loja");
    if (!ip("store_slug")) return bubble("error", "Porfavor informe a slug da sua loja");
    if (!ip("use_name")) return bubble("error", "Porfavor informe o seu nome completo");
    if (!ip("use_email")) return bubble("error", "Porfavor informe o seu email");
    if (!ip("use_pass") || ip("use_pass").length < 6) return bubble("error", "Porfavor informe sua senha no min 6 digitos");
    btn.disabled = true; btn.value = "Verificando as informações...";
    try {
        const response = await fetch("/api/usuarios/sigup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                name: ip("use_name"), 
                email: ip("use_email"), 
                password: ip("use_pass"), 
                store: { 
                    name: ip("store_name"), 
                    slug: ip("store_slug") 
                } 
            })
        });
        if (response.redirected) {
            window.location.href = response.url;
            return;
        }
        const res = await response.json(); 
        if (!res.status) { bubble("error", res.message); console.log(res)}
        btn.disabled = false; btn.value = "Acessar a plataforma";
    } catch (error) { 
        btn.disabled = false
        console.log(`Erro no cadastro: ${error.message}`)
        bubble("error", `Erro no login: ${error.message}`)
    }
}


async function auth_checkusers() {
    const input = (id) => document.getElementById(id).value; const btn = document.getElementById("btn_in");
    if (!input("luse_email") || !input("luse_pass")) return bubble("error", "Preencha os dados para continuar");
    btn.disabled = true; btn.value = "Verificando as informações...";
    try {
        const response = await fetch("/api/usuarios/sigin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                email: input("luse_email"), 
                password: input("luse_pass") 
            })
        })
        if (response.redirected) {
            window.location.href = response.url
            return
        }
        const res = await response.json();
        if (!res.status) { bubble("error", res.message); }
        btn.disabled = false; btn.value = "Acessar a plataforma"
    } catch (error) { 
        btn.disabled = false
        console.log(`Erro no login: ${error.message}`) 
    }
}