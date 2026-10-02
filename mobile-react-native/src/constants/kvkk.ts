import { KvkkCopy, KvkkLanguage } from 'types/kvkk';

export const KVKK_CONSENT_VERSION = '2026-10-01';

export const KVKK_CONTACT_EMAIL = 'kvkk@travelroutes.net';

const TR: KvkkCopy = {
  languageLabel: 'Türkçe',
  title: 'Kişisel Verilerin Korunması',
  subtitle:
    'Travel Routes’u kullanmaya başlamadan önce hangi kişisel verilerinizi, hangi amaçlarla işlediğimizi lütfen okuyun.',
  updatedLabel: 'Son güncelleme',
  bindingNote:
    'Bu metnin İngilizcesi bilgilendirme amacıyla sunulmuştur; iki metin arasında fark olursa Türkçe metin esas alınır.',
  sections: [
    {
      id: 'controller',
      title: 'Veri sorumlusu',
      body: `Travel Routes uygulamasını işleten ekip, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) uyarınca veri sorumlusudur. Bu metinle ilgili soru ve talepleriniz için ${KVKK_CONTACT_EMAIL} adresine yazabilirsiniz.`,
    },
    {
      id: 'data',
      title: 'İşlenen kişisel veriler',
      body: [
        '• Hesap bilgileri: e-posta adresiniz; paylaşmayı seçerseniz adınız, soyadınız, kullanıcı adınız ve profil fotoğrafınız. Google ile giriş yaparsanız Google hesabınıza bağlı e-posta adresi.',
        '• Rota bilgileri: oluşturduğunuz rotaların başlığı ve açıklaması, duraklarının koordinatları ve adresleri; favorilerinize eklediğiniz rotalar ve duraklar.',
        '• Konum: yalnızca izin verdiğinizde ve uygulama açıkken cihazınızın konumu. Konumunuz haritada size gösterilir; bir rota ya da yolculuk süresi hesaplanırken başlangıç ve varış koordinatları sunucumuza iletilir.',
        '• Kullanım istatistikleri: hangi özelliği ne zaman kullandığınız (örneğin bir rotanın hesaplanması ya da rota üzerinde yer aranması). Bu kayıtlar konumunuzu, adresleri ya da yazdığınız metinleri hiçbir zaman içermez.',
        '• Oturum bilgileri: giriş zamanı, oturumu açan cihaz ya da uygulama ve yenileme anahtarınızın kriptografik özeti (hash).',
      ].join('\n'),
    },
    {
      id: 'purpose',
      title: 'İşleme amaçları',
      body: 'Hesabınızı oluşturmak ve oturumunuzu güvenle sürdürmek; rotalarınızı kaydetmek, düzenlemek ve giriş yaptığınız her cihazda aynı biçimde göstermek; seçtiğiniz ulaşım türüne göre rota ve süre hesaplamak, güzergâh üzerinde durak önermek; paylaştığınız rota bağlantılarının çalışmasını sağlamak; hangi özelliklerin kullanıldığını anlayarak uygulamayı geliştirmek ve size kendi istatistiklerinizi göstermek; kötüye kullanımı önlemek ve hesabınızın güvenliğini korumak.',
    },
    {
      id: 'legalBasis',
      title: 'Hukuki sebep',
      body: 'Hesap ve rota hizmetleri, aramızdaki kullanım ilişkisinin kurulması ve ifası için zorunludur (KVKK m. 5/2-c). Oturum ve güvenlik kayıtları meşru menfaatimize dayanır (m. 5/2-f). Onayınızın ve hesap silme işleminin kaydı, bu işlemleri ispat etme yükümlülüğümüze dayanır (m. 5/2-ç). Konumunuzun ve kullanım istatistiklerinin işlenmesi ile profil fotoğrafı gibi hizmet için zorunlu olmayan veriler, bu ekranda vereceğiniz açık rızaya dayanır (m. 5/1).',
    },
    {
      id: 'sharing',
      title: 'Aktarım',
      body: 'Rota, yer arama ve adres bulma istekleri sunucumuz aracılığıyla Google Haritalar hizmetlerine iletilir; Google’a yalnızca koordinatlar ve arama metni gider, hesap bilgileriniz gitmez. Google ile giriş yaptığınızda kimlik doğrulamasını Google yapar. Verileriniz, sunucularımızı barındıran hizmet sağlayıcıda saklanır. Bu hizmet sağlayıcıların sunucuları Türkiye dışında bulunabilir. Bunların dışında kişisel verileriniz üçüncü kişilerle paylaşılmaz ve satılmaz. Bir rotayı herkese açık yaptığınızda ya da bağlantısını paylaştığınızda o rotanın başlığı, açıklaması ve durakları bağlantıya sahip herkes tarafından görülebilir; paylaşımın kapsamını siz belirlersiniz.',
    },
    {
      id: 'retention',
      title: 'Saklama süresi',
      body: 'Hesap ve rota verileriniz hesabınız açık kaldığı sürece saklanır; sildiğiniz bir rota 30 gün sonra kalıcı olarak silinir. Oturum kayıtları süresi dolduğunda ya da çıkış yaptığınızda geçersiz kılınır. Kullanım istatistikleri en fazla iki yıl saklanır; hesabınız silindiğinde sizinle ilişkileri kesilerek anonim hâle getirilir. Hesap açmadan oluşturduğunuz rotalar ve seyahat haritanız yalnızca bu cihazda tutulur, sunucumuza gönderilmez ve siz silene kadar cihazda kalır.',
    },
    {
      id: 'rights',
      title: 'Haklarınız',
      body: `KVKK m. 11 uyarınca kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, işlenme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme, eksik ya da yanlış işlenmişse düzeltilmesini, silinmesini ya da yok edilmesini isteme, işlemeye itiraz etme ve zarara uğramanız hâlinde bunun giderilmesini talep etme haklarına sahipsiniz. Taleplerinizi ${KVKK_CONTACT_EMAIL} adresine iletebilirsiniz; başvurunuz en geç 30 gün içinde yanıtlanır.`,
    },
    {
      id: 'withdrawal',
      title: 'Onayı geri alma ve hesabın silinmesi',
      body: 'Açık rızanızı dilediğiniz zaman Profil › KVKK onayı ekranından geri alabilirsiniz. Giriş yapmışsanız geri alma işlemi hesabınızı ve ona bağlı tüm verileri (profiliniz, rotalarınız, favorileriniz, takip ilişkileriniz, bildirimleriniz ve oturumlarınız) kalıcı olarak siler; kullanım istatistikleriniz anonim hâle getirilir. Bu işlem geri alınamaz. Silme Yönetmeliği gereği, onayın geri alındığına ve silme işlemine ilişkin bir kaydı (tarih, metin sürümü ve e-posta adresinizin tek yönlü özeti) üç yıl boyunca saklarız; bu kayıt sizinle ilgili başka hiçbir bilgi içermez. Geri alma ileriye dönük olarak etkilidir; o ana kadar yapılmış işlemeyi hukuka aykırı hâle getirmez. Onay vermeden uygulama kullanılamaz. Yalnızca bu cihazda tuttuğunuz rotalar ve seyahat haritası silinmez; bunları Ayarlar ekranından kaldırabilirsiniz.',
    },
  ],
  consentStatement:
    'Aydınlatma metnini okudum; kişisel verilerimin bu metinde açıklandığı biçimde işlenmesine açık rıza veriyorum.',
  acceptLabel: 'Okudum, kabul ediyorum',
  declineLabel: 'Kabul etmiyorum',
  declineHint: 'Kabul etmezseniz uygulama kapanır.',
  declinedTitle: 'Onayınız olmadan devam edemeyiz',
  declinedBody:
    'Travel Routes, rotalarınızı kaydedip haritada gösterebilmek için bu verileri işlemek zorundadır; bu nedenle uygulama onayınız olmadan kullanılamaz. Uygulamayı şimdi kapatabilir ya da metni yeniden okuyabilirsiniz. Kararınızı daha sonra değiştirebilirsiniz.',
  declinedBackLabel: 'Metne dön',
  updatedNotice:
    'Aydınlatma metnimiz güncellendi. Devam etmek için lütfen yeni metni okuyup onaylayın.',
  statusTitle: 'Onayınız kayıtlı',
  acceptedOnLabel: 'Onay tarihi',
  versionLabel: 'Metin sürümü',
  withdrawLabel: 'Onayı geri al',
  withdrawTitle: 'Onayı geri al',
  withdrawMessage:
    'Onay ekranı yeniden açılacak; onay vermeden uygulama kullanılamaz. Bu cihazdaki rotalarınız silinmez.',
  withdrawDeleteMessage:
    'Hesabınız ve ona bağlı tüm veriler (profiliniz, rotalarınız, favorileriniz ve takip ilişkileriniz) kalıcı olarak silinecek. Bu işlem geri alınamaz. Yalnızca bu cihazda tutulan rotalarınız silinmez.',
  withdrawConfirmLabel: 'Geri al',
  withdrawDeleteConfirmLabel: 'Geri al ve hesabı sil',
  withdrawCancelLabel: 'Vazgeç',
  withdrawFailedTitle: 'Onay geri alınamadı',
  withdrawFailedMessage:
    'Hesabınız silinemedi ve hiçbir şey değişmedi. Bağlantınızı kontrol edip yeniden deneyin.',
};

const EN: KvkkCopy = {
  languageLabel: 'English',
  title: 'Protection of Personal Data',
  subtitle:
    'Before you start using Travel Routes, please read which of your personal data we process, and why.',
  updatedLabel: 'Last updated',
  bindingNote:
    'This English version is provided for convenience. If the two versions differ, the Turkish text prevails.',
  sections: [
    {
      id: 'controller',
      title: 'Data controller',
      body: `The team that operates Travel Routes is the data controller under Turkish Law No. 6698 on the Protection of Personal Data (KVKK). Please send any questions or requests about this notice to ${KVKK_CONTACT_EMAIL}.`,
    },
    {
      id: 'data',
      title: 'Personal data we process',
      body: [
        '• Account details: your email address and, if you choose to provide them, your first name, last name, nickname and profile picture. If you sign in with Google, the email address of your Google account.',
        '• Route details: the title and description of the routes you create, the coordinates and addresses of their stops, and the routes and stops you add to your favourites.',
        '• Location: your device’s location, only while you have granted permission and the app is open. It is shown to you on the map; when a route or travel time is calculated, the start and end coordinates are sent to our server.',
        '• Usage statistics: which features you use and when (for example, that a route was calculated or that places were searched along a route). These records never contain your location, addresses or anything you type.',
        '• Session details: when you signed in, the device or app that opened the session, and a cryptographic hash of your refresh token.',
      ].join('\n'),
    },
    {
      id: 'purpose',
      title: 'Why we process it',
      body: 'To create your account and keep you securely signed in; to save and edit your routes and show them consistently on every device you sign in on; to calculate routes and travel times for the transport mode you choose and suggest stops along the way; to make the route links you share work; to understand which features are used so that we can improve the app, and to show you your own statistics; and to prevent abuse and keep your account secure.',
    },
    {
      id: 'legalBasis',
      title: 'Legal basis',
      body: 'Account and route features are necessary to establish and perform our user relationship (KVKK art. 5/2-c). Session and security records rely on our legitimate interest (art. 5/2-f). Records of your consent and of any account deletion are kept to meet our legal obligation to prove them (art. 5/2-ç). Processing your location and usage statistics, as well as optional data such as your profile picture, relies on the explicit consent you give on this screen (art. 5/1).',
    },
    {
      id: 'sharing',
      title: 'Who else receives it',
      body: 'Route, place-search and address requests pass through our server to Google Maps services; Google receives only coordinates and the search text, never your account details. When you sign in with Google, Google carries out the authentication. Your data is stored with the provider that hosts our servers. These providers may process data on servers outside Türkiye. Beyond that, your personal data is not shared with third parties and is never sold. When you make a route public or share its link, its title, description and stops can be seen by anyone with the link — you decide how widely it is shared.',
    },
    {
      id: 'retention',
      title: 'How long we keep it',
      body: 'Account and route data is kept for as long as your account exists; a route you delete is erased permanently 30 days later. Session records are invalidated when they expire or when you sign out. Usage statistics are kept for up to two years; when your account is deleted, they are anonymised so that they can no longer be linked to you. Routes you create without an account, and your travel map, stay on this device only, are never sent to our server, and remain there until you delete them.',
    },
    {
      id: 'rights',
      title: 'Your rights',
      body: `Under article 11 of the KVKK, you have the right to learn whether your personal data is processed; to request information about it; to learn the purpose of the processing and whether the data is used accordingly; to have incomplete or inaccurate data corrected; to have your data erased or destroyed; to object to the processing; and to claim compensation for any damage you suffer. Send your requests to ${KVKK_CONTACT_EMAIL}; we will reply within 30 days at the latest.`,
    },
    {
      id: 'withdrawal',
      title: 'Withdrawing consent and deleting your account',
      body: 'You can withdraw your consent at any time from Profile › KVKK consent. If you are signed in, withdrawing permanently deletes your account and all data linked to it (your profile, routes, favourites, follows, notifications and sessions) and anonymises your usage statistics. This cannot be undone. As the Deletion Regulation requires, we keep a record of the withdrawal and the deletion (its date, the notice version and a one-way hash of your email address) for three years; this record contains nothing else about you. Withdrawal takes effect from that moment and does not make earlier processing unlawful. The app cannot be used without consent. Routes and the travel map stored only on this device are not deleted; you can remove them in Settings.',
    },
  ],
  consentStatement:
    'I have read this notice and give my explicit consent to my personal data being processed as described in it.',
  acceptLabel: 'I have read it and I accept',
  declineLabel: 'I do not accept',
  declineHint: 'If you do not accept, the app will close.',
  declinedTitle: 'We cannot continue without your consent',
  declinedBody:
    'Travel Routes has to process this data to save your routes and show them on the map, so the app cannot be used without your consent. You can close the app now or read the notice again. You can change your mind at any time.',
  declinedBackLabel: 'Back to the notice',
  updatedNotice:
    'Our privacy notice has been updated. Please read and accept the new version to continue.',
  statusTitle: 'Your consent is on record',
  acceptedOnLabel: 'Accepted on',
  versionLabel: 'Notice version',
  withdrawLabel: 'Withdraw consent',
  withdrawTitle: 'Withdraw consent',
  withdrawMessage:
    'The consent screen will open again, and the app cannot be used until you accept. The routes on this device are not deleted.',
  withdrawDeleteMessage:
    'Your account and everything linked to it (your profile, routes, favourites and follows) will be permanently deleted. This cannot be undone. Routes stored only on this device are not deleted.',
  withdrawConfirmLabel: 'Withdraw',
  withdrawDeleteConfirmLabel: 'Withdraw and delete',
  withdrawCancelLabel: 'Keep my consent',
  withdrawFailedTitle: 'Consent not withdrawn',
  withdrawFailedMessage:
    'Your account could not be deleted, and nothing has changed. Check your connection and try again.',
};

export const KVKK_COPY: Record<KvkkLanguage, KvkkCopy> = { tr: TR, en: EN };

export const KVKK_LANGUAGES: KvkkLanguage[] = ['tr', 'en'];

export const kvkkLanguageForLocale = (locale?: string | null): KvkkLanguage =>
  locale?.toLowerCase().startsWith('tr') ? 'tr' : 'en';

export const deviceKvkkLanguage = (): KvkkLanguage => {
  try {
    return kvkkLanguageForLocale(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    return 'tr';
  }
};
