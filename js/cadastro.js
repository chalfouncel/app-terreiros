document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('formCompletarCadastro');
    const msg = document.getElementById('msgCadastro');
    const btnSalvar = document.getElementById('btnSalvarCadastro');

    // 1. Verifica sessão autenticada
    const { data: { session }, error: erroSessao } = await supabaseClient.auth.getSession();

    if (erroSessao || !session) {
        localStorage.clear();
        window.location.href = 'index.html';
        return;
    }

    let mediumId = null;
    let terreiroId = null;

    try {
        const authId = session.user.id;
        
        // Tenta buscar pelo auth_id
        let { data: mediuns, error: erroMedium } = await supabaseClient
            .from('mediuns')
            .select('*')
            .eq('auth_id', authId)
            .limit(1);

        if (erroMedium) throw erroMedium;

        let medium = mediuns && mediuns.length > 0 ? mediuns[0] : null;

        // Se não achou por auth_id (caso de novo médium cujo auth_id ainda é null no banco)
        if (!medium) {
            let idNumerico = null;
            if (session.user.email) {
                const parte = session.user.email.split('@')[0];
                if (!isNaN(parte)) idNumerico = parseInt(parte);
            }
            if (!idNumerico) {
                const local = localStorage.getItem('medium_id');
                if (local && !isNaN(local)) idNumerico = parseInt(local);
            }

            if (idNumerico) {
                const { data: mPorId } = await supabaseClient
                    .from('mediuns')
                    .select('*')
                    .eq('id', idNumerico)
                    .limit(1);

                if (mPorId && mPorId.length > 0) {
                    medium = mPorId[0];
                    // Vincula o auth_id imediatamente para destravar o cadastro
                    await supabaseClient.from('mediuns').update({ auth_id: authId }).eq('id', medium.id);
                }
            }
        }

        if (!medium) {
            alert('Ficha de médium não encontrada para este usuário. Entre em contato com o dirigente.');
            await supabaseClient.auth.signOut();
            localStorage.clear();
            window.location.href = 'index.html';
            return;
        }

        // Se o cadastro já foi completado, não deve ficar aqui
        if (medium.cadastro_completo === true) {
            window.location.href = 'presenca.html';
            return;
        }

        mediumId = medium.id;
        terreiroId = medium.terreiro_id;

        // Pré-preenche os dados
        if (document.getElementById('cadNomeCompleto')) {
            document.getElementById('cadNomeCompleto').value = medium.nome_completo || '';
        }

        if (document.getElementById('cadNomeSocial') && medium.nome_social) {
            document.getElementById('cadNomeSocial').value = medium.nome_social;
        }

        if (document.getElementById('cadTelefone') && medium.telefone) {
            let telLimpo = medium.telefone.replace(/\D/g, '');
            if (telLimpo.startsWith('55') && telLimpo.length > 11) {
                telLimpo = telLimpo.substring(2);
            }
            document.getElementById('cadTelefone').value = telLimpo;
        }

        if (document.getElementById('cadNascimento') && medium.data_nascimento) {
            document.getElementById('cadNascimento').value = medium.data_nascimento;
        }

    } catch (err) {
        console.error('Erro ao resgatar perfil:', err);
        alert('Erro ao carregar dados cadastrais: ' + err.message);
    }

    // 2. Submissão do Formulário
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nomeSocial = document.getElementById('cadNomeSocial')?.value.trim() || null;
            const telefoneRaw = document.getElementById('cadTelefone')?.value || '';
            const dataNascimento = document.getElementById('cadNascimento')?.value || null;
            const novaSenha = document.getElementById('cadNovaSenha')?.value || '';
            const confirmaSenha = document.getElementById('cadConfirmaSenha')?.value || '';

            // Higienização: apenas números
            let telefoneLimpo = telefoneRaw.replace(/\D/g, '');

            if (telefoneLimpo.startsWith('55') && telefoneLimpo.length >= 12) {
                telefoneLimpo = telefoneLimpo.substring(2);
            }

            if (!telefoneLimpo || telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
                msg.textContent = 'Por favor, digite um telefone válido com DDD (ex: 21999999999).';
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
            btnSalvar.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Salvando cadastro...';
            msg.classList.add('hidden');

            try {
                // Atualiza a senha no Supabase Auth
                const { error: erroAuth } = await supabaseClient.auth.updateUser({
                    password: novaSenha
                });

                if (erroAuth) throw erroAuth;

                // Atualiza a ficha do médium
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
                        throw new Error("Este número de WhatsApp já está cadastrado em outra conta.");
                    }
                    throw erroUpdate;
                }

                msg.textContent = '✅ Cadastro concluído com sucesso!';
                msg.className = 'text-xs md:text-sm font-bold text-center text-green-600 block mt-2';
                msg.classList.remove('hidden');

                setTimeout(() => {
                    window.location.href = 'presenca.html';
                }, 1500);

            } catch (error) {
                console.error('Erro ao concluir cadastro:', error);
                msg.textContent = 'Erro: ' + error.message;
                msg.className = 'text-xs md:text-sm font-bold text-center text-red-600 block mt-2';
                msg.classList.remove('hidden');
                btnSalvar.disabled = false;
                btnSalvar.innerHTML = 'Concluir Cadastro e Entrar';
            }
        });
    }
});
