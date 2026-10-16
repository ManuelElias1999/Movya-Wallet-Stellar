#!/usr/bin/env bash
set -euo pipefail
# Run the patched RN method on a real UIKit secure field in an iOS simulator.
# No account, wallet, password or signing credential is used by this harness.
task_dir=$(mktemp -d)
trap 'rm -rf "$task_dir"' EXIT
app_dir="$task_dir/PasswordCheck.app"
mkdir -p "$app_dir"
node scripts/build-ios-password-harness.cjs "$task_dir/main.mm"
sdk_path=$(xcrun --sdk iphonesimulator --show-sdk-path)
cpu_arch=$(uname -m)
xcrun --sdk iphonesimulator clang++ -std=c++20 -fobjc-arc -arch "$cpu_arch" -mios-simulator-version-min=17.0 -isysroot "$sdk_path" -framework UIKit -framework Foundation "$task_dir/main.mm" -o "$app_dir/PasswordCheck"
cat > "$app_dir/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleIdentifier</key><string>com.movya.passwordcheck</string>
<key>CFBundleExecutable</key><string>PasswordCheck</string>
<key>CFBundleName</key><string>PasswordCheck</string>
<key>CFBundleVersion</key><string>1</string>
<key>CFBundleShortVersionString</key><string>1.0.0</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>MinimumOSVersion</key><string>17.0</string>
<key>LSRequiresIPhoneOS</key><true/>
<key>UIDeviceFamily</key><array><integer>1</integer></array>
<key>UILaunchScreen</key><dict/>
</dict></plist>
PLIST
simulator_id=$(xcrun simctl list devices available -j | node -e 'let data="";process.stdin.on("data",c=>data+=c);process.stdin.on("end",()=>{const device=Object.values(JSON.parse(data).devices).flat().find(d=>d.name.startsWith("iPhone"));if(!device)process.exit(1);process.stdout.write(device.udid)})')
xcrun simctl boot "$simulator_id" || true
xcrun simctl bootstatus "$simulator_id" -b
xcrun simctl install "$simulator_id" "$app_dir"
data_dir=$(xcrun simctl get_app_container "$simulator_id" com.movya.passwordcheck data)
rm -f "$data_dir/Documents/result.json"
xcrun simctl launch --terminate-running-process "$simulator_id" com.movya.passwordcheck
for attempt in {1..40}; do
  if [ -f "$data_dir/Documents/result.json" ]; then break; fi
  sleep 1
done
node -e 'const fs=require("fs");const result=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));console.log(JSON.stringify(result));if(!result.passed)process.exit(1)' "$data_dir/Documents/result.json"
