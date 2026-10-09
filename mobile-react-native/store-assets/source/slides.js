// Store screenshot content. Rendered by render.sh through screenshot.html.
//
// Each slide shows raw/<lang>/<shot>.png in the device frame. Callouts lift a
// rectangle out of a capture (src, default: the slide's own shot), enlarge it
// by `zoom` and float it over the device; x/y/w/h are capture pixels of the
// 1344x2992 Pixel 8 Pro capture, dx/dy move it in canvas pixels from where
// that rectangle sits on the device. `out` names the rendered file.

const CANVASES = {
  phone: { w: 1080, h: 1920, phoneW: 610, phoneTop: 572, copyTop: 110, h1: 88 },
};

const SLIDES = [
  {
    shot: '01-plan',
    out: '01-plan-every-stop',
    motif: { x: -150, y: 1060, s: 2.5 },
    callouts: [{ src: '01-plan-stops', x: 30, y: 1528, w: 1284, h: 845, zoom: 1.14, dy: 258 }],
    en: {
      eyebrow: 'Plan',
      title: ['Plan every stop', 'of your trip'],
      sub: 'Add places, put them in order and the route draws itself.',
    },
    tr: {
      eyebrow: 'Planla',
      title: ['Yolculuğunuzun', 'her durağını planlayın'],
      sub: 'Yerleri ekleyin, sıralayın; rota kendiliğinden çizilsin.',
    },
  },
  {
    shot: '02-compare',
    out: '02-compare-travel-modes',
    motif: { x: -120, y: 1140, s: 2.4, flip: true },
    callouts: [{ x: 30, y: 1770, w: 1284, h: 470, zoom: 1.16 }],
    en: {
      eyebrow: 'Compare',
      title: ['Walk, drive', 'or take transit'],
      sub: 'See travel times for the whole trip, or for any part of it.',
    },
    tr: {
      eyebrow: 'Karşılaştır',
      title: ['Yürüyerek, arabayla', 'ya da toplu taşımayla'],
      sub: 'Tüm yolculuğun ya da herhangi bir bölümünün süresini görün.',
    },
  },
  {
    shot: '03-along-map',
    out: '03-places-along-the-way',
    motif: { x: -170, y: 980, s: 2.6 },
    callouts: [{ src: '03-along', x: 0, y: 1015, w: 1344, h: 765, zoom: 1.1, dy: 510 }],
    en: {
      eyebrow: 'Explore',
      title: ['Find places', 'along the way'],
      sub: 'Coffee, food or fuel, but only what is actually on your route.',
    },
    tr: {
      eyebrow: 'Yol üzerinde',
      title: ['Yol üzerindeki', 'yerleri bulun'],
      sub: 'Kahve, yemek ya da yakıt; yalnızca gerçekten rotanızın üzerindekiler.',
    },
  },
  {
    shot: '04-follow',
    out: '04-follow-the-route',
    motif: { x: -130, y: 1100, s: 2.5, flip: true },
    callouts: [{ x: 372, y: 1315, w: 600, h: 600, zoom: 1.7, lens: true }],
    en: {
      eyebrow: 'Navigate',
      title: ['Follow the route', 'as you go'],
      sub: 'The map moves with you, and the road behind you fades away.',
    },
    tr: {
      eyebrow: 'Yolda',
      title: ['Yola çıkınca', 'rotanızı takip edin'],
      sub: 'Harita sizinle ilerler, geride kalan yol solar.',
    },
  },
  {
    shot: '05-discover',
    out: '05-discover-routes',
    motif: { x: -160, y: 1000, s: 2.6 },
    en: {
      eyebrow: 'Discover',
      title: ['Discover trips', 'by other travellers'],
      sub: 'Browse routes the community has shared and keep the ones you like.',
    },
    tr: {
      eyebrow: 'Keşfet',
      title: ['Gezginlerin', 'rotalarını keşfedin'],
      sub: 'Topluluğun paylaştığı rotalara göz atın, beğendiklerinizi saklayın.',
    },
  },
  {
    shot: '06-community',
    out: '06-make-it-your-own',
    motif: { x: -110, y: 1150, s: 2.4, flip: true },
    callouts: [{ x: 48, y: 1580, w: 1248, h: 125, zoom: 1.18, radius: 60 }],
    en: {
      eyebrow: 'Reuse',
      title: ['Make any route', 'your own'],
      sub: 'Save it to your favourites, or copy it and change the stops.',
    },
    tr: {
      eyebrow: 'Uyarla',
      title: ['Beğendiğiniz rotayı', 'kendinize uyarlayın'],
      sub: 'Favorilerinize kaydedin ya da kopyalayıp duraklarını değiştirin.',
    },
  },
  {
    shot: '07-notifications',
    out: '07-follow-travellers',
    motif: { x: -160, y: 1020, s: 2.6 },
    callouts: [{ src: '07-author', x: 360, y: 330, w: 624, h: 560, zoom: 1.3, dx: 150, dy: 905 }],
    en: {
      eyebrow: 'Follow',
      title: ['Never miss', 'a new route'],
      sub: 'Follow travellers and hear about it when they publish.',
    },
    tr: {
      eyebrow: 'Takip et',
      title: ['Yeni rotaları', 'kaçırmayın'],
      sub: 'Gezginleri takip edin; yeni bir rota yayımladıklarında haberiniz olsun.',
    },
  },
  {
    shot: '08-favourites',
    out: '08-on-every-device',
    motif: { x: -120, y: 1120, s: 2.4, flip: true },
    callouts: [{ src: '08-places', x: 30, y: 668, w: 1284, h: 762, zoom: 1.08, dy: 660 }],
    en: {
      eyebrow: 'Keep',
      title: ['Your routes,', 'on every device'],
      sub: 'The routes and places you save stay with your account.',
    },
    tr: {
      eyebrow: 'Sakla',
      title: ['Rotalarınız', 'her cihazda yanınızda'],
      sub: 'Kaydettiğiniz rotalar ve yerler hesabınızla birlikte gelir.',
    },
  },
];
