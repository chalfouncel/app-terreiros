document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verifica se a pessoa está logada
    const { data: { session }, error: authError } = await supabaseClient.auth.getSession();
    
    if (!session || authError) {
        window.location.href = 'index.html';
        return;
    }

    const userId = session.user.id;
    
    // Verifica se ela realmente precisa estar aqui
    const { data: perfil } = await supabaseClient.from('perfis').select('cadastro_completo').eq('id', userId).single();
    if (perfil && perfil.cadastro_completo) {
        window.location.href = 'presenca.html'; // Se já completou, manda embora
        return;
    }

    // Formulário
    const form = document.getElementById('formCompletar');
    const btnSalvar = document.getElementById('btnSalvar');
    const msgErro = document.getElementById('msgErro');
    const msgSucesso = document.getElementById('msgSucesso');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nomeSocial = document.getElementById('nomeSocial').value.trim();
        const whatsappRaw = document.getElementById('whatsapp').value;
        const novaSenha = document.getElementById('novaSenha').value;
        const confirmaSenha = document.getElementById('confirmaSenha').value;

        // Limpa o número de whatsapp (tira parênteses, traços e espaços)
        const telefoneLimpo = whatsappRaw.replace(/\D/g, '');

        // Validações Básicas
        if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
            mostrarErro('Digite um número de celular válido com DDD.');
            return;
        }

        if (novaSenha !== confirmaSenha) {
            mostrarErro('As senhas não conferem. Digite igual nos dois campos.');
            return;
        }

        if (novaSenha === '123456') {
            mostrarErro('Você não pode usar a senha padrão. Escolha uma nova senha.');
            return;
        }

        // Tudo certo, iniciar o salvamento
        btnSalvar.disabled = true;
        btnSalvar.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Salvando dados...';
        msgErro.classList.add('hidden');

        try {
            // PASSO 1: Atualizar o E-mail de Autenticação (Transformar o Nome no WhatsApp)
            const novoEmail = telefoneLimpo + '@terreiro.local';
            
            const { error: errUpdateAuth } = await supabaseClient.auth.updateUser({
                email: novoEmail,
                password: novaSenha
            });

            if (errUpdateAuth) {
                // Se der erro de "already_registered", quer dizer que alguém já usou esse telefone
                if (errUpdateAuth.message.includes('already registered')) {
                    throw new Error('Este número de WhatsApp já está cadastrado para outro médium.');
                }
                throw errUpdateAuth;
            }

            // PASSO 2: Atualizar a tabela de Perfis (Nome Social, Telefone e marcar como completo)
            const { error: errUpdatePerfil } = await supabaseClient
                .from('perfis')
                .update({
                    nome_completo: nomeSocial, // Substitui o nome gigante pelo nome social
                    telefone: telefoneLimpo,
                    cadastro_completo: true
                })
                .eq('id', userId);

            if (errUpdatePerfil) throw errUpdatePerfil;

            // Sucesso Total!
            msgSucesso.innerHTML = 'Cadastro atualizado com sucesso! <br>Redirecionando...';
            msgSucesso.classList.remove('hidden');

            // Redireciona para bater o ponto (ou admin) após 2 segundos
            setTimeout(async () => {
                const { data: userPerfil } = await supabaseClient.from('perfis').select('is_admin').eq('id', userId).single();
                if (userPerfil && userPerfil.is_admin) {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'presenca.html';
                }
            }, 2000);

        } catch (error) {
            mostrarErro(error.message || 'Ocorreu um erro ao salvar os dados.');
            btnSalvar.disabled = false;
            btnSalvar.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Salvar e Acessar Sistema';
        }
    });

    function mostrarErro(msg) {
        msgErro.textContent = msg;
        msgErro.classList.remove('hidden');
    }
});
