// ============================================================================
// MÓDULO: GUIAS E PADRINHOS DOS MÉDIUNS (presenca.html + admin.html)
// ============================================================================

(function () {
    // Helper de Verificação de Grau (Libera Consagração/Coroação a partir de CT)
    window.grauPermiteConsagracao = (grauStr) => {
        if (!grauStr) return false;
        const g = String(grauStr).trim().toUpperCase();
        // Graus bloquados: -, I, IJ, B, BJ, T, TJ, SCT, Escola de CT
        const bloqueados = ['-', 'I', 'IJ', 'B', 'BJ', 'T', 'TJ', 'SCT', 'ESCOLA DE CT'];
        if (bloqueados.includes(g)) return false;
        // Liberados: CT, SCCT, Escola de CCT, CCT, Dirigente e afins
        return true;
    };

    // Alternar visualização entre Guia e Médium no Batismo
    window.alternarTipoPadrinhoBatismo = (prefixo, tipoPadrinho) => {
        const select = document.getElementById(`${prefixo}Batismo${tipoPadrinho}Tipo`);
        const grid = document.getElementById(`grid${prefixo === 'perfil' ? 'Perfil' : 'Edit'}Batismo${tipoPadrinho}`);
        if (!select || !grid) return;

        const inputNome = grid.children[0];
        const inputMedium = grid.children[1];

        if (select.value === 'medium') {
            inputNome.placeholder = "Nome do Médium";
            inputMedium.style.display = 'none';
            inputMedium.value = '';
        } else {
            inputNome.placeholder = `Nome do ${tipoPadrinho === 'Padrinho' ? 'Guia' : 'da Guia'}`;
            inputMedium.style.display = 'block';
            inputMedium.placeholder = "Médium do Guia";
        }
    };

    // Serializador e Desserializador de Padrinhos
    function parsePadrinhoJson(jsonStr) {
        if (!jsonStr) return { tipo: 'guia', nome: '', medium: '' };
        try {
            if (jsonStr.startsWith('{')) {
                return JSON.parse(jsonStr);
            }
        } catch (e) {}
        // Fallback para texto simples antigo
        return { tipo: 'guia', nome: jsonStr, medium: '' };
    }

    function stringifyPadrinho(tipo, nome, medium) {
        if (!nome && !medium) return null;
        return JSON.stringify({ tipo, nome: nome.trim(), medium: medium.trim() });
    }

    function formatarExibicaoPadrinho(jsonStr) {
        if (!jsonStr || !jsonStr.trim()) return '-';
        const obj = parsePadrinhoJson(jsonStr);
        if (!obj.nome) return '-';
        if (obj.tipo === 'medium') {
            return `${obj.nome} <span style="font-size:7pt; color:#64748b;">(Médium)</span>`;
        }
        return obj.medium ? `${obj.nome} <span style="font-size:7pt; color:#475569;">(Méd.: ${obj.medium})</span>` : obj.nome;
    }

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

                const batPadrinho = stringifyPadrinho(
                    document.getElementById('perfilBatismoPadrinhoTipo').value,
                    document.getElementById('perfilBatismoPadrinhoNome').value,
                    document.getElementById('perfilBatismoPadrinhoMedium').value
                );
                const batMadrinha = stringifyPadrinho(
                    document.getElementById('perfilBatismoMadrinhaTipo').value,
                    document.getElementById('perfilBatismoMadrinhaNome').value,
                    document.getElementById('perfilBatismoMadrinhaMedium').value
                );

                const permiteCT = window.grauPermiseConsagracao ? window.grauPermiseConsagracao(perfilMediumLogado.grau) : true;

                const payload = {
                    padrinhos_batismo: JSON.stringify({ padrinho: parsePadrinhoJson(batPadrinho), madrinha: parsePadrinhoJson(batMadrinha) }),
                    padrinhos_consagracao: permiteCT ? JSON.stringify({
                        padrinho: { tipo: 'guia', nome: document.getElementById('perfilConsagracaoPadrinhoGuia')?.value.trim() || '', medium: document.getElementById('perfilConsagracaoPadrinhoMedium')?.value.trim() || '' },
                        madrinha: { tipo: 'guia', nome: document.getElementById('perfilConsagracaoMadrinhaGuia')?.value.trim() || '', medium: document.getElementById('perfilConsagracaoMadrinhaMedium')?.value.trim() || '' }
                    }) : null,
                    padrinhos_coroacao: permiteCT ? JSON.stringify({
                        padrinho: { tipo: 'guia', nome: document.getElementById('perfilCoroacaoPadrinhoGuia')?.value.trim() || '', medium: document.getElementById('perfilCoroacaoPadrinhoMedium')?.value.trim() || '' },
                        madrinha: { tipo: 'guia', nome: document.getElementById('perfilCoroacaoMadrinhaGuia')?.value.trim() || '', medium: document.getElementById('perfilCoroacaoMadrinhaMedium')?.value.trim() || '' }
                    }) : null,
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
                .select('grau, padrinhos_batismo, padrinhos_consagracao, padrinhos_coroacao, guia_caboclo, guia_preto_velho, guia_exu_pombagira, guia_crianca, guia_oriental, guia_cigano')
                .eq('id', perfilMediumLogado.id)
                .single();

            if (!error && data) {
                Object.assign(perfilMediumLogado, data);

                // Gerenciamento de Trava de Grau para Consagração e Coroação
                const permite = window.grauPermiseConsagracao ? window.grauPermiseConsagracao(data.grau) : true;
                const avisoGrau = document.getElementById('avisoBloqueioGrauPerfil');
                const boxConsCor = document.getElementById('boxConsagracaoCoroacaoPerfil');
                if (avisoGrau && boxConsCor) {
                    if (permite) {
                        avisoGrau.classList.add('hidden');
                        boxConsCor.classList.remove('hidden');
                    } else {
                        avisoGrau.classList.remove('hidden');
                        boxConsCor.classList.add('hidden');
                    }
                }

                // Padrinhos de Batismo
                try {
                    const bat = JSON.parse(data.padrinhos_batismo || '{}');
                    if (bat.padrinho) {
                        document.getElementById('perfilBatismoPadrinhoTipo').value = bat.padrinho.tipo || 'guia';
                        document.getElementById('perfilBatismoPadrinhoNome').value = bat.padrinho.nome || '';
                        document.getElementById('perfilBatismoPadrinhoMedium').value = bat.padrinho.medium || '';
                    }
                    if (bat.madrinha) {
                        document.getElementById('perfilBatismoMadrinhaTipo').value = bat.madrinha.tipo || 'guia';
                        document.getElementById('perfilBatismoMadrinhaNome').value = bat.madrinha.nome || '';
                        document.getElementById('perfilBatismoMadrinhaMedium').value = bat.madrinha.medium || '';
                    }
                } catch (e) {
                    document.getElementById('perfilBatismoPadrinhoNome').value = data.padrinhos_batismo || '';
                }
                alternarTipoPadrinhoBatismo('perfil', 'Padrinho');
                alternarTipoPadrinhoBatismo('perfil', 'Madrinha');

                // Consagração e Coroação
                if (permite) {
                    try {
                        const cons = JSON.parse(data.padrinhos_consagracao || '{}');
                        if (cons.padrinho) {
                            document.getElementById('perfilConsagracaoPadrinhoGuia').value = cons.padrinho.nome || '';
                            document.getElementById('perfilConsagracaoPadrinhoMedium').value = cons.padrinho.medium || '';
                        }
                        if (cons.madrinha) {
                            document.getElementById('perfilConsagracaoMadrinhaGuia').value = cons.madrinha.nome || '';
                            document.getElementById('perfilConsagracaoMadrinhaMedium').value = cons.madrinha.medium || '';
                        }
                    } catch (e) {}

                    try {
                        const coro = JSON.parse(data.padrinhos_coroacao || '{}');
                        if (coro.padrinho) {
                            document.getElementById('perfilCoroacaoPadrinhoGuia').value = coro.padrinho.nome || '';
                            document.getElementById('perfilCoroacaoPadrinhoMedium').value = coro.padrinho.medium || '';
                        }
                        if (coro.madrinha) {
                            document.getElementById('perfilCoroacaoMadrinhaGuia').value = coro.madrinha.nome || '';
                            document.getElementById('perfilCoroacaoMadrinhaMedium').value = coro.madrinha.medium || '';
                        }
                    } catch (e) {}
                }

                document.getElementById('perfilGuiaCaboclo').value = data.guia_caboclo || '';
                document.getElementById('perfilGuiaPretoVelho').value = data.guia_preto_velho || '';
                document.getElementById('perfilGuiaExuPombagira').value = data.guia_exu_pombagira || '';
                document.getElementById('perfilGuiaCrianca').value = data.guia_crianca || '';
                document.getElementById('perfilGuiaOriental').value = data.guia_oriental || '';
                document.getElementById('perfilGuiaCigano').value = data.guia_cigano || '';
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
                    m.guia_caboclo, m.guia_preto_velho, m.guia_exu_pombagira, m.guia_crianca, m.guia_oriental, m.guia_cigano,
                    m.padrinhos_batismo, m.padrinhos_consagracao, m.padrinhos_coroacao
                ].filter(Boolean).join(' ').toLowerCase();

                if (!textoUnificado.includes(termoGuia)) return false;
            }

            return true;
        });

        window.guiasMediunsFiltrados = filtrados;
        renderizarTabelaGuias(filtrados);
        atualizarContadorSelecionadosGuias();
    };

    function formatarBlocoTexto(txt, simbolo = '•') {
        if (!txt || !txt.trim()) return '<span style="color:#cbd5e1;">-</span>';
        return txt.trim().split('\n').map(l => `<div style="margin-bottom: 2px;"><span style="color:#64748b; margin-right:4px;">${simbolo}</span>${l}</div>`).join('');
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

            // Renderização Formatada de Padrinhos na Tabela Admin
            let batismoDisplay = '-';
            try {
                const bat = JSON.parse(m.padrinhos_batismo || '{}');
                const pad = bat.padrinho?.nome ? `${bat.padrinho.nome}${bat.padrinho.medium ? ` (Méd.: ${bat.padrinho.medium})` : ''}` : '-';
                const mad = bat.madrinha?.nome ? `${bat.madrinha.nome}${bat.madrinha.medium ? ` (Méd.: ${bat.madrinha.medium})` : ''}` : '-';
                batismoDisplay = `Padrinho: ${pad} | Madrinha: ${mad}`;
            } catch (e) {
                batismoDisplay = m.padrinhos_batismo || '-';
            }

            let consagracaoDisplay = '-';
            try {
                const cons = JSON.parse(m.padrinhos_consagracao || '{}');
                const pad = cons.padrinho?.nome ? `${cons.padrinho.nome}${cons.padrinho.medium ? ` (${cons.padrinho.medium})` : ''}` : '-';
                const mad = cons.madrinha?.nome ? `${cons.madrinha.nome}${cons.madrinha.medium ? ` (${cons.madrinha.medium})` : ''}` : '-';
                consagracaoDisplay = `P.: ${pad} | M.: ${mad}`;
            } catch (e) {
                consagracaoDisplay = m.padrinhos_consagracao || '-';
            }

            let coroacaoDisplay = '-';
            try {
                const coro = JSON.parse(m.padrinhos_coroacao || '{}');
                const pad = coro.padrinho?.nome ? `${coro.padrinho.nome}${coro.padrinho.medium ? ` (${coro.padrinho.medium})` : ''}` : '-';
                const mad = coro.madrinha?.nome ? `${coro.madrinha.nome}${coro.madrinha.medium ? ` (${coro.madrinha.medium})` : ''}` : '-';
                coroacaoDisplay = `P.: ${pad} | M.: ${mad}`;
            } catch (e) {
                coroacaoDisplay = m.padrinhos_coroacao || '-';
            }

            const padrinhosHtml = `
                <div class="space-y-1 text-xs">
                    <div><strong class="text-sky-700 uppercase text-[9px]">Batismo:</strong> <span class="text-gray-800">${batismoDisplay}</span></div>
                    <div><strong class="text-amber-700 uppercase text-[9px]">Consagração:</strong> <span class="text-gray-800">${consagracaoDisplay}</span></div>
                    <div><strong class="text-yellow-600 uppercase text-[9px]">Coroação:</strong> <span class="text-gray-800">${coroacaoDisplay}</span></div>
                </div>
            `;

            const guiasCol1 = `
                <div class="space-y-1.5 text-xs">
                    <div><span class="font-bold text-emerald-700 text-[10px] uppercase block">🌿 Caboclo(a) / Boiadeiro:</span>${formatarBlocoTexto(m.guia_caboclo, '➔')}</div>
                    <div><span class="font-bold text-amber-800 text-[10px] uppercase block">☕ Preto(a) Velho(a):</span>${formatarBlocoTexto(m.guia_preto_velho, '➔')}</div>
                    <div><span class="font-bold text-red-700 text-[10px] uppercase block">🔱 Exu / Pombagira / Malandro:</span>${formatarBlocoTexto(m.guia_exu_pombagira, '➔')}</div>
                </div>
            `;

            const guiasCol2 = `
                <div class="space-y-1.5 text-xs">
                    <div><span class="font-bold text-pink-600 text-[10px] uppercase block">🍭 Criança(s):</span>${formatarBlocoTexto(m.guia_crianca, '•')}</div>
                    <div><span class="font-bold text-indigo-700 text-[10px] uppercase block">☯️ Oriental:</span>${formatarBlocoTexto(m.guia_oriental, '•')}</div>
                    <div><span class="font-bold text-purple-700 text-[10px] uppercase block">⛺ Cigano(a):</span>${formatarBlocoTexto(m.guia_cigano, '•')}</div>
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
    // 3. EDIÇÃO DE GUIAS E PADRINHOS (admin.html)
    // ------------------------------------------------------------------------
    window.abrirModalEditarGuiasMedium = (id) => {
        const m = listaGuiasMediunsCache.find(item => item.id === id);
        if (!m) return alert('Médium não encontrado.');

        document.getElementById('editGuiaMediumId').value = m.id;
        document.getElementById('editGuiaMediumNomeTitulo').textContent = m.nome_completo;

        // Trava de Grau
        const permite = window.grauPermiseConsagracao ? window.grauPermiseConsagracao(m.grau) : true;
        const avisoGrau = document.getElementById('avisoBloqueioGrauEdit');
        const boxConsCor = document.getElementById('boxConsagracaoCoroacaoEdit');
        if (avisoGrau && boxConsCor) {
            if (permite) {
                avisoGrau.classList.add('hidden');
                boxConsCor.classList.remove('hidden');
            } else {
                avisoGrau.classList.remove('hidden');
                boxConsCor.classList.add('hidden');
            }
        }

        // Batismo
        try {
            const bat = JSON.parse(m.padrinhos_batismo || '{}');
            if (bat.padrinho) {
                document.getElementById('editBatismoPadrinhoTipo').value = bat.padrinho.tipo || 'guia';
                document.getElementById('editBatismoPadrinhoNome').value = bat.padrinho.nome || '';
                document.getElementById('editBatismoPadrinhoMedium').value = bat.padrinho.medium || '';
            }
            if (bat.madrinha) {
                document.getElementById('editBatismoMadrinhaTipo').value = bat.madrinha.tipo || 'guia';
                document.getElementById('editBatismoMadrinhaNome').value = bat.madrinha.nome || '';
                document.getElementById('editBatismoMadrinhaMedium').value = bat.madrinha.medium || '';
            }
        } catch (e) {
            document.getElementById('editBatismoPadrinhoNome').value = m.padrinhos_batismo || '';
        }
        alternarTipoPadrinhoBatismo('edit', 'Padrinho');
        alternarTipoPadrinhoBatismo('edit', 'Madrinha');

        // Consagração e Coroação
        if (permite) {
            try {
                const cons = JSON.parse(m.padrinhos_consagracao || '{}');
                if (cons.padrinho) {
                    document.getElementById('editConsagracaoPadrinhoGuia').value = cons.padrinho.nome || '';
                    document.getElementById('editConsagracaoPadrinhoMedium').value = cons.padrinho.medium || '';
                }
                if (cons.madrinha) {
                    document.getElementById('editConsagracaoMadrinhaGuia').value = cons.madrinha.nome || '';
                    document.getElementById('editConsagracaoMadrinhaMedium').value = cons.madrinha.medium || '';
                }
            } catch (e) {}

            try {
                const coro = JSON.parse(m.padrinhos_coroacao || '{}');
                if (coro.padrinho) {
                    document.getElementById('editCoroacaoPadrinhoGuia').value = coro.padrinho.nome || '';
                    document.getElementById('editCoroacaoPadrinhoMedium').value = coro.padrinho.medium || '';
                }
                if (coro.madrinha) {
                    document.getElementById('editCoroacaoMadrinhaGuia').value = coro.madrinha.nome || '';
                    document.getElementById('editCoroacaoMadrinhaMedium').value = coro.madrinha.medium || '';
                }
            } catch (e) {}
        }

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
    // 4. IMPRESSÃO PDF A4 (LAYOUT RICO E ELEGANTE)
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
            'MÉDIUM / GRAU',
            '🕊️ PADRINHOS (BATISMO / CONSAGRAÇÃO / COROAÇÃO)',
            '🌿 CABOCLOS / BOIADEIROS',
            '☕ PRETOS VELHOS',
            '🔱 EXUS E POMBAGIRAS',
            '🍭 LINHAS DIVERSAS'
        ];

        const fmtPdfLinhas = (txt, simbolo = '•') => {
            if (!txt || !txt.trim()) return '<span style="color:#cbd5e1;">-</span>';
            return txt.trim().split('\n').map(l => `<div style="margin-bottom:2px;"><span style="color:#059669; font-weight:bold; margin-right:3px;">${simbolo}</span>${l}</div>`).join('');
        };

        const dados = selecionados.map(m => {
            const cargo = [m.grau, m.funcao].filter(v => v && v !== '-').join(' / ');
            const colNome = `<div style="text-align:left; line-height:1.3;">
                                <div style="font-size: 8.5pt; color: #0f172a; font-weight: 900;">${m.nome_completo}</div>
                                ${cargo ? `<div style="font-size:6.5pt; color:#475569; margin-top:3px; font-weight:bold; text-transform:uppercase;">${cargo}</div>` : ''}
                             </div>`;

            // Padrinhos Formatados PDF
            let batStr = '-';
            try {
                const bat = JSON.parse(m.padrinhos_batismo || '{}');
                const p = bat.padrinho?.nome ? `${bat.padrinho.nome}${bat.padrinho.medium ? ` (Méd.: ${bat.padrinho.medium})` : ''}` : '-';
                const md = bat.madrinha?.nome ? `${bat.madrinha.nome}${bat.madrinha.medium ? ` (Méd.: ${bat.madrinha.medium})` : ''}` : '-';
                batStr = `P.: ${p} | M.: ${md}`;
            } catch(e) { batStr = m.padrinhos_batismo || '-'; }

            let conStr = '-';
            try {
                const con = JSON.parse(m.padrinhos_consagracao || '{}');
                const p = con.padrinho?.nome ? `${con.padrinho.nome}${con.padrinho.medium ? ` (${con.padrinho.medium})` : ''}` : '-';
                const md = con.madrinha?.nome ? `${con.madrinha.nome}${con.madrinha.medium ? ` (${con.madrinha.medium})` : ''}` : '-';
                conStr = `P.: ${p} | M.: ${md}`;
            } catch(e) { conStr = m.padrinhos_consagracao || '-'; }

            let corStr = '-';
            try {
                const cor = JSON.parse(m.padrinhos_coroacao || '{}');
                const p = cor.padrinho?.nome ? `${cor.padrinho.nome}${cor.padrinho.medium ? ` (${cor.padrinho.medium})` : ''}` : '-';
                const md = cor.madrinha?.nome ? `${cor.madrinha.nome}${cor.madrinha.medium ? ` (${cor.madrinha.medium})` : ''}` : '-';
                corStr = `P.: ${p} | M.: ${md}`;
            } catch(e) { corStr = m.padrinhos_coroacao || '-'; }

            const colPadrinhos = `
                <div style="font-size: 7pt; line-height: 1.4; text-align: left;">
                    <div><span style="color:#0284c7; font-weight:bold;">Bat.:</span> <span style="color:#334155;">${batStr}</span></div>
                    <div><span style="color:#d97706; font-weight:bold;">Cons.:</span> <span style="color:#334155;">${conStr}</span></div>
                    <div><span style="color:#ca8a04; font-weight:bold;">Cor.:</span> <span style="color:#334155;">${corStr}</span></div>
                </div>
            `;

            const colCaboclo = `<div style="text-align:left; font-size: 7.5pt; line-height:1.4;">${fmtPdfLinhas(m.guia_caboclo, '➔')}</div>`;
            const colPretoVelho = `<div style="text-align:left; font-size: 7.5pt; line-height:1.4;">${fmtPdfLinhas(m.guia_preto_velho, '➔')}</div>`;
            const colExu = `<div style="text-align:left; font-size: 7.5pt; line-height:1.4;">${fmtPdfLinhas(m.guia_exu_pombagira, '➔')}</div>`;

            const colOutros = `
                <div style="font-size: 7pt; line-height: 1.4; text-align: left;">
                    <div><span style="color:#db2777;">🍭</span> <span style="color:#475569; font-weight:bold;">Criança:</span> <span style="color:#334155;">${(m.guia_crianca || '-').replace(/\n/g, ' / ')}</span></div>
                    <div><span style="color:#4f46e5;">☯️</span> <span style="color:#475569; font-weight:bold;">Oriental:</span> <span style="color:#334155;">${(m.guia_oriental || '-').replace(/\n/g, ' / ')}</span></div>
                    <div><span style="color:#7e22ce;">⛺</span> <span style="color:#475569; font-weight:bold;">Cigano:</span> <span style="color:#334155;">${(m.guia_cigano || '-').replace(/\n/g, ' / ')}</span></div>
                </div>
            `;

            return [colNome, colPadrinhos, colCaboclo, colPretoVelho, colExu, colOutros];
        });

        if (typeof window.gerarPDFRelatorio === 'function') {
            window.gerarPDFRelatorio('Relação Oficial de Guias e Padrinhos dos Médiuns', colunas, dados, 'landscape');
        } else {
            alert('Função geradora de PDF não encontrada.');
        }
    };

    // ------------------------------------------------------------------------
    // 5. IMPORTADOR DE PLANILHA EXCEL (.XLSX)
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

                const batPadrinho = stringifyPadrinho(
                    document.getElementById('editBatismoPadrinhoTipo').value,
                    document.getElementById('editBatismoPadrinhoNome').value,
                    document.getElementById('editBatismoPadrinhoMedium').value
                );
                const batMadrinha = stringifyPadrinho(
                    document.getElementById('editBatismoMadrinhaTipo').value,
                    document.getElementById('editBatismoMadrinhaNome').value,
                    document.getElementById('editBatismoMadrinhaMedium').value
                );

                const medRef = listaGuiasMediunsCache.find(x => x.id === idMedium);
                const permiteCT = medRef && window.grauPermiseConsagracao ? window.grauPermiseConsagracao(medRef.grau) : true;

                const payload = {
                    padrinhos_batismo: JSON.stringify({ padrinho: parsePadrinhoJson(batPadrinho), madrinha: parsePadrinhoJson(batMadrinha) }),
                    padrinhos_consagracao: permiteCT ? JSON.stringify({
                        padrinho: { tipo: 'guia', nome: document.getElementById('editConsagracaoPadrinhoGuia')?.value.trim() || '', medium: document.getElementById('editConsagracaoPadrinhoMedium')?.value.trim() || '' },
                        madrinha: { tipo: 'guia', nome: document.getElementById('editConsagracaoMadrinhaGuia')?.value.trim() || '', medium: document.getElementById('editConsagracaoMadrinhaMedium')?.value.trim() || '' }
                    }) : null,
                    padrinhos_coroacao: permiteCT ? JSON.stringify({
                        padrinho: { tipo: 'guia', nome: document.getElementById('editCoroacaoPadrinhoGuia')?.value.trim() || '', medium: document.getElementById('editCoroacaoPadrinhoMedium')?.value.trim() || '' },
                        madrinha: { tipo: 'guia', nome: document.getElementById('editCoroacaoMadrinhaGuia')?.value.trim() || '', medium: document.getElementById('editCoroacaoMadrinhaMedium')?.value.trim() || '' }
                    }) : null,
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
