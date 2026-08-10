#!/usr/bin/env bash
#
# Pulls the crash log off a phone over Wireless debugging, so diagnosing a
# release build does not need adb installed on the host — the build image
# already has it.
#
# Android keeps a dedicated crash buffer, so the fatal exception is still there
# after the app has died and the dialog has been dismissed. That is what gets
# written to /output/crash.txt.
#
#   ADB_PAIR=192.168.1.42:37105 PAIR_CODE=123456 \
#     docker compose -f docker-compose.apk.yml run --rm logcat   # once
#   ADB_TARGET=192.168.1.42:5555 \
#     docker compose -f docker-compose.apk.yml run --rm logcat   # every time
set -euo pipefail

OUTPUT_DIR="${OUTPUT_DIR:-/output}"
PACKAGE="${PACKAGE:-com.ercanakalar.mobilereactnative}"

say() { printf '\n=== %s\n' "$1"; }

if [ -z "${ADB_TARGET:-}" ] && [ -z "${ADB_PAIR:-}" ]; then
  cat >&2 <<'USAGE'
Set ADB_TARGET to the phone's "IP address & Port" from
Settings > Developer options > Wireless debugging.

The first time, the phone also has to be paired. Tap "Pair device with
pairing code" and pass that separate address and the six digits:

  ADB_PAIR=<ip:pairing-port> PAIR_CODE=<six digits> ... run --rm logcat
USAGE
  exit 2
fi

adb start-server > /dev/null

if [ -n "${ADB_PAIR:-}" ]; then
  say "Pairing with ${ADB_PAIR}"
  # adb pair reads the code from stdin when it is not given as an argument.
  echo "${PAIR_CODE:-}" | adb pair "${ADB_PAIR}"
fi

if [ -n "${ADB_TARGET:-}" ]; then
  say "Connecting to ${ADB_TARGET}"
  adb connect "${ADB_TARGET}"
fi

say "Devices"
adb devices -l

mkdir -p "${OUTPUT_DIR}"
CRASH_LOG="${OUTPUT_DIR}/crash.txt"

say "Reading the crash buffer"
# -b crash is the buffer the system writes fatal exceptions to, and it survives
# the app being killed. -d dumps and exits rather than following.
adb logcat -b crash -d > "${CRASH_LOG}"

if [ ! -s "${CRASH_LOG}" ]; then
  echo "the crash buffer is empty — open the app once so it crashes, then rerun"
else
  say "Last fatal exception"
  # Everything from the final FATAL EXCEPTION marker onwards is the stack that
  # actually killed the process; earlier ones are previous launches.
  awk '/FATAL EXCEPTION|AndroidRuntime/ { found = NR } { line[NR] = $0 }
       END { if (found) for (i = found - 4; i <= NR; i++) if (i > 0) print line[i] }' \
    "${CRASH_LOG}" | tail -60
fi

say "Also worth having: everything this app logged"
adb logcat -d --pid="$(adb shell pidof -s "${PACKAGE}" 2>/dev/null || echo 0)" \
  > "${OUTPUT_DIR}/app.txt" 2>/dev/null || true

say "Done"
echo "Full crash buffer: apk-output/crash.txt"
echo "Send that file over — the first 'Caused by:' line names the real fault."
