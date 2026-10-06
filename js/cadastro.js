document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const idPrimeiroAcesso = localStorage.getItem('novo_acesso_id');
    
    if (!session && !idPrimeiroAcesso) {
        window.location.href = 'index.html'; 
        return;
    }

    const userId = session ? session.user.id : idPrimeiroAcesso;

    // 1. FUNÇÕES DE FORMATAÇÃO
    const formatarTitleCase = (texto) => {
        if (!texto) return '';
        const preposicoes = ['de', 'da', 'do', 'das', 'dos', 'e'];
        return texto.toLowerCase().split(' ').map((palavra, index) => {
            // Se for preposição no meio do nome, mantém minúscula
            if (preposicoes.includes(palavra) && index !== 0) {
                return palavra;
            }
            return palavra.charAt(0).toUpperCase() + palavra.slice(1);
        }).join(' ');
    };

    // 2. APLICA A FORMATAÇÃO EM TEMPO REAL (Enquanto digita)
    const configFormatacaoTempoReal = () => {
        // Nomes com a Primeira Letra Maiúscula
        const camposTitleCase = ['nomeSocial', 'nomeCompleto'];
        camposTitleCase.forEach(id => {
            const campo = document.getElementById(id);
            if (campo) campo.addEventListener('input', (e) => {
                const start = e.target.selectionStart; // Guarda a posição do cursor
                e.target.value = formatarTitleCase(e.target.value);
                e.target.setSelectionRange(start, start); // Devolve o cursor pro lugar certo
            });
        });

        // Textos TUDO EM MAIÚSCULO
        const camposUpperCase = ['palavra']; // Grau e Função agora são Selects
        camposUpperCase.forEach(id => {
            const campo = document.getElementById(id);
            if (campo) campo.addEventListener('input', (e) => {
                const start = e.target.selectionStart;
                e.target.value = e.target.value.toUpperCase();
                e.target.setSelectionRange(start, start);
            });
        });
    };
    
    configFormatacaoTempoReal();

    // Mostra o campo de senha apenas no Primeiro Acesso
    if (!session && idPrimeiroAcesso) {
        const divSenha = document.getElementById('containerSenha');
        if (divSenha) divSenha.classList.remove('hidden');
    }

    // 3. PUXAR OS DADOS DO BANCO PARA PREENCHER A TELA
    if (session || idPrimeiroAcesso) {
        try {
            let query = supabaseClient.from('mediuns').select('*');
            
            // Corrige o bug de busca: logados usam 'auth_id', primeiro acesso usa 'id' comum
            if (session) {
                query = query.eq('auth_id', session.user.id);
            } else {
                query = query.eq('id', idPrimeiroAcesso);
            }
            
            const { data: perfil, error } = await query.single();
            
            if (perfil) {
                const preencher = (id, valor) => {
                    const campo = document.getElementById(id);
                    if (campo && valor) campo.value = valor;
                };
                
                preencher('nomeCompleto', formatarTitleCase(perfil.nome_completo));
                preencher('nomeSocial', formatarTitleCase(perfil.nome_social));
                preencher('grau', perfil.grau || '');
                preencher('funcao', perfil.funcao || '');
                preencher('palavra', perfil.palavra ? perfil.palavra.toUpperCase() : '');
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

    // 4. AÇÃO DE SALVAR
    formCadastro.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        btnSalvar.disabled = true;
        btnSalvar.textContent = 'Salvando...';
        msgErro.classList.add('hidden');

        // Pega os valores e formata novamente por segurança
        const nomeCompleto = formatarTitleCase(document.getElementById('nomeCompleto').value);
        const nomeSocial = formatarTitleCase(document.getElementById('nomeSocial').value);
        const grau = document.getElementById('grau').value; 
        const funcao = document.getElementById('funcao').value; 
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
            let updateQuery = supabaseClient
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
                });
                
            if (session) {
                updateQuery = updateQuery.eq('auth_id', session.user.id);
            } else {
                updateQuery = updateQuery.eq('id', idPrimeiroAcesso);
            }
            
            const { error: errorUpdate } = await updateQuery;

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
