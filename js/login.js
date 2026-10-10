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

    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();

            // CAPTURA BLINDADA: Pega os dois primeiros inputs visíveis da tela, não importa o ID que tenham
            const inputs = Array.from(formLogin.querySelectorAll('input')).filter(i => i.type !== 'hidden' && i.type !== 'submit');
            
            if (inputs.length < 2) {
                return exibirErro("Erro estrutural: Campos de preenchimento não encontrados na tela.");
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
                let idBusca = null;
                let emailLogin = null;
                let telefoneAcesso = null;

                const loginLimpo = campoIdentValor.replace(/\D/g, ''); // Deixa apenas os números
                if (!loginLimpo) throw new Error("Identificação inválida. Digite apenas números.");

                // REGRA: Se tiver menos de 8 dígitos, é o primeiro acesso (ID do médium)
                if (loginLimpo.length < 8) {
                    idBusca = parseInt(loginLimpo);
                    
                    // Busca o telefone na tabela do banco
                    const { data: ficha, error: errFicha } = await supabaseClient
                        .from('mediuns')
                        .select('telefone, cadastro_completo')
                        .eq('id', idBusca)
                        .maybeSingle();

                    if (!ficha) throw new Error("ID não encontrado. Fale com a Administração.");
                    if (!ficha.telefone) throw new Error("O seu cadastro não possui telefone. Peça ao Admin para o adicionar primeiro.");

                    telefoneAcesso = ficha.telefone.replace(/\D/g, '');
                    emailLogin = `${telefoneAcesso}@terreiro.app`;

                } else {
                    // REGRA: Login normal através do telefone
                    telefoneAcesso = loginLimpo;
                    if (telefoneAcesso.startsWith('55') && telefoneAcesso.length >= 12) {
                        telefoneAcesso = telefoneAcesso.substring(2);
                    }
                    emailLogin = `${telefoneAcesso}@terreiro.app`;
                }

                // 1. Tenta o login principal
                let { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
                    email: emailLogin,
                    password: campoSenhaValor
                });

                // 2. Se falhar, e a senha for a padrão 123456, tentamos criar o acesso na hora
                if (authError && idBusca && campoSenhaValor === '123456') {
                    const { error: erroCriacao } = await supabaseClient.auth.signUp({
                        email: emailLogin,
                        password: '123456'
                    });
                    
                    if (erroCriacao && !erroCriacao.message.includes('already registered')) {
                        throw new Error("Erro ao criar credencial de acesso: " + erroCriacao.message);
                    }
                    
                    const reLogin = await supabaseClient.auth.signInWithPassword({
                        email: emailLogin,
                        password: '123456'
                    });
                    if (reLogin.error) throw reLogin.error;
                    authData = reLogin.data;
                    authError = null;
                }

                if (authError) throw new Error("Identificação ou senha incorretos.");

                // Sucesso: Salva o ID na cache
                if (idBusca) localStorage.setItem('medium_id', idBusca);
                localStorage.setItem('telefone_acesso', telefoneAcesso);
                
                await rotearParaPainel(authData.user.id, telefoneAcesso);

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
            let { data: perfil } = await supabaseClient.from('mediuns').select('id, cadastro_completo').eq('auth_id', authId).maybeSingle();

            if (!perfil && telefone) {
                const { data: pTel } = await supabaseClient.from('mediuns').select('id, cadastro_completo').eq('telefone', telefone).maybeSingle();
                if (pTel) {
                    perfil = pTel;
                    await supabaseClient.from('mediuns').update({ auth_id: authId }).eq('id', perfil.id);
                }
            }

            if (perfil) {
                localStorage.setItem('medium_id', perfil.id);
                if (perfil.cadastro_completo) {
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
