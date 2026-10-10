let idTerreiroGlobal = null;
let idGiraGlobal = null;
let coordsTerreiro = null;
let hrFimGiraGlobal = null;
let hrInicioPermitidoGlobal = null;

// Variáveis Globais de Mensalidade / Carrinho
let perfilMediumLogado = null;
let configValoresGrau = {};
let terreiroConfigMensalidade = {};
let carrinhoMensalidadesState = []; 

document.addEventListener('DOMContentLoaded', async () => {
    
    // Elementos do Modal de Doação
    const modalDoacao = document.getElementById('modalDoacao');
    const btnAbrirDoacao = document.getElementById('btnAbrirDoacao');
    const btnAbrirDoacaoSucesso = document.getElementById('btnAbrirDoacaoSucesso');
    const btnFecharDoacao = document.getElementById('btnFecharDoacao');
    const btnCopiarPix = document.getElementById('btnCopiarPix');
    const chavePix = document.getElementById('chavePix');
    const listaItensDoacao = document.getElementById('listaItensDoacao');
    const btnConfirmarDoacao = document.getElementById('btnConfirmarDoacao');
    const qtdTotalDoacao = document.getElementById('qtdTotalDoacao');
    let carrinhoDoacoes = {};

    const tituloTerreiro = document.getElementById('nomeTerreiro');
    if (tituloTerreiro) tituloTerreiro.textContent = "Carregando sistema...";

    // 1. Verifica Sessão de Login
    const { data: { session }, error: erroSessao } = await supabaseClient.auth.getSession();
    
    if (erroSessao || !session) {
        localStorage.clear();
        window.location.href = 'index.html';
        return;
    }

    try {
        let perfil = null;
        const authId = session.user.id;

        // Busca o médium pelo auth_id
        const { data: p1 } = await supabaseClient.from('mediuns').select('*').eq('auth_id', authId).limit(1);
        
        if (p1 && p1.length > 0) {
            perfil = p1[0];
        } else {
            if (session.user.email) {
                const possivelId = session.user.email.split('@')[0];
                if (!isNaN(possivelId)) {
                    const { data: p2 } = await supabaseClient.from('mediuns').select('*').eq('id', possivelId).limit(1);
                    if (p2 && p2.length > 0) perfil = p2[0];
                }
            }
            
            if (!perfil && session.user.phone) {
                const { data: p3 } = await supabaseClient.from('mediuns').select('*').eq('telefone', session.user.phone).limit(1);
                if (p3 && p3.length > 0) perfil = p3[0];
            }
            
            const localId = localStorage.getItem('medium_id');
            if (!perfil && localId) {
                const { data: p4 } = await supabaseClient.from('mediuns').select('*').eq('id', localId).limit(1);
                if (p4 && p4.length > 0) perfil = p4[0];
            }

            if (perfil) {
                await supabaseClient.from('mediuns').update({ auth_id: authId }).eq('id', perfil.id);
            }
        }

        if (!perfil) {
            alert("Aviso: A sua ficha de médium não foi encontrada. Fale com a Administração.");
            await supabaseClient.auth.signOut();
            localStorage.clear();
            window.location.href = 'index.html';
            return;
        }

        // Bloqueio se o médium estiver inativo
        if (perfil.status_ativo === false || perfil.status_ativo === 'false') {
            alert("O seu acesso ao sistema está inativo. Por favor, entre em contacto com a Administração da Casa.");
            await supabaseClient.auth.signOut();
            localStorage.clear();
            window.location.href = 'index.html';
            return;
        }

        perfilMediumLogado = perfil;
        idTerreiroGlobal = perfil.terreiro_id;

        const nomeCurto = perfil.nome_social || (perfil.nome_completo ? perfil.nome_completo.split(' ')[0] : 'Médium');
        const txtNome = document.getElementById('nomeMedium');
        if (txtNome) txtNome.textContent = 'Olá, ' + nomeCurto;

        // Permissão de acesso ao botão do Painel Admin
        const temAcessoAoPainel = perfil.is_admin === true || 
                                  perfil.perm_visao_geral === true ||
                                  perfil.perm_agenda === true || 
                                  perfil.perm_ata === true ||
                                  perfil.perm_grau === true || 
                                  perfil.perm_financeiro === true || 
                                  perfil.perm_doacoes === true || 
                                  perfil.perm_admin === true ||
                                  perfil.is_master === true;

        if (temAcessoAoPainel) {
            const areaAdmin = document.getElementById('areaAdmin');
            if (areaAdmin) areaAdmin.classList.remove('hidden');
        }

        const btnPainel = document.getElementById('btnPainelAdmin');
        if (btnPainel) {
            btnPainel.addEventListener('click', () => window.location.href = 'admin.html');
        }

        // Carrega dados e tema do terreiro
        if (idTerreiroGlobal) {
            const { data: terreiros } = await supabaseClient.from('terreiros').select('*').eq('id', idTerreiroGlobal).limit(1);
            
            if (terreiros && terreiros.length > 0) {
                const terreiro = terreiros[0];
                terreiroConfigMensalidade = terreiro;

                if (tituloTerreiro) tituloTerreiro.textContent = terreiro.nome || 'Terreiro sem Nome';
                coordsTerreiro = { lat: terreiro.latitude, lng: terreiro.longitude };
                
                const root = document.documentElement;
                if(terreiro.cor_primaria) root.style.setProperty('--cor-primaria', terreiro.cor_primaria);
                if(terreiro.cor_secundaria) root.style.setProperty('--cor-secundaria', terreiro.cor_secundaria);
                if(terreiro.cor_fundo) root.style.setProperty('--cor-fundo', terreiro.cor_fundo);
                if(terreiro.cor_texto) root.style.setProperty('--cor-texto', terreiro.cor_texto);

                const img = document.getElementById('logoTerreiro');
                if(terreiro.logo_url && img) {
                    img.src = terreiro.logo_url;
                    img.classList.remove('hidden');
                }

                carregarItensDoacao();

                // INICIALIZA O MÓDULO DE MENSALIDADES SE ATIVO
                if (terreiro.modulo_mensalidade_ativo === true) {
                    const btnMensalidade = document.getElementById('btnAbrirMensalidade');
                    const btnMensalidadeSucesso = document.getElementById('btnAbrirMensalidadeSucesso');
                    if (btnMensalidade) btnMensalidade.classList.replace('hidden', 'flex');
                    if (btnMensalidadeSucesso) btnMensalidadeSucesso.classList.replace('hidden', 'flex');
                    
                    carregarConfigValoresGrau();
                }
            }
        } else {
            if (tituloTerreiro) tituloTerreiro.textContent = 'Sem Terreiro Vinculado';
        }

        // ====================================================================
        // VERIFICAÇÃO DE EVENTO / GIRA AGENDADA
        // ====================================================================
        const horaNavegador = new Date();

        const { data: girasFuturas } = await supabaseClient.from('agenda').select('*')
            .eq('terreiro_id', idTerreiroGlobal)
            .or('ata_encerrada.eq.false,ata_encerrada.is.null') 
            .order('data_hora_inicio', { ascending: true });

        const divSemGira = document.getElementById('estadoSemGira');
        const divComGira = document.getElementById('estadoComGira');

        let gira = null;

        if (girasFuturas && girasFuturas.length > 0) {
            gira = girasFuturas.find(g => {
                let hrFim;
                const hrInicio = new Date(g.data_hora_inicio);
                
                if (g.data_hora_fim) {
                    hrFim = new Date(g.data_hora_fim);
                } else {
                    hrFim = new Date(hrInicio.getTime() + (4 * 60 * 60 * 1000));
                }
                
                const aindaRolando = hrFim > horaNavegador;

                let acessoPermitido = true;
                if (g.especial === true) {
                    const convocados = g.convocados || [];
                    const meuId = String(perfil.id);
                    
                    if (!convocados.includes(meuId) && !perfil.is_admin) {
                        acessoPermitido = false;
                    }
                }
                
                return aindaRolando && acessoPermitido;
            });
        }

        if (gira) {
            idGiraGlobal = gira.id;
            
            const hrInicioGira = new Date(gira.data_hora_inicio);
            
            if (gira.data_hora_fim) {
                hrFimGiraGlobal = new Date(gira.data_hora_fim);
            } else {
                hrFimGiraGlobal = new Date(hrInicioGira.getTime() + (4 * 60 * 60 * 1000));
            }
            
            hrInicioPermitidoGlobal = new Date(hrInicioGira.getTime() - (90 * 60000));

            if (divSemGira) divSemGira.classList.add('hidden');
            if (divComGira) divComGira.classList.remove('hidden');
            
            const titleGira = document.getElementById('tituloGira');
            if (titleGira) titleGira.textContent = gira.titulo;

            const imgCartaz = document.getElementById('cartazGira');
            if (imgCartaz) {
                if (gira.imagem_url) {
                    imgCartaz.src = gira.imagem_url;
                    imgCartaz.classList.remove('hidden');
                } else {
                    imgCartaz.classList.add('hidden');
                }
            }
            
            const txtHrInicio = hrInicioGira.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
            const txtHrFim = hrFimGiraGlobal.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
            
            const ehHoje = hrInicioGira.getDate() === horaNavegador.getDate() &&
                           hrInicioGira.getMonth() === horaNavegador.getMonth() &&
                           hrInicioGira.getFullYear() === horaNavegador.getFullYear();

            const textHorario = document.getElementById('horarioGira');
            if (textHorario) {
                if (ehHoje) {
                    textHorario.innerHTML = `<i class="far fa-clock"></i> ${txtHrInicio} às ${txtHrFim}`;
                } else {
                    const dataFormatada = hrInicioGira.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'});
                    textHorario.innerHTML = `<i class="far fa-calendar-alt"></i> Dia ${dataFormatada} - ${txtHrInicio} às ${txtHrFim}`;
                    
                    const elementos = document.querySelectorAll('#estadoComGira span, #estadoComGira div, #estadoComGira p');
                    elementos.forEach(el => {
                        if (el.textContent.trim().toUpperCase() === 'EVENTO HOJE') {
                            el.textContent = 'PRÓXIMO EVENTO';
                        }
                    });
                }
            }

            const { data: presencas } = await supabaseClient.from('presencas').select('*')
                .eq('usuario_id', authId).eq('evento_id', idGiraGlobal).limit(1);

            if (presencas && presencas.length > 0) {
                const areaPonto = document.getElementById('areaBaterPonto');
                const areaSucesso = document.getElementById('areaSucesso');
                const horaFeito = document.getElementById('horaCheckinFeito');
                
                if (areaPonto) areaPonto.classList.add('hidden');
                if (areaSucesso) areaSucesso.classList.remove('hidden');
                if (horaFeito) horaFeito.textContent = new Date(presencas[0].data_hora_checkin).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
            } else {
                const btnPonto = document.getElementById('btnCheckin');
                const btnAgora = new Date();
                
                if (btnPonto) {
                    if (btnAgora < hrInicioPermitidoGlobal) {
                        btnPonto.disabled = true;
                        btnPonto.innerHTML = '<i class="fas fa-lock"></i> Libera 90 min antes';
                        btnPonto.classList.add('opacity-60', 'cursor-not-allowed', 'bg-gray-500');
                        btnPonto.classList.remove('bg-tema-secundaria', 'hover:opacity-90');
                    } else if (btnAgora > hrFimGiraGlobal) {
                        btnPonto.disabled = true;
                        btnPonto.innerHTML = '<i class="fas fa-times-circle"></i> Gira Encerrada';
                        btnPonto.classList.add('opacity-60', 'cursor-not-allowed', 'bg-gray-500');
                        btnPonto.classList.remove('bg-tema-secundaria', 'hover:opacity-90');
                    }
                }
            }
        } else {
            if (divComGira) divComGira.classList.add('hidden');
            if (divSemGira) divSemGira.classList.remove('hidden');
        }

    } catch (error) {
        console.error("Erro fatal:", error);
        const divSemGira = document.getElementById('estadoSemGira');
        if (divSemGira) {
            divSemGira.classList.remove('hidden');
            divSemGira.innerHTML = `
                <i class="fas fa-exclamation-triangle text-red-500 text-5xl mb-4"></i>
                <h2 class="text-xl font-bold text-gray-700">Erro Interno</h2>
                <p class="text-red-500 mt-2 font-bold">${error.message}</p>
                <p class="text-gray-500 text-sm mt-2">Tente atualizar a página.</p>
            `;
        }
    }

    // ====================================================================
    // DOAÇÕES
    // ====================================================================
    async function carregarItensDoacao() {
        try {
            const { data: itens, error } = await supabaseClient
                .from('itens_doacao')
                .select('*')
                .eq('terreiro_id', idTerreiroGlobal)
                .eq('ativo', true)
                .order('nome', { ascending: true }); 

            if (error) throw error;

            if (!itens || itens.length === 0) {
                if(listaItensDoacao) listaItensDoacao.innerHTML = '<p class="text-center text-gray-500 text-sm py-4">Apenas doações via PIX no momento.</p>';
                return;
            }

            let html = '';
            itens.forEach(item => {
                html += `
                <div class="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 px-1">
                    <div class="flex-1 pr-2">
                        <p class="text-xs font-medium text-gray-800 leading-tight">${item.nome}</p>
                        ${item.descricao ? `<p class="text-[10px] text-gray-500 mt-0.5">${item.descricao}</p>` : ''}
                    </div>
                    <div class="flex items-center space-x-2 bg-gray-100 rounded p-1">
                        <button type="button" class="btn-qtd w-6 h-6 rounded bg-white text-red-500 font-bold shadow-sm flex items-center justify-center border border-gray-200 active:scale-95" data-id="${item.id}" data-delta="-1">
                            <i class="fas fa-minus text-[10px] pointer-events-none"></i>
                        </button>
                        <span class="w-4 text-center text-xs font-bold text-gray-700" id="qtd-item-${item.id}">0</span>
                        <button type="button" class="btn-qtd w-6 h-6 rounded bg-white text-green-600 font-bold shadow-sm flex items-center justify-center border border-gray-200 active:scale-95" data-id="${item.id}" data-delta="1">
                            <i class="fas fa-plus text-[10px] pointer-events-none"></i>
                        </button>
                    </div>
                </div>`;
            });

            if(listaItensDoacao) listaItensDoacao.innerHTML = html;
        } catch (err) {
            console.error('Erro ao carregar itens:', err);
            if(listaItensDoacao) listaItensDoacao.innerHTML = '<p class="text-center text-red-500 text-xs py-4">Erro ao carregar itens.</p>';
        }
    }

    if (listaItensDoacao) {
        listaItensDoacao.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-qtd');
            if (!btn) return;
            
            const itemId = btn.getAttribute('data-id');
            const delta = parseInt(btn.getAttribute('data-delta'));
            
            if (!carrinhoDoacoes[itemId]) carrinhoDoacoes[itemId] = 0;
            
            carrinhoDoacoes[itemId] += delta;
            if (carrinhoDoacoes[itemId] < 0) carrinhoDoacoes[itemId] = 0;
            
            document.getElementById(`qtd-item-${itemId}`).textContent = carrinhoDoacoes[itemId];
            
            let total = 0;
            for (let id in carrinhoDoacoes) total += carrinhoDoacoes[id];
            
            if (total > 0) {
                if(qtdTotalDoacao) qtdTotalDoacao.textContent = total;
                if(btnConfirmarDoacao) {
                    btnConfirmarDoacao.classList.remove('hidden');
                    btnConfirmarDoacao.classList.add('flex');
                }
            } else {
                if(btnConfirmarDoacao) {
                    btnConfirmarDoacao.classList.add('hidden');
                    btnConfirmarDoacao.classList.remove('flex');
                }
            }
        });
    }

    if (btnConfirmarDoacao) {
        btnConfirmarDoacao.addEventListener('click', async () => {
            const { data: { session } } = await supabaseClient.auth.getSession();
            const originalText = btnConfirmarDoacao.innerHTML;
            btnConfirmarDoacao.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Salvando...';
            btnConfirmarDoacao.disabled = true;

            const insercoes = [];
            for (let itemId in carrinhoDoacoes) {
                if (carrinhoDoacoes[itemId] > 0) {
                    insercoes.push({
                        terreiro_id: idTerreiroGlobal,
                        medium_auth_id: session.user.id,
                        item_id: parseInt(itemId),
                        quantidade: carrinhoDoacoes[itemId]
                    });
                }
            }

            try {
                const { error } = await supabaseClient.from('doacoes_registradas').insert(insercoes);
                if (error) throw error;

                btnConfirmarDoacao.innerHTML = '<i class="fas fa-check mr-2"></i> Doação Registrada!';
                btnConfirmarDoacao.classList.replace('bg-green-600', 'bg-blue-600');
                
                setTimeout(() => {
                    if(btnFecharDoacao) btnFecharDoacao.click();
                    carrinhoDoacoes = {};
                    if(btnConfirmarDoacao) {
                        btnConfirmarDoacao.classList.add('hidden');
                        btnConfirmarDoacao.classList.remove('flex');
                    }
                    carregarItensDoacao(); 
                    btnConfirmarDoacao.innerHTML = originalText;
                    btnConfirmarDoacao.disabled = false;
                    btnConfirmarDoacao.classList.replace('bg-blue-600', 'bg-green-600');
                }, 2000);

            } catch (err) {
                console.error('Erro ao salvar:', err);
                btnConfirmarDoacao.innerHTML = '<i class="fas fa-times mr-2"></i> Erro ao salvar';
                btnConfirmarDoacao.classList.replace('bg-green-600', 'bg-red-600');
                setTimeout(() => {
                    btnConfirmarDoacao.innerHTML = originalText;
                    btnConfirmarDoacao.disabled = false;
                    btnConfirmarDoacao.classList.replace('bg-red-600', 'bg-green-600');
                }, 3000);
            }
        });
    }

    const abrirModal = () => {
        if(modalDoacao) {
            modalDoacao.classList.remove('hidden');
            setTimeout(() => {
                modalDoacao.querySelector('div').classList.remove('scale-95');
                modalDoacao.querySelector('div').classList.add('scale-100');
            }, 10);
        }
    };

    if(btnAbrirDoacao) btnAbrirDoacao.addEventListener('click', abrirModal);
    if(btnAbrirDoacaoSucesso) btnAbrirDoacaoSucesso.addEventListener('click', abrirModal);

    if(btnFecharDoacao) {
        btnFecharDoacao.addEventListener('click', () => {
            modalDoacao.querySelector('div').classList.remove('scale-100');
            modalDoacao.querySelector('div').classList.add('scale-95');
            setTimeout(() => {
                modalDoacao.classList.add('hidden');
                if(btnCopiarPix) {
                    btnCopiarPix.innerHTML = '<i class="fas fa-copy mr-2"></i> Copiar Chave';
                    btnCopiarPix.classList.replace('bg-green-600', 'bg-gray-800');
                }
            }, 200);
        });
    }

    if(btnCopiarPix) {
        btnCopiarPix.addEventListener('click', () => {
            if(chavePix) {
                navigator.clipboard.writeText(chavePix.innerText).then(() => {
                    btnCopiarPix.innerHTML = '<i class="fas fa-check mr-2"></i> Chave Copiada!';
                    btnCopiarPix.classList.replace('bg-gray-800', 'bg-green-600');
                });
            }
        });
    }

    // ====================================================================
    // LÓGICA DO MÓDULO DE MENSALIDADES (CARRINHO E PIX)
    // ====================================================================
    const modalMensalidade = document.getElementById('modalMensalidade');
    const btnAbrirMensalidade = document.getElementById('btnAbrirMensalidade');
    const btnAbrirMensalidadeSucesso = document.getElementById('btnAbrirMensalidadeSucesso');
    const btnFecharMensalidadeSuperior = document.getElementById('btnFecharMensalidadeSuperior');
    const selectAnoMensalidade = document.getElementById('selectAnoMensalidade');
    const containerCarrinhoMensalidades = document.getElementById('containerCarrinhoMensalidades');
    const btnAdicionarOutroMedium = document.getElementById('btnAdicionarOutroMedium');
    const boxBuscaOutroMedium = document.getElementById('boxBuscaOutroMedium');
    const buscaOutroMedium = document.getElementById('buscaOutroMedium');
    const resultadoBuscaOutroMedium = document.getElementById('resultadoBuscaOutroMedium');
    const boxPagamentoManual = document.getElementById('boxPagamentoManual');
    const chavePixMensalidade = document.getElementById('chavePixMensalidade');
    const btnCopiarPixMensalidade = document.getElementById('btnCopiarPixMensalidade');
    const arquivoComprovanteMensalidade = document.getElementById('arquivoComprovanteMensalidade');
    const valorTotalMensalidade = document.getElementById('valorTotalMensalidade');
    const btnFinalizarMensalidade = document.getElementById('btnFinalizarMensalidade');
    const msgErroMensalidade = document.getElementById('msgErroMensalidade');

    async function carregarConfigValoresGrau() {
        try {
            const { data } = await supabaseClient.from('config_mensalidades').select('*').eq('terreiro_id', idTerreiroGlobal);
            configValoresGrau = {};
            if (data) {
                data.forEach(item => {
                    configValoresGrau[item.grau] = parseFloat(item.valor) || 0;
                });
            }
        } catch(e) {
            console.error('Erro ao buscar valores por grau:', e);
        }
    }

    async function abrirModalMensalidade() {
        if (!modalMensalidade) return;
        
        if (chavePixMensalidade && terreiroConfigMensalidade) {
            chavePixMensalidade.textContent = terreiroConfigMensalidade.chave_pix_manual || 'Chave PIX não configurada';
        }

        if (selectAnoMensalidade) {
            const anoCorrente = new Date().getFullYear();
            selectAnoMensalidade.innerHTML = `
                <option value="${anoCorrente - 1}">${anoCorrente - 1}</option>
                <option value="${anoCorrente}" selected>${anoCorrente}</option>
                <option value="${anoCorrente + 1}">${anoCorrente + 1}</option>
            `;
        }

        carrinhoMensalidadesState = [{
            mediumId: perfilMediumLogado.id,
            mediumNome: perfilMediumLogado.nome_completo,
            grau: perfilMediumLogado.grau || '-',
            valorUnitario: configValoresGrau[perfilMediumLogado.grau] || 0.00,
            mesesPagosNoAno: [],
            mesesSelecionados: []
        }];

        await atualizarCarrinhoRender();

        modalMensalidade.classList.remove('hidden');
        setTimeout(() => {
            modalMensalidade.querySelector('div').classList.remove('scale-95');
            modalMensalidade.querySelector('div').classList.add('scale-100');
        }, 10);
    }

    if (btnAbrirMensalidade) btnAbrirMensalidade.addEventListener('click', abrirModalMensalidade);
    if (btnAbrirMensalidadeSucesso) btnAbrirMensalidadeSucesso.addEventListener('click', abrirModalMensalidade);

    const fecharModalMensalidade = () => {
        if (!modalMensalidade) return;
        modalMensalidade.querySelector('div').classList.remove('scale-100');
        modalMensalidade.querySelector('div').classList.add('scale-95');
        setTimeout(() => {
            modalMensalidade.classList.add('hidden');
        }, 200);
    };

    if (btnFecharMensalidadeSuperior) btnFecharMensalidadeSuperior.addEventListener('click', fecharModalMensalidade);

    if (selectAnoMensalidade) {
        selectAnoMensalidade.addEventListener('change', async () => {
            await atualizarCarrinhoRender();
        });
    }

    async function atualizarCarrinhoRender() {
        if (!containerCarrinhoMensalidades) return;
        containerCarrinhoMensalidades.innerHTML = '<p class="text-center text-gray-500 text-sm py-4"><i class="fas fa-spinner fa-spin mr-2"></i> Verificando pagamentos...</p>';
        
        const anoSelecionado = parseInt(selectAnoMensalidade.value);

        const idsNoCarrinho = carrinhoMensalidadesState.map(c => c.mediumId);
        const { data: pgtosFeitos } = await supabaseClient.from('financeiro')
            .select('medium_id, mes, pago')
            .eq('ano', anoSelecionado)
            .in('medium_id', idsNoCarrinho)
            .eq('pago', true);

        let htmlGeral = '';

        carrinhoMensalidadesState.forEach((itemCarrinho, indexCarrinho) => {
            const pgtosMedium = pgtosFeitos ? pgtosFeitos.filter(p => p.medium_id === itemCarrinho.mediumId) : [];
            const mesesPagos = pgtosMedium.map(p => p.mes);
            itemCarrinho.mesesPagosNoAno = mesesPagos;

            const nomesMeses = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            
            let gridMesesHtml = '';
            for (let m = 1; m <= 12; m++) {
                const jaPago = mesesPagos.includes(m);
                const selecionado = itemCarrinho.mesesSelecionados.includes(m);
                
                if (jaPago) {
                    gridMesesHtml += `
                        <div class="bg-green-50 border border-green-200 text-green-700 rounded-lg p-2 text-center text-xs font-bold flex flex-col justify-between opacity-80 cursor-not-allowed" title="Mês já pago">
                            <span>${nomesMeses[m]}</span>
                            <i class="fas fa-check-circle text-green-600 mt-1"></i>
                        </div>
                    `;
                } else {
                    gridMesesHtml += `
                        <label class="border rounded-lg p-2 text-center text-xs font-bold flex flex-col justify-between cursor-pointer transition select-none ${selecionado ? 'bg-tema-secundaria text-white border-tema-secundaria shadow-sm' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}">
                            <span>${nomesMeses[m]}</span>
                            <input type="checkbox" value="${m}" data-carrinho-index="${indexCarrinho}" class="chk-mes-carrinho hidden" ${selecionado ? 'checked' : ''}>
                            <span class="text-[9px] font-normal ${selecionado ? 'text-white/90' : 'text-gray-400'}">R$ ${itemCarrinho.valorUnitario.toFixed(2)}</span>
                        </label>
                    `;
                }
            }

            const btnRemoverHtml = carrinhoMensalidadesState.length > 1 ? `
                <button type="button" onclick="removerDoCarrinho(${indexCarrinho})" class="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1">
                    <i class="fas fa-trash"></i> Remover
                </button>
            ` : '';

            htmlGeral += `
                <div class="bg-gray-50 border border-gray-200 rounded-2xl p-4 shadow-sm">
                    <div class="flex justify-between items-center mb-2">
                        <div>
                            <p class="font-bold text-gray-800 text-sm">${itemCarrinho.mediumNome}</p>
                            <p class="text-[10px] text-gray-500 uppercase">Grau: ${itemCarrinho.grau} | Valor: R$ ${itemCarrinho.valorUnitario.toFixed(2)}/mês</p>
                        </div>
                        ${btnRemoverHtml}
                    </div>
                    <div class="grid grid-cols-4 gap-1.5 mt-2">
                        ${gridMesesHtml}
                    </div>
                </div>
            `;
        });

        containerCarrinhoMensalidades.innerHTML = htmlGeral;
        recalcularTotalCarrinho();
    }

    if (containerCarrinhoMensalidades) {
        containerCarrinhoMensalidades.addEventListener('change', (e) => {
            const chk = e.target.closest('.chk-mes-carrinho');
            if (!chk) return;
            
            const indexCarrinho = parseInt(chk.getAttribute('data-carrinho-index'));
            const mesNum = parseInt(chk.value);

            if (!carrinhoMensalidadesState[indexCarrinho].mesesSelecionados) {
                carrinhoMensalidadesState[indexCarrinho].mesesSelecionados = [];
            }

            if (chk.checked) {
                if (!carrinhoMensalidadesState[indexCarrinho].mesesSelecionados.includes(mesNum)) {
                    carrinhoMensalidadesState[indexCarrinho].mesesSelecionados.push(mesNum);
                }
            } else {
                carrinhoMensalidadesState[indexCarrinho].mesesSelecionados = carrinhoMensalidadesState[indexCarrinho].mesesSelecionados.filter(m => m !== mesNum);
            }

            atualizarCarrinhoRender(); 
        });
    }

    window.removerDoCarrinho = async (index) => {
        carrinhoMensalidadesState.splice(index, 1);
        await atualizarCarrinhoRender();
    };

    function recalcalcularTotalCarrinho() {
        let totalGeral = 0;
        let totalMesesSelecionados = 0;

        carrinhoMensalidadesState.forEach(item => {
            const qtd = item.mesesSelecionados ? item.mesesSelecionados.length : 0;
            totalMesesSelecionados += qtd;
            totalGeral += qtd * item.valorUnitario;
        });

        if (valorTotalMensalidade) valorTotalMensalidade.textContent = totalGeral.toFixed(2).replace('.', ',');

        if (totalMesesSelecionados > 0) {
            if (boxPagamentoManual) boxPagamentoManual.classList.remove('hidden');
            if (btnFinalizarMensalidade) {
                btnFinalizarMensalidade.disabled = false;
                btnFinalizarMensalidade.classList.remove('opacity-50', 'cursor-not-allowed');
                btnFinalizarMensalidade.innerHTML = `<i class="fas fa-check-circle mr-2"></i> Enviar Comprovativo (R$ ${totalGeral.toFixed(2).replace('.', ',')})`;
            }
        } else {
            if (boxPagamentoManual) boxPagamentoManual.classList.add('hidden');
            if (btnFinalizarMensalidade) {
                btnFinalizarMensalidade.disabled = true;
                btnFinalizarMensalidade.classList.add('opacity-50', 'cursor-not-allowed');
                btnFinalizarMensalidade.innerHTML = 'Selecionar Meses';
            }
        }
    }

    if (btnAdicionarOutroMedium && boxBuscaOutroMedium) {
        btnAdicionarOutroMedium.addEventListener('click', () => {
            boxBuscaOutroMedium.classList.toggle('hidden');
            if (!boxBuscaOutroMedium.classList.contains('hidden')) {
                buscaOutroMedium.focus();
            }
        });
    }

    if (buscaOutroMedium) {
        buscaOutroMedium.addEventListener('input', async (e) => {
            const termo = e.target.value.trim().toLowerCase();
            if (!termo || termo.length < 2) {
                if (resultadoBuscaOutroMedium) resultadoBuscaOutroMedium.innerHTML = '';
                return;
            }

            const { data: medEncontrados } = await supabaseClient.from('mediuns')
                .select('id, nome_completo, grau')
                .eq('terreiro_id', idTerreiroGlobal)
                .neq('nome_completo', 'Administrador Sistema')
                .ilike('nome_completo', `%${termo}%`)
                .limit(5);

            if (!resultadoBuscaOutroMedium) return;
            resultadoBuscaOutroMedium.innerHTML = '';

            if (medEncontrados && medEncontrados.length > 0) {
                medEncontrados.forEach(m => {
                    const jaExiste = carrinhoMensalidadesState.some(c => c.mediumId === m.id);
                    if (jaExiste) return;

                    const li = document.createElement('li');
                    li.className = "p-2.5 hover:bg-gray-50 cursor-pointer flex justify-between items-center text-xs";
                    li.innerHTML = `<span><strong>${m.nome_completo}</strong> <span class="text-gray-400">(${m.grau || '-'})</span></span> <span class="text-tema-secundaria font-bold"><i class="fas fa-plus"></i> Adicionar</span>`;
                    
                    li.addEventListener('click', async () => {
                        const valorGrau = configValoresGrau[m.grau] || 0.00;
                        carrinhoMensalidadesState.push({
                            mediumId: m.id,
                            mediumNome: m.nome_completo,
                            grau: m.grau || '-',
                            valorUnitario: valorGrau,
                            mesesPagosNoAno: [],
                            mesesSelecionados: []
                        });
                        boxBuscaOutroMedium.classList.add('hidden');
                        buscaOutroMedium.value = '';
                        resultadoBuscaOutroMedium.innerHTML = '';
                        await atualizarCarrinhoRender();
                    });

                    resultadoBuscaOutroMedium.appendChild(li);
                });
            } else {
                resultadoBuscaOutroMedium.innerHTML = '<li class="p-2 text-center text-gray-400 text-xs">Nenhum médium encontrado.</li>';
            }
        });
    }

    if (btnFinalizarMensalidade) {
        btnFinalizarMensalidade.addEventListener('click', async () => {
            if (!arquivoComprovanteMensalidade || arquivoComprovanteMensalidade.files.length === 0) {
                if (msgErroMensalidade) {
                    msgErroMensalidade.textContent = "Por favor, anexe a foto ou PDF do comprovativo do PIX antes de enviar.";
                    msgErroMensalidade.classList.remove('hidden');
                }
                return;
            }

            const originalBtnText = btnFinalizarMensalidade.innerHTML;
            btnFinalizarMensalidade.disabled = true;
            btnFinalizarMensalidade.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Enviando comprovativo...';
            if (msgErroMensalidade) msgErroMensalidade.classList.add('hidden');

            try {
                const arquivo = arquivoComprovanteMensalidade.files[0];
                const anoRef = parseInt(selectAnoMensalidade.value);

                const fileName = `${idTerreiroGlobal}/comprovante_${perfilMediumLogado.id}_${Date.now()}.${arquivo.name.split('.').pop()}`;
                const { error: errUpload } = await supabaseClient.storage.from('public').upload(fileName, arquivo);
                if (errUpload) throw errUpload;

                const { data: { publicUrl } } = supabaseClient.storage.from('public').getPublicUrl(fileName);

                let valorTotalCalculado = 0;
                const detalhesJson = [];

                carrinhoMensalidadesState.forEach(item => {
                    if (item.mesesSelecionados && item.mesesSelecionados.length > 0) {
                        const subtotal = item.mesesSelecionados.length * item.valorUnitario;
                        valorTotalCalculado += subtotal;
                        detalhesJson.push({
                            medium_id: item.mediumId,
                            medium_nome: item.mediumNome,
                            ano: anoRef,
                            meses: item.mesesSelecionados,
                            subtotal: subtotal
                        });
                    }
                });

                if (detalhesJson.length === 0) throw new Error("Nenhum mês selecionado.");

                const { error: errIns } = await supabaseClient.from('comprovantes_mensalidade').insert([{
                    terreiro_id: idTerreiroGlobal,
                    enviado_por: session.user.id,
                    valor_total: valorTotalCalculado,
                    url_comprovante: publicUrl,
                    status: 'pendente',
                    detalhes_pagamento: detalhesJson
                }]);

                if (errIns) throw errIns;

                alert("✅ Comprovativo enviado com sucesso para a Tesouraria! A administração fará a validação em breve.");
                fecharModalMensalidade();

            } catch (error) {
                console.error(error);
                if (msgErroMensalidade) {
                    msgErroMensalidade.textContent = "Erro ao enviar: " + error.message;
                    msgErroMensalidade.classList.remove('hidden');
                }
            } finally {
                btnFinalizarMensalidade.disabled = false;
                btnFinalizarMensalidade.innerHTML = originalBtnText;
            }
        });
    }

    const btnSair = document.getElementById('btnSair');
    if (btnSair) {
        btnSair.addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            localStorage.clear();
            window.location.href = 'index.html';
        });
    }
});

// ====================================================================
// GPS DO CHECK-IN
// ====================================================================

const btnCheckin = document.getElementById('btnCheckin');
const modalPermissaoGPS = document.getElementById('modalPermissaoGPS');
const gpsEstadoPrompt = document.getElementById('gpsEstadoPrompt');
const gpsEstadoNegado = document.getElementById('gpsEstadoNegado');
const btnEntendiGps = document.getElementById('btnEntendiGps');
const btnFecharModalGps = document.getElementById('btnFecharModalGps');

function mostrarModalGPS(estado) {
    if (modalPermissaoGPS) {
        modalPermissaoGPS.classList.remove('hidden');
        gpsEstadoPrompt.classList.add('hidden');
        gpsEstadoNegado.classList.add('hidden');
        
        if (estado === 'prompt') gpsEstadoPrompt.classList.remove('hidden');
        if (estado === 'denied') gpsEstadoNegado.classList.remove('hidden');

        setTimeout(() => {
            modalPermissaoGPS.querySelector('div').classList.remove('scale-95');
            modalPermissaoGPS.querySelector('div').classList.add('scale-100');
        }, 10);
    }
}

function executarCheckinGPS() {
    const msg = document.getElementById('msgCheckin');
    btnCheckin.disabled = true;
    btnCheckin.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> A ler sinal de GPS...';
    
    if (msg) msg.classList.add('hidden');
    if (modalPermissaoGPS) modalPermissaoGPS.classList.add('hidden');

    navigator.geolocation.getCurrentPosition(async (posicao) => {
        const latUsuario = posicao.coords.latitude;
        const lonUsuario = posicao.coords.longitude;
        const precisaoAparelho = posicao.coords.accuracy || 0; 

        const distanciaBruta = calcularDistancia(latUsuario, lonUsuario, coordsTerreiro.lat, coordsTerreiro.lng);
        
        const margemTolerancia = Math.min(precisaoAparelho / 2, 15);
        const distanciaEfetiva = Math.max(0, distanciaBruta - margemTolerancia);

        if (distanciaEfetiva > 30) {
            const distanciaExibida = Math.round(distanciaBruta);
            const metrosRestantes = Math.round(distanciaBruta - 30);
            if (msg) { 
                msg.innerHTML = `Está a <strong>${distanciaExibida} metros</strong> do terreiro.<br>Aproxime-se mais cerca de <strong>${metrosRestantes}m</strong> para confirmar. (Limite: 30m)`; 
                msg.className = "mt-3 text-xs md:text-sm font-semibold text-red-500 block text-center leading-relaxed"; 
                msg.classList.remove('hidden'); 
            }
            restaurarBotao(btnCheckin); 
            return;
        }

        const { data: { session } } = await supabaseClient.auth.getSession();
        btnCheckin.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> A registar presença...';

        const { error } = await supabaseClient.from('presencas').insert([{ 
            evento_id: idGiraGlobal, 
            usuario_id: session.user.id, 
            data_hora_checkin: new Date().toISOString(),
            localizacao_valida: true,
            distancia_metros: Math.round(distanciaBruta)
        }]);

        if (error) {
            if (msg) { 
                msg.textContent = "Erro ao registar: " + error.message; 
                msg.className = "mt-3 text-xs md:text-sm font-bold text-red-500 block text-center"; 
                msg.classList.remove('hidden'); 
            }
            restaurarBotao(btnCheckin);
        } else {
            const areaPonto = document.getElementById('areaBaterPonto');
            const areaSucesso = document.getElementById('areaSucesso');
            const horaFeito = document.getElementById('horaCheckinFeito');
            if (areaPonto) areaPonto.classList.add('hidden');
            if (areaSucesso) areaSucesso.classList.remove('hidden');
            if (horaFeito) horaFeito.textContent = new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
        }
    }, (err) => {
        if (msg) { 
            msg.textContent = "Não foi possível obter a sua localização. Ative a localização de alta precisão do dispositivo."; 
            msg.className = "mt-3 text-xs md:text-sm font-bold text-red-500 block text-center"; 
            msg.classList.remove('hidden'); 
        }
        restaurarBotao(btnCheckin);
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
}

if (btnCheckin) {
    btnCheckin.addEventListener('click', async () => {
        const msg = document.getElementById('msgCheckin');
        
        const agoraClick = new Date();
        if (hrInicioPermitidoGlobal && agoraClick < hrInicioPermitidoGlobal) {
            if (msg) { msg.textContent = "O evento ainda não iniciou. Aguarde o horário permitido."; msg.className = "mt-3 text-xs md:text-sm font-bold text-red-500 block text-center"; msg.classList.remove('hidden'); }
            return;
        }
        if (hrFimGiraGlobal && agoraClick > hrFimGiraGlobal) {
            if (msg) { msg.textContent = "Este evento já se encontra encerrado."; msg.className = "mt-3 text-xs md:text-sm font-bold text-red-500 block text-center"; msg.classList.remove('hidden'); }
            return;
        }

        if (!coordsTerreiro || !coordsTerreiro.lat) {
            if (msg) { msg.textContent = "A localização do terreiro ainda não foi configurada pela direção."; msg.className = "mt-3 text-xs md:text-sm font-bold text-red-500 block text-center"; msg.classList.remove('hidden'); }
            return;
        }

        if (!navigator.geolocation) {
            if (msg) { msg.textContent = "O seu navegador não possui suporte a GPS."; msg.className = "mt-3 text-xs md:text-sm font-bold text-red-500 block text-center"; msg.classList.remove('hidden'); }
            return;
        }

        if (navigator.permissions && navigator.permissions.query) {
            try {
                const permissao = await navigator.permissions.query({ name: 'geolocation' });
                
                if (permissao.state === 'granted') {
                    executarCheckinGPS();
                } else if (permissao.state === 'prompt') {
                    mostrarModalGPS('prompt');
                } else if (permissao.state === 'denied') {
                    mostrarModalGPS('denied');
                }
            } catch (e) {
                executarCheckinGPS();
            }
        } else {
            executarCheckinGPS();
        }
    });
}

if (btnEntendiGps) {
    btnEntendiGps.addEventListener('click', () => {
        executarCheckinGPS();
    });
}

if (btnFecharModalGps) {
    btnFecharModalGps.addEventListener('click', () => {
        modalPermissaoGPS.classList.add('hidden');
        restaurarBotao(btnCheckin);
    });
}

function restaurarBotao(btn) { 
    if (btn) { 
        btn.disabled = false; 
        btn.innerHTML = '<i class="fas fa-map-marker-alt mr-2"></i> Confirmar Presença'; 
    } 
}

function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const p1 = lat1 * Math.PI/180;
    const p2 = lat2 * Math.PI/180;
    const dp = (lat2-lat1) * Math.PI/180;
    const dl = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
}
