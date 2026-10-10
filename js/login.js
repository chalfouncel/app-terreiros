document.addEventListener('DOMContentLoaded', async () => {
    const formLogin = document.getElementById('formLogin');
    const msgErro = document.getElementById('msgErro');
    const btnEntrar = document.getElementById('btnEntrar');

    // 1. Verifica se já existe sessão ativa ao carregar
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        await rotearUsuarioLogado(session.user.id);
        return;
    }

    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const loginInput = document.getElementById('login').value.trim();
            const senhaInput = document.getElementById('senha').value.trim();

            btnEntrar.disabled = true;
            btnEntrar.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Entrando...';
            if (msgErro) msgErro.classList.add('hidden');

            try {
                let emailLogin = loginInput;
                let idNumerico = null;

                // Identifica se é ID numérico (ex: 149)
                if (!loginInput.includes('@')) {
                    idNumerico = parseInt(loginInput.replace(/\D/g, ''));
                    emailLogin = `${idNumerico}@app-terreiros.local`;
                }

                // Tenta login direto
                let { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: emailLogin,
                    password: senhaInput
                });

                // Se falhou e for o primeiro acesso com a senha padrão 123456[cite: 14]
                if (error && idNumerico && senhaInput === '123456') {
                    // Cria a credencial no Auth com auto-confirmação
                    const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
                        email: emailLogin,
                        password: '123456'
                    });

                    if (!signUpError && signUpData.user) {
                        data = { user: signUpData.user };
                        error = null;
                    } else if (signUpError && signUpError.message.includes('already registered')) {
                        throw new Error('ID ou senha incorretos.');
                    } else if (signUpError) {
                        throw signUpError;
                    }
                }

                if (error) throw error;

                if (data && data.user) {
                    localStorage.setItem('auth_user_id', data.user.id);
                    if (idNumerico) {
                        localStorage.setItem('medium_id', idNumerico);
                    }
                    await rotearUsuarioLogado(data.user.id, idNumerico);
                }

            } catch (err) {
                console.error("Erro no login:", err);
                if (msgErro) {
                    msgErro.textContent = err.message.includes('Invalid login') 
                        ? 'ID ou senha incorretos.' 
                        : (err.message || 'Erro ao realizar login.');
                    msgErro.classList.remove('hidden');
                }
            } finally {
                btnEntrar.disabled = false;
                btnEntrar.innerHTML = 'Entrar no Sistema';
            }
        });
    }

    async function rotearUsuarioLogado(authId, idNumericoForcado = null) {
        try {
            let idBusca = idNumericoForcado || localStorage.getItem('medium_id');

            // 1. Busca pelo auth_id
            let { data: perfil } = await supabaseClient
                .from('mediuns')
                .select('id, cadastro_completo, auth_id, is_admin, is_master')
                .eq('auth_id', authId)
                .maybeSingle();

            // 2. Se não achou por auth_id, busca por ID numérico e vincula
            if (!perfil && idBusca) {
                const { data: perfilPorId } = await supabaseClient
                    .from('mediuns')
                    .select('id, cadastro_completo, auth_id, is_admin, is_master')
                    .eq('id', parseInt(idBusca))
                    .maybeSingle();

                if (perfilPorId) {
                    perfil = perfilPorId;
                    await supabaseClient
                        .from('mediuns')
                        .update({ auth_id: authId })
                        .eq('id', perfil.id);
                }
            }

            if (perfil) {
                localStorage.setItem('medium_id', perfil.id);
                if (perfil.cadastro_completo === false) {
                    window.location.replace('cadastro.html');
                } else {
                    window.location.replace('presenca.html');
                }
            } else {
                window.location.replace('admin.html');
            }
        } catch (e) {
            console.error("Erro ao rotear:", e);
            window.location.replace('cadastro.html');
        }
    }
});
