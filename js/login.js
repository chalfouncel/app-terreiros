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

    // 1. Limpa a cache de sessões mortas ao abrir o login
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        await rotearParaPainel(session.user.id);
        return;
    }

    // Captura os inputs de forma blindada
    const inputs = formLogin ? Array.from(formLogin.querySelectorAll('input')).filter(i => i.type !== 'hidden' && i.type !== 'submit') : [];
    
    // Configuração do Botão "Acesso Admin"
    const elementosTexto = Array.from(document.querySelectorAll('a, span, p, button, div'));
    const btnAcessoAdmin = elementosTexto.find(el => el.textContent.trim().toLowerCase() === 'acesso admin');
    
    let modoAdminAtivo = false;

    if (btnAcessoAdmin && inputs.length >= 2) {
        const inputIdentificacao = inputs[0];
        const inputSenha = inputs[1];

        // Torna o botão clicável caso não seja um button nativo
        btnAcessoAdmin.style.cursor = 'pointer';

        btnAcessoAdmin.addEventListener('click', (e) => {
            e.preventDefault();
            modoAdminAtivo = !modoAdminAtivo;

            if (modoAdminAtivo) {
                // Remove as amarras numéricas do HTML para permitir E-mail
                inputIdentificacao.removeAttribute('pattern');
                inputSenha.removeAttribute('pattern');

                // Vira o teclado para Alfanumérico/E-mail
                inputIdentificacao.type = 'email';
                inputIdentificacao.inputMode = 'email';
                inputIdentificacao.placeholder = 'E-mail do Administrador';
                
                inputSenha.type = 'password';
                inputSenha.inputMode = 'text'; // Teclado completo para a senha
                
                btnAcessoAdmin.textContent = 'Acesso Médium';
                btnAcessoAdmin.classList.add('text-red-600');
            } else {
                // Volta o teclado para Numérico (Médium)
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
        // Desativa validações nativas (balões de erro do navegador) para controlar no JS
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
                // ==========================================
                // FLUXO 1: ACESSO ADMIN (E-MAIL PURO)
                // ==========================================
                if (modoAdminAtivo || campoIdentValor.includes('@')) {
                    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
                        email: campoIdentValor,
                        password: campoSenhaValor
                    });

                    if (authError) throw new Error("E-mail ou senha de administrador incorretos.");
                    
                    await rotearParaPainel(authData.user.id, null);
                    return; // Interrompe a execução aqui para o Admin
                }

                // ==========================================
                // FLUXO 2: ACESSO MÉDIUM (ID OU TELEFONE)
                // ==========================================
                let idBusca = null;
                let emailLogin = null;
                let telefoneAcesso = null;

                const loginLimpo = campoIdentValor.replace(/\D/g, ''); // Deixa apenas os números
                if (!loginLimpo) throw new Error("Identificação inválida. Digite apenas números.");

                // REGRA A: Primeiro Acesso (ID)
                if (loginLimpo.length < 8) {
                    idBusca = parseInt(loginLimpo);
                    
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
                        throw new Error("Este cadastro já foi ativado! Faça login com o seu telefone e a senha (Palavra) criada.");
                    }

                    // SUCESSO NO 1º ACESSO -> Salva o ID na memória e vai para o cadastro
                    localStorage.setItem('medium_id', ficha.id);
                    window.location.replace('cadastro.html');
                    return;

                // REGRA B: Login Normal (Telefone + Nova Senha)
                } else {
                    telefoneAcesso = loginLimpo;
                    if (telefoneAcesso.startsWith('55') && telefoneAcesso.length >= 12) {
                        telefoneAcesso = telefoneAcesso.substring(2);
                    }

                    emailLogin = `${telefoneAcesso}@terreiro.app`;

                    const { data, error } = await supabaseClient.auth.signInWithPassword({
                        email: emailLogin,
                        password: campoSenhaValor
                    });

                    if (error) throw new Error("Identificação ou senha incorretos.");

                    // Sucesso: Salva o telefone e roteia garantindo vínculo ativo (Multiterreiro SaaS)
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
            // Prioriza ficha ativa caso o usuário já tenha pertencido a outro terreiro no SaaS
            const { data: listaAuth } = await supabaseClient
                .from('mediuns')
                .select('id, cadastro_completo, is_master, status_ativo')
                .eq('auth_id', authId)
                .order('status_ativo', { ascending: false })
                .limit(1);

            let perfil = (listaAuth && listaAuth.length > 0) ? listaAuth[0] : null;

            if (!perfil && telefone) {
                const { data: listaTel } = await supabaseClient
                    .from('mediuns')
                    .select('id, cadastro_completo, status_ativo')
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
                if (perfil.cadastro_completo || perfil.is_master) {
                    window.location.replace('presenca.html');
                } else {
                    window.location.replace('cadastro.html');
                }
            } else {
                // Se for Master logado direto com e-mail, sem tabela de médium correspondente
                window.location.replace('admin.html');
            }
        } catch(e) {
            window.location.replace('cadastro.html');
        }
    }
});
