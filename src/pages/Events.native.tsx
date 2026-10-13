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

// Placeholder for the events list (task E1). Physical / in-person events only for now.
export default function Events() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>Events</Text>
        <Text style={styles.subheading}>In-person events, their costs and outcomes.</Text>

        <NativeCard>
          <NativeCardHeader>
            <NativeCardTitle>No events yet</NativeCardTitle>
            <NativeCardDescription>
              Events you track will appear here, with their costs, outcomes and performance rating.
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
