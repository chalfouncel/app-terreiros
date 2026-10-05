document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const idPrimeiroAcesso = localStorage.getItem('novo_acesso_id');
    
    if (!session && !idPrimeiroAcesso) {
        window.location.href = 'index.html'; 
        return;
    }

    const userId = session ? session.user.id : idPrimeiroAcesso;

    // AQUI ESTAVA O ERRO! Mudei para buscar na tabela "mediuns"
    if (userId) {
        try {
            const { data: perfil, error } = await supabaseClient
                .from('mediuns') 
                .select('*')
                .eq('id', userId)
                .single();
            
            if (perfil) {
                const preencher = (id, valor) => {
                    const campo = document.getElementById(id);
                    if (campo && valor) campo.value = valor;
                };
                
                preencher('nomeCompleto', perfil.nome_completo);
                preencher('nomeSocial', perfil.nome_social);
                preencher('grau', perfil.grau);
                preencher('funcao', perfil.funcao);
                preencher('palavra', perfil.palavra);
                preencher('dataNascimento', perfil.data_nascimento);
                preencher('telefone', perfil.telefone);
            }
        } catch (err) {
            console.error("Erro ao buscar dados do perfil:", err);
        }
    }

    const formCadastro = document.getElementById('formCadastro');
    const msgErro = document.getElementById('msgErro');
    const btnSalvar = document.getElementById('btnSalvar');

    formCadastro.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        btnSalvar.disabled = true;
        btnSalvar.textContent = 'Salvando...';
        msgErro.classList.add('hidden');

        const nomeCompleto = document.getElementById('nomeCompleto').value;
        const nomeSocial = document.getElementById('nomeSocial').value;
        const grau = document.getElementById('grau').value.toUpperCase(); 
        const funcao = document.getElementById('funcao').value.toUpperCase(); 
        const palavra = document.getElementById('palavra').value.toUpperCase(); 
        const dataNascimento = document.getElementById('dataNascimento').value;
        const telefone = document.getElementById('telefone').value;
        
        const campoSenha = document.getElementById('novaSenha');
        const novaSenha = campoSenha ? campoSenha.value : null;

        try {
            if (!session && (!novaSenha || novaSenha.length < 6)) {
                throw new Error("Por favor, crie uma Nova Senha com pelo menos 6 caracteres.");
            }

            // ATUALIZANDO NA TABELA CERTA: mediuns
            const { error: errorUpdate } = await supabaseClient
                .from('mediuns') 
                .update({ 
                    nome_completo: nomeCompleto,
                    nome_social: nomeSocial,
                    grau: grau,
                    funcao: funcao,
                    palavra: palavra,
                    data_nascimento: dataNascimento,
                    telefone: telefone,
                    cadastro_completo: true
                })
                .eq('id', userId);

            if (errorUpdate) throw errorUpdate;

            // Criando o acesso no Auth
            if (!session && novaSenha) {
                const telefoneFormatado = telefone.replace(/\D/g, '');
                const emailFantasma = `${telefoneFormatado}@terreiro.app`;
                
                const { error: errorAuth } = await supabaseClient.auth.signUp({
                    email: emailFantasma,
                    password: novaSenha,
                });
                
                if (errorAuth) throw new Error("Erro ao registrar acesso: " + errorAuth.message);
            }

            localStorage.removeItem('novo_acesso_id');
            window.location.href = 'presenca.html';

        } catch (error) {
            console.error(error);
            msgErro.textContent = error.message;
            msgErro.classList.remove('hidden');
            btnSalvar.disabled = false;
            btnSalvar.textContent = 'Salvar e Continuar';
        }
    });
});
