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
            
            // Busca o campo de identificação aceitando tanto id="login" quanto id="telefone"
            const campoIdentificacao = document.getElementById('login') || document.getElementById('telefone');
            const campoSenha = document.getElementById('senha');

            if (!campoIdentificacao || !campoSenha) {
                if (msgErro) {
                    msgErro.textContent = 'Erro ao identificar os campos de entrada.';
                    msgErro.classList.remove('hidden');
                }
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

                // Se o médium digitou apenas números (ID ou WhatsApp)
                if (!loginValor.includes('@')) {
                    const digitos = loginValor.replace(/\D/g, '');
                    if (!digitos) throw new Error('Digite uma identificação válida.');
                    
                    // Se for um ID numérico curto (ex: 149)
                    if (digitos.length < 8) {
                        idNumerico = parseInt(digitos);
                        emailFinal = `medium_${idNumerico}@app-terreiros.local`;
                    } else {
                        // Se for número de WhatsApp
                        let tel = digitos;
                        if (tel.startsWith('55') && tel.length >= 12) tel = tel.substring(2);
                        emailFinal = `${tel}@app-terreiros.local`;
                    }
                }

                // 1. Tenta autenticação direta
                let { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
                    email: emailFinal,
                    password: senhaValor
                });

                // 2. Se falhar e for primeiro acesso com senha padrão 123456
                if (authError && idNumerico && senhaValor === '123456') {
                    // Cadastra a conta no Auth do Supabase
                    const { data: cadData, error: cadError } = await supabaseClient.auth.signUp({
                        email: emailFinal,
                        password: '123456'
                    });

                    if (cadError && !cadError.message.includes('already registered')) {
                        throw new Error('Falha no primeiro acesso: ' + cadError.message);
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
                console.error("Falha no login:", err);
                if (msgErro) {
                    msgErro.textContent = err.message.includes('Invalid login') 
                        ? 'Identificação ou senha incorretos.' 
                        : (err.message || 'Erro ao entrar no sistema.');
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
                // Se não achou por auth_id, busca pelo ID numérico e vincula
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
                window.location.replace('admin.html');
            }
        } catch (e) {
            console.error("Erro no redirecionamento:", e);
            window.location.replace('cadastro.html');
        }
    }
});
