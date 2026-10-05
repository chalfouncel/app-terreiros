document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verifica se o usuário está logado
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
        window.location.href = 'index.html'; // Se não estiver, volta pro login
        return;
    }

    const formCadastro = document.getElementById('formCadastro');
    const msgErro = document.getElementById('msgErro');
    const btnSalvar = document.getElementById('btnSalvar');

    // 2. Ação ao enviar o formulário
    formCadastro.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        btnSalvar.disabled = true;
        btnSalvar.textContent = 'Salvando...';
        msgErro.classList.add('hidden');

        // Pega os valores dos campos
        const nomeCompleto = document.getElementById('nomeCompleto').value;
        const nomeSocial = document.getElementById('nomeSocial').value;
        const grau = document.getElementById('grau').value.toUpperCase(); // Força Maiúscula
        const funcao = document.getElementById('funcao').value.toUpperCase(); // Força Maiúscula
        const palavra = document.getElementById('palavra').value;
        const dataNascimento = document.getElementById('dataNascimento').value;
        const telefone = document.getElementById('telefone').value;

        try {
            // 3. Atualiza os dados na tabela 'perfis'
            const { error } = await supabaseClient
                .from('perfis')
                .update({ 
                    nome_completo: nomeCompleto,
                    nome_social: nomeSocial,
                    grau: grau,
                    funcao: funcao,
                    palavra: palavra,
                    data_nascimento: dataNascimento,
                    telefone: telefone,
                    cadastro_completo: true // Muda a flag para ele nunca mais ver essa tela
                })
                .eq('id', session.user.id);

            if (error) throw error;

            // 4. Se deu certo, manda pra tela de presença
            window.location.href = 'presenca.html';

        } catch (error) {
            console.error(error);
            msgErro.textContent = 'Erro ao salvar os dados: ' + error.message;
            msgErro.classList.remove('hidden');
            btnSalvar.disabled = false;
            btnSalvar.textContent = 'Salvar e Continuar';
        }
    });
});
