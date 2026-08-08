#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
apple_dir="$(cd "${script_dir}/.." && pwd)"
project_dir="${apple_dir}/ExchangeNotesApple"
derived_data_dir="${TMPDIR:-/tmp}/exchange-notes-personal-derived"
route_binary="${TMPDIR:-/tmp}/exchange-notes-route-verifier"
route_module_cache="${derived_data_dir}/RouteModuleCache"

command -v xcodegen >/dev/null
command -v xcodebuild >/dev/null
command -v swiftc >/dev/null

mkdir -p "${route_module_cache}"

"${script_dir}/generate-project.sh"

swiftc \
  -module-cache-path "${route_module_cache}" \
  "${project_dir}/Shared/ExchangeNotesRoute.swift" \
  "${script_dir}/verify-routes.swift" \
  -o "${route_binary}"

"${route_binary}"

xcodebuild \
  -quiet \
  -project "${project_dir}/ExchangeNotesApple.xcodeproj" \
  -scheme ExchangeNotesPersonal \
  -configuration Personal \
  -destination "generic/platform=iOS Simulator" \
  -derivedDataPath "${derived_data_dir}" \
  CODE_SIGNING_ALLOWED=NO \
  build

app_path="${derived_data_dir}/Build/Products/Personal-iphonesimulator/ExchangeNotes.app"
widget_path="${app_path}/PlugIns/YumiWidgetExtension.appex"

test -d "${app_path}"
test -d "${widget_path}"

scheme_count="$(
  /usr/libexec/PlistBuddy \
    -c "Print :CFBundleURLTypes:0:CFBundleURLSchemes:0" \
    "${app_path}/Info.plist"
)"

test "${scheme_count}" = "exchangenotes"

background_audio_mode="$(
  /usr/libexec/PlistBuddy \
    -c "Print :UIBackgroundModes:0" \
    "${app_path}/Info.plist"
)"

test "${background_audio_mode}" = "audio"

echo "Personal Team app, widget, and deep-link verification passed."
