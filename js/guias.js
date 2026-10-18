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

        // Cabeçalhos de Coluna com Emojis (Deixando claro as linhas de trabalho)
        const colunas = [
            'MÉDIUM / GRAU',
            '🕊️ PADRINHOS',
            '🌿 CABOCLOS / BOIADEIROS',
            '☕ PRETOS VELHOS',
            '🔱 EXUS E POMBAGIRAS',
            '🍭 LINHAS DIVERSAS'
        ];

        const formatGuiaLine = (text) => text && text !== '-' ? text.replace(/\n/g, '<br>') : '<span style="color:#cbd5e1; font-weight:normal;">-</span>';

        const dados = selecionados.map(m => {
            const cargo = [m.grau, m.funcao].filter(v => v && v !== '-').join(' / ');
            
            // Coluna 1: Nome (Destacado Escuro) e Grau (Cinza Claro)
            const colNome = `<div style="text-align:left; line-height:1.3;">
                                <div style="font-size: 9pt; color: #0f172a; font-weight: 900;">${m.nome_completo}</div>
                                ${cargo ? `<div style="font-size:7pt; color:#64748b; margin-top:3px; font-weight: bold; text-transform: uppercase;">Grau: ${cargo}</div>` : ''}
                             </div>`;

            // Coluna 2: Padrinhos (Cores suaves para cada ritual)
            const colPadrinhos = `
                <div style="font-size: 7.5pt; line-height: 1.5; text-align: left;">
                    <div><span style="color:#0284c7; font-weight:bold;">Batismo:</span> <span style="color:#334155; font-weight:600;">${m.padrinhos_batismo || '<span style="color:#cbd5e1; font-weight:normal;">-</span>'}</span></div>
                    <div><span style="color:#d97706; font-weight:bold;">Consagração:</span> <span style="color:#334155; font-weight:600;">${m.padrinhos_consagracao || '<span style="color:#cbd5e1; font-weight:normal;">-</span>'}</span></div>
                    <div><span style="color:#eab308; font-weight:bold;">Coroação:</span> <span style="color:#334155; font-weight:600;">${m.padrinhos_coroacao || '<span style="color:#cbd5e1; font-weight:normal;">-</span>'}</span></div>
                </div>
            `;

            // Colunas 3, 4 e 5: Linhas Principais (Com cores que representam a energia)
            const colCaboclo = `<div style="color:#059669; font-weight:800; font-size: 8pt; line-height:1.4;">${formatGuiaLine(m.guia_caboclo)}</div>`;
            const colPretoVelho = `<div style="color:#78350f; font-weight:800; font-size: 8pt; line-height:1.4;">${formatGuiaLine(m.guia_preto_velho)}</div>`;
            const colExu = `<div style="color:#b91c1c; font-weight:800; font-size: 8pt; line-height:1.4;">${formatGuiaLine(m.guia_exu_pombagira)}</div>`;

            // Coluna 6: Diversas (Colorido)
            const colOutros = `
                <div style="font-size: 7.5pt; line-height: 1.5; text-align: left;">
                    <div><span style="color:#db2777;">🍭</span> <span style="color:#475569; font-weight:bold;">Criança:</span> <span style="color:#334155; font-weight:600;">${(m.guia_crianca || '<span style="color:#cbd5e1; font-weight:normal;">-</span>').replace(/\n/g, ' / ')}</span></div>
                    <div><span style="color:#4f46e5;">☯️</span> <span style="color:#475569; font-weight:bold;">Oriental:</span> <span style="color:#334155; font-weight:600;">${(m.guia_oriental || '<span style="color:#cbd5e1; font-weight:normal;">-</span>').replace(/\n/g, ' / ')}</span></div>
                    <div><span style="color:#7e22ce;">⛺</span> <span style="color:#475569; font-weight:bold;">Cigano(a):</span> <span style="color:#334155; font-weight:600;">${(m.guia_cigano || '<span style="color:#cbd5e1; font-weight:normal;">-</span>').replace(/\n/g, ' / ')}</span></div>
                </div>
            `;

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

            const nomePrincipal = String(r['Nome'] || getVal('nome completo') || getVal('nome') || '').trim();
            const nomeFormulario = String(r['Nome no Formulário (Base)'] || '').trim();
            if (!nomePrincipal && !nomeFormulario) continue;

            const n1 = normalizar(nomePrincipal);
            const n2 = normalizar(nomeFormulario);

            const mediumMatch = listaGuiasMediunsCache.find(m => {
                const mComp = normalizar(m.nome_completo);
                const mSoc = normalizar(m.nome_social);
                return (n1 && (mComp === n1 || mSoc === n1)) ||
                       (n2 && (mComp === n2 || mSoc === n2)) ||
                       (n1 && mComp.startsWith(n1)) ||
                       (n2 && mComp.startsWith(n2));
            });

            if (mediumMatch) {
                const payload = {
                    guia_caboclo: getVal('caboclo') || null,
                    guia_preto_velho: getVal('preto') || null,
                    guia_exu_pombagira: getVal('exu') || null,
                    guia_crianca: getVal('crianca') || null,
                    guia_oriental: getVal('oriental') || null,
                    guia_cigano: getVal('cigano') || null
                };

                const { error } = await supabaseClient
                    .from('mediuns')
                    .update(payload)
                    .eq('id', mediumMatch.id)
                    .eq('terreiro_id', idTerreiroGlobal);

                if (!error) atualizados++;
            } else {
                naoEncontrados.push(nomePrincipal || nomeFormulario);
            }
        }

        let resumo = `✅ Importação concluída!\n\nMédiuns atualizados neste terreiro: ${atualizados}`;
        if (naoEncontrados.length > 0) {
            resumo += `\n\nNão encontrados no cadastro atual (${naoEncontrados.length}):\n- ${naoEncontrados.join('\n- ')}`;
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
