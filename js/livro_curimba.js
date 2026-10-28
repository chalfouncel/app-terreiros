// ============================================================================
// MÓDULO ADICIONAL: LIVRO GERAL DA CURIMBA (MG / MGA / DIRIGENTE)
// Independente do Caderno de Pontos Individuais (CT+)
// ============================================================================

(function () {
    const CATEGORIAS_CURIMBA = [
        "1. Hinos Oficiais",
        "2. Pontos de Defumação",
        "3. Abertura, Encerramento e Rituais",
        "4. Preces Diversas",
        "5. Oxalá",
        "6. Povo do Oriente",
        "7. Ibeijada",
        "8. Oxóssi",
        "9. Caboclos - Tupixabas e Morubixabas",
        "10. Caboclos, Boiadeiros e Caboclas",
        "11. Ogum",
        "12. Iemanjá",
        "13. Marinheiros",
        "14. Oxum",
        "15. Nanã Buruquê",
        "16. Iansã",
        "17. Xangô",
        "18. Omulú",
        "19. Pretos Velhos - Tupixabas e Morubixabas",
        "20. Pretos Velhos e Falanges (Congo, Angola, Minas, Bahia, Almas)",
        "21. Exús, Pombagiras e Malandros",
        "22. Encerramento de Gira Oficial"
    ];

    let cacheCantigasLivro = [];
    let categoriaAtiva = "todas";
    let subcategoriaAtiva = "todas";
    let filtroSemAudio = false;
    let tamanhoFonteLivro = 15;
    let wakeLockLivro = null;

    // Variáveis do Gravador de Áudio (1m30s)
    let mediaRecorderLivro = null;
    let timerGravacaoLivro = null;
    let segundosGravacaoLivro = 0;
    let blobAudioNovoLivro = null;
    let urlAudioExistenteLivro = null;

    async function ativarWakeLockLivro() {
        if ('wakeLock' in navigator) {
            try { wakeLockLivro = await navigator.wakeLock.request('screen'); } catch (e) {}
        }
    }

    function liberarWakeLockLivro() {
        if (wakeLockLivro !== null) {
            wakeLockLivro.release().catch(() => {});
            wakeLockLivro = null;
        }
    }

    function verificarAcessoLivroCurimba() {
        const btnApp = document.getElementById('btnAbrirLivroCurimbaApp');
        if (!btnApp) return;

        // Aguarda até que o perfil E os dados reais do terreiro (com ID carregado) estejam prontos
        if (typeof perfilMediumLogado === 'undefined' || !perfilMediumLogado || typeof terreiroConfigMensalidade === 'undefined' || !terreiroConfigMensalidade || !terreiroConfigMensalidade.id) {
            setTimeout(verificarAcessoLivroCurimba, 400);
            return;
        }

        const moduloAtivo = terreiroConfigMensalidade.modulo_livro_curimba_ativo === true;
        const fn = String(perfilMediumLogado.funcao || '').trim().toUpperCase();
        const gr = String(perfilMediumLogado.grau || '').trim().toUpperCase();
        const temPermissao = ['MG', 'MGA', 'DIRIGENTE'].includes(fn) || gr === 'DIRIGENTE' || perfilMediumLogado.is_admin === true || perfilMediumLogado.is_master === true;

        if (moduloAtivo && temPermissao) {
            btnApp.classList.remove('hidden');
            document.getElementById('areaCurimbaRapida')?.classList.remove('hidden');
        }
    }

    function injetarModaisLivroCurimba() {
        if (document.getElementById('modalLivroCurimba')) return;

        const opcoesCatHtml = CATEGORIAS_CURIMBA.map(c => `<option value="${c}">${c}</option>`).join('');

        const html = `
        <!-- MODAL PRINCIPAL: LIVRO GERAL DA CURIMBA -->
        <div id="modalLivroCurimba" class="hidden fixed inset-0 bg-slate-950 text-white z-[99992] flex flex-col overflow-hidden">
            <div class="bg-slate-900 border-b border-slate-800 px-4 py-3 flex justify-between items-center shrink-0">
                <div class="flex items-center gap-2.5">
                    <div class="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black border border-indigo-500/30">
                        <i class="fas fa-book-open text-base"></i>
                    </div>
                    <div>
                        <h3 class="text-sm font-black tracking-wide text-white uppercase leading-tight">Livro Geral da Curimba</h3>
                        <p class="text-[10px] text-slate-400 font-semibold">Coletânea Oficial de Cantigas e Rituais</p>
                    </div>
                </div>
                <div class="flex items-center gap-1.5">
                    <input type="file" id="inputImportarDocxCurimba" accept=".docx" class="hidden" onchange="window.importarDocxLivroCurimba(this)">
                    <button type="button" onclick="document.getElementById('inputImportarDocxCurimba').click()" class="px-2.5 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold text-[10px] border border-slate-700 active:scale-95 flex items-center gap-1" title="Importar arquivo .DOCX do Livro da Curimba">
                        <i class="fas fa-file-word"></i> <span class="hidden sm:inline">Importar .DOCX</span>
                    </button>
                    <button type="button" onclick="window.exportarPDFLivroCurimba()" class="px-2.5 h-8 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] active:scale-95 flex items-center gap-1" title="Baixar Apostila em PDF A4">
                        <i class="fas fa-file-pdf"></i> <span class="hidden sm:inline">PDF</span>
                    </button>
                    <button type="button" onclick="window.abrirModalNovaCantigaLivro()" class="px-2.5 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] active:scale-95 flex items-center gap-1">
                        <i class="fas fa-plus"></i> <span class="hidden sm:inline">Nova Cantiga</span>
                    </button>
                    <button type="button" onclick="window.ajustarFonteLivroCurimba(-2)" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs border border-slate-700 active:scale-90">A-</button>
                    <button type="button" onclick="window.ajustarFonteLivroCurimba(2)" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs border border-slate-700 active:scale-90">A+</button>
                    <button type="button" onclick="window.fecharModalLivroCurimba()" class="w-9 h-9 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 flex items-center justify-center ml-1 active:scale-90">
                        <i class="fas fa-times text-base"></i>
                    </button>
                </div>
            </div>

            <!-- Filtros -->
            <div class="bg-slate-900/90 border-b border-slate-800 p-3 space-y-2.5 shrink-0">
                <!-- Linha 1: Barra de Pesquisa Ocupando Toda a Largura no Celular -->
                <div class="relative w-full flex gap-1.5">
                    <div class="relative flex-1">
                        <i class="fas fa-search absolute left-3 top-3 text-slate-400 text-xs"></i>
                        <input type="text" id="buscaLivroCurimbaInput" oninput="window.limparFiltroIALivro(); window.renderizarCardsLivroCurimba()" onkeydown="if(event.key==='Enter'){event.preventDefault(); window.buscarComIALivroCurimba();}" placeholder="Pesquisar cantiga, guia, letra..." class="w-full pl-8 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 outline-none focus:border-indigo-500 shadow-inner" style="color: #ffffff !important;">
                    </div>
                    <button type="button" id="btnBuscarIALivro" onclick="window.buscarComIALivroCurimba()" class="px-3.5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow flex items-center gap-1.5 shrink-0 active:scale-95 transition" title="Busca Inteligente por Contexto">
                        <i class="fas fa-wand-magic-sparkles"></i> <span>IA</span>
                    </button>
                </div>

                <!-- Linha 2: Botões de Filtro Rápido (Distribuição Uniforme) -->
                <div class="grid grid-cols-2 gap-1.5">
                    <button type="button" id="btnFiltroSemAudioLivro" onclick="window.alternarFiltroSemAudioLivro()" class="py-2 px-3 rounded-xl text-[11px] font-black border transition active:scale-95 flex items-center justify-center gap-1.5 bg-slate-800 text-amber-300 border-slate-700 shadow-sm">
                        <i class="fas fa-microphone-slash text-[10px]"></i> Sem Áudio
                    </button>
                    <button type="button" onclick="window.limparTodosFiltrosLivroCurimba()" class="py-2 px-3 rounded-xl text-[11px] font-black border border-slate-700 bg-slate-800 hover:bg-slate-700 text-rose-300 transition active:scale-95 flex items-center justify-center gap-1.5 shadow-sm" title="Limpar busca e todos os filtros">
                        <i class="fas fa-eraser text-[10px]"></i> Limpar Filtros
                    </button>
                </div>

                <!-- Banner de Resposta da IA -->
                <div id="bannerRespostaIALivro" class="hidden bg-indigo-950/80 border border-indigo-500/40 rounded-xl p-2.5 text-xs text-indigo-200 flex items-start justify-between gap-2">
                    <div class="flex items-start gap-2">
                        <i class="fas fa-robot text-indigo-400 mt-0.5"></i>
                        <div id="textoRespostaIALivro" class="leading-relaxed"></div>
                    </div>
                    <button type="button" onclick="window.limparFiltroIALivro(); window.renderizarCardsLivroCurimba();" class="text-indigo-400 hover:text-white text-[10px] font-bold uppercase shrink-0 px-1.5 py-0.5 bg-indigo-900/60 rounded">Limpar</button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <select id="selectCategoriaLivro" onchange="window.selecionarCategoriaLivro(this.value)" class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-indigo-300 outline-none" style="color: #a5b4fc !important;">
                        <option value="todas">📚 Todas as Classificações do Livro</option>
                        ${opcoesCatHtml}
                    </select>
                    <select id="selectSubcategoriaLivro" onchange="window.selecionarSubcategoriaLivro(this.value)" class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-amber-300 outline-none" style="color: #fcd34d !important;">
                        <option value="todas">🔖 Todas as Sub-classificações / Guias</option>
                    </select>
                </div>
            </div>

            <!-- Lista de Cantigas -->
            <div id="listaCardsLivroCurimba" class="flex-1 overflow-y-auto p-3 space-y-3"></div>
        </div>

        <!-- MODAL DE EDIÇÃO / CRIAÇÃO DE CANTIGA DO LIVRO -->
        <div id="modalEditarCantigaLivro" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-[99996] flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 text-gray-800 flex flex-col max-h-[92vh]">
                <div class="flex justify-between items-center border-b border-gray-100 pb-3 mb-3">
                    <div>
                        <h4 class="font-black text-sm text-gray-800 uppercase" id="tituloModalEditCantigaLivro">Editar Cantiga</h4>
                        <p class="text-[11px] font-bold text-indigo-600">Livro Geral da Curimba</p>
                    </div>
                    <button type="button" onclick="window.fecharModalEditarCantigaLivro()" class="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <input type="hidden" id="editCantigaLivroId">

                <div class="space-y-3 overflow-y-auto pr-1 flex-1">
                    <div>
                        <label class="block text-[10px] font-black text-gray-500 uppercase mb-1">📚 Classificação Principal *</label>
                        <select id="editCantigaCategoria" class="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-indigo-500">
                            ${opcoesCatHtml}
                        </select>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                            <label class="block text-[10px] font-black text-gray-500 uppercase mb-1">🔖 Sub-classificação / Guia</label>
                            <input type="text" id="editCantigaSubcategoria" placeholder="Ex: Vibração de Oxalá, Caboclo Tupi..." class="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold outline-none bg-white">
                        </div>
                        <div>
                            <label class="block text-[10px] font-black text-gray-500 uppercase mb-1">📌 Título / Identificador</label>
                            <input type="text" id="editCantigaTitulo" placeholder="Ex: Descida, Louvação, Ponto 1..." class="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs outline-none bg-white">
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                            <label class="block text-[10px] font-black text-gray-500 uppercase mb-1">🥁 Toque / Ritmo</label>
                            <select id="editCantigaRitmo" class="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold bg-white outline-none">
                                <option value="">Não informado</option>
                                <option value="Congo de Ouro">Congo de Ouro</option>
                                <option value="Ijesá">Ijesá</option>
                                <option value="Barravento">Barravento</option>
                                <option value="Cabula / Samba">Cabula / Samba</option>
                                <option value="Nagô">Nagô</option>
                                <option value="Vassi">Vassi</option>
                                <option value="Alujá">Alujá</option>
                                <option value="Adarrum">Adarrum</option>
                                <option value="Marcha / Ponteado">Marcha / Ponteado</option>
                                <option value="Jongo">Jongo</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] font-black text-gray-500 uppercase mb-1">🎵 Dica de Melodia / Tom</label>
                            <input type="text" id="editCantigaMelodia" placeholder="Ex: Cadenciado, sobe no refrão..." class="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs outline-none bg-white">
                        </div>
                    </div>

                    <!-- Gravador de Áudio (1m30s) -->
                    <div class="bg-indigo-50/80 border border-indigo-200 rounded-xl p-3 space-y-2">
                        <div class="flex items-center justify-between">
                            <span class="text-[10px] font-black text-indigo-900 uppercase"><i class="fas fa-microphone-alt mr-1 text-indigo-600"></i> Áudio da Cantiga (Máx. 1:30)</span>
                            <span id="timerGravacaoLivro" class="hidden text-[11px] font-mono font-black text-rose-600 animate-pulse">00:00 / 01:30</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <button type="button" id="btnGravarAudioLivro" onclick="window.alternarGravacaoCantigaLivro()" class="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition">
                                <i class="fas fa-microphone"></i> <span>Gravar / Regravar Áudio</span>
                            </button>
                            <button type="button" id="btnRemoverAudioLivro" onclick="window.removerAudioCantigaLivro()" class="hidden py-2 px-3 rounded-xl bg-gray-200 hover:bg-red-100 text-gray-600 hover:text-red-600 font-bold text-xs transition">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                        <audio id="playerPreviewLivro" controls class="hidden w-full h-9 mt-1"></audio>
                    </div>

                    <div>
                        <div class="flex items-center justify-between mb-1">
                            <label class="text-[10px] font-black text-gray-500 uppercase">Letra e Marcações *</label>
                            <div class="flex gap-1">
                                <button type="button" onclick="window.inserirTagCantigaLivro('[BIS] ')" class="text-[9px] font-bold bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">[BIS]</button>
                                <button type="button" onclick="window.inserirTagCantigaLivro('[2x] ')" class="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">[2x]</button>
                                <button type="button" onclick="window.inserirTagCantigaLivro('[Refrão]\\n')" class="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">[Refrão]</button>
                            </div>
                        </div>
                        <textarea id="editCantigaLetra" rows="6" class="w-full p-3 border border-gray-300 rounded-xl text-sm font-medium leading-relaxed outline-none focus:ring-2 focus:ring-indigo-500 bg-white"></textarea>
                    </div>
                </div>

                <div class="pt-3 mt-3 border-t border-gray-100 flex gap-2">
                    <button type="button" id="btnExcluirCantigaLivro" onclick="window.excluirCantigaLivroAtual()" class="hidden py-2.5 px-3 rounded-xl bg-red-50 text-red-600 font-bold text-xs border border-red-200">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button type="button" onclick="window.fecharModalEditarCantigaLivro()" class="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs">Cancelar</button>
                    <button type="button" id="btnSalvarCantigaLivro" onclick="window.salvarCantigaLivro()" class="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow active:scale-95">
                        <i class="fas fa-save mr-1"></i> Salvar Cantiga
                    </button>
                </div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    }

    document.addEventListener('DOMContentLoaded', () => {
        injetarModaisLivroCurimba();
        setTimeout(verificarAcessoLivroCurimba, 600);
    });

    window.abrirModalLivroCurimba = async () => {
        injetarModaisLivroCurimba();
        document.getElementById('modalLivroCurimba')?.classList.remove('hidden');
        await ativarWakeLockLivro();
        await carregarCantigasDoBanco();
    };

    window.fecharModalLivroCurimba = () => {
        document.querySelectorAll('#modalLivroCurimba audio').forEach(a => a.pause());
        liberarWakeLockLivro();
        document.getElementById('modalLivroCurimba')?.classList.add('hidden');
    };

    window.ajustarFonteLivroCurimba = (delta) => {
        tamanhoFonteLivro = Math.min(Math.max(12, tamanhoFonteLivro + delta), 26);
        window.renderizarCardsLivroCurimba();
    };

    window.alternarFiltroSemAudioLivro = () => {
        filtroSemAudio = !filtroSemAudio;
        const btn = document.getElementById('btnFiltroSemAudioLivro');
        if (btn) {
            btn.className = filtroSemAudio
                ? 'px-3 py-2 rounded-xl text-[11px] font-black border transition active:scale-95 flex items-center gap-1.5 shrink-0 bg-amber-500 text-slate-950 border-amber-300 shadow'
                : 'px-3 py-2 rounded-xl text-[11px] font-black border transition active:scale-95 flex items-center gap-1.5 shrink-0 bg-slate-800 text-amber-300 border-slate-700';
        }
        window.renderizarCardsLivroCurimba();
    };

    window.selecionarCategoriaLivro = (cat) => {
        categoriaAtiva = cat;
        subcategoriaAtiva = "todas";
        atualizarDropdownSubcategorias();
        window.renderizarCardsLivroCurimba();
    };

    window.selecionarSubcategoriaLivro = (sub) => {
        subcategoriaAtiva = sub;
        window.renderizarCardsLivroCurimba();
    };

    function atualizarDropdownSubcategorias() {
        const selSub = document.getElementById('selectSubcategoriaLivro');
        if (!selSub) return;

        const base = categoriaAtiva === "todas"
            ? cacheCantigasLivro
            : cacheCantigasLivro.filter(c => c.categoria === categoriaAtiva);

        const subs = [...new Set(base.map(c => c.subcategoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
        selSub.innerHTML = `<option value="todas">🔖 Todas as Sub-classificações / Guias (${subs.length})</option>` +
            subs.map(s => `<option value="${s}">${s}</option>`).join('');
    }

    async function carregarCantigasDoBanco() {
        const container = document.getElementById('listaCardsLivroCurimba');
        if (!container) return;
        container.innerHTML = '<p class="text-center text-slate-400 text-xs py-10"><i class="fas fa-spinner fa-spin mr-2"></i> Carregando Livro da Curimba...</p>';

        try {
            let todos = [];
            let de = 0;
            const passo = 1000;
            while (true) {
                const { data, error } = await supabaseClient
                    .from('curimba_cantigas')
                    .select('*')
                    .eq('terreiro_id', idTerreiroGlobal)
                    .order('ordem', { ascending: true })
                    .order('id', { ascending: true })
                    .range(de, de + passo - 1);

                if (error) throw error;
                if (data && data.length > 0) {
                    todos.push(...data);
                    if (data.length < passo) break;
                    de += passo;
                } else break;
            }

            // 1. Guarda a posição original de cada Categoria e Sub-classificação no Livro
            const ordemGrupoSub = {};
            todos.forEach((item, idx) => {
                const chave = `${String(item.categoria || '').trim().toUpperCase()}||${String(item.subcategoria || 'GERAL').trim().toUpperCase()}`;
                if (ordemGrupoSub[chave] === undefined) {
                    ordemGrupoSub[chave] = item.ordem || (idx + 1);
                }
            });

            // Extrai o número do Título/Identificador (ex: "1", "2", "Ponto 3" -> 1, 2, 3)
            const extrairNumeroTitulo = (t) => {
                const m = String(t || '').match(/\d+/);
                return m ? parseInt(m[0], 10) : null;
            };

            // 2. Ordena mantendo a sequência das Sub-classificações e aplicando ordem numérica crescente nos Títulos
            todos.sort((a, b) => {
                const catA = CATEGORIAS_CURIMBA.indexOf(a.categoria);
                const catB = CATEGORIAS_CURIMBA.indexOf(b.categoria);
                if (catA !== catB) return (catA === -1 ? 999 : catA) - (catB === -1 ? 999 : catB);

                const chaveA = `${String(a.categoria || '').trim().toUpperCase()}||${String(a.subcategoria || 'GERAL').trim().toUpperCase()}`;
                const chaveB = `${String(b.categoria || '').trim().toUpperCase()}||${String(b.subcategoria || 'GERAL').trim().toUpperCase()}`;

                // Se forem de Sub-classificações diferentes, respeita a ordem em que aparecem no livro
                if (chaveA !== chaveB) {
                    return (ordemGrupoSub[chaveA] || 0) - (ordemGrupoSub[chaveB] || 0);
                }

                // Dentro da MESMA Sub-classificação (ex: "ABERTURA"), se houver número no Título, ordena 1, 2, 3...
                const numA = extrairNumeroTitulo(a.titulo);
                const numB = extrairNumeroTitulo(b.titulo);

                if (numA !== null && numB !== null && numA !== numB) {
                    return numA - numB;
                }
                if (numA !== null && numB === null) return -1; // Numerados vêm primeiro naquela sub-classificação
                if (numA === null && numB !== null) return 1;

                // Desempate por ordem original ou ID
                const ordA = a.ordem ?? 999999;
                const ordB = b.ordem ?? 999999;
                if (ordA !== ordB) return ordA - ordB;
                return (a.id || 0) - (b.id || 0);
            });

            cacheCantigasLivro = todos;
            atualizarDropdownSubcategorias();
            window.renderizarCardsLivroCurimba();
        } catch (err) {
            container.innerHTML = `<p class="text-center text-rose-400 text-xs py-8">Erro ao carregar cantigas: ${err.message}</p>`;
        }
    }

    function formatarLetraCantiga(txt) {
        if (!txt) return '';
        return txt
            .replace(/\b(BIS|4X|3X|2X)\b/g, '<span class="bg-amber-500/20 text-amber-300 font-black px-1.5 py-0.5 rounded text-[0.8em]">[$1]</span>')
            .replace(/\[([^\]]+)\]/g, '<span class="bg-amber-500/20 text-amber-300 font-black px-1.5 py-0.5 rounded text-[0.8em]">[$1]</span>')
            .replace(/\n/g, '<br>');
    }

    // Dicionário Semântico de Cruzamentos e Fundamentos da Umbanda
    const MAPA_SEMANTICO_UMBANDA = {
        "iemanja": ["iemanja", "sereia", "mar", "odossiaba", "odoia", "janaina", "ondas", "praia", "areia", "rainha do mar", "mae d'agua", "mae dagua"],
        "oxum": ["oxum", "cachoeira", "cascata", "rio", "oraieieu", "aieieu", "lirio", "ouro", "conceicao", "agua doce", "sinda"],
        "iansa": ["iansa", "oya", "eparrei", "vento", "ventania", "tempestade", "raio", "santa barbara", "bale", "matamba"],
        "nana": ["nana", "buruque", "saluba", "santana", "poco", "lama", "cacurucaia"],
        "ogum": ["ogum", "ogunhie", "sao jorge", "espada", "lanca", "humaita", "cavaleiro", "guerreiro", "beira-mar", "beira mar", "rompe-mato", "megê", "mege", "iara", "matinada"],
        "oxossi": ["oxossi", "ode", "cacador", "mata", "jurema", "flecha", "bodoque", "sao sebastiao", "oke", "macaia"],
        "xango": ["xango", "cao", "kabecile", "cabecile", "pedreira", "pedra", "machado", "trovao", "justica", "agodo", "sao jeronimo"],
        "omulu": ["omulu", "obaluae", "atoto", "calunga", "sao lazaro", "sao roque", "palha", "pipoca", "peste", "cura"],
        "oxala": ["oxala", "jesus", "zambi", "estrela", "paz", "epa baba", "cruzeiro"],
        "cabocla": ["cabocla", "jurema", "iara", "jandira", "jupira", "jussara", "bartira", "iracema", "jacimara", "jandiara", "jaciara", "caboclas"],
        "caboclo": ["caboclo", "tupinamba", "arranca-toco", "sete flechas", "pena branca", "cobra coral", "ubirajara", " Rompe mato", "ventania", "mirim", "tupi", "aimore", "arariboia"],
        "preto velho": ["preto velho", "preta velha", "vovo", "pai ", "mae ", "tia ", "tio ", "angola", "congo", "minas", "aruanda", "cativeiro", "senzala", "rosario", "cachimbo", "toco", "almas"],
        "crianca": ["ibeijada", "crianca", "ere", "cosme", "damiao", "doum", "mariazinha", "pedrinho", "rosinha", "doce"],
        "exu": ["exu", "tranca ruas", "marabo", "caveira", "tiriri", "veludo", "sete encruzilhadas", "meia noite", "lodo", "capa preta", "mojuba", "laroie"],
        "pombagira": ["pombagira", "padilha", "mulambo", "cigana", "figueira", "sete saias", "dama da noite", "audara", "rosa caveira"]
    };

    const STOP_WORDS_PT = new Set(["de", "da", "do", "das", "dos", "para", "pra", "com", "que", "um", "uma", "no", "na", "nos", "nas", "em", "por", "ao", "aos", "ponto", "pontos", "cantiga", "musica"]);

    // Ignora acentos, cedilha, hífens (ex: beira-mar = beira mar), apóstrofos (d'água = dagua) e pontuação
    const normalizarTextoBusca = (str) => String(str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/['’´`]/g, '')
        .replace(/[-–—/.,;:!?()[\]{}"]/g, ' ')
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .trim();

    let idsFiltradosPorIA = null;
    let motivosFiltradosPorIA = {};

    window.limparFiltroIALivro = () => {
        idsFiltradosPorIA = null;
        motivosFiltradosPorIA = {};
        document.getElementById('bannerRespostaIALivro')?.classList.add('hidden');
    };

    window.limparTodosFiltrosLivroCurimba = () => {
        window.limparFiltroIALivro();
        categoriaAtiva = "todas";
        subcategoriaAtiva = "todas";
        filtroSemAudio = false;

        const inputBusca = document.getElementById('buscaLivroCurimbaInput');
        if (inputBusca) inputBusca.value = '';

        const selCat = document.getElementById('selectCategoriaLivro');
        if (selCat) selCat.value = 'todas';

        const btnAudio = document.getElementById('btnFiltroSemAudioLivro');
        if (btnAudio) {
            btnAudio.className = 'px-3 py-2 rounded-xl text-[11px] font-black border transition active:scale-95 flex items-center gap-1.5 shrink-0 bg-slate-800 text-amber-300 border-slate-700';
        }

        atualizarDropdownSubcategorias();
        window.renderizarCardsLivroCurimba();
    };

    function pontuarCantigaSemantica(cantiga, consultaBruta) {
        const consultaNorm = normalizarTextoBusca(consultaBruta).trim();
        if (!consultaNorm) return { ok: true, score: 0, tags: [] };

        const textoCantiga = normalizarTextoBusca([
            cantiga.categoria, cantiga.subcategoria, cantiga.titulo, cantiga.letra, cantiga.ritmo, cantiga.obs_melodia
        ].filter(Boolean).join(' '));

        const subNorm = normalizarTextoBusca((cantiga.subcategoria || '') + ' ' + (cantiga.categoria || ''));

        // 1. Se tiver a frase exata, pontuação máxima
        if (textoCantiga.includes(consultaNorm)) {
            return { ok: true, score: 100, tags: ['Correspondência exata'] };
        }

        // 2. Quebra a pesquisa em conceitos (ex: "Cabocla de Iemanjá" -> ["cabocla", "iemanja"])
        const palavras = consultaNorm.split(/\s+/).filter(p => p.length > 1 && !STOP_WORDS_PT.has(p));
        if (palavras.length === 0) return { ok: true, score: 1, tags: [] };

        let scoreTotal = 0;
        let tagsEncontradas = [];

        for (const p of palavras) {
            // Verifica se a palavra faz parte do dicionário espiritual de sinônimos
            const chaveSemantica = Object.keys(MAPA_SEMANTICO_UMBANDA).find(k => k === p || p.startsWith(k) || k.startsWith(p));
            const termosEquivalentes = chaveSemantica ? MAPA_SEMANTICO_UMBANDA[chaveSemantica] : [p];

            let bateuConceito = false;
            for (const eq of termosEquivalentes) {
                const eqNorm = normalizarTextoBusca(eq);
                if (subNorm.includes(eqNorm)) {
                    scoreTotal += 25; // Peso maior se estiver no título/guia
                    bateuConceito = true;
                    if (!tagsEncontradas.includes(eq)) tagsEncontradas.push(eq);
                } else if (textoCantiga.includes(eqNorm)) {
                    scoreTotal += 10; // Peso se estiver na letra
                    bateuConceito = true;
                    if (!tagsEncontradas.includes(eq)) tagsEncontradas.push(eq);
                }
            }

            // Exige que TODOS os conceitos pesquisados (ex: Cabocla + Iemanjá) estejam presentes no ponto
            if (!bateuConceito) return { ok: false, score: 0, tags: [] };
        }

        return { ok: true, score: scoreTotal, tags: tagsEncontradas.slice(0, 4) };
    }

    window.buscarComIALivroCurimba = async () => {
        const input = document.getElementById('buscaLivroCurimbaInput');
        const consulta = (input?.value || '').trim();
        if (!consulta) return alert('Digite o que procura na barra de pesquisa (ex: "Cabocla de Iemanjá", "Ponto de descarrego de Preto Velho").');

        const btn = document.getElementById('btnBuscarIALivro');
        const banner = document.getElementById('bannerRespostaIALivro');
        const txtBanner = document.getElementById('textoRespostaIALivro');

        // Volta os seletores para "todas" para a IA varrer o livro inteiro
        categoriaAtiva = "todas";
        subcategoriaAtiva = "todas";
        if (document.getElementById('selectCategoriaLivro')) document.getElementById('selectCategoriaLivro').value = 'todas';
        atualizarDropdownSubcategorias();

        const origHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        try {
            // Pré-seleciona as melhores possibilidades pelo motor semântico de Umbanda
            const avaliadas = cacheCantigasLivro
                .map(c => ({ c, res: pontuarCantigaSemantica(c, consulta) }))
                .filter(x => x.res.ok && x.res.score > 0)
                .sort((a, b) => b.res.score - a.res.score)
                .slice(0, 25);

            idsFiltradosPorIA = avaliadas.map(x => x.c.id);
            motivosFiltradosPorIA = {};
            avaliadas.forEach(x => {
                if (x.res.tags.length > 0) {
                    motivosFiltradosPorIA[x.c.id] = `Identificado por: ${x.res.tags.join(', ')}`;
                }
            });

            if (banner && txtBanner) {
                const guiasUnicos = [...new Set(avaliadas.map(x => x.c.subcategoria))].slice(0, 6);
                txtBanner.innerHTML = avaliadas.length > 0
                    ? `<strong>IA Curimba encontrou ${avaliadas.length} possibilidade(s) para "${consulta}":</strong><br><span class="text-[11px] text-amber-300">${guiasUnicos.join(' • ')}</span>`
                    : `Nenhuma cantiga combinou diretamente com "${consulta}". Tente outros termos.`;
                banner.classList.remove('hidden');
            }

            window.renderizarCardsLivroCurimba();
        } finally {
            btn.disabled = false;
            btn.innerHTML = origHtml;
        }
    };

            let ultimoToqueFoco = 0;
        window.detectarDuploToqueCurimba = ( e, acaoCallback ) => {
            const agora = Date.now();
            if (agora - ultimoToqueFoco < 320) {
                e.preventDefault();
                ultimoToqueFoco = 0;
                acaoCallback();
            } else {
                ultimoToqueFoco = agora;
            }
        };

        window.abrirModoFocoCantiga = async (id) => {
            document.querySelectorAll('audio').forEach(a => a.pause());
        
            const cantiga = cacheCantigasLivro.find(c => c.id === id);
            if (!cantiga) return;
        
            let modalFoco = document.getElementById('modalFocoCantigaImersivo');
            
            if (!modalFoco) {
                const htmlFoco = `
                <div id="modalFocoCantigaImersivo" class="hidden fixed inset-0 z-[99999] bg-slate-950 flex flex-col p-4 sm:p-8 overflow-y-auto select-none transition-opacity" ondblclick="window.fecharModoFocoCantiga(event)" ontouchend="if(!event.target.closest('button, audio')) window.detectarDuploToqueCurimba(event, () => window.fecharModoFocoCantiga(event))">
                    <div class="max-w-4xl w-full mx-auto mt-2 sm:mt-8 flex-1 flex flex-col space-y-5">
                        <div class="flex justify-between items-start border-b border-slate-800 pb-3 gap-2">
                            <div class="flex-1 min-w-0">
                                <span class="text-[11px] font-bold text-indigo-400 uppercase tracking-widest block mb-0.5" id="focoCategoria"></span>
                                <h2 class="font-black text-xl md:text-3xl text-amber-400 uppercase leading-tight" id="focoTitulo"></h2>
                            </div>
                            <div class="flex items-center gap-1.5 shrink-0">
                                <button type="button" onclick="window.ajustarFonteModoFoco(-2)" class="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-200 font-black text-xs border border-slate-700 active:scale-90">A-</button>
                                <button type="button" onclick="window.ajustarFonteModoFoco(2)" class="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-200 font-black text-xs border border-slate-700 active:scale-90">A+</button>
                                <button type="button" onclick="window.fecharModoFocoCantiga(event)" class="w-10 h-10 bg-rose-500/20 hover:bg-rose-500/30 rounded-xl flex items-center justify-center text-rose-400 text-lg border border-rose-500/30 active:scale-90 transition" title="Fechar Tela Cheia">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                        <div id="focoExtra" class="space-y-3"></div>
                        <div id="focoLetra" class="text-slate-100 font-medium leading-relaxed tracking-wide pb-10 cursor-text select-text"></div>
                        <div class="text-center pt-6 mt-auto border-t border-slate-800/50">
                            <span class="text-[11px] text-slate-400 font-bold uppercase tracking-wider bg-slate-900 px-4 py-2 rounded-full border border-slate-800">
                                <i class="fas fa-hand-pointer mr-1.5 text-indigo-400"></i> Dê 2 toques na tela para voltar
                            </span>
                        </div>
                    </div>
                </div>`;
                document.body.insertAdjacentHTML('beforeend', htmlFoco);
                modalFoco = document.getElementById('modalFocoCantigaImersivo');
            }
        
            document.getElementById('focoCategoria').textContent = cantiga.categoria;
            document.getElementById('focoTitulo').innerHTML = `${cantiga.subcategoria || 'Geral'} ${cantiga.titulo ? `• <span class="text-white">${cantiga.titulo}</span>` : ''}`;
        
            let extraHtml = '';
            if (cantiga.ritmo) extraHtml += `<span class="inline-block bg-amber-500 text-slate-950 text-[11px] font-black px-3 py-1 rounded-full uppercase mr-2 shadow"><i class="fas fa-drum mr-1.5"></i>${cantiga.ritmo}</span>`;
            if (cantiga.obs_melodia) extraHtml += `<div class="text-sm text-sky-300 bg-sky-950/40 border border-sky-800/50 rounded-xl px-4 py-2.5 mt-2"><i class="fas fa-music mr-2"></i> <strong>Melodia:</strong> ${cantiga.obs_melodia}</div>`;
            if (cantiga.audio_url) extraHtml += `<div class="mt-4 bg-slate-900/90 p-2.5 rounded-2xl border border-indigo-500/40 flex items-center gap-3 shadow-lg">
                                <span class="text-[11px] font-black text-indigo-400 uppercase px-3 shrink-0"><i class="fas fa-headphones mr-1.5"></i>Ouvir:</span>
                                <audio controls preload="none" src="${cantiga.audio_url}" class="w-full h-10 outline-none"></audio>
                              </div>`;
            
            document.getElementById('focoExtra').innerHTML = extraHtml;
        
            const tamanhoFoco = Math.min(Math.max(18, tamanhoFonteLivro + 6), 36);
            const letraEl = document.getElementById('focoLetra');
            letraEl.style.fontSize = tamanhoFoco + 'px';
            letraEl.innerHTML = formatarLetraCantiga(cantiga.letra);
        
            modalFoco.classList.remove('hidden');
            await ativarWakeLockLivro();
        };
        
        window.ajustarFonteModoFoco = (delta) => {
            const letraEl = document.getElementById('focoLetra');
            if (!letraEl) return;
            const atual = parseInt(letraEl.style.fontSize || '21', 10);
            letraEl.style.fontSize = Math.min(Math.max(16, atual + delta), 42) + 'px';
        };

        window.fecharModoFocoCantiga = (event) => {
            if (event) event.stopPropagation();
            const modalFoco = document.getElementById('modalFocoCantigaImersivo');
            if (modalFoco) {
                modalFoco.querySelectorAll('audio').forEach(a => a.pause());
                modalFoco.classList.add('hidden');
            }
        };

    window.renderizarCardsLivroCurimba = () => {
        const container = document.getElementById('listaCardsLivroCurimba');
        if (!container) return;

        const termo = (document.getElementById('buscaLivroCurimbaInput')?.value || '').trim();

        let filtradas = [];

        if (idsFiltradosPorIA !== null) {
            filtradas = idsFiltradosPorIA
                .map(id => cacheCantigasLivro.find(c => c.id === id))
                .filter(Boolean);
        } else {
            const listaComScore = [];
            for (const c of cacheCantigasLivro) {
                if (categoriaAtiva !== "todas" && c.categoria !== categoriaAtiva) continue;
                if (subcategoriaAtiva !== "todas" && c.subcategoria !== subcategoriaAtiva) continue;
                if (filtroSemAudio && c.audio_url) continue;

                if (termo) {
                    const aval = pontuarCantigaSemantica(c, termo);
                    if (!aval.ok) continue;
                    motivosFiltradosPorIA[c.id] = aval.tags.length > 0 ? `Cruzamento: ${aval.tags.join(', ')}` : '';
                    listaComScore.push({ c, score: aval.score });
                } else {
                    listaComScore.push({ c, score: 0 });
                }
            }

            if (termo) listaComScore.sort((a, b) => b.score - a.score);
            filtradas = listaComScore.map(x => x.c);
        }

        if (filtradas.length === 0) {
            container.innerHTML = `
                <div class="text-center text-slate-400 text-xs py-10 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-3 p-4">
                    <p>Nenhuma cantiga encontrada neste filtro.</p>
                    ${cacheCantigasLivro.length === 0 ? `<button type="button" onclick="document.getElementById('inputImportarDocxCurimba').click()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow"><i class="fas fa-file-word mr-1.5"></i> Importar Livro da Curimba (.DOCX)</button>` : ''}
                </div>`;
            return;
        }

        container.innerHTML = filtradas.map(c => {
            const ritmoBadge = c.ritmo
                ? `<span class="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase"><i class="fas fa-drum mr-1"></i>${c.ritmo}</span>`
                : `<span class="bg-slate-800 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-700">Sem ritmo</span>`;

            const audioHtml = c.audio_url
                ? `<div class="mt-2 bg-slate-900 p-1.5 rounded-xl border border-indigo-500/30 flex items-center gap-2">
                       <span class="text-[10px] font-black text-indigo-400 uppercase px-2 shrink-0"><i class="fas fa-headphones mr-1"></i>Áudio:</span>
                       <audio controls preload="none" src="${c.audio_url}" class="w-full h-8"></audio>
                   </div>`
                : '';

            const melodiaHtml = c.obs_melodia
                ? `<div class="text-[11px] text-sky-300 bg-sky-950/50 border border-sky-800/50 rounded-lg px-2.5 py-1 mt-1.5"><i class="fas fa-music mr-1"></i> <strong>Melodia:</strong> ${c.obs_melodia}</div>`
                : '';

            return `
                    <div ondblclick="window.abrirModoFocoCantiga(${c.id})" ontouchend="if(!event.target.closest('button, audio')) window.detectarDuploToqueCurimba(event, () => window.abrirModoFocoCantiga(${c.id}))" class="card-cantiga-curimba bg-slate-900 rounded-2xl border border-slate-800 border-l-4 border-l-indigo-500 p-3.5 space-y-2 shadow-md transition-all duration-300 select-none cursor-pointer" title="Dê 2 toques para tela cheia">
                        <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                            <div>
                                <span class="text-[10px] font-bold text-indigo-400 uppercase block">${c.categoria}</span>
                                <h4 class="font-black text-sm text-amber-400 uppercase">${c.subcategoria || 'Geral'} ${c.titulo ? `• <span class="text-white">${c.titulo}</span>` : ''}</h4>
                            </div>
                            <div class="flex items-center gap-1.5">
                                ${ritmoBadge}
                                <button type="button" onclick="window.abrirModoFocoCantiga(${c.id}); event.stopPropagation();" class="bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-indigo-500/30 active:scale-95" title="Modo Foco (Tela Cheia)">
                                    <i class="fas fa-expand"></i> Foco
                                </button>
                                <button type="button" onclick="window.abrirModalEditarCantigaLivro(${c.id}); event.stopPropagation();" class="bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-slate-700 active:scale-95">
                                    <i class="fas fa-pen"></i> Editar
                                </button>
                            </div>
                        </div>
                        ${melodiaHtml}
                        ${audioHtml}
                        <div class="pt-1 font-medium text-slate-100 leading-relaxed" style="font-size: ${tamanhoFonteLivro}px;">
                            ${formatarLetraCantiga(c.letra)}
                        </div>
                        <div class="text-center pt-2 no-print">
                            <span class="text-[10px] font-bold text-slate-500 bg-slate-800/50 px-3 py-1 rounded-full"><i class="fas fa-expand-alt mr-1 text-indigo-500/50"></i> 2 toques na cantiga para tela cheia</span>
                        </div>
                    </div>
                `;
        }).join('');
    };

    // --- EDIÇÃO, CRIAÇÃO E GRAVADOR DE ÁUDIO ---
    function pararGravacaoLivroSeAtiva() {
        if (mediaRecorderLivro && mediaRecorderLivro.state === 'recording') mediaRecorderLivro.stop();
        if (timerGravacaoLivro) clearInterval(timerGravacaoLivro);
        const btn = document.getElementById('btnGravarAudioLivro');
        if (btn) {
            btn.className = 'flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition';
            btn.innerHTML = '<i class="fas fa-microphone"></i> <span>Gravar / Regravar Áudio</span>';
        }
        document.getElementById('timerGravacaoLivro')?.classList.add('hidden');
    }

    window.alternarGravacaoCantigaLivro = async () => {
        if (mediaRecorderLivro && mediaRecorderLivro.state === 'recording') {
            pararGravacaoLivroSeAtiva();
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const chunks = [];
            let opts = { audioBitsPerSecond: 16000 };
            if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) opts.mimeType = 'audio/webm;codecs=opus';
            mediaRecorderLivro = new MediaRecorder(stream, opts);

            mediaRecorderLivro.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
            mediaRecorderLivro.onstop = () => {
                stream.getTracks().forEach(t => t.stop());
                blobAudioNovoLivro = new Blob(chunks, { type: mediaRecorderLivro.mimeType || 'audio/webm' });
                const player = document.getElementById('playerPreviewLivro');
                const btnDel = document.getElementById('btnRemoverAudioLivro');
                if (player) { player.src = URL.createObjectURL(blobAudioNovoLivro); player.classList.remove('hidden'); }
                if (btnDel) btnDel.classList.remove('hidden');
            };

            mediaRecorderLivro.start();
            segundosGravacaoLivro = 0;
            const btn = document.getElementById('btnGravarAudioLivro');
            const timerEl = document.getElementById('timerGravacaoLivro');
            if (btn) {
                btn.className = 'flex-1 py-2 px-3 rounded-xl bg-gray-900 text-white font-black text-xs flex items-center justify-center gap-1.5 animate-pulse';
                btn.innerHTML = '<i class="fas fa-stop text-rose-500"></i> <span>Parar Gravação</span>';
            }
            if (timerEl) { timerEl.textContent = '00:00 / 01:30'; timerEl.classList.remove('hidden'); }

            timerGravacaoLivro = setInterval(() => {
                segundosGravacaoLivro++;
                const m = String(Math.floor(segundosGravacaoLivro / 60)).padStart(2, '0');
                const s = String(segundosGravacaoLivro % 60).padStart(2, '0');
                if (timerEl) timerEl.textContent = `${m}:${s} / 01:30`;
                if (segundosGravacaoLivro >= 90) pararGravacaoLivroSeAtiva();
            }, 1000);
        } catch (err) {
            alert('Permita o uso do microfone no navegador para gravar.');
        }
    };

    window.removerAudioCantigaLivro = () => {
        pararGravacaoLivroSeAtiva();
        blobAudioNovoLivro = null;
        urlAudioExistenteLivro = null;
        const player = document.getElementById('playerPreviewLivro');
        if (player) { player.pause(); player.src = ''; player.classList.add('hidden'); }
        document.getElementById('btnRemoverAudioLivro')?.classList.add('hidden');
    };

    window.inserirTagCantigaLivro = (tag) => {
        const area = document.getElementById('editCantigaLetra');
        if (!area) return;
        const start = area.selectionStart || 0;
        const end = area.selectionEnd || 0;
        area.value = area.value.substring(0, start) + tag + area.value.substring(end);
        area.focus();
    };

    window.abrirModalNovaCantigaLivro = () => {
        pararGravacaoLivroSeAtiva();
        blobAudioNovoLivro = null;
        urlAudioExistenteLivro = null;
        document.getElementById('tituloModalEditCantigaLivro').textContent = 'Nova Cantiga da Curimba';
        document.getElementById('editCantigaLivroId').value = '';
        document.getElementById('editCantigaCategoria').value = categoriaAtiva !== 'todas' ? categoriaAtiva : CATEGORIAS_CURIMBA[0];
        document.getElementById('editCantigaSubcategoria').value = subcategoriaAtiva !== 'todas' ? subcategoriaAtiva : '';
        document.getElementById('editCantigaTitulo').value = '';
        document.getElementById('editCantigaRitmo').value = '';
        document.getElementById('editCantigaMelodia').value = '';
        document.getElementById('editCantigaLetra').value = '';
        document.getElementById('playerPreviewLivro')?.classList.add('hidden');
        document.getElementById('btnRemoverAudioLivro')?.classList.add('hidden');
        document.getElementById('btnExcluirCantigaLivro')?.classList.add('hidden');
        document.getElementById('modalEditarCantigaLivro')?.classList.remove('hidden');
    };

    window.abrirModalEditarCantigaLivro = (id) => {
        pararGravacaoLivroSeAtiva();
        blobAudioNovoLivro = null;
        const c = cacheCantigasLivro.find(x => x.id === id);
        if (!c) return;

        document.getElementById('tituloModalEditCantigaLivro').textContent = 'Editar Cantiga';
        document.getElementById('editCantigaLivroId').value = c.id;
        document.getElementById('editCantigaCategoria').value = c.categoria || CATEGORIAS_CURIMBA[0];
        document.getElementById('editCantigaSubcategoria').value = c.subcategoria || '';
        document.getElementById('editCantigaTitulo').value = c.titulo || '';
        document.getElementById('editCantigaRitmo').value = c.ritmo || '';
        document.getElementById('editCantigaMelodia').value = c.obs_melodia || '';
        document.getElementById('editCantigaLetra').value = c.letra || '';

        urlAudioExistenteLivro = c.audio_url || null;
        const player = document.getElementById('playerPreviewLivro');
        const btnDel = document.getElementById('btnRemoverAudioLivro');
        if (urlAudioExistenteLivro && player) {
            player.src = urlAudioExistenteLivro;
            player.classList.remove('hidden');
            btnDel?.classList.remove('hidden');
        } else {
            player?.classList.add('hidden');
            btnDel?.classList.add('hidden');
        }

        document.getElementById('btnExcluirCantigaLivro')?.classList.remove('hidden');
        document.getElementById('modalEditarCantigaLivro')?.classList.remove('hidden');
    };

    window.fecharModalEditarCantigaLivro = () => {
        pararGravacaoLivroSeAtiva();
        document.getElementById('modalEditarCantigaLivro')?.classList.add('hidden');
    };

    window.salvarCantigaLivro = async () => {
        pararGravacaoLivroSeAtiva();
        const id = document.getElementById('editCantigaLivroId').value;
        const letra = document.getElementById('editCantigaLetra').value.trim();
        if (!letra) return alert('Digite a letra da cantiga.');

        const btn = document.getElementById('btnSalvarCantigaLivro');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Salvando...';

        try {
            let finalAudioUrl = urlAudioExistenteLivro;
            if (blobAudioNovoLivro) {
                const ext = (blobAudioNovoLivro.type && blobAudioNovoLivro.type.includes('mp4')) ? 'mp4' : 'webm';
                const filePath = `curimba_livro_audio/cantiga_${idTerreiroGlobal}_${Date.now()}.${ext}`;
                const { error: upErr } = await supabaseClient.storage.from('logos').upload(filePath, blobAudioNovoLivro, { upsert: true });
                if (upErr) throw upErr;
                const { data: pubData } = supabaseClient.storage.from('logos').getPublicUrl(filePath);
                finalAudioUrl = pubData.publicUrl;
            }

            const payload = {
                terreiro_id: idTerreiroGlobal,
                categoria: document.getElementById('editCantigaCategoria').value,
                subcategoria: document.getElementById('editCantigaSubcategoria').value.trim() || 'Geral',
                titulo: document.getElementById('editCantigaTitulo').value.trim() || null,
                ritmo: document.getElementById('editCantigaRitmo').value || null,
                obs_melodia: document.getElementById('editCantigaMelodia').value.trim() || null,
                letra: letra,
                audio_url: finalAudioUrl
            };

            if (id) {
                const { error } = await supabaseClient
                    .from('curimba_cantigas')
                    .update(payload)
                    .eq('id', parseInt(id))
                    .eq('terreiro_id', idTerreiroGlobal);
                if (error) throw error;
            } else {
                const { error } = await supabaseClient.from('curimba_cantigas').insert([payload]);
                if (error) throw error;
            }

            window.fecharModalEditarCantigaLivro();
            await carregarCantigasDoBanco();
        } catch (err) {
            alert('Erro ao salvar: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save mr-1"></i> Salvar Cantiga';
        }
    };

    window.excluirCantigaLivroAtual = async () => {
        const id = document.getElementById('editCantigaLivroId').value;
        if (!id || !confirm('Deseja excluir esta cantiga do Livro da Curimba?')) return;
        await supabaseClient
            .from('curimba_cantigas')
            .delete()
            .eq('id', parseInt(id))
            .eq('terreiro_id', idTerreiroGlobal);
        window.fecharModalEditarCantigaLivro();
        await carregarCantigasDoBanco();
    };

    // --- IMPORTADOR AUTOMÁTICO DO ARQUIVO .DOCX ---
    window.importarDocxLivroCurimba = async (input) => {
        const file = input.files?.[0];
        if (!file) return;

        if (!confirm(`Deseja importar as cantigas do arquivo "${file.name}" para o Livro da Curimba?`)) {
            input.value = '';
            return;
        }

        const substituirExistentes = cacheCantigasLivro.length > 0
            ? confirm(`Já existem ${cacheCantigasLivro.length} cantigas cadastradas.\n\nClique em "OK" para APAGAR as atuais e substituir pelo novo arquivo.\nClique em "Cancelar" para MANTER as atuais e apenas adicionar as novas.`)
            : false;

        try {
            if (typeof mammoth === 'undefined') {
                await new Promise((resolve, reject) => {
                    const s = document.createElement('script');
                    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
                    s.onload = resolve;
                    s.onerror = reject;
                    document.head.appendChild(s);
                });
            }

            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            const linhas = result.value.split(/\r?\n/).map(l => l.trim());

            const mapaSecoes = [
                { match: /^1\.\s*HINOS|^REFLETIU A LUZ DIVINA|^HINO D/i, cat: "1. Hinos Oficiais" },
                { match: /^2\.\s*PONTOS DE DEFUMA|^PONTOS DE DEFUMAÇÃO|^DEFUMADOR/i, cat: "2. Pontos de Defumação" },
                { match: /^3\.\s*ABERTURA|^PONTOS DE ABERTURA E ENCERRAMENTO|^ABERTURA E ENCERRAMENTO DOS/i, cat: "3. Abertura, Encerramento e Rituais" },
                { match: /^4\.\s*PRECES|^PRECES DIVERSAS|^PRECE DE CÁRITAS/i, cat: "4. Preces Diversas" },
                { match: /^5\.\s*OXAL|^PONTOS DE OXALÁ/i, cat: "5. Oxalá" },
                { match: /^6\.\s*POVO DO ORIENTE|^PONTOS DO POVO DO ORIENTE|^PONTOS DE SUBIDA DE POVO DO ORIENTE/i, cat: "6. Povo do Oriente" },
                { match: /^7\.\s*IBEIJADA|^PONTOS DE IBEIJADA|^PONTOS DE SUBIDA DE IBEIJADA/i, cat: "7. Ibeijada" },
                { match: /^8\.\s*OXÓSSI|^PONTOS DE OXÓSSI/i, cat: "8. Oxóssi" },
                { match: /^9\.\s*CABOCLOS|^DESCIDA DOS CABOCLOS ARRANCA-TOCO|^DESCIDA DOS MORUBIXABAS|^DESCIDA DO CABOCLO BOIADEIRO DA MATA|^DESCIDA DA CABOCLA CACHOEIRA|^DESCIDA DO CABOCLO GUERREIRO|^DESCIDA DO CABOCLO BOIADEIRO DOS PAMPAS|^DESCIDA DE OGUM BEIRA MAR|^DESCIDA DO CABOCLO BOIADEIRO DA ESTRADA|^DESCIDA DO CABOCLO BOIADEIRO NAVIZALA|^DESCIDA DO CABOCLO COBRA D/i, cat: "9. Caboclos - Tupixabas e Morubixabas" },
                { match: /^10\.\s*CABOCLOS|^PONTOS DE CABOCLOS|^PONTOS DE BOIADEIRO|^PONTOS DE CABOCLAS|^PONTOS DE SUBIDA DE CABOCLOS/i, cat: "10. Caboclos, Boiadeiros e Caboclas" },
                { match: /^11\.\s*OGUM|^PONTOS DE OGUM|^PONTOS DE SUBIDA DE OGUM/i, cat: "11. Ogum" },
                { match: /^12\.\s*IEMANJ|^PONTOS DE IEMANJÁ|^PONTOS DE SUBIDA DE IEMANJÁ/i, cat: "12. Iemanjá" },
                { match: /^13\.\s*MARINHEIROS|^PONTOS DE MARINHEIROS|^PONTOS DE SUBIDA DE MARINHEIROS/i, cat: "13. Marinheiros" },
                { match: /^14\.\s*OXUM|^PONTOS DE OXUM|^PONTOS DE SUBIDA DE OXUM/i, cat: "14. Oxum" },
                { match: /^15\.\s*NAN|^PONTOS DE NANÃ|^PONTOS DE SUBIDA DE NANÃ/i, cat: "15. Nanã Buruquê" },
                { match: /^16\.\s*IANS|^PONTOS DE IANSÃ|^PONTOS DE SUBIDA DE IANSÃ/i, cat: "16. Iansã" },
                { match: /^17\.\s*XANG|^PONTOS DE XANGÔ|^PONTOS DE SUBIDA DE XANGÔ/i, cat: "17. Xangô" },
                { match: /^18\.\s*OMUL|^PONTOS DE OMULÚ|^PONTOS DE SUBIDA OMULÚ/i, cat: "18. Omulú" },
                { match: /^19\.\s*PRETOS VELHOS|^DESCIDA DO PAI JOÃO DA PEDREIRA|^DESCIDA DO PAI JOAQUIM DE ANGOLA|^DESCIDA DA VOVÓ CATARINA|^DESCIDA DA VOVÓ CAMBINDA|^DESCIDA DO PAI JOSÉ DO CRUZEIRO|^DESCIDA DO PAI BENEDITO DAS ALMAS|^DESCIDA DA VOVÓ MARIA CONGA|^DESCIDA DO PAI JOAQUIM DE ARUANDA|^DESCIDA DO VOVÔ BENEDITO AFRICANO/i, cat: "19. Pretos Velhos - Tupixabas e Morubixabas" },
                { match: /^20\.\s*PRETOS VELHOS|^PONTOS DE PRETOS VELHOS|^PONTOS DO POVO DE CONGO|^PONTOS DO POVO DE ANGOLA|^PONTOS DO POVO DE MINAS|^PONTOS DO POVO DA BAHIA|^PONTOS DO POVO DO CATIVEIRO|^PONTOS DAS SANTAS ALMAS|^PONTOS DE SANTO ANTÔNIO|^PONTOS DE SUBIDA DE PRETOS VELHOS/i, cat: "20. Pretos Velhos e Falanges (Congo, Angola, Minas, Bahia, Almas)" },
                { match: /^21\.\s*EX|^PONTOS DE EXÚS|^PONTOS DE POMBAGIRAS|^PONTOS DE MALANDROS|^PONTOS DE SUBIDA DE EXÚS/i, cat: "21. Exús, Pombagiras e Malandros" },
                { match: /^22\.\s*ENCERRAMENTO|^ENCERRAMENTO DE GIRA OFICIAL/i, cat: "22. Encerramento de Gira Oficial" }
            ];

            const ehSubtitulo = (str) => {
                if (!str || str.length > 65) return false;
                return /^(SUBCATEGORIA:|GUIA:|HINO |VIBRAÇÃO |SALVE |OKÊ CABOCLO|JETRUÁ BOIADEIRO|CABOCLO |CABOCLA |CABOCLINH|BOIADEIRO |OGUM |PAI |MÃE |TIA |TIO |VOVÓ |VOVÔ |PRETO VELHO|PRETA VELHA|REI CONGO|NEGA |EXÚ |POMBAGIRA |ZÉ PELINTRA|CAMISA PRETA|MESTRE |TUNIQUINHO|FREI |NOSSA SENHORA|SÃO |COSMINHO|DAMIÃO|DOUM|FORMIGUINHA|JUREMINHA|MARIAZINHA|PEDRINHO|PINGUINHO|ROSINHA|TEREZINHA|ZEZINHO|DESCIDA |SUBIDA |LOUVAÇÃO |CRUZAMENTO |IMANTAÇÃO |BATER CABEÇA|SAUDAÇÃO |CORTAR BOLO|VISITA |HOMENAGEM |DESPEDIDA|RITUAL |BATIZA|FINALIZAR BATIZADO|CONSAGRAÇÃO|PRECE |ORAÇÃO )/i.test(str);
            };

            let catAtual = null;
            let subAtual = "Geral";
            let tituloAtual = null;
            let ritmoAtual = null;
            let melodiaAtual = null;
            let bufferLetra = [];
            let registros = [];
            let ordem = 1;

            const fecharPonto = () => {
                const textoLimpo = bufferLetra.join('\n').trim();
                if (catAtual && textoLimpo.length > 10) {
                    registros.push({
                        terreiro_id: idTerreiroGlobal,
                        categoria: catAtual,
                        subcategoria: subAtual || 'Geral',
                        titulo: tituloAtual,
                        ritmo: ritmoAtual,
                        obs_melodia: melodiaAtual,
                        letra: textoLimpo,
                        ordem: ordem++
                    });
                }
                bufferLetra = [];
                tituloAtual = null;
                ritmoAtual = null;
                melodiaAtual = null;
            };

            for (const l of linhas) {
                if (!l) continue;

                if (/^---+$/.test(l)) {
                    fecharPonto();
                    continue;
                }

                const sec = mapaSecoes.find(s => s.match.test(l));
                if (sec) {
                    fecharPonto();
                    catAtual = sec.cat;
                    if (ehSubtitulo(l)) subAtual = l.replace(/^(SUBCATEGORIA|GUIA):\s*/i, '').trim();
                    continue;
                }
                if (!catAtual) continue;

                if (/^(TITULO|TÍTULO|PONTO):\s*/i.test(l)) {
                    if (bufferLetra.length > 0) fecharPonto();
                    tituloAtual = l.replace(/^(TITULO|TÍTULO|PONTO):\s*/i, '').trim();
                    continue;
                }
                if (/^(RITMO|TOQUE):\s*/i.test(l)) {
                    ritmoAtual = l.replace(/^(RITMO|TOQUE):\s*/i, '').trim();
                    continue;
                }
                if (/^(MELODIA|TOM|OBS):\s*/i.test(l)) {
                    melodiaAtual = l.replace(/^(MELODIA|TOM|OBS):\s*/i, '').trim();
                    continue;
                }

                if (ehSubtitulo(l)) {
                    fecharPonto();
                    const limpo = l.replace(/^(SUBCATEGORIA|GUIA):\s*/i, '').trim();
                    const partes = limpo.split(/\s*[•\-–]\s*/);
                    subAtual = partes[0].trim();
                    if (partes.length > 1) tituloAtual = partes.slice(1).join(' - ').trim();
                } else {
                    bufferLetra.push(l);
                }
            }
            fecharPonto();

            if (registros.length === 0) {
                alert('Não foi possível identificar cantigas no arquivo selecionado.');
                return;
            }

            // Função que limpa pontuação, espaços, acentos e tags [BIS]/[2X] para comparar letras
            const limparParaComparar = (txt) => String(txt || '')
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/\[(bis|2x|3x|4x|refrao)\]/gi, '')
                .replace(/\b(bis|2x|3x|4x)\b/gi, '')
                .replace(/[^a-z0-9]/gi, '')
                .toLowerCase();

            // 1. Filtra duplicadas dentro do próprio arquivo que está sendo importado
            const vistosNoArquivo = new Set();
            let registrosUnicos = [];
            let ignoradasExatas = 0;

            for (const reg of registros) {
                const assinatura = `${reg.categoria}||${limparParaComparar(reg.letra)}`;
                if (vistosNoArquivo.has(assinatura)) {
                    ignoradasExatas++;
                    continue;
                }
                vistosNoArquivo.add(assinatura);
                registrosUnicos.push(reg);
            }

            if (substituirExistentes) {
                const { error: errDel } = await supabaseClient
                    .from('curimba_cantigas')
                    .delete()
                    .eq('terreiro_id', idTerreiroGlobal);
                if (errDel) throw errDel;
            } else if (cacheCantigasLivro.length > 0) {
                // 2. Compara com as cantigas que já existem no banco de dados
                const existentesProcessadas = cacheCantigasLivro.map(c => ({
                    cat: c.categoria,
                    sub: c.subcategoria,
                    titulo: c.titulo,
                    letraOriginal: c.letra,
                    limpa: limparParaComparar(c.letra)
                }));

                const aprovadasParaInserir = [];
                let pularTodasDuvidosas = false;
                let importarTodasDuvidosas = false;

                for (const reg of registrosUnicos) {
                    const novaLimpa = limparParaComparar(reg.letra);
                    if (!novaLimpa) continue;

                    // Verifica se já existe letra 100% idêntica no banco
                    const duplicadaExata = existentesProcessadas.find(ex => ex.limpa === novaLimpa);
                    if (duplicadaExata) {
                        ignoradasExatas++;
                        continue;
                    }

                    // Verifica caso de dúvida (mesmo início de letra ou contida uma na outra)
                    const prefixo = novaLimpa.substring(0, Math.min(45, novaLimpa.length));
                    const parecida = prefixo.length >= 25 ? existentesProcessadas.find(ex =>
                        ex.limpa.includes(prefixo) || novaLimpa.includes(ex.limpa.substring(0, Math.min(45, ex.limpa.length)))
                    ) : null;

                    if (parecida) {
                        if (pularTodasDuvidosas) {
                            ignoradasExatas++;
                            continue;
                        }
                        if (!importarTodasDuvidosas) {
                            const trechoExistente = String(parecida.letraOriginal || '').substring(0, 120).replace(/\n/g, ' / ');
                            const trechoNova = String(reg.letra || '').substring(0, 120).replace(/\n/g, ' / ');

                            const resp = prompt(
                                `⚠️ DÚVIDA DE POSSÍVEL DUPLICIDADE:\n\n` +
                                `JÁ EXISTE NO LIVRO (${parecida.sub}):\n"${trechoExistente}..."\n\n` +
                                `NOVA NO ARQUIVO (${reg.subcategoria}):\n"${trechoNova}..."\n\n` +
                                `Digite:\n` +
                                `1 = Pular esta cantiga (Não importar)\n` +
                                `2 = Importar mesmo assim\n` +
                                `3 = Pular TODAS as parecidas automaticamente\n` +
                                `4 = Importar TODAS as parecidas sem perguntar novamente`,
                                '1'
                            );

                            if (resp === '3') {
                                pularTodasDuvidosas = true;
                                ignoradasExatas++;
                                continue;
                            } else if (resp === '4') {
                                importarTodasDuvidosas = true;
                            } else if (resp !== '2') {
                                ignoradasExatas++;
                                continue;
                            }
                        }
                    }

                    aprovadasParaInserir.push(reg);
                    existentesProcessadas.push({
                        cat: reg.categoria,
                        sub: reg.subcategoria,
                        titulo: reg.titulo,
                        letraOriginal: reg.letra,
                        limpa: novaLimpa
                    });
                }

                registrosUnicos = aprovadasParaInserir;
            }

            if (registrosUnicos.length === 0) {
                alert(`ℹ️ Nenhuma cantiga nova para adicionar (${ignoradasExatas} cantiga(s) idêntica(s) ou repetida(s) foram ignoradas automaticamente).`);
                return;
            }

            for (let i = 0; i < registrosUnicos.length; i += 100) {
                const lote = registrosUnicos.slice(i, i + 100);
                const { error } = await supabaseClient.from('curimba_cantigas').insert(lote);
                if (error) throw error;
            }

            alert(
                `✅ Importação concluída com sucesso!\n\n` +
                `• Cantigas importadas: ${registrosUnicos.length}\n` +
                (ignoradasExatas > 0 ? `• Duplicadas ignoradas: ${ignoradasExatas}` : '')
            );
            await carregarCantigasDoBanco();
        } catch (err) {
            alert('Erro ao importar arquivo .DOCX: ' + err.message);
        } finally {
            input.value = '';
        }
    };

    // --- EXPORTADOR DE PDF A4 DO LIVRO GERAL DA CURIMBA (PAISAGEM / VETORIAL SEM PÁGINAS EM BRANCO) ---
    window.exportarPDFLivroCurimba = async () => {
        if (!cacheCantigasLivro || cacheCantigasLivro.length === 0) {
            return alert('Não há cantigas carregadas para gerar o PDF.');
        }

        if (typeof html2pdf === 'undefined' && typeof window.jspdf === 'undefined') {
            await new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
                s.onload = resolve;
                s.onerror = reject;
                document.head.appendChild(s);
            });
        }

        const listaParaImprimir = categoriaAtiva === 'todas'
            ? cacheCantigasLivro
            : cacheCantigasLivro.filter(c => c.categoria === categoriaAtiva && (subcategoriaAtiva === 'todas' || c.subcategoria === subcategoriaAtiva));

        if (listaParaImprimir.length === 0) {
            return alert('Nenhuma cantiga encontrada no filtro atual para gerar o PDF.');
        }

        const nomeTemplo = (typeof nomeTerreiroGlobal !== 'undefined' && nomeTerreiroGlobal)
            ? nomeTerreiroGlobal
            : (document.getElementById('nomeTerreiro')?.textContent || 'Templo');

        const logoTemplo = (typeof logoTerreiroGlobal !== 'undefined' && logoTerreiroGlobal)
            ? logoTerreiroGlobal
            : (document.getElementById('logoTerreiro')?.src || '');

        const carregarLogoBase64 = (url) => new Promise((resolve) => {
            if (!url || url.endsWith('.html')) return resolve(null);
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth || img.width;
                    canvas.height = img.naturalHeight || img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/png'));
                } catch (e) { resolve(null); }
            };
            img.onerror = () => resolve(null);
            img.src = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
        });

        const logoBase64 = await carregarLogoBase64(logoTemplo);

        // Cria um PDF vetorial nativo via jsPDF em Retrato / Em Pé (A4: 210mm x 297mm)
        const worker = html2pdf().set({ jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(document.createElement('div')).toPdf();
        const pdf = await worker.get('pdf');

        const pageW = pdf.internal.pageSize.getWidth();  // 210 mm
        const pageH = pdf.internal.pageSize.getHeight(); // 297 mm
        const marginX = 10;
        const usableW = pageW - (marginX * 2); // 190 mm

        // Colunas ajustadas para formato Livro (Em Pé) dando amplo destaque à Letra da Cantiga
        const colW = [36, 44, 30, usableW - 36 - 44 - 30]; // 36mm | 44mm | 30mm | 80mm (Letra)
        const headers = ['CLASSIFICAÇÃO', 'GUIA / TÍTULO', 'TOQUE / TOM', 'LETRA DA CANTIGA'];

        const dataAtual = `${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        const tituloRelatorio = `Livro Geral da Curimba ${categoriaAtiva !== 'todas' ? `— ${categoriaAtiva}` : '(Completo)'}`;

        const desenharCabecalho = (ehPrimeira) => {
            if (ehPrimeira) {
                if (logoBase64) {
                    try { pdf.addImage(logoBase64, 'PNG', marginX, 8, 16, 16); } catch (e) {}
                }
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(13);
                pdf.setTextColor(30, 58, 138); // #1e3a8a
                pdf.text(nomeTemplo.toUpperCase(), pageW / 2, 13, { align: 'center' });

                pdf.setFontSize(10.5);
                pdf.setTextColor(71, 85, 105); // #475569
                pdf.text(tituloRelatorio, pageW / 2, 18.5, { align: 'center' });

                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(8);
                pdf.setTextColor(100, 116, 139); // #64748b
                pdf.text(`Emitido em: ${dataAtual} | Registros: ${listaParaImprimir.length}`, pageW / 2, 23, { align: 'center' });

                pdf.setDrawColor(37, 99, 235); // Linha Azul #2563eb
                pdf.setLineWidth(0.6);
                pdf.line(marginX, 26, pageW - marginX, 26);
                return 29;
            } else {
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(8.5);
                pdf.setTextColor(71, 85, 105);
                pdf.text(`${nomeTemplo} — ${tituloRelatorio} (Continuação)`, marginX, 12);

                pdf.setDrawColor(203, 213, 225); // #cbd5e1
                pdf.setLineWidth(0.3);
                pdf.line(marginX, 14.5, pageW - marginX, 14.5);
                return 17.5;
            }
        };

        const desenharCabecalhoTabela = (yTop) => {
            const hHead = 7.5;
            pdf.setFillColor(241, 245, 249); // #f1f5f9
            pdf.setDrawColor(203, 213, 225); // #cbd5e1
            pdf.setLineWidth(0.25);

            let xCur = marginX;
            headers.forEach((h, i) => {
                pdf.rect(xCur, yTop, colW[i], hHead, 'FD');
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(8.5);
                pdf.setTextColor(30, 41, 59); // #1e293b
                pdf.text(h, xCur + 2.5, yTop + 5);
                xCur += colW[i];
            });
            return yTop + hHead;
        };

        let y = desenharCabecalho(true);
        y = desenharCabecalhoTabela(y);
        const limiteRodape = pageH - 15; // 195 mm
        const lineH = 4.1;

        listaParaImprimir.forEach((c, idx) => {
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(8.5);
            const txtCat = pdf.splitTextToSize(String(c.categoria || '-'), colW[0] - 5);

            const strSub = `${c.subcategoria || 'Geral'}${c.titulo ? `\n• ${c.titulo}` : ''}`;
            const txtSub = pdf.splitTextToSize(strSub, colW[1] - 5);

            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            const strInfo = [
                c.ritmo ? `Toque: ${c.ritmo}` : '',
                c.obs_melodia ? `Melodia: ${c.obs_melodia}` : ''
            ].filter(Boolean).join('\n') || '-';
            const txtInfo = pdf.splitTextToSize(strInfo, colW[2] - 5);

            pdf.setFontSize(8.5);
            const txtLetra = pdf.splitTextToSize(String(c.letra || '-').trim(), colW[3] - 5);

            const maxLines = Math.max(txtCat.length, txtSub.length, txtInfo.length, txtLetra.length);
            const rowH = (maxLines * lineH) + 4;

            // Se a cantiga não couber na página atual, abre nova página mantendo o cabeçalho
            if (y + rowH > limiteRodape && y > 38) {
                pdf.addPage();
                y = desenharCabecalho(false);
                y = desenharCabecalhoTabela(y);
            }

            // Fundo zebrado idêntico ao gerarPDFRelatorio
            if (idx % 2 === 0) {
                pdf.setFillColor(255, 255, 255);
            } else {
                pdf.setFillColor(248, 250, 252); // #f8fafc
            }
            pdf.setDrawColor(226, 232, 240); // #e2e8f0
            pdf.setLineWidth(0.2);

            let xCur = marginX;
            for (let i = 0; i < 4; i++) {
                pdf.rect(xCur, y, colW[i], rowH, 'FD');
                xCur += colW[i];
            }

            // Coluna 1: Classificação
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(8);
            pdf.setTextColor(30, 58, 138);
            pdf.text(txtCat, marginX + 2.5, y + 4.5);

            // Coluna 2: Sub-classificação e Título
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(8.5);
            pdf.setTextColor(30, 41, 59);
            pdf.text(txtSub, marginX + colW[0] + 2.5, y + 4.5);

            // Coluna 3: Toque / Melodia
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(180, 83, 9);
            pdf.text(txtInfo, marginX + colW[0] + colW[1] + 2.5, y + 4.5);

            // Coluna 4: Letra da Cantiga
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8.5);
            pdf.setTextColor(15, 23, 42);
            pdf.text(txtLetra, marginX + colW[0] + colW[1] + colW[2] + 2.5, y + 4.5);

            y += rowH;
        });

        // Numeração de páginas no topo direito e no rodapé (igual ao gerarPDFRelatorio)
        const totalPages = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(148, 163, 184);
            pdf.text(`Pág. ${i}/${totalPages}`, pageW - marginX, i === 1 ? 13 : 12, { align: 'right' });

            pdf.setTextColor(100, 100, 100);
            pdf.text(`Página ${i} de ${totalPages}`, pageW - marginX, pageH - 7, { align: 'right' });
            pdf.text(`${nomeTemplo} — Documento Oficial`, marginX, pageH - 7, { align: 'left' });
        }

        pdf.save(`Livro_Curimba_${nomeTemplo.replace(/\s+/g, '_')}.pdf`);
    };
})();
