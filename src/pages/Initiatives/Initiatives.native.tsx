import { useNavigation } from "@react-navigation/native";
import {
  Text,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  NativeCard,
  NativeCardHeader,
  NativeCardTitle,
  NativeCardDescription,
  NativeButton,
} from "@/components/native";

// Placeholder until the mobile initiatives list (task I9).
export default function Initiatives() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>Initiatives</Text>
        <Text style={styles.subheading}>All marketing initiatives across every channel.</Text>

        <NativeCard>
          <NativeCardHeader>
            <NativeCardTitle>No initiatives yet</NativeCardTitle>
            <NativeCardDescription>
              The full list is coming to mobile soon. Use the web app to see all initiatives.
            </NativeCardDescription>
          </NativeCardHeader>
        </NativeCard>

        <NativeButton variant="outline" onPress={() => navigation.goBack()}>
          <Text>Back</Text>
        </NativeButton>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  container: {
    padding: 16,
    gap: 16,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
  },
  subheading: {
    fontSize: 14,
    color: "#64748b",
    marginTop: -8,
  },
});
