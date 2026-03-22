import 'dotenv/config';

export default ({ config }) => {
  return {
    ...config,
    plugins: config.plugins.map((plugin) => {
      if (Array.isArray(plugin) && plugin[0] === 'react-native-google-mobile-ads') {
        return [
          'react-native-google-mobile-ads',
          {
            ...plugin[1],
            androidAppId: process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID || plugin[1].androidAppId,
            iosAppId: process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID || plugin[1].iosAppId,
          },
        ];
      }
      return plugin;
    }),
  };
};
