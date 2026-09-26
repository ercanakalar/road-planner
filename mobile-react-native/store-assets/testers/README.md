# Play Console tester list

`play-testers-emails.csv` is the file you upload at
*Play Console → Release → Testing → Closed testing → Testers → Create email
list → Upload CSV*.

Format rules (Play is strict about them):

- one Google account email per line — Gmail or Google Workspace
- **no header row**, no quotes, no extra columns
- plain UTF-8 text, `.csv` extension
- max 2 000 addresses per list

Replace the placeholder `testerNN@gmail.com` rows with the real addresses of
the people who will install the app. These are the accounts they are signed
into on their phone's Play Store, *not* the in-app accounts.

The in-app sign-in credentials testers use once the app is installed come
from `backend`: `npm run users:play-testers` writes `play-testers.csv`
(email + password, one per tester). Hand each tester one row of that file
together with the opt-in link Play shows after the list is saved.

Personal developer accounts need 12 testers opted in for 14 consecutive
days before production access is granted — list 14–15 so a dropout does not
reset the clock.
