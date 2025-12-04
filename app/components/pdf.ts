import { Alert } from "react-native";
import * as Print from "expo-print";
import * as MailComposer from "expo-mail-composer";
import * as FileSystem from "expo-file-system/legacy"; 
import { doencas } from "../../src/data/doencas";
// IMPORTANTE: Importação corrigida para o arquivo onde estão os IDs das doenças

// --- DEFINIÇÃO DE INTERFACES LOCAIS ---

interface PlantaDoenca {
  doencaId?: number | null;
  nota: 0 | 1;
}

interface PontoData {
  notaRapida?: number;
  plantas?: {
    planta1: PlantaDoenca;
    planta2: PlantaDoenca;
    planta3: PlantaDoenca;
  };
  location?: any;
  nota?: string | number; 
}

interface ResultadoValvula {
  id: string;
  plantasAfetadas: number;
  porcentagem: number;
  status: "baixo" | "medio" | "alto" | "nenhum";
  doencasDetalhadas?: any;
}

interface Registro {
  id: string;
  areaId: number;
  doenca?: string;
  dados: { 
    [idValvula: string]: { 
      [idPonto: string]: string | PontoData 
    } 
  };
  resultados: ResultadoValvula[];
  data: string | Date;
}

// --- Função Auxiliar para Traduzir ID -> Nome ---
const getNomeDoenca = (idOrName: number | string | null | undefined) => {
  if (!idOrName) return "";
  
  // Se for número (ID), busca na lista
  if (typeof idOrName === 'number') {
    const d = doencas.find(x => x.id === idOrName);
    // Retorna Nome + Órgão para ficar claro no PDF (Ex: Oídio (F))
    return d ? (d.orgao ? `${d.nome} (${d.orgao})` : d.nome) : "";
  }
  
  // Se for string antiga, limpa o sufixo
  return idOrName.split("-")[0];
};

// --- GERA AS LINHAS DOS PONTOS COM NOTA E DOENÇA ---
const gerarLinhasDePontos = (dadosValvula: { [idPonto: string]: string | PontoData }) => {
  return Object.entries(dadosValvula || {})
    .map(([pontoId, pontoData]) => {
      let detalhesHtml = "";
      let totalNota = 0; // Calcularemos a nota (0-3)

      // Verifica se é o objeto novo com estrutura de plantas
      if (pontoData && typeof pontoData === "object" && (pontoData as PontoData).plantas) {
        const p = (pontoData as PontoData).plantas!;
        const listaPlantas: string[] = [];

        // Verifica Planta 1
        if (p.planta1.nota === 1) {
            totalNota++;
            const nome = getNomeDoenca(p.planta1.doencaId);
            listaPlantas.push(`<b>P1:</b> ${nome}`);
        }
        // Verifica Planta 2
        if (p.planta2.nota === 1) {
            totalNota++;
            const nome = getNomeDoenca(p.planta2.doencaId);
            listaPlantas.push(`<b>P2:</b> ${nome}`);
        }
        // Verifica Planta 3
        if (p.planta3.nota === 1) {
            totalNota++;
            const nome = getNomeDoenca(p.planta3.doencaId);
            listaPlantas.push(`<b>P3:</b> ${nome}`);
        }

        if (listaPlantas.length > 0) {
            detalhesHtml = listaPlantas.join("<br/>");
        } else {
            detalhesHtml = '<span style="color: #ccc;">-</span>';
        }

      } else {
        // Fallback para dados antigos
        let notaAntiga = "0";
        if (typeof pontoData === "string") notaAntiga = pontoData;
        else if (pontoData && (pontoData as any).nota) notaAntiga = String((pontoData as any).nota);
        
        totalNota = parseInt(notaAntiga || "0", 10);
        
        detalhesHtml = totalNota === 0 
            ? '<span style="color: #ccc;">-</span>' 
            : `Nota Manual`;
      }

      // Estilo para destacar notas maiores que 0
      const corNota = totalNota > 0 ? "#DC2626" : "#333"; // Vermelho se tiver nota
      const pesoNota = totalNota > 0 ? "bold" : "normal";

      return `
        <tr>
          <td style="font-weight: bold; width: 20%;">${pontoId.toUpperCase()}</td>
          <td style="font-weight: ${pesoNota}; color: ${corNota}; width: 15%; text-align: center;">${totalNota}</td>
          <td style="text-align: left; padding-left: 20px;">${detalhesHtml}</td>
        </tr>
      `;
    })
    .join("");
};

const gerarLinhasDeResultados = (resultados: Registro["resultados"]) => {
  return resultados
    .map((valvula) => {
      let corStatus = "green";
      let bgStatus = "#ECFDF5";
      if (valvula.status === "alto") {
        corStatus = "#DC2626";
        bgStatus = "#FEF2F2";
      }
      if (valvula.status === "medio") {
        corStatus = "#EA580C";
        bgStatus = "#FFFBEB";
      }
      return `
        <tr>
          <td>Válvula ${valvula.id}</td>
          <td>${valvula.plantasAfetadas} / 15</td>
          <td>${valvula.porcentagem.toFixed(2)}%</td>
          <td style="color: ${corStatus}; background: ${bgStatus}; font-weight: bold; border-radius: 4px; padding: 4px 8px;">
            ${valvula.status.toUpperCase()}
          </td>
        </tr>
      `;
    })
    .join("");
};

const getWeekAtual = (date: Date): number => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

// --- GERAÇÃO DO HTML ---

const gerarHtmlDoRelatorio = (
  registros: Registro[],
  nomeResponsavel: string
): string => {
  const now = new Date();
  const dataBrasilia = now.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
  const semanaAtual = getWeekAtual(now);

  const styles = `
    <style>
      body { 
        font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; 
        margin: 25px; 
        color: #333; 
        background: #f8fafc;
        line-height: 1.5;
      }
      .container {
        background: white;
        border: 1px solid #E2E8F0;
        border-radius: 8px;
        padding: 20px;
        margin: 0 auto;
      }
      .bloco-resumo, .bloco-detalhe-valvula, table, .assinatura-section {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      header { 
        text-align: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #ccc;
      }
      h1 { text-align: center; color: #1A4D2E; font-size: 24px; }
      .subtitle { text-align: center; color: #555; font-size: 14px; margin-bottom: 20px; }
      h2 { 
        margin-top: 25px; padding: 10px; background-color: #f0f0f0;
        border-left: 4px solid #1A4D2E; color: #333; font-size: 18px;
      }
      h3 { font-size: 16px; margin-top: 20px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 5px; }
      h4 { font-size: 14px; font-weight: bold; color: #1A4D2E; margin-top: 15px; margin-bottom: 5px; }
      table { border-collapse: collapse; width: 100%; margin-top: 10px; border: 1px solid #ccc; }
      th, td { border: 1px solid #ccc; padding: 8px; text-align: center; font-size: 12px; }
      th { background-color: #1A4D2E; color: #ffffff; font-weight: bold; }
      tr:nth-child(even) { background-color: #f9f9f9; }
      .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #888; padding-top: 20px; border-top: 1px solid #E2E8F0; }
      .registro-card { border: 1px solid #ccc; border-radius: 5px; padding: 15px; margin-bottom: 20px; }
      .assinatura-section { margin-top: 60px; }
      .assinatura-table { width: 100%; border: none; }
      .assinatura-table td { border: none; width: 50%; text-align: center; padding-top: 60px; }
      .assinatura-line { border-top: 1px solid #718096; margin: 0 20px; padding-top: 8px; font-size: 12px; color: #555; }
    </style>
  `;

  const cardsHtml = registros
    .map((registro) => {
      const linhasResultados = gerarLinhasDeResultados(registro.resultados);

      const detalhesValvulasHtml = registro.resultados
        .map((valvula) => {
          const dadosDaValvula = registro.dados[valvula.id];
          const linhasPontos = gerarLinhasDePontos(dadosDaValvula || {});
          
          return `
            <div class="bloco-detalhe-valvula">
              <h4>🎯 Válvula ${valvula.id}</h4>
              <table>
                <thead>
                  <tr>
                    <th>Ponto</th>
                    <th>Nota</th>
                    <th>Detalhes (Doenças por Planta)</th>
                  </tr>
                </thead>
                <tbody>
                  ${linhasPontos}
                </tbody>
              </table>
            </div>
          `;
        })
        .join("");

      return `
        <div class="registro-card">
          <h2>📍 Área ${registro.areaId} - ${registro.doenca || "Monitoramento"}</h2>
          <p>📅 Data: ${new Date(registro.data).toLocaleString("pt-BR")}</p>
          
          <div class="bloco-resumo">
            <h3>📊 Resumo da Infestação</h3>
            <table>
              <thead>
                <tr>
                  <th>Válvula</th>
                  <th>Plantas Afetadas</th>
                  <th>Infestação</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${linhasResultados}
              </tbody>
            </table>
          </div>

          <h3>🔍 Detalhes por Ponto</h3>
          ${detalhesValvulasHtml}
        </div>
      `;
    })
    .join("");

  return `
    <html>
      <head>
        <meta charset="UTF-8">
        ${styles}
      </head>
      <body>
        <div class="container">
          <header>
            <h1>🍇 Relatório de Monitoramento</h1>
            <h3 style="text-align: center; color: #1A4D2E; margin: 10px 0;">Responsável: ${nomeResponsavel}</h3>
            <div class="subtitle">Gerado em ${dataBrasilia} | Semana: ${semanaAtual}</div>
          </header>
          
          ${cardsHtml}

          <div class="assinatura-section">
            <table class="assinatura-table">
              <tr>
                <td><div class="assinatura-line">${nomeResponsavel}</div></td>
                <td><div class="assinatura-line">Carimbo / Visto</div></td>
              </tr>
            </table>
          </div>

          <div class="footer">📄 Vinhedo Digital - Relatório Automático</div>
        </div>
      </body>
    </html>
  `;
};

// --- A FUNÇÃO PRINCIPAL ---
export const gerarRelatorioUva = async (
  registros: Registro[],
  nomeResponsavel: string
) => {
  if (!registros || registros.length === 0) {
    Alert.alert("Erro", "Não há dados para gerar o relatório.");
    return;
  }

  const html = gerarHtmlDoRelatorio(registros, nomeResponsavel);
  const now = new Date();

  try {
    const { uri } = await Print.printToFileAsync({
      html: html,
      base64: false,
    });

    const fileName = `Relatorio_Uva_${now.getTime()}.pdf`;
    const docDir = (FileSystem as any).documentDirectory || FileSystem.cacheDirectory;
    const newPath = docDir + fileName;

    await FileSystem.moveAsync({
      from: uri,
      to: newPath,
    });

    const isAvailable = await MailComposer.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert("Sucesso", "PDF salvo no dispositivo (E-mail não disponível).");
      return;
    }

    await MailComposer.composeAsync({
      subject: `Relatório Vinhedo - ${now.toLocaleDateString("pt-BR")}`,
      body: `Relatório anexo.\nResponsável: ${nomeResponsavel}`,
      attachments: [newPath],
      recipients: ["valdete@grandvalle.com", "leidson@grandvalle.com"],
    });
  } catch (error) {
    console.error("Erro PDF:", error);
    Alert.alert("Erro", "Falha ao gerar PDF.");
  }
};