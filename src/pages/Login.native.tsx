import { useState } from "react";
import { Alert } from "react-native";
import {
  View,
  Text,
  StyleSheet,
  NativeCard,
  NativeCardHeader,
  NativeCardTitle,
  NativeCardDescription,
  NativeCardContent,
  NativeCardFooter,
  NativeButton,
  NativeInput,
} from "@/components/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getApiBaseUrl } from "@/lib/env";
import { useAuth } from "@/lib/AuthContext";
import { appStorage } from "@/lib/storage";

// Microsoft SSO on mobile needs the backend to redirect back into the app
// (zenamarketing://). Until that is added, only the dev sign-in is available.
export default function Login() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { refreshPermissions } = useAuth();

  const handleDevLogin = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/dev-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        appStorage.setItem("token", data.token);
        await refreshPermissions();
      } else {
        Alert.alert("Login Failed", data.detail || "Unable to sign in");
      }
    } catch (err: unknown) {
      Alert.alert("Login Error", (err as Error)?.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.cardWrapper}>
        <View style={styles.iconBox}>
          <MaterialCommunityIcons name="bullhorn-outline" size={32} color="#2563eb" />
        </View>

        <NativeCard style={styles.card}>
          <NativeCardHeader style={styles.header}>
            <NativeCardTitle style={styles.title}>Marketing</NativeCardTitle>
            <NativeCardDescription style={styles.description}>
              Sign in with your @zenatech.com account
            </NativeCardDescription>
          </NativeCardHeader>

          <NativeCardContent style={styles.content}>
            {__DEV__ ? (
              <>
                <NativeInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@zenatech.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <NativeButton
                  onPress={handleDevLogin}
                  disabled={isLoading || !email.trim()}
                  size="lg"
                  style={styles.signInButton}
                >
                  <Text style={styles.buttonText}>
                    {isLoading ? "Signing in..." : "Dev Sign In"}
                  </Text>
                </NativeButton>
              </>
            ) : (
              <Text style={styles.description}>
                Mobile sign-in is not available yet. Please use the web portal.
              </Text>
            )}
          </NativeCardContent>

          <NativeCardFooter style={styles.footer}>
            <Text style={styles.footerText}>Having trouble? Contact your system administrator.</Text>
          </NativeCardFooter>
        </NativeCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  cardWrapper: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
  },
  iconBox: {
    width: 64,
    height: 64,
    marginBottom: 24,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  card: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
  },
  header: {
    alignItems: "center",
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 6,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  signInButton: {
    width: "100%",
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  footer: {
    paddingTop: 8,
    paddingBottom: 16,
    alignItems: "center",
  },
  footerText: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
  },
});
