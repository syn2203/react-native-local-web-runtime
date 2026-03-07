module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        packageImportPath: 'import com.localwebruntime.LocalWebPackage;',
        packageInstance: 'new LocalWebPackage()',
      },
    },
  },
};
