import React, { useEffect, useRef, useState } from "react";
import {
  Text,
  View,
  Alert,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import calcularInfestacao from "../services/calculoInfestacao";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { SafeAreaView } from "react-native-safe-area-context";
import DropDownPicker from "react-native-dropdown-picker";
import LocationModal from "../components/LocationModal";
import { Area } from "../../src/types/types";
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
  location?: Location.LocationObject | null;
}

interface MonitoramentoDados {
  [idValvulas: string]: {
    [idPonto: string]: string | PontoData;
  };
}

// NOVA ESTRUTURA DE RESULTADO: Uma lista de doenças por válvula
interface EstatisticaDoenca {
  doencaId: number;
  nome: string;
  afetadas: number;
  porcentagem: number;
  status: "baixo" | "medio" | "alto" | "nenhum";
}

interface ResultadoValvula {
  id: string; // ID da Válvula
  estatisticas: EstatisticaDoenca[]; // Lista de resultados por doença
}

interface DoencaItem {
  label: string;
  value: number;
}

// Ícones
const CalculatorIcon = () => <Text>🧮</Text>;
const SaveIcon = () => <Text>💾</Text>;
const XIcon = () => <Text style={styles.X}>✕</Text>;
const DropletsIcon = () => <Text>💧</Text>;

export default function ValvulasScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const [area, setArea] = useState<Area | null>(null);
  const [dados, setDados] = useState<MonitoramentoDados>({});
  const [loading, setLoading] = useState(true);
  const [resultados, setResultados] = useState<ResultadoValvula[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [localizacao, setLocalizacao] =
    useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [doencaOpen, setDoencaOpen] = useState(false);
  const [doencaSelecionada, setDoencaSelecionada] = useState<number | null>(
    null
  );
  const [doencaItems, setDoencaItems] = useState<DoencaItem[]>([]);
  const [mapVisible, setMapVisible] = useState(false);
  const [pontoEditando, setPontoEditando] = useState<{
    v: number;
    p: string;
  } | null>(null);

  const locationRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    const doencasFormatadas = doencas.map((d) => ({
      label: d.orgao ? `${d.nome} (${d.orgao})` : d.nome,
      value: d.id,
    }));

    setDoencaItems(doencasFormatadas);
    if (doencasFormatadas.length > 0)
      setDoencaSelecionada(doencasFormatadas[0].value);

    const loadArea = async () => {
      try {
        const areaParam: Area | undefined = params.area
          ? JSON.parse(params.area as string)
          : undefined;
        if (areaParam) {
          setArea(areaParam);
          const dadosIniciais: MonitoramentoDados = {};
          const numValvulas =
            areaParam.valves || areaParam.numeroDeValvulas || 2;
          for (let i = 1; i <= numValvulas; i++) {
            dadosIniciais[i] = { pt1: "", pt2: "", pt3: "", pt4: "", pt5: "" };
          }
          setDados(dadosIniciais);
        }
      } catch (error) {
        Alert.alert("Erro", "Erro ao carregar área.");
      } finally {
        setLoading(false);
      }
    };
    loadArea();
  }, [params.area]);

  useEffect(() => {
    const startLocationWatcher = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permissão GPS negada.");
        return;
      }
      const subscriber = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 5000,
          distanceInterval: 5,
        },
        (newLocation) => {
          setLocalizacao(newLocation);
          setErrorMsg(null);
        }
      ).catch(() => {
        setErrorMsg("Falha no GPS.");
        return null;
      });
      if (subscriber) locationRef.current = subscriber;
    };
    startLocationWatcher();
    return () => {
      if (locationRef.current?.remove) locationRef.current.remove();
    };
  }, []);

  const abrirMapa = (idValvula: number, ponto: string) => {
    setPontoEditando({ v: idValvula, p: ponto });
    setMapVisible(true);
  };

  const handleConfirmarLocalizacao = (
    novaLocalizacao: Location.LocationObject
  ) => {
    if (pontoEditando) {
      setDados((prev) => {
        const valvula = prev[pontoEditando.v] || {};
        const valorAtual = valvula[pontoEditando.p];
        let pontoData: PontoData =
          typeof valorAtual === "object" && valorAtual !== null
            ? (valorAtual as PontoData)
            : {
                notaRapida: 0,
                plantas: {
                  planta1: { nota: 0, doencasIds: [] },
                  planta2: { nota: 0, doencasIds: [] },
                  planta3: { nota: 0, doencasIds: [] },
                },
                location: null,
              };

        return {
          ...prev,
          [pontoEditando.v]: {
            ...valvula,
            [pontoEditando.p]: { ...pontoData, location: novaLocalizacao },
          },
        };
      });
    }
    setMapVisible(false);
    setPontoEditando(null);
  };

  const calcularNotaTotalDasPlantas = (plantas: PontoData["plantas"]) => {
    return (
      (plantas.planta1.nota || 0) +
      (plantas.planta2.nota || 0) +
      (plantas.planta3.nota || 0)
    );
  };

  const togglePlanta = (
    idValvula: number,
    ponto: string,
    plantaId: "planta1" | "planta2" | "planta3"
  ) => {
    if (!doencaSelecionada) {
      Alert.alert("Atenção", "Selecione uma doença no menu superior.");
      return;
    }

    setDados((prev) => {
      const valvula = prev[idValvula] || {};
      const pontoData: PontoData =
        typeof valvula[ponto] === "object"
          ? (valvula[ponto] as PontoData)
          : {
              notaRapida: 0,
              plantas: {
                planta1: { nota: 0, doencasIds: [] },
                planta2: { nota: 0, doencasIds: [] },
                planta3: { nota: 0, doencasIds: [] },
              },
              location: null,
            };

      const plantaAtual = pontoData.plantas[plantaId];
      let novasDoencas = [...(plantaAtual.doencasIds || [])];

      if (novasDoencas.includes(doencaSelecionada)) {
        novasDoencas = novasDoencas.filter((id) => id !== doencaSelecionada);
      } else {
        novasDoencas.push(doencaSelecionada);
      }

      const novaNotaPlanta = novasDoencas.length > 0 ? 1 : 0;

      return {
        ...prev,
        [idValvula]: {
          ...valvula,
          [ponto]: {
            ...pontoData,
            plantas: {
              ...pontoData.plantas,
              [plantaId]: { nota: novaNotaPlanta, doencasIds: novasDoencas },
            },
          },
        },
      };
    });
  };

  const getNomeDoenca = (id: number | null | undefined) => {
    if (!id) return null;
    const d = doencas.find((item) => item.id === id);
    if (!d) return "Desconhecido";
    return d.orgao ? `${d.nome}-${d.orgao}` : d.nome;
  };

  // --- NOVA LÓGICA DE CÁLCULO POR DOENÇA ---
  const handleCalcular = () => {
    const novosResultados: ResultadoValvula[] = [];

    for (const idValvula in dados) {
      const valvula = dados[idValvula];

      // Mapa para contar infestação de cada doença: ID -> Quantidade
      const contagemPorDoenca: { [key: number]: number } = {};

      Object.values(valvula).forEach((val) => {
        if (typeof val === "object" && val?.plantas) {
          // Varre as 3 plantas do ponto
          const todasPlantas = [
            val.plantas.planta1,
            val.plantas.planta2,
            val.plantas.planta3,
          ];

          todasPlantas.forEach((planta) => {
            if (planta.nota === 1 && planta.doencasIds) {
              // Para cada doença marcada nesta planta, incrementa o contador global da válvula
              planta.doencasIds.forEach((id) => {
                contagemPorDoenca[id] = (contagemPorDoenca[id] || 0) + 1;
              });
            }
          });
        }
      });

      // Transforma o mapa de contagem em array de estatísticas
      const estatisticas: EstatisticaDoenca[] = Object.keys(
        contagemPorDoenca
      ).map((idStr) => {
        const id = parseInt(idStr, 10);
        const afetadas = contagemPorDoenca[id];
        const porcentagem = calcularInfestacao(afetadas); // Baseado em 15 plantas

        let status: EstatisticaDoenca["status"] = "nenhum";
        if (porcentagem === 0) status = "nenhum";
        else if (porcentagem <= 33.4) status = "baixo";
        else if (porcentagem <= 66.7) status = "medio";
        else status = "alto";

        return {
          doencaId: id,
          nome: getNomeDoenca(id) || `ID ${id}`,
          afetadas,
          porcentagem,
          status,
        };
      });

      // Adiciona o resultado da válvula (mesmo que vazio)
      novosResultados.push({
        id: idValvula,
        estatisticas,
      });
    }

    setResultados(novosResultados);
    setShowResults(true);
  };

  const handleSalvarNoAsyncS = async () => {
    if (!area) return;

    const registro = {
      id: new Date().toISOString(),
      areaId: area.id,
      doencaSelecionada: null, // Não faz mais sentido ter uma única doença global
      dados,
      resultados,
      localizacao: localizacao
        ? {
            latitude: localizacao.coords.latitude,
            longitude: localizacao.coords.longitude,
          }
        : null,
      data: new Date(),
    };

    try {
      const registrosAnterioresJson = await AsyncStorage.getItem(
        "@monitoramentos"
      );
      const registrosAnteriores = registrosAnterioresJson
        ? JSON.parse(registrosAnterioresJson)
        : [];
      const novosResultados = [...registrosAnteriores, registro];
      await AsyncStorage.setItem(
        "@monitoramentos",
        JSON.stringify(novosResultados)
      );

      Alert.alert("Sucesso", "Monitoramento salvo!");

      // RESET
      setShowResults(false);
      setResultados([]);
      const dadosLimpos: MonitoramentoDados = {};
      const numValvulas = area.valves || area.numeroDeValvulas || 2;
      for (let i = 1; i <= numValvulas; i++) {
        dadosLimpos[i] = { pt1: "", pt2: "", pt3: "", pt4: "", pt5: "" };
      }
      setDados(dadosLimpos);
    } catch (e) {
      console.error(e);
      Alert.alert("Erro", "Falha ao salvar.");
    }
  };

  const renderResultCard = (resultado: ResultadoValvula) => {
    return (
      <View key={resultado.id} style={styles.resultCard}>
        <View style={styles.resultHeader}>
          <Text style={styles.resultValvulaText}>Válvula {resultado.id}</Text>
        </View>

        {resultado.estatisticas.length === 0 ? (
          <Text style={styles.noDataText}>Nenhuma doença detectada.</Text>
        ) : (
          resultado.estatisticas.map((stat, idx) => {
            let color = "#10B981"; // Baixo
            if (stat.status === "medio") color = "#F59E0B";
            if (stat.status === "alto") color = "#EF4444";

            return (
              <View
                key={idx}
                style={[
                  styles.statRow,
                  { borderLeftColor: color, borderLeftWidth: 4 },
                ]}
              >
                <View style={styles.statNameContainer}>
                  <Text style={styles.statName}>{stat.nome}</Text>
                  <Text style={[styles.statStatus, { color }]}>
                    {stat.status.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.statNumbers}>
                  <Text style={styles.statValue}>{stat.afetadas}/15</Text>
                  <Text style={[styles.statPerc, { color }]}>
                    {stat.porcentagem.toFixed(1)}%
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    );
  };

  const renderValvulaInputs = (idValvula: number) => {
    const pontos = ["pt1", "pt2", "pt3", "pt4", "pt5"];
    const valvulaData = dados[idValvula] || {};
    const totalPreenchido = Object.values(valvulaData).filter((val) => {
      if (val && typeof val === "object") {
        const p = val as PontoData;
        return calcularNotaTotalDasPlantas(p.plantas) > 0;
      }
      return false;
    }).length;

    return (
      <View style={styles.valvulaContainer} key={idValvula}>
        <View style={styles.valvulaHeader}>
          <View style={styles.valvulaTitleContainer}>
            <DropletsIcon />
            <Text style={styles.valvulaTitle}>Válvula {idValvula}</Text>
          </View>
          <View
            style={[
              styles.progressBadge,
              totalPreenchido === 5
                ? styles.completeBadge
                : styles.incompleteBadge,
            ]}
          >
            <Text style={styles.progressText}>{totalPreenchido}/5</Text>
          </View>
        </View>

        <View style={styles.pontosGrid}>
          {pontos.map((ponto, index) => {
            const valorRaw = valvulaData[ponto];
            let pontoData: PontoData =
              typeof valorRaw === "object" && valorRaw
                ? (valorRaw as PontoData)
                : {
                    notaRapida: 0,
                    plantas: {
                      planta1: { nota: 0, doencasIds: [] },
                      planta2: { nota: 0, doencasIds: [] },
                      planta3: { nota: 0, doencasIds: [] },
                    },
                    location: null,
                  };

            const temGPS = !!pontoData.location;

            return (
              <View key={index} style={styles.pontoContainer}>
                <Text style={styles.pontoLabel}>Ponto {index + 1}</Text>
                <View style={styles.plantaContainer}>
                  <View style={styles.plantasGrid}>
                    {[1, 2, 3].map((num) => {
                      const pKey = `planta${num}` as keyof PontoData["plantas"];
                      const planta = pontoData.plantas[pKey];
                      const ativa = planta?.nota === 1;
                      return (
                        <View key={num} style={styles.plantaItem}>
                          <TouchableOpacity
                            style={[
                              styles.plantaButton,
                              ativa
                                ? styles.plantaButtonActive
                                : styles.plantaButtonInactive,
                            ]}
                            onPress={() => togglePlanta(idValvula, ponto, pKey)}
                          >
                            <Text
                              style={[
                                styles.plantaButtonText,
                                ativa
                                  ? styles.plantaButtonTextActive
                                  : styles.plantaButtonTextInactive,
                              ]}
                            >
                              {num}
                            </Text>
                          </TouchableOpacity>
                          {ativa &&
                            planta.doencasIds &&
                            planta.doencasIds.length > 0 && (
                              <View
                                style={{ marginTop: 4, alignItems: "center" }}
                              >
                                {planta.doencasIds.map((id) => (
                                  <Text
                                    key={id}
                                    style={styles.plantaDoencaMini}
                                  >
                                    {getNomeDoenca(id)?.split("-")[0]}{" "}
                                    {getNomeDoenca(id)?.split("-")[1]
                                      ? getNomeDoenca(id)?.split("-")[1]
                                      : ""}
                                  </Text>
                                ))}
                              </View>
                            )}
                        </View>
                      );
                    })}
                  </View>
                </View>
                <TouchableOpacity
                  style={[
                    styles.gpsButton,
                    temGPS ? styles.gpsButtonActive : styles.gpsButtonInactive,
                  ]}
                  onPress={() => abrirMapa(idValvula, ponto)}
                >
                  <Text style={styles.gpsButtonText}>
                    {temGPS ? "GPS OK" : "GPS"}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  if (loading)
    return (
      <ActivityIndicator
        style={styles.loadingContainer}
        size="large"
        color="#1A4D2E"
      />
    );
  if (!area) return <Text>Área não encontrada</Text>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.content}>
            <Text style={styles.gpsStatus}>
              {errorMsg
                ? `GPS: ${errorMsg}`
                : localizacao
                ? "📍 GPS Ativo"
                : "Buscando GPS..."}
            </Text>
            <View style={[styles.section, { zIndex: 1000 }]}>
              <Text style={styles.sectionTitle}>Selecione a Praga/Doença:</Text>
              <View style={styles.dropdownContainer}>
                <DropDownPicker
                  open={doencaOpen}
                  value={doencaSelecionada}
                  items={doencaItems}
                  setOpen={setDoencaOpen}
                  setValue={setDoencaSelecionada}
                  setItems={setDoencaItems}
                  listMode="MODAL"
                  placeholder="Selecione..."
                  style={styles.pickerContainer}
                />
                {doencaSelecionada && (
                  <Text style={styles.doencaAtualInfo}>
                    Marcando com: {getNomeDoenca(doencaSelecionada)}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.section}>
              {Object.keys(dados).map((idStr) =>
                renderValvulaInputs(parseInt(idStr, 10))
              )}
            </View>
            <TouchableOpacity
              style={styles.calculateButton}
              onPress={handleCalcular}
            >
              <CalculatorIcon />
              <Text style={styles.calculateButtonText}>Calcular e Salvar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <Modal
          visible={showResults}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Resumo da Infestação</Text>
              <TouchableOpacity onPress={() => setShowResults(false)}>
                <XIcon />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {resultados.map(renderResultCard)}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSalvarNoAsyncS}
              >
                <SaveIcon />
                <Text style={styles.saveButtonText}>
                  Confirmar e Novo Registro
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <LocationModal
          visible={mapVisible}
          onClose={() => setMapVisible(false)}
          onConfirm={handleConfirmarLocalizacao}
          initialLocation={localizacao}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  content: { padding: 16 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    color: "#0F172A",
  },
  gpsStatus: {
    textAlign: "center",
    marginBottom: 16,
    fontSize: 14,
    color: "#334155",
    paddingVertical: 12,
    backgroundColor: "#E2E8F0",
    borderRadius: 8,
  },
  dropdownContainer: { marginBottom: 10, zIndex: 2000 },
  pickerContainer: {
    borderColor: "#CBD5E1",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
  },
  doencaAtualInfo: {
    fontSize: 13,
    color: "#065F46",
    marginTop: 8,
    fontWeight: "600",
    backgroundColor: "#D1FAE5",
    padding: 8,
    borderRadius: 6,
    textAlign: "center",
    borderWidth: 1,
    borderColor: "#34D399",
  },
  valvulaContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  valvulaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 12,
  },
  valvulaTitleContainer: { flexDirection: "row", alignItems: "center" },
  valvulaTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginLeft: 8,
    color: "#1E293B",
  },
  progressBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  completeBadge: { backgroundColor: "#DCFCE7", borderColor: "#10B981" },
  incompleteBadge: { backgroundColor: "#F1F5F9", borderColor: "#E2E8F0" },
  progressText: { fontSize: 12, fontWeight: "700", color: "#334155" },
  pontosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  pontoContainer: {
    width: "48%",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginBottom: 4,
  },
  pontoLabel: {
    marginBottom: 12,
    fontWeight: "700",
    color: "#475569",
    fontSize: 14,
    textAlign: "center",
  },
  plantaContainer: { width: "100%", marginBottom: 12 },
  plantasGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  plantaItem: { alignItems: "center", flex: 1 },
  plantaButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  plantaButtonInactive: { backgroundColor: "#FFFFFF", borderColor: "#CBD5E1" },
  plantaButtonActive: { backgroundColor: "#059669", borderColor: "#059669" },
  plantaButtonText: { fontSize: 16, fontWeight: "700" },
  plantaButtonTextInactive: { color: "#94A3B8" },
  plantaButtonTextActive: { color: "#FFFFFF" },
  plantaDoencaMini: {
    fontSize: 8,
    color: "#334155",
    marginTop: 1,
    textAlign: "center",
    fontWeight: "600",
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 2,
    borderRadius: 2,
    width: "100%",
  },
  gpsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  gpsButtonInactive: { backgroundColor: "#FFFFFF", borderColor: "#CBD5E1" },
  gpsButtonActive: { backgroundColor: "#EFF6FF", borderColor: "#3B82F6" },
  gpsButtonText: { fontSize: 12, fontWeight: "700", color: "#334155" },
  calculateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#166534",
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 40,
  },
  calculateButtonText: {
    color: "#FFFFFF",
    marginLeft: 10,
    fontWeight: "800",
    fontSize: 16,
    textTransform: "uppercase",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingTop: 10,
    height: 100,
  },
  modalHeader: {
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1E293B" },
  modalContent: { flex: 1, padding: 16 },
  modalFooter: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    padding: 16,
    borderRadius: 12,
  },
  saveButtonText: {
    color: "#FFFFFF",
    marginLeft: 8,
    fontWeight: "800",
    fontSize: 16,
  },
  resultCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 8,
  },
  resultValvulaText: {
    marginLeft: 8,
    fontWeight: "700",
    color: "#1E293B",
    fontSize: 16,
  },
  noDataText: {
    textAlign: "center",
    color: "#94A3B8",
    fontStyle: "italic",
    padding: 10,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  statNameContainer: { flex: 1 },
  statName: { fontWeight: "700", color: "#334155", fontSize: 14 },
  statStatus: { fontSize: 10, fontWeight: "800", marginTop: 2 },
  statNumbers: { alignItems: "flex-end" },
  statValue: { fontSize: 12, color: "#64748B" },
  statPerc: { fontSize: 16, fontWeight: "800" },
  X: {
    color: "#fd0404ff",
    fontWeight: "900",
  },
});
