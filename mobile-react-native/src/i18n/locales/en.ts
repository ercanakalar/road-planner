/**
 * The source strings. Every other locale is a translation of this file, so a
 * key that is missing elsewhere falls back to the sentence written here rather
 * than to the key itself.
 *
 * Keys are grouped by where they are read, not by what they say: finding the
 * string for a screen should not require knowing how it was worded.
 */
const en = {
    common: {
        cancel: 'Cancel',
        save: 'Save',
        retry: 'Retry',
        signIn: 'Sign in',
        loading: 'Loading…',
        gettingReady: 'Getting things ready…',
        somethingWentWrong: 'Something went wrong',
    },

    settings: {
        appearance: 'Appearance',
        automaticFollowsPhone:
            "Automatic follows your phone's light or dark setting.",
        themeLight: 'Light',
        themeDark: 'Dark',
        themeAutomatic: 'Automatic',

        language: 'Language',
        languageHint:
            'The app starts in your phone’s language. Pick one here and it stays, whatever the phone does later.',
        languageFollowsPhone: 'Following your phone',

        inAppMessages: 'In-app messages',
        inAppMessagesHint:
            'Show toast messages for route and favourite changes.',
        autoFitRoute: 'Auto-fit route',
        autoFitRouteHint: 'Frame the whole route when a map opens.',

        routesOnThisDevice: 'Routes on this device',
        saveToMyAccount: 'Save to my account',
        saving: 'Saving…',
        discardLocalRoutes: 'Discard local routes',
        signInToEnable: 'Sign in from the Profile tab to enable this.',
        preferencesApplyToDevice: 'Preferences apply to this device only.',

        discardTitle: 'Discard local routes',
        discardConfirm: 'Discard',
        /** `count` routes will be deleted from this device. */
        discardMessage_one:
            '{{count}} route will be deleted from this device. This cannot be undone.',
        discardMessage_other:
            '{{count}} routes will be deleted from this device. This cannot be undone.',

        routesReady_one:
            '{{count}} route with {{stops}} can be saved to your account.',
        routesReady_other:
            '{{count}} routes with {{stops}} can be saved to your account.',
        routesPending_one:
            '{{count}} route with {{stops}} will be saved to your account once you sign in.',
        routesPending_other:
            '{{count}} routes with {{stops}} will be saved to your account once you sign in.',
        stopCount_one: '{{count}} stop',
        stopCount_other: '{{count}} stops',
    },

    notificationSettings: {
        title: 'Notifications',
        inApp: 'In the app',
        inAppHint: 'New routes from people you follow appear in Notifications.',
        email: 'By email',
        emailHint: 'And a message to your inbox when they publish one.',
        couldNotLoad:
            'Your notification settings could not be loaded. They are unchanged.',
    },

    profile: {
        loading: 'Loading profile…',
        yourAccount: 'Your account',
        editProfile: 'Edit profile',
        editProfileHint: 'Your photo, name and nickname',
        notifications: 'Notifications',
        notificationsHint: 'New routes from the people you follow',
        settings: 'Settings',
        settingsHint: 'Theme, language, notifications and map behaviour',
        privacy: 'Privacy',
        kvkkConsent: 'KVKK consent',
        kvkkHint: 'What you have agreed to, and how to withdraw it',
        signOut: 'Sign out',
        signingOut: 'Signing out…',
        editProfileOf: 'Edit the profile of {{name}}',
    },

    notifications: {
        title: 'Notifications',
        loading: 'Loading notifications…',
        signedOutTitle: 'Sign in to see notifications',
        signedOutMessage:
            'Follow the people whose routes you want to hear about, and their new ones show up here.',
        errorTitle: 'Could not load your notifications',
        errorMessage: 'Check your connection and try again.',
        emptyTitle: 'Nothing yet',
        emptyMessage:
            'Tap “Notify me” on somebody’s profile, and their next published route turns up here.',
        clearAll: 'Clear all notifications',
        clearTitle: 'Clear notifications',
        clearMessage: 'This removes every notification. It cannot be undone.',
        clearConfirm: 'Clear',
        openSettings: 'Notification settings',
        publishedARoute: '{{name}} published a route',
        noLongerAvailable: 'This route is no longer available',
    },

    map: {
        opening: 'Opening the map…',
        saveRoute: 'Save route',
        savingRoute: 'Saving…',
        saveRouteAccessibility: 'Save this route to my account',
        savedOnThisDevice: 'Saved on this device',
        lookingUpPlace: 'Looking up that place…',
        newRoute: 'New route',
        onTheWay: 'On the way',
        onTheWayCount: '{{count}} on the way',
    },

    auth: {
        welcomeBack: 'Welcome back',
        welcomeBackSubtitle: 'Sign in to pick up where you left off.',
        noAccount: "Don't have an account?",
        signUp: 'Sign up',
        email: 'Email',
        emailPlaceholder: 'you@example.com',
        password: 'Password',
        passwordPlaceholder: 'Your password',
        forgotPassword: 'Forgot password?',
        continueWithGoogle: 'Continue with Google',
        signUpWithGoogle: 'Sign up with Google',
        createAccount: 'Create your account',
        createAccountSubtitle:
            'Plan routes and save the places you care about.',
        haveAccount: 'Already have an account?',
        or: 'or',
    },

    actions: {
        tryAgain: 'Try again',
        close: 'Close',
        clearSearch: 'Clear search',
        remove: 'Remove',
        delete: 'Delete',
        share: 'Share',
        notNow: 'Not now',
        goToSettings: 'Go to Settings',
        getStarted: 'Get started',
        createAccount: 'Create account',
        sendCode: 'Send code',
        verifyCode: 'Verify code',
        backToSignIn: 'Back to sign in',
        changePassword: 'Change password',
        updatePassword: 'Update password',
        saveToFavourites: 'Save to my favourites',
        makeACopy: 'Make a copy I can edit',
        switchRoute: 'Switch route',
        show: 'Show',
        order: 'Order',
        filter: 'Filter',
    },

    fields: {
        description: 'Description',
        email: 'Email',
        password: 'Password',
        confirmPassword: 'Confirm password',
        repeatPassword: 'Repeat your password',
        newPassword: 'New password',
        confirmNewPassword: 'Confirm new password',
        repeatNewPassword: 'Repeat the new password',
        currentPassword: 'Current password',
        currentPasswordPlaceholder: 'Your current password',
        emailPlaceholder: 'you@example.com',
        emailUnchangeable: 'Your email address cannot be changed.',
        title: 'Title',
    },

    states: {
        checkConnection: 'Check your connection and try again.',
        couldNotLoadProfile: 'Could not load your profile',
        loadingProfile: 'Loading profile…',
        loadingRoute: 'Loading route…',
        loadingStop: 'Loading stop…',
        loadingRoutes: 'Loading routes…',
        loadingFavourites: 'Loading favourites…',
        searching: 'Searching…',
    },

    home: {
        routes: 'Routes',
        stops: 'Stops',
        favourites: 'Favourites',
        signInToStart: 'Sign in to get started',
        syncHint: 'Your routes and favourites, on every device.',
        discover: 'Discover',
        shuffle: 'Show different routes',
        greeting: 'Hello, {{name}} 👋',
        traveller: 'traveller',
        lookingForRoutes: 'Looking for published routes…',
        noneYet:
            'Nobody has published a route yet. Publish one of yours from its edit screen and it will show up here for everyone.',
    },

    travelMap: {
        opening: 'Opening your travel map…',
        searchPlace: 'Search a country, city or place',
        lookingUpPlace: 'Looking up that place…',

        // The card on the home screen.
        title: 'Travel map',
        invitation: 'Colour in the countries and cities you have been to',
        colouredIn: '{{summary}} coloured in',

        // The card a tap or a search puts up.
        markIt: 'Colour it in',
        unmarkIt: 'Remove from my map',
        dismiss: 'Dismiss',
        alsoHere: '{{name}}, {{kind}}',

        // The list under the map.
        nothingMarked: 'Nothing marked yet',
        markSomething: 'Tap the map or search to colour somewhere in',
        onYourMap: 'On your travel map',
        marked_one: '{{count}} place marked',
        marked_other: '{{count}} places marked',
        showList: '{{places}} marked. Show the list.',
        hideList: '{{places}} marked. Hide the list.',
        showOnMap: 'Show {{name}} on the map',
        removeFromMap: 'Remove {{name}} from my travel map',
        clearMap: 'Clear the map',

        countries_one: '{{count}} country',
        countries_other: '{{count}} countries',
        cities_one: '{{count}} city',
        cities_other: '{{count}} cities',
        places_one: '{{count}} place',
        places_other: '{{count}} places',

        kindCountry: 'Country',
        kindRegion: 'Region',
        kindCity: 'City',
        kindDistrict: 'District',
        kindPlace: 'Place',

        clearTitle: 'Clear the travel map',
        clearConfirm: 'Clear',
        clearMessage_one:
            '{{count}} marked place will be removed from this device. This cannot be undone.',
        clearMessage_other:
            '{{count}} marked places will be removed from this device. This cannot be undone.',

        marked: '{{name}} marked',
        markedMessage: 'It is on your travel map now.',
        nothingHere: 'Nothing is mapped here',
        nothingHereMessage:
            'Try a little further inland, or search for the place.',
        lookupFailed: 'Could not look that up',
        lookupFailedMessage:
            'The map service did not answer. Try again in a moment.',
    },

    favorites: {
        title: 'Favourites',
        tabRoutes: 'Routes',
        tabPlaces: 'Places',
        signedOutTitle: 'Sign in to keep favourites',
        signedOutMessage:
            'Save a route or a stop and it will be waiting here on any device.',
        errorTitle: 'Could not load favourites',
        emptyTitle: 'Nothing saved yet',
        emptyMessage: 'Save a route or a place and it will show up here.',
        noMatchesTitle: 'No matches',
        noMatchesMessage: 'Nothing under {{tab}} matches “{{term}}”.',
        noRoutesTitle: 'No saved routes yet',
        noRoutesMessage: 'The heart on a route saves it here.',
        noPlacesTitle: 'No saved places yet',
        noPlacesMessage: 'The heart on a stop saves the place here.',
        searchPlaceholder: 'Search favourites',
        ownRoutes: 'My routes',
        ownStops: 'My places',
        removedByOwner: 'Removed by its owner · your copy still works',
        shownOfTotal: '{{shown}} of {{total}} shown',
        routeCount_one: '{{count}} route',
        routeCount_other: '{{count}} routes',
        placeCount_one: '{{count}} place',
        placeCount_other: '{{count}} places',
        othersRoutes: 'Others’ routes',
        othersStops: 'Others’ places',
        sectionAccessibility: '{{title}}, {{count}} items',
    },

    routes: {
        title: 'My Routes',
        signedOutTitle: 'Sign in to see your routes',
        signedOutMessage:
            'Your saved routes live with your account. The Map tab works without one.',
        errorTitle: 'Could not load routes',
        emptyTitle: 'No routes yet',
        emptyMessage:
            'Create a route to start planning stops and comparing travel times.',
        editRoute: 'Edit route',
        routeDetails: 'Route details',
        unavailableTitle: 'Route unavailable',
        unavailableMessage: 'It may have been unpublished by its owner.',
        sharedOpening: 'Opening shared route…',
        sharedGoneTitle: 'This link no longer works',
        sharedGoneMessage:
            'Shared links expire, and the route behind this one may have been deleted by its owner.',
        stopNotFoundTitle: 'Stop not found',
        stopNotFoundMessage: 'It may have been removed from the route.',
        saved: 'Saved',
        readOnly: 'Read only',
        searchAlong: 'Search for places along this route',
        nothingSavedYet: 'Nothing saved yet',
        stopCount_one: '{{count}} stop',
        stopCount_other: '{{count}} stops',
        routeCount_one: '{{count}} route',
        routeCount_other: '{{count}} routes',
        public: 'Public',
        private: 'Private',
    },

    searchScreen: {
        errorTitle: 'Search is not answering',
        authorErrorTitle: 'Could not load these routes',
        authorEmptyTitle: 'Nothing here',
        notifyHint: 'We will email you when they publish a new route.',
        notifyingYou: 'Notifying you',
        tabRoutes: 'Routes',
        tabPeople: 'People',
        routeCount_one: '{{count}} route',
        routeCount_other: '{{count}} routes',
        personCount_one: '{{count}} person',
        personCount_other: '{{count}} people',
        authorNoPublic: '{{name}} has no public routes right now.',
        authorNoneOfLength: '{{name}} has no routes of that length.',
        keepTyping: 'Keep typing — two letters at least.',
        nothingMatches: 'Nothing matches “{{term}}”.',
        searchRoutesHint:
            'Search published routes, or browse the newest below.',
        searchPeopleHint: 'Search for someone who has published a route.',
        noMatchesTitle: 'No matches',
        searchTitle: 'Search',
        authorNoMatches: '{{name}} has nothing that matches these filters.',
    },

    welcome: {
        tagline: 'Plan your journey, every step of the way.',
        planTitle: 'Plan',
        exploreTitle: 'Explore',
        keepTitle: 'Keep',
        planBody: 'Drop stops, put them in order.',
        exploreBody: 'Find food and fuel on the way.',
        keepBody: 'Saved to every device you use.',
    },

    resetPassword: {
        forgotTitle: 'Reset your password',
        enterCodeTitle: 'Enter your code',
        lockedTitle: 'Reset locked',
        chooseNewTitle: 'Choose a new password',
        newPasswordPlaceholder: 'Repeat your new password',
        changeTitle: 'Change password',
        changeHint: 'Enter your current password to set a new one.',
        forgotSubtitle:
            'We will email you a {{length}}-digit code. It expires shortly after it arrives.',
        chooseNewSubtitle:
            'At least {{length}} characters, with a letter and a number. Signing in again will be required on every device.',
        lockedBody:
            'Too many incorrect codes were entered for {{email}}. For security, you can try again in {{wait}}.',
        codeSentTo: 'We sent a {{length}}-digit code to {{email}}.',
        changedHeader: 'Password changed',
        changedMessage: 'Sign in with your new password.',
    },

    mapUi: {
        newRouteAccessibility: 'Start a new route',
        importAccessibility: 'Import a route from a Google Maps link',
        editDetailsAccessibility: 'Edit route name and description',
        deleteRouteAccessibility: 'Delete this route',
        centreOnMe: 'Centre the map on my location',
        searchPlace: 'Search for a place',
        closeSearch: 'Close search',
        searchAnything: 'Anything: sushi, car wash, playground…',
        openNow: 'Open now',
        closed: 'Closed',
        noStopsTitle: 'No stops yet',
        noStopsMessage: 'Long press anywhere on the map to add the first one.',
        stopHint: 'Tap to compare, long press to reorder',
        continueInGoogleMaps: 'Continue in Google Maps',
        continueInGoogleMapsAccessibility: 'Continue this route in Google Maps',
        localHint: 'Saved on this device until you sign in and upload it.',
        editRouteDetailsAccessibility: 'Edit route details',
        navigateToStop: 'Navigate to this stop',
        navigateAllStops: 'Navigate all {{count}} stops',
        unnamedStop: 'Unnamed stop',
        selectedLeg: 'Selected leg',
        wholeRoute: 'Whole route',
        tapToClear: 'Tap the highlighted stops again to clear',
        tapTwoStops: 'Tap two stops to compare a single leg',
        changeProfilePhoto: 'Change profile photo',
        withinOfRoute: 'Within {{distance}} of your route',
        addSecondStop: 'Add a second stop to search along a route',
        offRoute: '{{distance}} off route',
        walking: 'Walking',
        driving: 'Driving',
        transit: 'Transit',
        addToFavourites: 'Add to favourites',
        removeFromFavourites: 'Remove from favourites',
        copyAddress: 'Copy address',
        deleteStop: 'Delete stop',
        moveStop: 'Move stop',
        addStopHere: 'Add stop here',
    },

    importModal: {
        title: 'Import from Google Maps',
        intro: 'Share a route from Google Maps, then paste the link here.',
        caveat: 'Stops are matched through Google, so check them before adding.',
        closeAccessibility: 'Close import',
        linkPlaceholder: 'https://maps.app.goo.gl/…',
        linkAccessibility: 'Google Maps link',
        pasteAccessibility: 'Paste from clipboard',
        namePlaceholder: 'Route name',
        nameAccessibility: 'Route name',
        add: 'Add to my routes',
    },

    editDetails: {
        namePlaceholder: 'Give it a name',
        notesPlaceholder: 'Optional notes',
        shareWithCommunity: 'Share with the community',
        shareAccessibility: 'Share this route with the community',
        shareHint:
            'Your name and this route’s stops become visible to everyone on the Home screen.',
    },

    localRoutes: {
        keepTitle: 'Keep your routes?',
        keepBody_one:
            'You have {{count}} route saved on this device. Save it to your account so it is available everywhere you sign in.',
        keepBody_other:
            'You have {{count}} routes saved on this device. Save them to your account so they are available everywhere you sign in.',
    },

    toast: {
        error: 'Error',
        nothingToCopy: 'Nothing to copy',
        noAddressYet: 'This stop has no address yet.',
        addressCopied: 'Address copied',
        couldNotCopy: 'Could not copy that address.',
        dragToMove: 'Drag to move',
        dragHint: 'Drag the highlighted pin to its new position.',
        addedToRoute: 'Added to your route',
        routeImported: 'Route imported',
        couldNotLookUpPlace: 'Could not look up that place.',
        failedToAddStop: 'Failed to add stop.',
        failedToDeleteStop: 'Failed to delete stop.',
        failedToMoveStop: 'Failed to update stop location.',
        couldNotSave: 'Could not save',
        changesNotApplied: 'Your changes were not applied.',
        changesNotAppliedRetry:
            'Your changes were not applied. Please try again.',
        couldNotRemoveFavourite: 'Could not remove that favourite.',
        nothingToNavigate: 'Nothing to navigate',
        addAStopFirst: 'Add a stop to this route first.',
        routeShortened: 'Route shortened',
        couldNotOpenGoogleMaps: 'Could not open Google Maps',
        nothingCouldOpen: 'Nothing on this phone could open the route.',
        routeCouldNotLoad: 'This route could not be loaded. Please try again.',
        photoAccessNeeded: 'Photo access needed',
        photoTooLarge: 'That photo is too large',
        couldNotOpenPhotos: 'Could not open your photos',
        uploadFailed: 'Upload failed',
        updateFailed: 'Update failed',
        passwordChanged: 'Password changed',
        passwordNotChanged: 'Password not changed',
        locationPermissionNeeded: 'Location permission needed',
        locationUnavailable: 'Location unavailable',
        signInAlreadyOpen:
            'Another sign-in is already open. Finish or close it first.',
        googleSignInIncomplete: 'Google sign-in did not complete.',
        locationPermissionMessage:
            'Allow location access to centre the map on your position.',
        locationUnavailableMessage:
            'Your position could not be read. Try again in a moment.',
        photoUploadFailed:
            'Your photo could not be uploaded. Please try again.',
        profileSaveFailed: 'Could not save your profile. Please try again.',
        passwordCheckCurrent: 'Check your current password and try again.',
        placeIsNowAStop: '{{name}} is now a stop on this route.',
        stopsAddedFromGoogle_one: '{{count}} stop added from Google Maps.',
        stopsAddedFromGoogle_other: '{{count}} stops added from Google Maps.',
        routeShortenedMessage:
            'Google Maps takes {{limit}} stops between the ends, so {{omitted}} of yours were left out.',
        googleRefused: 'Google refused the sign-in request.',
        photoAccessMessage: 'Allow photo access to choose a profile picture.',
        photoTooLargeMessage: 'Profile pictures must be under {{limit}}.',
        photoPickerFailed: 'The photo picker did not open. Please try again.',
        couldNotDeleteStop: 'Could not delete that stop.',
        couldNotUpdateFavourites: 'Could not update favourites.',
        followPermissionMessage:
            'Allow location access to follow your progress along the route.',
        followUnavailableMessage:
            'Your position could not be read, so following was switched off.',
    },

    dialogs: {
        signOutTitle: 'Sign out',
        signOutMessage: 'You will need to sign in again to continue.',
        deleteRouteTitle: 'Delete route',
        removeRouteTitle: 'Remove route',
        removeFavouriteTitle: 'Remove favourite',
        shareRouteTitle: 'Share this route',
        clearNotificationsTitle: 'Clear notifications',
        deleteRouteMessage_one:
            '“{{title}}” and its {{count}} stop will be removed from this device.',
        deleteRouteMessage_other:
            '“{{title}}” and its {{count}} stops will be removed from this device.',
        removeFavouriteMessage:
            '“{{title}}” will be removed from your favourites.',
        removeRouteMessage:
            '“{{title}}” leaves your list and stops being shared. Anyone who saved it keeps their copy.',
        shareRouteMessage:
            '“{{title}}” and its stops become visible to everyone, next to your name. You can stop sharing at any time.',
    },

    nav: {
        communityRoute: 'Community route',
        travelMap: 'Travel map',
        sharedRoute: 'Shared route',
        createAccount: 'Create account',
        signIn: 'Sign in',
        forgotPassword: 'Forgot password',
        enterCode: 'Enter code',
        newPassword: 'New password',
    },

    forms: {
        bothFieldsRequired: 'Both fields are required.',
        allFieldsRequired: 'All fields are required.',
        validEmail: 'Enter a valid email address.',
        passwordsDoNotMatch: 'Passwords do not match.',
        passwordNeedsLetterAndNumber:
            'Include at least one letter and one number.',
        couldNotSendCode: 'Could not send the code. Please try again.',
        unableToSignIn: 'Unable to sign in right now.',
        showPassword: 'Show password',
        hidePassword: 'Hide password',
        resetLinkInvalid:
            'That reset link is no longer valid. Request a new code and try again.',
        codeIncorrect: 'That code is incorrect or has expired.',
        couldNotResend: 'Could not send a new code. Please try again.',
        resendIn: 'Resend code in {{seconds}}s',
        sendNewCode: 'Send a new code',
        enterCurrentPassword: 'Enter your current password.',
        passwordReused: 'Choose a password you have not used here before.',
        wrongCurrentPassword: 'That is not your current password.',
        couldNotChangePassword:
            'Could not change your password. Please try again.',
        firstName: 'First name',
        lastName: 'Last name',
        nickNameHint: 'The name shown on the routes you publish.',
        saveChanges: 'Save changes',
        nothingToSave: 'Nothing to save',
        nickName: 'Nickname',
    },

    defaults: {
        newRoute: 'New route',
        myRoute: 'My route',
        untitledRoute: 'Untitled route',
        importedRoute: 'Imported route',
        droppedPin: 'Dropped pin',
        savedPlace: 'Saved place',
        yourProfile: 'Your profile',
        locating: 'Locating…',
        searchRoutesAndPeople: 'Search routes and people',
        editDetails: 'Edit details',
        routeName: 'Route name',
        yourLabel: 'Your label',
        renameRoute: 'Rename route',
        renamePlace: 'Rename place',
        publishedRoutes: 'Published routes',
        notifyMe: 'Notify me',
        openRoute: 'Open route',
        openPlace: 'Open place',
        shareALink: 'Share a link',
        deleteRoute: 'Delete route',
        tapToChangePhoto: 'Tap to change your photo',
        uploading: 'Uploading…',
        dragToReposition: 'Drag to reposition',
        followMyPosition: 'Follow my position along the route',
        stopFollowingMyPosition: 'Stop following my position along the route',
        readTheLink: 'Read the link',
        readingTheLink: 'Reading the link…',
        routesSaved: 'Routes saved',
        someRoutesFailed: 'Some routes failed',
    },

    sorting: {
        inOrder: 'In order',
        topRated: 'Top rated',
        mostSaved: 'Most saved',
        mostStops: 'Most stops',
        anyLength: 'Any length',
        eat: 'Eat',
        coffee: 'Coffee',
        fuel: 'Fuel',
        stay: 'Stay',
        groceries: 'Groceries',
        pharmacy: 'Pharmacy',
        atm: 'ATM',
        parking: 'Parking',
        see: 'See',
        park: 'Park',
        closest: 'Closest',
        newest: 'Newest',
        oldest: 'Oldest',
        alphabetical: 'A–Z',
        shortRoutes: '2–4 stops',
        mediumRoutes: '5–9 stops',
        longRoutes: '10+ stops',
    },

    errors: {
        pickAKind: 'Pick a kind of place, or type what you are after.',
        lookingAlongRoute: 'Looking along your route…',
        nothingOfTheSort:
            'Nothing of the sort along this route. Try a wider radius.',
        couldNotSearchAlong: 'Could not search along this route.',
        notARoute:
            'That link has no route in it. Open a route in Google Maps, use Share, and paste the link it gives you.',
        noStopsFound: 'None of those stops could be found.',
        couldNotReadLink: 'Could not read that link. Check your connection.',
        couldNotLoadRouteToUpdate: 'Could not load the route to update it.',
        googleNoCode: 'Google returned no authorization code.',
        googleUnreachable:
            'Could not reach the server. Check that the app points at an address this device can open.',
        googleTimedOut: 'The server took too long to answer. Try again.',
        googleSlow:
            'Google took too long to answer. Check the connection and try again.',
        googleStillStarting:
            'Google sign-in is still starting up. Try again in a moment.',
        googleFailed: 'Google sign-in failed.',
        serverAnswered: 'The server answered {{status}}.',
    },
} as const;

/**
 * What every other locale has to fill in: the same keys, any wording.
 *
 * Derived from this file rather than declared separately, so adding a string
 * here is what makes the translations incomplete — there is no second list to
 * remember to update.
 */
export type Translations = {
    [Namespace in keyof typeof en]: Record<
        keyof (typeof en)[Namespace],
        string
    >;
};

export default en;
