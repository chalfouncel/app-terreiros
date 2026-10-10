document.addEventListener('DOMContentLoaded', async () => {
    const form = document.querySelector('form');
    const btnSalvar = document.querySelector('button[type="submit"]');
    const msgErro = document.getElementById('msgCadastro') || document.createElement('p');

    if (!document.getElementById('msgCadastro') && form) {
        msgErro.id = 'msgCadastro';
        form.insertBefore(msgErro, btnSalvar);
    }

    function exibirMensagem(texto, cor = 'red') {
        msgErro.textContent = texto;
        msgErro.className = `text-xs md:text-sm font-bold text-center text-${cor}-600 block my-3`;
        msgErro.classList.remove('hidden');
    }

    // AQUI NÃO SE EXIGE SESSÃO! O utilizador ainda não tem conta Auth
    const mediumIdLocal = localStorage.getItem('medium_id');
    if (!mediumIdLocal) {
        window.location.replace('index.html');
        return;
    }

    const idNumerico = parseInt(mediumIdLocal);

    // Busca os dados do médium
    const { data: medium, error: errMed } = await supabaseClient
        .from('mediuns')
        .select('*')
        .eq('id', idNumerico)
        .maybeSingle();

    if (errMed || !medium) {
        exibirMensagem("Ficha não encontrada. Volte ao ecrã de login.", "red");
        return;
    }

    // Se já foi cadastrado, expulsa para o login
    if (medium.senha_cadastrada) {
        window.location.replace('index.html');
        return;
    }

    // Preenche os campos do teu formulário original
    const todosInputs = Array.from(document.querySelectorAll('input'));
    todosInputs.forEach(inp => {
        const idHtml = (inp.id || '').toLowerCase();
        const placeholder = (inp.placeholder || '').toLowerCase();

        if ((idHtml.includes('nome') || placeholder.includes('nome')) && !idHtml.includes('social')) {
            if (!inp.value) inp.value = medium.nome_completo || '';
        }
        if (idHtml.includes('social') || placeholder.includes('social')) {
            if (!inp.value) inp.value = medium.nome_social || '';
        }
        if (inp.type === 'date' || idHtml.includes('nasc')) {
            if (!inp.value && medium.data_nascimento) inp.value = medium.data_nascimento;
        }
    });

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (btnSalvar) {
                btnSalvar.disabled = true;
                btnSalvar.innerHTML = 'A criar acesso...';
            }
            msgErro.classList.add('hidden');

            try {
                let valNomeSocial = null, valTel = null, valNasc = null, valPalavra = null;
                let valGrau = null, valFuncao = null;

                // Captura os dados que o médium preencheu
                const inputsAtuais = Array.from(document.querySelectorAll('input'));
                inputsAtuais.forEach(inp => {
                    const idHtml = (inp.id || '').toLowerCase();
                    const placeholder = (inp.placeholder || '').toLowerCase();

                    if (idHtml.includes('social') || placeholder.includes('social')) valNomeSocial = inp.value.trim();
                    if (inp.type === 'tel' || idHtml.includes('tel') || idHtml.includes('whats') || placeholder.includes('tel')) valTel = inp.value;
                    if (inp.type === 'date' || idHtml.includes('nasc')) valNasc = inp.value;

                    // O teu campo "Palavra *" (senha)
                    if (inp.type === 'password' || idHtml.includes('palavra') || idHtml.includes('senha') || placeholder.includes('palavra')) {
                        valPalavra = inp.value.trim();
                    }
                });

                const selectsAtuais = Array.from(document.querySelectorAll('select'));
                selectsAtuais.forEach(sel => {
                    const idHtml = (sel.id || '').toLowerCase();
                    if (idHtml.includes('grau')) valGrau = sel.value;
                    if (idHtml.includes('func') || idHtml.includes('função')) valFuncao = sel.value;
                });

                let telefoneLimpo = (valTel || '').replace(/\D/g, '');
                if (telefoneLimpo.startsWith('55') && telefoneLimpo.length >= 12) {
                    telefoneLimpo = telefoneLimpo.substring(2);
                }

                if (!telefoneLimpo || telefoneLimpo.length < 10) {
                    throw new Error("Digite o seu WhatsApp válido com DDD.");
                }
                if (!valPalavra || valPalavra.length < 6) {
                    throw new Error("A sua senha (Palavra) precisa ter pelo menos 6 caracteres.");
                }

                // 1. Cria a conta de acesso no Supabase Auth usando o Telefone
                const emailAuth = `${telefoneLimpo}@terreiro.app`;
                const { data: authData, error: errAuth } = await supabaseClient.auth.signUp({
                    email: emailAuth,
                    password: valPalavra
                });

                if (errAuth) {
                    if (errAuth.message.includes('already registered')) {
                        throw new Error("Este número de WhatsApp já está atrelado a outro acesso.");
                    }
                    throw errAuth;
                }

                // Apanha o ID gerado pelo sistema Auth
                const novoAuthId = authData.user.id;

                // 2. Atualiza a ficha do médium
                const updateData = {
                    nome_social: valNomeSocial,
                    telefone: telefoneLimpo,
                    data_nascimento: valNasc,
                    palavra: valPalavra,
                    senha_cadastrada: true,
                    auth_id: novoAuthId
                };

                if (valGrau && valGrau !== '-') updateData.grau = valGrau;
                if (valFuncao && valFuncao !== '-') updateData.funcao = valFuncao;

                const { error: errBd } = await supabaseClient.from('mediuns').update(updateData).eq('id', medium.id);

                if (errBd) throw errBd;

                exibirMensagem('✅ Conta ativada com sucesso! A entrar...', 'green');

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
