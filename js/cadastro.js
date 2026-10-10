document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('formCompletarCadastro');
    const msgErro = document.getElementById('msgCadastro');
    const btnSalvar = document.getElementById('btnSalvarCadastro');

    function exibirMensagem(texto, cor = 'red') {
        if (msgErro) {
            msgErro.textContent = texto;
            msgErro.className = `text-xs md:text-sm font-bold text-center text-${cor}-600 block my-3`;
            msgErro.classList.remove('hidden');
        } else {
            alert(texto);
        }
    }

    // No fluxo desenhado, o médio só acede a esta página se passou pelo index.html com o ID e senha 123456.
    // O ID está guardado no localStorage.
    const mediumIdLocal = localStorage.getItem('medium_id');
    if (!mediumIdLocal) {
        window.location.replace('index.html');
        return;
    }

    const idNumerico = parseInt(mediumIdLocal);
    let dadosMedium = null;

    try {
        // Busca a ficha do médium na base de dados
        const { data: medium, error: errMed } = await supabaseClient
            .from('mediuns')
            .select('*')
            .eq('id', idNumerico)
            .maybeSingle();

        if (errMed || !medium) {
            exibirMensagem("Ficha não encontrada. Volte ao ecrã de login e tente novamente.");
            return;
        }

        // Bloqueio de segurança: Se o médium já tiver ativado a senha, não pode repetir o processo
        if (medium.senha_cadastrada) {
            window.location.replace('index.html');
            return;
        }

        dadosMedium = medium;

        // Pré-preenche os campos que já existem na base de dados
        if (document.getElementById('cadNomeCompleto')) document.getElementById('cadNomeCompleto').value = medium.nome_completo || '';
        if (document.getElementById('cadNomeSocial')) document.getElementById('cadNomeSocial').value = medium.nome_social || '';
        if (document.getElementById('cadNascimento') && medium.data_nascimento) document.getElementById('cadNascimento').value = medium.data_nascimento;
        if (document.getElementById('cadTelefone') && medium.telefone) document.getElementById('cadTelefone').value = medium.telefone;
        if (document.getElementById('cadPalavra') && medium.palavra) document.getElementById('cadPalavra').value = medium.palavra;
        
        if (document.getElementById('cadGrau') && medium.grau && medium.grau !== '-') document.getElementById('cadGrau').value = medium.grau;
        if (document.getElementById('cadFuncao') && medium.funcao && medium.funcao !== '-') document.getElementById('cadFuncao').value = medium.funcao;

    } catch (err) {
        console.error('Erro ao ler ficha:', err);
        exibirMensagem("Falha ao sincronizar a ficha cadastral.");
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!dadosMedium) return exibirMensagem("Os dados da ficha ainda não foram carregados.");

            const valNomeSocial = document.getElementById('cadNomeSocial').value.trim();
            const valGrau = document.getElementById('cadGrau').value;
            const valFuncao = document.getElementById('cadFuncao').value;
            const valNasc = document.getElementById('cadNascimento').value;
            
            // Força a PALAVRA a ser gravada e lida sempre em MAIÚSCULAS
            const valPalavra = document.getElementById('cadPalavra').value.trim().toUpperCase();
            
            const valTelBruto = document.getElementById('cadTelefone').value;
            const valNovaSenha = document.getElementById('cadNovaSenha').value.trim();
            const valConfirmaSenha = document.getElementById('cadConfirmaSenha').value.trim();

            // 1. Validação estrita do WhatsApp
            let telefoneLimpo = valTelBruto.replace(/\D/g, '');
            if (telefoneLimpo.startsWith('55') && telefoneLimpo.length >= 12) {
                telefoneLimpo = telefoneLimpo.substring(2);
            }

            if (!telefoneLimpo || telefoneLimpo.length < 10) {
                return exibirMensagem("Digite o seu WhatsApp válido com DDD (apenas números).");
            }

            // 2. Validação estrita da Senha (Apenas 6 números)
            const apenasNumerosSenha = valNovaSenha.replace(/\D/g, '');
            if (apenasNumerosSenha.length !== 6 || valNovaSenha.length !== 6) {
                return exibirMensagem("A senha deve conter exatamente 6 números.");
            }

            if (valNovaSenha !== valConfirmaSenha) {
                return exibirMensagem("As senhas digitadas não são iguais. Tente novamente.");
            }

            if (btnSalvar) {
                btnSalvar.disabled = true;
                btnSalvar.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> A criar acesso...';
            }
            if (msgErro) msgErro.classList.add('hidden');

            try {
                // O email oficial do Auth passará a ser o Telefone
                const emailAuth = `${telefoneLimpo}@terreiro.app`;

                // 1. Cria a conta no Supabase Auth usando o Telefone e a nova Senha de 6 dígitos
                const { data: authData, error: errAuth } = await supabaseClient.auth.signUp({
                    email: emailAuth,
                    password: valNovaSenha
                });

                if (errAuth) {
                    if (errAuth.message.includes('already registered')) {
                        throw new Error("Este número de WhatsApp já possui acesso registado no sistema.");
                    }
                    throw new Error("Erro na criação do acesso: " + errAuth.message);
                }

                const novoAuthId = authData.user.id;

                // 2. Atualiza a tabela mediuns com os dados preenchidos, a Palavra, e marca a senha como cadastrada[cite: 24]
                const { error: errBd } = await supabaseClient.from('mediuns').update({
                    nome_social: valNomeSocial,
                    telefone: telefoneLimpo,
                    data_nascimento: valNasc,
                    grau: valGrau,
                    funcao: valFuncao,
                    palavra: valPalavra,
                    senha_cadastrada: true,
                    auth_id: novoAuthId
                }).eq('id', dadosMedium.id);

                if (errBd) {
                    if (errBd.message.includes('unique constraint')) {
                        throw new Error("O número de WhatsApp informado já está a ser utilizado por outro médium.");
                    }
                    throw errBd;
                }

                // Efetua o login automático logo após criar a conta
                const loginAutomatico = await supabaseClient.auth.signInWithPassword({
                    email: emailAuth,
                    password: valNovaSenha
                });
                
                if (loginAutomatico.error) throw loginAutomatico.error;

                // Guarda o telefone em cache para a próxima vez
                localStorage.setItem('telefone_acesso', telefoneLimpo);

                exibirMensagem('✅ Acesso ativado com sucesso! A entrar no painel...', 'green');

                setTimeout(() => {
                    window.location.replace('presenca.html');
                }, 1500);

            } catch (err) {
                console.error(err);
                exibirMensagem(err.message, 'red');
                if (btnSalvar) {
                    btnSalvar.disabled = false;
                    btnSalvar.innerHTML = 'Salvar e Continuar';
                }
            }
        });
    }
});
