# Contributing

## Development setup

1. Use Node.js 22.
2. Install the example app dependencies:

```bash
cd example
npm install
cd ios && pod install
```

3. Run the example app:

```bash
npm run ios
```

or:

```bash
npm run android
```

## Repository structure

- package source lives at the repository root
- the runnable consumer app lives in `example/`
- npm publishing only includes the files declared in the root `files` field

## Before opening a pull request

Run the package check:

```bash
npm run pack:check
```

Run the example app checks:

```bash
cd example
node ./node_modules/typescript/bin/tsc --noEmit
node ./node_modules/jest/bin/jest.js --runInBand --watchman=false
```

If your change touches native code, also verify at least one native build:

```bash
cd example/ios
xcodebuild -workspace LocalWebRuntimeExample.xcworkspace -scheme LocalWebRuntimeExample -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath build build
```

```bash
cd example/android
./gradlew assembleDebug
```

## Scope guidelines

- keep the package focused on local web asset loading and runtime transport
- do not add app-specific message schemas to the package
- keep public APIs small and explicit
