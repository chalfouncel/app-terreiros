document.addEventListener('DOMContentLoaded', async () => {
    const form = document.querySelector('form');
    const btnSalvar = document.querySelector('button[type="submit"]');
    const msgErro = document.getElementById('msgCadastro') || document.createElement('p');
    
    if (!document.getElementById('msgCadastro') && form) {
        msgErro.id = 'msgCadastro';
        form.insertBefore(msgErro, btnSalvar);
    }

    function exibirMensagem(texto, cor = 'red') {
        msgErro.textContent = texto;
        msgErro.className = `text-xs md:text-sm font-bold text-center text-${cor}-600 block my-3`;
        msgErro.classList.remove('hidden');
    }

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.replace('index.html');
        return;
    }

    // Busca dados para ver se já completou
    const { data: medium } = await supabaseClient.from('mediuns').select('*').eq('auth_id', session.user.id).maybeSingle();
    
    if (!medium) {
        exibirMensagem("A sincronizar dados... se a página travar, atualize.", "yellow");
        return;
    }

    if (medium.cadastro_completo) {
        window.location.replace('presenca.html');
        return;
    }

    // Carrega dados antigos nos inputs do ecrã, procurando pelas palavras nas etiquetas (blindado contra ausência de IDs)
    const todosInputs = Array.from(document.querySelectorAll('input'));
    todosInputs.forEach(inp => {
        const idHtml = (inp.id || '').toLowerCase();
        const placeholder = (inp.placeholder || '').toLowerCase();
        
        if ((idHtml.includes('nome') || placeholder.includes('nome')) && !idHtml.includes('social')) {
            if (!inp.value) inp.value = medium.nome_completo || '';
        }
        if (idHtml.includes('social') || placeholder.includes('social')) {
            if (!inp.value) inp.value = medium.nome_social || '';
        }
        if (inp.type === 'tel' || idHtml.includes('tel') || idHtml.includes('whats') || placeholder.includes('tel')) {
            if (!inp.value && medium.telefone) inp.value = medium.telefone;
        }
        if (inp.type === 'date' || idHtml.includes('nasc')) {
            if (!inp.value && medium.data_nascimento) inp.value = medium.data_nascimento;
        }
    });

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (btnSalvar) {
                btnSalvar.disabled = true;
                btnSalvar.innerHTML = 'Salvando e atualizando...';
            }
            msgErro.classList.add('hidden');

            try {
                let valNomeSocial = null, valTel = null, valNasc = null, valPalavra = null;
                let valGrau = null, valFuncao = null;

                // Captura os valores dinamicamente baseados nos tipos de input
                const inputsAtuais = Array.from(document.querySelectorAll('input'));
                inputsAtuais.forEach(inp => {
                    const idHtml = (inp.id || '').toLowerCase();
                    const placeholder = (inp.placeholder || '').toLowerCase();
                    
                    if (idHtml.includes('social') || placeholder.includes('social')) valNomeSocial = inp.value.trim();
                    if (inp.type === 'tel' || idHtml.includes('tel') || idHtml.includes('whats') || placeholder.includes('tel')) valTel = inp.value;
                    if (inp.type === 'date' || idHtml.includes('nasc')) valNasc = inp.value;
                    
                    // Pega o campo de senha (Pode ser type=password ou conter 'palavra' no ID)
                    if (inp.type === 'password' || idHtml.includes('palavra') || idHtml.includes('senha') || placeholder.includes('palavra')) {
                        valPalavra = inp.value.trim();
                    }
                });

                const selectsAtuais = Array.from(document.querySelectorAll('select'));
                selectsAtuais.forEach(sel => {
                    const idHtml = (sel.id || '').toLowerCase();
                    if (idHtml.includes('grau')) valGrau = sel.value;
                    if (idHtml.includes('func') || idHtml.includes('função')) valFuncao = sel.value;
                });

                let telefoneLimpo = (valTel || '').replace(/\D/g, '');
                if (telefoneLimpo.startsWith('55') && telefoneLimpo.length > 11) {
                    telefoneLimpo = telefoneLimpo.substring(2);
                }

                if (!telefoneLimpo || telefoneLimpo.length < 10) {
                    throw new Error("Digite o seu WhatsApp válido com DDD.");
                }
                if (!valPalavra || valPalavra.length < 6) {
                    throw new Error("A sua nova senha (Palavra) precisa ter pelo menos 6 números ou letras.");
                }

                // 1. Atualiza a nova senha de 6 digitos no Auth (que agora é o telemóvel e não o ID)
                const { error: errAuth } = await supabaseClient.auth.updateUser({
                    password: valPalavra
                });
                if (errAuth) throw errAuth;

                // 2. Salva os novos dados na tabela mediuns
                const { error: errBd } = await supabaseClient.from('mediuns').update({
                    nome_social: valNomeSocial,
                    telefone: telefoneLimpo,
                    data_nascimento: valNasc,
                    grau: valGrau || medium.grau,
                    funcao: valFuncao || medium.funcao,
                    cadastro_completo: true
                }).eq('id', medium.id);

                if (errBd) {
                    if (errBd.message.includes('unique constraint')) {
                        throw new Error("Este WhatsApp já está registado noutro utilizador.");
                    }
                    throw errBd;
                }

                exibirMensagem('✅ Ficha concluída! Acesso liberado.', 'green');

                setTimeout(() => {
                    window.location.replace('presenca.html');
                }, 1000);

            } catch (err) {
                console.error(err);
                exibirMensagem(err.message, 'red');
                if (btnSalvar) {
                    btnSalvar.disabled = false;
                    btnSalvar.innerHTML = 'Salvar e Continuar';
                }
            }
        });
    }
});
