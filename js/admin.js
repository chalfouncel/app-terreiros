let idTerreiroGlobal = null; 
let mediunsGrauCache = []; 
let perfilAdminLogado = null; // Guarda quem está logado para validar acessos

document.addEventListener('DOMContentLoaded', async () => {
    // Data Cabeçalho
    const dataOpcoes = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('dataHoje').textContent = new Date().toLocaleDateString('pt-BR', dataOpcoes);

    // Verifica Sessão
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return window.location.href = 'index.html';

    try {
        // Busca Perfil logado e suas permissões
        const { data: perfil, error: erroPerfil } = await supabaseClient
            .from('mediuns')
            .select('nome_completo, is_admin, terreiro_id, perm_agenda, perm_grau, perm_financeiro, perm_doacoes, perm_admin')
            .eq('auth_id', session.user.id)
            .single();

        if (erroPerfil) throw erroPerfil;
        
        perfilAdminLogado = perfil;

        // O usuário tem direito de entrar no painel? (É super admin OU tem pelo menos uma permissão?)
        const temAcessoPainel = perfil.is_admin || perfil.perm_agenda || perfil.perm_grau || perfil.perm_financeiro || perfil.perm_doacoes || perfil.perm_admin;

        if (!temAcessoPainel) {
            alert('Acesso negado. Você não tem permissão para acessar o Painel de Gestão.');
            return window.location.href = 'presenca.html';
        }

        // ESCONDER MENUS não autorizados (Apenas se NÃO for o Super Admin)
        if (!perfil.is_admin) {
            if (!perfil.perm_agenda) document.getElementById('menuAgendaGiras').classList.add('hidden');
            if (!perfil.perm_grau) document.getElementById('menuGrau').classList.add('hidden');
            if (!perfil.perm_financeiro) document.getElementById('menuFinanceiro').classList.add('hidden');
            if (!perfil.perm_doacoes) document.getElementById('menuDoacoes').classList.add('hidden');
            if (!perfil.perm_admin) document.getElementById('menuAdmin').classList.add('hidden');
        }

        document.getElementById('nomeAdmin').textContent = 'Olá, ' + perfil.nome_completo.split(' ')[0];
        idTerreiroGlobal = perfil.terreiro_id;

        // Busca e Aplica Configurações da Casa (Nome, Logo, Cores)
        if (idTerreiroGlobal) {
            const { data: terreiro } = await supabaseClient
                .from('terreiros')
                .select('nome, logo_url, cor_primaria, cor_secundaria, cor_fundo, cor_texto')
                .eq('id', idTerreiroGlobal)
                .single();
            
            if (terreiro) {
                document.getElementById('nomeTerreiroSidebar').textContent = terreiro.nome;
                
                // Aplica Cores Dinâmicas
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
                    titulo.textContent = 'Administração do Terreiro';
                    carregarConfiguracoesCasa();
                }
            });
        });

        carregarPainelInicial();

    } catch (error) {
        console.error('Erro geral:', error);
    }

    // ==========================================
    // FUNÇÕES DE CADA ABA
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
            // Busca presenças e médiuns em paralelo (cruza os dados no Javascript para evitar erros)
            const { data: presencas } = await supabaseClient.from('presencas').select('usuario_id, data_hora_checkin').eq('evento_id', giraAtualId).order('data_hora_checkin', { ascending: false });
            const { data: todosMediuns } = await supabaseClient.from('mediuns').select('id, auth_id, nome_completo');
            
            document.getElementById('totalPresentes').textContent = presencas ? presencas.length : '0';

            if (presencas && presencas.length > 0) {
                tabelaPresencas.innerHTML = ''; 
                presencas.forEach(p => {
                    // Tenta achar o médium cruzando pelo auth_id (novo) ou id numerico (antigo)
                    const md = todosMediuns?.find(m => m.auth_id === p.usuario_id || String(m.id) === String(p.usuario_id));
                    const nome = md ? md.nome_completo : 'Médium Excluído/Desconhecido';
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
        // Agora buscamos as permissões junto
        const { data } = await supabaseClient.from('mediuns').select('id, nome_completo, grau, funcao, telefone, cadastro_completo, is_admin, perm_agenda, perm_grau, perm_financeiro, perm_doacoes, perm_admin').order('nome_completo');
        tbody.innerHTML = '';
        
        if(data) data.forEach(m => {
            const cargo = [m.grau, m.funcao].filter(Boolean).join(' / ') || '-';
            const status = m.cadastro_completo ? '<span class="text-green-600 font-bold">Ativo</span>' : '<span class="text-yellow-600 font-bold">Pendente</span>';
            
            let acoesHtml = '<span class="text-gray-400 text-xs">Sem acesso</span>';
            
            // SOMENTE o Super Admin (is_admin = true) vê os botões de Lixeira e Permissões
            if (perfilAdminLogado && perfilAdminLogado.is_admin) {
                // Junta as permissões numa string para passar fácil pra função
                const perms = `${m.perm_agenda || false},${m.perm_grau || false},${m.perm_financeiro || false},${m.perm_doacoes || false},${m.perm_admin || false}`;
                
                acoesHtml = `
                    <div class="flex items-center justify-center space-x-4">
                        <button onclick="abrirModalPermissoes(${m.id}, '${m.nome_completo}', '${perms}')" class="text-blue-500 hover:text-blue-700 transition" title="Permissões de Acesso">
                            <i class="fas fa-key"></i>
                        </button>
                        <button onclick="excluirMedium(${m.id}, '${m.nome_completo}')" class="text-red-500 hover:text-red-700 transition" title="Excluir Médium">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
            }

            tbody.innerHTML += `
                <tr class="border-b border-gray-100 hover:bg-gray-50 py-1">
                    <td class="py-2 px-3 text-gray-800">${m.nome_completo}</td>
                    <td class="py-2 px-3 text-gray-600">${cargo}</td>
                    <td class="py-2 px-3 text-gray-600">${m.telefone || '-'}</td>
                    <td class="py-2 px-3">${status}</td>
                    <td class="py-2 px-3 text-center">${acoesHtml}</td>
                </tr>`;
        });
    }

    // --- LÓGICA DE EXCLUSÃO DE MÉDIUM ---
    window.excluirMedium = async (id, nome) => {
        if(!confirm(`ATENÇÃO: Tem certeza que deseja excluir DEFINITIVAMENTE o médium ${nome}?\n\nEle perderá o acesso ao aplicativo imediatamente e todo o histórico será afetado.`)) return;
        
        const { error } = await supabaseClient.from('mediuns').delete().eq('id', id);
        
        if (error) {
            alert('Erro ao excluir: ' + error.message);
        } else {
            alert('Médium excluído com sucesso!');
            carregarQuadroMediuns();
        }
    };

    // --- LÓGICA DO MODAL DE PERMISSÕES ---
    const modalPermissoes = document.getElementById('modalPermissoes');
        
    window.abrirModalPermissoes = (id, nome, permsString) => {
        document.getElementById('idMediumPermissao').value = id;
        document.getElementById('nomeMediumPermissao').textContent = nome;
        
        const [pAgenda, pGrau, pFin, pDoa, pAdmin] = permsString.split(',');
        
        document.getElementById('chkPermAgenda').checked = pAgenda === 'true';
        document.getElementById('chkPermGrau').checked = pGrau === 'true';
        document.getElementById('chkPermFinanceiro').checked = pFin === 'true';
        document.getElementById('chkPermDoacoes').checked = pDoa === 'true';
        document.getElementById('chkPermAdmin').checked = pAdmin === 'true';

        modalPermissoes.classList.remove('hidden');
    };

    const btnFecharPermissoes = document.getElementById('btnFecharPermissoes');
    if (btnFecharPermissoes) {
        btnFecharPermissoes.addEventListener('click', () => {
            modalPermissoes.classList.add('hidden');
        });
    }

    const btnSalvarPermissoes = document.getElementById('btnSalvarPermissoes');
    if (btnSalvarPermissoes) {
        btnSalvarPermissoes.addEventListener('click', async () => {
            const btn = document.getElementById('btnSalvarPermissoes');
            const idMedium = document.getElementById('idMediumPermissao').value;
            
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Salvando...';
            
            const pAgenda = document.getElementById('chkPermAgenda').checked;
            const pGrau = document.getElementById('chkPermGrau').checked;
            const pFin = document.getElementById('chkPermFinanceiro').checked;
            const pDoa = document.getElementById('chkPermDoacoes').checked;
            const pAdmin = document.getElementById('chkPermAdmin').checked;

            const { error } = await supabaseClient.from('mediuns').update({
                perm_agenda: pAgenda,
                perm_grau: pGrau,
                perm_financeiro: pFin,
                perm_doacoes: pDoa,
                perm_admin: pAdmin
            }).eq('id', idMedium);

            btn.disabled = false;
            btn.innerHTML = 'Salvar Permissões';

            if (error) {
                alert('Erro ao salvar permissões: ' + error.message);
            } else {
                modalPermissoes.classList.add('hidden');
                carregarQuadroMediuns(); // Recarrega para ver os dados atualizados
            }
        });
    }

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

    // --- MÓDULO DE GRAUS ---
    const opcoesGrau = ['-', 'I', 'IJ', 'B', 'BJ', 'T', 'TJ', 'SCT', 'Escola de CT', 'CT', 'SCCT', 'Escola de CCT', 'CCT'];
    const opcoesFuncao = ['-', 'MG', 'MGA', 'MC', 'MCA', 'MD', 'MDA', 'Cantina'];

    function renderizarOpcoes(lista, valorAtual) {
        return lista.map(op => `<option value="${op === '-' ? '' : op}" ${op === valorAtual ? 'selected' : ''}>${op}</option>`).join('');
    }

    async function carregarTabelaGraus() {
        const tbody = document.getElementById('tabelaGraus');
        tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center">Buscando...</td></tr>';
        
        const { data } = await supabaseClient.from('mediuns').select('id, nome_completo, grau, funcao').order('nome_completo');
        if (data) {
            mediunsGrauCache = data;
            renderizarGraus(data);
        }
    }

    function renderizarGraus(lista) {
        const tbody = document.getElementById('tabelaGraus');
        tbody.innerHTML = '';
        lista.forEach(m => {
            tbody.innerHTML += `
                <tr class="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td class="py-2 px-3 text-gray-800 font-medium">${m.nome_completo}</td>
                    <td class="py-2 px-3">
                        <select id="grau_${m.id}" class="border border-gray-300 rounded px-2 py-1 bg-white text-sm focus:ring-tema-primaria outline-none w-full max-w-[120px]">
                            ${renderizarOpcoes(opcoesGrau, m.grau || '-')}
                        </select>
                    </td>
                    <td class="py-2 px-3">
                        <select id="func_${m.id}" class="border border-gray-300 rounded px-2 py-1 bg-white text-sm focus:ring-tema-primaria outline-none w-full max-w-[120px]">
                            ${renderizarOpcoes(opcoesFuncao, m.funcao || '-')}
                        </select>
                    </td>
                    <td class="py-2 px-3 text-center">
                        <button onclick="salvarGrau(${m.id})" id="btnGrau_${m.id}" class="bg-tema-primaria hover:opacity-90 text-white px-3 py-1 rounded text-xs font-bold transition">Salvar</button>
                    </td>
                </tr>
            `;
        });
    }

    document.getElementById('buscaMediumGrau').addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase();
        const filtrado = mediunsGrauCache.filter(m => m.nome_completo.toLowerCase().includes(termo));
        renderizarGraus(filtrado);
    });

    window.salvarGrau = async (id) => {
        const btn = document.getElementById(`btnGrau_${id}`);
        const grau = document.getElementById(`grau_${id}`).value;
        const funcao = document.getElementById(`func_${id}`).value;
        
        btn.innerHTML = 'Salvando...';
        btn.disabled = true;

        const { error } = await supabaseClient.from('mediuns').update({ grau, funcao }).eq('id', id);
        
        btn.disabled = false;
        if (error) {
            btn.innerHTML = 'Erro!';
            btn.classList.replace('bg-tema-primaria', 'bg-red-500');
        } else {
            btn.innerHTML = 'Salvo <i class="fas fa-check"></i>';
            btn.classList.replace('bg-tema-primaria', 'bg-green-600');
            setTimeout(() => {
                btn.innerHTML = 'Salvar';
                btn.classList.replace('bg-green-600', 'bg-tema-primaria');
            }, 2000);
            
            const md = mediunsGrauCache.find(m => m.id === id);
            if(md) { md.grau = grau; md.funcao = funcao; }
        }
    };

    // --- MÓDULO FINANCEIRO ---
    async function carregarFinanceiro() {
        const anoSelect = document.getElementById('selectAnoFinanceiro');
        const ano = parseInt(anoSelect.value);
        const tbody = document.getElementById('tabelaFinanceiro');
        tbody.innerHTML = '<tr><td colspan="14" class="p-6 text-center text-gray-500">Buscando histórico...</td></tr>';
        
        const { data: mediuns, error: erroMed } = await supabaseClient.from('mediuns').select('id, nome_completo').order('nome_completo');
        if(erroMed) return;

        const { data: pgtos, error: erroPgto } = await supabaseClient.from('financeiro').select('*').eq('ano', ano);
        
        tbody.innerHTML = '';
        
        mediuns.forEach(m => {
            const meusPgtos = pgtos ? pgtos.filter(p => p.medium_id === m.id) : [];
            let htmlMeses = '';
            let emDia = true;
            
            const mesAtual = new Date().getMonth() + 1; 
            const anoAtual = new Date().getFullYear();

            for (let i = 1; i <= 12; i++) {
                const pago = meusPgtos.some(p => p.mes === i && p.pago);
                const passou = (ano < anoAtual) || (ano === anoAtual && i < mesAtual);
                if (passou && !pago) emDia = false;

                const checkStr = pago ? 'checked' : '';
                htmlMeses += `
                    <td class="py-1 px-1 border-b border-gray-100">
                        <input type="checkbox" ${checkStr} class="w-4 h-4 cursor-pointer accent-tema-secundaria" 
                        onchange="salvarPagamento(${m.id}, ${i}, ${ano}, this.checked)">
                    </td>
                `;
            }

            const statusHtml = emDia 
                ? '<span class="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">Em Dia</span>'
                : '<span class="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded">Pendente</span>';

            tbody.innerHTML += `
                <tr class="hover:bg-gray-50">
                    <td class="py-2 px-3 border-b border-gray-100 text-left font-medium text-gray-800 text-xs truncate max-w-[220px]" title="${m.nome_completo}">
                        ${m.nome_completo}
                    </td>
                    ${htmlMeses}
                    <td class="py-2 px-2 border-b border-gray-100 bg-gray-50">${statusHtml}</td>
                </tr>
            `;
        });
    }

    document.getElementById('selectAnoFinanceiro').addEventListener('change', carregarFinanceiro);

    window.salvarPagamento = async (mediumId, mes, ano, status) => {
        const { error } = await supabaseClient.from('financeiro').upsert({
            medium_id: mediumId,
            mes: mes,
            ano: ano,
            pago: status
        }, { onConflict: 'medium_id,mes,ano' });
        
        if(error) {
            alert('Erro no banco: ' + error.message);
            carregarFinanceiro(); 
        }
    };

    // --- MÓDULO ADMINISTRAÇÃO DA CASA ---
    async function carregarConfiguracoesCasa() {
        if (!idTerreiroGlobal) return;
        
        const { data } = await supabaseClient.from('terreiros')
            .select('logo_url, cor_primaria, cor_secundaria, cor_fundo, cor_texto')
            .eq('id', idTerreiroGlobal).single();
            
        if (data) {
            if(data.logo_url) {
                const img = document.getElementById('previewLogo');
                img.src = data.logo_url;
                img.classList.remove('hidden');
                document.getElementById('placeholderLogo').classList.add('hidden');
            }
            
            document.getElementById('corPrimaria').value = data.cor_primaria || '#1e3a8a';
            document.getElementById('corSecundaria').value = data.cor_secundaria || '#16a34a';
            document.getElementById('corFundo').value = data.cor_fundo || '#f3f4f6';
            document.getElementById('corTexto').value = data.cor_texto || '#1f2937';
        }
    }

    const inputUploadLogo = document.getElementById('uploadLogo');
    if(inputUploadLogo) {
        inputUploadLogo.addEventListener('change', function(e) {
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

    const btnLogo = document.getElementById('btnSalvarLogo');
    if(btnLogo) {
        btnLogo.addEventListener('click', async () => {
            const input = document.getElementById('uploadLogo');
            const msg = document.getElementById('msgLogo');
            if(!input.files || input.files.length === 0) {
                alert('Selecione uma imagem primeiro clicando em "Escolher arquivo".');
                return;
            }
            
            btnLogo.disabled = true;
            btnLogo.textContent = 'Enviando...';
            msg.classList.remove('hidden');
            msg.textContent = 'Fazendo upload da imagem...';
            msg.className = 'text-xs font-bold mt-2 text-tema-primaria';
            
            try {
                const arquivo = input.files[0];
                const extensao = arquivo.name.split('.').pop();
                const nomeArquivo = `logo_${idTerreiroGlobal}_${Date.now()}.${extensao}`;
                
                const { error: errUp } = await supabaseClient.storage.from('logos').upload(nomeArquivo, arquivo);
                if (errUp) throw errUp;
                
                const { data: urlData } = supabaseClient.storage.from('logos').getPublicUrl(nomeArquivo);
                const novaUrl = urlData.publicUrl;
                
                const { error: errBd } = await supabaseClient.from('terreiros').update({ logo_url: novaUrl }).eq('id', idTerreiroGlobal);
                if (errBd) throw errBd;
                
                document.getElementById('logoSidebar').src = novaUrl;
                document.getElementById('logoSidebar').classList.remove('hidden');
                
                msg.textContent = '✅ Logo salva com sucesso no sistema!';
                msg.className = 'text-xs font-bold mt-2 text-tema-secundaria';
            } catch (error) {
                msg.textContent = '❌ Erro: ' + error.message;
                msg.className = 'text-xs font-bold mt-2 text-red-600';
            } finally {
                btnLogo.disabled = false;
                btnLogo.textContent = 'Salvar Imagem';
            }
        });
    }

    const btnCores = document.getElementById('btnSalvarCores');
    if(btnCores) {
        btnCores.addEventListener('click', async () => {
            const cor1 = document.getElementById('corPrimaria').value;
            const cor2 = document.getElementById('corSecundaria').value;
            const corF = document.getElementById('corFundo').value;
            const corT = document.getElementById('corTexto').value;
            const msg = document.getElementById('msgCores');
            
            btnCores.disabled = true;
            btnCores.textContent = 'Salvando...';
            
            try {
                const { error } = await supabaseClient.from('terreiros').update({
                    cor_primaria: cor1,
                    cor_secundaria: cor2,
                    cor_fundo: corF,
                    cor_texto: corT
                }).eq('id', idTerreiroGlobal);
                
                if (error) throw error;
                
                const root = document.documentElement;
                root.style.setProperty('--cor-primaria', cor1);
                root.style.setProperty('--cor-secundaria', cor2);
                root.style.setProperty('--cor-fundo', corF);
                root.style.setProperty('--cor-texto', corT);
                
                msg.textContent = '✅ Tema atualizado!';
                msg.className = 'text-sm font-bold mt-3 text-tema-secundaria block';
                setTimeout(() => msg.classList.add('hidden'), 5000);
            } catch (error) {
                msg.textContent = '❌ Erro: ' + error.message;
                msg.className = 'text-sm font-bold mt-3 text-red-600 block';
            } finally {
                btnCores.disabled = false;
                btnCores.textContent = 'Salvar e Aplicar Cores';
            }
        });
    }

    const btnGps = document.getElementById('btnGravarLocalizacao');
    if (btnGps) {
        btnGps.addEventListener('click', async () => {
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

    // ==========================================
    // MÓDULOS DE DOAÇÃO ADICIONADOS
    // ==========================================

    window.carregarDoacoesPrometidas = async () => {
        if (!idTerreiroGlobal) return;
        const tbody = document.getElementById('tabelaDoacoesPrometidas');
        if(tbody) tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-gray-500"><i class="fas fa-spinner fa-spin mr-2"></i> Buscando histórico...</td></tr>';

        try {
            const { data: doacoes, error: errD } = await supabaseClient
                .from('doacoes_registradas')
                .select('id, medium_auth_id, item_id, quantidade, entregue, data_registro')
                .eq('terreiro_id', idTerreiroGlobal)
                .order('entregue', { ascending: true }) 
                .order('data_registro', { ascending: false }); 

            if (errD) throw errD;

            const { data: mediuns } = await supabaseClient.from('mediuns').select('auth_id, nome_completo');
            const { data: itens } = await supabaseClient.from('itens_doacao').select('id, nome, descricao');

            window.dadosDoacoesParaPDF = { doacoes, mediuns, itens };

            if (!doacoes || doacoes.length === 0) {
                if(tbody) tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-gray-500">Nenhum registro encontrado ainda.</td></tr>';
                return;
            }

            if(tbody) {
                tbody.innerHTML = '';
                doacoes.forEach(d => {
                    const medium = mediuns?.find(m => m.auth_id === d.medium_auth_id)?.nome_completo || 'Médium';
                    const itemObj = itens?.find(i => i.id == d.item_id);
                    const itemNome = itemObj ? `${itemObj.nome} <br><span class="text-[10px] text-gray-400 font-normal">${itemObj.descricao || ''}</span>` : 'Item Desconhecido';
                    
                    const dataFormatada = new Date(d.data_registro).toLocaleDateString('pt-BR');
                    
                    const statusHtml = d.entregue 
                        ? '<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-bold whitespace-nowrap"><i class="fas fa-check mr-1"></i> Entregue</span>'
                        : '<span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-bold whitespace-nowrap"><i class="fas fa-clock mr-1"></i> Pendente</span>';

                    const acaoHtml = d.entregue
                        ? `<button onclick="marcarDoacao('${d.id}', false)" class="text-xs text-gray-400 hover:text-gray-800 underline mt-1 whitespace-nowrap">Desfazer</button>`
                        : `<button onclick="marcarDoacao('${d.id}', true)" class="bg-tema-secundaria hover:opacity-90 text-white text-xs font-bold py-1.5 px-3 rounded shadow-sm whitespace-nowrap mt-1">Dar Baixa</button>`;

                    const estiloLinha = d.entregue ? 'bg-gray-50 opacity-80' : 'bg-white';

                    tbody.innerHTML += `
                        <tr class="border-b border-gray-100 transition ${estiloLinha}">
                            <td class="p-3 text-gray-800 font-medium text-sm">${medium}</td>
                            <td class="p-3 text-gray-700 text-sm font-semibold leading-tight">${itemNome}</td>
                            <td class="p-3 text-center text-lg font-black text-tema-primaria">${d.quantidade}</td>
                            <td class="p-3 text-gray-500 text-xs">${dataFormatada}</td>
                            <td class="p-3 text-center flex flex-col items-center justify-center">
                                ${statusHtml}
                                ${acaoHtml}
                            </td>
                        </tr>
                    `;
                });
            }
        } catch (error) {
            console.error('Erro ao listar doações prometidas:', error);
            if(tbody) tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-red-500">Erro ao carregar dados.</td></tr>`;
        }
    };

    window.marcarDoacao = async (registroId, statusEntregue) => {
        const payload = { entregue: statusEntregue };
        if (statusEntregue) payload.data_entrega = new Date().toISOString();
        else payload.data_entrega = null;

        const { error } = await supabaseClient.from('doacoes_registradas').update(payload).eq('id', registroId);
        
        if (!error) {
            carregarDoacoesPrometidas(); 
        } else {
            alert('Erro ao atualizar o status: ' + error.message);
        }
    };

    window.carregarDoacoesCatalogo = async () => {
        if (!idTerreiroGlobal) return;
        const tbody = document.getElementById('tabelaItensDoacao');
        if(!tbody) return;

        const { data, error } = await supabaseClient
            .from('itens_doacao')
            .select('*')
            .eq('terreiro_id', idTerreiroGlobal)
            .order('descricao', { ascending: true })
            .order('nome', { ascending: true });

        if (error) return;

        tbody.innerHTML = '';
        if (data && data.length > 0) {
            data.forEach(item => {
                const btnAtivo = item.ativo 
                    ? `<button onclick="alternarStatusCatalogo('${item.id}', false)" class="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold whitespace-nowrap hover:bg-red-200">Ocultar</button>`
                    : `<button onclick="alternarStatusCatalogo('${item.id}', true)" class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold whitespace-nowrap hover:bg-green-200">Ativar</button>`;
                
                const estiloLinha = item.ativo ? '' : 'opacity-40 grayscale';
                const categoria = item.descricao || '-';
                
                tbody.innerHTML += `
                    <tr class="border-b border-gray-100 hover:bg-gray-50 ${estiloLinha}">
                        <td class="p-3 text-gray-800 text-sm font-medium">${item.nome}</td>
                        <td class="p-3 text-gray-500 text-xs">${categoria}</td>
                        <td class="p-3 text-center">${btnAtivo}</td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="3" class="p-6 text-center text-gray-500">Nenhum item cadastrado ainda.</td></tr>';
        }
    }

    window.alternarStatusCatalogo = async (id, status) => {
        const { error } = await supabaseClient.from('itens_doacao').update({ ativo: status }).eq('id', id);
        if (!error) carregarDoacoesCatalogo();
    };

    const formNovoItemDoacao = document.getElementById('formNovoItemDoacao');
    if (formNovoItemDoacao) {
        formNovoItemDoacao.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnSalvarDoacao');
            const msg = document.getElementById('msgDoacao');
            
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Salvando...';
            msg.classList.add('hidden');

            const nome = document.getElementById('doacaoNome').value;
            const descricao = document.getElementById('doacaoDescricao').value;
            const valorRaw = document.getElementById('doacaoValor').value;
            const valor = valorRaw ? parseFloat(valorRaw) : null;
            const imagem_url = document.getElementById('doacaoImagem').value;

            const { error } = await supabaseClient.from('itens_doacao').insert([{
                terreiro_id: idTerreiroGlobal,
                nome,
                descricao,
                valor_sugerido: valor,
                imagem_url,
                ativo: true
            }]);

            btn.disabled = false;
            btn.textContent = 'Cadastrar Item';

            if (error) {
                msg.textContent = 'Erro ao salvar: ' + error.message;
                msg.className = 'text-sm mt-2 text-red-600 block font-bold';
            } else {
                msg.textContent = '✅ Item cadastrado com sucesso!';
                msg.className = 'text-sm mt-2 text-green-600 block font-bold';
                formNovoItemDoacao.reset();
                carregarDoacoesCatalogo();
                setTimeout(() => msg.classList.add('hidden'), 3000);
            }
        });
    }

    const btnGerarPDF = document.getElementById('btnGerarPDF');
    if(btnGerarPDF) {
        btnGerarPDF.addEventListener('click', () => {
            const dados = window.dadosDoacoesParaPDF;
            
            if (!dados || !dados.doacoes || dados.doacoes.length === 0) {
                alert('Não há doações para exportar.');
                return;
            }

            const btn = document.getElementById('btnGerarPDF');
            const textoOriginal = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Gerando...';
            btn.disabled = true;

            const containerPDF = document.createElement('div');
            containerPDF.style.padding = '30px';
            containerPDF.style.fontFamily = 'Arial, sans-serif';
            containerPDF.style.color = '#333';

            const nomeCasa = document.getElementById('nomeTerreiroSidebar').textContent;

            let html = `
                <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #16a34a; padding-bottom: 10px;">
                    <h2 style="margin: 0; color: #1e3a8a; font-size: 24px;">Relatório de Doações</h2>
                    <h3 style="margin: 5px 0 0 0; color: #444; font-size: 16px;">${nomeCasa}</h3>
                    <p style="margin: 5px 0 0 0; color: #666; font-size: 12px;">Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <thead>
                        <tr style="background-color: #f3f4f6;">
                            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Médium</th>
                            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Item</th>
                            <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Qtd</th>
                            <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            dados.doacoes.forEach(d => {
                const medium = dados.mediuns?.find(m => m.auth_id === d.medium_auth_id)?.nome_completo || 'Médium';
                const itemObj = dados.itens?.find(i => i.id == d.item_id);
                const itemNome = itemObj ? itemObj.nome : 'Item Desconhecido';
                const status = d.entregue ? '<span style="color: #16a34a; font-weight: bold;">Entregue</span>' : '<span style="color: #ca8a04;">Pendente</span>';

                html += `
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;">${medium}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${itemNome}</td>
                        <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${d.quantidade}</td>
                        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${status}</td>
                    </tr>
                `;
            });

            html += `</tbody></table>`;
            containerPDF.innerHTML = html;

            const opt = {
                margin:       10,
                filename:     'Relatorio_Doacoes.pdf',
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2 },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            html2pdf().set(opt).from(containerPDF).save().then(() => {
                btn.innerHTML = textoOriginal;
                btn.disabled = false;
            });
        });
    }
});
