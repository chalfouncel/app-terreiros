document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('formCompletarCadastro');
    const msg = document.getElementById('msgCadastro');
    const btnSalvar = document.getElementById('btnSalvarCadastro');

    // 1. Pega sessão
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        localStorage.clear();
        window.location.replace('index.html');
        return;
    }

    let mediumId = null;

    try {
        const authId = session.user.id;
        let idNumerico = null;

        if (session.user.email) {
            const extrairId = session.user.email.split('@')[0].replace(/\D/g, '');
            if (extrairId) idNumerico = parseInt(extrairId);
        }
        if (!idNumerico) {
            const local = localStorage.getItem('medium_id');
            if (local) idNumerico = parseInt(local);
        }

        let medium = null;

        // Busca por auth_id
        const { data: mAuth } = await supabaseClient
            .from('mediuns')
            .select('*')
            .eq('auth_id', authId)
            .maybeSingle();

        if (mAuth) {
            medium = mAuth;
        } else if (idNumerico) {
            // Busca por ID numérico
            const { data: mId } = await supabaseClient
                .from('mediuns')
                .select('*')
                .eq('id', idNumerico)
                .maybeSingle();

            if (mId) {
                medium = mId;
                await supabaseClient.from('mediuns').update({ auth_id: authId }).eq('id', medium.id);
            }
        }

        if (!medium) {
            if (msg) {
                msg.textContent = 'Sincronizando dados... por favor recarregue a página se não carregar os campos.';
                msg.className = 'text-xs md:text-sm font-bold text-center text-yellow-600 block mt-2';
                msg.classList.remove('hidden');
            }
            return;
        }

        if (medium.cadastro_completo === true) {
            window.location.replace('presenca.html');
            return;
        }

        mediumId = medium.id;
        localStorage.setItem('medium_id', medium.id);

        if (document.getElementById('cadNomeCompleto')) {
            document.getElementById('cadNomeCompleto').value = medium.nome_completo || '';
        }
        if (document.getElementById('cadNomeSocial') && medium.nome_social) {
            document.getElementById('cadNomeSocial').value = medium.nome_social;
        }
        if (document.getElementById('cadTelefone') && medium.telefone) {
            let tel = medium.telefone.replace(/\D/g, '');
            if (tel.startsWith('55') && tel.length > 11) tel = tel.substring(2);
            document.getElementById('cadTelefone').value = tel;
        }
        if (document.getElementById('cadNascimento') && medium.data_nascimento) {
            document.getElementById('cadNascimento').value = medium.data_nascimento;
        }

    } catch (err) {
        console.error('Erro ao ler ficha:', err);
    }

    // 2. Concluir Cadastro
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!mediumId) {
                const local = localStorage.getItem('medium_id');
                if (local) mediumId = parseInt(local);
            }

            if (!mediumId) {
                alert('Sessão expirada. Recarregue a página.');
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
                msg.textContent = 'Digite um WhatsApp válido com DDD (ex: 21999999999).';
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
                        throw new Error("Este número de WhatsApp já está cadastrado.");
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
                console.error('Erro ao salvar:', error);
                msg.textContent = 'Erro: ' + error.message;
                msg.className = 'text-xs md:text-sm font-bold text-center text-red-600 block mt-2';
                msg.classList.remove('hidden');
                btnSalvar.disabled = false;
                btnSalvar.innerHTML = 'Concluir Cadastro e Entrar';
            }
        });
    }
});
