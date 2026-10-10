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

    // Se já estiver logado, redireciona
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        window.location.replace('presenca.html');
        return;
    }

    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();

            const inputs = Array.from(formLogin.querySelectorAll('input')).filter(i => i.type !== 'hidden' && i.type !== 'submit');
            if (inputs.length < 2) return exibirErro("Erro: Campos de login não encontrados.");

            const campoIdentValor = inputs[0].value.replace(/\D/g, ''); // Apenas números
            const campoSenhaValor = inputs[1].value.trim();

            if (!campoIdentValor || !campoSenhaValor) return exibirErro("Preencha a Identificação e a Senha.");

            const btnEntrar = formLogin.querySelector('button[type="submit"]');
            if (btnEntrar) {
                btnEntrar.disabled = true;
                btnEntrar.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Verificando...';
            }
            if (msgErro) msgErro.classList.add('hidden');

            try {
                // REGRA 1: PRIMEIRO ACESSO (ID + Senha 123456)
                if (campoIdentValor.length < 8) {
                    const idNumerico = parseInt(campoIdentValor);

                    if (campoSenhaValor !== '123456') {
                        throw new Error("Senha incorreta para primeiro acesso. Utilize a senha padrão 123456.");
                    }

                    // Procura o médium no banco pela coluna correta (senha_cadastrada)
                    const { data: ficha, error: errFicha } = await supabaseClient
                        .from('mediuns')
                        .select('id, senha_cadastrada')
                        .eq('id', idNumerico)
                        .maybeSingle();

                    if (errFicha || !ficha) throw new Error("ID não encontrado. Fale com a Administração.");

                    if (ficha.senha_cadastrada) {
                        throw new Error("Este cadastro já foi ativado! Faça login com o seu telefone e a senha (Palavra) criada.");
                    }

                    // SUCESSO NO 1º ACESSO -> Salva o ID na memória e vai para o cadastro SEM login
                    localStorage.setItem('medium_id', ficha.id);
                    window.location.replace('cadastro.html');
                    return;

                } else {
                    // REGRA 2: LOGIN NORMAL (Telefone + Nova Senha)
                    let telefoneLimpo = campoIdentValor;
                    if (telefoneLimpo.startsWith('55') && telefoneLimpo.length >= 12) {
                        telefoneLimpo = telefoneLimpo.substring(2);
                    }

                    const emailLogin = `${telefoneLimpo}@terreiro.app`;

                    const { data, error } = await supabaseClient.auth.signInWithPassword({
                        email: emailLogin,
                        password: campoSenhaValor
                    });

                    if (error) throw new Error("Identificação ou senha incorretos.");

                    // Sucesso: Salva o telefone e vai para o sistema
                    localStorage.setItem('telefone_acesso', telefoneLimpo);
                    window.location.replace('presenca.html');
                }
            } catch (err) {
                exibirErro(err.message);
            } finally {
                if (btnEntrar) {
                    btnEntrar.disabled = false;
                    btnEntrar.innerHTML = 'Entrar no Sistema';
                }
            }
        });
    }
});
