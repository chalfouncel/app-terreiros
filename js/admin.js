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
            .from('perfis')
            .select('nome_completo, is_admin, terreiro_id')
            .eq('id', session.user.id)
            .single();

        if (erroPerfil) throw erroPerfil;

        if (!perfil.is_admin) {
            alert('Acesso negado. Esta área é restrita para administradores.');
            window.location.href = 'presenca.html';
            return;
        }

        document.getElementById('nomeAdmin').textContent = 'Olá, ' + perfil.nome_completo.split(' ')[0];

        // 3. Busca o nome do Terreiro
        if (perfil.terreiro_id) {
            const { data: terreiro } = await supabaseClient.from('terreiros').select('nome').eq('id', perfil.terreiro_id).single();
            if (terreiro) document.getElementById('nomeTerreiroSidebar').textContent = terreiro.nome;
        }

        // ==========================================
        // 🚀 DANDO VIDA AOS NÚMEROS DO PAINEL
        // ==========================================

        // A. Busca o Total de Médiuns Cadastrados
        const { count: totalMediuns } = await supabaseClient
            .from('perfis')
            .select('*', { count: 'exact', head: true });
        
        document.getElementById('totalMediuns').textContent = totalMediuns || '0';

        // B. Busca a Gira de Hoje (ou a próxima)
        const agora = new Date().toISOString();
        const { data: agendaData } = await supabaseClient
            .from('agenda')
            .select('*')
            .gte('data_hora_fim', agora) // Giras que ainda não terminaram
            .order('data_hora_inicio', { ascending: true })
            .limit(1);

        let giraAtualId = null;

        if (agendaData && agendaData.length > 0) {
            const gira = agendaData[0];
            giraAtualId = gira.id;
            
            // Formata a data para exibir
            const dataGira = new Date(gira.data_hora_inicio).toLocaleDateString('pt-BR');
            document.getElementById('proximaGira').innerHTML = `${gira.titulo} <br><span class="text-sm font-normal text-gray-500">${dataGira}</span>`;
        } else {
            document.getElementById('proximaGira').textContent = 'Nenhuma gira agendada';
        }

        // C. Busca as Presenças da Gira Atual
        const tabelaPresencas = document.getElementById('tabelaPresencas');
        
        if (giraAtualId) {
            // Puxa as presenças e faz um "JOIN" com a tabela de perfis para pegar o nome
            const { data: presencas } = await supabaseClient
                .from('presencas')
                .select(`
                    data_hora_checkin,
                    perfis ( nome_completo )
                `)
                .eq('evento_id', giraAtualId)
                .order('data_hora_checkin', { ascending: false });

            // Atualiza o cartão de Total de Presentes
            document.getElementById('totalPresentes').textContent = presencas ? presencas.length : '0';

            // Preenche a tabela HTML
            if (presencas && presencas.length > 0) {
                tabelaPresencas.innerHTML = ''; // Limpa a mensagem de "carregando"
                
                presencas.forEach(p => {
                    const nome = p.perfis?.nome_completo || 'Médium Desconhecido';
                    const hora = new Date(p.data_hora_checkin).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    
                    tabelaPresencas.innerHTML += `
                        <tr class="border-b border-gray-100 hover:bg-gray-50 transition">
                            <td class="p-3 text-gray-800 font-medium">${nome}</td>
                            <td class="p-3 text-gray-600">Médium</td>
                            <td class="p-3 text-gray-600">${hora}</td>
                            <td class="p-3"><span class="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold"><i class="fas fa-check-circle mr-1"></i> PRESENTE</span></td>
                        </tr>
                    `;
                });
            } else {
                tabelaPresencas.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-gray-500">Nenhum médium registrou presença na gira de hoje ainda.</td></tr>`;
            }
        } else {
            tabelaPresencas.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-gray-500">Não há gira agendada para buscar presenças.</td></tr>`;
        }

    } catch (error) {
        console.error('Erro ao carregar painel:', error);
    }

    // ==========================================
    // LÓGICA DO GPS E LOGOUT (Mantidos intactos)
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
});
