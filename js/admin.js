let idTerreiroGlobal = null; 
let mediunsGrauCache = []; 
let perfilAdminLogado = null; 

let nomeTerreiroGlobal = "";
let logoTerreiroGlobal = "";
let mapaGlobal = null;
let marcadorGlobal = null;
let circuloGlobal = null;

// ==============================================================================
// FUNÇÃO UTILITÁRIA: COMPRESSÃO E REDIMENSIONAMENTO DE IMAGEM NO CLIENTE
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
        
        let terreiroSaaSForcado = null;
        let emModoMasterPuro = false;
        
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
            ['menuVisaoGeral', 'menuQuadroMediuns', 'menuAgendaGiras', 'menuLivroAta', 'menuGrau', 'menuFinanceiro', 'menuDoacoes', 'menuAdmin'].forEach(id => {
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
                if (!perfil.perm_financeiro && document.getElementById('menuFinanceiro')) document.getElementById('menuFinanceiro').classList.add('hidden');
                if (!perfil.perm_doacoes && document.getElementById('menuDoacoes')) document.getElementById('menuDoacoes').classList.add('hidden');
                if (!perfil.perm_admin && document.getElementById('menuAdmin')) document.getElementById('menuAdmin').classList.add('hidden');
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
                    carregarLivroAta();
                } else if (menu.id === 'menuGrau') {
                    document.getElementById('secGrau')?.classList.remove('hidden');
                    aplicarTitulos('Alteração de Grau');
                    carregarTabelaGraus();
                } else if (menu.id === 'menuFinanceiro') {
                    document.getElementById('secFinanceiro')?.classList.remove('hidden');
                    aplicarTitulos('Controle Financeiro');
                    carregarFinanceiro();
                } else if (menu.id === 'menuDoacoes') {
                    document.getElementById('secDoacoes')?.classList.remove('hidden');
                    aplicarTitulos('Doações e Campanhas');
                    carregarDoacoesPrometidas();
                    carregarDoacoesCatalogo();
                } else if (menu.id === 'menuAdmin') {
                    document.getElementById('secAdministracao')?.classList.remove('hidden');
                    aplicarTitulos('Configurações da Casa');
                    carregarConfiguracoesCasa();
                } else if (menu.id === 'menuMaster') {
                    document.getElementById('secMaster')?.classList.remove('hidden');
                    aplicarTitulos('Gestão da Plataforma (SaaS)');
                    carregarGestaoPlataforma();
                }

                if (window.innerWidth < 768 && sidebar && overlayMobile) {
                    sidebar.classList.add('-translate-x-full');
                    overlayMobile.classList.add('hidden');
                }
            });
        });

        if (emModoMasterPuro) {
            document.getElementById('menuMaster')?.click();
        } else if (perfil.is_admin || perfil.perm_visao_geral) {
            document.getElementById('menuVisaoGeral')?.click();
        } else {
            if (perfil.perm_agenda) document.getElementById('menuAgendaGiras')?.click();
            else if (perfil.perm_ata) document.getElementById('menuLivroAta')?.click();
            else if (perfil.perm_grau) document.getElementById('menuGrau')?.click();
            else if (perfil.perm_financeiro) document.getElementById('menuFinanceiro')?.click();
            else if (perfil.perm_doacoes) document.getElementById('menuDoacoes')?.click();
            else if (perfil.perm_admin) document.getElementById('menuAdmin')?.click();
            else document.getElementById('menuQuadroMediuns')?.click(); 
        }

        // ========================================================
        // ATIVAÇÃO DO BOTÃO "EXPORTAR PDF" DAS DOAÇÕES
        // ========================================================
        const btnPDFDoacoes = document.getElementById('btnGerarPDF_doacoes');
        if (btnPDFDoacoes) {
            btnPDFDoacoes.addEventListener('click', () => {
                if (!window.dadosDoacoesParaPDF || !window.dadosDoacoesParaPDF.doacoes || window.dadosDoacoesParaPDF.doacoes.length === 0) {
                    alert('Nenhuma doação registrada para exportar.');
                    return;
                }

                const { doacoes, mediuns, itens } = window.dadosDoacoesParaPDF;
                const dados = doacoes.map(d => {
                    const mdEncontrado = mediuns?.find(m => m.auth_id === d.medium_auth_id || String(m.id) === String(d.medium_auth_id));
                    const medium = mdEncontrado ? (mdEncontrado.nome_social || mdEncontrado.nome_completo) : 'Médium Desconhecido';
                    const itemObj = itens?.find(i => String(i.id) === String(d.item_id));
                    const itemNome = itemObj ? itemObj.nome : 'Item Desconhecido';
                    const dataFormatada = new Date(d.data_registro).toLocaleDateString('pt-BR');
                    const status = d.entregue ? 'Entregue' : 'Pendente';
                    return [medium, itemNome, String(d.quantidade), dataFormatada, status];
                });

                // Ordenação Alfabética do PDF de Doações
                dados.sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));

                window.gerarPDFRelatorio('Relatório de Doações Registradas', ['Médium', 'Item', 'Qtd', 'Data', 'Status'], dados);
            });
        }

    } catch (error) {
        console.error('Erro geral ao inicializar painel:', error);
    }

    // ==========================================
    // VISÃO GERAL
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
                            const nome = md ? (md.nome_social || md.nome_completo) : 'Médium Excluído';
                            const hora = new Date(p.data_hora_checkin).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                            arrayPresencasVisuais.push({ nome, hora });
                        });

                        // Ordenação Alfabética da Tabela de Presenças Diárias
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
                        const dataFormatada = new Date(ev.data_hora_inicio).
