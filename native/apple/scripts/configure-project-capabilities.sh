#!/usr/bin/env bash

set -euo pipefail

project_file="${1:?Provide the generated project.pbxproj path.}"

# XcodeGen writes an OpenStep plist. Convert it to XML so plutil can safely
# insert a real SystemCapabilities dictionary instead of a quoted string.
plutil -convert xml1 "${project_file}"

root_object="$(
  plutil -extract rootObject raw "${project_file}"
)"

for target_name in ExchangeNotes YumiWidgetExtension; do
  target_id="$(
    plutil -convert json -o - "${project_file}" \
      | jq -er \
          --arg target_name "${target_name}" \
          '.objects
           | to_entries[]
           | select(
               .value.isa == "PBXNativeTarget"
               and .value.name == $target_name
             )
           | .key'
  )"

  capability_path="objects.${root_object}.attributes.TargetAttributes.${target_id}.SystemCapabilities"

  if [[ "${target_name}" == "ExchangeNotes" ]]; then
    capability_json='{"com.apple.ApplicationGroups.iOS":{"enabled":1},"com.apple.BackgroundModes":{"enabled":1}}'
  else
    capability_json='{"com.apple.ApplicationGroups.iOS":{"enabled":1}}'
  fi

  if plutil -extract "${capability_path}" raw \
      "${project_file}" >/dev/null 2>&1; then
    plutil -replace "${capability_path}" \
      -json "${capability_json}" \
      "${project_file}"
  else
    plutil -insert "${capability_path}" \
      -json "${capability_json}" \
      "${project_file}"
  fi
done

plutil -lint "${project_file}" >/dev/null
