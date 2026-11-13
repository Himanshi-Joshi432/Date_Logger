import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

/**
 * Catches a crash while rendering any screen and shows a calm recovery screen
 * instead of a blank app. `onError` is the hook for a crash-reporting service.
 */
export class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled render error:', error, info?.componentStack);
    if (this.props.onError) {
      try {
        this.props.onError(error, info);
      } catch (e) {}
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.container}>
        <Text style={styles.heart}>♡</Text>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          Your memories are safe. Please try again, and if this keeps happening,
          close and reopen the app.
        </Text>
        <Pressable style={styles.button} onPress={() => this.setState({ error: null })}>
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

// Fixed colours: the theme itself may be what failed.
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#ece3d4',
  },
  heart: {
    fontSize: 44,
    color: '#8d3d2f',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#261f18',
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: '#524436',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#8d3d2f',
    borderRadius: 16,
    paddingHorizontal: 26,
    paddingVertical: 13,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
