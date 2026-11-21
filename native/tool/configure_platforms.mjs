import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
function patch(relativePath, transform) {
  const file = join(root, relativePath);
  if (!existsSync(file)) return;
  const before = readFileSync(file, 'utf8');
  const after = transform(before);
  if (after !== before) writeFileSync(file, after);
}

patch('android/app/src/main/AndroidManifest.xml', text => {
  const branded = text.replace(/android:label="[^"]*"/, 'android:label="DeGameTV"');
  const withInternet = branded.includes('android.permission.INTERNET')
    ? branded
    : branded.replace(/(<manifest\b[^>]*>)/, '$1\n    <uses-permission android:name="android.permission.INTERNET" />');
  if (withInternet.includes('android:scheme="degametv"')) return withInternet;
  return withInternet.replace(
    /(<activity\b[\s\S]*?<\/activity>)/,
    activity => activity.replace(
      /<\/activity>$/,
      `    <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="degametv" />
            </intent-filter>
        </activity>`,
    ),
  );
});

patch('android/app/src/main/res/values/strings.xml', text =>
  text.replace(/(<string name="app_name">)[^<]*(<\/string>)/, '$1DeGameTV$2'));

for (const file of ['ios/Runner/Info.plist', 'macos/Runner/Info.plist']) {
  patch(file, text => {
    const branded = text.replace(
      /(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]*(<\/string>)/,
      '$1DeGameTV$2',
    );
    if (branded.includes('<string>degametv</string>')) return branded;
    return branded.replace(
      /\n[ \t]*<\/dict>\s*<\/plist>\s*$/,
      `
  <key>CFBundleURLTypes</key>
  <array>
    <dict>
      <key>CFBundleURLName</key>
      <string>com.degametv.native</string>
      <key>CFBundleURLSchemes</key>
      <array>
        <string>degametv</string>
      </array>
    </dict>
  </array>
</dict>
</plist>`,
    );
  });
}

patch('windows/runner/main.cpp', text => text.replaceAll('degametv_native', 'DeGameTV'));
patch('linux/runner/my_application.cc', text => text.replaceAll('degametv_native', 'DeGameTV'));
console.log('Configured DeGameTV platform display names and custom deep links.');