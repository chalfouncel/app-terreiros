document.addEventListener('DOMContentLoaded', async () => {
    const formLogin = document.querySelector('form');
    const msgErro = document.getElementById('msgErro') || document.querySelector('.msg-erro');

    function exibirErro(texto) {
        if (msgErro) {
            msgErro.textContent = texto;
            msgErro.classList.remove('hidden');
        } else {
            alert(texto);
        }
    }

    // 1. Verifica sessão ativa ao abrir o login
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        await rotearParaPainel(session.user.id);
        return;
    }

    const inputs = formLogin ? Array.from(formLogin.querySelectorAll('input')).filter(i => i.type !== 'hidden' && i.type !== 'submit') : [];
    
    const elementosTexto = Array.from(document.querySelectorAll('a, span, p, button, div'));
    const btnAcessoAdmin = elementosTexto.find(el => el.textContent.trim().toLowerCase() === 'acesso admin');
    
    let modoAdminAtivo = false;

    if (btnAcessoAdmin && inputs.length >= 2) {
        const inputIdentificacao = inputs[0];
        const inputSenha = inputs[1];

        btnAcessoAdmin.style.cursor = 'pointer';

        btnAcessoAdmin.addEventListener('click', (e) => {
            e.preventDefault();
            modoAdminAtivo = !modoAdminAtivo;

            if (modoAdminAtivo) {
                inputIdentificacao.removeAttribute('pattern');
                inputSenha.removeAttribute('pattern');
                inputIdentificacao.type = 'email';
                inputIdentificacao.inputMode = 'email';
                inputIdentificacao.placeholder = 'E-mail do Administrador';
                inputSenha.type = 'password';
                inputSenha.inputMode = 'text';
                btnAcessoAdmin.textContent = 'Acesso Médium';
                btnAcessoAdmin.classList.add('text-red-600');
            } else {
                inputIdentificacao.setAttribute('pattern', '[0-9]*');
                inputIdentificacao.type = 'tel';
                inputIdentificacao.inputMode = 'numeric';
                inputIdentificacao.placeholder = 'ID (1º Acesso) ou WhatsApp';
                inputSenha.setAttribute('pattern', '[0-9]*');
                inputSenha.type = 'password';
                inputSenha.inputMode = 'numeric';
                btnAcessoAdmin.textContent = 'Acesso Admin';
                btnAcessoAdmin.classList.remove('text-red-600');
            }
        });
    }

    if (formLogin) {
        formLogin.setAttribute('novalidate', 'true');

        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (inputs.length < 2) {
                return exibirErro("Erro estrutural: Campos de preenchimento não encontrados.");
            }

            const campoIdentValor = inputs[0].value.trim();
            const campoSenhaValor = inputs[1].value.trim();

            if (!campoIdentValor || !campoSenhaValor) {
                return exibirErro("Preencha a Identificação e a Senha.");
            }

            const btnEntrar = formLogin.querySelector('button[type="submit"]');
            if (btnEntrar) {
                btnEntrar.disabled = true;
                btnEntrar.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Verificando...';
            }
            if (msgErro) msgErro.classList.add('hidden');

            try {
                // FLUXO 1: ACESSO ADMIN (E-MAIL PURO)
                if (modoAdminAtivo || campoIdentValor.includes('@')) {
                    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
                        email: campoIdentValor,
                        password: campoSenhaValor
                    });

                    if (authError) throw new Error("E-mail ou senha de administrador incorretos.");
                    
                    await rotearParaPainel(authData.user.id, null);
                    return;
                }

                // FLUXO 2: ACESSO MÉDIUM (ID OU TELEFONE)
                const loginLimpo = campoIdentValor.replace(/\D/g, '');
                if (!loginLimpo) throw new Error("Identificação inválida. Digite apenas números.");

                // REGRA A: Primeiro Acesso (ID curto)
                if (loginLimpo.length < 8) {
                    const idBusca = parseInt(loginLimpo, 10);
                    
                    if (campoSenhaValor !== '123456') {
                        throw new Error("Senha incorreta para primeiro acesso. Utilize a senha padrão 123456.");
                    }

                    const { data: ficha, error: errFicha } = await supabaseClient
                        .from('mediuns')
                        .select('id, senha_cadastrada')
                        .eq('id', idBusca)
                        .maybeSingle();

                    if (errFicha || !ficha) throw new Error("ID não encontrado. Fale com a Administração.");

                    if (ficha.senha_cadastrada) {
                        throw new Error("Este cadastro já foi ativado! Faça login com o seu telefone e a senha criada.");
                    }

                    localStorage.setItem('medium_id', ficha.id);
                    window.location.replace('cadastro.html');
                    return;

                // REGRA B: Login com Telefone (Normal ou Senha Resetada para 123456)
                } else {
                    let telefoneAcesso = loginLimpo;
                    if (telefoneAcesso.startsWith('55') && telefoneAcesso.length >= 12) {
                        telefoneAcesso = telefoneAcesso.substring(2);
                    }

                    const emailLogin = `${telefoneAcesso}@terreiro.app`;

                    const { data, error } = await supabaseClient.auth.signInWithPassword({
                        email: emailLogin,
                        password: campoSenhaValor
                    });

                    if (error) throw new Error("Identificação ou senha incorretos.");

                    localStorage.setItem('telefone_acesso', telefoneAcesso);
                    await rotearParaPainel(data.user.id, telefoneAcesso);
                }
            } catch (err) {
                console.error(err);
                exibirErro(err.message);
            } finally {
                if (btnEntrar) {
                    btnEntrar.disabled = false;
                    btnEntrar.innerHTML = 'Entrar no Sistema';
                }
            }
        });
    }

    async function rotearParaPainel(authId, telefone = null) {
        try {
            const { data: listaAuth } = await supabaseClient
                .from('mediuns')
                .select('id, cadastro_completo, senha_cadastrada, is_master, status_ativo')
                .eq('auth_id', authId)
                .order('status_ativo', { ascending: false })
                .limit(1);

            let perfil = (listaAuth && listaAuth.length > 0) ? listaAuth[0] : null;

            if (!perfil && telefone) {
                const { data: listaTel } = await supabaseClient
                    .from('mediuns')
                    .select('id, cadastro_completo, senha_cadastrada, status_ativo')
                    .eq('telefone', telefone)
                    .order('status_ativo', { ascending: false })
                    .limit(1);

                if (listaTel && listaTel.length > 0) {
                    perfil = listaTel[0];
                    await supabaseClient.from('mediuns').update({ auth_id: authId }).eq('id', perfil.id);
                }
            }

            if (perfil) {
                localStorage.setItem('medium_id', perfil.id);
                // Se o cadastro está completo E a senha não está pendente de reset, vai para presença
                if ((perfil.cadastro_completo && perfil.senha_cadastrada !== false) || perfil.is_master) {
                    window.location.replace('presenca.html');
                } else {
                    window.location.replace('cadastro.html');
                }
            } else {
                window.location.replace('admin.html');
            }
        } catch(e) {
            window.location.replace('cadastro.html');
        }
    }
});
