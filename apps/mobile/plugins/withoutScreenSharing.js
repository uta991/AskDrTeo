const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Agora-ს ეკრანის გაზიარების ამოღება Android-ის manifest-იდან.
 *
 * Agora SDK თავისით ამატებს `mediaProjection` ტიპის foreground სერვისს
 * და შესაბამის ნებართვას. ჩვენ ეკრანს არ ვაზიარებთ — ვიზიტი მხოლოდ
 * კამერა და მიკროფონია. Google Play კი ამ ტიპის სერვისზე ცალკე
 * დეკლარაციას და დემო-ვიდეოს ითხოვს, არასაჭიროს შემთხვევაში —
 * უარს. ამიტომ manifest-ის გაერთიანებისას ეს ჩანაწერები იშლება
 * (`tools:node="remove"`).
 *
 * SYSTEM_ALERT_WINDOW (სხვა აპების ზემოთ ფანჯარა) იგივე მიზეზით:
 * არ გვჭირდება და მაღაზიაში დამატებით შემოწმებას იწვევს.
 */
const REMOVED_PERMISSIONS = [
  'android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION',
  'android.permission.SYSTEM_ALERT_WINDOW',
];

const REMOVED_SERVICES = ['io.agora.rtc2.extensions.MediaProjectionMgr$LocalScreenSharingService'];

const REMOVED_ACTIVITIES = [
  'io.agora.rtc2.extensions.MediaProjectionMgr$LocalScreenCaptureAssistantActivity',
];

function removal(name) {
  return { $: { 'android:name': name, 'tools:node': 'remove' } };
}

module.exports = function withoutScreenSharing(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    manifest['uses-permission'] = [
      ...(manifest['uses-permission'] ?? []).filter(
        (p) => !REMOVED_PERMISSIONS.includes(p.$['android:name']),
      ),
      ...REMOVED_PERMISSIONS.map(removal),
    ];

    const app = manifest.application[0];
    app.service = [...(app.service ?? []), ...REMOVED_SERVICES.map(removal)];
    app.activity = [...(app.activity ?? []), ...REMOVED_ACTIVITIES.map(removal)];

    return mod;
  });
};
