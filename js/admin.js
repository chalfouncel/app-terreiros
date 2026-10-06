let idTerreiroGlobal = null; 
let mediunsGrauCache = []; 
let perfilAdminLogado = null; 

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
        // Busca Perfil logado (Agora puxando o is_master)
        const { data: perfil, error: erroPerfil } = await supabaseClient
            .from('mediuns')
            .select('nome_completo, is_admin, terreiro_id, perm_agenda, perm_grau, perm_financeiro, perm_doacoes, perm_admin, is_master')
            .eq('auth_id', session.user.id)
            .single();

        if (erroPerfil) {
            console.error("Erro ao buscar perfil. As colunas novas foram criadas no banco?", erroPerfil);
            throw erroPerfil;
        }
        
        perfilAdminLogado = perfil;

        // O usuário tem direito de entrar no painel?
        const temAcessoPainel = perfil.is_admin || perfil.perm_agenda || perfil.perm_grau || perfil.perm_financeiro || perfil.perm_doacoes || perfil.perm_admin;

        if (!temAcessoPainel) {
            alert('Acesso negado. Você não tem permissão para acessar o Painel de Gestão.');
            return window.location.href = 'presenca.html';
        }

        // ESCONDER MENUS não autorizados
        if (!perfil.is_admin) {
            document.getElementById('menuVisaoGeral').classList.add('hidden'); // Restrito a Admin
            
            if (!perfil.perm_agenda) document.getElementById('menuAgendaGiras').classList.add('hidden');
            if (!perfil.perm_grau) document.getElementById('menuGrau').classList.add('hidden');
            if (!perfil.perm_financeiro) document.getElementById('menuFinanceiro').classList.add('hidden');
            if (!perfil.perm_doacoes) document.getElementById('menuDoacoes').classList.add('hidden');
            if (!perfil.perm_admin) document.getElementById('menuAdmin').classList.add('hidden');
        }

        // MOSTRAR MENU MASTER SÓ PARA VOCÊ
        if (perfil.is_master) {
            const menuMaster = document.getElementById('menuMaster');
            if (menuMaster) menuMaster.classList.remove('hidden');
        }

        document.getElementById('nomeAdmin').textContent = 'Olá, ' + perfil.nome_completo.split(' ')[0];
        idTerreiroGlobal = perfil.terreiro_id;

        // Busca Configurações da Casa
        if (idTerreiroGlobal) {
            const { data: terreiro } = await supabaseClient
                .from('terreiros')
                .select('nome, logo_url, cor_primaria, cor_secundaria, cor_fundo, cor_texto')
                .eq('id', idTerreiroGlobal)
                .single();
            
            if (terreiro) {
                document.getElementById('nomeTerreiroSidebar').textContent = terreiro.nome;
                
                // Aplica Cores
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

        // --- NAVEGAÇÃO DE ABAS ---
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

        // Iniciar na aba correta dependendo da permissão do usuário logado
        if (perfil.is_admin) {
            document.getElementById('menuVisaoGeral').click();
        } else {
            // Se for assistente, clica na primeira aba que ele tem acesso
            if (perfil.perm_agenda) document.getElementById('menuAgendaGiras').click();
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
    // FUNÇÕES DO PAINEL GERAL
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

    async function carregarQuadroMediuns() {
        const tbody = document.getElementById('tabelaTodosMediuns');
        const { data } = await supabaseClient.from('mediuns').select('id, nome_completo, grau, funcao, telefone, cadastro_completo, is_admin, perm_agenda, perm_grau, perm_financeiro, perm_doacoes, perm_admin').order('nome_completo');
        tbody.innerHTML = '';
        
        if(data) data.forEach(m => {
            const cargo = [m.grau, m.funcao].filter(Boolean).join(' / ') || '-';
            const status = m.cadastro_completo ? '<span class="text-green-600 font-bold">Ativo</span>' : '<span class="text-yellow-600 font-bold">Pendente</span>';
            
            let acoesHtml = '<span class="text-gray-400 text-xs">Sem acesso</span>';
            
            if (perfilAdminLogado && perfilAdminLogado.is_admin) {
                const perms = `${m.perm_agenda || false},${m.perm_grau || false},${m.perm_financeiro || false},${m.perm_doacoes || false},${m.perm_admin || false}`;
                acoesHtml = `
                    <div class="flex items-center justify-center space-x-4">
                        <button onclick="abrirModalPermissoes(${m.id}, '${m.nome_completo}', '${perms}')" class="text-blue-500 hover:text-blue-700 transition" title="Permissões de Acesso"><i class="fas fa-key"></i></button>
                        <button onclick="excluirMedium(${m.id}, '${m.nome_completo}')" class="text-red-500 hover:text-red-700 transition" title="Excluir Médium"><i class="fas fa-trash"></i></button>
                    </div>
                `;
            }

            let linkWhats = '-';
            if (m.telefone) {
                const numeroLimpo = m.telefone.replace(/\D/g, '');
                // Assume Brasil (55) se o usuário não tiver digitado o DDI
                const ddi = numeroLimpo.startsWith('55') ? '' : '55';
                linkWhats = `<a href="https://wa.me/${ddi}${numeroLimpo}" target="_blank" class="text-green-600 hover:text-green-700 hover:underline flex items-center gap-1 font-medium" title="Chamar no WhatsApp"><i class="fab fa-whatsapp text-lg"></i> ${m.telefone}</a>`;
            }

            tbody.innerHTML += `<tr class="border-b border-gray-100 hover:bg-gray-50 py-1"><td class="py-2 px-3 text-gray-800">${m.nome_completo}</td><td class="py-2 px-3 text-gray-600">${cargo}</td><td class="py-2 px-3 text-gray-600">${linkWhats}</td><td class="py-2 px-3">${status}</td><td class="py-2 px-3 text-center">${acoesHtml}</td></tr>`;
        });
    }

    // --- FUNÇÕES DE MÉDIUNS ---
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
        const [pAgenda, pGrau, pFin, pDoa, pAdmin] = permsString.split(',');
        document.getElementById('chkPermAgenda').checked = pAgenda === 'true';
        document.getElementById('chkPermGrau').checked = pGrau === 'true';
        document.getElementById('chkPermFinanceiro').checked = pFin === 'true';
        document.getElementById('chkPermDoacoes').checked = pDoa === 'true';
        document.getElementById('chkPermAdmin').checked = pAdmin === 'true';
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
            
            const { error } = await supabaseClient.from('mediuns').update({
                perm_agenda: document.getElementById('chkPermAgenda').checked,
                perm_grau: document.getElementById('chkPermGrau').checked,
                perm_financeiro: document.getElementById('chkPermFinanceiro').checked,
                perm_doacoes: document.getElementById('chkPermDoacoes').checked,
                perm_admin: document.getElementById('chkPermAdmin').checked
            }).eq('id', idMedium);

            btn.disabled = false;
            btn.innerHTML = 'Salvar Permissões';

            if (error) alert('Erro: ' + error.message);
            else { document.getElementById('modalPermissoes').classList.add('hidden'); carregarQuadroMediuns(); }
        });
    }

    // --- AGENDA E GRAUS ---
    async function carregarAgenda() {
        const tbody = document.getElementById('tabelaGirasCadastradas');
        const agora = new Date().toISOString();
        const { data } = await supabaseClient.from('agenda').select('*').gte('data_hora_fim', agora).order('data_hora_inicio').limit(10); 
        tbody.innerHTML = '';
        if(data) data.forEach(g => {
            const inicio = new Date(g.data_hora_inicio).toLocaleString('pt-BR');
            const img = g.imagem_url ? `<a href="${g.imagem_url}" target="_blank" class="text-blue-500 hover:underline text-xs"><i class="fas fa-image"></i> Ver</a>` : '-';
            tbody.innerHTML += `<tr class="border-b border-gray-100 hover:bg-gray-50"><td class="p-3 text-gray-800 font-medium">${g.titulo}</td><td class="p-3 text-gray-600">${inicio}</td><td class="p-3">${img}</td></tr>`;
        });
    }

    const opcoesGrau = ['-', 'I', 'IJ', 'B', 'BJ', 'T', 'TJ', 'SCT', 'Escola de CT', 'CT', 'SCCT', 'Escola de CCT', 'CCT'];
    const opcoesFuncao = ['-', 'MG', 'MGA', 'MC', 'MCA', 'MD', 'MDA', 'Cantina'];
    function renderizarOpcoes(lista, valorAtual) { return lista.map(op => `<option value="${op === '-' ? '' : op}" ${op === valorAtual ? 'selected' : ''}>${op}</option>`).join(''); }

    async function carregarTabelaGraus() {
        const tbody = document.getElementById('tabelaGraus');
        tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center">Buscando...</td></tr>';
        const { data } = await supabaseClient.from('mediuns').select('id, nome_completo, grau, funcao').order('nome_completo');
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

    // --- FINANCEIRO ---
    async function carregarFinanceiro() {
        const ano = parseInt(document.getElementById('selectAnoFinanceiro').value);
        const tbody = document.getElementById('tabelaFinanceiro');
        tbody.innerHTML = '<tr><td colspan="14" class="p-6 text-center text-gray-500">Buscando histórico...</td></tr>';
        
        const { data: mediuns } = await supabaseClient.from('mediuns').select('id, nome_completo').order('nome_completo');
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

    // --- CONFIG DA CASA ---
    async function carregarConfiguracoesCasa() {
        if (!idTerreiroGlobal) return;
        const { data } = await supabaseClient.from('terreiros').select('logo_url, cor_primaria, cor_secundaria, cor_fundo, cor_texto').eq('id', idTerreiroGlobal).single();
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
        }
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
                document.getElementById('logoSidebar').src = urlData.publicUrl;
                document.getElementById('logoSidebar').classList.remove('hidden');
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

    if (document.getElementById('btnGravarLocalizacao')) {
        document.getElementById('btnGravarLocalizacao').addEventListener('click', async () => {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const lat = pos.coords.latitude, lon = pos.coords.longitude;
                    if(idTerreiroGlobal) {
                        await supabaseClient.from('terreiros').update({ latitude: lat, longitude: lon }).eq('id', idTerreiroGlobal);
                        alert('GPS Gravado com sucesso!');
                    }
                },
                (err) => alert('Erro no GPS: Libere a permissão.')
            );
        });
    }

    // --- DOAÇÕES ---
    window.carregarDoacoesPrometidas = async () => {
        if (!idTerreiroGlobal) return;
        const tbody = document.getElementById('tabelaDoacoesPrometidas');
        if(tbody) tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-gray-500">Buscando...</td></tr>';
        try {
            const { data: doacoes, error: errD } = await supabaseClient.from('doacoes_registradas').select('*').eq('terreiro_id', idTerreiroGlobal).order('entregue', { ascending: true }).order('data_registro', { ascending: false }); 
            if (errD) throw errD;
            const { data: mediuns } = await supabaseClient.from('mediuns').select('auth_id, nome_completo');
            const { data: itens } = await supabaseClient.from('itens_doacao').select('id, nome, descricao');
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
    // SAAS - GESTÃO DA PLATAFORMA (SÓ MÁRIO) E IMPORTAÇÃO CSV
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
            const btnBloqueio = t.status_bloqueado ? `<button onclick="alternarBloqueioTerreiro(${t.id}, false)" class="text-xs bg-gray-800 text-white py-1 px-3 rounded shadow">Desbloquear</button>` : `<button onclick="alternarBloqueioTerreiro(${t.id}, true)" class="text-xs bg-red-600 text-white py-1 px-3 rounded shadow">Bloquear</button>`;
            
            // Botão Novo: Importar CSV
            const btnImportar = `<button onclick="abrirModalImportacao(${t.id}, '${t.nome.replace(/'/g, "\\'")}')" class="text-xs bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded shadow ml-2"><i class="fas fa-file-csv"></i> CSV</button>`;
            
            const acaoHtml = `<div class="flex justify-center items-center">${btnBloqueio}${btnImportar}</div>`;
            
            tbody.innerHTML += `<tr class="border-b border-gray-100 ${t.status_bloqueado ? 'bg-red-50' : ''}"><td class="p-3 text-sm font-mono">${t.id}</td><td class="p-3 font-bold">${t.nome}</td><td class="p-3 text-center">${statusHtml}</td><td class="p-3 text-center">${acaoHtml}</td></tr>`;
        });
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

    // MODAL IMPORTAÇÃO E PROCESSAMENTO CSV (NOVO)
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
                    // Quebra por linhas e remove as vazias
                    const linhas = text.split(/\r?\n/).filter(l => l.trim() !== '');
                    if (linhas.length <= 1) throw new Error("O arquivo parece vazio ou só tem cabeçalho.");

                    const mediunsParaInserir = [];
                    // Pula o cabeçalho (começa do índice 1)
                    for (let i = 1; i < linhas.length; i++) {
                        // Suporta vírgula ou ponto e vírgula
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
                    
                    setTimeout(() => {
                        fecharModalImportacao();
                    }, 3000);

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
