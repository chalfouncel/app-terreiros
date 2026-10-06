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

        const temAcessoPainel = perfil.is_admin || perfil.perm_visao_geral || perfil.perm_agenda || perfil.perm_grau || perfil.perm_financeiro || perfil.perm_doacoes || perfil.perm_admin || perfil.perm_ata;

        if (!temAcessoPainel) {
            alert('Acesso negado. Você não tem permissão para acessar o Painel de Gestão.');
            return window.location.href = 'presenca.html';
        }

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

        if (perfil.is_master) {
            const menuMaster = document.getElementById('menuMaster');
            if (menuMaster) menuMaster.classList.remove('hidden');
        }

        document.getElementById('nomeAdmin').textContent = 'Olá, ' + perfil.nome_completo.split(' ')[0];
        idTerreiroGlobal = perfil.terreiro_id;

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

        if (perfil.is_admin || perfil.perm_visao_geral) {
            document.getElementById('menuVisaoGeral').click();
        } else {
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
        const { count: totalMediuns } = await supabaseClient.from('mediuns').select('*', { count: 'exact', head: true });
        document.getElementById('totalMediuns').textContent = totalMediuns || '0';

        const agora = new Date().toISOString();
        const { data: agendaData } = await supabaseClient.from('agenda').select('*').gte('data_hora_fim', agora).order('data_hora_inicio').limit(1);

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
            const { data: todosMediuns } = await supabaseClient.from('mediuns').select('id, auth_id, nome_completo');
            
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
    async function carregarQuadroMediuns() {
        const tbody = document.getElementById('tabelaTodosMediuns');
        const { data } = await supabaseClient.from('mediuns').select('id, nome_completo, grau, funcao, telefone, cadastro_completo, is_admin, perm_agenda, perm_grau, perm_financeiro, perm_doacoes, perm_admin, perm_visao_geral').order('nome_completo');
        tbody.innerHTML = '';
        
        if(data) data.forEach(m => {
            const cargo = [m.grau, m.funcao].filter(Boolean).join(' / ') || '-';
            const status = m.cadastro_completo ? '<span class="text-green-600 font-bold">Ativo</span>' : '<span class="text-yellow-600 font-bold">Pendente</span>';
            
            let acoesHtml = '<span class="text-gray-400 text-xs">Sem acesso</span>';
            
            if (perfilAdminLogado && perfilAdminLogado.is_admin) {
                const perms = `${m.perm_agenda || false},${m.perm_grau || false},${m.perm_financeiro || false},${m.perm_doacoes || false},${m.perm_admin || false},${m.perm_visao_geral || false}`;
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

            tbody.innerHTML += `<tr class="border-b border-gray-100 hover:bg-gray-50 py-1"><td class="py-2 px-3 text-gray-800">${m.nome_completo}</td><td class="py-2 px-3 text-gray-600">${cargo}</td><td class="py-2 px-3 text-gray-600">${linkWhats}</td><td class="py-2 px-3">${status}</td><td class="py-2 px-3 text-center">${acoesHtml}</td></tr>`;
        });
    }

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
        const [pAgenda, pGrau, pFin, pDoa, pAdmin, pVisao] = permsString.split(',');
        
        document.getElementById('chkPermAgenda').checked = pAgenda === 'true';
        document.getElementById('chkPermGrau').checked = pGrau === 'true';
        document.getElementById('chkPermFinanceiro').checked = pFin === 'true';
        document.getElementById('chkPermDoacoes').checked = pDoa === 'true';
        document.getElementById('chkPermAdmin').checked = pAdmin === 'true';
        if (document.getElementById('chkPermVisao')) document.getElementById('chkPermVisao').checked = pVisao === 'true';
        if (document.getElementById('chkPermAta')) document.getElementById('chkPermAta').checked = false; 
        
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
    // AGENDA E EVENTOS (COM CORREÇÃO DE FUSO E ATA PADRÃO)
    // ==========================================
    async function carregarAgenda() {
        const tbody = document.getElementById('tabelaGirasCadastradas');
        const agora = new Date().toISOString();
        const { data } = await supabaseClient.from('agenda').select('*').gte('data_hora_fim', agora).order('data_hora_inicio').limit(15); 
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

    window.abrirModalEditarGira = async
