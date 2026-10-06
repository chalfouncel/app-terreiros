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

    let giraAtual = null;
    let terreiroData = null;

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
            
            // Exibe os botões (Presença + Doação)
            containerBotoes.classList.remove('hidden');
            containerBotoes.classList.add('flex');
        } else {
            infoGira.textContent = 'Não há nenhuma gira cadastrada para hoje.';
            // Mesmo sem gira, podemos exibir o botão de doação se quiser, mas por padrão deixamos oculto
        }
    } catch (error) {
        console.error(error);
        infoGira.textContent = 'Erro ao carregar os dados da gira.';
    }

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

    // --- LÓGICA DO MODAL DE DOAÇÃO ---
    btnAbrirDoacao.addEventListener('click', () => {
        modalDoacao.classList.remove('hidden');
        // Pequeno atraso para a animação de escala funcionar
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

    // Funções utilitárias
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
