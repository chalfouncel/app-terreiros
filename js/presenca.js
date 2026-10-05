document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verifica se o usuário está logado
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
        return;
    }

    const infoGira = document.getElementById('infoGira');
    const btnPresenca = document.getElementById('btnPresenca');
    const msgStatus = document.getElementById('msgStatus');

    let giraAtual = null;
    let terreiroData = null;

    // 2. Busca a gira de hoje e os dados do terreiro (GPS)
    try {
        const { data: terreiros } = await supabaseClient.from('terreiros').select('*').limit(1);
        if (terreiros && terreiros.length > 0) terreiroData = terreiros[0];

        // Busca a última gira cadastrada
        const { data: agenda, error } = await supabaseClient
            .from('agenda')
            .select('*')
            .order('data_hora_inicio', { ascending: false })
            .limit(1);

        if (agenda && agenda.length > 0) {
            giraAtual = agenda[0];
            infoGira.innerHTML = `Hoje: <span class="text-green-700 font-bold">${giraAtual.titulo}</span>`;
            
            // Se a gira tiver imagem cadastrada, exibe ela!
            if (giraAtual.imagem_url) {
                document.getElementById('imgGira').src = giraAtual.imagem_url;
                document.getElementById('containerImagemGira').classList.remove('hidden');
            }
            
            btnPresenca.classList.remove('hidden');
        } else {
            infoGira.textContent = 'Não há nenhuma gira cadastrada para hoje.';
        }
    } catch (error) {
        console.error(error);
        infoGira.textContent = 'Erro ao carregar os dados da gira.';
    }

    // 3. Ação de clicar no Botão Gigante
    btnPresenca.addEventListener('click', () => {
        btnPresenca.disabled = true;
        btnPresenca.innerHTML = 'Calculando GPS... 🛰️';
        msgStatus.classList.add('hidden');

        if (!navigator.geolocation) {
            mostrarErro('Seu navegador não suporta GPS.');
            return;
        }

        // Pede a localização do celular do usuário
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const latUsuario = position.coords.latitude;
                const lonUsuario = position.coords.longitude;
                
                // Pega as coordenadas cadastradas no banco (ou usa RJ como padrão)
                const latTerreiro = terreiroData?.latitude || -22.9068;
                const lonTerreiro = terreiroData?.longitude || -43.1729;
                const raioPermitido = giraAtual.raio_presenca_metros || 50000;

                const distancia = calcularDistancia(latUsuario, lonUsuario, latTerreiro, lonTerreiro);
                const dentroDoRaio = distancia <= raioPermitido;

                try {
                    // Grava a presença no banco de dados!
                    const { error } = await supabaseClient.from('presencas').insert([{
                        usuario_id: session.user.id,
                        evento_id: giraAtual.id,
                        distancia_metros: Math.round(distancia),
                        localizacao_valida: dentroDoRaio
                    }]);

                    if (error) throw error;

                    if (dentroDoRaio) {
                        mostrarSucesso(`Presença confirmada! Você está a ${Math.round(distancia)} metros do terreiro.`);
                    } else {
                        mostrarErro(`Você está muito longe! (${Math.round(distancia)}m). Aproxime-se do terreiro.`);
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

    function mostrarSucesso(msg) {
        btnPresenca.innerHTML = 'Presença Registrada! ✅';
        msgStatus.textContent = msg;
        msgStatus.className = 'mt-6 text-sm font-bold rounded p-4 bg-green-100 text-green-800 block';
    }

    function mostrarErro(msg) {
        btnPresenca.disabled = false;
        btnPresenca.innerHTML = 'Tentar Novamente';
        msgStatus.textContent = msg;
        msgStatus.className = 'mt-6 text-sm font-bold rounded p-4 bg-red-100 text-red-800 block';
    }

    // A Famosa Fórmula de Haversine (Mede distância exata do globo terrestre)
    function calcularDistancia(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Raio da Terra em metros
        const p1 = lat1 * Math.PI/180; 
        const p2 = lat2 * Math.PI/180;
        const dp = (lat2-lat1) * Math.PI/180;
        const dl = (lon2-lon1) * Math.PI/180;
        const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c; // Resultado em Metros
    }
});
