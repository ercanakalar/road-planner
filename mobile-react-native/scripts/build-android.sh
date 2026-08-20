#!/usr/bin/env bash
set -euo pipefail

BUILD_TYPE="${BUILD_TYPE:-release}"
KEYSTORE_DIR="${KEYSTORE_DIR:-/keystore}"
OUTPUT_DIR="${OUTPUT_DIR:-/output}"
KEYSTORE="${KEYSTORE_DIR}/travel-routes.keystore"
KEY_ALIAS="${KEY_ALIAS:-roadplanner}"
KEY_PASSWORD="${KEY_PASSWORD:-android}"

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
  echo "no keystore found, generating one — keep ${KEYSTORE_DIR} to keep this fingerprint"
  keytool -genkeypair -v \
    -keystore "${KEYSTORE}" \
    -storetype PKCS12 \
    -alias "${KEY_ALIAS}" \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "${KEY_PASSWORD}" -keypass "${KEY_PASSWORD}" \
    -dname "CN=Road Planner, OU=Mobile, O=Road Planner, L=Istanbul, S=Istanbul, C=TR"
else
  echo "reusing the existing keystore"
fi

say "SHA-1 fingerprint for the Google Cloud console"
keytool -list -v -keystore "${KEYSTORE}" -alias "${KEY_ALIAS}" \
  -storepass "${KEY_PASSWORD}" | grep -E 'SHA1:|SHA256:' || true
echo "Register the SHA1 above against package net.travelroutes.travelroutes"
echo "in the Android OAuth client, or Google sign-in will be refused."

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
  --ks-pass "pass:${KEY_PASSWORD}" \
  --key-pass "pass:${KEY_PASSWORD}" \
  --out "${FINAL}" \
  "${ALIGNED}"

"${BUILD_TOOLS_DIR}/apksigner" verify --print-certs "${FINAL}" | head -5

say "Done"
ls -lh "${FINAL}"
echo "Install it with:  adb install -r $(basename "${FINAL}")"
echo "or copy it to the phone and open it."
