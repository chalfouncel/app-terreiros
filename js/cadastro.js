// Verifica se o usuário está realmente logado antes de deixar ele ver a tela
async function checarSessao() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
        // Se não tiver logado, expulsa para o login
        window.location.href = 'index.html';
    }
    return session.user;
}

// Executa a checagem ao carregar a página
let usuarioAtual = null;
checarSessao().then(user => {
    usuarioAtual = user;
});

// Ação de salvar o formulário
document.getElementById('cadastroForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const nome = document.getElementById('nome').value;
    const telefone = document.getElementById('telefone').value;
    const errorMessage = document.getElementById('errorMessage');
    const salvarBtn = document.getElementById('salvarBtn');

    salvarBtn.textContent = 'Salvando...';
    salvarBtn.disabled = true;
    errorMessage.classList.add('hidden');

    try {
        // Atualiza a tabela 'perfis' com os dados novos e marca o cadastro como completo
        const { error } = await supabaseClient
            .from('perfis')
            .update({ 
                nome_completo: nome,
                telefone: telefone,
                cadastro_completo: true 
            })
            .eq('id', usuarioAtual.id); // Atualiza apenas o perfil do usuário logado

        if (error) throw error;

        // Se deu tudo certo, manda ele para a tela principal (check-in de presença)
        window.location.href = 'presenca.html';

    } catch (error) {
        errorMessage.textContent = 'Erro ao salvar os dados: ' + error.message;
        errorMessage.classList.remove('hidden');
    } finally {
        salvarBtn.textContent = 'Salvar Dados';
        salvarBtn.disabled = false;
    }
});
