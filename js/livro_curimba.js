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
            <!-- Filtros -->
            <div class="bg-slate-900/90 border-b border-slate-800 p-3 space-y-2 shrink-0">
                <div class="flex flex-wrap sm:flex-nowrap gap-1.5">
                    <div class="relative flex-1 min-w-[160px] flex gap-1.5">
                        <div class="relative flex-1">
                            <i class="fas fa-search absolute left-3 top-2.5 text-slate-400 text-xs"></i>
                            <input type="text" id="buscaLivroCurimbaInput" oninput="window.limparFiltroIALivro(); window.renderizarCardsLivroCurimba()" onkeydown="if(event.key==='Enter'){event.preventDefault(); window.buscarComIALivroCurimba();}" placeholder="Ex: Cabocla de Iemanjá, Caboclo de Ogum..." class="w-full pl-8 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 outline-none focus:border-indigo-500" style="color: #ffffff !important;">
                        </div>
                        <button type="button" id="btnBuscarIALivro" onclick="window.buscarComIALivroCurimba()" class="px-3 py-2 rounded-xl text-[11px] font-black bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow flex items-center gap-1.5 shrink-0 active:scale-95 transition" title="Busca Inteligente por Contexto e Cruzamento de Linhas">
                            <i class="fas fa-wand-magic-sparkles"></i> <span>IA</span>
                        </button>
                    </div>
                    <button type="button" id="btnFiltroSemAudioLivro" onclick="window.alternarFiltroSemAudioLivro()" class="px-3 py-2 rounded-xl text-[11px] font-black border transition active:scale-95 flex items-center gap-1.5 shrink-0 bg-slate-800 text-amber-300 border-slate-700">
                        <i class="fas fa-microphone-slash text-[10px]"></i> Sem Áudio
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

    const normalizarTextoBusca = (str) => String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    let idsFiltradosPorIA = null;
    let motivosFiltradosPorIA = {};

    window.limparFiltroIALivro = () => {
        idsFiltradosPorIA = null;
        motivosFiltradosPorIA = {};
        document.getElementById('bannerRespostaIALivro')?.classList.add('hidden');
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
                <div class="bg-slate-900 rounded-2xl border border-slate-800 border-l-4 border-l-indigo-500 p-3.5 space-y-2 shadow-md">
                    <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                        <div>
                            <span class="text-[10px] font-bold text-indigo-400 uppercase block">${c.categoria}</span>
                            <h4 class="font-black text-sm text-amber-400 uppercase">${c.subcategoria || 'Geral'} ${c.titulo ? `• <span class="text-white">${c.titulo}</span>` : ''}</h4>
                        </div>
                        <div class="flex items-center gap-1.5">
                            ${ritmoBadge}
                            <button type="button" onclick="window.abrirModalEditarCantigaLivro(${c.id})" class="bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-slate-700 active:scale-95">
                                <i class="fas fa-pen"></i> Editar
                            </button>
                        </div>
                    </div>
                    ${melodiaHtml}
                    ${audioHtml}
                    <div class="pt-1 font-medium text-slate-100 leading-relaxed select-text" style="font-size: ${tamanhoFonteLivro}px;">
                        ${formatarLetraCantiga(c.letra)}
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
                const { error } = await supabaseClient.from('curimba_cantigas').update(payload).eq('id', parseInt(id));
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
        await supabaseClient.from('curimba_cantigas').delete().eq('id', parseInt(id));
        window.fecharModalEditarCantigaLivro();
        await carregarCantigasDoBanco();
    };

    // --- IMPORTADOR AUTOMÁTICO DO ARQUIVO .DOCX ---
    window.importarDocxLivroCurimba = async (input) => {
        const file = input.files?.[0];
        if (!file) return;

        if (!confirm(`Deseja importar todas as cantigas e classificações do arquivo "${file.name}" para o Livro da Curimba deste Terreiro?`)) {
            input.value = '';
            return;
        }

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
                { match: /^REFLETIU A LUZ DIVINA|^HINO D/, cat: "1. Hinos Oficiais" },
                { match: /^PONTOS DE DEFUMAÇÃO|^DEFUMADOR/, cat: "2. Pontos de Defumação" },
                { match: /^PONTOS DE ABERTURA E ENCERRAMENTO|^ABERTURA E ENCERRAMENTO DOS/, cat: "3. Abertura, Encerramento e Rituais" },
                { match: /^PRECES DIVERSAS|^PRECE DE CÁRITAS/, cat: "4. Preces Diversas" },
                { match: /^PONTOS DE OXALÁ/, cat: "5. Oxalá" },
                { match: /^PONTOS DO POVO DO ORIENTE|^PONTOS DE SUBIDA DE POVO DO ORIENTE/, cat: "6. Povo do Oriente" },
                { match: /^PONTOS DE IBEIJADA|^PONTOS DE SUBIDA DE IBEIJADA/, cat: "7. Ibeijada" },
                { match: /^PONTOS DE OXÓSSI/, cat: "8. Oxóssi" },
                { match: /^DESCIDA DOS CABOCLOS ARRANCA-TOCO|^DESCIDA DOS MORUBIXABAS|^DESCIDA DO CABOCLO BOIADEIRO DA MATA|^DESCIDA DA CABOCLA CACHOEIRA|^DESCIDA DO CABOCLO GUERREIRO|^DESCIDA DO CABOCLO BOIADEIRO DOS PAMPAS|^DESCIDA DE OGUM BEIRA MAR|^DESCIDA DO CABOCLO BOIADEIRO DA ESTRADA|^DESCIDA DO CABOCLO BOIADEIRO NAVIZALA|^DESCIDA DO CABOCLO COBRA D/, cat: "9. Caboclos - Tupixabas e Morubixabas" },
                { match: /^PONTOS DE CABOCLOS|^PONTOS DE BOIADEIRO|^PONTOS DE CABOCLAS|^PONTOS DE SUBIDA DE CABOCLOS/, cat: "10. Caboclos, Boiadeiros e Caboclas" },
                { match: /^PONTOS DE OGUM|^PONTOS DE SUBIDA DE OGUM/, cat: "11. Ogum" },
                { match: /^PONTOS DE IEMANJÁ|^PONTOS DE SUBIDA DE IEMANJÁ/, cat: "12. Iemanjá" },
                { match: /^PONTOS DE MARINHEIROS|^PONTOS DE SUBIDA DE MARINHEIROS/, cat: "13. Marinheiros" },
                { match: /^PONTOS DE OXUM|^PONTOS DE SUBIDA DE OXUM/, cat: "14. Oxum" },
                { match: /^PONTOS DE NANÃ|^PONTOS DE SUBIDA DE NANÃ/, cat: "15. Nanã Buruquê" },
                { match: /^PONTOS DE IANSÃ|^PONTOS DE SUBIDA DE IANSÃ/, cat: "16. Iansã" },
                { match: /^PONTOS DE XANGÔ|^PONTOS DE SUBIDA DE XANGÔ/, cat: "17. Xangô" },
                { match: /^PONTOS DE OMULÚ|^PONTOS DE SUBIDA OMULÚ/, cat: "18. Omulú" },
                { match: /^DESCIDA DO PAI JOÃO DA PEDREIRA|^DESCIDA DO PAI JOAQUIM DE ANGOLA|^DESCIDA DA VOVÓ CATARINA|^DESCIDA DA VOVÓ CAMBINDA|^DESCIDA DO PAI JOSÉ DO CRUZEIRO|^DESCIDA DO PAI BENEDITO DAS ALMAS|^DESCIDA DA VOVÓ MARIA CONGA|^DESCIDA DO PAI JOAQUIM DE ARUANDA|^DESCIDA DO VOVÔ BENEDITO AFRICANO/, cat: "19. Pretos Velhos - Tupixabas e Morubixabas" },
                { match: /^PONTOS DE PRETOS VELHOS|^PONTOS DO POVO DE CONGO|^PONTOS DO POVO DE ANGOLA|^PONTOS DO POVO DE MINAS|^PONTOS DO POVO DA BAHIA|^PONTOS DO POVO DO CATIVEIRO|^PONTOS DAS SANTAS ALMAS|^PONTOS DE SANTO ANTÔNIO|^PONTOS DE SUBIDA DE PRETOS VELHOS/, cat: "20. Pretos Velhos e Falanges (Congo, Angola, Minas, Bahia, Almas)" },
                { match: /^PONTOS DE EXÚS|^PONTOS DE POMBAGIRAS|^PONTOS DE MALANDROS|^PONTOS DE SUBIDA DE EXÚS/, cat: "21. Exús, Pombagiras e Malandros" },
                { match: /^ENCERRAMENTO DE GIRA OFICIAL/, cat: "22. Encerramento de Gira Oficial" }
            ];

            const ehSubtitulo = (str) => {
                if (!str || str.length > 55) return false;
                return /^(HINO |VIBRAÇÃO |SALVE |OKÊ CABOCLO|JETRUÁ BOIADEIRO|CABOCLO |CABOCLA |CABOCLINH|BOIADEIRO |OGUM |PAI |MÃE |TIA |TIO |VOVÓ |VOVÔ |PRETO VELHO|PRETA VELHA|REI CONGO|NEGA |EXÚ |POMBAGIRA |ZÉ PELINTRA|CAMISA PRETA|MESTRE |TUNIQUINHO|FREI |NOSSA SENHORA|SÃO |COSMINHO|DAMIÃO|DOUM|FORMIGUINHA|JUREMINHA|MARIAZINHA|PEDRINHO|PINGUINHO|ROSINHA|TEREZINHA|ZEZINHO|DESCIDA |SUBIDA |LOUVAÇÃO |CRUZAMENTO |IMANTAÇÃO |BATER CABEÇA|SAUDAÇÃO |CORTAR BOLO|VISITA |HOMENAGEM |DESPEDIDA|RITUAL |BATIZA|FINALIZAR BATIZADO|CONSAGRAÇÃO|PRECE |ORAÇÃO )/.test(str);
            };

            let catAtual = null;
            let subAtual = "Geral";
            let bufferLetra = [];
            let registros = [];
            let ordem = 1;

            const fecharPonto = () => {
                const textoLimpo = bufferLetra.join('\n').trim();
                if (catAtual && textoLimpo.length > 15) {
                    registros.push({
                        terreiro_id: idTerreiroGlobal,
                        categoria: catAtual,
                        subcategoria: subAtual,
                        letra: textoLimpo,
                        ordem: ordem++
                    });
                }
                bufferLetra = [];
            };

            for (const l of linhas) {
                if (!l) continue;
                const sec = mapaSecoes.find(s => s.match.test(l));
                if (sec) {
                    fecharPonto();
                    catAtual = sec.cat;
                    if (ehSubtitulo(l)) subAtual = l;
                    continue;
                }
                if (!catAtual) continue;

                if (ehSubtitulo(l)) {
                    fecharPonto();
                    subAtual = l;
                } else {
                    bufferLetra.push(l);
                }
            }
            fecharPonto();

            if (registros.length === 0) {
                alert('Não foi possível identificar cantigas no arquivo selecionado.');
                return;
            }

            for (let i = 0; i < registros.length; i += 100) {
                const lote = registros.slice(i, i + 100);
                const { error } = await supabaseClient.from('curimba_cantigas').insert(lote);
                if (error) throw error;
            }

            alert(`✅ Importação concluída com sucesso! ${registros.length} cantigas foram organizadas no Livro da Curimba.`);
            await carregarCantigasDoBanco();
        } catch (err) {
            alert('Erro ao importar arquivo .DOCX: ' + err.message);
        } finally {
            input.value = '';
        }
    };

    // --- EXPORTADOR DE PDF A4 DO LIVRO GERAL DA CURIMBA (PAISAGEM / LAYOUT OFICIAL) ---
    window.exportarPDFLivroCurimba = async () => {
        if (!cacheCantigasLivro || cacheCantigasLivro.length === 0) {
            return alert('Não há cantigas carregadas para gerar o PDF.');
        }

        if (typeof html2pdf === 'undefined') {
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
            : cacheCantigasLivro.filter(c => c.categoria === categoriaAtiva);

        const nomeTemplo = (typeof nomeTerreiroGlobal !== 'undefined' && nomeTerreiroGlobal)
            ? nomeTerreiroGlobal
            : (document.getElementById('nomeTerreiro')?.textContent || 'Templo');

        const logoTemplo = (typeof logoTerreiroGlobal !== 'undefined' && logoTerreiroGlobal)
            ? logoTerreiroGlobal
            : '';

        const larguraPdfPx = 1045; // Formato Paisagem A4
        const watermarkHtml = logoTemplo
            ? `<div style="position: absolute; top: 45%; left: 50%; transform: translate(-50%, -50%); opacity: 0.05; z-index: 0; pointer-events: none;">
                 <img src="${logoTemplo}" style="width: 320px; max-width: 80%;">
               </div>`
            : '';

        let htmlSecoes = '';
        let catAnterior = '';

        listaParaImprimir.forEach(c => {
            if (c.categoria !== catAnterior) {
                catAnterior = c.categoria;
                htmlSecoes += `
                    <div style="background-color: #1e293b; color: #fff; padding: 8px 14px; font-size: 11pt; font-weight: bold; text-transform: uppercase; border-radius: 6px; margin: 20px 0 12px 0; page-break-after: avoid;">
                        ${c.categoria}
                    </div>
                `;
            }

            const infoExtra = [
                c.ritmo ? `Toque: ${c.ritmo}` : '',
                c.obs_melodia ? `Melodia: ${c.obs_melodia}` : ''
            ].filter(Boolean).join(' | ');

            htmlSecoes += `
                <div style="border: 1px solid #cbd5e1; border-left: 4px solid #4f46e5; border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; background: #ffffff; page-break-inside: avoid;">
                    <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #f1f5f9; padding-bottom: 5px; margin-bottom: 8px;">
                        <strong style="font-size: 10pt; color: #1e1b4b; text-transform: uppercase;">
                            ${c.subcategoria || 'Geral'} ${c.titulo ? `• ${c.titulo}` : ''}
                        </strong>
                        ${infoExtra ? `<span style="font-size: 8.5pt; color: #b45309; font-weight: bold;">${infoExtra}</span>` : ''}
                    </div>
                    <div style="font-size: 9.5pt; line-height: 1.6; color: #0f172a; white-space: pre-wrap;">${c.letra || ''}</div>
                </div>
            `;
        });

        const dataAtual = `${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        const tituloRelatorio = `Livro Geral da Curimba ${categoriaAtiva !== 'todas' ? `— ${categoriaAtiva}` : '(Completo)'}`;

        const div = document.createElement('div');
        div.style.cssText = `width: ${larguraPdfPx}px; font-family: Arial, sans-serif; color: #333; background: #ffffff; padding: 15px; box-sizing: border-box;`;
        
        div.innerHTML = `
            <div style="position: relative; background: #ffffff;">
                ${watermarkHtml}
                <div style="position: relative; z-index: 1;">
                    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 15px;">
                        <div style="width: 80px;">
                            ${logoTemplo ? `<img src="${logoTemplo}" style="max-height: 55px; max-width: 80px; object-fit: contain;">` : ''}
                        </div>
                        <div style="text-align: center; flex: 1;">
                            <h2 style="margin: 0; color: #1e3a8a; font-size: 14pt; text-transform: uppercase; font-weight: bold;">${nomeTemplo}</h2>
                            <h3 style="margin: 4px 0 0 0; color: #475569; font-size: 11pt; text-transform: uppercase;">${tituloRelatorio}</h3>
                            <p style="margin: 4px 0 0 0; color: #64748b; font-size: 8pt;">Emitido em: ${dataAtual} | Total de Cantigas: ${listaParaImprimir.length}</p>
                        </div>
                        <div style="width: 80px;"></div>
                    </div>
                    ${htmlSecoes}
                </div>
            </div>
        `;

        alert('Gerando PDF do Livro da Curimba em Paisagem... Aguarde um instante.');
        const opt = {
            margin:       [10, 10, 15, 10],
            filename:     `Livro_Curimba_${nomeTemplo.replace(/\s+/g, '_')}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' },
            pagebreak:    { mode: ['css', 'legacy'] }
        };

        html2pdf().set(opt).from(div).toPdf().get('pdf').then((pdf) => {
            const totalPages = pdf.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                pdf.setPage(i);
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(8);
                pdf.setTextColor(100, 100, 100);
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                pdf.text(`Página ${i} de ${totalPages}`, pageWidth - 15, pageHeight - 8, { align: 'right' });
                pdf.text(`${nomeTemplo} — Livro Geral da Curimba`, 15, pageHeight - 8, { align: 'left' });
            }
        }).save();
    };
})();
