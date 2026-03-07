# Publishing

## Before publishing

1. Make sure the package name is still available on npm.
2. Replace placeholder repository metadata in `package.json` if you have moved
   this code into its final GitHub org or user namespace.
   Add:
   - `repository`
   - `bugs`
   - `homepage`
3. Review `package.json` version.
4. Update [CHANGELOG.md](./CHANGELOG.md).
5. Run:

```bash
npm run pack:check
```

## Publish

If this package is published as a public npm package:

```bash
npm publish --access public
```

If you later move to a scoped name such as `@your-scope/react-native-local-web-runtime`,
keep `publishConfig.access` set to `public`.

## Recommended release checklist

See [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md).
