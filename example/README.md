# Example App

This app is the first consumer of `react-native-local-web-runtime`.

It demonstrates:

- loading a bundled local `web-dist/index.html`
- offline rendering from Android assets and iOS bundled resources
- RN -> web bridge messages
- web -> RN bridge acknowledgements

## Run locally

```bash
npm install
cd ios && pod install
cd ..
npm run ios
```

or:

```bash
npm install
npm run android
```

## Development notes

- the library dependency points to `file:..`
- Metro aliases `react-native-local-web-runtime` back to the repository root so
  JS changes in the library are reflected without publishing
- native changes still require rebuilding the example app
