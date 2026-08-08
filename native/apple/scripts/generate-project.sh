#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
apple_dir="$(cd "${script_dir}/.." && pwd)"
project_dir="${apple_dir}/ExchangeNotesApple"
project_file="${project_dir}/ExchangeNotesApple.xcodeproj/project.pbxproj"

command -v xcodegen >/dev/null
command -v jq >/dev/null

xcodegen generate \
  --spec "${project_dir}/project.yml" \
  --project "${project_dir}"

"${script_dir}/configure-project-capabilities.sh" \
  "${project_file}"

echo "Generated ExchangeNotesApple.xcodeproj with App Groups enabled."
