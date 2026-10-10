document.addEventListener('DOMContentLoaded', async () => {
    const formLogin = document.getElementById('formLogin');
    const msgErro = document.getElementById('msgErro');
    const btnEntrar = document.getElementById('btnEntrar');

    // 1. Verifica se já existe sessão ativa
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
            btnEntrar.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> A entrar...';
            if (msgErro) msgErro.classList.add('hidden');

            try {
                let emailLogin = loginInput;
                let idNumerico = null;

                // Se o utilizador introduziu um ID numérico (ex: 149)
                if (!loginInput.includes('@')) {
                    idNumerico = parseInt(loginInput.replace(/\D/g, ''));
                    if (isNaN(idNumerico)) throw new Error('Identificação inválida.');
                    emailLogin = `id_${idNumerico}@templo.app`;
                }

                // Tenta autenticação direta
                let { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: emailLogin,
                    password: senhaInput
                });

                // Se falhar e for o primeiro acesso com a palavra-passe padrão 123456
                if (error && idNumerico && senhaInput === '123456') {
                    // Verifica se a ficha do médium existe na tabela mediuns
                    const { data: fichaMedium, error: errFicha } = await supabaseClient
                        .from('mediuns')
                        .select('id, cadastro_completo')
                        .eq('id', idNumerico)
                        .maybeSingle();

                    if (errFicha || !fichaMedium) {
                        throw new Error(`O ID ${idNumerico} não foi encontrado no sistema.`);
                    }

                    // Cria o registo no Supabase Auth para este médium
                    const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
                        email: emailLogin,
                        password: '123456'
                    });

                    if (signUpError) {
                        // Se já existia conta no Auth mas a palavra-passe 123456 falhou
                        if (signUpError.message.includes('already registered')) {
                            throw new Error('A sua palavra-passe padrão já foi alterada. Utilize a sua palavra-passe definitiva.');
                        }
                        throw signUpError;
                    }

                    // Se a conta foi criada ou requer sessão imediata
                    if (signUpData.session) {
                        data = signUpData;
                        error = null;
                    } else {
                        // Faz login imediato com a conta recém-criada
                        const loginPosCadastro = await supabaseClient.auth.signInWithPassword({
                            email: emailLogin,
                            password: '123456'
                        });
                        if (loginPosCadastro.error) throw loginPosCadastro.error;
                        data = loginPosCadastro.data;
                        error = null;
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
                        ? 'ID ou palavra-passe incorretos.' 
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

            // 1. Tenta buscar pelo auth_id
            let { data: perfil } = await supabaseClient
                .from('mediuns')
                .select('id, cadastro_completo, auth_id, is_admin, is_master')
                .eq('auth_id', authId)
                .maybeSingle();

            // 2. Se não encontrou pelo auth_id, busca pelo ID numérico e vincula
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
            console.error("Erro ao rotear utilizador:", e);
            window.location.replace('cadastro.html');
        }
    }
});
