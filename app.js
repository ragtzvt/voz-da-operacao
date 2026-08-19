// Inicialização do Supabase
const supabaseUrl = 'https://nuawimaiurffhxqetsrj.supabase.co'; 
const supabaseKey = 'sb_publishable_DsDDE8cXPNorqcrdrTiylw_yi89qRYt'; 
const supabaseCliente = supabase.createClient(supabaseUrl, supabaseKey);

// Estado Local do App
const state = {
    filters: { search: "", sort: "recent", stage: "", area: "", tool: "" },
    pagination: { currentPage: 1, itemsPerPage: 5 },
    user: null 
};

// Seletores DOM
const dom = {
    toast: document.getElementById("toast"),
    toastMessage: document.getElementById("toastMessage"),
    
    // Página 1: Login & Cadastro
    loginForm: document.getElementById("loginForm"),
    loginEmail: document.getElementById("loginEmail"),
    loginPassword: document.getElementById("loginPassword"),
    togglePasswordBtn: document.getElementById("togglePasswordBtn"),
    eyeIcon: document.getElementById("eyeIcon"),
    
    registerForm: document.getElementById("registerForm"),
    regEmail: document.getElementById("regEmail"),
    regPassword: document.getElementById("regPassword"),
    regArea: document.getElementById("regArea"),
    
    // Página 2: Formulário
    complaintForm: document.getElementById("complaintForm"),
    complaintTitle: document.getElementById("complaintTitle"),
    complaintDescription: document.getElementById("complaintDescription"),
    complaintStage: document.getElementById("complaintStage"),
    complaintArea: document.getElementById("complaintArea"),
    complaintTool: document.getElementById("complaintTool"),
    
    // Página 3: Mural
    cardsFeed: document.getElementById("cardsFeed"),
    pagination: document.getElementById("pagination"),
    muralSearch: document.getElementById("muralSearch"),
    filterSort: document.getElementById("filterSort"),
    filterStage: document.getElementById("filterStage"),
    filterArea: document.getElementById("filterArea"),
    filterTool: document.getElementById("filterTool"),
    goToFormBtn: document.getElementById("goToFormBtn")
};

// Inicialização do Script
document.addEventListener("DOMContentLoaded", async () => {
    loadLocalSession();
    detectPageAndInit();
});

function loadLocalSession() {
    const saved = localStorage.getItem("voz_user");
    if (saved) state.user = JSON.parse(saved);
}

function detectPageAndInit() {
    if (dom.loginForm) initLoginPage();
    else if (dom.complaintForm) initFormPage();
    else if (dom.cardsFeed) initMuralPage();
}

/* =========================================================================
   PÁGINA 1: LOGIN E CADASTRO (index.html)
   ========================================================================= */
function initLoginPage() {
    localStorage.removeItem("voz_user");
    state.user = null;

    loadAreasForRegister();

    if (dom.togglePasswordBtn) {
        dom.togglePasswordBtn.addEventListener("click", () => {
            const isPassword = dom.loginPassword.type === "password";
            dom.loginPassword.type = isPassword ? "text" : "password";
            dom.eyeIcon.className = isPassword ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
        });
    }

    const loginSection = document.getElementById("loginSection");
    const registerSection = document.getElementById("registerSection");
    const linkToRegister = document.getElementById("linkToRegister");
    const linkToLogin = document.getElementById("linkToLogin");

    if (linkToRegister) {
        linkToRegister.addEventListener("click", (e) => {
            e.preventDefault();
            loginSection.style.display = "none";
            registerSection.style.display = "block";
        });
    }

    if (linkToLogin) {
        linkToLogin.addEventListener("click", (e) => {
            e.preventDefault();
            registerSection.style.display = "none";
            loginSection.style.display = "block";
        });
    }

    if (dom.loginForm) {
        dom.loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const email = dom.loginEmail.value.trim();
            const password = dom.loginPassword.value;

            if (!validarEmailCorporativo(email)) return;

            try {
                showToast("Efetuando login...");
                
                const { data, error } = await supabaseCliente.auth.signInWithPassword({
                    email: email,
                    password: password,
                });
                if (error) throw error;

                const user = data.user;
                const { data: profile } = await supabaseCliente
                    .from("perfis")
                    .select("nome, area_id")
                    .eq("id", user.id)
                    .single();

                const activeUser = {
                    id: user.id,
                    email: user.email,
                    name: profile ? profile.nome : (user.email.split("@")[0]),
                    area_id: profile ? profile.area_id : null
                };
                
                localStorage.setItem("voz_user", JSON.stringify(activeUser));
                state.user = activeUser;

                showToast("Acesso concedido! Redirecionando...");
                setTimeout(() => { window.location.href = "mural.html"; }, 1200);

            } catch (error) {
                showToast("Falha no login: " + translateError(error.message));
            }
        });
    }

    if (dom.registerForm) {
        dom.registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const email = dom.regEmail.value.trim();
            const password = dom.regPassword.value;
            const areaId = dom.regArea.value;

            if (!validarEmailCorporativo(email)) return;

            try {
                showToast("Criando conta no sistema...");

                const { data, error } = await supabaseCliente.auth.signUp({
                    email: email,
                    password: password,
                });
                if (error) throw error;

                if (data.user) {
                    let nomeExtraido = email.split("@")[0].replace(".", " ");
                    
                    const { error: profileError } = await supabaseCliente
                        .from("perfis")
                        .insert([{ 
                            id: data.user.id, 
                            nome: nomeExtraido, 
                            area_id: areaId 
                        }]);
                    
                    if (profileError) console.error("Aviso ao criar perfil:", profileError);
                }

                showToast("Conta criada com sucesso! Você já pode fazer o Login.");
                
                dom.registerForm.reset();
                setTimeout(() => { document.getElementById("linkToLogin").click(); }, 2000);

            } catch (error) {
                showToast("Erro no cadastro: " + translateError(error.message));
            }
        });
    }
}

async function loadAreasForRegister() {
    if (!dom.regArea) return;
    try {
        const { data: areas, error } = await supabaseCliente
            .from("areas")
            .select("id, nome")
            .order("nome");

        if (error) console.error("Erro ao carregar áreas:", error.message);

        dom.regArea.innerHTML = formatDropdownOptions(areas, "Selecione seu setor...");
    } catch (error) {
        console.error("Falha ao popular dropdown de setores:", error);
    }
}

/* =========================================================================
   PÁGINA 2: NOVA SUGESTÃO (nova-reclamacao.html)
   ========================================================================= */
async function initFormPage() {
    const { data: { session } } = await supabaseCliente.auth.getSession();
    if (!session) {
        showToast("Sessão expirada. Acesse o painel novamente.");
        setTimeout(() => { window.location.href = "index.html"; }, 1500);
        return;
    }

    await populateFormDropdowns();

    // Comportamento dinâmico EXCLUSIVO da Ferramenta ao selecionar "Outros..."
    const customToolGroup = document.getElementById("customToolGroup");
    const customToolInput = document.getElementById("customToolInput");

    if (dom.complaintTool) {
        dom.complaintTool.addEventListener("change", (e) => {
            if (e.target.value === "OUTROS") {
                if (customToolGroup) customToolGroup.style.display = "block";
                if (customToolInput) {
                    customToolInput.required = true;
                    customToolInput.focus();
                }
            } else {
                if (customToolGroup) customToolGroup.style.display = "none";
                if (customToolInput) {
                    customToolInput.required = false;
                    customToolInput.value = "";
                }
            }
        });
    }

    if (state.user && state.user.area_id) {
        dom.complaintArea.value = state.user.area_id;
    }

    dom.complaintForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const title = dom.complaintTitle.value.trim();
        const description = dom.complaintDescription.value.trim();
        const stageId = dom.complaintStage.value;
        const areaId = dom.complaintArea.value;
        let toolId = dom.complaintTool.value;

        if (!title || !description || !stageId || !areaId || !toolId) {
            showToast("Por favor, preencha todos os campos.");
            return;
        }

        try {
            showToast("Analisando sugestões existentes...");

            // Checa duplicidade de sugestão
            const { data: duplicadas, error: dupError } = await supabaseCliente
                .rpc("verificar_reclamacao_duplicada", {
                    p_titulo: title,
                    p_area_id: areaId
                });

            if (dupError) throw dupError;

            if (duplicadas && duplicadas.length > 0) {
                const encontrada = duplicadas[0].titulo;
                showToast(`Já existe uma sugestão similar: "${encontrada}". Verifique no Mural!`);
                return;
            }

            // Tratamento da caixa de digitação de Ferramentas ao escolher "Outros..."
            if (toolId === "OUTROS") {
                const customToolName = customToolInput ? customToolInput.value.trim() : "";
                if (!customToolName) {
                    showToast("Por favor, digite o nome da ferramenta.");
                    return;
                }

                showToast("Verificando ferramenta...");

                // 1. Procura se a ferramenta já existe no banco
                const { data: existingTool } = await supabaseCliente
                    .from("ferramentas")
                    .select("id")
                    .ilike("nome", customToolName)
                    .maybeSingle();

                if (existingTool) {
                    // Se já existe, reaproveita o ID
                    toolId = existingTool.id;
                } else {
                    // Se não existe, cadastra a nova ferramenta
                    showToast("Cadastrando nova ferramenta...");
                    const { data: newTool, error: toolErr } = await supabaseCliente
                        .from("ferramentas")
                        .insert({ nome: customToolName })
                        .select("id")
                        .single();

                    if (toolErr) throw new Error("Erro ao salvar ferramenta: " + toolErr.message);
                    toolId = newTool.id;
                }
            }

            showToast("Enviando sugestão...");

            const { data: { user }, error: userError } = await supabaseCliente.auth.getUser();
            if (userError || !user) throw new Error("Usuário não autenticado.");

            const { error: insertError } = await supabaseCliente
                .from("reclamacoes")
                .insert({
                    titulo: title,
                    impacto_dor: description,
                    etapa_id: stageId,
                    area_id: areaId,
                    ferramenta_id: toolId,
                    autor_id: user.id
                });

            if (insertError) throw insertError;

            showToast("Sugestão cadastrada com sucesso!");
            setTimeout(() => { window.location.href = "mural.html"; }, 1200);

        } catch (error) {
            console.error(error);
            showToast("Erro ao salvar: " + error.message);
        }
    });
}

function formatDropdownOptions(items, placeholder) {
    if (!items || items.length === 0) {
        return `<option value="" disabled selected>${placeholder}</option><option value="OUTROS">Outros...</option>`;
    }

    const cleanItems = items.filter(item => !item.nome.toLowerCase().startsWith("outro"));
    const outrosItem = items.find(item => item.nome.toLowerCase().startsWith("outro"));

    let html = `<option value="" disabled selected>${placeholder}</option>`;
    html += cleanItems.map(item => `<option value="${item.id}">${escapeHTML(item.nome)}</option>`).join("");
    
    // Adiciona "Outros..." no final usando o UUID retornado do Supabase
    const outrosValue = outrosItem ? outrosItem.id : "OUTROS";
    html += `<option value="${outrosValue}">Outros...</option>`;

    return html;
}

async function populateFormDropdowns() {
    try {
        const [resAreas, resFerramentas, resEtapas] = await Promise.all([
            supabaseCliente.from("areas").select("id, nome").order("nome"),
            supabaseCliente.from("ferramentas").select("id, nome").order("nome"),
            supabaseCliente.from("etapas").select("id, nome").order("nome")
        ]);

        if (resAreas.error) throw resAreas.error;
        if (resFerramentas.error) throw resFerramentas.error;
        if (resEtapas.error) throw resEtapas.error;

        // 1. Área impactada
        if (dom.complaintArea) {
            dom.complaintArea.innerHTML = formatDropdownOptions(resAreas.data, "Selecione a área impactada...");
        }

        // 2. Etapa afetada
        if (dom.complaintStage) {
            dom.complaintStage.innerHTML = formatDropdownOptions(resEtapas.data, "Selecione a etapa afetada...");
        }

        // 3. Ferramenta (sem EXCEL + "Outros..." estático com valor "OUTROS" para disparar a caixa de texto)
        if (dom.complaintTool) {
            const ferramentasFiltradas = resFerramentas.data.filter(t => 
                t.nome.toUpperCase() !== 'EXCEL' && !t.nome.toLowerCase().startsWith('outro')
            );

            dom.complaintTool.innerHTML = '<option value="" disabled selected>Selecione a ferramenta...</option>' + 
                ferramentasFiltradas.map(t => `<option value="${t.id}">${escapeHTML(t.nome)}</option>`).join("") +
                '<option value="OUTROS">Outros...</option>';
        }
    } catch (error) {
        showToast("Erro ao carregar opções do formulário.");
    }
}

/* =========================================================================
   PÁGINA 3: MURAL E FEED (mural.html)
   ========================================================================= */
async function initMuralPage() {
    if (dom.goToFormBtn) {
        dom.goToFormBtn.addEventListener("click", () => {
            window.location.href = "nova-reclamacao.html";
        });
    }

    await populateFilterDropdowns();

    if (dom.muralSearch) {
        dom.muralSearch.addEventListener("input", (e) => {
            state.filters.search = e.target.value.toLowerCase().trim();
            state.pagination.currentPage = 1;
            renderFeed();
        });
    }

    if (dom.filterSort) {
        dom.filterSort.addEventListener("change", (e) => {
            state.filters.sort = e.target.value;
            state.pagination.currentPage = 1;
            renderFeed();
        });
    }

    if (dom.filterStage) {
        dom.filterStage.addEventListener("change", (e) => {
            state.filters.stage = e.target.value;
            state.pagination.currentPage = 1;
            renderFeed();
        });
    }

    if (dom.filterArea) {
        dom.filterArea.addEventListener("change", (e) => {
            state.filters.area = e.target.value;
            state.pagination.currentPage = 1;
            renderFeed();
        });
    }

    if (dom.filterTool) {
        dom.filterTool.addEventListener("change", (e) => {
            state.filters.tool = e.target.value;
            state.pagination.currentPage = 1;
            renderFeed();
        });
    }

    renderFeed();
}

async function populateFilterDropdowns() {
    try {
        const [resAreas, resFerramentas, resEtapas] = await Promise.all([
            supabaseCliente.from("areas").select("id, nome").order("nome"),
            supabaseCliente.from("ferramentas").select("id, nome").order("nome"),
            supabaseCliente.from("etapas").select("id, nome").order("nome")
        ]);

        if (resAreas.error) throw resAreas.error;
        if (resFerramentas.error) throw resFerramentas.error;
        if (resEtapas.error) throw resEtapas.error;

        if (dom.filterArea) {
            dom.filterArea.innerHTML = '<option value="">Todas as áreas</option>' + 
                resAreas.data.map(a => `<option value="${a.id}">${escapeHTML(a.nome)}</option>`).join("");
        }
        if (dom.filterTool) {
            dom.filterTool.innerHTML = '<option value="">Todas as ferramentas</option>' + 
                resFerramentas.data.map(t => `<option value="${t.id}">${escapeHTML(t.nome)}</option>`).join("");
        }
        if (dom.filterStage) {
            dom.filterStage.innerHTML = '<option value="">Todas as etapas</option>' + 
                resEtapas.data.map(e => `<option value="${e.id}">${escapeHTML(e.nome)}</option>`).join("");
        }
    } catch (error) {
        console.error("Erro ao carregar filtros:", error.message);
    }
}

async function renderFeed() {
    try {
        dom.cardsFeed.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-spinner fa-spin-pulse"></i>
                <p>Carregando mural de sugestões...</p>
            </div>
        `;

        let query = supabaseCliente
            .from("reclamacoes")
            .select(`
                id, titulo, impacto_dor, criado_em, area_id, ferramenta_id, etapa_id,
                areas(nome),
                ferramentas(nome),
                etapas(nome),
                perfis!reclamacoes_autor_id_fkey(nome)
            `, { count: "exact" });

        if (state.filters.search) {
            query = query.or(`titulo.ilike.%${state.filters.search}%,impacto_dor.ilike.%${state.filters.search}%`);
        }
        if (state.filters.stage) query = query.eq("etapa_id", state.filters.stage);
        if (state.filters.area) query = query.eq("area_id", state.filters.area);
        if (state.filters.tool) query = query.eq("ferramenta_id", state.filters.tool);

        query = query.order("criado_em", { ascending: false });

        const startIndex = (state.pagination.currentPage - 1) * state.pagination.itemsPerPage;
        const endIndex = startIndex + state.pagination.itemsPerPage - 1;
        query = query.range(startIndex, endIndex);

        const { data: list, count, error } = await query;
        if (error) throw error;

        if (!list || list.length === 0) {
            dom.cardsFeed.innerHTML = `
                <div class="empty-state">
                    <i class="fa-regular fa-comment-slash"></i>
                    <h3>Nenhuma sugestão encontrada</h3>
                    <p>Tente ajustar a pesquisa ou os filtros selecionados.</p>
                </div>
            `;
            dom.pagination.innerHTML = "";
            return;
        }

        dom.cardsFeed.innerHTML = list.map(item => {
            const dateStr = item.criado_em ? new Date(item.criado_em).toLocaleDateString("pt-BR") : "";
            
            const areaNome = item.areas ? item.areas.nome : "Desconhecido";
            const ferramentaNome = item.ferramentas ? item.ferramentas.nome : "Desconhecido";
            const autorNome = item.perfis ? item.perfis.nome : "Operador Anônimo";

            return `
                <article class="complaint-card" data-id="${item.id}" style="padding: 20px;">
                    <div class="card-center" style="width: 100%;">
                        <h3 class="card-title">${escapeHTML(item.titulo)}</h3>
                        <p class="card-desc">${escapeHTML(item.impacto_dor)}</p>
                        <div class="card-tags" style="margin-top: 12px;">
                            <span class="tag tag-area"><i class="fa-regular fa-folder-open"></i> ${escapeHTML(areaNome)}</span>
                            <span class="tag tag-tool"><i class="fa-solid fa-wrench"></i> ${escapeHTML(ferramentaNome)}</span>
                            <span class="tag tag-meta"><i class="fa-regular fa-user"></i> ${escapeHTML(autorNome)}</span>
                            <span class="tag tag-meta"><i class="fa-regular fa-calendar"></i> ${dateStr}</span>
                        </div>
                    </div>
                </article>
            `;
        }).join("");

        const totalPages = Math.ceil(count / state.pagination.itemsPerPage) || 1;
        renderPaginationHTML(totalPages);

    } catch (error) {
        console.error(error);
        dom.cardsFeed.innerHTML = `<div class="empty-state"><p>Erro ao obter dados do banco de dados.</p></div>`;
    }
}

function renderPaginationHTML(totalPages) {
    if (totalPages <= 1) { dom.pagination.innerHTML = ""; return; }
    let buttons = [];
    const prevDisabled = state.pagination.currentPage === 1 ? "disabled" : "";
    buttons.push(`<button class="page-btn ${prevDisabled}" onclick="changePage(${state.pagination.currentPage - 1})"><i class="fa-solid fa-chevron-left"></i></button>`);
    for (let i = 1; i <= totalPages; i++) {
        const activeClass = state.pagination.currentPage === i ? "active" : "";
        buttons.push(`<button class="page-btn ${activeClass}" onclick="changePage(${i})">${i}</button>`);
    }
    const nextDisabled = state.pagination.currentPage === totalPages ? "disabled" : "";
    buttons.push(`<button class="page-btn ${nextDisabled}" onclick="changePage(${state.pagination.currentPage + 1})"><i class="fa-solid fa-chevron-right"></i></button>`);
    dom.pagination.innerHTML = buttons.join("");
}

window.changePage = function(pageNum) {
    state.pagination.currentPage = pageNum;
    renderFeed();
    document.querySelector(".mural-header").scrollIntoView({ behavior: "smooth", block: "start" });
};

/* =========================================================================
   TRADUÇÃO E UTILS
   ========================================================================= */
function translateError(msg) {
    if (msg.includes("Invalid login credentials")) return "E-mail ou senha incorretos.";
    if (msg.includes("Email not confirmed")) return "Por favor, confirme seu cadastro por e-mail.";
    if (msg.includes("User already registered")) return "Este e-mail já possui cadastro.";
    return msg;
}

function showToast(message) {
    if (!dom.toast || !dom.toastMessage) return;
    dom.toastMessage.textContent = message;
    dom.toast.classList.remove("hidden");
    setTimeout(() => { dom.toast.classList.add("hidden"); }, 4000);
}

function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function validarEmailCorporativo(email) {
    if (!email.endsWith("@usereserva.com")) {
        showToast("Acesso restrito: Utilize um e-mail @usereserva.com");
        return false;
    }
    return true; 
}

// Botão de Voltar para o Mural
document.addEventListener("click", (e) => {
    if (e.target && e.target.closest("#backToMuralBtn")) {
        e.preventDefault();
        window.location.href = "mural.html";
    }
});