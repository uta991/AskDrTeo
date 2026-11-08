const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Android release ბილდის ხელმოწერა საკუთარი upload გასაღებით.
 *
 * `android/` საქაღალდე git-ში არ ხვდება და `expo prebuild` მას თავიდან
 * ქმნის — build.gradle-ში ხელით ჩაწერილი ცვლილება ყოველ ჯერზე
 * დაიკარგებოდა. ამიტომ აქ, პლაგინშია.
 *
 * გასაღები და პაროლი რეპოზიტორიაში არ არის: ისინი ~/.gradle/gradle.properties-
 * დან იკითხება (ASKDRTEO_UPLOAD_*). თუ ეს მნიშვნელობები არ არის, ბილდი
 * ძველებურად debug გასაღებით იწერება — ლოკალური გაშვება არ ტყდება, მაგრამ
 * ასეთ ფაილს Google Play არ მიიღებს.
 */
const SIGNING_BLOCK = `
        release {
            if (project.hasProperty('ASKDRTEO_UPLOAD_STORE_FILE')) {
                storeFile file(ASKDRTEO_UPLOAD_STORE_FILE)
                storePassword ASKDRTEO_UPLOAD_STORE_PASSWORD
                keyAlias ASKDRTEO_UPLOAD_KEY_ALIAS
                keyPassword ASKDRTEO_UPLOAD_KEY_PASSWORD
            }
        }`;

module.exports = function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    let gradle = mod.modResults.contents;

    if (!gradle.includes('ASKDRTEO_UPLOAD_STORE_FILE')) {
      // signingConfigs-ში release-ის დამატება debug-ის გვერდით
      gradle = gradle.replace(/signingConfigs\s*\{/, (m) => `${m}${SIGNING_BLOCK}`);

      // release buildType: საკუთარი გასაღები, თუ ხელმისაწვდომია
      gradle = gradle.replace(
        /(release\s*\{[^}]*?)signingConfig signingConfigs\.debug/,
        `$1signingConfig project.hasProperty('ASKDRTEO_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug`,
      );
    }

    mod.modResults.contents = gradle;
    return mod;
  });
};
