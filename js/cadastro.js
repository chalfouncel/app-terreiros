document.addEventListener('DOMContentLoaded', async () => {
    const form = document.querySelector('form');
    const msg = document.getElementById('msgCadastro') || document.createElement('p');
    const btnSalvar = document.querySelector('button[type="submit"]');

    if (!document.getElementById('msgCadastro') && form) {
        msg.id = 'msgCadastro';
        form.insertBefore(msg, btnSalvar);
    }

    // 1. Verifica sessão
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        localStorage.clear();
        window.location.replace('index.html');
        return;
    }

    let mediumId = null;

    try {
        const authId = session.user.id;
        let telefoneLogado = null;

        // Recupera o telefone a partir do e-mail do Auth (ex: 21999999999@terreiro.app)[cite: 19, 20]
        if (session.user.email) {
            telefoneLogado = session.user.email.split('@')[0];
        }

        let medium = null;

        // Busca por auth_id
        const { data: mAuth } = await supabaseClient.from('mediuns').select('*').eq('auth_id', authId).maybeSingle();

        if (mAuth) {
            medium = mAuth;
        } else if (telefoneLogado) {
            // Busca por telefone
            const { data: mTel } = await supabaseClient.from('mediuns').select('*').eq('telefone', telefoneLogado).maybeSingle();
            if (mTel) {
                medium = mTel;
                await supabaseClient.from('mediuns').update({ auth_id: authId }).eq('id', medium.id);
            }
        }

        if (!medium) {
            msg.textContent = 'Aguardando ficha... recarregue a página.';
            msg.className = 'text-xs md:text-sm font-bold text-center text-yellow-600 block mt-2';
            msg.classList.remove('hidden');
            return;
        }

        if (medium.cadastro_completo) {
            window.location.replace('presenca.html');
            return;
        }

        mediumId = medium.id;
        localStorage.setItem('medium_id', medium.id);

        // Preenche campos do seu formulário legado
        if (document.getElementById('cadNomeCompleto')) document.getElementById('cadNomeCompleto').value = medium.nome_completo || '';
        if (document.getElementById('cadNomeSocial')) document.getElementById('cadNomeSocial').value = medium.nome_social || '';
        if (document.getElementById('cadNascimento')) document.getElementById('cadNascimento').value = medium.data_nascimento || '';
        
        const telCampo = document.getElementById('cadTelefone') || document.getElementById('telefone');
        if (telCampo) telCampo.value = medium.telefone || telefoneLogado || '';

    } catch (err) {
        console.error('Erro ao ler ficha:', err);
    }

    // 2. Concluir Cadastro
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!mediumId) return alert('Sessão expirada. Recarregue a página.');

            const nomeSocial = document.getElementById('cadNomeSocial')?.value.trim() || null;
            const dataNasc = document.getElementById('cadNascimento')?.value || null;
            
            // Procura o campo da nova senha (Pode se chamar Palavra ou NovaSenha)
            const inputSenha = document.getElementById('cadNovaSenha') || document.getElementById('palavra') || document.querySelector('input[type="password"]');
            const novaSenha = inputSenha ? inputSenha.value.trim() : '';

            // Procura o select do Grau e Função
            const selGrau = document.getElementById('grau') || document.getElementById('editMediumGrau');
            const selFuncao = document.getElementById('funcao') || document.getElementById('editMediumFuncao');
            
            const valGrau = selGrau ? selGrau.value : null;
            const valFuncao = selFuncao ? selFuncao.value : null;

            if (!novaSenha || novaSenha.length < 6) {
                msg.textContent = 'Sua Palavra (senha) precisa ter pelo menos 6 caracteres.';
                msg.className = 'text-xs md:text-sm font-bold text-center text-red-600 block mt-2';
                msg.classList.remove('hidden');
                return;
            }

            if (btnSalvar) {
                btnSalvar.disabled = true;
                btnSalvar.innerHTML = 'Salvando e atualizando...';
            }
            msg.classList.add('hidden');

            try {
                // Atualiza a senha no Auth do Supabase
                const { error: erroAuth } = await supabaseClient.auth.updateUser({
                    password: novaSenha
                });
                if (erroAuth) throw erroAuth;

                // Prepara a atualização da tabela mediuns
                const updateData = {
                    nome_social: nomeSocial,
                    data_nascimento: dataNasc,
                    cadastro_completo: true
                };

                if (valGrau && valGrau !== '-') updateData.grau = valGrau;
                if (valFuncao && valFuncao !== '-') updateData.funcao = valFuncao;

                const { error: erroBd } = await supabaseClient.from('mediuns').update(updateData).eq('id', mediumId);
                if (erroBd) throw erroBd;

                msg.textContent = '✅ Acesso liberado!';
                msg.className = 'text-xs md:text-sm font-bold text-center text-green-600 block mt-2';
                msg.classList.remove('hidden');

                setTimeout(() => {
                    window.location.replace('presenca.html');
                }, 1000);

            } catch (error) {
                console.error(error);
                msg.textContent = 'Erro: ' + error.message;
                msg.className = 'text-xs md:text-sm font-bold text-center text-red-600 block mt-2';
                msg.classList.remove('hidden');
                if (btnSalvar) {
                    btnSalvar.disabled = false;
                    btnSalvar.innerHTML = 'Salvar e Continuar';
                }
            }
        });
    }
});
