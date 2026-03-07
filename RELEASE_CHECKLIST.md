# Release Checklist

## Before version bump

- confirm the npm package name is still correct
- confirm the final GitHub repository URL
- update `package.json` metadata:
  - `repository`
  - `bugs`
  - `homepage`
- update [CHANGELOG.md](./CHANGELOG.md)

## Validation

- run `npm run pack:check`
- run the example TypeScript check
- run the example Jest suite
- run `pod install` in `example/ios`
- build the iOS example
- build the Android example
- verify the example still loads bundled `web-dist` assets offline
- verify RN to web and web to RN bridge messages still work

## Publish

- bump the version in `package.json`
- create a git tag that matches the release version
- run `npm publish --access public`

## After publish

- verify the npm package page renders correctly
- install the published package into a clean React Native app
- recheck iOS autolinking and `pod install`
- recheck Android autolinking and local asset loading
