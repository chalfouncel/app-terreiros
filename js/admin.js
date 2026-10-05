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

        // SE NÃO FOR ADMIN, expulsa da página e manda pra tela de presença
        if (!perfil.is_admin) {
            alert('Acesso negado. Esta área é restrita para administradores.');
            window.location.href = 'presenca.html';
            return;
        }

        // Se for admin, exibe o nome dele no topo
        document.getElementById('nomeAdmin').textContent = 'Olá, ' + perfil.nome_completo.split(' ')[0];

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

        // 4. Aqui futuramente carregaremos as presenças e a agenda!
        // Por enquanto vamos limpar a tabela mostrando que não há registros
        document.getElementById('tabelaPresencas').innerHTML = `
            <tr>
                <td colspan="4" class="p-6 text-center text-gray-500">Nenhum médium registrou presença na gira de hoje ainda.</td>
            </tr>
        `;

    } catch (error) {
        console.error('Erro ao carregar painel:', error);
    }

    // 5. Lógica do GPS (Gravar Localização Sede)
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

    // 6. Ação do Botão de Sair
    document.getElementById('btnSair').addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.href = 'index.html';
    });
});
