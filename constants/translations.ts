/**
 * ZAspot App Translations
 * Matching the web app translations from data/appInfo.ts
 * Languages: Czech (cz), English (en), German (de), Polish (pl)
 */

export type Language = 'cz' | 'en' | 'de' | 'pl';

export interface Translations {
  // Tab navigation
  tabs: {
    home: string;
    map: string;
    spotPrices: string;
    route: string;
    profile: string;
  };

  // Home screen
  home: {
    welcome: string;
    currentPrice: string;
    priceNow: string;
    perKwh: string;
    nearbyStations: string;
    viewAll: string;
    quickActions: string;
    findStation: string;
    planRoute: string;
    myReservations: string;
    spotPrices: string;
  };

  // Map screen
  map: {
    title: string;
    searchPlaceholder: string;
    filters: string;
    allStations: string;
    available: string;
    dcOnly: string;
    acOnly: string;
    minPower: string;
    stationDetails: string;
    connectors: string;
    power: string;
    price: string;
    status: string;
    available_status: string;
    occupied: string;
    offline: string;
    navigate: string;
    reserve: string;
    distance: string;
    favoritesOnly: string;
    freeParking: string;
    connectorType: string;
    resetFilters: string;
    allTypes: string;
  };

  // Spot prices screen
  spotPrices: {
    title: string;
    subtitle: string;
    today: string;
    week: string;
    month: string;
    average: string;
    current: string;
    lowest: string;
    highest: string;
    bestTime: string;
    priceAlert: string;
    setAlert: string;
    currency: string;
    perMwh: string;
    perKwh: string;
    lastUpdated: string;
    trend: string;
    rising: string;
    falling: string;
    stable: string;
    hourlyPrices: string;
    chargeNow: string;
    waitForBetter: string;
    savingPotential: string;
  };

  // Route planner
  route: {
    title: string;
    subtitle: string;
    from: string;
    to: string;
    currentLocation: string;
    calculateRoute: string;
    distance: string;
    duration: string;
    estimatedCost: string;
    chargingStops: string;
    addStop: string;
    noStationsFound: string;
    calculating: string;
    batteryLevel: string;
    vehicleRange: string;
    noVehicleHint: string;
    activeVehicle: string;
    // Location & errors
    myLocation: string;
    locationDenied: string;
    locationFailed: string;
    invalidAddresses: string;
    planningFailed: string;
    tapToChange: string;
    // Route result labels
    driving: string;
    chargingTime: string;
    noChargingNeeded: string;
    sufficientBattery: string;
    fromStart: string;
    estimatedPrice: string;
    emptyStateTitle: string;
    emptyStateDesc: string;
  };

  // Profile screen
  profile: {
    title: string;
    settings: string;
    language: string;
    theme: string;
    notifications: string;
    vehicleProfile: string;
    saveToAccount: string;
    synced: string;
    localOnly: string;
    customVehicle: string;
    batteryCapacity: string;
    maxChargingPower: string;
    priceAlerts: string;
    reservations: string;
    history: string;
    about: string;
    help: string;
    contact: string;
    version: string;
    logout: string;
    darkMode: string;
    lightMode: string;
    systemDefault: string;
    // Login card
    signIn: string;
    signInSubtitle: string;
    // Credit
    credit: string;
    topUp: string;
    // Notifications
    notificationsOn: string;
    notificationsOff: string;
    enableNotifications: string;
    notifyBelow: string;
    notifyAbove: string;
    sendTestNotification: string;
    // Vehicle section
    vehicleSectionTitle: string;
    myVehicle: string;
    selectVehicle: string;
    battery: string;
    range: string;
    maxCharging: string;
    // AutoCharge
    autoChargeVehicleCount: string;
    newVehicle: string;
    addVehicle: string;
    vehicleNamePlaceholder: string;
    autoChargeEmpty: string;
    enterMacManually: string;
    vehicleName: string;
    macHintTesla: string;
    macHintVw: string;
    // RFID
    rfidCards: string;
    addRfidCard: string;
    rfidCardNumber: string;
    cardName: string;
    // Delete vehicle
    removeVehicle: string;
    removeVehicleConfirm: string;
    yes: string;
    no: string;
  };

  // Reservations
  reservations: {
    title: string;
    upcoming: string;
    past: string;
    noReservations: string;
    createNew: string;
    cancel: string;
    confirm: string;
    selectDate: string;
    selectTime: string;
    duration: string;
    totalCost: string;
    status: string;
    pending: string;
    confirmed: string;
    cancelled: string;
    completed: string;
    cancelConfirm: string;
    loginRequired: string;
    signIn: string;
    deposit: string;
  };

  // History screen
  history: {
    title: string;
    noHistory: string;
    noHistoryDesc: string;
    active: string;
    completed: string;
    viewReceipt: string;
    loginRequired: string;
    login: string;
    energy: string;
    power: string;
    cost: string;
    date: string;
    duration: string;
  };

  // Receipt screen
  receipt: {
    title: string;
    loading: string;
    error: string;
    station: string;
    connector: string;
    date: string;
    startTime: string;
    endTime: string;
    duration: string;
    energy: string;
    avgPrice: string;
    total: string;
    status: string;
    completed: string;
    active: string;
    share: string;
    sendEmail: string;
    emailSent: string;
    emailError: string;
    back: string;
    receiptNo: string;
  };

  // Station detail screen
  station: {
    loading: string;
    error: string;
    back: string;
    online: string;
    offline: string;
    connectors: string;
    startCharging: string;
    stopCharging: string;
    navigate: string;
    favorite: string;
    loginRequired: string;
    login: string;
    starting: string;
    stopping: string;
    activeSession: string;
    energy: string;
    duration: string;
    cost: string;
    power: string;
    soc: string;
    stats: string;
    totalSessions: string;
    totalEnergy: string;
    confirmStop: string;
    yes: string;
    no: string;
    errorStarting: string;
    errorStopping: string;
    insufficientCredit: string;
    stationOffline: string;
    currentPrices: string;
    acPrice: string;
    dcPrice: string;
    spotPrice: string;
    perKwh: string;
    timeSlot: string;
    statusAvailable: string;
    statusCharging: string;
    statusPreparing: string;
    statusFaulted: string;
    statusUnavailable: string;
    statusSuspendedEV: string;
    statusSuspendedEVSE: string;
    reserve: string;
    reserveConfirm: string;
    reserveDeposit: string;
    reserveSuccess: string;
    reserveError: string;
    reserving: string;
  };

  // Common
  common: {
    loading: string;
    error: string;
    retry: string;
    cancel: string;
    save: string;
    close: string;
    back: string;
    next: string;
    done: string;
    search: string;
    noResults: string;
    km: string;
    min: string;
    hour: string;
    kw: string;
    kwh: string;
  };

  // Notifications
  notifications: {
    lowPriceTitle: string;
    highPriceTitle: string;
    currentPrice: string;
    below: string;
    above: string;
    idealChargingTime: string;
    considerDelaying: string;
    testTitle: string;
    testBody: string;
    reservationSoonTitle: string;
    reservationStartsIn: string;
    chargingStartedTitle: string;
    chargingStartedAt: string;
    chargingCompleteTitle: string;
  };

  // Company info
  company: {
    name: string;
    phone: string;
    email: string;
    website: string;
  };
}

export const translations: Record<Language, Translations> = {
  cz: {
    tabs: {
      home: 'Domů',
      map: 'Mapa',
      spotPrices: 'Ceny',
      route: 'Trasa',
      profile: 'Profil',
    },
    home: {
      welcome: 'Vítejte v ZAspot',
      currentPrice: 'Aktuální cena',
      priceNow: 'Cena teď',
      perKwh: 'Kč/kWh',
      nearbyStations: 'Stanice v okolí',
      viewAll: 'Zobrazit vše',
      quickActions: 'Rychlé akce',
      findStation: 'Najít stanici',
      planRoute: 'Plánovat cestu',
      myReservations: 'Moje rezervace',
      spotPrices: 'Spotové ceny',
    },
    map: {
      title: 'Mapa stanic',
      searchPlaceholder: 'Hledat stanici...',
      filters: 'Filtry',
      allStations: 'Všechny stanice',
      available: 'Dostupné',
      dcOnly: 'Pouze DC',
      acOnly: 'Pouze AC',
      minPower: 'Min. výkon',
      stationDetails: 'Detail stanice',
      connectors: 'Konektory',
      power: 'Výkon',
      price: 'Cena',
      status: 'Stav',
      available_status: 'Dostupná',
      occupied: 'Obsazená',
      offline: 'Offline',
      navigate: 'Navigovat',
      reserve: 'Rezervovat',
      distance: 'Vzdálenost',
      favoritesOnly: 'Pouze oblíbené',
      freeParking: 'Parkování zdarma',
      connectorType: 'Typ konektoru',
      resetFilters: 'Resetovat filtry',
      allTypes: 'Vše',
    },
    spotPrices: {
      title: 'Spotové ceny elektřiny',
      subtitle: 'Aktuální ceny na burze',
      today: 'Dnes',
      week: 'Týden',
      month: 'Měsíc',
      average: 'Průměr',
      current: 'Aktuální',
      lowest: 'Nejnižší',
      highest: 'Nejvyšší',
      bestTime: 'Nejlepší čas k nabíjení',
      priceAlert: 'Cenový alert',
      setAlert: 'Nastavit upozornění',
      currency: 'CZK',
      perMwh: 'Kč/MWh',
      perKwh: 'Kč/kWh',
      lastUpdated: 'Poslední aktualizace',
      trend: 'Trend',
      rising: 'Stoupá',
      falling: 'Klesá',
      stable: 'Stabilní',
      hourlyPrices: 'Hodinové ceny',
      chargeNow: 'Nabíjejte nyní!',
      waitForBetter: 'Počkejte na lepší cenu',
      savingPotential: 'Potenciál úspory',
    },
    route: {
      title: 'Plánovat cestu',
      subtitle: 'Najděte optimální trasu s nabíjecími stanicemi',
      from: 'Odkud',
      to: 'Kam',
      currentLocation: 'Aktuální poloha',
      calculateRoute: 'Vypočítat trasu',
      distance: 'Vzdálenost',
      duration: 'Doba jízdy',
      estimatedCost: 'Odhadované náklady',
      chargingStops: 'Nabíjecí zastávky',
      addStop: 'Přidat zastávku',
      noStationsFound: 'Žádné stanice na trase',
      calculating: 'Vypočítávám...',
      batteryLevel: 'Stav baterie',
      vehicleRange: 'Dojezd vozidla',
      noVehicleHint: 'Vyberte si vozidlo v profilu pro přesnější výpočet',
      activeVehicle: 'Aktivní vozidlo',
      myLocation: 'Moje poloha',
      locationDenied: 'Přístup k poloze byl zamítnut',
      locationFailed: 'Nepodařilo se získat polohu',
      invalidAddresses: 'Zadejte platné adresy pro start a cíl',
      planningFailed: 'Nepodařilo se naplánovat trasu',
      tapToChange: 'Klepněte pro změnu hodnot',
      driving: 'Jízda',
      chargingTime: 'Nabíjení',
      noChargingNeeded: 'Žádné nabíjení není potřeba!',
      sufficientBattery: 'S aktuální baterií dojedete na cíl bez zastávky.',
      fromStart: 'od startu',
      estimatedPrice: 'Odhadovaná cena',
      emptyStateTitle: 'Naplánujte si cestu',
      emptyStateDesc: 'Zadejte odkud a kam jedete, a najdeme vám optimální nabíjecí zastávky ze sítě ZAspot',
    },
    profile: {
      title: 'Profil',
      settings: 'Nastavení',
      language: 'Jazyk',
      theme: 'Vzhled',
      notifications: 'Oznámení',
      priceAlerts: 'Cenové alerty',
      reservations: 'Moje rezervace',
      vehicleProfile: 'Profil vozidla',
      saveToAccount: 'Uložit na účet',
      synced: 'Synchronizováno',
      localOnly: 'Pouze lokálně',
      customVehicle: 'Vlastní vozidlo',
      batteryCapacity: 'Kapacita baterie',
      maxChargingPower: 'Max. nabíjecí výkon',
      history: 'Historie nabíjení',
      about: 'O aplikaci',
      help: 'Nápověda',
      contact: 'Kontakt',
      version: 'Verze',
      logout: 'Odhlásit se',
      darkMode: 'Tmavý režim',
      lightMode: 'Světlý režim',
      systemDefault: 'Podle systému',
      // Login card
      signIn: 'Přihlaste se',
      signInSubtitle: 'Pro nabíjení a platby',
      // Credit
      credit: 'Kredit',
      topUp: 'Dobít',
      // Notifications
      notificationsOn: 'Zapnuto',
      notificationsOff: 'Vypnuto',
      enableNotifications: 'Povolit notifikace',
      notifyBelow: 'Upozornit pod',
      notifyAbove: 'Upozornit nad',
      sendTestNotification: 'Odeslat testovací notifikaci',
      // Vehicle section
      vehicleSectionTitle: 'ELEKTROMOBIL',
      myVehicle: 'Moje vozidlo',
      selectVehicle: 'Vybrat vozidlo',
      battery: 'Baterie',
      range: 'Dojezd',
      maxCharging: 'Max nabíjení',
      // AutoCharge
      autoChargeVehicleCount: 'vozidel',
      newVehicle: 'Nové vozidlo',
      addVehicle: 'Přidat',
      vehicleNamePlaceholder: 'Název vozidla (např. Můj Enyaq)',
      autoChargeEmpty: 'Připojte EV k naší stanici - vozidlo se automaticky rozpozná.',
      enterMacManually: 'Zadat MAC adresu ručně',
      vehicleName: 'Název vozidla',
      macHintTesla: 'Tesla: Ovládání → Software → Další info o vozidle',
      macHintVw: 'VW ID: Infotainment → Nastavení → O vozidle',
      // RFID
      rfidCards: 'RFID karty',
      addRfidCard: 'Přidat RFID kartu',
      rfidCardNumber: 'Číslo RFID karty',
      cardName: 'Název karty',
      // Delete vehicle
      removeVehicle: 'Odebrat vozidlo',
      removeVehicleConfirm: 'Opravdu chcete odebrat toto vozidlo?',
      yes: 'Ano',
      no: 'Ne',
    },
    reservations: {
      title: 'Rezervace',
      upcoming: 'Nadcházející',
      past: 'Minulé',
      noReservations: 'Žádné rezervace',
      createNew: 'Vytvořit novou',
      cancel: 'Zrušit',
      confirm: 'Potvrdit',
      selectDate: 'Vyberte datum',
      selectTime: 'Vyberte čas',
      duration: 'Doba trvání',
      totalCost: 'Celková cena',
      status: 'Stav',
      pending: 'Čeká na potvrzení',
      confirmed: 'Potvrzeno',
      cancelled: 'Zrušeno',
      completed: 'Dokončeno',
      cancelConfirm: 'Opravdu chcete zrušit tuto rezervaci?',
      loginRequired: 'Pro zobrazení rezervací se přihlaste.',
      signIn: 'Přihlásit se',
      deposit: 'Záloha',
    },
    history: {
      title: 'Historie nabíjení',
      noHistory: 'Zatím žádné nabíjení',
      noHistoryDesc: 'Po prvním nabíjení se zde zobrazí vaše historie.',
      active: 'Aktivní',
      completed: 'Dokončeno',
      viewReceipt: 'Zobrazit účtenku',
      loginRequired: 'Pro zobrazení historie se přihlaste.',
      login: 'Přihlásit se',
      energy: 'Energie',
      power: 'Výkon',
      cost: 'Náklady',
      date: 'Datum',
      duration: 'Doba',
    },
    receipt: {
      title: 'Účtenka',
      loading: 'Načítání účtenky...',
      error: 'Účtenka nenalezena',
      station: 'Stanice',
      connector: 'Konektor',
      date: 'Datum',
      startTime: 'Začátek',
      endTime: 'Konec',
      duration: 'Doba nabíjení',
      energy: 'Energie',
      avgPrice: 'Průměrná cena',
      total: 'Celkem',
      status: 'Stav',
      completed: 'Dokončeno',
      active: 'Aktivní',
      share: 'Sdílet',
      sendEmail: 'Odeslat na email',
      emailSent: 'Email odeslán',
      emailError: 'Chyba při odesílání emailu',
      back: 'Zpět',
      receiptNo: 'Účtenka č.',
    },
    station: {
      loading: 'Načítání stanice...',
      error: 'Stanice nenalezena',
      back: 'Zpět',
      online: 'Online',
      offline: 'Offline',
      connectors: 'Konektory',
      startCharging: 'Spustit nabíjení',
      stopCharging: 'Zastavit nabíjení',
      navigate: 'Navigovat',
      favorite: 'Oblíbená',
      loginRequired: 'Pro nabíjení se přihlaste',
      login: 'Přihlásit se',
      starting: 'Spouštím...',
      stopping: 'Zastavuji...',
      activeSession: 'Aktivní nabíjení',
      energy: 'Energie',
      duration: 'Doba',
      cost: 'Náklady',
      power: 'Výkon',
      soc: 'Stav baterie',
      stats: 'Statistiky',
      totalSessions: 'Celkem nabíjení',
      totalEnergy: 'Celkem energie',
      confirmStop: 'Opravdu chcete zastavit nabíjení?',
      yes: 'Ano',
      no: 'Ne',
      errorStarting: 'Chyba při spouštění nabíjení',
      errorStopping: 'Chyba při zastavování nabíjení',
      insufficientCredit: 'Nedostatečný kredit (min. 10 CZK)',
      stationOffline: 'Stanice je offline',
      currentPrices: 'Aktuální ceny',
      acPrice: 'AC nabíjení',
      dcPrice: 'DC nabíjení',
      spotPrice: 'Spotová cena',
      perKwh: 'CZK/kWh',
      timeSlot: 'Časový slot',
      statusAvailable: 'Dostupný',
      statusCharging: 'Nabíjí',
      statusPreparing: 'Připravuje se',
      statusFaulted: 'Porucha',
      statusUnavailable: 'Nedostupný',
      statusSuspendedEV: 'Pozastaveno (EV)',
      statusSuspendedEVSE: 'Pozastaveno',
      reserve: 'Rezervovat',
      reserveConfirm: 'Rezervovat konektor na 30 minut?',
      reserveDeposit: 'Záloha',
      reserveSuccess: 'Rezervace vytvořena',
      reserveError: 'Chyba při rezervaci',
      reserving: 'Rezervuji...',
    },
    common: {
      loading: 'Načítání...',
      error: 'Chyba',
      retry: 'Zkusit znovu',
      cancel: 'Zrušit',
      save: 'Uložit',
      close: 'Zavřít',
      back: 'Zpět',
      next: 'Další',
      done: 'Hotovo',
      search: 'Hledat',
      noResults: 'Žádné výsledky',
      km: 'km',
      min: 'min',
      hour: 'hod',
      kw: 'kW',
      kwh: 'kWh',
    },
    notifications: {
      lowPriceTitle: 'Nízká cena elektřiny!',
      highPriceTitle: 'Vysoká cena elektřiny!',
      currentPrice: 'Aktuální cena',
      below: 'pod',
      above: 'nad',
      idealChargingTime: 'Ideální čas na nabíjení!',
      considerDelaying: 'Zvažte odložení nabíjení.',
      testTitle: 'ZAspot Test',
      testBody: 'Push notifikace fungují správně! Budete informováni o nízkých cenách elektřiny.',
      reservationSoonTitle: 'Rezervace začíná brzy',
      reservationStartsIn: 'Vaše rezervace na {station} začíná za {minutes} minut.',
      chargingStartedTitle: 'Nabíjení zahájeno',
      chargingStartedAt: 'Nabíjení na {station} bylo úspěšně zahájeno.',
      chargingCompleteTitle: 'Nabíjení dokončeno',
    },
    company: {
      name: 'sdil s.r.o.',
      phone: '+420 770 103 103',
      email: 'sdil@sdil.cz',
      website: 'www.zaspot.cz',
    },
  },

  en: {
    tabs: {
      home: 'Home',
      map: 'Map',
      spotPrices: 'Prices',
      route: 'Route',
      profile: 'Profile',
    },
    home: {
      welcome: 'Welcome to ZAspot',
      currentPrice: 'Current Price',
      priceNow: 'Price Now',
      perKwh: 'CZK/kWh',
      nearbyStations: 'Nearby Stations',
      viewAll: 'View All',
      quickActions: 'Quick Actions',
      findStation: 'Find Station',
      planRoute: 'Plan Route',
      myReservations: 'My Reservations',
      spotPrices: 'Spot Prices',
    },
    map: {
      title: 'Charging Map',
      searchPlaceholder: 'Search station...',
      filters: 'Filters',
      allStations: 'All Stations',
      available: 'Available',
      dcOnly: 'DC Only',
      acOnly: 'AC Only',
      minPower: 'Min. Power',
      stationDetails: 'Station Details',
      connectors: 'Connectors',
      power: 'Power',
      price: 'Price',
      status: 'Status',
      available_status: 'Available',
      occupied: 'Occupied',
      offline: 'Offline',
      navigate: 'Navigate',
      reserve: 'Reserve',
      distance: 'Distance',
      favoritesOnly: 'Favorites only',
      freeParking: 'Free parking',
      connectorType: 'Connector type',
      resetFilters: 'Reset filters',
      allTypes: 'All',
    },
    spotPrices: {
      title: 'Electricity Spot Prices',
      subtitle: 'Current market prices',
      today: 'Today',
      week: 'Week',
      month: 'Month',
      average: 'Average',
      current: 'Current',
      lowest: 'Lowest',
      highest: 'Highest',
      bestTime: 'Best Time to Charge',
      priceAlert: 'Price Alert',
      setAlert: 'Set Alert',
      currency: 'CZK',
      perMwh: 'CZK/MWh',
      perKwh: 'CZK/kWh',
      lastUpdated: 'Last Updated',
      trend: 'Trend',
      rising: 'Rising',
      falling: 'Falling',
      stable: 'Stable',
      hourlyPrices: 'Hourly prices',
      chargeNow: 'Charge now!',
      waitForBetter: 'Wait for a better price',
      savingPotential: 'Saving potential',
    },
    route: {
      title: 'Plan Route',
      subtitle: 'Find optimal route with charging stations',
      from: 'From',
      to: 'To',
      currentLocation: 'Current Location',
      calculateRoute: 'Calculate Route',
      distance: 'Distance',
      duration: 'Duration',
      estimatedCost: 'Estimated Cost',
      chargingStops: 'Charging Stops',
      addStop: 'Add Stop',
      noStationsFound: 'No stations on route',
      calculating: 'Calculating...',
      batteryLevel: 'Battery Level',
      vehicleRange: 'Vehicle Range',
      noVehicleHint: 'Select a vehicle in your profile for more accurate calculations',
      activeVehicle: 'Active Vehicle',
      myLocation: 'My Location',
      locationDenied: 'Location access was denied',
      locationFailed: 'Failed to get location',
      invalidAddresses: 'Enter valid start and destination addresses',
      planningFailed: 'Failed to plan route',
      tapToChange: 'Tap to change values',
      driving: 'Driving',
      chargingTime: 'Charging',
      noChargingNeeded: 'No charging needed!',
      sufficientBattery: 'Current battery is sufficient to reach the destination.',
      fromStart: 'from start',
      estimatedPrice: 'Estimated price',
      emptyStateTitle: 'Plan your trip',
      emptyStateDesc: 'Enter your start and destination, and we\'ll find optimal charging stops from the ZAspot network',
    },
    profile: {
      title: 'Profile',
      settings: 'Settings',
      language: 'Language',
      theme: 'Theme',
      notifications: 'Notifications',
      priceAlerts: 'Price Alerts',
      reservations: 'My Reservations',
      vehicleProfile: 'Vehicle Profile',
      saveToAccount: 'Save to Account',
      synced: 'Synced',
      localOnly: 'Local Only',
      customVehicle: 'Custom Vehicle',
      batteryCapacity: 'Battery Capacity',
      maxChargingPower: 'Max Charging Power',
      history: 'Charging History',
      about: 'About App',
      help: 'Help',
      contact: 'Contact',
      version: 'Version',
      logout: 'Log Out',
      darkMode: 'Dark Mode',
      lightMode: 'Light Mode',
      systemDefault: 'System Default',
      // Login card
      signIn: 'Sign in',
      signInSubtitle: 'For charging and payments',
      // Credit
      credit: 'Credit',
      topUp: 'Top Up',
      // Notifications
      notificationsOn: 'On',
      notificationsOff: 'Off',
      enableNotifications: 'Enable notifications',
      notifyBelow: 'Notify below',
      notifyAbove: 'Notify above',
      sendTestNotification: 'Send test notification',
      // Vehicle section
      vehicleSectionTitle: 'ELECTRIC VEHICLE',
      myVehicle: 'My Vehicle',
      selectVehicle: 'Select vehicle',
      battery: 'Battery',
      range: 'Range',
      maxCharging: 'Max charging',
      // AutoCharge
      autoChargeVehicleCount: 'vehicles',
      newVehicle: 'New vehicle',
      addVehicle: 'Add',
      vehicleNamePlaceholder: 'Vehicle name (e.g. My Enyaq)',
      autoChargeEmpty: 'Plug your EV into our station - it will be auto-detected.',
      enterMacManually: 'Enter MAC address manually',
      vehicleName: 'Vehicle name',
      macHintTesla: 'Tesla: Controls → Software → Additional Vehicle Info',
      macHintVw: 'VW ID: Infotainment → Settings → About the vehicle',
      // RFID
      rfidCards: 'RFID Cards',
      addRfidCard: 'Add RFID card',
      rfidCardNumber: 'RFID card number',
      cardName: 'Card name',
      // Delete vehicle
      removeVehicle: 'Remove Vehicle',
      removeVehicleConfirm: 'Do you want to remove this vehicle?',
      yes: 'Yes',
      no: 'No',
    },
    reservations: {
      title: 'Reservations',
      upcoming: 'Upcoming',
      past: 'Past',
      noReservations: 'No reservations',
      createNew: 'Create New',
      cancel: 'Cancel',
      confirm: 'Confirm',
      selectDate: 'Select Date',
      selectTime: 'Select Time',
      duration: 'Duration',
      totalCost: 'Total Cost',
      status: 'Status',
      pending: 'Pending',
      confirmed: 'Confirmed',
      cancelled: 'Cancelled',
      completed: 'Completed',
      cancelConfirm: 'Do you want to cancel this reservation?',
      loginRequired: 'Sign in to see your reservations.',
      signIn: 'Sign In',
      deposit: 'Deposit',
    },
    history: {
      title: 'Charging History',
      noHistory: 'No charging yet',
      noHistoryDesc: 'Your history will appear here after your first charge.',
      active: 'Active',
      completed: 'Completed',
      viewReceipt: 'View receipt',
      loginRequired: 'Sign in to see your history.',
      login: 'Sign In',
      energy: 'Energy',
      power: 'Power',
      cost: 'Cost',
      date: 'Date',
      duration: 'Duration',
    },
    receipt: {
      title: 'Receipt',
      loading: 'Loading receipt...',
      error: 'Receipt not found',
      station: 'Station',
      connector: 'Connector',
      date: 'Date',
      startTime: 'Start',
      endTime: 'End',
      duration: 'Charging duration',
      energy: 'Energy',
      avgPrice: 'Average price',
      total: 'Total',
      status: 'Status',
      completed: 'Completed',
      active: 'Active',
      share: 'Share',
      sendEmail: 'Send to email',
      emailSent: 'Email sent',
      emailError: 'Error sending email',
      back: 'Back',
      receiptNo: 'Receipt #',
    },
    station: {
      loading: 'Loading station...',
      error: 'Station not found',
      back: 'Back',
      online: 'Online',
      offline: 'Offline',
      connectors: 'Connectors',
      startCharging: 'Start Charging',
      stopCharging: 'Stop Charging',
      navigate: 'Navigate',
      favorite: 'Favorite',
      loginRequired: 'Sign in to start charging',
      login: 'Sign In',
      starting: 'Starting...',
      stopping: 'Stopping...',
      activeSession: 'Active Charging',
      energy: 'Energy',
      duration: 'Duration',
      cost: 'Cost',
      power: 'Power',
      soc: 'Battery',
      stats: 'Statistics',
      totalSessions: 'Total sessions',
      totalEnergy: 'Total energy',
      confirmStop: 'Do you want to stop charging?',
      yes: 'Yes',
      no: 'No',
      errorStarting: 'Error starting charging',
      errorStopping: 'Error stopping charging',
      insufficientCredit: 'Insufficient credit (min. 10 CZK)',
      stationOffline: 'Station is offline',
      currentPrices: 'Current Prices',
      acPrice: 'AC Charging',
      dcPrice: 'DC Charging',
      spotPrice: 'Spot Price',
      perKwh: 'CZK/kWh',
      timeSlot: 'Time slot',
      statusAvailable: 'Available',
      statusCharging: 'Charging',
      statusPreparing: 'Preparing',
      statusFaulted: 'Faulted',
      statusUnavailable: 'Unavailable',
      statusSuspendedEV: 'Suspended (EV)',
      statusSuspendedEVSE: 'Suspended',
      reserve: 'Reserve',
      reserveConfirm: 'Reserve connector for 30 minutes?',
      reserveDeposit: 'Deposit',
      reserveSuccess: 'Reservation created',
      reserveError: 'Reservation error',
      reserving: 'Reserving...',
    },
    common: {
      loading: 'Loading...',
      error: 'Error',
      retry: 'Retry',
      cancel: 'Cancel',
      save: 'Save',
      close: 'Close',
      back: 'Back',
      next: 'Next',
      done: 'Done',
      search: 'Search',
      noResults: 'No results',
      km: 'km',
      min: 'min',
      hour: 'hr',
      kw: 'kW',
      kwh: 'kWh',
    },
    notifications: {
      lowPriceTitle: 'Low electricity price!',
      highPriceTitle: 'High electricity price!',
      currentPrice: 'Current price',
      below: 'below',
      above: 'above',
      idealChargingTime: 'Ideal time to charge!',
      considerDelaying: 'Consider delaying charging.',
      testTitle: 'ZAspot Test',
      testBody: 'Push notifications are working! You\'ll be informed about low electricity prices.',
      reservationSoonTitle: 'Reservation starting soon',
      reservationStartsIn: 'Your reservation at {station} starts in {minutes} minutes.',
      chargingStartedTitle: 'Charging started',
      chargingStartedAt: 'Charging at {station} has been started successfully.',
      chargingCompleteTitle: 'Charging complete',
    },
    company: {
      name: 'sdil s.r.o.',
      phone: '+420 770 103 103',
      email: 'sdil@sdil.cz',
      website: 'www.zaspot.cz',
    },
  },

  de: {
    tabs: {
      home: 'Start',
      map: 'Karte',
      spotPrices: 'Preise',
      route: 'Route',
      profile: 'Profil',
    },
    home: {
      welcome: 'Willkommen bei ZAspot',
      currentPrice: 'Aktueller Preis',
      priceNow: 'Preis jetzt',
      perKwh: 'CZK/kWh',
      nearbyStations: 'Stationen in der Nähe',
      viewAll: 'Alle anzeigen',
      quickActions: 'Schnellaktionen',
      findStation: 'Station finden',
      planRoute: 'Route planen',
      myReservations: 'Meine Reservierungen',
      spotPrices: 'Spotpreise',
    },
    map: {
      title: 'Ladekarte',
      searchPlaceholder: 'Station suchen...',
      filters: 'Filter',
      allStations: 'Alle Stationen',
      available: 'Verfügbar',
      dcOnly: 'Nur DC',
      acOnly: 'Nur AC',
      minPower: 'Min. Leistung',
      stationDetails: 'Stationsdetails',
      connectors: 'Anschlüsse',
      power: 'Leistung',
      price: 'Preis',
      status: 'Status',
      available_status: 'Verfügbar',
      occupied: 'Belegt',
      offline: 'Offline',
      navigate: 'Navigieren',
      reserve: 'Reservieren',
      distance: 'Entfernung',
      favoritesOnly: 'Nur Favoriten',
      freeParking: 'Kostenloses Parken',
      connectorType: 'Anschlusstyp',
      resetFilters: 'Filter zurücksetzen',
      allTypes: 'Alle',
    },
    spotPrices: {
      title: 'Stromspotpreise',
      subtitle: 'Aktuelle Marktpreise',
      today: 'Heute',
      week: 'Woche',
      month: 'Monat',
      average: 'Durchschnitt',
      current: 'Aktuell',
      lowest: 'Niedrigster',
      highest: 'Höchster',
      bestTime: 'Beste Ladezeit',
      priceAlert: 'Preisalarm',
      setAlert: 'Alarm setzen',
      currency: 'CZK',
      perMwh: 'CZK/MWh',
      perKwh: 'CZK/kWh',
      lastUpdated: 'Letzte Aktualisierung',
      trend: 'Trend',
      rising: 'Steigend',
      falling: 'Fallend',
      stable: 'Stabil',
      hourlyPrices: 'Stündliche Preise',
      chargeNow: 'Jetzt laden!',
      waitForBetter: 'Auf besseren Preis warten',
      savingPotential: 'Sparpotenzial',
    },
    route: {
      title: 'Route planen',
      subtitle: 'Optimale Route mit Ladestationen finden',
      from: 'Von',
      to: 'Nach',
      currentLocation: 'Aktueller Standort',
      calculateRoute: 'Route berechnen',
      distance: 'Entfernung',
      duration: 'Fahrzeit',
      estimatedCost: 'Geschätzte Kosten',
      chargingStops: 'Ladestopps',
      addStop: 'Stopp hinzufügen',
      noStationsFound: 'Keine Stationen auf der Route',
      calculating: 'Berechne...',
      batteryLevel: 'Akkustand',
      vehicleRange: 'Reichweite',
      noVehicleHint: 'Wählen Sie ein Fahrzeug im Profil für genauere Berechnungen',
      activeVehicle: 'Aktives Fahrzeug',
      myLocation: 'Mein Standort',
      locationDenied: 'Standortzugriff wurde verweigert',
      locationFailed: 'Standort konnte nicht ermittelt werden',
      invalidAddresses: 'Geben Sie gültige Start- und Zieladressen ein',
      planningFailed: 'Route konnte nicht geplant werden',
      tapToChange: 'Tippen zum Ändern',
      driving: 'Fahrt',
      chargingTime: 'Laden',
      noChargingNeeded: 'Kein Laden nötig!',
      sufficientBattery: 'Die aktuelle Batterie reicht für das Ziel.',
      fromStart: 'vom Start',
      estimatedPrice: 'Geschätzte Kosten',
      emptyStateTitle: 'Planen Sie Ihre Reise',
      emptyStateDesc: 'Geben Sie Start und Ziel ein, und wir finden optimale Ladestopps im ZAspot-Netzwerk',
    },
    profile: {
      title: 'Profil',
      settings: 'Einstellungen',
      language: 'Sprache',
      theme: 'Design',
      notifications: 'Benachrichtigungen',
      priceAlerts: 'Preisalarme',
      reservations: 'Meine Reservierungen',
      vehicleProfile: 'Fahrzeugprofil',
      saveToAccount: 'Im Konto speichern',
      synced: 'Synchronisiert',
      localOnly: 'Nur lokal',
      customVehicle: 'Eigenes Fahrzeug',
      batteryCapacity: 'Batteriekapazität',
      maxChargingPower: 'Max. Ladeleistung',
      history: 'Ladehistorie',
      about: 'Über die App',
      help: 'Hilfe',
      contact: 'Kontakt',
      version: 'Version',
      logout: 'Abmelden',
      darkMode: 'Dunkler Modus',
      lightMode: 'Heller Modus',
      systemDefault: 'Systemstandard',
      // Login card
      signIn: 'Melden Sie sich an',
      signInSubtitle: 'Zum Laden und Bezahlen',
      // Credit
      credit: 'Guthaben',
      topUp: 'Aufladen',
      // Notifications
      notificationsOn: 'Ein',
      notificationsOff: 'Aus',
      enableNotifications: 'Benachrichtigungen aktivieren',
      notifyBelow: 'Benachrichtigen unter',
      notifyAbove: 'Benachrichtigen über',
      sendTestNotification: 'Testbenachrichtigung senden',
      // Vehicle section
      vehicleSectionTitle: 'ELEKTROFAHRZEUG',
      myVehicle: 'Mein Fahrzeug',
      selectVehicle: 'Fahrzeug wählen',
      battery: 'Batterie',
      range: 'Reichweite',
      maxCharging: 'Max Laden',
      // AutoCharge
      autoChargeVehicleCount: 'Fahrzeuge',
      newVehicle: 'Neues Fahrzeug',
      addVehicle: 'Hinzufügen',
      vehicleNamePlaceholder: 'Fahrzeugname (z.B. Mein Enyaq)',
      autoChargeEmpty: 'Schließen Sie Ihr EV an unsere Station an - es wird automatisch erkannt.',
      enterMacManually: 'MAC-Adresse manuell eingeben',
      vehicleName: 'Fahrzeugname',
      macHintTesla: 'Tesla: Steuerung → Software → Zusätzliche Fahrzeuginfo',
      macHintVw: 'VW ID: Infotainment → Einstellungen → Über das Fahrzeug',
      // RFID
      rfidCards: 'RFID-Karten',
      addRfidCard: 'RFID-Karte hinzufügen',
      rfidCardNumber: 'RFID-Kartennummer',
      cardName: 'Kartenname',
      // Delete vehicle
      removeVehicle: 'Fahrzeug entfernen',
      removeVehicleConfirm: 'Möchten Sie dieses Fahrzeug wirklich entfernen?',
      yes: 'Ja',
      no: 'Nein',
    },
    reservations: {
      title: 'Reservierungen',
      upcoming: 'Kommende',
      past: 'Vergangene',
      noReservations: 'Keine Reservierungen',
      createNew: 'Neu erstellen',
      cancel: 'Stornieren',
      confirm: 'Bestätigen',
      selectDate: 'Datum wählen',
      selectTime: 'Zeit wählen',
      duration: 'Dauer',
      totalCost: 'Gesamtkosten',
      status: 'Status',
      pending: 'Ausstehend',
      confirmed: 'Bestätigt',
      cancelled: 'Storniert',
      completed: 'Abgeschlossen',
      cancelConfirm: 'Möchten Sie diese Reservierung stornieren?',
      loginRequired: 'Melden Sie sich an, um Reservierungen zu sehen.',
      signIn: 'Anmelden',
      deposit: 'Kaution',
    },
    history: {
      title: 'Ladehistorie',
      noHistory: 'Noch keine Ladevorgänge',
      noHistoryDesc: 'Ihre Historie erscheint hier nach dem ersten Laden.',
      active: 'Aktiv',
      completed: 'Abgeschlossen',
      viewReceipt: 'Beleg anzeigen',
      loginRequired: 'Melden Sie sich an, um Ihre Historie zu sehen.',
      login: 'Anmelden',
      energy: 'Energie',
      power: 'Leistung',
      cost: 'Kosten',
      date: 'Datum',
      duration: 'Dauer',
    },
    receipt: {
      title: 'Beleg',
      loading: 'Beleg wird geladen...',
      error: 'Beleg nicht gefunden',
      station: 'Station',
      connector: 'Anschluss',
      date: 'Datum',
      startTime: 'Start',
      endTime: 'Ende',
      duration: 'Ladedauer',
      energy: 'Energie',
      avgPrice: 'Durchschnittspreis',
      total: 'Gesamt',
      status: 'Status',
      completed: 'Abgeschlossen',
      active: 'Aktiv',
      share: 'Teilen',
      sendEmail: 'Per E-Mail senden',
      emailSent: 'E-Mail gesendet',
      emailError: 'Fehler beim Senden',
      back: 'Zurück',
      receiptNo: 'Beleg Nr.',
    },
    station: {
      loading: 'Station wird geladen...',
      error: 'Station nicht gefunden',
      back: 'Zurück',
      online: 'Online',
      offline: 'Offline',
      connectors: 'Anschlüsse',
      startCharging: 'Laden starten',
      stopCharging: 'Laden stoppen',
      navigate: 'Navigieren',
      favorite: 'Favorit',
      loginRequired: 'Anmelden zum Laden',
      login: 'Anmelden',
      starting: 'Wird gestartet...',
      stopping: 'Wird gestoppt...',
      activeSession: 'Aktives Laden',
      energy: 'Energie',
      duration: 'Dauer',
      cost: 'Kosten',
      power: 'Leistung',
      soc: 'Akkustand',
      stats: 'Statistiken',
      totalSessions: 'Gesamte Ladevorgänge',
      totalEnergy: 'Gesamte Energie',
      confirmStop: 'Möchten Sie das Laden stoppen?',
      yes: 'Ja',
      no: 'Nein',
      errorStarting: 'Fehler beim Starten',
      errorStopping: 'Fehler beim Stoppen',
      insufficientCredit: 'Unzureichendes Guthaben (min. 10 CZK)',
      stationOffline: 'Station ist offline',
      currentPrices: 'Aktuelle Preise',
      acPrice: 'AC-Laden',
      dcPrice: 'DC-Laden',
      spotPrice: 'Spotpreis',
      perKwh: 'CZK/kWh',
      timeSlot: 'Zeitfenster',
      statusAvailable: 'Verfügbar',
      statusCharging: 'Lädt',
      statusPreparing: 'Vorbereitung',
      statusFaulted: 'Störung',
      statusUnavailable: 'Nicht verfügbar',
      statusSuspendedEV: 'Pausiert (EV)',
      statusSuspendedEVSE: 'Pausiert',
      reserve: 'Reservieren',
      reserveConfirm: 'Anschluss für 30 Min reservieren?',
      reserveDeposit: 'Kaution',
      reserveSuccess: 'Reservierung erstellt',
      reserveError: 'Reservierungsfehler',
      reserving: 'Reserviere...',
    },
    common: {
      loading: 'Lädt...',
      error: 'Fehler',
      retry: 'Erneut versuchen',
      cancel: 'Abbrechen',
      save: 'Speichern',
      close: 'Schließen',
      back: 'Zurück',
      next: 'Weiter',
      done: 'Fertig',
      search: 'Suchen',
      noResults: 'Keine Ergebnisse',
      km: 'km',
      min: 'Min',
      hour: 'Std',
      kw: 'kW',
      kwh: 'kWh',
    },
    notifications: {
      lowPriceTitle: 'Niedriger Strompreis!',
      highPriceTitle: 'Hoher Strompreis!',
      currentPrice: 'Aktueller Preis',
      below: 'unter',
      above: 'über',
      idealChargingTime: 'Ideale Ladezeit!',
      considerDelaying: 'Erwägen Sie, das Laden zu verschieben.',
      testTitle: 'ZAspot Test',
      testBody: 'Push-Benachrichtigungen funktionieren! Sie werden über niedrige Strompreise informiert.',
      reservationSoonTitle: 'Reservierung beginnt bald',
      reservationStartsIn: 'Ihre Reservierung an {station} beginnt in {minutes} Minuten.',
      chargingStartedTitle: 'Laden gestartet',
      chargingStartedAt: 'Laden an {station} wurde erfolgreich gestartet.',
      chargingCompleteTitle: 'Laden abgeschlossen',
    },
    company: {
      name: 'sdil s.r.o.',
      phone: '+420 770 103 103',
      email: 'sdil@sdil.cz',
      website: 'www.zaspot.cz',
    },
  },

  pl: {
    tabs: {
      home: 'Start',
      map: 'Mapa',
      spotPrices: 'Ceny',
      route: 'Trasa',
      profile: 'Profil',
    },
    home: {
      welcome: 'Witamy w ZAspot',
      currentPrice: 'Aktualna cena',
      priceNow: 'Cena teraz',
      perKwh: 'CZK/kWh',
      nearbyStations: 'Stacje w pobliżu',
      viewAll: 'Zobacz wszystkie',
      quickActions: 'Szybkie akcje',
      findStation: 'Znajdź stację',
      planRoute: 'Zaplanuj trasę',
      myReservations: 'Moje rezerwacje',
      spotPrices: 'Ceny spot',
    },
    map: {
      title: 'Mapa stacji',
      searchPlaceholder: 'Szukaj stacji...',
      filters: 'Filtry',
      allStations: 'Wszystkie stacje',
      available: 'Dostępne',
      dcOnly: 'Tylko DC',
      acOnly: 'Tylko AC',
      minPower: 'Min. moc',
      stationDetails: 'Szczegóły stacji',
      connectors: 'Złącza',
      power: 'Moc',
      price: 'Cena',
      status: 'Status',
      available_status: 'Dostępna',
      occupied: 'Zajęta',
      offline: 'Offline',
      navigate: 'Nawiguj',
      reserve: 'Zarezerwuj',
      distance: 'Odległość',
      favoritesOnly: 'Tylko ulubione',
      freeParking: 'Darmowy parking',
      connectorType: 'Typ złącza',
      resetFilters: 'Resetuj filtry',
      allTypes: 'Wszystko',
    },
    spotPrices: {
      title: 'Ceny spot energii',
      subtitle: 'Aktualne ceny rynkowe',
      today: 'Dziś',
      week: 'Tydzień',
      month: 'Miesiąc',
      average: 'Średnia',
      current: 'Aktualna',
      lowest: 'Najniższa',
      highest: 'Najwyższa',
      bestTime: 'Najlepszy czas ładowania',
      priceAlert: 'Alert cenowy',
      setAlert: 'Ustaw alert',
      currency: 'CZK',
      perMwh: 'CZK/MWh',
      perKwh: 'CZK/kWh',
      lastUpdated: 'Ostatnia aktualizacja',
      trend: 'Trend',
      rising: 'Rośnie',
      falling: 'Spada',
      stable: 'Stabilny',
      hourlyPrices: 'Ceny godzinowe',
      chargeNow: 'Ładuj teraz!',
      waitForBetter: 'Poczekaj na lepszą cenę',
      savingPotential: 'Potencjał oszczędności',
    },
    route: {
      title: 'Zaplanuj trasę',
      subtitle: 'Znajdź optymalną trasę ze stacjami ładowania',
      from: 'Z',
      to: 'Do',
      currentLocation: 'Bieżąca lokalizacja',
      calculateRoute: 'Oblicz trasę',
      distance: 'Odległość',
      duration: 'Czas jazdy',
      estimatedCost: 'Szacunkowy koszt',
      chargingStops: 'Przystanki ładowania',
      addStop: 'Dodaj przystanek',
      noStationsFound: 'Brak stacji na trasie',
      calculating: 'Obliczanie...',
      batteryLevel: 'Poziom baterii',
      vehicleRange: 'Zasięg pojazdu',
      noVehicleHint: 'Wybierz pojazd w profilu, aby uzyskać dokładniejsze obliczenia',
      activeVehicle: 'Aktywny pojazd',
      myLocation: 'Moja lokalizacja',
      locationDenied: 'Dostęp do lokalizacji odmówiony',
      locationFailed: 'Nie udało się uzyskać lokalizacji',
      invalidAddresses: 'Wprowadź prawidłowe adresy startowe i docelowe',
      planningFailed: 'Nie udało się zaplanować trasy',
      tapToChange: 'Dotknij, aby zmienić wartości',
      driving: 'Jazda',
      chargingTime: 'Ładowanie',
      noChargingNeeded: 'Ładowanie nie jest potrzebne!',
      sufficientBattery: 'Aktualny poziom baterii wystarczy do celu.',
      fromStart: 'od startu',
      estimatedPrice: 'Szacunkowa cena',
      emptyStateTitle: 'Zaplanuj podróż',
      emptyStateDesc: 'Wprowadź start i cel, a znajdziemy optymalne przystanki ładowania z sieci ZAspot',
    },
    profile: {
      title: 'Profil',
      settings: 'Ustawienia',
      language: 'Język',
      theme: 'Motyw',
      notifications: 'Powiadomienia',
      priceAlerts: 'Alerty cenowe',
      reservations: 'Moje rezerwacje',
      vehicleProfile: 'Profil pojazdu',
      saveToAccount: 'Zapisz na koncie',
      synced: 'Zsynchronizowane',
      localOnly: 'Tylko lokalnie',
      customVehicle: 'Własny pojazd',
      batteryCapacity: 'Pojemność baterii',
      maxChargingPower: 'Maks. moc ładowania',
      history: 'Historia ładowania',
      about: 'O aplikacji',
      help: 'Pomoc',
      contact: 'Kontakt',
      version: 'Wersja',
      logout: 'Wyloguj',
      darkMode: 'Tryb ciemny',
      lightMode: 'Tryb jasny',
      systemDefault: 'Domyślny systemu',
      // Login card
      signIn: 'Zaloguj się',
      signInSubtitle: 'Do ładowania i płatności',
      // Credit
      credit: 'Saldo',
      topUp: 'Doładuj',
      // Notifications
      notificationsOn: 'Włączone',
      notificationsOff: 'Wyłączone',
      enableNotifications: 'Włącz powiadomienia',
      notifyBelow: 'Powiadom poniżej',
      notifyAbove: 'Powiadom powyżej',
      sendTestNotification: 'Wyślij testowe powiadomienie',
      // Vehicle section
      vehicleSectionTitle: 'POJAZD ELEKTRYCZNY',
      myVehicle: 'Mój pojazd',
      selectVehicle: 'Wybierz pojazd',
      battery: 'Bateria',
      range: 'Zasięg',
      maxCharging: 'Maks. ładowanie',
      // AutoCharge
      autoChargeVehicleCount: 'pojazdów',
      newVehicle: 'Nowy pojazd',
      addVehicle: 'Dodaj',
      vehicleNamePlaceholder: 'Nazwa pojazdu (np. Mój Enyaq)',
      autoChargeEmpty: 'Podłącz EV do naszej stacji - pojazd zostanie automatycznie rozpoznany.',
      enterMacManually: 'Wprowadź adres MAC ręcznie',
      vehicleName: 'Nazwa pojazdu',
      macHintTesla: 'Tesla: Sterowanie → Oprogramowanie → Dodatkowe info o pojeździe',
      macHintVw: 'VW ID: Infotainment → Ustawienia → O pojeździe',
      // RFID
      rfidCards: 'Karty RFID',
      addRfidCard: 'Dodaj kartę RFID',
      rfidCardNumber: 'Numer karty RFID',
      cardName: 'Nazwa karty',
      // Delete vehicle
      removeVehicle: 'Usuń pojazd',
      removeVehicleConfirm: 'Czy chcesz usunąć ten pojazd?',
      yes: 'Tak',
      no: 'Nie',
    },
    reservations: {
      title: 'Rezerwacje',
      upcoming: 'Nadchodzące',
      past: 'Przeszłe',
      noReservations: 'Brak rezerwacji',
      createNew: 'Utwórz nową',
      cancel: 'Anuluj',
      confirm: 'Potwierdź',
      selectDate: 'Wybierz datę',
      selectTime: 'Wybierz czas',
      duration: 'Czas trwania',
      totalCost: 'Całkowity koszt',
      status: 'Status',
      pending: 'Oczekujące',
      confirmed: 'Potwierdzone',
      cancelled: 'Anulowane',
      completed: 'Zakończone',
      cancelConfirm: 'Czy chcesz anulować tę rezerwację?',
      loginRequired: 'Zaloguj się, aby zobaczyć rezerwacje.',
      signIn: 'Zaloguj się',
      deposit: 'Kaucja',
    },
    history: {
      title: 'Historia ładowania',
      noHistory: 'Brak historii ładowania',
      noHistoryDesc: 'Twoja historia pojawi się tutaj po pierwszym ładowaniu.',
      active: 'Aktywne',
      completed: 'Zakończone',
      viewReceipt: 'Zobacz rachunek',
      loginRequired: 'Zaloguj się, aby zobaczyć historię.',
      login: 'Zaloguj się',
      energy: 'Energia',
      power: 'Moc',
      cost: 'Koszt',
      date: 'Data',
      duration: 'Czas',
    },
    receipt: {
      title: 'Rachunek',
      loading: 'Ładowanie rachunku...',
      error: 'Rachunek nie znaleziony',
      station: 'Stacja',
      connector: 'Złącze',
      date: 'Data',
      startTime: 'Początek',
      endTime: 'Koniec',
      duration: 'Czas ładowania',
      energy: 'Energia',
      avgPrice: 'Średnia cena',
      total: 'Łącznie',
      status: 'Status',
      completed: 'Zakończone',
      active: 'Aktywne',
      share: 'Udostępnij',
      sendEmail: 'Wyślij na email',
      emailSent: 'Email wysłany',
      emailError: 'Błąd wysyłania emailu',
      back: 'Wstecz',
      receiptNo: 'Rachunek nr.',
    },
    station: {
      loading: 'Ładowanie stacji...',
      error: 'Stacja nie znaleziona',
      back: 'Wstecz',
      online: 'Online',
      offline: 'Offline',
      connectors: 'Złącza',
      startCharging: 'Rozpocznij ładowanie',
      stopCharging: 'Zatrzymaj ładowanie',
      navigate: 'Nawiguj',
      favorite: 'Ulubiona',
      loginRequired: 'Zaloguj się, aby ładować',
      login: 'Zaloguj się',
      starting: 'Uruchamianie...',
      stopping: 'Zatrzymywanie...',
      activeSession: 'Aktywne ładowanie',
      energy: 'Energia',
      duration: 'Czas',
      cost: 'Koszt',
      power: 'Moc',
      soc: 'Bateria',
      stats: 'Statystyki',
      totalSessions: 'Wszystkie sesje',
      totalEnergy: 'Całkowita energia',
      confirmStop: 'Czy chcesz zatrzymać ładowanie?',
      yes: 'Tak',
      no: 'Nie',
      errorStarting: 'Błąd uruchamiania ładowania',
      errorStopping: 'Błąd zatrzymywania ładowania',
      insufficientCredit: 'Niewystarczające saldo (min. 10 CZK)',
      stationOffline: 'Stacja jest offline',
      currentPrices: 'Aktualne ceny',
      acPrice: 'Ładowanie AC',
      dcPrice: 'Ładowanie DC',
      spotPrice: 'Cena spot',
      perKwh: 'CZK/kWh',
      timeSlot: 'Przedział czasu',
      statusAvailable: 'Dostępny',
      statusCharging: 'Ładuje',
      statusPreparing: 'Przygotowanie',
      statusFaulted: 'Awaria',
      statusUnavailable: 'Niedostępny',
      statusSuspendedEV: 'Wstrzymano (EV)',
      statusSuspendedEVSE: 'Wstrzymano',
      reserve: 'Zarezerwuj',
      reserveConfirm: 'Zarezerwować złącze na 30 minut?',
      reserveDeposit: 'Kaucja',
      reserveSuccess: 'Rezerwacja utworzona',
      reserveError: 'Błąd rezerwacji',
      reserving: 'Rezerwuję...',
    },
    common: {
      loading: 'Ładowanie...',
      error: 'Błąd',
      retry: 'Spróbuj ponownie',
      cancel: 'Anuluj',
      save: 'Zapisz',
      close: 'Zamknij',
      back: 'Wstecz',
      next: 'Dalej',
      done: 'Gotowe',
      search: 'Szukaj',
      noResults: 'Brak wyników',
      km: 'km',
      min: 'min',
      hour: 'godz',
      kw: 'kW',
      kwh: 'kWh',
    },
    notifications: {
      lowPriceTitle: 'Niska cena energii!',
      highPriceTitle: 'Wysoka cena energii!',
      currentPrice: 'Aktualna cena',
      below: 'poniżej',
      above: 'powyżej',
      idealChargingTime: 'Idealny czas na ładowanie!',
      considerDelaying: 'Rozważ opóźnienie ładowania.',
      testTitle: 'ZAspot Test',
      testBody: 'Powiadomienia push działają! Będziesz informowany o niskich cenach energii.',
      reservationSoonTitle: 'Rezerwacja rozpoczyna się wkrótce',
      reservationStartsIn: 'Twoja rezerwacja na {station} rozpoczyna się za {minutes} minut.',
      chargingStartedTitle: 'Ładowanie rozpoczęte',
      chargingStartedAt: 'Ładowanie na {station} zostało pomyślnie rozpoczęte.',
      chargingCompleteTitle: 'Ładowanie zakończone',
    },
    company: {
      name: 'sdil s.r.o.',
      phone: '+420 770 103 103',
      email: 'sdil@sdil.cz',
      website: 'www.zaspot.cz',
    },
  },
};

export const getTranslation = (language: Language): Translations => {
  return translations[language];
};

/**
 * Maps app language codes to standard locale strings for date/time formatting.
 */
export const getLocale = (language: Language): string => {
  const localeMap: Record<Language, string> = {
    cz: 'cs-CZ',
    en: 'en-US',
    de: 'de-DE',
    pl: 'pl-PL',
  };
  return localeMap[language];
};

export const defaultLanguage: Language = 'cz';
