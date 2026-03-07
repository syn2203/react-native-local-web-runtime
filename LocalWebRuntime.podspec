Pod::Spec.new do |spec|
  spec.name         = 'LocalWebRuntime'
  spec.version      = '1.0.0'
  spec.summary      = 'React Native runtime for bundled local web assets.'
  spec.description  = 'Loads local web assets from app bundles and exposes a lightweight native bridge for React Native apps.'
  spec.homepage     = 'https://www.npmjs.com/package/react-native-local-web-runtime'
  spec.license      = { :type => 'MIT' }
  spec.author       = 'syn2203'
  spec.platforms    = { :ios => '13.0' }
  spec.source       = { :path => '.' }
  spec.source_files = 'ios/**/*.{swift,m,h}'
  spec.dependency 'React-Core'
  spec.swift_version = '5.0'
end
