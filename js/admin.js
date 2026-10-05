document.addEventListener('DOMContentLoaded', async () => {
    // Coloca a data de hoje no cabeçalho
    const dataOpcoes = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('dataHoje').textContent = new Date().toLocaleDateString('pt-BR', dataOpcoes);

    // 1. Verifica se está logado
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
        window.location.href = 'index.html';
        return;
    }

    try {
        // 2. Busca o perfil do usuário para ver se ele é ADMIN
        const { data: perfil, error: erroPerfil } = await supabaseClient
            .from('mediuns')
            .select('nome_completo, is_admin, terreiro_id')
            .eq('auth_id', session.user.id)
            .single();

        if (erroPerfil) throw erroPerfil;

        // SE NÃO FOR ADMIN, expulsa da página e manda pra tela de presença
        if (!perfil.is_admin) {
            alert('Acesso negado. Esta área é restrita para administradores.');
            window.location.href = 'presenca.html';
            return;
        }

        document.getElementById('nomeAdmin').textContent = 'Olá, ' + perfil.nome_completo.split(' ')[0];

        // --- CONTROLE DE ABAS DO MENU LADO ESQUERDO ---
        const menus = document.querySelectorAll('.menu-item');
        const secoes = document.querySelectorAll('.secao-painel');

        menus.forEach(menu => {
            menu.addEventListener('click', (e) => {
                e.preventDefault();
                menus.forEach(m => m.classList.remove('bg-blue-800'));
                menu.classList.add('bg-blue-800');
                
                secoes.forEach(s => s.classList.add('hidden'));
                
                if (menu.id === 'menuVisaoGeral') {
                    document.getElementById('secVisaoGeral').classList.remove('hidden');
                } else if (menu.id === 'menuQuadroMediuns') {
                    document.getElementById('secQuadroMediuns').classList.remove('hidden');
                    carregarQuadroMediuns();
                } else if (menu.id === 'menuAgendaGiras') {
                    document.getElementById('secAgendaGiras').classList.remove('hidden');
                    carregarAgenda();
                }
            });
        });

        // 3. Busca o nome do Terreiro para colocar no menu lateral
        if (perfil.terreiro_id) {
            const { data: terreiro } = await supabaseClient
                .from('terreiros')
                .select('nome')
                .eq('id', perfil.terreiro_id)
                .single();
            
            if (terreiro) {
                document.getElementById('nomeTerreiroSidebar').textContent = terreiro.nome;
            }
        }

        document.getElementById('tabelaPresencas').innerHTML = `
            <tr>
                <td colspan="4" class="p-6 text-center text-gray-500">Nenhum médium registrou presença na gira de hoje ainda.</td>
            </tr>
        `;

    } catch (error) {
        console.error('Erro ao carregar painel:', error);
    }

    // ==========================================
    // GPS E LOGOUT
    // ==========================================
    const btnGravarLocalizacao = document.getElementById('btnGravarLocalizacao');
    const msgLocalizacao = document.getElementById('msgLocalizacao');

    if (btnGravarLocalizacao) {
        btnGravarLocalizacao.addEventListener('click', async () => {
            btnGravarLocalizacao.disabled = true;
            btnGravarLocalizacao.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Obtendo GPS...';
            msgLocalizacao.classList.add('hidden');
            
            if (!navigator.geolocation) {
                mostrarAvisoLocal('Navegador não suporta GPS.', 'erro');
                return;
            }

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    try {
                        const { data: terreiros } = await supabaseClient.from('terreiros').select('id').limit(1);
                        if (terreiros && terreiros.length > 0) {
                            const { error } = await supabaseClient.from('terreiros')
                                .update({ latitude: lat, longitude: lon })
                                .eq('id', terreiros[0].id);
                            
                            if (error) throw error;
                            
                            mostrarAvisoLocal(`✅ Sucesso! Coordenadas salvas.<br><span class="text-xs font-normal">Lat: ${lat.toFixed(6)} | Lon: ${lon.toFixed(6)}</span>`, 'sucesso');
                        } else {
                            mostrarAvisoLocal('Nenhum terreiro encontrado no banco.', 'erro');
                        }
                    } catch (error) {
                        mostrarAvisoLocal('Erro no banco: ' + error.message, 'erro');
                    }
                },
                (error) => mostrarAvisoLocal('Não foi possível obter a localização. Libere o GPS.', 'erro'),
                { enableHighAccuracy: true, timeout: 15000 } 
            );
        });
    }

    function mostrarAvisoLocal(msg, tipo) {
        msgLocalizacao.innerHTML = msg;
        msgLocalizacao.classList.remove('hidden');
        msgLocalizacao.className = tipo === 'sucesso' 
            ? 'mt-4 text-sm font-bold p-4 rounded-lg bg-green-100 text-green-800 border-l-4 border-green-600 block'
            : 'mt-4 text-sm font-bold p-4 rounded-lg bg-red-100 text-red-800 border-l-4 border-red-600 block';
        btnGravarLocalizacao.disabled = false;
        btnGravarLocalizacao.innerHTML = 'Atualizar Localização Novamente';
    }

    document.getElementById('btnSair').addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.href = 'index.html';
    });

    // ==========================================
    // FUNÇÕES DAS NOVAS ABAS (Médiuns e Agenda)
    // ==========================================

    async function carregarQuadroMediuns() {
        const tbody = document.getElementById('tabelaTodosMediuns');
        tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-gray-500">Buscando médiuns...</td></tr>';
        
        const { data, error } = await supabaseClient
            .from('mediuns')
            .select('nome_completo, grau, funcao, telefone, cadastro_completo')
            .order('nome_completo');
            
        if (error) {
            tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-red-500">Erro: ${error.message}</td></tr>`;
            return;
        }
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-gray-500">Nenhum médium cadastrado.</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        data.forEach(m => {
            const cargo = [m.grau, m.funcao].filter(Boolean).join(' / ') || '-';
            const status = m.cadastro_completo 
                ? '<span class="text-green-600 font-bold"><i class="fas fa-check"></i> Ativo</span>' 
                : '<span class="text-yellow-600 font-bold"><i class="fas fa-clock"></i> Pendente</span>';
            
            tbody.innerHTML += `
                <tr class="border-b border-gray-100 hover:bg-gray-50">
                    <td class="p-3 text-gray-800">${m.nome_completo}</td>
                    <td class="p-3 text-gray-600">${cargo}</td>
                    <td class="p-3 text-gray-600">${m.telefone || '-'}</td>
                    <td class="p-3">${status}</td>
                </tr>
            `;
        });
    }

    async function carregarAgenda() {
        const tbody = document.getElementById('tabelaGirasCadastradas');
        tbody.innerHTML = '<tr><td colspan="3" class="p-6 text-center text-gray-500">Buscando giras...</td></tr>';
        
        const agora = new Date().toISOString();
        const { data, error } = await supabaseClient
            .from('agenda')
            .select('*')
            .gte('data_hora_fim', agora) // Só busca as giras futuras
            .order('data_hora_inicio', { ascending: true })
            .limit(10); 
            
        if (error) {
            tbody.innerHTML = `<tr><td colspan="3" class="p-6 text-center text-red-500">Erro: ${error.message}</td></tr>`;
            return;
        }
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="p-6 text-center text-gray-500">Nenhuma gira agendada.</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        data.forEach(g => {
            const inicio = new Date(g.data_hora_inicio).toLocaleString('pt-BR');
            const img = g.imagem_url 
                ? `<a href="${g.imagem_url}" target="_blank" class="text-blue-500 hover:underline"><i class="fas fa-image"></i> Ver Imagem</a>` 
                : '<span class="text-gray-400">Sem imagem</span>';
                
            tbody.innerHTML += `
                <tr class="border-b border-gray-100 hover:bg-gray-50">
                    <td class="p-3 text-gray-800 font-medium">${g.titulo}</td>
                    <td class="p-3 text-gray-600">${inicio}</td>
                    <td class="p-3">${img}</td>
                </tr>
            `;
        });
    }

    // Formulário de Nova Gira (AGORA COM UPLOAD DE FOTO)
    const formNovaGira = document.getElementById('formNovaGira');
    if (formNovaGira) {
        formNovaGira.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnSalvarGira');
            const msg = document.getElementById('msgGira');
            
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Processando...';
            msg.classList.add('hidden');
            
            const titulo = document.getElementById('giraTitulo').value;
            const inputArquivo = document.getElementById('giraArquivo');
            let imagem_url = document.getElementById('giraImagem').value; 
            const data_hora_inicio = document.getElementById('giraInicio').value;
            const data_hora_fim = document.getElementById('giraFim').value;
            
            try {
                // SE O USUÁRIO ENVIOU UM ARQUIVO, FAZ O UPLOAD PARA O SUPABASE
                if (inputArquivo.files && inputArquivo.files.length > 0) {
                    msg.innerHTML = 'Fazendo upload da imagem... <i class="fas fa-spinner fa-spin"></i>';
                    msg.className = 'text-sm mt-2 text-blue-600 block font-bold';
                    msg.classList.remove('hidden');

                    const arquivo = inputArquivo.files[0];
                    const extensao = arquivo.name.split('.').pop();
                    const nomeArquivo = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${extensao}`;
                    
                    const { data: uploadData, error: uploadError } = await supabaseClient.storage
                        .from('giras')
                        .upload(nomeArquivo, arquivo);
                        
                    if (uploadError) throw new Error('Falha ao subir a imagem: ' + uploadError.message);
                    
                    const { data: publicUrlData } = supabaseClient.storage
                        .from('giras')
                        .getPublicUrl(nomeArquivo);
                        
                    imagem_url = publicUrlData.publicUrl; 
                }

                msg.innerHTML = 'Salvando gira na agenda... <i class="fas fa-spinner fa-spin"></i>';
                msg.classList.remove('hidden');

                const { data: terreiros } = await supabaseClient.from('terreiros').select('id').limit(1);
                const terreiro_id = terreiros[0]?.id;
                
                const { error } = await supabaseClient.from('agenda').insert([{
                    terreiro_id,
                    titulo,
                    imagem_url: imagem_url || null, 
                    data_hora_inicio,
                    data_hora_fim
                }]);
                
                if (error) throw error;
                
                msg.innerHTML = '✅ Gira salva com sucesso!';
                msg.className = 'text-sm mt-2 text-green-600 block font-bold';
                formNovaGira.reset();
                carregarAgenda(); 
                
            } catch (err) {
                msg.innerHTML = '❌ Erro: ' + err.message;
                msg.className = 'text-sm mt-2 text-red-600 block font-bold';
            } finally {
                btn.disabled = false;
                btn.innerHTML = 'Salvar Gira na Agenda';
            }
        });
    }
});
