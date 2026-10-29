// ============================================================================
// MÓDULO: GUIAS E PADRINHOS DOS MÉDIUNS (presenca.html + admin.html)
// ============================================================================

(function () {
   // Helper de Verificação de Grau
    window.grauPermiteConsagracao = (grauStr) => {
        if (!grauStr) return false;
        const g = String(grauStr).trim().toUpperCase();
        // Liberados: Escola de CT, CT, SCCT, Escola de CCT, CCT, Dirigente
        const permitidos = ['ESCOLA DE CT', 'CT', 'SCCT', 'ESCOLA DE CCT', 'CCT', 'DIRIGENTE'];
        return permitidos.includes(g);
    };

    // Função para copiar padrinhos de uma aba para outra
    window.copiarPadrinhos = (origem, destino) => {
        if (origem === 'batismo' && destino === 'consagracao') {
            document.getElementById('perfilConsagracaoPadrinhoGuia').value = document.getElementById('perfilBatismoPadrinhoNome').value;
            document.getElementById('perfilConsagracaoPadrinhoMedium').value = document.getElementById('perfilBatismoPadrinhoMedium').value;
            document.getElementById('perfilConsagracaoMadrinhaGuia').value = document.getElementById('perfilBatismoMadrinhaNome').value;
            document.getElementById('perfilConsagracaoMadrinhaMedium').value = document.getElementById('perfilBatismoMadrinhaMedium').value;
        } else if (origem === 'consagracao' && destino === 'coroacao') {
            document.getElementById('perfilCoroacaoPadrinhoGuia').value = document.getElementById('perfilConsagracaoPadrinhoGuia').value;
            document.getElementById('perfilCoroacaoPadrinhoMedium').value = document.getElementById('perfilConsagracaoPadrinhoMedium').value;
            document.getElementById('perfilCoroacaoMadrinhaGuia').value = document.getElementById('perfilConsagracaoMadrinhaGuia').value;
            document.getElementById('perfilCoroacaoMadrinhaMedium').value = document.getElementById('perfilConsagracaoMadrinhaMedium').value;
        }
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

                if (typeof window.pararGravacaoPerfilSeAtiva === 'function') window.pararGravacaoPerfilSeAtiva();

                const permiteCT = window.grauPermiteConsagracao ? window.grauPermiteConsagracao(perfilMediumLogado.grau) : true;
                const ptAtuais = perfilMediumLogado.pontos_cantados || {};

                let urlsAudioPerfil = {};
                if (permiteCT) {
                    const chavesPts = ['caboclo_descida', 'caboclo_subida', 'pv_descida', 'pv_subida'];
                    for (const ch of chavesPts) {
                        urlsAudioPerfil[ch] = window.urlsAudioExistentesPerfil?.[ch] ?? (ptAtuais[ch]?.audio_url || null);
                        const blobNovo = window.blobsAudioPerfil?.[ch];
                        if (blobNovo) {
                            const ext = (blobNovo.type && blobNovo.type.includes('mp4')) ? 'mp4' : 'webm';
                            const filePath = `pontos_audio/ponto_${idTerreiroGlobal}_${perfilMediumLogado.id}_${ch}.${ext}`;
                            const { error: upErr } = await supabaseClient.storage
                                .from('logos')
                                .upload(filePath, blobNovo, { upsert: true, contentType: blobNovo.type || 'audio/webm' });
                            if (!upErr) {
                                const { data: pubData } = supabaseClient.storage.from('logos').getPublicUrl(filePath);
                                urlsAudioPerfil[ch] = pubData.publicUrl + '?t=' + Date.now();
                                delete window.blobsAudioPerfil[ch];
                            }
                        }
                    }
                }

                const pontosAtualizados = permiteCT ? {
                    caboclo_descida: { ...(ptAtuais.caboclo_descida || {}), letra: document.getElementById('perfilPontoCabocloDescida')?.value.trim() || '', audio_url: urlsAudioPerfil.caboclo_descida || null },
                    caboclo_subida:  { ...(ptAtuais.caboclo_subida || {}),  letra: document.getElementById('perfilPontoCabocloSubida')?.value.trim() || '',  audio_url: urlsAudioPerfil.caboclo_subida || null },
                    pv_descida:      { ...(ptAtuais.pv_descida || {}),      letra: document.getElementById('perfilPontoPVDescida')?.value.trim() || '',      audio_url: urlsAudioPerfil.pv_descida || null },
                    pv_subida:       { ...(ptAtuais.pv_subida || {}),       letra: document.getElementById('perfilPontoPVSubida')?.value.trim() || '',       audio_url: urlsAudioPerfil.pv_subida || null }
                } : ptAtuais;

                const payload = {
                    data_batismo: document.getElementById('perfilDataBatismo')?.value || null,
                    data_consagracao: permiteCT ? (document.getElementById('perfilDataConsagracao')?.value || null) : null,
                    data_coroacao: permiteCT ? (document.getElementById('perfilDataCoroacao')?.value || null) : null,
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
                    guia_cigano: document.getElementById('perfilGuiaCigano')?.value.trim() || null,
                    pontos_cantados: pontosAtualizados
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
                .select('grau, padrinhos_batismo, padrinhos_consagracao, padrinhos_coroacao, data_batismo, data_consagracao, data_coroacao, guia_caboclo, guia_preto_velho, guia_exu_pombagira, guia_crianca, guia_oriental, guia_cigano, pontos_cantados')
                .eq('id', perfilMediumLogado.id)
                .eq('terreiro_id', idTerreiroGlobal)
                .single();

            if (!error && data) {
                    Object.assign(perfilMediumLogado, data);
                    
                    // Preenche as datas no HTML
                    if (document.getElementById('perfilDataBatismo')) document.getElementById('perfilDataBatismo').value = data.data_batismo || '';
                    if (document.getElementById('perfilDataConsagracao')) document.getElementById('perfilDataConsagracao').value = data.data_consagracao || '';
                    if (document.getElementById('perfilDataCoroacao')) document.getElementById('perfilDataCoroacao').value = data.data_coroacao || '';
    
                    // Gerenciamento de Trava de Grau para Consagração, Coroação, Guias e Pontos
                const permite = window.grauPermiteConsagracao ? window.grauPermiteConsagracao(data.grau) : true;
                const avisoGrau = document.getElementById('avisoBloqueioGrauPerfil');
                const boxConsCor = document.getElementById('boxConsagracaoCoroacaoPerfil');
                const boxGuiasTrabalho = document.getElementById('boxMeusGuiasTrabalhoPerfil');
                const boxPontosPerfil = document.getElementById('boxPontosCantadosPerfil');
                
                if (avisoGrau && boxConsCor) {
                    if (permite) {
                        avisoGrau.classList.add('hidden');
                        boxConsCor.classList.remove('hidden');
                        if (boxGuiasTrabalho) boxGuiasTrabalho.classList.remove('hidden');
                        if (boxPontosPerfil) boxPontosPerfil.classList.remove('hidden');
                    } else {
                        avisoGrau.innerHTML = '<p class="text-[11px] font-bold text-amber-800"><i class="fas fa-lock mr-1"></i> O registro de Guias de Trabalho, Pontos Cantados, Consagração e Coroação é habilitado apenas para graus mais avançados (Escola de CT em diante).</p>';
                        avisoGrau.classList.remove('hidden');
                        boxConsCor.classList.add('hidden');
                        if (boxGuiasTrabalho) boxGuiasTrabalho.classList.add('hidden');
                        if (boxPontosPerfil) boxPontosPerfil.classList.add('hidden');
                    }
                }

                const pts = data.pontos_cantados || {};
                if (document.getElementById('perfilPontoCabocloDescida')) document.getElementById('perfilPontoCabocloDescida').value = pts.caboclo_descida?.letra || '';
                if (document.getElementById('perfilPontoCabocloSubida'))  document.getElementById('perfilPontoCabocloSubida').value  = pts.caboclo_subida?.letra || '';
                if (document.getElementById('perfilPontoPVDescida'))      document.getElementById('perfilPontoPVDescida').value      = pts.pv_descida?.letra || '';
                if (document.getElementById('perfilPontoPVSubida'))       document.getElementById('perfilPontoPVSubida').value       = pts.pv_subida?.letra || '';

                window.blobsAudioPerfil = {};
                window.urlsAudioExistentesPerfil = {};
                ['caboclo_descida', 'caboclo_subida', 'pv_descida', 'pv_subida'].forEach(ch => {
                    const aUrl = pts[ch]?.audio_url || null;
                    window.urlsAudioExistentesPerfil[ch] = aUrl;
                    const pl = document.getElementById(`playerPerfil_${ch}`);
                    const btnD = document.getElementById(`btnDelAudioPerfil_${ch}`);
                    if (aUrl && pl) {
                        pl.src = aUrl;
                        pl.classList.remove('hidden');
                        if (btnD) btnD.classList.remove('hidden');
                    } else {
                        if (pl) { pl.src = ''; pl.classList.add('hidden'); }
                        if (btnD) btnD.classList.add('hidden');
                    }
                });

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
                    .select('id, nome_completo, nome_social, grau, funcao, status_ativo, cpf, estado_civil, profissao, lgpd_aceite, padrinhos_batismo, padrinhos_consagracao, padrinhos_coroacao, data_batismo, data_consagracao, data_coroacao, guia_caboclo, guia_preto_velho, guia_exu_pombagira, guia_crianca, guia_oriental, guia_cigano, pontos_cantados')
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

            let resumoPontosHtml = '';
            if (window.grauPermiteConsagracao(m.grau)) {
                const pts = m.pontos_cantados || {};
                const chaves = ['caboclo_descida', 'caboclo_subida', 'pv_descida', 'pv_subida'];
                const qtdLetras = chaves.filter(k => pts[k]?.letra && pts[k].letra.trim() !== '').length;
                const qtdAudios = chaves.filter(k => pts[k]?.audio_url).length;

                const corLetras = qtdLetras === 4 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : (qtdLetras > 0 ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-gray-100 text-gray-500 border-gray-200');
                const corAudios = qtdAudios === 4 ? 'bg-sky-100 text-sky-800 border-sky-300' : (qtdAudios > 0 ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-gray-100 text-gray-500 border-gray-200');

                resumoPontosHtml = `
                    <div class="pt-1.5 mt-1.5 border-t border-dashed border-gray-200 flex flex-wrap gap-1.5">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${corLetras}" title="Letras de pontos cadastradas">
                            <i class="fas fa-music mr-1"></i>Letras: ${qtdLetras}/4
                        </span>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${corAudios}" title="Áudios de melodia gravados">
                            <i class="fas fa-headphones mr-1"></i>Áudios: ${qtdAudios}/4
                        </span>
                    </div>
                `;
            }

            const guiasCol1 = `
                <div class="space-y-1.5 text-xs">
                    <div><span class="font-bold text-emerald-700 text-[10px] uppercase block">🌿 Caboclo(a) / Boiadeiro:</span>${formatarBlocoTexto(m.guia_caboclo, '➔')}</div>
                    <div><span class="font-bold text-amber-800 text-[10px] uppercase block">☕ Preto(a) Velho(a):</span>${formatarBlocoTexto(m.guia_preto_velho, '➔')}</div>
                    <div><span class="font-bold text-red-700 text-[10px] uppercase block">🔱 Exu / Pombagira / Malandro:</span>${formatarBlocoTexto(m.guia_exu_pombagira, '➔')}</div>
                    ${resumoPontosHtml}
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
        if (elCount) {
            elCount.textContent = idsSelecionadosGuias.size;
        }

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
        const permite = window.grauPermiteConsagracao ? window.grauPermiteConsagracao(m.grau) : true;
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

        // Preenche as datas no Modal do Admin
            if (document.getElementById('editDataBatismo')) document.getElementById('editDataBatismo').value = m.data_batismo || '';
            if (document.getElementById('editDataConsagracao')) document.getElementById('editDataConsagracao').value = m.data_consagracao || '';
            if (document.getElementById('editDataCoroacao')) document.getElementById('editDataCoroacao').value = m.data_coroacao || '';

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

        // Pontos Cantados no Modal Admin
        const boxPtsEdit = document.getElementById('boxPontosCantadosEdit');
        if (boxPtsEdit) {
            if (permite) boxPtsEdit.classList.remove('hidden');
            else boxPtsEdit.classList.add('hidden');
        }
        const pts = m.pontos_cantados || {};
        if (document.getElementById('editLetraCabocloDescida'))   document.getElementById('editLetraCabocloDescida').value   = pts.caboclo_descida?.letra || '';
        if (document.getElementById('editRitmoCabocloDescida'))   document.getElementById('editRitmoCabocloDescida').value   = pts.caboclo_descida?.ritmo || '';
        if (document.getElementById('editMelodiaCabocloDescida')) document.getElementById('editMelodiaCabocloDescida').value = pts.caboclo_descida?.obs_melodia || '';

        if (document.getElementById('editLetraCabocloSubida'))    document.getElementById('editLetraCabocloSubida').value    = pts.caboclo_subida?.letra || '';
        if (document.getElementById('editRitmoCabocloSubida'))    document.getElementById('editRitmoCabocloSubida').value    = pts.caboclo_subida?.ritmo || '';
        if (document.getElementById('editMelodiaCabocloSubida'))  document.getElementById('editMelodiaCabocloSubida').value  = pts.caboclo_subida?.obs_melodia || '';

        if (document.getElementById('editLetraPVDescida'))        document.getElementById('editLetraPVDescida').value        = pts.pv_descida?.letra || '';
        if (document.getElementById('editRitmoPVDescida'))        document.getElementById('editRitmoPVDescida').value        = pts.pv_descida?.ritmo || '';
        if (document.getElementById('editMelodiaPVDescida'))      document.getElementById('editMelodiaPVDescida').value      = pts.pv_descida?.obs_melodia || '';

        if (document.getElementById('editLetraPVSubida'))         document.getElementById('editLetraPVSubida').value         = pts.pv_subida?.letra || '';
        if (document.getElementById('editRitmoPVSubida'))         document.getElementById('editRitmoPVSubida').value         = pts.pv_subida?.ritmo || '';
        if (document.getElementById('editMelodiaPVSubida'))       document.getElementById('editMelodiaPVSubida').value       = pts.pv_subida?.obs_melodia || '';

        // ==========================================
        // LÓGICA DE EXIBIÇÃO DOS BOTÕES DE CERTIFICADO
        // ==========================================
        const btnCertBatismo = document.getElementById('btnImprimirCertBatismo');
        const btnCertConsagracao = document.getElementById('btnImprimirCertConsagracao');
        const btnCertCoroacao = document.getElementById('btnImprimirCertCoroacao');

        // 1. Batismo
        if (btnCertBatismo) {
            let ok = false;
            try {
                const b = JSON.parse(m.padrinhos_batismo || '{}');
                if (m.data_batismo && b.padrinho?.nome && b.madrinha?.nome) ok = true;
            } catch(e){}
            
            if (ok) {
                btnCertBatismo.classList.remove('hidden');
                btnCertBatismo.classList.add('flex');
                btnCertBatismo.onclick = (e) => window.gerarCertificadoIndividual(e, m, 'Batismo');
            } else {
                btnCertBatismo.classList.add('hidden');
                btnCertBatismo.classList.remove('flex');
            }
        }

        // 2. Consagração
        if (btnCertConsagracao && permite) {
            let ok = false;
            try {
                const c = JSON.parse(m.padrinhos_consagracao || '{}');
                if (m.data_consagracao && c.padrinho?.nome && c.madrinha?.nome) ok = true;
            } catch(e){}
            
            if (ok) {
                btnCertConsagracao.classList.remove('hidden');
                btnCertConsagracao.classList.add('flex');
                btnCertConsagracao.onclick = (e) => window.gerarCertificadoIndividual(e, m, 'Consagração');
            } else {
                btnCertConsagracao.classList.add('hidden');
                btnCertConsagracao.classList.remove('flex');
            }
        }

        // 3. Coroação (Exige Data + CPF + Estado Civil + Profissão + Termo LGPD acionado)
        if (btnCertCoroacao && permite) {
            const cpfLimpo = String(m.cpf || '').replace(/\D/g, '');
            const dadosCivisCompletos = cpfLimpo.length === 11 && Boolean(m.estado_civil) && Boolean(m.profissao) && m.lgpd_aceite === true;

            if (m.data_coroacao) {
                btnCertCoroacao.classList.remove('hidden');
                btnCertCoroacao.classList.add('flex');
                if (dadosCivisCompletos) {
                    btnCertCoroacao.disabled = false;
                    btnCertCoroacao.className = "w-full sm:w-auto text-[11px] bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200 font-bold px-3 py-1.5 rounded-lg transition active:scale-95 flex items-center justify-center gap-1.5 shadow-sm";
                    btnCertCoroacao.title = "Emitir Certificado e Declaração de Coroação";
                    btnCertCoroacao.onclick = (e) => window.gerarCertificadoIndividual(e, m, 'Coroação');
                } else {
                    btnCertCoroacao.disabled = false;
                    btnCertCoroacao.className = "w-full sm:w-auto text-[11px] bg-gray-100 text-gray-400 border border-gray-200 font-bold px-3 py-1.5 rounded-lg cursor-not-allowed flex items-center justify-center gap-1.5 opacity-75";
                    btnCertCoroacao.title = "Bloqueado: O médium precisa preencher CPF, Estado Civil, Profissão e aceitar o Termo LGPD no Meu Perfil.";
                    btnCertCoroacao.onclick = () => alert("⚠️ Certificado de Coroação Bloqueado!\n\nPara habilitar a impressão, o médium precisa acessar 'Meu Perfil' no aplicativo, preencher seus Dados Pessoais (CPF, Estado Civil e Profissão) e marcar a concordância com o Termo LGPD.");
                }
            } else {
                btnCertCoroacao.classList.add('hidden');
                btnCertCoroacao.classList.remove('flex');
            }
        }
        // ==========================================

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

    window.imprimirCadernoPontosPDF = () => {
        const filtrados = (window.guiasMediunsFiltrados || []).filter(m => window.grauPermiteConsagracao(m.grau));
        let selecionados = listaGuiasMediunsCache.filter(m => idsSelecionadosGuias.has(m.id) && window.grauPermiteConsagracao(m.grau));

        if (selecionados.length === 0) {
            if (filtrados.length === 0) {
                return alert('Nenhum médium de grau CT+ disponível no filtro atual.');
            }
            if (!confirm('Nenhum médium CT+ foi marcado individualmente. Deseja gerar o Caderno de Pontos em PDF para todos os médiuns CT+ listados?')) {
                return;
            }
            selecionados = filtrados;
        }

        selecionados.sort((a, b) => (a.nome_completo || '').localeCompare(b.nome_completo || '', 'pt-BR'));

        const fmtPontoPdf = (ptObj, nomeGuia) => {
            if (!ptObj || (!ptObj.letra && !ptObj.ritmo)) return '<span style="color:#cbd5e1;">-</span>';
            const ritmo = ptObj.ritmo ? `<div style="font-size:6.5pt; font-weight:bold; color:#b45309; text-transform:uppercase; margin-bottom:2px;">🥁 Toque: ${ptObj.ritmo}</div>` : '';
            const melodia = ptObj.obs_melodia ? `<div style="font-size:6.5pt; color:#0369a1; font-style:italic; margin-bottom:2px;">🎵 ${ptObj.obs_melodia}</div>` : '';
            const guiaTxt = nomeGuia ? `<div style="font-size:6.5pt; font-weight:bold; color:#334155; margin-bottom:3px;">Guia: ${nomeGuia.replace(/\n/g, ' / ')}</div>` : '';
            const letra = (ptObj.letra || '-').replace(/\n/g, '<br>');
            return `<div style="text-align:left; line-height:1.35;">${guiaTxt}${ritmo}${melodia}<div style="font-size:7.5pt; color:#0f172a;">${letra}</div></div>`;
        };

        const colunas = [
            'MÉDIUM / GRAU',
            '🌿 CABOCLO(A) — DESCIDA',
            '🌿 CABOCLO(A) — SUBIDA',
            '☕ PRETO(A) VELHO(A) — DESCIDA',
            '☕ PRETO(A) VELHO(A) — SUBIDA'
        ];

        const dados = selecionados.map(m => {
            const cargo = [m.grau, m.funcao].filter(v => v && v !== '-').join(' / ');
            const pts = m.pontos_cantados || {};
            const colNome = `<div style="text-align:left; line-height:1.3;">
                                <div style="font-size: 8.5pt; color: #0f172a; font-weight: 900;">${m.nome_completo}</div>
                                ${cargo ? `<div style="font-size:6.5pt; color:#475569; margin-top:3px; font-weight:bold; text-transform:uppercase;">${cargo}</div>` : ''}
                             </div>`;
            return [
                colNome,
                fmtPontoPdf(pts.caboclo_descida, m.guia_caboclo),
                fmtPontoPdf(pts.caboclo_subida, m.guia_caboclo),
                fmtPontoPdf(pts.pv_descida, m.guia_preto_velho),
                fmtPontoPdf(pts.pv_subida, m.guia_preto_velho)
            ];
        });

        if (typeof window.gerarPDFRelatorio === 'function') {
            window.gerarPDFRelatorio('Caderno Oficial de Pontos Cantados (Curimba)', colunas, dados, 'landscape');
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
                const permiteCT = medRef && window.grauPermiteConsagracao ? window.grauPermiteConsagracao(medRef.grau) : true;

                const payload = {
                        data_batismo: document.getElementById('editDataBatismo')?.value || null,
                        data_consagracao: permiteCT ? (document.getElementById('editDataConsagracao')?.value || null) : null,
                        data_coroacao: permiteCT ? (document.getElementById('editDataCoroacao')?.value || null) : null,
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
                    guia_cigano: document.getElementById('editGuiaCigano').value.trim() || null,
                    pontos_cantados: permiteCT ? {
                        caboclo_descida: {
                            ...(medRef?.pontos_cantados?.caboclo_descida || {}),
                            letra: document.getElementById('editLetraCabocloDescida')?.value.trim() || '',
                            ritmo: document.getElementById('editRitmoCabocloDescida')?.value.trim() || '',
                            obs_melodia: document.getElementById('editMelodiaCabocloDescida')?.value.trim() || ''
                        },
                        caboclo_subida: {
                            ...(medRef?.pontos_cantados?.caboclo_subida || {}),
                            letra: document.getElementById('editLetraCabocloSubida')?.value.trim() || '',
                            ritmo: document.getElementById('editRitmoCabocloSubida')?.value.trim() || '',
                            obs_melodia: document.getElementById('editMelodiaCabocloSubida')?.value.trim() || ''
                        },
                        pv_descida: {
                            ...(medRef?.pontos_cantados?.pv_descida || {}),
                            letra: document.getElementById('editLetraPVDescida')?.value.trim() || '',
                            ritmo: document.getElementById('editRitmoPVDescida')?.value.trim() || '',
                            obs_melodia: document.getElementById('editMelodiaPVDescida')?.value.trim() || ''
                        },
                        pv_subida: {
                            ...(medRef?.pontos_cantados?.pv_subida || {}),
                            letra: document.getElementById('editLetraPVSubida')?.value.trim() || '',
                            ritmo: document.getElementById('editRitmoPVSubida')?.value.trim() || '',
                            obs_melodia: document.getElementById('editMelodiaPVSubida')?.value.trim() || ''
                        }
                    } : (medRef?.pontos_cantados || {})
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

    // ==========================================
    // GERAÇÃO DO CERTIFICADO INDIVIDUAL EM PDF (A4 LASCAPE)
    // ==========================================
    window.gerarCertificadoIndividual = async (event, medium, tipoSacramento) => {
        const btnAtivador = event ? event.currentTarget : null;
        const originalHtml = btnAtivador ? btnAtivador.innerHTML : '';
        
        if (btnAtivador) {
            btnAtivador.disabled = true;
            btnAtivador.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Preparando...';
        }

        try {
            // 0. Injetar Fontes Elegantes do Google Fonts
            if (!document.getElementById('fontesCertificado')) {
                const style = document.createElement('style');
                style.id = 'fontesCertificado';
                style.innerHTML = `@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Great+Vibes&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap');`;
                document.head.appendChild(style);
            }
            if (document.fonts && document.fonts.ready) {
                await document.fonts.ready;
            }

            // 1. Obter a URL da imagem de fundo e os Dados Cadastrais do Templo/Dirigente (Multiterreiro SaaS)
            let fundoUrl = '';
            let nomeTemplo = 'NOSSO TEMPLO';
            let nomeTemploFormatado = 'Templo Espiritualista';
            let enderecoTemplo = 'endereço da sede social';
            let nomeDirigente = '_______________________________';
            let cpfDirigente = '___.___.___-__';
            let estCivilDirigente = '____________';
            let profissaoDirigente = '____________';

            try {
                const { data } = await supabaseClient
                    .from('terreiros')
                    .select('nome, certificado_fundo_url, address, address_number, cpf_cnpj, dirigente_id')
                    .eq('id', idTerreiroGlobal)
                    .single();
                if (data) {
                    if (data.certificado_fundo_url) fundoUrl = data.certificado_fundo_url;
                    if (data.nome) {
                        nomeTemplo = data.nome.toUpperCase();
                        nomeTemploFormatado = data.nome;
                    }
                    if (data.address) {
                        enderecoTemplo = `${data.address}${data.address_number ? `, ${data.address_number}` : ''}`;
                    }
                    if (data.dirigente_id) {
                        const { data: dirData } = await supabaseClient
                            .from('mediuns')
                            .select('nome_completo, cpf, estado_civil, profissao')
                            .eq('id', data.dirigente_id)
                            .eq('terreiro_id', idTerreiroGlobal)
                            .single();
                        if (dirData) {
                            if (dirData.nome_completo) nomeDirigente = dirData.nome_completo;
                            if (dirData.cpf) cpfDirigente = dirData.cpf;
                            if (dirData.estado_civil) estCivilDirigente = dirData.estado_civil;
                            if (dirData.profissao) profissaoDirigente = dirData.profissao;
                        }
                    } else if (tipoSacramento === 'Coroação') {
                        alert('Aviso: Nenhum Dirigente Espiritual foi vinculado em "Configurações da Casa". Os campos do Dirigente sairão com linha para preenchimento.');
                    }
                }
            } catch(e) { console.error('Erro ao buscar fundo:', e); }

            if (!fundoUrl) {
                alert('O Fundo do Certificado não foi encontrado! Faça o upload em "Configurações da Casa".');
                if (btnAtivador) {
                    btnAtivador.disabled = false;
                    btnAtivador.innerHTML = originalHtml;
                }
                return;
            }

            // 1.5. Converter a imagem para Base64
            const fundoBase64 = await new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.onload = () => {
                    if (btnAtivador) btnAtivador.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Gerando PDF...';
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth || img.width;
                    canvas.height = img.naturalHeight || img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/jpeg', 1.0));
                };
                img.onerror = () => reject(new Error('Falha ao carregar a imagem de fundo'));
                img.src = fundoUrl + '?t=' + new Date().getTime();
            });

            // 1.8. Buscar Dados Civis e Nascimento do Médium
            let dataNascimento = '';
            let cpfMedium = '';
            let estadoCivilMedium = '';
            let profissaoMedium = '';
            try {
                const { data: mData } = await supabaseClient
                    .from('mediuns')
                    .select('data_nascimento, cpf, estado_civil, profissao')
                    .eq('id', medium.id)
                    .eq('terreiro_id', idTerreiroGlobal)
                    .single();
                if (mData) {
                    dataNascimento = mData.data_nascimento || '';
                    cpfMedium = mData.cpf || '';
                    estadoCivilMedium = mData.estado_civil || '';
                    profissaoMedium = mData.profissao || '';
                }
            } catch(e) { console.error('Erro ao buscar dados civis:', e); }

            if (tipoSacramento === 'Coroação' && (!cpfMedium || !estadoCivilMedium || !profissaoMedium)) {
                const prosseguir = confirm(
                    `Atenção: O médium ${medium.nome_completo} ainda não preencheu todos os dados civis exigidos na Declaração (CPF, Estado Civil ou Profissão).\n\nDeseja gerar o documento mesmo assim com espaços para preenchimento?`
                );
                if (!prosseguir) {
                    if (btnAtivador) {
                        btnAtivador.disabled = false;
                        btnAtivador.innerHTML = originalHtml;
                    }
                    return;
                }
            }

            // Helpers de formatação
            const formatarData = (d) => {
                if(!d) return '___/___/____';
                const pts = d.split('-');
                if(pts.length !== 3) return d;
                return `${pts[2]}/${pts[1]}/${pts[0]}`;
            };
            const formatarCPF = (c) => {
                const limpo = String(c || '').replace(/\D/g, '');
                if (limpo.length !== 11) return c || '___.___.___-__';
                return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
            };
            const dataNascFmt = dataNascimento ? formatarData(dataNascimento) : '___/___/____';

            // BUSCADOR INTELIGENTE COM DESEMPATE POR NOME DO GUIA
            const buscarNomeCompleto = (termoMedium, termoGuia) => {
                if (!termoMedium || typeof listaGuiasMediunsCache === 'undefined') return termoMedium;
                const buscaMed = termoMedium.trim().toLowerCase();

                let candidatos = listaGuiasMediunsCache.filter(x => 
                    (x.nome_completo && x.nome_completo.toLowerCase().includes(buscaMed)) ||
                    (x.nome_social && x.nome_social.toLowerCase().includes(buscaMed))
                );

                if (candidatos.length === 0) return termoMedium;
                if (candidatos.length === 1) return candidatos[0].nome_completo;

                if (termoGuia) {
                    const palavrasGuia = termoGuia.toLowerCase().replace(/[^a-záéíóúâêîôûãõç]/g, ' ').split(/\s+/).filter(p => p.length > 2);
                    let melhorCandidato = candidatos[0];
                    let maiorScore = -1;

                    candidatos.forEach(c => {
                        const guiasDoCandidato = [
                            c.guia_caboclo, c.guia_preto_velho, c.guia_exu_pombagira, 
                            c.guia_crianca, c.guia_oriental, c.guia_cigano
                        ].join(' ').toLowerCase();

                        let score = 0;
                        palavrasGuia.forEach(palavra => {
                            if (guiasDoCandidato.includes(palavra)) score++;
                        });

                        if (score > maiorScore) {
                            maiorScore = score;
                            melhorCandidato = c;
                        }
                    });

                    if (maiorScore > 0) return melhorCandidato.nome_completo;
                }

                return candidatos[0].nome_completo;
            };

            const formatarPadrinho = (obj) => {
                if (!obj || !obj.nome) return '_______________________';
                const nomeUpper = obj.nome.toUpperCase();
                if (obj.tipo === 'medium' || !obj.medium) return nomeUpper;
                const nomeMediumCompleto = buscarNomeCompleto(obj.medium, obj.nome);
                return `${nomeUpper} (ATRAVÉS DA MEDIUNIDADE DE ${nomeMediumCompleto.toUpperCase()})`;
            };

            const formatarNomeCursive = (nome) => {
                if (!nome) return '';
                return nome.toLowerCase().split(' ').map(word => {
                    if (['da', 'de', 'do', 'dos', 'das'].includes(word)) return word;
                    return word.charAt(0).toUpperCase() + word.slice(1);
                }).join(' ');
            };

            // 2. Extrair dados específicos do sacramento
            let dataSacramento = '';
            let padrinhoObj = null;
            let madrinhaObj = null;

            if (tipoSacramento === 'Batismo') {
                dataSacramento = medium.data_batismo;
                const b = JSON.parse(medium.padrinhos_batismo || '{}');
                padrinhoObj = b.padrinho;
                madrinhaObj = b.madrinha;
            } else if (tipoSacramento === 'Consagração') {
                dataSacramento = medium.data_consagracao;
                const c = JSON.parse(medium.padrinhos_consagracao || '{}');
                padrinhoObj = c.padrinho;
                madrinhaObj = c.madrinha;
            } else if (tipoSacramento === 'Coroação') {
                dataSacramento = medium.data_coroacao;
                const c = JSON.parse(medium.padrinhos_coroacao || '{}');
                padrinhoObj = c.padrinho;
                madrinhaObj = c.madrinha;
            }

            // 3. Montar os Textos Combinados e Layout
            const nomeMediumUpper = medium.nome_completo.toUpperCase();
            const nomeLindoCursive = formatarNomeCursive(medium.nome_completo);
            const legibilidadeCSS = `text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 0 12px #fff, 0 0 20px #fff, 0 0 30px #fff;`;

            const elementoPdf = document.createElement('div');
            elementoPdf.style.width = '1123px';
            elementoPdf.style.height = '794px';
            elementoPdf.style.position = 'relative';
            elementoPdf.style.backgroundColor = '#ffffff';

            if (tipoSacramento === 'Coroação') {
                const dataCoroacaoFmt = formatarData(dataSacramento);
                const estCivilTxt = estadoCivilMedium || '____________________';
                const profissaoTxt = profissaoMedium || '____________________';
                const cpfTxt = formatarCPF(cpfMedium);

                elementoPdf.innerHTML = `
                    <img src="${fundoBase64}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1;" />
                    
                    <div style="position: absolute; top: 7%; height: 72%; width: 100%; display: flex; flex-direction: column; justify-content: flex-start; align-items: center; padding: 0 95px; box-sizing: border-box; z-index: 2;">
                        
                        <div style="text-align: center;">
                            <h1 style="font-family: 'Cinzel', serif; font-size: 38px; font-weight: 700; margin: 0; color: #ffffff; letter-spacing: 8px; text-shadow: 2px 2px 6px rgba(0,0,0,0.75);">
                                DECLARAÇÃO
                            </h1>
                            <div style="font-family: 'Cinzel', serif; font-size: 13px; font-weight: 700; color: #fbbf24; letter-spacing: 1.5px; margin-top: 4px; text-shadow: 1px 1px 4px rgba(0,0,0,0.85);">
                                DE HABILITAÇÃO RELIGIOSA, NOMEAÇÃO E DESIGNAÇÃO DE
                            </div>
                            <div style="font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 4px; ${legibilidadeCSS}">
                                Comandante Chefe de Terreiro (CCT) – Linha de Morubixaba
                            </div>
                            <h3 style="font-family: 'Great Vibes', cursive; font-size: 46px; margin: 2px 0 0 0; color: #0f172a; font-weight: normal; text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 3px 3px 6px rgba(0,0,0,0.4);">
                                ${nomeLindoCursive}
                            </h3>
                        </div>

                        <div style="padding: 6px 30px; width: 100%; box-sizing: border-box; margin-top: 60px;">
                            <p style="font-family: 'Playfair Display', serif; font-size: 13.5px; line-height: 1.65; text-align: justify; color: #111827; margin: 0 0 14px 0; font-weight: 600; ${legibilidadeCSS}">
                                <strong>${nomeDirigente}</strong>, ${estCivilDirigente}, ${profissaoDirigente}, portador(a) inscrito(a) no Cadastro de Pessoas Físicas sob nº <strong>${cpfDirigente}</strong>, Sacerdote do <strong>${nomeTemploFormatado}</strong>, com sede na ${enderecoTemplo}, com fundamento no art. 5º, inciso VI, da Constituição Federal e art. VI, alínea “g”, da Declaração sobre a Eliminação de Todas as Formas de Intolerância e Discriminação Fundadas na Religião ou nas Convicções, <strong>DECLARA PARA OS DEVIDOS FINS</strong> que em <strong>${dataCoroacaoFmt}</strong> certificou a habilitação religiosa, nomeou e designou como <strong>Comandante Chefe de Terreiro (CCT) – Linha de Morubixaba</strong> o(a) Sr.(a) <strong>${nomeMediumUpper}</strong>, brasileiro(a), <strong>${estCivilTxt}</strong>, <strong>${profissaoTxt}</strong>, inscrito(a) no CPF sob o nº <strong>${cpfTxt}</strong> razão pela qual o(a) nomeado(a) adquire o direito de exercer todos os direitos e prerrogativas religiosas que a presente habilitação lhe assegura.
                            </p>
                            <p style="font-family: 'Playfair Display', serif; font-size: 12.5px; line-height: 1.6; text-align: justify; color: #111827; margin: 0; font-weight: 600; ${legibilidadeCSS}">
                                Consigna ainda que o presente ato se assenta na Declaração sobre a Eliminação de Todas as Formas de Intolerância e Discriminação Fundadas na Religião ou nas Convicções, Resolução nº 36/55, proclamada pela Assembleia Geral das Nações Unidas em 25 de novembro de 1981, a qual assegura às organizações religiosas o direito de “Capacitar, nomear, e eleger por sucessão os dirigentes que correspondam segundo as necessidades e normas de qualquer religião ou convicção” (Art. VI, alínea “g”).
                            </p>
                        </div>

                    </div>
                `;
            } else {
                let textoCorpo = '';
                let rodapePadrinhos = '';

                if (tipoSacramento === 'Batismo') {
                    textoCorpo = `CERTIFICAMOS, PARA OS DEVIDOS FINS DE FÉ E DIREITO RELIGIOSO, QUE FOI REALIZADO NO <strong>${nomeTemplo}</strong>, O SAGRADO SACRAMENTO DO BATISMO DE <strong>${nomeMediumUpper}</strong>, NASCIDO(A) EM <strong>${dataNascFmt}</strong>. RECEBEU AS BÊNÇÃOS DAS ÁGUAS SAGRADAS E A CONSAGRAÇÃO DIVINA, SENDO APRESENTADO(A) À ESPIRITUALIDADE MAIOR E À EGRÉGORA DESTA CASA SANTA, SOB A PROTEÇÃO DOS SEUS GUIAS E ORIXÁS. ESTE ATO DE FÉ FOI TESTEMUNHADO E APADRINHADO POR:`;
                    rodapePadrinhos = `PADRINHOS DE BATISMO: ${formatarPadrinho(padrinhoObj)} E ${formatarPadrinho(madrinhaObj)}`;
                } else if (tipoSacramento === 'Consagração') {
                    textoCorpo = `CERTIFICAMOS, PARA OS DEVIDOS FINS DE FÉ E DIREITO RELIGIOSO, QUE FOI REALIZADO NO <strong>${nomeTemplo}</strong>, O SAGRADO SACRAMENTO DA CONSAGRAÇÃO MEDIÚNICA DE <strong>${nomeMediumUpper}</strong>, NASCIDO(A) EM <strong>${dataNascFmt}</strong>. REAFIRMOU SEU COMPROMISSO ESPIRITUAL E RECEBEU A CONSAGRAÇÃO DIVINA JUNTO À ESPIRITUALIDADE MAIOR E À EGRÉGORA DESTA CASA SANTA, SOB A PROTEÇÃO DOS SEUS GUIAS E ORIXÁS. ESTE ATO DE FÉ FOI TESTEMUNHADO E APADRINHADO POR:`;
                    rodapePadrinhos = `PADRINHOS DE CONSAGRAÇÃO: ${formatarPadrinho(padrinhoObj)} E ${formatarPadrinho(madrinhaObj)}`;
                }

                elementoPdf.innerHTML = `
                    <img src="${fundoBase64}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1;" />
                    
                    <div style="position: absolute; top: 8%; height: 68%; width: 100%; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 0 110px; box-sizing: border-box; z-index: 2;">
                        
                        <div style="text-align: center;">
                            <h1 style="font-family: 'Cinzel', serif; font-size: 52px; font-weight: 700; margin: 0; color: #ffffff; letter-spacing: 12px; text-shadow: 2px 2px 6px rgba(0,0,0,0.7);">
                                CERTIDÃO
                            </h1>
                            <h2 style="font-family: 'Great Vibes', cursive; font-size: 50px; margin: -5px 0 5px 0; color: #fbbf24; font-weight: normal; text-shadow: 1px 1px 4px rgba(0,0,0,0.8);">
                                ${tipoSacramento}
                            </h2>
                            <h3 style="font-family: 'Great Vibes', cursive; font-size: 56px; margin: 0; color: #0f172a; font-weight: normal; text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 3px 3px 6px rgba(0,0,0,0.5);">
                                ${nomeLindoCursive}
                            </h3>
                        </div>

                        <div style="padding: 10px 40px; width: 100%; box-sizing: border-box;">
                            <p style="font-family: 'Playfair Display', serif; font-size: 15.5px; line-height: 1.8; text-align: justify; color: #111827; margin: 0 0 25px 0; font-weight: 600; ${legibilidadeCSS}">
                                ${textoCorpo}
                            </p>
                            
                            <div style="font-family: 'Playfair Display', serif; font-size: 11.5px; color: #111827; font-weight: 700; text-align: center; margin-bottom: 25px; line-height: 1.6; text-transform: uppercase; ${legibilidadeCSS}">
                                ${rodapePadrinhos}
                            </div>

                            <div style="font-family: 'Playfair Display', serif; font-size: 18px; color: #111827; text-align: center; font-style: italic; font-weight: 700; ${legibilidadeCSS}">
                                Realizado no dia <strong style="font-style: normal;">${formatarData(dataSacramento)}</strong>
                            </div>
                        </div>

                    </div>
                `;
            }

            const wrapperInvisivel = document.createElement('div');
            wrapperInvisivel.style.position = 'fixed';
            wrapperInvisivel.style.top = '0';
            wrapperInvisivel.style.left = '0';
            wrapperInvisivel.style.width = '0px';
            wrapperInvisivel.style.height = '0px';
            wrapperInvisivel.style.overflow = 'hidden';
            wrapperInvisivel.style.zIndex = '-9999';
            
            wrapperInvisivel.appendChild(elementoPdf);
            document.body.appendChild(wrapperInvisivel);

            // 5. Converter para PDF, Criar arquivo nativo e acionar Compartilhamento
            const opt = {
                margin: 0,
                filename: `Certificado_${tipoSacramento}_${medium.nome_completo.replace(/\s+/g, '_')}.pdf`,
                image: { type: 'jpeg', quality: 1.0 },
                html2canvas: { scale: 2, useCORS: true, allowTaint: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
            };

            const pdfBlob = await html2pdf().set(opt).from(elementoPdf).outputPdf('blob');
            
            document.body.removeChild(wrapperInvisivel);
            
            const nomeArquivo = `Certificado_${tipoSacramento}_${medium.nome_completo.replace(/\s+/g, '_')}.pdf`;

            // 1. Dispara sempre o download direto do PDF no dispositivo (PC e Telemóvel)
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = nomeArquivo;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 10000);

            // 2. Se o aparelho suportar partilha nativa, abre também o menu de partilha
            const file = new File([pdfBlob], nomeArquivo, { type: 'application/pdf' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        title: `Certificado - ${tipoSacramento}`,
                        text: `Aqui está o certificado de ${tipoSacramento} de ${medium.nome_completo}.`,
                        files: [file]
                    });
                } catch (error) {
                    console.log('Compartilhamento fechado ou cancelado:', error);
                }
            }
            
            if (btnAtivador) {
                btnAtivador.innerHTML = '<i class="fas fa-check mr-1"></i> Concluído!';
                setTimeout(() => {
                    btnAtivador.disabled = false;
                    btnAtivador.innerHTML = originalHtml;
                }, 2000);
            }
        } catch (err) {
            console.error('Erro ao gerar certificado:', err);
            alert('Erro ao gerar certificado. Tente recarregar a página.');
            if (btnAtivador) {
                btnAtivador.disabled = false;
                btnAtivador.innerHTML = originalHtml;
            }
        }
    };

    // ========================================================================
    // 7. CADERNO DE PONTOS RÁPIDO PARA MG / MGA / DIRIGENTE (presenca.html)
    // ========================================================================
    let cacheMediunsCurimba = [];
    let idsPresentesHojeCurimba = new Set();
    let filtroApenasPresentesCurimba = false;
    let filtroApenasIncompletosCurimba = false;
    let linhaAtivaCurimba = 'todos';
    let tamanhoFonteCurimba = 15;
    let wakeLockCurimba = null;

    async function ativarWakeLockCurimba() {
        if ('wakeLock' in navigator) {
            try {
                wakeLockCurimba = await navigator.wakeLock.request('screen');
            } catch (e) {}
        }
    }

    function liberarWakeLockCurimba() {
        if (wakeLockCurimba !== null) {
            wakeLockCurimba.release().catch(() => {});
            wakeLockCurimba = null;
        }
    }

    function verificarAcessoBotaoCurimba() {
        const boxBtn = document.getElementById('areaCurimbaRapida');
        if (!boxBtn) return;

        if (typeof perfilMediumLogado === 'undefined' || !perfilMediumLogado) {
            setTimeout(verificarAcessoBotaoCurimba, 400);
            return;
        }

        const fn = String(perfilMediumLogado.funcao || '').trim().toUpperCase();
        const gr = String(perfilMediumLogado.grau || '').trim().toUpperCase();
        const ehMGOuMGA = ['MG', 'MGA', 'DIRIGENTE'].includes(fn) || gr === 'DIRIGENTE' || perfilMediumLogado.is_admin === true || perfilMediumLogado.is_master === true;

        if (ehMGOuMGA) {
            boxBtn.classList.remove('hidden');
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(verificarAcessoBotaoCurimba, 500);
    });

    window.abrirModalCurimba = async () => {
        const modal = document.getElementById('modalCurimbaPontos');
        if (!modal) return;
        modal.classList.remove('hidden');
        await ativarWakeLockCurimba();
        await carregarDadosCurimba();
    };

    window.fecharModalCurimba = () => {
        document.querySelectorAll('#modalCurimbaPontos audio').forEach(a => a.pause());
        liberarWakeLockCurimba();
        document.getElementById('modalCurimbaPontos')?.classList.add('hidden');
    };

    // Impede que dois áudios toquem ao mesmo tempo
    document.addEventListener('play', (e) => {
        if (e.target && e.target.tagName === 'AUDIO') {
            document.querySelectorAll('audio').forEach(a => {
                if (a !== e.target) a.pause();
            });
        }
    }, true);

    window.ajustarFonteCurimba = (delta) => {
        tamanhoFonteCurimba = Math.min(Math.max(12, tamanhoFonteCurimba + delta), 26);
        renderizarCardsCurimba();
    };

    window.alternarFiltroPresentesCurimba = () => {
        filtroApenasPresentesCurimba = !filtroApenasPresentesCurimba;
        const btn = document.getElementById('btnFiltroPresentesCurimba');
        if (btn) {
            btn.className = filtroApenasPresentesCurimba
                ? 'py-2 px-3 rounded-xl text-[11px] font-black border transition active:scale-95 flex items-center justify-center gap-1.5 bg-emerald-600 text-white border-emerald-400 shadow'
                : 'py-2 px-3 rounded-xl text-[11px] font-black border transition active:scale-95 flex items-center justify-center gap-1.5 bg-slate-800 text-slate-300 border-slate-700 shadow-sm';
        }
        renderizarCardsCurimba();
    };

    window.alternarFiltroIncompletosCurimba = () => {
        filtroApenasIncompletosCurimba = !filtroApenasIncompletosCurimba;
        const btn = document.getElementById('btnFiltroIncompletosCurimba');
        if (btn) {
            btn.className = filtroApenasIncompletosCurimba
                ? 'py-2 px-3 rounded-xl text-[11px] font-black border transition active:scale-95 flex items-center justify-center gap-1.5 bg-amber-500 text-slate-950 border-amber-300 shadow'
                : 'py-2 px-3 rounded-xl text-[11px] font-black border transition active:scale-95 flex items-center justify-center gap-1.5 bg-slate-800 text-amber-300 border-slate-700 shadow-sm';
        }
        renderizarCardsCurimba();
    };

    window.setLinhaCurimba = (linha) => {
        linhaAtivaCurimba = linha;
        const bTodos = document.getElementById('tabCurimbaTodos');
        const bCab   = document.getElementById('tabCurimbaCaboclo');
        const bPV    = document.getElementById('tabCurimbaPV');

        if (bTodos) bTodos.className = linha === 'todos'   ? 'py-1.5 rounded-lg bg-amber-500 text-slate-950 font-black transition' : 'py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 transition';
        if (bCab)   bCab.className   = linha === 'caboclo' ? 'py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-black transition' : 'py-1.5 rounded-lg bg-slate-800 text-emerald-400 border border-slate-700 transition';
        if (bPV)    bPV.className    = linha === 'pv'      ? 'py-1.5 rounded-lg bg-amber-400 text-slate-950 font-black transition' : 'py-1.5 rounded-lg bg-slate-800 text-amber-300 border border-slate-700 transition';

        renderizarCardsCurimba();
    };

    window.filtrarListaCurimba = () => {
        renderizarCardsCurimba();
    };

    window.limparTodosFiltrosCurimba = () => {
        filtroApenasPresentesCurimba = false;
        filtroApenasIncompletosCurimba = false;
        const inp = document.getElementById('buscaCurimbaInput');
        if (inp) inp.value = '';

        const btnP = document.getElementById('btnFiltroPresentesCurimba');
        if (btnP) btnP.className = 'py-2 px-2 rounded-xl text-[11px] font-black border transition active:scale-95 flex items-center justify-center gap-1.5 bg-slate-800 text-slate-300 border-slate-700 shadow-sm';

        const btnI = document.getElementById('btnFiltroIncompletosCurimba');
        if (btnI) btnI.className = 'py-2 px-2 rounded-xl text-[11px] font-black border transition active:scale-95 flex items-center justify-center gap-1 bg-slate-800 text-amber-300 border-slate-700 shadow-sm';

        window.setLinhaCurimba('todos');
    };

    async function carregarDadosCurimba() {
        const container = document.getElementById('listaCardsCurimba');
        if (!container) return;
        container.innerHTML = '<p class="text-center text-slate-400 text-xs py-8"><i class="fas fa-spinner fa-spin mr-2"></i> Carregando pontos cantados...</p>';

        const chaveCacheLocal = `cache_offline_pontos_guias_${idTerreiroGlobal}`;

        try {
            const { data: mediuns, error } = await supabaseClient
                .from('mediuns')
                .select('id, auth_id, nome_completo, nome_social, grau, funcao, status_ativo, guia_caboclo, guia_preto_velho, pontos_cantados')
                .eq('terreiro_id', idTerreiroGlobal)
                .neq('status_ativo', false)
                .neq('nome_completo', 'Administrador Sistema')
                .order('nome_completo');

            if (error) throw error;

            // Filtra apenas médiuns de grau CT ou superior
            cacheMediunsCurimba = (mediuns || []).filter(m => window.grauPermiteConsagracao(m.grau));

            // Salva cópia offline automática no aparelho
            try { localStorage.setItem(chaveCacheLocal, JSON.stringify(cacheMediunsCurimba)); } catch (e) {}

            // Verifica quem bateu ponto na gira ativa de hoje
            idsPresentesHojeCurimba = new Set();
            if (typeof idGiraGlobal !== 'undefined' && idGiraGlobal) {
                const { data: pres } = await supabaseClient
                    .from('presencas')
                    .select('usuario_id')
                    .eq('evento_id', idGiraGlobal);
                (pres || []).forEach(p => idsPresentesHojeCurimba.add(String(p.usuario_id)));
            }

            renderizarCardsCurimba();
        } catch (err) {
            // Fallback Offline Automático se a internet cair na gira
            const salvoOffline = localStorage.getItem(chaveCacheLocal);
            if (salvoOffline) {
                try {
                    cacheMediunsCurimba = JSON.parse(salvoOffline);
                    renderizarCardsCurimba();
                    if (typeof window.mostrarToastSistema === 'function') {
                        window.mostrarToastSistema('Modo Offline ativado: exibindo pontos salvos no aparelho.', 'aviso');
                    }
                    return;
                } catch (e) {}
            }
            container.innerHTML = `<p class="text-center text-rose-400 text-xs py-6">Erro ao carregar: ${err.message}</p>`;
        }
    }

    function formatarLetraParaLeitura(letra) {
        if (!letra || !letra.trim()) return '<span class="text-slate-500 italic text-xs">Letra ainda não cadastrada. Toque em "Editar" para inserir.</span>';
        return letra
            .replace(/\[([^\]]+)\]/g, '<span class="bg-amber-500/20 text-amber-300 font-black px-1.5 py-0.5 rounded text-[0.85em]">[$1]</span>')
            .replace(/\n/g, '<br>');
    }

    let ultimoToqueFocoGuia = 0;
    let estadoFocoGuiaAtual = { mediumId: null, chave: null };

    const SEQUENCIA_PONTOS_GUIA = [
        { chave: 'caboclo_descida', titulo: '🌿 Descida de Caboclo(a)', campoGuia: 'guia_caboclo' },
        { chave: 'caboclo_subida',  titulo: '🌿 Subida de Caboclo(a)',  campoGuia: 'guia_caboclo' },
        { chave: 'pv_descida',      titulo: '☕ Descida de Preto(a) Velho(a)', campoGuia: 'guia_preto_velho' },
        { chave: 'pv_subida',       titulo: '☕ Subida de Preto(a) Velho(a)',  campoGuia: 'guia_preto_velho' }
    ];

    window.detectarDuploToquePontoGuia = (e, acaoCallback) => {
        const agora = Date.now();
        if (agora - ultimoToqueFocoGuia < 320) {
            e.preventDefault();
            ultimoToqueFocoGuia = 0;
            acaoCallback();
        } else {
            ultimoToqueFocoGuia = agora;
        }
    };

    window.navegarModoFocoPontoGuia = (direcao) => {
        const m = cacheMediunsCurimba.find(x => x.id === estadoFocoGuiaAtual.mediumId);
        if (!m) return;
        const idxAtual = SEQUENCIA_PONTOS_GUIA.findIndex(s => s.chave === estadoFocoGuiaAtual.chave);
        if (idxAtual === -1) return;

        const novoIdx = (idxAtual + direcao + SEQUENCIA_PONTOS_GUIA.length) % SEQUENCIA_PONTOS_GUIA.length;
        const alvo = SEQUENCIA_PONTOS_GUIA[novoIdx];
        const guiaLimpo = (m[alvo.campoGuia] || '').replace(/\n/g, ' / ');
        window.abrirModoFocoPontoGuia(m.id, alvo.chave, alvo.titulo, guiaLimpo);
    };

    window.abrirModoFocoPontoGuia = async (mediumId, chave, titulo, nomeGuia) => {
        document.querySelectorAll('audio').forEach(a => a.pause());

        const m = cacheMediunsCurimba.find(x => x.id === mediumId);
        if (!m) return;
        estadoFocoGuiaAtual = { mediumId, chave };
        const pt = (m.pontos_cantados && m.pontos_cantados[chave]) ? m.pontos_cantados[chave] : {};

        let modalFoco = document.getElementById('modalFocoPontoGuiaImersivo');
        if (!modalFoco) {
            const htmlFoco = `
            <div id="modalFocoPontoGuiaImersivo" class="hidden fixed inset-0 z-[99999] bg-slate-950 flex flex-col p-4 sm:p-8 overflow-y-auto select-none transition-opacity" ondblclick="window.fecharModoFocoPontoGuia(event)" ontouchend="if(!event.target.closest('button, audio')) window.detectarDuploToquePontoGuia(event, () => window.fecharModoFocoPontoGuia(event))">
                <div class="max-w-4xl w-full mx-auto mt-2 sm:mt-8 flex-1 flex flex-col space-y-5">
                    <div class="flex justify-between items-start border-b border-slate-800 pb-3 gap-2">
                        <div class="flex-1 min-w-0">
                            <span class="text-[11px] font-bold text-amber-400 uppercase tracking-widest block mb-0.5" id="focoGuiaMediumNome"></span>
                            <h2 class="font-black text-xl md:text-3xl text-white uppercase leading-tight" id="focoGuiaTitulo"></h2>
                        </div>
                        <div class="flex items-center gap-1.5 shrink-0">
                            <button type="button" onclick="window.ajustarFonteModoFocoGuia(-2)" class="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-200 font-black text-xs border border-slate-700 active:scale-90">A-</button>
                            <button type="button" onclick="window.ajustarFonteModoFocoGuia(2)" class="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-200 font-black text-xs border border-slate-700 active:scale-90">A+</button>
                            <button type="button" onclick="window.fecharModoFocoPontoGuia(event)" class="w-10 h-10 bg-rose-500/20 hover:bg-rose-500/30 rounded-xl flex items-center justify-center text-rose-400 text-lg border border-rose-500/30 active:scale-90 transition" title="Fechar Tela Cheia">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <div id="focoGuiaExtra" class="space-y-3"></div>
                    <div id="focoGuiaLetra" class="text-slate-100 font-medium leading-relaxed tracking-wide pb-10 cursor-text select-text"></div>
                    <div class="pt-4 mt-auto border-t border-slate-800/60 flex items-center justify-between gap-2">
                        <button type="button" onclick="window.navegarModoFocoPontoGuia(-1)" class="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs border border-slate-700 active:scale-95 flex items-center gap-1.5 shadow">
                            <i class="fas fa-chevron-left text-amber-400"></i> Anterior
                        </button>
                        <span class="text-[10px] sm:text-[11px] text-slate-400 font-bold uppercase tracking-wider bg-slate-900 px-3 py-2 rounded-full border border-slate-800 text-center">
                            <i class="fas fa-hand-pointer mr-1 text-amber-400"></i> 2 toques p/ sair
                        </span>
                        <button type="button" onclick="window.navegarModoFocoPontoGuia(1)" class="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs border border-slate-700 active:scale-95 flex items-center gap-1.5 shadow">
                            Próximo <i class="fas fa-chevron-right text-amber-400"></i>
                        </button>
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', htmlFoco);
            modalFoco = document.getElementById('modalFocoPontoGuiaImersivo');
        }

        document.getElementById('focoGuiaMediumNome').textContent = `${m.nome_completo} (${m.grau || '-'})`;
        document.getElementById('focoGuiaTitulo').innerHTML = `${titulo} ${nomeGuia ? `• <span class="text-amber-400">${nomeGuia}</span>` : ''}`;

        let extraHtml = '';
        if (pt.ritmo) extraHtml += `<span class="inline-block bg-amber-500 text-slate-950 text-[11px] font-black px-3 py-1 rounded-full uppercase mr-2 shadow"><i class="fas fa-drum mr-1.5"></i>${pt.ritmo}</span>`;
        if (pt.obs_melodia) extraHtml += `<div class="text-sm text-sky-300 bg-sky-950/40 border border-sky-800/50 rounded-xl px-4 py-2.5 mt-2"><i class="fas fa-music mr-2"></i> <strong>Melodia:</strong> ${pt.obs_melodia}</div>`;
        if (pt.audio_url) extraHtml += `<div class="mt-4 bg-slate-900/90 p-2.5 rounded-2xl border border-amber-500/40 flex items-center gap-3 shadow-lg">
                            <span class="text-[11px] font-black text-amber-400 uppercase px-3 shrink-0"><i class="fas fa-headphones mr-1.5"></i>Ouvir:</span>
                            <audio controls preload="none" src="${pt.audio_url}" class="w-full h-10 outline-none"></audio>
                          </div>`;

        document.getElementById('focoGuiaExtra').innerHTML = extraHtml;

        const tamanhoFoco = Math.min(Math.max(18, tamanhoFonteCurimba + 6), 36);
        const letraEl = document.getElementById('focoGuiaLetra');
        letraEl.style.fontSize = tamanhoFoco + 'px';
        letraEl.innerHTML = formatarLetraParaLeitura(pt.letra);

        modalFoco.classList.remove('hidden');
        await ativarWakeLockCurimba();
    };

    window.ajustarFonteModoFocoGuia = (delta) => {
        const letraEl = document.getElementById('focoGuiaLetra');
        if (!letraEl) return;
        const atual = parseInt(letraEl.style.fontSize || '21', 10);
        letraEl.style.fontSize = Math.min(Math.max(16, atual + delta), 42) + 'px';
    };

    window.fecharModoFocoPontoGuia = (event) => {
        if (event) event.stopPropagation();
        const modalFoco = document.getElementById('modalFocoPontoGuiaImersivo');
        if (modalFoco) {
            modalFoco.querySelectorAll('audio').forEach(a => a.pause());
            modalFoco.classList.add('hidden');
        }
    };

    function renderizarBlocoPonto(m, chave, titulo, corBorda, nomeGuia) {
        const pt = (m.pontos_cantados && m.pontos_cantados[chave]) ? m.pontos_cantados[chave] : {};
        const ritmoBadge = pt.ritmo
            ? `<span class="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider"><i class="fas fa-drum mr-1"></i>${pt.ritmo}</span>`
            : `<span class="bg-slate-800 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-700">Sem ritmo</span>`;

        const audioPlayerHtml = pt.audio_url
            ? `<div class="mt-2 bg-slate-900/90 p-1.5 rounded-xl border border-amber-500/30 flex items-center gap-2">
                   <span class="text-[10px] font-black text-amber-400 uppercase px-2 shrink-0"><i class="fas fa-headphones mr-1"></i>Áudio:</span>
                   <audio controls preload="none" src="${pt.audio_url}" class="w-full h-8"></audio>
               </div>`
            : '';

        const melodiaHtml = (pt.obs_melodia ? `<div class="text-[11px] text-sky-300 bg-sky-950/50 border border-sky-800/50 rounded-lg px-2.5 py-1 mt-1.5"><i class="fas fa-music mr-1"></i> <strong>Melodia:</strong> ${pt.obs_melodia}</div>` : '') + audioPlayerHtml;

        const tituloEscapado = titulo.replace(/'/g, "\\'");
        const guiaLimpo = (nomeGuia || '').replace(/\n/g, ' / ').replace(/'/g, "\\'");

        return `
            <div ondblclick="window.abrirModoFocoPontoGuia(${m.id}, '${chave}', '${tituloEscapado}', '${guiaLimpo}')" ontouchend="if(!event.target.closest('button, audio')) window.detectarDuploToquePontoGuia(event, () => window.abrirModoFocoPontoGuia(${m.id}, '${chave}', '${tituloEscapado}', '${guiaLimpo}'))" class="bg-slate-950/80 rounded-xl p-3 border-l-4 ${corBorda} border border-slate-800 select-none cursor-pointer transition-all" title="Dê 2 toques para tela cheia">
                <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                    <div>
                        <span class="text-xs font-black text-white uppercase">${titulo}</span>
                        ${nomeGuia ? `<span class="block text-[11px] text-slate-400 font-semibold">${nomeGuia.replace(/\n/g, ' / ')}</span>` : ''}
                    </div>
                    <div class="flex items-center gap-1.5">
                        ${ritmoBadge}
                        <button type="button" onclick="window.abrirModoFocoPontoGuia(${m.id}, '${chave}', '${tituloEscapado}', '${guiaLimpo}'); event.stopPropagation();" class="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-amber-500/30 active:scale-95" title="Modo Foco (Tela Cheia)">
                            <i class="fas fa-expand"></i> Foco
                        </button>
                        <button type="button" onclick="window.abrirEdicaoPontoCurimba(${m.id}, '${chave}', '${tituloEscapado}'); event.stopPropagation();" class="bg-slate-800 hover:bg-slate-700 text-amber-400 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-slate-700 active:scale-95">
                            <i class="fas fa-pen"></i> Editar
                        </button>
                    </div>
                </div>
                ${melodiaHtml}
                <div class="mt-2.5 font-medium text-slate-100 leading-relaxed" style="font-size: ${tamanhoFonteCurimba}px;">
                    ${formatarLetraParaLeitura(pt.letra)}
                </div>
                <div class="text-center pt-2 no-print">
                    <span class="text-[10px] font-bold text-slate-500 bg-slate-900/80 px-3 py-1 rounded-full"><i class="fas fa-expand-alt mr-1 text-amber-500/60"></i> 2 toques no ponto para tela cheia</span>
                </div>
            </div>
        `;
    }

    function renderizarCardsCurimba() {
        const container = document.getElementById('listaCardsCurimba');
        if (!container) return;

        const termo = (document.getElementById('buscaCurimbaInput')?.value || '').trim().toLowerCase();

        const filtrados = cacheMediunsCurimba.filter(m => {
            if (filtroApenasPresentesCurimba) {
                const estaPresente = idsPresentesHojeCurimba.has(String(m.auth_id)) || idsPresentesHojeCurimba.has(String(m.id));
                if (!estaPresente) return false;
            }
            if (filtroApenasIncompletosCurimba) {
                const pts = m.pontos_cantados || {};
                const chaves = ['caboclo_descida', 'caboclo_subida', 'pv_descida', 'pv_subida'];
                const completo = chaves.every(k => pts[k]?.letra && pts[k].letra.trim() !== '' && pts[k]?.audio_url);
                if (completo) return false;
            }
            if (termo) {
                const pts = m.pontos_cantados || {};
                const tudo = [
                    m.nome_completo, m.nome_social, m.guia_caboclo, m.guia_preto_velho,
                    pts.caboclo_descida?.letra, pts.caboclo_subida?.letra,
                    pts.pv_descida?.letra, pts.pv_subida?.letra,
                    pts.caboclo_descida?.ritmo, pts.pv_descida?.ritmo
                ].filter(Boolean).join(' ').toLowerCase();
                if (!tudo.includes(termo)) return false;
            }
            return true;
        });

        if (filtrados.length === 0) {
            container.innerHTML = `<div class="text-center text-slate-400 text-xs py-10 bg-slate-900/50 rounded-2xl border border-slate-800">Nenhum médium encontrado para este filtro.</div>`;
            return;
        }

        container.innerHTML = filtrados.map(m => {
            const estaPresente = idsPresentesHojeCurimba.has(String(m.auth_id)) || idsPresentesHojeCurimba.has(String(m.id));
            const badgePresenca = estaPresente
                ? `<span class="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded-full">🟢 Presente</span>`
                : '';

            let blocosHtml = '';
            if (linhaAtivaCurimba === 'todos' || linhaAtivaCurimba === 'caboclo') {
                blocosHtml += renderizarBlocoPonto(m, 'caboclo_descida', '🌿 Descida de Caboclo(a)', 'border-l-emerald-500', m.guia_caboclo);
                blocosHtml += renderizarBlocoPonto(m, 'caboclo_subida',  '🌿 Subida de Caboclo(a)',  'border-l-emerald-700', m.guia_caboclo);
            }
            if (linhaAtivaCurimba === 'todos' || linhaAtivaCurimba === 'pv') {
                blocosHtml += renderizarBlocoPonto(m, 'pv_descida', '☕ Descida de Preto(a) Velho(a)', 'border-l-amber-400', m.guia_preto_velho);
                blocosHtml += renderizarBlocoPonto(m, 'pv_subida',  '☕ Subida de Preto(a) Velho(a)',  'border-l-amber-600', m.guia_preto_velho);
            }

            return `
                <div class="bg-slate-900 rounded-2xl border border-slate-800 p-3.5 space-y-3 shadow-md">
                    <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div>
                            <h4 class="font-black text-base text-amber-400 leading-snug">${m.nome_completo}</h4>
                            <span class="text-[10px] font-bold text-slate-400 uppercase">${m.grau || '-'} ${m.funcao && m.funcao !== '-' ? `/ ${m.funcao}` : ''}</span>
                        </div>
                        ${badgePresenca}
                    </div>
                    <div class="space-y-2.5">
                        ${blocosHtml}
                    </div>
                </div>
            `;
        }).join('');
    }

    // ========================================================================
    // 8. GRAVADOR ULTRA-LEVE (16kbps / MÁX 30s) PARA MEU PERFIL E MODAL MG/MGA
    // ========================================================================
    window.blobsAudioPerfil = {};
    window.urlsAudioExistentesPerfil = {};
    let mediaRecorderAtivo = null;
    let chavePerfilGravando = null;
    let timerGravacaoGlobal = null;
    let segundosGravacaoGlobal = 0;

    let blobAudioModalCurimba = null;
    let urlAudioExistenteModalCurimba = null;

    function obterOpcoesGravadorLeve() {
        let options = { audioBitsPerSecond: 16000 };
        if (typeof MediaRecorder !== 'undefined') {
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                options.mimeType = 'audio/webm;codecs=opus';
            } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                options.mimeType = 'audio/mp4';
            }
        }
        return options;
    }

    // --- A. GRAVADOR DO MÉDIUM (ABA GUIAS DO MEU PERFIL) ---
    window.pararGravacaoPerfilSeAtiva = () => {
        if (mediaRecorderAtivo && mediaRecorderAtivo.state === 'recording') {
            mediaRecorderAtivo.stop();
        }
        if (timerGravacaoGlobal) clearInterval(timerGravacaoGlobal);
        if (chavePerfilGravando) {
            const btn = document.getElementById(`btnRecPerfil_${chavePerfilGravando}`);
            if (btn) {
                btn.className = 'px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-sm active:scale-95 transition';
                btn.innerHTML = '<i class="fas fa-microphone"></i> <span>Gravar Áudio</span>';
            }
            document.getElementById(`timerPerfil_${chavePerfilGravando}`)?.classList.add('hidden');
            chavePerfilGravando = null;
        }
    };

    window.alternarGravacaoPerfil = async (chave) => {
        if (mediaRecorderAtivo && mediaRecorderAtivo.state === 'recording') {
            const mesmaChave = (chavePerfilGravando === chave);
            window.pararGravacaoPerfilSeAtiva();
            if (mesmaChave) return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const chunks = [];
            mediaRecorderAtivo = new MediaRecorder(stream, obterOpcoesGravadorLeve());
            chavePerfilGravando = chave;

            mediaRecorderAtivo.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorderAtivo.onstop = () => {
                stream.getTracks().forEach(t => t.stop());
                const mime = mediaRecorderAtivo.mimeType || 'audio/webm';
                const blob = new Blob(chunks, { type: mime });
                window.blobsAudioPerfil[chave] = blob;

                const localUrl = URL.createObjectURL(blob);
                const pl = document.getElementById(`playerPerfil_${chave}`);
                const btnD = document.getElementById(`btnDelAudioPerfil_${chave}`);
                if (pl) {
                    pl.src = localUrl;
                    pl.classList.remove('hidden');
                }
                if (btnD) btnD.classList.remove('hidden');
            };

            mediaRecorderAtivo.start();
            segundosGravacaoGlobal = 0;

            const btn = document.getElementById(`btnRecPerfil_${chave}`);
            const timerEl = document.getElementById(`timerPerfil_${chave}`);
            if (btn) {
                btn.className = 'px-2.5 py-1 rounded-lg bg-gray-900 text-white font-black text-[10px] flex items-center gap-1 shadow-md animate-pulse';
                btn.innerHTML = '<i class="fas fa-stop text-rose-500"></i> <span>Parar</span>';
            }
            if (timerEl) {
                timerEl.textContent = '00:00';
                timerEl.classList.remove('hidden');
            }

            timerGravacaoGlobal = setInterval(() => {
                segundosGravacaoGlobal++;
                const min = Math.floor(segundosGravacaoGlobal / 60);
                const seg = segundosGravacaoGlobal % 60;
                const tempoFmt = `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;
                
                if (timerEl) {
                    // Se for o modal da curimba, mostra o limite de 01:30
                    if (timerEl.id === 'timerGravacaoPonto') {
                        timerEl.textContent = `${tempoFmt} / 01:30`;
                    } else {
                        timerEl.textContent = tempoFmt;
                    }
                }

                // Limite aumentado para 90 segundos (1:30)
                if (segundosGravacaoGlobal >= 90) {
                    if (typeof window.pararGravacaoPerfilSeAtiva === 'function') window.pararGravacaoPerfilSeAtiva();
                    // Se for a função interna do modal:
                    if (typeof pararGravacaoModalCurimba === 'function') pararGravacaoModalCurimba();
                }
            }, 1000);
        } catch (err) {
            alert('Não foi possível acessar o microfone. Autorize a permissão no navegador.');
        }
    };

    window.removerAudioPerfil = (chave) => {
        if (chavePerfilGravando === chave) window.pararGravacaoPerfilSeAtiva();
        delete window.blobsAudioPerfil[chave];
        window.urlsAudioExistentesPerfil[chave] = null;
        const pl = document.getElementById(`playerPerfil_${chave}`);
        const btnD = document.getElementById(`btnDelAudioPerfil_${chave}`);
        if (pl) { pl.pause(); pl.src = ''; pl.classList.add('hidden'); }
        if (btnD) btnD.classList.add('hidden');
    };

    // --- B. GRAVADOR DO MODAL MG / MGA ---
    function pararGravacaoModalCurimba() {
        if (mediaRecorderAtivo && mediaRecorderAtivo.state === 'recording') {
            mediaRecorderAtivo.stop();
        }
        if (timerGravacaoGlobal) clearInterval(timerGravacaoGlobal);
        const btn = document.getElementById('btnGravarAudioPonto');
        if (btn) {
            btn.className = 'flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition';
            btn.innerHTML = '<i class="fas fa-microphone"></i> <span>Gravar / Regravar Melodia</span>';
        }
        document.getElementById('timerGravacaoPonto')?.classList.add('hidden');
    }

    window.alternarGravacaoPonto = async () => {
        if (mediaRecorderAtivo && mediaRecorderAtivo.state === 'recording') {
            pararGravacaoModalCurimba();
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const chunks = [];
            mediaRecorderAtivo = new MediaRecorder(stream, obterOpcoesGravadorLeve());

            mediaRecorderAtivo.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorderAtivo.onstop = () => {
                stream.getTracks().forEach(t => t.stop());
                const mime = mediaRecorderAtivo.mimeType || 'audio/webm';
                blobAudioModalCurimba = new Blob(chunks, { type: mime });
                const localUrl = URL.createObjectURL(blobAudioModalCurimba);

                const player = document.getElementById('playerPreviewPonto');
                const btnDel = document.getElementById('btnRemoverAudioPonto');
                if (player) { player.src = localUrl; player.classList.remove('hidden'); }
                if (btnDel) btnDel.classList.remove('hidden');
            };

            mediaRecorderAtivo.start();
            segundosGravacaoGlobal = 0;

            const btn = document.getElementById('btnGravarAudioPonto');
            const timerEl = document.getElementById('timerGravacaoPonto');
            if (btn) {
                btn.className = 'flex-1 py-2 px-3 rounded-xl bg-gray-900 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md animate-pulse';
                btn.innerHTML = '<i class="fas fa-stop text-rose-500"></i> <span>Parar Gravação</span>';
            }
            if (timerEl) {
                timerEl.textContent = '00:00 / 01:30';
                timerEl.classList.remove('hidden');
            }
            timerGravacaoGlobal = setInterval(() => {
                segundosGravacaoGlobal++;
                const min = Math.floor(segundosGravacaoGlobal / 60);
                const seg = segundosGravacaoGlobal % 60;
                const tempoFmt = `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;
                
                if (timerEl) {
                    timerEl.textContent = `${tempoFmt} / 01:30`;
                }

                if (segundosGravacaoGlobal >= 90) {
                    pararGravacaoModalCurimba();
                }
            }, 1000);
        } catch (err) {
            alert('Não foi possível acessar o microfone. Verifique a permissão do navegador.');
        }
    };

    window.removerAudioPontoAtual = () => {
        pararGravacaoModalCurimba();
        blobAudioModalCurimba = null;
        urlAudioExistenteModalCurimba = null;
        const player = document.getElementById('playerPreviewPonto');
        const btnDel = document.getElementById('btnRemoverAudioPonto');
        if (player) { player.pause(); player.src = ''; player.classList.add('hidden'); }
        if (btnDel) btnDel.classList.add('hidden');
    };

    window.abrirEdicaoPontoCurimba = (mediumId, chave, tituloPonto) => {
        pararGravacaoModalCurimba();
        blobAudioModalCurimba = null;

        const m = cacheMediunsCurimba.find(x => x.id === mediumId);
        if (!m) return;

        const pt = (m.pontos_cantados && m.pontos_cantados[chave]) ? m.pontos_cantados[chave] : {};
        document.getElementById('editPontoMediumId').value = mediumId;
        document.getElementById('editPontoChave').value = chave;
        document.getElementById('tituloModalEditPonto').textContent = tituloPonto;
        document.getElementById('subtituloModalEditPonto').textContent = m.nome_completo;

        document.getElementById('editPontoRitmo').value = pt.ritmo || '';
        document.getElementById('editPontoMelodia').value = pt.obs_melodia || '';
        document.getElementById('editPontoLetra').value = pt.letra || '';

        urlAudioExistenteModalCurimba = pt.audio_url || null;
        const player = document.getElementById('playerPreviewPonto');
        const btnDel = document.getElementById('btnRemoverAudioPonto');

        if (urlAudioExistenteModalCurimba && player) {
            player.src = urlAudioExistenteModalCurimba;
            player.classList.remove('hidden');
            if (btnDel) btnDel.classList.remove('hidden');
        } else {
            if (player) { player.src = ''; player.classList.add('hidden'); }
            if (btnDel) btnDel.classList.add('hidden');
        }

        document.getElementById('modalEditarPontoCurimba').classList.remove('hidden');
    };

    window.inserirTagLetraPonto = (tag) => {
        const area = document.getElementById('editPontoLetra');
        if (!area) return;
        const start = area.selectionStart || 0;
        const end = area.selectionEnd || 0;
        const txt = area.value;
        area.value = txt.substring(0, start) + tag + txt.substring(end);
        area.focus();
        area.selectionStart = area.selectionEnd = start + tag.length;
    };

    window.salvarEdicaoPontoCurimba = async () => {
        pararGravacaoModalCurimba();

        const mediumId = parseInt(document.getElementById('editPontoMediumId').value);
        const chave = document.getElementById('editPontoChave').value;
        const btn = document.getElementById('btnSalvarPontoCurimba');

        const m = cacheMediunsCurimba.find(x => x.id === mediumId);
        if (!m) return;

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Salvando...';

        try {
            let finalAudioUrl = urlAudioExistenteModalCurimba;

            if (blobAudioModalCurimba) {
                const ext = (blobAudioModalCurimba.type && blobAudioModalCurimba.type.includes('mp4')) ? 'mp4' : 'webm';
                const filePath = `pontos_audio/ponto_${idTerreiroGlobal}_${mediumId}_${chave}.${ext}`;

                const { error: upErr } = await supabaseClient.storage
                    .from('logos')
                    .upload(filePath, blobAudioModalCurimba, {
                        upsert: true,
                        contentType: blobAudioModalCurimba.type || 'audio/webm'
                    });

                if (upErr) throw upErr;

                const { data: pubData } = supabaseClient.storage.from('logos').getPublicUrl(filePath);
                finalAudioUrl = pubData.publicUrl + '?t=' + Date.now();
            }

            const pontosAtuais = { ...(m.pontos_cantados || {}) };
            pontosAtuais[chave] = {
                letra: document.getElementById('editPontoLetra').value.trim(),
                ritmo: document.getElementById('editPontoRitmo').value.trim(),
                obs_melodia: document.getElementById('editPontoMelodia').value.trim(),
                audio_url: finalAudioUrl || null
            };

            const { error } = await supabaseClient
                .from('mediuns')
                .update({ pontos_cantados: pontosAtuais })
                .eq('id', mediumId)
                .eq('terreiro_id', idTerreiroGlobal);

            if (error) throw error;

            m.pontos_cantados = pontosAtuais;
            if (typeof perfilMediumLogado !== 'undefined' && perfilMediumLogado?.id === mediumId) {
                perfilMediumLogado.pontos_cantados = pontosAtuais;
            }

            document.getElementById('modalEditarPontoCurimba').classList.add('hidden');
            renderizarCardsCurimba();
        } catch (err) {
            alert('Erro ao salvar ponto: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save mr-1"></i> Salvar Ponto';
        }
    };

    // ========================================================================
    // 9. MOTOR GLOBAL DE TOASTS MODERNOS E MÁSCARAS DE FORMULÁRIOS (CPF / TEL)
    // ========================================================================
    window.mostrarToastSistema = (mensagem, tipo = 'info') => {
        let container = document.getElementById('containerToastsSistema');
        if (!container) {
            container = document.createElement('div');
            container.id = 'containerToastsSistema';
            container.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-[999999] flex flex-col gap-2 w-[92%] max-w-md pointer-events-none';
            document.body.appendChild(container);
        }

        const msgStr = String(mensagem || '');
        if (tipo === 'info') {
            if (/erro|falha|inválid|bloquead|negad|oops|atenção/i.test(msgStr)) tipo = 'erro';
            else if (/sucesso|✅|🎉|confirmad|copiad|salvo|aprovad/i.test(msgStr)) tipo = 'sucesso';
        }

        const cores = {
            sucesso: 'bg-emerald-950/95 border-emerald-500 text-emerald-100 shadow-emerald-950/50',
            erro:    'bg-rose-950/95 border-rose-500 text-rose-100 shadow-rose-950/50',
            aviso:   'bg-amber-950/95 border-amber-500 text-amber-100 shadow-amber-950/50',
            info:    'bg-slate-900/95 border-indigo-500 text-slate-100 shadow-slate-950/50'
        };
        const icones = {
            sucesso: '<i class="fas fa-check-circle text-emerald-400 text-lg shrink-0"></i>',
            erro:    '<i class="fas fa-exclamation-circle text-rose-400 text-lg shrink-0"></i>',
            aviso:   '<i class="fas fa-exclamation-triangle text-amber-400 text-lg shrink-0"></i>',
            info:    '<i class="fas fa-info-circle text-indigo-400 text-lg shrink-0"></i>'
        };

        const toast = document.createElement('div');
        toast.className = `pointer-events-auto flex items-start gap-3 px-4 py-3.5 rounded-2xl border-l-4 shadow-2xl backdrop-blur-md transition-all duration-300 transform -translate-y-4 opacity-0 cursor-pointer ${cores[tipo] || cores.info}`;
        toast.innerHTML = `
            ${icones[tipo] || icones.info}
            <div class="flex-1 text-xs sm:text-sm font-bold leading-relaxed whitespace-pre-line">${msgStr.replace(/^✅\s*/, '')}</div>
            <i class="fas fa-times text-xs opacity-60 hover:opacity-100 mt-1"></i>
        `;

        const remover = () => {
            toast.classList.add('-translate-y-4', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        };
        toast.onclick = remover;
        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.remove('-translate-y-4', 'opacity-0');
        });

        // Mensagens longas (como Ficha SOS) ficam 8s; avisos rápidos ficam 4s
        setTimeout(remover, msgStr.length > 120 ? 8000 : 4200);
    };

    // Substitui o alert() padrão pelo Toast moderno
    const alertNativo = window.alert.bind(window);
    window.alert = (msg) => {
        if (document.body) window.mostrarToastSistema(msg);
        else alertNativo(msg);
    };

    // Máscaras automáticas em tempo real para Telefone/WhatsApp e CPF/CNPJ
    document.addEventListener('input', (e) => {
        const el = e.target;
        if (!el || el.tagName !== 'INPUT') return;

        const id = (el.id || '').toLowerCase();
        const ph = (el.placeholder || '').toLowerCase();

        // 1. Máscara de Telefone / WhatsApp: (21) 99999-9999
        if (id.includes('telefone') || id.includes('emergenciatel') || id.includes('phone') || ph.includes('9999')) {
            let v = el.value.replace(/\D/g, '').slice(0, 11);
            if (v.length > 6) {
                v = v.length === 11
                    ? `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`
                    : `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
            } else if (v.length > 2) {
                v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
            }
            el.value = v;
        }
        // 2. Máscara de CPF: 000.000.000-00 (exceto quando o input tem pattern="\d{11}" estrito)
        else if ((id.includes('cpf') && !el.hasAttribute('pattern')) && !id.includes('cnpj')) {
            let v = el.value.replace(/\D/g, '').slice(0, 11);
            if (v.length > 9) v = `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`;
            else if (v.length > 6) v = `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6)}`;
            else if (v.length > 3) v = `${v.slice(0, 3)}.${v.slice(3)}`;
            el.value = v;
        }
    });

})();
