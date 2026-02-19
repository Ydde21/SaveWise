import React, { useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Dimensions,
  FlatList,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useActions } from "@/lib/context";
import Colors from "@/constants/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const pages = [
  {
    icon: "wallet" as const,
    title: "Track Your Savings",
    description:
      "Create multiple wallets to organize your savings across different accounts and goals.",
    color: Colors.primary,
  },
  {
    icon: "trending-up" as const,
    title: "Watch Your Money Grow",
    description:
      "See compound interest projections and forecast your financial future with precision.",
    color: Colors.accent,
  },
  {
    icon: "flag" as const,
    title: "Reach Your Goals",
    description:
      "Set savings goals with deadlines and track your progress every step of the way.",
    color: Colors.info,
  },
];

function OnboardingPage({
  item,
}: {
  item: (typeof pages)[0];
}) {
  return (
    <View style={[styles.page, { width: SCREEN_WIDTH }]}>
      <View style={[styles.iconCircle, { backgroundColor: item.color + "15" }]}>
        <Ionicons name={item.icon} size={56} color={item.color} />
      </View>
      <Text style={styles.pageTitle}>{item.title}</Text>
      <Text style={styles.pageDescription}>{item.description}</Text>
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useActions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const buttonScale = useSharedValue(1);
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleNext = () => {
    if (currentIndex < pages.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
      setCurrentIndex(currentIndex + 1);
    } else {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const isLast = currentIndex === pages.length - 1;

  return (
    <LinearGradient
      colors={[Colors.background, "#fff"]}
      style={styles.container}
    >
      <View style={[styles.topBar, { paddingTop: insets.top + 8 + webTopInset }]}>
        <Pressable onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <FlatList
        ref={flatListRef}
        data={pages}
        renderItem={({ item }) => <OnboardingPage item={item} />}
        keyExtractor={(_, i) => i.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={styles.flatList}
      />

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 30 }]}>
        <View style={styles.dots}>
          {pages.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex && styles.dotActive,
                i === currentIndex && {
                  backgroundColor: pages[currentIndex].color,
                },
              ]}
            />
          ))}
        </View>

        <Animated.View style={buttonStyle}>
          <Pressable
            style={[
              styles.nextButton,
              { backgroundColor: pages[currentIndex].color },
            ]}
            onPress={handleNext}
            onPressIn={() => {
              buttonScale.value = withSpring(0.95);
            }}
            onPressOut={() => {
              buttonScale.value = withSpring(1);
            }}
          >
            {isLast ? (
              <Text style={styles.nextButtonText}>Get Started</Text>
            ) : (
              <Ionicons name="arrow-forward" size={24} color="#fff" />
            )}
          </Pressable>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  skipText: {
    fontSize: 15,
    fontFamily: "DMSans_500Medium",
    color: Colors.textSecondary,
  },
  flatList: {
    flex: 1,
  },
  page: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  pageTitle: {
    fontSize: 28,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  pageDescription: {
    fontSize: 16,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  bottomBar: {
    alignItems: "center",
    gap: 24,
    paddingHorizontal: 24,
  },
  dots: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    width: 24,
    borderRadius: 4,
  },
  nextButton: {
    minWidth: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  nextButtonText: {
    fontSize: 15,
    fontFamily: "DMSans_700Bold",
    color: "#fff",
    textAlign: "center" as const,
  },
});
