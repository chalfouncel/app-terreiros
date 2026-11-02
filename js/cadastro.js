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

    const idNumerico = parseInt(mediumIdLocal, 10);
    let dadosMedium = null;
    let modoApenasResetSenha = false;

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

        // Só redireciona para presença se o cadastro estiver completo E a senha já estiver cadastrada
        if (medium.cadastro_completo && medium.senha_cadastrada !== false) {
            window.location.replace('presenca.html');
            return;
        }

        dadosMedium = medium;
        modoApenasResetSenha = (medium.cadastro_completo === true && medium.senha_cadastrada === false);

        // Carrega graus e funções personalizados do terreiro
        if (medium.terreiro_id) {
            const { data: terreiro } = await supabaseClient
                .from('terreiros')
                .select('lista_graus, lista_funcoes')
                .eq('id', medium.terreiro_id)
                .single();

            const graus = (terreiro && terreiro.lista_graus && terreiro.lista_graus.length > 0)
                ? terreiro.lista_graus
                : ['I', 'IJ', 'B', 'BJ', 'T', 'TJ', 'SCT', 'Escola de CT', 'CT', 'SCCT', 'Escola de CCT', 'CCT', 'Dirigente', 'Outros'];

            const funcoes = (terreiro && terreiro.lista_funcoes && terreiro.lista_funcoes.length > 0)
                ? terreiro.lista_funcoes
                : ['MG', 'MGA', 'MC', 'MCA', 'MD', 'MDA', 'CC', 'CAC', 'Cantina', 'Dirigente'];

            const selGrau = document.getElementById('cadGrau');
            const selFuncao = document.getElementById('cadFuncao');

            if (selGrau) {
                selGrau.innerHTML = ['-', ...graus].map(g => `<option value="${g === '-' ? '' : g}" ${g === medium.grau ? 'selected' : ''}>${g}</option>`).join('');
            }
            if (selFuncao) {
                selFuncao.innerHTML = ['-', ...funcoes].map(f => `<option value="${f === '-' ? '' : f}" ${f === medium.funcao ? 'selected' : ''}>${f}</option>`).join('');
            }
        }

        const inputNomeEl = document.getElementById('cadNomeCompleto') || document.getElementById('nomeCompleto');
        if (inputNomeEl) inputNomeEl.value = medium.nome_completo || '';
        if (document.getElementById('cadNomeSocial')) document.getElementById('cadNomeSocial').value = medium.nome_social || '';
        if (document.getElementById('cadNascimento') && medium.data_nascimento) document.getElementById('cadNascimento').value = medium.data_nascimento;
        if (document.getElementById('cadTelefone') && medium.telefone) document.getElementById('cadTelefone').value = medium.telefone;
        if (document.getElementById('cadPalavra') && medium.palavra) document.getElementById('cadPalavra').value = medium.palavra;

        // Se for apenas Reset de Senha de um médium já cadastrado, oculta os campos cadastrais e foca direto na Nova Senha
        if (modoApenasResetSenha) {
            ['cadNomeCompleto', 'nomeCompleto', 'cadNomeSocial', 'cadGrau', 'cadFuncao', 'cadPalavra', 'cadNascimento', 'cadTelefone'].forEach(idCampo => {
                const el = document.getElementById(idCampo);
                if (el) {
                    el.removeAttribute('required');
                    const blocoPai = el.closest('.grid') || el.parentElement;
                    if (blocoPai) blocoPai.classList.add('hidden');
                }
            });

            const tituloPag = document.querySelector('h1, h2');
            if (tituloPag) tituloPag.textContent = `Redefinir Senha — ${medium.nome_social || medium.nome_completo.split(' ')[0]}`;
            document.getElementById('cadNovaSenha')?.focus();
        }

    } catch (err) {
        console.error('Erro ao ler ficha:', err);
        exibirMensagem("Falha ao sincronizar a ficha cadastral.");
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!dadosMedium) return exibirMensagem("Os dados da ficha ainda não foram carregados.");

            const valNovaSenha = document.getElementById('cadNovaSenha').value.trim();
            const valConfirmaSenha = document.getElementById('cadConfirmaSenha').value.trim();

            const apenasNumerosSenha = valNovaSenha.replace(/\D/g, '');
            if (apenasNumerosSenha.length !== 6 || valNovaSenha.length !== 6) {
                return exibirMensagem("A senha deve conter exatamente 6 números.");
            }

            if (valNovaSenha === '123456') {
                return exibirMensagem("Escolha uma senha pessoal diferente da senha padrão 123456.");
            }

            if (valNovaSenha !== valConfirmaSenha) {
                return exibirMensagem("As senhas digitadas não são iguais. Tente novamente.");
            }

            // =================================================================
            // FLUXO A: APENAS REDEFINIÇÃO DE SENHA (MÉDIUM JÁ CADASTRADO)
            // =================================================================
            if (modoApenasResetSenha) {
                if (btnSalvar) {
                    btnSalvar.disabled = true;
                    btnSalvar.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Salvando nova senha...';
                }
                if (msgErro) msgErro.classList.add('hidden');

                try {
                    let telLimpo = String(dadosMedium.telefone || '').replace(/\D/g, '');
                    if (telLimpo.startsWith('55') && telLimpo.length >= 12) telLimpo = telLimpo.substring(2);
                    const emailAuth = `${telLimpo}@terreiro.app`;

                    // Garante que está autenticado na sessão antes de trocar a senha
                    const { data: { session } } = await supabaseClient.auth.getSession();
                    if (!session) {
                        const { error: errSign } = await supabaseClient.auth.signInWithPassword({
                            email: emailAuth,
                            password: '123456'
                        });
                        if (errSign) throw new Error("Sessão expirada. Volte ao login e entre com 123456.");
                    }

                    // Atualiza a senha diretamente no mesmo usuário do Supabase Auth
                    const { error: errUpdAuth } = await supabaseClient.auth.updateUser({
                        password: valNovaSenha
                    });
                    if (errUpdAuth) throw errUpdAuth;

                    // Reativa a flag senha_cadastrada na tabela mediuns mantendo todos os dados intactos
                    const { error: errBd } = await supabaseClient
                        .from('mediuns')
                        .update({ senha_cadastrada: true })
                        .eq('id', dadosMedium.id);

                    if (errBd) throw errBd;

                    localStorage.setItem('telefone_acesso', telLimpo);
                    exibirMensagem('✅ Nova senha gravada com sucesso! Entrando...', 'green');

                    setTimeout(() => {
                        window.location.replace('presenca.html');
                    }, 1200);
                } catch (err) {
                    console.error(err);
                    exibirMensagem(err.message, 'red');
                    if (btnSalvar) {
                        btnSalvar.disabled = false;
                        btnSalvar.innerHTML = 'Salvar e Continuar';
                    }
                }
                return;
            }

            // =================================================================
            // FLUXO B: PRIMEIRO ACESSO COMPLETO (NOVO MÉDIUM)
            // =================================================================
            const valNomeCompleto = (document.getElementById('cadNomeCompleto') || document.getElementById('nomeCompleto'))?.value.trim() || dadosMedium.nome_completo;
            const valNomeSocial = document.getElementById('cadNomeSocial').value.trim();
            const valGrau = document.getElementById('cadGrau').value;
            const valFuncao = document.getElementById('cadFuncao').value;
            const valNasc = document.getElementById('cadNascimento').value;
            const valPalavra = document.getElementById('cadPalavra').value.trim().toUpperCase();
            const valTelBruto = document.getElementById('cadTelefone').value;

            let telefoneLimpo = valTelBruto.replace(/\D/g, '');
            if (telefoneLimpo.startsWith('55') && telefoneLimpo.length >= 12) {
                telefoneLimpo = telefoneLimpo.substring(2);
            }

            if (!telefoneLimpo || telefoneLimpo.length < 10) {
                return exibirMensagem("Digite o seu WhatsApp válido com DDD.");
            }

            if (btnSalvar) {
                btnSalvar.disabled = true;
                btnSalvar.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Criando acesso...';
            }
            if (msgErro) msgErro.classList.add('hidden');

            try {
                const emailAuth = `${telefoneLimpo}@terreiro.app`;
                let novoAuthId = dadosMedium.auth_id;

                if (!novoAuthId) {
                    const { data: authData, error: errAuth } = await supabaseClient.auth.signUp({
                        email: emailAuth,
                        password: valNovaSenha
                    });

                    if (errAuth) {
                        if (errAuth.message.includes('already registered')) {
                            const { data: loginExistente, error: errLoginEx } = await supabaseClient.auth.signInWithPassword({
                                email: emailAuth,
                                password: valNovaSenha
                            });
                            if (errLoginEx || !loginExistente?.user) {
                                throw new Error("Este WhatsApp já possui conta na plataforma. Digite a mesma senha de 6 dígitos que você já utilizava ou peça para a direção resetar sua senha.");
                            }
                            novoAuthId = loginExistente.user.id;
                        } else {
                            throw new Error("Erro na criação do acesso: " + errAuth.message);
                        }
                    } else {
                        novoAuthId = authData.user.id;
                    }
                } else {
                    // Caso já possua auth_id mas estava em 1º acesso com senha 123456
                    await supabaseClient.auth.signInWithPassword({ email: emailAuth, password: '123456' });
                    await supabaseClient.auth.updateUser({ password: valNovaSenha });
                }

                const updateData = {
                    nome_completo: valNomeCompleto,
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
                        throw new Error("O número de WhatsApp informado já está sendo utilizado por outro médium.");
                    }
                    throw errBd;
                }

                const loginAutomatico = await supabaseClient.auth.signInWithPassword({
                    email: emailAuth,
                    password: valNovaSenha
                });
                
                if (loginAutomatico.error) throw loginAutomatico.error;

                localStorage.setItem('telefone_acesso', telefoneLimpo);

                exibirMensagem('✅ Acesso ativado com sucesso! Entrando no painel...', 'green');

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
