let idTerreiroGlobal = null; 
let mediunsGrauCache = []; 

document.addEventListener('DOMContentLoaded', async () => {
    // Data Cabeçalho
    const dataOpcoes = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('dataHoje').textContent = new Date().toLocaleDateString('pt-BR', dataOpcoes);

    // Verifica Sessão
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return window.location.href = 'index.html';

    try {
        // Busca Admin
        const { data: perfil, error: erroPerfil } = await supabaseClient
            .from('mediuns')
            .select('nome_completo, is_admin, terreiro_id')
            .eq('auth_id', session.user.id)
            .single();

        if (erroPerfil) throw erroPerfil;

        if (!perfil.is_admin) {
            alert('Acesso negado. Esta área é restrita para administradores.');
            return window.location.href = 'presenca.html';
        }

        document.getElementById('nomeAdmin').textContent = 'Olá, ' + perfil.nome_completo.split(' ')[0];
        idTerreiroGlobal = perfil.terreiro_id;

        // Busca e Aplica Configurações da Casa (Nome, Logo, Cores)
        if (idTerreiroGlobal) {
            const { data: terreiro } = await supabaseClient
                .from('terreiros')
                .select('nome, logo_url, cor_primaria, cor_secundaria, cor_fundo, cor_texto')
                .eq('id', idTerreiroGlobal)
                .single();
            
            if (terreiro) {
                document.getElementById('nomeTerreiroSidebar').textContent = terreiro.nome;
                
                // Aplica Cores Dinâmicas
                const root = document.documentElement;
                if(terreiro.cor_primaria) root.style.setProperty('--cor-primaria', terreiro.cor_primaria);
                if(terreiro.cor_secundaria) root.style.setProperty('--cor-secundaria', terreiro.cor_secundaria);
                if(terreiro.cor_fundo) root.style.setProperty('--cor-fundo', terreiro.cor_fundo);
                if(terreiro.cor_texto) root.style.setProperty('--cor-texto', terreiro.cor_texto);

                // Aplica Logo (se existir)
                if(terreiro.logo_url) {
                    const img = document.getElementById('logoSidebar');
                    img.src = terreiro.logo_url;
                    img.classList.remove('hidden');
                }
            }
        }

        // --- NAVEGAÇÃO DE ABAS ---
        const menus = document.querySelectorAll('.menu-item');
        const secoes = document.querySelectorAll('.secao-painel');

        menus.forEach(menu => {
            menu.addEventListener('click', (e) => {
                e.preventDefault();
                menus.forEach(m => m.classList.replace('bg-white/20', 'hover:bg-white/10'));
                menu.classList.replace('hover:bg-white/10', 'bg-white/20');
                
                secoes.forEach(s => s.classList.add('hidden'));
                
                const titulo = document.getElementById('tituloSecao');
                
                if (menu.id === 'menuVisaoGeral') {
                    document.getElementById('secVisaoGeral').classList.remove('hidden');
                    titulo.textContent = 'Visão Geral';
                    carregarPainelInicial();
                } else if (menu.id === 'menuQuadroMediuns') {
                    document.getElementById('secQuadroMediuns').classList.remove('hidden');
                    titulo.textContent = 'Quadro de Médiuns';
                    carregarQuadroMediuns();
                } else if (menu.id === 'menuAgendaGiras') {
                    document.getElementById('secAgendaGiras').classList.remove('hidden');
                    titulo.textContent = 'Agenda de Eventos';
                    carregarAgenda();
                } else if (menu.id === 'menuGrau') {
                    document.getElementById('secGrau').classList.remove('hidden');
                    titulo.textContent = 'Alteração de Grau';
                    carregarTabelaGraus();
                } else if (menu.id === 'menuFinanceiro') {
                    document.getElementById('secFinanceiro').classList.remove('hidden');
                    titulo.textContent = 'Controle Financeiro';
                    carregarFinanceiro();
                } else if (menu.id === 'menuDoacoes') {
                    document.getElementById('secDoacoes').classList.remove('hidden');
                    titulo.textContent = 'Doações e Campanhas';
                    carregarDoacoes();
                } else if (menu.id === 'menuAdmin') {
                    document.getElementById('secAdministracao').classList.remove('hidden');
                    titulo.textContent = 'Administração do Terreiro';
                    carregarConfiguracoesCasa();
                }
            });
        });

        carregarPainelInicial();

    } catch (error) {
        console.error('Erro geral:', error);
    }

    // ==========================================
    // FUNÇÕES DE CADA ABA
    // ==========================================

    async function carregarPainelInicial() {
        const { count: totalMediuns } = await supabaseClient.from('mediuns').select('*', { count: 'exact', head: true });
        document.getElementById('totalMediuns').textContent = totalMediuns || '0';

        const agora = new Date().toISOString();
        const { data: agendaData } = await supabaseClient.from('agenda').select('*').gte('data_hora_fim', agora).order('data_hora_inicio').limit(1);

        let giraAtualId = null;
        if (agendaData && agendaData.length > 0) {
            giraAtualId = agendaData[0].id;
            const dataGira = new Date(agendaData[0].data_hora_inicio).toLocaleString('pt-BR');
            document.getElementById('proximaGira').innerHTML = `${agendaData[0].titulo} <br><span class="text-sm font-normal text-gray-500">${dataGira}</span>`;
        } else {
            document.getElementById('proximaGira').textContent = 'Nenhum evento agendado';
        }

        const tabelaPresencas = document.getElementById('tabelaPresencas');
        if (giraAtualId) {
            const { data: presencas } = await supabaseClient.from('presencas').select('data_hora_checkin, mediuns(nome_completo)').eq('evento_id', giraAtualId).order('data_hora_checkin', { ascending: false });
            document.getElementById('totalPresentes').textContent = presencas ? presencas.length : '0';

            if (presencas && presencas.length > 0) {
                tabelaPresencas.innerHTML = ''; 
                presencas.forEach(p => {
                    const nome = p.mediuns?.nome_completo || 'Médium';
                    const hora = new Date(p.data_hora_checkin).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    tabelaPresencas.innerHTML += `<tr class="border-b border-gray-100 hover:bg-gray-50"><td class="p-3 text-gray-800 font-medium">${nome}</td><td class="p-3 text-gray-600">${hora}</td><td class="p-3"><span class="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">PRESENTE</span></td></tr>`;
                });
            } else {
                tabelaPresencas.innerHTML = `<tr><td colspan="3" class="p-6 text-center text-gray-500">Nenhum check-in ainda.</td></tr>`;
            }
        }
    }

    async function carregarQuadroMediuns() {
        const tbody = document.getElementById('tabelaTodosMediuns');
        const { data } = await supabaseClient.from('mediuns').select('nome_completo, grau, funcao, telefone, cadastro_completo').order('nome_completo');
        tbody.innerHTML = '';
        if(data) data.forEach(m => {
            const cargo = [m.grau, m.funcao].filter(Boolean).join(' / ') || '-';
            const status = m.cadastro_completo ? '<span class="text-green-600 font-bold">Ativo</span>' : '<span class="text-yellow-600 font-bold">Pendente</span>';
            tbody.innerHTML += `<tr class="border-b border-gray-100 hover:bg-gray-50 py-1"><td class="py-2 px-3 text-gray-800">${m.nome_completo}</td><td class="py-2 px-3 text-gray-600">${cargo}</td><td class="py-2 px-3 text-gray-600">${m.telefone || '-'}</td><td class="py-2 px-3">${status}</td></tr>`;
        });
    }

    async function carregarAgenda() {
        const tbody = document.getElementById('tabelaGirasCadastradas');
        const agora = new Date().toISOString();
        const { data } = await supabaseClient.from('agenda').select('*').gte('data_hora_fim', agora).order('data_hora_inicio').limit(10); 
        tbody.innerHTML = '';
        if(data) data.forEach(g => {
            const inicio = new Date(g.data_hora_inicio).toLocaleString('pt-BR');
            const img = g.imagem_url ? `<a href="${g.imagem_url}" target="_blank" class="text-blue-500 hover:underline text-xs"><i class="fas fa-image"></i> Ver</a>` : '-';
            tbody.innerHTML += `<tr class="border-b border-gray-100 hover:bg-gray-50"><td class="p-3 text-gray-800 font-medium">${g.titulo}</td><td class="p-3 text-gray-600">${inicio}</td><td class="p-3">${img}</td></tr>`;
        });
    }

    // --- MÓDULO DE GRAUS ---
    const opcoesGrau = ['-', 'I', 'IJ', 'B', 'BJ', 'T', 'TJ', 'SCT', 'Escola de CT', 'CT', 'SCCT', 'Escola de CCT', 'CCT'];
    const opcoesFuncao = ['-', 'MG', 'MGA', 'MC', 'MCA', 'MD', 'MDA', 'Cantina'];

    function renderizarOpcoes(lista, valorAtual) {
        return lista.map(op => `<option value="${op === '-' ? '' : op}" ${op === valorAtual ? 'selected' : ''}>${op}</option>`).join('');
    }

    async function carregarTabelaGraus() {
        const tbody = document.getElementById('tabelaGraus');
        tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center">Buscando...</td></tr>';
        
        const { data } = await supabaseClient.from('mediuns').select('id, nome_completo, grau, funcao').order('nome_completo');
        if (data) {
            mediunsGrauCache = data;
            renderizarGraus(data);
        }
    }

    function renderizarGraus(lista) {
        const tbody = document.getElementById('tabelaGraus');
        tbody.innerHTML = '';
        lista.forEach(m => {
            tbody.innerHTML += `
                <tr class="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td class="py-2 px-3 text-gray-800 font-medium">${m.nome_completo}</td>
                    <td class="py-2 px-3">
                        <select id="grau_${m.id}" class="border border-gray-300 rounded px-2 py-1 bg-white text-sm focus:ring-tema-primaria outline-none w-full max-w-[120px]">
                            ${renderizarOpcoes(opcoesGrau, m.grau || '-')}
                        </select>
                    </td>
                    <td class="py-2 px-3">
                        <select id="func_${m.id}" class="border border-gray-300 rounded px-2 py-1 bg-white text-sm focus:ring-tema-primaria outline-none w-full max-w-[120px]">
                            ${renderizarOpcoes(opcoesFuncao, m.funcao || '-')}
                        </select>
                    </td>
                    <td class="py-2 px-3 text-center">
                        <button onclick="salvarGrau(${m.id})" id="btnGrau_${m.id}" class="bg-tema-primaria hover:opacity-90 text-white px-3 py-1 rounded text-xs font-bold transition">Salvar</button>
                    </td>
                </tr>
            `;
        });
    }

    document.getElementById('buscaMediumGrau').addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase();
        const filtrado = mediunsGrauCache.filter(m => m.nome_completo.toLowerCase().includes(termo));
        renderizarGraus(filtrado);
    });

    window.salvarGrau = async (id) => {
        const btn = document.getElementById(`btnGrau_${id}`);
        const grau = document.getElementById(`grau_${id}`).value;
        const funcao = document.getElementById(`func_${id}`).value;
        
        btn.innerHTML = 'Salvando...';
        btn.disabled = true;

        const { error } = await supabaseClient.from('mediuns').update({ grau, funcao }).eq('id', id);
        
        btn.disabled = false;
        if (error) {
            btn.innerHTML = 'Erro!';
            btn.classList.replace('bg-tema-primaria', 'bg-red-500');
        } else {
            btn.innerHTML = 'Salvo <i class="fas fa-check"></i>';
            btn.classList.replace('bg-tema-primaria', 'bg-green-600');
            setTimeout(() => {
                btn.innerHTML = 'Salvar';
                btn.classList.replace('bg-green-600', 'bg-tema-primaria');
            }, 2000);
            
            const md = mediunsGrauCache.find(m => m.id === id);
            if(md) { md.grau = grau; md.funcao = funcao; }
        }
    };

    // --- MÓDULO FINANCEIRO ---
    async function carregarFinanceiro() {
        const anoSelect = document.getElementById('selectAnoFinanceiro');
        const ano = parseInt(anoSelect.value);
        const tbody = document.getElementById('tabelaFinanceiro');
        tbody.innerHTML = '<tr><td colspan="14" class="p-6 text-center text-gray-500">Buscando histórico...</td></tr>';
        
        const { data: mediuns, error: erroMed } = await supabaseClient.from('mediuns').select('id, nome_completo').order('nome_completo');
        if(erroMed) return;

        const { data: pgtos, error: erroPgto } = await supabaseClient.from('financeiro').select('*').eq('ano', ano);
        
        tbody.innerHTML = '';
        
        mediuns.forEach(m => {
            const meusPgtos = pgtos ? pgtos.filter(p => p.medium_id === m.id) : [];
            let htmlMeses = '';
            let emDia = true;
            
            const mesAtual = new Date().getMonth() + 1; 
            const anoAtual = new Date().getFullYear();

            for (let i = 1; i <= 12; i++) {
                const pago = meusPgtos.some(p => p.mes === i && p.pago);
                const passou = (ano < anoAtual) || (ano === anoAtual && i < mesAtual);
                if (passou && !pago) emDia = false;

                const checkStr = pago ? 'checked' : '';
                htmlMeses += `
                    <td class="py-1 px-1 border-b border-gray-100">
                        <input type="checkbox" ${checkStr} class="w-4 h-4 cursor-pointer accent-tema-secundaria" 
                        onchange="salvarPagamento(${m.id}, ${i}, ${ano}, this.checked)">
                    </td>
                `;
            }

            const statusHtml = emDia 
                ? '<span class="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">Em Dia</span>'
                : '<span class="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded">Pendente</span>';

            tbody.innerHTML += `
                <tr class="hover:bg-gray-50">
                    <td class="py-2 px-3 border-b border-gray-100 text-left font-medium text-gray-800 text-xs truncate max-w-[220px]" title="${m.nome_completo}">
                        ${m.nome_completo}
                    </td>
                    ${htmlMeses}
                    <td class="py-2 px-2 border-b border-gray-100 bg-gray-50">${statusHtml}</td>
                </tr>
            `;
        });
    }

    document.getElementById('selectAnoFinanceiro').addEventListener('change', carregarFinanceiro);

    window.salvarPagamento = async (mediumId, mes, ano, status) => {
        const { error } = await supabaseClient.from('financeiro').upsert({
            medium_id: mediumId,
            mes: mes,
            ano: ano,
            pago: status
        }, { onConflict: 'medium_id,mes,ano' });
        
        if(error) {
            alert('Erro no banco: ' + error.message);
            carregarFinanceiro(); 
        }
    };

    // --- MÓDULO ADMINISTRAÇÃO DA CASA ---
    async function carregarConfiguracoesCasa() {
        if (!idTerreiroGlobal) return;
        
        const { data } = await supabaseClient.from('terreiros')
            .select('logo_url, cor_primaria, cor_secundaria, cor_fundo, cor_texto')
            .eq('id', idTerreiroGlobal).single();
            
        if (data) {
            if(data.logo_url) {
                const img = document.getElementById('previewLogo');
                img.src = data.logo_url;
                img.classList.remove('hidden');
                document.getElementById('placeholderLogo').classList.add('hidden');
            }
            
            document.getElementById('corPrimaria').value = data.cor_primaria || '#1e3a8a';
            document.getElementById('corSecundaria').value = data.cor_secundaria || '#16a34a';
            document.getElementById('corFundo').value = data.cor_fundo || '#f3f4f6';
            document.getElementById('corTexto').value = data.cor_texto || '#1f2937';
        }
    }

    // Pré-visualização da Imagem ao selecionar o arquivo
    document.getElementById('uploadLogo').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                document.getElementById('previewLogo').src = evt.target.result;
                document.getElementById('previewLogo').classList.remove('hidden');
                document.getElementById('placeholderLogo').classList.add('hidden');
            }
            reader.readAsDataURL(file);
        }
    });

    // Salvar Logo Definitivamente no Supabase
    const btnLogo = document.getElementById('btnSalvarLogo');
    btnLogo.addEventListener('click', async () => {
        const input = document.getElementById('uploadLogo');
        const msg = document.getElementById('msgLogo');
        if(!input.files || input.files.length === 0) {
            alert('Selecione uma imagem primeiro clicando em "Escolher arquivo".');
            return;
        }
        
        btnLogo.disabled = true;
        btnLogo.textContent = 'Enviando...';
        msg.classList.remove('hidden');
        msg.textContent = 'Fazendo upload da imagem...';
        msg.className = 'text-xs font-bold mt-2 text-tema-primaria';
        
        try {
            const arquivo = input.files[0];
            const extensao = arquivo.name.split('.').pop();
            const nomeArquivo = `logo_${idTerreiroGlobal}_${Date.now()}.${extensao}`;
            
            const { error: errUp } = await supabaseClient.storage.from('logos').upload(nomeArquivo, arquivo);
            if (errUp) throw errUp;
            
            const { data: urlData } = supabaseClient.storage.from('logos').getPublicUrl(nomeArquivo);
            const novaUrl = urlData.publicUrl;
            
            const { error: errBd } = await supabaseClient.from('terreiros').update({ logo_url: novaUrl }).eq('id', idTerreiroGlobal);
            if (errBd) throw errBd;
            
            document.getElementById('logoSidebar').src = novaUrl;
            document.getElementById('logoSidebar').classList.remove('hidden');
            
            msg.textContent = '✅ Logo salva com sucesso no sistema!';
            msg.className = 'text-xs font-bold mt-2 text-tema-secundaria';
        } catch (error) {
            msg.textContent = '❌ Erro: ' + error.message;
            msg.className = 'text-xs font-bold mt-2 text-red-600';
        } finally {
            btnLogo.disabled = false;
            btnLogo.textContent = 'Salvar Imagem';
        }
    });

    // Salvar Cores
    const btnCores = document.getElementById('btnSalvarCores');
    btnCores.addEventListener('click', async () => {
        const cor1 = document.getElementById('corPrimaria').value;
        const cor2 = document.getElementById('corSecundaria').value;
        const corF = document.getElementById('corFundo').value;
        const corT = document.getElementById('corTexto').value;
        const msg = document.getElementById('msgCores');
        
        btnCores.disabled = true;
        btnCores.textContent = 'Salvando...';
        
        try {
            const { error } = await supabaseClient.from('terreiros').update({
                cor_primaria: cor1,
                cor_secundaria: cor2,
                cor_fundo: corF,
                cor_texto: corT
            }).eq('id', idTerreiroGlobal);
            
            if (error) throw error;
            
            const root = document.documentElement;
            root.style.setProperty('--cor-primaria', cor1);
            root.style.setProperty('--cor-secundaria', cor2);
            root.style.setProperty('--cor-fundo', corF);
            root.style.setProperty('--cor-texto', corT);
            
            msg.textContent = '✅ Tema atualizado!';
            msg.className = 'text-sm font-bold mt-3 text-tema-secundaria block';
            setTimeout(() => msg.classList.add('hidden'), 5000);
        } catch (error) {
            msg.textContent = '❌ Erro: ' + error.message;
            msg.className = 'text-sm font-bold mt-3 text-red-600 block';
        } finally {
            btnCores.disabled = false;
            btnCores.textContent = 'Salvar e Aplicar Cores';
        }
    });

    // GPS 
    const btnGps = document.getElementById('btnGravarLocalizacao');
    if (btnGps) {
        btnGps.addEventListener('click', async () => {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const lat = pos.coords.latitude, lon = pos.coords.longitude;
                    if(idTerreiroGlobal) {
                        await supabaseClient.from('terreiros').update({ latitude: lat, longitude: lon }).eq('id', idTerreiroGlobal);
                        alert('GPS Gravado com sucesso!');
                    }
                },
                (err) => alert('Erro no GPS: Libere a permissão.')
            );
        });
    }
});
