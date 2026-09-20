#!/usr/bin/env bash
set -euo pipefail

# Anything not already in the environment is read from .env.production, so the
# script needs no compose file to find the API address, keys and signing
# values. Variables passed in explicitly (compose's ANDROID_KEYSTORE_PATH, a
# BUILD_TYPE on the command line) keep their value.
ENV_FILE="${ENV_FILE:-/app/.env.production}"
if [ -f "${ENV_FILE}" ]; then
  while IFS= read -r line || [ -n "${line}" ]; do
    case "${line}" in ''|'#'*) continue ;; esac
    name="${line%%=*}"
    [[ "${name}" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    [ -n "${!name+x}" ] && continue
    value="${line#*=}"
    value="${value%\"}"; value="${value#\"}"
    value="${value%\'}"; value="${value#\'}"
    export "${name}=${value}"
  done < "${ENV_FILE}"
  echo "loaded defaults from ${ENV_FILE}"
fi

BUILD_TYPE="${BUILD_TYPE:-release}"
# apk installs straight onto a phone; aab is what Google Play accepts. The
# bundle comes out of gradle already signed with the release config below.
OUTPUT_FORMAT="${OUTPUT_FORMAT:-apk}"
OUTPUT_DIR="${OUTPUT_DIR:-/output}"
# Same variables app.config.js reads, so gradle and apksigner use one key.
KEYSTORE="${ANDROID_KEYSTORE_PATH:-/keystore/travel-routes.keystore}"
KEYSTORE_DIR="$(dirname "${KEYSTORE}")"
KEY_ALIAS="${ANDROID_KEY_ALIAS:-roadplanner}"
STORE_PASSWORD="${ANDROID_KEYSTORE_PASSWORD:-android}"
KEY_PASSWORD="${ANDROID_KEY_PASSWORD:-${STORE_PASSWORD}}"
export ANDROID_KEYSTORE_PATH="${KEYSTORE}" ANDROID_KEY_ALIAS="${KEY_ALIAS}" \
  ANDROID_KEYSTORE_PASSWORD="${STORE_PASSWORD}" ANDROID_KEY_PASSWORD="${KEY_PASSWORD}"

say() { printf '\n=== %s\n' "$1"; }

say "Preparing the project"
cd /app

if [ ! -f src/constants/appConfig.ts ]; then
  cp src/constants/appConfig.example.ts src/constants/appConfig.ts
  echo "created appConfig.ts from the example"
fi

if [ -z "${EXPO_PUBLIC_BASE_URL:-}" ]; then
  cat >&2 <<'MISSING'
EXPO_PUBLIC_BASE_URL is not set. It is compiled into the bundle, so an APK
built without it cannot reach the API and there is no way to fix that after
installing — only another build.

It has to be an address the phone itself can open. `localhost` means the
phone, and 10.0.2.2 only means anything to the Android emulator. Use the
address of the machine running the backend on the network the phone is on:

  EXPO_PUBLIC_BASE_URL=http://192.168.1.20:3000 \
    docker compose -f docker-compose.apk.yml run --rm build-apk

Check it from the phone's browser first — http://192.168.1.20:3000/api/health
should answer.
MISSING
  exit 1
fi

if [ -z "${EXPO_PUBLIC_MAP_API_KEY:-}" ]; then
  echo "warning: EXPO_PUBLIC_MAP_API_KEY is empty — the map will render as an" >&2
  echo "         empty grey grid and directions lookups will fail." >&2
fi

if [ -f package-lock.json ]; then
  npm ci --no-audit --no-fund
else
  npm install --no-audit --no-fund
fi

say "Generating the native Android project"
npx expo prebuild --platform android --clean --no-install

say "Installing any SDK packages the generated build asks for"
COMPILE_SDK="$(grep -oP 'compileSdkVersion\s*=\s*Integer\.parseInt\(findProperty\([^)]*\)\s*\?:\s*.\K[0-9]+' android/build.gradle || true)"
[ -z "${COMPILE_SDK}" ] && COMPILE_SDK="$(grep -oP 'compileSdkVersion\D*\K[0-9]+' android/build.gradle | head -1 || true)"
BUILD_TOOLS="$(grep -oP 'buildToolsVersion\D*\K[0-9.]+' android/build.gradle | head -1 || true)"
NDK_VERSION="$(grep -oP 'ndkVersion\D*\K[0-9.]+' android/build.gradle | head -1 || true)"

[ -n "${COMPILE_SDK}" ] && sdkmanager --install "platforms;android-${COMPILE_SDK}" > /dev/null || true
[ -n "${BUILD_TOOLS}" ] && sdkmanager --install "build-tools;${BUILD_TOOLS}" > /dev/null || true
[ -n "${NDK_VERSION}" ] && sdkmanager --install "ndk;${NDK_VERSION}" > /dev/null || true
echo "compileSdk=${COMPILE_SDK:-default} buildTools=${BUILD_TOOLS:-default} ndk=${NDK_VERSION:-default}"

say "Preparing the signing key"
mkdir -p "${KEYSTORE_DIR}" "${OUTPUT_DIR}"

if [ ! -f "${KEYSTORE}" ]; then
  echo "no keystore found at ${KEYSTORE}, generating one — keep it to keep this fingerprint" >&2
  echo "(if you already have the registered key, mount its folder as ANDROID_KEYSTORE_DIR)" >&2
  keytool -genkeypair -v \
    -keystore "${KEYSTORE}" \
    -storetype PKCS12 \
    -alias "${KEY_ALIAS}" \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "${STORE_PASSWORD}" -keypass "${KEY_PASSWORD}" \
    -dname "CN=Road Planner, OU=Mobile, O=Road Planner, L=Istanbul, S=Istanbul, C=TR"
else
  echo "reusing the existing keystore"
fi

say "SHA-1 fingerprint for the Google Cloud console"
keytool -list -v -keystore "${KEYSTORE}" -alias "${KEY_ALIAS}" \
  -storepass "${STORE_PASSWORD}" | grep -E 'SHA1:|SHA256:' || true
echo "Register the SHA1 above against package net.travelroutes.travelroutes"
echo "in the Android OAuth client, or Google sign-in will be refused."

if [ "${OUTPUT_FORMAT}" = "aab" ]; then
  say "Building the ${BUILD_TYPE} app bundle"
  cd android
  GRADLE_TASK="bundle$(echo "${BUILD_TYPE}" | sed 's/^./\U&/')"
  ./gradlew "${GRADLE_TASK}" --no-daemon --stacktrace
  cd /app

  BUNDLE="$(find android/app/build/outputs/bundle/"${BUILD_TYPE}" -name '*.aab' | head -1)"
  if [ -z "${BUNDLE}" ]; then
    echo "gradle produced no aab under android/app/build/outputs/bundle/${BUILD_TYPE}" >&2
    exit 1
  fi

  FINAL="${OUTPUT_DIR}/travel-routes-${BUILD_TYPE}.aab"
  cp "${BUNDLE}" "${FINAL}"

  say "Checking the bundle's signature"
  jarsigner -verify -verbose:summary -certs "${FINAL}" | tail -3 || true
  keytool -printcert -jarfile "${FINAL}" | grep -E 'SHA1:|SHA256:' || true

  say "Done"
  ls -lh "${FINAL}"
  echo "Upload it in Play Console → Production (or Internal testing) → Create new release."
  echo "Play re-signs with its own key; the upload key certificate is the one printed above."
  exit 0
fi

say "Building the ${BUILD_TYPE} APK"
cd android
GRADLE_TASK="assemble$(echo "${BUILD_TYPE}" | sed 's/^./\U&/')"
./gradlew "${GRADLE_TASK}" --no-daemon --stacktrace

say "Signing"
cd /app
UNSIGNED="$(find android/app/build/outputs/apk/"${BUILD_TYPE}" -name '*.apk' | head -1)"
if [ -z "${UNSIGNED}" ]; then
  echo "gradle produced no apk under android/app/build/outputs/apk/${BUILD_TYPE}" >&2
  exit 1
fi

BUILD_TOOLS_DIR="$(ls -d "${ANDROID_HOME}"/build-tools/* | sort -V | tail -1)"
ALIGNED="/tmp/aligned.apk"
FINAL="${OUTPUT_DIR}/travel-routes-${BUILD_TYPE}.apk"

"${BUILD_TOOLS_DIR}/zipalign" -p -f 4 "${UNSIGNED}" "${ALIGNED}"
"${BUILD_TOOLS_DIR}/apksigner" sign \
  --ks "${KEYSTORE}" \
  --ks-key-alias "${KEY_ALIAS}" \
  --ks-pass "pass:${STORE_PASSWORD}" \
  --key-pass "pass:${KEY_PASSWORD}" \
  --out "${FINAL}" \
  "${ALIGNED}"

"${BUILD_TOOLS_DIR}/apksigner" verify --print-certs "${FINAL}" | head -5

say "Done"
ls -lh "${FINAL}"
echo "Install it with:  adb install -r $(basename "${FINAL}")"
echo "or copy it to the phone and open it."
