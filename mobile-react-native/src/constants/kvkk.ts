import { KvkkCopy, KvkkLanguage } from 'types/kvkk';

/**
 * The date the notice below last changed, and the version stored with a
 * consent. Bump it whenever the wording changes: a stored consent that names an
 * older version stops counting, so everyone is asked again for the new text.
 * Consent given to a text nobody showed them is not consent.
 */
export const KVKK_CONSENT_VERSION = '2026-09-03';

export const KVKK_CONTACT_EMAIL = 'kvkk@travelroutes.net';

const TR: KvkkCopy = {
  languageLabel: 'Türkçe',
  title: 'Kişisel Verilerin Korunması',
  subtitle:
    'Travel Routes’u kullanmaya başlamadan önce hangi verilerinizi, neden işlediğimizi okuyun.',
  updatedLabel: 'Son güncelleme',
  bindingNote:
    'Bu metnin İngilizce çevirisi bilgilendirme amaçlıdır; uyuşmazlık hâlinde Türkçe metin esas alınır.',
  sections: [
    {
      id: 'controller',
      title: 'Veri sorumlusu',
      body: `Travel Routes uygulamasını işleten ekip, 6698 sayılı Kişisel Verilerin Korunması Kanunu anlamında veri sorumlusudur. Bu metinle ilgili her soru ve talebiniz için ${KVKK_CONTACT_EMAIL} adresine yazabilirsiniz.`,
    },
    {
      id: 'data',
      title: 'İşlenen kişisel veriler',
      body: [
        '• Hesap: e-posta adresiniz; verdiyseniz adınız, soyadınız, kullanıcı adınız ve profil fotoğrafınız. Google ile giriş yaptığınızda Google hesabınızın e-posta adresi.',
        '• Rotalar: oluşturduğunuz rotaların başlığı ve açıklaması, duraklarının koordinatları ve adres bilgileri, favorilerinize eklediğiniz rota ve duraklar.',
        '• Konum: yalnızca izin verdiğinizde ve uygulama açıkken cihazınızın konumu. Konumunuz haritada size gösterilir; rota ve süre hesaplanırken başlangıç ve varış koordinatları sunucumuza iletilir.',
        '• Oturum: oturum açma zamanı, oturumu açan cihaz/uygulama bilgisi ve yenileme jetonunuzun kriptografik özeti (hash).',
      ].join('\n'),
    },
    {
      id: 'purpose',
      title: 'İşleme amaçları',
      body: 'Hesabınızı oluşturmak ve oturumunuzu güvenli biçimde sürdürmek; rotalarınızı kaydetmek, düzenlemek ve giriş yaptığınız her cihazda aynı şekilde göstermek; seçtiğiniz ulaşım türüne göre rota ile süre hesaplamak ve güzergâh üzerinde durak önermek; paylaştığınız rota bağlantılarının çalışmasını sağlamak; kötüye kullanımı önlemek ve hesabınızın güvenliğini korumak.',
    },
    {
      id: 'legalBasis',
      title: 'Hukuki sebep',
      body: 'Hesap ve rota hizmetleri, aramızdaki kullanım ilişkisinin kurulması ve ifası için gereklidir (KVKK m. 5/2-c). Oturum ve güvenlik kayıtları meşru menfaatimize dayanır (m. 5/2-f). Konumunuzun işlenmesi ve profil fotoğrafınız gibi hizmet için zorunlu olmayan veriler ise bu ekranda vereceğiniz açık rızaya dayanır (m. 5/1).',
    },
    {
      id: 'sharing',
      title: 'Aktarım',
      body: 'Rota, yer arama ve adres çözümleme istekleri sunucumuz üzerinden Google Haritalar servislerine iletilir; Google’a yalnızca koordinatlar ve arama metni gider, hesap bilgileriniz gitmez. Google ile giriş yaptığınızda kimlik doğrulama Google tarafından yapılır. Verileriniz sunucularımızı barındıran hizmet sağlayıcıda saklanır. Bunun dışında kişisel verileriniz üçüncü kişilerle paylaşılmaz ve satılmaz. Bir rotayı herkese açık yaptığınızda veya bağlantısını paylaştığınızda o rotanın başlığı, açıklaması ve durakları bağlantıya sahip herkesçe görülebilir; bu paylaşımın kapsamını siz belirlersiniz.',
    },
    {
      id: 'retention',
      title: 'Saklama süresi',
      body: 'Hesap ve rota verileriniz hesabınız açık kaldığı sürece saklanır. Oturum kayıtları süresi dolduğunda veya çıkış yaptığınızda geçersiz kılınır. Hesap açmadan oluşturduğunuz rotalar yalnızca bu cihazda tutulur, sunucuya gönderilmez ve siz silene kadar cihazda kalır.',
    },
    {
      id: 'rights',
      title: 'Haklarınız',
      body: `KVKK m. 11 uyarınca kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, düzeltilmesini, silinmesini veya yok edilmesini isteme, işlemeye itiraz etme ve zararınızın giderilmesini talep etme haklarına sahipsiniz. Hesabınızın tümüyle silinmesi dâhil taleplerinizi ${KVKK_CONTACT_EMAIL} adresine iletebilirsiniz; başvurunuz en geç 30 gün içinde yanıtlanır.`,
    },
    {
      id: 'withdrawal',
      title: 'Onayı geri alma',
      body: 'Açık rızanızı dilediğiniz zaman Profil › KVKK onayı ekranından geri alabilirsiniz. Geri aldığınızda oturumunuz kapatılır ve bu ekran yeniden karşınıza çıkar; onay vermeden uygulama kullanılamaz. Geri alma ileriye etkilidir, o ana kadar yapılmış işlemeyi hukuka aykırı hâle getirmez. Cihazınızda tuttuğunuz rotalar silinmez; onları Ayarlar ekranından kaldırabilirsiniz.',
    },
  ],
  consentStatement:
    'Aydınlatma metnini okudum; kişisel verilerimin burada açıklandığı şekilde işlenmesine açık rıza gösteriyorum.',
  acceptLabel: 'Okudum, kabul ediyorum',
  declineLabel: 'Kabul etmiyorum',
  declinedTitle: 'Onay olmadan devam edilemez',
  declinedBody:
    'Travel Routes, rotalarınızı kaydetmek ve haritada göstermek için bu verileri işlemek zorunda; onay vermeden uygulamayı kullanamayız. Metni yeniden okuyabilir ya da uygulamayı kapatabilirsiniz. Kararınızı sonra değiştirebilirsiniz.',
  declinedBackLabel: 'Metne dön',
  updatedNotice:
    'Aydınlatma metni güncellendi. Devam etmek için yeni metni onaylamanız gerekiyor.',
  statusTitle: 'Onayınız alındı',
  acceptedOnLabel: 'Onay tarihi',
  versionLabel: 'Metin sürümü',
  withdrawLabel: 'Onayı geri al',
  withdrawTitle: 'Onayı geri al',
  withdrawMessage:
    'Oturumunuz kapatılacak ve onay ekranı yeniden açılacak. Cihazınızdaki rotalar silinmez.',
  withdrawConfirmLabel: 'Geri al',
  withdrawCancelLabel: 'Vazgeç',
};

const EN: KvkkCopy = {
  languageLabel: 'English',
  title: 'Protection of Personal Data',
  subtitle:
    'Before you start using Travel Routes, read which of your data we process and why.',
  updatedLabel: 'Last updated',
  bindingNote:
    'This is an English translation provided for convenience. The Turkish text is the binding one.',
  sections: [
    {
      id: 'controller',
      title: 'Data controller',
      body: `The team operating Travel Routes is the data controller under Turkish law no. 6698 on the Protection of Personal Data (KVKK). Write to ${KVKK_CONTACT_EMAIL} with any question or request about this notice.`,
    },
    {
      id: 'data',
      title: 'Personal data we process',
      body: [
        '• Account: your email address; your first name, last name, nickname and profile picture if you give them. The email address of your Google account when you sign in with Google.',
        '• Routes: the title and description of the routes you create, the coordinates and address details of their stops, and the routes and stops you add to favourites.',
        '• Location: your device location, only while you have granted permission and the app is open. It is drawn on your map; when a route or a travel time is calculated, the start and end coordinates are sent to our server.',
        '• Sessions: sign-in time, the device/app that opened the session, and a cryptographic hash of your refresh token.',
      ].join('\n'),
    },
    {
      id: 'purpose',
      title: 'Why we process it',
      body: 'To create your account and keep you signed in safely; to save and edit your routes and show them the same way on every device you sign in on; to calculate routes and travel times for the transport mode you pick and suggest stops along the way; to make the route links you share work; and to prevent abuse and keep your account secure.',
    },
    {
      id: 'legalBasis',
      title: 'Legal basis',
      body: 'Account and route features are necessary to enter into and perform our use relationship (KVKK art. 5/2-c). Session and security records rest on our legitimate interest (art. 5/2-f). Processing your location, and optional data such as your profile picture, rests on the explicit consent you give on this screen (art. 5/1).',
    },
    {
      id: 'sharing',
      title: 'Who else sees it',
      body: 'Route, place-search and geocoding requests go through our server to Google Maps services; only coordinates and the search text reach Google, never your account details. When you sign in with Google, Google performs the authentication. Your data is stored with the provider hosting our servers. Beyond that your personal data is not shared with third parties and is never sold. When you make a route public or share its link, that route’s title, description and stops can be seen by anyone holding the link — you decide how far that goes.',
    },
    {
      id: 'retention',
      title: 'How long we keep it',
      body: 'Account and route data is kept for as long as your account exists. Session records are invalidated when they expire or when you sign out. Routes you create without an account stay on this device only, are never sent to the server, and remain until you delete them.',
    },
    {
      id: 'rights',
      title: 'Your rights',
      body: `Under KVKK art. 11 you may ask whether your personal data is processed, request information about it, ask for it to be corrected, erased or destroyed, object to the processing, and claim compensation for damages. Send any request — including full deletion of your account — to ${KVKK_CONTACT_EMAIL}; you will get an answer within 30 days at the latest.`,
    },
    {
      id: 'withdrawal',
      title: 'Withdrawing your consent',
      body: 'You can withdraw your consent at any time from Profile › KVKK consent. Withdrawing signs you out and brings this screen back: the app cannot be used without consent. Withdrawal applies from that moment on and does not make earlier processing unlawful. The routes held on your device are not deleted; you can remove those from Settings.',
    },
  ],
  consentStatement:
    'I have read this notice and give my explicit consent to my personal data being processed as described here.',
  acceptLabel: 'I have read and accept',
  declineLabel: 'I do not accept',
  declinedTitle: 'We cannot continue without consent',
  declinedBody:
    'Travel Routes has to process this data to save your routes and draw them on the map, so the app cannot be used without your consent. You can read the notice again or close the app. You can change your mind later.',
  declinedBackLabel: 'Back to the notice',
  updatedNotice:
    'The notice has changed. To continue, please accept the new text.',
  statusTitle: 'Consent recorded',
  acceptedOnLabel: 'Accepted on',
  versionLabel: 'Notice version',
  withdrawLabel: 'Withdraw consent',
  withdrawTitle: 'Withdraw consent',
  withdrawMessage:
    'You will be signed out and the consent screen will open again. The routes on your device are not deleted.',
  withdrawConfirmLabel: 'Withdraw',
  withdrawCancelLabel: 'Keep consent',
};

export const KVKK_COPY: Record<KvkkLanguage, KvkkCopy> = { tr: TR, en: EN };

export const KVKK_LANGUAGES: KvkkLanguage[] = ['tr', 'en'];

/**
 * Turkish phones read the Turkish text, everyone else the translation. The
 * toggle is right above the notice either way, so a wrong guess costs one tap.
 */
export const kvkkLanguageForLocale = (locale?: string | null): KvkkLanguage =>
  locale?.toLowerCase().startsWith('tr') ? 'tr' : 'en';

export const deviceKvkkLanguage = (): KvkkLanguage => {
  try {
    return kvkkLanguageForLocale(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    return 'tr';
  }
};
