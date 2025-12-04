import React, { useState } from "react";
import {
  Text,
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Pressable,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Area } from "../../src/types/types";
import { areas } from "../../src/data/areasData";
import { SafeAreaView } from "react-native-safe-area-context";

const { height } = Dimensions.get("window");

export default function AreasScreen() {
  const router = useRouter();
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  const irParaValvulas = (area: Area) => {
    router.push({
      pathname: "/screens/ValvulasScreen",
      params: { area: JSON.stringify(area) },
    });
  };

  const renderAreaCard = ({ item }: { item: Area; index: number }) => {
    const isSelected = selectedArea === item.id.toString();

    return (
      <TouchableOpacity
        style={[
          styles.card,
          isSelected && styles.cardSelected,
        ]}
        onPressIn={() => setSelectedArea(item.id.toString())}
        onPressOut={() => setSelectedArea(null)}
        onPress={() => irParaValvulas(item)}
        activeOpacity={0.7}
      >
        {/* Header do card */}
        <View style={styles.cardHeader}>
          <View style={styles.areaInfo}>
            <View style={styles.areaTitleContainer}>
              <View style={styles.areaNumber}>
                <Text style={styles.areaNumberText}>{item.id}</Text>
              </View>
              <Text style={styles.areaTitle}>Área {item.id}</Text>
            </View>
            <Text style={styles.areaSubtitle}>Setor de Vinhas</Text>
          </View>

          <View style={styles.valveCount}>
            <Text style={styles.valveCountNumber}>{item.valves}</Text>
            <Text style={styles.valveCountLabel}>válvulas</Text>
          </View>
        </View>

        {/* Status e informações */}
        <View style={styles.cardInfo}>
          <View style={styles.statusContainer}>
            <View style={[styles.statusIndicator, styles.statusActive]} />
            <Text style={styles.statusText}>Operacional</Text>
          </View>
          
          <View style={styles.lastActivity}>
            <Text style={styles.lastActivityText}>Ativa agora</Text>
          </View>
        </View>

        {/* Botão de ação */}
        <View style={styles.cardFooter}>
          <View style={styles.monitorButton}>
            <Text style={styles.monitorButtonText}>Verificar Válvulas</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header Fixo */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable
            style={styles.historyButton}
            onPress={() => router.push("/screens/RegistroScreen")}
          >
            <Text style={styles.historyButtonText}>Histórico</Text>
          </Pressable>
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.title}>Vinhedo Digital</Text>
          <Text style={styles.subtitle}>
            Monitoramento de Áreas
          </Text>
        </View>

        {/* Estatísticas */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{areas.length}</Text>
            <Text style={styles.statLabel}>Áreas</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {areas.reduce((acc, area) => acc + area.valves, 0)}
            </Text>
            <Text style={styles.statLabel}>Válvulas</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>100%</Text>
            <Text style={styles.statLabel}>Ativo</Text>
          </View>
        </View>
      </View>

      {/* Container principal para a lista */}
      <View style={styles.mainContainer}>
        <FlatList
          data={areas}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderAreaCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={
            <Text style={styles.sectionTitle}>Áreas do Vinhedo</Text>
          }
          ListFooterComponent={<View style={styles.footer} />}
          // Adicionando estas props para melhor performance
          removeClippedSubviews={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  mainContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingBottom: 10,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 16,
  },
  historyButton: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  historyButtonText: {
    color: "#000000",
    fontWeight: "600",
    fontSize: 14,
  },
  headerContent: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    padding: 16,
    borderRadius: 16,
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#E2E8F0",
  },
  listContainer: {
    padding: 24,
    paddingTop: 16,

    minHeight: height * 0.6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  cardSelected: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    transform: [{ scale: 0.995 }],
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  areaInfo: {
    flex: 1,
  },
  areaTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  areaNumber: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  areaNumberText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  areaTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000000",
  },
  areaSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginLeft: 44,
  },
  valveCount: {
    alignItems: "center",
  },
  valveCountNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000000",
  },
  valveCountLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  cardInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusActive: {
    backgroundColor: "#10B981",
  },
  statusText: {
    fontSize: 14,
    color: "#000000",
    fontWeight: "500",
  },
  lastActivity: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  lastActivityText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "center",
  },
  monitorButton: {
    backgroundColor: "#000000",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    flex: 1,
    alignItems: "center",
  },
  monitorButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  separator: {
    height: 12,
  },
  footer: {
    height: 100, 
  },
});