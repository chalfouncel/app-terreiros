// ============================================================================
// MÓDULO: GUIAS E PADRINHOS DOS MÉDIUNS (presenca.html + admin.html)
// ============================================================================

(function () {
    // ------------------------------------------------------------------------
    // 1. INTEGRAÇÃO COM "MEU PERFIL" (presenca.html)
    // ------------------------------------------------------------------------
    function inicializarGuiasMeuPerfil() {
        const tabDados = document.getElementById('tabPerfilDados');
        const tabSenha = document.getElementById('tabPerfilSenha');
        const tabFamilia = document.getElementById('tabPerfilFamilia');
        const tabGuias = document.getElementById('tabPerfilGuias');

        const secDados = document.getElementById('conteudoAbaDados');
        const secSenha = document.getElementById('conteudoAbaSenha');
        const secFamilia = document.getElementById('conteudoAbaFamilia');
        const secGuias = document.getElementById('conteudoAbaGuias');

        if (!tabGuias || !secGuias) return;

        const desativarAbaGuias = () => {
            tabGuias.classList.remove('border-tema-primaria', 'text-tema-primaria');
            tabGuias.classList.add('border-transparent', 'text-gray-400');
            secGuias.classList.add('hidden');
        };

        [tabDados, tabSenha, tabFamilia].forEach(t => {
            if (t) t.addEventListener('click', desativarAbaGuias);
        });

        tabGuias.addEventListener('click', async () => {
            [tabDados, tabSenha, tabFamilia].forEach(t => {
                if (t) {
                    t.classList.remove('border-tema-primaria', 'text-tema-primaria');
                    t.classList.add('border-transparent', 'text-gray-400');
                }
            });
            [secDados, secSenha, secFamilia].forEach(s => {
                if (s) s.classList.add('hidden');
            });

            tabGuias.classList.remove('border-transparent', 'text-gray-400');
            tabGuias.classList.add('border-tema-primaria', 'text-tema-primaria');
            secGuias.classList.remove('hidden');

            await carregarDadosGuiasNoPerfil();
        });

        // Sempre que abrir o botão Meu Perfil, sincroniza os dados
        document.addEventListener('click', (e) => {
            if (e.target.closest('#btnAbrirPerfil, [data-acao="abrir-perfil"]')) {
                setTimeout(carregarDadosGuiasNoPerfil, 150);
            }
        });

        const btnSalvar = document.getElementById('btnSalvarGuiasPerfil');
        const msg = document.getElementById('msgPerfilGuias');

        if (btnSalvar) {
            btnSalvar.addEventListener('click', async () => {
                if (typeof perfilMediumLogado === 'undefined' || !perfilMediumLogado?.id) return;

                btnSalvar.disabled = true;
                btnSalvar.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Salvando...';
                if (msg) msg.classList.add('hidden');

                const payload = {
                    padrinhos_batismo: document.getElementById('perfilPadrinhosBatismo')?.value.trim() || null,
                    padrinhos_consagracao: document.getElementById('perfilPadrinhosConsagracao')?.value.trim() || null,
                    padrinhos_coroacao: document.getElementById('perfilPadrinhosCoroacao')?.value.trim() || null,
                    guia_caboclo: document.getElementById('perfilGuiaCaboclo')?.value.trim() || null,
                    guia_preto_velho: document.getElementById('perfilGuiaPretoVelho')?.value.trim() || null,
                    guia_exu_pombagira: document.getElementById('perfilGuiaExuPombagira')?.value.trim() || null,
                    guia_crianca: document.getElementById('perfilGuiaCrianca')?.value.trim() || null,
                    guia_oriental: document.getElementById('perfilGuiaOriental')?.value.trim() || null,
                    guia_cigano: document.getElementById('perfilGuiaCigano')?.value.trim() || null
                };

                try {
                    const { error } = await supabaseClient
                        .from('mediuns')
                        .update(payload)
                        .eq('id', perfilMediumLogado.id)
                        .eq('terreiro_id', idTerreiroGlobal);

                    if (error) throw error;

                    Object.assign(perfilMediumLogado, payload);

                    if (msg) {
                        msg.textContent = '✅ Guias e Padrinhos atualizados com sucesso!';
                        msg.className = 'text-xs font-bold text-green-600 text-center block mt-2';
                        msg.classList.remove('hidden');
                        setTimeout(() => msg.classList.add('hidden'), 3500);
                    }
                } catch (err) {
                    if (msg) {
                        msg.textContent = 'Erro ao salvar: ' + err.message;
                        msg.className = 'text-xs font-bold text-red-600 text-center block mt-2';
                        msg.classList.remove('hidden');
                    }
                } finally {
                    btnSalvar.disabled = false;
                    btnSalvar.innerHTML = 'Salvar Guias e Padrinhos';
                }
            });
        }
    }

    async function carregarDadosGuiasNoPerfil() {
        if (typeof perfilMediumLogado === 'undefined' || !perfilMediumLogado?.id) return;
        try {
            const { data, error } = await supabaseClient
                .from('mediuns')
                .select('padrinhos_batismo, padrinhos_consagracao, padrinhos_coroacao, guia_caboclo, guia_preto_velho, guia_exu_pombagira, guia_crianca, guia_oriental, guia_cigano')
                .eq('id', perfilMediumLogado.id)
                .single();

            if (!error && data) {
                Object.assign(perfilMediumLogado, data);
                const mapCampos = {
                    perfilPadrinhosBatismo: data.padrinhos_batismo,
                    perfilPadrinhosConsagracao: data.padrinhos_consagracao,
                    perfilPadrinhosCoroacao: data.padrinhos_coroacao,
                    perfilGuiaCaboclo: data.guia_caboclo,
                    perfilGuiaPretoVelho: data.guia_preto_velho,
                    perfilGuiaExuPombagira: data.guia_exu_pombagira,
                    perfilGuiaCrianca: data.guia_crianca,
                    perfilGuiaOriental: data.guia_oriental,
                    perfilGuiaCigano: data.guia_cigano
                };
                Object.keys(mapCampos).forEach(idEl => {
                    const el = document.getElementById(idEl);
                    if (el) el.value = mapCampos[idEl] || '';
                });
            }
        } catch (err) {
            console.error('Erro ao carregar guias do perfil:', err);
        }
    }

    // ------------------------------------------------------------------------
    // 2. MÓDULO PAINEL GESTÃO: "GUIAS DOS MÉDIUNS" (admin.html)
    // ------------------------------------------------------------------------
    let listaGuiasMediunsCache = [];
    let idsSelecionadosGuias = new Set();

    window.carregarGuiasMediuns = async () => {
        if (typeof idTerreiroGlobal === 'undefined' || !idTerreiroGlobal) return;
        const tbody = document.getElementById('tabelaGuiasMediuns');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-gray-500"><i class="fas fa-spinner fa-spin mr-2"></i> Carregando guias e padrinhos da corrente...</td></tr>';

        try {
            // Atualiza opções do filtro de Grau conforme graus da Casa
            const selGrau = document.getElementById('filtroGrauGuias');
            if (selGrau && typeof grausAtuaisTerreiro !== 'undefined') {
                const valorAtual = selGrau.value;
                selGrau.innerHTML = '<option value="">Todos os Graus</option>' +
                    grausAtuaisTerreiro.map(g => `<option value="${g}" ${g === valorAtual ? 'selected' : ''}>${g}</option>`).join('');
            }

            const { data, error } = await supabaseClient
                .from('mediuns')
                .select('id, nome_completo, nome_social, grau, funcao, status_ativo, padrinhos_batismo, padrinhos_consagracao, padrinhos_coroacao, guia_caboclo, guia_preto_velho, guia_exu_pombagira, guia_crianca, guia_oriental, guia_cigano')
                .eq('terreiro_id', idTerreiroGlobal)
                .neq('nome_completo', 'Administrador Sistema')
                .neq('status_ativo', false)
                .order('nome_completo');

            if (error) throw error;

            listaGuiasMediunsCache = (data || []).sort((a, b) => (a.nome_completo || '').localeCompare(b.nome_completo || '', 'pt-BR'));
            window.aplicarFiltrosGuias();
        } catch (err) {
            console.error('Erro ao carregar Guias dos Médiuns:', err);
            tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-red-500 font-bold">Erro ao carregar: ${err.message}</td></tr>`;
        }
    };

    window.aplicarFiltrosGuias = () => {
        const termoMedium = (document.getElementById('filtroMediumGuias')?.value || '').trim().toLowerCase();
        const termoGrau = (document.getElementById('filtroGrauGuias')?.value || '').trim().toUpperCase();
        const termoGuia = (document.getElementById('filtroBuscaGuiaEspecifico')?.value || '').trim().toLowerCase();

        const filtrados = listaGuiasMediunsCache.filter(m => {
            if (termoMedium) {
                const nComp = (m.nome_completo || '').toLowerCase();
                const nSoc = (m.nome_social || '').toLowerCase();
                if (!nComp.includes(termoMedium) && !nSoc.includes(termoMedium)) return false;
            }

            if (termoGrau) {
                const g = (m.grau || '').trim().toUpperCase();
                const f = (m.funcao || '').trim().toUpperCase();
                if (g !== termoGrau && f !== termoGrau) return false;
            }

            if (termoGuia) {
                const textoUnificado = [
                    m.guia_caboclo,
                    m.guia_preto_velho,
                    m.guia_exu_pombagira,
                    m.guia_crianca,
                    m.guia_oriental,
                    m.guia_cigano,
                    m.padrinhos_batismo,
                    m.padrinhos_consagracao,
                    m.padrinhos_coroacao
                ].filter(Boolean).join(' ').toLowerCase();

                if (!textoUnificado.includes(termoGuia)) return false;
            }

            return true;
        });

        window.guiasMediunsFiltrados = filtrados;
        renderizarTabelaGuias(filtrados);
        atualizarContadorSelecionadosGuias();
    };

    function formatarBlocoTexto(txt) {
        if (!txt || !txt.trim()) return '<span class="text-gray-300">-</span>';
        return txt.trim().split('\n').map(l => `<div class="leading-snug">${l}</div>`).join('');
    }

    function renderizarTabelaGuias(lista) {
        const tbody = document.getElementById('tabelaGuiasMediuns');
        if (!tbody) return;

        if (!lista || lista.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-gray-500 font-medium">Nenhum médium ou guia encontrado com os filtros selecionados.</td></tr>';
            return;
        }

        tbody.innerHTML = lista.map(m => {
            const checked = idsSelecionadosGuias.has(m.id) ? 'checked' : '';
            const cargo = [m.grau, m.funcao].filter(v => v && v !== '-').join(' / ') || '-';
            const socialHtml = m.nome_social ? `<span class="text-[10px] text-gray-500 block">Social: ${m.nome_social}</span>` : '';

            const padrinhosHtml = `
                <div class="space-y-1 text-xs">
                    <div><strong class="text-gray-500 uppercase text-[10px]">Batismo:</strong> <span class="text-gray-800">${m.padrinhos_batismo || '-'}</span></div>
                    <div><strong class="text-gray-500 uppercase text-[10px]">Consagração:</strong> <span class="text-gray-800">${m.padrinhos_consagracao || '-'}</span></div>
                    <div><strong class="text-gray-500 uppercase text-[10px]">Coroação:</strong> <span class="text-gray-800">${m.padrinhos_coroacao || '-'}</span></div>
                </div>
            `;

            const guiasCol1 = `
                <div class="space-y-1.5 text-xs">
                    <div><span class="font-bold text-emerald-700 text-[10px] uppercase block">Caboclo(a) / Boiadeiro:</span>${formatarBlocoTexto(m.guia_caboclo)}</div>
                    <div><span class="font-bold text-amber-800 text-[10px] uppercase block">Preto(a) Velho(a):</span>${formatarBlocoTexto(m.guia_preto_velho)}</div>
                    <div><span class="font-bold text-red-700 text-[10px] uppercase block">Exu / Pombagira / Malandro:</span>${formatarBlocoTexto(m.guia_exu_pombagira)}</div>
                </div>
            `;

            const guiasCol2 = `
                <div class="space-y-1.5 text-xs">
                    <div><span class="font-bold text-pink-600 text-[10px] uppercase block">Criança(s):</span>${formatarBlocoTexto(m.guia_crianca)}</div>
                    <div><span class="font-bold text-indigo-700 text-[10px] uppercase block">Oriental:</span>${formatarBlocoTexto(m.guia_oriental)}</div>
                    <div><span class="font-bold text-purple-700 text-[10px] uppercase block">Cigano(a):</span>${formatarBlocoTexto(m.guia_cigano)}</div>
                </div>
            `;

            return `
                <tr class="hover:bg-gray-50 transition-colors border-b border-gray-100 align-top">
                    <td class="p-4 text-center">
                        <input type="checkbox" class="chk-selecionar-guia w-4 h-4 rounded text-tema-primaria cursor-pointer" value="${m.id}" ${checked} onchange="alternarSelecaoMediumGuia(${m.id}, this.checked)">
                    </td>
                    <td class="p-4">
                        <div class="font-bold text-gray-800 text-sm">${m.nome_completo}</div>
                        ${socialHtml}
                        <span class="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[10px] font-bold uppercase">${cargo}</span>
                    </td>
                    <td class="p-4">${padrinhosHtml}</td>
                    <td class="p-4">${guiasCol1}</td>
                    <td class="p-4">${guiasCol2}</td>
                    <td class="p-4 text-center">
                        <button onclick="abrirModalEditarGuiasMedium(${m.id})" class="bg-tema-primaria/10 hover:bg-tema-primaria text-tema-primaria hover:text-white font-bold px-3 py-1.5 rounded-xl text-xs transition inline-flex items-center gap-1.5 active:scale-95" title="Editar Guias e Padrinhos">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    window.alternarSelecaoMediumGuia = (id, marcado) => {
        if (marcado) idsSelecionadosGuias.add(id);
        else idsSelecionadosGuias.delete(id);
        atualizarContadorSelecionadosGuias();
    };

    window.alternarSelecionarTodosGuias = (marcarTodos) => {
        const filtrados = window.guiasMediunsFiltrados || [];
        filtrados.forEach(m => {
            if (marcarTodos) idsSelecionadosGuias.add(m.id);
            else idsSelecionadosGuias.delete(m.id);
        });
        renderizarTabelaGuias(filtrados);
        atualizarContadorSelecionadosGuias();
    };

    function atualizarContadorSelecionadosGuias() {
        const elCount = document.getElementById('contadorSelecionadosGuias');
        if (elCount) elCount.textContent = idsSelecionadosGuias.size;

        const chkTodos = document.getElementById('chkSelecionarTodosGuias');
        const filtrados = window.guiasMediunsFiltrados || [];
        if (chkTodos) {
            chkTodos.checked = filtrados.length > 0 && filtrados.every(m => idsSelecionadosGuias.has(m.id));
        }
    }

    // ------------------------------------------------------------------------
    // 3. EDIÇÃO DE GUIAS E PADRINHOS POR QUALQUER MÉDIUM COM ACESSO À ABA
    // ------------------------------------------------------------------------
    window.abrirModalEditarGuiasMedium = (id) => {
        const m = listaGuiasMediunsCache.find(item => item.id === id);
        if (!m) return alert('Médium não encontrado.');

        document.getElementById('editGuiaMediumId').value = m.id;
        document.getElementById('editGuiaMediumNomeTitulo').textContent = m.nome_completo;

        document.getElementById('editPadrinhosBatismo').value = m.padrinhos_batismo || '';
        document.getElementById('editPadrinhosConsagracao').value = m.padrinhos_consagracao || '';
        document.getElementById('editPadrinhosCoroacao').value = m.padrinhos_coroacao || '';

        document.getElementById('editGuiaCaboclo').value = m.guia_caboclo || '';
        document.getElementById('editGuiaPretoVelho').value = m.guia_preto_velho || '';
        document.getElementById('editGuiaExuPombagira').value = m.guia_exu_pombagira || '';
        document.getElementById('editGuiaCrianca').value = m.guia_crianca || '';
        document.getElementById('editGuiaOriental').value = m.guia_oriental || '';
        document.getElementById('editGuiaCigano').value = m.guia_cigano || '';

        document.getElementById('msgEditGuiasModal')?.classList.add('hidden');
        document.getElementById('modalEditarGuiasMedium')?.classList.remove('hidden');
    };

    window.fecharModalEditarGuiasMedium = () => {
        document.getElementById('modalEditarGuiasMedium')?.classList.add('hidden');
    };

    // ------------------------------------------------------------------------
    // 4. IMPRESSÃO PDF A4 (PADRÃO OFICIAL DOS FORMULÁRIOS DA CASA)
    // ------------------------------------------------------------------------
    window.imprimirGuiasSelecionadosPDF = () => {
        const filtrados = window.guiasMediunsFiltrados || [];
        let selecionados = listaGuiasMediunsCache.filter(m => idsSelecionadosGuias.has(m.id));

        if (selecionados.length === 0) {
            if (filtrados.length === 0) {
                return alert('Nenhum médium disponível para impressão.');
            }
            if (!confirm('Nenhum médium foi marcado individualmente. Deseja imprimir todos os médiuns listados no filtro atual?')) {
                return;
            }
            selecionados = filtrados;
        }

        selecionados.sort((a, b) => (a.nome_completo || '').localeCompare(b.nome_completo || '', 'pt-BR'));

        const colunas = [
            'Médium / Grau',
            'Padrinhos (Batismo / Consagração / Coroação)',
            'Caboclo / Boiadeiro',
            'Preto(a) Velho(a)',
            'Exu / Pombagira / Malandro',
            'Criança / Oriental / Cigano'
        ];

        const dados = selecionados.map(m => {
            const cargo = [m.grau, m.funcao].filter(v => v && v !== '-').join('/');
            const colNome = `<strong>${m.nome_completo}</strong>${cargo ? `<br><span style="font-size:7pt;color:#64748b;">Grau: ${cargo}</span>` : ''}`;

            const colPadrinhos = [
                `<strong>Bat.:</strong> ${m.padrinhos_batismo || '-'}`,
                `<strong>Cons.:</strong> ${m.padrinhos_consagracao || '-'}`,
                `<strong>Cor.:</strong> ${m.padrinhos_coroacao || '-'}`
            ].join('<br>');

            const colCaboclo = (m.guia_caboclo || '-').replace(/\n/g, '<br>');
            const colPretoVelho = (m.guia_preto_velho || '-').replace(/\n/g, '<br>');
            const colExu = (m.guia_exu_pombagira || '-').replace(/\n/g, '<br>');

            const colOutros = [
                `<strong>Criança:</strong> ${(m.guia_crianca || '-').replace(/\n/g, ' / ')}`,
                `<strong>Oriental:</strong> ${(m.guia_oriental || '-').replace(/\n/g, ' / ')}`,
                `<strong>Cigano:</strong> ${(m.guia_cigano || '-').replace(/\n/g, ' / ')}`
            ].join('<br>');

            return [colNome, colPadrinhos, colCaboclo, colPretoVelho, colExu, colOutros];
        });

        if (typeof window.gerarPDFRelatorio === 'function') {
            window.gerarPDFRelatorio('Relação de Guias e Padrinhos dos Médiuns', colunas, dados, 'landscape');
        } else {
            alert('Função geradora de PDF não encontrada.');
        }
    };

    // ------------------------------------------------------------------------
    // 5. IMPORTADOR DIRETO DE PLANILHA EXCEL (.XLSX) POR TERREIRO
    // ------------------------------------------------------------------------
    async function importarPlanilhaGuiasExcel(file) {
        if (!file || !idTerreiroGlobal) return;

        if (typeof XLSX === 'undefined') {
            await new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
                s.onload = resolve;
                s.onerror = reject;
                document.head.appendChild(s);
            });
        }

        const dataBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(dataBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

        if (!rows || rows.length === 0) {
            return alert('A planilha selecionada está vazia.');
        }

        const normalizar = (str) => String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

        let atualizados = 0;
        let naoEncontrados = [];

        for (const r of rows) {
            const chaves = Object.keys(r);
            const getVal = (termo) => {
                const k = chaves.find(ck => normalizar(ck).includes(termo));
                return k ? String(r[k] || '').trim() : '';
            };

            const nomePlanilha = getVal('nome');
            if (!nomePlanilha) continue;

            const nomeNorm = normalizar(nomePlanilha);
            const mediumMatch = listaGuiasMediunsCache.find(m => normalizar(m.nome_completo) === nomeNorm);

            if (mediumMatch) {
                const payload = {
                    guia_caboclo: getVal('caboclo') || mediumMatch.guia_caboclo || null,
                    guia_preto_velho: getVal('preto') || mediumMatch.guia_preto_velho || null,
                    guia_exu_pombagira: getVal('exu') || mediumMatch.guia_exu_pombagira || null,
                    guia_crianca: getVal('crianca') || mediumMatch.guia_crianca || null,
                    guia_oriental: getVal('oriental') || mediumMatch.guia_oriental || null,
                    guia_cigano: getVal('cigano') || mediumMatch.guia_cigano || null
                };

                const { error } = await supabaseClient
                    .from('mediuns')
                    .update(payload)
                    .eq('id', mediumMatch.id)
                    .eq('terreiro_id', idTerreiroGlobal);

                if (!error) atualizados++;
            } else {
                naoEncontrados.push(nomePlanilha);
            }
        }

        let resumo = `✅ Importação concluída!\n\nMédiuns atualizados neste terreiro: ${atualizados}`;
        if (naoEncontrados.length > 0) {
            resumo += `\nNão encontrados no cadastro atual (${naoEncontrados.length}): ${naoEncontrados.slice(0, 10).join(', ')}${naoEncontrados.length > 10 ? '...' : ''}`;
        }
        alert(resumo);
        window.carregarGuiasMediuns();
    }

    // ------------------------------------------------------------------------
    // 6. INICIALIZAÇÃO DE EVENTOS DOM
    // ------------------------------------------------------------------------
    document.addEventListener('DOMContentLoaded', () => {
        inicializarGuiasMeuPerfil();

        document.getElementById('filtroMediumGuias')?.addEventListener('input', () => window.aplicarFiltrosGuias());
        document.getElementById('filtroGrauGuias')?.addEventListener('change', () => window.aplicarFiltrosGuias());
        document.getElementById('filtroBuscaGuiaEspecifico')?.addEventListener('input', () => window.aplicarFiltrosGuias());

        const formEditGuias = document.getElementById('formEditarGuiasMedium');
        if (formEditGuias) {
            formEditGuias.addEventListener('submit', async (e) => {
                e.preventDefault();
                const idMedium = parseInt(document.getElementById('editGuiaMediumId').value);
                const btn = document.getElementById('btnSalvarEditGuiasModal');
                const msg = document.getElementById('msgEditGuiasModal');

                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Salvando...';
                if (msg) msg.classList.add('hidden');

                const payload = {
                    padrinhos_batismo: document.getElementById('editPadrinhosBatismo').value.trim() || null,
                    padrinhos_consagracao: document.getElementById('editPadrinhosConsagracao').value.trim() || null,
                    padrinhos_coroacao: document.getElementById('editPadrinhosCoroacao').value.trim() || null,
                    guia_caboclo: document.getElementById('editGuiaCaboclo').value.trim() || null,
                    guia_preto_velho: document.getElementById('editGuiaPretoVelho').value.trim() || null,
                    guia_exu_pombagira: document.getElementById('editGuiaExuPombagira').value.trim() || null,
                    guia_crianca: document.getElementById('editGuiaCrianca').value.trim() || null,
                    guia_oriental: document.getElementById('editGuiaOriental').value.trim() || null,
                    guia_cigano: document.getElementById('editGuiaCigano').value.trim() || null
                };

                try {
                    const { error } = await supabaseClient
                        .from('mediuns')
                        .update(payload)
                        .eq('id', idMedium)
                        .eq('terreiro_id', idTerreiroGlobal);

                    if (error) throw error;

                    const idx = listaGuiasMediunsCache.findIndex(m => m.id === idMedium);
                    if (idx !== -1) Object.assign(listaGuiasMediunsCache[idx], payload);

                    window.aplicarFiltrosGuias();
                    window.fecharModalEditarGuiasMedium();
                } catch (err) {
                    if (msg) {
                        msg.textContent = 'Erro ao salvar: ' + err.message;
                        msg.className = 'text-xs font-bold text-red-600 text-center block mt-2';
                        msg.classList.remove('hidden');
                    }
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = 'Salvar Alterações';
                }
            });
        }

        const inputExcel = document.getElementById('inputImportarExcelGuias');
        if (inputExcel) {
            inputExcel.addEventListener('change', async (e) => {
                if (e.target.files && e.target.files[0]) {
                    await importarPlanilhaGuiasExcel(e.target.files[0]);
                    e.target.value = '';
                }
            });
        }
    });
})();
