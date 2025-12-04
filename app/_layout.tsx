// app/_layout.tsx

import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar backgroundColor="#1A4D2E" translucent={false} />

      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: "#1A4D2E",
          },
          
          headerBackTitle: "Voltar",
          contentStyle: {
            backgroundColor: "#0F2F1F",
          },
        }}
      >
        {/* Tela inicial (index) */}
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />

        {/* Tela de Áreas */}
        <Stack.Screen
          name="screens/AreasScreen"
          options={{
            title: "Áreas",
            headerStyle: {
              backgroundColor: "#1A4D2E",
            },
            headerTintColor: "#FFFFFF",
            headerTitleStyle: {
              fontWeight: "600",
              fontSize: 18,
            },
          }}
        />

        {/* Tela de Monitoramento */}
        <Stack.Screen
          name="screens/ValvulasScreen"
          options={({ route }: any) => ({
            title: `Monitoramento - Área ${
              route.params?.area ? JSON.parse(route.params.area).id : ""
            }`,
            headerStyle: {
              backgroundColor: "#1A4D2E",
            },
            headerTintColor: "#FFFFFF",
            headerTitleStyle: {
              fontWeight: "600",
              fontSize: 16,
            },
            headerBackTitle: "Voltar",
          })}
        />

        <Stack.Screen
          name="screens/RegistroScreen"
          options={{
            title: "Histórico de Monitoramentos",
            headerStyle: { backgroundColor: "#1A4D2E" },
            headerTintColor: "#FFFFFF",
            headerBackTitle: "Voltar",
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
