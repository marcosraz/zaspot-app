/**
 * Animated Splash Screen
 * Shows ZAspot logo with fade-in and pulse animation
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { Colors } from '../constants/colors';

const { width, height } = Dimensions.get('window');

interface AnimatedSplashProps {
  onAnimationComplete: () => void;
}

export default function AnimatedSplash({ onAnimationComplete }: AnimatedSplashProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Sequence of animations
    Animated.sequence([
      // 1. Logo fade in and scale up
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      // 2. Pulse effect
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      // 3. Text slide up and fade in
      Animated.parallel([
        Animated.timing(textFadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideUpAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // 4. Hold for a moment
      Animated.delay(800),
    ]).start(() => {
      onAnimationComplete();
    });
  }, []);

  return (
    <View style={styles.container}>
      {/* Background gradient effect */}
      <View style={styles.backgroundGradient} />

      {/* Animated logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [
              { scale: Animated.multiply(scaleAnim, pulseAnim) },
            ],
          },
        ]}
      >
        <Image
          source={require('../assets/LogoZ.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Animated text */}
      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: textFadeAnim,
            transform: [{ translateY: slideUpAnim }],
          },
        ]}
      >
        <Text style={styles.title}>ZAspot</Text>
        <Text style={styles.subtitle}>Nabíjej chytře</Text>
      </Animated.View>

      {/* Loading indicator */}
      <Animated.View
        style={[
          styles.loadingContainer,
          { opacity: textFadeAnim },
        ]}
      >
        <View style={styles.loadingBar}>
          <Animated.View
            style={[
              styles.loadingProgress,
              {
                transform: [{
                  scaleX: fadeAnim,
                }],
              },
            ]}
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.brand.darkBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.brand.darkBg,
  },
  logoContainer: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 160,
    height: 160,
    borderRadius: 32,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 18,
    color: Colors.brand.accentGreen,
    marginTop: 8,
    fontWeight: '500',
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 100,
    width: width * 0.5,
  },
  loadingBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingProgress: {
    height: '100%',
    backgroundColor: Colors.brand.accentGreen,
    borderRadius: 2,
    transformOrigin: 'left',
  },
});
