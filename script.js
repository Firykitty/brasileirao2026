const teams = [
    "Athletico PR", "Atlético MG", "Bahia", "Botafogo", "Chapecoense", 
    "Corinthians", "Coritiba", "Cruzeiro", "Flamengo", "Fluminense", 
    "Grêmio", "Internacional", "Mirassol", "Palmeiras", "RB Bragantino", 
    "Remo", "Santos", "São Paulo", "Vasco", "Vitória"
].sort();

let currentRound = 0; 
let matchesByRound = Array.from({ length: 40 }, () => []);
let highlightedTeam = null;
let jogosAdiados = []; // Array para armazenar jogos adiados
let rodadaComJogoAdiado = null; // Guarda a rodada que teve jogo adiado

// TIMES PERMITIDOS PARA CADA COMPETIÇÃO
const TIMES_LIBERTADORES = ["Flamengo", "Palmeiras", "Cruzeiro", "Mirassol", "Fluminense", "Botafogo", "Bahia", "Corinthians"];
const TIMES_SULAMERICANA = ["São Paulo", "Grêmio", "RB Bragantino", "Atlético MG", "Santos", "Vasco"];

window.onload = () => {
    // Inicialização dos jogos
    for(let i = 1; i <= 38; i++) {
        if(jsonOficial[i]) {
            matchesByRound[i] = jsonOficial[i].matches.map(m => ({
                a: m.a, 
                b: m.b, 
                ga: 0, 
                gb: 0, 
                saved: false,
                adiado: false // Nova propriedade para jogos adiados
            }));
        }
    }
    
    // Inicialização dos seletores de campeões de copas
    const sLib = document.getElementById("winnerLib");
    const sSula = document.getElementById("winnerSula");
    const sCDB = document.getElementById("winnerCDB");
    const optNone = `<option value="">---</option>`;
    
    // Libertadores: apenas times permitidos
    sLib.innerHTML = optNone; 
    sSula.innerHTML = optNone;
    sCDB.innerHTML = optNone;
    
    // Libertadores: apenas os times permitidos
    TIMES_LIBERTADORES.forEach(t => {
        const opt = `<option value="${t}">${t}</option>`;
        sLib.innerHTML += opt;
    });
    
    // Sul-Americana: apenas os times permitidos
    TIMES_SULAMERICANA.forEach(t => {
        const opt = `<option value="${t}">${t}</option>`;
        sSula.innerHTML += opt;
    });
    
    // Copa do Brasil: todos os times
    teams.forEach(t => {
        const opt = `<option value="${t}">${t}</option>`;
        sCDB.innerHTML += opt;
    });
    
    // Configurar listener para tecla Enter
    setTimeout(setupEnterKeyListener, 100);
    
    updateUI();
};

// ========== CONFIGURAR ENTER PARA CONFIRMAR ==========
function setupEnterKeyListener() {
    // Função para configurar listener para Enter nos inputs de gols
    function addEnterListenerToInputs() {
        const goalsA = document.getElementById('goalsA');
        const goalsB = document.getElementById('goalsB');
        
        if (goalsA) {
            goalsA.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    addMatch();
                }
            });
        }
        
        if (goalsB) {
            goalsB.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    addMatch();
                }
            });
        }
    }
    
    // Configurar quando os inputs são criados
    addEnterListenerToInputs();
    
    // Observar mudanças no DOM para quando o matchInput for atualizado
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length) {
                // Verificar se foram adicionados inputs de gols
                setTimeout(addEnterListenerToInputs, 50);
            }
        });
    });
    
    // Observar o elemento matchInput para mudanças
    const matchInput = document.getElementById('matchInput');
    if (matchInput) {
        observer.observe(matchInput, { childList: true, subtree: true });
    }
}

// ========== SISTEMA DE ADIAR JOGOS ==========
function abrirModalAdiarJogo() {
    const modal = document.getElementById("adiarModal");
    const jogosDisponiveis = document.getElementById("jogosDisponiveis");
    
    // Limpa a lista
    jogosDisponiveis.innerHTML = "";
    
    // Verifica se há jogos não simulados na rodada atual
    const jogosNaoSimulados = matchesByRound[currentRound].filter(m => !m.saved && !m.adiado);
    
    if (jogosNaoSimulados.length === 0) {
        jogosDisponiveis.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #94a3b8;">
                <i class="fas fa-check-circle" style="font-size: 2em; margin-bottom: 10px;"></i>
                <p>Todos os jogos desta rodada já foram simulados ou adiados.</p>
            </div>
        `;
        document.getElementById("btnAdiarJogo").disabled = true;
    } else {
        // Adiciona os jogos disponíveis para adiar
        jogosNaoSimulados.forEach((m, i) => {
            const div = document.createElement("div");
            div.className = "jogo-option";
            div.innerHTML = `
                <input type="radio" name="jogoSelecionado" value="${i}" id="jogo${i}">
                <label for="jogo${i}">
                    <img src="img/${m.a}.png" class="escudo-mini">
                    <span>${m.a}</span>
                    <span>vs</span>
                    <img src="img/${m.b}.png" class="escudo-mini">
                    <span>${m.b}</span>
                </label>
            `;
            jogosDisponiveis.appendChild(div);
        });
        document.getElementById("btnAdiarJogo").disabled = false;
    }
    
    // Atualiza contador de jogos adiados
    document.getElementById("contadorAdiados").innerText = jogosAdiados.length;
    
    // Atualiza status do botão de simular jogo adiado
    document.getElementById("btnSimularAdiado").disabled = jogosAdiados.length === 0;
    
    modal.style.display = "block";
}

function adiarJogoSelecionado() {
    const selecionado = document.querySelector('input[name="jogoSelecionado"]:checked');
    
    if (!selecionado) {
        alert("Selecione um jogo para adiar!");
        return;
    }
    
    const index = parseInt(selecionado.value);
    const jogo = matchesByRound[currentRound][index];
    
    // Marca o jogo como adiado
    jogo.adiado = true;
    jogo.saved = false;
    
    // Adiciona à lista de jogos adiados
    jogosAdiados.push({
        rodadaOriginal: currentRound,
        timeA: jogo.a,
        timeB: jogo.b,
        ga: 0,
        gb: 0,
        simulado: false
    });
    
    // Guarda a rodada que teve jogo adiado
    rodadaComJogoAdiado = currentRound;
    
    alert(`Jogo ${jogo.a} x ${jogo.b} adiado com sucesso!`);
    fecharModalAdiar();
    updateUI();
}

function simularJogoAdiado() {
    if (jogosAdiados.length === 0) {
        alert("Não há jogos adiados para simular!");
        return;
    }
    
    // Abre modal para simular o jogo adiado
    const modal = document.getElementById("simularAdiadoModal");
    const jogo = jogosAdiados[0]; // Pega o primeiro jogo adiado
    
    document.getElementById("jogoAdiadoInfo").innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <h3>Simular Jogo Adiado</h3>
            <p style="color: #94a3b8;">Rodada ${jogo.rodadaOriginal} - Jogo Adiado</p>
        </div>
        <div style="display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 30px;">
            <div style="text-align: center;">
                <img src="img/${jogo.timeA}.png" style="width: 60px; height: 60px;">
                <div style="margin-top: 5px; font-weight: bold;">${jogo.timeA}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <input type="number" id="golsTimeAAdiado" value="0" min="0" class="score-input" style="width: 70px;">
                <span style="font-weight: bold; font-size: 1.2em;">X</span>
                <input type="number" id="golsTimeBAdiado" value="0" min="0" class="score-input" style="width: 70px;">
            </div>
            <div style="text-align: center;">
                <img src="img/${jogo.timeB}.png" style="width: 60px; height: 60px;">
                <div style="margin-top: 5px; font-weight: bold;">${jogo.timeB}</div>
            </div>
        </div>
    `;
    
    modal.style.display = "block";
}

function confirmarJogoAdiado() {
    const golsA = parseInt(document.getElementById("golsTimeAAdiado").value) || 0;
    const golsB = parseInt(document.getElementById("golsTimeBAdiado").value) || 0;
    
    if (jogosAdiados.length === 0) return;
    
    const jogo = jogosAdiados[0];
    
    // Encontra o jogo original na rodada e atualiza
    const jogoOriginal = matchesByRound[jogo.rodadaOriginal].find(m => 
        m.a === jogo.timeA && m.b === jogo.timeB && m.adiado
    );
    
    if (jogoOriginal) {
        jogoOriginal.ga = golsA;
        jogoOriginal.gb = golsB;
        jogoOriginal.saved = true;
        jogoOriginal.adiado = false;
    }
    
    // Remove da lista de jogos adiados
    jogosAdiados.shift();
    
    // Se não há mais jogos adiados, limpa a variável
    if (jogosAdiados.length === 0) {
        rodadaComJogoAdiado = null;
    }
    
    alert(`Jogo adiado simulado: ${jogo.timeA} ${golsA} x ${golsB} ${jogo.timeB}`);
    fecharModalSimularAdiado();
    updateUI();
}

function fecharModalAdiar() {
    document.getElementById("adiarModal").style.display = "none";
}

function fecharModalSimularAdiado() {
    document.getElementById("simularAdiadoModal").style.display = "none";
}

// ========== MODIFICAÇÃO RODADA CONCLUÍDA ==========
function mostrarTelaCampeao() {
    if (currentRound !== 38) return;
    
    const stats = calculateStats(currentRound);
    const sorted = getSortedTeams(stats);
    const campeao = sorted[0][0];
    const statsCampeao = stats[campeao];
    
    // Obtém campeões de copas
    const winnerLib = document.getElementById("winnerLib").value;
    const winnerSula = document.getElementById("winnerSula").value;
    const winnerCDB = document.getElementById("winnerCDB").value;
    
    // Determina títulos do campeão
    const titulos = [];
    
    if (campeao === winnerLib) {
        titulos.push({
            emoji: "🏆",
            nome: "Libertadores 2026",
            cor: "#3b82f6"
        });
    }
    
    if (campeao === winnerSula) {
        titulos.push({
            emoji: "🌎",
            nome: "Sul-Americana 2026",
            cor: "#34a853"
        });
    }
    
    if (campeao === winnerCDB) {
        titulos.push({
            emoji: "🏆",
            nome: "Copa do Brasil 2026",
            cor: "#f59e0b"
        });
    }
    
    // Adiciona título do Brasileirão
    titulos.push({
        emoji: "🥇",
        nome: "Campeão Brasileiro 2026",
        cor: "#fbbf24"
    });
    
    // Atualiza a tela de rodada concluída
    const matchInput = document.getElementById("matchInput");
    
    matchInput.innerHTML = `
        <div class="rodada-concluida" style="text-align: center;">
            <div style="font-size: 3em; margin-bottom: 10px;">🎉🏆</div>
            <h2 style="color: #fbbf24; margin-bottom: 20px;">CAMPEÃO DEFINIDO!</h2>
            
            <div style="background: rgba(30, 41, 59, 0.7); padding: 20px; border-radius: 15px; margin-bottom: 20px;">
                <img src="img/${campeao}.png" style="width: 100px; height: 100px; object-fit: contain; margin-bottom: 15px;">
                <h3 style="font-size: 1.8em; margin-bottom: 5px;">${campeao}</h3>
                <p style="color: #94a3b8; margin-bottom: 15px;">Campeão Brasileiro 2026</p>
                
                <div style="display: flex; justify-content: center; gap: 10px; margin-bottom: 20px;">
                    <div class="stat-box">
                        <div class="stat-number">${statsCampeao.pts}</div>
                        <div class="stat-label">PONTOS</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-number">${statsCampeao.v}</div>
                        <div class="stat-label">VITÓRIAS</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-number">${statsCampeao.gf}</div>
                        <div class="stat-label">GOLS PRÓ</div>
                    </div>
                </div>
            </div>
            
            ${titulos.length > 1 ? `
            <div style="background: rgba(30, 41, 59, 0.7); padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                <h4 style="margin-bottom: 10px; color: #60a5fa;">🏆 OUTROS TÍTULOS CONQUISTADOS:</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">
                    ${titulos.filter(t => t.nome !== "Campeão Brasileiro 2026").map(t => `
                        <div class="titulo-badge" style="background: ${t.cor}20; border: 1px solid ${t.cor}; color: ${t.cor};">
                            ${t.emoji} ${t.nome}
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            
            <p style="font-size: 0.9em; color: #94a3b8; margin-top: 20px;">
                <i class="fas fa-flag-checkered"></i> Temporada 2026 encerrada!
            </p>
        </div>
    `;
}

// Navegação por teclado
document.addEventListener('keydown', (e) => {
    // Detectar Enter para confirmar resultado
    if (e.key === 'Enter') {
        const goalsA = document.getElementById('goalsA');
        const goalsB = document.getElementById('goalsB');
        const matchSelector = document.getElementById('matchSelector');
        
        // Só confirmar se houver um jogo selecionado e se um dos inputs está em foco
        if (matchSelector && matchSelector.value !== "" && 
            ((goalsA && document.activeElement === goalsA) || 
             (goalsB && document.activeElement === goalsB))) {
            addMatch();
            e.preventDefault();
        }
    }
    
    // Teclas de seta para navegação
    if (e.key === "ArrowRight") {
        nextRound();
        if(document.getElementById("resultsModal").style.display === "block") openModal();
    }
    if (e.key === "ArrowLeft") {
        prevRound();
        if(document.getElementById("resultsModal").style.display === "block") openModal();
    }
});

// FUNÇÃO PRINCIPAL CORRIGIDA: calcula vagas dinamicamente com G4 → G5 → G6 → G7
function calcularVagasDinamicas() {
    const winnerLib = document.getElementById("winnerLib").value;
    const winnerSula = document.getElementById("winnerSula").value;
    const winnerCDB = document.getElementById("winnerCDB").value;
    
    // 1. Obter estatísticas atuais e posições
    const stats = calculateStats(currentRound);
    const sorted = getSortedTeams(stats);
    const posicoes = {};
    sorted.forEach(([name], index) => {
        posicoes[name] = index + 1;
    });
    
    // 2. Calcular vagas BASE (iniciais)
    let vagasLibertadores = 4; // G4 inicial
    let vagasPreLibertadores = 1; // G5 inicial
    let vagasSulamericana = 6; // G6-G11 inicial
    
    // 3. Contar times que ganharam copas E estão nas posições de classificação
    let vagasExtrasLibertadores = 0;
    
    // CORREÇÃO: Primeiro verificar todos os campeões
    const campeoes = [];
    if (winnerLib) campeoes.push({time: winnerLib, copa: 'Libertadores'});
    if (winnerSula) campeoes.push({time: winnerSula, copa: 'Sul-Americana'});
    if (winnerCDB) campeoes.push({time: winnerCDB, copa: 'Copa do Brasil'});
    
    // Para cada campeão, verificar se está classificado pelo Brasileirão
    campeoes.forEach(campeao => {
        const posicao = posicoes[campeao.time];
        
        if (!posicao) return; // Time não encontrado na tabela
        
        // REGRA PRINCIPAL: Se o time já está nas vagas da Libertadores (G4+)
        // OU se está na pré-Libertadores (G5), cria vaga extra na Libertadores
        if (posicao <= vagasLibertadores) {
            // Já está classificado → cria vaga extra na Libertadores
            vagasExtrasLibertadores++;
            console.log(`✅ ${campeao.time} (posição ${posicao}) ganhou ${campeao.copa} e está na Libertadores → +1 vaga extra`);
        }
        // Se está na pré-Libertadores (G5)
        else if (posicao === vagasLibertadores + 1) {
            // Ganha vaga direta na Libertadores, liberando a vaga da pré
            vagasExtrasLibertadores++;
            console.log(`✅ ${campeao.time} (posição ${posicao}) ganhou ${campeao.copa} e estava na pré → +1 vaga direta`);
        }
        // Se está nas vagas da Sul-Americana (G6-G11)
        else if (posicao >= vagasLibertadores + 2 && posicao <= vagasLibertadores + 1 + vagasSulamericana) {
            // Se ganhou Libertadores ou Copa do Brasil → vaga extra na Libertadores
            if (campeao.copa === 'Libertadores' || campeao.copa === 'Copa do Brasil') {
                vagasExtrasLibertadores++;
                console.log(`✅ ${campeao.time} (posição ${posicao}) ganhou ${campeao.copa} e estava na Sula → +1 vaga extra`);
            }
            // Se ganhou Sul-Americana e está na zona da Sula → vaga extra na Sula (não conta para expansão da Liberta)
        }
    });
    
    // 4. Aplicar expansão das vagas
    vagasLibertadores += vagasExtrasLibertadores;
    
    // 5. Ajustar vagas da Sul-Americana (devem "descer" se Libertadores expandiu)
    // Vagas da Sula sempre são 6, mas começam depois da Libertadores + Pré-Libertadores
    const inicioSula = vagasLibertadores + 2; // +1 para Pré-Libertadores
    const fimSula = inicioSula + vagasSulamericana - 1;
    
    // Limitar máximo de vagas (realismo)
    const maxVagasLibertadores = 7; // Máximo G7
    vagasLibertadores = Math.min(vagasLibertadores, maxVagasLibertadores);
    
    return {
        vagasLibertadores: vagasLibertadores,
        vagasExtrasLibertadores: vagasExtrasLibertadores,
        inicioSula: inicioSula,
        fimSula: fimSula,
        temCampeaoLibertadores: winnerLib !== "",
        temCampeaoSulamericana: winnerSula !== "",
        temCampeaoCDB: winnerCDB !== ""
    };
}

function updateClassificationInfo() {
    const vagasInfo = calcularVagasDinamicas();
    const vagasLibertadores = vagasInfo.vagasLibertadores;
    const inicioSula = vagasInfo.inicioSula || (vagasLibertadores + 2);
    const fimSula = vagasInfo.fimSula || (inicioSula + 5); // 6 vagas total
    
    const infoDiv = document.getElementById('classificationInfo');
    if (infoDiv) {
        let extraInfo = "";
        if (vagasInfo.vagasExtrasLibertadores > 0) {
            extraInfo += `<p style="font-size:0.7em; margin-top:5px; color:#10b981;">
                ⭐ ${vagasInfo.vagasExtrasLibertadores} vaga(s) extra(s) na Libertadores (G${vagasLibertadores})
            </p>`;
        }
        if (vagasInfo.temCampeaoSulamericana) {
            extraInfo += `<p style="font-size:0.7em; margin-top:5px; color:#34a853;">
                🌎 Campeão da Sul-Americana garante vaga na edição seguinte
            </p>`;
        }
        
        infoDiv.innerHTML = `
            <p><strong>Classificação para Copas 2027:</strong></p>
            <div style="display: flex; justify-content: center; gap: 15px; flex-wrap: wrap; margin-top: 5px;">
                <span>1º-${vagasLibertadores}º: <span style="color:#3b82f6">Libertadores</span></span>
                <span>${vagasLibertadores + 1}º: <span style="color:#fa7b17">Pré-Libertadores</span></span>
                <span>${inicioSula}º-${fimSula}º: <span style="color:#34a853">Sul-Americana</span></span>
                <span>17º-20º: <span style="color:#ef4444">Rebaixamento</span></span>
            </div>
            ${extraInfo}
        `;
    }
}

function updateUI() {
    document.getElementById("round").innerText = currentRound;
    const label = document.getElementById("turnLabel");
    const btnH = document.getElementById("btnHighlight");
    
    // Atualiza botão de destaque
    btnH.innerText = highlightedTeam ? "❌ Remover Destaque" : "🎯 Destacar Time";
    btnH.onclick = highlightedTeam ? 
        () => { highlightedTeam = null; updateUI(); } : 
        () => openSelectionModal('highlight');

    // Atualiza status do turno
    if (currentRound === 0) {
        label.innerText = "Pré-Campeonato";
        document.getElementById("matchInput").style.display = "none";
        document.getElementById("extraChampions").style.display = "none";
        document.getElementById("btnAdiar").style.display = "none";
    } else {
        label.innerText = currentRound <= 19 ? "1º Turno" : "2º Turno";
        updateMatchSelector();
        document.getElementById("matchInput").style.display = "block";
        document.getElementById("btnAdiar").style.display = "inline-flex";
        
        // Mostra seletor de campeões de copas apenas na última rodada
        document.getElementById("extraChampions").style.display = currentRound === 38 ? "block" : "none";
        
        // Verifica se deve mostrar tela do campeão
        if (currentRound === 38) {
            const todosJogosSimulados = matchesByRound[currentRound].every(m => m.saved || m.adiado);
            if (todosJogosSimulados) {
                mostrarTelaCampeao();
            }
        }
    }
    
    // Atualiza status do botão de adiar
    const jogosParaAdiar = matchesByRound[currentRound].filter(m => !m.saved && !m.adiado).length;
    document.getElementById("btnAdiar").disabled = jogosParaAdiar === 0 || currentRound === 0;
    
    renderTable();
    updateClassificationInfo();
}

function updateMatchSelector() {
    const matchInput = document.getElementById("matchInput");
    
    // Se for última rodada e todos jogos estão salvos, mostra tela do campeão
    if (currentRound === 38) {
        const todosJogosSimulados = matchesByRound[currentRound].every(m => m.saved || m.adiado);
        if (todosJogosSimulados) {
            mostrarTelaCampeao();
            return;
        }
    }
    
    // Verifica se há jogos pendentes (não salvos e não adiados)
    const pendingMatches = matchesByRound[currentRound].filter(m => !m.saved && !m.adiado);
    const jogosAdiadosEstaRodada = matchesByRound[currentRound].filter(m => m.adiado);
    
    if (pendingMatches.length === 0) {
        // Todos os jogos foram simulados ou adiados
        matchInput.innerHTML = `
            <div class="rodada-concluida">
                <div style="font-size: 2em; margin-bottom: 10px;">🎉</div>
                <h3>Rodada ${currentRound} Concluída!</h3>
                <p>Todos os jogos desta rodada foram ${jogosAdiadosEstaRodada.length > 0 ? 'simulados ou adiados' : 'simulados'}.</p>
                ${jogosAdiadosEstaRodada.length > 0 ? `
                    <div style="background: rgba(245, 158, 11, 0.1); padding: 10px; border-radius: 8px; margin: 15px 0;">
                        <i class="fas fa-clock"></i> <strong>Jogo(s) adiado(s):</strong> ${jogosAdiadosEstaRodada.length}
                        ${jogosAdiados.length > 0 ? `<br><small>Você tem ${jogosAdiados.length} jogo(s) adiado(s) para simular</small>` : ''}
                    </div>
                ` : ''}
                <p style="font-size: 0.9em; margin-top: 15px;">
                    <span style="color: #3b82f6;">▶</span> Use as setas do teclado ou botões de navegação
                </p>
            </div>
        `;
        return;
    }
    
    // Há jogos pendentes - mostra o seletor normalmente
    matchInput.innerHTML = `
        <select id="matchSelector" class="match-selector" onchange="updateSelectsByMatch()">
            <option value="">Selecione um jogo...</option>
        </select>
        
        <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-top: 15px;">
            <div style="text-align: center;">
                <span class="label-side">Mandante</span>
                <img id="logoA" src="" style="width: 45px; height: 45px; object-fit: contain;">
            </div>
            
            <div style="display: flex; flex-direction: column; align-items: center; gap: 5px;">
                <div style="display: flex; align-items: center; gap: 5px;">
                    <input type="number" id="goalsA" value="0" min="0" onfocus="clearIfZero(this)" onblur="restoreIfEmpty(this)" class="score-input" placeholder="Gols">
                    <span style="font-weight: bold; font-size: 1.2em;">X</span>
                    <input type="number" id="goalsB" value="0" min="0" onfocus="clearIfZero(this)" onblur="restoreIfEmpty(this)" class="score-input" placeholder="Gols">
                </div>
                <small style="color: #94a3b8; font-size: 0.8em; margin-top: 5px;">
                    <i class="fas fa-keyboard"></i> Pressione Enter para confirmar
                </small>
            </div>

            <div style="text-align: center;">
                <span class="label-side">Visitante</span>
                <img id="logoB" src="" style="width: 45px; height: 45px; object-fit: contain;">
            </div>
        </div>
        
        <button onclick="addMatch()" class="btn-confirm">Confirmar Resultado</button>
    `;
    
    // Atualiza o seletor
    const newSelector = document.getElementById("matchSelector");
    newSelector.innerHTML = `<option value="">Selecione um jogo...</option>`;
    
    let primeiroIndice = null;
    
    matchesByRound[currentRound].forEach((m, i) => {
        if (!m.saved && !m.adiado) {
            const status = m.adiado ? "⏸️ ADIADO" : "⏳";
            newSelector.innerHTML += `<option value="${i}">${status} ${m.a} x ${m.b}</option>`;
            if (primeiroIndice === null) primeiroIndice = i;
        }
    });
    
    if (primeiroIndice !== null) {
        newSelector.value = primeiroIndice;
        updateSelectsByMatch();
    }
}

// FUNÇÃO AUXILIAR: Formata resultado com escudos
function formatarResultadoComEscudos(match, team, round) {
    if (!match || !round) return "<div style='color:#64748b; font-size:0.8em; padding:8px;'>Nenhum jogo</div>";
    
    const isHome = match.a === team;
    const opponent = isHome ? match.b : match.a;
    const myGoals = isHome ? match.ga : match.gb;
    const opponentGoals = isHome ? match.gb : match.ga;
    
    // Determinar cor baseada no resultado
    let placarStyle = "";
    if (myGoals > opponentGoals) {
        placarStyle = "color:#10b981; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3);";
    } else if (myGoals < opponentGoals) {
        placarStyle = "color:#ef4444; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3);";
    } else {
        placarStyle = "color:#f59e0b; background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.3);";
    }
    
    return `
        <div class="resultado-com-escudos">
            ${isHome ? `<img src="img/${team}.png" class="escudo-mini-campanha">` : `<img src="img/${opponent}.png" class="escudo-mini-campanha">`}
            <span style="${placarStyle} padding:2px 8px; border-radius:4px; font-weight:bold; font-size:0.9em; min-width:45px; display:inline-block;">
                ${isHome ? `${myGoals} x ${opponentGoals}` : `${opponentGoals} x ${myGoals}`}
            </span>
            ${isHome ? `<img src="img/${opponent}.png" class="escudo-mini-campanha">` : `<img src="img/${team}.png" class="escudo-mini-campanha">`}
            <span class="rodada-indicador">R${round}</span>
        </div>
    `;
}

function renderTable() {
    const stats = calculateStats(currentRound);
    const table = document.getElementById("table");
    
    // Cabeçalho com nomes ABREVIADOS
    table.innerHTML = `<tr>
        <th>Pos</th>
        <th style="text-align:left; padding-left:15px;">Time</th>
        <th>Pontos</th>
        <th>V</th>
        <th>E</th>
        <th>D</th>
        <th>GP</th>
        <th>GC</th>
        <th>Saldo</th>
    </tr>`;
    
    const sorted = getSortedTeams(stats);
    const maxPoints = (38 - currentRound) * 3;
    const pointsToSafe = sorted[15] ? sorted[15][1].pts : 0;
    
    // Calcula vagas dinamicamente
    const vagasInfo = calcularVagasDinamicas();
    const vagasLibertadores = vagasInfo.vagasLibertadores;
    const vagasPreLibertadores = 1;
    const vagasSulamericana = 6; // Sempre 6 vagas

    // Posições de cada classificação (AJUSTADAS DINAMICAMENTE)
    const inicioSula = vagasInfo.inicioSula || (vagasLibertadores + vagasPreLibertadores + 1);
    const fimSula = vagasInfo.fimSula || (inicioSula + vagasSulamericana - 1);
    const inicioZ4 = 17;
    
    // Times classificados por copas
    const winnerLib = document.getElementById("winnerLib").value;
    const winnerSula = document.getElementById("winnerSula").value;
    const winnerCDB = document.getElementById("winnerCDB").value;
    const timesClassificadosPorCopas = new Set();
    if (winnerLib) timesClassificadosPorCopas.add(winnerLib);
    if (winnerSula) timesClassificadosPorCopas.add(winnerSula);
    if (winnerCDB) timesClassificadosPorCopas.add(winnerCDB);

    sorted.forEach(([name, s], i) => {
        const row = table.insertRow();
        const position = i + 1;
        let statusIcon = "";
        
        // Verifica campeão
        if (position === 1 && currentRound > 0 && s.pts > ((sorted[1] ? sorted[1][1].pts : 0) + maxPoints)) {
            statusIcon = " 🏆";
        }
        
        // Verifica rebaixamento
        if (position >= inicioZ4 && currentRound > 0 && (s.pts + maxPoints) < pointsToSafe) {
            statusIcon = " ⬇️";
        }

        // Primeiro aplica classes de zona de classificação
        if (timesClassificadosPorCopas.has(name)) {
            row.classList.add("campeao-extra");
        } else if (position <= vagasLibertadores) {
            row.classList.add("g4");
        } else if (position === vagasLibertadores + 1) {
            row.classList.add("pre-libertadores");
        } else if (position >= inicioSula && position <= fimSula) {
            row.classList.add("sul-americana");
        } else if (position >= inicioZ4) {
            row.classList.add("z4");
        }
        
        // Depois aplica o destaque (com prioridade máxima)
        if (name === highlightedTeam) {
            row.classList.add("row-highlight");
            // Adiciona estilo inline para garantir que o destaque seja visível
            row.style.setProperty('background', 'linear-gradient(90deg, rgba(245, 158, 11, 0.3), rgba(245, 158, 11, 0.2))', 'important');
            row.style.setProperty('border-left', '4px solid #f59e0b', 'important');
            row.style.setProperty('animation', 'pulseHighlight 2s infinite', 'important');
        }

        // HTML da linha com alinhamento consistente
        row.innerHTML = `
            <td>${position}º${statusIcon}</td>
            <td style="text-align: left; padding-left: 15px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <img src="img/${name}.png" class="table-logo" onerror="this.style.display='none'">
                    <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${name}</span>
                    ${name === highlightedTeam ? '<span style="color:#f59e0b; font-size:0.8em;">🎯</span>' : ''}
                </div>
            </td>
            <td><b>${s.pts}</b></td>
            <td>${s.v}</td>
            <td>${s.e}</td>
            <td>${s.d}</td>
            <td>${s.gf}</td>
            <td>${s.gc}</td>
            <td>${s.gf - s.gc}</td>`;
    });
    
    // Atualiza legenda com vagas dinâmicas
    addTableLegend(vagasInfo);
}

function addTableLegend(vagasInfo) {
    const tableContainer = document.querySelector('.table-container');
    const existingLegend = document.getElementById('table-legend');
    
    if (existingLegend) {
        existingLegend.remove();
    }
    
    const vagasLibertadores = vagasInfo.vagasLibertadores;
    const inicioSula = vagasInfo.inicioSula || (vagasLibertadores + 2);
    const fimSula = vagasInfo.fimSula || (inicioSula + 5);
    
    const legend = document.createElement('div');
    legend.id = 'table-legend';
    legend.style.marginTop = '10px';
    legend.style.fontSize = '0.7em';
    legend.style.color = '#94a3b8';
    legend.style.display = 'flex';
    legend.style.justifyContent = 'center';
    legend.style.gap = '15px';
    legend.style.flexWrap = 'wrap';
    legend.style.textAlign = 'center';
    
    let legendText = `
        <span><span style="display:inline-block; width:12px; height:12px; background:#3b82f6; margin-right:4px;"></span> Libertadores (1º-${vagasLibertadores}º)</span>
        <span><span style="display:inline-block; width:12px; height:12px; background:#fa7b17; margin-right:4px;"></span> Pré-Libertadores (${vagasLibertadores + 1}º)</span>
        <span><span style="display:inline-block; width:12px; height:12px; background:#34a853; margin-right:4px;"></span> Sul-Americana (${inicioSula}º-${fimSula}º)</span>
        <span><span style="display:inline-block; width:12px; height:12px; background:#ef4444; margin-right:4px;"></span> Rebaixamento (17º-20º)</span>
        ${highlightedTeam ? `<span><span style="display:inline-block; width:12px; height:12px; background:#f59e0b; margin-right:4px;"></span> Destacado: ${highlightedTeam}</span>` : ''}
    `;
    
    // Adiciona info sobre vagas extras se houver
    if (vagasInfo.vagasExtrasLibertadores > 0) {
        legendText += `<div style="width:100%; margin-top:8px; font-size:0.65em; color:#fbbf24;">
            ⭐ ${vagasInfo.vagasExtrasLibertadores} vaga(s) extra(s) na Libertadores (G${vagasLibertadores})
        </div>`;
    }
    
    if (vagasInfo.temCampeaoSulamericana) {
        legendText += `<div style="width:100%; margin-top:4px; font-size:0.65em; color:#34a853;">
            🌎 Campeão da Sul-Americana garante vaga na edição seguinte
        </div>`;
    }
    
    legend.innerHTML = legendText;
    tableContainer.appendChild(legend);
}

function calculateStats(limit) {
    const s = {}; 
    teams.forEach(t => s[t] = { pts: 0, v: 0, e: 0, d: 0, gf: 0, gc: 0 });
    
    for (let i = 1; i <= limit; i++) {
        matchesByRound[i].filter(m => m.saved).forEach(m => {
            s[m.a].gf += m.ga; 
            s[m.a].gc += m.gb; 
            s[m.b].gf += m.gb; 
            s[m.b].gc += m.ga;
            
            if (m.ga > m.gb) { 
                s[m.a].pts += 3; 
                s[m.a].v++; 
                s[m.b].d++; 
            } else if (m.ga < m.gb) { 
                s[m.b].pts += 3; 
                s[m.b].v++; 
                s[m.a].d++; 
            } else { 
                s[m.a].pts += 1; 
                s[m.b].pts += 1; 
                s[m.a].e++; 
                s[m.b].e++; 
            }
        });
    }
    return s;
}

function getSortedTeams(stats) {
    return Object.entries(stats).sort((a,b) => 
        b[1].pts - a[1].pts || 
        b[1].v - a[1].v || 
        (b[1].gf - b[1].gc) - (a[1].gf - a[1].gc) || 
        b[1].gf - a[1].gf
    );
}

function showCampaign(team) {
    closeSelectionModal();
    const modal = document.getElementById("campaignModal");
    const details = document.getElementById("campaignDetails");
    
    const finalStats = calculateStats(currentRound);
    const finalSorted = getSortedTeams(finalStats);
    const finalPos = finalSorted.findIndex(ts => ts[0] === team) + 1;
    
    // Obtém campeões de copas
    const winnerLib = document.getElementById("winnerLib").value;
    const winnerSula = document.getElementById("winnerSula").value;
    const winnerCDB = document.getElementById("winnerCDB").value;
    
    // Calcula vagas dinamicamente
    const vagasInfo = calcularVagasDinamicas();
    const vagasLibertadores = vagasInfo.vagasLibertadores;
    const inicioSula = vagasInfo.inicioSula || (vagasLibertadores + 2);
    const fimSula = vagasInfo.fimSula || (inicioSula + 5);
    
    // Determina TODOS os títulos do time
    const titulos = [];
    
    // Verifica campeão da Libertadores
    if (team === winnerLib) {
        titulos.push({
            tipo: "Libertadores",
            emoji: "🏆",
            classe: "status-campeao-copa",
            texto: "CAMPEÃO LIBERTADORES"
        });
    }
    
    // Verifica campeão da Sul-Americana
    if (team === winnerSula) {
        titulos.push({
            tipo: "Sul-Americana",
            emoji: "🌎",
            classe: "status-sul-americana",
            texto: "CAMPEÃO SUL-AMERICANA"
        });
    }
    
    // Verifica campeão Brasileiro
    if (finalPos === 1 && currentRound > 0) {
        const maxPoints = (38 - currentRound) * 3;
        const runnerUpPoints = finalSorted[1] ? finalSorted[1][1].pts : 0;
        if (finalStats[team].pts > (runnerUpPoints + maxPoints)) {
            titulos.push({
                tipo: "Brasileiro",
                emoji: "🥇",
                classe: "status-champion",
                texto: "CAMPEÃO BRASILEIRO"
            });
        }
    }
    
    // Verifica campeão da Copa do Brasil
    if (team === winnerCDB) {
        titulos.push({
            tipo: "Copa do Brasil",
            emoji: "🏆",
            classe: "status-campeao-copa",
            texto: "CAMPEÃO COPA DO BRASIL"
        });
    }
    
    // Verifica outras classificações (se não tem título)
    let classificacaoBadge = "";
    const position = finalPos;
    
    if (titulos.length === 0) {
        if (position >= 17 && currentRound > 0) {
            const maxPoints = (38 - currentRound) * 3;
            const pointsToSafe = finalSorted[15] ? finalSorted[15][1].pts : 0;
            if ((finalStats[team].pts + maxPoints) < pointsToSafe) {
                classificacaoBadge = " <span class='status-relegated'>⬇️ REBAIXADO</span>";
            }
        } else if (position === vagasLibertadores + 1 && currentRound > 0) {
            classificacaoBadge = " <span class='status-pre-libertadores'>⚽ PRÉ-LIBERTADORES</span>";
        } else if (position >= inicioSula && position <= fimSula && currentRound > 0) {
            classificacaoBadge = " <span class='status-sul-americana'>🌎 SUL-AMERICANA</span>";
        } else if (position <= vagasLibertadores && currentRound > 0) {
            classificacaoBadge = " <span class='status-champion'>🔵 LIBERTADORES</span>";
        }
    }
    
    // Função para analisar turno
    const getTurnoData = (start, end) => {
        let bPos = 20, wPos = 1, bRound = 0, wRound = 0;
        let bRes = -99, wRes = 99, bResMatch = null, wResMatch = null;
        let invicto = true;
        let teveDerrota = false;
        
        for (let r = start; r <= end && r <= currentRound; r++) {
            const stats = calculateStats(r);
            const sorted = getSortedTeams(stats);
            const pos = sorted.findIndex(ts => ts[0] === team) + 1;
            
            if (pos > 0) {
                if (pos < bPos) { bPos = pos; bRound = r; }
                if (pos > wPos) { wPos = pos; wRound = r; }
            }
            
            const m = matchesByRound[r].find(match => 
                (match.a === team || match.b === team) && match.saved
            );
            
            if (m) {
                const diff = m.a === team ? m.ga - m.gb : m.gb - m.ga;
                
                // Verifica se é derrota
                if (diff < 0) {
                    teveDerrota = true;
                    invicto = false;
                }
                
                // Melhor resultado (maior diferença positiva)
                if (diff > bRes) { 
                    bRes = diff; 
                    bResMatch = {match: m, round: r}; 
                }
                
                // Pior resultado APENAS SE HOUVER DERROTA
                if (diff < wRes) { 
                    wRes = diff; 
                    wResMatch = {match: m, round: r}; 
                }
            }
        }
        
        // Se não teve derrota no turno, ajusta para mostrar "INVICTO"
        if (!teveDerrota) {
            wResMatch = null;
            invicto = true;
        }
        
        return { 
            bPos, wPos, bRound, wRound, 
            bResMatch, wResMatch, invicto,
            teveDerrota
        };
    };

    const t1 = getTurnoData(1, 19);
    const t2 = getTurnoData(20, 38);

    // Template de turno
    const renderTurno = (titulo, d) => {
        let piorResultadoHTML = "";
        
        if (d.teveDerrota) {
            piorResultadoHTML = `
                <p style="margin-top:8px;">❌ <b>Pior Resultado:</b></p>
                ${formatarResultadoComEscudos(d.wResMatch ? d.wResMatch.match : null, team, d.wResMatch ? d.wResMatch.round : 0)}
            `;
        } else {
            piorResultadoHTML = `
                <p style="margin-top:8px;">✅ <b>Pior Resultado:</b> <span style="color:#10b981; font-weight:bold;">INVICTO</span></p>
            `;
        }
        
        return `
            <div class="turno-container-box">
                <h4>${titulo}</h4>
                <p>⭐ <b>Melhor Posição:</b> ${d.bPos}º <small>(Rd ${d.bRound})</small></p>
                <p>📉 <b>Pior Posição:</b> ${d.invicto && d.wPos === 1 ? "INVICTO" : d.wPos + "º"} <small>(Rd ${d.wRound})</small></p>
                <p>✅ <b>Melhor Resultado:</b></p>
                ${formatarResultadoComEscudos(d.bResMatch ? d.bResMatch.match : null, team, d.bResMatch ? d.bResMatch.round : 0)}
                ${piorResultadoHTML}
            </div>
        `;
    };

    details.innerHTML = `
        <div style="text-align:center; margin-bottom:15px;">
            <img src="img/${team}.png" style="width:55px; height:55px; object-fit:contain;"><br>
            <h2 style="margin:5px 0; font-size:1.3em;">${team}</h2>
            ${titulos.length > 0 ? titulos.map(t => `<span class="${t.classe}">${t.emoji} ${t.texto}</span>`).join(' ') : ''}
            ${classificacaoBadge}
            ${team === highlightedTeam ? '<span style="display:inline-block; margin-left:5px; color:#f59e0b;">🎯 DESTACADO</span>' : ''}
            <p style="font-size:0.8em; color:#94a3b8; margin-top:5px;">Posição Atual: ${position}º | Pontos: ${finalStats[team].pts}</p>
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
            ${renderTurno("1º TURNO", t1)}
            ${renderTurno("2º TURNO", t2)}
        </div>
    `;
    modal.style.display = "block";
}

function nextRound() { 
    if (currentRound < 38) { 
        currentRound++; 
        updateUI();
    } 
}

function prevRound() { 
    if (currentRound > 0) { 
        currentRound--; 
        updateUI();
    } 
}

function addMatch() {
    const selector = document.getElementById("matchSelector");
    const idx = selector ? selector.value : "";
    if (idx === "") return;
    
    const match = matchesByRound[currentRound][idx];
    match.ga = Math.max(0, parseInt(document.getElementById("goalsA").value) || 0);
    match.gb = Math.max(0, parseInt(document.getElementById("goalsB").value) || 0);
    match.saved = true;
    
    // Limpa os inputs
    document.getElementById("goalsA").value = "0";
    document.getElementById("goalsB").value = "0";
    
    // Atualiza a interface
    updateUI();
    
    // Se ainda há jogos pendentes, avança automaticamente para o próximo
    const pendingMatches = matchesByRound[currentRound].filter(m => !m.saved && !m.adiado);
    if (pendingMatches.length > 0) {
        // Encontra o próximo jogo não salvo
        let nextIndex = -1;
        for (let i = 0; i < matchesByRound[currentRound].length; i++) {
            if (!matchesByRound[currentRound][i].saved && !matchesByRound[currentRound][i].adiado) {
                nextIndex = i;
                break;
            }
        }
        
        if (nextIndex !== -1) {
            // Pequeno delay para melhor UX
            setTimeout(() => {
                const newSelector = document.getElementById("matchSelector");
                if (newSelector) {
                    newSelector.value = nextIndex;
                    updateSelectsByMatch();
                    // Foco automático no primeiro campo de gols
                    setTimeout(() => {
                        const goalsA = document.getElementById("goalsA");
                        if (goalsA) goalsA.focus();
                    }, 50);
                }
            }, 300);
        }
    }
}

function updateSelectsByMatch() {
    const selector = document.getElementById("matchSelector");
    const idx = selector ? selector.value : "";
    if (idx === "") return;
    
    const match = matchesByRound[currentRound][idx];
    if(match) {
        document.getElementById("logoA").src = `img/${match.a}.png`;
        document.getElementById("logoB").src = `img/${match.b}.png`;
        document.getElementById("goalsA").value = match.ga;
        document.getElementById("goalsB").value = match.gb;
        
        // Foco automático no primeiro campo de gols
        setTimeout(() => {
            const goalsA = document.getElementById("goalsA");
            if (goalsA) goalsA.focus();
        }, 100);
    }
}

function openModal() {
    const modal = document.getElementById("resultsModal");
    const list = document.getElementById("modalList");
    document.getElementById("modalTitle").innerText = `Rodada ${currentRound}`;
    list.innerHTML = "";
    
    const jogosSimulados = matchesByRound[currentRound].filter(m => m.saved);
    
    // Divide em 2 colunas
    const meio = Math.ceil(jogosSimulados.length / 2);
    const coluna1 = jogosSimulados.slice(0, meio);
    const coluna2 = jogosSimulados.slice(meio);
    
    list.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; max-height: 70vh; overflow-y: auto; padding: 10px;">
            <div style="display: flex; flex-direction: column; gap: 12px;">
                ${coluna1.map(m => `
                    <div class="transparent-card" style="min-height: 70px; padding: 12px 15px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                            <div style="display: flex; align-items: center; gap: 10px; width: 40%; min-width: 0;">
                                <img src="img/${m.a}.png" class="mini-logo" style="width: 28px; height: 28px;">
                                <span style="font-weight: bold; font-size: 0.9em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${m.a}</span>
                            </div>
                            
                            <span class="res-score-box ${m.adiado ? 'adiado' : 'outline'}" style="min-width: 75px; padding: 8px 12px; font-size: 1em;">
                                ${m.adiado ? 'ADIADO' : `${m.ga} x ${m.gb}`}
                            </span>
                            
                            <div style="display: flex; align-items: center; gap: 10px; width: 40%; min-width: 0; justify-content: flex-end;">
                                <span style="font-weight: bold; font-size: 0.9em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${m.b}</span>
                                <img src="img/${m.b}.png" class="mini-logo" style="width: 28px; height: 28px;">
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div style="display: flex; flex-direction: column; gap: 12px;">
                ${coluna2.map(m => `
                    <div class="transparent-card" style="min-height: 70px; padding: 12px 15px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                            <div style="display: flex; align-items: center; gap: 10px; width: 40%; min-width: 0;">
                                <img src="img/${m.a}.png" class="mini-logo" style="width: 28px; height: 28px;">
                                <span style="font-weight: bold; font-size: 0.9em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${m.a}</span>
                            </div>
                            
                            <span class="res-score-box ${m.adiado ? 'adiado' : 'outline'}" style="min-width: 75px; padding: 8px 12px; font-size: 1em;">
                                ${m.adiado ? 'ADIADO' : `${m.ga} x ${m.gb}`}
                            </span>
                            
                            <div style="display: flex; align-items: center; gap: 10px; width: 40%; min-width: 0; justify-content: flex-end;">
                                <span style="font-weight: bold; font-size: 0.9em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${m.b}</span>
                                <img src="img/${m.b}.png" class="mini-logo" style="width: 28px; height: 28px;">
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    // Se não houver jogos simulados
    if (jogosSimulados.length === 0) {
        list.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #94a3b8;">
                <i class="fas fa-futbol" style="font-size: 3em; margin-bottom: 15px;"></i>
                <h3>Nenhum jogo simulado</h3>
                <p>Simule os jogos desta rodada para ver os resultados aqui.</p>
            </div>
        `;
    }
    
    modal.style.display = "block";
}

function openSelectionModal(mode) {
    const modal = document.getElementById("selectionModal");
    const grid = document.getElementById("selectionGrid");
    document.getElementById("selectionTitle").innerText = 
        mode === 'highlight' ? "Destacar Time" : "Ver Campanha";
    grid.innerHTML = "";
    
    teams.forEach(t => { 
        grid.innerHTML += `
            <div class="team-card" onclick="handleSelection('${t}', '${mode}')">
                <img src="img/${t}.png" class="selection-logo">
                <p style="display:none;">${t}</p>
            </div>`; 
    });
    modal.style.display = "block";
}

function handleSelection(team, mode) {
    if (mode === 'highlight') { 
        highlightedTeam = team; 
        updateUI(); 
        closeSelectionModal(); 
    } else { 
        showCampaign(team); 
    }
}

function closeModal() { 
    document.getElementById("resultsModal").style.display = "none"; 
}
function closeSelectionModal() { 
    document.getElementById("selectionModal").style.display = "none"; 
}
function closeCampaignModal() { 
    document.getElementById("campaignModal").style.display = "none"; 
}

function backToSelection() { 
    closeCampaignModal(); 
    openSelectionModal('campaign'); 
}

function resetRound() { 
    if(confirm("Zerar rodada? Isso resetará todos os jogos simulados e adiados desta rodada.")) { 
        matchesByRound[currentRound].forEach(m => {
            m.saved = false;
            m.adiado = false;
            m.ga = 0;
            m.gb = 0;
        });
        // Remove jogos adiados desta rodada
        jogosAdiados = jogosAdiados.filter(j => j.rodadaOriginal !== currentRound);
        updateUI(); 
    } 
}

function resetAll() { 
    if(confirm("Resetar tudo? Isso apagará todo o progresso.")) location.reload(); 
}

function saveStats() {
    const data = { 
        currentRound, 
        matchesByRound, 
        jogosAdiados,
        rodadaComJogoAdiado,
        winnerLib: document.getElementById("winnerLib").value, 
        winnerSula: document.getElementById("winnerSula").value,
        winnerCDB: document.getElementById("winnerCDB").value 
    };
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const a = document.createElement("a"); 
    a.href = URL.createObjectURL(blob); 
    a.download = "save_brasileirao.json"; 
    a.click();
}

function importStats(input) {
    const reader = new FileReader();
    reader.onload = e => { 
        const data = JSON.parse(e.target.result); 
        currentRound = data.currentRound; 
        matchesByRound = data.matchesByRound;
        jogosAdiados = data.jogosAdiados || [];
        rodadaComJogoAdiado = data.rodadaComJogoAdiado || null;
        document.getElementById("winnerLib").value = data.winnerLib || "";
        document.getElementById("winnerSula").value = data.winnerSula || "";
        document.getElementById("winnerCDB").value = data.winnerCDB || "";
        updateUI(); 
    };
    reader.readAsText(input.files[0]);
}

function clearIfZero(input) { 
    if (input.value === "0") input.value = ""; 
}
function restoreIfEmpty(input) { 
    if (input.value === "") input.value = "0"; 
}

// Modal de créditos (COM SUA FOTO E REDES SOCIAIS)
function openCreditsModal() {
    const modal = document.getElementById('creditsModal');
    modal.style.display = 'block';
}

function closeCreditsModal() {
    document.getElementById('creditsModal').style.display = 'none';
}

// Fechar modal ao clicar fora
window.onclick = function(event) {
    const creditsModal = document.getElementById('creditsModal');
    if (event.target == creditsModal) {
        closeCreditsModal();
    }
    
    const resultsModal = document.getElementById('resultsModal');
    if (event.target == resultsModal) {
        closeModal();
    }
    
    const selectionModal = document.getElementById("selectionModal");
    if (event.target == selectionModal) {
        closeSelectionModal();
    }
    
    const campaignModal = document.getElementById("campaignModal");
    if (event.target == campaignModal) {
        closeCampaignModal();
    }
    
    const adiarModal = document.getElementById("adiarModal");
    if (event.target == adiarModal) {
        fecharModalAdiar();
    }
    
    const simularAdiadoModal = document.getElementById("simularAdiadoModal");
    if (event.target == simularAdiadoModal) {
        fecharModalSimularAdiado();
    }
}