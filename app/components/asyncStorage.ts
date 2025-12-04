import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";

interface RegistroParaSalvar {
  id: string;
  areaId: number;
  doenca: string | null;
  dados: any; 
  resultados: any[]; 
  localizacao: any; 
  data: Date;
}



export  default async function carregarRegistros  ()  {
  try {
    const registroJson = await AsyncStorage.getItem("@monitoramentos");
    const registrosSalvos = registroJson ? JSON.parse(registroJson) : [];

    console.log(registroJson)
    return registrosSalvos
  } catch (e) {
    console.error(e);
    Alert.alert("Erro", "Não foi possível carregar o histórico.");

    return []
  }
};


export const SalvarRegistros = async (registros: any[]): Promise<boolean> => {
  try{
    await AsyncStorage.setItem("@monitoramentos", JSON.stringify(registros))
    return true
  }catch(e){
    console.error(e)
    Alert.alert("Erro", "Não foi possível atualizar os registros.");
    return false
  }
}


export const SalvarNoAsyncS = async (registro: RegistroParaSalvar) => {
  try {
    const registrosAnterioresJson = await AsyncStorage.getItem(
      "@monitoramentos"
    );
    const registrosAnteriores = registrosAnterioresJson
      ? JSON.parse(registrosAnterioresJson)
      : [];

    const novosRegistros = [...registrosAnteriores, registro];
    console.log(novosRegistros);
    await AsyncStorage.setItem(
      "@monitoramentos",
      JSON.stringify(novosRegistros)
    );

    Alert.alert("Monitoramento Salvo")
    return true

  } catch (e) {
    console.error(e);
    Alert.alert("Erro ao salvar", "Não foi possível salvar os dados.");
    return false
  }
};





