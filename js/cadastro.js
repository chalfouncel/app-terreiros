document.addEventListener('DOMContentLoaded', async () => {

    // --- 1. FORMATAÇÃO EM TEMPO REAL (GRAMÁTICA) ---
    // Função para deixar a primeira letra de cada palavra maiúscula (ignorando de, da, do...)
    const capitalizarNome = (str) => {
        return str.toLowerCase()
            .replace(/(?:^|\s)\S/g, (letra) => letra.toUpperCase())
            .replace(/\b(De|Da|Do|Das|Dos|E)\b/g, (match) => match.toLowerCase());
    };

    // Aplica a regra enquanto o usuário digita
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
                        // Aciona a formatação automática para dados antigos do banco
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

        // Pega os valores (que já estão com a gramática certa)
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

            // ATUALIZANDO NO BANCO (Removi a coluna que não existia!)
            const { error: errorUpdate } = await supabaseClient
                .from('mediuns') 
                .update({ 
                    nome_completo: nomeCompleto,
                    nome_social: nomeSocial,
                    grau: grau,
                    funcao: funcao,
                    palavra: palavra,
                    data_nascimento: dataNascimento,
                    telefone: telefone
                })
                .eq('id', userId);

            if (errorUpdate) throw errorUpdate;

            // Criar login oficial dele no sistema se for o primeiro acesso
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
            // Sucesso total! Vai pra página de bater ponto
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
