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

    // Ação do Botão de Sair
    document.getElementById('btnSair').addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.href = 'index.html';
    });
});
