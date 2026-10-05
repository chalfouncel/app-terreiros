document.addEventListener('DOMContentLoaded', async () => {
    // Configura data inicial
    const dataOpcoes = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('dataHoje').textContent = new Date().toLocaleDateString('pt-BR', dataOpcoes);

    // Seleciona o ano atual no combo financeiro se possível
    const selectAno = document.getElementById('selectAnoFinanceiro');
    if (selectAno) selectAno.value = new Date().getFullYear().toString();

    // 1. Verifica sessão
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) { window.location.href = 'index.html'; return; }

    try {
        // 2. Busca perfil Admin
        const { data: perfil, error: erroPerfil } = await supabaseClient
            .from('mediuns')
            .select('nome_completo, is_admin, terreiro_id')
            .eq('auth_id', session.user.id)
            .single();

        if (erroPerfil) throw erroPerfil;
        if (!perfil.is_admin) {
            alert('Acesso negado.');
            window.location.href = 'presenca.html';
            return;
        }

        document.getElementById('nomeAdmin').textContent = 'Olá, ' + perfil.nome_completo.split(' ')[0];

        // 3. Controle de Navegação das Abas
        const menus = document.querySelectorAll('.menu-item');
        const secoes = document.querySelectorAll('.secao-painel');
        const tituloSecao = document.getElementById('tituloSecao');

        menus.forEach(menu => {
            menu.addEventListener('click', (e) => {
                e.preventDefault();
                menus.forEach(m => m.classList.remove('bg-blue-800'));
                menu.classList.add('bg-blue-800');
                
                secoes.forEach(s => s.classList.add('hidden'));
                
                const menuId = menu.id;
                if (menuId === 'menuVisaoGeral') {
                    tituloSecao.textContent = "Visão Geral";
                    document.getElementById('secVisaoGeral').classList.remove('hidden');
                } else if (menuId === 'menuQuadroMediuns') {
                    tituloSecao.textContent = "Quadro de Médiuns";
                    document.getElementById('secQuadroMediuns').classList.remove('hidden');
                    carregarQuadroMediuns();
                } else if (menuId === 'menuAgendaGiras') {
                    tituloSecao.textContent = "Agenda de Eventos";
                    document.getElementById('secAgendaGiras').classList.remove('hidden');
                    carregarAgenda();
                } else if (menuId === 'menuGrau') {
                    tituloSecao.textContent = "Alteração de Grau e Função";
                    document.getElementById('secGrau').classList.remove('hidden');
                    carregarAlteracaoGrau();
                } else if (menuId === 'menuFinanceiro') {
                    tituloSecao.textContent = "Controle Financeiro";
                    document.getElementById('secFinanceiro').classList.remove('hidden');
                    carregarFinanceiro();
                }
            });
        });

        // Carrega dados iniciais Dashboard
        carregarDashboard();

    } catch (error) {
        console.error('Erro de inicialização:', error);
    }

    // ==========================================
    // MÓDULO: DASHBOARD E GPS
    // ==========================================
    async function carregarDashboard() {
        const { count: total } = await supabaseClient.from('mediuns').select('*', { count: 'exact', head: true });
        document.getElementById('totalMediuns').textContent = total || '0';

        const { data: agenda } = await supabaseClient.from('agenda').select('*').gte('data_hora_fim', new Date().toISOString()).order('data_hora_inicio', { ascending: true }).limit(1);
        
        if (agenda && agenda.length > 0) {
            document.getElementById('proximaGira').innerHTML = `${agenda[0].titulo} <br><span class="text-sm font-normal text-gray-500">${new Date(agenda[0].data_hora_inicio).toLocaleDateString('pt-BR')}</span>`;
            
            const { data: presencas } = await supabaseClient.from('presencas').select(`data_hora_checkin, mediuns(nome_completo)`).eq('evento_id', agenda[0].id).order('data_hora_checkin', { ascending: false });
            document.getElementById('totalPresentes').textContent = presencas ? presencas.length : '0';
            
            const tb = document.getElementById('tabelaPresencas');
            tb.innerHTML = '';
            if(presencas && presencas.length > 0){
                presencas.forEach(p => {
                    tb.innerHTML += `<tr class="border-b"><td class="p-3">${p.mediuns?.nome_completo}</td><td class="p-3">${new Date(p.data_hora_checkin).toLocaleTimeString('pt-BR')}</td><td class="p-3 text-green-600 font-bold">PRESENTE</td></tr>`;
                });
            } else {
                tb.innerHTML = `<tr><td colspan="3" class="p-6 text-center text-gray-500">Ninguém presente ainda.</td></tr>`;
            }
        }
    }

    const btnGps = document.getElementById('btnGravarLocalizacao');
    if (btnGps) {
        btnGps.addEventListener('click', async () => {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const lat = pos.coords.latitude, lon = pos.coords.longitude;
                    const { data: t } = await supabaseClient.from('terreiros').select('id').limit(1);
                    if(t && t.length > 0) {
                        await supabaseClient.from('terreiros').update({ latitude: lat, longitude: lon }).eq('id', t[0].id);
                        alert('GPS Gravado!');
                    }
                },
                (err) => alert('Erro no GPS: Libere a permissão.')
            );
        });
    }

    document.getElementById('btnSair').addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.href = 'index.html';
    });

    // ==========================================
    // MÓDULO: QUADRO DE MÉDIUNS
    // ==========================================
    async function carregarQuadroMediuns() {
        const tbody = document.getElementById('tabelaTodosMediuns');
        tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center">Buscando...</td></tr>';
        
        const { data } = await supabaseClient.from('mediuns').select('nome_completo, grau, funcao, telefone, cadastro_completo').order('nome_completo');
        
        tbody.innerHTML = '';
        data.forEach(m => {
            const cargo = [m.grau, m.funcao].filter(Boolean).join(' / ') || '-';
            const st = m.cadastro_completo ? '<span class="text-green-600">Ativo</span>' : '<span class="text-yellow-600">Pendente</span>';
            tbody.innerHTML += `<tr class="border-b"><td class="p-3">${m.nome_completo}</td><td class="p-3">${cargo}</td><td class="p-3">${m.telefone||'-'}</td><td class="p-3">${st}</td></tr>`;
        });
    }

    // ==========================================
    // MÓDULO: AGENDA DE GIRAS (COM UPLOAD)
    // ==========================================
    async function carregarAgenda() {
        const tb = document.getElementById('tabelaGirasCadastradas');
        const { data } = await supabaseClient.from('agenda').select('*').gte('data_hora_fim', new Date().toISOString()).order('data_hora_inicio');
        tb.innerHTML = '';
        if(data) {
            data.forEach(g => {
                const img = g.imagem_url ? `<a href="${g.imagem_url}" target="_blank" class="text-blue-500">Ver Imagem</a>` : 'Sem foto';
                tb.innerHTML += `<tr class="border-b"><td class="p-3">${g.titulo}</td><td class="p-3">${new Date(g.data_hora_inicio).toLocaleString()}</td><td class="p-3">${img}</td></tr>`;
            });
        }
    }

    const formGira = document.getElementById('formNovaGira');
    if(formGira) {
        formGira.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnSalvarGira');
            btn.innerHTML = 'Processando...'; btn.disabled = true;
            
            try {
                let img_url = document.getElementById('giraImagem').value;
                const arq = document.getElementById('giraArquivo').files[0];
                
                if (arq) {
                    const nomeArq = Date.now() + '_' + arq.name;
                    await supabaseClient.storage.from('giras').upload(nomeArq, arq);
                    const { data: pub } = supabaseClient.storage.from('giras').getPublicUrl(nomeArq);
                    img_url = pub.publicUrl;
                }

                const { data: t } = await supabaseClient.from('terreiros').select('id').limit(1);
                await supabaseClient.from('agenda').insert([{
                    terreiro_id: t[0]?.id,
                    titulo: document.getElementById('giraTitulo').value,
                    imagem_url: img_url || null,
                    data_hora_inicio: document.getElementById('giraInicio').value,
                    data_hora_fim: document.getElementById('giraFim').value
                }]);
                
                alert('Evento Cadastrado!');
                formGira.reset();
                carregarAgenda();
            } catch (err) { alert('Erro: ' + err.message); }
            btn.innerHTML = 'Salvar Evento na Agenda'; btn.disabled = false;
        });
    }

    // ==========================================
    // MÓDULO: ALTERAÇÃO DE GRAU COM FILTRO E SELECT
    // ==========================================
    let listaMediunsGrau = [];
    const opcoesGraus = ['I', 'IJ', 'B', 'BJ', 'T', 'TJ', 'SCT', 'Escola de CT', 'CT', 'SCCT', 'Escola de CCT', 'CCT'];
    const opcoesFuncoes = ['MG', 'MGA', 'MC', 'MCA', 'MD', 'MDA', 'Cantina'];

    async function carregarAlteracaoGrau() {
        const tb = document.getElementById('tabelaGraus');
        tb.innerHTML = '<tr><td colspan="4" class="p-6 text-center">Buscando...</td></tr>';
        
        const { data } = await supabaseClient.from('mediuns').select('id, nome_completo, grau, funcao').order('nome_completo');
        listaMediunsGrau = data || [];
        renderizarTabelaGrau(listaMediunsGrau);
    }

    function renderizarTabelaGrau(lista) {
        const tb = document.getElementById('tabelaGraus');
        tb.innerHTML = '';
        
        if (lista.length === 0) {
            tb.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-gray-500">Nenhum médium encontrado.</td></tr>';
            return;
        }

        lista.forEach(m => {
            // Monta as opções do Grau
            let optGrau = '<option value="">-</option>';
            opcoesGraus.forEach(g => {
                const sel = (m.grau && m.grau.toUpperCase() === g.toUpperCase()) ? 'selected' : '';
                optGrau += `<option value="${g}" ${sel}>${g}</option>`;
            });

            // Monta as opções da Função
            let optFunc = '<option value="">-</option>';
            opcoesFuncoes.forEach(f => {
                const sel = (m.funcao && m.funcao.toUpperCase() === f.toUpperCase()) ? 'selected' : '';
                optFunc += `<option value="${f}" ${sel}>${f}</option>`;
            });

            tb.innerHTML += `
                <tr class="border-b hover:bg-gray-50">
                    <td class="py-1 px-3 font-medium text-gray-800">${m.nome_completo}</td>
                    <td class="py-1 px-3"><select id="grau_${m.id}" class="w-full border-gray-300 rounded px-2 py-1 text-sm bg-white cursor-pointer">${optGrau}</select></td>
                    <td class="py-1 px-3"><select id="func_${m.id}" class="w-full border-gray-300 rounded px-2 py-1 text-sm bg-white cursor-pointer">${optFunc}</select></td>
                    <td class="py-1 px-3 text-center">
                        <button onclick="salvarGrau(${m.id})" class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-xs font-bold transition shadow-sm">Salvar</button>
                    </td>
                </tr>
            `;
        });
    }

    const buscaGrauInput = document.getElementById('buscaMediumGrau');
    if (buscaGrauInput) {
        buscaGrauInput.addEventListener('input', (e) => {
            const termo = e.target.value.toLowerCase();
            const filtrados = listaMediunsGrau.filter(m => m.nome_completo.toLowerCase().includes(termo));
            renderizarTabelaGrau(filtrados);
        });
    }

    window.salvarGrau = async function(id) {
        const btn = event.target;
        btn.innerText = '...';
        
        // Pega os valores direto das caixas de seleção
        const novoGrau = document.getElementById(`grau_${id}`).value;
        const novaFuncao = document.getElementById(`func_${id}`).value;
        
        const { error } = await supabaseClient.from('mediuns').update({ grau: novoGrau, funcao: novaFuncao }).eq('id', id);
        
        if (error) {
            alert('Erro ao salvar!');
        } else {
            btn.innerText = 'Salvo!';
            btn.classList.replace('bg-yellow-500', 'bg-green-600');
            setTimeout(() => { btn.innerText = 'Salvar'; btn.classList.replace('bg-green-600', 'bg-yellow-500'); }, 2000);
            
            // Salva na lista da memória pra não perder a alteração se o usuário pesquisar outro nome
            const index = listaMediunsGrau.findIndex(m => m.id === id);
            if (index !== -1) {
                listaMediunsGrau[index].grau = novoGrau;
                listaMediunsGrau[index].funcao = novaFuncao;
            }
        }
    };

    // ==========================================
    // MÓDULO: FINANCEIRO
    // ==========================================
    const anoSelect = document.getElementById('selectAnoFinanceiro');
    if (anoSelect) anoSelect.addEventListener('change', carregarFinanceiro);

    async function carregarFinanceiro() {
        const ano = parseInt(document.getElementById('selectAnoFinanceiro').value);
        const tb = document.getElementById('tabelaFinanceiro');
        tb.innerHTML = '<tr><td colspan="13" class="p-6 text-center">Buscando histórico financeiro...</td></tr>';

        // 1. Busca todos os médiuns
        const { data: mediuns } = await supabaseClient.from('mediuns').select('id, nome_completo').order('nome_completo');
        
        // 2. Busca pagamentos do ano selecionado
        const { data: pagamentos } = await supabaseClient.from('financeiro').select('*').eq('ano', ano);
        
        tb.innerHTML = '';
        
        mediuns.forEach(m => {
            // Filtra pagamentos só desse médium
            const pgMedium = pagamentos ? pagamentos.filter(p => p.medium_id === m.id) : [];
            
            let celulasMeses = '';
            for(let mes = 1; mes <= 12; mes++) {
                // Verifica se este mês específico está pago
                const taPago = pgMedium.find(p => p.mes === mes)?.pago || false;
                const check = taPago ? 'checked' : '';
                
                celulasMeses += `
                    <td class="py-1 px-1 border-l border-gray-100">
                        <input type="checkbox" onchange="salvarPagamento(${m.id}, ${mes}, ${ano}, this.checked)" ${check} 
                        class="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500 cursor-pointer">
                    </td>
                `;
            }

            tb.innerHTML += `
                <tr class="border-b hover:bg-green-50 transition">
                    <td class="py-1 px-3 text-left font-medium text-gray-800 sticky left-0 bg-white shadow-[1px_0_0_0_#e5e7eb] whitespace-nowrap z-10">
                        ${m.nome_completo}
                    </td>
                    ${celulasMeses}
                </tr>
            `;
        });
    }

    // Função que é chamada ao clicar no checkbox do mês
    window.salvarPagamento = async function(medium_id, mes, ano, isPago) {
        const { error } = await supabaseClient
            .from('financeiro')
            .upsert(
                { medium_id: medium_id, mes: mes, ano: ano, pago: isPago },
                { onConflict: 'medium_id,mes,ano' }
            );

        if (error) {
            alert('Erro ao salvar pagamento: ' + error.message);
            // Desfaz o clique
            event.target.checked = !isPago;
        }
    };
});
    
