const en = {
  common: {
    somethingWentWrong: 'Something went wrong',
    notFound: 'Not found',
    unauthorized: 'You need to sign in first',
    forbidden: 'You are not allowed to do that',
    tooManyRequests: 'Too many requests. Please wait a moment and try again.',
    validationFailed: 'Some of the details you entered were not accepted',
  },

  error: {
    invalidRequest: 'Please check your details',
    notSignedIn: 'Not signed in',
    notAllowed: 'Not allowed',
    notFoundHeader: 'Not found',
    conflict: 'Already taken',
    tooLarge: 'Too large',
    slowDown: 'Slow down',
    somethingWentWrongHeader: 'Something went wrong',
    temporarilyUnavailable: 'Temporarily unavailable',
    genericHeader: 'Error',

    valueTooLong: 'One of the values is too long.',
    valueTaken: 'That value is already taken.',
    referenceMissing: 'Something this refers to no longer exists.',
    valueMissing: 'A required value is missing.',
    breaksRelation: 'That change would break a link other data depends on.',
    recordGone: 'What you asked for no longer exists.',
    valueNotAllowed: 'One of the values is not allowed.',

    serviceUnavailable:
      'The service is temporarily unavailable. Please try again shortly.',
    unexpected: 'Something unexpected went wrong. Please try again.',

    fileTooLarge: 'That file is too large to upload.',
    fileWrongField:
      'The file was sent in a field this request does not accept.',
    fileTooMany: 'You can upload only one file at a time.',
    uploadUnreadable: 'The upload could not be read.',

    adminsOnly: 'Only administrators can do that.',
    emailTaken: 'An account with this email address already exists.',
    emailUsesGoogle:
      'This email address belongs to an account that signs in with Google. Choose “Continue with Google” instead.',
    imageRequired: 'Please choose an image file.',
    currentPasswordWrong: 'Your current password is incorrect.',
    googleStateExpired:
      'The Google sign-in request has expired. Please try again.',
    emailSendFailed: 'The email could not be sent.',
    favoriteRouteNotFound: 'That favourite route could not be found.',
    favoriteStopNotFound: 'That favourite place could not be found.',
    googleNoEmail: 'Your Google account has no email address.',
    googleEmailUnverified: 'Your Google email address has not been verified.',
    googleSignInFailed: 'Google sign-in failed.',
    imageTooLarge: 'Images must be 5 MB or smaller.',
    googleStateInvalid:
      'The Google sign-in request is not valid. Please try again.',
    googleStateMalformed:
      'The Google sign-in request could not be read. Please try again.',
    googleStateMissing:
      'The Google sign-in request is incomplete. Please try again.',
    badCredentials: 'The email address or password is incorrect.',
    sessionExpired: 'Your session has expired. Please sign in again.',
    mailUnavailable: 'The email service is unavailable at the moment.',
    mapsBusy: 'The map service is busy. Please try again in a moment.',
    mapsUnavailable: 'The map service is unavailable at the moment.',
    mapsFailed: 'The map service returned an error.',
    mapsNotConfigured: 'Map look-ups are not set up on this server.',
    googleNotConfigured: 'Google sign-in is not set up on this server.',
    googleTokenMissing: 'The Google sign-in token is missing.',
    googleCodeMissing: 'The authorisation code is missing.',
    passwordUnchanged:
      'Your new password must be different from your current one.',
    nothingToUpdate: 'There was nothing to update.',
    notAuthenticated: 'You need to be signed in.',
    permissionIdsUnknown: 'One or more of those permissions do not exist.',
    imageWrongType: 'Only JPEG, PNG and WebP images are accepted.',
    photoStoreUnavailable:
      'Photos cannot be saved at the moment. Please try again later.',
    missingIdentifier:
      'The request does not say which route or stop it is for.',
    resetTokenInvalid: 'This reset link is invalid or has expired.',
    resetCodeInvalid: 'That code is incorrect or has expired.',
    routeNotFound: 'Route not found.',
    stopNotFound: 'Stop not found.',
    personNotFound: 'This person has not published any routes.',
    sharedRouteGone: 'The shared route no longer exists.',
    noPasswordLogin: 'This account does not sign in with a password.',
    nicknameTaken: 'That nickname is already taken.',
    tokenNoSubject: 'The sign-in token does not say who it belongs to.',
    userIdRequired: 'A user ID is required.',
    userExists: 'This account already exists.',
    userNotFound: 'Account not found.',
    cannotFollowSelf: 'You already hear about your own routes.',
    noAccess: 'You do not have access to this.',
    notYourRoute: 'This route belongs to someone else.',
    ownProfileOnly: 'You can only view your own profile.',
    passwordsDoNotMatch: 'The passwords do not match.',
    roadIdMismatch:
      'The route in the request body does not match the one in the address.',
    stopIdRequired: 'A stop ID is required.',
    stopPositionOutOfRange: 'That position does not exist on this route.',
  },

  consent: {
    withdrawnHeader: 'Account deleted',
    withdrawnMessage:
      'Your consent has been withdrawn, and your account and everything in it have been permanently deleted.',
  },

  notification: {
    header: 'Notifications',
    fetched: 'Notifications loaded',
    nothingNew: 'Nothing new',
    markedRead: 'Marked as read',
    nothingUnread: 'There was nothing unread',
    cleared: 'Notifications cleared',
    nothingToClear: 'There was nothing to clear',
    settingsHeader: 'Notification settings',
    saved: 'Saved',
  },

  follow: {
    following: 'Following',
    notFollowing: 'Not following',
    willHear: 'We will let you know when they publish their next route.',
    willNotHear: 'You will no longer hear about their new routes.',
  },

  email: {
    publishSubject: '{{author}} has published a new route',
    publishBody: '{{author}} has just published “{{title}}”.',
    publishOpenHere: 'Open it here: {{link}}',
    publishOpenApp: 'Open Travel Routes to see it.',
    publishAction: 'Open the route',
    publishFooter:
      'You are receiving this email because you asked to hear about their new routes. You can turn this off on their profile in the app.',

    resetSubject: 'Reset your password',
    resetBody: 'Follow this link to reset your password: {{link}}',
    resetCodeSubject: 'Your password reset code',
    resetCodeBody:
      'Your password reset code is {{code}}. It expires in {{minutes}} minutes.',
    resetCodeIgnore:
      'If you did not ask for this, you can safely ignore this email.',
  },

  favorite: {
    removedHeader: 'Removed from favourites',
    stopRemoved: 'The place has been removed from your favourites.',
    addedHeader: 'Added to favourites',
    stopAdded: 'The place has been added to your favourites.',
    alreadyHeader: 'Already a favourite',
    stopAlready: 'This place is already in your favourites.',
    routeRemoved: 'The route has been removed from your favourites.',
    routeAdded: 'The route has been added to your favourites.',
    routeAlready: 'This route is already in your favourites.',
    allHeader: 'Favourites',
    retrieved: 'Your favourites have been loaded.',
    updatedHeader: 'Favourite updated',
    changesSaved: 'Your changes have been saved.',
  },

  auth: {
    resetRequestedHeader: 'Check your email',
    resetRequestedMessage:
      'If an account exists for that address, we have sent it a reset code.',
    signupHeader: 'Welcome aboard',
    signupMessage: 'Your account has been created.',
    loginHeader: 'Signed in',
    loginMessage: 'Welcome back.',
    logoutHeader: 'Signed out',
    logoutMessage: 'You have been signed out.',
    codeVerifiedHeader: 'Code verified',
    codeVerifiedMessage: 'Now choose a new password to finish.',
    resetDoneHeader: 'Password reset',
    resetDoneMessage:
      'Your password has been reset. Sign in with your new password.',
    changedHeader: 'Password changed',
    changedMessage: 'Your password has been updated.',
    googleHeader: 'Signed in with Google',
    googleCreated: 'Your account has been created and you are now signed in.',
    googleSignedIn: 'You are signed in with your Google account.',
    googlePasswordRemoved:
      'You are signed in with Google. The password on this account has been removed because its email address had never been confirmed; you can set a new one with “Forgotten your password?”.',
  },

  road: {
    createdHeader: 'Route created',
    createdMessage: 'Your route has been created.',
    foundHeader: 'Route',
    foundMessage: 'Route loaded.',
    ownHeader: 'Your routes',
    ownMessage: 'Your routes have been loaded.',
    discoverHeader: 'Discover routes',
    discoverEmpty: 'No routes have been published yet.',
    discoverMessage: 'Published routes loaded.',
    copiedHeader: 'Route copied',
    copiedMessage: 'The copy is yours to edit.',
    updatedHeader: 'Route updated',
    updatedMessage: 'Your changes have been saved.',
    removedHeader: 'Route removed',
    removedMessage: 'The route has been removed from your list.',
  },

  stop: {
    foundHeader: 'Stop',
    foundMessage: 'Stop loaded.',
    addHeader: 'Stop added',
    addMessage: 'The stop has been added to your route.',
    deleteHeader: 'Stop deleted',
    deleteMessage:
      'The stop has been deleted and the remaining stops renumbered.',
    updateHeader: 'Stop updated',
    updateMessage: 'The stop has been updated.',
    reorderHeader: 'Stops reordered',
    reorderMessage: 'The new order has been saved.',
  },

  permit: {
    assignedHeader: 'Permit assigned',
    assigned: '{{name}} now holds the {{permit}} permit.',
    updatedHeader: 'Permit updated',
    updated: 'The {{permit}} permit has been updated.',
  },

  user: {
    photoHeader: 'Photo updated',
    photoMessage: 'Your profile photo has been updated.',
    photoNotFound: 'Photo not found.',
    updatedHeader: 'Profile updated',
    updatedMessage: 'Your profile has been saved.',
    peopleHeader: 'People',
    peopleFound: 'People found.',
    peopleNone: 'Nobody matches that search.',
    authorHeader: 'Author',
    authorMessage: 'Author loaded.',
    fetchedHeader: 'Profile',
    fetchedMessage: 'Profile loaded.',
    anonymousName: 'A traveller',
    dashboardWelcome: 'Welcome to the admin dashboard.',
  },

  route: {
    header: 'Route',
    tooShort: 'A route needs at least two stops.',
    calculated: 'Route calculated.',
    none: 'There is no route between those points.',
    durationsHeader: 'Travel times',
    durationsCalculated: 'Travel times calculated.',
  },

  terrain: {
    header: 'Terrain',
    calculated: 'Terrain calculated.',
    nothingToMeasure: 'There is nothing to measure along this route.',
  },

  search: {
    header: 'Route search',
    found: 'Routes found.',
    none: 'No routes match that search yet.',
  },

  maps: {
    addressHeader: 'Address found',
    addressMessage: 'The address has been looked up.',
    areasHeader: 'Places here',
    areasNone: 'Nothing is mapped at this spot.',
    areasFound: {
      one: '{{count}} place covers this spot',
      other: '{{count}} places cover this spot',
    },
    placesHeader: 'Places',
    placesMessage: 'Suggestions loaded.',
    placeHeader: 'Place',
    placeFound: 'Place found.',
    placeNoLocation: 'That place has no location.',
    alongHeader: 'Along your route',
    alongNothing: 'Nothing matching was found along this route.',
    alongFound: {
      one: '{{count}} place along your route',
      other: '{{count}} places along your route',
    },
    alongPartial: {
      one: '{{count}} place along part of your route',
      other: '{{count}} places along part of your route',
    },
  },

  validation: {
    required: '{{field}} is required',
    mustBeText: '{{field}} must be text',
    mustBeYesOrNo: '{{field}} must be yes or no',
    mustBeWholeNumber: '{{field}} must be a whole number',
    mustBeNumber: '{{field}} must be a number',
    mustBeList: '{{field}} must be a list',
    mustBeOneOf: '{{field}} must be one of: {{values}}',
    mustBeEmail: '{{field}} must be a valid email address',
    mustBeUrl: '{{field}} must be a valid web address',
    mustBeDate: '{{field}} must be a valid date',
    mustBeId: '{{field}} must be a valid ID',
    mustBeToken: '{{field}} must be a valid token',
    mustBeLatitude: '{{field}} must be a valid latitude',
    mustBeLongitude: '{{field}} must be a valid longitude',
    wrongFormat: '{{field}} is not in the expected format',
    tooShort: '{{field}} must be at least {{bound}} characters',
    tooLong: '{{field}} must be at most {{bound}} characters',
    tooSmall: '{{field}} must be {{bound}} or more',
    tooBig: '{{field}} must be {{bound}} or less',
    tooFewItems: '{{field}} must have at least {{bound}} entries',
    tooManyItems: '{{field}} must have at most {{bound}} entries',

    passwordPattern:
      'Your password must contain at least one letter and one number',
    nickNamePattern:
      'Nicknames may contain only letters, numbers, dots, underscores and hyphens',
    resetCodeLength: 'The code must be {{bound}} digits long',
    searchNeedsTerm:
      'Enter something to search for, choose a category, or both',
    searchTermLength:
      'The search text must be between {{bound}} and 255 characters long',
  },

  field: {
    address: 'Address',
    authorId: 'Author',
    category: 'Category',
    code: 'Code',
    confirmPassword: 'Password confirmation',
    currentPassword: 'Current password',
    description: 'Description',
    destination: 'Destination',
    email: 'Email',
    firstName: 'First name',
    lastName: 'Last name',
    idToken: 'Google sign-in token',
    inApp: 'In-app notifications',
    input: 'Search text',
    isPublic: 'Public',
    latitude: 'Latitude',
    limit: 'Page size',
    longitude: 'Longitude',
    maxStops: 'Maximum stops',
    minStops: 'Minimum stops',
    minRating: 'Minimum rating',
    mode: 'Travel mode',
    modes: 'Travel modes',
    newPassword: 'New password',
    nickName: 'Nickname',
    offset: 'Page offset',
    openNow: 'Open now',
    optimize: 'Optimise order',
    order: 'Order',
    origin: 'Starting point',
    password: 'Password',
    permissionIds: 'Permissions',
    permitId: 'Permit',
    photo: 'Photo',
    q: 'Search text',
    query: 'Search text',
    radiusMeters: 'Search radius',
    refreshToken: 'Session token',
    roadId: 'Route',
    sessionToken: 'Session token',
    sort: 'Sort order',
    sortBy: 'Sort order',
    stopId: 'Stop',
    stops: 'Stops',
    title: 'Title',
    type: 'Type',
    userId: 'User',
    waypoints: 'Stops',
    follow: 'Follow',
    from: 'From',
    to: 'To',
    id: 'ID',
    language: 'Language',
    hasMore: 'Has more',
    total: 'Total',
    noticeVersion: 'Notice version',
    acceptedAt: 'Date of consent',
    events: 'Events',
    name: 'Name',
    detail: 'Detail',
    days: 'Number of days',
  },
} as const;

export interface PluralForms {
  one: string;
  other: string;
}

export type Translations = {
  [Namespace in keyof typeof en]: {
    [
      Key in keyof (typeof en)[Namespace]
    ]: (typeof en)[Namespace][Key] extends string ? string : PluralForms;
  };
};

export default en;
