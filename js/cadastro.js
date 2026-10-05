document.addEventListener('DOMContentLoaded', async () => {
    // 1. Usa a SUA conexão correta: supabaseClient
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    // Pega o ID que salvamos lá na tela de login (32)
    const idPrimeiroAcesso = localStorage.getItem('novo_acesso_id');
    
    // Se não tiver logado E não for o primeiro acesso, expulsa pro login
    if (!session && !idPrimeiroAcesso) {
        window.location.href = 'index.html'; 
        return;
    }

    // Define qual ID vamos usar (o da sessão ou o do primeiro acesso)
    const userId = session ? session.user.id : idPrimeiroAcesso;

    // 2. PUXAR OS DADOS DO BANCO PARA PREENCHER A TELA
    if (userId) {
        try {
            const { data: perfil, error } = await supabaseClient
                .from('perfis') // Se a sua tabela chamar 'mediuns', troque aqui!
                .select('*')
                .eq('id', userId)
                .single();
            
            if (perfil) {
                // Preenche os campos automaticamente
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

    // 3. AÇÃO DE SALVAR E CRIAR A SENHA NOVA
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
        
        // Pega o valor do campo novaSenha (que você vai colocar no HTML)
        const campoSenha = document.getElementById('novaSenha');
        const novaSenha = campoSenha ? campoSenha.value : null;

        try {
            // Se for o primeiro acesso, ELE É OBRIGADO a criar uma senha nova
            if (!session && (!novaSenha || novaSenha.length < 6)) {
                throw new Error("Por favor, crie uma Nova Senha com pelo menos 6 caracteres.");
            }

            // A. Atualiza a ficha na tabela
            const { error: errorUpdate } = await supabaseClient
                .from('perfis') // Se a sua tabela chamar 'mediuns', troque aqui!
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

            // B. O PULO DO GATO: Cria a conta dele no Auth com o Telefone e a Senha Nova
            if (!session && novaSenha) {
                const telefoneFormatado = telefone.replace(/\D/g, '');
                const emailFantasma = `${telefoneFormatado}@terreiro.app`;
                
                const { error: errorAuth } = await supabaseClient.auth.signUp({
                    email: emailFantasma,
                    password: novaSenha,
                });
                
                if (errorAuth) throw new Error("Erro ao registrar acesso: " + errorAuth.message);
            }

            // C. Limpa o ID da memória e manda pra tela de presença
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
