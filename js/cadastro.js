document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('formCompletarCadastro');
    const msg = document.getElementById('msgCadastro');
    const btnSalvar = document.getElementById('btnSalvarCadastro');

    // 1. Verifica se existe sessão autenticada
    const { data: { session }, error: erroSessao } = await supabaseClient.auth.getSession();

    if (erroSessao || !session) {
        localStorage.clear();
        window.location.replace('index.html');
        return;
    }

    let mediumId = null;

    try {
        const authId = session.user.id;
        let idNumerico = null;

        // Extrai o ID numérico do email se existir (ex: id_149@templo.app ou 149@...)
        if (session.user.email) {
            const parte = session.user.email.split('@')[0].replace(/\D/g, '');
            if (parte && !isNaN(parte)) idNumerico = parseInt(parte);
        }
        if (!idNumerico) {
            const local = localStorage.getItem('medium_id');
            if (local && !isNaN(local)) idNumerico = parseInt(local);
        }

        let medium = null;

        // Busca prioritária por auth_id
        const { data: mAuth } = await supabaseClient
            .from('mediuns')
            .select('*')
            .eq('auth_id', authId)
            .maybeSingle();

        if (mAuth) {
            medium = mAuth;
        } else if (idNumerico) {
            // Busca por ID numérico e vincula o auth_id
            const { data: mId } = await supabaseClient
                .from('mediuns')
                .select('*')
                .eq('id', idNumerico)
                .maybeSingle();

            if (mId) {
                medium = mId;
                await supabaseClient
                    .from('mediuns')
                    .update({ auth_id: authId })
                    .eq('id', medium.id);
            }
        }

        if (!medium) {
            if (msg) {
                msg.textContent = 'Aguardando sincronização da ficha. Por favor, atualize a página.';
                msg.className = 'text-xs md:text-sm font-bold text-center text-yellow-600 block mt-2';
                msg.classList.remove('hidden');
            }
            return;
        }

        // Se o médium já completou o cadastro, direciona para o check-in
        if (medium.cadastro_completo === true) {
            window.location.replace('presenca.html');
            return;
        }

        mediumId = medium.id;
        localStorage.setItem('medium_id', medium.id);

        // Preenche campos conhecidos
        const elNomeComp = document.getElementById('cadNomeCompleto');
        if (elNomeComp) elNomeComp.value = medium.nome_completo || '';

        const elNomeSoc = document.getElementById('cadNomeSocial');
        if (elNomeSoc && medium.nome_social) elNomeSoc.value = medium.nome_social;

        const elTel = document.getElementById('cadTelefone');
        if (elTel && medium.telefone) {
            let telLimpo = medium.telefone.replace(/\D/g, '');
            if (telLimpo.startsWith('55') && telLimpo.length > 11) {
                telLimpo = telLimpo.substring(2);
            }
            elTel.value = telLimpo;
        }

        const elNasc = document.getElementById('cadNascimento');
        if (elNasc && medium.data_nascimento) elNasc.value = medium.data_nascimento;

    } catch (err) {
        console.error('Erro ao recuperar ficha do médium:', err);
    }

    // 2. Submissão do Formulário
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!mediumId) {
                const local = localStorage.getItem('medium_id');
                if (local) mediumId = parseInt(local);
            }

            if (!mediumId) {
                alert('Erro na identificação da ficha. Atualize a página.');
                return;
            }

            const nomeSocial = document.getElementById('cadNomeSocial')?.value.trim() || null;
            const telefoneRaw = document.getElementById('cadTelefone')?.value || '';
            const dataNascimento = document.getElementById('cadNascimento')?.value || null;
            const novaSenha = document.getElementById('cadNovaSenha')?.value || '';
            const confirmaSenha = document.getElementById('cadConfirmaSenha')?.value || '';

            let telefoneLimpo = telefoneRaw.replace(/\D/g, '');

            if (telefoneLimpo.startsWith('55') && telefoneLimpo.length >= 12) {
                telefoneLimpo = telefoneLimpo.substring(2);
            }

            if (!telefoneLimpo || telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
                msg.textContent = 'Digite um telefone válido com DDD (ex: 21999999999).';
                msg.className = 'text-xs md:text-sm font-bold text-center text-red-600 block mt-2';
                msg.classList.remove('hidden');
                return;
            }

            if (novaSenha !== confirmaSenha) {
                msg.textContent = 'As senhas não coincidem.';
                msg.className = 'text-xs md:text-sm font-bold text-center text-red-600 block mt-2';
                msg.classList.remove('hidden');
                return;
            }

            btnSalvar.disabled = true;
            btnSalvar.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> A concluir cadastro...';
            msg.classList.add('hidden');

            try {
                // Atualiza a palavra-passe no Supabase Auth
                const { error: erroAuth } = await supabaseClient.auth.updateUser({
                    password: novaSenha
                });

                if (erroAuth) throw erroAuth;

                // Atualiza a ficha do médium e confirma cadastro_completo = true
                const { error: erroUpdate } = await supabaseClient
                    .from('mediuns')
                    .update({
                        nome_social: nomeSocial,
                        telefone: telefoneLimpo,
                        data_nascimento: dataNascimento,
                        cadastro_completo: true,
                        auth_id: session.user.id
                    })
                    .eq('id', mediumId);

                if (erroUpdate) {
                    if (erroUpdate.message.includes('unique constraint')) {
                        throw new Error("Este número de WhatsApp já se encontra registado.");
                    }
                    throw erroUpdate;
                }

                msg.textContent = '✅ Cadastro concluído com sucesso!';
                msg.className = 'text-xs md:text-sm font-bold text-center text-green-600 block mt-2';
                msg.classList.remove('hidden');

                setTimeout(() => {
                    window.location.replace('presenca.html');
                }, 1200);

            } catch (error) {
                console.error('Erro ao salvar cadastro:', error);
                msg.textContent = 'Erro: ' + error.message;
                msg.className = 'text-xs md:text-sm font-bold text-center text-red-600 block mt-2';
                msg.classList.remove('hidden');
                btnSalvar.disabled = false;
                btnSalvar.innerHTML = 'Concluir Cadastro e Entrar';
            }
        });
    }
});
