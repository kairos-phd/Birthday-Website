export const copyGroups = {
  "Page & navigation": {
    "pageTitle": "Happy birthday, {recipient} — A little celebration",
    "pageDescription": "A birthday celebration for {fullName}. Memories, a letter, and a little surprise.",
    "brand": "a little celebration.",
    "navLetter": "The letter",
    "navMemories": "Our memories",
    "navWish": "Make a wish",
    "themeLabel": "Color theme",
    "themeCream": "Warm cream",
    "themeRose": "Soft rose",
    "themeMidnight": "Midnight",
    "skipLink": "Skip to content"
  },
  "Landing & ribbon": {
    "heroTagline": "Your birthday tagline",
    "heroNote": "Your welcome note",
    "heroTitle": "Happy\nbirthday,",
    "heroDescription": "Write a short welcome message here.",
    "heroButton": "This is for you",
    "recipientEnding": ".",
    "heroMusic": "Even better with a little music",
    "heroLeftCaption": "Your left photo caption",
    "heroRightCaption": "Your right photo caption",
    "stampTop": "YOUR",
    "stampBottom": "STAMP",
    "scrollCue": "A little love, a little further down",
    "ribbonOne": "Your first highlight",
    "ribbonTwo": "Your second highlight",
    "ribbonThree": "Your third highlight",
    "ribbonFour": "Your fourth highlight"
  },
  "Birthday letter": {
    "letterTitle": "Your letter",
    "letterTitleEmphasis": "starts here.",
    "letterDescription": "Introduce your birthday letter here.",
    "letterGreeting": "Dear {recipient},",
    "letterSignoff": "With so much love,"
  },
  "Photo gallery": {
    "galleryTitle": "The little moments.",
    "galleryTitleEmphasis": "The big feelings.",
    "galleryDescription": "Introduce your photo gallery here.",
    "galleryNote": "Your gallery note",
    "filterAll": "All the memories",
    "filterPeople": "Our people",
    "filterPlaces": "Little adventures",
    "filterThings": "Everyday magic",
    "galleryHint": "Tap a photo. Stay a little longer.",
    "galleryEmpty": "A new memory belongs here. Come back soon."
  },
  "Timeline": {
    "timelineTitle": "Your story.",
    "timelineTitleEmphasis": "Your memories.",
    "timelineDescription": "Introduce your timeline here.",
    "relationshipLabel": "Your start date",
    "togetherLabel": "days since the beginning",
    "timelineToday": "Today",
    "sendLove": "Send a heart",
    "loveSent": "A heart for you."
  },
  "Countdown & wish": {
    "countdownTitle": "A little closer to",
    "countdownTitleEmphasis": "your day.",
    "countdownDescription": "Something wonderful is worth counting down to.",
    "countdownReachedTitle": "Your next chapter is here.",
    "countdownReachedDescription": "Happy birthday! There is always a reason to celebrate you.",
    "countdownMissing": "A special day is on its way. The date will be here soon.",
    "daysLabel": "DAYS",
    "hoursLabel": "HOURS",
    "minutesLabel": "MINUTES",
    "secondsLabel": "SECONDS",
    "wishButton": "Close your eyes. Make a wish.",
    "wishResponse": "Keep that wish close. Here’s to it coming true.",
    "timezoneLabel": "UTC"
  },
  "Gift & footer": {
    "giftNote": "One last little thing…",
    "giftHeading": "Good things come",
    "giftHeadingEmphasis": "in little surprises.",
    "giftDescription": "Introduce your surprise here.",
    "giftOpen": "Open your surprise",
    "giftOpened": "A little gift, just for you",
    "giftDownload": "Keep this little promise",
    "giftDownloadGreeting": "Happy birthday, {recipient}!",
    "giftDownloadSignoff": "With love,",
    "footerTitle": "Your footer title",
    "footerDescription": "Your closing message",
    "demoNotice": "Template preview"
  },
  "Music & status messages": {
    "musicIdle": "A soundtrack for your day",
    "musicLoading": "Getting the music ready…",
    "musicRetry": "Music couldn’t play. Tap to retry.",
    "musicUnavailable": "Music unavailable. Tap to retry.",
    "musicInstructions": "Use the player to play or pause",
    "youtubeLink": "Listen on YouTube",
    "musicTapToStart": "Touch the page to start music",
    "musicNoSource": "Add your own music",
    "imageUnavailable": "Photo unavailable. Please try again later.",
    "photoPosition": "{current} / {total}"
  },
  "Accessibility & player controls": {
    "navigationLabel": "Main navigation",
    "filterLabel": "Filter photographs",
    "timerLabel": "Time until the birthday",
    "musicPlayerLabel": "Music player",
    "musicVolume": "Music volume",
    "photoViewerLabel": "Photo viewer",
    "closePhoto": "Close photo viewer",
    "previousPhoto": "Previous photo",
    "nextPhoto": "Next photo",
    "viewPhoto": "View photo",
    "openMusic": "Open music player",
    "closeMusic": "Close music player",
    "pauseMusic": "Pause birthday music",
    "playMusic": "Play birthday music"
  }
};
export const defaultCopy = Object.assign({}, ...Object.values(copyGroups));

export function textFor(content, key) {
  return (content.copy?.[key] ?? defaultCopy[key] ?? '').replace(/\{(recipient|fullName)\}/g, (_, name) => content[name] || content.recipient);
}
