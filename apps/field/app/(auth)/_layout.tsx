import { Stack } from 'expo-router';
import React from 'react';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#14532d' },
      }}
    >
      <Stack.Screen name="login" />
    </Stack>
  );
}
