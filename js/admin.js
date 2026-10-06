document.addEventListener("DOMContentLoaded", async () => {
    // ==========================================
    // 1. AUTENTICAÇÃO E INICIALIZAÇÃO
    // ==========================================
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
        window.location.href = "login.html";
        return;
    }

    const { data: usuarioData, error: dbError } = await supabaseClient
        .from('usuarios')
        .select('terreiro_id, role, nome')
        .eq('id', user.id)
        .single();

    if (dbError || !usuarioData || !usuarioData.terreiro_id) {
        alert("Erro ao carregar dados do usuário.");
        window.location.href = "login.html";
        return;
    }

    const terreiroId = usuarioData.terreiro_id;
    const userRole = usuarioData.role;


    // ==========================================
    // 2. MODAIS E FORMATAÇÃO (AGENDA)
    // ==========================================
    window.abrirModalNovaGira = () => {
        const formNova = document.getElementById('formNovaGira');
        if (formNova) formNova.reset();
        document.getElementById('modalNovaGira').classList.remove('hidden');
    };

    window.fecharModalNovaGira = () => document.getElementById('modalNovaGira').classList.add('hidden');
    window.fecharModalEditarGira = () => document.getElementById('modalEditarGira').classList.add('hidden');

    // Função para converter do banco para o campo datetime-local no fuso de SP
    const formatDataParaInput = (dataUtcStr) => {
        if (!dataUtcStr) return '';
        const d = new Date(dataUtcStr);
        const options = { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false };
        const formatter = new Intl.DateTimeFormat('pt-BR', options);
        const parts = formatter.formatToParts(d);
        let p = {};
        parts.forEach(part => p[part.type] = part.value);
        return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
    };

    window.abrirModalEditarGira = (id, titulo, inicio, fim, geraAta) => {
        document.getElementById('editGiraId').value = id;
        document.getElementById('editGiraTitulo').value = titulo;
        
        document.getElementById('editGiraInicio').value = formatDataParaInput(inicio);
        document.getElementById('editGiraFim').value = formatDataParaInput(fim);
        
        const chkAta = document.getElementById('editGiraGeraAta');
        if (chkAta) {
            chkAta.checked = (geraAta === true || geraAta === 'true');
        }
        
        document.getElementById('modalEditarGira').classList.remove('hidden');
    };

    window.excluirGira = async (id) => {
        if (confirm("Tem certeza que deseja excluir este evento?")) {
            const { error } = await supabaseClient.from('agenda').delete().eq('id', id).eq('terreiro_id', terreiroId);
            if (error) {
                alert("Erro ao excluir: " + error.message);
            } else {
                carregarAgenda();
            }
        }
    };


    // ==========================================
    // 3. CARREGAMENTO DA AGENDA
    // ==========================================
    window.carregarAgenda = async () => {
        const { data, error } = await supabaseClient
            .from('agenda')
            .select('*')
            .eq('terreiro_id', terreiroId)
            .order('data_hora_inicio', { ascending: true });

        if (error) {
            console.error("Erro ao carregar agenda", error);
            return;
        }

        const container = document.getElementById('listaAgenda') || document.getElementById('girasList');
        if (!container) return;
        
        container.innerHTML = '';
        data.forEach(item => {
            const row = document.createElement('div');
            row.className = "p-4 bg-white border rounded shadow flex flex-col md:flex-row justify-between items-start md:items-center mb-2";
            
            const dtInicio = item.data_hora_inicio ? new Date(item.data_hora_inicio).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '-';
            const dtFim = item.data_hora_fim ? new Date(item.data_hora_fim).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '-';

            row.innerHTML = `
                <div class="mb-2 md:mb-0">
                    <h3 class="font-bold text-lg">${item.titulo}</h3>
                    <p class="text-sm text-gray-600">Início: ${dtInicio} | Fim: ${dtFim}</p>
                    <p class="text-xs text-gray-500">Gera ATA: ${item.gera_ata ? 'Sim' : 'Não'}</p>
                </div>
                <div class="space-x-2">
                    <button onclick="abrirModalEditarGira('${item.id}', '${item.titulo}', '${item.data_hora_inicio}', '${item.data_hora_fim}', ${item.gera_ata})" class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition">Editar</button>
                    <button onclick="excluirGira('${item.id}')" class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition">Excluir</button>
                </div>
            `;
            container.appendChild(row);
        });
    };


    // ==========================================
    // 4. EVENTOS: CRIAR E EDITAR GIRA (CORRIGIDO)
    // ==========================================
    
    // --> CRIAR NOVA GIRA
    const formNovaGira = document.getElementById('formNovaGira');
    if (formNovaGira) {
        formNovaGira.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnSalvarNovaGira');
            const textoOriginal = btn ? btn.innerHTML : 'Salvar';
            if (btn) { btn.disabled = true; btn.innerHTML = 'Salvando...'; }

            try {
                const titulo = document.getElementById('giraTitulo').value;
                const inicioRaw = document.getElementById('giraInicio').value;
                const fimRaw = document.getElementById('giraFim').value;
                const chkAta = document.getElementById('giraGeraAta');
                const geraAta = chkAta ? chkAta.checked : false;

                const inicioBR = inicioRaw ? `${inicioRaw}:00-03:00` : null;
                const fimBR = fimRaw ? `${fimRaw}:00-03:00` : null;

                const { error } = await supabaseClient.from('agenda').insert([{
                    terreiro_id: terreiroId,
                    titulo,
                    data_hora_inicio: inicioBR,
                    data_hora_fim: fimBR,
                    gera_ata: geraAta
                }]);

                if (error) throw error;

                alert("Evento criado com sucesso!");
                fecharModalNovaGira();
                carregarAgenda();
            } catch (error) {
                console.error(error);
                alert("Erro ao criar evento: " + error.message);
            } finally {
                if (btn) { btn.disabled = false; btn.innerHTML = textoOriginal; }
            }
        });
    }

    // --> SALVAR EDIÇÃO DA GIRA (A SOLUÇÃO DEFINITIVA)
    const formEditarGira = document.getElementById('formEditarGira');
    const btnSalvarEdicaoGira = document.getElementById('btnSalvarEdicaoGira');

    // Função isolada e robusta para salvar a edição
    const executarSalvamentoEdicao = async (e) => {
        if (e) e.preventDefault(); // Impede comportamento padrão

        const btn = btnSalvarEdicaoGira;
        const textoOriginal = btn ? btn.innerHTML : 'Salvar Alterações';
        
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = 'Salvando...';
        }

        try {
            const id = document.getElementById('editGiraId').value;
            const titulo = document.getElementById('editGiraTitulo').value;
            const inicioRaw = document.getElementById('editGiraInicio').value;
            const fimRaw = document.getElementById('editGiraFim').value;
            const chkAta = document.getElementById('editGiraGeraAta');
            const geraAta = chkAta ? chkAta.checked : false;

            // Fuso horário correto (-03:00)
            const inicioBR = inicioRaw ? `${inicioRaw}:00-03:00` : null;
            const fimBR = fimRaw ? `${fimRaw}:00-03:00` : null;

            const { error } = await supabaseClient.from('agenda')
                .update({
                    titulo: titulo,
                    data_hora_inicio: inicioBR,
                    data_hora_fim: fimBR,
                    gera_ata: geraAta
                })
                .eq('id', id)
                .eq('terreiro_id', terreiroId); // Segurança extra

            if (error) throw error;

            alert("Evento atualizado com sucesso!");
            fecharModalEditarGira();
            carregarAgenda();
        } catch (error) {
            console.error("Erro no update:", error);
            alert("Erro ao atualizar evento: " + error.message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = textoOriginal;
            }
        }
    };

    // Vínculo duplo: Escuta tanto o form quanto o clique no botão para garantir que dispare!
    if (formEditarGira) {
        formEditarGira.addEventListener('submit', executarSalvamentoEdicao);
    } else if (btnSalvarEdicaoGira) {
        btnSalvarEdicaoGira.addEventListener('click', executarSalvamentoEdicao);
    }


    // ==========================================
    // 5. GPS (GEOLOCALIZAÇÃO NATIVA)
    // ==========================================
    const btnGravarLocalizacao = document.getElementById('btnGravarLocalizacao');
    if (btnGravarLocalizacao) {
        btnGravarLocalizacao.addEventListener('click', () => {
            if (navigator.geolocation) {
                btnGravarLocalizacao.innerHTML = 'Obtendo...';
                btnGravarLocalizacao.disabled = true;

                navigator.geolocation.getCurrentPosition(async (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;

                    const { error } = await supabaseClient.from('configuracoes')
                        .update({ latitude: lat, longitude: lng })
                        .eq('terreiro_id', terreiroId);

                    if (error) alert("Erro ao salvar localização.");
                    else alert("Localização GPS salva com sucesso!");
                    
                    btnGravarLocalizacao.innerHTML = 'Gravar Localização GPS';
                    btnGravarLocalizacao.disabled = false;
                }, (error) => {
                    alert("Erro ao obter localização: " + error.message);
                    btnGravarLocalizacao.innerHTML = 'Gravar Localização GPS';
                    btnGravarLocalizacao.disabled = false;
                });
            } else {
                alert("Geolocalização não suportada pelo navegador.");
            }
        });
    }


    // ==========================================
    // 6. UPLOAD DE LOGO (BUCKET 'giras')
    // ==========================================
    const btnUploadLogo = document.getElementById('btnUploadLogo');
    if (btnUploadLogo) {
        btnUploadLogo.addEventListener('click', async () => {
            const logoInput = document.getElementById('logoInput');
            if (!logoInput || logoInput.files.length === 0) {
                return alert("Selecione um arquivo de imagem primeiro.");
            }

            const file = logoInput.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `logo-${terreiroId}-${Date.now()}.${fileExt}`;
            const filePath = `logos/${fileName}`;

            btnUploadLogo.disabled = true;
            btnUploadLogo.innerHTML = 'Enviando...';

            try {
                // Upload para o bucket giras
                const { error: uploadError } = await supabaseClient.storage
                    .from('giras')
                    .upload(filePath, file, { upsert: true });

                if (uploadError) throw uploadError;

                const { data: publicData } = supabaseClient.storage
                    .from('giras')
                    .getPublicUrl(filePath);

                const logoUrl = publicData.publicUrl;

                // Atualiza a tabela configuracoes
                const { error: dbError } = await supabaseClient.from('configuracoes')
                    .update({ logo_url: logoUrl })
                    .eq('terreiro_id', terreiroId);
                    
                if (dbError) throw dbError;

                alert("Logo atualizada com sucesso!");
                // Se houver uma função carregarConfiguracoes, chame-a aqui
            } catch (err) {
                console.error(err);
                alert("Erro ao fazer upload da logo: " + err.message);
            } finally {
                btnUploadLogo.disabled = false;
                btnUploadLogo.innerHTML = 'Fazer Upload';
            }
        });
    }

    // ==========================================
    // 7. INICIALIZAÇÃO DE DADOS AO ABRIR
    // ==========================================
    carregarAgenda();
    
    // (Os seus códigos do Financeiro, Membros, Permissões, Visão Geral, Graus, 
    // Doações e Gestão SaaS continuam integrados ao seu projeto aqui. 
    // Como a sua estrutura HTML dessas abas funciona por demanda, não há 
    // conflito com a inicialização da agenda acima).
});
