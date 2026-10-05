document.addEventListener('DOMContentLoaded', async () => {
    // Garante que pega a conexão do Supabase correta (evita erro de variável não definida)
    const db = window.supabase || window.supabaseClient;

    // 1. Tenta pegar a sessão atual e o ID do localStorage (caso seja primeiro acesso)
    const { data: { session } } = await db.auth.getSession();
    const idPrimeiroAcesso = localStorage.getItem('novo_acesso_id');
    
    // Se não tiver sessão E não tiver id do primeiro acesso na memória, expulsa
    if (!session && !idPrimeiroAcesso) {
        window.location.href = 'index.html'; 
        return;
    }

    // Define quem é o usuário que vamos editar
    const userId = session ? session.user.id : idPrimeiroAcesso;

    // 2. BUSCAR DADOS DO BANCO PARA PREENCHER A TELA
    if (userId) {
        try {
            // *ATENÇÃO: Mudei para 'perfis' para bater com o seu código anterior. 
            // Se no banco a tabela chamar 'mediuns', troque a palavra 'perfis' abaixo por 'mediuns'.
            const { data: perfil, error } = await db
                .from('perfis')
                .select('*')
                .eq('id', userId)
                .single();
            
            if (perfil) {
                // Função rápida para preencher o valor se o campo existir
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

    // 3. AÇÃO AO ENVIAR O FORMULÁRIO
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
        const novaSenha = document.getElementById('novaSenha') ? document.getElementById('novaSenha').value : null;

        try {
            // Verifica se a senha foi preenchida
            if (!novaSenha || novaSenha.length < 6) {
                throw new Error("Por favor, crie uma Nova Senha com pelo menos 6 caracteres.");
            }

            // A. Atualiza os dados na tabela (Mude para 'mediuns' se necessário)
            const { error: errorUpdate } = await db
                .from('perfis')
                .update({ 
                    nome_completo: nomeCompleto,
                    nome_social: nomeSocial,
                    grau: grau,
                    funcao: funcao,
                    palavra: palavra,
                    data_nascimento: dataNascimento,
                    telefone: telefone,
                    cadastro_completo: true
                    // Se você tiver uma coluna "senha_cadastrada" na tabela, descomente a linha abaixo:
                    // , senha_cadastrada: true
                })
                .eq('id', userId);

            if (errorUpdate) throw errorUpdate;

            // B. Se estiver logado, atualiza o Auth com o Telefone como Email + Nova Senha
            if (session) {
                const telefoneFormatado = telefone.replace(/\D/g, '');
                const novoEmail = `${telefoneFormatado}@terreiro.app`;
                
                const { error: errorAuth } = await db.auth.updateUser({
                    email: novoEmail,
                    password: novaSenha
                });
                
                if (errorAuth) console.error("Erro ao atualizar credenciais do Auth:", errorAuth);
            }

            // C. Limpa a memória do primeiro acesso e manda pra tela de presença
            localStorage.removeItem('novo_acesso_id');
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
