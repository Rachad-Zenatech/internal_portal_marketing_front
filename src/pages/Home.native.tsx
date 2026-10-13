import { useQuery } from "@tanstack/react-query";
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
  NativeCardContent,
  NativeButton,
  NativeBadge,
} from "@/components/native";
import { useAuth } from "@/lib/AuthContext";
import { getApiBaseUrl } from "@/lib/env";

// Placeholder home screen; marketing modules (events, requests, budgets) land here.
export default function Home() {
  const { user, roles, logout, hasPermission } = useAuth();
  const navigation = useNavigation();

  const health = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const res = await fetch(`${getApiBaseUrl()}/health/live`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as { status: string };
    },
  });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>Marketing</Text>

        <NativeCard>
          <NativeCardHeader>
            <NativeCardTitle>{user?.full_name || user?.email}</NativeCardTitle>
            <NativeCardDescription>{user?.email}</NativeCardDescription>
          </NativeCardHeader>
          <NativeCardContent style={styles.row}>
            {roles.map((role) => (
              <NativeBadge key={role.id} variant="secondary" label={role.name} />
            ))}
          </NativeCardContent>
        </NativeCard>

        <NativeCard>
          <NativeCardHeader>
            <NativeCardTitle>Backend</NativeCardTitle>
            <NativeCardDescription>{getApiBaseUrl()}</NativeCardDescription>
          </NativeCardHeader>
          <NativeCardContent>
            <NativeBadge
              variant={health.isSuccess ? "success" : health.isError ? "destructive" : "outline"}
              label={health.isSuccess ? "Connected" : health.isError ? "Unreachable" : "Checking..."}
            />
          </NativeCardContent>
        </NativeCard>

        {hasPermission("INITIATIVES_VIEW") && (
          <NativeButton onPress={() => navigation.navigate("Initiatives" as never)}>
            <Text style={styles.buttonText}>Initiatives</Text>
          </NativeButton>
        )}

        <NativeButton variant="outline" onPress={logout}>
          <Text>Sign out</Text>
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
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
});
