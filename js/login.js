document.addEventListener('DOMContentLoaded', async () => {
    // Se já estiver logado, joga para dentro do sistema
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        redirecionarUsuario(session.user.id);
        return;
    }

    const formLogin = document.getElementById('formLogin');
    const identificacaoInput = document.getElementById('identificacao');
    const senhaInput = document.getElementById('senha');
    const btnEntrar = document.getElementById('btnEntrar');
    const msgErro = document.getElementById('msgErro');

    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const identificacao = identificacaoInput.value.trim();
        const senha = senhaInput.value;
        
        btnEntrar.disabled = true;
        btnEntrar.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Autenticando...';
        msgErro.classList.add('hidden');

        let emailFantasma = '';

        // INTELIGÊNCIA: É Número (WhatsApp) ou Nome (Primeiro Acesso)?
        const contemLetras = /[a-zA-Z]/.test(identificacao);

        if (contemLetras) {
            // É NOME: Remove espaços, acentos e deixa minúsculo igualzinho no banco
            emailFantasma = identificacao
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, "") // Tira acentos (ex: á -> a)
                .replace(/[^a-z]/g, '') // Remove qualquer coisa que não seja letra (espaços, hífens)
                + '@terreiro.local';
        } else {
            // É NÚMERO (WhatsApp): Tira os parênteses/traços e junta tudo
            const numeroLimpo = identificacao.replace(/\D/g, '');
            emailFantasma = numeroLimpo + '@terreiro.local';
        }

        try {
            // Tenta fazer o login no Supabase
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: emailFantasma,
                password: senha
            });

            if (error) {
                console.error(error);
                throw new Error('Identificação ou senha incorretos.');
            }

            // Sucesso no login! Verifica para onde mandar o usuário
            await redirecionarUsuario(data.user.id);

        } catch (error) {
            msgErro.textContent = error.message;
            msgErro.classList.remove('hidden');
            btnEntrar.disabled = false;
            btnEntrar.innerHTML = 'Entrar no Sistema';
        }
    });

    // Função que decide o destino do usuário após o login
    async function redirecionarUsuario(userId) {
        try {
            const { data: perfil, error } = await supabaseClient
                .from('perfis')
                .select('cadastro_completo, is_admin')
                .eq('id', userId)
                .single();
            
            if (error) throw error;

            // REGRA 1: Se o cadastro NÃO está completo (Primeiro Acesso) -> Vai pra tela de completar
            if (perfil.cadastro_completo === false) {
                window.location.href = 'completar_cadastro.html';
                return;
            }

            // REGRA 2: Cadastro completo e é ADMIN -> Painel de Gestão
            if (perfil.is_admin === true) {
                window.location.href = 'admin.html';
                return;
            }

            // REGRA 3: Cadastro completo e Médium Comum -> Bater Ponto (Presença)
            window.location.href = 'presenca.html';

        } catch (error) {
            console.error('Erro ao buscar perfil:', error);
            msgErro.textContent = 'Erro ao carregar perfil do usuário.';
            msgErro.classList.remove('hidden');
            btnEntrar.disabled = false;
            btnEntrar.innerHTML = 'Entrar no Sistema';
        }
    }
});
