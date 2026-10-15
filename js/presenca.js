//// VERSÃO: ASAAS_STEP_1_FAMILIA
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
let valorPendenteParaPix = 0; 
let familiaresAprovadosCache = [];

// Variáveis Globais de Doações e Cantina (MOVIDAS PARA O TOPO)
let carrinhoDoacoes = {};
window.todosItensDoacaoCache = [];
let abaCampanhaAtiva = 'doacao';

document.addEventListener('DOMContentLoaded', async () => {
    
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

        // Inicializa dados do Modal de Perfil e Vínculos Familiares
        configurarModalPerfil();
        await carregarVinculosFamiliares();

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

                if (terreiro.modulo_mensalidade_ativo === true) {
                    const btnMensalidade = document.getElementById('btnAbrirMensalidade');
                    const btnMensalidadeSucesso = document.getElementById('btnAbrirMensalidadeSucesso');
                    if (btnMensalidade) btnMensalidade.classList.replace('hidden', 'flex');
                    if (btnMensalidadeSucesso) btnMensalidadeSucesso.classList.replace('hidden', 'flex');
                    
                    carregarConfigValoresGrau();
                    verificarPendenciaMensalidade(perfil.id);
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
                
                function atualizarStatusBotaoPonto() {
                    if (!btnPonto) return;
                    const btnAgora = new Date();
                    
                    if (btnAgora < hrInicioPermitidoGlobal) {
                        btnPonto.disabled = true;
                        const diffMs = hrInicioPermitidoGlobal - btnAgora;
                        const diffMins = Math.ceil(diffMs / 60000);
                        
                        let textoTempo = '';
                        if (diffMins > 60) {
                            const horas = Math.floor(diffMins / 60);
                            const minRest = diffMins % 60;
                            textoTempo = `em ${horas}h ${minRest}m`;
                        } else {
                            textoTempo = `em ${diffMins} min`;
                        }

                        btnPonto.innerHTML = `<i class="fas fa-lock"></i> Libera ${textoTempo}`;
                        btnPonto.classList.add('opacity-70', 'cursor-not-allowed', 'bg-gray-500');
                        btnPonto.classList.remove('bg-tema-primaria', 'hover:opacity-90', 'active:scale-95');
                        
                        setTimeout(atualizarStatusBotaoPonto, 60000);
                        
                    } else if (btnAgora > hrFimGiraGlobal) {
                        btnPonto.disabled = true;
                        btnPonto.innerHTML = '<i class="fas fa-times-circle"></i> Gira Encerrada';
                        btnPonto.classList.add('opacity-70', 'cursor-not-allowed', 'bg-gray-500');
                        btnPonto.classList.remove('bg-tema-primaria', 'hover:opacity-90', 'active:scale-95');
                    } else {
                        btnPonto.disabled = false;
                        btnPonto.innerHTML = '<i class="fas fa-map-marker-alt"></i> Confirmar Presença';
                        btnPonto.classList.remove('opacity-70', 'cursor-not-allowed', 'bg-gray-500');
                        btnPonto.classList.add('bg-tema-primaria', 'hover:opacity-90', 'active:scale-95');
                    }
                }
                
                atualizarStatusBotaoPonto();
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
    // MÓDULO MEU PERFIL (DADOS, SENHA E NÚCLEO FAMILIAR)
    // ====================================================================
    function configurarModalPerfil() {
        const modalPerfil = document.getElementById('modalPerfilMedium');
        const btnAbrirPerfil = document.getElementById('btnAbrirPerfil');
        const btnFecharPerfil = document.getElementById('btnFecharPerfil');

        const tabDados = document.getElementById('tabPerfilDados');
        const tabSenha = document.getElementById('tabPerfilSenha');
        const tabFamilia = document.getElementById('tabPerfilFamilia');

        const secDados = document.getElementById('conteudoAbaDados');
        const secSenha = document.getElementById('conteudoAbaSenha');
        const secFamilia = document.getElementById('conteudoAbaFamilia');

        const abrirPerfil = () => {
            if (!modalPerfil) return;
            // Carrega dados atuais nos inputs
            if (perfilMediumLogado) {
                document.getElementById('perfilNomeCompleto').value = perfilMediumLogado.nome_completo || '';
                document.getElementById('perfilNomeSocial').value = perfilMediumLogado.nome_social || '';
                document.getElementById('perfilTelefone').value = perfilMediumLogado.telefone || '';
            }
            modalPerfil.classList.remove('hidden');
            setTimeout(() => {
                const painel = modalPerfil.querySelector('div');
                if (painel) {
                    painel.classList.remove('scale-95');
                    painel.classList.add('scale-100');
                }
            }, 10);
        };

        const fecharPerfil = () => {
            if (!modalPerfil) return;
            const painel = modalPerfil.querySelector('div');
            if (painel) {
                painel.classList.remove('scale-100');
                painel.classList.add('scale-95');
            }
            setTimeout(() => modalPerfil.classList.add('hidden'), 200);
        };

        if (btnAbrirPerfil) btnAbrirPerfil.addEventListener('click', abrirPerfil);
        if (btnFecharPerfil) btnFecharPerfil.addEventListener('click', fecharPerfil);

        // Alternância de Abas
        function alternarAba(abaAtiva) {
            [tabDados, tabSenha, tabFamilia].forEach(tab => {
                tab.classList.remove('border-tema-primaria', 'text-tema-primaria');
                tab.classList.add('border-transparent', 'text-gray-400');
            });
            [secDados, secSenha, secFamilia].forEach(sec => sec.classList.add('hidden'));

            if (abaAtiva === 'dados') {
                tabDados.classList.add('border-tema-primaria', 'text-tema-primaria');
                secDados.classList.remove('hidden');
            } else if (abaAtiva === 'senha') {
                tabSenha.classList.add('border-tema-primaria', 'text-tema-primaria');
                secSenha.classList.remove('hidden');
            } else if (abaAtiva === 'familia') {
                tabFamilia.classList.add('border-tema-primaria', 'text-tema-primaria');
                secFamilia.classList.remove('hidden');
            }
        }

        if (tabDados) tabDados.addEventListener('click', () => alternarAba('dados'));
        if (tabSenha) tabSenha.addEventListener('click', () => alternarAba('senha'));
        if (tabFamilia) tabFamilia.addEventListener('click', () => alternarAba('familia'));

        // Salvar Dados Pessoais
        const btnSalvarDados = document.getElementById('btnSalvarDadosPerfil');
        const msgDados = document.getElementById('msgPerfilDados');

        if (btnSalvarDados) {
            btnSalvarDados.addEventListener('click', async () => {
                const nCompleto = document.getElementById('perfilNomeCompleto').value.trim();
                const nSocial = document.getElementById('perfilNomeSocial').value.trim();
                const nTel = document.getElementById('perfilTelefone').value.replace(/\D/g, '');

                if (!nCompleto) return alert("O Nome Completo é obrigatório.");
                if (nTel.length < 10) return alert("Digite um WhatsApp válido com DDD.");

                btnSalvarDados.disabled = true;
                btnSalvarDados.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Salvando...';
                if (msgDados) msgDados.classList.add('hidden');

                try {
                    const { error } = await supabaseClient.from('mediuns').update({
                        nome_completo: nCompleto,
                        nome_social: nSocial,
                        telefone: nTel
                    }).eq('id', perfilMediumLogado.id);

                    if (error) throw error;

                    perfilMediumLogado.nome_completo = nCompleto;
                    perfilMediumLogado.nome_social = nSocial;
                    perfilMediumLogado.telefone = nTel;

                    const nomeCurto = nSocial || nCompleto.split(' ')[0];
                    const txtNome = document.getElementById('nomeMedium');
                    if (txtNome) txtNome.textContent = 'Olá, ' + nomeCurto;

                    if (msgDados) {
                        msgDados.textContent = "✅ Dados atualizados com sucesso!";
                        msgDados.className = "text-xs font-bold text-green-600 text-center block";
                        msgDados.classList.remove('hidden');
                        setTimeout(() => msgDados.classList.add('hidden'), 3000);
                    }
                } catch (err) {
                    if (msgDados) {
                        msgDados.textContent = "Erro: " + err.message;
                        msgDados.className = "text-xs font-bold text-red-600 text-center block";
                        msgDados.classList.remove('hidden');
                    }
                } finally {
                    btnSalvarDados.disabled = false;
                    btnSalvarDados.innerHTML = 'Salvar Dados';
                }
            });
        }

        // Alterar Senha de 6 Dígitos
        const btnSalvarSenha = document.getElementById('btnSalvarSenhaPerfil');
        const msgSenha = document.getElementById('msgPerfilSenha');

        if (btnSalvarSenha) {
            btnSalvarSenha.addEventListener('click', async () => {
                const s1 = document.getElementById('perfilNovaSenha').value.trim();
                const s2 = document.getElementById('perfilConfirmaSenha').value.trim();

                const apenasNum = s1.replace(/\D/g, '');
                if (apenasNum.length !== 6 || s1.length !== 6) {
                    return alert("A nova senha deve ter exatamente 6 números.");
                }
                if (s1 !== s2) {
                    return alert("As senhas não coincidem.");
                }

                btnSalvarSenha.disabled = true;
                btnSalvarSenha.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Atualizando...';
                if (msgSenha) msgSenha.classList.add('hidden');

                try {
                    const { error } = await supabaseClient.auth.updateUser({ password: s1 });
                    if (error) throw error;

                    document.getElementById('perfilNovaSenha').value = '';
                    document.getElementById('perfilConfirmaSenha').value = '';

                    if (msgSenha) {
                        msgSenha.textContent = "✅ Senha alterada com sucesso!";
                        msgSenha.className = "text-xs font-bold text-green-600 text-center block";
                        msgSenha.classList.remove('hidden');
                        setTimeout(() => msgSenha.classList.add('hidden'), 3500);
                    }
                } catch (err) {
                    if (msgSenha) {
                        msgSenha.textContent = "Erro ao alterar senha: " + err.message;
                        msgSenha.className = "text-xs font-bold text-red-600 text-center block";
                        msgSenha.classList.remove('hidden');
                    }
                } finally {
                    btnSalvarSenha.disabled = false;
                    btnSalvarSenha.innerHTML = 'Atualizar Senha';
                }
            });
        }

        // Busca e Envio de Convite para Familiar
        const inputBuscaFam = document.getElementById('buscaFamiliarPerfil');
        const boxResultadoFam = document.getElementById('resultadoBuscaFamiliarPerfil');

        if (inputBuscaFam) {
            inputBuscaFam.addEventListener('input', async (e) => {
                const termo = e.target.value.trim().toLowerCase();
                if (!termo || termo.length < 2) {
                    if (boxResultadoFam) boxResultadoFam.classList.add('hidden');
                    return;
                }

                const { data: medEncontrados } = await supabaseClient.from('mediuns')
                    .select('id, nome_completo, grau')
                    .eq('terreiro_id', idTerreiroGlobal)
                    .neq('id', perfilMediumLogado.id)
                    .neq('status_ativo', false)
                    .neq('nome_completo', 'Administrador Sistema')
                    .ilike('nome_completo', `%${termo}%`)
                    .limit(5);

                if (!boxResultadoFam) return;
                boxResultadoFam.innerHTML = '';

                if (medEncontrados && medEncontrados.length > 0) {
                    boxResultadoFam.classList.remove('hidden');
                    medEncontrados.forEach(m => {
                        const li = document.createElement('li');
                        li.className = "p-2.5 hover:bg-gray-50 cursor-pointer flex justify-between items-center text-xs";
                        li.innerHTML = `<span><strong>${m.nome_completo}</strong> <span class="text-gray-400">(${m.grau || '-'})</span></span> <button class="text-blue-600 font-bold hover:underline"><i class="fas fa-paper-plane mr-1"></i> Convidar</button>`;
                        
                        li.addEventListener('click', async () => {
                            await enviarPedidoVinculo(m.id, m.nome_completo);
                            inputBuscaFam.value = '';
                            boxResultadoFam.classList.add('hidden');
                        });
                        boxResultadoFam.appendChild(li);
                    });
                } else {
                    boxResultadoFam.innerHTML = '<li class="p-2 text-center text-gray-400 text-xs">Nenhum médium encontrado.</li>';
                    boxResultadoFam.classList.remove('hidden');
                }
            });
        }
    }

    // ====================================================================
    // GERENCIAMENTO DE VÍNCULOS FAMILIARES (LEITURA / ACEITAÇÃO / REMOÇÃO)
    // ====================================================================
    async function carregarVinculosFamiliares() {
        if (!perfilMediumLogado) return;

        try {
            // Busca vínculos onde sou solicitante ou convidado
            const { data: vinculos, error } = await supabaseClient
                .from('vinculos_familiares')
                .select('*')
                .or(`solicitante_id.eq.${perfilMediumLogado.id},familiar_id.eq.${perfilMediumLogado.id}`);

            if (error) throw error;

            // Busca os dados cadastrais dos envolvidos
            const idsEnvolvidos = new Set();
            (vinculos || []).forEach(v => {
                idsEnvolvidos.add(v.solicitante_id);
                idsEnvolvidos.add(v.familiar_id);
            });
            idsEnvolvidos.delete(perfilMediumLogado.id);

            let mapaNomes = {};
            if (idsEnvolvidos.size > 0) {
                const { data: dadosMed } = await supabaseClient
                    .from('mediuns')
                    .select('id, nome_completo, grau, status_ativo')
                    .in('id', Array.from(idsEnvolvidos));
                
                if (dadosMed) {
                    dadosMed.forEach(m => {
                        // Só mapeia se o médium estiver ativo
                        if (m.status_ativo !== false) {
                            mapaNomes[m.id] = m;
                        }
                    });
                }
            }

            const pedidosRecebidos = [];
            const pedidosEnviados = [];
            const aprovados = [];

            (vinculos || []).forEach(v => {
                const souSolicitante = v.solicitante_id === perfilMediumLogado.id;
                const outroId = souSolicitante ? v.familiar_id : v.solicitante_id;
                const outroMedium = mapaNomes[outroId];

                // Ignora se o familiar tiver sido inativado ou não existir
                if (!outroMedium) return;

                if (v.status === 'pendente') {
                    if (souSolicitante) {
                        pedidosEnviados.push({ vinculoId: v.id, ...outroMedium });
                    } else {
                        pedidosRecebidos.push({ vinculoId: v.id, ...outroMedium });
                    }
                } else if (v.status === 'aprovado') {
                    aprovados.push({ vinculoId: v.id, ...outroMedium });
                }
            });

            familiaresAprovadosCache = aprovados;

            // 1. Atualiza Badges de Notificação
            const badgePerfil = document.getElementById('badgeNotificacaoPerfil');
            const badgeAba = document.getElementById('badgeAbaFamilia');
            if (pedidosRecebidos.length > 0) {
                if (badgePerfil) {
                    badgePerfil.textContent = pedidosRecebidos.length;
                    badgePerfil.classList.remove('hidden');
                }
                if (badgeAba) badgeAba.classList.remove('hidden');
            } else {
                if (badgePerfil) badgePerfil.classList.add('hidden');
                if (badgeAba) badgeAba.classList.add('hidden');
            }

            // 2. Renderiza Convites Recebidos
            const boxRecebidos = document.getElementById('boxConvitesRecebidos');
            const listaRecebidos = document.getElementById('listaConvitesRecebidos');
            if (boxRecebidos && listaRecebidos) {
                if (pedidosRecebidos.length > 0) {
                    boxRecebidos.classList.remove('hidden');
                    listaRecebidos.innerHTML = pedidosRecebidos.map(p => `
                        <li class="flex justify-between items-center bg-white p-2.5 rounded-lg border border-amber-200 text-xs shadow-sm">
                            <div>
                                <p class="font-bold text-gray-800">${p.nome_completo}</p>
                                <span class="text-[10px] text-gray-500">Deseja vincular como seu familiar</span>
                            </div>
                            <div class="flex gap-1.5">
                                <button onclick="responderVinculo(${p.vinculoId}, 'aprovado')" class="bg-green-600 hover:bg-green-700 text-white font-bold px-2.5 py-1 rounded-lg text-xs active:scale-95 transition">Aceitar</button>
                                <button onclick="responderVinculo(${p.vinculoId}, 'rejeitado')" class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-2 py-1 rounded-lg text-xs active:scale-95 transition">Recusar</button>
                            </div>
                        </li>
                    `).join('');
                } else {
                    boxRecebidos.classList.add('hidden');
                    listaRecebidos.innerHTML = '';
                }
            }

            // 3. Renderiza Familiares Aprovados
            const listaAprovados = document.getElementById('listaFamiliaresAprovados');
            if (listaAprovados) {
                if (aprovados.length > 0) {
                    listaAprovados.innerHTML = aprovados.map(a => `
                        <li class="flex justify-between items-center py-2 px-1 text-xs">
                            <div>
                                <p class="font-bold text-gray-800">${a.nome_completo}</p>
                                <span class="text-[10px] text-gray-400 uppercase">Grau: ${a.grau || '-'}</span>
                            </div>
                            <button onclick="removerVinculo(${a.vinculoId}, '${a.nome_completo.replace(/'/g, "\\'")}')" class="text-red-500 hover:text-red-700 text-xs font-bold" title="Remover Vínculo">
                                <i class="fas fa-trash"></i> Desvincular
                            </button>
                        </li>
                    `).join('');
                } else {
                    listaAprovados.innerHTML = '<li class="text-xs text-gray-400 text-center py-2">Nenhum familiar vinculado.</li>';
                }
            }

            // 4. Renderiza Convites Enviados
            const boxEnviados = document.getElementById('boxConvitesEnviados');
            const listaEnviados = document.getElementById('listaConvitesEnviados');
            if (boxEnviados && listaEnviados) {
                if (pedidosEnviados.length > 0) {
                    boxEnviados.classList.remove('hidden');
                    listaEnviados.innerHTML = pedidosEnviados.map(e => `
                        <li class="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100">
                            <span class="text-gray-700">${e.nome_completo}</span>
                            <span class="text-[10px] text-amber-600 font-bold"><i class="fas fa-clock"></i> Pendente</span>
                        </li>
                    `).join('');
                } else {
                    boxEnviados.classList.add('hidden');
                }
            }

        } catch (err) {
            console.error('Erro ao ler vínculos familiares:', err);
        }
    }

    async function enviarPedidoVinculo(familiarId, familiarNome) {
        try {
            const { error } = await supabaseClient.from('vinculos_familiares').insert([{
                terreiro_id: idTerreiroGlobal,
                solicitante_id: perfilMediumLogado.id,
                familiar_id: familiarId,
                status: 'pendente'
            }]);

            if (error) {
                if (error.message.includes('unique constraint') || error.message.includes('vinculo_unico')) {
                    return alert(`Já existe um pedido de vínculo em andamento ou ativo com ${familiarNome}.`);
                }
                throw error;
            }

            alert(`✅ Convite de vínculo enviado com sucesso para ${familiarNome}!`);
            await carregarVinculosFamiliares();
        } catch (err) {
            alert("Erro ao enviar convite: " + err.message);
        }
    }

    window.responderVinculo = async (vinculoId, novoStatus) => {
        try {
            if (novoStatus === 'rejeitado') {
                await supabaseClient.from('vinculos_familiares').delete().eq('id', vinculoId);
            } else {
                await supabaseClient.from('vinculos_familiares').update({ status: 'aprovado' }).eq('id', vinculoId);
            }
            await carregarVinculosFamiliares();
        } catch (err) {
            alert("Erro ao responder: " + err.message);
        }
    };

    window.removerVinculo = async (vinculoId, nomeFamiliar) => {
        if (!confirm(`Deseja desvincular ${nomeFamiliar} do seu núcleo familiar?`)) return;
        try {
            await supabaseClient.from('vinculos_familiares').delete().eq('id', vinculoId);
            await carregarVinculosFamiliares();
        } catch (err) {
            alert("Erro ao remover: " + err.message);
        }
    };

    // ====================================================================
    // CAMPANHAS, CANTINA E RIFAS (Ex-DOAÇÕES)
    // ====================================================================
    window.todosItensDoacaoCache = [];
    let abaCampanhaAtiva = 'doacao';
    let carrinhoDoacoes = {};

    async function carregarItensDoacao() {
        try {
            const { data: itens, error } = await supabaseClient
                .from('itens_doacao')
                .select('*')
                .eq('terreiro_id', idTerreiroGlobal)
                .eq('ativo', true)
                .order('nome', { ascending: true }); 

            if (error) throw error;
            window.todosItensDoacaoCache = itens || [];
            renderizarItensAba('doacao');
        } catch (err) {
            console.error('Erro ao carregar itens:', err);
            const listaItensDoacao = document.getElementById('listaItensDoacao');
            if(listaItensDoacao) listaItensDoacao.innerHTML = '<p class="text-center text-red-500 text-xs py-4">Erro ao carregar itens.</p>';
        }
    }

    function renderizarItensAba(aba) {
        const listaItensDoacao = document.getElementById('listaItensDoacao');
        if (!listaItensDoacao) return;

        const itensFiltrados = window.todosItensDoacaoCache.filter(item => {
            const cat = (item.categoria || '').toLowerCase().trim();
            // Qualquer coisa que NÃO seja cantina vai para a aba Terreiro
            if (aba === 'doacao') return cat !== 'cantina';
            // Apenas itens da cantina vão para a aba Cantina
            if (aba === 'cantina') return cat === 'cantina';
            return false;
        });

        if (itensFiltrados.length === 0) {
            listaItensDoacao.innerHTML = '<p class="text-center text-gray-400 text-xs py-6">Nenhum item disponível nesta categoria.</p>';
            return;
        }

        let html = '';
        itensFiltrados.forEach(item => {
            const valorParsed = parseFloat(item.valor_sugerido);
            const valSugerido = !isNaN(valorParsed) && valorParsed > 0 
                ? `<span class="text-green-600 font-bold text-[10px] bg-green-50 border border-green-100 px-1.5 py-0.5 rounded">R$ ${valorParsed.toFixed(2)}</span>` 
                : '';
            
            const qtdCarrinho = carrinhoDoacoes[item.id] || 0;

            html += `
            <div class="flex justify-between items-center py-3 border-b border-gray-100 last:border-0 px-1">
                <div class="flex-1 pr-2">
                    <div class="flex items-center gap-2 mb-0.5">
                        <p class="text-sm font-bold text-gray-800 leading-tight">${item.nome}</p>
                        ${valSugerido}
                    </div>
                    ${item.descricao ? `<p class="text-[10px] text-gray-500 mt-0.5 leading-snug">${item.descricao}</p>` : ''}
                </div>
                <div class="flex items-center space-x-2 bg-gray-50 rounded-xl p-1 shrink-0 border border-gray-200">
                    <button type="button" class="btn-qtd w-8 h-8 rounded-lg bg-white text-red-500 font-black shadow-sm flex items-center justify-center border border-gray-200 active:scale-90 transition hover:bg-red-50" data-id="${item.id}" data-delta="-1">
                        <i class="fas fa-minus text-xs pointer-events-none"></i>
                    </button>
                    <span class="w-5 text-center text-sm font-bold text-gray-800" id="qtd-item-${item.id}">${qtdCarrinho}</span>
                    <button type="button" class="btn-qtd w-8 h-8 rounded-lg bg-white text-green-600 font-black shadow-sm flex items-center justify-center border border-gray-200 active:scale-90 transition hover:bg-green-50" data-id="${item.id}" data-delta="1">
                        <i class="fas fa-plus text-xs pointer-events-none"></i>
                    </button>
                </div>
            </div>`;
        });

        listaItensDoacao.innerHTML = html;
    }

    const tabDoacaoGeral = document.getElementById('tabDoacaoGeral');
    const tabDoacaoCantina = document.getElementById('tabDoacaoCantina');
    const tabDoacaoRifas = document.getElementById('tabDoacaoRifas');
    const secAbasDoacaoCantina = document.getElementById('conteudoAbasDoacaoCantina');
    const secAbaRifas = document.getElementById('conteudoAbaRifas');
    const rodapeDoacao = document.getElementById('rodapeDoacao');
    const lblPixDoacao = document.getElementById('lblPixDoacao');
    const qtdTotalDoacao = document.getElementById('qtdTotalDoacao');
    const btnConfirmarDoacao = document.getElementById('btnConfirmarDoacao');
    const listaItensDoacao = document.getElementById('listaItensDoacao');
    const chavePix = document.getElementById('chavePix');

    window.alternarAbaCampanhaApp = (aba) => {
        abaCampanhaAtiva = aba;
        carrinhoDoacoes = {}; 
        if(qtdTotalDoacao) qtdTotalDoacao.textContent = '0';
        if(btnConfirmarDoacao) { btnConfirmarDoacao.classList.add('hidden'); btnConfirmarDoacao.classList.remove('flex'); }

        const baseClasses = "relative py-2.5 px-1 rounded-xl transition-all duration-300 transform hover:-translate-y-1 active:scale-95 flex flex-col items-center justify-center gap-1 w-full text-[11px] md:text-sm";

        [tabDoacaoGeral, tabDoacaoCantina, tabDoacaoRifas].forEach(t => {
            if(t) { 
                t.className = baseClasses + " font-bold shadow-sm bg-white text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-300";
                const icone = t.querySelector('i');
                if (icone) icone.classList.add('opacity-70');
            }
        });

        if (aba === 'rifas') {
            if(tabDoacaoRifas) { 
                tabDoacaoRifas.className = baseClasses + " font-black shadow-md bg-tema-primaria text-white border-b-4 border-black/20";
                const icone = tabDoacaoRifas.querySelector('i');
                if (icone) icone.classList.remove('opacity-70');
            }
            if(secAbasDoacaoCantina) { secAbasDoacaoCantina.classList.add('hidden'); secAbasDoacaoCantina.classList.remove('flex'); }
            if(secAbaRifas) { secAbaRifas.classList.remove('hidden'); secAbaRifas.classList.add('flex'); }
            if(rodapeDoacao) rodapeDoacao.classList.add('hidden');
        } else {
            if(secAbasDoacaoCantina) { secAbasDoacaoCantina.classList.remove('hidden'); secAbasDoacaoCantina.classList.add('flex'); }
            if(secAbaRifas) { secAbaRifas.classList.add('hidden'); secAbaRifas.classList.remove('flex'); }
            if(rodapeDoacao) rodapeDoacao.classList.remove('hidden');
            
            if (aba === 'doacao') {
                if(tabDoacaoGeral) { 
                    tabDoacaoGeral.className = baseClasses + " font-black shadow-md bg-tema-primaria text-white border-b-4 border-black/20";
                    const icone = tabDoacaoGeral.querySelector('i');
                    if (icone) icone.classList.remove('opacity-70');
                }
                if(lblPixDoacao) lblPixDoacao.textContent = 'Chave PIX (Doações)';
                if(chavePix && terreiroConfigMensalidade) chavePix.textContent = terreiroConfigMensalidade.chave_pix_manual || 'Não configurada';
            } else if (aba === 'cantina') {
                if(tabDoacaoCantina) { 
                    tabDoacaoCantina.className = baseClasses + " font-black shadow-md bg-tema-primaria text-white border-b-4 border-black/20";
                    const icone = tabDoacaoCantina.querySelector('i');
                    if (icone) icone.classList.remove('opacity-70');
                }
                if(lblPixDoacao) lblPixDoacao.textContent = 'Chave PIX (Cantina)';
                if(chavePix && terreiroConfigMensalidade) chavePix.textContent = terreiroConfigMensalidade.cantina_chave_pix || 'Não configurada';
            }
            renderizarItensAba(aba);
        }
    };

    if(tabDoacaoGeral) tabDoacaoGeral.addEventListener('click', () => alternarAbaCampanhaApp('doacao'));
    if(tabDoacaoCantina) tabDoacaoCantina.addEventListener('click', () => alternarAbaCampanhaApp('cantina'));
    if(tabDoacaoRifas) tabDoacaoRifas.addEventListener('click', () => alternarAbaCampanhaApp('rifas'));

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
            
            let totalItens = 0;
            for (let id in carrinhoDoacoes) totalItens += carrinhoDoacoes[id];
            
            if (totalItens > 0) {
                if(qtdTotalDoacao) qtdTotalDoacao.textContent = totalItens;
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
            btnConfirmarDoacao.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Processando...';
            btnConfirmarDoacao.disabled = true;

            const insercoes = [];
            let totalFinanceiroCalculado = 0;

            for (let itemId in carrinhoDoacoes) {
                if (carrinhoDoacoes[itemId] > 0) {
                    const qtd = carrinhoDoacoes[itemId];
                    const itemDb = window.todosItensDoacaoCache.find(i => String(i.id) === String(itemId));
                    const preco = itemDb && itemDb.valor_sugerido ? parseFloat(itemDb.valor_sugerido) : 0;
                    
                    const subtotal = preco * qtd;
                    totalFinanceiroCalculado += subtotal;

                    insercoes.push({
                        terreiro_id: idTerreiroGlobal,
                        medium_auth_id: session.user.id,
                        item_id: parseInt(itemId),
                        quantidade: qtd,
                        valor_total: subtotal,
                        metodo_pagamento: 'pix_direto',
                        status_pagamento: 'pendente'
                    });
                }
            }

            try {
                // Insere os registros de doação detalhados
                const { error } = await supabaseClient.from('doacoes_registradas').insert(insercoes);
                if (error) throw error;

                // Lança no Caixa Central (Unificado)
                if (totalFinanceiroCalculado > 0) {
                    const tipoCaixa = abaCampanhaAtiva === 'cantina' ? 'CANTINA' : 'DOACAO';
                    const descCaixa = abaCampanhaAtiva === 'cantina' ? 'Compra na Cantina (App)' : 'Doação ao Terreiro (App)';

                    await supabaseClient.from('caixa_terreiro').insert([{
                        terreiro_id: idTerreiroGlobal,
                        tipo_transacao: tipoCaixa,
                        descricao: descCaixa,
                        valor: totalFinanceiroCalculado,
                        metodo_pagamento: 'pix_direto',
                        pagador_nome: perfilMediumLogado.nome_completo,
                        status: 'pendente', // Pendente até a tesouraria visualizar no painel que caiu o PIX
                        medium_responsavel_id: perfilMediumLogado.id
                    }]);
                }

                btnConfirmarDoacao.innerHTML = '<i class="fas fa-check mr-2"></i> Pedido Registrado!';
                btnConfirmarDoacao.classList.replace('bg-green-600', 'bg-blue-600');
                
                setTimeout(() => {
                    alert('Pedido registrado! Lembre-se de transferir o valor para a chave PIX exibida na tela.');
                    const btnFecharDoacao = document.getElementById('btnFecharDoacao');
                    if(btnFecharDoacao) btnFecharDoacao.click();
                    carrinhoDoacoes = {};
                    if(btnConfirmarDoacao) {
                        btnConfirmarDoacao.classList.add('hidden');
                        btnConfirmarDoacao.classList.remove('flex');
                    }
                    renderizarItensAba(abaCampanhaAtiva); 
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

    const modalDoacao = document.getElementById('modalDoacao');
    const btnAbrirDoacao = document.getElementById('btnAbrirDoacao');
    const btnAbrirDoacaoSucesso = document.getElementById('btnAbrirDoacaoSucesso');
    const btnFecharDoacao = document.getElementById('btnFecharDoacao');
    const btnCopiarPix = document.getElementById('btnCopiarPix');

    const abrirModalDoacaoApp = () => {
        if(modalDoacao) {
            alternarAbaCampanhaApp('doacao'); // Reseta a aba sempre pra Doação geral ao abrir
            modalDoacao.classList.remove('hidden');
            setTimeout(() => {
                modalDoacao.querySelector('div').classList.remove('scale-95');
                modalDoacao.querySelector('div').classList.add('scale-100');
            }, 10);
        }
    };

    if(btnAbrirDoacao) btnAbrirDoacao.addEventListener('click', abrirModalDoacaoApp);
    if(btnAbrirDoacaoSucesso) btnAbrirDoacaoSucesso.addEventListener('click', abrirModalDoacaoApp);

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
    // LÓGICA DO MÓDULO DE MENSALIDADES (RESTRITA AO NÚCLEO FAMILIAR)
    // ====================================================================
    const modalMensalidade = document.getElementById('modalMensalidade');
    const selectAnoMensalidade = document.getElementById('selectAnoMensalidade');
    const containerCarrinhoMensalidades = document.getElementById('containerCarrinhoMensalidades');
    const btnAdicionarOutroMedium = document.getElementById('btnAdicionarOutroMedium');
    const boxBuscaOutroMedium = document.getElementById('boxBuscaOutroMedium');
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
        if (!modalMensalidade) {
            alert("Erro estrutural: O modal de mensalidade não foi encontrado no HTML.");
            return;
        }
        
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
            const painelModal = modalMensalidade.querySelector('div');
            if (painelModal) {
                painelModal.classList.remove('scale-95');
                painelModal.classList.add('scale-100');
            }
        }, 10);
    }

    document.addEventListener('click', (e) => {
        const alvoBtn = e.target.closest('#btnAbrirMensalidade, #btnAbrirMensalidadeSucesso');
        if (alvoBtn) {
            e.preventDefault();
            abrirModalMensalidade();
        }
        
        if (e.target.closest('#btnFecharMensalidadeSuperior')) {
            fecharModalMensalidade();
        }
    });

    const fecharModalMensalidade = () => {
        if (!modalMensalidade) return;
        const painelModal = modalMensalidade.querySelector('div');
        if (painelModal) {
            painelModal.classList.remove('scale-100');
            painelModal.classList.add('scale-95');
        }
        setTimeout(() => {
            modalMensalidade.classList.add('hidden');
        }, 200);
    };

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

    function recalcularTotalCarrinho() {
        let totalGeral = 0;
        let totalMesesSelecionados = 0;

        carrinhoMensalidadesState.forEach(item => {
            const qtd = item.mesesSelecionados ? item.mesesSelecionados.length : 0;
            totalMesesSelecionados += qtd;
            totalGeral += qtd * item.valorUnitario;
        });

        if (totalMesesSelecionados > 0) {
            if (terreiroConfigMensalidade && terreiroConfigMensalidade.gateway_pagamento === 'asaas') {
                const TARIFA_BANCARIA = 2.99;
                const totalComTaxa = totalGeral + TARIFA_BANCARIA;

                valorPendenteParaPix = totalGeral;

                if (valorTotalMensalidade) valorTotalMensalidade.textContent = totalComTaxa.toFixed(2).replace('.', ',');

                if (boxPagamentoManual) boxPagamentoManual.classList.add('hidden');
                if (btnFinalizarMensalidade) {
                    btnFinalizarMensalidade.disabled = false;
                    btnFinalizarMensalidade.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-tema-secundaria', 'hover:bg-green-700');
                    btnFinalizarMensalidade.classList.add('bg-blue-600', 'hover:bg-blue-700');
                    btnFinalizarMensalidade.innerHTML = `<i class="fas fa-bolt mr-2"></i> Pagar R$ ${totalGeral.toFixed(2).replace('.', ',')} (+ 2,99) = R$ ${totalComTaxa.toFixed(2).replace('.', ',')}`;
                }
            } else {
                valorPendenteParaPix = totalGeral;
                if (valorTotalMensalidade) valorTotalMensalidade.textContent = totalGeral.toFixed(2).replace('.', ',');

                if (boxPagamentoManual) boxPagamentoManual.classList.remove('hidden');
                if (btnFinalizarMensalidade) {
                    btnFinalizarMensalidade.disabled = false;
                    btnFinalizarMensalidade.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-blue-600', 'hover:bg-blue-700');
                    btnFinalizarMensalidade.classList.add('bg-tema-secundaria', 'hover:bg-green-700');
                    btnFinalizarMensalidade.innerHTML = `<i class="fas fa-check-circle mr-2"></i> Enviar Comprovante (R$ ${totalGeral.toFixed(2).replace('.', ',')})`;
                }
            }
        } else {
            valorPendenteParaPix = 0;
            if (valorTotalMensalidade) valorTotalMensalidade.textContent = "0,00";

            if (boxPagamentoManual) boxPagamentoManual.classList.add('hidden');
            if (btnFinalizarMensalidade) {
                btnFinalizarMensalidade.disabled = true;
                btnFinalizarMensalidade.classList.add('opacity-50', 'cursor-not-allowed');
                btnFinalizarMensalidade.classList.remove('bg-blue-600', 'hover:bg-blue-700');
                btnFinalizarMensalidade.classList.add('bg-tema-secundaria', 'hover:bg-green-700');
                btnFinalizarMensalidade.innerHTML = 'Selecionar Meses';
            }
        }
    }

    // EXIBE APENAS OS FAMILIARES APROVADOS PARA ADICIONAR NO CARRINHO
    if (btnAdicionarOutroMedium && boxBuscaOutroMedium) {
        btnAdicionarOutroMedium.addEventListener('click', () => {
            boxBuscaOutroMedium.classList.toggle('hidden');
            if (!boxBuscaOutroMedium.classList.contains('hidden')) {
                renderizarOpcoesFamiliaresCarrinho();
            }
        });
    }

    function renderizarOpcoesFamiliaresCarrinho() {
        if (!resultadoBuscaOutroMedium) return;
        resultadoBuscaOutroMedium.innerHTML = '';

        // Filtra familiares que ainda não estão no carrinho
        const disponiveis = familiaresAprovadosCache.filter(fam => {
            return !carrinhoMensalidadesState.some(c => c.mediumId === fam.id);
        });

        if (disponiveis.length === 0) {
            resultadoBuscaOutroMedium.innerHTML = `
                <li class="p-3 text-center text-gray-500 text-xs">
                    ${familiaresAprovadosCache.length === 0 ? 'Você ainda não possui familiares vinculados.' : 'Todos os seus familiares já foram adicionados ao carrinho.'}
                </li>
            `;
            return;
        }

        disponiveis.forEach(fam => {
            const li = document.createElement('li');
            li.className = "p-2.5 hover:bg-gray-50 cursor-pointer flex justify-between items-center text-xs";
            li.innerHTML = `<span><strong>${fam.nome_completo}</strong> <span class="text-gray-400">(${fam.grau || '-'})</span></span> <span class="text-tema-secundaria font-bold"><i class="fas fa-plus"></i> Adicionar</span>`;
            
            li.addEventListener('click', async () => {
                const valorGrau = configValoresGrau[fam.grau] || 0.00;
                carrinhoMensalidadesState.push({
                    mediumId: fam.id,
                    mediumNome: fam.nome_completo,
                    grau: fam.grau || '-',
                    valorUnitario: valorGrau,
                    mesesPagosNoAno: [],
                    mesesSelecionados: []
                });
                boxBuscaOutroMedium.classList.add('hidden');
                await atualizarCarrinhoRender();
            });

            resultadoBuscaOutroMedium.appendChild(li);
        });
    }

    // FUNÇÃO QUE GERA O CÓDIGO BRCODE (EMV) DO PIX COPIA E COLA
    function gerarPayloadPix(chavePix, valorTotal, nomeBeneficiario = 'Terreiro', cidade = 'Rio de Janeiro') {
        const formatarTamanho = (id, valor) => {
            const v = String(valor);
            return id + String(v.length).padStart(2, '0') + v;
        };

        const chave = String(chavePix).trim().replace(/ /g, '');
        const valor = Number(valorTotal).toFixed(2);
        const merchantAccount = formatarTamanho('00', 'br.gov.bcb.pix') + formatarTamanho('01', chave);
        
        let payload = formatarTamanho('00', '01') + 
                      formatarTamanho('26', merchantAccount) + 
                      formatarTamanho('52', '0000') + 
                      formatarTamanho('53', '986') + 
                      formatarTamanho('54', valor) + 
                      formatarTamanho('58', 'BR') + 
                      formatarTamanho('59', nomeBeneficiario.substring(0, 25)) + 
                      formatarTamanho('60', cidade.substring(0, 15)) + 
                      formatarTamanho('62', formatarTamanho('05', 'MENSALIDADE')); 
        payload += '6304'; 

        let crc = 0xFFFF;
        for (let i = 0; i < payload.length; i++) {
            crc ^= payload.charCodeAt(i) << 8;
            for (let j = 0; j < 8; j++) {
                if ((crc & 0x8000) !== 0) {
                    crc = (crc << 1) ^ 0x1021;
                } else {
                    crc = crc << 1;
                }
            }
        }
        crc = (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
        return payload + crc;
    }

    if (btnCopiarPixMensalidade) {
        btnCopiarPixMensalidade.addEventListener('click', () => {
            const chave = terreiroConfigMensalidade.chave_pix_manual;
            
            if (!chave) {
                alert("A chave PIX do terreiro não está configurada.");
                return;
            }

            const nomeTerreiroPix = terreiroConfigMensalidade.nome || 'Terreiro';
            const codigoCopiaECola = gerarPayloadPix(chave, valorPendenteParaPix, nomeTerreiroPix);

            navigator.clipboard.writeText(codigoCopiaECola).then(() => {
                const originalHTML = btnCopiarPixMensalidade.innerHTML;
                btnCopiarPixMensalidade.innerHTML = '<i class="fas fa-check mr-2 text-white"></i> PIX Copiado c/ Valor!';
                btnCopiarPixMensalidade.classList.replace('bg-gray-800', 'bg-green-600');
                setTimeout(() => {
                    btnCopiarPixMensalidade.innerHTML = originalHTML;
                    btnCopiarPixMensalidade.classList.replace('bg-green-600', 'bg-gray-800');
                }, 2500);
            });
        });
    }

    if (btnFinalizarMensalidade) {
        btnFinalizarMensalidade.addEventListener('click', async () => {
            
            if (terreiroConfigMensalidade && terreiroConfigMensalidade.gateway_pagamento === 'asaas') {
                iniciarCheckoutAsaas(valorPendenteParaPix, carrinhoMensalidadesState);
                return;
            }

            if (!arquivoComprovanteMensalidade || arquivoComprovanteMensalidade.files.length === 0) {
                if (msgErroMensalidade) {
                    msgErroMensalidade.textContent = "Por favor, anexe a foto ou PDF do comprovante do PIX antes de enviar.";
                    msgErroMensalidade.classList.remove('hidden');
                }
                return;
            }

            const originalBtnText = btnFinalizarMensalidade.innerHTML;
            btnFinalizarMensalidade.disabled = true;
            btnFinalizarMensalidade.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Enviando comprovante...';
            if (msgErroMensalidade) msgErroMensalidade.classList.add('hidden');

            try {
                const arquivo = arquivoComprovanteMensalidade.files[0];
                const anoRef = parseInt(selectAnoMensalidade.value);

                const fileName = `${idTerreiroGlobal}/comprovante_${perfilMediumLogado.id}_${Date.now()}.${arquivo.name.split('.').pop()}`;
                const { error: errUpload } = await supabaseClient.storage.from('comprovantes').upload(fileName, arquivo);
                if (errUpload) throw errUpload;

                const { data: { publicUrl } } = supabaseClient.storage.from('comprovantes').getPublicUrl(fileName);

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

                alert("✅ Comprovante enviado com sucesso para a Tesouraria! A administração fará a validação em breve.");
                fecharModalMensalidade();
                verificarPendenciaMensalidade(perfilMediumLogado.id);

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
// FLUXO DE PAGAMENTO AUTOMÁTICO (ASAAS) COM CAPTURA DE CPF
// ====================================================================
const modalSolicitarCPF = document.getElementById('modalSolicitarCPF');
const formSalvarCPF = document.getElementById('formSalvarCPF');
const inputCpfAsaas = document.getElementById('inputCpfAsaas');
const btnSalvarCpfAsaas = document.getElementById('btnSalvarCpfAsaas');

async function iniciarCheckoutAsaas(valorTotal, mesesArray) {
    if (!perfilMediumLogado.cpf || perfilMediumLogado.cpf.trim() === '') {
        if (modalSolicitarCPF) {
            modalSolicitarCPF.classList.remove('hidden');
            setTimeout(() => modalSolicitarCPF.querySelector('div').classList.replace('scale-95', 'scale-100'), 10);
            
            if (formSalvarCPF) {
                formSalvarCPF.onsubmit = async (e) => {
                    e.preventDefault();
                    const cpfDigitado = inputCpfAsaas.value.replace(/\D/g, '');
                    if (cpfDigitado.length !== 11) return alert("CPF inválido.");
                    
                    if (btnSalvarCpfAsaas) {
                        btnSalvarCpfAsaas.disabled = true;
                        btnSalvarCpfAsaas.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
                    }
                    
                    const { error } = await supabaseClient.from('mediuns').update({ cpf: cpfDigitado }).eq('id', perfilMediumLogado.id);
                    if (error) {
                        alert("Erro ao salvar CPF: " + error.message);
                        if (btnSalvarCpfAsaas) {
                            btnSalvarCpfAsaas.disabled = false;
                            btnSalvarCpfAsaas.innerHTML = '<i class="fas fa-check"></i> Salvar e Gerar Pagamento';
                        }
                        return;
                    }
                    
                    perfilMediumLogado.cpf = cpfDigitado;
                    modalSolicitarCPF.classList.add('hidden');
                    if (btnSalvarCpfAsaas) btnSalvarCpfAsaas.disabled = false;
                    
                    chamarEdgeFunctionAsaas(valorTotal, mesesArray);
                };
            }
        }
    } else {
        chamarEdgeFunctionAsaas(valorTotal, mesesArray);
    }
}

async function chamarEdgeFunctionAsaas(valorTotal, carrinhoArray) {
    const btnOriginal = document.getElementById('btnFinalizarMensalidade');
    const valorComTaxa = valorTotal + 2.99;
    
    if (btnOriginal) {
        btnOriginal.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> A Gerar Link Seguro...';
        btnOriginal.disabled = true;
    }
    
    try {
        const selectAno = document.getElementById('selectAnoMensalidade');
        const anoRef = selectAno ? parseInt(selectAno.value) : new Date().getFullYear();

        const detalhesArray = [];
        carrinhoArray.forEach(item => {
            if (item.mesesSelecionados && item.mesesSelecionados.length > 0) {
                const subtotalItem = item.mesesSelecionados.length * item.valorUnitario;
                detalhesArray.push({
                    medium_id: item.mediumId,
                    medium_nome: item.mediumNome,
                    ano: anoRef,
                    meses: item.mesesSelecionados,
                    subtotal: subtotalItem
                });
            }
        });

        if (detalhesArray.length === 0) {
            throw new Error("Nenhum mês selecionado no carrinho.");
        }

        const { data, error } = await supabaseClient.functions.invoke('asaas-gerar-cobranca', {
            body: {
                mediumId: perfilMediumLogado.id,
                terreiroId: idTerreiroGlobal,
                valorTotal: valorComTaxa,
                valorMensalidades: valorTotal,
                taxaBancaria: 2.99,
                detalhesPagamento: detalhesArray
            }
        });

        if (error) throw error;

        if (data && data.invoiceUrl) {
            window.open(data.invoiceUrl, '_blank');
            const modalM = document.getElementById('modalMensalidade');
            if (modalM) modalM.classList.add('hidden');
        } else {
            throw new Error("O servidor não retornou o link de pagamento.");
        }

    } catch (err) {
        console.error("Erro no pagamento Asaas:", err);
        alert("Erro ao gerar link de pagamento: " + (err.message || err));
    } finally {
        if (btnOriginal) {
            btnOriginal.innerHTML = `<i class="fas fa-bolt mr-2"></i> Pagar R$ ${valorTotal.toFixed(2).replace('.', ',')} (+ 2,99) = R$ ${valorComTaxa.toFixed(2).replace('.', ',')}`;
            btnOriginal.disabled = false;
        }
    }
}

// ====================================================================
// GPS DO CHECK-IN COM VERIFICAÇÃO DE PERMISSÃO E TRAVA DE 30 METROS
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
    btnCheckin.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validando GPS...';
    
    if (msg) msg.classList.add('hidden');
    if (modalPermissaoGPS) modalPermissaoGPS.classList.add('hidden');

    navigator.geolocation.getCurrentPosition(async (posicao) => {
        const latUsuario = posicao.coords.latitude, lonUsuario = posicao.coords.longitude;
        const distanciaMetros = calcularDistancia(latUsuario, lonUsuario, coordsTerreiro.lat, coordsTerreiro.lng);
        
        if (distanciaMetros > 30) {
            if (msg) { msg.innerHTML = `Você está muito longe do terreiro.<br>Distância atual: ${Math.round(distanciaMetros)} metros. (Máximo: 30m)`; msg.className = "mt-3 text-sm font-bold text-red-500 block"; msg.classList.remove('hidden'); }
            restaurarBotao(btnCheckin); return;
        }

        const { data: { session } } = await supabaseClient.auth.getSession();
        btnCheckin.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';

        const { error } = await supabaseClient.from('presencas').insert([{ 
            evento_id: idGiraGlobal, 
            usuario_id: session.user.id, 
            data_hora_checkin: new Date().toISOString(),
            localizacao_valida: true,
            distancia_metros: Math.round(distanciaMetros)
        }]);

        if (error) {
            if (msg) { msg.textContent = "Erro ao registrar: " + error.message; msg.className = "mt-3 text-sm font-bold text-red-500 block"; msg.classList.remove('hidden'); }
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
        if (msg) { msg.textContent = "Erro ao acessar localização. Verifique o acesso ao GPS do celular."; msg.className = "mt-3 text-sm font-bold text-red-500 block"; msg.classList.remove('hidden'); }
        restaurarBotao(btnCheckin);
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
}

if (btnCheckin) {
    btnCheckin.addEventListener('click', async () => {
        const msg = document.getElementById('msgCheckin');
        
        const agoraClick = new Date();
        if (hrInicioPermitidoGlobal && agoraClick < hrInicioPermitidoGlobal) {
            if (msg) { msg.textContent = "A gira ainda não começou. Aguarde o horário."; msg.className = "mt-3 text-sm font-bold text-red-500 block"; msg.classList.remove('hidden'); }
            return;
        }
        if (hrFimGiraGlobal && agoraClick > hrFimGiraGlobal) {
            if (msg) { msg.textContent = "Esta gira já foi encerrada."; msg.className = "mt-3 text-sm font-bold text-red-500 block"; msg.classList.remove('hidden'); }
            return;
        }

        if (!coordsTerreiro || !coordsTerreiro.lat) {
            if (msg) { msg.textContent = "O administrador ainda não configurou o GPS do terreiro."; msg.className = "mt-3 text-sm font-bold text-red-500 block"; msg.classList.remove('hidden'); }
            return;
        }

        if (!navigator.geolocation) {
            if (msg) { msg.textContent = "Seu navegador não suporta GPS."; msg.className = "mt-3 text-sm font-bold text-red-500 block"; msg.classList.remove('hidden'); }
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
        btn.innerHTML = '<i class="fas fa-map-marker-alt"></i> Confirmar Presença'; 
    } 
}

function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371e3, p1 = lat1 * Math.PI/180, p2 = lat2 * Math.PI/180, dp = (lat2-lat1) * Math.PI/180, dl = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
}

// ====================================================================
// VERIFICAÇÃO DE MENSALIDADE VENCIDA (REGRA: DIA 1) + ESTILO PISCANTE
// ====================================================================
if (!document.getElementById('styleAlertaMensalidade')) {
    const styleAlerta = document.createElement('style');
    styleAlerta.id = 'styleAlertaMensalidade';
    styleAlerta.innerHTML = `
        @keyframes pulsarAlertaMensalidade {
            0%, 100% {
                transform: scale(1);
                box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7);
            }
            50% {
                transform: scale(1.03);
                box-shadow: 0 0 14px 6px rgba(220, 38, 38, 0.6);
            }
        }
        .alerta-mensalidade-pendente {
            animation: pulsarAlertaMensalidade 1.3s infinite !important;
            background-color: #dc2626 !important;
            color: #ffffff !important;
            border-color: #b91c1c !important;
        }
    `;
    document.head.appendChild(styleAlerta);
}

async function verificarPendenciaMensalidade(mediumId) {
    try {
        const botoes = [
            document.getElementById('btnAbrirMensalidade'),
            document.getElementById('btnAbrirMensalidadeSucesso')
        ];

        // 1. Isenção: Dirigente ou Médium Isento não têm cobrança pendente
        const ehDirigente = perfilMediumLogado && (perfilMediumLogado.grau === 'Dirigente' || perfilMediumLogado.funcao === 'Dirigente');
        const estaIsento = perfilMediumLogado && (perfilMediumLogado.isento_mensalidade === true);

        if (ehDirigente || estaIsento) {
            botoes.forEach(btn => {
                if (btn) btn.classList.remove('alerta-mensalidade-pendente');
            });
            return;
        }

        const hoje = new Date();
        const anoAtual = hoje.getFullYear();
        const mesAtual = hoje.getMonth() + 1;

        // 2. Data de ingresso para não cobrar meses anteriores à entrada na Casa
        const dataIngresso = (perfilMediumLogado && perfilMediumLogado.created_at) ? new Date(perfilMediumLogado.created_at) : new Date('2000-01-01');
        const mesIngresso = dataIngresso.getMonth() + 1;
        const anoIngresso = dataIngresso.getFullYear();

        const { data: registros, error } = await supabaseClient
            .from('financeiro')
            .select('mes, pago, isento')
            .eq('medium_id', mediumId)
            .eq('ano', anoAtual);

        if (error) throw error;

        const quitadosOuIsentos = new Set();
        if (registros) {
            registros.forEach(r => {
                if (r.pago === true || r.isento === true) {
                    quitadosOuIsentos.add(r.mes);
                }
            });
        }

        let temMensalidadeVencida = false;
        for (let m = 1; m <= mesAtual; m++) {
            const isAntesDoIngresso = (anoAtual < anoIngresso) || (anoAtual === anoIngresso && m < mesIngresso);
            if (!isAntesDoIngresso && !quitadosOuIsentos.has(m)) {
                temMensalidadeVencida = true;
                break;
            }
        }

        botoes.forEach(btn => {
            if (!btn) return;
            if (temMensalidadeVencida) {
                btn.classList.add('alerta-mensalidade-pendente');
                const spanTexto = btn.querySelector('span');
                if (spanTexto) {
                    spanTexto.textContent = 'Mensalidade Pendente';
                }
            } else {
                btn.classList.remove('alerta-mensalidade-pendente');
            }
        });

    } catch (err) {
        console.error('Erro ao verificar pendência de mensalidade:', err);
    }
}
