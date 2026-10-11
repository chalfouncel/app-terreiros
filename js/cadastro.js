document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('formCompletarCadastro');
    const msgErro = document.getElementById('msgCadastro');
    const btnSalvar = document.getElementById('btnSalvarCadastro');

    function exibirMensagem(texto, cor = 'red') {
        if (msgErro) {
            msgErro.textContent = texto;
            msgErro.className = `text-xs md:text-sm font-bold text-center text-${cor}-600 block mt-2`;
            msgErro.classList.remove('hidden');
        } else {
            alert(texto);
        }
    }

    const mediumIdLocal = localStorage.getItem('medium_id');
    if (!mediumIdLocal) {
        window.location.replace('index.html');
        return;
    }

    const idNumerico = parseInt(mediumIdLocal);
    let dadosMedium = null;

    try {
        const { data: medium, error: errMed } = await supabaseClient
            .from('mediuns')
            .select('*')
            .eq('id', idNumerico)
            .maybeSingle();

        if (errMed || !medium) {
            exibirMensagem("Ficha não encontrada. Volte à tela de login.");
            return;
        }

        // Se o médium já estiver com o cadastro integralmente concluído, vai para a presença
        if (medium.cadastro_completo) {
            window.location.replace('presenca.html');
            return;
        }

        dadosMedium = medium;

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
            const valPalavra = document.getElementById('cadPalavra').value.trim().toUpperCase();
            const valTelBruto = document.getElementById('cadTelefone').value;
            const valNovaSenha = document.getElementById('cadNovaSenha').value.trim();
            const valConfirmaSenha = document.getElementById('cadConfirmaSenha').value.trim();

            let telefoneLimpo = valTelBruto.replace(/\D/g, '');
            if (telefoneLimpo.startsWith('55') && telefoneLimpo.length >= 12) {
                telefoneLimpo = telefoneLimpo.substring(2);
            }

            if (!telefoneLimpo || telefoneLimpo.length < 10) {
                return exibirMensagem("Digite o seu WhatsApp válido com DDD.");
            }

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
                const emailAuth = `${telefoneLimpo}@terreiro.app`;
                let novoAuthId = dadosMedium.auth_id;

                // Só tenta criar a conta Auth se ela ainda não existir
                if (!novoAuthId) {
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
                    novoAuthId = authData.user.id;
                }

                // CORREÇÃO: "cadastro_completo: true" foi restaurado na payload de envio
                const updateData = {
                    nome_social: valNomeSocial,
                    telefone: telefoneLimpo,
                    data_nascimento: valNasc,
                    grau: valGrau,
                    funcao: valFuncao,
                    palavra: valPalavra,
                    senha_cadastrada: true,
                    cadastro_completo: true, 
                    auth_id: novoAuthId
                };

                const { error: errBd } = await supabaseClient.from('mediuns').update(updateData).eq('id', dadosMedium.id);

                if (errBd) {
                    if (errBd.message.includes('unique constraint')) {
                        throw new Error("O número de WhatsApp informado já está a ser utilizado por outro médium.");
                    }
                    throw errBd;
                }

                const loginAutomatico = await supabaseClient.auth.signInWithPassword({
                    email: emailAuth,
                    password: valNovaSenha
                });
                
                if (loginAutomatico.error) throw loginAutomatico.error;

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
