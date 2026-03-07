import React from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {LocalWebDemoScreen} from './src/local-web/LocalWebDemoScreen';

function App() {
  return (
    <SafeAreaProvider>
      <LocalWebDemoScreen />
    </SafeAreaProvider>
  );
}

export default App;
