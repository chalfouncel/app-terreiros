let idTerreiroGlobal = null; 
let mediunsGrauCache = []; 
let perfilAdminLogado = null; 

let nomeTerreiroGlobal = "";
let logoTerreiroGlobal = "";
let mapaGlobal = null;
let marcadorGlobal = null;
let circuloGlobal = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Data Cabeçalho
    const dataOpcoes = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dataStr = new Date().toLocaleDateString('pt-BR', dataOpcoes);
    document.getElementById('dataHoje').textContent = dataStr;
    if(document.getElementById('dataHojeMobile')) document.getElementById('dataHojeMobile').textContent = dataStr;

    // Controle do Menu Mobile
    const sidebar = document.getElementById('sidebar');
    const overlayMobile = document.getElementById('overlayMobile');
    const btnAbrirMenu = document.getElementById('btnAbrirMenu');
    const btnFecharMenu = document.getElementById('btnFecharMenu');

    function toggleMenu() {
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

    // Verifica Sessão
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return window.location.href = 'index.html';

    // Botão Sair
    const btnSair = document.getElementById('btnSair');
    if (btnSair) {
        btnSair.addEventListener('click', async () => {
            btnSair.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saindo...';
            await supabaseClient.auth.signOut(); 
            localStorage.clear(); 
            window.location.href = 'index.html'; 
        });
    }

    try {
        const { data: perfil, error: erroPerfil } = await supabaseClient
            .from('mediuns')
            .select('nome_completo, is_admin, terreiro_id, perm_agenda, perm_grau, perm_financeiro, perm_doacoes, perm_admin, is_master, perm_visao_geral, perm_ata')
            .eq('auth_id', session.user.id)
            .single();

        if (erroPerfil) throw erroPerfil;
        perfilAdminLogado = perfil;

        // INCLUI A CHECAGEM DE IS_MASTER PARA NÃO BARRAR O ACESSO AO PAINEL NEUTRO
        const temAcessoPainel = perfil.is_admin || perfil.perm_visao_geral || perfil.perm_agenda || perfil.perm_grau || perfil.perm_financeiro || perfil.perm_doacoes || perfil.perm_admin || perfil.perm_ata || perfil.is_master;

        if (!temAcessoPainel) {
            alert('Acesso negado. Você não tem permissão para acessar o Painel de Gestão.');
            return window.location.href = 'presenca.html';
        }
        
        // --- INÍCIO DA LÓGICA DE TROCA DE CONTEXTO SaaS ---
        let terreiroSaaSForcado = null;
        let emModoMasterPuro = false;
        
        if (perfil.is_master) {
            const menuMaster = document.getElementById('menuMaster');
            if (menuMaster) menuMaster.classList.remove('hidden');
            
            // Verifica se o master clicou para acessar um terreiro específico (Cliente)
            terreiroSaaSForcado = localStorage.getItem('terreiroAtivoSaaS');
            
            if (terreiroSaaSForcado) {
                // MODO SUPORTE (Simulando o painel de um cliente)
                idTerreiroGlobal = terreiroSaaSForcado;
                
                // Cria um aviso visual no topo da tela para você não esquecer que está no cliente
                const avisoInfiltrado = document.createElement('div');
                avisoInfiltrado.className = "bg-red-600 text-white text-center py-2 px-4 font-bold text-sm shadow-md z-50 flex flex-col md:flex-row justify-center items-center gap-2 md:space-x-4 flex-shrink-0";
                avisoInfiltrado.innerHTML = `
                    <span><i class="fas fa-user-secret mr-2"></i> MODO SUPORTE: Você está logado no painel do cliente.</span>
                    <button onclick="voltarParaMeuPainel()" class="bg-white text-red-600 px-3 py-1 rounded text-xs font-bold hover:bg-gray-100 shadow transition border border-red-200">Sair do Modo Suporte</button>
                `;
                
                // Insere o banner logo no começo da coluna de conteúdo principal
                const containerPrincipal = document.querySelector('.flex-1.flex-col') || document.body;
                containerPrincipal.insertBefore(avisoInfiltrado, containerPrincipal.firstChild);

                // No Modo Suporte, forçamos todas as permissões para True para você conseguir resolver qualquer problema
                perfil.is_admin = true;
                perfil.perm_visao_geral = true;
                perfil.perm_agenda = true;
                perfil.perm_ata = true;
                perfil.perm_grau = true;
                perfil.perm_financeiro = true;
                perfil.perm_doacoes = true;
                perfil.perm_admin = true;
            } else {
                // MODO MASTER PURO (Acessou para ver clientes, não um terreiro específico)
                emModoMasterPuro = true;
                idTerreiroGlobal = null;
            }
        } else {
            // USUÁRIO COMUM (Dirigente ou Admin de Terreiro normal)
            idTerreiroGlobal = perfil.terreiro_id;
        }
        // --- FIM DA LÓGICA DE TROCA DE CONTEXTO ---

        // Ocultar menus indesejados baseado no contexto ou permissões
        if (emModoMasterPuro) {
            // Se está no Master Puro, não faz sentido mostrar Quadro de Médium, Agenda, etc. Ocultamos tudo.
            ['menuVisaoGeral', 'menuQuadroMediuns', 'menuAgendaGiras', 'menuLivroAta', 'menuGrau', 'menuFinanceiro', 'menuDoacoes', 'menuAdmin'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('hidden');
            });
            // Oculta os separadores (hr) do sidebar
            document.querySelectorAll('#sidebar hr').forEach(hr => hr.classList.add('hidden'));
            
            document.getElementById('nomeTerreiroSidebar').textContent = "Gestão SaaS";
        } else {
            // Lógica normal de ocultar menus para usuários de terreiro baseados em suas permissões
            if (!perfil.is_admin) {
                if (!perfil.perm_visao_geral) document.getElementById('menuVisaoGeral').classList.add('hidden');
                if (!perfil.perm_agenda) document.getElementById('menuAgendaGiras').classList.add('hidden');
                if (!perfil.perm_ata) { 
                    const menuAta = document.getElementById('menuLivroAta');
                    if(menuAta) menuAta.classList.add('hidden');
                }
                if (!perfil.perm_grau) document.getElementById('menuGrau').classList.add('hidden');
                if (!perfil.perm_financeiro) document.getElementById('menuFinanceiro').classList.add('hidden');
                if (!perfil.perm_doacoes) document.getElementById('menuDoacoes').classList.add('hidden');
                if (!perfil.perm_admin) document.getElementById('menuAdmin').classList.add('hidden');
            }
        }

        document.getElementById('nomeAdmin').textContent = 'Olá, ' + perfil.nome_completo.split(' ')[0];
        
        // Só carrega detalhes (cores/logo) se existir um terreiro em foco
        if (idTerreiroGlobal) {
            const { data: terreiro } = await supabaseClient
                .from('terreiros')
                .select('nome, logo_url, cor_primaria, cor_secundaria, cor_fundo, cor_texto')
                .eq('id', idTerreiroGlobal)
                .single();
            
            if (terreiro) {
                nomeTerreiroGlobal = terreiro.nome;
                logoTerreiroGlobal = terreiro.logo_url;
                document.getElementById('nomeTerreiroSidebar').textContent = terreiro.nome;
                
                const root = document.documentElement;
                if(terreiro.cor_primaria) root.style.setProperty('--cor-primaria', terreiro.cor_primaria);
                if(terreiro.cor_secundaria) root.style.setProperty('--cor-secundaria', terreiro.cor_secundaria);
                if(terreiro.cor_fundo) root.style.setProperty('--cor-fundo', terreiro.cor_fundo);
                if(terreiro.cor_texto) root.style.setProperty('--cor-texto', terreiro.cor_texto);

                if(terreiro.logo_url) {
                    const img = document.getElementById('logoSidebar');
                    img.src = terreiro.logo_url;
                    img.classList.remove('hidden');

                    let linkFavicon = document.querySelector("link[rel~='icon']");
                    if (!linkFavicon) {
                        linkFavicon = document.createElement('link');
                        linkFavicon.rel = 'icon';
                        document.head.appendChild(linkFavicon);
                    }
                    linkFavicon.href = terreiro.logo_url;
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
                
                if (menu.id === 'menuVisaoGeral') {
                    document.getElementById('secVisaoGeral').classList.remove('hidden');
                    titulo.textContent = 'Visão Geral';
                    carregarPainelInicial();
                } else if (menu.id === 'menuQuadroMediuns') {
                    document.getElementById('secQuadroMediuns').classList.remove('hidden');
                    titulo.textContent = 'Quadro de Médiuns';
                    carregarQuadroMediuns();
                } else if (menu.id === 'menuAgendaGiras') {
                    document.getElementById('secAgendaGiras').classList.remove('hidden');
                    titulo.textContent = 'Agenda de Eventos';
                    carregarAgenda();
                } else if (menu.id === 'menuLivroAta') {
                    document.getElementById('secLivroAta').classList.remove('hidden');
                    titulo.textContent = 'Livro de Presença (ATA)';
                    carregarLivroAta();
                } else if (menu.id === 'menuGrau') {
                    document.getElementById('secGrau').classList.remove('hidden');
                    titulo.textContent = 'Alteração de Grau';
                    carregarTabelaGraus();
                } else if (menu.id === 'menuFinanceiro') {
                    document.getElementById('secFinanceiro').classList.remove('hidden');
                    titulo.textContent = 'Controle Financeiro';
                    carregarFinanceiro();
                } else if (menu.id === 'menuDoacoes') {
                    document.getElementById('secDoacoes').classList.remove('hidden');
                    titulo.textContent = 'Doações e Campanhas';
                    carregarDoacoesPrometidas();
                    carregarDoacoesCatalogo();
                } else if (menu.id === 'menuAdmin') {
                    document.getElementById('secAdministracao').classList.remove('hidden');
                    titulo.textContent = 'Configurações da Casa';
                    carregarConfiguracoesCasa();
                } else if (menu.id === 'menuMaster') {
                    document.getElementById('secMaster').classList.remove('hidden');
                    titulo.textContent = 'Gestão da Plataforma (SaaS)';
                    carregarGestaoPlataforma();
                }
            });
        });

        // DEFINIÇÃO DA TELA INICIAL
        if (emModoMasterPuro) {
            // Se for o dono do sistema entrando, joga logo pra aba de Gestão
            const m = document.getElementById('menuMaster');
            if(m) m.click();
        } else if (perfil.is_admin || perfil.perm_visao_geral) {
            document.getElementById('menuVisaoGeral').click();
        } else {
            // Fallback: Entra na primeira que achar permitida
            if (perfil.perm_agenda) document.getElementById('menuAgendaGiras').click();
            else if (perfil.perm_ata) document.getElementById('menuLivroAta').click();
            else if (perfil.perm_grau) document.getElementById('menuGrau').click();
            else if (perfil.perm_financeiro) document.getElementById('menuFinanceiro').click();
            else if (perfil.perm_doacoes) document.getElementById('menuDoacoes').click();
            else if (perfil.perm_admin) document.getElementById('menuAdmin').click();
            else document.getElementById('menuQuadroMediuns').click(); 
        }

    } catch (error) {
        console.error('Erro geral ao carregar a página:', error);
    }

    // ==========================================
    // VISÃO GERAL
    // ==========================================
    async function carregarPainelInicial() {
        if(!idTerreiroGlobal) return; // Segurança caso acesse acidentalmente no master puro
        const { count: totalMediuns } = await supabaseClient.from('mediuns').select('*', { count: 'exact', head: true }).eq('terreiro_id', idTerreiroGlobal);
        document.getElementById('totalMediuns').textContent = totalMediuns || '0';

        const agora = new Date().toISOString();
        const { data: agendaData } = await supabaseClient.from('agenda').select('*').eq('terreiro_id', idTerreiroGlobal).gte('data_hora_fim', agora).order('data_hora_inicio').limit(1);

        let giraAtualId = null;
        if (agendaData && agendaData.length > 0) {
            giraAtualId = agendaData[0].id;
            const dataGira = new Date(agendaData[0].data_hora_inicio).toLocaleString('pt-BR');
            document.getElementById('proximaGira').innerHTML = `${agendaData[0].titulo} <br><span class="text-sm font-normal text-gray-500">${dataGira}</span>`;
        } else {
            document.getElementById('proximaGira').textContent = 'Nenhum evento agendado';
        }

        const tabelaPresencas = document.getElementById('tabelaPresencas');
        if (giraAtualId) {
            const { data: presencas } = await supabaseClient.from('presencas').select('usuario_id, data_hora_checkin').eq('evento_id', giraAtualId).order('data_hora_checkin', { ascending: false });
            const { data: todosMediuns } = await supabaseClient.from('mediuns').select('id, auth_id, nome_completo').eq('terreiro_id', idTerreiroGlobal);
            
            document.getElementById('totalPresentes').textContent = presencas ? presencas.length : '0';

            if (presencas && presencas.length > 0) {
                tabelaPresencas.innerHTML = ''; 
                presencas.forEach(p => {
                    const md = todosMediuns?.find(m => m.auth_id === p.usuario_id || String(m.id) === String(p.usuario_id));
                    const nome = md ? md.nome_completo : 'Médium Excluído';
                    const hora = new Date(p.data_hora_checkin).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    tabelaPresencas.innerHTML += `<tr class="border-b border-gray-100 hover:bg-gray-50"><td class="p-3 text-gray-800 font-medium">${nome}</td><td class="p-3 text-gray-600">${hora}</td><td class="p-3"><span class="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">PRESENTE</span></td></tr>`;
                });
            } else {
                tabelaPresencas.innerHTML = `<tr><td colspan="3" class="p-6 text-center text-gray-500">Nenhum check-in ainda.</td></tr>`;
            }
        }
    }

    // ==========================================
    // QUADRO DE MÉDIUNS
    // ==========================================
    let listaMediunsGlobal = []; 

    async function carregarQuadroMediuns() {
        if(!idTerreiroGlobal) return;
        const tbody = document.getElementById('tabelaTodosMediuns');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8 text-gray-500"><i class="fas fa-spinner fa-spin mr-2"></i>Buscando corrente...</td></tr>';

        try {
            const { data, error } = await supabaseClient
                .from('mediuns')
                .select('id, nome_completo, nome_social, data_nascimento, grau, funcao, telefone, cadastro_completo, is_admin, perm_agenda, perm_grau, perm_financeiro, perm_doacoes, perm_admin, perm_visao_geral, perm_ata')
                .eq('terreiro_id', idTerreiroGlobal)
                .order('nome_completo');

            if (error) throw error;

            listaMediunsGlobal = data || [];
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
            const status = m.cadastro_completo ? '<span class="text-green-600 font-bold">Ativo</span>' : '<span class="text-yellow-600 font-bold">Pendente</span>';
            
            let acoesHtml = '<span class="text-gray-400 text-xs">Sem acesso</span>';
            
            if (perfilAdminLogado && perfilAdminLogado.is_admin) {
                const perms = `${m.perm_agenda || false},${m.perm_grau || false},${m.perm_financeiro || false},${m.perm_doacoes || false},${m.perm_admin || false},${m.perm_visao_geral || false},${m.perm_ata || false}`;
                acoesHtml = `
                    <div class="flex items-center justify-center space-x-4">
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

        window.aniversariantesAtuais = aniversariantes; // Salva para a impressão de PDF

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

    function aplicarFiltrosMediuns() {
        const termoNome = (document.getElementById('filtroNomeMedium')?.value || '').toLowerCase();
        const termoGrau = document.getElementById('filtroGrauMedium')?.value || '';
        const termoStatus = document.getElementById('filtroStatusMedium')?.value || '';
        const termoMes = document.getElementById('filtroMesNascimento')?.value || '';

        const listaFiltrada = listaMediunsGlobal.filter(medium => {
            const nomeCompletoStr = (medium.nome_completo || '').toLowerCase();
            const nomeSocialStr = (medium.nome_social || '').toLowerCase();
            const passaNome = nomeCompletoStr.includes(termoNome) || nomeSocialStr.includes(termoNome);

            let passaGrau = true;
            if (termoGrau !== '') {
                const grauStr = `${medium.grau || ''} ${medium.funcao || ''}`.toLowerCase();
                passaGrau = grauStr.includes(termoGrau.toLowerCase());
            }

            let passaStatus = true;
            const statusAtual = medium.cadastro_completo ? 'Ativo' : 'Pendente';
            if (termoStatus !== '') {
                passaStatus = (statusAtual === termoStatus);
            }

            let passaMes = true;
            if (termoMes !== '') {
                if (!medium.data_nascimento) {
                    passaMes = false;
                } else {
                    let mesNasc = '';
                    if (medium.data_nascimento.includes('-')) mesNasc = medium.data_nascimento.split('-')[1];
                    else if (medium.data_nascimento.includes('/')) mesNasc = medium.data_nascimento.split('/')[1];
                    
                    passaMes = (mesNasc === termoMes);
                }
            }

            return passaNome && passaGrau && passaStatus && passaMes;
        });

        renderizarTabelaMediuns(listaFiltrada);
    }

    // Função universal e otimizada para gerar relatórios em PDF (A4) com marca d'água
    window.gerarPDFRelatorio = (titulo, colunas, dados) => {
        const containerPDF = document.createElement('div');
        containerPDF.style.padding = '20px 30px';
        containerPDF.style.fontFamily = 'Arial, sans-serif';
        containerPDF.style.color = '#333';
        containerPDF.style.position = 'relative';

        // Marca d'água centralizada com o Logo (super discreta)
        let watermark = '';
        if (logoTerreiroGlobal) {
            watermark = `<div style="position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%); opacity: 0.08; z-index: -1; pointer-events: none;">
                            <img src="${logoTerreiroGlobal}" style="width: 400px; max-width: 80%;">
                         </div>`;
        }

        let html = `
            ${watermark}
            <div style="text-align: center; margin-bottom: 15px; border-bottom: 2px solid #16a34a; padding-bottom: 10px;">
                <h2 style="margin: 0; color: #1e3a8a; font-size: 20px; text-transform: uppercase;">${nomeTerreiroGlobal || 'Templo'}</h2>
                <h3 style="margin: 4px 0 0 0; color: #444; font-size: 16px;">${titulo}</h3>
                <p style="margin: 4px 0 0 0; color: #666; font-size: 11px;">Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
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

    // Configuração dos eventos de Filtro e PDF
    setTimeout(() => {
        document.getElementById('filtroNomeMedium')?.addEventListener('input', aplicarFiltrosMediuns);
        document.getElementById('filtroGrauMedium')?.addEventListener('change', aplicarFiltrosMediuns);
        document.getElementById('filtroStatusMedium')?.addEventListener('change', aplicarFiltrosMediuns);
        document.getElementById('filtroMesNascimento')?.addEventListener('change', aplicarFiltrosMediuns);
        
        // Botão PDF: Quadro Geral
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
                const nomeStr = m.nome_social ? `${m.nome_completo} (${m.nome_social})` : m.nome_completo;
                const whats = m.telefone || '-';
                
                return [nomeStr, dataNasc, m.grau || '-', m.funcao || '-', whats];
            });
            
            window.gerarPDFRelatorio('Quadro Oficial de Médiuns', ['Nome Completo', 'Nascimento', 'Grau', 'Função', 'WhatsApp'], dados);
            
            setTimeout(() => { btn.innerHTML = originalHtml; btn.disabled = false; }, 2000);
        });

        // Botão PDF: Aniversariantes
        document.getElementById('btnImprimirAniversariantes')?.addEventListener('click', () => {
            const btn = document.getElementById('btnImprimirAniversariantes');
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btn.disabled = true;
            
            const lista = window.aniversariantesAtuais || [];
            if(lista.length === 0) {
                alert("Nenhum aniversariante neste mês para gerar relatório.");
                btn.innerHTML = originalHtml;
                btn.disabled = false;
                return;
            }
            
            const dados = lista.map(m => {
                let dataNasc = '-';
                let diaMes = '-';
                if (m.data_nascimento) {
                    if (m.data_nascimento.includes('-')) {
                        const p = m.data_nascimento.split('-');
                        if(p.length === 3) {
                            dataNasc = `${p[2]}/${p[1]}/${p[0]}`;
                            diaMes = `${p[2]}/${p[1]}`;
                        }
                    } else {
                        dataNasc = m.data_nascimento;
                        if(dataNasc.includes('/')) diaMes = dataNasc.substring(0, 5);
                    }
                }
                const nomeStr = m.nome_social ? `${m.nome_completo} (${m.nome_social})` : m.nome_completo;
                
                return [diaMes, nomeStr, m.grau || '-', dataNasc];
            });
            
            const mesAtual = new Date().toLocaleString('pt-BR', { month: 'long' });
            const titulo = `Aniversariantes de ${mesAtual.charAt(0).toUpperCase() + mesAtual.slice(1)}`;
            
            window.gerarPDFRelatorio(titulo, ['Dia', 'Nome Completo', 'Grau', 'Nascimento'], dados);
            
            setTimeout(() => { btn.innerHTML = originalHtml; btn.disabled = false; }, 2000);
        });
    }, 500);

    window.abrirModalNovoMedium = () => {
        document.getElementById('msgNovoMedium').classList.add('hidden');
        document.getElementById('resultadoNovoMedium').classList.add('hidden');
        if (document.getElementById('formNovoMedium')) {
            document.getElementById('formNovoMedium').reset();
            document.getElementById('formNovoMedium').classList.remove('hidden');
        }
        if (document.getElementById('modalNovoMedium')) document.getElementById('modalNovoMedium').classList.remove('hidden');
    };

    window.fecharModalNovoMedium = () => {
        if (document.getElementById('modalNovoMedium')) document.getElementById('modalNovoMedium').classList.add('hidden');
        carregarQuadroMediuns();
    };

    if (document.getElementById('formNovoMedium')) {
        document.getElementById('formNovoMedium').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnSalvarNovoMedium');
            const msg = document.getElementById('msgNovoMedium');
            const nome = document.getElementById('novoMediumNome').value.trim();

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Salvando...';
            msg.classList.add('hidden');

            try {
                const { data, error } = await supabaseClient.from('mediuns').insert([{ terreiro_id: idTerreiroGlobal, nome_completo: nome, cadastro_completo: false }]).select('id, nome_completo').single();
                if (error) throw error;
                document.getElementById('formNovoMedium').classList.add('hidden');
                document.getElementById('idGeradoNovoMedium').textContent = data.id;
                document.getElementById('resultadoNovoMedium').classList.remove('hidden');
            } catch (error) {
                msg.textContent = 'Erro ao cadastrar: ' + error.message;
                msg.className = 'text-sm mt-3 text-red-600 block font-bold text-center';
            } finally {
                btn.disabled = false;
                btn.innerHTML = 'Cadastrar Médium';
            }
        });
    }

    window.excluirMedium = async (id, nome) => {
        if(!confirm(`ATENÇÃO: Deseja excluir DEFINITIVAMENTE o médium ${nome}?`)) return;
        const { error } = await supabaseClient.from('mediuns').delete().eq('id', id);
        if (error) alert('Erro ao excluir: ' + error.message);
        else { alert('Médium excluído!'); carregarQuadroMediuns(); }
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

    if (document.getElementById('btnFecharPermissoes')) {
        document.getElementById('btnFecharPermissoes').addEventListener('click', () => {
            document.getElementById('modalPermissoes').classList.add('hidden');
        });
    }

    if (document.getElementById('btnSalvarPermissoes')) {
        document.getElementById('btnSalvarPermissoes').addEventListener('click', async () => {
            const btn = document.getElementById('btnSalvarPermissoes');
            const idMedium = document.getElementById('idMediumPermissao').value;
            btn.disabled = true;
            btn.innerHTML = 'Salvando...';
            
            const payload = {
                perm_agenda: document.getElementById('chkPermAgenda').checked,
                perm_grau: document.getElementById('chkPermGrau').checked,
                perm_financeiro: document.getElementById('chkPermFinanceiro').checked,
                perm_doacoes: document.getElementById('chkPermDoacoes').checked,
                perm_admin: document.getElementById('chkPermAdmin').checked
            };

            if (document.getElementById('chkPermVisao')) payload.perm_visao_geral = document.getElementById('chkPermVisao').checked;
            if (document.getElementById('chkPermAta')) payload.perm_ata = document.getElementById('chkPermAta').checked;
            
            const { error } = await supabaseClient.from('mediuns').update(payload).eq('id', idMedium);

            btn.disabled = false;
            btn.innerHTML = 'Salvar Permissões';

            if (error) alert('Erro: ' + error.message);
            else { document.getElementById('modalPermissoes').classList.add('hidden'); carregarQuadroMediuns(); }
        });
    }

    // ==========================================
    // AGENDA E EVENTOS (COM CORREÇÃO DE FUSO E ATA PADRÃO E UPLOAD)
    // ==========================================
    async function carregarAgenda() {
        if(!idTerreiroGlobal) return;
        const tbody = document.getElementById('tabelaGirasCadastradas');
        const agora = new Date().toISOString();
        const { data } = await supabaseClient.from('agenda').select('*').eq('terreiro_id', idTerreiroGlobal).gte('data_hora_fim', agora).order('data_hora_inicio').limit(15); 
        tbody.innerHTML = '';
        if(data && data.length > 0) {
            data.forEach(g => {
                const inicio = new Date(g.data_hora_inicio).toLocaleString('pt-BR');
                const imgHtml = g.imagem_url 
                    ? `<a href="${g.imagem_url}" target="_blank" class="text-blue-500 hover:bg-blue-50 p-1 rounded text-xs transition" title="Ver Cartaz"><i class="fas fa-image"></i> Cartaz</a>` 
                    : `<span class="text-gray-400 text-xs">-</span>`;
                
                // Botões de Editar e Excluir
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
                        <td class="p-3 text-gray-800 font-medium">${g.titulo}</td>
                        <td class="p-3 text-gray-600">${inicio}</td>
                        <td class="p-3 text-center">${acoesBloco}</td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="3" class="p-6 text-center text-gray-500">Nenhum evento agendado no momento.</td></tr>';
        }
    }

    window.excluirGira = async (id, dataInicioISO) => {
        const dataInicio = new Date(dataInicioISO);
        const agora = new Date();
        const diferencaHoras = (dataInicio - agora) / (1000 * 60 * 60);

        if (diferencaHoras < 2) {
            alert("⚠️ AÇÃO BLOQUEADA: Não é permitido excluir um evento que já iniciou, já passou, ou que começa em menos de 2 horas. Isso evita perda de dados de check-ins.");
            return;
        }

        if (!confirm("Tem certeza que deseja excluir este evento da agenda? A exclusão é irreversível.")) return;

        const { error } = await supabaseClient.from('agenda').delete().eq('id', id);
        if (error) alert("Erro ao excluir o evento: " + error.message);
        else { alert("Evento apagado com sucesso!"); carregarAgenda(); }
    };

    window.abrirModalEditarGira = async (id) => {
        const { data, error } = await supabaseClient.from('agenda').select('*').eq('id', id).single();
        if (error) { alert("Erro ao buscar dados: " + error.message); return; }

        document.getElementById('editGiraId').value = data.id;
        document.getElementById('editGiraTitulo').value = data.titulo;
        
        // CORREÇÃO: Formata forçando a hora que veio do banco de volta pro GMT-3 (São Paulo) no input
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

        document.getElementById('modalEditarGira').classList.remove('hidden');
    };

    window.fecharModalEditarGira = () => document.getElementById('modalEditarGira').classList.add('hidden');

    if (document.getElementById('formEditarGira')) {
        document.getElementById('formEditarGira').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnSalvarEditGira');
            if (btn) { btn.disabled = true; btn.innerHTML = 'Salvando...'; }

            try {
                const id = document.getElementById('editGiraId').value;
                const inicioRaw = document.getElementById('editGiraInicio').value;
                const fimRaw = document.getElementById('editGiraFim').value;
                
                const inicioBR = inicioRaw ? `${inicioRaw}:00-03:00` : null;
                const fimBR = fimRaw ? `${fimRaw}:00-03:00` : null;

                const { error } = await supabaseClient.from('agenda')
                    .update({
                        titulo: document.getElementById('editGiraTitulo').value,
                        data_hora_inicio: inicioBR,
                        data_hora_fim: fimBR,
                        gera_ata: document.getElementById('editGiraGeraAta').checked
                    })
                    .eq('id', id);

                if (error) throw error;
                alert("Evento atualizado com sucesso!");
                fecharModalEditarGira(); carregarAgenda();
            } catch (error) {
                alert("Erro ao atualizar: " + error.message);
            } finally {
                if (btn) { btn.disabled = false; btn.innerHTML = 'Salvar Alterações'; }
            }
        });
    }

    if (document.getElementById('formNovaGira')) {
        document.getElementById('formNovaGira').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnSalvarGira');
            const msg = document.getElementById('msgGira');
            
            btn.disabled = true; btn.innerHTML = 'Salvando...'; msg.classList.add('hidden');

            try {
                const titulo = document.getElementById('giraTitulo').value;
                const inicioRaw = document.getElementById('giraInicio').value;
                const fimRaw = document.getElementById('giraFim').value;
                const linkA = document.getElementById('giraImagem').value;
                const fileInput = document.getElementById('giraArquivo');
                
                const chkGeraAta = document.getElementById('giraGeraAta') ? document.getElementById('giraGeraAta').checked : true;
                const inicioBR = inicioRaw ? `${inicioRaw}:00-03:00` : null;
                const fimBR = fimRaw ? `${fimRaw}:00-03:00` : null;
                
                let imagemFinal = linkA || '';

                if (fileInput && fileInput.files.length > 0) {
                    const file = fileInput.files[0];
                    const fileName = `${idTerreiroGlobal}/evento_${Date.now()}.${file.name.split('.').pop()}`;
                    const { error: uploadError } = await supabaseClient.storage.from('public').upload(fileName, file);
                    if (uploadError) throw uploadError;
                    const { data: { publicUrl } } = supabaseClient.storage.from('public').getPublicUrl(fileName);
                    imagemFinal = publicUrl;
                }

                const { error } = await supabaseClient.from('agenda').insert([{
                    terreiro_id: idTerreiroGlobal,
                    titulo: titulo,
                    tipo: 'Gira',
                    data_hora_inicio: inicioBR,
                    data_hora_fim: fimBR,
                    imagem_url: imagemFinal,
                    raio_presenca_metros: 50,
                    gera_ata: chkGeraAta
                }]);

                if (error) throw error;

                document.getElementById('formNovaGira').reset();
                if(document.getElementById('giraGeraAta')) document.getElementById('giraGeraAta').checked = true; // Mantém marcado após resetar
                carregarAgenda();
                
                msg.textContent = "Evento salvo com sucesso!";
                msg.className = "text-green-600 text-sm mt-2 block font-bold";
                msg.classList.remove('hidden');
                setTimeout(() => { msg.classList.add('hidden'); }, 3000);

            } catch (err) {
                msg.textContent = "Erro: " + err.message;
                msg.className = "text-red-600 text-sm mt-2 block font-bold";
                msg.classList.remove('hidden');
            } finally {
                btn.disabled = false; btn.innerHTML = 'Salvar Evento';
            }
        });
    }

    // ==========================================
    // LIVRO DE PRESENÇA (ATA)
    // ==========================================
    window.carregarLivroAta = async () => {
        if(!idTerreiroGlobal) return;
        const tbody = document.getElementById('tabelaLivroAta');
        if(!tbody) return;
        tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-gray-500">Buscando histórico de ATAs...</td></tr>';
        
        try {
            const { data, error } = await supabaseClient.from('agenda')
                .select('id, titulo, data_hora_inicio, ata_encerrada')
                .eq('terreiro_id', idTerreiroGlobal)
                .eq('gera_ata', true)
                .order('data_hora_inicio', { ascending: false })
                .limit(30);

            if (error) throw error;

            tbody.innerHTML = '';
            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-gray-500">Nenhum evento foi configurado para gerar ATA ainda.</td></tr>';
                return;
            }

            data.forEach(g => {
                const inicio = new Date(g.data_hora_inicio).toLocaleString('pt-BR');
                const encerrada = g.ata_encerrada;
                
                const statusHtml = encerrada 
                    ? '<span class="bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded font-bold"><i class="fas fa-lock mr-1"></i> Finalizada</span>'
                    : '<span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-bold"><i class="fas fa-lock-open mr-1"></i> Em Aberto</span>';

                let acoesHtml = '';
                if (encerrada) {
                    acoesHtml = `<button onclick="gerarPDF_ATA('${g.id}')" class="text-xs bg-gray-800 hover:bg-gray-900 text-white font-bold py-1.5 px-3 rounded shadow transition"><i class="fas fa-file-pdf mr-1 text-red-400"></i> Baixar Documento</button>`;
                } else {
                    acoesHtml = `
                        <div class="flex items-center justify-center space-x-2">
                            <button onclick="abrirModalEscreverAta('${g.id}')" class="text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 font-bold py-1 px-3 rounded shadow transition" title="Redigir ATA"><i class="fas fa-pen"></i> Redigir</button>
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

    window.abrirModalEscreverAta = async (id) => {
        try {
            const { data } = await supabaseClient.from('agenda').select('texto_ata').eq('id', id).single();
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

    if (document.getElementById('formEscreverAta')) {
        document.getElementById('formEscreverAta').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnSalvarTextoAta');
            const msg = document.getElementById('msgEscreverAta');
            const id = document.getElementById('ataEventoId').value;
            const texto = document.getElementById('ataTexto').value;

            btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Salvando...';
            
            const { error } = await supabaseClient.from('agenda').update({ texto_ata: texto }).eq('id', id);
            
            btn.disabled = false; btn.innerHTML = '<i class="fas fa-save mr-2"></i> Salvar Texto da Ata';
            
            if (error) {
                msg.textContent = 'Erro: ' + error.message;
                msg.className = 'text-red-500 text-sm font-bold mt-2 block';
                msg.classList.remove('hidden');
            } else {
                msg.textContent = 'Texto salvo com sucesso!';
                msg.className = 'text-green-600 text-sm font-bold mt-2 block';
                msg.classList.remove('hidden');
                setTimeout(() => fecharModalEscreverAta(), 1500);
            }
        });
    }

    window.encerrarAta = async (id) => {
        if(!confirm("Atenção! Ao encerrar a ATA, os check-ins serão bloqueados para este evento e o documento não poderá mais ser alterado. Confirmar fechamento?")) return;
        
        const { error } = await supabaseClient.from('agenda').update({ ata_encerrada: true }).eq('id', id);
        
        if (error) {
            alert("Erro ao encerrar: " + error.message);
        } else {
            alert("Sessão Encerrada! O documento oficial está disponível para download.");
            carregarLivroAta();
        }
    };

    window.baixarLivroAnual = async () => {
        alert("Atenção: A consolidação do Livro Anual gera um arquivo muito pesado. Esta função está sendo adaptada para rodar em segundo plano e será liberada em breve. Por favor, baixe as atas de forma individual na tabela abaixo.");
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
            carregarLivroAta();
        }
    };

    window.gerarPDF_ATA = async (eventoId) => {
        try {
            const { data: evento, error: errEv } = await supabaseClient.from('agenda').select('*').eq('id', eventoId).single();
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
            
            // Busca também a "funcao" para validar a regra do Dirigente
            const { data: mediuns } = await supabaseClient.from('mediuns').select('id, auth_id, nome_completo, grau, funcao').eq('terreiro_id', idTerreiroGlobal);
                
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

            // Lógica de Ordenação Personalizada para a ATA
            if (presencas && presencas.length > 0) {
                presencas.sort((a, b) => {
                    const mediumA = mapaMediuns[a.usuario_id] || {};
                    const mediumB = mapaMediuns[b.usuario_id] || {};
                    
                    const isDirigenteA = mediumA.funcao === 'Dirigente';
                    const isDirigenteB = mediumB.funcao === 'Dirigente';
                    
                    // 1. O Dirigente sempre sobe para o topo
                    if (isDirigenteA && !isDirigenteB) return -1;
                    if (!isDirigenteA && isDirigenteB) return 1;
                    
                    // 2. Os demais são ordenados pelo horário de chegada (do mais cedo pro mais tarde)
                    const timeA = new Date(a.data_hora_checkin).getTime();
                    const timeB = new Date(b.data_hora_checkin).getTime();
                    
                    return timeA - timeB;
                });
            }

            let trs = '';
            if (presencas && presencas.length > 0) {
                presencas.forEach(p => {
                    const medium = mapaMediuns[p.usuario_id] || { nome_completo: 'Médium não identificado', grau: '-' };
                    const horaCheckin = new Date(p.data_hora_checkin).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    trs += `
                        <tr>
                            <td style="border-bottom: 1px solid #ddd; padding: 6px 4px;">${medium.nome_completo}</td>
                            <td style="border-bottom: 1px solid #ddd; padding: 6px 4px; text-align: center;">${medium.grau || '-'}</td>
                            <td style="border-bottom: 1px solid #ddd; padding: 6px 4px; text-align: right;">${horaCheckin}</td>
                        </tr>
                    `;
                });
            } else {
                trs = `<tr><td colspan="3" style="text-align: center; padding: 20px; font-style: italic;">Nenhum check-in registrado na plataforma para esta data.</td></tr>`;
            }

            const logoHtml = logoTerreiroGlobal ? `<img src="${logoTerreiroGlobal}" style="max-height: 80px; margin-bottom: 15px;">` : '';
            const nomeCasa = nomeTerreiroGlobal || 'Templo';

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
            
            div.innerHTML = `
                <div style="text-align: center; margin-bottom: 30px;">
                    ${logoHtml}
                    <h1 style="font-size: 20px; font-weight: bold; text-transform: uppercase; margin: 0 0 5px 0;">${nomeCasa}</h1>
                    <h2 style="font-size: 16px; font-weight: normal; margin: 0; letter-spacing: 2px;">LIVRO DE ATAS E PRESENÇAS</h2>
                </div>
                
                <h3 style="text-align: center; font-size: 16px; margin-bottom: 25px; text-transform: uppercase; background-color: #f3f4f6; padding: 10px; border-radius: 4px;">
                    ATA Nº ${numeroAta.toString().padStart(3, '0')}/${ano} - ${evento.titulo}
                </h3>
                
                ${corpoTextoAta}
                
                <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 40px;">
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

    // ==========================================
    // GRAUS E FUNÇÕES
    // ==========================================
    const opcoesGrau = ['-', 'I', 'IJ', 'B', 'BJ', 'T', 'TJ', 'SCT', 'Escola de CT', 'CT', 'SCCT', 'Escola de CCT', 'CCT'];
    const opcoesFuncao = ['-', 'MG', 'MGA', 'MC', 'MCA', 'MD', 'MDA', 'Cantina', 'Dirigente'];
    function renderizarOpcoes(lista, valorAtual) { return lista.map(op => `<option value="${op === '-' ? '' : op}" ${op === valorAtual ? 'selected' : ''}>${op}</option>`).join(''); }

    async function carregarTabelaGraus() {
        if(!idTerreiroGlobal) return;
        const tbody = document.getElementById('tabelaGraus');
        tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center">Buscando...</td></tr>';
        const { data } = await supabaseClient.from('mediuns').select('id, nome_completo, grau, funcao').eq('terreiro_id', idTerreiroGlobal).order('nome_completo');
        if (data) { mediunsGrauCache = data; renderizarGraus(data); }
    }

    function renderizarGraus(lista) {
        const tbody = document.getElementById('tabelaGraus');
        tbody.innerHTML = '';
        lista.forEach(m => {
            tbody.innerHTML += `<tr class="border-b border-gray-100 hover:bg-gray-50 transition"><td class="py-2 px-3 text-gray-800 font-medium">${m.nome_completo}</td><td class="py-2 px-3"><select id="grau_${m.id}" class="border border-gray-300 rounded px-2 py-1 bg-white text-sm focus:ring-tema-primaria outline-none w-full max-w-[120px]">${renderizarOpcoes(opcoesGrau, m.grau || '-')}</select></td><td class="py-2 px-3"><select id="func_${m.id}" class="border border-gray-300 rounded px-2 py-1 bg-white text-sm focus:ring-tema-primaria outline-none w-full max-w-[120px]">${renderizarOpcoes(opcoesFuncao, m.funcao || '-')}</select></td><td class="py-2 px-3 text-center"><button onclick="salvarGrau(${m.id})" id="btnGrau_${m.id}" class="bg-tema-primaria hover:opacity-90 text-white px-3 py-1 rounded text-xs font-bold transition">Salvar</button></td></tr>`;
        });
    }

    if(document.getElementById('buscaMediumGrau')) {
        document.getElementById('buscaMediumGrau').addEventListener('input', (e) => {
            const termo = e.target.value.toLowerCase();
            const filtrado = mediunsGrauCache.filter(m => m.nome_completo.toLowerCase().includes(termo));
            renderizarGraus(filtrado);
        });
    }

    window.salvarGrau = async (id) => {
        const btn = document.getElementById(`btnGrau_${id}`);
        const grau = document.getElementById(`grau_${id}`).value;
        const funcao = document.getElementById(`func_${id}`).value;
        btn.innerHTML = 'Salvando...'; btn.disabled = true;
        const { error } = await supabaseClient.from('mediuns').update({ grau, funcao }).eq('id', id);
        btn.disabled = false;
        if (error) { btn.innerHTML = 'Erro!'; btn.classList.replace('bg-tema-primaria', 'bg-red-500'); } 
        else {
            btn.innerHTML = 'Salvo <i class="fas fa-check"></i>'; btn.classList.replace('bg-tema-primaria', 'bg-green-600');
            setTimeout(() => { btn.innerHTML = 'Salvar'; btn.classList.replace('bg-green-600', 'bg-tema-primaria'); }, 2000);
            const md = mediunsGrauCache.find(m => m.id === id);
            if(md) { md.grau = grau; md.funcao = funcao; }
        }
    };

    // ==========================================
    // FINANCEIRO
    // ==========================================
    async function carregarFinanceiro() {
        if(!idTerreiroGlobal) return;
        const ano = parseInt(document.getElementById('selectAnoFinanceiro').value);
        const tbody = document.getElementById('tabelaFinanceiro');
        tbody.innerHTML = '<tr><td colspan="14" class="p-6 text-center text-gray-500">Buscando histórico...</td></tr>';
        
        const { data: mediuns } = await supabaseClient.from('mediuns').select('id, nome_completo').eq('terreiro_id', idTerreiroGlobal).order('nome_completo');
        const { data: pgtos } = await supabaseClient.from('financeiro').select('*').eq('ano', ano);
        
        if(!mediuns) return;
        tbody.innerHTML = '';
        
        mediuns.forEach(m => {
            const meusPgtos = pgtos ? pgtos.filter(p => p.medium_id === m.id) : [];
            let htmlMeses = ''; let emDia = true;
            const mesAtual = new Date().getMonth() + 1; const anoAtual = new Date().getFullYear();

            for (let i = 1; i <= 12; i++) {
                const pago = meusPgtos.some(p => p.mes === i && p.pago);
                const passou = (ano < anoAtual) || (ano === anoAtual && i < mesAtual);
                if (passou && !pago) emDia = false;
                const checkStr = pago ? 'checked' : '';
                htmlMeses += `<td class="py-1 px-1 border-b border-gray-100"><input type="checkbox" ${checkStr} class="w-4 h-4 cursor-pointer accent-tema-secundaria" onchange="salvarPagamento(${m.id}, ${i}, ${ano}, this.checked)"></td>`;
            }
            const statusHtml = emDia ? '<span class="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">Em Dia</span>' : '<span class="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded">Pendente</span>';
            tbody.innerHTML += `<tr class="hover:bg-gray-50"><td class="py-2 px-3 border-b border-gray-100 text-left font-medium text-gray-800 text-xs truncate max-w-[220px]">${m.nome_completo}</td>${htmlMeses}<td class="py-2 px-2 border-b border-gray-100 bg-gray-50">${statusHtml}</td></tr>`;
        });
    }

    if(document.getElementById('selectAnoFinanceiro')) document.getElementById('selectAnoFinanceiro').addEventListener('change', carregarFinanceiro);

    window.salvarPagamento = async (mediumId, mes, ano, status) => {
        const { error } = await supabaseClient.from('financeiro').upsert({ medium_id: mediumId, mes: mes, ano: ano, pago: status }, { onConflict: 'medium_id,mes,ano' });
        if(error) { alert('Erro: ' + error.message); carregarFinanceiro(); }
    };

    // ==========================================
    // CONFIGURAÇÕES DA CASA & MAPA DE GPS
    // ==========================================
    async function carregarConfiguracoesCasa() {
        if (!idTerreiroGlobal) return;
        const { data } = await supabaseClient.from('terreiros').select('logo_url, cor_primaria, cor_secundaria, cor_fundo, cor_texto, latitude, longitude').eq('id', idTerreiroGlobal).single();
        if (data) {
            if(data.logo_url) {
                document.getElementById('previewLogo').src = data.logo_url;
                document.getElementById('previewLogo').classList.remove('hidden');
                document.getElementById('placeholderLogo').classList.add('hidden');
            }
            document.getElementById('corPrimaria').value = data.cor_primaria || '#1e3a8a';
            document.getElementById('corSecundaria').value = data.cor_secundaria || '#16a34a';
            document.getElementById('corFundo').value = data.cor_fundo || '#f3f4f6';
            document.getElementById('corTexto').value = data.cor_texto || '#1f2937';

            if(document.getElementById('inputLat')) {
                document.getElementById('inputLat').value = data.latitude || '';
                document.getElementById('inputLng').value = data.longitude || '';
                
                let lat = data.latitude || -14.2350; 
                let lng = data.longitude || -51.9253;
                let zoom = data.latitude ? 18 : 4;
                iniciarMapa(lat, lng, zoom);
            }
        }
    }

    if (document.getElementById('btnGravarLocalizacao')) {
        document.getElementById('btnGravarLocalizacao').addEventListener('click', async () => {
            const btn = document.getElementById('btnGravarLocalizacao');
            const msg = document.getElementById('msgLocalizacao');
            if(msg) {
                msg.classList.remove('hidden');
                msg.className = 'mt-4 text-sm font-bold text-blue-600 block';
                msg.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Lendo GPS do celular...';
            }
            
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const lat = pos.coords.latitude, lon = pos.coords.longitude;
                    if(idTerreiroGlobal) {
                        const { data, error } = await supabaseClient.from('terreiros')
                            .update({ latitude: lat, longitude: lon })
                            .eq('id', idTerreiroGlobal)
                            .select(); 

                        if(error) {
                            if(msg) { msg.className = 'mt-4 text-sm font-bold text-red-600 block'; msg.textContent = 'Erro ao salvar no banco: ' + error.message; }
                        } else if (!data || data.length === 0) {
                            if(msg) { msg.className = 'mt-4 text-sm font-bold text-red-600 block'; msg.textContent = 'ERRO: O Banco de Dados recusou a alteração. Nenhuma linha foi salva.'; }
                        } else {
                            if(msg) { msg.className = 'mt-4 text-sm font-bold text-green-600 block'; msg.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Ponto Registrado!'; setTimeout(() => msg.classList.add('hidden'), 3000); }
                            if(document.getElementById('inputLat')) {
                                document.getElementById('inputLat').value = lat;
                                document.getElementById('inputLng').value = lon;
                            }
                            if (typeof iniciarMapa === 'function') iniciarMapa(lat, lon, 18);
                        }
                    }
                },
                (err) => {
                    if(msg) { msg.className = 'mt-4 text-sm font-bold text-red-600 block'; msg.textContent = 'Erro no GPS: Libere a permissão de localização do seu navegador.'; }
                },
                { enableHighAccuracy: true }
            );
        });
    }

    if (document.getElementById('btnSalvarLocalizacaoManual')) {
        document.getElementById('btnSalvarLocalizacaoManual').addEventListener('click', async () => {
            const btn = document.getElementById('btnSalvarLocalizacaoManual');
            const msg = document.getElementById('msgLocalizacao');
            const lat = parseFloat(document.getElementById('inputLat').value);
            const lng = parseFloat(document.getElementById('inputLng').value);
            
            if(isNaN(lat) || isNaN(lng)) {
                alert("Por favor, digite latitude e longitude válidas ou clique no mapa para marcar.");
                return;
            }

            btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Salvando...';
            
            const { data, error } = await supabaseClient.from('terreiros')
                .update({ latitude: lat, longitude: lng })
                .eq('id', idTerreiroGlobal)
                .select(); 
                
            btn.disabled = false; btn.innerHTML = '<i class="fas fa-save mr-2"></i> Salvar Manualmente';
            
            if(error) {
                if(msg) { msg.textContent = "Erro: " + error.message; msg.className = "mt-4 text-sm font-bold text-red-600 block"; msg.classList.remove('hidden'); }
            } else if (!data || data.length === 0) {
                if(msg) { msg.textContent = "ERRO: O Banco de Dados recusou a alteração. Regra RLS bloqueou a gravação."; msg.className = "mt-4 text-sm font-bold text-red-600 block"; msg.classList.remove('hidden'); }
            } else {
                if(msg) { msg.textContent = "Localização salva com sucesso!"; msg.className = "mt-4 text-sm font-bold text-green-600 block"; msg.classList.remove('hidden'); setTimeout(() => msg.classList.add('hidden'), 3000); }
                if (typeof iniciarMapa === 'function') iniciarMapa(lat, lng, 18);
            }
        });
    }

    if(document.getElementById('uploadLogo')) {
        document.getElementById('uploadLogo').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(evt) {
                    document.getElementById('previewLogo').src = evt.target.result;
                    document.getElementById('previewLogo').classList.remove('hidden');
                    document.getElementById('placeholderLogo').classList.add('hidden');
                }
                reader.readAsDataURL(file);
            }
        });
    }

    if(document.getElementById('btnSalvarLogo')) {
        document.getElementById('btnSalvarLogo').addEventListener('click', async () => {
            const btnLogo = document.getElementById('btnSalvarLogo');
            const input = document.getElementById('uploadLogo');
            const msg = document.getElementById('msgLogo');
            if(!input.files || input.files.length === 0) { alert('Selecione uma imagem.'); return; }
            btnLogo.disabled = true; btnLogo.textContent = 'Enviando...'; msg.classList.remove('hidden');
            msg.textContent = 'Fazendo upload...'; msg.className = 'text-xs font-bold mt-2 text-tema-primaria';
            
            try {
                const arquivo = input.files[0];
                const nomeArquivo = `logo_${idTerreiroGlobal}_${Date.now()}.${arquivo.name.split('.').pop()}`;
                const { error: errUp } = await supabaseClient.storage.from('logos').upload(nomeArquivo, arquivo);
                if (errUp) throw errUp;
                const { data: urlData } = supabaseClient.storage.from('logos').getPublicUrl(nomeArquivo);
                const { error: errBd } = await supabaseClient.from('terreiros').update({ logo_url: urlData.publicUrl }).eq('id', idTerreiroGlobal);
                if (errBd) throw errBd;
                
                logoTerreiroGlobal = urlData.publicUrl;
                
                document.getElementById('logoSidebar').src = urlData.publicUrl;
                document.getElementById('logoSidebar').classList.remove('hidden');

                let linkFavicon = document.querySelector("link[rel~='icon']");
                if (!linkFavicon) {
                    linkFavicon = document.createElement('link');
                    linkFavicon.rel = 'icon';
                    document.head.appendChild(linkFavicon);
                }
                linkFavicon.href = urlData.publicUrl;

                msg.textContent = '✅ Logo salva!'; msg.className = 'text-xs font-bold mt-2 text-tema-secundaria';
            } catch (error) {
                msg.textContent = '❌ Erro: ' + error.message; msg.className = 'text-xs font-bold mt-2 text-red-600';
            } finally { btnLogo.disabled = false; btnLogo.textContent = 'Salvar Imagem'; }
        });
    }

    if(document.getElementById('btnSalvarCores')) {
        document.getElementById('btnSalvarCores').addEventListener('click', async () => {
            const btn = document.getElementById('btnSalvarCores');
            const msg = document.getElementById('msgCores');
            const cor1 = document.getElementById('corPrimaria').value;
            const cor2 = document.getElementById('corSecundaria').value;
            const corF = document.getElementById('corFundo').value;
            const corT = document.getElementById('corTexto').value;
            btn.disabled = true; btn.textContent = 'Salvando...';
            
            try {
                const { error } = await supabaseClient.from('terreiros').update({ cor_primaria: cor1, cor_secundaria: cor2, cor_fundo: corF, cor_texto: corT }).eq('id', idTerreiroGlobal);
                if (error) throw error;
                const root = document.documentElement;
                root.style.setProperty('--cor-primaria', cor1); root.style.setProperty('--cor-secundaria', cor2);
                root.style.setProperty('--cor-fundo', corF); root.style.setProperty('--cor-texto', corT);
                msg.textContent = '✅ Tema atualizado!'; msg.className = 'text-sm font-bold mt-3 text-tema-secundaria block';
                setTimeout(() => msg.classList.add('hidden'), 5000);
            } catch (error) {
                msg.textContent = '❌ Erro: ' + error.message; msg.className = 'text-sm font-bold mt-3 text-red-600 block';
            } finally { btn.disabled = false; btn.textContent = 'Salvar e Aplicar Cores'; }
        });
    }

    // ==========================================
    // DOAÇÕES
    // ==========================================
    window.carregarDoacoesPrometidas = async () => {
        if (!idTerreiroGlobal) return;
        const tbody = document.getElementById('tabelaDoacoesPrometidas');
        if(tbody) tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-gray-500">Buscando...</td></tr>';
        try {
            const { data: doacoes, error: errD } = await supabaseClient.from('doacoes_registradas').select('*').eq('terreiro_id', idTerreiroGlobal).order('entregue', { ascending: true }).order('data_registro', { ascending: false }); 
            if (errD) throw errD;
            const { data: mediuns } = await supabaseClient.from('mediuns').select('auth_id, nome_completo').eq('terreiro_id', idTerreiroGlobal);
            const { data: itens } = await supabaseClient.from('itens_doacao').select('id, nome, descricao').eq('terreiro_id', idTerreiroGlobal);
            window.dadosDoacoesParaPDF = { doacoes, mediuns, itens };

            if (!doacoes || doacoes.length === 0) {
                if(tbody) tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-gray-500">Nenhum registro.</td></tr>';
                return;
            }
            if(tbody) {
                tbody.innerHTML = '';
                doacoes.forEach(d => {
                    const medium = mediuns?.find(m => m.auth_id === d.medium_auth_id)?.nome_completo || 'Médium';
                    const itemObj = itens?.find(i => i.id == d.item_id);
                    const itemNome = itemObj ? `${itemObj.nome}` : 'Item';
                    const data = new Date(d.data_registro).toLocaleDateString('pt-BR');
                    const statusHtml = d.entregue ? '<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-bold">Entregue</span>' : '<span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-bold">Pendente</span>';
                    const acaoHtml = d.entregue ? `<button onclick="marcarDoacao('${d.id}', false)" class="text-xs text-gray-400 hover:text-gray-800 underline mt-1">Desfazer</button>` : `<button onclick="marcarDoacao('${d.id}', true)" class="bg-tema-secundaria hover:opacity-90 text-white text-xs font-bold py-1.5 px-3 rounded shadow-sm mt-1">Dar Baixa</button>`;
                    const estilo = d.entregue ? 'bg-gray-50 opacity-80' : 'bg-white';
                    tbody.innerHTML += `<tr class="border-b border-gray-100 ${estilo}"><td class="p-3 text-sm">${medium}</td><td class="p-3 text-sm">${itemNome}</td><td class="p-3 text-center font-bold">${d.quantidade}</td><td class="p-3 text-xs text-gray-500">${data}</td><td class="p-3 text-center flex flex-col items-center">${statusHtml}${acaoHtml}</td></tr>`;
                });
            }
        } catch (error) {
            if(tbody) tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-red-500">Erro ao carregar.</td></tr>`;
        }
    };

    window.marcarDoacao = async (id, status) => {
        const payload = { entregue: status, data_entrega: status ? new Date().toISOString() : null };
        const { error } = await supabaseClient.from('doacoes_registradas').update(payload).eq('id', id);
        if (!error) carregarDoacoesPrometidas(); else alert('Erro: ' + error.message);
    };

    window.carregarDoacoesCatalogo = async () => {
        if (!idTerreiroGlobal) return;
        const tbody = document.getElementById('tabelaItensDoacao');
        if(!tbody) return;
        const { data, error } = await supabaseClient.from('itens_doacao').select('*').eq('terreiro_id', idTerreiroGlobal).order('nome');
        if (error) return;
        tbody.innerHTML = '';
        if (data && data.length > 0) {
            data.forEach(item => {
                const btn = item.ativo ? `<button onclick="alternarStatusCatalogo('${item.id}', false)" class="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold">Ocultar</button>` : `<button onclick="alternarStatusCatalogo('${item.id}', true)" class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold">Ativar</button>`;
                tbody.innerHTML += `<tr class="border-b border-gray-100 ${item.ativo ? '' : 'opacity-40'}"><td class="p-3 text-sm">${item.nome}</td><td class="p-3 text-xs text-gray-500">${item.descricao || '-'}</td><td class="p-3 text-center">${btn}</td></tr>`;
            });
        }
    };

    window.alternarStatusCatalogo = async (id, status) => {
        const { error } = await supabaseClient.from('itens_doacao').update({ ativo: status }).eq('id', id);
        if (!error) carregarDoacoesCatalogo();
    };

    // ==========================================
    // SAAS / GESTÃO E CONTEXT SWITCHER
    // ==========================================
    window.carregarGestaoPlataforma = async () => {
        const tbody = document.getElementById('tabelaMasterTerreiros');
        if(!tbody) return;
        tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-gray-500">Carregando terreiros...</td></tr>';
        
        const { data, error } = await supabaseClient.from('terreiros').select('*').order('id', { ascending: true });
        if (error) { tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-red-500">Erro: ${error.message}</td></tr>`; return; }

        tbody.innerHTML = '';
        data.forEach(t => {
            const statusHtml = t.status_bloqueado ? '<span class="bg-red-100 text-red-800 text-xs px-2 py-1 rounded font-bold">Bloqueado</span>' : '<span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-bold">Ativo</span>';
            
            const btnBloqueio = t.status_bloqueado 
                ? `<button onclick="alternarBloqueioTerreiro('${t.id}', false)" class="text-xs bg-gray-800 text-white py-1 px-3 rounded shadow">Desbloquear</button>` 
                : `<button onclick="alternarBloqueioTerreiro('${t.id}', true)" class="text-xs bg-red-600 text-white py-1 px-3 rounded shadow">Bloquear</button>`;
            
            const btnImportar = `<button onclick="abrirModalImportacao('${t.id}', '${t.nome.replace(/'/g, "\\'")}')" class="text-xs bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded shadow ml-2"><i class="fas fa-file-csv"></i> CSV</button>`;
            
            const btnAcessar = `<button onclick="acessarTerreiroSaaS('${t.id}')" class="text-xs bg-emerald-600 hover:bg-emerald-700 text-white py-1 px-3 rounded shadow mr-2"><i class="fas fa-sign-in-alt"></i> Acessar</button>`;
            
            const acaoHtml = `<div class="flex justify-center items-center">${btnAcessar}${btnBloqueio}${btnImportar}</div>`;
            
            tbody.innerHTML += `<tr class="border-b border-gray-100 ${t.status_bloqueado ? 'bg-red-50' : ''}"><td class="p-3 text-sm font-mono">${t.id}</td><td class="p-3 font-bold">${t.nome}</td><td class="p-3 text-center">${statusHtml}</td><td class="p-3 text-center">${acaoHtml}</td></tr>`;
        });
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
        if(error) alert("Erro: " + error.message); else carregarGestaoPlataforma();
    };

    if (document.getElementById('formNovoTerreiro')) {
        document.getElementById('formNovoTerreiro').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnSalvarTerreiro');
            const msg = document.getElementById('msgNovoTerreiro');
            btn.disabled = true; btn.innerHTML = 'Cadastrando...'; msg.classList.add('hidden');

            const { error } = await supabaseClient.from('terreiros').insert([{ 
                nome: document.getElementById('novoTerreiroNome').value, 
                cor_primaria: '#1e3a8a', cor_secundaria: '#16a34a', cor_fundo: '#f3f4f6', cor_texto: '#1f2937' 
            }]);

            btn.disabled = false; btn.innerHTML = 'Cadastrar Sistema';
            if (error) { msg.textContent = 'Erro: ' + error.message; msg.className = 'text-sm mt-2 text-red-500 block'; } 
            else {
                msg.textContent = '✅ Terreiro cadastrado com sucesso!'; msg.className = 'text-sm mt-2 text-green-400 block font-bold';
                document.getElementById('formNovoTerreiro').reset(); carregarGestaoPlataforma();
                setTimeout(() => msg.classList.add('hidden'), 3000);
            }
        });
    }

    window.abrirModalImportacao = (idTerreiro, nomeTerreiro) => {
        document.getElementById('idTerreiroImport').value = idTerreiro;
        document.getElementById('nomeTerreiroImport').textContent = nomeTerreiro;
        document.getElementById('msgImportacao').classList.add('hidden');
        if (document.getElementById('formImportarCSV')) document.getElementById('formImportarCSV').reset();
        document.getElementById('modalImportarCSV').classList.remove('hidden');
    };

    window.fecharModalImportacao = () => {
        document.getElementById('modalImportarCSV').classList.add('hidden');
    };

    if (document.getElementById('formImportarCSV')) {
        document.getElementById('formImportarCSV').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnProcessarCSV');
            const msg = document.getElementById('msgImportacao');
            const idTerreiro = document.getElementById('idTerreiroImport').value;
            const fileInput = document.getElementById('arquivoCSV');

            if (!fileInput.files.length) return;
            const file = fileInput.files[0];

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Processando...';
            msg.classList.remove('hidden');
            msg.className = 'text-sm mt-3 text-blue-600 block font-bold text-center';
            msg.textContent = 'Lendo arquivo local...';

            const reader = new FileReader();
            reader.onload = async function(event) {
                try {
                    const text = event.target.result;
                    const linhas = text.split(/\r?\n/).filter(l => l.trim() !== '');
                    if (linhas.length <= 1) throw new Error("O arquivo parece vazio ou só tem cabeçalho.");

                    const mediunsParaInserir = [];
                    for (let i = 1; i < linhas.length; i++) {
                        const colunas = linhas[i].split(/[,;]/);
                        const nome = colunas[0] ? colunas[0].trim() : '';
                        const telefone = colunas[1] ? colunas[1].trim() : '';
                        const grau = colunas[2] ? colunas[2].trim() : '-';
                        const funcao = colunas[3] ? colunas[3].trim() : '-';

                        if (nome) {
                            mediunsParaInserir.push({
                                terreiro_id: idTerreiro,
                                nome_completo: nome,
                                telefone: telefone,
                                grau: grau,
                                funcao: funcao,
                                cadastro_completo: false
                            });
                        }
                    }

                    if (mediunsParaInserir.length === 0) throw new Error("Nenhum nome válido encontrado na planilha.");

                    msg.textContent = `Enviando ${mediunsParaInserir.length} cadastros para o banco...`;

                    const { error } = await supabaseClient.from('mediuns').insert(mediunsParaInserir);
                    if (error) throw error;

                    msg.textContent = `✅ ${mediunsParaInserir.length} cadastros importados com sucesso!`;
                    msg.className = 'text-sm mt-3 text-green-600 block font-bold text-center';
                    
                    setTimeout(() => { fecharModalImportacao(); }, 3000);

                } catch (error) {
                    msg.textContent = '❌ Erro: ' + error.message;
                    msg.className = 'text-sm mt-3 text-red-600 block font-bold text-center';
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = 'Processar e Importar';
                }
            };
            reader.onerror = () => {
                msg.textContent = '❌ Erro ao ler o arquivo.';
                msg.className = 'text-sm mt-3 text-red-600 block font-bold text-center';
                btn.disabled = false;
                btn.innerHTML = 'Processar e Importar';
            };

            reader.readAsText(file);
        });
    }
});

document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
        if (window.innerWidth < 768) {
            document.getElementById('sidebar').classList.add('-translate-x-full');
            document.getElementById('overlayMobile').classList.add('hidden');
        }
    });
});
