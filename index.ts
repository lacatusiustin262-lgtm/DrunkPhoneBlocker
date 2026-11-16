import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';
import React from 'react';

const App = () =>
  React.createElement(ExpoRoot, {
    context: (require as any).context('./src/app', true, /^\.\/.*\.tsx?$/),
  });

registerRootComponent(App);
