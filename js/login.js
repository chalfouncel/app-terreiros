document.addEventListener('DOMContentLoaded', async () => {
    const formLogin = document.getElementById('formLogin') || document.querySelector('form');
    const msgErro = document.getElementById('msgErro');
    const btnEntrar = document.getElementById('btnEntrar') || formLogin?.querySelector('button[type="submit"]');

    // 1. Verifica sessão ativa
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        await rotearParaPainel(session.user.id);
        return;
    }

    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();

            const campoIdent = document.getElementById('login');
            const campoSenha = document.getElementById('senha');

            if (!campoIdent || !campoSenha) return alert('Campos de login não encontrados.');

            const loginValor = campoIdent.value.replace(/\D/g, ''); // Apenas números
            const senhaValor = campoSenha.value.trim();

            if (!loginValor || !senhaValor) {
                if (msgErro) { msgErro.textContent = 'Preencha identificação e senha.'; msgErro.classList.remove('hidden'); }
                return;
            }

            if (btnEntrar) { btnEntrar.disabled = true; btnEntrar.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Verificando...'; }
            if (msgErro) msgErro.classList.add('hidden');

            try {
                let idBusca = null;
                let emailLogin = null;
                let telefoneAcesso = null;

                // Determina se é o primeiro acesso (ID curto, ex: 149) ou acesso normal (Telefone com DDD)
                if (loginValor.length < 8) {
                    idBusca = parseInt(loginValor);
                    
                    // Busca o telefone atrelado a este ID na tabela mediuns
                    const { data: ficha, error: errFicha } = await supabaseClient
                        .from('mediuns')
                        .select('telefone, cadastro_completo')
                        .eq('id', idBusca)
                        .maybeSingle();

                    if (!ficha) throw new Error("ID não encontrado. Fale com a Administração.");
                    if (!ficha.telefone) throw new Error("Ficha sem telefone. O Admin precisa adicionar o seu telefone antes do 1º acesso.");

                    telefoneAcesso = ficha.telefone;
                    emailLogin = `${telefoneAcesso}@terreiro.app`;

                } else {
                    // É um login por telefone
                    let telLimpo = loginValor;
                    if (telLimpo.startsWith('55') && telLimpo.length >= 12) telLimpo = telLimpo.substring(2);
                    telefoneAcesso = telLimpo;
                    emailLogin = `${telLimpo}@terreiro.app`;
                }

                // Tenta o login com o e-mail TELEFONE@terreiro.app[cite: 19, 20]
                let { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
                    email: emailLogin,
                    password: senhaValor
                });

                // Se falhou, é login por ID e a senha é a padrão 123456: Cria a conta Auth
                if (authError && idBusca && senhaValor === '123456') {
                    const { error: erroCriacao } = await supabaseClient.auth.signUp({
                        email: emailLogin,
                        password: '123456'
                    });
                    
                    if (erroCriacao && !erroCriacao.message.includes('already registered')) {
                        throw new Error("Erro ao criar conta de acesso: " + erroCriacao.message);
                    }
                    
                    // Loga imediatamente
                    const reLogin = await supabaseClient.auth.signInWithPassword({
                        email: emailLogin,
                        password: '123456'
                    });
                    if (reLogin.error) throw reLogin.error;
                    authData = reLogin.data;
                    authError = null;
                }

                if (authError) throw new Error("Identificação ou senha incorretos.");

                // Sucesso: Salva o ID/Telefone na cache e vai para o painel
                if (idBusca) localStorage.setItem('medium_id', idBusca);
                localStorage.setItem('telefone_acesso', telefoneAcesso);
                
                await rotearParaPainel(authData.user.id, telefoneAcesso);

            } catch (err) {
                console.error(err);
                if (msgErro) { msgErro.textContent = err.message; msgErro.classList.remove('hidden'); }
            } finally {
                if (btnEntrar) { btnEntrar.disabled = false; btnEntrar.innerHTML = 'Entrar no Sistema'; }
            }
        });
    }

    async function rotearParaPainel(authId, telefone = null) {
        try {
            // Busca a ficha pelo auth_id
            let { data: perfil } = await supabaseClient.from('mediuns').select('id, cadastro_completo').eq('auth_id', authId).maybeSingle();

            // Se ainda não vinculou, busca pelo telefone e vincula o auth_id
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
