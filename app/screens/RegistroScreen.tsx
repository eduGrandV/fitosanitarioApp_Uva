import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  Pressable,
  TextInput,
  Modal,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DropDownPicker from "react-native-dropdown-picker";
import { gerarRelatorioUva } from "../components/pdf";
import calcularInfestacao from "../services/calculoInfestacao";
import { LocationObject } from "expo-location";
import { doencas } from "../../src/data/doencas";

// --- INTERFACES ---

export interface PlantaDoenca {
  doencasIds: number[];
  nota: 0 | 1;
}

export interface PontoData {
  notaRapida?: number;
  plantas: {
    planta1: PlantaDoenca;
    planta2: PlantaDoenca;
    planta3: PlantaDoenca;
  };
  location?: LocationObject | null;
}

export interface MonitoramentoDados {
  [idValvulas: string]: {
    [idPonto: string]: string | PontoData;
  };
}

interface EstatisticaDoenca {
  doencaId: number;
  nome: string;
  afetadas: number;
  porcentagem: number;
  status: "baixo" | "medio" | "alto" | "nenhum";
}

export interface ResultadoValvula {
  id: string;
  estatisticas?: EstatisticaDoenca[];
  // CORREÇÃO 1: Adicionadas propriedades opcionais para compatibilidade
  plantasAfetadas?: number;
  porcentagem?: number;
  status?: "baixo" | "medio" | "alto" | "nenhum";
}

export interface Registro {
  id: string;
  areaId: number;
  doencaSelecionada?: number | null;
  dados: MonitoramentoDados;
  resultados: ResultadoValvula[];
  localizacao?: { latitude: number; longitude: number } | null;
  data: string | Date;
}

// ----- ÍCONES -----
const CheckCircleIcon = () => <Text>✅</Text>;
const AlertTriangleIcon = () => <Text>⚠️</Text>;
const BarChartIcon = () => <Text>📊</Text>;
const PlantIcon = () => <Text>🌿</Text>;
const DiseaseIcon = () => <Text>🦠</Text>;

// ----- FUNÇÃO SEGURA DE DATA -----
const formatarDataSegura = (data: string | Date) => {
  try {
    const d = new Date(data);
    if (isNaN(d.getTime())) return "Data Inválida";

    const dia = d.getDate().toString().padStart(2, "0");
    const mes = (d.getMonth() + 1).toString().padStart(2, "0");
    const ano = d.getFullYear();
    const hora = d.getHours().toString().padStart(2, "0");
    const min = d.getMinutes().toString().padStart(2, "0");

    return `${dia}/${mes}/${ano} ${hora}:${min}`;
  } catch (e) {
    return "--/--/----";
  }
};

// ----- COMPONENTE RegistroCard -----
interface RegistroCardProps {
  item: Registro;
  onRegistroAtualizado: (registroAtualizado: Registro) => void;
}

const RegistroCard = ({ item, onRegistroAtualizado }: RegistroCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedDados, setEditedDados] = useState<MonitoramentoDados>(
    item.dados
  );

  const [pickerOpen, setPickerOpen] = useState(false);
  const [doencaEdicao, setDoencaEdicao] = useState<number | null>(null);
  const [pickerItems, setPickerItems] = useState<
    { label: string; value: number }[]
  >([]);

  useEffect(() => {
    const items = doencas.map((d) => ({
      label: d.orgao ? `${d.nome} (${d.orgao})` : d.nome,
      value: d.id,
    }));
    setPickerItems(items);

    if (item.doencaSelecionada && typeof item.doencaSelecionada === "number") {
      setDoencaEdicao(item.doencaSelecionada);
    } else if (items.length > 0) {
      setDoencaEdicao(items[0].value);
    }
  }, []);

  const getNomeDoenca = (valor: number | string | null | undefined) => {
    if (!valor) return null;
    if (typeof valor === "number") {
      const d = doencas.find((d) => d.id === valor);
      return d ? (d.orgao ? `${d.nome}-${d.orgao}` : d.nome) : "Desconhecido";
    }
    if (typeof valor === "string") return valor.split("-")[0];
    return "Erro";
  };

  const totalAfetadas =
    item.resultados?.reduce((soma, r) => soma + (r.plantasAfetadas || 0), 0) ||
    0;

  const handleTogglePlantEdit = (
    idValvula: string,
    idPonto: string,
    plantaId: "planta1" | "planta2" | "planta3"
  ) => {
    if (!doencaEdicao) {
      Alert.alert(
        "Selecione uma doença",
        "Escolha qual doença você quer aplicar ou remover usando o menu acima."
      );
      return;
    }

    setEditedDados((dadosAnteriores) => {
      const valvulaData = dadosAnteriores[idValvula];
      if (!valvulaData) return dadosAnteriores;
      const pontoData = valvulaData[idPonto];
      if (typeof pontoData !== "object" || pontoData === null)
        return dadosAnteriores;

      const plantaAtual = pontoData.plantas[plantaId];
      let listaIds = [...(plantaAtual.doencasIds || [])];

      if (listaIds.includes(doencaEdicao)) {
        listaIds = listaIds.filter((id) => id !== doencaEdicao);
      } else {
        listaIds.push(doencaEdicao);
      }

      const novaNota = listaIds.length > 0 ? 1 : 0;

      const novasPlantas = {
        ...pontoData.plantas,
        [plantaId]: {
          ...pontoData.plantas[plantaId],
          nota: novaNota,
          doencasIds: listaIds,
        },
      };

      return {
        ...dadosAnteriores,
        [idValvula]: {
          ...dadosAnteriores[idValvula],
          [idPonto]: {
            ...pontoData,
            plantas: novasPlantas,
          },
        },
      };
    });
  };

  const handleSalvarEdicao = () => {
    const novosResultados: ResultadoValvula[] = [];

    for (const idValvula in editedDados) {
      const valvula = editedDados[idValvula];
      const contagemPorDoenca: { [key: number]: number } = {};

      Object.values(valvula).forEach((val) => {
        if (typeof val === "object" && val?.plantas) {
          const todasPlantas = [
            val.plantas.planta1,
            val.plantas.planta2,
            val.plantas.planta3,
          ];
          todasPlantas.forEach((planta) => {
            if (planta.nota === 1 && planta.doencasIds) {
              planta.doencasIds.forEach((id) => {
                contagemPorDoenca[id] = (contagemPorDoenca[id] || 0) + 1;
              });
            }
          });
        }
      });

      const estatisticas: EstatisticaDoenca[] = Object.keys(
        contagemPorDoenca
      ).map((idStr) => {
        const id = parseInt(idStr, 10);
        const afetadas = contagemPorDoenca[id];
        const porcentagem = calcularInfestacao(afetadas);

        let status: EstatisticaDoenca["status"] = "nenhum";
        if (porcentagem === 0) status = "nenhum";
        else if (porcentagem <= 33.4) status = "baixo";
        else if (porcentagem <= 66.8) status = "medio";
        else status = "alto";

        return {
          doencaId: id,
          nome: getNomeDoenca(id) || `ID ${id}`,
          afetadas,
          porcentagem,
          status,
        };
      });

      // Recalcula o total de plantas afetadas genérico para compatibilidade
      const plantasAfetadasTotal = Object.values(valvula).reduce(
        (acc: number, val) => {
          if (typeof val === "object" && val?.plantas) {
            const p = val.plantas;
            return (
              acc +
              (p.planta1.nota || 0) +
              (p.planta2.nota || 0) +
              (p.planta3.nota || 0)
            );
          }
          return acc;
        },
        0
      );

      // Calculo de porcentagem genérica
      const porcentagemTotal = calcularInfestacao(plantasAfetadasTotal);
      let statusTotal: "baixo" | "medio" | "alto" | "nenhum" = "nenhum";
      if (porcentagemTotal === 0) statusTotal = "nenhum";
      else if (porcentagemTotal <= 33.4) statusTotal = "baixo";
      else if (porcentagemTotal <= 66.8) statusTotal = "medio";
      else statusTotal = "alto";

      novosResultados.push({
        id: idValvula,
        estatisticas,
        // Mantém propriedades antigas para evitar crash e satisfazer a interface
        plantasAfetadas: plantasAfetadasTotal,
        porcentagem: porcentagemTotal,
        status: statusTotal,
      });
    }

    const registroAtualizado: Registro = {
      ...item,
      dados: editedDados,
      resultados: novosResultados,
    };
    onRegistroAtualizado(registroAtualizado);
    setIsEditing(false);
  };

  const handleCancelarEdicao = () => {
    setIsEditing(false);
    setEditedDados(item.dados);
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>Área {item.areaId}</Text>
          <Text style={styles.cardDate}>{formatarDataSegura(item.data)}</Text>
        </View>
      </View>

      <View style={styles.cardMainInfo}>
        {item.resultados &&
          item.resultados.map((valvula) =>
            valvula.estatisticas && valvula.estatisticas.length > 0 ? (
              <View key={valvula.id} style={{ marginBottom: 8 }}>
                <Text style={{ fontWeight: "bold", marginBottom: 4, color: "red" }}>
                  Valvula {valvula.id}:
                </Text>
                {valvula.estatisticas.map((stat) => (
                  <Text
                    key={stat.doencaId}
                    style={{ fontSize: 12, color: "#555", marginLeft: 10 }}
                  >
                    • {stat.nome}:{" "}
                    <Text style={{ fontWeight: "bold" }}>
                      {stat.porcentagem.toFixed(1)}%
                    </Text>{" "}
                    ({stat.status})
                  </Text>
                ))}
              </View>
            ) : (
              <View key={valvula.id} style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 12, color: "#999" }}>
                  Válvula {valvula.id}: Sem detalhes de doenças 
                </Text>
              </View>
            )
          )}
      </View>

      <TouchableOpacity
        style={styles.detailsButton}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={styles.detailsButtonText}>
          {isExpanded ? " Esconder detalhes" : " Ver detalhes e editar"}
        </Text>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.expandedContent}>
          {isEditing ? (
            <View style={styles.editingToolbar}>
              <Text style={styles.editingLabel}>Ferramenta de Edição:</Text>
              <Text style={styles.editingSubLabel}>
                Selecione a doença e clique na planta para adicionar/remover.
              </Text>
              <DropDownPicker
                open={pickerOpen}
                value={doencaEdicao}
                items={pickerItems}
                setOpen={setPickerOpen}
                setValue={setDoencaEdicao}
                setItems={setPickerItems}
                listMode="MODAL"
                placeholder="Selecione a doença..."
                style={styles.pickerStyle}
                labelStyle={{ fontSize: 14 }}
              />
              {doencaEdicao && (
                <View style={styles.activeToolBadge}>
                  <Text style={styles.activeToolText}>
                    Usando: {getNomeDoenca(doencaEdicao)}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditing(true)}
            >
              <Text style={styles.editButtonText}>
                 Entrar no Modo de Edição
              </Text>
            </TouchableOpacity>
          )}

          <ScrollView style={styles.valvulasScroll} nestedScrollEnabled={true}>
            {item.resultados &&
              item.resultados.map((valvula) => {
                const dadosValvula = isEditing
                  ? editedDados[valvula.id]
                  : item.dados[valvula.id];
                return (
                  <View key={valvula.id} style={styles.valvulaContainer}>
                    <View style={styles.valvulaHeader}>
                      <Text style={styles.valvulaTitle}>
                         Válvula {valvula.id}
                      </Text>
                    </View>

                    <View style={{ marginBottom: 10 }}>
                      {valvula.estatisticas &&
                        valvula.estatisticas.map((stat) => (
                          <Text key={stat.doencaId} style={{ fontSize: 12, color: 'black' }}>
                             {stat.nome}: {stat.afetadas}/15 (
                            {stat.porcentagem.toFixed(1)}%)
                          </Text>
                        ))}
                    </View>

                    <View style={styles.pontosGrid}>
                      {Object.entries(dadosValvula || {}).map(
                        ([pontoId, pontoData]) => {
                          if (
                            typeof pontoData !== "object" ||
                            pontoData === null
                          )
                            return null;
                          return (
                            <View key={pontoId} style={styles.pontoContainer}>
                              <Text style={styles.pontoLabel}>
                                {pontoId.toUpperCase()}
                              </Text>
                              <View style={styles.plantasContainer}>
                                {(
                                  ["planta1", "planta2", "planta3"] as const
                                ).map((plantaId) => {
                                  const planta = pontoData.plantas[plantaId];
                                  const plantaNum = plantaId.replace(
                                    "planta",
                                    ""
                                  );
                                  const isActive = planta.nota === 1;

                                  const temDoencaEdicao =
                                    isEditing &&
                                    doencaEdicao &&
                                    planta.doencasIds?.includes(doencaEdicao);

                                  return (
                                    <View
                                      key={plantaId}
                                      style={styles.plantaItem}
                                    >
                                      <TouchableOpacity
                                        style={[
                                          styles.plantaButton,
                                          isActive
                                            ? styles.plantaButtonActive
                                            : styles.plantaButtonInactive,
                                          temDoencaEdicao
                                            ? {
                                                borderColor: "#F59E0B",
                                                borderWidth: 3,
                                              }
                                            : {},
                                        ]}
                                        disabled={!isEditing}
                                        onPress={() =>
                                          handleTogglePlantEdit(
                                            valvula.id,
                                            pontoId,
                                            plantaId
                                          )
                                        }
                                      >
                                        <Text
                                          style={[
                                            styles.plantaButtonText,
                                            isActive
                                              ? styles.plantaButtonTextActive
                                              : styles.plantaButtonTextInactive,
                                          ]}
                                        >
                                          P{plantaNum}
                                        </Text>
                                      </TouchableOpacity>

                                      {isActive &&
                                        planta.doencasIds &&
                                        planta.doencasIds.map((id) => (
                                          <Text
                                            key={id}
                                            style={styles.plantaDoenca}
                                          >
                                            {getNomeDoenca(id)?.split("-")[0]}
                                            {getNomeDoenca(id)?.split("-")[1] ? <Text> - {getNomeDoenca(id)?.split("-")[1]}</Text> : ""}
                                          </Text>
                                        ))}
                                    </View>
                                  );
                                })}
                              </View>
                            </View>
                          );
                        }
                      )}
                    </View>
                  </View>
                );
              })}
          </ScrollView>

          {isEditing && (
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={handleCancelarEdicao}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
                onPress={handleSalvarEdicao}
              >
                <Text style={styles.saveButtonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

// ----- TELA PRINCIPAL -----
export default function RegistroScreen() {
  const router = useRouter();
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPdfModalVisible, setIsPdfModalVisible] = useState(false);
  const [nomeResponsavel, setNomeResponsavel] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  const carregarRegistroLocal = async () => {
    setLoading(true);
    try {
      const registrosJson = await AsyncStorage.getItem("@monitoramentos");
      const registroSalvo = registrosJson ? JSON.parse(registrosJson) : [];
      // Garante que é um array antes de setar
      if (Array.isArray(registroSalvo)) {
        setRegistros(registroSalvo.reverse());
      } else {
        setRegistros([]);
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      carregarRegistroLocal();
    }, [])
  );

  const limparHistorico = async () => {
    Alert.alert("Limpar Histórico", "Apagar tudo?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.removeItem("@monitoramentos");
            setRegistros([]);
          } catch (e) {
            Alert.alert("Erro");
          }
        },
      },
    ]);
  };

  const handleAtualizarRegistro = async (registroAtualizado: Registro) => {
    try {
      const novosRegistros = registros.map((r) =>
        r.id === registroAtualizado.id ? registroAtualizado : r
      );
      setRegistros(novosRegistros);
      await AsyncStorage.setItem(
        "@monitoramentos",
        JSON.stringify(novosRegistros)
      );
      Alert.alert("Sucesso", "Registro atualizado.");
    } catch (e) {
      Alert.alert("Erro", "Erro ao salvar.");
    }
  };

  const handleSic = async () => {
    if (registros.length === 0) {
      Alert.alert("Aviso", "Não há dados.");
      return;
    }
    setIsSyncing(true);
    try {
      const payloadFinal: any[] = [];

      registros.forEach((regOriginal) => {
        const doencasEncontradasNoRegistro = new Set<number>();
        Object.values(regOriginal.dados).forEach((valvulaData) => {
          Object.values(valvulaData).forEach((pontoData: any) => {
            if (pontoData && pontoData.plantas) {
              pontoData.plantas.planta1.doencasIds?.forEach((id: number) =>
                doencasEncontradasNoRegistro.add(id)
              );
              pontoData.plantas.planta2.doencasIds?.forEach((id: number) =>
                doencasEncontradasNoRegistro.add(id)
              );
              pontoData.plantas.planta3.doencasIds?.forEach((id: number) =>
                doencasEncontradasNoRegistro.add(id)
              );
            }
          });
        });

        if (doencasEncontradasNoRegistro.size === 0) {
          payloadFinal.push({ ...regOriginal, doenca: "Sem Doença Esp." });
          return;
        }

        doencasEncontradasNoRegistro.forEach((idDoencaAtual) => {
          const dObj = doencas.find((d) => d.id === idDoencaAtual);
          const nomeFormatadoParaBack = dObj
            ? dObj.orgao
              ? `${dObj.nome}-${dObj.orgao}`
              : dObj.nome
            : "Desconhecido";

          const dadosFiltrados: MonitoramentoDados = {};
          let temAlgumDado = false;

          Object.entries(regOriginal.dados).forEach(([vKey, vData]) => {
            const pontosDaValvula: any = {};
            let valvulaTemDado = false;

            Object.entries(vData).forEach(([pKey, pData]: [string, any]) => {
              if (
                typeof pData === "object" &&
                pData !== null &&
                pData.plantas
              ) {
                const plantasFiltradas = {
                  planta1: { ...pData.plantas.planta1 },
                  planta2: { ...pData.plantas.planta2 },
                  planta3: { ...pData.plantas.planta3 },
                };

                if (
                  !plantasFiltradas.planta1.doencasIds?.includes(idDoencaAtual)
                )
                  plantasFiltradas.planta1.nota = 0;
                if (
                  !plantasFiltradas.planta2.doencasIds?.includes(idDoencaAtual)
                )
                  plantasFiltradas.planta2.nota = 0;
                if (
                  !plantasFiltradas.planta3.doencasIds?.includes(idDoencaAtual)
                )
                  plantasFiltradas.planta3.nota = 0;

                const totalNotas =
                  plantasFiltradas.planta1.nota +
                  plantasFiltradas.planta2.nota +
                  plantasFiltradas.planta3.nota;
                if (totalNotas > 0) {
                  pontosDaValvula[pKey] = {
                    ...pData,
                    plantas: plantasFiltradas,
                    nota: totalNotas.toString(),
                  };
                  valvulaTemDado = true;
                  temAlgumDado = true;
                }
              }
            });
            if (valvulaTemDado) dadosFiltrados[vKey] = pontosDaValvula;
          });

          if (temAlgumDado) {
            payloadFinal.push({
              ...regOriginal,
              doenca: nomeFormatadoParaBack,
              dados: dadosFiltrados,
            });
          }
        });
      });

      const replacer = (key: string, value: any) =>
        value === "undefined" || value === undefined || value === ""
          ? null
          : value;
      const jsonLimpo = JSON.stringify(payloadFinal, replacer);
      const response = await fetch("http://192.168.253.9:3003/uva/sinc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: jsonLimpo,
      });

      // CORREÇÃO 2: Declara a variável antes de usar
      const responseText = await response.text();
      if (!response.ok) throw new Error(responseText);

      console.log("SUCESSO:", responseText);
      await limparHistorico();
      Alert.alert("Sucesso", "Dados enviados!");
    } catch (error: any) {
      Alert.alert("Falha", error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading)
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#1A4D2E" />
      </View>
    );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <FlatList
          data={registros}
          renderItem={({ item }) => (
            <RegistroCard
              item={item}
              onRegistroAtualizado={handleAtualizarRegistro}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            registros.length === 0 && styles.emptyList,
          ]}
          ListHeaderComponent={
            registros.length > 0 ? (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={limparHistorico}
              >
                <Text style={styles.clearButtonText}>Limpar Histórico</Text>
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Nenhum registro salvo.</Text>
            </View>
          }
          ListFooterComponent={<View style={styles.footer} />}
          showsVerticalScrollIndicator={false}
        />
        {registros.length > 0 && (
          <View style={styles.bottomButtons}>
            <Pressable
              style={[styles.pdfButton, styles.bottomButton]}
              onPress={() => setIsPdfModalVisible(true)}
            >
              <Text style={styles.bottomButtonText}>Relatório em PDF</Text>
            </Pressable>
            <Pressable
              style={[styles.syncButton, styles.bottomButton]}
              onPress={handleSic}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.bottomButtonText}>
                  Sincronizar com Banco de Dados
                </Text>
              )}
            </Pressable>
          </View>
        )}
        <Modal
          visible={isPdfModalVisible}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Gerar Relatório</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Nome do Responsável"
                value={nomeResponsavel}
                onChangeText={setNomeResponsavel}
              />
              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setIsPdfModalVisible(false)}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonConfirm]}
                  onPress={async () => {
                    if (!nomeResponsavel.trim()) return;
                    setIsPdfModalVisible(false);
                    try {
                      const registrosParaPDF = registros.map((reg) => ({
                        ...reg,
                        doenca: "Relatório Detalhado",
                      }));
                      await gerarRelatorioUva(
                        registrosParaPDF as any,
                        nomeResponsavel
                      );
                    } catch (e) {
                      Alert.alert("Erro", "Erro no PDF");
                    }
                    setNomeResponsavel("");
                  }}
                >
                  <Text style={styles.modalButtonTextConfirm}>Gerar PDF</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
  },
  emptyText: { fontSize: 16, color: "#94A3B8", fontStyle: "italic" },
  list: { padding: 16, flexGrow: 1 },
  emptyList: { flexGrow: 1, justifyContent: "center" },
  clearButton: {
    backgroundColor: "#FFFFFF",
    borderColor: "#EF4444",
    borderWidth: 1.5,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
    elevation: 1,
  },
  clearButtonText: { color: "#EF4444", fontWeight: "700", fontSize: 16 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#F1F5F9",
  },
  cardTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  cardDate: { fontSize: 13, color: "#64748B", marginTop: 4, fontWeight: "600" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  statusText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  cardMainInfo: { marginBottom: 16 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  infoLabel: { fontSize: 14, color: "#64748B", fontWeight: "600" },
  infoValue: { fontSize: 15, color: "#0F172A", fontWeight: "700" },
  valvulaContainerMini: { marginLeft: 8 },
  valvulaStat: { fontSize: 13, color: "#64748B", fontWeight: "600" },
  doencasDetectadas: {
    backgroundColor: "#F1F5F9",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  doencasTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  doencasList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  doencaBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  doencaText: { fontSize: 12, fontWeight: "600", color: "#475569" },
  detailsButton: {
    paddingVertical: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  detailsButtonText: { color: "#1A4D2E", fontSize: 14, fontWeight: "700" },
  expandedContent: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: "#F1F5F9",
  },
  editButton: {
    backgroundColor: "#3B82F6",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 16,
  },
  editButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  valvulasScroll: { maxHeight: 400 },
  valvulaContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  valvulaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  valvulaTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  valvulaStats: { flexDirection: "row", alignItems: "center", gap: 12 },
  pontosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  pontoContainer: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  pontoLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 10,
    textAlign: "center",
  },
  plantasContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  plantaItem: { alignItems: "center" },
  plantaButton: {
    width: 90,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  plantaButtonInactive: { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" },
  plantaButtonActive: { backgroundColor: "#10B981", borderColor: "#10B981" },
  plantaButtonText: { fontSize: 13, fontWeight: "700" },
  plantaButtonTextInactive: { color: "#64748B" },
  plantaButtonTextActive: { color: "#FFFFFF" },
  plantaDisplay: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  plantaDisplayInactive: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  plantaDisplayActive: {
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#10B981",
  },
  plantaDisplayText: { fontSize: 12, fontWeight: "600" },
  plantaDisplayTextInactive: { color: "#64748B" },
  plantaDisplayTextActive: { color: "#10B981" },
  plantaDoenca: {
    fontSize: 10,
    color: "#475569",
    marginTop: 4,
    fontWeight: "500",
    textAlign: "center",
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
    gap: 12,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 120,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  saveButton: { backgroundColor: "#10B981" },
  cancelButtonText: { color: "#64748B", fontWeight: "700" },
  saveButtonText: { color: "#FFFFFF", fontWeight: "700" },
  bottomButtons: {
    padding: 20,
    paddingBottom: 30,
    backgroundColor: "#F8FAFC",
    borderTopWidth: 2,
    borderTopColor: "#E2E8F0",
    elevation: 2,
  },
  bottomButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
    elevation: 3,
  },
  pdfButton: { backgroundColor: "#EF4444" },
  syncButton: { backgroundColor: "#3B82F6" },
  bottomButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    width: "90%",
    maxWidth: 400,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 24,
    backgroundColor: "#F8FAFC",
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1.5,
  },
  modalButtonCancel: { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" },
  modalButtonTextCancel: { color: "#475569", fontWeight: "700", fontSize: 15 },
  modalButtonConfirm: { backgroundColor: "#1A4D2E", borderColor: "#166534" },
  modalButtonTextConfirm: { color: "white", fontWeight: "700", fontSize: 15 },
  footer: { height: 20 },
  editingToolbar: {
    backgroundColor: "#E0F2FE",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#7DD3FC",
  },
  editingLabel: { fontSize: 14, fontWeight: "700", color: "#0369A1" },
  editingSubLabel: { fontSize: 12, color: "#0C4A6E", marginBottom: 8 },
  pickerStyle: { borderColor: "#7DD3FC", borderRadius: 8, height: 40 },
  activeToolBadge: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    padding: 6,
    borderRadius: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#7DD3FC",
  },
  activeToolText: { color: "#0369A1", fontWeight: "bold", fontSize: 12 },
});
