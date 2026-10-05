document.addEventListener('DOMContentLoaded', async () => {

    // --- 1. FORMATAÇÃO EM TEMPO REAL (GRAMÁTICA) ---
    const capitalizarNome = (str) => {
        return str.toLowerCase()
            .replace(/(?:^|\s)\S/g, (letra) => letra.toUpperCase())
            .replace(/\b(De|Da|Do|Das|Dos|E)\b/g, (match) => match.toLowerCase());
    };

    const inputNome = document.getElementById('nomeCompleto');
    if (inputNome) inputNome.addEventListener('input', (e) => e.target.value = capitalizarNome(e.target.value));
    
    const inputSocial = document.getElementById('nomeSocial');
    if (inputSocial) inputSocial.addEventListener('input', (e) => e.target.value = capitalizarNome(e.target.value));
    
    const inputGrau = document.getElementById('grau');
    if (inputGrau) inputGrau.addEventListener('input', (e) => e.target.value = e.target.value.toUpperCase());
    
    const inputFuncao = document.getElementById('funcao');
    if (inputFuncao) inputFuncao.addEventListener('input', (e) => e.target.value = e.target.value.toUpperCase());

    const inputPalavra = document.getElementById('palavra');
    if (inputPalavra) inputPalavra.addEventListener('input', (e) => e.target.value = e.target.value.toUpperCase());


    // --- 2. VERIFICAÇÃO DE ACESSO ---
    const { data: { session } } = await supabaseClient.auth.getSession();
    const idPrimeiroAcesso = localStorage.getItem('novo_acesso_id');
    
    if (!session && !idPrimeiroAcesso) {
        window.location.href = 'index.html'; 
        return;
    }

    const userId = session ? session.user.id : idPrimeiroAcesso;


    // --- 3. PUXAR DADOS DO BANCO ---
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
                    if (campo && valor) {
                        campo.value = valor;
                        campo.dispatchEvent(new Event('input')); 
                    }
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


    // --- 4. SALVAR DADOS E CRIAR SENHA NOVA ---
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
        const grau = document.getElementById('grau').value; 
        const funcao = document.getElementById('funcao').value; 
        const palavra = document.getElementById('palavra').value; 
        const dataNascimento = document.getElementById('dataNascimento').value;
        const telefone = document.getElementById('telefone').value;
        
        const campoSenha = document.getElementById('novaSenha');
        const novaSenha = campoSenha ? campoSenha.value : null;

        try {
            if (!session && (!novaSenha || novaSenha.length < 6)) {
                throw new Error("Por favor, crie uma Nova Senha com pelo menos 6 caracteres.");
            }

            let novoAuthId = null;

            // PASSO A: Criar login oficial PRIMEIRO para pegar o ID de Autenticação
            if (!session && novaSenha) {
                const telefoneFormatado = telefone.replace(/\D/g, '');
                const emailFantasma = `${telefoneFormatado}@terreiro.app`;
                
                const { data: authData, error: errorAuth } = await supabaseClient.auth.signUp({
                    email: emailFantasma,
                    password: novaSenha,
                });
                
                if (errorAuth) throw new Error("Erro ao registrar acesso: " + errorAuth.message);
                
                // Pega o ID de login recém criado!
                if (authData && authData.user) {
                    novoAuthId = authData.user.id;
                }
            }

            // PASSO B: Prepara tudo que vai ser salvo na tabela "mediuns"
            const dadosParaAtualizar = {
                nome_completo: nomeCompleto,
                nome_social: nomeSocial,
                grau: grau,
                funcao: funcao,
                palavra: palavra,
                data_nascimento: dataNascimento,
                telefone: telefone,
                cadastro_completo: true, // AGORA SIM! Marcando como TRUE!
                senha_cadastrada: true   // Marcando que ele já tem senha!
            };

            // Se acabou de criar um login (Passo A), atrela o ID desse login à tabela
            if (novoAuthId) {
                dadosParaAtualizar.auth_id = novoAuthId;
            }

            // PASSO C: Atualiza a tabela com tudo de uma vez
            const { error: errorUpdate } = await supabaseClient
                .from('mediuns') 
                .update(dadosParaAtualizar)
                .eq('id', userId);

            if (errorUpdate) throw errorUpdate;

            // Sucesso total! Limpa a memória e vai pra página de bater ponto
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
