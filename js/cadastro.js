document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const idPrimeiroAcesso = localStorage.getItem('novo_acesso_id');
    
    if (!session && !idPrimeiroAcesso) {
        window.location.href = 'index.html'; 
        return;
    }

    const userId = session ? session.user.id : idPrimeiroAcesso;

    // 1. FUNÇÕES DE FORMATAÇÃO
    const formatarTitleCase = (texto) => {
        if (!texto) return '';
        const preposicoes = ['de', 'da', 'do', 'das', 'dos', 'e'];
        return texto.toLowerCase().split(' ').map((palavra, index) => {
            if (preposicoes.includes(palavra) && index !== 0) {
                return palavra;
            }
            return palavra.charAt(0).toUpperCase() + palavra.slice(1);
        }).join(' ');
    };

    // 2. APLICA A FORMATAÇÃO EM TEMPO REAL (Enquanto digita)
    const configFormatacaoTempoReal = () => {
        const camposTitleCase = ['nomeSocial', 'nomeCompleto'];
        camposTitleCase.forEach(id => {
            const campo = document.getElementById(id);
            if (campo) campo.addEventListener('input', (e) => {
                const start = e.target.selectionStart; 
                e.target.value = formatarTitleCase(e.target.value);
                e.target.setSelectionRange(start, start); 
            });
        });

        const camposUpperCase = ['palavra']; 
        camposUpperCase.forEach(id => {
            const campo = document.getElementById(id);
            if (campo) campo.addEventListener('input', (e) => {
                const start = e.target.selectionStart;
                e.target.value = e.target.value.toUpperCase();
                e.target.setSelectionRange(start, start);
            });
        });

        const campoData = document.getElementById('dataNascimento');
        if (campoData) {
            campoData.addEventListener('input', (e) => {
                let v = e.target.value.replace(/\D/g, ''); 
                if (v.length > 8) v = v.substring(0, 8); 
                
                if (v.length > 4) {
                    v = v.substring(0, 2) + '/' + v.substring(2, 4) + '/' + v.substring(4, 8);
                } else if (v.length > 2) {
                    v = v.substring(0, 2) + '/' + v.substring(2, 4);
                }
                
                e.target.value = v;
            });
        }
        
        const campoSenha = document.getElementById('novaSenha');
        if (campoSenha) {
            campoSenha.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '');
            });
        }
    };
    
    configFormatacaoTempoReal();

    // Mostra o campo de senha apenas no Primeiro Acesso
    if (!session && idPrimeiroAcesso) {
        const divSenha = document.getElementById('containerSenha');
        if (divSenha) divSenha.classList.remove('hidden');
    }

    // 3. PUXAR OS DADOS DO BANCO PARA PREENCHER A TELA
    if (session || idPrimeiroAcesso) {
        try {
            let perfil = null;
            
            if (session) {
                const { data, error } = await supabaseClient.from('mediuns').select('*').eq('auth_id', session.user.id).single();
                if (error) throw error;
                perfil = data;
            } else {
                const { data, error } = await supabaseClient.rpc('obter_dados_primeiro_acesso', { p_id: parseInt(idPrimeiroAcesso) });
                if (error) throw error;
                perfil = data;
            }
            
            if (perfil) {
                if (!session && perfil.auth_id) {
                    alert("Acesso Negado: Esta conta já foi ativada e protegida por senha! Por favor, faça login.");
                    localStorage.removeItem('novo_acesso_id');
                    window.location.href = 'index.html';
                    return;
                }

                const preencher = (id, valor) => {
                    const campo = document.getElementById(id);
                    if (campo && valor) campo.value = valor;
                };
                
                preencher('nomeCompleto', formatarTitleCase(perfil.nome_completo));
                preencher('nomeSocial', formatarTitleCase(perfil.nome_social));
                preencher('grau', perfil.grau || '');
                preencher('funcao', perfil.funcao || '');
                preencher('palavra', perfil.palavra ? perfil.palavra.toUpperCase() : '');
                
                if (perfil.data_nascimento) {
                    const partes = perfil.data_nascimento.split('-');
                    if (partes.length === 3) preencher('dataNascimento', `${partes[2]}/${partes[1]}/${partes[0]}`);
                    else preencher('dataNascimento', perfil.data_nascimento);
                }
                
                preencher('telefone', perfil.telefone);
            }
        } catch (err) {
            console.error("Erro ao buscar dados do perfil:", err);
        }
    }

    const formCadastro = document.getElementById('formCadastro');
    const msgErro = document.getElementById('msgErro');
    const btnSalvar = document.getElementById('btnSalvar');

    // 4. AÇÃO DE SALVAR
    formCadastro.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        btnSalvar.disabled = true;
        btnSalvar.textContent = 'Salvando...';
        msgErro.classList.add('hidden');

        const nomeCompleto = formatarTitleCase(document.getElementById('nomeCompleto').value);
        const nomeSocial = formatarTitleCase(document.getElementById('nomeSocial').value);
        const grau = document.getElementById('grau').value; 
        const funcao = document.getElementById('funcao').value; 
        const palavra = document.getElementById('palavra').value.toUpperCase(); 
        
        const dataBruta = document.getElementById('dataNascimento').value;
        let dataNascimento = dataBruta;
        if (dataBruta.includes('/')) {
            const partes = dataBruta.split('/');
            if (partes.length === 3) dataNascimento = `${partes[2]}-${partes[1]}-${partes[0]}`;
        }
        
        const telefone = document.getElementById('telefone').value;
        const campoSenha = document.getElementById('novaSenha');
        const novaSenha = campoSenha ? campoSenha.value : null;

        try {
            if (!session && (!novaSenha || novaSenha.length < 6)) {
                throw new Error("Por favor, crie uma Nova Senha com pelo menos 6 caracteres.");
            }

            let novoAuthId = null;

            // PASSO 1: CRIAR O ACESSO NO COFRE PRIMEIRO (Se for primeiro acesso)
            if (!session && novaSenha) {
                const telefoneFormatado = telefone.replace(/\D/g, '');
                const emailFantasma = `${telefoneFormatado}@terreiro.app`;
                
                const { data: authData, error: errorAuth } = await supabaseClient.auth.signUp({
                    email: emailFantasma,
                    password: novaSenha,
                });
                
                if (errorAuth) throw new Error("Erro ao registrar acesso: " + errorAuth.message);
                
                // Pega o ID que o cofre acabou de gerar!
                if (authData && authData.user) {
                    novoAuthId = authData.user.id;

                    // >>> SOLUÇÃO AQUI: VINCULAR A CONTA ANTES DE SALVAR OS DADOS <<<
                    const { error: errVincular } = await supabaseClient.rpc('vincular_conta_medium', {
                        p_id: parseInt(idPrimeiroAcesso),
                        p_auth_id: novoAuthId
                    });

                    if (errVincular) throw new Error("Erro de conexão no banco: " + errVincular.message);
                }
            }

            // PASSO 2: MONTAR A FICHA DE DADOS
            const dadosParaSalvar = { 
                nome_completo: nomeCompleto,
                nome_social: nomeSocial,
                grau: grau,
                funcao: funcao,
                palavra: palavra,
                data_nascimento: dataNascimento,
                telefone: telefone,
                cadastro_completo: true
            };

            if (novoAuthId) {
                dadosParaSalvar.auth_id = novoAuthId;
            }

            // PASSO 4: SALVAR TUDO NA TABELA (Agora vai funcionar porque o RLS reconhece o dono!)
            let updateQuery = supabaseClient.from('mediuns').update(dadosParaSalvar);
                
            if (session) {
                updateQuery = updateQuery.eq('auth_id', session.user.id);
            } else {
                updateQuery = updateQuery.eq('id', idPrimeiroAcesso);
            }
            
            const { error: errorUpdate } = await updateQuery;

            if (errorUpdate) throw new Error(errorUpdate.message);

            // Tudo certo! Limpa o acesso temporário e redireciona
            localStorage.removeItem('novo_acesso_id');
            window.location.href = 'presenca.html';

        } catch (error) {
            console.error(error);
            if (error.message.includes('unique constraint "mediuns_telefone_key"')) {
                msgErro.textContent = "Este número de WhatsApp já está cadastrado em outra ficha.";
            } else {
                msgErro.textContent = error.message;
            }
            msgErro.classList.remove('hidden');
            btnSalvar.disabled = false;
            btnSalvar.textContent = 'Salvar e Continuar';
        }
    });
});
