document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verifica se o usuário está logado
    const { data: { session }, error: authError } = await supabaseClient.auth.getSession();
    
    if (!session || authError) {
        window.location.href = 'index.html'; // Redireciona pro login se não estiver
        return;
    }

    // 2. Lógica do botão de Sair (Logout)
    const btnSair = document.getElementById('btnSair');
    if (btnSair) {
        btnSair.addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            window.location.href = 'index.html';
        });
    }

    // 3. Lógica do GPS (Gravar Localização Sede)
    const btnGravarLocalizacao = document.getElementById('btnGravarLocalizacao');
    const msgLocalizacao = document.getElementById('msgLocalizacao');

    if (btnGravarLocalizacao) {
        btnGravarLocalizacao.addEventListener('click', async () => {
            
            // Coloca em estado de carregamento
            btnGravarLocalizacao.disabled = true;
            btnGravarLocalizacao.innerHTML = 'Obtendo GPS do Celular... 🛰️';
            msgLocalizacao.classList.add('hidden');
            
            if (!navigator.geolocation) {
                mostrarAvisoLocal('Seu dispositivo ou navegador não suporta captura de GPS.', 'erro');
                return;
            }

            // Pede as coordenadas com alta precisão
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    
                    try {
                        // Busca o ID do terreiro (vamos usar o primeiro que encontrar)
                        const { data: terreiros, error: errBusca } = await supabaseClient.from('terreiros').select('id').limit(1);
                        
                        if (errBusca) throw errBusca;

                        if (terreiros && terreiros.length > 0) {
                            const terreiroId = terreiros[0].id;
                            
                            // Salva as coordenadas no banco de dados do Supabase
                            const { error: errUpdate } = await supabaseClient
                                .from('terreiros')
                                .update({ latitude: lat, longitude: lon })
                                .eq('id', terreiroId);
                                
                            if (errUpdate) throw errUpdate;
                            
                            mostrarAvisoLocal(`✅ Sucesso! Coordenadas salvas no sistema.<br><span class="text-xs font-normal">Lat: ${lat.toFixed(6)} | Lon: ${lon.toFixed(6)}</span>`, 'sucesso');
                        } else {
                            mostrarAvisoLocal('Nenhum terreiro encontrado no banco de dados para atualizar.', 'erro');
                        }
                    } catch (error) {
                        console.error(error);
                        mostrarAvisoLocal('Erro no banco de dados: ' + error.message, 'erro');
                    }
                },
                (error) => {
                    // Tratamento detalhado de erros do GPS
                    let msgErro = 'Não foi possível obter sua localização.';
                    if (error.code === 1) msgErro = 'Você negou a permissão. Libere o GPS no seu navegador/celular e tente de novo.';
                    if (error.code === 2) msgErro = 'Sinal de GPS indisponível no momento.';
                    if (error.code === 3) msgErro = 'Tempo limite excedido ao tentar conectar com os satélites.';
                    
                    mostrarAvisoLocal(msgErro, 'erro');
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 } 
            );
        });
    }

    // Função auxiliar para exibir as mensagens coloridas
    function mostrarAvisoLocal(msg, tipo) {
        msgLocalizacao.innerHTML = msg;
        msgLocalizacao.classList.remove('hidden');
        
        if (tipo === 'sucesso') {
            msgLocalizacao.className = 'mt-4 text-sm font-bold p-4 rounded-lg bg-green-100 text-green-800 border-l-4 border-green-600 block';
        } else {
            msgLocalizacao.className = 'mt-4 text-sm font-bold p-4 rounded-lg bg-red-100 text-red-800 border-l-4 border-red-600 block';
        }
        
        // Volta o botão ao estado normal
        btnGravarLocalizacao.disabled = false;
        btnGravarLocalizacao.innerHTML = 'Atualizar Localização Novamente';
    }
});
