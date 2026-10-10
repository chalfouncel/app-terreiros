let idTerreiroGlobal = null; 
let mediunsGrauCache = []; 
let perfilAdminLogado = null; 

let nomeTerreiroGlobal = "";
let logoTerreiroGlobal = "";
let mapaGlobal = null;
let marcadorGlobal = null;
let circuloGlobal = null;
let listaMediunsGlobal = []; 

// Variavel global para o modal de comprovantes
window.comprovanteAtualId = null;

// ==============================================================================
// FUNÇÃO UTILITÁRIA: COMPRESSÃO DE IMAGEM
// ==============================================================================
function comprimirImagem(file, maxWidth = 1200, maxHeight = 1200, quality = 0.82) {
    return new Promise((resolve) => {
        if (!file || !file.type || !file.type.match(/image.*/)) {
            return resolve(file);
        }

        const reader = new FileReader();
        reader.onload = (readerEvent) => {
            const image = new Image();
            image.onload = () => {
                let width = image.width;
                let height = image.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(image, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (!blob) return resolve(file);
                    const ext = file.name.split('.').pop() || 'jpg';
                    const novoArquivo = new File([blob], file.name.replace(/\.[^/.]+$/, `.${ext}`), {
                        type: file.type.includes('png') ? 'image/png' : 'image/jpeg',
                        lastModified: Date.now()
                    });
                    resolve(novoArquivo);
                }, file.type.includes('png') ? 'image/png' : 'image/jpeg', quality);
            };
            image.onerror = () => resolve(file);
            image.src = readerEvent.target.result;
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    // ESCOPO SEGURO PARA A VARIÁVEL DE CARREGAMENTO INICIAL
    let emModoMasterPuro = false;
    let terreiroSaaSForcado = null;

    try {
        const dataOpcoes = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dataStr = new Date().toLocaleDateString('pt-BR', dataOpcoes);
        const elDataHoje = document.getElementById('dataHoje');
        if (elDataHoje) elDataHoje.textContent = dataStr;
        const elDataMobile = document.getElementById('dataHojeMobile');
        if (elDataMobile) elDataMobile.textContent = dataStr;

        const sidebar = document.getElementById('sidebar');
        const overlayMobile = document.getElementById('overlayMobile');
        const btnAbrirMenu = document.getElementById('btnAbrirMenu');
        const btnFecharMenu = document.getElementById('btnFecharMenu');

        function toggleMenu() {
            if (!sidebar || !overlayMobile) return;
            const isOpen = !sidebar.classList.contains('-translate-x-full');
            if (isOpen) {
                sidebar.classList.add('-translate-x-full');
                overlayMobile.classList.add('hidden');
            } else {
                sidebar.classList.remove('-translate-x-full');
                overlayMobile.classList.remove('hidden');
            }
        }

        if(btnAbrirMenu) btnAbrirMenu.addEventListener('click', toggleMenu);
        if(btnFecharMenu) btnFecharMenu.addEventListener('click', toggleMenu);
        if(overlayMobile) overlayMobile.addEventListener('click', toggleMenu);

        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) return window.location.replace('index.html');

        const btnSair = document.getElementById('btnSair');
        if (btnSair) {
            btnSair.addEventListener('click', async () => {
                btnSair.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saindo...';
                await supabaseClient.auth.signOut(); 
                localStorage.clear(); 
                window.location.replace('index.html'); 
            });
        }

        const { data: perfil, error: erroPerfil } = await supabaseClient
            .from('mediuns')
            .select('nome_completo, is_admin, terreiro_id, perm_agenda, perm_grau, perm_financeiro, perm_doacoes, perm_admin, is_master, perm_visao_geral, perm_ata')
            .eq('auth_id', session.user.id)
            .single();

        if (erroPerfil) throw erroPerfil;
        perfilAdminLogado = perfil;

        const temAcessoPainel = perfil.is_admin || perfil.perm_visao_geral || perfil.perm_agenda || perfil.perm_grau || perfil.perm_financeiro || perfil.perm_doacoes || perfil.perm_admin || perfil.perm_ata || perfil.is_master;

        if (!temAcessoPainel) {
            alert('Acesso negado. Não possui permissão para aceder ao Painel de Gestão.');
            return window.location.replace('presenca.html');
        }
        
        if (perfil.is_master) {
            const menuMaster = document.getElementById('menuMaster');
            if (menuMaster) menuMaster.classList.remove('hidden');
            
            terreiroSaaSForcado = localStorage.getItem('terreiroAtivoSaaS');
            
            if (terreiroSaaSForcado) {
                idTerreiroGlobal = terreiroSaaSForcado;
                
                const avisoInfiltrado = document.createElement('div');
                avisoInfiltrado.className = "bg-red-600 text-white text-center py-2 px-4 font-bold text-sm shadow-md z-50 flex flex-col md:flex-row justify-center items-center gap-2 md:space-x-4 flex-shrink-0";
                avisoInfiltrado.innerHTML = `
                    <span><i class="fas fa-user-secret mr-2"></i> MODO SUPORTE: logado no painel do cliente.</span>
                    <button onclick="voltarParaMeuPainel()" class="bg-white text-red-600 px-3 py-1 rounded text-xs font-bold hover:bg-gray-100 shadow transition border border-red-200">Sair do Modo Suporte</button>
                `;
                
                const containerPrincipal = document.querySelector('.flex-1.flex-col') || document.body;
                containerPrincipal.insertBefore(avisoInfiltrado, containerPrincipal.firstChild);

                perfil.is_admin = true; perfil.perm_visao_geral = true; perfil.perm_agenda = true;
                perfil.perm_ata = true; perfil.perm_grau = true; perfil.perm_financeiro = true;
                perfil.perm_doacoes = true; perfil.perm_admin = true;
            } else {
                emModoMasterPuro = true;
                idTerreiroGlobal = null;
            }
        } else {
            idTerreiroGlobal = perfil.terreiro_id;
        }

        if (emModoMasterPuro) {
            ['menuVisaoGeral', 'menuQuadroMediuns', 'menuAgendaGiras', 'menuLivroAta', 'menuGrau', 'menuFinanceiro', 'menuComprovantes', 'menuDoacoes', 'menuAdmin'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('hidden');
            });
            document.querySelectorAll('#sidebar hr').forEach(hr => hr.classList.add('hidden'));
            const elSide = document.getElementById('nomeTerreiroSidebar');
            if (elSide) elSide.textContent = "Gestão SaaS";
        } else {
            if (!perfil.is_admin) {
                if (!perfil.perm_visao_geral && document.getElementById('menuVisaoGeral')) document.getElementById('menuVisaoGeral').classList.add('hidden');
                if (!perfil.perm_agenda && document.getElementById('menuAgendaGiras')) document.getElementById('menuAgendaGiras').classList.add('hidden');
                if (!perfil.perm_ata && document.getElementById('menuLivroAta')) document.getElementById('menuLivroAta').classList.add('hidden');
                if (!perfil.perm_grau && document.getElementById('menuGrau')) document.getElementById('menuGrau').classList.add('hidden');
                if (!perfil.perm_doacoes && document.getElementById('menuDoacoes')) document.getElementById('menuDoacoes').classList.add('hidden');
                if (!perfil.perm_admin && document.getElementById('menuAdmin')) document.getElementById('menuAdmin').classList.add('hidden');
                
                // Financeiro afeta as duas abas
                if (!perfil.perm_financeiro) {
                    if (document.getElementById('menuFinanceiro')) document.getElementById('menuFinanceiro').classList.add('hidden');
                    if (document.getElementById('menuComprovantes')) document.getElementById('menuComprovantes').classList.add('hidden');
                }
            }
        }

        const primeiroNome = perfil.nome_completo ? perfil.nome_completo.split(' ')[0] : 'Admin';
        const elNomeAdmin = document.getElementById('nomeAdmin');
        if (elNomeAdmin) elNomeAdmin.textContent = 'Olá, ' + primeiroNome;
        const nomeMobileEl = document.getElementById('nomeAdminMobile');
        if (nomeMobileEl) nomeMobileEl.textContent = primeiroNome;
        
        if (idTerreiroGlobal) {
            const { data: terreiro } = await supabaseClient
                .from('terreiros')
                .select('nome, logo_url, cor_primaria, cor_secundaria, cor_fundo, cor_texto')
                .eq('id', idTerreiroGlobal)
                .single();
            
            if (terreiro) {
                nomeTerreiroGlobal = terreiro.nome;
                logoTerreiroGlobal = terreiro.logo_url;
                const elSide = document.getElementById('nomeTerreiroSidebar');
                if (elSide) elSide.textContent = terreiro.nome;
                
                const root = document.documentElement;
                if(terreiro.cor_primaria) root.style.setProperty('--cor-primaria', terreiro.cor_primaria);
                if(terreiro.cor_secundaria) root.style.setProperty('--cor-secundaria', terreiro.cor_secundaria);
                if(terreiro.cor_fundo) root.style.setProperty('--cor-fundo', terreiro.cor_fundo);
                if(terreiro.cor_texto) root.style.setProperty('--cor-texto', terreiro.cor_texto);

                if(terreiro.logo_url) {
                    const img = document.getElementById('logoSidebar');
                    if (img) {
                        img.src = terreiro.logo_url;
                        img.classList.remove('hidden');
                    }
                }
            }
        }

        const menus = document.querySelectorAll('.menu-item');
        const secoes = document.querySelectorAll('.secao-painel');

        menus.forEach(menu => {
            menu.addEventListener('click', (e) => {
                e.preventDefault();
                menus.forEach(m => m.classList.replace('bg-white/20', 'hover:bg-white/10'));
                menu.classList.replace('hover:bg-white/10', 'bg-white/20');
                
                secoes.forEach(s => s.classList.add('hidden'));
                const titulo = document.getElementById('tituloSecao');
                const tituloMobile = document.getElementById('tituloMobile');
                
                const aplicarTitulos = (texto) => {
                    if (titulo) titulo.textContent = texto;
                    if (tituloMobile) tituloMobile.textContent = texto;
                };

                if (menu.id === 'menuVisaoGeral') {
                    document.getElementById('secVisaoGeral')?.classList.remove('hidden');
                    aplicarTitulos('Visão Geral');
                    carregarPainelInicial();
                } else if (menu.id === 'menuQuadroMediuns') {
                    document.getElementById('secQuadroMediuns')?.classList.remove('hidden');
                    aplicarTitulos('Quadro de Médiuns');
                    carregarQuadroMediuns();
                } else if (menu.id === 'menuAgendaGiras') {
                    document.getElementById('secAgendaGiras')?.classList.remove('hidden');
                    aplicarTitulos('Agenda de Eventos');
                    carregarAgenda();
                } else if (menu.id === 'menuLivroAta') {
                    document.getElementById('secLivroAta')?.classList.remove('hidden');
                    aplicarTitulos('Livro de Presença (ATA)');
                    if (typeof carregarLivroAta === 'function') carregarLivroAta();
                } else if (menu.id === 'menuGrau') {
                    document.getElementById('secGrau')?.classList.remove('hidden');
                    aplicarTitulos('Alteração de Grau');
                    carregarTabelaGraus();
                } else if (menu.id === 'menuFinanceiro') {
                    document.getElementById('secFinanceiro')?.classList.remove('hidden');
                    aplicarTitulos('Controlo Financeiro');
                    carregarFinanceiro();
                } else if (menu.id === 'menuComprovantes') {
                    document.getElementById('secComprovantes')?.classList.remove('hidden');
                    aplicarTitulos('Validar Pagamentos');
                    carregarValidadorPagamentos();
                } else if (menu.id === 'menuDoacoes') {
                    document.getElementById('secDoacoes')?.classList.remove('hidden');
                    aplicarTitulos('Doações e Campanhas');
                    if (typeof carregarDoacoesPrometidas === 'function') carregarDoacoesPrometidas();
                    if (typeof carregarDoacoesCatalogo === 'function') carregarDoacoesCatalogo();
                } else if (menu.id === 'menuAdmin') {
                    document.getElementById('secAdministracao')?.classList.remove('hidden');
                    aplicarTitulos('Configurações da Casa');
                    carregarConfiguracoesCasa();
                } else if (menu.id === 'menuMaster') {
                    document.getElementById('secMaster')?.classList.remove('hidden');
                    aplicarTitulos('Gestão da Plataforma (SaaS)');
                    if (typeof carregarGestaoPlataforma === 'function') carregarGestaoPlataforma();
                }

                if (window.innerWidth < 768 && sidebar && overlayMobile) {
                    sidebar.classList.add('-translate-x-full');
                    overlayMobile.classList.add('hidden');
                }
            });
        });

        // ========================================================
        // ATIVAÇÃO DOS BOTÕES DO MODAL DE COMPROVANTE
        // ========================================================
        const btnAprovarModal = document.getElementById('btnAprovarModal');
        const btnRejeitarModal = document.getElementById('btnRejeitarModal');

        if (btnAprovarModal) {
            btnAprovarModal.addEventListener('click', async () => {
                if (!window.comprovanteAtualId) return;
                if (!confirm("Aprovar este comprovante? Os meses associados serão marcados como pagos.")) return;

                const btnHtml = btnAprovarModal.innerHTML;
                btnAprovarModal.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
                btnAprovarModal.disabled = true;

                try {
                    const { data: comp, error: errComp } = await supabaseClient
                        .from('comprovantes_mensalidade')
                        .select('detalhes_pagamento')
                        .eq('id', window.comprovanteAtualId)
                        .eq('terreiro_id', idTerreiroGlobal)
                        .single();

                    if (errComp) throw errComp;

                    let upserts = [];
                    if (comp.detalhes_pagamento && Array.isArray(comp.detalhes_pagamento)) {
                        comp.detalhes_pagamento.forEach(det => {
                            if (det.meses && Array.isArray(det.meses)) {
                                det.meses.forEach(mes => {
                                    upserts.push({
                                        medium_id: det.medium_id,
                                        mes: mes,
                                        ano: det.ano,
                                        pago: true,
                                        isento: false,
                                        origem: 'pix_sistema' // <- REGISTRA A ORIGEM DO PIX
                                    });
                                });
                            }
                        });
                    }

                    if (upserts.length > 0) {
                        const { error: errUpsert } = await supabaseClient
                            .from('financeiro')
                            .upsert(upserts, { onConflict: 'medium_id,mes,ano' });
                        if (errUpsert) throw errUpsert;
                    }

                    const { error: errStatus } = await supabaseClient
                        .from('comprovantes_mensalidade')
                        .update({ status: 'aprovado' })
                        .eq('id', window.comprovanteAtualId)
                        .eq('terreiro_id', idTerreiroGlobal);
                    if (errStatus) throw errStatus;

                    alert("Comprovante aprovado com sucesso! Baixas realizadas.");
                    window.fecharModalVerComprovante();
                    carregarValidadorPagamentos();

                } catch (err) {
                    console.error(err);
                    alert("Erro ao aprovar comprovante: " + err.message);
                } finally {
                    btnAprovarModal.innerHTML = btnHtml;
                    btnAprovarModal.disabled = false;
                }
            });
        }

        if (btnRejeitarModal) {
            btnRejeitarModal.addEventListener('click', async () => {
                if (!window.comprovanteAtualId) return;
                if (!confirm("Rejeitar este comprovante? As mensalidades continuarão pendentes.")) return;

                const btnHtml = btnRejeitarModal.innerHTML;
                btnRejeitarModal.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Rejeitando...';
                btnRejeitarModal.disabled = true;

                try {
                    const { error } = await supabaseClient
                        .from('comprovantes_mensalidade')
                        .update({ status: 'rejeitado' })
                        .eq('id', window.comprovanteAtualId)
                        .eq('terreiro_id', idTerreiroGlobal);

                    if (error) throw error;
                    
                    alert("Comprovante rejeitado.");
                    window.fecharModalVerComprovante();
                    carregarValidadorPagamentos();
                } catch (err) {
                    console.error(err);
                    alert("Erro ao rejeitar comprovante: " + err.message);
                } finally {
                    btnRejeitarModal.innerHTML = btnHtml;
                    btnRejeitarModal.disabled = false;
                }
            });
        }

        // ========================================================
        // ATIVAÇÃO DO BOTÃO SALVAR CONFIG MENSALIDADES
        // ========================================================
        if (document.getElementById('formConfigMensalidade')) {
            document.getElementById('formConfigMensalidade').addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = document.getElementById('btnSalvarConfigMensalidade');
                const msg = document.getElementById('msgConfigMensalidade');
                
                btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Salvando...';
                
                try {
                    let gateway = 'manual';
                    document.getElementsByName('gatewayPagamento').forEach(r => { if(r.checked) gateway = r.value; });
                    
                    const chavePix = document.getElementById('chavePixManual') ? document.getElementById('chavePixManual').value.trim() : '';
                    const asaasKey = document.getElementById('asaasApiKey') ? document.getElementById('asaasApiKey').value.trim() : '';
                    
                    const { error: errT } = await supabaseClient.from('terreiros').update({
                        gateway_pagamento: gateway, chave_pix_manual: chavePix, asaas_api_key: asaasKey
                    }).eq('id', idTerreiroGlobal);
                    if (errT) throw errT;
                    
                    const inputs = document.querySelectorAll('.input-valor-grau');
                    const upserts = Array.from(inputs).map(inp => {
                        return { terreiro_id: idTerreiroGlobal, grau: inp.getAttribute('data-grau'), valor: parseFloat(inp.value) || 0 };
                    });
                    
                    if(upserts.length > 0){
                        const { error: errM } = await supabaseClient.from('config_mensalidades').upsert(upserts, { onConflict: 'terreiro_id,grau' });
                        if(errM) throw errM;
                    }
                    
                    if (msg) {
                        msg.innerHTML = '<i class="fas fa-check-circle mr-1"></i> Configurações salvas!';
                        msg.className = 'text-sm text-green-600 block mb-4 border border-green-200 bg-green-50 p-2 rounded';
                        msg.classList.remove('hidden');
                        setTimeout(() => msg.classList.add('hidden'), 5000);
                    }
                } catch(error) {
                    if (msg) {
                        msg.textContent = '❌ Erro: ' + error.message;
                        msg.className = 'text-sm text-red-600 block mb-4';
                        msg.classList.remove('hidden');
                    }
                } finally {
                    btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Salvar Tesouraria';
                }
            });
        }

        // ========================================================
        // ATIVAÇÃO DO BOTÃO "EXPORTAR PDF" DAS DOAÇÕES
        // ========================================================
        setTimeout(() => {
            const btnPDFDoacoes = document.getElementById('btnGerarPDF_doacoes');
            if (btnPDFDoacoes) {
                const novoBtn = btnPDFDoacoes.cloneNode(true);
                btnPDFDoacoes.parentNode.replaceChild(novoBtn, btnPDFDoacoes);

                novoBtn.addEventListener('click', () => {
                    if (!window.dadosDoacoesParaPDF || !window.dadosDoacoesParaPDF.doacoes || window.dadosDoacoesParaPDF.doacoes.length === 0) {
                        alert('Nenhuma doação registrada para exportar.');
                        return;
                    }

                    const { doacoes, mediuns, itens } = window.dadosDoacoesParaPDF;
                    const dados = doacoes.map(d => {
                        const mdEncontrado = mediuns?.find(m => m.auth_id === d.medium_auth_id || String(m.id) === String(d.medium_auth_id));
                        const medium = mdEncontrado ? mdEncontrado.nome_completo : 'Médium Desconhecido';
                        const itemObj = itens?.find(i => String(i.id) === String(d.item_id));
                        const itemNome = itemObj ? itemObj.nome : 'Item Desconhecido';
                        const dataFormatada = new Date(d.data_registro).toLocaleDateString('pt-BR');
                        const status = d.entregue ? 'Entregue' : 'Pendente';
                        return [medium, itemNome, String(d.quantidade), dataFormatada, status];
                    });

                    dados.sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));

                    window.gerarPDFRelatorio('Relatório de Doações Registradas', ['Médium', 'Item', 'Qtd', 'Data', 'Status'], dados);
                });
            }
        }, 800);

        // ==========================================
        // TODAS AS FUNÇÕES DE CARREGAMENTO NO ESCOPO
        // ==========================================

        async function carregarPainelInicial() {
            if(!idTerreiroGlobal) return; 
            
            try {
                const { count: totalMediuns } = await supabaseClient.from('mediuns')
                    .select('*', { count: 'exact', head: true })
                    .eq('terreiro_id', idTerreiroGlobal)
                    .neq('nome_completo', 'Administrador Sistema');
                    
                const elTotalMed = document.getElementById('totalMediuns');
                if (elTotalMed) elTotalMed.textContent = totalMediuns || '0';

                const agora = new Date().toISOString();
                const { data: agendaData } = await supabaseClient.from('agenda').select('*').eq('terreiro_id', idTerreiroGlobal).gte('data_hora_fim', agora).order('data_hora_inicio').limit(1);

                let giraAtualId = null;
                const elProxGira = document.getElementById('proximaGira');

                if (agendaData && agendaData.length > 0) {
                    giraAtualId = agendaData[0].id;
                    const dataGira = new Date(agendaData[0].data_hora_inicio).toLocaleString('pt-BR');
                    const badgeRestrita = agendaData[0].especial ? '<span class="ml-2 bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded font-bold uppercase">Restrita</span>' : '';
                    if (elProxGira) elProxGira.innerHTML = `${agendaData[0].titulo} ${badgeRestrita} <br><span class="text-sm font-normal text-gray-500">${dataGira}</span>`;
                } else {
                    if (elProxGira) elProxGira.textContent = 'Nenhum evento agendado';
                }

                const tabelaPresencas = document.getElementById('tabelaPresencas');
                const { data: todosMediuns } = await supabaseClient.from('mediuns').select('id, auth_id, nome_completo, nome_social, grau, funcao, status_ativo').eq('terreiro_id', idTerreiroGlobal);

                if (giraAtualId) {
                    const { data: presencas } = await supabaseClient.from('presencas').select('usuario_id, data_hora_checkin').eq('evento_id', giraAtualId).order('data_hora_checkin', { ascending: false });
                    
                    const elTotPres = document.getElementById('totalPresentes');
                    if (elTotPres) elTotPres.textContent = presencas ? presencas.length : '0';

                    if (tabelaPresencas) {
                        if (presencas && presencas.length > 0) {
                            let arrayPresencasVisuais = [];
                            
                            presencas.forEach(p => {
                                const md = todosMediuns?.find(m => m.auth_id === p.usuario_id || String(m.id) === String(p.usuario_id));
                                if (md && md.status_ativo === false) return;
                                const nome = md ? md.nome_completo : 'Médium Excluído';
                                const hora = new Date(p.data_hora_checkin).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                arrayPresencasVisuais.push({ nome, hora });
                            });

                            arrayPresencasVisuais.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

                            tabelaPresencas.innerHTML = ''; 
                            arrayPresencasVisuais.forEach(p => {
                                tabelaPresencas.innerHTML += `
                                    <tr class="border-b border-gray-100 hover:bg-gray-50">
                                        <td class="p-3 text-gray-800 font-medium">${p.nome}</td>
                                        <td class="p-3 text-gray-600 text-center">${p.hora}</td>
                                    </tr>
                                `;
                            });
                        } else {
                            tabelaPresencas.innerHTML = `<tr><td colspan="2" class="p-6 text-center text-gray-500">Nenhum check-in ainda.</td></tr>`;
                        }
                    }
                } else {
                    const elTotPres = document.getElementById('totalPresentes');
                    if (elTotPres) elTotPres.textContent = '0';
                    if(tabelaPresencas) tabelaPresencas.innerHTML = `<tr><td colspan="2" class="p-6 text-center text-gray-500">Nenhum evento agendado para o momento.</td></tr>`;
                }

                const selectRelatorio = document.getElementById('selectEventoRelatorio');
                const btnGerarHistorico = document.getElementById('btnBaixarPdfEvento');

                if (selectRelatorio) {
                    const { data: historicoEventos } = await supabaseClient
                        .from('agenda')
                        .select('id, titulo, data_hora_inicio, especial')
                        .eq('terreiro_id', idTerreiroGlobal)
                        .order('data_hora_inicio', { ascending: false });

                    selectRelatorio.innerHTML = '<option value="">Selecione um evento...</option>';
                    
                    if (historicoEventos && historicoEventos.length > 0) {
                        historicoEventos.forEach(ev => {
                            const dataFormatada = new Date(ev.data_hora_inicio).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                            const tipoEvento = ev.especial ? ' [Restrita]' : ' [Aberta]';
                            selectRelatorio.innerHTML += `<option value="${ev.id}">${dataFormatada} - ${ev.titulo}${tipoEvento}</option>`;
                        });
                    } else {
                        selectRelatorio.innerHTML = '<option value="">Nenhum evento encontrado no histórico.</option>';
                    }
                }

                if (btnGerarHistorico && selectRelatorio) {
                    const novoBtn = btnGerarHistorico.cloneNode(true);
                    btnGerarHistorico.parentNode.replaceChild(novoBtn, btnGerarHistorico);

                    novoBtn.addEventListener('click', async () => {
                        const eventoIdSelecionado = selectRelatorio.value;
                        if (!eventoIdSelecionado) {
                            alert('Por favor, selecione um evento na lista antes de clicar em Baixar.');
                            return;
                        }

                        const originalHtml = novoBtn.innerHTML;
                        novoBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Gerando Documento...';
                        novoBtn.disabled = true;

                        try {
                            const textoOption = selectRelatorio.options[selectRelatorio.selectedIndex].text;
                            const tituloEvStr = textoOption.split(' - ')[1] || 'Evento';

                            const { data: presencasHist } = await supabaseClient
                                .from('presencas')
                                .select('usuario_id, data_hora_checkin')
                                .eq('evento_id', eventoIdSelecionado);

                            if (!presencasHist || presencasHist.length === 0) {
                                alert('Nenhum check-in foi registrado para este evento.');
                                return;
                            }

                            const dadosParaPDF = [];
                            presencasHist.forEach(p => {
                                const md = todosMediuns?.find(m => m.auth_id === p.usuario_id || String(m.id) === String(p.usuario_id));
                                const nome = md ? md.nome_completo : 'Médium Excluído';
                                const hora = new Date(p.data_hora_checkin).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                
                                let cargoExibicao = '-';
                                if (md) {
                                    const g = md.grau && md.grau !== '-' ? md.grau : '';
                                    const f = md.funcao && md.funcao !== '-' ? md.funcao : '';
                                    if (g && f) cargoExibicao = `${g}/${f}`;
                                    else cargoExibicao = g || f || '-';
                                }
                                
                                dadosParaPDF.push([nome, cargoExibicao, hora]);
                            });

                            dadosParaPDF.sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));

                            window.gerarPDFRelatorio(
                                `Relação de Presentes - ${tituloEvStr}`, 
                                ['Nome Completo', 'Grau / Função', 'Hora Check-in'], 
                                dadosParaPDF
                            );

                        } catch (error) {
                            console.error('Erro na geração da relação de presença:', error);
                            alert('Erro inesperado ao gerar o relatório.');
                        } finally {
                            novoBtn.innerHTML = originalHtml;
                            novoBtn.disabled = false;
                        }
                    });
                }
            } catch (err) {
                console.error('Erro ao carregar painel inicial:', err);
            }
        }

        async function carregarQuadroMediuns() {
            if(!idTerreiroGlobal) return;
            const tbody = document.getElementById('tabelaTodosMediuns');
            if (!tbody) return;
            tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8 text-gray-500"><i class="fas fa-spinner fa-spin mr-2"></i>Buscando corrente...</td></tr>';

            try {
                const { data, error } = await supabaseClient
                    .from('mediuns')
                    .select('id, nome_completo, nome_social, data_nascimento, grau, funcao, telefone, palavra, cadastro_completo, is_admin, perm_agenda, perm_grau, perm_financeiro, perm_doacoes, perm_admin, perm_visao_geral, perm_ata, status_ativo, isento_mensalidade, created_at')
                    .eq('terreiro_id', idTerreiroGlobal)
                    .neq('nome_completo', 'Administrador Sistema')
                    .order('nome_completo');

                if (error) throw error;

                if (data) {
                    data.sort((a, b) => (a.nome_completo || '').localeCompare(b.nome_completo || '', 'pt-BR'));
                }

                listaMediunsGlobal = data || [];
                window.mediunsFiltrados = listaMediunsGlobal;
                renderizarTabelaMediuns(listaMediunsGlobal);
                renderizarAniversariantes(listaMediunsGlobal);
                
            } catch (err) {
                console.error('Erro ao buscar:', err);
                tbody.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-red-500 font-bold">Erro ao carregar dados.</td></tr>`;
            }
        }

        function renderizarTabelaMediuns(lista) {
            const tbody = document.getElementById('tabelaTodosMediuns');
            if (!tbody) return;
            tbody.innerHTML = '';

            if (lista.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8 text-gray-500 font-medium">Nenhum médium encontrado com estes filtros.</td></tr>';
                return;
            }

            lista.forEach(m => {
                let dataNascFormatada = '-';
                if (m.data_nascimento) {
                    if (m.data_nascimento.includes('-')) {
                        const partes = m.data_nascimento.split('-');
                        if(partes.length === 3) dataNascFormatada = `${partes[2]}/${partes[1]}/${partes[0]}`;
                    } else {
                        dataNascFormatada = m.data_nascimento; 
                    }
                }

                const cargo = [m.grau, m.funcao].filter(Boolean).join(' / ') || '-';
                
                let status = m.cadastro_completo ? '<span class="text-green-600 font-bold">Ativo</span>' : '<span class="text-yellow-600 font-bold">Pendente</span>';
                if (m.status_ativo === false) {
                    status = '<span class="text-red-600 font-bold">Inativo</span>';
                }
                
                let acoesHtml = '<span class="text-gray-400 text-xs">Sem acesso</span>';
                
                if (perfilAdminLogado && perfilAdminLogado.is_admin) {
                    const perms = `${m.perm_agenda || false},${m.perm_grau || false},${m.perm_financeiro || false},${m.perm_doacoes || false},${m.perm_admin || false},${m.perm_visao_geral || false},${m.perm_ata || false}`;
                    
                    const isAtivo = m.status_ativo !== false;
                    const iconInativar = isAtivo ? 'fa-user-times' : 'fa-user-check';
                    const colorInativar = isAtivo ? 'text-orange-500 hover:text-orange-700' : 'text-green-500 hover:text-green-700';
                    const titleInativar = isAtivo ? 'Inativar Médium' : 'Reativar Médium';
                    
                    acoesHtml = `
                        <div class="flex items-center justify-center space-x-4">
                            <button onclick="alternarStatusAtivoMedium(${m.id}, ${isAtivo})" class="${colorInativar} transition" title="${titleInativar}"><i class="fas ${iconInativar}"></i></button>
                            <button onclick="abrirModalEditarMedium(${m.id})" class="text-purple-500 hover:text-purple-700 transition" title="Editar Médium"><i class="fas fa-user-edit"></i></button>
                            <button onclick="abrirModalPermissoes(${m.id}, '${m.nome_completo.replace(/'/g, "\\'")}', '${perms}')" class="text-blue-500 hover:text-blue-700 transition" title="Permissões de Acesso"><i class="fas fa-key"></i></button>
                            <button onclick="excluirMedium(${m.id}, '${m.nome_completo.replace(/'/g, "\\'")}')" class="text-red-500 hover:text-red-700 transition" title="Excluir Médium"><i class="fas fa-trash"></i></button>
                        </div>
                    `;
                }

                let linkWhats = '-';
                if (m.telefone) {
                    const numeroLimpo = m.telefone.replace(/\D/g, '');
                    const ddi = numeroLimpo.startsWith('55') ? '' : '55';
                    linkWhats = `<a href="https://wa.me/${ddi}${numeroLimpo}" target="_blank" class="text-green-600 hover:text-green-700 hover:underline flex items-center gap-1 font-medium" title="Chamar no WhatsApp"><i class="fab fa-whatsapp text-lg"></i> ${m.telefone}</a>`;
                }

                const nomeHtml = m.nome_social 
                    ? `${m.nome_completo}<br><span class="text-[10px] text-gray-500">Social: ${m.nome_social}</span>`
                    : m.nome_completo;

                tbody.innerHTML += `
                    <tr class="hover:bg-gray-50 transition-colors group">
                        <td class="p-4 text-gray-800 font-medium whitespace-nowrap">${nomeHtml}</td>
                        <td class="p-4 text-gray-600 text-center whitespace-nowrap">${dataNascFormatada}</td>
                        <td class="p-4 text-gray-600 whitespace-nowrap">${cargo}</td>
                        <td class="p-4 text-gray-600">${linkWhats}</td>
                        <td class="p-4 text-center">${status}</td>
                        <td class="p-4 text-center no-print">${acoesHtml}</td>
                    </tr>`;
            });
        }

        function renderizarAniversariantes(lista) {
            const ul = document.getElementById('listaAniversariantes');
            const titulo = document.getElementById('tituloAniversariantesMes');
            if (!ul) return;

            const dataAtual = new Date();
            const mesAtualNum = (dataAtual.getMonth() + 1).toString().padStart(2, '0');
            const nomeMesAtual = dataAtual.toLocaleString('pt-BR', { month: 'long' });
            
            if(titulo) titulo.textContent = `Aniversariantes de ${nomeMesAtual.charAt(0).toUpperCase() + nomeMesAtual.slice(1)}`;

            const aniversariantes = lista.filter(m => {
                if (!m.data_nascimento) return false;
                let mesNasc = '';
                if (m.data_nascimento.includes('-')) mesNasc = m.data_nascimento.split('-')[1];
                else if (m.data_nascimento.includes('/')) mesNasc = m.data_nascimento.split('/')[1];
                return mesNasc === mesAtualNum;
            });

            aniversariantes.sort((a, b) => {
                let diaA = 0, diaB = 0;
                if(a.data_nascimento.includes('-')) diaA = parseInt(a.data_nascimento.split('-')[2]);
                if(b.data_nascimento.includes('-')) diaB = parseInt(b.data_nascimento.split('-')[2]);
                return diaA - diaB;
            });

            window.aniversariantesAtuais = aniversariantes; 

            ul.innerHTML = '';

            if (aniversariantes.length === 0) {
                ul.innerHTML = `
                    <li class="p-6 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
                        <i class="fas fa-calendar-times text-2xl mb-1"></i>
                        <span class="text-sm">Nenhum médium faz aniversário<br>neste mês.</span>
                    </li>`;
                return;
            }

            aniversariantes.forEach(m => {
                let dia = '00';
                let mes = '00';
                if (m.data_nascimento.includes('-')) {
                    const p = m.data_nascimento.split('-');
                    dia = p[2]; mes = p[1];
                }

                const nomeExibicao = m.nome_social ? m.nome_social : (m.nome_completo ? m.nome_completo.split(' ')[0] : 'Médium');
                const badgeSocial = m.nome_social ? `<span class="bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0.5 rounded ml-1 font-bold">SOCIAL</span>` : '';

                ul.innerHTML += `
                    <li class="p-3 hover:bg-gray-50 flex items-center justify-between transition-colors border-l-4 border-transparent hover:border-blue-500">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-extrabold shadow-inner border border-blue-200">
                                ${dia}
                            </div>
                            <div>
                                <p class="text-sm font-bold text-gray-800 flex items-center">${nomeExibicao} ${badgeSocial}</p>
                                <p class="text-[10px] text-gray-500 uppercase">${m.grau || 'Médium'}</p>
                            </div>
                        </div>
                        <span class="text-xs font-bold text-gray-500 bg-white border border-gray-200 px-2 py-1 rounded shadow-sm">${dia}/${mes}</span>
                    </li>
                `;
            });
        }

        async function carregarAgenda() {
            if(!idTerreiroGlobal) return;
            const tbody = document.getElementById('tabelaGirasCadastradas');
            if (!tbody) return;
            const agora = new Date().toISOString();
            const { data } = await supabaseClient.from('agenda').select('*').eq('terreiro_id', idTerreiroGlobal).gte('data_hora_fim', agora).order('data_hora_inicio').limit(15); 
            tbody.innerHTML = '';
            if(data && data.length > 0) {
                data.forEach(g => {
                    const inicio = new Date(g.data_hora_inicio).toLocaleString('pt-BR');
                    const imgHtml = g.imagem_url 
                        ? `<a href="${g.imagem_url}" target="_blank" class="text-blue-500 hover:bg-blue-50 p-1 rounded text-xs transition" title="Ver Cartaz"><i class="fas fa-image"></i> Cartaz</a>` 
                        : `<span class="text-gray-400 text-xs">-</span>`;
                    
                    const badgeEspecial = g.especial ? '<span class="ml-2 bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">Restrita</span>' : '';

                    const acoesBloco = `
                        <div class="flex items-center justify-center space-x-2">
                            ${imgHtml}
                            <div class="h-4 border-l border-gray-300 mx-2"></div>
                            <button onclick="abrirModalEditarGira('${g.id}')" class="text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 font-bold py-1 px-2 rounded shadow transition" title="Editar Título/Hora"><i class="fas fa-edit"></i></button>
                            <button onclick="excluirGira('${g.id}', '${g.data_hora_inicio}')" class="text-xs bg-red-100 text-red-700 hover:bg-red-200 font-bold py-1 px-2 rounded shadow transition" title="Excluir Evento"><i class="fas fa-trash"></i></button>
                        </div>
                    `;

                    tbody.innerHTML += `
                        <tr class="border-b border-gray-100 hover:bg-gray-50">
                            <td class="p-3 text-gray-800 font-medium">${g.titulo} ${badgeEspecial}</td>
                            <td class="p-3 text-gray-600">${inicio}</td>
                            <td class="p-3 text-center">${acoesBloco}</td>
                        </tr>
                    `;
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="3" class="p-6 text-center text-gray-500">Nenhum evento agendado no momento.</td></tr>';
            }
        }

        window.carregarLivroAta = async () => {
            if(!idTerreiroGlobal) return;
            const tbody = document.getElementById('tabelaLivroAta');
            if(!tbody) return;
            tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-gray-500">Buscando histórico de ATAs...</td></tr>';
            
            try {
                const { data, error } = await supabaseClient.from('agenda')
                    .select('id, titulo, data_hora_inicio, data_hora_fim, ata_encerrada, texto_ata')
                    .eq('terreiro_id', idTerreiroGlobal)
                    .eq('gera_ata', true)
                    .order('data_hora_inicio', { ascending: false }) 
                    .limit(50); 

                if (error) throw error;

                tbody.innerHTML = '';
                if (!data || data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-gray-500">Nenhum evento foi configurado para gerar ATA ainda.</td></tr>';
                    return;
                }

                const agora = new Date();

                data.forEach(g => {
                    g.status_encerrada = g.ata_encerrada;
                    if (!g.status_encerrada && g.data_hora_fim) {
                        const fim = new Date(g.data_hora_fim);
                        if (agora > fim) {
                            g.status_encerrada = true;
                            supabaseClient.from('agenda').update({ ata_encerrada: true }).eq('id', g.id).eq('terreiro_id', idTerreiroGlobal).then();
                        }
                    }
                });

                data.sort((a, b) => {
                    if (a.status_encerrada !== b.status_encerrada) return a.status_encerrada ? 1 : -1; 
                    const dataA = new Date(a.data_hora_inicio).getTime();
                    const dataB = new Date(b.data_hora_inicio).getTime();
                    if (!a.status_encerrada) return dataA - dataB;
                    else return dataB - dataA;
                });

                data.forEach(g => {
                    const inicio = new Date(g.data_hora_inicio).toLocaleString('pt-BR');
                    const encerrada = g.status_encerrada;
                    
                    const statusHtml = encerrada 
                        ? '<span class="bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded font-bold"><i class="fas fa-lock mr-1"></i> Finalizada</span>' 
                        : '<span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-bold"><i class="fas fa-lock-open mr-1"></i> Em Aberto</span>';

                    let acoesHtml = '';
                    if (encerrada) {
                        acoesHtml = `<button onclick="gerarPDF_ATA('${g.id}')" class="text-xs bg-gray-800 hover:bg-gray-900 text-white font-bold py-1.5 px-3 rounded shadow transition"><i class="fas fa-file-pdf mr-1 text-red-400"></i> Baixar Documento</button>`;
                    } else {
                        const temTexto = g.texto_ata && g.texto_ata.trim() !== '';
                        const labelRedigir = temTexto ? '<i class="fas fa-edit"></i> Editar' : '<i class="fas fa-pen"></i> Redigir';
                        
                        acoesHtml = `
                            <div class="flex items-center justify-center space-x-2">
                                <button onclick="abrirModalEscreverAta('${g.id}')" class="text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 font-bold py-1 px-3 rounded shadow transition" title="Redigir ATA">${labelRedigir}</button>
                                <button onclick="encerrarAta('${g.id}')" class="text-xs bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded shadow transition" title="Travar Check-ins e Gerar PDF"><i class="fas fa-check-double"></i> Encerrar e Gerar</button>
                            </div>
                        `;
                    }

                    tbody.innerHTML += `
                        <tr class="border-b border-gray-100 hover:bg-gray-50">
                            <td class="p-3 text-gray-800 font-medium">${g.titulo}</td>
                            <td class="p-3 text-gray-600 text-sm">${inicio}</td>
                            <td class="p-3 text-center">${statusHtml}</td>
                            <td class="p-3 text-center">${acoesHtml}</td>
                        </tr>
                    `;
                });
            } catch (error) {
                tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-red-500">Erro: ${error.message}</td></tr>`;
            }
        };

        const opcoesGrau = ['-', 'I', 'IJ', 'B', 'BJ', 'T', 'TJ', 'SCT', 'Escola de CT', 'CT', 'SCCT', 'Escola de CCT', 'CCT'];
        const opcoesFuncao = ['-', 'MG', 'MGA', 'MC', 'MCA', 'MD', 'MDA', 'Cantina', 'Dirigente'];
        function renderizarOpcoes(lista, valorAtual) { return lista.map(op => `<option value="${op === '-' ? '' : op}" ${op === valorAtual ? 'selected' : ''}>${op}</option>`).join(''); }

        async function carregarTabelaGraus() {
            if(!idTerreiroGlobal) return;
            const tbody = document.getElementById('tabelaGraus');
            if (!tbody) return;
            tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center">Buscando...</td></tr>';
            const { data } = await supabaseClient.from('mediuns').select('id, nome_completo, nome_social, grau, funcao').eq('terreiro_id', idTerreiroGlobal).neq('nome_completo', 'Administrador Sistema').order('nome_completo');
            if (data) { mediunsGrauCache = data; renderizarGraus(data); }
        }

        function renderizarGraus(lista) {
            const tbody = document.getElementById('tabelaGraus');
            if (!tbody) return;
            tbody.innerHTML = '';
            lista.forEach(m => {
                const nomeStr = m.nome_completo;
                tbody.innerHTML += `<tr class="border-b border-gray-100 hover:bg-gray-50 transition"><td class="py-2 px-3 text-gray-800 font-medium">${nomeStr}</td><td class="py-2 px-3"><select id="grau_${m.id}" class="border border-gray-300 rounded px-2 py-1 bg-white text-sm focus:ring-tema-primaria outline-none w-full max-w-[120px]">${renderizarOpcoes(opcoesGrau, m.grau || '-')}</select></td><td class="py-2 px-3"><select id="func_${m.id}" class="border border-gray-300 rounded px-2 py-1 bg-white text-sm focus:ring-tema-primaria outline-none w-full max-w-[120px]">${renderizarOpcoes(opcoesFuncao, m.funcao || '-')}</select></td><td class="py-2 px-3 text-center"><button onclick="salvarGrau(${m.id})" id="btnGrau_${m.id}" class="bg-tema-primaria hover:opacity-90 text-white px-3 py-1 rounded text-xs font-bold transition">Salvar</button></td></tr>`;
            });
        }

        if(document.getElementById('buscaMediumGrau')) {
            document.getElementById('buscaMediumGrau').addEventListener('input', (e) => {
                const termo = e.target.value.toLowerCase();
                const filtrado = mediunsGrauCache.filter(m => (m.nome_completo.toLowerCase().includes(termo) || (m.nome_social && m.nome_social.toLowerCase().includes(termo))));
                renderizarGraus(filtrado);
            });
        }

        window.carregarValidadorPagamentos = () => {
            carregarComprovantesPendentes();
            carregarHistoricoComprovantes();
        };

       async function carregarComprovantesPendentes() {
            if (!idTerreiroGlobal) return;
            const listaCards = document.getElementById('listaComprovantesPendentes');
            if (!listaCards) return;

            listaCards.innerHTML = '<div class="col-span-full p-8 text-center text-gray-500 bg-white rounded-2xl shadow-sm border border-gray-100"><i class="fas fa-spinner fa-spin mr-2 text-xl"></i> Buscando comprovantes...</div>';

            try {
                const { data: comprovantes, error } = await supabaseClient
                    .from('comprovantes_mensalidade')
                    .select('*')
                    .eq('terreiro_id', idTerreiroGlobal)
                    .eq('status', 'pendente')
                    .order('data_envio', { ascending: true });

                if (error) throw error;

                if (!comprovantes || comprovantes.length === 0) {
                    listaCards.innerHTML = '<div class="col-span-full p-8 text-center text-gray-500 bg-white rounded-2xl shadow-sm border border-gray-100"><i class="fas fa-check-circle text-3xl text-green-300 mb-2 block"></i> Tudo em dia! Não há comprovantes aguardando validação.</div>';
                    return;
                }

                const { data: mediuns } = await supabaseClient
                    .from('mediuns')
                    .select('auth_id, nome_completo')
                    .eq('terreiro_id', idTerreiroGlobal);

                listaCards.innerHTML = '';

                comprovantes.forEach(comp => {
                    const remetente = mediuns?.find(m => m.auth_id === comp.enviado_por)?.nome_completo || 'Médium Desconhecido';
                    
                    let refTexto = '';
                    if (comp.detalhes_pagamento && Array.isArray(comp.detalhes_pagamento)) {
                        comp.detalhes_pagamento.forEach(det => {
                            if (det.meses && Array.isArray(det.meses)) {
                                const mesesNomes = det.meses.map(m => ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][m-1]).join(', ');
                                refTexto += `<div class="mb-1"><span class="font-bold text-gray-700">${det.medium_nome}:</span> ${mesesNomes}/${det.ano}</div>`;
                            }
                        });
                    } else {
                        refTexto = '<span class="text-gray-400">Sem detalhes estruturados</span>';
                    }

                    const valFmt = Number(comp.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    const dataEnvio = new Date(comp.data_envio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

                    const card = `
                        <div class="bg-white p-5 rounded-2xl shadow-sm border border-yellow-200 border-t-4 hover:shadow-md transition">
                            <div class="flex justify-between items-start mb-3">
                                <h4 class="font-bold text-gray-800 text-sm truncate pr-2" title="${remetente}"><i class="fas fa-user-circle text-yellow-500 mr-1.5"></i> ${remetente}</h4>
                                <span class="bg-yellow-100 text-yellow-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Avaliar</span>
                            </div>
                            <div class="text-xs text-gray-600 mb-3 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                ${refTexto}
                            </div>
                            <div class="flex justify-between items-end mb-4">
                                <div>
                                    <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Enviado em</p>
                                    <p class="text-xs text-gray-600 font-medium">${dataEnvio}</p>
                                </div>
                                <div class="text-right">
                                    <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Valor Total</p>
                                    <p class="text-lg font-black text-green-600 leading-none">${valFmt}</p>
                                </div>
                            </div>
                            <button onclick="abrirModalVerComprovante('${comp.id}', '${comp.url_comprovante}', '${remetente} - ${valFmt}')" class="w-full bg-gray-800 hover:bg-gray-900 active:scale-95 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm transition text-sm flex justify-center items-center gap-2">
                                <i class="fas fa-search"></i> Analisar Comprovante
                            </button>
                        </div>
                    `;
                    listaCards.innerHTML += card;
                });

            } catch (err) {
                console.error('Erro ao carregar comprovantes pendentes:', err);
                listaCards.innerHTML = `<div class="col-span-full p-4 text-center text-red-500 text-sm font-bold border border-red-200 rounded-xl bg-red-50">Erro ao buscar comprovantes: ${err.message}</div>`;
            }
        }

        async function carregarHistoricoComprovantes() {
            if (!idTerreiroGlobal) return;
            const tbody = document.getElementById('tabelaComprovantesHistorico');
            if (!tbody) return;

            try {
                const { data: comprovantes, error } = await supabaseClient
                    .from('comprovantes_mensalidade')
                    .select('*')
                    .eq('terreiro_id', idTerreiroGlobal)
                    .neq('status', 'pendente')
                    .order('data_envio', { ascending: false }) 
                    .limit(20);

                if (error) throw error;

                if (!comprovantes || comprovantes.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-500 text-xs">Nenhum histórico recente de validação.</td></tr>';
                    return;
                }

                const { data: mediuns } = await supabaseClient.from('mediuns').select('auth_id, nome_completo').eq('terreiro_id', idTerreiroGlobal);

                tbody.innerHTML = '';
                comprovantes.forEach(comp => {
                    const remetente = mediuns?.find(m => m.auth_id === comp.enviado_por)?.nome_completo || 'Desconhecido';
                    const valFmt = Number(comp.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    
                    let statusBadge = '';
                    if(comp.status === 'aprovado') statusBadge = '<span class="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold"><i class="fas fa-check mr-1"></i> Aprovado</span>';
                    else if(comp.status === 'rejeitado') statusBadge = '<span class="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold"><i class="fas fa-times mr-1"></i> Rejeitado</span>';

                    let refStr = 'Vários';
                    if (comp.detalhes_pagamento && comp.detalhes_pagamento[0]) {
                        refStr = `${comp.detalhes_pagamento[0].meses?.length || 0} mes(es)`;
                    }

                    tbody.innerHTML += `
                        <tr class="hover:bg-gray-50">
                            <td class="p-3 text-[11px] font-medium text-gray-800 max-w-[100px] truncate" title="${remetente}">${remetente}</td>
                            <td class="p-3 text-[11px] text-gray-500">${refStr}</td>
                            <td class="p-3 text-[11px] font-bold text-gray-800">${valFmt}</td>
                            <td class="p-3 text-center">${statusBadge}</td>
                        </tr>
                    `;
                });

            } catch (err) {
                console.error(err);
            }
        }

        window.abrirModalVerComprovante = (id, url, subtitulo) => {
            window.comprovanteAtualId = id;
            document.getElementById('modalComprovanteSubtitulo').textContent = subtitulo;
            const frame = document.getElementById('frameComprovante');
            document.getElementById('loaderComprovante').classList.remove('hidden');
            
            if(url.toLowerCase().endsWith('.pdf')) {
                frame.src = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
            } else {
                frame.src = url;
            }
            
            document.getElementById('modalVerComprovante').classList.remove('hidden');
        };

        window.fecharModalVerComprovante = () => {
            document.getElementById('modalVerComprovante').classList.add('hidden');
            document.getElementById('frameComprovante').src = '';
            window.comprovanteAtualId = null;
        };

        async function carregarFinanceiro(ano) {
            if(!idTerreiroGlobal) return;
            const anoBusca = ano || parseInt(document.getElementById('selectAnoFinanceiro').value);
            
            const tbody = document.getElementById('tabelaFinanceiro');
            const dashboard = document.getElementById('cardsMesesFinanceiro');
            if (!tbody || !dashboard) return;
            
            tbody.innerHTML = '<tr><td colspan="14" class="p-6 text-center text-gray-500">Buscando histórico...</td></tr>';
            dashboard.innerHTML = '<div class="col-span-full p-6 text-center text-gray-500"><i class="fas fa-spinner fa-spin mr-2"></i>A calcular métricas financeiras...</div>';
            
            const { data: mediuns } = await supabaseClient.from('mediuns')
                .select('id, nome_completo, nome_social, isento_mensalidade, created_at, grau') 
                .eq('terreiro_id', idTerreiroGlobal)
                .neq('nome_completo', 'Administrador Sistema')
                .order('nome_completo');

            if(!mediuns || mediuns.length === 0) {
                tbody.innerHTML = '<tr><td colspan="14" class="p-6 text-center text-gray-500">Nenhum médium cadastrado neste terreiro.</td></tr>';
                dashboard.innerHTML = '';
                return;
            }

            const idsMediunsDesteTerreiro = mediuns.map(m => m.id);

            const { data: pgtos } = await supabaseClient.from('financeiro')
                .select('medium_id, mes, ano, pago, isento, origem')
                .eq('ano', anoBusca)
                .in('medium_id', idsMediunsDesteTerreiro);

            const { data: configs } = await supabaseClient.from('config_mensalidades')
                .select('grau, valor')
                .eq('terreiro_id', idTerreiroGlobal);
                
            const valorPorGrau = {};
            if (configs) configs.forEach(c => valorPorGrau[c.grau] = parseFloat(c.valor) || 0);
            
            const statsMeses = Array.from({ length: 12 }, () => ({
                arrecadado: 0, totalMediuns: 0, adimplentes: 0, inadimplentes: 0
            }));
            
            tbody.innerHTML = '';
            
            const mesAtual = new Date().getMonth() + 1; 
            const anoAtual = new Date().getFullYear();

            mediuns.forEach(m => {
                const meusPgtos = pgtos ? pgtos.filter(p => p.medium_id === m.id) : [];
                let htmlMeses = ''; let emDia = true;
                
                const dataIngresso = m.created_at ? new Date(m.created_at) : new Date('2000-01-01');
                const mesIngresso = dataIngresso.getMonth() + 1;
                const anoIngresso = dataIngresso.getFullYear();

                for (let i = 1; i <= 12; i++) {
                    const pgto = meusPgtos.find(p => p.mes === i);
                    
                    const isAntesDoIngresso = (anoBusca < anoIngresso) || (anoBusca === anoIngresso && i < mesIngresso);
                    const isentoAnual = m.isento_mensalidade === true;
                    const isentoMensal = pgto ? pgto.isento : false;
                    const isIsento = isentoAnual || isentoMensal;
                    
                    const pago = pgto ? pgto.pago : false;
                    const origem = pgto ? pgto.origem : null;

                    const passou = (anoBusca < anoAtual) || (anoBusca === anoAtual && i < mesAtual);
                    
                    if (passou && !pago && !isIsento && !isAntesDoIngresso) emDia = false; 

                    if (!isAntesDoIngresso) {
                        statsMeses[i-1].totalMediuns++;
                        if (isIsento || pago) {
                            statsMeses[i-1].adimplentes++;
                            if (pago) {
                                statsMeses[i-1].arrecadado += valorPorGrau[m.grau] || 0;
                            }
                        } else if (passou) {
                            statsMeses[i-1].inadimplentes++;
                        }
                    }

                    let corCheck = '';
                    let titleStr = '';
                    let checkedStr = '';
                    let disabledStr = '';

                    if (isAntesDoIngresso) {
                        checkedStr = 'checked';
                        disabledStr = 'disabled';
                        corCheck = 'accent-color: #9ca3af; opacity: 0.4; cursor: not-allowed;'; 
                        titleStr = 'Não era membro (Anterior ao ingresso)';
                    } else if (isIsento) {
                        checkedStr = 'checked';
                        corCheck = 'accent-color: #a855f7;'; 
                        titleStr = isentoAnual ? 'Isento (Permanente)' : 'Isento (Mês Específico) - Clique p/ desfazer';
                    } else if (pago && origem === 'pix_sistema') {
                        checkedStr = 'checked';
                        corCheck = 'accent-color: #3b82f6;'; 
                        titleStr = 'Pago via PIX (Sistema)';
                    } else if (pago) {
                        checkedStr = 'checked';
                        corCheck = 'accent-color: #16a34a;'; 
                        titleStr = 'Pago (Manual)';
                    } else {
                        titleStr = 'Pendente (Clique Esq. p/ Pagar | Clique Dir. p/ Isentar)';
                    }

                    htmlMeses += `<td class="py-1 px-1 border-b border-gray-100">
                        <input type="checkbox" ${checkedStr} ${disabledStr} style="${corCheck}" title="${titleStr}" class="w-4 h-4 cursor-pointer" 
                        onchange="salvarPagamento(${m.id}, ${i}, ${anoBusca}, this.checked)"
                        oncontextmenu="toggleIsentoMes(event, ${m.id}, ${i}, ${anoBusca}, ${isAntesDoIngresso})">
                    </td>`;
                }
                const statusHtml = emDia ? '<span class="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">Em Dia</span>' : '<span class="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded">Pendente</span>';
                const nomeStr = m.nome_completo;

                tbody.innerHTML += `<tr class="hover:bg-gray-50"><td class="py-2 px-3 border-b border-gray-100 text-left font-medium text-gray-800 text-xs truncate max-w-[220px]" title="Ingresso: ${dataIngresso.toLocaleDateString('pt-BR')}">${nomeStr}</td>${htmlMeses}<td class="py-2 px-2 border-b border-gray-100 bg-gray-50">${statusHtml}</td></tr>`;
            });

            dashboard.innerHTML = '';
            const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            
            statsMeses.forEach((stat, index) => {
                const progresso = stat.totalMediuns > 0 ? Math.round((stat.adimplentes / stat.totalMediuns) * 100) : 0;
                let corProgresso = 'bg-green-500';
                if (progresso < 50) corProgresso = 'bg-red-500';
                else if (progresso < 80) corProgresso = 'bg-yellow-500';
                
                const valFmt = stat.arrecadado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                
                dashboard.innerHTML += `
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-3 hover:shadow-md transition">
                        <h4 class="text-xs font-black text-gray-700 uppercase mb-2 border-b pb-1">${nomesMeses[index]}</h4>
                        <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Arrecadado</p>
                        <p class="text-lg font-black text-green-600 leading-none mb-3">${valFmt}</p>
                        
                        <div class="flex justify-between items-center text-[10px] text-gray-600 mb-1 font-bold">
                            <span>Adimplentes</span>
                            <span>${stat.adimplentes} / ${stat.totalMediuns}</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                            <div class="${corProgresso} h-1.5 rounded-full" style="width: ${progresso}%"></div>
                        </div>
                        
                        <div class="flex justify-between items-center text-[10px]">
                            <span class="text-gray-500">Inadimplentes:</span>
                            <span class="font-bold ${stat.inadimplentes > 0 ? 'text-red-500' : 'text-gray-600'}">${stat.inadimplentes}</span>
                        </div>
                    </div>
                `;
            });
        }

        if(document.getElementById('selectAnoFinanceiro')) document.getElementById('selectAnoFinanceiro').addEventListener('change', (e) => carregarFinanceiro(parseInt(e.target.value)));

        window.salvarPagamento = async (mediumId, mes, ano, status) => {
            const mediumValido = listaMediunsGlobal.some(m => m.id === mediumId) || mediunsGrauCache.some(m => m.id === mediumId);
            if (!mediumValido && listaMediunsGlobal.length > 0) {
                alert('Ação bloqueada: Este médium não pertence ao seu terreiro.');
                return document.getElementById('menuFinanceiro')?.click();
            }

            const { error } = await supabaseClient.from('financeiro').upsert({ 
                medium_id: mediumId, 
                mes: mes, 
                ano: ano, 
                pago: status,
                isento: false,
                origem: 'manual' 
            }, { onConflict: 'medium_id,mes,ano' });
            
            if(error) { 
                alert('Erro: ' + error.message); 
                document.getElementById('menuFinanceiro')?.click(); 
            } else {
                document.getElementById('menuFinanceiro')?.click(); 
            }
        };

        window.toggleIsentoMes = async (event, mediumId, mes, ano, bloqueado) => {
            event.preventDefault(); 
            if (bloqueado) return;
            
            if(!confirm(`Deseja ISENTAR/ANISTIAR este médium da mensalidade do mês ${mes}/${ano}?`)) return;
            
            const { error } = await supabaseClient.from('financeiro').upsert({ 
                medium_id: mediumId, 
                mes: mes, 
                ano: ano, 
                pago: false, 
                isento: true, 
                origem: 'manual' 
            }, { onConflict: 'medium_id,mes,ano' });
            
            if(error) alert('Erro: ' + error.message);
            else document.getElementById('menuFinanceiro')?.click(); 
        };

        window.aplicarFiltrosMediuns = () => {}; 
        window.carregarValidadorPagamentos = () => {};
        
        window.gerarPDFRelatorio = (titulo, colunas, dados) => {
            const containerPDF = document.createElement('div');
            containerPDF.style.padding = '20px 30px';
            containerPDF.style.fontFamily = 'Arial, sans-serif';
            containerPDF.style.color = '#333';
            containerPDF.style.position = 'relative';

            let watermark = '';
            if (logoTerreiroGlobal) {
                watermark = `<div style="position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%); opacity: 0.08; z-index: -1; pointer-events: none;">
                                <img src="${logoTerreiroGlobal}" style="width: 400px; max-width: 80%;">
                             </div>`;
            }

            let html = `
                ${watermark}
                <table style="width: 100%; margin-bottom: 15px; border-bottom: 2px solid #16a34a; padding-bottom: 10px;">
                    <tr>
                        <td style="width: 20%; text-align: left; vertical-align: middle;">
                            ${logoTerreiroGlobal ? `<img src="${logoTerreiroGlobal}" style="max-height: 70px; max-width: 100px; object-fit: contain;">` : ''}
                        </td>
                        <td style="width: 60%; text-align: center; vertical-align: middle;">
                            <h2 style="margin: 0; color: #1e3a8a; font-size: 20px; text-transform: uppercase;">${nomeTerreiroGlobal || 'Templo'}</h2>
                            <h3 style="margin: 4px 0 0 0; color: #444; font-size: 16px;">${titulo}</h3>
                            <p style="margin: 4px 0 0 0; color: #666; font-size: 11px;">Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
                        </td>
                        <td style="width: 20%;"></td>
                    </tr>
                </table>
                <table style="width: 100%; border-collapse: collapse; font-size: 11px; position: relative; z-index: 1;">
                    <thead>
                        <tr style="background-color: #f3f4f6;">
                            ${colunas.map(c => `<th style="padding: 6px 4px; border: 1px solid #ddd; text-align: left; font-weight: bold; color: #555;">${c}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            dados.forEach((linha, i) => {
                const bg = i % 2 === 0 ? '#ffffff' : '#f9fafb';
                html += `<tr style="background-color: ${bg};">
                            ${linha.map(celula => `<td style="padding: 3px 4px; border: 1px solid #ddd; color: #222; border-bottom: 1px solid #eee;">${celula}</td>`).join('')}
                         </tr>`;
            });
            
            html += `</tbody></table>`;
            containerPDF.innerHTML = html;

            const opt = {
                margin:       10,
                filename:     `${titulo.replace(/\s+/g, '_')}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            html2pdf().set(opt).from(containerPDF).save();
        };

        setTimeout(() => {
            document.getElementById('filtroNomeMedium')?.addEventListener('input', window.aplicarFiltrosMediuns);
            document.getElementById('filtroGrauMedium')?.addEventListener('change', window.aplicarFiltrosMediuns);
            document.getElementById('filtroStatusMedium')?.addEventListener('change', window.aplicarFiltrosMediuns);
            document.getElementById('filtroMesNascimento')?.addEventListener('change', window.aplicarFiltrosMediuns);
            
            document.getElementById('filtroConvocadosNome')?.addEventListener('input', () => window.filtrarConvocados('listaCheckConvocados', 'filtroConvocadosNome', 'filtroConvocadosGrau'));
            document.getElementById('filtroConvocadosGrau')?.addEventListener('change', () => window.filtrarConvocados('listaCheckConvocados', 'filtroConvocadosNome', 'filtroConvocadosGrau'));
            document.getElementById('editFiltroConvocadosNome')?.addEventListener('input', () => window.filtrarConvocados('editListaCheckConvocados', 'editFiltroConvocadosNome', 'editFiltroConvocadosGrau'));
            document.getElementById('editFiltroConvocadosGrau')?.addEventListener('change', () => window.filtrarConvocados('editListaCheckConvocados', 'editFiltroConvocadosNome', 'editFiltroConvocadosGrau'));

            document.getElementById('btnImprimirMediuns')?.addEventListener('click', () => {
                const btn = document.getElementById('btnImprimirMediuns');
                const originalHtml = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Gerando...';
                btn.disabled = true;
                
                const lista = window.mediunsFiltrados || listaMediunsGlobal;
                const dados = lista.map(m => {
                    let dataNasc = '-';
                    if (m.data_nascimento) {
                        if (m.data_nascimento.includes('-')) {
                            const p = m.data_nascimento.split('-');
                            if(p.length === 3) dataNasc = `${p[2]}/${p[1]}/${p[0]}`;
                        } else dataNasc = m.data_nascimento;
                    }
                    const nomeStr = m.nome_completo;
                    const whats = m.telefone || '-';
                    const palavra = m.palavra || '-';
                    return [nomeStr, dataNasc, m.grau || '-', m.funcao || '-', whats, palavra];
                });
                
                dados.sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));
                
                window.gerarPDFRelatorio('Quadro Oficial de Médiuns', ['Nome Completo', 'Nascimento', 'Grau', 'Função', 'WhatsApp', 'Palavra'], dados);
                setTimeout(() => { btn.innerHTML = originalHtml; btn.disabled = false; }, 2000);
            });

            document.getElementById('btnImprimirAniversariantes')?.addEventListener('click', () => {
                const btn = document.getElementById('btnImprimirAniversariantes');
                const originalHtml = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                btn.disabled = true;
                
                const dataAtual = new Date();
                const mesAtualNum = (dataAtual.getMonth() + 1).toString().padStart(2, '0');
                
                const lista = listaMediunsGlobal.filter(m => {
                    if (!m.data_nascimento) return false;
                    let mesNasc = '';
                    if (m.data_nascimento.includes('-')) mesNasc = m.data_nascimento.split('-')[1];
                    else if (m.data_nascimento.includes('/')) mesNasc = m.data_nascimento.split('/')[1];
                    return mesNasc === mesAtualNum;
                });
                
                if(lista.length === 0) {
                    alert("Nenhum aniversariante neste mês para gerar relatório.");
                    btn.innerHTML = originalHtml; btn.disabled = false;
                    return;
                }
                
                lista.sort((a, b) => {
                    let diaA = 0, diaB = 0;
                    if(a.data_nascimento.includes('-')) diaA = parseInt(a.data_nascimento.split('-')[2]);
                    if(b.data_nascimento.includes('-')) diaB = parseInt(b.data_nascimento.split('-')[2]);
                    return diaA - diaB;
                });
                
                const dados = lista.map(m => {
                    let diaMes = '-';
                    if (m.data_nascimento) {
                        if (m.data_nascimento.includes('-')) {
                            const p = m.data_nascimento.split('-');
                            if(p.length === 3) diaMes = `${p[2]}/${p[1]}`;
                        } else {
                            const dataNasc = m.data_nascimento;
                            if(dataNasc.includes('/')) diaMes = dataNasc.substring(0, 5);
                        }
                    }

                    const nomeExibicao = m.nome_completo || 'Médium';
                    const g = m.grau && m.grau !== '-' ? m.grau : '';
                    const f = m.funcao && m.funcao !== '-' ? m.funcao : '';
                    let grauFuncao = '-';
                    if (g && f) grauFuncao = `${g}/${f}`;
                    else grauFuncao = g || f || '-';

                    return [diaMes, nomeExibicao, grauFuncao];
                });
                
                const mesAtual = new Date().toLocaleString('pt-BR', { month: 'long' });
                const titulo = `Aniversariantes de ${mesAtual.charAt(0).toUpperCase() + mesAtual.slice(1)}`;
                
                window.gerarPDFRelatorio(titulo, ['Data', 'Nome', 'Grau'], dados);
                setTimeout(() => { btn.innerHTML = originalHtml; btn.disabled = false; }, 2000);
            });
        }, 500);

        window.abrirModalNovoMedium = () => {
            document.getElementById('msgNovoMedium')?.classList.add('hidden');
            document.getElementById('resultadoNovoMedium')?.classList.add('hidden');
            const f = document.getElementById('formNovoMedium');
            if (f) {
                f.reset();
                f.classList.remove('hidden');
            }
            document.getElementById('modalNovoMedium')?.classList.remove('hidden');
        };

        window.fecharModalNovoMedium = () => {
            document.getElementById('modalNovoMedium')?.classList.add('hidden');
            document.getElementById('menuQuadroMediuns')?.click();
        };

        window.abrirModalEditarMedium = (id) => {
            const medium = listaMediunsGlobal.find(m => m.id === id);
            if (!medium) return alert("Médium não encontrado.");

            document.getElementById('editMediumId').value = medium.id;
            document.getElementById('editMediumNome').value = medium.nome_completo || '';
            document.getElementById('editMediumNomeSocial').value = medium.nome_social || '';
            document.getElementById('editMediumTelefone').value = medium.telefone || '';
            document.getElementById('editMediumNascimento').value = medium.data_nascimento || '';
            document.getElementById('editMediumGrau').value = medium.grau || '-';
            document.getElementById('editMediumFuncao').value = medium.funcao || '-';

            document.getElementById('msgEditMedium')?.classList.add('hidden');
            document.getElementById('modalEditarMedium')?.classList.remove('hidden');
        };

        window.fecharModalEditarMedium = () => {
            document.getElementById('modalEditarMedium')?.classList.add('hidden');
        };

        window.excluirMedium = async (id, nome) => {
            if(!confirm(`ATENÇÃO: Deseja excluir DEFINITIVAMENTE o médium ${nome}?`)) return;
            const { error } = await supabaseClient.from('mediuns').delete().eq('id', id).eq('terreiro_id', idTerreiroGlobal);
            if (error) alert('Erro ao excluir: ' + error.message);
            else { alert('Médium excluído!'); document.getElementById('menuQuadroMediuns')?.click(); }
        };

        window.alternarStatusAtivoMedium = async (id, statusAtual) => {
            const novoStatus = !statusAtual;
            const msg = novoStatus ? "Deseja REATIVAR o acesso deste médium?" : "Deseja INATIVAR este médium? Ele não poderá mais acessar a plataforma.";
            if(!confirm(msg)) return;
            
            const { error } = await supabaseClient.from('mediuns').update({ status_ativo: novoStatus }).eq('id', id).eq('terreiro_id', idTerreiroGlobal);
            if (error) alert('Erro ao alterar status: ' + error.message);
            else document.getElementById('menuQuadroMediuns')?.click();
        };

        window.abrirModalPermissoes = (id, nome, permsString) => {
            document.getElementById('idMediumPermissao').value = id;
            document.getElementById('nomeMediumPermissao').textContent = nome;
            const [pAgenda, pGrau, pFin, pDoa, pAdmin, pVisao, pAta] = permsString.split(',');
            
            document.getElementById('chkPermAgenda').checked = pAgenda === 'true';
            document.getElementById('chkPermGrau').checked = pGrau === 'true';
            document.getElementById('chkPermFinanceiro').checked = pFin === 'true';
            document.getElementById('chkPermDoacoes').checked = pDoa === 'true';
            document.getElementById('chkPermAdmin').checked = pAdmin === 'true';
            if (document.getElementById('chkPermVisao')) document.getElementById('chkPermVisao').checked = pVisao === 'true';
            if (document.getElementById('chkPermAta')) document.getElementById('chkPermAta').checked = pAta === 'true';
            
            document.getElementById('modalPermissoes').classList.remove('hidden');
        };

        document.addEventListener('change', (e) => {
            if(e.target.id === 'giraEspecial') {
                const box = document.getElementById('boxConvocados');
                if(e.target.checked) {
                    box?.classList.remove('hidden');
                    if(typeof renderizarCheckboxesConvocados === 'function') renderizarCheckboxesConvocados('listaCheckConvocados', []);
                } else box?.classList.add('hidden');
            }
            if(e.target.id === 'editGiraEspecial') {
                const box = document.getElementById('editBoxConvocados');
                if(e.target.checked) {
                    box?.classList.remove('hidden');
                } else box?.classList.add('hidden');
            }
        });

        window.atualizarSelecao = (containerId, checkbox) => {
            let arr = window['selecionados_' + containerId] || [];
            if(checkbox.checked) {
                if(!arr.includes(checkbox.value)) arr.push(checkbox.value);
            } else {
                arr = arr.filter(v => v !== checkbox.value);
            }
            window['selecionados_' + containerId] = arr;
        };

        window.filtrarConvocados = (containerId, inputNomeId, selectGrauId) => {
            const termoNome = (document.getElementById(inputNomeId)?.value || '').toLowerCase();
            const termoGrau = (document.getElementById(selectGrauId)?.value || '').toLowerCase();
            
            const filtrados = (listaMediunsGlobal || []).filter(m => {
                const nomeStr = (m.nome_social ? m.nome_social : m.nome_completo).toLowerCase();
                const passaNome = nomeStr.includes(termoNome);
                
                let passaGrau = true;
                if (termoGrau !== '') {
                    const grauCompleto = `${m.grau || ''} ${m.funcao || ''}`.toLowerCase();
                    passaGrau = grauCompleto.includes(termoGrau);
                }
                
                return passaNome && passaGrau;
            });

            const container = document.getElementById(containerId);
            if(!container) return;
            
            let html = '';
            const selecionados = window['selecionados_' + containerId] || [];

            if(filtrados.length === 0) {
                html = '<span class="text-xs text-gray-500 col-span-2 md:col-span-4">Nenhum médium encontrado.</span>';
            } else {
                filtrados.forEach(m => {
                    const idStr = String(m.id);
                    const isChecked = selecionados.includes(idStr) ? 'checked' : '';
                    const nomeExibicao = m.nome_social ? m.nome_social : m.nome_completo;
                    html += `
                        <label class="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 p-1 rounded" title="Grau: ${m.grau || '-'} / Função: ${m.funcao || '-'}">
                            <input type="checkbox" value="${m.id}" class="chk-convocado rounded text-red-500 focus:ring-red-500" ${isChecked} onchange="atualizarSelecao('${containerId}', this)">
                            <span class="truncate">${nomeExibicao}</span>
                        </label>
                    `;
                });
            }
            container.innerHTML = html;
        };

        window.excluirGira = async (id, dataInicioISO) => {
            const dataInicio = new Date(dataInicioISO);
            const agora = new Date();
            const diferencaHoras = (dataInicio - agora) / (1000 * 60 * 60);

            if (diferencaHoras < 2) {
                alert("⚠️ AÇÃO BLOQUEADA: Não é permitido excluir um evento que já iniciou, já passou, ou que começa em menos de 2 horas. Isso evita perda de dados de check-ins.");
                return;
            }

            if (!confirm("Tem certeza que deseja excluir este evento da agenda? A exclusão é irreversível.")) return;

            const { error } = await supabaseClient.from('agenda').delete().eq('id', id).eq('terreiro_id', idTerreiroGlobal);
            if (error) alert("Erro ao excluir o evento: " + error.message);
            else { alert("Evento apagado com sucesso!"); document.getElementById('menuAgendaGiras')?.click(); }
        };

        window.abrirModalEditarGira = async (id) => {
            const { data, error } = await supabaseClient.from('agenda').select('*').eq('id', id).eq('terreiro_id', idTerreiroGlobal).single();
            if (error) { alert("Erro ao buscar dados: " + error.message); return; }

            document.getElementById('editGiraId').value = data.id;
            document.getElementById('editGiraTitulo').value = data.titulo;
            
            const formataParaInput = (isoString) => {
                if (!isoString) return '';
                const dataBanco = new Date(isoString);
                const spDateString = dataBanco.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"});
                const spDate = new Date(spDateString);
                
                const ano = spDate.getFullYear();
                const mes = String(spDate.getMonth() + 1).padStart(2, '0');
                const dia = String(spDate.getDate()).padStart(2, '0');
                const horas = String(spDate.getHours()).padStart(2, '0');
                const minutos = String(spDate.getMinutes()).padStart(2, '0');
                
                return `${ano}-${mes}-${dia}T${horas}:${minutos}`;
            };

            document.getElementById('editGiraInicio').value = formataParaInput(data.data_hora_inicio);
            document.getElementById('editGiraFim').value = formataParaInput(data.data_hora_fim);
            if (document.getElementById('editGiraGeraAta')) document.getElementById('editGiraGeraAta').checked = data.gera_ata || false;

            const chkEspecial = document.getElementById('editGiraEspecial');
            const boxEspecial = document.getElementById('editBoxConvocados');
            if (chkEspecial && boxEspecial) {
                chkEspecial.checked = data.especial || false;
                if (data.especial) boxEspecial.classList.remove('hidden');
                else boxEspecial.classList.add('hidden');
                if(typeof renderizarCheckboxesConvocados === 'function') {
                    renderizarCheckboxesConvocados('editListaCheckConvocados', data.convocados || []);
                }
            }

            document.getElementById('modalEditarGira').classList.remove('hidden');
        };

        window.fecharModalEditarGira = () => document.getElementById('modalEditarGira').classList.add('hidden');

        window.abrirModalEscreverAta = async (id) => {
            try {
                const { data } = await supabaseClient.from('agenda').select('texto_ata').eq('id', id).eq('terreiro_id', idTerreiroGlobal).single();
                document.getElementById('ataEventoId').value = id;
                document.getElementById('ataTexto').value = data?.texto_ata || '';
                document.getElementById('modalEscreverAta').classList.remove('hidden');
                document.getElementById('msgEscreverAta').classList.add('hidden');
            } catch (error) {
                alert("Erro ao buscar texto: " + error.message);
            }
        };

        window.fecharModalEscreverAta = () => {
            document.getElementById('modalEscreverAta').classList.add('hidden');
        };

        window.encerrarAta = async (id) => {
            if(!confirm("Atenção! Ao encerrar a ATA, os check-ins serão bloqueados para este evento e o documento não poderá mais ser alterado. Confirmar fechamento?")) return;
            
            const { error } = await supabaseClient.from('agenda').update({ ata_encerrada: true }).eq('id', id).eq('terreiro_id', idTerreiroGlobal);
            
            if (error) {
                alert("Erro ao encerrar: " + error.message);
            } else {
                alert("Sessão Encerrada! O documento oficial está disponível para download.");
                document.getElementById('menuLivroAta')?.click();
            }
        };

        window.baixarLivroAnual = async () => {
            alert("Atenção: A consolidação do Livro Anual gera arquivo muito pesado. Esta função está sendo adaptada para rodar em segundo plano e será liberada em breve. Por favor, baixe as atas de forma individual na tabela abaixo.");
        };

        window.arquivarAnoAnterior = async () => {
            const anoAtual = new Date().getFullYear();
            if(!confirm(`ATENÇÃO EXTREMA: Você está prestes a excluir definitivamente todas as ATAs anteriores a ${anoAtual}. Certifique-se de já ter baixado e feito backup dos PDFs. Deseja prosseguir com a exclusão?`)) return;
            
            const { error } = await supabaseClient.from('agenda')
                .delete()
                .eq('terreiro_id', idTerreiroGlobal)
                .eq('gera_ata', true)
                .lte('data_hora_inicio', `${anoAtual}-01-01T00:00:00`);
                
            if (error) alert("Erro ao limpar dados antigos: " + error.message);
            else {
                alert("Limpeza do exercício anterior concluída com sucesso!");
                document.getElementById('menuLivroAta')?.click();
            }
        };

        window.gerarPDF_ATA = async (eventoId) => {
            try {
                const { data: evento, error: errEv } = await supabaseClient.from('agenda').select('*').eq('id', eventoId).eq('terreiro_id', idTerreiroGlobal).single();
                if (errEv || !evento) throw new Error("Erro ao buscar dados do evento.");

                const anoEvento = new Date(evento.data_hora_inicio).getFullYear();
                const { data: eventosAnteriores } = await supabaseClient
                    .from('agenda')
                    .select('id')
                    .eq('terreiro_id', idTerreiroGlobal)
                    .eq('gera_ata', true)
                    .gte('data_hora_inicio', `${anoEvento}-01-01T00:00:00`)
                    .lte('data_hora_inicio', evento.data_hora_inicio);
                    
                const numeroAta = eventosAnteriores ? eventosAnteriores.length : 1;

                const { data: presencas } = await supabaseClient.from('presencas').select('data_hora_checkin, usuario_id').eq('evento_id', eventoId).order('data_hora_checkin', { ascending: true });
                
                const { data: mediuns } = await supabaseClient.from('mediuns').select('id, auth_id, nome_completo, nome_social, grau, funcao').eq('terreiro_id', idTerreiroGlobal);
                    
                const mapaMediuns = {};
                if(mediuns) {
                    mediuns.forEach(m => {
                        mapaMediuns[m.id] = m;
                        if(m.auth_id) mapaMediuns[m.auth_id] = m;
                    });
                }

                const dataEv = new Date(evento.data_hora_inicio);
                const dia = dataEv.getDate().toString().padStart(2, '0');
                const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
                const mesExtenso = meses[dataEv.getMonth()];
                const ano = dataEv.getFullYear();
                const hora = dataEv.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                if (presencas && presencas.length > 0) {
                    presencas.sort((a, b) => {
                        const mediumA = mapaMediuns[a.usuario_id] || {};
                        const mediumB = mapaMediuns[b.usuario_id] || {};
                        
                        const isDirigenteA = mediumA.funcao === 'Dirigente' || mediumA.grau === 'Dirigente';
                        const isDirigenteB = mediumB.funcao === 'Dirigente' || mediumB.grau === 'Dirigente';
                        
                        if (isDirigenteA && !isDirigenteB) return -1;
                        if (!isDirigenteA && isDirigenteB) return 1;
                        
                        const timeA = new Date(a.data_hora_checkin).getTime();
                        const timeB = new Date(b.data_hora_checkin).getTime();
                        
                        return timeA - timeB;
                    });
                }

                let trs = '';
                if (presencas && presencas.length > 0) {
                    presencas.forEach((p, index) => {
                        const medium = mapaMediuns[p.usuario_id] || { nome_completo: 'Médium não identificado', grau: '-', funcao: '-' };
                        const nomeFinal = medium.nome_completo;
                        const horaCheckin = new Date(p.data_hora_checkin).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                        
                        let grauExibicao = '-';
                        const gStr = medium.grau && medium.grau !== '-' ? medium.grau : '';
                        const fStr = medium.funcao && medium.funcao !== '-' ? medium.funcao : '';
                        if (gStr && fStr) grauExibicao = `${gStr}/${fStr}`;
                        else if (gStr) grauExibicao = gStr;
                        else if (fStr) grauExibicao = fStr;

                        const isDirigente = medium.funcao === 'Dirigente' || medium.grau === 'Dirigente';
                        const estiloLinha = isDirigente ? 'font-weight: bold; background-color: #f8fafc;' : '';
                        
                        let borderStyle = '1px solid #ddd';
                        const nextP = presencas[index + 1];
                        if (isDirigente && nextP) {
                            const nextMedium = mapaMediuns[nextP.usuario_id] || {};
                            const isNextDirigente = nextMedium.funcao === 'Dirigente' || nextMedium.grau === 'Dirigente';
                            if (!isNextDirigente) {
                                borderStyle = '2px solid #000'; 
                            }
                        }

                        trs += `
                            <tr style="${estiloLinha}">
                                <td style="border-bottom: ${borderStyle}; padding: 6px 4px;">${nomeFinal}</td>
                                <td style="border-bottom: ${borderStyle}; padding: 6px 4px; text-align: center;">${grauExibicao}</td>
                                <td style="border-bottom: ${borderStyle}; padding: 6px 4px; text-align: right;">${horaCheckin}</td>
                            </tr>
                        `;
                    });
                } else {
                    trs = `<tr><td colspan="3" style="text-align: center; padding: 20px; font-style: italic;">Nenhum check-in registrado na plataforma para esta data.</td></tr>`;
                }

                const nomeCasa = nomeTerreiroGlobal || 'Templo';
                
                let watermarkAta = '';
                if (logoTerreiroGlobal) {
                    watermarkAta = `<div style="position: absolute; top: 45%; left: 50%; transform: translate(-50%, -50%); opacity: 0.1; z-index: 0; pointer-events: none;">
                                        <img src="${logoTerreiroGlobal}" style="width: 450px; max-width: 80%;">
                                     </div>`;
                }

                const corpoTextoAta = evento.texto_ata 
                    ? `<p style="text-align: justify; line-height: 1.8; font-size: 14px; margin-bottom: 30px; white-space: pre-wrap;">${evento.texto_ata}</p>`
                    : `<p style="text-align: justify; line-height: 1.8; font-size: 14px; margin-bottom: 30px; text-indent: 40px;">
                        Aos <strong>${dia}</strong> dias do mês de <strong>${mesExtenso}</strong> do ano de <strong>${ano}</strong>,
                        com início às <strong>${hora}</strong>, realizou-se a sessão de <strong>${evento.titulo}</strong> nas dependências
                        do templo <strong>${nomeCasa}</strong>. Abaixo, assinam digitalmente, através de validação
                        presencial por geolocalização no sistema, os médiuns que compuseram a corrente neste trabalho:
                       </p>`;

                const div = document.createElement('div');
                div.style.padding = '40px';
                div.style.fontFamily = 'Arial, sans-serif';
                div.style.color = '#000';
                div.style.backgroundColor = '#fff';
                div.style.position = 'relative';
                
                div.innerHTML = `
                    ${watermarkAta}
                    <div style="position: relative; z-index: 1;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            ${logoTerreiroGlobal ? `<img src="${logoTerreiroGlobal}" style="max-height: 80px; margin-bottom: 15px;">` : ''}
                            <h1 style="font-size: 20px; font-weight: bold; text-transform: uppercase; margin: 0 0 5px 0;">${nomeCasa}</h1>
                            <h2 style="font-size: 16px; font-weight: normal; margin: 0; letter-spacing: 2px;">LIVRO DE ATAS E PRESENÇAS</h2>
                        </div>
                        
                        <h3 style="text-align: center; font-size: 16px; margin-bottom: 25px; text-transform: uppercase; background-color: rgba(243, 244, 246, 0.9); padding: 10px; border-radius: 4px;">
                            ATA Nº ${numeroAta.toString().padStart(3, '0')}/${ano} - ${evento.titulo}
                        </h3>
                        
                        ${corpoTextoAta}
                        
                        <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 40px; background-color: rgba(255, 255, 255, 0.6);">
                            <thead>
                                <tr>
                                    <th style="border-bottom: 2px solid #000; padding: 8px 4px; text-align: left;">NOME DO MÉDIUM</th>
                                    <th style="border-bottom: 2px solid #000; padding: 8px 4px; text-align: center;">GRAU</th>
                                    <th style="border-bottom: 2px solid #000; padding: 8px 4px; text-align: right;">HORA DO CHECK-IN</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${trs}
                            </tbody>
                        </table>
                        
                        <div style="margin-top: 60px; text-align: center; page-break-inside: avoid;">
                            <p style="margin: 0;">________________________________________________________</p>
                            <p style="font-size: 14px; margin-top: 5px;"><strong>Direção / Presidência</strong></p>
                            <p style="font-size: 10px; color: #777; margin-top: 25px;">
                                ATA gerada eletronicamente pelo Sistema de Gestão em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
                            </p>
                        </div>
                    </div>
                `;

                const opt = {
                    margin:       10,
                    filename:     `ATA_${numeroAta.toString().padStart(3, '0')}_${ano}_${evento.titulo.replace(/\s+/g, '_')}.pdf`,
                    image:        { type: 'jpeg', quality: 0.98 },
                    html2canvas:  { scale: 2, useCORS: true },
                    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };

                alert("Gerando Livro de Presença (PDF)... Aguarde um instante.");
                html2pdf().set(opt).from(div).save();

            } catch (error) {
                console.error(error);
                alert("Não foi possível gerar a ATA: " + error.message);
            }
        };

        window.salvarGrau = async (id) => {
            const btn = document.getElementById(`btnGrau_${id}`);
            const grau = document.getElementById(`grau_${id}`).value;
            const funcao = document.getElementById(`func_${id}`).value;
            btn.innerHTML = 'Salvando...'; btn.disabled = true;
            const { error } = await supabaseClient.from('mediuns').update({ grau, funcao }).eq('id', id).eq('terreiro_id', idTerreiroGlobal);
            btn.disabled = false;
            if (error) { btn.innerHTML = 'Erro!'; btn.classList.replace('bg-tema-primaria', 'bg-red-500'); } 
            else {
                btn.innerHTML = 'Salvo <i class="fas fa-check"></i>'; btn.classList.replace('bg-tema-primaria', 'bg-green-600');
                setTimeout(() => { btn.innerHTML = 'Salvar'; btn.classList.replace('bg-green-600', 'bg-tema-primaria'); }, 2000);
                const md = mediunsGrauCache.find(m => m.id === id);
                if(md) { md.grau = grau; md.funcao = funcao; }
            }
        };

        window.marcarDoacao = async (id, status) => {
            const payload = { entregue: status, data_entrega: status ? new Date().toISOString() : null };
            const { error } = await supabaseClient.from('doacoes_registradas').update(payload).eq('id', id).eq('terreiro_id', idTerreiroGlobal);
            if (!error) {
                if(typeof window.carregarDoacoesPrometidas === 'function') window.carregarDoacoesPrometidas();
            } else alert('Erro: ' + error.message);
        };

        window.excluirDoacao = async (id) => {
            if (!confirm('Deseja excluir este registo de doação permanentemente?')) return;
            const { error } = await supabaseClient.from('doacoes_registradas').delete().eq('id', id).eq('terreiro_id', idTerreiroGlobal);
            if (!error) {
                if(typeof window.carregarDoacoesPrometidas === 'function') window.carregarDoacoesPrometidas();
            } else alert('Erro ao excluir: ' + error.message);
        };

        window.alternarStatusCatalogo = async (id, status) => {
            const { error } = await supabaseClient.from('itens_doacao').update({ ativo: status }).eq('id', id).eq('terreiro_id', idTerreiroGlobal);
            if (!error) {
                if(typeof window.carregarDoacoesCatalogo === 'function') window.carregarDoacoesCatalogo();
            }
        };

        window.alternarModuloMensalidade = async (idTerreiro, vaiAtivar) => {
            const msg = vaiAtivar ? "Deseja ATIVAR o módulo de Tesouraria/Mensalidades para este Terreiro?" : "Desativar o módulo de Mensalidades deste Terreiro?";
            if(!confirm(msg)) return;
            const { error } = await supabaseClient.from('terreiros').update({ modulo_mensalidade_ativo: vaiAtivar }).eq('id', idTerreiro);
            if(error) alert("Erro: " + error.message); else document.getElementById('menuMaster')?.click();
        };

        window.acessarTerreiroSaaS = (idTerreiro) => {
            localStorage.setItem('terreiroAtivoSaaS', idTerreiro);
            window.location.reload();
        };

        window.voltarParaMeuPainel = () => {
            localStorage.removeItem('terreiroAtivoSaaS');
            window.location.reload();
        };

        window.alternarBloqueioTerreiro = async (idTerreiro, vaiBloquear) => {
            const acaoStr = vaiBloquear ? "BLOQUEAR" : "DESBLOQUEAR";
            if(!confirm(`Deseja ${acaoStr} o terreiro ID ${idTerreiro}?`)) return;
            const { error } = await supabaseClient.from('terreiros').update({ status_bloqueado: vaiBloquear }).eq('id', idTerreiro);
            if(error) alert("Erro: " + error.message); else document.getElementById('menuMaster')?.click();
        };

        window.abrirModalImportacao = (idTerreiro, nomeTerreiro) => {
            document.getElementById('idTerreiroImport').value = idTerreiro;
            document.getElementById('nomeTerreiroImport').textContent = nomeTerreiro;
            document.getElementById('msgImportacao')?.classList.add('hidden');
            if (document.getElementById('formImportarCSV')) document.getElementById('formImportarCSV').reset();
            document.getElementById('modalImportarCSV')?.classList.remove('hidden');
        };

        window.fecharModalImportacao = () => {
            document.getElementById('modalImportarCSV')?.classList.add('hidden');
        };
