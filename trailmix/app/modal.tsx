// app/modal.tsx
import { useRouter, useLocalSearchParams } from "expo-router";
import { View, Text, Pressable } from "react-native";

export default function ModalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams(); // if you pass anything in

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center", gap: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>I’m a modal</Text>
      <Text>{JSON.stringify(params)}</Text>

      {/* This will return to the exact screen you opened the modal from */}
      <Pressable onPress={() => router.back()} style={{ padding: 12, backgroundColor: "#eee", borderRadius: 10 }}>
        <Text style={{ textAlign: "center" }}>Close</Text>
      </Pressable>
    </View>
  );
}
