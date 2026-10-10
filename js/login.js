document.addEventListener('DOMContentLoaded', async () => {
    const formLogin = document.getElementById('formLogin');
    const msgErro = document.getElementById('msgErro');
    const btnEntrar = document.getElementById('btnEntrar');

    // Se já estiver logado, redireciona
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        await redirecionar(session.user.id);
        return;
    }

    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // CORREÇÃO CRÍTICA: O input do index.html é "login", NÃO "telefone"!
            const campoIdentificacao = document.getElementById('login');
            const campoSenha = document.getElementById('senha');

            if (!campoIdentificacao || !campoSenha) {
                alert("Erro nos campos do formulário.");
                return;
            }

            const loginValor = campoIdentificacao.value.trim();
            const senhaValor = campoSenha.value.trim();

            btnEntrar.disabled = true;
            btnEntrar.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Verificando...';
            if (msgErro) msgErro.classList.add('hidden');

            try {
                let emailFinal = loginValor;
                let idNumerico = null;

                // Se for ID (ex: 149)
                if (!loginValor.includes('@')) {
                    const digitos = loginValor.replace(/\D/g, '');
                    if (!digitos) throw new Error('Digite um ID válido.');
                    idNumerico = parseInt(digitos);
                    emailFinal = `medium_${idNumerico}@app-terreiros.local`;
                }

                // 1. Tenta login direto
                let { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
                    email: emailFinal,
                    password: senhaValor
                });

                // 2. Se for primeiro acesso com senha padrão 123456 e a conta ainda não existe no Auth
                if (authError && idNumerico && senhaValor === '123456') {
                    // Cadastra a conta no Auth na hora
                    const { data: cadData, error: cadError } = await supabaseClient.auth.signUp({
                        email: emailFinal,
                        password: '123456'
                    });

                    if (cadError && !cadError.message.includes('already registered')) {
                        throw new Error("Erro ao criar credencial: " + cadError.message);
                    }

                    // Loga imediatamente com a conta criada
                    const logarNovamente = await supabaseClient.auth.signInWithPassword({
                        email: emailFinal,
                        password: '123456'
                    });

                    if (logarNovamente.error) throw logarNovamente.error;
                    authData = logarNovamente.data;
                    authError = null;
                }

                if (authError) throw authError;

                if (authData && authData.user) {
                    localStorage.setItem('auth_user_id', authData.user.id);
                    if (idNumerico) localStorage.setItem('medium_id', idNumerico);
                    await redirecionar(authData.user.id, idNumerico);
                }

            } catch (err) {
                console.error("Falha de Login:", err);
                if (msgErro) {
                    msgErro.textContent = err.message.includes('Invalid login') 
                        ? 'ID ou senha incorretos.' 
                        : (err.message || 'Erro ao entrar.');
                    msgErro.classList.remove('hidden');
                }
            } finally {
                btnEntrar.disabled = false;
                btnEntrar.innerHTML = 'Entrar no Sistema';
            }
        });
    }

    async function redirecionar(authId, idForcado = null) {
        try {
            let idBusca = idForcado || localStorage.getItem('medium_id');
            let perfil = null;

            // Busca por auth_id
            const { data: pAuth } = await supabaseClient
                .from('mediuns')
                .select('id, cadastro_completo, auth_id')
                .eq('auth_id', authId)
                .maybeSingle();

            if (pAuth) {
                perfil = pAuth;
            } else if (idBusca) {
                // Se não achou por auth_id, busca pelo ID numérico e amarra o auth_id
                const { data: pId } = await supabaseClient
                    .from('mediuns')
                    .select('id, cadastro_completo, auth_id')
                    .eq('id', parseInt(idBusca))
                    .maybeSingle();

                if (pId) {
                    perfil = pId;
                    await supabaseClient.from('mediuns').update({ auth_id: authId }).eq('id', perfil.id);
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
                // Caso seja o usuário Master/Admin
                window.location.replace('admin.html');
            }
        } catch (e) {
            console.error("Erro no redirecionamento:", e);
            window.location.replace('cadastro.html');
        }
    }
});
