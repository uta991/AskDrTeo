const { withEntitlementsPlist } = require('expo/config-plugins');

/**
 * Sign In with Apple-ის entitlement-ის მოხსნა.
 *
 * `expo-apple-authentication` პაკეტი entitlement-ს ავტომატურად ამატებს,
 * უფასო (personal) Apple გუნდი კი ამ შესაძლებლობას არ უჭერს მხარს და
 * ბილდი provisioning profile-ზე ვარდება.
 *
 * JS კოდი ხელუხლებელი რჩება — `AppleAuthentication.isAvailableAsync()`
 * false-ს დააბრუნებს და ღილაკი გასაგებ შეტყობინებას აჩვენებს.
 *
 * ფასიან Apple Developer ანგარიშზე გადასვლისას: წაშალე ეს პლაგინი
 * app.json-იდან და დააბრუნე `"usesAppleSignIn": true`.
 */
module.exports = function withoutAppleSignIn(config) {
  return withEntitlementsPlist(config, (mod) => {
    delete mod.modResults['com.apple.developer.applesignin'];
    return mod;
  });
};
