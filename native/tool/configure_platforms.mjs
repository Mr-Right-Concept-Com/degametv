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

patch('android/app/src/main/AndroidManifest.xml', text =>
  text.replace(/android:label="[^"]*"/, 'android:label="DeGameTV"'));
patch('android/app/src/main/res/values/strings.xml', text =>
  text.replace(/(<string name="app_name">)[^<]*(<\/string>)/, '$1DeGameTV$2'));
for (const file of ['ios/Runner/Info.plist', 'macos/Runner/Info.plist']) {
  patch(file, text => text.replace(
    /(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]*(<\/string>)/,
    '$1DeGameTV$2',
  ));
}
patch('windows/runner/main.cpp', text => text.replaceAll('degametv_native', 'DeGameTV'));
patch('linux/runner/my_application.cc', text => text.replaceAll('degametv_native', 'DeGameTV'));
console.log('Configured DeGameTV platform display names.');
