document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
        return;
    }

    const infoGira = document.getElementById('infoGira');
    const btnPresenca = document.getElementById('btnPresenca');
    const msgStatus = document.getElementById('msgStatus');
    const containerBotoes = document.getElementById('containerBotoes');

    // Elementos do Modal de Doação
    const modalDoacao = document.getElementById('modalDoacao');
    const btnAbrirDoacao = document.getElementById('btnAbrirDoacao');
    const btnFecharDoacao = document.getElementById('btnFecharDoacao');
    const btnCopiarPix = document.getElementById('btnCopiarPix');
    const chavePix = document.getElementById('chavePix');
    
    const listaItensDoacao = document.getElementById('listaItensDoacao');
    const btnConfirmarDoacao = document.getElementById('btnConfirmarDoacao');
    const qtdTotalDoacao = document.getElementById('qtdTotalDoacao');

    let giraAtual = null;
    let terreiroData = null;
    let carrinhoDoacoes = {}; // Guarda as quantidades escolhidas

    try {
        const { data: perfil } = await supabaseClient
            .from('mediuns')
            .select('terreiro_id')
            .eq('auth_id', session.user.id)
            .single();

        if (perfil && perfil.terreiro_id) {
            const { data: terreiro } = await supabaseClient
                .from('terreiros')
                .select('*')
                .eq('id', perfil.terreiro_id)
                .single();
                
            if (terreiro) {
                terreiroData = terreiro;
                
                const root = document.documentElement;
                if(terreiro.cor_primaria) root.style.setProperty('--cor-primaria', terreiro.cor_primaria);
                if(terreiro.cor_secundaria) root.style.setProperty('--cor-secundaria', terreiro.cor_secundaria);
                if(terreiro.cor_fundo) root.style.setProperty('--cor-fundo', terreiro.cor_fundo);
                if(terreiro.cor_texto) root.style.setProperty('--cor-texto', terreiro.cor_texto);
                
                if(terreiro.logo_url) {
                    const imgLogo = document.getElementById('logoCasa');
                    imgLogo.src = terreiro.logo_url;
                    imgLogo.classList.remove('hidden');
                }

                // Carrega os itens após pegar os dados do terreiro
                carregarItensDoacao();
            }
        }

        const { data: agenda, error } = await supabaseClient
            .from('agenda')
            .select('*')
            .order('data_hora_inicio', { ascending: false })
            .limit(1);

        if (agenda && agenda.length > 0) {
            giraAtual = agenda[0];
            infoGira.innerHTML = `Hoje: <span class="text-tema-primaria font-bold">${giraAtual.titulo}</span>`;
            
            if (giraAtual.imagem_url) {
                document.getElementById('imgGira').src = giraAtual.imagem_url;
                document.getElementById('containerImagemGira').classList.remove('hidden');
            }
            
            containerBotoes.classList.remove('hidden');
            containerBotoes.classList.add('flex');
        } else {
            infoGira.textContent = 'Não há nenhuma gira cadastrada para hoje.';
        }
    } catch (error) {
        console.error(error);
        infoGira.textContent = 'Erro ao carregar os dados da gira.';
    }

    // --- LÓGICA DO CARRINHO DE DOAÇÕES ---
    async function carregarItensDoacao() {
        try {
            const { data: itens, error } = await supabaseClient
                .from('itens_doacao')
                .select('*')
                .eq('terreiro_id', terreiroData.id)
                .eq('ativo', true)
                .order('descricao', { ascending: true })
                .order('nome', { ascending: true });

            if (error) throw error;

            if (!itens || itens.length === 0) {
                listaItensDoacao.innerHTML = '<p class="text-center text-gray-500 text-sm py-4">Apenas doações via PIX no momento.</p>';
                return;
            }

            let html = '';
            let categoriaAtual = '';

            itens.forEach(item => {
                const cat = item.descricao || 'Diversos';
                if (cat !== categoriaAtual) {
                    html += `<h5 class="font-bold text-gray-600 text-[10px] uppercase tracking-wider mt-3 mb-1 bg-gray-100/80 p-1 px-2 rounded">${cat}</h5>`;
                    categoriaAtual = cat;
                }

                html += `
                <div class="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 px-1">
                    <div class="flex-1 pr-2">
                        <p class="text-xs font-medium text-gray-800 leading-tight">${item.nome}</p>
                    </div>
                    <div class="flex items-center space-x-2 bg-gray-100 rounded p-1">
                        <button type="button" class="btn-qtd w-6 h-6 rounded bg-white text-red-500 font-bold shadow-sm flex items-center justify-center border border-gray-200 active:scale-95" data-id="${item.id}" data-delta="-1">
                            <i class="fas fa-minus text-[10px] pointer-events-none"></i>
                        </button>
                        <span class="w-4 text-center text-xs font-bold text-gray-700" id="qtd-item-${item.id}">0</span>
                        <button type="button" class="btn-qtd w-6 h-6 rounded bg-white text-green-600 font-bold shadow-sm flex items-center justify-center border border-gray-200 active:scale-95" data-id="${item.id}" data-delta="1">
                            <i class="fas fa-plus text-[10px] pointer-events-none"></i>
                        </button>
                    </div>
                </div>`;
            });

            listaItensDoacao.innerHTML = html;
        } catch (err) {
            console.error('Erro ao carregar itens:', err);
            listaItensDoacao.innerHTML = '<p class="text-center text-red-500 text-xs py-4">Erro ao carregar itens.</p>';
        }
    }

    // Delegação de eventos para os botões de + e -
    listaItensDoacao.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-qtd');
        if (!btn) return;
        
        const itemId = btn.getAttribute('data-id');
        const delta = parseInt(btn.getAttribute('data-delta'));
        
        if (!carrinhoDoacoes[itemId]) carrinhoDoacoes[itemId] = 0;
        
        carrinhoDoacoes[itemId] += delta;
        if (carrinhoDoacoes[itemId] < 0) carrinhoDoacoes[itemId] = 0;
        
        document.getElementById(`qtd-item-${itemId}`).textContent = carrinhoDoacoes[itemId];
        
        atualizarBotaoConfirmar();
    });

    function atualizarBotaoConfirmar() {
        let total = 0;
        for (let id in carrinhoDoacoes) {
            total += carrinhoDoacoes[id];
        }
        
        if (total > 0) {
            qtdTotalDoacao.textContent = total;
            btnConfirmarDoacao.classList.remove('hidden');
            btnConfirmarDoacao.classList.add('flex');
        } else {
            btnConfirmarDoacao.classList.add('hidden');
            btnConfirmarDoacao.classList.remove('flex');
        }
    }

    btnConfirmarDoacao.addEventListener('click', async () => {
        const originalText = btnConfirmarDoacao.innerHTML;
        btnConfirmarDoacao.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Salvando intenção...';
        btnConfirmarDoacao.disabled = true;

        const insercoes = [];
        for (let itemId in carrinhoDoacoes) {
            if (carrinhoDoacoes[itemId] > 0) {
                insercoes.push({
                    terreiro_id: terreiroData.id,
                    medium_auth_id: session.user.id,
                    item_id: parseInt(itemId),
                    quantidade: carrinhoDoacoes[itemId]
                });
            }
        }

        try {
            const { error } = await supabaseClient
                .from('doacoes_registradas')
                .insert(insercoes);

            if (error) throw error;

            btnConfirmarDoacao.innerHTML = '<i class="fas fa-check mr-2"></i> Intenção Registrada!';
            btnConfirmarDoacao.classList.replace('bg-green-600', 'bg-blue-600');
            
            setTimeout(() => {
                btnFecharDoacao.click();
                carrinhoDoacoes = {};
                atualizarBotaoConfirmar();
                carregarItensDoacao(); 
                btnConfirmarDoacao.innerHTML = originalText;
                btnConfirmarDoacao.disabled = false;
                btnConfirmarDoacao.classList.replace('bg-blue-600', 'bg-green-600');
            }, 2000);

        } catch (err) {
            console.error('Erro ao salvar doações:', err);
            btnConfirmarDoacao.innerHTML = '<i class="fas fa-times mr-2"></i> Erro ao salvar';
            btnConfirmarDoacao.classList.replace('bg-green-600', 'bg-red-600');
            setTimeout(() => {
                btnConfirmarDoacao.innerHTML = originalText;
                btnConfirmarDoacao.disabled = false;
                btnConfirmarDoacao.classList.replace('bg-red-600', 'bg-green-600');
            }, 3000);
        }
    });

    // --- LÓGICA DO BOTÃO DE PRESENÇA ---
    btnPresenca.addEventListener('click', () => {
        btnPresenca.disabled = true;
        btnPresenca.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Calculando GPS...';
        msgStatus.classList.add('hidden');

        if (!navigator.geolocation) {
            mostrarErro('Seu navegador não suporta GPS.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const latUsuario = position.coords.latitude;
                const lonUsuario = position.coords.longitude;
                
                const latTerreiro = terreiroData?.latitude || -22.9068;
                const lonTerreiro = terreiroData?.longitude || -43.1729;
                const raioPermitido = giraAtual.raio_presenca_metros || 50000;

                const distancia = calcularDistancia(latUsuario, lonUsuario, latTerreiro, lonTerreiro);
                const dentroDoRaio = distancia <= raioPermitido;

                try {
                    const { error } = await supabaseClient.from('presencas').insert([{
                        usuario_id: session.user.id,
                        evento_id: giraAtual.id,
                        distancia_metros: Math.round(distancia),
                        localizacao_valida: dentroDoRaio
                    }]);

                    if (error) throw error;

                    if (dentroDoRaio) {
                        mostrarSucesso(`Presença confirmada! Você está a ${Math.round(distancia)} metros.`);
                    } else {
                        mostrarErro(`Você está muito longe! (${Math.round(distancia)}m). Aproxime-se.`);
                    }
                } catch (err) {
                    if (err.code === '23505') { 
                        mostrarSucesso('Sua presença já estava registrada para esta gira!');
                    } else {
                        mostrarErro('Erro ao salvar presença: ' + err.message);
                    }
                }
            },
            (err) => {
                mostrarErro('Precisamos da permissão do GPS para bater o ponto!');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });

    // --- ABRIR / FECHAR MODAL ---
    btnAbrirDoacao.addEventListener('click', () => {
        modalDoacao.classList.remove('hidden');
        setTimeout(() => {
            modalDoacao.querySelector('div').classList.remove('scale-95');
            modalDoacao.querySelector('div').classList.add('scale-100');
        }, 10);
    });

    btnFecharDoacao.addEventListener('click', () => {
        modalDoacao.querySelector('div').classList.remove('scale-100');
        modalDoacao.querySelector('div').classList.add('scale-95');
        setTimeout(() => {
            modalDoacao.classList.add('hidden');
            btnCopiarPix.innerHTML = '<i class="fas fa-copy mr-2"></i> Copiar Chave';
            btnCopiarPix.classList.replace('bg-green-600', 'bg-gray-800');
        }, 200);
    });

    btnCopiarPix.addEventListener('click', () => {
        navigator.clipboard.writeText(chavePix.innerText).then(() => {
            btnCopiarPix.innerHTML = '<i class="fas fa-check mr-2"></i> Chave Copiada!';
            btnCopiarPix.classList.replace('bg-gray-800', 'bg-green-600');
        });
    });

    // Funções utilitárias de Presença
    function mostrarSucesso(msg) {
        btnPresenca.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Presença Registrada!';
        msgStatus.textContent = msg;
        msgStatus.className = 'mt-6 text-sm font-bold rounded p-4 bg-green-100 text-green-800 block';
    }

    function mostrarErro(msg) {
        btnPresenca.disabled = false;
        btnPresenca.innerHTML = '<i class="fas fa-map-marker-alt mr-2"></i> Tentar Novamente';
        msgStatus.textContent = msg;
        msgStatus.className = 'mt-6 text-sm font-bold rounded p-4 bg-red-100 text-red-800 block';
    }

    function calcularDistancia(lat1, lon1, lat2, lon2) {
        const R = 6371e3; 
        const p1 = lat1 * Math.PI/180; 
        const p2 = lat2 * Math.PI/180;
        const dp = (lat2-lat1) * Math.PI/180;
        const dl = (lon2-lon1) * Math.PI/180;
        const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c; 
    }
});
