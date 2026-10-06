let idTerreiroGlobal = null; 
let mediunsGrauCache = []; 

document.addEventListener('DOMContentLoaded', async () => {
    const dataOpcoes = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('dataHoje').textContent = new Date().toLocaleDateString('pt-BR', dataOpcoes);

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return window.location.href = 'index.html';

    try {
        const { data: perfil, error: erroPerfil } = await supabaseClient
            .from('mediuns')
            .select('nome_completo, is_admin, terreiro_id')
            .eq('auth_id', session.user.id)
            .single();

        if (erroPerfil) throw erroPerfil;

        if (!perfil.is_admin) {
            alert('Acesso negado. Esta área é restrita para administradores.');
            return window.location.href = 'presenca.html';
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
                document.getElementById('nomeTerreiroSidebar').textContent = terreiro.nome;
                
                const root = document.documentElement;
                if(terreiro.cor_primaria) root.style.setProperty('--cor-primaria', terreiro.cor_primaria);
                if(terreiro.cor_secundaria) root.style.setProperty('--cor-secundaria', terreiro.cor_secundaria);
                if(terreiro.cor_fundo) root.style.setProperty('--cor-fundo', terreiro.cor_fundo);
                if(terreiro.cor_texto) root.style.setProperty('--cor-texto', terreiro.cor_texto);
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
                } else if (menu.id === 'menuGrau') {
                    document.getElementById('secGrau').classList.remove('hidden');
                    titulo.textContent = 'Alteração de Grau';
                    carregarTabelaGraus();
                } else if (menu.id === 'menuDoacoes') {
                    document.getElementById('secDoacoes').classList.remove('hidden');
                    titulo.textContent = 'Doações e Campanhas';
                    carregarDoacoesCatalogo();
                    carregarDoacoesPrometidas(); // NOVO!
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

    // --- FUNÇÕES BÁSICAS ---
    async function carregarPainelInicial() {
        const { count: totalMediuns } = await supabaseClient.from('mediuns').select('*', { count: 'exact', head: true });
        document.getElementById('totalMediuns').textContent = totalMediuns || '0';
    }

    async function carregarQuadroMediuns() {
        const tbody = document.getElementById('tabelaTodosMediuns');
        const { data } = await supabaseClient.from('mediuns').select('nome_completo, grau, funcao, telefone, cadastro_completo').order('nome_completo');
        tbody.innerHTML = '';
        if(data) data.forEach(m => {
            const cargo = [m.grau, m.funcao].filter(Boolean).join(' / ') || '-';
            const status = m.cadastro_completo ? '<span class="text-green-600 font-bold">Ativo</span>' : '<span class="text-yellow-600 font-bold">Pendente</span>';
            tbody.innerHTML += `<tr class="border-b border-gray-100"><td class="py-2 px-3 text-gray-800">${m.nome_completo}</td><td class="py-2 px-3 text-gray-600">${cargo}</td><td class="py-2 px-3">${status}</td></tr>`;
        });
    }

    async function carregarTabelaGraus() {
        const tbody = document.getElementById('tabelaGraus');
        const { data } = await supabaseClient.from('mediuns').select('id, nome_completo, grau, funcao').order('nome_completo');
        if (data) mediunsGrauCache = data;
    }

    // --- NOVO MÓDULO: DOAÇÕES PROMETIDAS ---
    window.carregarDoacoesPrometidas = async () => {
        if (!idTerreiroGlobal) return;
        const tbody = document.getElementById('tabelaDoacoesPrometidas');
        tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-gray-500"><i class="fas fa-spinner fa-spin mr-2"></i> Buscando histórico...</td></tr>';

        try {
            // Pega as intenções gravadas no banco
            const { data: doacoes, error: errD } = await supabaseClient
                .from('doacoes_registradas')
                .select('id, medium_auth_id, item_id, quantidade, entregue, data_registro')
                .eq('terreiro_id', idTerreiroGlobal)
                .order('entregue', { ascending: true }) // Pendentes no topo
                .order('data_registro', { ascending: false }); // Mais recentes primeiro

            if (errD) throw errD;

            // Busca os nomes dos mediuns para traduzir o ID Auth -> Nome
            const { data: mediuns } = await supabaseClient.from('mediuns').select('auth_id, nome_completo');
            
            // Busca o catálogo de itens para traduzir o item_id -> Nome da Vela, etc.
            const { data: itens } = await supabaseClient.from('itens_doacao').select('id, nome, descricao');

            if (!doacoes || doacoes.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-gray-500">Nenhum registro encontrado ainda.</td></tr>';
                return;
            }

            tbody.innerHTML = '';
            
            doacoes.forEach(d => {
                const medium = mediuns?.find(m => m.auth_id === d.medium_auth_id)?.nome_completo || 'Médium';
                const itemObj = itens?.find(i => i.id === d.item_id);
                const itemNome = itemObj ? `${itemObj.nome} <br><span class="text-[10px] text-gray-400 font-normal">${itemObj.descricao || ''}</span>` : 'Item Desconhecido';
                
                const dataFormatada = new Date(d.data_registro).toLocaleDateString('pt-BR');
                
                const statusHtml = d.entregue 
                    ? '<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-bold whitespace-nowrap"><i class="fas fa-check mr-1"></i> Entregue</span>'
                    : '<span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-bold whitespace-nowrap"><i class="fas fa-clock mr-1"></i> Pendente</span>';

                const acaoHtml = d.entregue
                    ? `<button onclick="marcarDoacao(${d.id}, false)" class="text-xs text-gray-400 hover:text-gray-800 underline mt-1 whitespace-nowrap">Desfazer</button>`
                    : `<button onclick="marcarDoacao(${d.id}, true)" class="bg-tema-secundaria hover:opacity-90 text-white text-xs font-bold py-1.5 px-3 rounded shadow-sm whitespace-nowrap mt-1">Dar Baixa</button>`;

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
        } catch (error) {
            console.error('Erro ao listar doações prometidas:', error);
            tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-red-500">Erro ao carregar dados.</td></tr>`;
        }
    };

    // Função de botão disparada na listagem (Dá baixa na promessa)
    window.marcarDoacao = async (registroId, statusEntregue) => {
        const payload = { entregue: statusEntregue };
        if (statusEntregue) payload.data_entrega = new Date().toISOString();
        else payload.data_entrega = null;

        const { error } = await supabaseClient.from('doacoes_registradas').update(payload).eq('id', registroId);
        
        if (!error) {
            carregarDoacoesPrometidas(); // Recarrega a tabela para ver a mudança
        } else {
            alert('Erro ao atualizar o status: ' + error.message);
        }
    };

    // --- GERENCIAR CATÁLOGO (LISTA GERAL) ---
    async function carregarDoacoesCatalogo() {
        if (!idTerreiroGlobal) return;
        const tbody = document.getElementById('tabelaItensDoacao');
        
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
                    ? `<button onclick="alternarStatusCatalogo(${item.id}, false)" class="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold whitespace-nowrap hover:bg-red-200">Ocultar</button>`
                    : `<button onclick="alternarStatusCatalogo(${item.id}, true)" class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold whitespace-nowrap hover:bg-green-200">Ativar</button>`;
                
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
        }
    }

    window.alternarStatusCatalogo = async (id, status) => {
        const { error } = await supabaseClient.from('itens_doacao').update({ ativo: status }).eq('id', id);
        if (!error) carregarDoacoesCatalogo();
    };

    // --- CORES DA CASA ---
    async function carregarConfiguracoesCasa() {
        if (!idTerreiroGlobal) return;
        const { data } = await supabaseClient.from('terreiros').select('*').eq('id', idTerreiroGlobal).single();
        if (data) {
            document.getElementById('corPrimaria').value = data.cor_primaria || '#1e3a8a';
            document.getElementById('corSecundaria').value = data.cor_secundaria || '#16a34a';
            document.getElementById('corFundo').value = data.cor_fundo || '#f3f4f6';
            document.getElementById('corTexto').value = data.cor_texto || '#1f2937';
        }
    }

    document.getElementById('btnSalvarCores')?.addEventListener('click', async () => {
        const cor1 = document.getElementById('corPrimaria').value;
        const cor2 = document.getElementById('corSecundaria').value;
        const corF = document.getElementById('corFundo').value;
        const corT = document.getElementById('corTexto').value;
        
        await supabaseClient.from('terreiros').update({ cor_primaria: cor1, cor_secundaria: cor2, cor_fundo: corF, cor_texto: corT }).eq('id', idTerreiroGlobal);
        
        const root = document.documentElement;
        root.style.setProperty('--cor-primaria', cor1);
        root.style.setProperty('--cor-secundaria', cor2);
        root.style.setProperty('--cor-fundo', corF);
        root.style.setProperty('--cor-texto', corT);
        alert('Cores atualizadas!');
    });

});
