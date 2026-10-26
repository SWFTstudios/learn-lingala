// French layer for the course: learners whose base language is French see these
// meanings, notes and explanations. Keyed by the ids in course.js and
// chat-scenarios.js; anything missing falls back to English (npm test checks coverage).
// Item entries: string meaning, or { m, note, tip }. note/tip/intro are trusted HTML.

export const FR_LEVELS = {
  arrive: {
    title: 'Arriver',
    subtitle: 'Le lingala de survie',
    weeks: '2 à 3 semaines',
    canDo: [
      'Saluer n’importe qui et demander comment ça va',
      'Dire que vous ne comprenez pas et demander de parler lentement',
      'Vous présenter et demander le nom de quelqu’un',
      'Compter jusqu’à 10, demander les prix et marchander',
    ],
  },
  'get-around': {
    title: 'Se déplacer',
    subtitle: 'Repas, taxis et directions',
    weeks: '3 semaines',
    canDo: [
      'Commander à manger et dire que vous avez faim',
      'Prendre un taxi et donner des indications simples',
      'Parler d’aujourd’hui, de demain et de l’heure',
      'Demander qui, quoi, où, quand et pourquoi',
    ],
  },
  'daily-life': {
    title: 'Vie quotidienne',
    subtitle: 'Famille, actions et émotions',
    weeks: '3 à 4 semaines',
    canDo: [
      'Parler de votre famille',
      'Dire ce que vous faites maintenant et ce que vous ferez',
      'Dire ce que vous voulez, pouvez et ne pouvez pas faire',
      'Dire ce que vous ressentez',
    ],
  },
  conversations: {
    title: 'Conver­sations',
    subtitle: 'Passé, projets et discussions',
    weeks: '4 semaines',
    canDo: [
      'Raconter ce qui s’est passé hier ou il y a longtemps',
      'Faire des projets et inviter des gens',
      'Tenir cinq minutes de conversation sur vous-même',
    ],
  },
  'mwana-mboka': {
    title: 'Mwana mboka',
    subtitle: 'Parler comme un local',
    weeks: 'en continu',
    canDo: [
      'Réagir naturellement : « Ya solo? », « Kaka bongo », « Likambo te »',
      'Utiliser les expressions de la rue à Kinshasa',
      'Montrer du respect aux aînés comme le font les Congolais',
    ],
  },
};

export const FR_UNITS = {
  greetings: {
    title: 'Salutations',
    intro: `
      <p>Les Congolais se saluent chaleureusement et souvent — oublier la salutation est impoli.
      <strong>Mbote</strong> s’utilise à toute heure, avec tout le monde. On répond <strong>Mbote na yo</strong>
      (« bonjour à toi »).</p>
      <p>Il y a deux « au revoir » selon qui part : <strong>kende malamu</strong> (« va bien ») à la personne qui
      part, <strong>tikala malamu</strong> (« reste bien ») à celle qui reste.</p>
      <p class="tip">Vous n’avez jamais besoin de taper les tons ni les lettres ɛ et ɔ :
      un simple <em>e</em> ou <em>o</em> est toujours accepté.</p>`,
  },
  survival: {
    title: 'Phrases de survie',
    intro: `
      <p>Ce sont les phrases qui sauvent une conversation quand vous êtes perdu. Apprenez-les d’abord et les gens
      ralentiront volontiers pour vous.</p>
      <p>Le lingala n’a pas de mot unique pour « s’il vous plaît ». On adoucit une demande avec
      <strong>pardon</strong> (emprunté au français) ou <strong>nasɛngi</strong> (« je demande »).</p>`,
  },
  pronouns: {
    title: 'Moi et toi',
    intro: `
      <p>Six pronoms : <strong>ngai</strong> (je), <strong>yo</strong> (tu), <strong>ye</strong> (il/elle),
      <strong>biso</strong> (nous), <strong>bino</strong> (vous), <strong>bango</strong> (ils/elles).</p>
      <p><strong>Le schéma n°1 du lingala :</strong> le verbe porte le sujet en préfixe —
      <strong>na-</strong> je, <strong>o-</strong> tu, <strong>a-</strong> il/elle, <strong>to-</strong> nous,
      <strong>bo-</strong> vous, <strong>ba-</strong> ils/elles. <em>kozala</em> (être) →
      <strong>nazali</strong>, <strong>ozali</strong>, <strong>azali</strong>… Apprenez-le une fois, il marche avec tous les verbes.</p>
      <p><strong>na</strong> relie aussi les mots comme « de » : <em>nkómbó na ngai</em> = nom de moi = mon nom.</p>`,
  },
  numbers: {
    title: 'Nombres et argent',
    intro: `
      <p>Le nombre se place <em>après</em> le nom : <strong>bana misato</strong> = trois enfants.</p>
      <p>Le lingala du marché : <strong>Ntalo boni?</strong> (combien ?) et <strong>Kitisa ntalo</strong>
      (baisse le prix). Marchander est normal — souriez et faites une offre.</p>
      <p class="tip">Astuce locale : les gros prix en francs congolais se disent généralement <em>en français</em>
      (« mille », « deux mille », « cinq cents »), même au milieu d’une phrase en lingala.</p>`,
  },
  food: {
    title: 'Manger et boire',
    intro: `
      <p>Les sensations comme la faim utilisent « être avec » : <strong>Nazali na nzala</strong> = je suis avec la faim = j’ai faim.</p>
      <p>L’impératif, c’est le verbe sans <em>ko-</em> : <em>kopesa</em> (donner) →
      <strong>Pesá ngai mai</strong> = Donne-moi de l’eau.</p>`,
  },
  'getting-around': {
    title: 'Se déplacer',
    intro: `
      <p>« Allons… » se forme avec le préfixe <strong>to-</strong> et finit en <strong>-a</strong>/<strong>-e</strong> :
      <strong>Tokende!</strong> = On y va !</p>
      <p>En taxi ou en taxi-bus, il vous faut surtout trois choses : où vous allez
      (<em>Nalingi kokende na…</em>), « c’est loin ? » (<em>Ezali mosika?</em>) et « arrête-toi ici »
      (<em>Tɛlɛma awa</em>).</p>`,
  },
  'time-places': {
    title: 'Le temps et les lieux',
    intro: `
      <p>Une particularité célèbre : <strong>lóbi</strong> veut dire à la fois <em>hier</em> et <em>demain</em>.
      C’est le temps du verbe qui tranche : <em>nakokende lóbi</em> (j’irai) = demain.</p>
      <p><strong>na</strong> veut aussi dire « à / au » : <em>na zándo</em> = au marché.</p>`,
  },
  questions: {
    title: 'Les questions',
    intro: `
      <p>Le mot interrogatif se met là où serait la réponse — généralement à la fin :
      <strong>Ozali wapi?</strong> = Tu es où ?</p>
      <p>Les questions fermées n’ont pas besoin de mot spécial : il suffit de monter la voix à la fin.</p>`,
  },
  family: {
    title: 'Famille et personnes',
    intro: `
      <p>Beaucoup de mots désignant des personnes commencent par <strong>mo-</strong> ou <strong>mw-</strong> et font leur
      pluriel en <strong>ba-</strong> : <em>moto → bato</em>, <em>mwana → bana</em>.</p>
      <p>« Avoir » se dit <strong>kozala na</strong> — « être avec » : <em>Nazali na mwana</em> = j’ai un enfant.</p>
      <p class="tip">Astuce locale : les mots de la famille servent pour tout le monde. On appelle un homme plus âgé
      <em>tata</em>, une femme plus âgée <em>mama</em>, un ami un peu plus âgé <em>yaya</em>, et un ami de son âge <em>ndeko</em>.</p>`,
  },
  verbs: {
    title: 'Verbes d’action',
    intro: `
      <p>Tous les verbes commencent par <strong>ko-</strong> à l’infinitif : <em>kolia</em> = manger.</p>
      <p><strong>Schéma :</strong> <em>nazali + verbe</em> = « je suis en train de… ». <em>Nazali kolia</em> = je mange (en ce moment).
      Changez le préfixe pour les autres personnes : <em>tozali kolia</em> = nous mangeons.</p>
      <p><strong>Schéma :</strong> futur = préfixe + <strong>ko</strong> + radical.
      <em>na + ko + ya</em> → <strong>nakoya</strong> = je viendrai.</p>`,
  },
  wants: {
    title: 'Vouloir, pouvoir et « ne… pas »',
    intro: `
      <p><strong>Schéma :</strong> présent simple = préfixe + radical + <strong>-i</strong> :
      <em>kolinga</em> → <strong>nalingi</strong> = je veux / j’aime.</p>
      <p><strong>Schéma :</strong> la négation = <strong>te</strong> tout à la fin, rien d’autre ne change :
      <em>Nayebi</em> → <strong>Nayebi te</strong>.</p>
      <p><strong>kokoka</strong> = pouvoir : <em>nakoki</em> (je peux), <em>nakoki te</em> (je ne peux pas).</p>`,
  },
  feelings: {
    title: 'Émotions',
    intro: `
      <p>Beaucoup d’émotions utilisent <strong>kozala na</strong> (« être avec ») : <em>Nazali na esengo</em> =
      je suis avec la joie.</p>
      <p>D’autres sont des verbes à la forme « vient de se produire » en <strong>-i</strong> :
      <em>kolɛmba</em> (se fatiguer) → <strong>nalɛmbi</strong> = je suis fatigué (je me suis fatigué).</p>`,
  },
  tenses: {
    title: 'Passé, présent et futur',
    intro: `
      <p>Un verbe, cinq schémas de temps. Apprenez-les avec <em>kosala</em> (faire / travailler) et ils marchent pour tous les verbes :</p>
      <p>• <strong>nazali kosala</strong> — je suis en train de faire<br>
      • <strong>nasali</strong> — j’ai fait (à l’instant, aujourd’hui)<br>
      • <strong>nasalaki</strong> — j’ai fait (plus tôt, hier ou il y a longtemps) — terminaison <strong>-aki</strong><br>
      • <strong>nasalaka</strong> — je fais d’habitude — terminaison <strong>-aka</strong><br>
      • <strong>nakosala</strong> — je ferai — <strong>ko</strong> après le préfixe</p>
      <p>C’est ainsi que <em>lóbi</em> devient clair : <em>lóbi nakendaki</em> = hier je suis allé ;
      <em>lóbi nakokende</em> = demain j’irai.</p>`,
  },
  'about-me': {
    title: 'Parler de soi',
    intro: `
      <p>Les premières questions qu’on vous posera : d’où vous venez, où vous habitez, pourquoi vous êtes là.</p>
      <p><strong>kouta</strong> = venir de → <strong>nauti</strong> (je viens de). <strong>kofanda</strong> =
      s’asseoir / habiter → <strong>nafandi</strong> (j’habite). Les deux utilisent la forme en <strong>-i</strong>
      pour un état qui dure.</p>`,
  },
  plans: {
    title: 'Projets et invitations',
    intro: `
      <p>On invite avec <strong>to-</strong> + verbe : <em>Tokende kolia</em> = Allons manger.</p>
      <p><strong>esɛngeli</strong> = il faut : <em>Esɛngeli nakende</em> = je dois y aller —
      la façon polie de prendre congé.</p>`,
  },
  reactions: {
    title: 'Réactions et petits mots',
    intro: `
      <p>Ce qui fait croire que vous avez grandi au Congo, ce n’est pas le vocabulaire — ce sont les petites
      réactions entre les phrases. Glissez-les dans chaque conversation.</p>
      <p class="tip">Astuce de rythme : le lingala se parle avec un débit souple et musical. Allongez la dernière
      voyelle quand vous réagissez — <em>« Ya solooo? »</em>, <em>« Ebongiii »</em> — et vous paraîtrez beaucoup plus naturel.</p>`,
  },
  street: {
    title: 'Le parler de la rue à Kinshasa',
    intro: `
      <p>Kinshasa (« Kin la belle ») a sa propre saveur : rapide, joueuse, pleine de français et de surnoms.
      Voici les expressions que vous entendrez entre amis.</p>
      <p class="tip">Au-delà de l’appli : la rumba congolaise est le meilleur professeur de lingala gratuit. Écoutez Papa Wemba,
      Koffi Olomide ou Fally Ipupa avec les paroles et essayez de repérer les mots que vous connaissez.</p>`,
  },
  respect: {
    title: 'Respect et bénédictions',
    intro: `
      <p>Le respect des aînés est central dans la culture congolaise, et cela se voit dans la grammaire : on utilise le pluriel
      <strong>bino / bo-</strong> pour s’adresser à une personne plus âgée, comme le <em>vous</em> en français.
      <em>Ozali malamu?</em> à un ami → <strong>Bozali malamu?</strong> à un aîné.</p>
      <p>Les aînés vous appelleront souvent <em>mwana na ngai</em> (« mon enfant ») — répondez par <em>tata</em> ou <em>mama</em>.</p>`,
  },
};

export const FR_ITEMS = {
  // Salutations
  'g-mbote': 'Bonjour',
  'g-mbote-na-yo': 'Bonjour à toi (réponse)',
  'g-mbote-na-bino': { m: 'Bonjour à tous', note: '<em>bino</em> = vous (plusieurs)' },
  'g-ozali-malamu': { m: 'Comment vas-tu ?', note: 'Littéralement « Es-tu bien ? »' },
  'g-nazali-malamu': { m: 'Je vais bien', note: 'Littéralement « Je suis bien. »' },
  'g-boni': { m: 'Salut, ça va ?', tip: 'Court et décontracté : c’est ainsi que les amis se saluent dans la rue.' },
  'g-ndenge-nini': { m: 'Comment ça va ?', note: 'Littéralement « Quelle manière ? »', tip: 'Salutation décontractée très courante à Kinshasa.' },
  'g-sango-nini': { m: 'Quoi de neuf ?', note: 'Littéralement « Quelles nouvelles ? »' },
  'g-sango-te': { m: 'Rien de spécial', note: 'Littéralement « Pas de nouvelles. »' },
  'g-matondo': 'Merci',
  'g-matondo-mingi': { m: 'Merci beaucoup', note: '<em>mingi</em> = beaucoup, très' },
  'g-merci-mingi': { m: 'Merci bien (à la kinoise)', tip: 'Les Kinois mélangent sans cesse le français et le lingala. Vous entendrez <em>merci mingi</em> aussi souvent que <em>matɔ́ndɔ</em>.' },
  'g-ee': { m: 'Oui', note: 'On entend aussi <em>iyo</em>.' },
  'g-te': 'Non',
  'g-kende-malamu': { m: 'Au revoir (à qui part)', note: 'Littéralement « Va bien. »' },
  'g-tikala-malamu': { m: 'Au revoir (à qui reste)', note: 'Littéralement « Reste bien. »' },
  'g-tokomonana': { m: 'À plus tard', note: 'Littéralement « Nous nous verrons. »' },
  'g-limbisa': { m: 'Pardon / excuse-moi', note: 'Littéralement « Pardonne-moi. »' },

  // Phrases de survie
  's-pardon': { m: 'S’il te plaît / excuse-moi', tip: 'Emprunté au français, on l’utilise partout pour rendre une demande polie.' },
  's-nasengi': { m: 'Je te le demande (s’il te plaît)', note: '<em>kosɛnga</em> = demander' },
  's-likambo-te': { m: 'Pas de problème', note: 'Littéralement « Pas d’affaire. »', tip: 'Vous l’entendrez toute la journée. Ça veut aussi dire « laisse tomber ».' },
  'w-nasosoli-te': { m: 'Je ne comprends pas', note: '<em>kososola</em> = comprendre' },
  's-loba-lisusu': { m: 'Redis-le', note: '<em>lisusu</em> = encore, de nouveau' },
  'w-loba-malembe': { m: 'Parle lentement', note: '<em>malɛmbɛ</em> = lentement, doucement' },
  'w-olobi-lingala': 'Tu parles lingala ?',
  'w-nalobi-moke': { m: 'Je parle un peu lingala', note: '<em>moke</em> = un peu, petit' },
  's-nazali-koyekola': { m: 'J’apprends le lingala', tip: 'Dites-le et regardez les visages s’illuminer… et les gens se mettre à vous enseigner.' },
  's-zela-moke': { m: 'Attends un instant', note: '<em>kozela</em> = attendre' },
  's-ezali-wapi': 'C’est où ?',
  's-sunga-ngai': { m: 'Aide-moi', note: '<em>kosunga</em> = aider' },

  // Moi et toi
  'p-ngai': 'je / moi',
  'p-yo': 'tu / toi (une personne)',
  'p-ye': 'il / elle',
  'p-biso': 'nous',
  'p-bino': 'vous (plusieurs personnes)',
  'p-bango': 'ils / elles / eux',
  'p-nazali': 'je suis',
  'p-ozali': 'tu es',
  'p-azali': 'il / elle est',
  'p-tozali': 'nous sommes',
  'p-bazali': 'ils / elles sont',
  'p-nkombo-yo': { m: 'Comment tu t’appelles ?', note: 'Littéralement « Nom de toi, qui ? »' },
  'p-nkombo-ngai': { m: 'Je m’appelle Maria', tip: 'Mettez votre propre prénom — pas besoin de verbe.' },
  'p-nazali-awa': { m: 'Je suis ici', note: '<em>awa</em> = ici' },

  // Nombres et argent
  'n-1': 'un (1)',
  'n-2': 'deux (2)',
  'n-3': 'trois (3)',
  'n-4': 'quatre (4)',
  'n-5': 'cinq (5)',
  'n-6': 'six (6)',
  'n-7': 'sept (7)',
  'n-8': 'huit (8)',
  'n-9': 'neuf (9)',
  'n-10': 'dix (10)',
  'n-boni': 'combien ?',
  'n-ntalo-boni': 'Ça coûte combien ?',
  'n-bana-misato': 'trois enfants',
  'n-mbongo': 'argent',
  'n-falanga': { m: 'argent (mot de la rue)', tip: 'Le mot de tous les jours à Kinshasa pour l’argent liquide.' },
  'n-nazali-na-mbongo-te': { m: 'Je n’ai pas d’argent', note: 'Littéralement « Je ne suis pas avec de l’argent. »' },
  'n-ntalo-makasi': { m: 'C’est trop cher', note: '<em>makasi</em> = fort, dur' },
  'n-kitisa-ntalo': { m: 'Baisse le prix', note: '<em>kokitisa</em> = faire descendre' },

  // Manger et boire
  'fd-mai': 'eau',
  'fd-lipa': 'pain',
  'fd-mbisi': 'poisson',
  'fd-nsoso': 'poulet',
  'fd-nyama': 'viande / animal',
  'fd-loso': 'riz',
  'fd-pondu': { m: 'feuilles de manioc', note: 'Un plat congolais classique.' },
  'fd-madesu': 'haricots',
  'fd-makemba': 'bananes plantains',
  'fd-nzala': 'faim',
  'fd-nazali-na-nzala': 'J’ai faim',
  'fd-nalingi-kolia': 'Je veux manger',
  'fd-pesa-ngai-mai': 'Donne-moi de l’eau',
  'fd-ezali-elengi': 'C’est délicieux',
  'fd-olei': { m: 'Tu as mangé ?', tip: 'Une attention bienveillante, presque une salutation. Attendez-vous à l’entendre quand vous rendez visite à quelqu’un.' },
  'fd-nalei-malamu': 'J’ai bien mangé',

  // Se déplacer
  'ga-tokende': 'On y va !',
  'ga-nalingi-kokende': 'Je veux aller au marché',
  'ga-kende-liboso': { m: 'Va tout droit', note: '<em>liboso</em> = devant, d’abord' },
  'ga-mosika': 'loin',
  'ga-pene': 'près',
  'ga-ezali-mosika': 'C’est loin ?',
  'ga-telema-awa': { m: 'Arrête-toi ici', note: '<em>kotɛlɛma</em> = se tenir debout, s’arrêter' },
  'ga-yaka-awa': 'Viens ici',
  'ga-nakomi': { m: 'Je suis arrivé(e)', note: '<em>kokoma</em> = arriver' },
  'ga-okomi': 'Tu es arrivé(e) ?',
  'ga-kotambola': 'marcher',
  'ga-motuka': 'voiture',

  // Le temps et les lieux
  't-lelo': 'aujourd’hui',
  't-lobi': 'hier / demain',
  't-sikoyo': 'maintenant',
  't-ntongo': 'matin',
  't-mpokwa': 'soir',
  't-butu': 'nuit',
  't-mokolo': 'jour',
  't-ngonga-boni': { m: 'Quelle heure est-il ?', note: '<em>ngonga</em> = heure, cloche' },
  't-ndako': 'maison',
  't-zando': 'marché',
  't-mboka': 'pays / village natal',
  't-mosala': 'travail / emploi',
  't-awa': 'ici',
  't-kuna': 'là-bas',
  't-zando-lobi': 'J’irai au marché demain',

  // Les questions
  'q-nini': 'quoi',
  'q-nani': 'qui',
  'q-wapi': 'où',
  'q-ntango-nini': { m: 'quand', note: 'Littéralement « quel moment »' },
  'q-mpo-na-nini': { m: 'pourquoi', note: 'Littéralement « pour quoi »' },
  'q-ozali-wapi': 'Tu es où ?',
  'q-kokende-wapi': 'Tu vas où ?',
  'q-oyo-nini': { m: 'C’est quoi, ça ?', note: '<em>oyo</em> = ceci' },
  'q-ye-nani': 'Qui est-ce ? (lui / elle)',
  'q-olingi-nini': 'Tu veux quoi ?',
  'q-ndako-wapi': 'Ta maison est où ?',

  // Famille et personnes
  'f-mama': 'mère',
  'f-tata': 'père',
  'f-mwana': 'enfant',
  'f-bana': 'enfants',
  'f-ndeko': 'frère, sœur / proche',
  'f-yaya': { m: 'aîné(e) (grand frère, grande sœur)', tip: 'Aussi une façon respectueuse d’appeler quelqu’un un peu plus âgé que vous.' },
  'f-leki': 'cadet(te) (petit frère, petite sœur)',
  'f-moninga': 'ami(e)',
  'f-mobali': 'homme / mari',
  'f-mwasi': 'femme / épouse',
  'f-moto': 'personne',
  'f-bato': 'gens',
  'f-nkoko': 'grand-parent',
  'f-mama-na-ngai': 'ma mère',
  'f-nazali-na-mwana': 'J’ai un enfant',
  'f-kitoko': 'beau / belle',

  // Verbes d'action
  'v-kolia': 'manger',
  'v-komela': 'boire',
  'v-kokende': 'aller',
  'v-koya': 'venir',
  'v-kosala': 'faire / travailler',
  'v-kolala': 'dormir',
  'v-koloba': 'parler',
  'v-koyeba': 'savoir',
  'v-kolinga': 'aimer / vouloir',
  'v-kosomba': 'acheter',
  'v-koyekola': 'apprendre',
  'v-nazali-kolia': 'Je suis en train de manger',
  'v-nazali-kokende': { m: 'Je m’en vais', note: 'Littéralement « Je suis en train d’aller. »' },
  'v-tozali-kosala': 'Nous travaillons',
  'v-bazali-kolala': 'Ils dorment',
  'v-nakoya': 'Je viendrai',
  'v-nakozonga': { m: 'Je reviendrai', note: '<em>kozonga</em> = revenir' },
  'v-tokolia': 'Nous mangerons',

  // Vouloir, pouvoir et « ne… pas »
  'w-nalingi-mai': 'Je veux de l’eau',
  'w-nalingi-yo': 'Je t’aime',
  'w-nalingi-te': 'Je ne veux pas',
  'w-nayebi': 'Je sais',
  'w-nayebi-te': 'Je ne sais pas',
  'w-nakoki': 'Je peux',
  'w-nakoki-te': 'Je ne peux pas',
  'w-okoki': 'Tu peux ?',
  'w-nazali-kolia-te': 'Je ne suis pas en train de manger',
  'w-tolingi-kokende': 'Nous voulons y aller',

  // Émotions
  'w-nasepeli': { m: 'Je suis content(e)', note: '<em>kosepela</em> = être content' },
  'fe-esengo': { m: 'Je suis plein(e) de joie', note: '<em>esengo</em> = joie' },
  'fe-nalembi': 'Je suis fatigué(e)',
  'fe-kobela': { m: 'Je suis malade', note: '<em>kobɛla</em> = être malade' },
  'fe-kiadi': { m: 'Je suis triste', note: '<em>kiadi</em> = tristesse, peine' },
  'fe-nkanda': { m: 'Je suis en colère', note: '<em>nkanda</em> = colère' },
  'fe-nabangi': { m: 'J’ai peur', note: '<em>kobanga</em> = avoir peur' },
  'fe-nalingi-yo-mingi': 'Je t’aime tellement',
  'fe-olembi': 'Tu es fatigué(e) ?',

  // Passé, présent et futur
  'te-nasali': 'Je l’ai fait (à l’instant)',
  'te-nasalaki': 'Je l’ai fait (plus tôt)',
  'te-nakosala': 'Je le ferai',
  'te-nasalaka': 'Je le fais d’habitude',
  'te-nakendaki': 'Je suis allé(e) à Kinshasa',
  'te-lobi-nakendaki': 'Hier, je suis allé(e) au marché',
  'te-tosalaki': 'Nous avons beaucoup travaillé',
  'te-akoya-lobi': 'Il / elle viendra demain',
  'te-basalaka': 'Ils travaillent d’habitude au marché',
  'te-nalingaki': 'Je voulais y aller',
  'te-osalaki-nini': 'Qu’est-ce que tu as fait hier ?',

  // Parler de soi
  'am-outi-wapi': 'Tu viens d’où ?',
  'am-nauti': { m: 'Je viens d’Amérique', tip: 'Mettez votre pays : <em>Nauti France / Belgique / Canada / Mputu</em> (Mputu = l’Europe).' },
  'am-ofandi-wapi': 'Tu habites où ?',
  'am-nafandi': 'J’habite à Kinshasa',
  'am-mbula': { m: 'Quel âge as-tu ?', note: '<em>mbula</em> = années (et aussi : pluie)' },
  'am-molakisi': { m: 'Je suis enseignant(e)', note: '<em>molakisi</em> = enseignant' },
  'am-nayei-kotala': { m: 'Je suis venu(e) rendre visite à ma famille', note: '<em>kotala</em> = regarder, rendre visite · <em>libota</em> = famille' },
  'am-nalingi-mboka': 'J’aime ce pays',
  'am-nayekolaka': { m: 'J’étudie le lingala tous les jours', note: '<em>mokolo nyonso</em> = tous les jours' },

  // Projets et invitations
  'pl-okosala-nini': 'Que vas-tu faire demain ?',
  'pl-tokende-kolia': 'Allons manger',
  'pl-elongo': 'ensemble',
  'pl-yaka-elongo': 'Viens avec nous',
  'pl-na-mpokwa': 'le soir',
  'pl-esengeli': 'Je dois y aller',
  'pl-tokomonana-lobi': 'À demain',
  'pl-nakoya-te': 'Je ne viendrai pas',

  // Réactions et petits mots
  'r-ya-solo': { m: 'Vraiment ? / Sérieux ?', note: '<em>solo</em> = vérité' },
  'r-na-nzambe': 'Je te jure (devant Dieu)',
  'r-ezali-bongo': { m: 'C’est comme ça', note: '<em>bongo</em> = ainsi, comme ça' },
  'r-kaka-bongo': { m: 'C’est tout / juste comme ça', note: '<em>kaka</em> = juste, seulement' },
  'r-mabe-te': 'Pas mal',
  'r-ebongi': 'OK / ça marche',
  'r-esili': 'C’est fini',
  'r-ekoki': 'Ça suffit !',
  'r-eloko-te': { m: 'C’est rien / de rien', note: 'Littéralement « Aucune chose. »' },
  'r-kosakana': { m: 'Tu plaisantes', note: '<em>kosakana</em> = jouer, plaisanter' },
  'r-ah-bon': { m: 'Ah bon ? / C’est vrai ?', tip: 'Du français, mais tous les Kinois le disent en plein lingala.' },

  // Le parler de la rue
  'st-ndeko-ndenge-nini': { m: 'Frérot, ça dit quoi ?', tip: '<em>ndeko</em> = frère ou sœur, mais entre amis ça veut dire « frérot » ou « frangine ».' },
  'st-mwana-mboka': 'un(e) enfant du pays (un local)',
  'st-ozali-mwana-mboka': { m: 'T’es un vrai enfant du pays !', tip: 'Le compliment que vous visez.' },
  'st-mundele': { m: 'Blanc / étranger', tip: 'Généralement neutre, souvent taquin. Les enfants peuvent le crier à votre passage.' },
  'st-tika-ngai': { m: 'Laisse-moi tranquille', note: '<em>kotika</em> = laisser' },
  'st-nakei': { m: 'J’y vais / je file', tip: 'Forme familière de <em>nazali kokende</em>.' },
  'st-kobanga-te': 'T’inquiète / n’aie pas peur',
  'st-bolingo': { m: 'amour', tip: 'Le mot que vous entendrez dans chaque chanson de rumba.' },
  'st-motema': { m: 'Mon cœur (mon amour)', note: '<em>motema</em> = cœur' },
  'st-lisusu': 'Encore !',

  // Respect et bénédictions
  'rs-mbote-tata': 'Bonjour, monsieur (à un homme âgé)',
  'rs-mbote-mama': 'Bonjour, madame (à une femme âgée)',
  'rs-bozali-malamu': 'Comment allez-vous ? (respectueux)',
  'rs-oyei-malamu': { m: 'Bienvenue !', note: 'Littéralement « Tu es bien venu. »' },
  'rs-boyei-malamu': 'Bienvenue ! (à plusieurs / à un aîné)',
  'rs-nzambe-apambola': 'Que Dieu te bénisse',
  'rs-tozali-elongo': 'On est ensemble',
  'rs-matondo-mama': 'Merci beaucoup, madame',
  'rs-mwana-na-ngai': 'mon enfant (comment les aînés vous appellent)',
};

// Pattern-drill prompts, keyed by the English text in course.js.
export const FR_DRILL = {
  'I am': 'je suis',
  child: 'enfant',
  person: 'personne',
  "I've arrived": 'Je suis arrivé(e)',
  'Have you eaten?': 'Tu as mangé ?',
  'I am working': 'Je travaille',
  'I am sleeping': 'Je dors',
  'I am coming': 'Je viens (en ce moment)',
  'We are eating': 'Nous mangeons',
  'I want': 'Je veux',
  'I know': 'Je sais',
  'I can': 'Je peux',
  'I am eating': 'Je mange',
  'I want to go': 'Je veux y aller',
  "I'm tired": 'Je suis fatigué(e)',
  "I've done it (just now)": 'Je l’ai fait (à l’instant)',
  "I've done it": 'Je l’ai fait',
  'Tomorrow I will go to the market': 'Demain j’irai au marché',
  'I worked a lot': 'J’ai beaucoup travaillé',
  'I will come tomorrow': 'Je viendrai demain',
  'I usually work at the market': 'Je travaille d’habitude au marché',
  'I will come': 'Je viendrai',
  'How are you? (to a friend)': 'Comment vas-tu ? (à un ami)',
  'Welcome!': 'Bienvenue !',
  // cues
  you: 'tu',
  'he / she': 'il / elle',
  we: 'nous',
  they: 'ils / elles',
  plural: 'pluriel',
  negative: 'négatif',
  future: 'futur',
  'ask: you?': 'question : tu ?',
  'answer: I ate well': 'réponds : j’ai bien mangé',
  'earlier past (-aki)': 'passé plus ancien (-aki)',
  'habit (-aka)': 'habitude (-aka)',
  yesterday: 'hier',
  'past (-aki)': 'passé (-aki)',
  'respectful (bo-)': 'respectueux (bo-)',
};

export const FR_DIALOGUES = {
  greetings: {
    title: 'Rencontre avec un voisin',
    setting: 'Vous sortez le matin et croisez votre voisin.',
    lines: ['Bonjour !', 'Bonjour à toi !', 'Comment vas-tu ?', 'Oui, je vais bien. Et toi ?', 'Je vais bien. Quoi de neuf ?', 'Rien de spécial.', 'Bien. Va bien !', 'Merci. Reste bien !'],
  },
  survival: {
    title: 'Perdu dans la conversation',
    setting: 'À l’arrêt de bus, quelqu’un commence à vous parler très vite.',
    lines: ['Bonjour ! Tu attends un taxi ?', 'Pardon, je ne comprends pas.', 'Tu parles lingala ?', 'Je parle un peu lingala.', 'Ah ! Tu attends un taxi ?', 'Parle lentement, s’il te plaît.', 'Tu… attends… un taxi ?', 'Oui ! Merci. J’apprends le lingala.', 'Très bien ! Pas de problème.'],
  },
  pronouns: {
    title: 'Se présenter',
    setting: 'À une réunion de famille, un cousin que vous n’avez jamais rencontré s’approche.',
    lines: ['Bonjour ! Comment tu t’appelles ?', 'Je m’appelle Maria. Et toi ?', 'Je m’appelle Patrick. Comment vas-tu ?', 'Je vais bien.', 'Nous sommes une seule famille !', 'Oui ! Merci beaucoup.'],
  },
  numbers: {
    title: 'Au marché',
    setting: 'Vous voulez acheter des bananes plantains à une vendeuse du marché.',
    lines: ['Bonjour, madame !', 'Bonjour à toi ! Tu veux quoi ?', 'Je veux des bananes plantains. C’est combien ?', 'Deux mille (francs).', 'C’est trop cher. Baisse le prix, s’il te plaît !', 'Mille cinq cents.', 'D’accord. Merci beaucoup !'],
  },
  food: {
    title: 'Invité à manger',
    setting: 'Vous arrivez chez la famille d’un ami à l’heure du déjeuner.',
    lines: ['Bienvenue ! Tu as mangé ?', 'Non, j’ai faim !', 'Viens manger. Nous avons du pondu et du poisson.', 'Très bien !', 'C’est bon ?', 'C’est délicieux. Merci beaucoup !'],
  },
  'getting-around': {
    title: 'Prendre un taxi',
    setting: 'Vous arrêtez un taxi pour aller au marché.',
    lines: ['Bonjour, monsieur ! Je veux aller au marché.', 'D’accord. Viens !', 'C’est loin ?', 'Non, c’est tout près.', 'Nous sommes arrivés.', 'Arrête-toi ici, s’il te plaît.', 'Ça marche.', 'Merci, monsieur !'],
  },
  questions: {
    title: 'Au téléphone',
    setting: 'Votre ami vous appelle pendant que vous êtes dehors.',
    lines: ['Allô ! Tu es où ?', 'Je suis au marché.', 'Tu fais quoi là-bas ?', 'J’achète des bananes plantains.', 'Tu viens quand ?', 'Je viens maintenant.'],
  },
  'about-me': {
    title: '« T’es un vrai enfant du pays ! »',
    setting: 'Vous discutez avec quelqu’un à un mariage à Kinshasa.',
    lines: ['Tu parles lingala ?', 'Oui, un peu. J’étudie le lingala tous les jours.', 'Vraiment ? Tu viens d’où ?', 'Je viens d’Amérique.', 'Tu habites où ?', 'J’habite à Kinshasa maintenant.', 'T’es un vrai enfant du pays !', 'Hahaha, merci bien !'],
  },
  plans: {
    title: 'Faire des projets',
    setting: 'Un ami vous appelle le vendredi après-midi.',
    lines: ['Que vas-tu faire demain ?', 'Je ne sais pas. Et toi ?', 'Allons manger ensemble !', 'Super ! À quelle heure ?', 'Le soir.', 'Ça marche. À demain !'],
  },
  street: {
    title: 'Prendre des nouvelles d’un ami',
    setting: 'Vous croisez votre ami Christian sur le boulevard.',
    lines: ['Frérot, ça dit quoi ?', 'Pas mal ! Et toi ?', 'Juste fatigué. Beaucoup de travail.', 'Sérieux ? T’inquiète, on est ensemble.', 'Merci bien, frérot.', 'C’est rien !'],
  },
  respect: {
    title: 'Saluer une aînée',
    setting: 'Vous rendez visite à la grand-mère de votre ami, Mama Nzeba.',
    lines: ['Bonjour, madame !', 'Bonjour, mon enfant. Bienvenue !', 'Merci, madame. Comment allez-vous ?', 'Oui, je vais bien. Tu as mangé ?', 'J’ai bien mangé, madame. Merci beaucoup.', 'Que Dieu te bénisse.'],
  },
};

export const FR_SCENARIOS = {
  neighbor: {
    title: 'Votre voisine',
    setting: 'Le matin dans votre rue à Kinshasa. Votre voisine Mama Nzeba, une femme chaleureuse d’une soixantaine d’années, balaie devant sa maison.',
    mission: 'Saluez-la, dites-lui comment vous allez, demandez-lui comment elle va et dites au revoir comme il faut.',
    opener: 'Bonjour ! Comment vas-tu ?',
  },
  market: {
    title: 'Au marché',
    setting: 'Le marché Gambela, un marché animé de Kinshasa. Mama Antho vend des bananes plantains et annonce un prix élevé aux nouveaux venus.',
    mission: 'Achetez des bananes plantains et faites-lui baisser le prix.',
    opener: 'Bonjour ! Viens, regarde ces belles bananes plantains ! Tu veux quoi ?',
  },
  taxi: {
    title: 'En taxi',
    setting: 'Vous montez dans un taxi collectif sur le boulevard du 30 Juin. Le chauffeur, Papa Jules, est sympathique et bavard.',
    mission: 'Dites-lui où vous voulez aller, demandez si c’est loin et dites-lui où s’arrêter.',
    opener: 'Bonjour ! Tu vas où ?',
  },
  family: {
    title: 'Rencontrer un cousin',
    setting: 'Une fête de famille. Votre cousin Patrick, à peu près de votre âge, ne vous a jamais rencontré et il est curieux.',
    mission: 'Présentez-vous : votre nom, d’où vous venez, où vous habitez et pourquoi vous êtes venu.',
    opener: 'Bonjour ! Comment tu t’appelles ?',
  },
  friend: {
    title: 'Un ami de Matonge',
    setting: 'Vous croisez votre ami Christian à Matonge, le quartier animé de la musique et de la vie nocturne.',
    mission: 'Prenez des nouvelles, puis fixez un rendez-vous pour ce soir (où et à quelle heure).',
    opener: 'Frérot, ça dit quoi ?',
  },
  elder: {
    title: 'Saluer un aîné',
    setting: 'Vous rendez visite au grand-père de votre ami, Koko Ndombe, un aîné respecté.',
    mission: 'Saluez-le respectueusement avec la forme bo-, répondez à ses questions et remerciez-le pour sa bénédiction.',
    opener: 'Bonjour, mon enfant. Bienvenue !',
  },
  free: {
    title: 'Conversation libre',
    setting: 'Une discussion détendue, sur le sujet de votre choix, avec un ami patient de Kinshasa.',
    mission: null,
    opener: 'Bonjour ! De quoi parle-t-on aujourd’hui ?',
  },
};
